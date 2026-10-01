import { Settings } from "lucide-react"

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui"

import type { ChoiceMenuActionGroup } from "./choice-menu"

export function ExperimentActionsMenu({
  actionGroups,
}: {
  actionGroups: readonly ChoiceMenuActionGroup[]
}) {
  if (actionGroups.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost-muted" size="icon-toolbar" />}
        aria-label="Experiment settings"
        title="Experiment settings"
      >
        <Settings aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="max-h-[min(32rem,75svh)] w-auto min-w-64 overscroll-contain"
      >
        {actionGroups.map((group, groupIndex) => (
          <DropdownMenuGroup key={group.label ?? groupIndex}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            {group.label ? (
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
            ) : null}
            {group.actions.map((action) => {
              const Icon = action.icon
              return (
                <DropdownMenuItem
                  key={action.value}
                  disabled={action.disabled}
                  variant={action.destructive ? "destructive" : "default"}
                  onClick={action.onSelect}
                >
                  {Icon ? <Icon aria-hidden="true" /> : null}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {action.label}
                    </span>
                    {action.description ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    ) : null}
                  </span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
