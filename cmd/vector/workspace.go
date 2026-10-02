package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/imathis/launch-vector/internal/vector/managed"
	"github.com/imathis/launch-vector/internal/vector/project"
	"github.com/imathis/launch-vector/internal/vector/selfupdate"
	"github.com/imathis/launch-vector/internal/vector/setup"
	"github.com/imathis/launch-vector/internal/vector/source"
	"github.com/imathis/launch-vector/internal/vector/workspace"
)

func runNew(ctx context.Context, args []string) error {
	flags := flag.NewFlagSet("new", flag.ContinueOnError)
	from := flags.String("from", "", "local Launch Vector checkout")
	name := flags.String("name", "", "workspace name (defaults to the directory name)")
	noLab := flags.Bool("no-lab", false, "leave out the Design Lab app")
	positional, err := parseFlags(flags, args)
	if err != nil {
		return err
	}
	if len(positional) != 1 {
		return errors.New("usage: vector new <dir> [--no-lab] [--name <name>]")
	}
	dest, err := filepath.Abs(positional[0])
	if err != nil {
		return err
	}

	src := source.Embedded(version)
	if *from != "" {
		if src, err = source.Local(*from, version); err != nil {
			return err
		}
	}
	files, err := src.Starter()
	if err != nil {
		return err
	}
	if err := workspace.Create(files, workspace.Options{
		Dest:          dest,
		Name:          workspace.Slug(*name),
		NoLab:         *noLab,
		LabDependency: src.LabDependency(),
	}); err != nil {
		return err
	}
	if err := project.WriteSource(dest, src.Root); err != nil {
		return err
	}
	assets, err := src.Assets()
	if err != nil {
		return err
	}
	if _, err := managed.Install(dest, assets); err != nil {
		return err
	}
	gitInit(ctx, dest)

	fmt.Printf("Created %s\n\nNext:\n  cd %s\n  vector setup\n  vector up\n", dest, displayPath(dest))
	if src.IsLocal() {
		fmt.Printf("\nThis workspace links @launch-vector/lab from %s.\nRun `vector update --release` to switch to published packages.\n", src.Root)
	}
	return nil
}

func runSetup(ctx context.Context, args []string) error {
	flags := flag.NewFlagSet("setup", flag.ContinueOnError)
	from := flags.String("from", "", "local Launch Vector checkout")
	if positional, err := parseFlags(flags, args); err != nil {
		return err
	} else if len(positional) > 0 {
		return errors.New("setup does not accept arguments")
	}
	if err := setup.EnsureTools(ctx, os.Stdout); err != nil {
		return err
	}
	proj, ok, err := currentProject()
	if err != nil || !ok {
		if err == nil {
			fmt.Println("Tools are ready. Create a workspace with: vector new <dir>")
		}
		return err
	}
	src, err := workspaceSource(proj, *from, false)
	if err != nil {
		return err
	}
	return syncWorkspace(ctx, os.Stdout, proj.Root, src)
}

func runUpdate(ctx context.Context, args []string) error {
	flags := flag.NewFlagSet("update", flag.ContinueOnError)
	from := flags.String("from", "", "local Launch Vector checkout")
	release := flags.Bool("release", false, "switch a linked workspace back to released packages")
	skipSelf := flags.Bool("skip-self", false, "")
	if positional, err := parseFlags(flags, args); err != nil {
		return err
	} else if len(positional) > 0 {
		return errors.New("update does not accept arguments")
	}
	if *from != "" && *release {
		return errors.New("--from and --release cannot be combined")
	}

	if *from == "" && !*skipSelf {
		updated, err := updateSelf(ctx)
		if err != nil {
			return err
		}
		if updated != "" {
			// Continue with the new binary so it installs its own skills.
			cmd := exec.CommandContext(ctx, updated, append([]string{"update", "--skip-self"}, args...)...)
			cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
			return cmd.Run()
		}
	}

	proj, ok, err := currentProject()
	if err != nil || !ok {
		return err
	}
	src, err := workspaceSource(proj, *from, *release)
	if err != nil {
		return err
	}
	return syncWorkspace(ctx, os.Stdout, proj.Root, src)
}

// updateSelf installs a newer release and returns the replaced executable.
func updateSelf(ctx context.Context) (string, error) {
	if !selfupdate.IsRelease(version) {
		fmt.Printf("vector %s is a development build; skipping self-update.\n", version)
		return "", nil
	}
	client := selfupdate.NewClient()
	latest, err := client.Latest(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Could not check for a new vector: %v\n", err)
		return "", nil
	}
	if !selfupdate.Newer(latest.Version(), version) {
		fmt.Printf("vector %s is up to date.\n", version)
		return "", nil
	}
	executable, err := os.Executable()
	if err != nil {
		return "", err
	}
	if selfupdate.Homebrew(executable) {
		fmt.Printf("Updating vector %s → %s with Homebrew…\n", version, latest.Version())
		return brewUpgrade(ctx)
	}
	fmt.Printf("Updating vector %s → %s…\n", version, latest.Version())
	if err := client.Apply(ctx, latest, executable); err != nil {
		return "", err
	}
	selfupdate.Forget()
	return executable, nil
}

// brewUpgrade upgrades the cask and returns Homebrew's link to the new
// binary; the old versioned directory is gone after the upgrade.
func brewUpgrade(ctx context.Context) (string, error) {
	for _, args := range [][]string{{"update", "--quiet"}, {"upgrade", "--cask", selfupdate.HomebrewCask}} {
		cmd := exec.CommandContext(ctx, "brew", args...)
		cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
		if err := cmd.Run(); err != nil {
			return "", fmt.Errorf("brew %s: %w", strings.Join(args, " "), err)
		}
	}
	selfupdate.Forget()
	prefix, err := exec.CommandContext(ctx, "brew", "--prefix").Output()
	if err != nil {
		return "", fmt.Errorf("brew --prefix: %w", err)
	}
	return filepath.Join(strings.TrimSpace(string(prefix)), "bin", "vector"), nil
}

func currentProject() (project.Project, bool, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return project.Project{}, false, err
	}
	proj, err := project.Discover(cwd)
	if errors.Is(err, project.ErrNotFound) {
		return project.Project{}, false, nil
	}
	return proj, err == nil, err
}

// workspaceSource picks the framework source for a workspace and remembers a
// local checkout in .vector/source for later commands.
func workspaceSource(proj project.Project, from string, release bool) (source.Source, error) {
	if release {
		src := source.Embedded(version)
		if src.LabDependency() == "" {
			return source.Source{}, fmt.Errorf("vector %s is a development build; install a release to switch to published packages", version)
		}
		return src, project.WriteSource(proj.Root, "")
	}
	if from == "" {
		from = proj.Source()
	}
	if from == "" {
		return source.Embedded(version), nil
	}
	src, err := source.Local(from, version)
	if err != nil {
		return source.Source{}, err
	}
	return src, project.WriteSource(proj.Root, src.Root)
}

// syncWorkspace brings framework-managed files and dependencies up to date.
func syncWorkspace(ctx context.Context, out io.Writer, root string, src source.Source) error {
	if src.IsLocal() {
		if err := src.CheckLabBuilt(); err != nil {
			return err
		}
		if err := setup.BunLink(ctx, out, src.LabDir()); err != nil {
			return err
		}
	}
	if spec := src.LabDependency(); spec != "" {
		changed, err := workspace.SetDependency(root, source.LabPackage, spec)
		if err != nil {
			return err
		}
		for _, path := range changed {
			fmt.Fprintf(out, "Set %s to %s in %s\n", source.LabPackage, spec, path)
		}
	}
	assets, err := src.Assets()
	if err != nil {
		return err
	}
	report, err := managed.Install(root, assets)
	if err != nil {
		return err
	}
	fmt.Fprintf(out, "Agent skills: %s\n", strings.Join(report.Skills, ", "))
	if len(report.Removed) > 0 {
		fmt.Fprintf(out, "Removed retired skills: %s\n", strings.Join(report.Removed, ", "))
	}
	if report.Agents {
		fmt.Fprintln(out, "Updated the Launch Vector block in AGENTS.md")
	}
	return setup.BunInstall(ctx, out, root)
}

// gitInit starts a repository unless the workspace already sits inside one.
func gitInit(ctx context.Context, dir string) {
	if _, err := exec.LookPath("git"); err != nil {
		return
	}
	inside := exec.CommandContext(ctx, "git", "-C", dir, "rev-parse", "--is-inside-work-tree")
	if inside.Run() == nil {
		return
	}
	_ = exec.CommandContext(ctx, "git", "-C", dir, "init", "--quiet").Run()
}
