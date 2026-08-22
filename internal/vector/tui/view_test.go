package tui

import (
	"strings"
	"testing"

	"github.com/charmbracelet/lipgloss"
)

func TestStripANSI(t *testing.T) {
	input := "\x1b[31mfailed\x1b[0m \x1b]8;;https://example.test\x07link\x1b]8;;\x07"
	if got := stripANSI(input); got != "failed link" {
		t.Fatalf("stripANSI() = %q", got)
	}
}

func TestTailOutputBoundsLinesAndWidth(t *testing.T) {
	output := "first\nsecond line is long\nthird\nfourth"
	got := tailOutput(output, 8, 3)
	lines := strings.Split(got, "\n")
	if len(lines) != 3 {
		t.Fatalf("tailOutput() returned %d lines: %q", len(lines), got)
	}
	for _, line := range lines {
		if lipgloss.Width(line) > 8 {
			t.Fatalf("tailOutput() line %q exceeds width 8", line)
		}
	}
	if !strings.Contains(got, "fourth") {
		t.Fatalf("tailOutput() did not retain the tail: %q", got)
	}
}
