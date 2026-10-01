import { NotebookText } from "lucide-react"

import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/ui"

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
    <Popover>
      <PopoverTrigger render={<Button variant="ghost-muted" size="toolbar" />}>
        <NotebookText aria-hidden="true" />
        <span className="hidden sm:inline">Notes</span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="max-h-[min(32rem,75svh)] w-[min(24rem,calc(100vw-1rem))] overflow-y-auto overscroll-contain"
      >
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription className="leading-6">
            {description}
          </PopoverDescription>
        </PopoverHeader>

        {notice ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
            {notice}
          </p>
        ) : null}

        {notes ? (
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Experiment
            </p>
            <p className="mt-2 leading-6">{notes}</p>
          </div>
        ) : null}

        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Variant
            </p>
            <p className="mt-2 font-medium">{variantLabel ?? "Unavailable"}</p>
            {variantNotes ? (
              <p className="mt-1 leading-6 text-muted-foreground">
                {variantNotes}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Scenario
            </p>
            <p className="mt-2 font-medium">{scenarioLabel ?? "Unavailable"}</p>
            {scenarioDescription ? (
              <p className="mt-1 leading-6 text-muted-foreground">
                {scenarioDescription}
              </p>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
