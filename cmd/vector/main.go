package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"text/tabwriter"
	"time"

	"golang.org/x/term"

	"github.com/imathis/launch-vector/internal/vector/config"
	"github.com/imathis/launch-vector/internal/vector/project"
	vectorruntime "github.com/imathis/launch-vector/internal/vector/runtime"
	"github.com/imathis/launch-vector/internal/vector/selfupdate"
	"github.com/imathis/launch-vector/internal/vector/services"
	"github.com/imathis/launch-vector/internal/vector/tui"
)

// version is set at release time with -ldflags "-X main.version=<version>".
var version = "dev"

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "vector:", err)
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			os.Exit(exitErr.ExitCode())
		}
		os.Exit(1)
	}
}

func run(args []string) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	command, rest := "", args
	if len(args) > 0 {
		command, rest = args[0], args[1:]
	}
	switch command {
	case "help", "-h", "--help":
		printHelp()
		return nil
	case "version", "--version":
		fmt.Println("vector", version)
		return nil
	case "new":
		return runNew(ctx, rest)
	case "setup":
		return runSetup(ctx, rest)
	case "update":
		return runUpdate(ctx, rest)
	}

	cwd, err := os.Getwd()
	if err != nil {
		return err
	}
	proj, err := project.Discover(cwd)
	if errors.Is(err, project.ErrNotFound) {
		return fmt.Errorf("%w; run inside a workspace or create one with: vector new <dir>", err)
	}
	if err != nil {
		return err
	}
	manager := vectorruntime.New(proj)
	lifecycle := services.New(manager, os.Stdout)

	switch command {
	case "":
		defer notifyUpdate(ctx)
		if !term.IsTerminal(int(os.Stdin.Fd())) || !term.IsTerminal(int(os.Stdout.Fd())) {
			return printStatus(manager)
		}
		return tui.Run(manager)
	case "up", "down", "restart":
		app, err := optionalApp(proj.Config, rest)
		if err != nil {
			return err
		}
		switch command {
		case "up":
			defer notifyUpdate(ctx)
			return lifecycle.Up(ctx, app)
		case "down":
			return lifecycle.Down(ctx, app)
		default:
			return lifecycle.Restart(ctx, app)
		}
	case "status":
		if err := noArgs(command, rest); err != nil {
			return err
		}
		defer notifyUpdate(ctx)
		return printStatus(manager)
	case "logs":
		app, err := optionalApp(proj.Config, rest)
		if err != nil {
			return err
		}
		return manager.Run(manager.LogsCommand(app))
	case "open":
		app, err := requiredApp(proj.Config, rest)
		if err != nil {
			return err
		}
		cmd, url, err := manager.OpenCommand(app)
		if err != nil {
			return err
		}
		fmt.Println(url)
		return manager.Run(cmd)
	case "check", "doctor":
		if err := noArgs(command, rest); err != nil {
			return err
		}
		cmd, err := manager.TaskCommand(command)
		if err != nil {
			return err
		}
		return manager.Run(cmd)
	case "attach":
		if err := noArgs(command, rest); err != nil {
			return err
		}
		return manager.Run(manager.AttachCommand())
	default:
		return fmt.Errorf("unknown command %q; run vector help", command)
	}
}

// parseFlags lets flags appear before or after positional arguments.
func parseFlags(flags *flag.FlagSet, args []string) ([]string, error) {
	var positional []string
	for {
		if err := flags.Parse(args); err != nil {
			return nil, err
		}
		if flags.NArg() == 0 {
			return positional, nil
		}
		positional = append(positional, flags.Arg(0))
		args = flags.Args()[1:]
	}
}

// notifyUpdate prints a one-line notice when a newer release exists.
func notifyUpdate(ctx context.Context) {
	if !term.IsTerminal(int(os.Stderr.Fd())) {
		return
	}
	latest := selfupdate.Available(ctx, version, func(ctx context.Context) (selfupdate.Release, error) {
		return selfupdate.NewClient().Latest(ctx)
	})
	if latest != "" {
		fmt.Fprintf(os.Stderr, "\nvector %s is available (you have %s). Run: vector update\n", latest, version)
	}
}

func optionalApp(cfg config.Config, args []string) (*config.App, error) {
	if len(args) == 0 {
		return nil, nil
	}
	if len(args) > 1 {
		return nil, errors.New("expected at most one app")
	}
	app, ok := cfg.ResolveApp(args[0])
	if !ok {
		return nil, unknownApp(cfg, args[0])
	}
	return &app, nil
}

func requiredApp(cfg config.Config, args []string) (config.App, error) {
	if len(args) != 1 {
		return config.App{}, errors.New("expected exactly one app")
	}
	app, ok := cfg.ResolveApp(args[0])
	if !ok {
		return config.App{}, unknownApp(cfg, args[0])
	}
	return app, nil
}

func unknownApp(cfg config.Config, value string) error {
	names := make([]string, 0, len(cfg.Apps))
	for _, app := range cfg.Apps {
		names = append(names, app.Name)
	}
	return fmt.Errorf("unknown app %q; choose %s", value, strings.Join(names, ", "))
}

func noArgs(command string, args []string) error {
	if len(args) > 0 {
		return fmt.Errorf("%s does not accept arguments", command)
	}
	return nil
}

func printStatus(manager *vectorruntime.Manager) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	snapshot, err := manager.Refresh(ctx)
	if err != nil {
		return err
	}
	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "APP\tSTATUS\tPID\tUPTIME\tMEMORY\tROUTE")
	for _, app := range snapshot.Apps {
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\t%s\n",
			app.App.Name,
			vectorruntime.DisplayStatus(app.ProcessState),
			plainNumber(app.PID),
			plainValue(app.SystemTime),
			vectorruntime.FormatMemory(app.Mem),
			app.URL,
		)
	}
	if err := w.Flush(); err != nil {
		return err
	}
	if !snapshot.Supervisor {
		fmt.Fprintln(os.Stdout, "\nSupervisor offline; configured apps shown as stopped.")
	}
	return nil
}

func plainNumber(value int) string {
	if value == 0 {
		return "-"
	}
	return fmt.Sprintf("%d", value)
}

func plainValue(value string) string {
	if value == "" {
		return "-"
	}
	return value
}

func displayPath(path string) string {
	if cwd, err := os.Getwd(); err == nil {
		if rel, err := filepath.Rel(cwd, path); err == nil && !strings.HasPrefix(rel, "..") {
			return rel
		}
	}
	return path
}

func printHelp() {
	fmt.Print(`vector creates Launch Vector workspaces and runs their apps.

Usage:
  vector                         Open the interactive dashboard
  vector new <dir>               Create a workspace (--no-lab, --name <name>)
  vector setup                   Install tools, dependencies, and agent skills
  vector update                  Update vector, the Lab, and agent skills
  vector up [app]                Start all apps or one app
  vector down [app]              Stop all apps or one app
  vector restart [app]           Restart all apps or one app
  vector status                  Show process status
  vector logs [app]              Follow logs
  vector open <app>              Open an app route
  vector check                   Run the configured check task
  vector doctor                  Run the configured doctor task
  vector attach                  Attach Process Compose
  vector help                    Show this help
  vector version                 Show the version

App names and configured route aliases are accepted.

Framework development:
  --from <checkout>              With new, setup, or update: use a local Launch
                                 Vector checkout and link its Lab package
  --release                      With update: switch back to released packages
`)
}
