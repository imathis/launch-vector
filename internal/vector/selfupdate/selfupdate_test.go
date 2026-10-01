package selfupdate

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func releaseArchive(t *testing.T, binary []byte) []byte {
	t.Helper()
	var buffer bytes.Buffer
	compressed := gzip.NewWriter(&buffer)
	archive := tar.NewWriter(compressed)
	files := map[string][]byte{"README.md": []byte("docs"), "vector": binary}
	for _, name := range []string{"README.md", "vector"} {
		if err := archive.WriteHeader(&tar.Header{Name: name, Mode: 0o755, Size: int64(len(files[name])), Typeflag: tar.TypeReg}); err != nil {
			t.Fatal(err)
		}
		if _, err := archive.Write(files[name]); err != nil {
			t.Fatal(err)
		}
	}
	if err := archive.Close(); err != nil {
		t.Fatal(err)
	}
	if err := compressed.Close(); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

func releaseServer(t *testing.T, archive []byte, checksum string) (*httptest.Server, *string) {
	t.Helper()
	name := AssetName(runtime.GOOS, runtime.GOARCH)
	var authorization string
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authorization = r.Header.Get("Authorization")
		switch r.URL.Path {
		case "/repos/owner/repo/releases/latest":
			_ = json.NewEncoder(w).Encode(Release{Tag: "v1.4.0", Assets: []Asset{
				{Name: name, URL: server.URL + "/api/archive", DownloadURL: server.URL + "/download/archive"},
				{Name: "checksums.txt", URL: server.URL + "/api/sums", DownloadURL: server.URL + "/download/sums"},
			}})
		case "/api/archive", "/download/archive":
			_, _ = w.Write(archive)
		case "/api/sums", "/download/sums":
			fmt.Fprintf(w, "%s  %s\n", checksum, name)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(server.Close)
	return server, &authorization
}

func sha(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func TestApplyReplacesExecutable(t *testing.T) {
	archive := releaseArchive(t, []byte("new binary"))
	server, authorization := releaseServer(t, archive, sha(archive))
	client := Client{API: server.URL, Repo: "owner/repo", Token: "secret"}

	release, err := client.Latest(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if release.Version() != "1.4.0" {
		t.Fatalf("Version() = %q", release.Version())
	}
	target := filepath.Join(t.TempDir(), "vector")
	if err := os.WriteFile(target, []byte("old binary"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := client.Apply(context.Background(), release, target); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(target)
	if err != nil || string(data) != "new binary" {
		t.Fatalf("target = %q, %v", data, err)
	}
	info, _ := os.Stat(target)
	if info.Mode().Perm()&0o100 == 0 {
		t.Fatalf("target is not executable: %v", info.Mode())
	}
	if *authorization != "Bearer secret" {
		t.Fatalf("Authorization = %q", *authorization)
	}
}

func TestApplyRejectsChecksumMismatch(t *testing.T) {
	archive := releaseArchive(t, []byte("tampered"))
	server, _ := releaseServer(t, archive, sha([]byte("something else")))
	client := Client{API: server.URL, Repo: "owner/repo"}
	release, err := client.Latest(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	target := filepath.Join(t.TempDir(), "vector")
	if err := os.WriteFile(target, []byte("old binary"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := client.Apply(context.Background(), release, target); err == nil {
		t.Fatal("Apply() accepted a bad checksum")
	}
	if data, _ := os.ReadFile(target); string(data) != "old binary" {
		t.Fatalf("target changed to %q", data)
	}
}

func TestNewer(t *testing.T) {
	tests := []struct {
		a, b string
		want bool
	}{
		{"1.2.0", "1.1.9", true},
		{"v0.10.0", "0.9.0", true},
		{"0.1.0", "0.1.0", false},
		{"0.1.0", "0.2.0", false},
		{"0.2.0", "dev", false},
		{"dev", "0.1.0", false},
		{"1.0.0-rc.1", "0.9.0", true},
	}
	for _, test := range tests {
		if got := Newer(test.a, test.b); got != test.want {
			t.Errorf("Newer(%q, %q) = %v, want %v", test.a, test.b, got, test.want)
		}
	}
}

func TestAvailableCachesDailyCheck(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("XDG_CACHE_HOME", t.TempDir())
	calls := 0
	fetch := func(context.Context) (Release, error) {
		calls++
		return Release{Tag: "v0.3.0"}, nil
	}
	if got := Available(context.Background(), "0.2.0", fetch); got != "0.3.0" {
		t.Fatalf("Available() = %q", got)
	}
	if got := Available(context.Background(), "0.2.0", fetch); got != "0.3.0" || calls != 1 {
		t.Fatalf("second Available() = %q after %d calls", got, calls)
	}
	if got := Available(context.Background(), "0.3.0", fetch); got != "" {
		t.Fatalf("Available() on latest = %q", got)
	}
	if got := Available(context.Background(), "dev", fetch); got != "" || calls != 1 {
		t.Fatalf("dev build checked for updates: %q, %d", got, calls)
	}
	writeCache(cachePath(), cache{CheckedAt: time.Now().Add(-48 * time.Hour), Latest: "0.3.0"})
	Available(context.Background(), "0.2.0", fetch)
	if calls != 2 {
		t.Fatalf("stale cache did not refresh; calls = %d", calls)
	}
}
