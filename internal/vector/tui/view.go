package tui

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/charmbracelet/lipgloss"
	vectorruntime "github.com/imathis/launch-vector/internal/vector/runtime"
)

var (
	accentColor   = lipgloss.AdaptiveColor{Light: "#5B21B6", Dark: "#A78BFA"}
	goodColor     = lipgloss.AdaptiveColor{Light: "#047857", Dark: "#34D399"}
	warnColor     = lipgloss.AdaptiveColor{Light: "#B45309", Dark: "#FBBF24"}
	badColor      = lipgloss.AdaptiveColor{Light: "#B91C1C", Dark: "#F87171"}
	mutedColor    = lipgloss.AdaptiveColor{Light: "#6B7280", Dark: "#9CA3AF"}
	borderColor   = lipgloss.AdaptiveColor{Light: "#D1D5DB", Dark: "#374151"}
	selectedBg    = lipgloss.AdaptiveColor{Light: "#EDE9FE", Dark: "#312E81"}
	titleStyle    = lipgloss.NewStyle().Bold(true).Foreground(accentColor)
	mutedStyle    = lipgloss.NewStyle().Foreground(mutedColor)
	goodStyle     = lipgloss.NewStyle().Bold(true).Foreground(goodColor)
	warnStyle     = lipgloss.NewStyle().Bold(true).Foreground(warnColor)
	badStyle      = lipgloss.NewStyle().Bold(true).Foreground(badColor)
	busyStyle     = lipgloss.NewStyle().Bold(true).Foreground(accentColor)
	selectedStyle = lipgloss.NewStyle().Background(selectedBg)
)

func (m Model) View() string {
	width := m.width
	if width <= 0 {
		width = 80
	}
	height := m.height
	if height <= 0 {
		height = 28
	}
	paddingX := 2
	if width < 64 {
		paddingX = 1
	}
	contentWidth := min(max(width-paddingX*2, 1), 112)

	var view strings.Builder
	header := titleStyle.Render(strings.ToUpper(m.runtime.Project.Config.Project.Name))
	view.WriteString(header)
	if contentWidth >= 32 {
		view.WriteString("  " + mutedStyle.Render("workspace control plane"))
	}
	view.WriteByte('\n')
	view.WriteString(mutedStyle.Render(shorten(m.runtime.Project.Root, contentWidth)) + "\n\n")

	appPanelHeight := 0
	if !m.logsExpanded {
		appPanel := m.renderAppsPanel(contentWidth)
		appPanelHeight = lipgloss.Height(appPanel)
		view.WriteString(appPanel + "\n")
	}

	help := m.renderHelp(contentWidth)
	helpHeight := lipgloss.Height(help)
	outputHeight := height - 7 - appPanelHeight - helpHeight
	if m.logsExpanded {
		outputHeight = height - 7 - helpHeight
	}
	outputHeight = max(outputHeight, 4)
	view.WriteString(m.renderOutputPanel(contentWidth, outputHeight) + "\n")
	view.WriteString(m.renderStatus(contentWidth) + "\n")
	view.WriteString(help)

	return lipgloss.NewStyle().Padding(1, paddingX).Render(view.String())
}

func (m Model) renderAppsPanel(width int) string {
	innerWidth := max(width-4, 1)
	var rows strings.Builder
	if innerWidth >= 82 {
		rows.WriteString(mutedStyle.Render(renderColumns("", "APP", "STATUS", "PID", "UPTIME", "MEMORY", "ROUTE", innerWidth)) + "\n")
	}
	for i, app := range m.apps {
		rows.WriteString(m.renderApp(app, i == m.selected, innerWidth))
		if i != len(m.apps)-1 {
			rows.WriteByte('\n')
		}
	}
	if len(m.apps) == 0 {
		rows.WriteString(mutedStyle.Render("No apps configured."))
	}
	return panelStyle(width).Render(rows.String())
}

func (m Model) renderOutputPanel(width, height int) string {
	innerWidth := max(width-4, 1)
	lineCount := max(height-3, 1)
	output := tailOutput(m.paneOutput, innerWidth, lineCount)
	if output == "" {
		output = mutedStyle.Render("No output.")
	}
	title := m.paneTitle
	if title == "" {
		title = "Output"
	}
	content := titleStyle.Render(shorten(title, innerWidth)) + "\n" + output
	return panelStyle(width).Height(max(height-2, 2)).Render(content)
}

func panelStyle(width int) lipgloss.Style {
	return lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(borderColor).
		Padding(0, 1).
		Width(max(width-4, 1))
}

func (m Model) renderStatus(width int) string {
	indicator := " "
	if m.hasActivity() {
		indicator = m.spinner.View()
	}
	state := "offline"
	stateStyle := warnStyle
	if m.supervisor {
		state = "connected"
		stateStyle = goodStyle
	}
	message := m.message
	if m.statusErr != "" && !m.busy {
		message = "Status refresh failed: " + m.statusErr
	}
	messageWidth := max(width-lipgloss.Width(state)-5, 1)
	return indicator + " " + stateStyle.Render(state) + "  " + mutedStyle.Render(shorten(stripANSI(message), messageWidth))
}

func (m Model) renderApp(app vectorruntime.AppState, selected bool, width int) string {
	pointer := " "
	if selected {
		pointer = ">"
	}
	_, statusText := m.appStatus(app)

	var row string
	if width >= 82 {
		row = renderColumns(pointer, app.App.Title, statusText, number(app.PID), value(app.SystemTime), vectorruntime.FormatMemory(app.Mem), app.URL, width)
	} else if width >= 58 {
		routeWidth := max(width-42, 8)
		row = lipgloss.JoinHorizontal(lipgloss.Top,
			lipgloss.NewStyle().Width(2).Render(pointer),
			lipgloss.NewStyle().Width(18).Render(shorten(app.App.Title, 17)),
			lipgloss.NewStyle().Width(13).Render(statusText),
			lipgloss.NewStyle().Width(9).Render(number(app.PID)),
			lipgloss.NewStyle().Width(routeWidth).Render(shorten(app.URL, routeWidth)),
		)
	} else {
		row = fmt.Sprintf("%s %s  %s\n  %s", pointer, app.App.Title, statusText, mutedStyle.Render(shorten(app.URL, width-2)))
	}
	if selected {
		return selectedStyle.Width(width).Render(row)
	}
	return lipgloss.NewStyle().Width(width).Render(row)
}

func (m Model) appStatus(app vectorruntime.AppState) (string, string) {
	if m.busy && (m.busyTarget == "" || m.busyTarget == app.App.Name) {
		if m.busyAction == "up" || m.busyAction == "restart" {
			return "Starting", busyStyle.Render("Starting")
		}
		if m.busyAction == "down" {
			return "Stopping", busyStyle.Render("Stopping")
		}
	}
	status := vectorruntime.DisplayStatus(app.ProcessState)
	switch {
	case strings.EqualFold(status, "failed"):
		return status, badStyle.Render(status)
	case app.IsRunning:
		return status, goodStyle.Render(status)
	default:
		return status, warnStyle.Render(status)
	}
}

func (m Model) renderHelp(width int) string {
	if m.logsExpanded {
		return mutedStyle.Render("Esc/l dashboard  j/k switch app  q quit (apps untouched)")
	}
	if m.helpExpanded {
		lines := []string{
			"j/k or arrows  select app       space  start/stop selected",
			"u/U            start one/all    s/S    stop one/all",
			"r/R            restart one/all  l      expand selected logs",
			"c check   d doctor   o open   a attach Process Compose",
			"? hide help     q/ctrl+c quit Vector (apps untouched)",
		}
		if width < 72 {
			lines = []string{
				"j/k select   space toggle selected",
				"u/U start selected/all   s/S stop selected/all",
				"r/R restart selected/all l logs",
				"c check  d doctor  o open  a attach",
				"? hide help  q quit (apps untouched)",
			}
		}
		return mutedStyle.Render(strings.Join(lines, "\n"))
	}
	if width < 72 {
		if width < 40 {
			return mutedStyle.Render("space toggle  u/U start\ns/S stop  r/R restart\nl logs  ? help  q quit")
		}
		return mutedStyle.Render("space toggle  u/U start  s/S stop  r/R restart\nl logs  ? help  q quit (apps untouched)")
	}
	return mutedStyle.Render("j/k select  space toggle  u/U start one/all  s/S stop one/all  r/R restart one/all  l logs  ? help  q quit")
}

func renderColumns(pointer, name, status, pid, uptime, memory, route string, width int) string {
	fixed := 2 + 17 + 13 + 8 + 12 + 11
	routeWidth := max(width-fixed, 8)
	return lipgloss.JoinHorizontal(lipgloss.Top,
		lipgloss.NewStyle().Width(2).Render(pointer),
		lipgloss.NewStyle().Width(17).Render(shorten(name, 16)),
		lipgloss.NewStyle().Width(13).Render(status),
		lipgloss.NewStyle().Width(8).Render(pid),
		lipgloss.NewStyle().Width(12).Render(shorten(uptime, 11)),
		lipgloss.NewStyle().Width(11).Render(memory),
		lipgloss.NewStyle().Width(routeWidth).Render(shorten(route, routeWidth)),
	)
}

func number(value int) string {
	if value == 0 {
		return "-"
	}
	return fmt.Sprintf("%d", value)
}

func value(value string) string {
	if value == "" {
		return "-"
	}
	return value
}

func shorten(value string, width int) string {
	if width <= 0 {
		return ""
	}
	runes := []rune(value)
	if len(runes) <= width {
		return value
	}
	if width <= 3 {
		return string(runes[:width])
	}
	return string(runes[:width-3]) + "..."
}

func tailOutput(output string, width, maxLines int) string {
	clean := stripANSI(output)
	var lines []string
	for _, line := range strings.Split(clean, "\n") {
		lines = append(lines, wrapLine(strings.ReplaceAll(line, "\t", "    "), width)...)
	}
	if len(lines) > maxLines {
		lines = lines[len(lines)-maxLines:]
		if len(lines) > 0 {
			lines[0] = shorten("... "+lines[0], width)
		}
	}
	return strings.TrimRight(strings.Join(lines, "\n"), "\n")
}

func wrapLine(line string, width int) []string {
	if line == "" || width < 1 {
		return []string{""}
	}
	var lines []string
	var current strings.Builder
	currentWidth := 0
	for _, r := range line {
		runeWidth := lipgloss.Width(string(r))
		if currentWidth > 0 && currentWidth+runeWidth > width {
			lines = append(lines, current.String())
			current.Reset()
			currentWidth = 0
		}
		current.WriteRune(r)
		currentWidth += runeWidth
	}
	return append(lines, current.String())
}

func stripANSI(value string) string {
	var output strings.Builder
	for i := 0; i < len(value); {
		if value[i] == 0x1b {
			i++
			if i >= len(value) {
				break
			}
			switch value[i] {
			case '[':
				i++
				for i < len(value) {
					b := value[i]
					i++
					if b >= 0x40 && b <= 0x7e {
						break
					}
				}
			case ']':
				i++
				for i < len(value) {
					if value[i] == 0x07 {
						i++
						break
					}
					if value[i] == 0x1b && i+1 < len(value) && value[i+1] == '\\' {
						i += 2
						break
					}
					i++
				}
			default:
				i++
			}
			continue
		}
		if value[i] == '\r' {
			output.WriteByte('\n')
			i++
			continue
		}
		if value[i] < 0x20 && value[i] != '\n' && value[i] != '\t' {
			i++
			continue
		}
		_, size := utf8.DecodeRuneInString(value[i:])
		output.WriteString(value[i : i+size])
		i += size
	}
	return output.String()
}
