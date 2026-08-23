package project

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/imathis/launch-vector/internal/vector/config"
)

const ConfigName = "vector.yaml"

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

func (p Project) SocketPath() string {
	if filepath.IsAbs(p.Config.ProcessCompose.Socket) {
		return filepath.Clean(p.Config.ProcessCompose.Socket)
	}
	return filepath.Join(p.Root, p.Config.ProcessCompose.Socket)
}
