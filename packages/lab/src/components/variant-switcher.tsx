import { useLayoutEffect, useRef, useState } from "react"
import { GitBranch } from "lucide-react"

import { VARIANT_KEY_SHORTCUTS } from "#/lib/shortcuts"

import { InlineChoiceMenu, type Choice } from "./choice-menu"
import { VariantTabs } from "./variant-tabs"

export function VariantSwitcher({
  choices,
  value,
  onValueChange,
}: {
  choices: readonly Choice[]
  value: string
  onValueChange: (value: string) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return

    const measure = () => {
      const tabs = host.querySelector<HTMLElement>("[data-measure-tabs]")
      if (!tabs) return
      setOverflows(tabs.scrollWidth > host.clientWidth + 1)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    return () => observer.disconnect()
  }, [choices])

  return (
    <div ref={hostRef} className="relative max-w-full min-w-0">
      <div
        className="pointer-events-none invisible absolute inset-x-0 top-0 overflow-hidden"
        aria-hidden="true"
      >
        <div data-measure-tabs className="flex w-max gap-1 p-px">
          {choices.map((choice, index) => (
            <span
              key={choice.value}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 px-2.5 text-xs font-medium"
            >
              {choice.shortcut || String(index + 1)}
              {choice.label}
            </span>
          ))}
        </div>
      </div>
      {overflows ? (
        <InlineChoiceMenu
          icon={GitBranch}
          label="Variant"
          value={value}
          choices={choices}
          compact
          showIndexShortcuts
          ariaKeyShortcuts={VARIANT_KEY_SHORTCUTS}
          onValueChange={onValueChange}
        />
      ) : (
        <VariantTabs
          choices={choices}
          value={value}
          onValueChange={onValueChange}
        />
      )}
    </div>
  )
}
