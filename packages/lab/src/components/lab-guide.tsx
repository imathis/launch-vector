import { Bot, GitBranch, PackageCheck, Plus, Play, Rows3 } from "lucide-react"

import { Button } from "#/components/ui"

const phases = [
  {
    number: "01",
    title: "Ask",
    description:
      "Describe the problem, any important constraints, and how many directions you want. The Lab harness supplies the design-system and prototyping instructions.",
    example:
      "Design Lab: Explore 5 ways to help returning customers reorder. Include empty, single-item, and long-order states.",
  },
  {
    number: "02",
    title: "Refine",
    description:
      "Say which direction is closest and what should change. The agent keeps the original and creates branches such as 2a, 2b, and 2c — not a new numbered 4.",
    example:
      "Design Lab: Variant 2 is closest. Try 3 branches with a quieter reorder action and less account chrome.",
  },
  {
    number: "03",
    title: "Integrate",
    description:
      "Accept a direction. The agent creates an implementation-ready handoff that separates the product decision from prototype-only code and helps reimplement it correctly.",
    example: "Design Lab: Accept variant 2b.",
  },
] as const

export function LabGuide({
  onAdd,
  onOpenDemo,
}: {
  onAdd: () => void
  onOpenDemo?: () => void
}) {
  return (
    <article className="mx-auto max-w-4xl pb-16">
      <header className="max-w-3xl border-b border-border pb-10 sm:pb-12">
        <p className="text-sm font-medium text-muted-foreground">Lab Guide</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-pretty sm:text-4xl">
          Use the Lab with an agent.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-pretty text-muted-foreground">
          Give the agent a product problem and ask for several interface
          directions. It builds them from your design system; you compare the
          options, refine a direction, and hand the accepted concept back for
          production integration.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button
            type="button"
            size="lg"
            className="min-h-11 px-4"
            onClick={onAdd}
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            New Experiment
          </Button>
          {onOpenDemo ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="min-h-11 bg-background px-4"
              onClick={onOpenDemo}
            >
              <Play data-icon="inline-start" aria-hidden="true" />
              View Demo
            </Button>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="workflow" className="py-10 sm:py-12">
        <p className="text-sm font-medium text-muted-foreground">
          The Workflow
        </p>
        <h2
          id="workflow"
          className="mt-2 text-2xl font-semibold tracking-tight text-pretty"
        >
          Ask → Refine → Integrate
        </h2>
        <div className="mt-7 grid gap-px overflow-hidden rounded-xl border border-border bg-border">
          {phases.map((phase) => (
            <div
              key={phase.title}
              className="grid gap-5 bg-background p-5 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:p-6"
            >
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                {phase.number}
              </p>
              <div>
                <h3 className="text-lg font-semibold">{phase.title}</h3>
                <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
                  {phase.description}
                </p>
                <blockquote className="mt-4 border-l-2 border-border pl-4 text-sm leading-6 text-foreground">
                  “{phase.example}”
                </blockquote>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="context"
        className="grid gap-8 border-t border-border py-10 sm:py-12 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]"
      >
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Give Agents Context
          </p>
          <h2
            id="context"
            className="mt-2 text-2xl font-semibold tracking-tight text-pretty"
          >
            The harness supplies structure. Your instructions supply judgment.
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Add product language, business rules, audience details, and known
            edge cases to{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
              apps/lab/AGENTS.md
            </code>
            . Agents should read that context before proposing an interface.
          </p>
        </div>
        <div>
          <div className="rounded-xl border border-border bg-muted/35 p-5 sm:p-6">
            <Bot className="size-5 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-4 font-semibold">Best Inside the Monorepo</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              When the Lab lives beside the product, agents can inspect real
              flows, understand existing patterns, and use the product context
              already available to them.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="structure" className="py-10 sm:py-12">
        <p className="text-sm font-medium text-muted-foreground">
          How Reviews Stay Useful
        </p>
        <h2
          id="structure"
          className="mt-2 text-2xl font-semibold tracking-tight text-pretty"
        >
          Variants change the idea. Scenarios change the conditions.
        </h2>
        <div className="mt-7 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          <div className="bg-background p-5 sm:p-6">
            <GitBranch
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-semibold">Variants</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Distinct interface directions and later sub-variants. Compare them
              side by side without changing the underlying scenario.
            </p>
          </div>
          <div className="bg-background p-5 sm:p-6">
            <Rows3
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-semibold">Scenarios</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Shared data states such as first visit, returning user, empty
              results, errors, or pathological content.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="handoff"
        className="border-t border-border py-10 sm:py-12"
      >
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-muted-foreground">
            Prototype, Then Reimplement
          </p>
          <h2
            id="handoff"
            className="mt-2 text-2xl font-semibold tracking-tight text-pretty"
          >
            The accepted variant is a high-fidelity mockup—not portable code.
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            During integration, the agent writes a handoff that records
            behavior, decisions, responsive rules, and open questions. It must
            identify classname overrides, shortcuts, fake data, and other
            prototype concessions instead of copying them into production.
          </p>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-5 sm:p-6">
            <PackageCheck
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-semibold">Experiments Are Disposable</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Everything under{" "}
              <code className="font-mono text-foreground">src/experiments</code>{" "}
              is gitignored by default. Integrate the decision into its
              destination, then delete the sketch.
            </p>
          </div>
          <div className="rounded-xl border border-border p-5 sm:p-6">
            <GitBranch
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-semibold">Fixtures Are Documentation</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Move work into{" "}
              <code className="font-mono text-foreground">src/fixtures</code>{" "}
              only when it should remain as a committed Lab example—not as the
              path into production.
            </p>
          </div>
        </div>
      </section>
    </article>
  )
}
