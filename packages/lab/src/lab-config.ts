export type ThemeValue = string | { light: string; dark: string }

export type CanvasPreset = {
  id: string
  label: string
  background: ThemeValue
  foreground: ThemeValue
  requiredProperties?: readonly string[]
}

export type ViewportPreset = {
  id: string
  label: string
  width: number | null
}

export type LabConfig = {
  canvas: {
    defaultPreset: string
    presets: readonly [CanvasPreset, ...CanvasPreset[]]
  }
  presentation: {
    defaultViewport: string
    viewports: readonly [ViewportPreset, ...ViewportPreset[]]
  }
}

export function defineLabConfig<const T extends LabConfig>(config: T): T {
  return config
}

export function resolveThemeValue(value: ThemeValue, theme: "light" | "dark") {
  return typeof value === "string" ? value : value[theme]
}

export function missingCanvasProperties(config: LabConfig) {
  if (typeof window === "undefined") return []
  const styles = getComputedStyle(document.documentElement)
  return config.canvas.presets
    .flatMap((preset) => preset.requiredProperties ?? [])
    .filter((property) => styles.getPropertyValue(property).trim() === "")
}
