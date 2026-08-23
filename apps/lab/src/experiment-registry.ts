import { isExperimentManifest, type ExperimentManifest } from "./manifest"

export type ExperimentModule = { default?: unknown }
export type ExperimentKind = "experiment" | "fixture"
export type ExperimentEntry = {
  id: string
  kind: ExperimentKind
  manifest?: ExperimentManifest
  load: () => Promise<ExperimentModule>
}

type ManifestModule = { default?: unknown }

const experimentModules = import.meta.glob<ExperimentModule>([
  "./experiments/*/index.tsx",
  "!./experiments/_template/index.tsx",
])
const fixtureModules = import.meta.glob<ExperimentModule>(
  "./fixtures/*/index.tsx"
)
const manifestModules = import.meta.glob<ManifestModule>(
  "./experiments/*/experiment.json",
  { eager: true }
)

function manifestFor(id: string) {
  const module = Object.entries(manifestModules).find(
    ([path]) => path.split("/").at(-2) === id
  )?.[1]
  return isExperimentManifest(module?.default) ? module.default : undefined
}

function entriesFor(
  modules: Record<string, () => Promise<ExperimentModule>>,
  kind: ExperimentKind
) {
  return Object.entries(modules).map<ExperimentEntry>(([path, load]) => {
    const id = path.split("/").at(-2) ?? path
    return {
      id,
      kind,
      manifest: kind === "experiment" ? manifestFor(id) : undefined,
      load,
    }
  })
}

export const experiments = [
  ...entriesFor(experimentModules, "experiment"),
  ...entriesFor(fixtureModules, "fixture"),
].sort((a, b) => a.id.localeCompare(b.id))

export const authoredExperiments = experiments.filter(
  (experiment) => experiment.kind === "experiment"
)

export const fixtureExperiments = experiments.filter(
  (experiment) => experiment.kind === "fixture"
)

export function experimentTitle(entry: ExperimentEntry) {
  return entry.manifest?.title ?? formatExperimentName(entry.id)
}

export function formatExperimentName(id: string) {
  return id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase())
}
