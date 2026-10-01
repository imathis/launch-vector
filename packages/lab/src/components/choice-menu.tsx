import { ChevronDown, Menu as MenuIcon, type LucideIcon } from "lucide-react"

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "#/components/ui"
import { indexShortcut } from "#/lib/index-shortcut"

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
  label?: string
  actions: readonly ChoiceMenuAction[]
}

type ChoiceMenuProps = {
  label: string
  value: string
  choices: readonly Choice[]
  onValueChange: (value: string) => void
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
  const showLeadingColumn =
    showIndexShortcuts || choices.some((choice) => choice.shortcut)

  return (
    <DropdownMenuContent
      align="start"
      sideOffset={8}
      className="max-h-[min(24rem,70svh)] w-auto min-w-52 overscroll-contain"
    >
      <DropdownMenuGroup>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          aria-label={label}
          value={value}
          onValueChange={onValueChange}
        >
          {choices.map((choice, index) => (
            <DropdownMenuRadioItem key={choice.value} value={choice.value}>
              {showLeadingColumn ? (
                <span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums">
                  {choice.shortcut ??
                    (showIndexShortcuts ? indexShortcut(index) : undefined)}
                </span>
              ) : null}
              <span className="truncate font-medium">{choice.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  )
}

export function ChoiceMenu({
  label,
  value,
  choices,
  onValueChange,
  ariaKeyShortcuts,
  showIndexShortcuts = false,
}: ChoiceMenuProps) {
  const selectedLabel =
    choices.find((choice) => choice.value === value)?.label ?? "Unavailable"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost-muted" size="toolbar" />}
        aria-keyshortcuts={ariaKeyShortcuts}
        className="group h-11 w-full min-w-0 justify-between text-left"
      >
        <span className="min-w-0">
          <span className="block text-[10px] leading-none font-medium text-muted-foreground">
            {label}
          </span>
          <span className="mt-1 block truncate text-sm font-medium">
            {selectedLabel}
          </span>
        </span>
        <ChevronDown
          className="text-muted-foreground transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <ChoiceMenuPopup
        label={label}
        value={value}
        choices={choices}
        onValueChange={onValueChange}
        showIndexShortcuts={showIndexShortcuts}
      />
    </DropdownMenu>
  )
}

export function InlineChoiceMenu({
  icon: Icon,
  label,
  value,
  choices,
  onValueChange,
  ariaKeyShortcuts,
  showIndexShortcuts = false,
}: ChoiceMenuProps & {
  icon: LucideIcon
  compact?: boolean
}) {
  const selectedLabel =
    choices.find((choice) => choice.value === value)?.label ?? "Unavailable"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost-muted" size="toolbar" />}
        aria-keyshortcuts={ariaKeyShortcuts}
        aria-label={`${label}: ${selectedLabel}`}
        className="group max-w-full"
      >
        <Icon aria-hidden="true" />
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className="transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <ChoiceMenuPopup
        label={label}
        value={value}
        choices={choices}
        onValueChange={onValueChange}
        showIndexShortcuts={showIndexShortcuts}
      />
    </DropdownMenu>
  )
}

export function IconExperimentChoiceMenu({
  value,
  choices,
  onValueChange,
  label = "Experiment",
}: Pick<ChoiceMenuProps, "value" | "choices" | "onValueChange"> & {
  label?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost-muted" size="icon-toolbar" />}
        aria-label={`Choose ${label.toLowerCase()}`}
        title={`Choose ${label.toLowerCase()}`}
      >
        <MenuIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <ChoiceMenuPopup
        label={label}
        value={value}
        choices={choices}
        onValueChange={onValueChange}
      />
    </DropdownMenu>
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="toolbar" />}
        aria-label={`Experiment: ${title}`}
        title="Switch experiment"
        className="group h-11 w-auto justify-start px-1 text-base font-semibold tracking-tight [@media(pointer:fine)]:h-8"
      >
        <span>{title}</span>
        <ChevronDown
          className="transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <ChoiceMenuPopup
        label="Experiment"
        value={value}
        choices={choices}
        onValueChange={onValueChange}
      />
    </DropdownMenu>
  )
}
