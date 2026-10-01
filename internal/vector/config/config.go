package config

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

const (
	CurrentVersion = 2
	DefaultPort    = 2187
)

// Hostnames are DNS labels; hosts may join several with dots.
var (
	labelPattern = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`)
	hostPattern  = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$`)
)

// DefaultCommand runs an app's own dev script when vector.yaml does not set one.
var DefaultCommand = []string{"bun", "run", "dev"}

type Config struct {
	Version int                 `yaml:"version"`
	Project Project             `yaml:"project"`
	Network Network             `yaml:"network"`
	Apps    []App               `yaml:"apps"`
	Tasks   map[string][]string `yaml:"tasks"`
}

type Project struct {
	Name string `yaml:"name"`
}

type Network struct {
	Port int `yaml:"port"`
}

type App struct {
	Name  string `yaml:"name"`
	Title string `yaml:"title,omitempty"`
	Path  string `yaml:"path"`
	// Route is the hostname label inside the project: <route>.<project>.localhost.
	Route string `yaml:"route,omitempty"`
	// Host replaces the whole hostname, for example `weekly` for weekly.localhost.
	Host    string   `yaml:"host,omitempty"`
	Aliases []string `yaml:"aliases,omitempty"`
	Command []string `yaml:"command,omitempty"`
}

func Load(path string) (Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return Config{}, err
	}
	defer file.Close()
	return Decode(file, path)
}

// Decode reads one vector.yaml document, applies defaults, and validates it.
func Decode(r io.Reader, name string) (Config, error) {
	decoder := yaml.NewDecoder(r)
	decoder.KnownFields(true)
	var cfg Config
	if err := decoder.Decode(&cfg); err != nil {
		if version := legacyVersion(err); version != 0 {
			return Config{}, fmt.Errorf("%s uses version %d; %s", name, version, upgradeHint)
		}
		return Config{}, fmt.Errorf("decode %s: %w", name, err)
	}
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		if err == nil {
			return Config{}, fmt.Errorf("decode %s: multiple YAML documents are not supported", name)
		}
		return Config{}, fmt.Errorf("decode %s: %w", name, err)
	}
	cfg.applyDefaults()
	if err := cfg.Validate(); err != nil {
		return Config{}, fmt.Errorf("validate %s: %w", name, err)
	}
	return cfg, nil
}

const upgradeHint = "set version: 2 and remove the process_compose and lifecycle keys"

// legacyVersion reports version 1 files, whose removed keys fail strict decoding.
func legacyVersion(err error) int {
	message := err.Error()
	if strings.Contains(message, "field process_compose not found") || strings.Contains(message, "field lifecycle not found") {
		return 1
	}
	return 0
}

func (c *Config) applyDefaults() {
	if c.Network.Port == 0 {
		c.Network.Port = DefaultPort
	}
	for i := range c.Apps {
		app := &c.Apps[i]
		if app.Title == "" {
			app.Title = app.Name
		}
		if app.Route == "" {
			app.Route = app.Name
		}
		if len(app.Command) == 0 {
			app.Command = append([]string(nil), DefaultCommand...)
		}
	}
}

func (c Config) Validate() error {
	if c.Version != CurrentVersion {
		if c.Version < CurrentVersion {
			return fmt.Errorf("unsupported version %d; %s", c.Version, upgradeHint)
		}
		return fmt.Errorf("version %d needs a newer vector; run: vector update", c.Version)
	}
	if !labelPattern.MatchString(c.Project.Name) {
		return fmt.Errorf("project.name %q must be lowercase letters, digits, and hyphens", c.Project.Name)
	}
	if c.Network.Port < 1 || c.Network.Port > 65535 {
		return errors.New("network.port must be between 1 and 65535")
	}
	if len(c.Apps) == 0 {
		return errors.New("at least one app is required")
	}

	identifiers := make(map[string]string)
	for i, app := range c.Apps {
		if app.Name == "" || app.Path == "" {
			return fmt.Errorf("apps[%d] requires name and path", i)
		}
		if filepath.IsAbs(app.Path) || strings.HasPrefix(filepath.Clean(app.Path), "..") {
			return fmt.Errorf("app %q path must stay inside the workspace", app.Name)
		}
		if app.Command[0] == "" {
			return fmt.Errorf("app %q command is empty", app.Name)
		}
		if !labelPattern.MatchString(app.Route) {
			return fmt.Errorf("app %q route %q must be lowercase letters, digits, and hyphens", app.Name, app.Route)
		}
		if app.Host != "" && !hostPattern.MatchString(app.Host) {
			return fmt.Errorf("app %q host %q must be a lowercase hostname without the .localhost suffix", app.Name, app.Host)
		}
		for _, identifier := range append([]string{app.Name, app.Route}, app.Aliases...) {
			key := strings.ToLower(identifier)
			if key == "" {
				return fmt.Errorf("app %q contains an empty alias", app.Name)
			}
			if owner, exists := identifiers[key]; exists && owner != app.Name {
				return fmt.Errorf("app identifier %q is shared by %q and %q", identifier, owner, app.Name)
			}
			identifiers[key] = app.Name
		}
	}
	for name, command := range c.Tasks {
		if name == "" || len(command) == 0 || command[0] == "" {
			return fmt.Errorf("task %q must contain a command", name)
		}
	}
	return nil
}

func (c Config) ResolveApp(value string) (App, bool) {
	value = strings.ToLower(value)
	for _, app := range c.Apps {
		if value == strings.ToLower(app.Name) || value == strings.ToLower(app.Route) {
			return app, true
		}
		for _, alias := range app.Aliases {
			if value == strings.ToLower(alias) {
				return app, true
			}
		}
	}
	return App{}, false
}

// AppHost is the Portless name for an app. Including the project keeps routes
// unique when several workspaces share the proxy.
func (c Config) AppHost(app App) string {
	if app.Host != "" {
		return app.Host
	}
	return app.Route + "." + c.Project.Name
}
