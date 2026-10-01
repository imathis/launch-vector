package launchvector

import (
	"encoding/json"
	"io/fs"
	"os"
	"regexp"
	"strings"
	"testing"
)

var frontmatterName = regexp.MustCompile(`(?m)^name:\s*(\S+)\s*$`)

// Agent Skills require a name that matches the directory and a description.
func TestSkillsFollowAgentSkillsFormat(t *testing.T) {
	entries, err := fs.ReadDir(Skills(), ".")
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) == 0 {
		t.Fatal("no skills embedded")
	}
	for _, entry := range entries {
		data, err := fs.ReadFile(Skills(), entry.Name()+"/SKILL.md")
		if err != nil {
			t.Fatalf("%s: %v", entry.Name(), err)
		}
		text := string(data)
		if !strings.HasPrefix(text, "---\n") {
			t.Fatalf("%s: SKILL.md has no frontmatter", entry.Name())
		}
		header, _, _ := strings.Cut(strings.TrimPrefix(text, "---\n"), "\n---")
		match := frontmatterName.FindStringSubmatch(header)
		if match == nil || match[1] != entry.Name() {
			t.Fatalf("%s: frontmatter name = %v", entry.Name(), match)
		}
		if !strings.HasPrefix(entry.Name(), "vector-") {
			t.Fatalf("%s: managed skills must use the vector- prefix", entry.Name())
		}
		if !strings.Contains(header, "\ndescription: ") {
			t.Fatalf("%s: frontmatter has no description", entry.Name())
		}
	}
}

// The CLI, the Lab package, and the starter's Lab dependency release together.
func TestLabVersionMatchesStarterDependency(t *testing.T) {
	var lab struct {
		Version string `json:"version"`
	}
	readJSON(t, "packages/lab/package.json", &lab)
	var host struct {
		Dependencies map[string]string `json:"dependencies"`
	}
	readJSON(t, "starter/apps/lab/package.json", &host)
	if got, want := host.Dependencies["@launch-vector/lab"], "^"+lab.Version; got != want {
		t.Fatalf("starter depends on @launch-vector/lab %q, want %q", got, want)
	}
}

func TestAgentsBlockHasNoMarkers(t *testing.T) {
	if strings.Contains(AgentsBlock(), "vector:begin") || strings.Contains(AgentsBlock(), "vector:end") {
		t.Fatal("agents/AGENTS.md must not contain block markers")
	}
}

func readJSON(t *testing.T, path string, target any) {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, target); err != nil {
		t.Fatalf("%s: %v", path, err)
	}
}
