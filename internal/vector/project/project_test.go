package project

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDiscoverWalksUpward(t *testing.T) {
	root := t.TempDir()
	nested := filepath.Join(root, "apps", "docs", "src")
	if err := os.MkdirAll(nested, 0o700); err != nil {
		t.Fatal(err)
	}
	config := `version: 1
project: {name: vector, tld: vector.localhost}
network: {port: 2187}
process_compose: {socket: .process-compose.sock}
lifecycle: [bun, tooling/services.ts]
apps: [{name: docs, title: Docs, path: apps/docs, route: ui}]
tasks: {}
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
	if got.SocketPath() != filepath.Join(root, ".process-compose.sock") {
		t.Fatalf("SocketPath = %q", got.SocketPath())
	}
}

func TestDiscoverNotFound(t *testing.T) {
	if _, err := Discover(t.TempDir()); err == nil {
		t.Fatal("Discover() succeeded without vector.yaml")
	}
}
