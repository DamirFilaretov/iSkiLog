import { describe, expect, it } from "vitest"
import { TRICK_CATALOG, searchTricks } from "./trickCatalog"

describe("trickCatalog", () => {
  it("filters tricks by case-insensitive search", () => {
    const results = searchTricks("bfl")
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(item => item.name.toLowerCase().includes("bfl"))).toBe(true)
  })
})
