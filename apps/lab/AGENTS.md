# Lab agent guidance

- Read the repository's product, domain, and design-system instructions before proposing an interface.
- Import real shared components through direct `@workspace/ui/*` subpaths. Do not recreate primitives inside an experiment.
- Create experiments under `src/experiments/<name>`. These directories are gitignored and disposable by design.
- Start from a clear brief: user problem, audience, product constraints, scenarios, and the decision the experiment should support.
- Produce 3–10 meaningfully different variants unless the brief asks for a narrower exploration. Prefer structural alternatives over cosmetic permutations.
- Keep scenarios stable across variants so reviewers can compare the idea rather than the sample data.
- Keep the canvas focused on the interface. Put supporting context in metadata and optional experiment or variant `notes`; use scenario descriptions for state-specific context.
- When refining a direction, preserve the original and add explicit sub-variants such as `2a`, `2b`, and `2c`.
- When a variant is accepted, write `HANDOFF.md` beside the experiment. Record behavior, design decisions, responsive rules, accessibility requirements, open questions, and prototype concessions.
- Treat accepted prototypes as high-fidelity mockups. Reimplement them in the destination app using production architecture; do not copy classname overrides, fake data, shortcuts, or other Lab-only compromises.
- Delete the experiment after integration. Move something to `src/fixtures` only when it should remain as committed Lab documentation, not as a promotion path into the product.

## Add product context here

Replace this section with the domain knowledge agents need: product vocabulary, user roles, business rules, data constraints, important edge cases, and links to canonical product flows.
