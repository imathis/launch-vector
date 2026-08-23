import { Menu } from "@base-ui/react/menu"
import { Check, ChevronDown, type LucideIcon } from "lucide-react"

export type Choice = {
  value: string
  label: string
  shortcut?: string
}

type ChoiceMenuProps = {
  label: string
  value: string
  choices: readonly Choice[]
  onValueChange: (value: string) => void
  disabled?: boolean
  ariaKeyShortcuts?: string
  showIndexShortcuts?: boolean
}

function ChoiceMenuPopup({
  label,
  value,
  choices,
  onValueChange,
  showIndexShortcuts = false,
}: Pick<
  ChoiceMenuProps,
  "label" | "value" | "choices" | "onValueChange" | "showIndexShortcuts"
>) {
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
            {choices.map((choice, index) => (
              <Menu.RadioItem
                key={choice.value}
                value={choice.value}
                className="grid min-h-11 cursor-default touch-manipulation grid-cols-[1.75rem_minmax(0,1fr)_1.25rem] items-center rounded-lg px-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              >
                <span className="text-xs text-muted-foreground tabular-nums">
                  {choice.shortcut ??
                    (showIndexShortcuts ? (index === 9 ? "0" : index + 1) : "")}
                </span>
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
}: ChoiceMenuProps) {
  const selectedChoice = choices.find((choice) => choice.value === value)

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={disabled}
        aria-keyshortcuts={ariaKeyShortcuts}
        className="group flex h-11 w-full min-w-0 touch-manipulation items-center justify-between gap-2 rounded-xl px-3 text-left transition-colors hover:bg-background/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[popup-open]:bg-background/70"
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
}: Omit<ChoiceMenuProps, "disabled" | "showIndexShortcuts"> & {
  icon: LucideIcon
}) {
  const selectedChoice = choices.find((choice) => choice.value === value)

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-keyshortcuts={ariaKeyShortcuts}
        aria-label={`${label}: ${selectedChoice?.label ?? "Unavailable"}`}
        className="group flex h-11 max-w-full touch-manipulation items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-background/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[popup-open]:bg-background/60"
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
      />
    </Menu.Root>
  )
}

export function ExperimentChoiceMenu({
  value,
  choices,
  triggerLabel,
  onValueChange,
}: Pick<ChoiceMenuProps, "value" | "choices" | "onValueChange"> & {
  triggerLabel?: string
}) {
  const selectedChoice = choices.find((choice) => choice.value === value)
  const selectedLabel = triggerLabel || selectedChoice?.label || "Experiment"

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Experiment: ${selectedLabel}`}
        className="group flex h-11 max-w-full min-w-0 touch-manipulation items-center gap-2 rounded-xl px-3 text-base font-semibold tracking-tight transition-colors hover:bg-background/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[popup-open]:bg-background/60"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[popup-open]:rotate-180 motion-reduce:transition-none"
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
