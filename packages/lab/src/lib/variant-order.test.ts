import { describe, expect, test } from "bun:test"

import type { ExperimentDefinition } from "../experiment.ts"
import { resolveShortcut } from "./shortcuts.ts"
import { orderVariants } from "./variant-order.ts"

function experimentWith(keys: readonly string[]): ExperimentDefinition {
  return {
    metadata: { title: "Test", description: "Test" },
    variants: Object.fromEntries(keys.map((key) => [key, { label: key }])),
    scenarios: { default: { label: "Default" } },
    render: () => null,
  }
}

function ids(keys: readonly string[]) {
  return orderVariants(experimentWith(keys).variants).map(({ id, key }) =>
    id === key ? id : `${id}=${key}`
  )
}

function pressDigit(
  digit: number,
  keys: readonly string[],
  currentVariant: string,
  hidden: readonly string[] = []
) {
  const experiment = experimentWith(keys)
  const action = resolveShortcut(
    {
      code: `Digit${digit}`,
      key: String(digit),
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      repeat: false,
      shiftKey: false,
    },
    {
      experiment,
      variants: orderVariants(experiment.variants).filter(
        (variant) => !hidden.includes(variant.key)
      ),
      currentVariant,
      previousVariant: "",
      immersive: false,
    }
  )
  return action?.kind === "select-variant" ? action.variant : null
}

describe("orderVariants", () => {
  test("branches follow their direction even though JS lists 3 before 2a", () => {
    expect(ids(["1", "2", "3", "2b", "2a"])).toEqual([
      "1",
      "2",
      "2a",
      "2b",
      "3",
    ])
  })

  test("other keys become directions after the highest number", () => {
    expect(ids(["quiet", "strong"])).toEqual(["1=quiet", "2=strong"])
    expect(ids(["1", "focus", "3a", "2ab", "02"])).toEqual([
      "1",
      "3a",
      "4=focus",
      "5=2ab",
      "6=02",
    ])
  })
})

describe("number keys", () => {
  const keys = ["1", "2", "2a", "2b", "3"]

  test("a digit opens its direction, then repeats through its branches", () => {
    expect(pressDigit(2, keys, "1")).toBe("2")
    expect(pressDigit(2, keys, "2")).toBe("2a")
    expect(pressDigit(2, keys, "2a")).toBe("2b")
    expect(pressDigit(2, keys, "2b")).toBe("2")
    expect(pressDigit(3, keys, "2a")).toBe("3")
    expect(pressDigit(1, keys, "1")).toBe("1")
    expect(pressDigit(2, keys, "")).toBe("2")
    expect(pressDigit(4, keys, "1")).toBeNull()
  })

  test("digits skip hidden variants without renumbering the rest", () => {
    expect(pressDigit(2, keys, "1", ["2"])).toBe("2a")
    expect(pressDigit(2, keys, "2b", ["2"])).toBe("2a")
    expect(pressDigit(3, keys, "1", ["1"])).toBe("3")
    expect(pressDigit(1, keys, "2", ["1"])).toBeNull()
  })
})
