import { describe, expect, it } from "vitest"
import { TRICK_CATALOG, searchTricks } from "./trickCatalog"

describe("trickCatalog", () => {
  it("keeps catalog sorted by trick name", () => {
    const allNames = TRICK_CATALOG.map(item => item.name)
    const manuallySorted = [...allNames].sort((a, b) => a.localeCompare(b))
    expect(allNames).toEqual(manuallySorted)
  })

  it("filters tricks by case-insensitive search", () => {
    const results = searchTricks("wflip")
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(item => item.name.toLowerCase().includes("wflip"))).toBe(true)
  })
})

