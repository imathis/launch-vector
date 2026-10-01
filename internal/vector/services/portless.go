package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"regexp"
	"slices"
	"strconv"
	"strings"
)

var (
	modePattern        = regexp.MustCompile(`(?m)^Mode:\s*(.+)$`)
	proxyTargetPattern = regexp.MustCompile(`Proxy target: https://127\.0\.0\.1:(\d+)`)
)

// ProxyState is what `portless doctor` reports about the running proxy.
type ProxyState struct {
	Responding bool
	Port       int
	TLDs       []string
}

func ParseDoctor(output string) ProxyState {
	state := ProxyState{Responding: strings.Contains(output, "Proxy is responding on port")}
	if match := proxyTargetPattern.FindStringSubmatch(output); match != nil {
		state.Port, _ = strconv.Atoi(match[1])
	}
	if match := modePattern.FindStringSubmatch(output); match != nil {
		parts := strings.Split(match[1], ",")
		for _, part := range parts[1:] {
			if tld := strings.TrimPrefix(strings.TrimSpace(part), "."); tld != "" {
				state.TLDs = append(state.TLDs, tld)
			}
		}
	}
	return state
}

// Serves reports whether a running proxy matches the port and serves exactly
// this TLD. Portless refuses apps whose TLD set differs from the proxy's.
func (s ProxyState) Serves(port int, tld string) bool {
	return s.Responding && s.Port == port && slices.Equal(s.TLDs, []string{tld})
}

// EnsureProxy starts Portless, or restarts it when it serves the wrong port or
// TLDs. Workspaces share the default TLD, so they share one proxy.
func EnsureProxy(ctx context.Context, out io.Writer, env []string, tld string, port int) error {
	if _, err := exec.LookPath("portless"); err != nil {
		return errors.New("Portless is required. Run: vector setup")
	}
	doctor := exec.CommandContext(ctx, "portless", "doctor")
	doctor.Env = env
	output, _ := doctor.CombinedOutput()
	state := ParseDoctor(string(output))
	if state.Serves(port, tld) {
		return nil
	}
	tlds := []string{tld}

	if state.Responding && state.Port != 0 {
		fmt.Fprintf(out, "Restarting Portless for %s on port %d.\n", describeTLDs(tlds, "*."), port)
		if err := runAttached(ctx, out, env, "portless", "proxy", "stop", "--port", strconv.Itoa(state.Port)); err != nil {
			return fmt.Errorf("could not reconfigure Portless: %w", err)
		}
	}
	args := []string{"proxy", "start", "--port", strconv.Itoa(port)}
	for _, tld := range tlds {
		args = append(args, "--tld", tld)
	}
	if err := runAttached(ctx, out, env, "portless", args...); err != nil {
		return fmt.Errorf("could not start Portless on port %d for %s: %w", port, describeTLDs(tlds, "."), err)
	}
	return nil
}

// SyncHosts adds /etc/hosts entries when a custom TLD does not resolve locally.
// `.localhost` names always resolve to loopback, so they never need it.
func SyncHosts(ctx context.Context, out io.Writer, env []string, tld string, hosts []string) {
	if tld == "localhost" || strings.HasSuffix(tld, ".localhost") {
		return
	}
	resolved := true
	for _, host := range hosts {
		if !resolvesToLoopback(ctx, host+"."+tld) {
			resolved = false
			break
		}
	}
	if resolved {
		return
	}
	if !isTerminal(os.Stdin) {
		fmt.Fprintf(out, "Host synchronization needs an interactive terminal. Run: PORTLESS_TLD=%s portless hosts sync\n", tld)
		return
	}
	if err := runAttached(ctx, out, env, "portless", "hosts", "sync"); err != nil {
		fmt.Fprintf(out, "Could not synchronize %s hostnames. Run: PORTLESS_TLD=%s portless hosts sync\n", tld, tld)
	}
}

func resolvesToLoopback(ctx context.Context, host string) bool {
	addresses, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return false
	}
	for _, address := range addresses {
		if address.IP.IsLoopback() {
			return true
		}
	}
	return false
}

func describeTLDs(tlds []string, prefix string) string {
	parts := make([]string, len(tlds))
	for i, tld := range tlds {
		parts[i] = prefix + tld
	}
	return strings.Join(parts, ", ")
}

func runAttached(ctx context.Context, out io.Writer, env []string, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Env = env
	cmd.Stdin = os.Stdin
	cmd.Stdout = out
	cmd.Stderr = out
	return cmd.Run()
}

func isTerminal(file *os.File) bool {
	info, err := file.Stat()
	return err == nil && info.Mode()&os.ModeCharDevice != 0
}
