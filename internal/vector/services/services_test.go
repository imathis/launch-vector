package services

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"

	"github.com/imathis/launch-vector/internal/vector/config"
	"github.com/imathis/launch-vector/internal/vector/project"
)

func testProject(root string) project.Project {
	return project.Project{Root: root, Config: config.Config{
		Version: 2,
		Project: config.Project{Name: "chelsea"},
		Apps: []config.App{
			{Name: "web", Title: "Web", Path: "apps/web", Route: "web", Command: []string{"bun", "run", "dev"}},
			{Name: "weekly", Title: "Weekly", Path: "apps/weekly", Route: "weekly", Host: "weekly", Command: []string{"sh", "-c", "bun run db:migrate && vite"}},
		},
	}}
}

func TestRenderComposeRunsAppsBehindPortless(t *testing.T) {
	data, err := RenderCompose(testProject("/w"), "localhost", 2187)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(data), composeHeader) {
		t.Fatal("generated config lacks its header")
	}
	var file composeFile
	if err := yaml.Unmarshal(data, &file); err != nil {
		t.Fatal(err)
	}
	web := file.Processes["web"]
	if web.Command != "portless web.chelsea bun run dev" || web.WorkingDir != "/w/apps/web" {
		t.Fatalf("web = %#v", web)
	}
	if web.Description != "Web at web.chelsea.localhost" {
		t.Fatalf("web description = %q", web.Description)
	}
	if !strings.Contains(strings.Join(web.Environment, " "), "PORTLESS_TLD=localhost") {
		t.Fatalf("web environment = %v", web.Environment)
	}
	weekly := file.Processes["weekly"]
	if weekly.Command != "portless weekly sh -c 'bun run db:migrate && vite'" {
		t.Fatalf("weekly command = %q", weekly.Command)
	}
	if weekly.Description != "Weekly at weekly.localhost" {
		t.Fatalf("weekly description = %q", weekly.Description)
	}
}

func TestWriteComposeReportsChanges(t *testing.T) {
	root := t.TempDir()
	p := testProject(root)
	changed, err := WriteCompose(p, "localhost", 2187)
	if err != nil || !changed {
		t.Fatalf("first write changed=%v err=%v", changed, err)
	}
	changed, err = WriteCompose(p, "localhost", 2187)
	if err != nil || changed {
		t.Fatalf("second write changed=%v err=%v", changed, err)
	}
	changed, err = WriteCompose(p, "localhost", 8443)
	if err != nil || !changed {
		t.Fatalf("port change changed=%v err=%v", changed, err)
	}
	ignore, err := os.ReadFile(filepath.Join(root, ".vector", ".gitignore"))
	if err != nil || string(ignore) != "*\n" {
		t.Fatalf(".vector/.gitignore = %q, %v", ignore, err)
	}
}

func TestParseDoctor(t *testing.T) {
	running := `Version: 0.15.5
Proxy target: https://127.0.0.1:2187
Mode: HTTPS, .chelsea.localhost, .localhost

ok    Proxy is responding on port 2187.
`
	state := ParseDoctor(running)
	if !state.Responding || state.Port != 2187 || strings.Join(state.TLDs, ",") != "chelsea.localhost,localhost" {
		t.Fatalf("ParseDoctor() = %#v", state)
	}
	if state.Serves(2187, "localhost") {
		t.Fatal("Serves() accepted a proxy with extra TLDs")
	}
	single := ParseDoctor(strings.Replace(running, ".chelsea.localhost, ", "", 1))
	if !single.Serves(2187, "localhost") {
		t.Fatalf("Serves() rejected a matching proxy: %#v", single)
	}
	if single.Serves(2187, "other.localhost") || single.Serves(443, "localhost") {
		t.Fatal("Serves() accepted a mismatched proxy")
	}

	stopped := ParseDoctor("Proxy target: https://127.0.0.1:2187\nMode: HTTPS, .localhost\nwarn  Proxy is not running on port 2187.\n")
	if stopped.Responding || stopped.Serves(2187, "localhost") {
		t.Fatalf("stopped proxy reported as serving: %#v", stopped)
	}
}

func TestShellQuote(t *testing.T) {
	for input, want := range map[string]string{
		"vite":           "vite",
		"dev:app":        "dev:app",
		"a b":            "'a b'",
		"it's":           `'it'\''s'`,
		"":               "''",
		"PORT=1 && vite": "'PORT=1 && vite'",
	} {
		if got := shellQuote(input); got != want {
			t.Errorf("shellQuote(%q) = %q, want %q", input, got, want)
		}
	}
}
