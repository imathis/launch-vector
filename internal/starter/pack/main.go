// Command pack embeds the checkout's starter files into the vector binary.
// It runs from internal/starter through `go generate`.
package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/imathis/launch-vector/internal/starter"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "pack:", err)
		os.Exit(1)
	}
}

func run() error {
	output, err := exec.Command("git", "rev-parse", "--show-toplevel").Output()
	if err != nil {
		return fmt.Errorf("find repository root: %w", err)
	}
	files, err := starter.FromCheckout(strings.TrimSpace(string(output)))
	if err != nil {
		return err
	}
	var archive bytes.Buffer
	if err := starter.WriteArchive(&archive, files); err != nil {
		return err
	}
	target := filepath.Join("archive", "starter.tar.gz")
	if err := os.WriteFile(target, archive.Bytes(), 0o644); err != nil {
		return err
	}
	fmt.Printf("packed %d starter files (%d KiB)\n", len(files), archive.Len()/1024)
	return nil
}
