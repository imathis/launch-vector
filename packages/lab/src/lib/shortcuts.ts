import type { ExperimentDefinition } from "../experiment"
import {
  INDEX_SHORTCUT_COUNT,
  indexShortcut,
  numberKeyIndex,
} from "./index-shortcut"

export type ShortcutAction =
  | { kind: "exit-presentation" }
  | { kind: "select-variant"; variant: string }
  | { kind: "select-scenario"; scenario: string }
  | { kind: "previous-variant"; variant: string }
  | { kind: "step-viewport"; step: 1 | -1 }
  | { kind: "toggle-theme" }
  | { kind: "toggle-presentation" }
  | { kind: "toggle-view" }
  | { kind: "next-variant" }
  | { kind: "next-scenario" }

/** Bindings that override a browser or in-page default. */
const preventedKinds = new Set<ShortcutAction["kind"]>([
  "select-variant",
  "select-scenario",
  "previous-variant",
  "step-viewport",
  "toggle-presentation",
])

export function shortcutPreventsDefault(action: ShortcutAction | null) {
  return action !== null && preventedKinds.has(action.kind)
}

const indexKeys = Array.from({ length: INDEX_SHORTCUT_COUNT }, (_, index) =>
  indexShortcut(index)
)
  .filter((key): key is string => key !== undefined)
  .join(" ")

export const VARIANT_KEY_SHORTCUTS = `${indexKeys} V`
export const SCENARIO_KEY_SHORTCUTS = `${indexKeys.replace(/\S+/g, "Alt+$&")} S`

type ShortcutEvent = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "key" | "metaKey" | "repeat" | "shiftKey"
>

export type ShortcutContext = {
  experiment: ExperimentDefinition | null
  previousVariant: string
  immersive: boolean
}

/** Shared by the frame and parent so preventDefault matches the action that will run. */
export function resolveShortcut(
  event: ShortcutEvent,
  { experiment, previousVariant, immersive }: ShortcutContext
): ShortcutAction | null {
  if (event.repeat || event.metaKey || event.ctrlKey) return null

  if (event.key === "Escape") {
    return immersive ? { kind: "exit-presentation" } : null
  }

  const optionIndex = event.shiftKey ? null : numberKeyIndex(event.code)
  if (optionIndex !== null && experiment) {
    if (event.altKey) {
      const scenario = Object.keys(experiment.scenarios)[optionIndex]
      return scenario ? { kind: "select-scenario", scenario } : null
    }
    const variant = Object.keys(experiment.variants)[optionIndex]
    return variant ? { kind: "select-variant", variant } : null
  }

  if (
    event.code === "Period" &&
    !event.altKey &&
    !event.shiftKey &&
    experiment?.variants[previousVariant]
  ) {
    return { kind: "previous-variant", variant: previousVariant }
  }

  if (
    immersive &&
    !event.altKey &&
    !event.shiftKey &&
    (event.code === "BracketLeft" || event.code === "BracketRight")
  ) {
    return {
      kind: "step-viewport",
      step: event.code === "BracketRight" ? 1 : -1,
    }
  }

  if (event.altKey) return null

  switch (event.key.toLowerCase()) {
    case "d":
      return { kind: "toggle-theme" }
    case "f":
      return experiment ? { kind: "toggle-presentation" } : null
    case "c":
      return experiment ? { kind: "toggle-view" } : null
    case "v":
      return experiment ? { kind: "next-variant" } : null
    case "s":
      return experiment ? { kind: "next-scenario" } : null
    default:
      return null
  }
}
