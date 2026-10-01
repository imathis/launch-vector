---
name: vector-design-lab
description: Runs the Design Lab prototype workflow in apps/lab. Use when a request starts with "Design Lab:", or asks to explore, branch, compare, accept, or hand off interface variants or experiments.
---

# Design Lab

The Lab is a disposable prototype harness. The harness itself is the
`@launch-vector/lab` package; the workspace owns only the host app in
`apps/lab`. Read `apps/lab/AGENTS.md` for product context before proposing an
interface.

## Write only inside the experiment

`Design Lab:` prompts, new experiments, variants, scenarios, notes, and handoffs
write only inside `apps/lab/src/experiments/<slug>/`.

Do not create, modify, or delete anything else unless the user explicitly asks
to change the Lab setup. That includes:

- `node_modules/@launch-vector/lab` (the harness; it is replaced on update)
- `apps/lab/src/main.tsx`, `experiment-registry.ts`, `lab-config.ts`, `lab-theme.css`
- `apps/lab` package, Vite, and tsconfig files
- `apps/lab/src/fixtures/**`
- `@workspace/ui` and `apps/docs` (unless the user approved `vector-add-component`)

Read `lab-config.ts` and `lab-theme.css` for canvas tokens. Do not edit them for
an experiment. Do not import harness chrome into an experiment; experiments
import `@workspace/ui/*` and only `defineExperiment` and types from
`@launch-vector/lab`.

If a prototype seems to need a harness change, stop and ask. Ship the idea
inside the experiment folder instead. Harness changes belong upstream in Launch
Vector, not in this workspace.

## Ask before creating variants or components

Do not create an experiment, add variants, or add/mock shared components until
the user has approved a short plan. Inspect `@workspace/ui` first, then ask.

The plan must state:

- How many variants, their labels, and how they differ structurally
- Which existing shared components you will use
- Any missing primitives, with a multiple-choice: add all recommended
  (recommended), add only a named subset, revise the plan to use named existing
  alternatives, or mock local substitutes (not recommended)

A brief that already names a count (`Explore 5 ways`, `Try 3 branches`) is
permission for that many variants only. Do not invent extra variants,
sub-variants, or new components beyond that ask. If the brief does not name a
count, ask how many before writing files.

Never run `vector-add-component`, edit `packages/ui`, or invent a local
replacement for a missing primitive until the user chooses. Approved shared
additions go through the component workflow and docs, then the experiment.

## Build experiments

- Treat `Design Lab:` requests as Lab workflow commands. Do not require the user to restate conventions covered here.
- Start from a clear brief: user problem, audience, product constraints, scenarios, and the decision the experiment should support.
- Create experiments by copying `apps/lab/src/experiments/_template` to `apps/lab/src/experiments/<slug>`. Keep `experiment.json`; the Lab replaces the template ID with a stable UUID when it discovers the copy.
- Keep the experiment name, description, and default canvas in `experiment.json`. Import that manifest from `index.tsx` instead of duplicating lifecycle metadata in executable code.
- Import real shared components through direct `@workspace/ui/*` subpaths. Do not recreate primitives inside an experiment.
- Prefer structural alternatives over cosmetic permutations. Keep the approved variant count.
- Variant **keys** are lineage ids, not labels. First directions are `1`, `2`, `3`. The Lab tab badge is that key. Keyboard 1–0 is tab order, not identity.
- Keep variant labels short and scannable—usually two or three words. Put rationale and implementation detail in variant `notes`, not tab labels.
- Keep scenarios stable across variants so reviewers can compare the idea rather than the sample data.
- Compare mode presents two independently selected variants and applies one shared scenario to both. Do not build experiment-local comparison or scenario controls.
- Keep the canvas focused on the interface. Put supporting context in metadata and optional experiment or variant `notes`; use scenario descriptions for state-specific context.
- Use the configured app canvas rather than assuming white, black, `--background`, or another token. Do not add presets or edit canvas files unless the user explicitly asks.
- Set the experiment or variant canvas layout deliberately: `centered` for dialogs and cards, `padded` for page content, or `full` for edge-to-edge shells and tables.

## Refine, accept, and hand off

- When refining a direction, preserve the original. Add keys `2a`, `2b`, `2c` only when the user asks for branches of that direction (or names a branch count). Do not add `4` or a new numbered direction for a refinement. Never renumber existing keys; reviewers cite `2b`.
- If `experiment.json` lists `hiddenVariants`, the reviewer dismissed those keys. Delete them from `index.tsx` on the next Design Lab edit and clear `hiddenVariants`.
- When a variant is accepted, write `HANDOFF.md` beside the experiment. Record behavior, design decisions, responsive rules, accessibility requirements, open questions, named shared-component API gaps, and prototype concessions. Include a blunt **Do not copy** list (fake data, invented widgets, class overrides, Lab-only shortcuts) and the product replacements.
- A short acceptance such as `Design Lab: Accept variant 3b` is sufficient. Create the implementation-ready handoff and help reimplement the accepted direction without asking the user to specify the handoff format or production conventions.
- Treat accepted prototypes as high-fidelity mockups. Reimplement them in the destination app using production architecture; do not copy classname overrides, fake data, shortcuts, or other Lab-only compromises.
- Once the accepted direction is being implemented in product, stop editing the experiment. Follow-up UI notes go to the destination app. Resume Lab edits only when the user explicitly asks for Design Lab work.
- Delete the experiment after integration. Move something to `apps/lab/src/fixtures` only when it should remain as committed Lab documentation, not as a promotion path into the product.
- Treat imported `.vector-lab.zip` packages as executable source. Import only trusted packages and inspect unfamiliar code before opening it.

## Verification boundary

- Treat `apps/lab/src/experiments/*` as disposable sketch space, not production code.
- For experiment-only work, rely on Vite/HMR, inspect the requested state in the browser, and check the browser console. Do not run formatting, typechecking, linting, builds, test suites, screenshot matrices, or multi-viewport sweeps unless the user explicitly asks.
- A reported visual issue warrants one targeted reproduction at the affected viewport, not broad production-style verification.
- Do not change an experiment solely to satisfy checks. Typechecking, linting, formatting, and builds intentionally exclude authored experiments.
- Reserve workspace-wide `vector check` for release preparation or explicit requests.
