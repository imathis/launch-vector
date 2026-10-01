# Lab harness

This package is `@launch-vector/lab`: the Lab runtime, its private shadcn
components, the mount API, and experiment management. Workspaces install it
from npm and never edit it.

Do not edit this package for `Design Lab:` experiment work. Experiments live in
the host app under `starter/apps/lab/src/experiments/<slug>/` and import
`@workspace/ui`. Harness-private UI is not a design system for prototypes.

Only change this package when the user explicitly asks to change the Lab
harness. Its public API is `src/index.ts`, `src/vite.ts`, and `styles.css`;
changes there are breaking for every workspace. Then run
`bun run --filter @launch-vector/lab check`.
