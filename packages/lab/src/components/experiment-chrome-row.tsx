import { type ReactNode } from "react"
import { GitBranch, Layers } from "lucide-react"

import { SCENARIO_KEY_SHORTCUTS, VARIANT_KEY_SHORTCUTS } from "#/lib/shortcuts"
import { cn } from "#/lib/utils"

import { InlineChoiceMenu, type Choice } from "./choice-menu"
import { VariantSwitcher } from "./variant-switcher"

export function ExperimentChromeRow({
  className,
  leading,
  trailing,
  afterScenario,
  view,
  variant,
  variants,
  scenario,
  scenarios,
  onVariantChange,
  onScenarioChange,
}: {
  className?: string
  leading?: ReactNode
  trailing?: ReactNode
  afterScenario?: ReactNode
  view: "focus" | "compare"
  variant: string
  variants: readonly Choice[]
  scenario: string
  scenarios: readonly Choice[]
  onVariantChange: (value: string) => void
  onScenarioChange: (value: string) => void
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 sm:flex",
        className
      )}
    >
      {leading}
      <div className="hidden min-w-0 sm:block sm:flex-1">
        {view === "focus" ? (
          <VariantSwitcher
            choices={variants}
            value={variant}
            onValueChange={onVariantChange}
          />
        ) : null}
      </div>
      <div className="hidden min-w-0 shrink-0 sm:block">
        <InlineChoiceMenu
          icon={Layers}
          label="Scenario"
          value={scenario}
          choices={scenarios}
          compact
          ariaKeyShortcuts={SCENARIO_KEY_SHORTCUTS}
          onValueChange={onScenarioChange}
        />
      </div>
      {afterScenario}
      {trailing}
      <div
        className={cn(
          "col-span-full grid min-w-0 gap-1 sm:hidden",
          view === "focus" ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {view === "focus" ? (
          <InlineChoiceMenu
            icon={GitBranch}
            label="Variant"
            value={variant}
            choices={variants}
            showIndexShortcuts
            ariaKeyShortcuts={VARIANT_KEY_SHORTCUTS}
            onValueChange={onVariantChange}
          />
        ) : null}
        <InlineChoiceMenu
          icon={Layers}
          label="Scenario"
          value={scenario}
          choices={scenarios}
          ariaKeyShortcuts={SCENARIO_KEY_SHORTCUTS}
          onValueChange={onScenarioChange}
        />
      </div>
    </div>
  )
}
