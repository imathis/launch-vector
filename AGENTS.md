# Launch Vector

This repository is the framework source behind `vector` workspaces. See
`README.md` for the layout and release flow.

## Boundaries

- `starter/` is the template `vector new` copies. Every file in it becomes owned by the new workspace, so keep it self-contained: no paths that reach outside `starter/`, and keep the rename-safe `@workspace/*` package names.
- `skills/vector-*` and `agents/AGENTS.md` are written into every workspace by `vector setup` and `vector update`, replacing local edits. Keep them agent-neutral: Agent Skills format (directory name matches the frontmatter `name`, plus a `description`), no features specific to one coding agent, and paths relative to a workspace root.
- `packages/lab` is the published `@launch-vector/lab` harness. Follow `packages/lab/AGENTS.md`.
- The Go CLI lives in `cmd/vector` and `internal/`. A `vector.yaml` schema change needs a version bump and a clear error for older files.

## Workspace rules

Work inside `starter/` follows the same rules workspaces get:

- Import shared UI through direct `@workspace/ui/*` subpaths. Do not duplicate app-level primitives.
- Add or update shadcn components with the shadcn CLI; preserve generated Base UI patterns. Follow `skills/vector-add-component/SKILL.md`, running its commands from `starter/`.
- Use semantic theme tokens instead of raw light/dark colors. Every UI must work in light and dark modes.
- Design mobile-first. Interactive targets should be at least 44px on touch layouts and respect safe-area insets.
- Do not add glass effects, skins, or app-specific APIs to `@workspace/ui` without an explicit requirement.
- `Design Lab:` prompts follow `skills/vector-design-lab/SKILL.md` and write only under `starter/apps/lab/src/experiments/<slug>/`.

## Releases and verification

- The CLI tag, the `packages/lab` version, and the starter's `@launch-vector/lab` dependency move together. Use `just release <version>`; a test enforces the match.
- Verify with `just check`. It includes `just smoke`, which creates a workspace from this checkout, installs it, and builds it.
