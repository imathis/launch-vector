export const EXPERIMENT_MANIFEST_VERSION = 1 as const

export type ExperimentManifest = {
  schemaVersion: typeof EXPERIMENT_MANIFEST_VERSION
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt?: string
  defaultCanvas?: string
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
      typeof manifest.defaultCanvas === "string")
  )
}
