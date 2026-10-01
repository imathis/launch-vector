import { MonitorSmartphone } from "lucide-react"

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
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost-muted" size="toolbar" />}
          className="min-w-16"
          aria-label={`Preview width: ${selected?.label ?? "Unavailable"}`}
          aria-keyshortcuts="[ ]"
          title="Preview width ([ and ])"
        >
          <MonitorSmartphone aria-hidden="true" />
          <span>{selected?.label ?? "—"}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-auto min-w-40"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>Preview width</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
              {presets.map((preset) => (
                <DropdownMenuRadioItem key={preset.id} value={preset.id}>
                  {preset.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
