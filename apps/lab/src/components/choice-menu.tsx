import { type ReactNode } from "react"
import { Menu } from "@base-ui/react/menu"
import {
  Check,
  ChevronDown,
  Menu as MenuIcon,
  type LucideIcon,
} from "lucide-react"

export type Choice = {
  value: string
  label: string
  shortcut?: string
}

export type ChoiceMenuAction = {
  value: string
  label: string
  description?: string
  icon?: LucideIcon
  destructive?: boolean
  disabled?: boolean
  onSelect: () => void
}

export type ChoiceMenuActionGroup = {
  label: string
  actions: readonly ChoiceMenuAction[]
}

type ChoiceMenuProps = {
  label: string
  value: string
  choices: readonly Choice[]
  onValueChange: (value: string) => void
  disabled?: boolean
  ariaKeyShortcuts?: string
  showIndexShortcuts?: boolean
  notice?: ReactNode
}

function ChoiceMenuPopup({
  label,
  value,
  choices,
  onValueChange,
  showIndexShortcuts = false,
  notice,
}: Pick<
  ChoiceMenuProps,
  | "label"
  | "value"
  | "choices"
  | "onValueChange"
  | "showIndexShortcuts"
  | "notice"
>) {
  const showLeadingColumn =
    showIndexShortcuts || choices.some((choice) => choice.shortcut)

  return (
    <Menu.Portal>
      <Menu.Positioner
        className="z-50 outline-none"
        sideOffset={8}
        align="start"
      >
        <Menu.Popup className="max-h-[min(24rem,70svh)] min-w-52 origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-sm transition-[transform,opacity] outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none">
          <Menu.RadioGroup value={value} onValueChange={onValueChange}>
            <Menu.GroupLabel className="px-3 py-2 text-xs font-medium text-muted-foreground">
              {label}
            </Menu.GroupLabel>
            {notice}
            {choices.map((choice, index) => (
              <Menu.RadioItem
                key={choice.value}
                value={choice.value}
                className={`grid min-h-11 cursor-default touch-manipulation items-center rounded-lg text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground ${showLeadingColumn ? "grid-cols-[1.75rem_minmax(0,1fr)_1.25rem] px-2" : "grid-cols-[minmax(0,1fr)_1.25rem] px-3"}`}
              >
                {showLeadingColumn ? (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {choice.shortcut ??
                      (showIndexShortcuts
                        ? index === 9
                          ? "0"
                          : index + 1
                        : "")}
                  </span>
                ) : null}
                <span className="truncate font-medium">{choice.label}</span>
                <Menu.RadioItemIndicator className="text-foreground">
                  <Check className="size-4" aria-hidden="true" />
                </Menu.RadioItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )
}

export function ChoiceMenu({
  label,
  value,
  choices,
  onValueChange,
  disabled = false,
  ariaKeyShortcuts,
  showIndexShortcuts = false,
  notice,
}: ChoiceMenuProps) {
  const selectedChoice = choices.find((choice) => choice.value === value)

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={disabled}
        aria-keyshortcuts={ariaKeyShortcuts}
        className="group flex h-11 w-full min-w-0 touch-manipulation items-center justify-between gap-2 rounded-lg px-3 text-left transition-colors hover:bg-background/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[popup-open]:bg-background/70 data-[popup-open]:text-foreground"
      >
        <span className="min-w-0">
          <span className="block text-[10px] leading-none font-medium text-muted-foreground">
            {label}
          </span>
          <span className="mt-1 block truncate text-sm font-medium">
            {selectedChoice?.label ?? "Unavailable"}
          </span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[popup-open]:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Menu.Trigger>

      <ChoiceMenuPopup
        label={label}
        value={value}
        choices={choices}
        onValueChange={onValueChange}
        showIndexShortcuts={showIndexShortcuts}
        notice={notice}
      />
    </Menu.Root>
  )
}

export function InlineChoiceMenu({
  icon: Icon,
  label,
  value,
  choices,
  onValueChange,
  ariaKeyShortcuts,
  notice,
  compact = false,
}: Omit<ChoiceMenuProps, "disabled" | "showIndexShortcuts"> & {
  icon: LucideIcon
  compact?: boolean
}) {
  const selectedChoice = choices.find((choice) => choice.value === value)

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-keyshortcuts={ariaKeyShortcuts}
        aria-label={`${label}: ${selectedChoice?.label ?? "Unavailable"}`}
        className={`group flex h-11 max-w-full touch-manipulation items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-background/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[popup-open]:bg-background/70 data-[popup-open]:text-foreground ${compact ? "[@media(pointer:fine)]:h-8" : ""}`}
      >
        <Icon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="truncate">
          {selectedChoice?.label ?? "Unavailable"}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[popup-open]:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Menu.Trigger>
      <ChoiceMenuPopup
        label={label}
        value={value}
        choices={choices}
        onValueChange={onValueChange}
        notice={notice}
      />
    </Menu.Root>
  )
}

export function IconExperimentChoiceMenu({
  value,
  choices,
  onValueChange,
  label = "Experiment",
  compact = false,
}: Pick<ChoiceMenuProps, "value" | "choices" | "onValueChange"> & {
  label?: string
  compact?: boolean
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Choose ${label.toLowerCase()}`}
        title={`Choose ${label.toLowerCase()}`}
        className={`grid size-11 shrink-0 touch-manipulation place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[popup-open]:bg-background/70 data-[popup-open]:text-foreground sm:size-10 ${compact ? "[@media(pointer:fine)]:size-8" : ""}`}
      >
        <MenuIcon className="size-[1.125rem]" aria-hidden="true" />
      </Menu.Trigger>
      <ChoiceMenuPopup
        label={label}
        value={value}
        choices={choices}
        onValueChange={onValueChange}
      />
    </Menu.Root>
  )
}

export function ExperimentTitleMenu({
  value,
  choices,
  title,
  onValueChange,
}: Pick<ChoiceMenuProps, "value" | "choices" | "onValueChange"> & {
  title: string
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Experiment: ${title}`}
        title="Switch experiment"
        className="group -mx-1 flex h-11 max-w-full min-w-0 touch-manipulation items-center gap-2 rounded-lg px-1 text-base font-semibold tracking-tight transition-colors hover:bg-background/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[popup-open]:bg-background/70 sm:h-10"
      >
        <span className="truncate">{title}</span>
        <ChevronDown
          className="size-4 transition-transform group-data-[popup-open]:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Menu.Trigger>
      <ChoiceMenuPopup
        label="Experiment"
        value={value}
        choices={choices}
        onValueChange={onValueChange}
      />
    </Menu.Root>
  )
}
