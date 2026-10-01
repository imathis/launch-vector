import type { ExperimentManifest } from "./manifest.js"

export const LAB_MANAGEMENT_PREFIX = "/__vector_lab"
export const LAB_MANAGEMENT_HEADER = "x-vector-lab-management"

export const LAB_ENDPOINTS = {
  inventory: "/inventory",
  rename: "/rename",
  archive: "/archive",
  restore: "/restore",
  trash: "/trash",
  purge: "/purge",
  export: "/export",
  import: "/import",
  hideVariant: "/hide-variant",
  restoreHiddenVariants: "/restore-hidden-variants",
} as const

export const ARCHIVE_EXTENSION = ".vector-lab.zip"

/** Unanchored so it can double as an HTML `pattern`, which anchors on its own. */
export const SLUG_PATTERN = "[a-z0-9]+(?:-[a-z0-9]+)*"
export const SLUG_MAX_LENGTH = 64
export const TITLE_MAX_LENGTH = 200
const SLUG_REGEXP = new RegExp(`^${SLUG_PATTERN}$`)

export function isValidSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= SLUG_MAX_LENGTH &&
    SLUG_REGEXP.test(value)
  )
}

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

export const IMPORT_MODES = ["error", "replace", "copy"] as const
export type ImportMode = (typeof IMPORT_MODES)[number]

export function isImportMode(value: unknown): value is ImportMode {
  return IMPORT_MODES.includes(value as ImportMode)
}

export type ManagementError = {
  error: string
  code?: string
}
