package selfupdate

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

const checkInterval = 24 * time.Hour

type cache struct {
	CheckedAt time.Time `json:"checked_at"`
	Latest    string    `json:"latest"`
}

// Available returns a newer release version, checking GitHub at most once a
// day. Failures are silent: the notice is a convenience, never an error.
func Available(ctx context.Context, current string, fetch func(context.Context) (Release, error)) string {
	if !IsRelease(current) || os.Getenv("VECTOR_NO_UPDATE_CHECK") != "" {
		return ""
	}
	path := cachePath()
	entry := readCache(path)
	if time.Since(entry.CheckedAt) > checkInterval {
		check, cancel := context.WithTimeout(ctx, 1500*time.Millisecond)
		release, err := fetch(check)
		cancel()
		entry.CheckedAt = time.Now()
		if err == nil {
			entry.Latest = release.Version()
		}
		writeCache(path, entry)
	}
	if Newer(entry.Latest, current) {
		return entry.Latest
	}
	return ""
}

// Forget clears the cached check after a successful update.
func Forget() {
	_ = os.Remove(cachePath())
}

func cachePath() string {
	dir, err := os.UserCacheDir()
	if err != nil {
		return ""
	}
	return filepath.Join(dir, "vector", "update-check.json")
}

func readCache(path string) cache {
	var entry cache
	if path == "" {
		return entry
	}
	data, err := os.ReadFile(path)
	if err == nil {
		_ = json.Unmarshal(data, &entry)
	}
	return entry
}

func writeCache(path string, entry cache) {
	if path == "" {
		return
	}
	data, err := json.Marshal(entry)
	if err != nil {
		return
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return
	}
	_ = os.WriteFile(path, data, 0o644)
}
