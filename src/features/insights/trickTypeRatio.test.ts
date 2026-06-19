import { describe, expect, it } from "vitest"

import { getTrickTypeRatioItems } from "./trickTypeRatio"

describe("getTrickTypeRatioItems", () => {
  it("counts hands, toes, and mixed as separate buckets", () => {
    const result = getTrickTypeRatioItems([
      { trickType: "hands" },
      { trickType: "toes" },
      { trickType: "mixed" },
      { trickType: "mixed" },
    ])

    expect(result).toEqual([
      { trickType: "hands", label: "Hands", count: 1, percentage: 25 },
      { trickType: "toes", label: "Toes", count: 1, percentage: 25 },
      { trickType: "mixed", label: "Mixed", count: 2, percentage: 50 },
    ])
  })

  it("returns zero percentages when there are no tricks sets", () => {
    const result = getTrickTypeRatioItems([])

    expect(result).toEqual([
      { trickType: "hands", label: "Hands", count: 0, percentage: 0 },
      { trickType: "toes", label: "Toes", count: 0, percentage: 0 },
      { trickType: "mixed", label: "Mixed", count: 0, percentage: 0 },
    ])
  })

  it("rounds displayed percentages so non-empty ratios sum to 100", () => {
    const result = getTrickTypeRatioItems([
      { trickType: "hands" },
      { trickType: "toes" },
      { trickType: "mixed" },
    ])

    expect(result.map(item => item.percentage)).toEqual([34, 33, 33])
    expect(result.reduce((sum, item) => sum + item.percentage, 0)).toBe(100)
  })
})
