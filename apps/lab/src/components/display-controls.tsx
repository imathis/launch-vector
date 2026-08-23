import { type MouseEventHandler, type RefObject } from "react"
import {
  Columns2,
  Maximize2,
  Monitor,
  Moon,
  Square,
  Sun,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { useTheme, type Theme } from "@workspace/ui/theme/theme-provider"

import { ShortcutHelp } from "./shortcut-help"

export type ViewMode = "focus" | "compare"

type IconOption<Value extends string> = {
  value: Value
  label: string
  icon: LucideIcon
}

const viewOptions: readonly IconOption<ViewMode>[] = [
  { value: "compare", label: "Compare", icon: Columns2 },
  { value: "focus", label: "Focus", icon: Square },
]

const themeOptions: readonly IconOption<Theme>[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

function IconToggle<Value extends string>({
  option,
  selected,
  onClick,
}: {
  option: IconOption<Value>
  selected: boolean
  onClick: MouseEventHandler<HTMLButtonElement>
}) {
  const Icon = option.icon

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={`size-11 rounded-xl ${selected ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground"}`}
      aria-label={option.label}
      aria-pressed={selected}
      title={option.label}
      onClick={onClick}
    >
      <Icon className="size-5" aria-hidden="true" />
    </Button>
  )
}

function ThemeControls() {
  const { theme, setTheme } = useTheme()
  const currentIndex = themeOptions.findIndex(
    (option) => option.value === theme
  )
  const currentOption = themeOptions[currentIndex] ?? themeOptions[2]
  const CurrentIcon = currentOption.icon
  const nextTheme = themeOptions[(currentIndex + 1) % themeOptions.length].value

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-11 rounded-xl bg-background text-foreground shadow-sm hover:bg-background sm:hidden"
        aria-label={`Color theme: ${currentOption.label}. Change theme`}
        title={`Color theme: ${currentOption.label}`}
        onClick={() => setTheme(nextTheme)}
      >
        <CurrentIcon className="size-5" aria-hidden="true" />
      </Button>
      <div className="hidden sm:flex" role="group" aria-label="Color theme">
        {themeOptions.map((option) => (
          <IconToggle
            key={option.value}
            option={option}
            selected={theme === option.value}
            onClick={() => setTheme(option.value)}
          />
        ))}
      </div>
    </>
  )
}

export function GuideDisplayControls() {
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      role="toolbar"
      aria-label="Lab display controls"
    >
      <ThemeControls />
      <span className="mx-1 h-7 w-px bg-border" aria-hidden="true" />
      <ShortcutHelp />
    </div>
  )
}

export function ExperimentDisplayControls({
  view,
  onViewChange,
  expandButtonRef,
  onExpand,
}: {
  view: ViewMode
  onViewChange: (view: ViewMode) => void
  expandButtonRef: RefObject<HTMLButtonElement | null>
  onExpand: () => void
}) {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-center"
      role="toolbar"
      aria-label="Experiment display controls"
    >
      <div className="flex" role="group" aria-label="Experiment view">
        {viewOptions.map((option) => (
          <IconToggle
            key={option.value}
            option={option}
            selected={view === option.value}
            onClick={() => onViewChange(option.value)}
          />
        ))}
      </div>
      <span className="mx-1 h-7 w-px bg-border" aria-hidden="true" />
      <ThemeControls />
      <span className="mx-1 h-7 w-px bg-border" aria-hidden="true" />
      <div className="flex">
        <ShortcutHelp />
        <Button
          ref={expandButtonRef}
          type="button"
          size="icon"
          variant="ghost"
          className="size-11 rounded-xl text-muted-foreground"
          aria-label="Enter presentation mode"
          title="Enter presentation mode (F)"
          onClick={onExpand}
        >
          <Maximize2 className="size-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
