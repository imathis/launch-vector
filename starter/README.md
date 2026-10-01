# Workspace

A Launch Vector workspace: small web apps, a shared Base UI design system,
component docs, and a Design Lab for disposable interface experiments.

## Run it

```bash
vector setup     # install missing tools and dependencies (first run)
vector up        # start every app in the background
vector           # open the dashboard
```

| App    | Path        | URL                                   |
| ------ | ----------- | ------------------------------------- |
| `web`  | `apps/web`  | `https://web.<name>.localhost:2187`   |
| `docs` | `apps/docs` | `https://ui.<name>.localhost:2187`    |
| `lab`  | `apps/lab`  | `https://lab.<name>.localhost:2187`   |

Other commands:

```bash
vector up lab        # start one app
vector down          # stop everything
vector status        # process state and routes
vector logs docs     # follow one app's logs
vector check         # typecheck, lint, and build
vector update        # update vector, the Lab, and agent skills
```

## What you own

Everything in this repository is yours except a few files `vector update`
replaces:

- `.agents/skills/vector-*` and their links in `.claude/skills`
- The `vector:begin` … `vector:end` block in `AGENTS.md`
- The `@launch-vector/lab` version in `apps/lab/package.json`

The Design Lab harness itself lives in `node_modules/@launch-vector/lab`, so
updates never touch your experiments.

## Add an app

Create it under `apps/<name>` with a `dev` script that listens on `PORT` and
`HOST` (Vite apps in this workspace already do), then add it to `vector.yaml`:

```yaml
apps:
  - name: blog
    path: apps/blog
```

Run `vector up blog` and open `https://blog.<name>.localhost:2187`.

## Work with agents

`AGENTS.md` holds the workspace rules every coding agent reads. Skills live in
`.agents/skills`, which Codex, Cursor, Copilot, Gemini CLI, and most other
agents load directly; Claude Code loads the same skills through
`.claude/skills` links.

- `vector-add-component`: add and document one shadcn component.
- `vector-design-lab`: explore interface ideas. Start a prompt with
  `Design Lab:` and describe the problem, constraints, and how many directions
  you want.

Third-party skills such as `shadcn` are tracked in `skills-lock.json`; refresh
them with `bunx skills update -p`.

Add product context to `AGENTS.md` (below the managed block) and to
`apps/lab/AGENTS.md`.

## Shared UI

Import shared components through direct subpaths:

```tsx
import { Button } from "@workspace/ui/components/button"
```

Component docs live in `apps/docs/src/content` and are discovered
automatically. Use `_template.tsx` as the authoring contract.
