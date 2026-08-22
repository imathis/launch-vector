package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"text/tabwriter"
	"time"

	"golang.org/x/term"

	"github.com/imathis/bootkit/internal/vector/config"
	"github.com/imathis/bootkit/internal/vector/project"
	vectorruntime "github.com/imathis/bootkit/internal/vector/runtime"
	"github.com/imathis/bootkit/internal/vector/tui"
)

const version = "0.1.0"

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
	if len(args) > 0 {
		switch args[0] {
		case "help", "-h", "--help":
			printHelp()
			return nil
		case "version", "--version":
			fmt.Println("vector", version)
			return nil
		}
	}

	cwd, err := os.Getwd()
	if err != nil {
		return err
	}
	proj, err := project.Discover(cwd)
	if err != nil {
		return err
	}
	manager := vectorruntime.New(proj)

	if len(args) == 0 {
		if !term.IsTerminal(int(os.Stdin.Fd())) || !term.IsTerminal(int(os.Stdout.Fd())) {
			return printStatus(manager)
		}
		return tui.Run(manager)
	}

	command, rest := args[0], args[1:]
	switch command {
	case "up", "down", "restart":
		app, err := optionalApp(proj.Config, rest)
		if err != nil {
			return err
		}
		return manager.Run(manager.LifecycleCommand(command, app))
	case "status":
		if err := noArgs(command, rest); err != nil {
			return err
		}
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

func printHelp() {
	fmt.Print(`vector controls this workspace's development apps.

Usage:
  vector                         Open the interactive dashboard
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
`)
}
