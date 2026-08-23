import { Menu } from "@base-ui/react/menu"
import { Settings } from "lucide-react"

import type { ChoiceMenuActionGroup } from "./choice-menu"

export function ExperimentActionsMenu({
  actionGroups,
  compact = false,
}: {
  actionGroups: readonly ChoiceMenuActionGroup[]
  compact?: boolean
}) {
  if (actionGroups.length === 0) return null

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Experiment settings"
        title="Experiment settings"
        className={`grid size-11 shrink-0 touch-manipulation place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[popup-open]:bg-background/70 data-[popup-open]:text-foreground sm:size-10 ${compact ? "[@media(pointer:fine)]:size-8" : ""}`}
      >
        <Settings className="size-[1.125rem]" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="z-50 outline-none"
          sideOffset={8}
          align="end"
        >
          <Menu.Popup className="max-h-[min(32rem,75svh)] min-w-64 origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-sm transition-[transform,opacity] outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none">
            {actionGroups.map((group, groupIndex) => (
              <Menu.Group key={group.label}>
                {groupIndex > 0 ? (
                  <Menu.Separator className="mx-1 my-1 h-px bg-border" />
                ) : null}
                {group.label ? (
                  <Menu.GroupLabel className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </Menu.GroupLabel>
                ) : null}
                {group.actions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Menu.Item
                      key={action.value}
                      disabled={action.disabled}
                      className={`grid min-h-11 cursor-default touch-manipulation grid-cols-[1.75rem_minmax(0,1fr)] items-center rounded-lg px-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground ${action.destructive ? "text-destructive" : ""}`}
                      onClick={action.onSelect}
                    >
                      <span className="text-muted-foreground">
                        {Icon ? (
                          <Icon className="size-4" aria-hidden="true" />
                        ) : null}
                      </span>
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
                    </Menu.Item>
                  )
                })}
              </Menu.Group>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
