---
name: vector-add-component
description: Adds, installs, and documents exactly one shadcn registry component in this workspace. Use when a user asks to add, install, or document a shadcn component, or invokes /vector-add-component.
---

# Add one component

Accept exactly one shadcn registry component name. If the request contains no
component name, more than one candidate, or an ambiguous name, ask one short
clarifying question and stop. Do not batch components.

## Inspect first

Read these files before running the CLI:

- `AGENTS.md`
- `apps/web/components.json`
- `packages/ui/components.json`
- `apps/docs/src/docs/types.ts`
- `apps/docs/src/content/_template.tsx`
- Existing modules in `apps/docs/src/content`
- Existing generated files in `packages/ui/src/components`

Use the official `shadcn` skill as supporting guidance. This is a Base UI
monorepo: do not infer Radix APIs or create a replacement primitive by hand.

## CLI sequence

Run every command from the workspace root with the app context. The first CLI
command must be project info, followed by docs, dry-run, then installation:

```bash
bunx --bun shadcn@latest info -c apps/web --json
bunx --bun shadcn@latest docs <name> -c apps/web
bunx --bun shadcn@latest add <name> -c apps/web --dry-run
bunx --bun shadcn@latest add <name> -c apps/web -y
```

Fetch and read the documentation, examples, and API URLs returned by `docs`
before installing. Use the info and dry-run output to confirm that monorepo
routing targets shared primitives in `packages/ui` and to identify all files
and dependencies that will change.

If the component or any dry-run target already exists, do not install or
overwrite it. Show the conflict and ask for explicit approval first. Never use
`--overwrite` without that approval. Never hand-create a shadcn component.

## Review generated code

After installation, read every generated or modified component file. Inspect
the actual exported Base UI parts, prop types, state attributes, composition,
and dependencies. Treat the generated code and fetched Base UI API as the
source of truth; never translate remembered Radix props such as `asChild` onto
Base UI. Preserve direct `@workspace/ui/*` imports.

## Document it

Create or update `apps/docs/src/content/<slug>.tsx` using the typed contract
and `_template.tsx`. The registry discovers it automatically; do not edit
navigation. Documentation must include:

- Purpose, use when, and do not use when
- Representative variants and meaningful states
- Mobile layout, wrapping/overflow, safe-area, and interaction guidance
- Accessibility structure, names, keyboard behavior, focus, and announcements
- Explicit source strings that exactly match the rendered preview, including
  imports and relevant props/classes

Import shared components directly from `@workspace/ui/*`. Use semantic theme
tokens, make demo touch targets at least 44px, and verify light and dark modes.
Do not add glass effects, skins, or app-specific APIs unless explicitly asked.
Do not add generic knobs or hand-maintained navigation.

## Verify and report

Run from the workspace root, in this order, and fix failures caused by the
change:

```bash
bun run typecheck
bun run lint
bun run build
```

Report the installed/generated files, package or CSS changes, verification
outcomes, and the shareable docs route `?component=<slug>` (include the full
URL if the running docs origin is known). Never commit or amend commits.
