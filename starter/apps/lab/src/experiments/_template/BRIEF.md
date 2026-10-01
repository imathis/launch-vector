# Experiment Brief

Tell the agent:

- The user problem and intended audience.
- The product and domain constraints that matter.
- The scenarios every variant must support.
- The decision this experiment should make easier.
- How many meaningfully different variants to explore. If you omit a count, the
  agent must ask before creating any.

Keep variant labels to two or three scannable words. Put longer rationale in the
variant's optional `notes` instead of the tab label.

Before editing, inspect the shared component library and make a brief plan:
variant count and labels, components you will use, and any missing primitives.
Wait for approval. Do not add variants or shared components (or mock
replacements) until the user chooses. Shared additions use the project
component workflow and require documentation.

Variant keys are lineage ids (`1`, `2`, `2a`), not the tab's keyboard order.
Refine a direction with `2a`, `2b`, `2c` only when asked. Do not add `4` for a
refinement of 2. Never renumber keys. When a direction is accepted, write
`HANDOFF.md` and reimplement in the destination app. After that, stop editing
this experiment unless the user asks for more Design Lab work.

This directory is disposable and gitignored. Treat the prototype as a
high-fidelity mockup; do not promote its code, classname overrides, fake data, or
other Lab concessions into production. Edit only files in this experiment
folder. Do not change `packages/lab` or other Lab host files.

Keep `experiment.json` as the lifecycle manifest and import its title and
description from `index.tsx`. Check the configured canvas presets before
designing; do not assume the destination app uses a white or black page. Choose
the canvas layout that matches the proposal: `centered` for compact interfaces,
`padded` for page content, or `full` for edge-to-edge app shells.
