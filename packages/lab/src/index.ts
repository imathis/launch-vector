export { mountLab, type MountLabOptions } from "./mount"
export {
  defineExperiment,
  isExperimentDefinition,
  type CanvasLayout,
  type ExperimentDefinition,
  type ExperimentRenderProps,
  type ExperimentVariant,
} from "./experiment"
export {
  defineLabConfig,
  missingCanvasProperties,
  resolveThemeValue,
  type CanvasPreset,
  type LabConfig,
  type ThemeValue,
  type ViewportPreset,
} from "./lab-config"
export {
  createExperimentRegistry,
  experimentTitle,
  formatExperimentName,
  type ExperimentEntry,
  type ExperimentKind,
  type ExperimentModule,
} from "./experiment-registry"
export { isExperimentManifest, type ExperimentManifest } from "./manifest"
