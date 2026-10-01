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

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from "#/components/ui"
import { useTheme, type Theme } from "#/theme/theme-provider"

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
      <ToggleGroup
        className="w-full"
        value={[value]}
        onValueChange={(next) => {
          const [selected] = next
          if (selected) onValueChange(selected as Value)
        }}
      >
        {options.map((option) => {
          const Icon = option.icon
          return (
            <ToggleGroupItem key={option.value} value={option.value}>
              <Icon aria-hidden="true" />
              <span className="truncate">{option.label}</span>
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
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
  const selectedTheme: Theme =
    theme === "light" || theme === "dark" ? theme : "system"
  const showCanvas =
    canvas !== undefined &&
    onCanvasChange !== undefined &&
    (canvasChoices.length > 1 || missingCanvasProperties.length > 0)

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost-muted" size="icon-toolbar" />}
        aria-label="Display settings"
        title="Display settings"
      >
        <SlidersHorizontal aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(21rem,calc(100vw-1rem))]"
      >
        <PopoverTitle>Display</PopoverTitle>
        <div className="grid gap-4">
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
            value={selectedTheme}
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
              <ToggleGroup
                className="w-full"
                orientation="vertical"
                value={[canvas]}
                onValueChange={(next) => {
                  const [selected] = next
                  if (selected) onCanvasChange(selected)
                }}
              >
                {canvasChoices.map((choice) => (
                  <ToggleGroupItem
                    key={choice.value}
                    value={choice.value}
                    className="justify-between px-3"
                  >
                    <span className="truncate">{choice.label}</span>
                    {choice.value === canvas ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : null}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </fieldset>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
