// Package workspace creates workspaces from the starter and edits the files
// Launch Vector manages inside them.
package workspace

import (
	"bytes"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/imathis/launch-vector/internal/starter"
	"github.com/imathis/launch-vector/internal/vector/config"
)

const labPrefix = "apps/lab/"

type Options struct {
	Dest  string
	Name  string
	NoLab bool
	// LabDependency replaces the starter's @launch-vector/lab spec when set.
	LabDependency string
}

// Create writes a new workspace into an empty or missing directory.
func Create(files []starter.File, opts Options) error {
	if err := ensureEmpty(opts.Dest); err != nil {
		return err
	}
	name := opts.Name
	if name == "" {
		name = Slug(filepath.Base(opts.Dest))
	}
	if name == "" {
		return errors.New("could not derive a workspace name; pass --name")
	}

	for _, file := range files {
		if opts.NoLab && strings.HasPrefix(file.Path, labPrefix) {
			continue
		}
		data := file.Data
		var err error
		switch {
		case file.Path == "vector.yaml":
			data, err = rewriteConfig(data, name, opts.NoLab)
		case file.Path == "package.json":
			data = setPackageName(data, name)
		case file.Path == "README.md":
			data = setTitle(data, name)
		}
		if err != nil {
			return err
		}
		if strings.HasSuffix(file.Path, "package.json") && opts.LabDependency != "" {
			data = setDependency(data, labPackage, opts.LabDependency)
		}
		target := filepath.Join(opts.Dest, filepath.FromSlash(file.Path))
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		mode := file.Mode.Perm()
		if mode == 0 {
			mode = 0o644
		}
		if err := os.WriteFile(target, data, mode); err != nil {
			return err
		}
	}
	return nil
}

func ensureEmpty(dir string) error {
	entries, err := os.ReadDir(dir)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	if len(entries) > 0 {
		return fmt.Errorf("%s is not empty", dir)
	}
	return nil
}

var slugInvalid = regexp.MustCompile(`[^a-z0-9]+`)

// Slug turns a directory name into a workspace and hostname label.
func Slug(value string) string {
	return strings.Trim(slugInvalid.ReplaceAllString(strings.ToLower(value), "-"), "-")
}

// rewriteConfig edits the starter vector.yaml line by line so its comments and
// spacing survive, then validates the result.
func rewriteConfig(data []byte, name string, noLab bool) ([]byte, error) {
	lines := strings.Split(string(data), "\n")
	lines = setSectionValue(lines, "project", "name", name)
	if noLab {
		lines = removeListItem(lines, "apps", "lab")
	}
	out := []byte(strings.Join(lines, "\n"))
	if _, err := config.Decode(bytes.NewReader(out), "vector.yaml"); err != nil {
		return nil, err
	}
	return out, nil
}

func setSectionValue(lines []string, section, key, value string) []string {
	inSection := false
	for i, line := range lines {
		if !strings.HasPrefix(line, " ") && strings.TrimSpace(line) != "" {
			inSection = strings.TrimSpace(line) == section+":"
			continue
		}
		if inSection && strings.HasPrefix(strings.TrimSpace(line), key+":") {
			indent := line[:len(line)-len(strings.TrimLeft(line, " "))]
			lines[i] = indent + key + ": " + value
		}
	}
	return lines
}

// removeListItem drops the `- name: <name>` entry from a top-level list.
func removeListItem(lines []string, section, name string) []string {
	out := make([]string, 0, len(lines))
	inSection, skipping := false, false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		topLevel := !strings.HasPrefix(line, " ") && trimmed != ""
		if topLevel {
			inSection = trimmed == section+":"
			skipping = false
		} else if inSection && strings.HasPrefix(trimmed, "- ") {
			skipping = trimmed == "- name: "+name
		}
		if skipping && trimmed != "" {
			continue
		}
		out = append(out, line)
	}
	return out
}

var packageNamePattern = regexp.MustCompile(`(?m)^(\s*"name":\s*")[^"]*(")`)

func setPackageName(data []byte, name string) []byte {
	replaced := false
	return packageNamePattern.ReplaceAllFunc(data, func(match []byte) []byte {
		if replaced {
			return match
		}
		replaced = true
		return packageNamePattern.ReplaceAll(match, []byte("${1}"+name+"${2}"))
	})
}

func setTitle(data []byte, name string) []byte {
	if !bytes.HasPrefix(data, []byte("# ")) {
		return data
	}
	_, rest, _ := bytes.Cut(data, []byte("\n"))
	return append([]byte("# "+name+"\n"), rest...)
}
