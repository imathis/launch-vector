package runtime

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/imathis/launch-vector/internal/vector/config"
	"github.com/imathis/launch-vector/internal/vector/project"
)

func TestParseProcessList(t *testing.T) {
	for _, input := range []string{
		`[{"name":"docs","status":"Running","pid":42,"mem":2048,"is_running":true}]`,
		`{"data":[{"name":"docs","status":"Running","pid":42,"mem":2048,"is_running":true}]}`,
	} {
		states, err := ParseProcessList([]byte(input))
		if err != nil {
			t.Fatal(err)
		}
		if len(states) != 1 || states[0].Name != "docs" || states[0].PID != 42 || !states[0].IsRunning {
			t.Fatalf("ParseProcessList() = %#v", states)
		}
	}
}

func TestFormatMemory(t *testing.T) {
	tests := map[int64]string{0: "-", 512: "512 B", 1536: "1.5 KiB", 1048576: "1.0 MiB"}
	for input, want := range tests {
		if got := FormatMemory(input); got != want {
			t.Errorf("FormatMemory(%d) = %q, want %q", input, got, want)
		}
	}
}

func TestDisplayStatus(t *testing.T) {
	if got := DisplayStatus(ProcessState{Status: "Completed", ExitCode: 1}); got != "Failed" {
		t.Fatalf("DisplayStatus() = %q", got)
	}
	if got := DisplayStatus(ProcessState{Status: "Completed", ExitCode: 130, SuccessExitCodes: []int{130, 143}}); got != "Stopped" {
		t.Fatalf("DisplayStatus() = %q", got)
	}
	if got := DisplayStatus(ProcessState{Status: "Pending"}); got != "Stopped" {
		t.Fatalf("DisplayStatus() = %q", got)
	}
	if got := DisplayStatus(ProcessState{Status: "Disabled"}); got != "Stopped" {
		t.Fatalf("DisplayStatus() = %q", got)
	}
}

func TestCaptureCollectsStdoutAndStderr(t *testing.T) {
	manager := New(project.Project{
		Root: t.TempDir(),
		Config: config.Config{Tasks: map[string][]string{
			"check": {"sh", "-c", "printf stdout; printf stderr >&2; exit 7"},
		}},
	})
	cmd, commandErr := manager.TaskCommand("check")
	if commandErr != nil {
		t.Fatal(commandErr)
	}
	output, err := manager.Capture(context.Background(), cmd)
	if err == nil {
		t.Fatal("Capture() error = nil, want command failure")
	}
	if !strings.Contains(output, "stdout") || !strings.Contains(output, "stderr") {
		t.Fatalf("Capture() output = %q", output)
	}
}

func TestTailLogsCommand(t *testing.T) {
	manager := New(project.Project{Root: "/workspace"})
	cmd := manager.tailLogsCommand(config.App{Name: "docs"}, 25)
	want := []string{
		"process-compose", "--use-uds", "--unix-socket", "/workspace/.vector/process-compose.sock",
		"process", "logs", "docs", "--tail", "25", "--raw-log",
	}
	if strings.Join(cmd.Args, "\x00") != strings.Join(want, "\x00") {
		t.Fatalf("tail logs command = %q, want %q", cmd.Args, want)
	}
}

func TestDefaultURLIncludesProject(t *testing.T) {
	manager := New(project.Project{Config: config.Config{
		Project: config.Project{Name: "chelsea"},
		Network: config.Network{Port: 2187},
	}})
	if got := manager.DefaultURL(config.App{Route: "docs"}); got != "https://docs.chelsea.localhost:2187" {
		t.Fatalf("DefaultURL() = %q", got)
	}
}

func TestDefaultURLUsesAppHost(t *testing.T) {
	manager := New(project.Project{Config: config.Config{
		Project: config.Project{Name: "chelsea"},
		Network: config.Network{Port: 2187},
	}})
	app := config.App{Route: "weekly", Host: "weekly"}
	if got := manager.DefaultURL(app); got != "https://weekly.localhost:2187" {
		t.Fatalf("DefaultURL() = %q", got)
	}
}

func TestNetworkEnvironmentOverridesConfiguration(t *testing.T) {
	t.Setenv("VECTOR_TLD", "test")
	t.Setenv("VECTOR_PORT", "443")
	manager := New(project.Project{Config: config.Config{
		Project: config.Project{Name: "chelsea"},
		Network: config.Network{Port: 2187},
	}})
	if got := manager.DefaultURL(config.App{Route: "web"}); got != "https://web.chelsea.test" {
		t.Fatalf("DefaultURL() = %q", got)
	}
}

func TestLifecycleCommandReinvokesVector(t *testing.T) {
	manager := New(project.Project{Root: "/workspace"})
	cmd := manager.LifecycleCommand("restart", &config.App{Name: "docs"})
	executable, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	want := []string{executable, "restart", "docs"}
	if strings.Join(cmd.Args, "\x00") != strings.Join(want, "\x00") || cmd.Dir != "/workspace" {
		t.Fatalf("LifecycleCommand() = %q in %q", cmd.Args, cmd.Dir)
	}
}
