package config

import (
	"errors"
	"fmt"
	"io"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

const (
	CurrentVersion = 1
	DefaultPort    = 2187
)

type Config struct {
	Version        int                 `yaml:"version"`
	Project        Project             `yaml:"project"`
	Network        Network             `yaml:"network"`
	ProcessCompose ProcessCompose      `yaml:"process_compose"`
	Lifecycle      []string            `yaml:"lifecycle"`
	Apps           []App               `yaml:"apps"`
	Tasks          map[string][]string `yaml:"tasks"`
}

type Project struct {
	Name string `yaml:"name"`
	TLD  string `yaml:"tld"`
}

type Network struct {
	Port int `yaml:"port"`
}

type ProcessCompose struct {
	Socket string `yaml:"socket"`
}

type App struct {
	Name    string   `yaml:"name"`
	Title   string   `yaml:"title"`
	Path    string   `yaml:"path"`
	Route   string   `yaml:"route"`
	Aliases []string `yaml:"aliases,omitempty"`
}

func Load(path string) (Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return Config{}, err
	}
	defer file.Close()

	decoder := yaml.NewDecoder(file)
	decoder.KnownFields(true)
	var cfg Config
	if err := decoder.Decode(&cfg); err != nil {
		return Config{}, fmt.Errorf("decode %s: %w", path, err)
	}
	if cfg.Network.Port == 0 {
		cfg.Network.Port = DefaultPort
	}
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		if err == nil {
			return Config{}, fmt.Errorf("decode %s: multiple YAML documents are not supported", path)
		}
		return Config{}, fmt.Errorf("decode %s: %w", path, err)
	}
	if err := cfg.Validate(); err != nil {
		return Config{}, fmt.Errorf("validate %s: %w", path, err)
	}
	return cfg, nil
}

func (c Config) Validate() error {
	if c.Version != CurrentVersion {
		return fmt.Errorf("unsupported version %d (expected %d)", c.Version, CurrentVersion)
	}
	if c.Project.Name == "" || c.Project.TLD == "" {
		return errors.New("project.name and project.tld are required")
	}
	if c.Network.Port < 1 || c.Network.Port > 65535 {
		return errors.New("network.port must be between 1 and 65535")
	}
	if c.ProcessCompose.Socket == "" {
		return errors.New("process_compose.socket is required")
	}
	if len(c.Lifecycle) == 0 || c.Lifecycle[0] == "" {
		return errors.New("lifecycle command is required")
	}
	if len(c.Apps) == 0 {
		return errors.New("at least one app is required")
	}

	identifiers := make(map[string]string)
	for i, app := range c.Apps {
		if app.Name == "" || app.Title == "" || app.Path == "" || app.Route == "" {
			return fmt.Errorf("apps[%d] requires name, title, path, and route", i)
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
