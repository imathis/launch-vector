import { Popover } from "@base-ui/react/popover"
import {
  Check,
  Columns2,
  Monitor,
  Moon,
  PaintBucket,
  SlidersHorizontal,
  Square,
  Sun,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { useTheme, type Theme } from "@workspace/ui/theme/theme-provider"

import type { Choice } from "./choice-menu"

type DisplayOption<Value extends string> = {
  value: Value
  label: string
  icon: LucideIcon
}

const viewOptions: readonly DisplayOption<"focus" | "compare">[] = [
  { value: "focus", label: "Single", icon: Square },
  { value: "compare", label: "Compare", icon: Columns2 },
]

const themeOptions: readonly DisplayOption<Theme>[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

function OptionGrid<Value extends string>({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string
  value: Value
  options: readonly DisplayOption<Value>[]
  onValueChange: (value: Value) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-muted-foreground">
        {label}
      </legend>
      <div
        className={`grid gap-1 rounded-xl bg-muted p-1 ${options.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
      >
        {options.map((option) => {
          const Icon = option.icon
          const selected = option.value === value
          return (
            <Button
              key={option.value}
              type="button"
              variant="ghost"
              className={`h-10 min-w-0 px-2 ${selected ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground"}`}
              aria-pressed={selected}
              onClick={() => onValueChange(option.value)}
            >
              <Icon aria-hidden="true" />
              <span className="truncate">{option.label}</span>
            </Button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function DisplaySettings({
  view,
  canvas,
  canvasChoices = [],
  missingCanvasProperties = [],
  onViewChange,
  onCanvasChange,
}: {
  view?: "focus" | "compare"
  canvas?: string
  canvasChoices?: readonly Choice[]
  missingCanvasProperties?: readonly string[]
  onViewChange?: (view: "focus" | "compare") => void
  onCanvasChange?: (canvas: string) => void
}) {
  const { theme, setTheme } = useTheme()
  const showCanvas =
    canvas !== undefined &&
    onCanvasChange !== undefined &&
    (canvasChoices.length > 1 || missingCanvasProperties.length > 0)

  return (
    <Popover.Root>
      <Popover.Trigger
        className="grid size-11 shrink-0 touch-manipulation place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[popup-open]:bg-background data-[popup-open]:text-foreground data-[popup-open]:shadow-sm sm:size-10"
        aria-label="Display settings"
        title="Display settings"
      >
        <SlidersHorizontal className="size-[1.125rem]" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="z-50 outline-none"
          sideOffset={8}
          align="end"
        >
          <Popover.Popup className="w-[min(21rem,calc(100vw-1rem))] origin-[var(--transform-origin)] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-sm transition-[transform,opacity] outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none">
            <Popover.Title className="font-semibold">Display</Popover.Title>
            <div className="mt-4 grid gap-4">
              {view && onViewChange ? (
                <OptionGrid
                  label="View"
                  value={view}
                  options={viewOptions}
                  onValueChange={onViewChange}
                />
              ) : null}

              <OptionGrid
                label="Theme"
                value={theme}
                options={themeOptions}
                onValueChange={setTheme}
              />

              {showCanvas ? (
                <fieldset>
                  <legend className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <PaintBucket className="size-3.5" aria-hidden="true" />
                    Product canvas
                  </legend>
                  {missingCanvasProperties.length > 0 ? (
                    <div className="mb-2 rounded-lg bg-muted p-3 text-sm">
                      <p className="font-medium text-foreground">
                        Product canvas isn’t connected
                      </p>
                      <p className="mt-1 leading-5 text-muted-foreground">
                        Map {missingCanvasProperties.join(" and ")} in{" "}
                        <code className="font-mono text-xs text-foreground">
                          src/lab-theme.css
                        </code>
                        . The fallback remains active until then.
                      </p>
                    </div>
                  ) : null}
                  <div className="grid gap-1">
                    {canvasChoices.map((choice) => {
                      const selected = choice.value === canvas
                      return (
                        <Button
                          key={choice.value}
                          type="button"
                          variant="ghost"
                          className={`h-10 justify-between px-3 ${selected ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                          aria-pressed={selected}
                          onClick={() => onCanvasChange(choice.value)}
                        >
                          <span className="truncate">{choice.label}</span>
                          {selected ? (
                            <Check className="size-4" aria-hidden="true" />
                          ) : null}
                        </Button>
                      )
                    })}
                  </div>
                </fieldset>
              ) : null}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
