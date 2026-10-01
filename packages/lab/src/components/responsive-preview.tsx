import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { GitBranch } from "lucide-react"

import {
  COMPARE_PANELS,
  type ComparePanelIndex,
  type ComparePanelSide,
} from "../lib/compare-panels"
import {
  FRAME_STATE_MESSAGE,
  type FrameStateMessage,
} from "../lib/frame-messages"
import { InlineChoiceMenu, type Choice } from "./choice-menu"

type ReviewState = Omit<FrameStateMessage, "type">

function ResponsiveFrame({
  src,
  title,
  state,
  className,
  style,
}: {
  src: string
  title: string
  state: ReviewState
  className: string
  style?: CSSProperties
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [initialSrc] = useState(src)

  const postState = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: FRAME_STATE_MESSAGE, ...state } satisfies FrameStateMessage,
      window.location.origin
    )
  }, [state])

  useEffect(() => postState(), [postState])

  return (
    <iframe
      ref={frameRef}
      src={initialSrc}
      title={title}
      // Experiments are already trusted app modules; same-origin keeps theme,
      // storage, and the review-control bridge working inside the frame.
      sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
      className={className}
      style={style}
      onLoad={postState}
    />
  )
}

export function ResponsivePreview({
  src,
  title,
  width,
  dockOpen,
  state,
}: {
  src: string
  title: string
  width: number | null
  dockOpen: boolean
  state: ReviewState
}) {
  return (
    <div
      className={`h-svh overflow-auto bg-[var(--lab-canvas-background)] ${dockOpen ? "pb-24" : ""}`}
    >
      <ResponsiveFrame
        src={src}
        title={`${title} responsive preview`}
        state={state}
        className={`mx-auto block h-full min-h-80 shrink-0 bg-[var(--lab-canvas-background)] ${width === null ? "w-full" : "shadow-sm ring-1 ring-border"}`}
        style={width === null ? undefined : { width }}
      />
    </div>
  )
}

export function ResponsiveComparePreview({
  panels,
  choices,
  width,
  dockOpen,
  scenario,
  canvas,
  onVariantChange,
}: {
  panels: readonly {
    side: ComparePanelSide
    index: ComparePanelIndex
    variant: string
    label: string
    src: string
  }[]
  choices: readonly Choice[]
  width: number | null
  dockOpen: boolean
  scenario: string
  canvas: string
  onVariantChange: (panel: ComparePanelIndex, variant: string) => void
}) {
  return (
    <div
      className={`h-svh overflow-auto bg-[var(--lab-canvas-background)] ${dockOpen ? "pb-24" : ""}`}
    >
      <div className="mx-auto flex h-full w-max min-w-full justify-center gap-px bg-border">
        {panels.map((panel) => (
          <section
            key={`${panel.side}-${panel.variant}`}
            className="flex h-full shrink-0 flex-col bg-[var(--lab-canvas-background)] ring-1 ring-border"
            style={{
              width: width ?? "max(20rem, calc((100vw - 1px) / 2))",
            }}
            aria-label={`${panel.label} comparison panel`}
          >
            <header className="flex min-h-11 shrink-0 items-center border-b border-border bg-muted px-1 [@media(pointer:fine)]:min-h-8">
              <InlineChoiceMenu
                icon={GitBranch}
                label={COMPARE_PANELS[panel.index].label}
                value={panel.variant}
                choices={choices}
                compact
                onValueChange={(variant) =>
                  onVariantChange(panel.index, variant)
                }
              />
            </header>
            <div className="min-h-0 flex-1">
              <ResponsiveFrame
                src={panel.src}
                title={`${panel.label} responsive preview`}
                state={{
                  variant: panel.variant,
                  scenario,
                  view: "focus",
                  canvas,
                }}
                className="block size-full bg-[var(--lab-canvas-background)]"
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
