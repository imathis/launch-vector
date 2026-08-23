import { type RefObject } from "react"
import { Maximize2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import type { Choice } from "./choice-menu"
import { DisplaySettings } from "./display-settings"
import { ShortcutHelp } from "./shortcut-help"

export type ViewMode = "focus" | "compare"

export function GuideDisplayControls({
  canvas,
  canvasChoices,
  missingCanvasProperties,
  onCanvasChange,
}: {
  canvas?: string
  canvasChoices?: readonly Choice[]
  missingCanvasProperties?: readonly string[]
  onCanvasChange?: (canvas: string) => void
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      role="toolbar"
      aria-label="Lab display controls"
    >
      <DisplaySettings
        canvas={canvas}
        canvasChoices={canvasChoices}
        missingCanvasProperties={missingCanvasProperties}
        onCanvasChange={onCanvasChange}
      />
      <ShortcutHelp />
    </div>
  )
}

export function ExperimentDisplayControls({
  view,
  canvas,
  canvasChoices,
  missingCanvasProperties,
  onViewChange,
  onCanvasChange,
  expandButtonRef,
  onExpand,
}: {
  view: ViewMode
  canvas: string
  canvasChoices: readonly Choice[]
  missingCanvasProperties: readonly string[]
  onViewChange: (view: ViewMode) => void
  onCanvasChange: (canvas: string) => void
  expandButtonRef: RefObject<HTMLButtonElement | null>
  onExpand: () => void
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      role="toolbar"
      aria-label="Experiment display controls"
    >
      <DisplaySettings
        view={view}
        canvas={canvas}
        canvasChoices={canvasChoices}
        missingCanvasProperties={missingCanvasProperties}
        onViewChange={onViewChange}
        onCanvasChange={onCanvasChange}
      />
      <ShortcutHelp />
      <Button
        ref={expandButtonRef}
        type="button"
        size="icon"
        variant="ghost"
        className="size-11 rounded-xl text-muted-foreground sm:size-10"
        aria-label="Enter presentation mode"
        title="Enter presentation mode (F)"
        onClick={onExpand}
      >
        <Maximize2 className="size-[1.125rem]" aria-hidden="true" />
      </Button>
    </div>
  )
}
