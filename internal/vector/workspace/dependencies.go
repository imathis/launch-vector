package workspace

import (
	"bytes"
	"os"
	"path/filepath"
	"regexp"
)

const labPackage = "@launch-vector/lab"

// SetDependency rewrites a dependency spec in the workspace root package.json
// and in every apps/* and packages/* package.json. It returns changed files.
func SetDependency(root, name, spec string) ([]string, error) {
	paths := []string{filepath.Join(root, "package.json")}
	for _, pattern := range []string{"apps/*/package.json", "packages/*/package.json"} {
		matches, err := filepath.Glob(filepath.Join(root, pattern))
		if err != nil {
			return nil, err
		}
		paths = append(paths, matches...)
	}
	var changed []string
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return changed, err
		}
		updated := setDependency(data, name, spec)
		if bytes.Equal(updated, data) {
			continue
		}
		info, err := os.Stat(path)
		if err != nil {
			return changed, err
		}
		if err := os.WriteFile(path, updated, info.Mode().Perm()); err != nil {
			return changed, err
		}
		rel, _ := filepath.Rel(root, path)
		changed = append(changed, rel)
	}
	return changed, nil
}

// setDependency edits the JSON text in place to keep the file's formatting.
func setDependency(data []byte, name, spec string) []byte {
	pattern := regexp.MustCompile(`("` + regexp.QuoteMeta(name) + `"\s*:\s*")[^"]*(")`)
	return pattern.ReplaceAll(data, []byte("${1}"+spec+"${2}"))
}
