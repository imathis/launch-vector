# Launch Vector

A starter kit for AI-assisted web development. `vector` creates a workspace
with small web apps, a shared Base UI design system, component docs, and a
Design Lab for disposable interface experiments, then runs every app behind a
stable local HTTPS route.

Workspaces own their code. The framework updates itself:

| Part                  | Lives in                                   | Updated by                  |
| --------------------- | ------------------------------------------ | --------------------------- |
| `vector` CLI          | `~/.local/bin/vector`                      | `vector update` (self)      |
| Design Lab harness    | `node_modules/@launch-vector/lab`          | `vector update`             |
| Agent skills          | `.agents/skills/vector-*` (+ `.claude` links) | `vector update`          |
| Workspace rules       | the `vector:begin` block in `AGENTS.md`    | `vector update`             |
| Apps, UI, docs, Lab experiments | the workspace                    | you                         |

Skills use the open Agent Skills format, so Codex, Cursor, Copilot, Gemini
CLI, Claude Code, and other agents all load them.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/imathis/launch-vector/master/install.sh | sh
vector new my-apps
cd my-apps
vector setup    # installs Bun, Node, Process Compose, and Portless if missing
vector up
```

`vector setup` uses Homebrew on macOS. Node.js 24 or newer is required by
Portless. The first Portless run may ask to trust its local certificate
authority; routes use `.localhost` names on port `2187`, so no sudo or
`/etc/hosts` changes are needed.

`vector` checks for a new release once a day and prints a notice. Run
`vector update` inside a workspace to update the CLI, the Lab package, and the
agent files together.

## Repository layout

```text
cmd/vector, internal/   Go CLI: workspace lifecycle, dashboard, new/setup/update
packages/lab            @launch-vector/lab, the Design Lab harness (npm)
skills/vector-*         Managed Agent Skills copied into every workspace
agents/AGENTS.md        Managed block written into every workspace AGENTS.md
starter/                The workspace template `vector new` copies
scripts/                Smoke test and release helpers
```

`starter/` is a runnable workspace inside this repository's Bun workspace, so
starter apps resolve `@launch-vector/lab` to `packages/lab`.

## Develop the framework

```bash
brew install just go
just setup        # bun install, then build and install a development vector
just lab-build    # the starter's lab app imports the built Lab package
just up           # run the starter's apps (just up lab, just down, just status)
just lab-watch    # rebuild the Lab package while the lab app runs
just check        # Go tests, typecheck, lint, build, and smoke test
```

Development builds report version `dev` and never replace themselves.

### Try changes in a real workspace

Point a workspace at this checkout instead of published packages:

```bash
vector new ~/workspace/my-site --from ~/workspace/launch-vector
cd ~/workspace/my-site && vector setup
```

The workspace records the checkout in `.vector/source` (gitignored) and
depends on `link:@launch-vector/lab`, so it uses this checkout's Lab build,
skills, and AGENTS block. `vector update` refreshes them from the checkout.
Run `vector update --release` to switch back to published packages, or
`vector update --from <checkout>` to link an existing workspace.

## Release

The CLI, `@launch-vector/lab`, and the starter's Lab dependency share one
version.

```bash
just release 0.2.0           # sets versions, runs tests, commits, and tags
git push origin HEAD v0.2.0  # CI builds the CLI release and publishes the Lab
```

The release workflow publishes `@launch-vector/lab` through npm trusted
publishing, so it needs no npm token. Publish the first version by hand
(`cd packages/lab && npm publish --access public`), then add
`imathis/launch-vector` and `release.yml` as the package's trusted publisher on
npmjs.com. Later releases skip a Lab version that is already published.

Release builds embed the git-tracked starter files
(`go generate ./internal/starter`); a binary without them can still create
workspaces with `--from`.
