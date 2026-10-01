import { CircleHelp } from "lucide-react"

import {
  Button,
  Kbd,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/ui"

const shortcuts = [
  ["1–0", "Select variant"],
  ["⌥ 1–0", "Select scenario"],
  [".", "Current / previous variant"],
  ["V", "Next variant"],
  ["S", "Next scenario"],
  ["C", "Focus / Compare"],
  ["D", "Toggle theme"],
  ["F", "Toggle presentation view"],
  ["[ ]", "Preview width (presentation)"],
  ["Esc", "Exit presentation mode"],
] as const

export function ShortcutHelp() {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost-muted" size="icon-toolbar" />}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
      >
        <CircleHelp aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(20rem,calc(100vw-1rem))]"
      >
        <PopoverHeader>
          <PopoverTitle>Keyboard Shortcuts</PopoverTitle>
          <PopoverDescription>
            Shortcuts pause while focus is inside an editable control.
          </PopoverDescription>
        </PopoverHeader>
        <dl className="grid gap-1">
          {shortcuts.map(([keys, action]) => (
            <div
              key={keys}
              className="flex min-h-9 items-center justify-between gap-4 border-b border-border/70 py-1 last:border-b-0"
            >
              <dt className="text-muted-foreground">{action}</dt>
              <dd>
                <Kbd className="whitespace-nowrap">{keys}</Kbd>
              </dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  )
}
