import type { ComponentType } from "react"
import { GitBranch } from "lucide-react"

import type {
  CanvasLayout,
  ExperimentDefinition,
  ExperimentRenderProps,
} from "../experiment"
import { COMPARE_PANELS, type ComparePanelIndex } from "../lib/compare-panels"
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
  onCompareVariantChange: (panel: ComparePanelIndex, variant: string) => void
  renderView?: "focus" | "compare"
  frame?: boolean
}) {
  const minimumHeight = frame ? "min-h-svh" : "min-h-[calc(100svh-10rem)]"

  if (view === "compare") {
    return (
      <div className="overflow-x-auto p-4 sm:p-6 lg:p-8">
        <div className="grid min-w-[40rem] grid-cols-2 gap-4">
          {COMPARE_PANELS.map((panel) => {
            const candidate = compareVariants[panel.index]
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
                    label={panel.label}
                    value={candidate}
                    choices={variantChoices}
                    showIndexShortcuts
                    onValueChange={(nextVariant) =>
                      onCompareVariantChange(panel.index, nextVariant)
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
