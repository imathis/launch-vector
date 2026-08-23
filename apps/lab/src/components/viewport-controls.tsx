import { Menu } from "@base-ui/react/menu"
import { Check, MonitorSmartphone } from "lucide-react"

import type { ViewportPreset } from "../lab-config"

export function ViewportControls({
  value,
  presets,
  onValueChange,
}: {
  value: string
  presets: readonly ViewportPreset[]
  onValueChange: (value: string) => void
}) {
  const selected = presets.find((preset) => preset.id === value) ?? presets[0]

  return (
    <div className="hidden md:block">
      <Menu.Root>
        <Menu.Trigger
          className="group flex h-11 min-w-16 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[popup-open]:bg-background/70 data-[popup-open]:text-foreground data-[popup-open]:shadow-sm [@media(pointer:fine)]:h-8"
          aria-label={`Preview width: ${selected?.label ?? "Unavailable"}`}
          title="Preview width"
        >
          <MonitorSmartphone className="size-3.5" aria-hidden="true" />
          <span>{selected?.label ?? "—"}</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            className="z-50 outline-none"
            sideOffset={8}
            align="end"
          >
            <Menu.Popup className="min-w-40 origin-[var(--transform-origin)] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-sm transition-[transform,opacity] outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none">
              <Menu.RadioGroup value={value} onValueChange={onValueChange}>
                <Menu.GroupLabel className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Preview width
                </Menu.GroupLabel>
                {presets.map((preset) => (
                  <Menu.RadioItem
                    key={preset.id}
                    value={preset.id}
                    className="grid min-h-11 cursor-default grid-cols-[minmax(0,1fr)_1.25rem] items-center rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [@media(pointer:fine)]:min-h-9"
                  >
                    <span>{preset.label}</span>
                    <Menu.RadioItemIndicator>
                      <Check className="size-4" aria-hidden="true" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}
