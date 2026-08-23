# Experiment Brief

Tell the agent:

- The user problem and intended audience.
- The product and domain constraints that matter.
- The scenarios every variant must support.
- The decision this experiment should make easier.
- How many meaningfully different variants to explore (usually 3–10).

Keep variant labels to two or three scannable words. Put longer rationale in the
variant's optional `notes` instead of the tab label.

Before editing, inspect the shared component library and make a brief plan. If
the plan needs a missing primitive, ask the user whether to add all recommended
components, add only a selected subset, revise the plan around existing
alternatives, or mock a local substitute (not recommended). Explain that shared
additions use the project component workflow and require documentation.

Refine promising directions with explicit sub-variants such as `2a`, `2b`, and
`2c`. When a direction is accepted, ask the agent to write `HANDOFF.md` and
reimplement the concept in its destination app.

This directory is disposable and gitignored. Treat the prototype as a
high-fidelity mockup; do not promote its code, classname overrides, fake data, or
other Lab concessions into production.

Keep `experiment.json` as the lifecycle manifest and import its title and
description from `index.tsx`. Check the configured canvas presets before
designing; do not assume the destination app uses a white or black page. Choose
the canvas layout that matches the proposal: `centered` for compact interfaces,
`padded` for page content, or `full` for edge-to-edge app shells.
