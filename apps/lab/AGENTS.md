# Lab agent guidance

- Read the repository's product, domain, and design-system instructions before proposing an interface.
- Treat `Design Lab:` requests as Lab workflow commands. Do not require the user to restate implementation conventions already covered here.
- Before editing, inspect the available shared components and give the user a brief implementation plan.
- If that plan needs shared components that are missing from the workspace, stop and ask a structured multiple-choice question before adding or mocking anything. Briefly explain which components are missing and that approved additions will be generated through the project's component workflow, added to the shared library, documented, and then used by the experiment. Offer choices tailored to the request: add all recommended components (recommended), add only a named subset, revise the plan to use named existing alternatives, or mock local substitutes (not recommended). Allow the user to select components individually when useful.
- Never silently invent a local replacement for a missing shared primitive. Continue only after the user chooses how to resolve the gap.
- Import real shared components through direct `@workspace/ui/*` subpaths. Do not recreate primitives inside an experiment.
- Create experiments by copying `src/experiments/_template` to `src/experiments/<slug>`. Keep `experiment.json`; the Lab replaces the template ID with a stable UUID when it discovers the copy.
- Keep the experiment name, description, and default canvas in `experiment.json`. Import that manifest from `index.tsx` instead of duplicating lifecycle metadata in executable code.
- Start from a clear brief: user problem, audience, product constraints, scenarios, and the decision the experiment should support.
- Produce 3–10 meaningfully different variants unless the brief asks for a narrower exploration. Prefer structural alternatives over cosmetic permutations.
- Keep scenarios stable across variants so reviewers can compare the idea rather than the sample data.
- Keep the canvas focused on the interface. Put supporting context in metadata and optional experiment or variant `notes`; use scenario descriptions for state-specific context.
- Inspect `src/lab-config.ts` and `src/lab-theme.css` before designing. Use the configured app canvas rather than assuming white, black, `--background`, or another token. Add a named preset only when the experiment genuinely needs another product surface.
- When refining a direction, preserve the original and add explicit sub-variants such as `2a`, `2b`, and `2c`.
- When a variant is accepted, write `HANDOFF.md` beside the experiment. Record behavior, design decisions, responsive rules, accessibility requirements, open questions, and prototype concessions.
- A short acceptance such as `Design Lab: Accept variant 3b` is sufficient. Create the implementation-ready handoff and help reimplement the accepted direction without asking the user to specify the handoff format or production conventions.
- Treat accepted prototypes as high-fidelity mockups. Reimplement them in the destination app using production architecture; do not copy classname overrides, fake data, shortcuts, or other Lab-only compromises.
- Delete the experiment after integration. Move something to `src/fixtures` only when it should remain as committed Lab documentation, not as a promotion path into the product.
- Treat imported `.vector-lab.zip` packages as executable source. Import only trusted packages and inspect unfamiliar code before opening it.

## Add product context here

Replace this section with the domain knowledge agents need: product vocabulary, user roles, business rules, data constraints, important edge cases, and links to canonical product flows.
