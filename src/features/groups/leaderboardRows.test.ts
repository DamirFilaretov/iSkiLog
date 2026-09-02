import { describe, expect, it } from "vitest"

import type { LeaderboardRow } from "../../types/groups"
import { shapeLeaderboardRows } from "./leaderboardRows"

function row(over: Partial<LeaderboardRow> = {}): LeaderboardRow {
  return {
    membershipId: "m1",
    memberName: "Skier",
    isSelf: false,
    slalomCount: 0,
    tricksCount: 0,
    jumpCount: 0,
    otherCount: 0,
    totalCount: 0,
    ...over
  }
}

describe("shapeLeaderboardRows", () => {
  it("keeps the server order and numbers ranks from one", () => {
    const shaped = shapeLeaderboardRows([
      row({ membershipId: "a", totalCount: 14, slalomCount: 14 }),
      row({ membershipId: "b", totalCount: 11, tricksCount: 11 }),
      row({ membershipId: "c", totalCount: 0 })
    ])
    expect(shaped.map(r => [r.membershipId, r.rank])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3]
    ])
  })

  it("omits zero disciplines and keeps SL·TR·JP·OT order, each tagged with its event", () => {
    const [shaped] = shapeLeaderboardRows([
      row({ totalCount: 14, slalomCount: 8, tricksCount: 0, jumpCount: 2, otherCount: 4 })
    ])
    expect(shaped.breakdown).toEqual([
      { label: "SL", event: "slalom", count: 8 },
      { label: "JP", event: "jump", count: 2 },
      { label: "OT", event: "other", count: 4 }
    ])
  })

  it("the breakdown counts sum to the total", () => {
    const [shaped] = shapeLeaderboardRows([
      row({ totalCount: 10, slalomCount: 3, tricksCount: 5, jumpCount: 1, otherCount: 1 })
    ])
    expect(shaped.breakdown.reduce((sum, part) => sum + part.count, 0)).toBe(shaped.totalCount)
  })

  it("marks a member with nothing this window and gives them an empty breakdown", () => {
    const [shaped] = shapeLeaderboardRows([row({ memberName: "Quiet", totalCount: 0 })])
    expect(shaped.hasSets).toBe(false)
    expect(shaped.breakdown).toEqual([])
  })

  it("carries identity fields through unchanged", () => {
    const [shaped] = shapeLeaderboardRows([
      row({ membershipId: "mine", memberName: "Me", isSelf: true, totalCount: 1, slalomCount: 1 })
    ])
    expect(shaped.membershipId).toBe("mine")
    expect(shaped.memberName).toBe("Me")
    expect(shaped.isSelf).toBe(true)
    expect(shaped.hasSets).toBe(true)
  })

  it("returns an empty array for an empty board", () => {
    expect(shapeLeaderboardRows([])).toEqual([])
  })
})
