export type OrderedVariant = {
  key: string
  /** Lineage id reviewers cite: `2` for a direction, `2a` for its first branch. */
  id: string
  /** Direction number; number keys select by it. */
  group: number
}

// One branch level: `2ab` and `02` are ordinary keys.
const LINEAGE_KEY = /^([1-9]\d*)([a-z]?)$/

/**
 * Directions in number order, each followed by its branches. Declaration order
 * can't be trusted: JS lists integer-like keys (`1`, `3`) before `2a`. Other
 * keys become directions after the highest number. Rank before hiding so ids
 * stay put.
 */
export function orderVariants(
  variants: Record<string, unknown>
): OrderedVariant[] {
  const parsed = Object.keys(variants).map((key) => {
    const match = LINEAGE_KEY.exec(key)
    return {
      key,
      group: match ? Number(match[1]) : 0,
      branch: match?.[2] ?? "",
    }
  })
  let next = Math.max(0, ...parsed.map((variant) => variant.group))
  return parsed
    .map((variant) =>
      variant.group ? variant : { ...variant, group: (next += 1) }
    )
    .sort((a, b) => a.group - b.group || a.branch.localeCompare(b.branch))
    .map(({ key, group, branch }) => ({ key, id: `${group}${branch}`, group }))
}

/** The group's first variant, or the one after `current` when it is already in the group. */
export function cycleGroup(
  order: readonly OrderedVariant[],
  group: number,
  current: string
) {
  const members = order.filter((variant) => variant.group === group)
  const index = members.findIndex((variant) => variant.key === current)
  return members[(index + 1) % members.length]?.key
}
