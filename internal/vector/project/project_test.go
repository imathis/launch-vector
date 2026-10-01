package project

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDiscoverWalksUpward(t *testing.T) {
	root := t.TempDir()
	nested := filepath.Join(root, "apps", "docs", "src")
	if err := os.MkdirAll(nested, 0o700); err != nil {
		t.Fatal(err)
	}
	config := `version: 2
project: {name: vector}
apps: [{name: docs, path: apps/docs, route: ui}]
`
	if err := os.WriteFile(filepath.Join(root, ConfigName), []byte(config), 0o600); err != nil {
		t.Fatal(err)
	}

	got, err := Discover(nested)
	if err != nil {
		t.Fatal(err)
	}
	if got.Root != root {
		t.Fatalf("Root = %q, want %q", got.Root, root)
	}
	if got.ComposePath() != filepath.Join(root, ".vector", "process-compose.yaml") {
		t.Fatalf("ComposePath = %q", got.ComposePath())
	}
}

func TestDiscoverNotFound(t *testing.T) {
	if _, err := Discover(t.TempDir()); err == nil {
		t.Fatal("Discover() succeeded without vector.yaml")
	}
}

func TestSocketPathFallsBackWhenTooLong(t *testing.T) {
	short := Project{Root: "/w"}
	if got := short.SocketPath(); got != "/w/.vector/process-compose.sock" {
		t.Fatalf("SocketPath = %q", got)
	}
	long := Project{Root: "/" + strings.Repeat("deep/", 30)}
	got := long.SocketPath()
	if len(got) > maxSocketPath || !strings.HasPrefix(filepath.Base(got), "vector-") {
		t.Fatalf("SocketPath = %q", got)
	}
	if got != long.SocketPath() {
		t.Fatal("SocketPath is not stable")
	}
}

func TestSourceRoundTrip(t *testing.T) {
	root := t.TempDir()
	if got := ReadSource(root); got != "" {
		t.Fatalf("ReadSource = %q", got)
	}
	if err := WriteSource(root, "/src/launch-vector"); err != nil {
		t.Fatal(err)
	}
	if got := ReadSource(root); got != "/src/launch-vector" {
		t.Fatalf("ReadSource = %q", got)
	}
	if err := WriteSource(root, ""); err != nil {
		t.Fatal(err)
	}
	if err := WriteSource(root, ""); err != nil {
		t.Fatal(err)
	}
	if got := ReadSource(root); got != "" {
		t.Fatalf("ReadSource after clear = %q", got)
	}
}
