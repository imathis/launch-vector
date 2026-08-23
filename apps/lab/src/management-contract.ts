import type { ExperimentManifest } from "./manifest.js"

export const LAB_MANAGEMENT_PREFIX = "/__vector_lab"
export const LAB_MANAGEMENT_HEADER = "x-vector-lab-management"

export type ExperimentState = "active" | "archived" | "trashed"

export type ManagedExperiment = {
  id: string
  slug: string
  state: ExperimentState
  manifest: ExperimentManifest
}

export type ExperimentInventory = {
  experiments: ManagedExperiment[]
}

export type ImportConflict = {
  conflict: true
  existing: ManagedExperiment
  incoming: {
    id: string
    slug: string
    title: string
  }
}

export type ImportSuccess = {
  ok: true
  experiment: ManagedExperiment
  replaced: boolean
}

export type ImportMode = "error" | "replace" | "copy"

export type ManagementError = {
  error: string
  code?: string
}
