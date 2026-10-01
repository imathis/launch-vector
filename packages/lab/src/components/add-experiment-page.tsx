import { ArrowDown, FileText, MonitorPlay } from "lucide-react"

import { ExperimentImport } from "./experiment-import"

const prompts = [
  {
    step: "Explore",
    command: "Design Lab:",
    request:
      "Explore 5 ways to help returning customers reorder. Include empty, single-item, and long-order states.",
  },
  {
    step: "Constrain",
    command: "Design Lab:",
    request:
      "Explore 4 ways to compare plans on mobile without hiding important limitations.",
  },
  {
    step: "Refine",
    command: "Design Lab:",
    request:
      "Variant 3 is closest. Try 3 branches (3a, 3b, 3c) with a quieter primary action and less account chrome.",
  },
  {
    step: "Choose",
    command: "Design Lab:",
    request: "Accept variant 3b.",
  },
] as const

export function AddExperimentPage({
  onImported,
}: {
  onImported: (slug: string) => void
}) {
  return (
    <article className="mx-auto max-w-4xl pb-16">
      <header className="max-w-3xl pb-8 sm:pb-10">
        <p className="text-sm font-medium text-muted-foreground">
          New Experiment
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-pretty sm:text-4xl">
          Tell the agent what to explore.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-pretty text-muted-foreground">
          Describe the problem, useful constraints, and how many directions you
          want. Then refine what works and choose a result.
        </p>
      </header>

      <aside className="mb-8 border-l-2 border-border py-1 pl-4 text-sm leading-6 text-muted-foreground sm:mb-10">
        Focus on product context and judgment. The Lab harness already tells the
        agent how to build experiments and use your existing system. If a needed
        shared component is missing, the agent will explain the options and ask
        before adding or mocking it.
      </aside>

      <section aria-labelledby="input-heading">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Input
            </p>
            <h2
              id="input-heading"
              className="mt-2 text-2xl font-semibold tracking-tight"
            >
              Talk to your coding agent
            </h2>
          </div>
          <ArrowDown
            className="mb-1 hidden size-5 text-muted-foreground sm:block"
            aria-hidden="true"
          />
        </div>

        <div className="divide-y divide-border">
          {prompts.map((prompt, index) => (
            <figure key={prompt.step} className="py-7 sm:py-9">
              <figcaption className="flex items-center gap-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                <span className="font-mono tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="h-px w-5 bg-border" aria-hidden="true" />
                <span>{prompt.step}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] tracking-wider">
                  Prompt
                </span>
              </figcaption>
              <blockquote className="relative mt-5 max-w-3xl pl-8 text-xl leading-8 tracking-tight text-pretty sm:pl-10 sm:text-2xl sm:leading-9">
                <span
                  className="absolute top-0 left-0 font-serif text-4xl leading-none text-muted-foreground/60 sm:text-5xl"
                  aria-hidden="true"
                >
                  “
                </span>
                <strong className="font-semibold">{prompt.command}</strong>{" "}
                {prompt.request}
                <span className="text-muted-foreground/60" aria-hidden="true">
                  ”
                </span>
              </blockquote>
            </figure>
          ))}
        </div>
      </section>

      <section
        className="mt-6 border-t border-border pt-10 sm:mt-8 sm:pt-12"
        aria-labelledby="output-heading"
      >
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Output
        </p>
        <h2
          id="output-heading"
          className="mt-2 text-2xl font-semibold tracking-tight text-pretty"
        >
          A working example and an implementation guide
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          Choosing a variant gives the implementation agent both the interface
          it can inspect and a handoff document that explains what to build. The
          handoff preserves product decisions while calling out prototype-only
          shortcuts that should not reach production.
        </p>

        <div className="mt-7 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          <div className="bg-background p-5 sm:p-6">
            <MonitorPlay
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-semibold">Working reference</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The accepted interface, responsive behavior, and scenarios remain
              available for the implementation agent to inspect.
            </p>
          </div>
          <div className="bg-background p-5 sm:p-6">
            <FileText
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-semibold">Implementation handoff</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A focused document and prompt describe the intended behavior,
              important decisions, production requirements, and open questions.
            </p>
          </div>
        </div>
      </section>

      <ExperimentImport onImported={onImported} />
    </article>
  )
}
