// Package launchvector embeds the agent files that every workspace receives.
package launchvector

import (
	"embed"
	"io/fs"
)

//go:embed skills
var skills embed.FS

//go:embed agents/AGENTS.md
var agentsBlock string

// Skills returns the managed `vector-*` skills, one directory per skill.
func Skills() fs.FS {
	sub, err := fs.Sub(skills, "skills")
	if err != nil {
		panic(err)
	}
	return sub
}

// AgentsBlock is the managed section written into each workspace AGENTS.md.
func AgentsBlock() string {
	return agentsBlock
}
