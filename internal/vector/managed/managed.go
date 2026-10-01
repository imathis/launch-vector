// Package managed installs the agent files Launch Vector owns inside a
// workspace: `vector-*` skills, their Claude Code links, and the AGENTS.md block.
package managed

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"
)

const (
	SkillPrefix = "vector-"
	beginMarker = "<!-- vector:begin"
	endMarker   = "<!-- vector:end -->"
)

// Agents read skills from .agents/skills; Claude Code reads .claude/skills.
var (
	agentsSkillsDir = filepath.Join(".agents", "skills")
	claudeSkillsDir = filepath.Join(".claude", "skills")
)

var blockVersionPattern = regexp.MustCompile(`<!-- vector:begin v(\S+)`)

type Assets struct {
	Skills  fs.FS
	Block   string
	Version string
}

type Report struct {
	Skills  []string
	Removed []string
	Linked  []string
	Agents  bool
}

func Install(root string, assets Assets) (Report, error) {
	var report Report
	names, err := skillNames(assets.Skills)
	if err != nil {
		return report, err
	}
	skillsRoot := filepath.Join(root, agentsSkillsDir)
	for _, name := range names {
		target := filepath.Join(skillsRoot, name)
		if err := os.RemoveAll(target); err != nil {
			return report, err
		}
		if err := copyTree(assets.Skills, name, target); err != nil {
			return report, fmt.Errorf("install skill %s: %w", name, err)
		}
	}
	report.Skills = names

	removed, err := removeStale(skillsRoot, names)
	if err != nil {
		return report, err
	}
	report.Removed = removed

	linked, err := linkClaudeSkills(root)
	if err != nil {
		return report, err
	}
	report.Linked = linked

	changed, err := writeAgents(filepath.Join(root, "AGENTS.md"), assets.Block, assets.Version)
	if err != nil {
		return report, err
	}
	report.Agents = changed

	claude := filepath.Join(root, "CLAUDE.md")
	if _, err := os.Stat(claude); errors.Is(err, os.ErrNotExist) {
		if err := os.WriteFile(claude, []byte("@AGENTS.md\n"), 0o644); err != nil {
			return report, err
		}
	}
	return report, nil
}

func skillNames(skills fs.FS) ([]string, error) {
	entries, err := fs.ReadDir(skills, ".")
	if err != nil {
		return nil, err
	}
	var names []string
	for _, entry := range entries {
		if !entry.IsDir() || !strings.HasPrefix(entry.Name(), SkillPrefix) {
			continue
		}
		if _, err := fs.Stat(skills, path.Join(entry.Name(), "SKILL.md")); err != nil {
			return nil, fmt.Errorf("skill %s has no SKILL.md", entry.Name())
		}
		names = append(names, entry.Name())
	}
	sort.Strings(names)
	return names, nil
}

func copyTree(source fs.FS, dir, target string) error {
	return fs.WalkDir(source, dir, func(name string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		destination := filepath.Join(target, filepath.FromSlash(strings.TrimPrefix(name, dir)))
		if entry.IsDir() {
			return os.MkdirAll(destination, 0o755)
		}
		data, err := fs.ReadFile(source, name)
		if err != nil {
			return err
		}
		return os.WriteFile(destination, data, 0o644)
	})
}

// removeStale deletes managed skills that a newer release no longer ships.
func removeStale(skillsRoot string, keep []string) ([]string, error) {
	entries, err := os.ReadDir(skillsRoot)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var removed []string
	for _, entry := range entries {
		name := entry.Name()
		if !strings.HasPrefix(name, SkillPrefix) || slices.Contains(keep, name) {
			continue
		}
		if err := os.RemoveAll(filepath.Join(skillsRoot, name)); err != nil {
			return removed, err
		}
		removed = append(removed, name)
	}
	return removed, nil
}

// linkClaudeSkills mirrors every .agents skill into .claude/skills with a
// relative symlink. Real directories there belong to the user and are kept.
func linkClaudeSkills(root string) ([]string, error) {
	skillsRoot := filepath.Join(root, agentsSkillsDir)
	linksRoot := filepath.Join(root, claudeSkillsDir)
	entries, err := os.ReadDir(skillsRoot)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	var linked []string
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		name := entry.Name()
		link := filepath.Join(linksRoot, name)
		want := filepath.Join("..", "..", agentsSkillsDir, name)
		if _, err := os.Lstat(link); err == nil {
			continue
		}
		if err := os.MkdirAll(linksRoot, 0o755); err != nil {
			return linked, err
		}
		if err := os.Symlink(want, link); err != nil {
			return linked, err
		}
		linked = append(linked, name)
	}
	return linked, pruneLinks(linksRoot)
}

// pruneLinks removes links into .agents/skills whose skill is gone.
func pruneLinks(linksRoot string) error {
	entries, err := os.ReadDir(linksRoot)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	prefix := filepath.Join("..", "..", agentsSkillsDir) + string(filepath.Separator)
	for _, entry := range entries {
		link := filepath.Join(linksRoot, entry.Name())
		target, err := os.Readlink(link)
		if err != nil || !strings.HasPrefix(target, prefix) {
			continue
		}
		if _, err := os.Stat(link); errors.Is(err, os.ErrNotExist) {
			if err := os.Remove(link); err != nil {
				return err
			}
		}
	}
	return nil
}

func writeAgents(path, block, version string) (bool, error) {
	existing, err := os.ReadFile(path)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return false, err
	}
	content := string(existing)
	if errors.Is(err, os.ErrNotExist) {
		content = "# Workspace guidance\n"
	}
	updated, err := ReplaceBlock(content, block, version)
	if err != nil {
		return false, fmt.Errorf("%s: %w", path, err)
	}
	if updated == string(existing) {
		return false, nil
	}
	return true, os.WriteFile(path, []byte(updated), 0o644)
}

// ReplaceBlock swaps the managed block in an AGENTS.md document. Without
// markers, the block is inserted below the first heading.
func ReplaceBlock(content, block, version string) (string, error) {
	rendered := renderBlock(block, version)
	begin := strings.Index(content, beginMarker)
	if begin >= 0 {
		end := strings.Index(content[begin:], endMarker)
		if end < 0 {
			return "", errors.New("vector:begin marker has no matching vector:end")
		}
		end += begin + len(endMarker)
		return content[:begin] + rendered + content[end:], nil
	}
	if strings.HasPrefix(content, "# ") {
		heading, rest, _ := strings.Cut(content, "\n")
		return heading + "\n\n" + rendered + "\n\n" + strings.TrimLeft(rest, "\n"), nil
	}
	return rendered + "\n\n" + content, nil
}

func renderBlock(block, version string) string {
	marker := beginMarker
	if version != "" {
		marker += " v" + version
	}
	marker += " — managed by `vector update`; edits inside this block are replaced -->"
	return marker + "\n" + strings.TrimSpace(block) + "\n" + endMarker
}

// BlockVersion returns the release that last wrote the managed block, if any.
func BlockVersion(content string) string {
	if match := blockVersionPattern.FindStringSubmatch(content); match != nil {
		return match[1]
	}
	return ""
}
