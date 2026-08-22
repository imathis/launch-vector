package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadAndResolveApp(t *testing.T) {
	path := filepath.Join(t.TempDir(), "vector.yaml")
	contents := `version: 1
project: {name: vector, tld: vector.localhost}
network: {port: 2187}
process_compose: {socket: .process-compose.sock}
lifecycle: [bun, tooling/services.ts]
apps:
  - {name: docs, title: Docs, path: apps/docs, route: ui, aliases: [guide]}
tasks: {check: [just, check]}
`
	if err := os.WriteFile(path, []byte(contents), 0o600); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Network.Port != 2187 {
		t.Fatalf("Network.Port = %d", cfg.Network.Port)
	}
	for _, name := range []string{"docs", "ui", "GUIDE"} {
		app, ok := cfg.ResolveApp(name)
		if !ok || app.Name != "docs" {
			t.Fatalf("ResolveApp(%q) = %#v, %v", name, app, ok)
		}
	}
}

func TestLoadRejectsUnknownFields(t *testing.T) {
	path := filepath.Join(t.TempDir(), "vector.yaml")
	contents := `version: 1
project: {name: vector, tld: vector.localhost, typo: true}
network: {port: 2187}
process_compose: {socket: socket}
lifecycle: [true]
apps: [{name: app, title: App, path: app, route: app}]
`
	if err := os.WriteFile(path, []byte(contents), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := Load(path); err == nil {
		t.Fatal("Load() accepted an unknown field")
	}
}

func TestLoadDefaultsNetworkPort(t *testing.T) {
	path := filepath.Join(t.TempDir(), "vector.yaml")
	contents := `version: 1
project: {name: vector, tld: vector.localhost}
process_compose: {socket: socket}
lifecycle: [true]
apps: [{name: app, title: App, path: app, route: app}]
`
	if err := os.WriteFile(path, []byte(contents), 0o600); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Network.Port != DefaultPort {
		t.Fatalf("Network.Port = %d, want %d", cfg.Network.Port, DefaultPort)
	}
}
