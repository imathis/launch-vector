// Package starter provides the files `vector new` copies into a workspace.
//
// Release builds embed a deterministic archive of the git-tracked files under
// starter/. Run `go generate ./internal/starter` before building; without the
// archive, `vector new` needs a local checkout (`--from`).
package starter

//go:generate go run ./pack

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"embed"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"sort"
	"strings"
)

// Dir is the starter's location inside a Launch Vector checkout.
const Dir = "starter"

const archivePath = "archive/starter.tar.gz"

//go:embed all:archive
var archive embed.FS

type File struct {
	Path string
	Mode fs.FileMode
	Data []byte
}

// ErrNotEmbedded means this binary was built without the starter archive.
var ErrNotEmbedded = errors.New("this vector build has no embedded starter; pass --from <launch-vector checkout>")

func Embedded() ([]File, error) {
	data, err := archive.ReadFile(archivePath)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, ErrNotEmbedded
	}
	if err != nil {
		return nil, err
	}
	return ReadArchive(bytes.NewReader(data))
}

// FromCheckout reads the starter files git would track, so ignored build
// output and node_modules never reach a new workspace.
func FromCheckout(root string) ([]File, error) {
	cmd := exec.Command("git", "-C", root, "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", Dir)
	output, err := cmd.Output()
	if err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			return nil, fmt.Errorf("list starter files in %s: %s", root, strings.TrimSpace(string(exitErr.Stderr)))
		}
		return nil, fmt.Errorf("list starter files in %s: %w", root, err)
	}
	seen := make(map[string]bool)
	var files []File
	for _, name := range strings.Split(string(output), "\x00") {
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		full := filepath.Join(root, filepath.FromSlash(name))
		info, err := os.Lstat(full)
		if errors.Is(err, fs.ErrNotExist) {
			continue // deleted in the working tree
		}
		if err != nil {
			return nil, err
		}
		if !info.Mode().IsRegular() {
			continue
		}
		data, err := os.ReadFile(full)
		if err != nil {
			return nil, err
		}
		files = append(files, File{
			Path: strings.TrimPrefix(name, Dir+"/"),
			Mode: info.Mode().Perm(),
			Data: data,
		})
	}
	if len(files) == 0 {
		return nil, fmt.Errorf("%s has no %s directory", root, Dir)
	}
	sort.Slice(files, func(i, j int) bool { return files[i].Path < files[j].Path })
	return files, nil
}

// WriteArchive writes files as a reproducible gzip-compressed tar.
func WriteArchive(w io.Writer, files []File) error {
	compressed := gzip.NewWriter(w)
	archive := tar.NewWriter(compressed)
	for _, file := range files {
		header := &tar.Header{
			Name:     file.Path,
			Mode:     int64(file.Mode.Perm()),
			Size:     int64(len(file.Data)),
			Typeflag: tar.TypeReg,
			Format:   tar.FormatPAX,
		}
		if err := archive.WriteHeader(header); err != nil {
			return err
		}
		if _, err := archive.Write(file.Data); err != nil {
			return err
		}
	}
	if err := archive.Close(); err != nil {
		return err
	}
	return compressed.Close()
}

func ReadArchive(r io.Reader) ([]File, error) {
	compressed, err := gzip.NewReader(r)
	if err != nil {
		return nil, err
	}
	defer compressed.Close()
	reader := tar.NewReader(compressed)
	var files []File
	for {
		header, err := reader.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, err
		}
		if header.Typeflag != tar.TypeReg {
			continue
		}
		name := path.Clean(header.Name)
		if path.IsAbs(name) || name == ".." || strings.HasPrefix(name, "../") {
			return nil, fmt.Errorf("starter archive contains unsafe path %q", header.Name)
		}
		data, err := io.ReadAll(reader)
		if err != nil {
			return nil, err
		}
		files = append(files, File{Path: name, Mode: fs.FileMode(header.Mode).Perm(), Data: data})
	}
	return files, nil
}
