package runtime

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	goruntime "runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/imathis/bootkit/internal/vector/config"
	"github.com/imathis/bootkit/internal/vector/project"
)

const (
	routeTimeout = 800 * time.Millisecond
	logsTimeout  = 2 * time.Second
)

type ProcessState struct {
	Name             string  `json:"name"`
	Status           string  `json:"status"`
	SystemTime       string  `json:"system_time"`
	PID              int     `json:"pid"`
	Mem              int64   `json:"mem"`
	CPU              float64 `json:"cpu"`
	IsRunning        bool    `json:"is_running"`
	Restarts         int     `json:"restarts"`
	ExitCode         int     `json:"exit_code"`
	SuccessExitCodes []int   `json:"success_exit_codes"`
}

type AppState struct {
	App config.App
	ProcessState
	URL string
}

type Snapshot struct {
	Apps       []AppState
	Supervisor bool
}

type Manager struct {
	Project project.Project

	mu       sync.Mutex
	urlCache map[string]string
}

func New(p project.Project) *Manager {
	return &Manager{Project: p, urlCache: make(map[string]string)}
}

func (m *Manager) LifecycleCommand(action string, app *config.App) *exec.Cmd {
	args := append([]string(nil), m.Project.Config.Lifecycle...)
	args = append(args, action)
	if app != nil {
		args = append(args, app.Name)
	}
	return m.command(args)
}

func (m *Manager) TaskCommand(name string) (*exec.Cmd, error) {
	command, ok := m.Project.Config.Tasks[name]
	if !ok {
		return nil, fmt.Errorf("task %q is not configured", name)
	}
	return m.command(command), nil
}

func (m *Manager) ProcessCommand(args ...string) *exec.Cmd {
	command := []string{"process-compose", "--use-uds", "--unix-socket", m.Project.SocketPath()}
	return m.command(append(command, args...))
}

func (m *Manager) LogsCommand(app *config.App) *exec.Cmd {
	selected := make([]string, 0, len(m.Project.Config.Apps))
	if app != nil {
		selected = append(selected, app.Name)
	} else {
		for _, configured := range m.Project.Config.Apps {
			selected = append(selected, configured.Name)
		}
	}
	return m.ProcessCommand("process", "logs", strings.Join(selected, ","), "--follow", "--tail", "200")
}

func (m *Manager) TailLogs(ctx context.Context, app config.App, tail int) (string, error) {
	if tail < 1 {
		tail = 1
	}
	ctx, cancel := context.WithTimeout(ctx, logsTimeout)
	defer cancel()

	cmd := m.tailLogsCommand(app, tail)
	cmd = commandWithContext(ctx, cmd)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	if stdout.Len() > 0 {
		// Process Compose can report a harmless broken pipe after producing usable logs.
		return stdout.String(), nil
	}
	message := strings.TrimSpace(stderr.String())
	if err != nil {
		if strings.Contains(strings.ToLower(message), "broken pipe") {
			return "", nil
		}
		if message != "" {
			return message, err
		}
		return "", err
	}
	return message, nil
}

func (m *Manager) tailLogsCommand(app config.App, tail int) *exec.Cmd {
	return m.ProcessCommand("process", "logs", app.Name, "--tail", strconv.Itoa(tail), "--raw-log")
}

func (m *Manager) AttachCommand() *exec.Cmd {
	return m.ProcessCommand("attach")
}

func (m *Manager) OpenCommand(app config.App) (*exec.Cmd, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), routeTimeout)
	defer cancel()
	url := m.RouteURL(ctx, app)
	var command []string
	switch goruntime.GOOS {
	case "darwin":
		command = []string{"open", url}
	case "linux":
		command = []string{"xdg-open", url}
	default:
		return nil, url, fmt.Errorf("opening URLs is not supported on %s", goruntime.GOOS)
	}
	return m.command(command), url, nil
}

func (m *Manager) TLD() string {
	for _, key := range []string{"VECTOR_TLD", "PORTLESS_TLD"} {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return strings.TrimPrefix(value, ".")
		}
	}
	return strings.TrimPrefix(m.Project.Config.Project.TLD, ".")
}

func (m *Manager) Port() int {
	for _, key := range []string{"VECTOR_PORT", "PORTLESS_PORT"} {
		if value, err := strconv.Atoi(os.Getenv(key)); err == nil && value >= 1 && value <= 65535 {
			return value
		}
	}
	return m.Project.Config.Network.Port
}

func (m *Manager) DefaultURL(app config.App) string {
	host := fmt.Sprintf("%s.%s", app.Route, m.TLD())
	if m.Port() == 443 {
		return "https://" + host
	}
	return fmt.Sprintf("https://%s:%d", host, m.Port())
}

func (m *Manager) Run(cmd *exec.Cmd) error {
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (m *Manager) Capture(ctx context.Context, cmd *exec.Cmd) (string, error) {
	output, err := commandWithContext(ctx, cmd).CombinedOutput()
	return string(output), err
}

func (m *Manager) Refresh(ctx context.Context) (Snapshot, error) {
	states, available, err := m.processes(ctx)
	if err != nil {
		return Snapshot{}, err
	}
	byName := make(map[string]ProcessState, len(states))
	for _, state := range states {
		byName[state.Name] = state
	}

	apps := make([]AppState, 0, len(m.Project.Config.Apps))
	for _, app := range m.Project.Config.Apps {
		state, ok := byName[app.Name]
		if !ok {
			state = ProcessState{Name: app.Name, Status: "Stopped", SystemTime: "-"}
		} else if !state.IsRunning {
			state.PID = 0
			state.Mem = 0
			state.CPU = 0
			state.SystemTime = "-"
		}
		apps = append(apps, AppState{App: app, ProcessState: state, URL: m.RouteURL(ctx, app)})
	}
	return Snapshot{Apps: apps, Supervisor: available}, nil
}

func (m *Manager) processes(ctx context.Context) ([]ProcessState, bool, error) {
	cmd := m.ProcessCommand("list", "--output", "json")
	cmd = commandWithContext(ctx, cmd)
	output, err := cmd.Output()
	if err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) || errors.Is(err, exec.ErrNotFound) || errors.Is(err, os.ErrNotExist) {
			return nil, false, nil
		}
		return nil, false, err
	}
	states, err := ParseProcessList(output)
	if err != nil {
		return nil, true, fmt.Errorf("decode Process Compose status: %w", err)
	}
	return states, true, nil
}

func ParseProcessList(output []byte) ([]ProcessState, error) {
	output = bytes.TrimSpace(output)
	if len(output) == 0 {
		return nil, errors.New("empty response")
	}
	if output[0] == '[' {
		var states []ProcessState
		if err := json.Unmarshal(output, &states); err != nil {
			return nil, err
		}
		return states, nil
	}
	var response struct {
		Data []ProcessState `json:"data"`
	}
	if err := json.Unmarshal(output, &response); err != nil {
		return nil, err
	}
	return response.Data, nil
}

func (m *Manager) RouteURL(ctx context.Context, app config.App) string {
	m.mu.Lock()
	if url := m.urlCache[app.Route]; url != "" {
		m.mu.Unlock()
		return url
	}
	m.mu.Unlock()

	fallback := m.DefaultURL(app)
	cmd := exec.CommandContext(ctx, "portless", "get", app.Route)
	cmd.Dir = m.Project.Root
	cmd.Env = m.projectEnv()
	output, err := cmd.Output()
	url := strings.TrimSpace(string(output))
	if err != nil || !(strings.HasPrefix(url, "https://") || strings.HasPrefix(url, "http://")) {
		return fallback
	}
	m.mu.Lock()
	m.urlCache[app.Route] = url
	m.mu.Unlock()
	return url
}

func (m *Manager) command(command []string) *exec.Cmd {
	cmd := exec.Command(command[0], command[1:]...)
	cmd.Dir = m.Project.Root
	cmd.Env = m.projectEnv()
	return cmd
}

func (m *Manager) projectEnv() []string {
	env := os.Environ()
	tld := m.TLD()
	port := strconv.Itoa(m.Port())
	for key, value := range map[string]string{
		"VECTOR_TLD":    tld,
		"VECTOR_PORT":   port,
		"PORTLESS_TLD":  tld,
		"PORTLESS_PORT": port,
	} {
		env = envWith(env, key, value)
	}
	return env
}

func commandWithContext(ctx context.Context, source *exec.Cmd) *exec.Cmd {
	cmd := exec.CommandContext(ctx, source.Path, source.Args[1:]...)
	cmd.Dir = source.Dir
	cmd.Env = source.Env
	return cmd
}

func envWith(source []string, key, value string) []string {
	prefix := key + "="
	env := make([]string, 0, len(source)+1)
	for _, entry := range source {
		if !strings.HasPrefix(entry, prefix) {
			env = append(env, entry)
		}
	}
	return append(env, prefix+value)
}
