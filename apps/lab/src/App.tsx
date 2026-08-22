import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEventHandler,
  type RefObject,
} from "react"
import {
  Columns2,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  Square,
  Sun,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { useTheme, type Theme } from "@workspace/ui/theme/theme-provider"

import { isExperimentDefinition, type ExperimentDefinition } from "./experiment"

type ExperimentModule = { default?: unknown }
type ViewMode = "focus" | "compare"
type Selection = {
  experiment: string
  variant: string
  scenario: string
  view: ViewMode
}

type IconOption<Value extends string> = {
  value: Value
  label: string
  shortcut?: string
  icon: LucideIcon
}

const viewOptions: readonly IconOption<ViewMode>[] = [
  { value: "compare", label: "Compare", icon: Columns2 },
  { value: "focus", label: "Focus", icon: Square },
]

const themeOptions: readonly IconOption<Theme>[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

const NUMBER_KEY_CODE = /^(?:Digit|Numpad)([0-9])$/

const modules = import.meta.glob<ExperimentModule>([
  "./experiments/*/index.tsx",
  "!./experiments/_template/index.tsx",
  "./fixtures/*/index.tsx",
])

const experiments = Object.entries(modules)
  .map(([path, load]) => ({
    id: path.split("/").at(-2) ?? path,
    load,
  }))
  .sort((a, b) => a.id.localeCompare(b.id))

const defaultExperiment =
  experiments.find((experiment) => experiment.id === "welcome")?.id ??
  experiments[0]?.id ??
  ""

function readSelection(): Selection {
  const params = new URLSearchParams(window.location.search)
  const requestedExperiment = params.get("experiment")
  return {
    experiment: experiments.some((item) => item.id === requestedExperiment)
      ? (requestedExperiment ?? defaultExperiment)
      : defaultExperiment,
    variant: params.get("variant") ?? "",
    scenario: params.get("scenario") ?? "",
    view: params.get("view") === "compare" ? "compare" : "focus",
  }
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest("input, textarea, select, [contenteditable='true']") !==
        null)
  )
}

function nextKey(record: Record<string, unknown>, current: string) {
  const keys = Object.keys(record)
  const index = keys.indexOf(current)
  return keys[(index + 1) % keys.length] ?? current
}

function numberKeyIndex(code: string) {
  const match = NUMBER_KEY_CODE.exec(code)
  if (!match?.[1]) return null
  const number = Number(match[1])
  return number === 0 ? 9 : number - 1
}

function IconToggle<Value extends string>({
  option,
  selected,
  onClick,
}: {
  option: IconOption<Value>
  selected: boolean
  onClick: MouseEventHandler<HTMLButtonElement>
}) {
  const Icon = option.icon
  const title = option.shortcut
    ? `${option.label} (${option.shortcut})`
    : option.label

  return (
    <Button
      type="button"
      size="icon"
      variant={selected ? "secondary" : "ghost"}
      className={`size-11 rounded-lg ${selected ? "bg-background shadow-sm hover:bg-background" : "text-muted-foreground"}`}
      aria-label={option.label}
      aria-pressed={selected}
      title={title}
      onClick={onClick}
    >
      <Icon className="size-5" aria-hidden="true" />
    </Button>
  )
}

function DisplayControls({
  selection,
  onSelectionChange,
  expandButtonRef,
  onExpand,
}: {
  selection: Selection
  onSelectionChange: (patch: Partial<Selection>) => void
  expandButtonRef: RefObject<HTMLButtonElement | null>
  onExpand: () => void
}) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className="flex shrink-0 items-center justify-center gap-2"
      role="toolbar"
      aria-label="Lab display controls"
    >
      <div
        className="flex rounded-xl border border-border bg-muted/80 p-1 shadow-sm"
        role="group"
        aria-label="Experiment view"
      >
        {viewOptions.map((option) => (
          <IconToggle
            key={option.value}
            option={option}
            selected={selection.view === option.value}
            onClick={() => onSelectionChange({ view: option.value })}
          />
        ))}
      </div>

      <div
        className="flex rounded-xl border border-border bg-muted/80 p-1 shadow-sm"
        role="group"
        aria-label="Color theme"
      >
        {themeOptions.map((option) => (
          <IconToggle
            key={option.value}
            option={option}
            selected={theme === option.value}
            onClick={() => setTheme(option.value)}
          />
        ))}
      </div>

      <Button
        ref={expandButtonRef}
        type="button"
        size="icon"
        variant="outline"
        className="size-11 rounded-xl bg-background shadow-sm"
        aria-label="Enter presentation mode"
        title="Enter presentation mode (H)"
        onClick={onExpand}
      >
        <Maximize2 className="size-5" aria-hidden="true" />
      </Button>
    </div>
  )
}

export function App() {
  const [selection, setSelection] = useState(readSelection)
  const [loaded, setLoaded] = useState<{
    id: string
    experiment: ExperimentDefinition | null
    error: string
  }>({ id: "", experiment: null, error: "" })
  const [immersive, setImmersive] = useState(false)
  const expandButtonRef = useRef<HTMLButtonElement>(null)
  const contractButtonRef = useRef<HTMLButtonElement>(null)
  const previousImmersive = useRef(immersive)
  const isCurrentExperiment = loaded.id === selection.experiment
  const experiment = isCurrentExperiment ? loaded.experiment : null
  const loadError = isCurrentExperiment ? loaded.error : ""
  const loading = !isCurrentExperiment

  const updateSelection = (patch: Partial<Selection>) => {
    startTransition(() => {
      setSelection((current) => ({ ...current, ...patch }))
    })
  }

  useEffect(() => {
    const handlePopState = () => setSelection(readSelection())
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    params.set("experiment", selection.experiment)
    if (selection.variant) params.set("variant", selection.variant)
    if (selection.scenario) params.set("scenario", selection.scenario)
    params.set("view", selection.view)
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params}`
    )
  }, [selection])

  useEffect(() => {
    let active = true
    const entry = experiments.find((item) => item.id === selection.experiment)

    if (!entry) {
      queueMicrotask(() => {
        if (active) {
          setLoaded({
            id: selection.experiment,
            experiment: null,
            error: "Experiment not found.",
          })
        }
      })
      return undefined
    }

    entry
      .load()
      .then((module) => {
        if (!active) return
        if (!isExperimentDefinition(module.default)) {
          throw new Error("The module does not export a valid experiment.")
        }
        setLoaded({
          id: selection.experiment,
          experiment: module.default,
          error: "",
        })
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoaded({
          id: selection.experiment,
          experiment: null,
          error:
            error instanceof Error
              ? error.message
              : "Experiment failed to load.",
        })
      })

    return () => {
      active = false
    }
  }, [selection.experiment])

  useEffect(() => {
    if (!experiment) return
    const variantKeys = Object.keys(experiment.variants)
    const scenarioKeys = Object.keys(experiment.scenarios)
    const variant = experiment.variants[selection.variant]
      ? selection.variant
      : (variantKeys[0] ?? "")
    const scenario = experiment.scenarios[selection.scenario]
      ? selection.scenario
      : (scenarioKeys[0] ?? "")

    if (variant !== selection.variant || scenario !== selection.scenario) {
      updateSelection({ variant, scenario })
    }
  }, [experiment, selection.scenario, selection.variant])

  useEffect(() => {
    if (previousImmersive.current === immersive) return
    previousImmersive.current = immersive
    if (immersive) contractButtonRef.current?.focus()
    else expandButtonRef.current?.focus()
  }, [immersive])

  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.repeat ||
      event.metaKey ||
      event.ctrlKey ||
      isEditableTarget(event.target)
    ) {
      return
    }

    if (event.key === "Escape" && immersive) {
      setImmersive(false)
      return
    }

    const optionIndex = event.shiftKey ? null : numberKeyIndex(event.code)
    if (optionIndex !== null && experiment) {
      if (event.altKey) {
        const scenario = Object.keys(experiment.scenarios)[optionIndex]
        if (scenario) {
          event.preventDefault()
          updateSelection({ scenario })
        }
      } else {
        const variant = Object.keys(experiment.variants)[optionIndex]
        if (variant) {
          event.preventDefault()
          updateSelection({ variant, view: "focus" })
        }
      }
      return
    }

    if (event.altKey) return

    const key = event.key.toLowerCase()
    if (key === "h") setImmersive((current) => !current)
    if (key === "c") {
      updateSelection({
        view: selection.view === "focus" ? "compare" : "focus",
      })
    }
    if (key === "v" && experiment) {
      updateSelection({
        variant: nextKey(experiment.variants, selection.variant),
        view: "focus",
      })
    }
    if (key === "s" && experiment) {
      updateSelection({
        scenario: nextKey(experiment.scenarios, selection.scenario),
      })
    }
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleShortcut(event)
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const ExperimentView = experiment?.render

  return (
    <main
      className={
        immersive
          ? "fixed inset-0 z-40 min-h-svh overflow-x-hidden overflow-y-auto bg-background"
          : "min-h-svh overflow-x-hidden bg-background"
      }
    >
      {!immersive ? (
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
          <div className="mx-auto grid max-w-7xl gap-2 px-2 py-2 sm:px-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-4 lg:px-6">
            <p className="hidden font-semibold tracking-tight whitespace-nowrap lg:block">
              Vector Lab
            </p>

            <div className="grid min-w-0 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.15fr)] gap-2">
              <label className="relative min-w-0">
                <span className="pointer-events-none absolute top-1 left-3 z-10 text-[10px] leading-none font-medium text-muted-foreground">
                  Experiment
                </span>
                <select
                  name="experiment"
                  autoComplete="off"
                  aria-label="Experiment"
                  className="h-12 w-full min-w-0 rounded-lg border border-input bg-background px-3 pt-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  value={selection.experiment}
                  onChange={(event) =>
                    updateSelection({
                      experiment: event.target.value,
                      variant: "",
                      scenario: "",
                    })
                  }
                >
                  {experiments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="relative min-w-0">
                <span className="pointer-events-none absolute top-1 left-3 z-10 text-[10px] leading-none font-medium text-muted-foreground">
                  Variant · 1–0
                </span>
                <select
                  name="variant"
                  autoComplete="off"
                  aria-label="Variant"
                  aria-keyshortcuts="1 2 3 4 5 6 7 8 9 0 V"
                  title="Variant (V to cycle, 1–0 to select)"
                  className="h-12 w-full min-w-0 rounded-lg border border-input bg-background px-3 pt-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                  value={selection.variant}
                  disabled={!experiment || selection.view === "compare"}
                  onChange={(event) =>
                    updateSelection({ variant: event.target.value })
                  }
                >
                  {experiment
                    ? Object.entries(experiment.variants).map(
                        ([key, value]) => (
                          <option key={key} value={key}>
                            {value.label}
                          </option>
                        )
                      )
                    : null}
                </select>
              </label>

              <label className="relative min-w-0">
                <span className="pointer-events-none absolute top-1 left-3 z-10 text-[10px] leading-none font-medium text-muted-foreground">
                  Scenario · ⌥1–0
                </span>
                <select
                  name="scenario"
                  autoComplete="off"
                  aria-label="Scenario"
                  aria-keyshortcuts="Alt+1 Alt+2 Alt+3 Alt+4 Alt+5 Alt+6 Alt+7 Alt+8 Alt+9 Alt+0 S"
                  title="Scenario (S to cycle, Alt+1–0 to select)"
                  className="h-12 w-full min-w-0 rounded-lg border border-input bg-background px-3 pt-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                  value={selection.scenario}
                  disabled={!experiment}
                  onChange={(event) =>
                    updateSelection({ scenario: event.target.value })
                  }
                >
                  {experiment
                    ? Object.entries(experiment.scenarios).map(
                        ([key, value]) => (
                          <option key={key} value={key}>
                            {value.label}
                          </option>
                        )
                      )
                    : null}
                </select>
              </label>
            </div>

            <DisplayControls
              selection={selection}
              onSelectionChange={updateSelection}
              expandButtonRef={expandButtonRef}
              onExpand={() => setImmersive(true)}
            />
          </div>
        </header>
      ) : null}

      <section
        className={
          immersive
            ? "min-h-svh min-w-0"
            : "mx-auto max-w-7xl min-w-0 px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
        }
        aria-label="Experiment canvas"
      >
        {loading ? (
          <p
            className={`grid place-items-center text-muted-foreground ${immersive ? "min-h-svh" : "min-h-[50svh]"}`}
            role="status"
          >
            Loading experiment…
          </p>
        ) : loadError ? (
          <div
            className={`grid place-items-center ${immersive ? "min-h-svh p-4" : "min-h-[50svh]"}`}
          >
            <div
              className="w-full max-w-lg rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-destructive"
              role="alert"
            >
              <h1 className="font-semibold">Experiment Unavailable</h1>
              <p className="mt-2 text-sm">{loadError}</p>
            </div>
          </div>
        ) : experiment && ExperimentView ? (
          <>
            {!immersive ? (
              <div className="mb-10 max-w-2xl">
                <p className="text-sm font-medium text-muted-foreground">
                  Experiment
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-pretty">
                  {experiment.metadata.title}
                </h1>
                <p className="mt-3 leading-7 text-pretty text-muted-foreground">
                  {experiment.metadata.description}
                </p>
              </div>
            ) : null}

            {selection.view === "compare" ? (
              <div
                className={`grid lg:grid-cols-2 ${immersive ? "min-h-svh gap-px bg-border" : "gap-6"}`}
              >
                {Object.entries(experiment.variants).map(
                  ([variant, details]) => (
                    <div
                      key={variant}
                      className={`relative flex min-w-0 items-center justify-center [&>*]:min-w-0 ${immersive ? "min-h-[50svh] bg-background p-4 lg:min-h-svh" : "min-h-[50svh] rounded-xl border border-border p-4"}`}
                    >
                      <p className="absolute top-4 left-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                        {details.label}
                      </p>
                      <ExperimentView
                        variant={variant}
                        scenario={selection.scenario}
                      />
                    </div>
                  )
                )}
              </div>
            ) : (
              <div
                className={`flex min-w-0 items-center justify-center [&>*]:min-w-0 ${immersive ? "min-h-svh" : "min-h-[50svh]"}`}
              >
                <ExperimentView
                  variant={selection.variant}
                  scenario={selection.scenario}
                />
              </div>
            )}
          </>
        ) : null}
      </section>

      {immersive ? (
        <Button
          ref={contractButtonRef}
          type="button"
          size="icon"
          variant="outline"
          className="fixed right-[max(.75rem,env(safe-area-inset-right))] bottom-[max(.75rem,env(safe-area-inset-bottom))] z-50 size-11 rounded-xl bg-background shadow-md"
          aria-label="Exit presentation mode"
          title="Exit presentation mode (Esc or H)"
          onClick={() => setImmersive(false)}
        >
          <Minimize2 className="size-5" aria-hidden="true" />
        </Button>
      ) : null}
    </main>
  )
}
