import { describe, expect, test } from "bun:test"

import { labRoutes, parseLabRoute } from "../routes.js"

describe("Lab routes", () => {
  test("generates stable page and experiment paths", () => {
    expect(labRoutes.guide()).toBe("/")
    expect(labRoutes.add()).toBe("/new")
    expect(labRoutes.experiment("order-history")).toBe("/labs/order-history")
    expect(labRoutes.presentation("order-history")).toBe(
      "/labs/order-history/present"
    )
    expect(labRoutes.frame("order-history")).toBe("/labs/order-history/frame")
  })

  test("parses deep links and optional trailing slashes", () => {
    expect(parseLabRoute("/")).toEqual({ kind: "guide" })
    expect(parseLabRoute("/new/")).toEqual({ kind: "add" })
    expect(parseLabRoute("/labs/order-history/")).toEqual({
      kind: "experiment",
      experiment: "order-history",
      mode: "standard",
    })
    expect(parseLabRoute("/labs/order-history/present")).toEqual({
      kind: "experiment",
      experiment: "order-history",
      mode: "presentation",
    })
    expect(parseLabRoute("/labs/order-history/frame/")).toEqual({
      kind: "experiment",
      experiment: "order-history",
      mode: "frame",
    })
  })

  test("round trips encoded experiment names", () => {
    const href = labRoutes.experiment("résumé review")
    expect(parseLabRoute(href)).toEqual({
      kind: "experiment",
      experiment: "résumé review",
      mode: "standard",
    })
  })

  test("falls back to the guide for unknown or malformed paths", () => {
    expect(parseLabRoute("/missing")).toEqual({ kind: "guide" })
    expect(parseLabRoute("/labs/%E0%A4%A")).toEqual({ kind: "guide" })
  })
})
