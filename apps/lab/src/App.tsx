import { startTransition, useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { ThemeToggle } from "@workspace/ui/theme/theme-toggle"

import { isExperimentDefinition, type ExperimentDefinition } from "./experiment"

type ExperimentModule = { default?: unknown }
type ViewMode = "focus" | "compare"
type Selection = {
  experiment: string
  variant: string
  scenario: string
  view: ViewMode
}

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

export function App() {
  const [selection, setSelection] = useState(readSelection)
  const [loaded, setLoaded] = useState<{
    id: string
    experiment: ExperimentDefinition | null
    error: string
  }>({ id: "", experiment: null, error: "" })
  const [dockVisible, setDockVisible] = useState(true)
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        return
      }

      const key = event.key.toLowerCase()
      if (key === "h") setDockVisible((visible) => !visible)
      if (key === "c") {
        updateSelection({
          view: selection.view === "focus" ? "compare" : "focus",
        })
      }
      if (key === "v" && experiment) {
        updateSelection({
          variant: nextKey(experiment.variants, selection.variant),
        })
      }
      if (key === "s" && experiment) {
        updateSelection({
          scenario: nextKey(experiment.scenarios, selection.scenario),
        })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [experiment, selection.scenario, selection.variant, selection.view])

  const ExperimentView = experiment?.render

  return (
    <main
      className={`min-h-svh px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 ${dockVisible ? "pb-96 sm:pb-72" : "pb-8"}`}
    >
      <header className="mx-auto flex max-w-7xl items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-tight">Vector lab</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Disposable prototypes, isolated by convention.
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
          {selection.view}
        </span>
      </header>

      <section className="mx-auto mt-8 max-w-7xl">
        {loading ? (
          <p className="py-20 text-center text-muted-foreground" role="status">
            Loading experiment...
          </p>
        ) : loadError ? (
          <div
            className="mx-auto max-w-lg rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-destructive"
            role="alert"
          >
            <h1 className="font-semibold">Experiment unavailable</h1>
            <p className="mt-2 text-sm">{loadError}</p>
          </div>
        ) : experiment && ExperimentView ? (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {experiment.metadata.title}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {experiment.metadata.description}
              </p>
            </div>
            {selection.view === "compare" ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {Object.entries(experiment.variants).map(
                  ([variant, details]) => (
                    <div key={variant} className="space-y-3">
                      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
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
              <div className="flex min-h-[50svh] items-center justify-center">
                <ExperimentView
                  variant={selection.variant}
                  scenario={selection.scenario}
                />
              </div>
            )}
          </>
        ) : null}
      </section>

      {dockVisible ? (
        <aside
          className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-20 mx-auto max-h-[70svh] max-w-4xl overflow-auto rounded-2xl border border-border bg-background p-3 shadow-lg sm:p-4"
          aria-label="Lab controls"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-medium text-muted-foreground">
              Experiment
              <select
                className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
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
            <label className="text-xs font-medium text-muted-foreground">
              Variant
              <select
                className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                value={selection.variant}
                disabled={!experiment || selection.view === "compare"}
                onChange={(event) =>
                  updateSelection({ variant: event.target.value })
                }
              >
                {experiment
                  ? Object.entries(experiment.variants).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))
                  : null}
              </select>
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Scenario
              <select
                className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                value={selection.scenario}
                disabled={!experiment}
                onChange={(event) =>
                  updateSelection({ scenario: event.target.value })
                }
              >
                {experiment
                  ? Object.entries(experiment.scenarios).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))
                  : null}
              </select>
            </label>
            <div className="text-xs font-medium text-muted-foreground">
              View
              <div className="mt-1 flex rounded-xl bg-muted p-1">
                {(["focus", "compare"] as const).map((view) => (
                  <Button
                    key={view}
                    type="button"
                    size="sm"
                    variant={selection.view === view ? "secondary" : "ghost"}
                    className="h-11 flex-1 capitalize"
                    aria-pressed={selection.view === view}
                    onClick={() => updateSelection({ view })}
                  >
                    {view}
                  </Button>
                ))}
              </div>
            </div>
            <ThemeToggle className="self-end" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Keys: D theme, C view, V variant, S scenario, H controls
            </p>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => setDockVisible(false)}
            >
              Hide
            </Button>
          </div>
        </aside>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="fixed right-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-20 min-h-11 bg-background shadow-md"
          onClick={() => setDockVisible(true)}
        >
          Show controls
        </Button>
      )}
    </main>
  )
}
