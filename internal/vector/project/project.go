package project

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/imathis/launch-vector/internal/vector/config"
)

const (
	ConfigName = "vector.yaml"
	// StateDirName holds generated, machine-local files. Workspaces gitignore it.
	StateDirName = ".vector"
	// SourceFileName, inside the state dir, points at a local Launch Vector checkout.
	SourceFileName = "source"

	// Unix socket paths are limited to roughly 104 bytes on macOS.
	maxSocketPath = 100
)

var ErrNotFound = errors.New("vector.yaml not found")

type Project struct {
	Root       string
	ConfigPath string
	Config     config.Config
}

func Discover(start string) (Project, error) {
	dir, err := filepath.Abs(start)
	if err != nil {
		return Project{}, err
	}
	if info, statErr := os.Stat(dir); statErr == nil && !info.IsDir() {
		dir = filepath.Dir(dir)
	}

	for {
		path := filepath.Join(dir, ConfigName)
		if _, err := os.Stat(path); err == nil {
			cfg, loadErr := config.Load(path)
			if loadErr != nil {
				return Project{}, loadErr
			}
			return Project{Root: dir, ConfigPath: path, Config: cfg}, nil
		} else if !errors.Is(err, os.ErrNotExist) {
			return Project{}, fmt.Errorf("inspect %s: %w", path, err)
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return Project{}, fmt.Errorf("%w from %s", ErrNotFound, start)
		}
		dir = parent
	}
}

func (p Project) StateDir() string {
	return filepath.Join(p.Root, StateDirName)
}

func (p Project) ComposePath() string {
	return filepath.Join(p.StateDir(), "process-compose.yaml")
}

func (p Project) SocketPath() string {
	path := filepath.Join(p.StateDir(), "process-compose.sock")
	if len(path) <= maxSocketPath {
		return path
	}
	sum := sha256.Sum256([]byte(p.Root))
	return filepath.Join(os.TempDir(), "vector-"+hex.EncodeToString(sum[:])[:12]+".sock")
}

// Source returns the local Launch Vector checkout this workspace develops
// against, or "" when it uses released packages.
func (p Project) Source() string {
	return ReadSource(p.Root)
}

func ReadSource(root string) string {
	data, err := os.ReadFile(filepath.Join(root, StateDirName, SourceFileName))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

func WriteSource(root, source string) error {
	dir := filepath.Join(root, StateDirName)
	if source == "" {
		err := os.Remove(filepath.Join(dir, SourceFileName))
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, SourceFileName), []byte(source+"\n"), 0o644)
}
