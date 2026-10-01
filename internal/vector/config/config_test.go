package config

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func load(t *testing.T, contents string) (Config, error) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "vector.yaml")
	if err := os.WriteFile(path, []byte(contents), 0o600); err != nil {
		t.Fatal(err)
	}
	return Load(path)
}

func TestLoadAndResolveApp(t *testing.T) {
	cfg, err := load(t, `version: 2
project: {name: vector}
network: {port: 2187}
apps:
  - {name: docs, title: Docs, path: apps/docs, route: ui, aliases: [guide]}
  - {name: weekly, path: apps/weekly, host: weekly}
tasks: {check: [bun, run, check]}
`)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Network.Port != 2187 {
		t.Fatalf("Network.Port = %d", cfg.Network.Port)
	}
	if got := cfg.AppHost(cfg.Apps[0]); got != "ui.vector" {
		t.Fatalf("AppHost(docs) = %q", got)
	}
	if got := cfg.AppHost(cfg.Apps[1]); got != "weekly" {
		t.Fatalf("AppHost(weekly) = %q", got)
	}
	for _, name := range []string{"docs", "ui", "GUIDE"} {
		app, ok := cfg.ResolveApp(name)
		if !ok || app.Name != "docs" {
			t.Fatalf("ResolveApp(%q) = %#v, %v", name, app, ok)
		}
	}
}

func TestLoadAppliesAppDefaults(t *testing.T) {
	cfg, err := load(t, `version: 2
project: {name: vector}
apps: [{name: weekly, path: apps/weekly}]
`)
	if err != nil {
		t.Fatal(err)
	}
	app := cfg.Apps[0]
	if app.Title != "weekly" || app.Route != "weekly" {
		t.Fatalf("defaults = %#v", app)
	}
	if !reflect.DeepEqual(app.Command, DefaultCommand) {
		t.Fatalf("Command = %v", app.Command)
	}
	if cfg.Network.Port != DefaultPort {
		t.Fatalf("Network.Port = %d, want %d", cfg.Network.Port, DefaultPort)
	}
	if got := cfg.AppHost(app); got != "weekly.vector" {
		t.Fatalf("AppHost = %q", got)
	}
}

func TestLoadRejectsUnknownFields(t *testing.T) {
	_, err := load(t, `version: 2
project: {name: vector, typo: true}
apps: [{name: app, path: app}]
`)
	if err == nil {
		t.Fatal("Load() accepted an unknown field")
	}
}

func TestLoadExplainsVersionOne(t *testing.T) {
	_, err := load(t, `version: 1
project: {name: vector, tld: vector.localhost}
process_compose: {socket: .process-compose.sock}
lifecycle: [bun, tooling/services.ts]
apps: [{name: app, title: App, path: app, route: app}]
`)
	if err == nil || !strings.Contains(err.Error(), "version: 2") {
		t.Fatalf("Load() error = %v", err)
	}
}

func TestLoadRejectsNewerVersion(t *testing.T) {
	_, err := load(t, `version: 3
project: {name: vector}
apps: [{name: app, path: app}]
`)
	if err == nil || !strings.Contains(err.Error(), "vector update") {
		t.Fatalf("Load() error = %v", err)
	}
}

func TestLoadRejectsPathsOutsideWorkspace(t *testing.T) {
	_, err := load(t, `version: 2
project: {name: vector}
apps: [{name: app, path: ../elsewhere}]
`)
	if err == nil {
		t.Fatal("Load() accepted a path outside the workspace")
	}
}

func TestLoadRejectsSharedIdentifiers(t *testing.T) {
	_, err := load(t, `version: 2
project: {name: vector}
apps:
  - {name: web, path: apps/web, aliases: [docs]}
  - {name: docs, path: apps/docs}
`)
	if err == nil {
		t.Fatal("Load() accepted duplicate identifiers")
	}
}

func TestLoadRejectsInvalidHostnames(t *testing.T) {
	for name, contents := range map[string]string{
		"project": "version: 2\nproject: {name: My_Site}\napps: [{name: web, path: apps/web}]\n",
		"route":   "version: 2\nproject: {name: site}\napps: [{name: web, path: apps/web, route: Web}]\n",
		"host":    "version: 2\nproject: {name: site}\napps: [{name: web, path: apps/web, host: web.localhost.}]\n",
	} {
		if _, err := load(t, contents); err == nil {
			t.Errorf("%s: Load() accepted an invalid hostname", name)
		}
	}
}
