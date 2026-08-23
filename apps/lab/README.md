# Prototype lab

An agent-first workshop for disposable interface experiments. Ask an agent for
several variants, refine promising directions, then use a handoff to reimplement
the accepted concept in its destination app.

Add product vocabulary, business rules, user context, and important edge cases
to `AGENTS.md`. The Lab works best beside the product in a monorepo, where agents
can inspect real flows and import the shared `@workspace/ui` design system.

Run from the workspace root:

```bash
just up lab
```

Local experiment directories are gitignored by default. `src/fixtures` contains
committed Lab demonstrations; it is not the promotion path into production. See
the in-app Lab Guide for the workflow and the help menu for shortcuts.

Keep the experiment canvas about the interface itself. Put supporting context in
the experiment description and optional experiment or variant `notes`; the Lab
shows that context with the active scenario description in the Notes popover.
