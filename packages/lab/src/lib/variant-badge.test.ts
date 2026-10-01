import { describe, expect, test } from "bun:test"

import { isLineageVariantKey, variantBadge } from "./variant-badge.ts"

describe("variantBadge", () => {
  test("uses lineage keys so refinements stay 2a instead of 4", () => {
    expect(variantBadge("2", 4)).toBe("2")
    expect(variantBadge("2a", 4)).toBe("2a")
    expect(variantBadge("3b", 0)).toBe("3b")
    expect(isLineageVariantKey("2a")).toBe(true)
  })

  test("falls back to tab-order numbers for slug keys", () => {
    expect(variantBadge("focused", 0)).toBe("1")
    expect(variantBadge("compact-action", 2)).toBe("3")
    expect(isLineageVariantKey("focused")).toBe(false)
  })
})
