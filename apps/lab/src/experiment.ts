import type { ComponentType } from "react"

export type ExperimentRenderProps = {
  variant: string
  scenario: string
}

export type ExperimentDefinition = {
  metadata: {
    title: string
    description: string
    notes?: string
  }
  variants: Record<string, { label: string; notes?: string }>
  scenarios: Record<string, { label: string; description?: string }>
  render: ComponentType<ExperimentRenderProps>
}

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
  return (
    typeof candidate.metadata?.title === "string" &&
    typeof candidate.metadata.description === "string" &&
    typeof candidate.variants === "object" &&
    candidate.variants !== null &&
    Object.keys(candidate.variants).length > 0 &&
    typeof candidate.scenarios === "object" &&
    candidate.scenarios !== null &&
    Object.keys(candidate.scenarios).length > 0 &&
    typeof candidate.render === "function"
  )
}
