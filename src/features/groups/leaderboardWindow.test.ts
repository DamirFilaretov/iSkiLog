import { describe, expect, it } from "vitest"

import { formatBoardWindow } from "./leaderboardWindow"

describe("formatBoardWindow", () => {
  it("shows a day range and one month name within a single month", () => {
    expect(formatBoardWindow("2026-08-25", "2026-08-31")).toBe("25–31 Aug")
  })

  it("names both months when the window spans two", () => {
    expect(formatBoardWindow("2026-08-28", "2026-09-03")).toBe("28 Aug – 3 Sep")
  })

  it("adds the year on both ends when the window crosses a year boundary", () => {
    expect(formatBoardWindow("2025-12-28", "2026-01-03")).toBe("28 Dec 2025 – 3 Jan 2026")
  })

  it("handles a 30-day window inside one month", () => {
    expect(formatBoardWindow("2026-06-01", "2026-06-30")).toBe("1–30 Jun")
  })

  it("returns null when either date is missing", () => {
    expect(formatBoardWindow(null, "2026-08-31")).toBeNull()
    expect(formatBoardWindow("2026-08-25", null)).toBeNull()
    expect(formatBoardWindow(null, null)).toBeNull()
  })
})
