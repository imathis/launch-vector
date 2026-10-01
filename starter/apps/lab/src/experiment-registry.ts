import {
  createExperimentRegistry,
  type ExperimentModule,
} from "@launch-vector/lab"

export const { experiments } = createExperimentRegistry({
  experimentModules: import.meta.glob<ExperimentModule>([
    "./experiments/*/index.tsx",
    "!./experiments/_*/index.tsx",
  ]),
  fixtureModules: import.meta.glob<ExperimentModule>(
    "./fixtures/*/index.tsx"
  ),
  manifestModules: import.meta.glob<ExperimentModule>(
    "./experiments/*/experiment.json",
    { eager: true }
  ),
})
