package workspace

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/imathis/launch-vector/internal/starter"
	"github.com/imathis/launch-vector/internal/vector/config"
)

func repoRoot(t *testing.T) string {
	t.Helper()
	root, err := filepath.Abs(filepath.Join("..", "..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	return root
}

func read(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func TestCreateFromStarter(t *testing.T) {
	files, err := starter.FromCheckout(repoRoot(t))
	if err != nil {
		t.Fatal(err)
	}
	dest := filepath.Join(t.TempDir(), "Chelsea Community")
	if err := Create(files, Options{Dest: dest, LabDependency: "^1.2.3"}); err != nil {
		t.Fatal(err)
	}

	cfg, err := config.Load(filepath.Join(dest, "vector.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Project.Name != "chelsea-community" {
		t.Fatalf("project = %#v", cfg.Project)
	}
	if _, ok := cfg.ResolveApp("lab"); !ok {
		t.Fatal("lab app missing")
	}
	if got := read(t, filepath.Join(dest, "vector.yaml")); !strings.Contains(got, "\n\nnetwork:\n") {
		t.Fatalf("vector.yaml lost its formatting:\n%s", got)
	}
	if got := read(t, filepath.Join(dest, "package.json")); !strings.Contains(got, `"name": "chelsea-community"`) {
		t.Fatalf("package.json name not set:\n%s", got)
	}
	if got := read(t, filepath.Join(dest, "apps/lab/package.json")); !strings.Contains(got, `"@launch-vector/lab": "^1.2.3"`) {
		t.Fatalf("lab dependency not set:\n%s", got)
	}
	if got := read(t, filepath.Join(dest, "README.md")); !strings.HasPrefix(got, "# chelsea-community\n") {
		t.Fatalf("README title = %q", strings.SplitN(got, "\n", 2)[0])
	}
	for _, unwanted := range []string{"node_modules", "apps/web/dist", "apps/lab/src/experiments/sample-dialog"} {
		if _, err := os.Stat(filepath.Join(dest, unwanted)); !os.IsNotExist(err) {
			t.Fatalf("%s was copied into the workspace", unwanted)
		}
	}
	if _, err := os.Stat(filepath.Join(dest, "apps/lab/src/experiments/_template/index.tsx")); err != nil {
		t.Fatalf("experiment template missing: %v", err)
	}
}

func TestCreateWithoutLab(t *testing.T) {
	files, err := starter.FromCheckout(repoRoot(t))
	if err != nil {
		t.Fatal(err)
	}
	dest := filepath.Join(t.TempDir(), "site")
	if err := Create(files, Options{Dest: dest, NoLab: true}); err != nil {
		t.Fatal(err)
	}
	cfg, err := config.Load(filepath.Join(dest, "vector.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := cfg.ResolveApp("lab"); ok {
		t.Fatal("lab app still configured")
	}
	if len(cfg.Apps) != 2 {
		t.Fatalf("apps = %#v", cfg.Apps)
	}
	if _, err := os.Stat(filepath.Join(dest, "apps/lab")); !os.IsNotExist(err) {
		t.Fatal("apps/lab was copied")
	}
}

func TestCreateRefusesNonEmptyDirectory(t *testing.T) {
	dest := t.TempDir()
	if err := os.WriteFile(filepath.Join(dest, "keep.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := Create(nil, Options{Dest: dest}); err == nil {
		t.Fatal("Create() wrote into a non-empty directory")
	}
}

func TestStarterArchiveRoundTrip(t *testing.T) {
	files, err := starter.FromCheckout(repoRoot(t))
	if err != nil {
		t.Fatal(err)
	}
	var archive strings.Builder
	if err := starter.WriteArchive(&archive, files); err != nil {
		t.Fatal(err)
	}
	restored, err := starter.ReadArchive(strings.NewReader(archive.String()))
	if err != nil {
		t.Fatal(err)
	}
	if len(restored) != len(files) || restored[0].Path != files[0].Path {
		t.Fatalf("restored %d files, want %d", len(restored), len(files))
	}
}

func TestSetDependency(t *testing.T) {
	root := t.TempDir()
	write := func(path, contents string) {
		full := filepath.Join(root, path)
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(full, []byte(contents), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("package.json", `{"name": "ws"}`)
	write("apps/lab/package.json", "{\n  \"dependencies\": {\n    \"@launch-vector/lab\": \"^0.1.0\",\n    \"react\": \"^19\"\n  }\n}\n")

	changed, err := SetDependency(root, "@launch-vector/lab", "link:@launch-vector/lab")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Join(changed, ",") != filepath.Join("apps", "lab", "package.json") {
		t.Fatalf("changed = %v", changed)
	}
	want := "{\n  \"dependencies\": {\n    \"@launch-vector/lab\": \"link:@launch-vector/lab\",\n    \"react\": \"^19\"\n  }\n}\n"
	if got := read(t, filepath.Join(root, "apps/lab/package.json")); got != want {
		t.Fatalf("package.json =\n%s", got)
	}
	again, err := SetDependency(root, "@launch-vector/lab", "link:@launch-vector/lab")
	if err != nil || len(again) != 0 {
		t.Fatalf("second SetDependency changed %v, %v", again, err)
	}
}

func TestSlug(t *testing.T) {
	for input, want := range map[string]string{
		"Chelsea Community": "chelsea-community",
		"my_apps":           "my-apps",
		"--x--":             "x",
		"日本":                "",
	} {
		if got := Slug(input); got != want {
			t.Errorf("Slug(%q) = %q, want %q", input, got, want)
		}
	}
}
