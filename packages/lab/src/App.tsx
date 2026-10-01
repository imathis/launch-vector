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
import { Eye, EyeOff, FlaskConical, RotateCcw, X } from "lucide-react"

import { Button } from "#/components/ui"
import { useTheme } from "#/theme/theme-provider"

import { AddExperimentPage } from "./components/add-experiment-page"
import {
  ExperimentTitleMenu,
  type Choice,
  type ChoiceMenuAction,
  type ChoiceMenuActionGroup,
} from "./components/choice-menu"
import {
  ExperimentDisplayControls,
  GuideDisplayControls,
  type ViewMode,
} from "./components/display-controls"
import { ExperimentChromeRow } from "./components/experiment-chrome-row"
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
import { variantTabId } from "./lib/variant-tab"
import {
  experimentTitle,
  formatExperimentName,
  type ExperimentEntry,
} from "./experiment-registry"
import { isExperimentDefinition, type ExperimentDefinition } from "./experiment"
import { useLabHost } from "./host-context"
import { useExperimentManagement } from "./hooks/use-experiment-management"
import {
  missingCanvasProperties as findMissingCanvasProperties,
  resolveThemeValue,
  type LabConfig,
  type ViewportPreset,
} from "./lab-config"
import { COMPARE_PANELS, type ComparePanelIndex } from "./lib/compare-panels"
import { errorMessage } from "./lib/error-message"
import {
  FRAME_KEY_MESSAGE,
  isFrameKeyMessage,
  isFrameStateMessage,
  type FrameKeyMessage,
  type FrameStateMessage,
} from "./lib/frame-messages"
import { indexShortcut } from "./lib/index-shortcut"
import { variantBadge } from "./lib/variant-badge"
import {
  resolveShortcut,
  shortcutPreventsDefault,
  type ShortcutAction,
} from "./lib/shortcuts"
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

const GUIDE_VALUE = "__guide"
const ADD_VALUE = "__add"

function choicesFor(entries: readonly ExperimentEntry[]): readonly Choice[] {
  return entries.map((experiment) => ({
    value: experiment.id,
    label: experimentTitle(experiment),
  }))
}

function readSelection(
  experiments: readonly ExperimentEntry[],
  labConfig: LabConfig
): Selection {
  const params = new URLSearchParams(window.location.search)
  const route = parseLabRoute(window.location.pathname)
  const experiment = route.kind === "experiment" ? route.experiment : ""
  const selectedEntry = experiments.find((item) => item.id === experiment)
  return {
    page: route.kind === "add" ? "add" : "guide",
    mode: route.kind === "experiment" ? route.mode : "standard",
    experiment,
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

function selectionParams({
  variant,
  scenario,
  view,
  canvas,
  panelCompare,
}: Pick<
  Selection,
  "variant" | "scenario" | "view" | "canvas" | "panelCompare"
>) {
  const params = new URLSearchParams()
  if (variant) params.set("variant", variant)
  if (scenario) params.set("scenario", scenario)
  params.set("view", view)
  if (panelCompare) params.set("panel", "compare")
  params.set("canvas", canvas)
  return params
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

function stepViewport(
  presets: readonly ViewportPreset[],
  current: string,
  step: number
) {
  const index = presets.findIndex((preset) => preset.id === current)
  if (index < 0) return current
  return (
    presets[(index + step + presets.length) % presets.length]?.id ?? current
  )
}

function sidebarItemClass(selected: boolean) {
  return `flex min-h-11 w-full items-center border-l-2 px-3 text-left text-sm font-medium transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "border-foreground bg-muted/60 text-foreground" : "border-transparent text-muted-foreground"}`
}

function navigate(href: string, replace = false) {
  if (`${window.location.pathname}${window.location.search}` === href) return
  if (replace) window.history.replaceState(window.history.state, "", href)
  else window.history.pushState(null, "", href)
}

// Folder mutations must land on the next URL before Vite sees the new tree.
function assignLab(href: string) {
  window.location.assign(href)
}

function followLabLink(event: MouseEvent<HTMLAnchorElement>, open: () => void) {
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
  open()
}

export function App() {
  const { title, config: labConfig, experiments } = useLabHost()
  const experimentChoices = choicesFor(experiments)
  const authoredExperimentChoices = choicesFor(
    experiments.filter((experiment) => experiment.kind === "experiment")
  )
  const fixtureExperiments = experiments.filter(
    (experiment) => experiment.kind === "fixture"
  )
  const { resolvedTheme } = useTheme()
  const [selection, setSelection] = useState(() =>
    readSelection(experiments, labConfig)
  )
  const [loaded, setLoaded] = useState<{
    id: string
    experiment: ExperimentDefinition | null
    error: string
  }>({ id: "", experiment: null, error: "" })
  const [resetKey, setResetKey] = useState(0)
  const [presentationDock, setPresentationDock] =
    useState<PresentationDockState>("open")
  const [sessionHiddenVariants, setSessionHiddenVariants] = useState<
    Record<string, string[]>
  >({})
  const [missingCanvasProperties] = useState(() =>
    findMissingCanvasProperties(labConfig)
  )
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
  const showSidebar = authoredExperimentChoices.length > 0
  const canvasIsVariantPanel =
    !frame && !showStaticPage && selection.view === "focus"
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
    [experiment, labConfig]
  )
  const canvasChoices: readonly Choice[] = canvasPresets.map((preset) => ({
    value: preset.id,
    label: preset.label,
  }))
  const selectedEntry = experiments.find(
    (entry) => entry.id === selection.experiment
  )
  const experimentKind = selectedEntry?.kind
  const hiddenVariantKeys = useMemo(
    () =>
      new Set([
        ...(selectedEntry?.manifest?.hiddenVariants ?? []),
        ...(sessionHiddenVariants[selection.experiment] ?? []),
      ]),
    [
      selectedEntry?.manifest?.hiddenVariants,
      sessionHiddenVariants,
      selection.experiment,
    ]
  )
  const loadError = isCurrentExperiment ? loaded.error : ""
  const loading = !showStaticPage && !isCurrentExperiment
  const experimentTitleText =
    experiment?.metadata.title || formatExperimentName(selection.experiment)
  const comparedVariantLabel =
    selection.view === "compare"
      ? [
          experiment?.variants[selection.compareLeft]?.label,
          experiment?.variants[selection.compareRight]?.label,
        ]
          .filter(Boolean)
          .join(" vs ")
      : undefined

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
        setSelection((current) => {
          const keys = Object.keys(patch) as (keyof Selection)[]
          return keys.every((key) => current[key] === patch[key])
            ? current
            : { ...current, ...patch }
        })
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
    window.history.pushState(
      { vectorLabPresentation: true },
      "",
      labRoutes.presentation(selection.experiment)
    )
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
    const handlePopState = () =>
      setSelection(readSelection(experiments, labConfig))
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [experiments, labConfig])

  useEffect(() => {
    if (showStaticPage) {
      const pathname =
        selection.page === "add" ? labRoutes.add() : labRoutes.guide()
      window.history.replaceState(window.history.state, "", pathname)
      return
    }
    let pathname = labRoutes.experiment(selection.experiment)
    if (selection.mode === "presentation") {
      pathname = labRoutes.presentation(selection.experiment)
    } else if (selection.mode === "frame") {
      pathname = labRoutes.frame(selection.experiment)
    }
    const params = selectionParams({
      ...selection,
      panelCompare: selection.mode === "frame" && selection.panelCompare,
    })
    if (
      selection.view === "compare" &&
      selection.compareLeft &&
      selection.compareRight
    ) {
      params.set("compareLeft", selection.compareLeft)
      params.set("compareRight", selection.compareRight)
    }
    if (selection.mode === "presentation") {
      params.set("viewport", selection.viewport)
    }
    window.history.replaceState(
      window.history.state,
      "",
      `${pathname}?${params}`
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
      return () => {
        active = false
      }
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
          error: errorMessage(error, "Experiment failed to load."),
        })
      })

    return () => {
      active = false
    }
  }, [experiments, selection.experiment, showStaticPage])

  useEffect(() => {
    if (!experiment) return
    const variantKeys = Object.keys(experiment.variants).filter(
      (key) => !hiddenVariantKeys.has(key)
    )
    const scenarioKeys = Object.keys(experiment.scenarios)
    const variant =
      experiment.variants[selection.variant] &&
      !hiddenVariantKeys.has(selection.variant)
        ? selection.variant
        : (variantKeys[0] ?? "")
    const scenario = experiment.scenarios[selection.scenario]
      ? selection.scenario
      : (scenarioKeys[0] ?? "")
    const compareLeft =
      experiment.variants[selection.compareLeft] &&
      !hiddenVariantKeys.has(selection.compareLeft)
        ? selection.compareLeft
        : variant
    const compareRight =
      experiment.variants[selection.compareRight] &&
      !hiddenVariantKeys.has(selection.compareRight) &&
      selection.compareRight !== compareLeft
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
    hiddenVariantKeys,
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
    labConfig,
    updateSelection,
  ])

  useEffect(() => {
    if (showAdd) {
      document.title = `New Experiment | ${title}`
      return
    }
    if (showGuide) {
      document.title = `Lab Guide | ${title}`
      return
    }

    const variantTitle =
      comparedVariantLabel ?? experiment?.variants[selection.variant]?.label
    document.title = [variantTitle, experimentTitleText, title]
      .filter(Boolean)
      .join(" | ")
  }, [
    comparedVariantLabel,
    experiment,
    experimentTitleText,
    selection.variant,
    showAdd,
    showGuide,
    title,
  ])

  useEffect(() => {
    if (previousImmersive.current === immersive) return
    previousImmersive.current = immersive
    if (immersive) exitPresentationButtonRef.current?.focus()
    else expandButtonRef.current?.focus()
  }, [immersive])

  const runShortcut = (action: ShortcutAction) => {
    switch (action.kind) {
      case "exit-presentation":
        exitPresentation()
        return
      case "select-variant":
      case "previous-variant":
        updateSelection({ variant: action.variant, view: "focus" })
        return
      case "select-scenario":
        updateSelection({ scenario: action.scenario })
        return
      case "step-viewport":
        updateSelection({
          viewport: stepViewport(
            labConfig.presentation.viewports,
            selection.viewport,
            action.step
          ),
        })
        return
      case "toggle-theme":
        // ThemeProvider already toggles D for the whole workspace.
        return
      case "toggle-presentation":
        if (immersive) exitPresentation()
        else enterPresentation()
        return
      case "toggle-view":
        changeView(selection.view === "focus" ? "compare" : "focus")
        return
      case "next-variant":
        if (experiment) {
          updateSelection({
            variant: nextKey(experiment.variants, selection.variant),
            view: "focus",
          })
        }
        return
      case "next-scenario":
        if (experiment) {
          updateSelection({
            scenario: nextKey(experiment.scenarios, selection.scenario),
          })
        }
    }
  }

  const shortcutContext = useEffectEvent(() => ({
    experiment,
    previousVariant: previousVariant.current,
    immersive,
  }))

  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return
    const action = resolveShortcut(event, shortcutContext())
    if (!action) return
    if (shortcutPreventsDefault(action)) event.preventDefault()
    runShortcut(action)
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
        // Width keys always apply: frames only exist inside presentation.
        const embedded = { ...shortcutContext(), immersive: true }
        if (shortcutPreventsDefault(resolveShortcut(event, embedded))) {
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
  }, [frame])

  const ExperimentView = experiment?.render
  const compareVariants = [
    selection.compareLeft,
    selection.compareRight,
  ] as const
  const variantChoices: readonly Choice[] = experiment
    ? Object.entries(experiment.variants)
        .filter(([value]) => !hiddenVariantKeys.has(value))
        .map(([value, details], index) => ({
          value,
          label: details.label,
          shortcut: variantBadge(value, index),
        }))
    : []
  const scenarioChoices: readonly Choice[] = experiment
    ? Object.entries(experiment.scenarios).map(([value, details], index) => {
        const shortcut = indexShortcut(index)
        return {
          value,
          label: details.label,
          shortcut: shortcut ? `⌥${shortcut}` : undefined,
        }
      })
    : []
  const selectedVariant = experiment?.variants[selection.variant]
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
    navigate(
      immersive
        ? labRoutes.presentation(experimentId)
        : labRoutes.experiment(experimentId),
      immersive
    )
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
      navigate(value === ADD_VALUE ? labRoutes.add() : labRoutes.guide())
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

  const selectScenario = (scenario: string) => {
    updateSelection({ scenario })
  }

  const selectCanvas = (canvas: string) => {
    updateSelection({ canvas })
  }

  const selectCompareVariant = (panel: ComparePanelIndex, variant: string) => {
    updateSelection(
      panel === 0 ? { compareLeft: variant } : { compareRight: variant }
    )
  }

  const management = useExperimentManagement({
    currentSlug: selection.experiment,
    onLeaveExperiment: () =>
      assignLab(
        demoExperiment
          ? immersive
            ? labRoutes.presentation(demoExperiment.id)
            : labRoutes.experiment(demoExperiment.id)
          : labRoutes.guide()
      ),
    onOpenExperiment: (slug) =>
      assignLab(
        immersive ? labRoutes.presentation(slug) : labRoutes.experiment(slug)
      ),
  })
  const experimentActionGroups = useMemo<
    readonly ChoiceMenuActionGroup[]
  >(() => {
    if (!experiment) return management.otherGroups
    return [
      {
        actions: [
          {
            value: "reset-prototype",
            label: "Reset prototype",
            description: "Restore its initial local state",
            icon: RotateCcw,
            onSelect: resetPrototype,
          },
          {
            value: "hide-variant",
            label: selectedVariant
              ? `Remove “${selectedVariant.label}”`
              : "Remove this variant",
            description:
              variantChoices.length < 2
                ? "Keep at least one variant"
                : "Hide it from the toolbar",
            icon: EyeOff,
            disabled: variantChoices.length < 2,
            onSelect: () => {
              const key = selection.variant
              if (!key || variantChoices.length < 2) return
              setSessionHiddenVariants((current) => ({
                ...current,
                [selection.experiment]: [
                  ...new Set([...(current[selection.experiment] ?? []), key]),
                ],
              }))
              if (experimentKind === "experiment") {
                void management.hideVariant(key)
              }
            },
          },
          ...(hiddenVariantKeys.size > 0
            ? [
                {
                  value: "restore-hidden-variants",
                  label: "Restore removed variants",
                  icon: Eye,
                  onSelect: () => {
                    setSessionHiddenVariants((current) => ({
                      ...current,
                      [selection.experiment]: [],
                    }))
                    if (experimentKind === "experiment") {
                      void management.restoreHiddenVariants()
                    }
                  },
                } satisfies ChoiceMenuAction,
              ]
            : []),
          ...management.currentActions,
        ],
      },
      ...management.otherGroups,
    ]
  }, [
    experiment,
    experimentKind,
    hiddenVariantKeys,
    management,
    resetPrototype,
    selectedVariant,
    selection.experiment,
    selection.variant,
    variantChoices.length,
  ])

  const viewportPreset =
    labConfig.presentation.viewports.find(
      (preset) => preset.id === selection.viewport
    ) ?? labConfig.presentation.viewports[0]
  const frameSrcFor = (variant: string, panelCompare = false) => {
    const params = selectionParams({
      ...selection,
      variant,
      view: "focus",
      panelCompare,
    })
    return `${labRoutes.frame(selection.experiment)}?${params}`
  }

  const experimentNotes = experiment ? (
    <ExperimentNotes
      title={experiment.metadata.title}
      description={experiment.metadata.description}
      notes={experiment.metadata.notes}
      variantLabel={comparedVariantLabel ?? selectedVariant?.label}
      variantNotes={
        selection.view === "focus" ? selectedVariant?.notes : undefined
      }
      scenarioLabel={selectedScenario?.label}
      scenarioDescription={selectedScenario?.description}
      notice={
        experimentKind === "fixture"
          ? "Included demo fixture—not product work."
          : undefined
      }
    />
  ) : null

  return (
    <main
      className={
        immersive
          ? "vector-lab fixed inset-0 z-40 min-h-svh overflow-x-hidden overflow-y-auto bg-background"
          : frame
            ? "vector-lab min-h-svh bg-background"
            : "vector-lab flex min-h-svh flex-col overflow-x-hidden bg-background"
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
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <div className="flex flex-wrap items-center gap-1 p-2">
                <div className="flex min-h-11 flex-1 items-center gap-1 lg:px-3">
                  <a
                    href={labRoutes.guide()}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl font-semibold tracking-tight hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [@media(pointer:fine)]:h-8"
                    aria-label={title}
                    title={title}
                    onClick={(event) =>
                      followLabLink(event, () => selectLabPage(GUIDE_VALUE))
                    }
                  >
                    <FlaskConical className="size-4" aria-hidden="true" />
                    {showGuide ? <span>{title}</span> : null}
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
                        <span className="font-medium">New Experiment</span>
                      ) : (
                        <>
                          <span className="hidden font-medium lg:inline">
                            {experimentTitleText}
                          </span>
                          <div className="lg:hidden">
                            <ExperimentTitleMenu
                              value={selection.experiment}
                              choices={experimentChoices}
                              title={experimentTitleText}
                              onValueChange={selectExperiment}
                            />
                          </div>
                        </>
                      )}
                    </>
                  ) : null}
                </div>

                <div className="ml-auto shrink-0">
                  {showStaticPage ? (
                    <GuideDisplayControls
                      canvas={showAdd ? selection.canvas : undefined}
                      canvasChoices={showAdd ? canvasChoices : undefined}
                      missingCanvasProperties={
                        showAdd ? missingCanvasProperties : undefined
                      }
                      onCanvasChange={showAdd ? selectCanvas : undefined}
                    />
                  ) : (
                    <ExperimentDisplayControls
                      view={selection.view}
                      canvas={selection.canvas}
                      canvasChoices={canvasChoices}
                      missingCanvasProperties={missingCanvasProperties}
                      onViewChange={changeView}
                      onCanvasChange={selectCanvas}
                      expandButtonRef={expandButtonRef}
                      onExpand={enterPresentation}
                    />
                  )}
                </div>
              </div>

              {!showStaticPage &&
              (experiment ||
                (loadError && experimentActionGroups.length > 0)) ? (
                <ExperimentChromeRow
                  className="border-t border-border bg-muted px-2 py-0.5"
                  view={selection.view}
                  variant={selection.variant}
                  variants={variantChoices}
                  scenario={selection.scenario}
                  scenarios={scenarioChoices}
                  onVariantChange={selectVariant}
                  onScenarioChange={selectScenario}
                  leading={
                    experimentActionGroups.length > 0 ? (
                      <div className="flex items-center self-stretch">
                        <ExperimentActionsMenu
                          actionGroups={experimentActionGroups}
                        />
                        <span
                          className="ml-1 w-px self-stretch bg-border"
                          aria-hidden="true"
                        />
                      </div>
                    ) : null
                  }
                  afterScenario={experimentNotes}
                />
              ) : null}
            </div>
          </header>
        </>
      ) : null}

      <div
        className={
          immersive || frame
            ? ""
            : showSidebar
              ? "flex w-full flex-1"
              : "w-full flex-1"
        }
      >
        {!immersive && !frame && showSidebar ? (
          <aside className="hidden w-52 shrink-0 border-r border-border lg:block">
            <nav className="px-3 py-4" aria-label="Experiments">
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
          {...(canvasIsVariantPanel
            ? {
                role: "tabpanel",
                "aria-labelledby": variantTabId(selection.variant),
              }
            : { "aria-label": "Experiment canvas" })}
          className={
            immersive
              ? "h-svh min-w-0"
              : frame
                ? "min-h-svh min-w-0"
                : showStaticPage
                  ? "min-w-0 flex-1 scroll-mt-40 py-10 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6 lg:scroll-mt-32 lg:px-10 lg:py-14"
                  : "min-w-0 flex-1 scroll-mt-48 lg:scroll-mt-36"
          }
          style={showStaticPage ? undefined : canvasStyle}
        >
          {immersive && experiment && selection.view === "compare" ? (
            <ResponsiveComparePreview
              key={`${selection.experiment}-${resetKey}`}
              panels={COMPARE_PANELS.map((panel) => {
                const variant = compareVariants[panel.index]
                return {
                  side: panel.side,
                  index: panel.index,
                  variant,
                  label: experiment.variants[variant]?.label ?? variant,
                  src: frameSrcFor(variant, true),
                }
              })}
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
            <AddExperimentPage
              onImported={(slug) => assignLab(labRoutes.experiment(slug))}
            />
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
              compareVariants={compareVariants}
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
          notes={experimentNotes}
          onExperimentChange={selectExperiment}
          onVariantChange={selectVariant}
          onViewChange={changeView}
          onScenarioChange={selectScenario}
          onCanvasChange={selectCanvas}
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
