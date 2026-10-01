// Package setup installs the system tools a Launch Vector workspace needs.
package setup

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

const minNodeMajor = 24

type tool struct {
	command string
	brew    string
	npm     string
	manual  string
}

var tools = []tool{
	{command: "bun", brew: "oven-sh/bun/bun", manual: "https://bun.sh"},
	{command: "node", brew: "node", manual: "https://nodejs.org (24 or newer)"},
	{command: "process-compose", brew: "f1bonacc1/tap/process-compose", manual: "https://f1bonacc1.github.io/process-compose/installation/"},
	{command: "portless", npm: "portless@latest", manual: "npm install --global portless@latest"},
}

// EnsureTools installs missing tools with Homebrew and npm when possible.
func EnsureTools(ctx context.Context, out io.Writer) error {
	var missing []tool
	for _, t := range tools {
		if _, err := exec.LookPath(t.command); err != nil {
			missing = append(missing, t)
		}
	}
	_, brewErr := exec.LookPath("brew")
	canBrew := runtime.GOOS == "darwin" && brewErr == nil
	var manual []string
	for _, t := range missing {
		switch {
		case t.brew != "" && canBrew:
			fmt.Fprintf(out, "Installing %s with Homebrew…\n", t.command)
			if err := run(ctx, out, "brew", "install", t.brew); err != nil {
				return fmt.Errorf("install %s: %w", t.command, err)
			}
		case t.npm != "":
			if _, err := exec.LookPath("npm"); err != nil {
				manual = append(manual, t.command+": "+t.manual)
				continue
			}
			fmt.Fprintf(out, "Installing %s with npm…\n", t.command)
			if err := run(ctx, out, "npm", "install", "--global", t.npm); err != nil {
				return fmt.Errorf("install %s: %w", t.command, err)
			}
		default:
			manual = append(manual, t.command+": "+t.manual)
		}
	}
	if len(manual) > 0 {
		return fmt.Errorf("install these tools, then rerun vector setup:\n  %s", strings.Join(manual, "\n  "))
	}
	return checkNode(ctx)
}

func checkNode(ctx context.Context) error {
	output, err := exec.CommandContext(ctx, "node", "--version").Output()
	if err != nil {
		return fmt.Errorf("check Node.js version: %w", err)
	}
	version := strings.TrimPrefix(strings.TrimSpace(string(output)), "v")
	major, err := strconv.Atoi(strings.SplitN(version, ".", 2)[0])
	if err != nil {
		return fmt.Errorf("unrecognized Node.js version %q", version)
	}
	if major < minNodeMajor {
		return fmt.Errorf("Node.js %d or newer is required for Portless; found %s", minNodeMajor, version)
	}
	return nil
}

// BunLink registers a local package so workspaces can depend on link:<name>.
func BunLink(ctx context.Context, out io.Writer, dir string) error {
	cmd := exec.CommandContext(ctx, "bun", "link")
	cmd.Dir = dir
	output, err := cmd.CombinedOutput()
	if err != nil {
		out.Write(output)
		return fmt.Errorf("bun link in %s: %w", dir, err)
	}
	return nil
}

func BunInstall(ctx context.Context, out io.Writer, dir string) error {
	if _, err := exec.LookPath("bun"); err != nil {
		return errors.New("Bun is required. Run: vector setup")
	}
	cmd := exec.CommandContext(ctx, "bun", "install")
	cmd.Dir = dir
	cmd.Stdout = out
	cmd.Stderr = out
	return cmd.Run()
}

func run(ctx context.Context, out io.Writer, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = out
	cmd.Stderr = out
	return cmd.Run()
}
