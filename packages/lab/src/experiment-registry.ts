import {
  formatExperimentName,
  isExperimentManifest,
  type ExperimentManifest,
} from "./manifest"

export type ExperimentModule = { default?: unknown }
export type ExperimentKind = "experiment" | "fixture"
export type ExperimentEntry = {
  id: string
  kind: ExperimentKind
  manifest?: ExperimentManifest
  load: () => Promise<ExperimentModule>
}

type ManifestModule = { default?: unknown }

export { formatExperimentName }

export function experimentTitle(entry: ExperimentEntry) {
  return entry.manifest?.title ?? formatExperimentName(entry.id)
}

function manifestFor(
  id: string,
  manifestModules: Record<string, ManifestModule>
) {
  const module = Object.entries(manifestModules).find(
    ([path]) => path.split("/").at(-2) === id
  )?.[1]
  return isExperimentManifest(module?.default) ? module.default : undefined
}

function entriesFor(
  modules: Record<string, () => Promise<ExperimentModule>>,
  kind: ExperimentKind,
  manifestModules: Record<string, ManifestModule>
) {
  return Object.entries(modules).map<ExperimentEntry>(([path, load]) => {
    const id = path.split("/").at(-2) ?? path
    return {
      id,
      kind,
      manifest:
        kind === "experiment" ? manifestFor(id, manifestModules) : undefined,
      load,
    }
  })
}

function firstPerId(entries: readonly ExperimentEntry[]) {
  const claimed = new Set<string>()
  const unique: ExperimentEntry[] = []
  for (const entry of entries) {
    if (claimed.has(entry.id)) continue
    claimed.add(entry.id)
    unique.push(entry)
  }
  return unique
}

export function createExperimentRegistry({
  experimentModules,
  fixtureModules,
  manifestModules,
}: {
  experimentModules: Record<string, () => Promise<ExperimentModule>>
  fixtureModules: Record<string, () => Promise<ExperimentModule>>
  manifestModules: Record<string, ManifestModule>
}) {
  const experiments = firstPerId([
    ...entriesFor(experimentModules, "experiment", manifestModules),
    ...entriesFor(fixtureModules, "fixture", manifestModules),
  ]).sort((a, b) => a.id.localeCompare(b.id))

  return {
    experiments,
    authoredExperiments: experiments.filter(
      (experiment) => experiment.kind === "experiment"
    ),
    fixtureExperiments: experiments.filter(
      (experiment) => experiment.kind === "fixture"
    ),
  }
}
