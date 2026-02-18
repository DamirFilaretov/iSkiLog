// src/utils/countSets.test.ts
import { describe, it, expect } from "vitest"
import { countSets } from "./countSets"

describe("countSets", () => {
  it("returns 3 when array has 3 set objects", () => {
    const sets = [{}, {}, {}]

    expect(countSets(sets)).toBe(3)
  })
})
