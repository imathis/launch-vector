import { indexShortcut } from "./index-shortcut"

/** Lineage ids reviewers cite: `1`, `2`, `2a`, `3b`. */
const LINEAGE_KEY = /^\d+[a-z]*$/i

export function isLineageVariantKey(key: string) {
  return LINEAGE_KEY.test(key)
}

export function variantBadge(key: string, index: number) {
  return isLineageVariantKey(key) ? key : (indexShortcut(index) ?? "")
}
