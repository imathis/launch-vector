# Vector workspace

- Import shared UI through direct `@workspace/ui/*` subpaths. Do not duplicate app-level primitives.
- Add or update shadcn components with the shadcn CLI; preserve generated Base UI patterns.
- Use semantic theme tokens instead of raw light/dark colors. Every UI must work in light and dark modes.
- Design mobile-first. Interactive targets should be at least 44px on touch layouts and respect safe-area insets.
- Add or update `apps/docs/src/content` documentation when shared components change. Use `/add-component <name>` for the project workflow.
- Treat `apps/lab/src/experiments` prototypes as disposable. Reimplement accepted work in its destination app.
- Do not add glass effects, skins, or app-specific APIs to `@workspace/ui` without an explicit requirement.
