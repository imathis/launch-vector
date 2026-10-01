import { type ReactNode, type RefObject } from "react"
import { ChevronUp, Minimize2, X } from "lucide-react"

import { Button } from "#/components/ui"

import {
  type ChoiceMenuActionGroup,
  IconExperimentChoiceMenu,
  type Choice,
} from "./choice-menu"
import { DisplaySettings } from "./display-settings"
import { ExperimentActionsMenu } from "./experiment-actions-menu"
import { ExperimentChromeRow } from "./experiment-chrome-row"
import { ViewportControls } from "./viewport-controls"
import type { ViewportPreset } from "../lab-config"

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
  viewport,
  viewportPresets,
  managementActionGroups,
  missingCanvasProperties,
  collapseButtonRef,
  exitButtonRef,
  pullTabRef,
  notes,
  onExperimentChange,
  onVariantChange,
  onViewChange,
  onScenarioChange,
  onCanvasChange,
  onViewportChange,
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
  viewport: string
  viewportPresets: readonly ViewportPreset[]
  managementActionGroups: readonly ChoiceMenuActionGroup[]
  missingCanvasProperties: readonly string[]
  collapseButtonRef: RefObject<HTMLButtonElement | null>
  exitButtonRef: RefObject<HTMLButtonElement | null>
  pullTabRef: RefObject<HTMLButtonElement | null>
  notes?: ReactNode
  onExperimentChange: (experiment: string) => void
  onVariantChange: (variant: string) => void
  onViewChange: (view: "focus" | "compare") => void
  onScenarioChange: (scenario: string) => void
  onCanvasChange: (canvas: string) => void
  onViewportChange: (viewport: string) => void
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
        <ExperimentChromeRow
          className="rounded-2xl border border-border bg-muted p-1.5 shadow-md [@media(pointer:fine)]:p-1"
          view={view}
          variant={variant}
          variants={variants}
          scenario={scenario}
          scenarios={scenarios}
          onVariantChange={onVariantChange}
          onScenarioChange={onScenarioChange}
          leading={
            <>
              <div className="flex items-center self-stretch">
                <Button
                  render={<button ref={collapseButtonRef} type="button" />}
                  type="button"
                  size="icon-toolbar"
                  variant="ghost-muted"
                  aria-label="Hide presentation controls"
                  title="Hide presentation controls"
                  onClick={onCollapse}
                >
                  <X aria-hidden="true" />
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
            </>
          }
          afterScenario={notes}
          trailing={
            <>
              <ViewportControls
                value={viewport}
                presets={viewportPresets}
                onValueChange={onViewportChange}
              />
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
                render={<button ref={exitButtonRef} type="button" />}
                type="button"
                size="icon-toolbar"
                variant="ghost-muted"
                aria-label="Exit presentation mode"
                aria-keyshortcuts="Escape F"
                title="Exit presentation mode (Esc or F)"
                onClick={onExit}
              >
                <Minimize2 aria-hidden="true" />
              </Button>
            </>
          }
        />
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
