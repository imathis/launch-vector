import { defineLabConfig } from "@launch-vector/lab"

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
  presentation: {
    defaultViewport: "fluid",
    viewports: [
      { id: "mobile", label: "375", width: 375 },
      { id: "tablet", label: "768", width: 768 },
      { id: "desktop", label: "1280", width: 1280 },
      { id: "fluid", label: "Full", width: null },
    ],
  },
})
