import { Tabs, TabsList, TabsTrigger } from "#/components/ui"
import { indexShortcut } from "#/lib/index-shortcut"
import { variantTabId } from "#/lib/variant-tab"

import type { Choice } from "./choice-menu"

type VariantTabsProps = {
  choices: readonly Choice[]
  value: string
  onValueChange: (value: string) => void
}

export function VariantTabs({
  choices,
  value,
  onValueChange,
}: VariantTabsProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onValueChange(String(next))}>
      <TabsList
        variant="ghost"
        size="sm"
        activateOnFocus
        className="max-w-full overflow-x-auto p-px"
        aria-label="Variant"
      >
        {choices.map((choice, index) => {
          const shortcut = indexShortcut(index)
          return (
            <TabsTrigger
              key={choice.value}
              id={variantTabId(choice.value)}
              value={choice.value}
              aria-keyshortcuts={shortcut}
              className="shrink-0"
            >
              <span className="text-muted-foreground tabular-nums">
                {choice.shortcut || shortcut}
              </span>
              {choice.label}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
