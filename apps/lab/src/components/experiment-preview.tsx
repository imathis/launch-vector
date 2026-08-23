import type { ComponentType } from "react"
import { GitBranch } from "lucide-react"

import type {
  CanvasLayout,
  ExperimentDefinition,
  ExperimentRenderProps,
} from "../experiment"
import { InlineChoiceMenu, type Choice } from "./choice-menu"

function layoutFor(
  experiment: ExperimentDefinition,
  variant: string
): CanvasLayout {
  return (
    experiment.variants[variant]?.layout ??
    experiment.canvas?.layout ??
    "centered"
  )
}

function contentClass(layout: CanvasLayout) {
  if (layout === "full") return ""
  if (layout === "padded") return "p-4 sm:p-6 lg:p-8"
  return "flex items-center justify-center p-4 sm:p-6 lg:p-8"
}

export function ExperimentPreview({
  ExperimentView,
  experiment,
  variant,
  scenario,
  view,
  resetKey,
  compareVariants,
  variantChoices,
  onCompareVariantChange,
  renderView,
  frame = false,
}: {
  ExperimentView: ComponentType<ExperimentRenderProps>
  experiment: ExperimentDefinition
  variant: string
  scenario: string
  view: "focus" | "compare"
  resetKey: number
  compareVariants: readonly [string, string]
  variantChoices: readonly Choice[]
  onCompareVariantChange: (panel: 0 | 1, variant: string) => void
  renderView?: "focus" | "compare"
  frame?: boolean
}) {
  const minimumHeight = frame ? "min-h-svh" : "min-h-[calc(100svh-10rem)]"

  if (view === "compare") {
    const panels = [
      { side: "left" as const, variant: compareVariants[0] },
      { side: "right" as const, variant: compareVariants[1] },
    ]
    return (
      <div className="overflow-x-auto p-4 sm:p-6 lg:p-8">
        <div className="grid min-w-[40rem] grid-cols-2 gap-4">
          {panels.map((panel) => {
            const candidate = panel.variant
            const details = experiment.variants[candidate]
            if (!details) return null
            const layout = layoutFor(experiment, candidate)
            return (
              <section
                key={`${panel.side}-${candidate}-${resetKey}`}
                className="min-h-[50svh] min-w-0 overflow-hidden rounded-xl border border-border bg-[var(--lab-canvas-background)] text-[var(--lab-canvas-foreground)]"
                aria-label={details.label}
              >
                <header className="flex min-h-11 items-center border-b border-border bg-muted px-2">
                  <InlineChoiceMenu
                    icon={GitBranch}
                    label={
                      panel.side === "left" ? "Left variant" : "Right variant"
                    }
                    value={candidate}
                    choices={variantChoices}
                    onValueChange={(nextVariant) =>
                      onCompareVariantChange(
                        panel.side === "left" ? 0 : 1,
                        nextVariant
                      )
                    }
                  />
                </header>
                <div
                  className={`min-h-[50svh] min-w-0 ${contentClass(layout)}`}
                >
                  <ExperimentView
                    variant={candidate}
                    scenario={scenario}
                    view="compare"
                  />
                </div>
              </section>
            )
          })}
        </div>
      </div>
    )
  }

  const layout = layoutFor(experiment, variant)
  return (
    <div
      key={`${variant}-${resetKey}`}
      className={`min-w-0 bg-[var(--lab-canvas-background)] text-[var(--lab-canvas-foreground)] [&>*]:min-w-0 ${minimumHeight} ${contentClass(layout)}`}
    >
      <ExperimentView
        variant={variant}
        scenario={scenario}
        view={renderView ?? "focus"}
      />
    </div>
  )
}
