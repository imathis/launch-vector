import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react"
import { Layers } from "lucide-react"

import {
  ChoiceMenu,
  ExperimentChoiceMenu,
  InlineChoiceMenu,
  type Choice,
} from "./components/choice-menu"
import {
  ExperimentDisplayControls,
  GuideDisplayControls,
  type ViewMode,
} from "./components/display-controls"
import { ExperimentNotes } from "./components/experiment-notes"
import { LabGuide } from "./components/lab-guide"
import {
  PresentationDock,
  type PresentationDockState,
} from "./components/presentation-dock"
import { VariantTabs } from "./components/variant-tabs"
import { isExperimentDefinition, type ExperimentDefinition } from "./experiment"

type ExperimentModule = { default?: unknown }
type ExperimentKind = "experiment" | "fixture"
type ExperimentEntry = {
  id: string
  kind: ExperimentKind
  load: () => Promise<ExperimentModule>
}
type Selection = {
  experiment: string
  variant: string
  scenario: string
  view: ViewMode
}

const NUMBER_KEY_CODE = /^(?:Digit|Numpad)([0-9])$/
const GUIDE_VALUE = "__guide"

const experimentModules = import.meta.glob<ExperimentModule>([
  "./experiments/*/index.tsx",
  "!./experiments/_template/index.tsx",
])
const fixtureModules = import.meta.glob<ExperimentModule>(
  "./fixtures/*/index.tsx"
)

function entriesFor(
  modules: Record<string, () => Promise<ExperimentModule>>,
  kind: ExperimentKind
) {
  return Object.entries(modules).map<ExperimentEntry>(([path, load]) => ({
    id: path.split("/").at(-2) ?? path,
    kind,
    load,
  }))
}

const experiments = [
  ...entriesFor(experimentModules, "experiment"),
  ...entriesFor(fixtureModules, "fixture"),
].sort((a, b) => a.id.localeCompare(b.id))
const authoredExperiments = experiments.filter(
  (experiment) => experiment.kind === "experiment"
)
const fixtureExperiments = experiments.filter(
  (experiment) => experiment.kind === "fixture"
)

function formatExperimentName(id: string) {
  return id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase())
}

function choicesFor(entries: readonly ExperimentEntry[]): readonly Choice[] {
  return entries.map((experiment) => ({
    value: experiment.id,
    label: formatExperimentName(experiment.id),
  }))
}

const experimentChoices = choicesFor(experiments)
const authoredExperimentChoices = choicesFor(authoredExperiments)
const fixtureExperimentChoices = choicesFor(fixtureExperiments)
const labPageChoices: readonly Choice[] = [
  { value: GUIDE_VALUE, label: "Lab Guide" },
  ...experimentChoices,
]

function readSelection(): Selection {
  const params = new URLSearchParams(window.location.search)
  const requestedExperiment = params.get("experiment")
  return {
    experiment:
      params.get("page") !== "help" &&
      experiments.some((item) => item.id === requestedExperiment)
        ? (requestedExperiment ?? "")
        : "",
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

function sidebarItemClass(selected: boolean) {
  return `flex min-h-11 w-full items-center border-l-2 px-3 text-left text-sm font-medium transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "border-foreground bg-muted/60 text-foreground" : "border-transparent text-muted-foreground"}`
}

export function App() {
  const [selection, setSelection] = useState(readSelection)
  const [loaded, setLoaded] = useState<{
    id: string
    experiment: ExperimentDefinition | null
    error: string
  }>({ id: "", experiment: null, error: "" })
  const [immersive, setImmersive] = useState(false)
  const [presentationDock, setPresentationDock] =
    useState<PresentationDockState>("open")
  const expandButtonRef = useRef<HTMLButtonElement>(null)
  const collapseDockButtonRef = useRef<HTMLButtonElement>(null)
  const exitPresentationButtonRef = useRef<HTMLButtonElement>(null)
  const pullTabRef = useRef<HTMLButtonElement>(null)
  const previousImmersive = useRef(immersive)
  const previousVariant = useRef("")
  const showGuide = selection.experiment === ""
  const isCurrentExperiment = loaded.id === selection.experiment
  const experiment = isCurrentExperiment ? loaded.experiment : null
  const selectedEntry = experiments.find(
    (entry) => entry.id === selection.experiment
  )
  const experimentKind = selectedEntry?.kind
  const loadError = isCurrentExperiment ? loaded.error : ""
  const loading = !showGuide && !isCurrentExperiment

  const updateSelection = (patch: Partial<Selection>) => {
    startTransition(() => {
      setSelection((current) => {
        if (
          patch.experiment === undefined &&
          patch.variant !== undefined &&
          patch.variant !== current.variant &&
          current.variant
        ) {
          previousVariant.current = current.variant
        }
        return { ...current, ...patch }
      })
    })
  }

  const enterPresentation = () => {
    setPresentationDock("open")
    setImmersive(true)
  }

  const exitPresentation = () => setImmersive(false)

  const collapsePresentationDock = () => {
    setPresentationDock("collapsed")
    requestAnimationFrame(() => pullTabRef.current?.focus())
  }

  const expandPresentationDock = () => {
    setPresentationDock("open")
    requestAnimationFrame(() => collapseDockButtonRef.current?.focus())
  }

  useEffect(() => {
    const handlePopState = () => setSelection(readSelection())
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (showGuide) {
      params.set("page", "help")
    } else {
      params.set("experiment", selection.experiment)
      if (selection.variant) params.set("variant", selection.variant)
      if (selection.scenario) params.set("scenario", selection.scenario)
      params.set("view", selection.view)
    }
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params}`
    )
  }, [selection, showGuide])

  useEffect(() => {
    let active = true

    if (showGuide) {
      queueMicrotask(() => {
        if (active) {
          setLoaded((current) =>
            current.id === ""
              ? current
              : { id: "", experiment: null, error: "" }
          )
        }
      })
      return () => {
        active = false
      }
    }

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
  }, [selection.experiment, showGuide])

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
    if (showGuide) {
      document.title = "Lab Guide | Vector"
      return
    }

    const variantTitle = experiment?.variants[selection.variant]?.label
    const experimentTitle =
      experiment?.metadata.title || formatExperimentName(selection.experiment)
    document.title = [variantTitle, experimentTitle, "Vector"]
      .filter(Boolean)
      .join(" | ")
  }, [experiment, selection.experiment, selection.variant, showGuide])

  useEffect(() => {
    if (previousImmersive.current === immersive) return
    previousImmersive.current = immersive
    if (immersive) exitPresentationButtonRef.current?.focus()
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
      exitPresentation()
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

    if (
      event.code === "Period" &&
      !event.altKey &&
      !event.shiftKey &&
      experiment &&
      experiment.variants[previousVariant.current]
    ) {
      event.preventDefault()
      updateSelection({ variant: previousVariant.current, view: "focus" })
      return
    }

    if (event.altKey) return

    const key = event.key.toLowerCase()
    if (key === "f" && experiment) {
      event.preventDefault()
      if (immersive) exitPresentation()
      else enterPresentation()
    }
    if (key === "c" && experiment) {
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
  const variantChoices: readonly Choice[] = experiment
    ? Object.entries(experiment.variants).map(([value, details]) => ({
        value,
        label: details.label,
      }))
    : []
  const scenarioChoices: readonly Choice[] = experiment
    ? Object.entries(experiment.scenarios).map(([value, details], index) => ({
        value,
        label: details.label,
        shortcut: `⌥${index === 9 ? 0 : index + 1}`,
      }))
    : []
  const selectedVariant = experiment?.variants[selection.variant]
  const selectedScenario = experiment?.scenarios[selection.scenario]
  const demoExperiment = fixtureExperiments[0]

  const selectExperiment = (experimentId: string) => {
    previousVariant.current = ""
    updateSelection({
      experiment: experimentId,
      variant: "",
      scenario: "",
    })
  }

  const selectLabPage = (value: string) => {
    if (value === GUIDE_VALUE) {
      setImmersive(false)
      previousVariant.current = ""
      updateSelection({ experiment: "", variant: "", scenario: "" })
      return
    }
    selectExperiment(value)
  }

  const selectVariant = (variant: string) => {
    updateSelection({ variant, view: "focus" })
  }

  return (
    <main
      className={
        immersive
          ? "fixed inset-0 z-40 min-h-svh overflow-x-hidden overflow-y-auto bg-background"
          : "min-h-svh overflow-x-hidden bg-background"
      }
    >
      {!immersive ? (
        <>
          <a
            className="fixed top-2 left-2 z-50 -translate-y-20 rounded-md bg-background px-4 py-3 font-medium shadow-md focus-visible:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href="#experiment-canvas"
          >
            Skip to experiment
          </a>
          <header className="sticky top-0 z-30 pt-[max(.5rem,env(safe-area-inset-top))] pr-[max(.5rem,env(safe-area-inset-right))] pl-[max(.5rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1rem,env(safe-area-inset-left))]">
            <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-border bg-muted/90 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-muted/80">
              <div className="flex flex-wrap items-center gap-1 p-2">
                <div className="min-w-20 flex-1 lg:px-3">
                  <div className="hidden items-center lg:flex">
                    <a
                      href="?page=help"
                      className="inline-flex h-11 items-center rounded-xl font-semibold tracking-tight hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      onClick={(event) => {
                        event.preventDefault()
                        selectLabPage(GUIDE_VALUE)
                      }}
                    >
                      Vector Lab
                    </a>
                    {showGuide ? (
                      <span className="ml-2 font-normal text-muted-foreground">
                        / Getting Started
                      </span>
                    ) : null}
                  </div>
                  <div className="lg:hidden">
                    <ChoiceMenu
                      label="Page"
                      value={showGuide ? GUIDE_VALUE : selection.experiment}
                      choices={labPageChoices}
                      onValueChange={selectLabPage}
                    />
                  </div>
                </div>

                {showGuide ? (
                  <GuideDisplayControls />
                ) : (
                  <ExperimentDisplayControls
                    view={selection.view}
                    onViewChange={(view) => updateSelection({ view })}
                    expandButtonRef={expandButtonRef}
                    onExpand={enterPresentation}
                  />
                )}
              </div>

              {!showGuide && experiment ? (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 border-t border-border bg-[color-mix(in_oklab,var(--muted),black_4%)] px-2 py-0.5 sm:flex dark:bg-[color-mix(in_oklab,var(--muted),black_14%)]">
                  <div className="min-w-0 sm:max-w-60 sm:shrink-0">
                    <ExperimentChoiceMenu
                      value={selection.experiment}
                      choices={experimentChoices}
                      triggerLabel={experiment.metadata.title}
                      onValueChange={selectExperiment}
                    />
                  </div>

                  <div className="hidden min-w-0 sm:block sm:flex-1">
                    <VariantTabs
                      choices={variantChoices}
                      value={selection.variant}
                      onValueChange={selectVariant}
                    />
                  </div>

                  <div className="hidden min-w-0 shrink-0 sm:block">
                    <InlineChoiceMenu
                      icon={Layers}
                      label="Scenario"
                      value={selection.scenario}
                      choices={scenarioChoices}
                      ariaKeyShortcuts="Alt+1 Alt+2 Alt+3 Alt+4 Alt+5 Alt+6 Alt+7 Alt+8 Alt+9 Alt+0 S"
                      onValueChange={(scenario) =>
                        updateSelection({ scenario })
                      }
                    />
                  </div>

                  <ExperimentNotes
                    title={experiment.metadata.title}
                    description={experiment.metadata.description}
                    notes={experiment.metadata.notes}
                    variantLabel={selectedVariant?.label}
                    variantNotes={selectedVariant?.notes}
                    scenarioLabel={selectedScenario?.label}
                    scenarioDescription={selectedScenario?.description}
                    notice={
                      experimentKind === "fixture"
                        ? "Included demo fixture—not product work."
                        : undefined
                    }
                  />

                  <div className="col-span-full grid min-w-0 grid-cols-2 gap-1 sm:hidden">
                    <ChoiceMenu
                      label="Variant"
                      value={selection.variant}
                      choices={variantChoices}
                      ariaKeyShortcuts="1 2 3 4 5 6 7 8 9 0 V"
                      showIndexShortcuts
                      onValueChange={selectVariant}
                    />
                    <InlineChoiceMenu
                      icon={Layers}
                      label="Scenario"
                      value={selection.scenario}
                      choices={scenarioChoices}
                      ariaKeyShortcuts="Alt+1 Alt+2 Alt+3 Alt+4 Alt+5 Alt+6 Alt+7 Alt+8 Alt+9 Alt+0 S"
                      onValueChange={(scenario) =>
                        updateSelection({ scenario })
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </header>
        </>
      ) : null}

      <div
        className={
          immersive
            ? ""
            : "mx-auto grid max-w-7xl lg:grid-cols-[13rem_minmax(0,1fr)]"
        }
      >
        {!immersive ? (
          <aside className="sticky top-32 hidden h-[calc(100svh-8rem)] border-r border-border lg:block">
            <nav
              className="h-full overflow-y-auto px-4 py-8"
              aria-label="Experiments"
            >
              <div className="space-y-7">
                <div>
                  <p className="mb-3 px-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Start Here
                  </p>
                  <button
                    type="button"
                    className={sidebarItemClass(showGuide)}
                    aria-pressed={showGuide}
                    onClick={() => selectLabPage(GUIDE_VALUE)}
                  >
                    Lab Guide
                  </button>
                </div>

                <div>
                  <p className="mb-3 px-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Experiments
                  </p>
                  {authoredExperimentChoices.length > 0 ? (
                    <div className="grid gap-1">
                      {authoredExperimentChoices.map((choice) => {
                        const selected = choice.value === selection.experiment
                        return (
                          <button
                            key={choice.value}
                            type="button"
                            className={sidebarItemClass(selected)}
                            aria-pressed={selected}
                            onClick={() => selectExperiment(choice.value)}
                          >
                            {choice.label}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="px-3 text-xs leading-5 text-muted-foreground">
                      None yet. Add a folder to{" "}
                      <code className="font-mono">src/experiments</code>.
                    </p>
                  )}
                </div>

                {fixtureExperimentChoices.length > 0 ? (
                  <div>
                    <p className="mb-3 px-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Demo Fixtures
                    </p>
                    <div className="grid gap-1">
                      {fixtureExperimentChoices.map((choice) => {
                        const selected = choice.value === selection.experiment
                        return (
                          <button
                            key={choice.value}
                            type="button"
                            className={sidebarItemClass(selected)}
                            aria-pressed={selected}
                            onClick={() => selectExperiment(choice.value)}
                          >
                            {choice.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </nav>
          </aside>
        ) : null}

        <section
          id="experiment-canvas"
          className={
            immersive
              ? presentationDock === "open"
                ? "min-h-svh min-w-0 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:pb-[calc(5rem+env(safe-area-inset-bottom))]"
                : "min-h-svh min-w-0"
              : showGuide
                ? "min-w-0 scroll-mt-40 py-10 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6 lg:scroll-mt-32 lg:px-10 lg:py-14"
                : "min-w-0 scroll-mt-48 py-4 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6 sm:py-6 lg:scroll-mt-36 lg:px-8"
          }
          aria-label="Experiment canvas"
        >
          {showGuide ? (
            <LabGuide
              authoredExperimentCount={authoredExperiments.length}
              demoLabel={
                demoExperiment
                  ? `${formatExperimentName(demoExperiment.id)} Demo`
                  : undefined
              }
              onOpenDemo={
                demoExperiment
                  ? () => selectExperiment(demoExperiment.id)
                  : undefined
              }
            />
          ) : loading ? (
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
            selection.view === "compare" ? (
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
                className={`flex min-w-0 items-center justify-center [&>*]:min-w-0 ${immersive ? "min-h-svh" : "min-h-[calc(100svh-10rem)]"}`}
              >
                <ExperimentView
                  variant={selection.variant}
                  scenario={selection.scenario}
                />
              </div>
            )
          ) : null}
        </section>
      </div>

      {immersive && !showGuide ? (
        <PresentationDock
          state={presentationDock}
          title={
            experiment?.metadata.title ??
            formatExperimentName(selection.experiment)
          }
          experiment={selection.experiment}
          experiments={experimentChoices}
          variant={selection.variant}
          variants={variantChoices}
          scenario={selection.scenario}
          scenarios={scenarioChoices}
          collapseButtonRef={collapseDockButtonRef}
          exitButtonRef={exitPresentationButtonRef}
          pullTabRef={pullTabRef}
          onExperimentChange={selectExperiment}
          onVariantChange={selectVariant}
          onScenarioChange={(scenario) => updateSelection({ scenario })}
          onCollapse={collapsePresentationDock}
          onExpand={expandPresentationDock}
          onExit={exitPresentation}
        />
      ) : null}
    </main>
  )
}
