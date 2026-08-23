import { type RefObject } from "react"
import { ChevronUp, GitBranch, Layers, Minimize2, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import {
  type ChoiceMenuActionGroup,
  IconExperimentChoiceMenu,
  InlineChoiceMenu,
  type Choice,
} from "./choice-menu"
import { DisplaySettings } from "./display-settings"
import { ExperimentActionsMenu } from "./experiment-actions-menu"
import { VariantTabs } from "./variant-tabs"

export type PresentationDockState = "open" | "collapsed"

export function PresentationDock({
  state,
  experiment,
  experiments,
  variant,
  variants,
  view,
  scenario,
  scenarios,
  canvas,
  canvasChoices,
  managementActionGroups,
  missingCanvasProperties,
  collapseButtonRef,
  exitButtonRef,
  pullTabRef,
  onExperimentChange,
  onVariantChange,
  onViewChange,
  onScenarioChange,
  onCanvasChange,
  onCollapse,
  onExpand,
  onExit,
}: {
  state: PresentationDockState
  experiment: string
  experiments: readonly Choice[]
  variant: string
  variants: readonly Choice[]
  view: "focus" | "compare"
  scenario: string
  scenarios: readonly Choice[]
  canvas: string
  canvasChoices: readonly Choice[]
  managementActionGroups: readonly ChoiceMenuActionGroup[]
  missingCanvasProperties: readonly string[]
  collapseButtonRef: RefObject<HTMLButtonElement | null>
  exitButtonRef: RefObject<HTMLButtonElement | null>
  pullTabRef: RefObject<HTMLButtonElement | null>
  onExperimentChange: (experiment: string) => void
  onVariantChange: (variant: string) => void
  onViewChange: (view: "focus" | "compare") => void
  onScenarioChange: (scenario: string) => void
  onCanvasChange: (canvas: string) => void
  onCollapse: () => void
  onExpand: () => void
  onExit: () => void
}) {
  const collapsed = state === "collapsed"

  return (
    <>
      <footer
        className={`fixed right-[max(.5rem,env(safe-area-inset-right))] bottom-[max(.5rem,env(safe-area-inset-bottom))] left-[max(.5rem,env(safe-area-inset-left))] z-50 transition-transform duration-200 ease-out motion-reduce:transition-none ${collapsed ? "pointer-events-none translate-y-[calc(100%+1rem+env(safe-area-inset-bottom))]" : "translate-y-0"}`}
        aria-label="Presentation controls"
        aria-hidden={collapsed}
        inert={collapsed ? true : undefined}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-1 rounded-2xl border border-border bg-muted p-1.5 shadow-md sm:flex">
          <div className="flex items-center self-stretch">
            <Button
              ref={collapseButtonRef}
              type="button"
              size="icon"
              variant="ghost"
              className="size-11 shrink-0 rounded-xl text-muted-foreground sm:size-10"
              aria-label="Hide presentation controls"
              title="Hide presentation controls"
              onClick={onCollapse}
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
            <span
              className="ml-1 w-px self-stretch bg-border"
              aria-hidden="true"
            />
          </div>

          <IconExperimentChoiceMenu
            value={experiment}
            choices={experiments}
            onValueChange={onExperimentChange}
          />

          <div className="hidden min-w-0 flex-1 sm:block">
            <VariantTabs
              choices={variants}
              value={variant}
              onValueChange={onVariantChange}
            />
          </div>

          <div className="hidden shrink-0 sm:block">
            <InlineChoiceMenu
              icon={Layers}
              label="Scenario"
              value={scenario}
              choices={scenarios}
              ariaKeyShortcuts="Alt+1 Alt+2 Alt+3 Alt+4 Alt+5 Alt+6 Alt+7 Alt+8 Alt+9 Alt+0 S"
              onValueChange={onScenarioChange}
            />
          </div>

          <DisplaySettings
            view={view}
            canvas={canvas}
            canvasChoices={canvasChoices}
            missingCanvasProperties={missingCanvasProperties}
            onViewChange={onViewChange}
            onCanvasChange={onCanvasChange}
          />

          <ExperimentActionsMenu actionGroups={managementActionGroups} />

          <Button
            ref={exitButtonRef}
            type="button"
            size="icon"
            variant="ghost"
            className="size-11 shrink-0 rounded-xl text-muted-foreground sm:size-10"
            aria-label="Exit presentation mode"
            aria-keyshortcuts="Escape F"
            title="Exit presentation mode (Esc or F)"
            onClick={onExit}
          >
            <Minimize2 className="size-5" aria-hidden="true" />
          </Button>

          <div className="col-span-full grid min-w-0 grid-cols-2 gap-1 border-t border-border pt-1 sm:hidden">
            <InlineChoiceMenu
              icon={GitBranch}
              label="Variant"
              value={variant}
              choices={variants}
              ariaKeyShortcuts="1 2 3 4 5 6 7 8 9 0 V"
              onValueChange={onVariantChange}
            />
            <InlineChoiceMenu
              icon={Layers}
              label="Scenario"
              value={scenario}
              choices={scenarios}
              ariaKeyShortcuts="Alt+1 Alt+2 Alt+3 Alt+4 Alt+5 Alt+6 Alt+7 Alt+8 Alt+9 Alt+0 S"
              onValueChange={onScenarioChange}
            />
          </div>
        </div>
      </footer>

      <div
        className={`fixed bottom-[env(safe-area-inset-bottom)] left-1/2 z-50 -translate-x-1/2 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${collapsed ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}
        aria-hidden={!collapsed}
      >
        <button
          ref={pullTabRef}
          type="button"
          className="relative flex h-11 w-20 touch-manipulation items-end justify-center rounded-t-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label="Show presentation controls"
          disabled={!collapsed}
          onClick={onExpand}
        >
          <span className="flex h-3 w-14 items-center justify-center rounded-t-lg border border-b-0 border-border bg-muted shadow-sm">
            <ChevronUp
              className="size-3 text-muted-foreground"
              aria-hidden="true"
            />
          </span>
        </button>
      </div>
    </>
  )
}
