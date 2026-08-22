import { useId, useState, type KeyboardEvent, type ReactNode } from "react"

type Tab = "preview" | "source"

const tabs: readonly Tab[] = ["preview", "source"]

type PreviewSourceProps = {
  label: string
  source: string
  children: ReactNode
}

export function PreviewSource({ label, source, children }: PreviewSourceProps) {
  const [tab, setTab] = useState<Tab>("preview")
  const id = useId()

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = tabs.indexOf(tab)
    let nextIndex = currentIndex

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length
    if (event.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = tabs.length - 1
    if (nextIndex === currentIndex) return

    event.preventDefault()
    const nextTab = tabs[nextIndex]
    if (!nextTab) return
    setTab(nextTab)
    const tabElements =
      event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
        "[role='tab']"
      )
    tabElements?.[nextIndex]?.focus()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div
        className="flex border-b border-border p-1"
        role="tablist"
        aria-label={label}
      >
        {tabs.map((value) => (
          <button
            key={value}
            id={`${id}-${value}-tab`}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls={`${id}-${value}-panel`}
            tabIndex={tab === value ? 0 : -1}
            className={`min-h-11 rounded-lg px-4 text-sm font-medium capitalize ${tab === value ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab(value)}
            onKeyDown={handleKeyDown}
          >
            {value}
          </button>
        ))}
      </div>
      <div
        id={`${id}-preview-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-preview-tab`}
        hidden={tab !== "preview"}
        className={`min-h-64 flex-wrap content-center items-center gap-3 p-6 sm:p-10 ${tab === "preview" ? "flex" : ""}`}
      >
        {children}
      </div>
      <pre
        id={`${id}-source-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-source-tab`}
        hidden={tab !== "source"}
        className="min-h-64 overflow-x-auto bg-muted p-6 text-sm leading-7"
      >
        <code className="font-mono">{source}</code>
      </pre>
    </div>
  )
}
