import type { ComponentType } from "react"

import type { CanvasPreset } from "./lab-config"

export type ExperimentRenderProps = {
  variant: string
  scenario: string
  view: "focus" | "compare"
}

export type CanvasLayout = "centered" | "padded" | "full"

export type ExperimentVariant = {
  label: string
  notes?: string
  layout?: CanvasLayout
}

export type ExperimentDefinition = {
  metadata: {
    title: string
    description: string
    notes?: string
  }
  variants: Record<string, ExperimentVariant>
  scenarios: Record<string, { label: string; description?: string }>
  canvas?: {
    defaultPreset?: string
    presets?: readonly CanvasPreset[]
    layout?: CanvasLayout
  }
  render: ComponentType<ExperimentRenderProps>
}

const canvasLayouts = new Set<CanvasLayout>(["centered", "padded", "full"])

export function defineExperiment<const T extends ExperimentDefinition>(
  definition: T
) {
  return definition
}

export function isExperimentDefinition(
  value: unknown
): value is ExperimentDefinition {
  if (!value || typeof value !== "object") return false

  const candidate = value as Partial<ExperimentDefinition>
  const variants = Object.values(candidate.variants ?? {})
  return (
    typeof candidate.metadata?.title === "string" &&
    typeof candidate.metadata.description === "string" &&
    typeof candidate.variants === "object" &&
    candidate.variants !== null &&
    variants.length > 0 &&
    variants.every(
      (variant) =>
        typeof variant?.label === "string" &&
        (variant.layout === undefined || canvasLayouts.has(variant.layout))
    ) &&
    typeof candidate.scenarios === "object" &&
    candidate.scenarios !== null &&
    Object.keys(candidate.scenarios).length > 0 &&
    (candidate.canvas === undefined ||
      (typeof candidate.canvas === "object" &&
        candidate.canvas !== null &&
        (candidate.canvas.layout === undefined ||
          canvasLayouts.has(candidate.canvas.layout)))) &&
    typeof candidate.render === "function"
  )
}
