// Package source chooses where framework files come from: the assets embedded
// in this release, or a local Launch Vector checkout during development.
package source

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	launchvector "github.com/imathis/launch-vector"
	"github.com/imathis/launch-vector/internal/starter"
	"github.com/imathis/launch-vector/internal/vector/managed"
)

const (
	module = "module github.com/imathis/launch-vector"
	// LabPackage is the Design Lab harness every workspace installs.
	LabPackage = "@launch-vector/lab"
)

type Source struct {
	// Root is a local checkout; empty means the embedded release assets.
	Root    string
	Version string
}

func Embedded(version string) Source {
	return Source{Version: version}
}

// Local validates a Launch Vector checkout and returns its absolute path.
func Local(root, version string) (Source, error) {
	abs, err := filepath.Abs(root)
	if err != nil {
		return Source{}, err
	}
	gomod, err := os.ReadFile(filepath.Join(abs, "go.mod"))
	if err != nil || !strings.Contains(string(gomod), module) {
		return Source{}, fmt.Errorf("%s is not a Launch Vector checkout", abs)
	}
	return Source{Root: abs, Version: version}, nil
}

func (s Source) IsLocal() bool {
	return s.Root != ""
}

func (s Source) Starter() ([]starter.File, error) {
	if s.IsLocal() {
		return starter.FromCheckout(s.Root)
	}
	return starter.Embedded()
}

func (s Source) Assets() (managed.Assets, error) {
	if !s.IsLocal() {
		return managed.Assets{Skills: launchvector.Skills(), Block: launchvector.AgentsBlock(), Version: s.releaseVersion()}, nil
	}
	block, err := os.ReadFile(filepath.Join(s.Root, "agents", "AGENTS.md"))
	if err != nil {
		return managed.Assets{}, err
	}
	return managed.Assets{Skills: os.DirFS(filepath.Join(s.Root, "skills")), Block: string(block)}, nil
}

// LabDependency is the package.json spec for the Lab harness. Local checkouts
// use a Bun link; development builds keep whatever the workspace declares.
func (s Source) LabDependency() string {
	if s.IsLocal() {
		return "link:" + LabPackage
	}
	if version := s.releaseVersion(); version != "" {
		return "^" + version
	}
	return ""
}

// LabDir is the checkout's Lab package, which `bun link` registers.
func (s Source) LabDir() string {
	if !s.IsLocal() {
		return ""
	}
	return filepath.Join(s.Root, "packages", "lab")
}

// CheckLabBuilt reports a missing build, since linked workspaces load dist/.
func (s Source) CheckLabBuilt() error {
	if !s.IsLocal() {
		return nil
	}
	_, err := os.Stat(filepath.Join(s.LabDir(), "dist", "index.js"))
	if errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("the Lab package is not built; run: (cd %s && bun install && bun run --filter %s build)", s.Root, LabPackage)
	}
	return err
}

func (s Source) releaseVersion() string {
	if s.Version == "" || s.Version == "dev" {
		return ""
	}
	return strings.TrimPrefix(s.Version, "v")
}
