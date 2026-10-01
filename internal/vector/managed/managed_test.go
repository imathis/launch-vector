package managed

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
)

func assets(skills ...string) Assets {
	files := fstest.MapFS{}
	for _, name := range skills {
		files[name+"/SKILL.md"] = &fstest.MapFile{Data: []byte("---\nname: " + name + "\n---\n")}
		files[name+"/references/notes.md"] = &fstest.MapFile{Data: []byte("notes")}
	}
	return Assets{Skills: files, Block: "Framework rules.", Version: "0.2.0"}
}

func read(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func TestInstallWritesSkillsLinksAndAgents(t *testing.T) {
	root := t.TempDir()
	third := filepath.Join(root, ".agents", "skills", "shadcn")
	if err := os.MkdirAll(third, 0o755); err != nil {
		t.Fatal(err)
	}

	report, err := Install(root, assets("vector-lab", "vector-add-component"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Join(report.Skills, ",") != "vector-add-component,vector-lab" {
		t.Fatalf("Skills = %v", report.Skills)
	}
	if got := read(t, filepath.Join(root, ".agents/skills/vector-lab/references/notes.md")); got != "notes" {
		t.Fatalf("nested skill file = %q", got)
	}
	for _, name := range []string{"vector-lab", "vector-add-component", "shadcn"} {
		target, err := os.Readlink(filepath.Join(root, ".claude/skills", name))
		if err != nil {
			t.Fatalf("link %s: %v", name, err)
		}
		if target != filepath.Join("..", "..", ".agents", "skills", name) {
			t.Fatalf("link %s -> %s", name, target)
		}
	}
	agents := read(t, filepath.Join(root, "AGENTS.md"))
	if !strings.Contains(agents, "Framework rules.") || BlockVersion(agents) != "0.2.0" {
		t.Fatalf("AGENTS.md = %q", agents)
	}
	if got := read(t, filepath.Join(root, "CLAUDE.md")); got != "@AGENTS.md\n" {
		t.Fatalf("CLAUDE.md = %q", got)
	}
}

func TestInstallReplacesManagedFilesAndKeepsUserFiles(t *testing.T) {
	root := t.TempDir()
	if _, err := Install(root, assets("vector-lab", "vector-old")); err != nil {
		t.Fatal(err)
	}
	// User edits to a managed skill are replaced; user-owned files are kept.
	edited := filepath.Join(root, ".agents/skills/vector-lab/SKILL.md")
	if err := os.WriteFile(edited, []byte("local edit"), 0o644); err != nil {
		t.Fatal(err)
	}
	userSkill := filepath.Join(root, ".claude/skills/mine")
	if err := os.MkdirAll(userSkill, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "CLAUDE.md"), []byte("custom\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	report, err := Install(root, assets("vector-lab"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Join(report.Removed, ",") != "vector-old" {
		t.Fatalf("Removed = %v", report.Removed)
	}
	if strings.Contains(read(t, edited), "local edit") {
		t.Fatal("managed skill kept a local edit")
	}
	if _, err := os.Lstat(filepath.Join(root, ".claude/skills/vector-old")); !os.IsNotExist(err) {
		t.Fatalf("stale link still present: %v", err)
	}
	if info, err := os.Lstat(userSkill); err != nil || !info.IsDir() {
		t.Fatalf("user skill directory changed: %v", err)
	}
	if got := read(t, filepath.Join(root, "CLAUDE.md")); got != "custom\n" {
		t.Fatalf("CLAUDE.md overwritten: %q", got)
	}
}

func TestInstallIsIdempotent(t *testing.T) {
	root := t.TempDir()
	if _, err := Install(root, assets("vector-lab")); err != nil {
		t.Fatal(err)
	}
	report, err := Install(root, assets("vector-lab"))
	if err != nil {
		t.Fatal(err)
	}
	if report.Agents || len(report.Linked) != 0 || len(report.Removed) != 0 {
		t.Fatalf("second install changed files: %#v", report)
	}
}

func TestInstallRejectsSkillWithoutManifest(t *testing.T) {
	files := fstest.MapFS{"vector-broken/README.md": &fstest.MapFile{Data: []byte("x")}}
	if _, err := Install(t.TempDir(), Assets{Skills: files}); err == nil {
		t.Fatal("Install() accepted a skill without SKILL.md")
	}
}

func TestReplaceBlock(t *testing.T) {
	tests := map[string]struct {
		content string
		want    string
	}{
		"below heading": {
			content: "# Guide\n\nProject notes.\n",
			want:    "# Guide\n\n<!-- vector:begin v1.0.0 — managed by `vector update`; edits inside this block are replaced -->\nRules\n<!-- vector:end -->\n\nProject notes.\n",
		},
		"no heading": {
			content: "Notes.\n",
			want:    "<!-- vector:begin v1.0.0 — managed by `vector update`; edits inside this block are replaced -->\nRules\n<!-- vector:end -->\n\nNotes.\n",
		},
		"existing block": {
			content: "# Guide\n\n<!-- vector:begin v0.1.0 -->\nOld\n<!-- vector:end -->\n\nMine.\n",
			want:    "# Guide\n\n<!-- vector:begin v1.0.0 — managed by `vector update`; edits inside this block are replaced -->\nRules\n<!-- vector:end -->\n\nMine.\n",
		},
		"empty starter block": {
			content: "# Guide\n\n<!-- vector:begin -->\n<!-- vector:end -->\n",
			want:    "# Guide\n\n<!-- vector:begin v1.0.0 — managed by `vector update`; edits inside this block are replaced -->\nRules\n<!-- vector:end -->\n",
		},
	}
	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			got, err := ReplaceBlock(test.content, "Rules\n", "1.0.0")
			if err != nil {
				t.Fatal(err)
			}
			if got != test.want {
				t.Fatalf("ReplaceBlock() =\n%s\nwant\n%s", got, test.want)
			}
		})
	}
	if _, err := ReplaceBlock("<!-- vector:begin -->\nno end", "Rules", ""); err == nil {
		t.Fatal("ReplaceBlock() accepted an unterminated block")
	}
}
