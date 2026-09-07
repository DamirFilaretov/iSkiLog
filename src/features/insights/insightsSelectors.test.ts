import { describe, expect, it } from "vitest"

import { getSlalomLastNSets, getWeeklyStats } from "./insightsSelectors"
import { emptyNotes, type SkiSet } from "../../types/sets"

function slalomSet(args: {
  id: string
  date: string
  timeOfDay?: string | null
  buoys?: number | null
  ropeLength?: string
  speed?: string
}): SkiSet {
  return {
    id: args.id,
    event: "slalom",
    date: args.date,
    timeOfDay: args.timeOfDay ?? null,
    seasonId: null,
    isFavorite: false,
    notes: emptyNotes,
    data: {
      buoys: args.buoys ?? null,
      ropeLength: args.ropeLength ?? "",
      speed: args.speed ?? "",
      passesCount: null
    }
  }
}

function otherSet(id: string, date: string): SkiSet {
  return {
    id,
    event: "other",
    date,
    timeOfDay: null,
    seasonId: null,
    isFavorite: false,
    notes: emptyNotes,
    data: { name: "gym", duration: 30 }
  }
}

describe("getSlalomLastNSets", () => {
  it("returns one point per set for the most recent N slalom sets, oldest first", () => {
    const sets = [
      slalomSet({ id: "a", date: "2026-01-01" }),
      slalomSet({ id: "b", date: "2026-01-05" }),
      slalomSet({ id: "c", date: "2026-01-10" }),
      slalomSet({ id: "d", date: "2026-01-12" })
    ]

    const result = getSlalomLastNSets(sets, 3)

    expect(result).toHaveLength(3)
    expect(result.map(p => p.bestSet?.date)).toEqual([
      "2026-01-05",
      "2026-01-10",
      "2026-01-12"
    ])
  })

  it("ignores non-slalom sets", () => {
    const sets = [
      slalomSet({ id: "a", date: "2026-01-01" }),
      otherSet("b", "2026-01-02"),
      slalomSet({ id: "c", date: "2026-01-03" })
    ]

    const result = getSlalomLastNSets(sets, 10)

    expect(result.map(p => p.bestSet?.date)).toEqual(["2026-01-01", "2026-01-03"])
  })

  it("returns every slalom set when there are fewer than N", () => {
    const sets = [
      slalomSet({ id: "a", date: "2026-01-01" }),
      slalomSet({ id: "b", date: "2026-01-02" })
    ]

    expect(getSlalomLastNSets(sets, 14)).toHaveLength(2)
  })

  it("returns an empty array when there are no slalom sets", () => {
    expect(getSlalomLastNSets([otherSet("a", "2026-01-01")], 7)).toEqual([])
  })

  it("scores each bar from its own rope length and buoys", () => {
    const sets = [slalomSet({ id: "a", date: "2026-01-01", ropeLength: "14", buoys: 3 })]

    // rope index 2 (18, 16, 14) * 6 + 3 buoys
    expect(getSlalomLastNSets(sets, 7)[0].value).toBe(15)
  })

  it("orders sets on the same day by time of day", () => {
    const sets = [
      slalomSet({ id: "late", date: "2026-01-01", timeOfDay: "17:00", buoys: 1 }),
      slalomSet({ id: "early", date: "2026-01-01", timeOfDay: "08:00", buoys: 5 })
    ]

    const result = getSlalomLastNSets(sets, 2)

    expect(result.map(p => p.bestSet?.buoys)).toEqual([5, 1])
  })
})

describe("getWeeklyStats", () => {
  const now = new Date("2026-01-20T12:00:00")

  it("counts sets in the trailing 7-day window and the 7 days before it", () => {
    const sets = [
      slalomSet({ id: "t1", date: "2026-01-15" }),
      slalomSet({ id: "t2", date: "2026-01-15" }),
      slalomSet({ id: "t3", date: "2026-01-18" }),
      slalomSet({ id: "l1", date: "2026-01-10" }),
      slalomSet({ id: "old", date: "2026-01-05" })
    ]

    const stats = getWeeklyStats(sets, now)

    expect(stats.totalThisWeek).toBe(3)
    expect(stats.totalLastWeek).toBe(1)
  })

  it("reports zero for both weeks when there are no recent sets", () => {
    const stats = getWeeklyStats([slalomSet({ id: "old", date: "2025-11-01" })], now)

    expect(stats.totalThisWeek).toBe(0)
    expect(stats.totalLastWeek).toBe(0)
  })
})
