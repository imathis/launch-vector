# Vector

Provisional workspace for small web apps, a shared Base UI design system,
component documentation, and disposable design experiments.

The name is intentionally kept out of package APIs. Shared code uses the
rename-safe `@workspace/*` scope.

Root tasks run directly across Bun workspaces; no separate task runner is
required.

## Requirements

- Bun 1.4+
- Node.js 24+ for Portless
- Portless: `npm install -g portless`

## Start everything

```bash
bun install
bun run dev
```

The dev command uses the `vector.dev` local TLD and first asks Portless for the
standard HTTPS port. If another local proxy already owns it, every app
automatically shares fallback port `2187`. Override these choices with
`PORTLESS_TLD`, `PORTLESS_PORT`, or `PORTLESS_FALLBACK_PORT`.

Portless serves the workspaces at stable local names:

- `https://demo.vector.dev`
- `https://ui.vector.dev`
- `https://lab.vector.dev`

On a machine using the fallback, append `:2187` to each URL. Portless remembers
the selected proxy configuration, so this fallback happens once rather than
assigning ports to individual apps. Run `portless doctor` if neither proxy can
start. The first interactive run may request administrator access to trust its
local certificate and map the custom domains. If a `vector.dev` name does not
resolve while the apps are running, run `portless hosts sync` once.

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
bun run typecheck
bun run lint
bun run build
```
