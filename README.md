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
- **Vector** provides the project-aware CLI and interactive terminal dashboard.

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
Go, and Process Compose—installs Portless through npm, installs all Bun
workspace dependencies, and installs the `vector` command. Node.js 24 or newer
is required by Portless.

The first Portless run may request approval to trust its local CA. Normal
development uses `.localhost` names and unprivileged port `2187`, so starting
and stopping apps does not require sudo or modify `/etc/hosts`.

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

| Selector | Workspace   | URL                                    |
| -------- | ----------- | -------------------------------------- |
| `demo`   | `apps/web`  | `https://demo.vector.localhost:2187`   |
| `docs`   | `apps/docs` | `https://ui.vector.localhost:2187`     |
| `lab`    | `apps/lab`  | `https://lab.vector.localhost:2187`    |

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

The one-time “Starting Process Compose in detached mode” message is expected.
Detached mode is what lets the apps continue running after the command exits.

Portless serves HTTPS on port `2187` by default. Override the safe defaults with
`VECTOR_TLD` and `VECTOR_PORT`; the underlying `PORTLESS_TLD` and
`PORTLESS_PORT` variables also work. Port 443 may require elevation, while a
custom TLD such as `vector.dev` may require `/etc/hosts` synchronization.
Stop the workspace before changing either network setting, then start it with
the new environment.

Use `vector doctor` for certificate, DNS, route, or proxy diagnostics.

The Process Compose control socket lives at `.process-compose.sock` and is
gitignored. `tooling/services.ts` owns lifecycle behavior; `process-compose.yaml`
contains the actual app commands.

## Vector command center

Run `vector` anywhere inside the repository to open the interactive dashboard:

```bash
vector
```

The first version shows app state, PID, uptime, memory, and routes. It can start,
stop, restart, open, and follow logs for individual apps; control every app;
run checks and diagnostics; or attach the underlying Process Compose dashboard.

```text
j/k or arrows   select app
space           start or stop selected app
u / U           start selected / all apps
s / S           stop selected / all apps
r / R           restart selected / all apps
o               open selected route
l or enter      expand mounted logs; Esc/l returns
c / d           run checks / diagnostics in the output pane
a               attach Process Compose
?               expanded help
q               close Vector; apps keep running
```

Logs are always shown in the lower dashboard pane and update with the selected
app. Lifecycle actions, checks, and diagnostics also render there instead of
temporarily replacing the terminal. Opening or quitting Vector never starts or
stops an app.

The same interface is available noninteractively:

```bash
vector up lab
vector down docs
vector restart demo
vector status
vector logs lab
vector open docs
vector check
vector doctor
```

`vector.yaml` is the compatibility contract between the installed CLI and this
workspace. It describes app names, paths, routes, lifecycle commands, tasks,
and the Process Compose socket. This is also the foundation for a future
`vector init` scaffolder; project creation is not implemented yet.

## Common commands

```bash
just setup       # install missing tools and all workspace dependencies
just install     # install Bun dependencies only
just format      # format source
just typecheck   # typecheck tooling and every workspace
just lint        # lint every workspace
just build       # build every workspace
just check       # typecheck, lint, and build
just vector-check    # test and vet the Vector CLI
just vector-install  # install the current CLI build
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
