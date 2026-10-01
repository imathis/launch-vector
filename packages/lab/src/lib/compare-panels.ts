export const COMPARE_PANELS = [
  { side: "left", index: 0, label: "Left variant" },
  { side: "right", index: 1, label: "Right variant" },
] as const

export type ComparePanelIndex = 0 | 1
export type ComparePanelSide = (typeof COMPARE_PANELS)[number]["side"]
