# Prototype lab

An agent-first workshop for disposable interface experiments. Ask an agent for
several variants, refine promising directions, then use a handoff to reimplement
the accepted concept in its destination app.

Add product vocabulary, business rules, user context, and important edge cases
to `AGENTS.md`. The Lab works best beside the product in a monorepo, where agents
can inspect real flows and existing product patterns.

Run from the workspace root:

```bash
just up lab
```

Local experiment directories are gitignored by default. `src/fixtures` contains
committed Lab demonstrations; it is not the promotion path into production. See
the in-app Lab Guide for the workflow and the help menu for shortcuts.

The Lab uses real browser routes: `/` for the Guide, `/new` for starting or
importing work, and `/labs/<slug>` for an experiment. Page and experiment
navigation creates browser history entries; variant, scenario, view, and canvas
preferences remain query-backed.

Keep the experiment canvas about the interface itself. Put supporting context in
the experiment description and optional experiment or variant `notes`; the Lab
shows that context with the active scenario description in the Notes popover.

## Experiment lifecycle

Copy `src/experiments/_template` to `src/experiments/<slug>`. Every experiment
has an `experiment.json` manifest containing its stable sharing identity, name,
description, and default canvas. The dev-only management service can:

- Rename the display title or URL slug.
- Download versioned `.vector-lab.zip` source packages.
- Archive experiments out of the active Vite registry and restore them later.
- Move experiments to recoverable trash, then restore or permanently purge them.

Open the experiment settings gear immediately before the presentation toggle to
rename the active experiment, download its package, archive it, or move it to
trash. Archived and trashed experiments appear in the same menu with restore
actions. After archiving the current experiment, the Lab opens the included demo
so the restore menu remains available.

The separate New Experiment page includes concise agent prompt examples and the
trusted package importer. Imports contain executable React source. Only import
packages you trust.

## Product canvas

The Lab makes no fixed assumption about an app's page background. The committed
`src/lab-config.ts` owns the named canvas presets, while `src/lab-theme.css` maps
the default `App background` preset to real design-system tokens. The New
Experiment page reports when that mapping is missing. Import only a token
declaration stylesheet there—not an app's complete global stylesheet.

For example:

```css
@import "@workspace/product-theme/tokens.css";

:root {
  --lab-app-background: var(--product-page-background);
  --lab-app-foreground: var(--product-page-foreground);
}
```

Add more presets in `lab-config.ts` only when reviewers need to exercise the
same interface on distinct product surfaces. The canvas selector appears only
when multiple choices exist. Selection is URL-backed and uses semantic
foreground/background pairs in light and dark themes.
