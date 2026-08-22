import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"

import { SourceCode } from "./source-code"

type Tab = "preview" | "source"

const tabs: readonly Tab[] = ["preview", "source"]

type PreviewSourceProps = {
  label: string
  source: string
  children: ReactNode
}

export function PreviewSource({ label, source, children }: PreviewSourceProps) {
  const [tab, setTab] = useState<Tab>("preview")
  const [hasOpenedSource, setHasOpenedSource] = useState(false)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  )
  const id = useId()

  useEffect(() => {
    if (copyStatus === "idle") return
    const timeout = window.setTimeout(() => setCopyStatus("idle"), 2000)
    return () => window.clearTimeout(timeout)
  }, [copyStatus])

  const selectTab = (nextTab: Tab) => {
    setTab(nextTab)
    if (nextTab === "source") setHasOpenedSource(true)
  }

  const copySource = async () => {
    try {
      await navigator.clipboard.writeText(source)
      setCopyStatus("copied")
    } catch {
      setCopyStatus("error")
    }
  }

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
    selectTab(nextTab)
    const tabElements =
      event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
        "[role='tab']"
      )
    tabElements?.[nextIndex]?.focus()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-2">
        <div className="flex self-stretch" role="tablist" aria-label={label}>
          {tabs.map((value) => (
            <button
              key={value}
              id={`${id}-${value}-tab`}
              type="button"
              role="tab"
              aria-selected={tab === value}
              aria-controls={`${id}-${value}-panel`}
              tabIndex={tab === value ? 0 : -1}
              className={`relative min-h-11 px-3 text-sm font-medium capitalize transition-colors hover:text-foreground focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${tab === value ? "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-foreground" : "text-muted-foreground"}`}
              onClick={() => selectTab(value)}
              onKeyDown={handleKeyDown}
            >
              {value}
            </button>
          ))}
        </div>
        {tab === "source" ? (
          <button
            type="button"
            className="min-h-11 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={copySource}
          >
            {copyStatus === "copied" ? "Copied" : "Copy Code"}
          </button>
        ) : null}
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
      <div
        id={`${id}-source-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-source-tab`}
        hidden={tab !== "source"}
        className="min-h-64 overflow-x-auto bg-muted/50"
      >
        {hasOpenedSource ? <SourceCode source={source} /> : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {copyStatus === "copied"
          ? "Code copied to clipboard."
          : copyStatus === "error"
            ? "Could not copy code. Select and copy it manually."
            : ""}
      </p>
    </div>
  )
}
