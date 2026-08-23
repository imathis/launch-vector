import { Popover } from "@base-ui/react/popover"
import { NotebookText } from "lucide-react"

export function ExperimentNotes({
  title,
  description,
  notes,
  variantLabel,
  variantNotes,
  scenarioLabel,
  scenarioDescription,
  notice,
}: {
  title: string
  description: string
  notes?: string
  variantLabel?: string
  variantNotes?: string
  scenarioLabel?: string
  scenarioDescription?: string
  notice?: string
}) {
  return (
    <Popover.Root>
      <Popover.Trigger className="flex min-h-11 touch-manipulation items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[popup-open]:bg-background data-[popup-open]:text-foreground data-[popup-open]:shadow-sm">
        <NotebookText className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Notes</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="z-50 outline-none"
          sideOffset={8}
          align="end"
        >
          <Popover.Popup className="max-h-[min(32rem,75svh)] w-[min(24rem,calc(100vw-1rem))] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-sm transition-[transform,opacity] outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none">
            <Popover.Title className="font-semibold">{title}</Popover.Title>
            <Popover.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </Popover.Description>

            {notice ? (
              <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
                {notice}
              </p>
            ) : null}

            {notes ? (
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Experiment
                </p>
                <p className="mt-2 text-sm leading-6">{notes}</p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Variant
                </p>
                <p className="mt-2 text-sm font-medium">
                  {variantLabel ?? "Unavailable"}
                </p>
                {variantNotes ? (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {variantNotes}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Scenario
                </p>
                <p className="mt-2 text-sm font-medium">
                  {scenarioLabel ?? "Unavailable"}
                </p>
                {scenarioDescription ? (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {scenarioDescription}
                  </p>
                ) : null}
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
