import { describe, expect, it } from "vitest"
import type { SkiSet } from "../../types/sets"
import {
  getAverageTournamentSpeedStep,
  nextTournamentSpeedStepByKph
} from "./slalomSpeedSteps"

function slalomSet(speed: string, ropeLength = "18", id = "slalom-1"): SkiSet {
  return {
    id,
    event: "slalom",
    date: "2026-02-22",
    seasonId: "season-2026",
    isFavorite: false,
    notes: "",
    data: {
      buoys: 6,
      ropeLength,
      speed,
      passesCount: 6
    }
  }
}

function tricksSet(id = "tricks-1"): SkiSet {
  return {
    id,
    event: "tricks",
    date: "2026-02-22",
    seasonId: "season-2026",
    isFavorite: false,
    notes: "",
    data: {
      duration: 20,
      trickType: "hands"
    }
  }
}

describe("slalom speed steps", () => {
  it("keeps exact step values unchanged", () => {
    expect(nextTournamentSpeedStepByKph(52)).toEqual({ kph: 52, mph: 32.3 })
  })

  it("rounds 51.4 kph up to 52", () => {
    expect(nextTournamentSpeedStepByKph(51.4)).toEqual({ kph: 52, mph: 32.3 })
  })

  it("caps values above max step to 58 kph", () => {
    expect(nextTournamentSpeedStepByKph(70)).toEqual({ kph: 58, mph: 36.0 })
  })

  it("raises values below min step to 28 kph", () => {
    expect(nextTournamentSpeedStepByKph(20)).toEqual({ kph: 28, mph: 17.4 })
  })

  it("returns null when there are no sets", () => {
    expect(getAverageTournamentSpeedStep([])).toBeNull()
  })

  it("ignores non-slalom sets", () => {
    const result = getAverageTournamentSpeedStep([tricksSet("t-1"), tricksSet("t-2")])
    expect(result).toBeNull()
  })

  it("ignores invalid slalom speed values", () => {
    const result = getAverageTournamentSpeedStep([
      slalomSet("", "18", "s-1"),
      slalomSet("abc", "18", "s-2")
    ])
    expect(result).toBeNull()
  })

  it("averages 49 and 52 kph to next valid step 52", () => {
    const result = getAverageTournamentSpeedStep([
      slalomSet("30.4", "18", "s-1"), // 49 kph step
      slalomSet("32.3", "18", "s-2") // 52 kph step
    ])
    expect(result).toEqual({ kph: 52, mph: 32.3 })
  })

  it("normalizes each set first, then averages", () => {
    const result = getAverageTournamentSpeedStep([
      slalomSet("31.9", "18", "s-1"), // ~51.3 kph -> 52 step
      slalomSet("32.3", "18", "s-2") // 52 step
    ])
    expect(result).toEqual({ kph: 52, mph: 32.3 })
  })

  it("uses the same step table for 16m and shorter ropes", () => {
    const result = getAverageTournamentSpeedStep([
      slalomSet("34.2", "16", "s-1"), // 55 step
      slalomSet("32.3", "13", "s-2") // 52 step
    ])
    expect(result).toEqual({ kph: 55, mph: 34.2 })
  })
})
