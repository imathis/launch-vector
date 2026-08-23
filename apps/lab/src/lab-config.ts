export type ThemeValue = string | { light: string; dark: string }

export type CanvasPreset = {
  id: string
  label: string
  background: ThemeValue
  foreground: ThemeValue
  requiredProperties?: readonly string[]
}

export type LabConfig = {
  canvas: {
    defaultPreset: string
    presets: readonly [CanvasPreset, ...CanvasPreset[]]
  }
}

export function defineLabConfig<const T extends LabConfig>(config: T): T {
  return config
}

// Project-owned catalog. Keep the default mapped in lab-theme.css, or add named
// product surfaces backed by token-only styles shared with the destination app.
export const labConfig = defineLabConfig({
  canvas: {
    defaultPreset: "app",
    presets: [
      {
        id: "app",
        label: "App background",
        background: "var(--lab-app-background, var(--background))",
        foreground: "var(--lab-app-foreground, var(--foreground))",
        requiredProperties: ["--lab-app-background", "--lab-app-foreground"],
      },
    ],
  },
} satisfies LabConfig)

export function resolveThemeValue(value: ThemeValue, theme: "light" | "dark") {
  return typeof value === "string" ? value : value[theme]
}

export function missingCanvasProperties() {
  if (typeof window === "undefined") return []
  const styles = getComputedStyle(document.documentElement)
  return labConfig.canvas.presets
    .flatMap((preset) => preset.requiredProperties ?? [])
    .filter((property) => styles.getPropertyValue(property).trim() === "")
}
