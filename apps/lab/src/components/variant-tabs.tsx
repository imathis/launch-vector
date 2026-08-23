import { type KeyboardEvent } from "react"

import { Button } from "@workspace/ui/components/button"

import type { Choice } from "./choice-menu"

type VariantTabsProps = {
  choices: readonly Choice[]
  value: string
  onValueChange: (value: string) => void
  compact?: boolean
}

export function VariantTabs({
  choices,
  value,
  onValueChange,
  compact = false,
}: VariantTabsProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = choices.findIndex(
      (choice) => choice.value === event.currentTarget.value
    )
    let nextIndex = currentIndex

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % choices.length
    }
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + choices.length) % choices.length
    }
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = choices.length - 1
    if (nextIndex === currentIndex) return

    event.preventDefault()
    const nextChoice = choices[nextIndex]
    if (!nextChoice) return
    onValueChange(nextChoice.value)
    const tabs =
      event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
        "[role='tab']"
      )
    tabs?.[nextIndex]?.focus()
  }

  return (
    <div
      className="flex min-w-0 items-center gap-1 overflow-x-auto"
      role="tablist"
      aria-label="Variant"
    >
      {choices.map((choice, index) => {
        const selected = value === choice.value
        return (
          <Button
            key={choice.value}
            type="button"
            role="tab"
            value={choice.value}
            variant="ghost"
            className={`relative h-11 shrink-0 rounded-lg px-2.5 text-xs transition-colors hover:bg-background/60 hover:text-foreground active:translate-y-0 dark:hover:bg-background/60 ${compact ? "[@media(pointer:fine)]:h-8 [@media(pointer:fine)]:px-2" : ""} ${selected ? "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-foreground" : "text-muted-foreground"}`}
            aria-selected={selected}
            aria-controls="experiment-canvas"
            aria-keyshortcuts={index === 9 ? "0" : String(index + 1)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(choice.value)}
            onKeyDown={handleKeyDown}
          >
            <span className="text-xs text-muted-foreground tabular-nums">
              {index === 9 ? 0 : index + 1}
            </span>
            {choice.label}
          </Button>
        )
      })}
    </div>
  )
}
