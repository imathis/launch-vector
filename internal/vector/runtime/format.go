package runtime

import (
	"fmt"
	"strings"
)

func FormatMemory(bytes int64) string {
	if bytes <= 0 {
		return "-"
	}
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit && exp < 3; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %ciB", float64(bytes)/float64(div), "KMGT"[exp])
}

func DisplayStatus(state ProcessState) string {
	if state.IsRunning {
		if state.Status == "" {
			return "Running"
		}
		return state.Status
	}
	if strings.EqualFold(state.Status, "completed") {
		if state.ExitCode == 0 || containsExitCode(state.SuccessExitCodes, state.ExitCode) {
			return "Stopped"
		}
		return "Failed"
	}
	if state.Status == "" || strings.EqualFold(state.Status, "pending") || strings.EqualFold(state.Status, "disabled") {
		return "Stopped"
	}
	return state.Status
}

func containsExitCode(codes []int, code int) bool {
	for _, candidate := range codes {
		if candidate == code {
			return true
		}
	}
	return false
}
