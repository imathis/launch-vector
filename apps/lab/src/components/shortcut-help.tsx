import { Popover } from "@base-ui/react/popover"
import { CircleHelp } from "lucide-react"

const shortcuts = [
  ["1–0", "Select variant"],
  ["⌥ 1–0", "Select scenario"],
  [".", "Current / previous variant"],
  ["V", "Next variant"],
  ["S", "Next scenario"],
  ["C", "Focus / Compare"],
  ["D", "Toggle theme"],
  ["F", "Toggle presentation view"],
  ["Esc", "Exit presentation mode"],
] as const

export function ShortcutHelp() {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="grid size-11 touch-manipulation place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[popup-open]:bg-background data-[popup-open]:text-foreground data-[popup-open]:shadow-sm sm:size-10"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
      >
        <CircleHelp className="size-[1.125rem]" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="z-50 outline-none"
          sideOffset={8}
          align="end"
        >
          <Popover.Popup className="w-[min(20rem,calc(100vw-1rem))] origin-[var(--transform-origin)] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-sm transition-[transform,opacity] outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none">
            <Popover.Title className="font-semibold">
              Keyboard Shortcuts
            </Popover.Title>
            <Popover.Description className="mt-1 text-sm text-muted-foreground">
              Shortcuts pause while focus is inside an editable control.
            </Popover.Description>
            <dl className="mt-4 grid gap-1">
              {shortcuts.map(([keys, action]) => (
                <div
                  key={keys}
                  className="flex min-h-9 items-center justify-between gap-4 border-b border-border/70 py-1 last:border-b-0"
                >
                  <dt className="text-sm text-muted-foreground">{action}</dt>
                  <dd>
                    <kbd className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs font-medium whitespace-nowrap">
                      {keys}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
