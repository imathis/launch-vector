# Vector

Provisional workspace for small web apps, a shared Base UI design system,
component documentation, and disposable design experiments.

The name is intentionally kept out of package APIs. Shared code uses the
rename-safe `@workspace/*` scope.

## How it works

- **Just** is the human-facing command runner.
- **Bun** installs dependencies and runs workspace scripts.
- **Process Compose** supervises native development servers.
- **Portless** gives each server a stable local HTTPS name.

The Vite applications run natively rather than in containers. If the workspace
later needs Postgres, Redis, or other infrastructure, those services can be
added through OrbStack without moving the frontend development servers.

## First-time setup

Install Homebrew and Just, clone the repository, then run setup:

```bash
brew install just
just setup
```

`just setup` uses Homebrew to install any missing system tools—Bun, Node.js,
and Process Compose—installs Portless through npm, then installs all Bun
workspace dependencies. Node.js 24 or newer is required by Portless.

The first Portless run may request administrator access to trust its local CA
and update `/etc/hosts`.

## Run the workspace

Start every application in the background:

```bash
just
# or: just up
```

Start or stop one application independently:

```bash
just up lab
just up docs
just down lab
```

Selectors map to workspaces and Portless routes:

| Selector | Workspace   | URL                       |
| -------- | ----------- | ------------------------- |
| `demo`   | `apps/web`  | `https://demo.vector.dev` |
| `docs`   | `apps/docs` | `https://ui.vector.dev`   |
| `lab`    | `apps/lab`  | `https://lab.vector.dev`  |

Process Compose keeps the selected servers running after `just up` returns.
Manage them from any terminal:

```bash
just status       # show all process states
just logs lab     # follow one app; Ctrl-C only exits the log viewer
just logs         # follow every app
just attach       # open the interactive process dashboard
just down docs    # stop one app
just down         # stop the complete workspace supervisor
```

Portless first uses standard HTTPS port 443. If another local proxy owns it,
all apps share fallback port `2187`, and the printed URLs include that port.
Override the defaults with `PORTLESS_TLD`, `PORTLESS_PORT`, or
`PORTLESS_FALLBACK_PORT`.

If a `vector.dev` name does not resolve while its app is running, run
`portless hosts sync` once. Use `portless doctor` for certificate, DNS, or proxy
diagnostics.

The Process Compose control socket lives at `.process-compose.sock` and is
gitignored. `tooling/services.ts` owns lifecycle behavior; `process-compose.yaml`
contains the actual app commands.

## Common commands

```bash
just setup       # install missing tools and all workspace dependencies
just install     # install Bun dependencies only
just format      # format source
just typecheck   # typecheck tooling and every workspace
just lint        # lint every workspace
just build       # build every workspace
just check       # typecheck, lint, and build
just --list      # show every recipe
```

## Workspace

```text
apps/web       Small integration app
apps/docs      Lightweight component documentation
apps/lab       Disposable prototype harness
packages/ui    Shared shadcn/Base UI components and theme
```

Import shared code through direct subpaths:

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Add a component

In Claude Code, restart after the initial checkout so project skills load, then
run:

```text
/add-component <name>
```

The command inspects the Base UI project, installs exactly one component with
the official shadcn CLI, generates its docs module, and verifies every
workspace. The official shadcn skill is installed locally under
`.claude/skills`.

Component docs live in `apps/docs/src/content` and are discovered
automatically. Use `_template.tsx` as the authoring contract.

## Prototype an idea

Copy `apps/lab/src/experiments/_template` to a new directory under
`apps/lab/src/experiments`. Local experiments are gitignored by default.

Experiments exist to reach a decision. Reimplement accepted work in its real
application, then delete or abandon the prototype. Do not preserve it as a
second implementation.

Lab shortcuts ignore editable controls:

- `D`: toggle light/dark
- `C`: focus/compare
- `V`: next variant
- `S`: next scenario
- `H`: hide/show controls

## Verify

```bash
just check
```
