export const EXPERIMENT_MANIFEST_VERSION = 1 as const

export type ExperimentManifest = {
  schemaVersion: typeof EXPERIMENT_MANIFEST_VERSION
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt?: string
  defaultCanvas?: string
  hiddenVariants?: string[]
}

export function isExperimentManifest(
  value: unknown
): value is ExperimentManifest {
  if (!value || typeof value !== "object") return false
  const manifest = value as Partial<ExperimentManifest>
  return (
    manifest.schemaVersion === EXPERIMENT_MANIFEST_VERSION &&
    typeof manifest.id === "string" &&
    typeof manifest.title === "string" &&
    manifest.title.trim().length > 0 &&
    typeof manifest.description === "string" &&
    typeof manifest.createdAt === "string" &&
    (manifest.updatedAt === undefined ||
      typeof manifest.updatedAt === "string") &&
    (manifest.defaultCanvas === undefined ||
      typeof manifest.defaultCanvas === "string") &&
    (manifest.hiddenVariants === undefined ||
      (Array.isArray(manifest.hiddenVariants) &&
        manifest.hiddenVariants.every((item) => typeof item === "string")))
  )
}

export function formatExperimentName(id: string) {
  return id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
