package tui

import (
	"errors"
	"testing"

	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/imathis/bootkit/internal/vector/config"
	vectorruntime "github.com/imathis/bootkit/internal/vector/runtime"
)

func TestLifecycleKeyIntents(t *testing.T) {
	tests := []struct {
		key    string
		action string
		all    bool
	}{
		{key: " ", action: "toggle"},
		{key: "u", action: "up"},
		{key: "U", action: "up", all: true},
		{key: "s", action: "down"},
		{key: "S", action: "down", all: true},
		{key: "r", action: "restart"},
		{key: "R", action: "restart", all: true},
	}
	for _, test := range tests {
		t.Run(test.key, func(t *testing.T) {
			intent := intentForKey(test.key)
			if intent.kind != intentLifecycle || intent.action != test.action || intent.all != test.all {
				t.Fatalf("intentForKey(%q) = %#v", test.key, intent)
			}
		})
	}
}

func TestQuitKeysOnlyQuit(t *testing.T) {
	for _, key := range []string{"q", "ctrl+c"} {
		intent := intentForKey(key)
		if intent.kind != intentQuit || intent.action != "" || intent.all {
			t.Fatalf("intentForKey(%q) = %#v", key, intent)
		}
	}
	for _, key := range []string{"esc", "enter", "x", "X", "ctrl+d"} {
		if intent := intentForKey(key); intent.kind != intentNone {
			t.Fatalf("intentForKey(%q) = %#v, want no intent", key, intent)
		}
	}

	m := Model{busy: true, busyAction: "up", busyTarget: "docs"}
	cmd, handled := m.handleKey(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'q'}})
	if !handled || cmd == nil {
		t.Fatal("q was not handled as a quit command")
	}
	if _, ok := cmd().(tea.QuitMsg); !ok {
		t.Fatalf("q command returned %T, want tea.QuitMsg", cmd())
	}
	if !m.busy || m.busyAction != "up" || m.busyTarget != "docs" {
		t.Fatalf("q changed lifecycle state: %#v", m)
	}
}

func TestStatusRefreshDoesNotClearActionBusy(t *testing.T) {
	app := config.App{Name: "docs", Title: "Docs"}
	m := Model{
		apps:       []vectorruntime.AppState{{App: app}},
		busy:       true,
		busyLabel:  "Start Docs",
		busyAction: "up",
		busyTarget: "docs",
		paneMode:   paneOutput,
		paneTitle:  "Start Docs",
		paneOutput: "Running...",
		logs:       make(map[string]string),
		spinner:    newTestSpinner(),
		refreshing: true,
	}
	updated, _ := m.Update(statusMsg{snapshot: vectorruntime.Snapshot{Apps: m.apps, Supervisor: true}})
	got := updated.(Model)
	if !got.busy || got.busyAction != "up" || got.paneOutput != "Running..." {
		t.Fatalf("status refresh changed action state: %#v", got)
	}
}

func TestInitOnlyStartsTheRefreshLoop(t *testing.T) {
	m := Model{}
	if _, ok := m.Init()().(refreshTickMsg); !ok {
		t.Fatalf("Init() returned %T, want refreshTickMsg", m.Init()())
	}
}

func TestStatusResponseDoesNotScheduleAnotherTick(t *testing.T) {
	m := Model{refreshing: true, spinner: newTestSpinner()}
	_, cmd := m.Update(statusMsg{})
	if cmd != nil {
		t.Fatal("status response scheduled work; only refreshTickMsg may continue the periodic loop")
	}
}

func TestActionWarningRemainsVisible(t *testing.T) {
	m := Model{
		busy:       true,
		paneMode:   paneOutput,
		logs:       make(map[string]string),
		spinner:    newTestSpinner(),
		refreshing: true,
	}
	warning := "Host synchronization needs an interactive terminal. Run: portless hosts sync"
	updated, _ := m.Update(actionDoneMsg{label: "Start Docs", output: warning})
	got := updated.(Model)
	if got.message != warning || got.paneOutput != warning {
		t.Fatalf("warning was not retained: message=%q output=%q", got.message, got.paneOutput)
	}
	if got.busy {
		t.Fatal("completed action remained busy")
	}

	updated, _ = got.Update(statusMsg{snapshot: vectorruntime.Snapshot{Supervisor: true}})
	got = updated.(Model)
	if got.message != warning {
		t.Fatalf("status refresh replaced warning with %q", got.message)
	}
}

func TestFailedActionOutputIncludesCapturedOutputAndError(t *testing.T) {
	err := errors.New("exit status 1")
	got := formatActionOutput("details\n", err)
	want := "details\n\nError: exit status 1"
	if got != want {
		t.Fatalf("formatActionOutput() = %q, want %q", got, want)
	}
}

func newTestSpinner() spinner.Model {
	return spinner.New()
}
