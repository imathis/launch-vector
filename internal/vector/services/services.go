// Package services starts and stops workspace apps under Process Compose.
package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/imathis/launch-vector/internal/vector/config"
	vectorruntime "github.com/imathis/launch-vector/internal/vector/runtime"
)

type Services struct {
	m   *vectorruntime.Manager
	out io.Writer
}

func New(m *vectorruntime.Manager, out io.Writer) *Services {
	return &Services{m: m, out: out}
}

func (s *Services) Up(ctx context.Context, app *config.App) error {
	if err := EnsureProxy(ctx, s.out, s.m.Env(), s.m.TLD(), s.m.Port()); err != nil {
		return err
	}
	changed, err := s.writeCompose()
	if err != nil {
		return err
	}
	selected := s.selected(app)

	if !s.supervisorRunning(ctx) {
		_ = os.Remove(s.m.Project.SocketPath())
		// Process Compose expects its settings directory to exist.
		if home, err := os.UserHomeDir(); err == nil {
			_ = os.MkdirAll(filepath.Join(home, ".config", "process-compose"), 0o755)
		}
		args := []string{"up", "--config", s.m.Project.ComposePath(), "--detached", "--keep-project"}
		if err := s.quiet(ctx, append(args, names(selected)...)...); err != nil {
			return err
		}
	} else {
		if changed {
			if err := s.reload(ctx); err != nil {
				return err
			}
		}
		for _, name := range names(selected) {
			if err := s.start(ctx, name); err != nil {
				return err
			}
		}
	}
	s.printRoutes(ctx, selected)
	return nil
}

func (s *Services) Down(ctx context.Context, app *config.App) error {
	if !s.supervisorRunning(ctx) {
		fmt.Fprintln(s.out, "No workspace apps are running.")
		return nil
	}
	if app != nil {
		return s.attached(ctx, "process", "stop", app.Name)
	}
	if err := s.attached(ctx, "down"); err != nil {
		return err
	}
	_ = os.Remove(s.m.Project.SocketPath())
	return nil
}

func (s *Services) Restart(ctx context.Context, app *config.App) error {
	if !s.supervisorRunning(ctx) {
		return s.Up(ctx, app)
	}
	changed, err := s.writeCompose()
	if err != nil {
		return err
	}
	if changed {
		if err := s.reload(ctx); err != nil {
			return err
		}
	}
	selected := s.selected(app)
	for _, name := range names(selected) {
		if _, err := s.capture(ctx, "process", "restart", name); err != nil {
			if err := s.start(ctx, name); err != nil {
				return err
			}
		}
	}
	s.printRoutes(ctx, selected)
	return nil
}

func (s *Services) writeCompose() (bool, error) {
	return WriteCompose(s.m.Project, s.m.TLD(), s.m.Port())
}

// reload applies a changed configuration, then restarts apps that were running.
func (s *Services) reload(ctx context.Context) error {
	running, _ := s.running(ctx)
	if err := s.quiet(ctx, "project", "update", "--config", s.m.Project.ComposePath()); err != nil {
		return err
	}
	for _, name := range running {
		if _, ok := s.m.Project.Config.ResolveApp(name); !ok {
			continue
		}
		if err := s.start(ctx, name); err != nil {
			return err
		}
	}
	return nil
}

func (s *Services) start(ctx context.Context, name string) error {
	output, err := s.capture(ctx, "process", "start", name)
	if err != nil && !strings.Contains(strings.ToLower(output), "already") {
		if output == "" {
			output = "could not start " + name
		}
		return errors.New(output)
	}
	return nil
}

func (s *Services) supervisorRunning(ctx context.Context) bool {
	_, err := s.capture(ctx, "list", "--output", "json")
	return err == nil
}

func (s *Services) running(ctx context.Context) ([]string, error) {
	output, err := s.capture(ctx, "list", "--output", "json")
	if err != nil {
		return nil, err
	}
	states, err := vectorruntime.ParseProcessList([]byte(output))
	if err != nil {
		return nil, err
	}
	var running []string
	for _, state := range states {
		if state.IsRunning {
			running = append(running, state.Name)
		}
	}
	return running, nil
}

func (s *Services) selected(app *config.App) []config.App {
	if app != nil {
		return []config.App{*app}
	}
	return s.m.Project.Config.Apps
}

func (s *Services) printRoutes(ctx context.Context, apps []config.App) {
	hosts := make([]string, 0, len(apps))
	for _, app := range apps {
		hosts = append(hosts, s.m.AppHost(app))
	}
	SyncHosts(ctx, s.out, s.m.Env(), s.m.TLD(), hosts)
	for _, app := range apps {
		fmt.Fprintf(s.out, "%s: %s\n", app.Name, s.routeURL(ctx, app))
	}
}

// routeURL waits briefly for Portless to register a freshly started app.
func (s *Services) routeURL(ctx context.Context, app config.App) string {
	for attempt := 0; attempt < 20; attempt++ {
		lookup, cancel := context.WithTimeout(ctx, 800*time.Millisecond)
		url, ok := s.m.LookupRoute(lookup, app)
		cancel()
		if ok {
			return url
		}
		time.Sleep(100 * time.Millisecond)
	}
	return s.m.DefaultURL(app)
}

func (s *Services) capture(ctx context.Context, args ...string) (string, error) {
	cmd := s.m.ProcessCommand(args...)
	output, err := s.m.Capture(ctx, cmd)
	return strings.TrimSpace(output), err
}

func (s *Services) quiet(ctx context.Context, args ...string) error {
	output, err := s.capture(ctx, args...)
	if err != nil {
		if output == "" {
			return fmt.Errorf("process-compose %s failed: %w", args[0], err)
		}
		return errors.New(output)
	}
	return nil
}

func (s *Services) attached(ctx context.Context, args ...string) error {
	cmd := s.m.ProcessCommand(args...)
	cmd = vectorruntime.CommandWithContext(ctx, cmd)
	cmd.Stdin = os.Stdin
	cmd.Stdout = s.out
	cmd.Stderr = s.out
	return cmd.Run()
}

func names(apps []config.App) []string {
	out := make([]string, len(apps))
	for i, app := range apps {
		out[i] = app.Name
	}
	return out
}
