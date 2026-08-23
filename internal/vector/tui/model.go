package tui

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/imathis/launch-vector/internal/vector/config"
	vectorruntime "github.com/imathis/launch-vector/internal/vector/runtime"
)

const (
	refreshInterval = time.Second
	actionTimeout   = 15 * time.Minute
	logTailLines    = 200
	maxOutputBytes  = 256 * 1024
)

type paneMode int

const (
	paneLogs paneMode = iota
	paneOutput
)

type Model struct {
	runtime  *vectorruntime.Manager
	apps     []vectorruntime.AppState
	selected int
	width    int
	height   int

	spinner        spinner.Model
	spinnerRunning bool
	refreshing     bool
	logsRequestApp string
	busy           bool
	busyLabel      string
	busyAction     string
	busyTarget     string

	supervisor bool
	message    string
	statusErr  string

	helpExpanded bool
	logsExpanded bool
	paneMode     paneMode
	paneTitle    string
	paneOutput   string
	logs         map[string]string
}

type statusMsg struct {
	snapshot vectorruntime.Snapshot
	err      error
}

type refreshTickMsg time.Time

type logsMsg struct {
	appName string
	output  string
	err     error
}

type actionDoneMsg struct {
	label  string
	output string
	err    error
}

type attachDoneMsg struct {
	err error
}

type intentKind int

const (
	intentNone intentKind = iota
	intentQuit
	intentLifecycle
	intentTask
	intentAttach
	intentOpen
)

type keyIntent struct {
	kind   intentKind
	action string
	all    bool
}

func New(manager *vectorruntime.Manager) Model {
	indicator := spinner.New()
	indicator.Spinner = spinner.Spinner{
		Frames: []string{"|", "/", "-", "\\"},
		FPS:    time.Second / 8,
	}
	apps := make([]vectorruntime.AppState, 0, len(manager.Project.Config.Apps))
	for _, app := range manager.Project.Config.Apps {
		apps = append(apps, vectorruntime.AppState{
			App:          app,
			ProcessState: vectorruntime.ProcessState{Name: app.Name, Status: "Stopped", SystemTime: "-"},
			URL:          manager.DefaultURL(app),
		})
	}
	m := Model{
		runtime:  manager,
		apps:     apps,
		spinner:  indicator,
		message:  "Connecting to workspace services...",
		paneMode: paneLogs,
		logs:     make(map[string]string),
	}
	if len(apps) > 0 {
		m.paneTitle = apps[0].App.Title + " logs"
		m.paneOutput = "Loading logs..."
	}
	return m
}

func (m Model) Init() tea.Cmd {
	return func() tea.Msg { return refreshTickMsg(time.Now()) }
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var commands []tea.Cmd
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		if m.hasActivity() {
			commands = append(commands, cmd)
		} else {
			m.spinnerRunning = false
		}
	case statusMsg:
		m.refreshing = false
		if msg.err != nil {
			m.statusErr = msg.err.Error()
		} else {
			m.statusErr = ""
			m.apps = msg.snapshot.Apps
			m.supervisor = msg.snapshot.Supervisor
			if m.selected >= len(m.apps) {
				m.selected = max(len(m.apps)-1, 0)
			}
			if strings.HasPrefix(m.message, "Connecting") {
				if m.supervisor {
					m.message = "Workspace status is current."
				} else {
					m.message = "Supervisor offline. Apps are stopped."
				}
			}
		}
	case logsMsg:
		if m.logsRequestApp == msg.appName {
			m.logsRequestApp = ""
		}
		output := boundedOutput(msg.output)
		if msg.err != nil {
			if output != "" {
				output += "\n\n"
			}
			output += "Log refresh failed: " + msg.err.Error()
		}
		if output == "" {
			output = "No log output."
		}
		m.logs[msg.appName] = output
		if m.paneMode == paneLogs && m.selectedAppName() == msg.appName {
			m.paneTitle = m.selectedApp().Title + " logs"
			m.paneOutput = output
		}
		if m.paneMode == paneLogs && m.selectedAppName() != msg.appName {
			m.startLogs(&commands)
		}
	case refreshTickMsg:
		commands = append(commands, nextRefreshTick())
		m.startRefresh(&commands)
		m.startLogs(&commands)
	case actionDoneMsg:
		m.busy = false
		m.busyAction = ""
		m.busyTarget = ""
		m.paneMode = paneOutput
		m.paneTitle = msg.label
		m.paneOutput = formatActionOutput(msg.output, msg.err)
		if warning := interactiveWarning(msg.output); warning != "" {
			m.message = warning
		} else if msg.err != nil {
			m.message = fmt.Sprintf("%s failed: %v", msg.label, msg.err)
		} else {
			m.message = msg.label + " completed."
		}
		m.startRefresh(&commands)
	case attachDoneMsg:
		m.paneMode = paneOutput
		m.paneTitle = "Attach"
		if msg.err != nil {
			m.paneOutput = "Attach failed: " + msg.err.Error()
			m.message = m.paneOutput
		} else {
			m.paneOutput = "Returned from the Process Compose dashboard."
			m.message = "Attach closed. Apps were left untouched."
		}
	case tea.KeyMsg:
		if cmd, handled := m.handleKey(msg); handled {
			return m, cmd
		}
	}
	m.ensureSpinner(&commands)
	return m, tea.Batch(commands...)
}

func (m *Model) handleKey(key tea.KeyMsg) (tea.Cmd, bool) {
	value := key.String()
	if intent := intentForKey(value); intent.kind != intentNone {
		return m.runIntent(intent), true
	}

	switch value {
	case "up", "k":
		if m.selected > 0 {
			m.selected--
			return m.showSelectedLogs(m.logsExpanded), true
		}
		return nil, true
	case "down", "j":
		if m.selected < len(m.apps)-1 {
			m.selected++
			return m.showSelectedLogs(m.logsExpanded), true
		}
		return nil, true
	case "l", "enter":
		if m.logsExpanded {
			m.logsExpanded = false
			return nil, true
		}
		return m.showSelectedLogs(true), true
	case "esc":
		if m.logsExpanded {
			m.logsExpanded = false
			return nil, true
		}
	case "?":
		m.helpExpanded = !m.helpExpanded
		return nil, true
	}
	return nil, false
}

func intentForKey(key string) keyIntent {
	switch key {
	case "ctrl+c", "q":
		return keyIntent{kind: intentQuit}
	case " ":
		return keyIntent{kind: intentLifecycle, action: "toggle"}
	case "u":
		return keyIntent{kind: intentLifecycle, action: "up"}
	case "U":
		return keyIntent{kind: intentLifecycle, action: "up", all: true}
	case "s":
		return keyIntent{kind: intentLifecycle, action: "down"}
	case "S":
		return keyIntent{kind: intentLifecycle, action: "down", all: true}
	case "r":
		return keyIntent{kind: intentLifecycle, action: "restart"}
	case "R":
		return keyIntent{kind: intentLifecycle, action: "restart", all: true}
	case "c":
		return keyIntent{kind: intentTask, action: "check"}
	case "d":
		return keyIntent{kind: intentTask, action: "doctor"}
	case "a":
		return keyIntent{kind: intentAttach}
	case "o":
		return keyIntent{kind: intentOpen}
	default:
		return keyIntent{}
	}
}

func (m *Model) runIntent(intent keyIntent) tea.Cmd {
	if intent.kind == intentQuit {
		return tea.Quit
	}
	if m.busy {
		m.message = m.busyLabel + " is still running."
		return nil
	}
	if len(m.apps) == 0 {
		m.message = "No apps are configured."
		return nil
	}

	app := m.selectedApp()
	switch intent.kind {
	case intentLifecycle:
		action := intent.action
		if action == "toggle" {
			action = "up"
			if m.apps[m.selected].IsRunning {
				action = "down"
			}
		}
		var target *config.App
		targetName := ""
		label := lifecycleLabel(action, app.Title, intent.all)
		if !intent.all {
			target = &app
			targetName = app.Name
		}
		return m.execute(label, action, targetName, m.runtime.LifecycleCommand(action, target))
	case intentTask:
		cmd, err := m.runtime.TaskCommand(intent.action)
		label := strings.ToUpper(intent.action[:1]) + intent.action[1:]
		if err != nil {
			m.paneMode = paneOutput
			m.paneTitle = label
			m.paneOutput = err.Error()
			m.message = err.Error()
			return nil
		}
		return m.execute(label, "", "", cmd)
	case intentAttach:
		m.logsExpanded = false
		m.paneMode = paneOutput
		m.paneTitle = "Attach"
		m.paneOutput = "Opening the Process Compose dashboard..."
		m.message = "Attached to Process Compose; close it to return to Vector."
		return tea.ExecProcess(m.runtime.AttachCommand(), func(err error) tea.Msg {
			return attachDoneMsg{err: err}
		})
	case intentOpen:
		cmd, _, err := m.runtime.OpenCommand(app)
		if err != nil {
			m.paneMode = paneOutput
			m.paneTitle = "Open " + app.Title
			m.paneOutput = err.Error()
			m.message = err.Error()
			return nil
		}
		return m.execute("Open "+app.Title, "", "", cmd)
	}
	return nil
}

func (m *Model) execute(label, action, target string, cmd *exec.Cmd) tea.Cmd {
	m.busy = true
	m.busyLabel = label
	m.busyAction = action
	m.busyTarget = target
	m.logsExpanded = false
	m.paneMode = paneOutput
	m.paneTitle = label
	m.paneOutput = "Running..."
	m.message = label + "..."
	manager := m.runtime
	command := func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), actionTimeout)
		defer cancel()
		output, err := manager.Capture(ctx, cmd)
		return actionDoneMsg{label: label, output: output, err: err}
	}
	if m.spinnerRunning {
		return command
	}
	m.spinnerRunning = true
	return tea.Batch(command, m.spinner.Tick)
}

func (m *Model) showSelectedLogs(expanded bool) tea.Cmd {
	if len(m.apps) == 0 {
		return nil
	}
	m.logsExpanded = expanded
	m.paneMode = paneLogs
	app := m.selectedApp()
	m.paneTitle = app.Title + " logs"
	if output := m.logs[app.Name]; output != "" {
		m.paneOutput = output
	} else {
		m.paneOutput = "Loading logs..."
	}
	if m.logsRequestApp != "" {
		return nil
	}
	m.logsRequestApp = app.Name
	cmd := m.loadLogs(app)
	if m.spinnerRunning {
		return cmd
	}
	m.spinnerRunning = true
	return tea.Batch(cmd, m.spinner.Tick)
}

func (m *Model) startRefresh(commands *[]tea.Cmd) {
	if m.refreshing {
		return
	}
	m.refreshing = true
	*commands = append(*commands, m.refresh())
}

func (m *Model) startLogs(commands *[]tea.Cmd) {
	if len(m.apps) == 0 || m.logsRequestApp != "" {
		return
	}
	app := m.selectedApp()
	m.logsRequestApp = app.Name
	*commands = append(*commands, m.loadLogs(app))
}

func (m *Model) ensureSpinner(commands *[]tea.Cmd) {
	if !m.hasActivity() || m.spinnerRunning {
		return
	}
	m.spinnerRunning = true
	*commands = append(*commands, m.spinner.Tick)
}

func (m Model) hasActivity() bool {
	return m.busy || m.refreshing || m.logsRequestApp != ""
}

func (m Model) selectedApp() config.App {
	return m.apps[m.selected].App
}

func (m Model) selectedAppName() string {
	if len(m.apps) == 0 {
		return ""
	}
	return m.apps[m.selected].App.Name
}

func (m Model) refresh() tea.Cmd {
	manager := m.runtime
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		snapshot, err := manager.Refresh(ctx)
		return statusMsg{snapshot: snapshot, err: err}
	}
}

func (m Model) loadLogs(app config.App) tea.Cmd {
	manager := m.runtime
	return func() tea.Msg {
		output, err := manager.TailLogs(context.Background(), app, logTailLines)
		return logsMsg{appName: app.Name, output: output, err: err}
	}
}

func nextRefreshTick() tea.Cmd {
	return tea.Tick(refreshInterval, func(t time.Time) tea.Msg { return refreshTickMsg(t) })
}

func lifecycleLabel(action, title string, all bool) string {
	verb := map[string]string{"up": "Start", "down": "Stop", "restart": "Restart"}[action]
	if all {
		return verb + " all"
	}
	return verb + " " + title
}

func formatActionOutput(output string, err error) string {
	output = boundedOutput(output)
	if err != nil {
		if output != "" {
			output += "\n\n"
		}
		output += "Error: " + err.Error()
	}
	if output == "" {
		return "Completed without output."
	}
	return output
}

func boundedOutput(output string) string {
	if len(output) <= maxOutputBytes {
		return strings.TrimSpace(output)
	}
	start := len(output) - maxOutputBytes
	for start < len(output) && !utf8.RuneStart(output[start]) {
		start++
	}
	return "[earlier output truncated]\n" + strings.TrimSpace(output[start:])
}

func interactiveWarning(output string) string {
	for _, line := range strings.Split(stripANSI(output), "\n") {
		if strings.Contains(strings.ToLower(line), "host synchronization needs an interactive terminal") {
			return strings.TrimSpace(line)
		}
	}
	return ""
}

func Run(manager *vectorruntime.Manager) error {
	_, err := tea.NewProgram(New(manager), tea.WithAltScreen()).Run()
	return err
}
