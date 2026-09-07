import type { LeaderboardRow } from "../../types/groups"

/**
 * Shapes the server's leaderboard rows for display.
 *
 * The order is the server's and is left untouched — ranked by total descending,
 * ties by name, members with nothing logged at the bottom (D7, D11, EC-10).
 * This adds only what the row component needs: a 1-based rank, the non-zero
 * discipline breakdown in a fixed order, and whether the member logged anything
 * at all.
 *
 * Rank uses standard competition ranking: members with equal totals share the
 * same rank, and the next distinct total skips ahead by the number tied
 * (1, 2, 2, 4 — not 1, 2, 2, 3). Relies on the server already having grouped
 * equal totals together.
 */

export type BreakdownLabel = "SL" | "TR" | "JP" | "OT"

export type BreakdownEvent = "slalom" | "tricks" | "jump" | "other"

export type BreakdownPart = { label: BreakdownLabel; event: BreakdownEvent; count: number }

export type ShapedLeaderboardRow = LeaderboardRow & {
  /** 1-based position in the server's ordering. */
  rank: number
  /** Disciplines the member logged in the window, zeros omitted, always SL·TR·JP·OT order. */
  breakdown: BreakdownPart[]
  /** False when the member logged nothing this window — the row reads "no sets this period". */
  hasSets: boolean
}

const ORDER: { label: BreakdownLabel; event: BreakdownEvent; key: keyof LeaderboardRow }[] = [
  { label: "SL", event: "slalom", key: "slalomCount" },
  { label: "TR", event: "tricks", key: "tricksCount" },
  { label: "JP", event: "jump", key: "jumpCount" },
  { label: "OT", event: "other", key: "otherCount" }
]

export function shapeLeaderboardRows(rows: LeaderboardRow[]): ShapedLeaderboardRow[] {
  let rank = 0
  let previousCount: number | null = null

  return rows.map((row, index) => {
    if (previousCount === null || row.totalCount !== previousCount) {
      rank = index + 1
      previousCount = row.totalCount
    }

    return {
      ...row,
      rank,
      breakdown: ORDER.map(part => ({
        label: part.label,
        event: part.event,
        count: row[part.key] as number
      })).filter(part => part.count > 0),
      hasSets: row.totalCount > 0
    }
  })
}
