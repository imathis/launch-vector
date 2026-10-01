## Launch Vector

This workspace runs on Launch Vector. `vector.yaml` lists every app; the
`vector` CLI runs them.

- Start apps with `vector up [app]`, stop them with `vector down [app]`, and inspect them with `vector status` or `vector logs [app]`. Verify with `vector check`.
- To add an app, create it under `apps/<name>` with a `dev` script that honors `PORT` and `HOST`, then add it to `vector.yaml`. Do not add other process or proxy configuration.
- `vector update` replaces this block, `.agents/skills/vector-*`, and their `.claude/skills` links. Do not edit them; put project guidance outside this block.
- Import shared UI through direct `@workspace/ui/*` subpaths. Do not duplicate app-level primitives.
- Add shadcn components with the shadcn CLI and preserve generated Base UI patterns. Use the `vector-add-component` skill, and document shared components in `apps/docs/src/content`.
- Use semantic theme tokens instead of raw light/dark colors. Every UI must work in light and dark modes.
- Design mobile-first. Interactive targets should be at least 44px on touch layouts and respect safe-area insets.
- Do not add glass effects, skins, or app-specific APIs to `@workspace/ui` without an explicit requirement.
- For `Design Lab:` requests, follow the `vector-design-lab` skill. Experiments in `apps/lab/src/experiments` are disposable; reimplement accepted work in its destination app. Never edit the `@launch-vector/lab` package.
