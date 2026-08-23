import {
  type CSSProperties,
  type MouseEvent,
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"
import { Layers, RotateCcw, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { useTheme } from "@workspace/ui/theme/theme-provider"

import { AddExperimentPage } from "./components/add-experiment-page"
import {
  ChoiceMenu,
  ExperimentTitleMenu,
  IconExperimentChoiceMenu,
  InlineChoiceMenu,
  type Choice,
  type ChoiceMenuActionGroup,
} from "./components/choice-menu"
import {
  ExperimentDisplayControls,
  GuideDisplayControls,
  type ViewMode,
} from "./components/display-controls"
import { ExperimentNotes } from "./components/experiment-notes"
import { ExperimentActionsMenu } from "./components/experiment-actions-menu"
import { ExperimentPreview } from "./components/experiment-preview"
import { LabGuide } from "./components/lab-guide"
import { RenameExperimentDialog } from "./components/rename-experiment-dialog"
import {
  ResponsiveComparePreview,
  ResponsivePreview,
} from "./components/responsive-preview"
import {
  PresentationDock,
  type PresentationDockState,
} from "./components/presentation-dock"
import { VariantTabs } from "./components/variant-tabs"
import {
  authoredExperiments,
  experimentTitle,
  experiments,
  fixtureExperiments,
  formatExperimentName,
  type ExperimentEntry,
} from "./experiment-registry"
import { isExperimentDefinition, type ExperimentDefinition } from "./experiment"
import { useExperimentManagement } from "./hooks/use-experiment-management"
import {
  labConfig,
  missingCanvasProperties as findMissingCanvasProperties,
  resolveThemeValue,
} from "./lab-config"
import {
  FRAME_KEY_MESSAGE,
  isFrameKeyMessage,
  isFrameStateMessage,
  type FrameKeyMessage,
  type FrameStateMessage,
} from "./lib/frame-messages"
import { labRoutes, parseLabRoute } from "./routes"

type Selection = {
  page: "guide" | "add"
  mode: "standard" | "presentation" | "frame"
  experiment: string
  variant: string
  scenario: string
  view: ViewMode
  compareLeft: string
  compareRight: string
  panelCompare: boolean
  canvas: string
  viewport: string
}

const NUMBER_KEY_CODE = /^(?:Digit|Numpad)([0-9])$/
const GUIDE_VALUE = "__guide"
const ADD_VALUE = "__add"

function choicesFor(entries: readonly ExperimentEntry[]): readonly Choice[] {
  return entries.map((experiment) => ({
    value: experiment.id,
    label: experimentTitle(experiment),
  }))
}

const experimentChoices = choicesFor(experiments)
const authoredExperimentChoices = choicesFor(authoredExperiments)
const labPageChoices: readonly Choice[] = [
  { value: GUIDE_VALUE, label: "Lab Guide" },
  { value: ADD_VALUE, label: "New Experiment" },
  ...experimentChoices,
]
function readSelection(): Selection {
  const params = new URLSearchParams(window.location.search)
  const route = parseLabRoute(window.location.pathname)
  const requestedPage = params.get("page")
  const requestedExperiment =
    route.kind === "experiment" ? route.experiment : params.get("experiment")
  const selectedEntry = experiments.find(
    (item) => item.id === requestedExperiment
  )
  const page = route.kind === "add" || requestedPage === "add" ? "add" : "guide"
  return {
    page,
    mode: route.kind === "experiment" ? route.mode : "standard",
    experiment:
      route.kind === "experiment"
        ? (requestedExperiment ?? "")
        : route.kind === "guide" &&
            requestedPage !== "help" &&
            requestedPage !== "add" &&
            selectedEntry
          ? (requestedExperiment ?? "")
          : "",
    variant: params.get("variant") ?? "",
    scenario: params.get("scenario") ?? "",
    view: params.get("view") === "compare" ? "compare" : "focus",
    compareLeft: params.get("compareLeft") ?? "",
    compareRight: params.get("compareRight") ?? "",
    panelCompare: params.get("panel") === "compare",
    canvas:
      params.get("canvas") ??
      selectedEntry?.manifest?.defaultCanvas ??
      labConfig.canvas.defaultPreset,
    viewport:
      labConfig.presentation.viewports.find(
        (preset) => preset.id === params.get("viewport")
      )?.id ?? labConfig.presentation.defaultViewport,
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

function shouldPreventFrameShortcut(
  event: KeyboardEvent,
  experiment: ExperimentDefinition | null,
  previousVariant: string
) {
  if (event.repeat || event.metaKey || event.ctrlKey) return false

  const optionIndex = event.shiftKey ? null : numberKeyIndex(event.code)
  if (optionIndex !== null && experiment) {
    return event.altKey
      ? Boolean(Object.keys(experiment.scenarios)[optionIndex])
      : Boolean(Object.keys(experiment.variants)[optionIndex])
  }

  if (
    event.code === "Period" &&
    !event.altKey &&
    !event.shiftKey &&
    experiment?.variants[previousVariant]
  ) {
    return true
  }

  return !event.altKey && event.key.toLowerCase() === "f" && Boolean(experiment)
}

function sidebarItemClass(selected: boolean) {
  return `flex min-h-11 w-full items-center border-l-2 px-3 text-left text-sm font-medium transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "border-foreground bg-muted/60 text-foreground" : "border-transparent text-muted-foreground"}`
}

function followLabLink(
  event: MouseEvent<HTMLAnchorElement>,
  navigate: () => void
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }
  event.preventDefault()
  navigate()
}

export function App() {
  const { resolvedTheme } = useTheme()
  const [selection, setSelection] = useState(readSelection)
  const [loaded, setLoaded] = useState<{
    id: string
    experiment: ExperimentDefinition | null
    error: string
  }>({ id: "", experiment: null, error: "" })
  const [resetKey, setResetKey] = useState(0)
  const [presentationDock, setPresentationDock] =
    useState<PresentationDockState>("open")
  const [missingCanvasProperties] = useState(findMissingCanvasProperties)
  const expandButtonRef = useRef<HTMLButtonElement>(null)
  const collapseDockButtonRef = useRef<HTMLButtonElement>(null)
  const exitPresentationButtonRef = useRef<HTMLButtonElement>(null)
  const pullTabRef = useRef<HTMLButtonElement>(null)
  const previousImmersive = useRef(false)
  const previousVariant = useRef("")
  const showStaticPage = selection.experiment === ""
  const immersive = selection.mode === "presentation"
  const frame = selection.mode === "frame"
  const showGuide = showStaticPage && selection.page === "guide"
  const showAdd = showStaticPage && selection.page === "add"
  const isCurrentExperiment = loaded.id === selection.experiment
  const experiment = isCurrentExperiment ? loaded.experiment : null
  const canvasPresets = useMemo(
    () =>
      [
        ...labConfig.canvas.presets,
        ...(experiment?.canvas?.presets ?? []),
      ].filter(
        (preset, index, presets) =>
          presets.findIndex((candidate) => candidate.id === preset.id) === index
      ),
    [experiment]
  )
  const canvasChoices: readonly Choice[] = canvasPresets.map((preset) => ({
    value: preset.id,
    label: preset.label,
  }))
  const selectedEntry = experiments.find(
    (entry) => entry.id === selection.experiment
  )
  const experimentKind = selectedEntry?.kind
  const loadError = isCurrentExperiment ? loaded.error : ""
  const loading = !showStaticPage && !isCurrentExperiment

  const updateSelection = useCallback(
    (patch: Partial<Selection>) => {
      if (
        patch.experiment === undefined &&
        patch.variant !== undefined &&
        patch.variant !== selection.variant &&
        selection.variant
      ) {
        previousVariant.current = selection.variant
      }
      startTransition(() => {
        setSelection((current) => ({ ...current, ...patch }))
      })
    },
    [selection.variant]
  )

  const resetPrototype = useCallback(() => {
    setResetKey((current) => current + 1)
  }, [])

  const changeView = useCallback(
    (view: ViewMode) => {
      if (view === "focus") {
        updateSelection({
          view,
          variant: selection.compareLeft || selection.variant,
        })
        return
      }
      const variantKeys = Object.keys(experiment?.variants ?? {})
      const compareLeft = selection.variant || variantKeys[0] || ""
      const compareRight =
        selection.compareRight &&
        selection.compareRight !== compareLeft &&
        experiment?.variants[selection.compareRight]
          ? selection.compareRight
          : (variantKeys.find((candidate) => candidate !== compareLeft) ??
            compareLeft)
      updateSelection({ view, compareLeft, compareRight })
    },
    [
      experiment,
      selection.compareLeft,
      selection.compareRight,
      selection.variant,
      updateSelection,
    ]
  )

  const enterPresentation = () => {
    setPresentationDock("open")
    const href = labRoutes.presentation(selection.experiment)
    window.history.pushState({ vectorLabPresentation: true }, "", href)
    updateSelection({ mode: "presentation" })
  }

  const exitPresentation = () => {
    const historyState = window.history.state as {
      vectorLabPresentation?: unknown
    } | null
    if (historyState?.vectorLabPresentation === true) {
      window.history.back()
      return
    }
    const href = labRoutes.experiment(selection.experiment)
    window.history.replaceState(window.history.state, "", href)
    updateSelection({ mode: "standard" })
  }

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
    let pathname: string
    if (showStaticPage) {
      pathname = selection.page === "add" ? labRoutes.add() : labRoutes.guide()
    } else {
      pathname =
        selection.mode === "presentation"
          ? labRoutes.presentation(selection.experiment)
          : selection.mode === "frame"
            ? labRoutes.frame(selection.experiment)
            : labRoutes.experiment(selection.experiment)
      if (selection.variant) params.set("variant", selection.variant)
      if (selection.scenario) params.set("scenario", selection.scenario)
      params.set("view", selection.view)
      if (
        selection.view === "compare" &&
        selection.compareLeft &&
        selection.compareRight
      ) {
        params.set("compareLeft", selection.compareLeft)
        params.set("compareRight", selection.compareRight)
      }
      if (selection.mode === "frame" && selection.panelCompare) {
        params.set("panel", "compare")
      }
      params.set("canvas", selection.canvas)
      if (selection.mode === "presentation") {
        params.set("viewport", selection.viewport)
      }
    }
    const search = params.size > 0 ? `?${params}` : ""
    window.history.replaceState(
      window.history.state,
      "",
      `${pathname}${search}`
    )
  }, [selection, showStaticPage])

  useEffect(() => {
    let active = true

    if (showStaticPage) {
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
        const loadedExperiment = entry.manifest
          ? {
              ...module.default,
              metadata: {
                ...module.default.metadata,
                title: entry.manifest.title,
                description: entry.manifest.description,
              },
            }
          : module.default
        setLoaded({
          id: selection.experiment,
          experiment: loadedExperiment,
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
  }, [selection.experiment, showStaticPage])

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
    const compareLeft = experiment.variants[selection.compareLeft]
      ? selection.compareLeft
      : variant
    const compareRight = experiment.variants[selection.compareRight]
      ? selection.compareRight
      : (variantKeys.find((candidate) => candidate !== compareLeft) ??
        compareLeft)

    if (
      variant !== selection.variant ||
      scenario !== selection.scenario ||
      compareLeft !== selection.compareLeft ||
      compareRight !== selection.compareRight
    ) {
      updateSelection({ variant, scenario, compareLeft, compareRight })
    }
  }, [
    experiment,
    selection.compareLeft,
    selection.compareRight,
    selection.scenario,
    selection.variant,
    updateSelection,
  ])

  useEffect(() => {
    if (!showStaticPage && !experiment) return
    const available = canvasPresets.some(
      (preset) => preset.id === selection.canvas
    )
    if (available) return
    const preferred =
      experiment?.canvas?.defaultPreset ??
      selectedEntry?.manifest?.defaultCanvas
    const fallback = canvasPresets.some((preset) => preset.id === preferred)
      ? (preferred ?? labConfig.canvas.defaultPreset)
      : labConfig.canvas.defaultPreset
    updateSelection({ canvas: fallback })
  }, [
    canvasPresets,
    experiment,
    selectedEntry,
    selection.canvas,
    showStaticPage,
    updateSelection,
  ])

  useEffect(() => {
    if (showAdd) {
      document.title = "New Experiment | Vector"
      return
    }
    if (showGuide) {
      document.title = "Lab Guide | Vector"
      return
    }

    const variantTitle =
      selection.view === "compare"
        ? [
            experiment?.variants[selection.compareLeft]?.label,
            experiment?.variants[selection.compareRight]?.label,
          ]
            .filter(Boolean)
            .join(" vs ")
        : experiment?.variants[selection.variant]?.label
    const experimentTitle =
      experiment?.metadata.title || formatExperimentName(selection.experiment)
    document.title = [variantTitle, experimentTitle, "Vector"]
      .filter(Boolean)
      .join(" | ")
  }, [
    experiment,
    selection.compareLeft,
    selection.compareRight,
    selection.experiment,
    selection.variant,
    selection.view,
    showAdd,
    showGuide,
  ])

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
      changeView(selection.view === "focus" ? "compare" : "focus")
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

  const handleFrameState = useEffectEvent((message: FrameStateMessage) => {
    updateSelection({
      variant: message.variant,
      scenario: message.scenario,
      view: message.view,
      canvas: message.canvas,
    })
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (frame && window.parent !== window) {
        if (isEditableTarget(event.target)) return
        const message = {
          type: FRAME_KEY_MESSAGE,
          key: event.key,
          code: event.code,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          repeat: event.repeat,
        } satisfies FrameKeyMessage
        window.parent.postMessage(message, window.location.origin)
        if (
          shouldPreventFrameShortcut(event, experiment, previousVariant.current)
        ) {
          event.preventDefault()
        }
        return
      }
      handleShortcut(event)
    }

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return
      if (
        frame &&
        event.source === window.parent &&
        isFrameStateMessage(event.data)
      ) {
        handleFrameState(event.data)
        return
      }
      if (!frame && isFrameKeyMessage(event.data)) {
        handleShortcut(new KeyboardEvent("keydown", event.data))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("message", handleMessage)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("message", handleMessage)
    }
  }, [experiment, frame])

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
  const comparedVariantLabel =
    selection.view === "compare"
      ? [
          experiment?.variants[selection.compareLeft]?.label,
          experiment?.variants[selection.compareRight]?.label,
        ]
          .filter(Boolean)
          .join(" vs ")
      : undefined
  const selectedScenario = experiment?.scenarios[selection.scenario]
  const canvasPreset =
    canvasPresets.find((preset) => preset.id === selection.canvas) ??
    canvasPresets[0]
  const canvasStyle = {
    "--lab-canvas-background": resolveThemeValue(
      canvasPreset.background,
      resolvedTheme
    ),
    "--lab-canvas-foreground": resolveThemeValue(
      canvasPreset.foreground,
      resolvedTheme
    ),
    backgroundColor: "var(--lab-canvas-background)",
    color: "var(--lab-canvas-foreground)",
  } as CSSProperties
  const demoExperiment = fixtureExperiments[0]

  const selectExperiment = (experimentId: string) => {
    const href = immersive
      ? labRoutes.presentation(experimentId)
      : labRoutes.experiment(experimentId)
    if (`${window.location.pathname}${window.location.search}` !== href) {
      if (immersive) {
        window.history.replaceState(window.history.state, "", href)
      } else window.history.pushState(null, "", href)
    }
    previousVariant.current = ""
    updateSelection({
      experiment: experimentId,
      variant: "",
      scenario: "",
      compareLeft: "",
      compareRight: "",
      panelCompare: false,
      mode: immersive ? "presentation" : "standard",
    })
  }

  const selectLabPage = (value: string) => {
    if (value === GUIDE_VALUE || value === ADD_VALUE) {
      const href = value === ADD_VALUE ? labRoutes.add() : labRoutes.guide()
      if (`${window.location.pathname}${window.location.search}` !== href) {
        window.history.pushState(null, "", href)
      }
      previousVariant.current = ""
      updateSelection({
        page: value === ADD_VALUE ? "add" : "guide",
        mode: "standard",
        experiment: "",
        variant: "",
        scenario: "",
        compareLeft: "",
        compareRight: "",
        panelCompare: false,
      })
      return
    }
    selectExperiment(value)
  }

  const selectVariant = (variant: string) => {
    updateSelection({ variant, view: "focus" })
  }

  const selectCompareVariant = (panel: 0 | 1, variant: string) => {
    updateSelection(
      panel === 0 ? { compareLeft: variant } : { compareRight: variant }
    )
  }

  const management = useExperimentManagement({
    currentSlug: selection.experiment,
    onLeaveExperiment: () =>
      demoExperiment
        ? selectExperiment(demoExperiment.id)
        : selectLabPage(GUIDE_VALUE),
    onOpenExperiment: selectExperiment,
  })
  const experimentActionGroups = useMemo<
    readonly ChoiceMenuActionGroup[]
  >(() => {
    const resetAction = {
      value: "reset-prototype",
      label: "Reset prototype",
      description: "Restore its initial local state",
      icon: RotateCcw,
      onSelect: resetPrototype,
    }
    const [first, ...rest] = management.actionGroups
    if (first?.label === "") {
      return [{ ...first, actions: [resetAction, ...first.actions] }, ...rest]
    }
    return [{ label: "", actions: [resetAction] }, ...management.actionGroups]
  }, [management.actionGroups, resetPrototype])

  const viewportPreset =
    labConfig.presentation.viewports.find(
      (preset) => preset.id === selection.viewport
    ) ?? labConfig.presentation.viewports[0]
  const frameSrcFor = (variant: string, panelCompare = false) => {
    const params = new URLSearchParams()
    if (variant) params.set("variant", variant)
    if (selection.scenario) params.set("scenario", selection.scenario)
    params.set("view", "focus")
    params.set("canvas", selection.canvas)
    if (panelCompare) params.set("panel", "compare")
    return `${labRoutes.frame(selection.experiment)}?${params}`
  }

  return (
    <main
      className={
        immersive
          ? "fixed inset-0 z-40 min-h-svh overflow-x-hidden overflow-y-auto bg-background"
          : frame
            ? "min-h-svh bg-background"
            : "min-h-svh overflow-x-hidden bg-background"
      }
    >
      {!immersive && !frame ? (
        <>
          <a
            className="fixed top-2 left-2 z-50 -translate-y-20 rounded-md bg-background px-4 py-3 font-medium shadow-md focus-visible:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href="#experiment-canvas"
          >
            Skip to experiment
          </a>
          <header className="sticky top-0 z-30 pt-[max(.5rem,env(safe-area-inset-top))] pr-[max(.5rem,env(safe-area-inset-right))] pl-[max(.5rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1rem,env(safe-area-inset-left))]">
            <div className="overflow-hidden rounded-2xl border border-border bg-muted/90 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-muted/80">
              <div className="flex flex-wrap items-center gap-1 p-2">
                <div className="flex min-w-0 flex-1 items-center gap-1 lg:px-3">
                  {showStaticPage ? (
                    <div className="lg:hidden">
                      <IconExperimentChoiceMenu
                        label="Lab destination"
                        value={showGuide ? GUIDE_VALUE : ADD_VALUE}
                        choices={labPageChoices}
                        onValueChange={selectLabPage}
                      />
                    </div>
                  ) : null}
                  <a
                    href={labRoutes.guide()}
                    className="inline-flex h-11 shrink-0 items-center rounded-xl font-semibold tracking-tight hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    onClick={(event) =>
                      followLabLink(event, () => selectLabPage(GUIDE_VALUE))
                    }
                  >
                    Vector Lab
                  </a>
                  {!showGuide ? (
                    <>
                      <span
                        className="text-muted-foreground"
                        aria-hidden="true"
                      >
                        /
                      </span>
                      {showAdd ? (
                        <span className="truncate font-medium">
                          New Experiment
                        </span>
                      ) : authoredExperimentChoices.length > 0 ? (
                        <>
                          <span className="hidden truncate font-medium lg:block">
                            {experiment?.metadata.title ||
                              formatExperimentName(selection.experiment)}
                          </span>
                          <div className="min-w-0 lg:hidden">
                            <ExperimentTitleMenu
                              value={selection.experiment}
                              choices={experimentChoices}
                              title={
                                experiment?.metadata.title ||
                                formatExperimentName(selection.experiment)
                              }
                              onValueChange={selectExperiment}
                            />
                          </div>
                        </>
                      ) : (
                        <ExperimentTitleMenu
                          value={selection.experiment}
                          choices={experimentChoices}
                          title={
                            experiment?.metadata.title ||
                            formatExperimentName(selection.experiment)
                          }
                          onValueChange={selectExperiment}
                        />
                      )}
                    </>
                  ) : null}
                </div>

                {showStaticPage ? (
                  <GuideDisplayControls
                    canvas={showAdd ? selection.canvas : undefined}
                    canvasChoices={showAdd ? canvasChoices : undefined}
                    missingCanvasProperties={
                      showAdd ? missingCanvasProperties : undefined
                    }
                    onCanvasChange={
                      showAdd
                        ? (canvas) => updateSelection({ canvas })
                        : undefined
                    }
                  />
                ) : (
                  <ExperimentDisplayControls
                    view={selection.view}
                    canvas={selection.canvas}
                    canvasChoices={canvasChoices}
                    missingCanvasProperties={missingCanvasProperties}
                    onViewChange={changeView}
                    onCanvasChange={(canvas) => updateSelection({ canvas })}
                    expandButtonRef={expandButtonRef}
                    onExpand={enterPresentation}
                  />
                )}
              </div>

              {!showStaticPage && experiment ? (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 border-t border-border bg-[color-mix(in_oklab,var(--muted),black_4%)] px-2 py-0.5 sm:flex dark:bg-[color-mix(in_oklab,var(--muted),black_14%)]">
                  {experimentActionGroups.length > 0 ? (
                    <div className="flex items-center self-stretch">
                      <ExperimentActionsMenu
                        actionGroups={experimentActionGroups}
                      />
                      <span
                        className="ml-1 w-px self-stretch bg-border"
                        aria-hidden="true"
                      />
                    </div>
                  ) : null}

                  <div className="hidden min-w-0 sm:block sm:flex-1">
                    {selection.view === "focus" ? (
                      <VariantTabs
                        choices={variantChoices}
                        value={selection.variant}
                        onValueChange={selectVariant}
                      />
                    ) : null}
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

                  <div className="flex shrink-0">
                    <ExperimentNotes
                      title={experiment.metadata.title}
                      description={experiment.metadata.description}
                      notes={experiment.metadata.notes}
                      variantLabel={
                        comparedVariantLabel ?? selectedVariant?.label
                      }
                      variantNotes={
                        selection.view === "focus"
                          ? selectedVariant?.notes
                          : undefined
                      }
                      scenarioLabel={selectedScenario?.label}
                      scenarioDescription={selectedScenario?.description}
                      notice={
                        experimentKind === "fixture"
                          ? "Included demo fixture—not product work."
                          : undefined
                      }
                    />
                  </div>

                  <div
                    className={`col-span-full grid min-w-0 gap-1 sm:hidden ${selection.view === "focus" ? "grid-cols-2" : "grid-cols-1"}`}
                  >
                    {selection.view === "focus" ? (
                      <ChoiceMenu
                        label="Variant"
                        value={selection.variant}
                        choices={variantChoices}
                        ariaKeyShortcuts="1 2 3 4 5 6 7 8 9 0 V"
                        showIndexShortcuts
                        onValueChange={selectVariant}
                      />
                    ) : null}
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
          immersive || frame
            ? ""
            : authoredExperimentChoices.length > 0
              ? "grid w-full lg:grid-cols-[13rem_minmax(0,1fr)]"
              : "w-full"
        }
      >
        {!immersive && !frame && authoredExperimentChoices.length > 0 ? (
          <aside className="sticky top-32 hidden h-[calc(100svh-8rem)] border-r border-border lg:block">
            <nav
              className="h-full overflow-y-auto px-4 py-8"
              aria-label="Experiments"
            >
              <p className="mb-3 px-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Experiments
              </p>
              <div className="grid gap-1">
                {authoredExperimentChoices.map((choice) => {
                  const selected = choice.value === selection.experiment
                  return (
                    <a
                      key={choice.value}
                      href={labRoutes.experiment(choice.value)}
                      className={sidebarItemClass(selected)}
                      aria-current={selected ? "page" : undefined}
                      onClick={(event) =>
                        followLabLink(event, () =>
                          selectExperiment(choice.value)
                        )
                      }
                    >
                      {choice.label}
                    </a>
                  )
                })}
              </div>
            </nav>
          </aside>
        ) : null}

        <section
          id="experiment-canvas"
          className={
            immersive
              ? "h-svh min-w-0"
              : frame
                ? "min-h-svh min-w-0"
                : showStaticPage
                  ? "min-w-0 scroll-mt-40 py-10 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6 lg:scroll-mt-32 lg:px-10 lg:py-14"
                  : "min-w-0 scroll-mt-48 lg:scroll-mt-36"
          }
          style={showStaticPage ? undefined : canvasStyle}
          aria-label="Experiment canvas"
        >
          {immersive && experiment && selection.view === "compare" ? (
            <ResponsiveComparePreview
              key={`${selection.experiment}-${resetKey}`}
              panels={[
                {
                  side: "left",
                  variant: selection.compareLeft,
                  label:
                    experiment.variants[selection.compareLeft]?.label ??
                    selection.compareLeft,
                  src: frameSrcFor(selection.compareLeft, true),
                },
                {
                  side: "right",
                  variant: selection.compareRight,
                  label:
                    experiment.variants[selection.compareRight]?.label ??
                    selection.compareRight,
                  src: frameSrcFor(selection.compareRight, true),
                },
              ]}
              choices={variantChoices}
              width={viewportPreset.width}
              dockOpen={presentationDock === "open"}
              scenario={selection.scenario}
              canvas={selection.canvas}
              onVariantChange={selectCompareVariant}
            />
          ) : immersive && experiment ? (
            <ResponsivePreview
              key={`${selection.experiment}-${resetKey}`}
              src={frameSrcFor(selection.variant)}
              title={experiment.metadata.title}
              width={viewportPreset.width}
              dockOpen={presentationDock === "open"}
              state={{
                variant: selection.variant,
                scenario: selection.scenario,
                view: "focus",
                canvas: selection.canvas,
              }}
            />
          ) : showAdd ? (
            <AddExperimentPage onImported={selectExperiment} />
          ) : showGuide ? (
            <LabGuide
              onAdd={() => selectLabPage(ADD_VALUE)}
              onOpenDemo={
                demoExperiment
                  ? () => selectExperiment(demoExperiment.id)
                  : undefined
              }
            />
          ) : loading ? (
            <p
              className={`grid place-items-center text-muted-foreground ${immersive || frame ? "min-h-svh" : "min-h-[50svh]"}`}
              role="status"
            >
              Loading experiment…
            </p>
          ) : loadError ? (
            <div
              className={`grid place-items-center p-4 ${immersive || frame ? "min-h-svh" : "min-h-[50svh]"}`}
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
            <ExperimentPreview
              ExperimentView={ExperimentView}
              experiment={experiment}
              variant={selection.variant}
              scenario={selection.scenario}
              view={selection.view}
              resetKey={resetKey}
              compareVariants={[selection.compareLeft, selection.compareRight]}
              variantChoices={variantChoices}
              onCompareVariantChange={selectCompareVariant}
              renderView={selection.panelCompare ? "compare" : undefined}
              frame={frame}
            />
          ) : null}
        </section>
      </div>

      {immersive && !showStaticPage ? (
        <PresentationDock
          state={presentationDock}
          experiment={selection.experiment}
          experiments={experimentChoices}
          variant={selection.variant}
          variants={variantChoices}
          view={selection.view}
          scenario={selection.scenario}
          scenarios={scenarioChoices}
          canvas={selection.canvas}
          canvasChoices={canvasChoices}
          viewport={selection.viewport}
          viewportPresets={labConfig.presentation.viewports}
          managementActionGroups={experimentActionGroups}
          missingCanvasProperties={missingCanvasProperties}
          collapseButtonRef={collapseDockButtonRef}
          exitButtonRef={exitPresentationButtonRef}
          pullTabRef={pullTabRef}
          onExperimentChange={selectExperiment}
          onVariantChange={selectVariant}
          onViewChange={changeView}
          onScenarioChange={(scenario) => updateSelection({ scenario })}
          onCanvasChange={(canvas) => updateSelection({ canvas })}
          onViewportChange={(viewport) => updateSelection({ viewport })}
          onCollapse={collapsePresentationDock}
          onExpand={expandPresentationDock}
          onExit={exitPresentation}
        />
      ) : null}

      {management.renameTarget ? (
        <RenameExperimentDialog
          key={management.renameTarget.id}
          experiment={management.renameTarget}
          onClose={management.closeRename}
          onRenamed={management.finishRename}
        />
      ) : null}

      {management.error ? (
        <div
          className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] flex max-w-sm items-start gap-3 rounded-xl border border-destructive/40 bg-background p-4 text-sm text-destructive shadow-md"
          role="alert"
        >
          <p className="min-w-0 flex-1 leading-6">{management.error}</p>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="shrink-0"
            aria-label="Dismiss error"
            onClick={management.dismissError}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </main>
  )
}
