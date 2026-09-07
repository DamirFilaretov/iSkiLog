/**
 * Formats the leaderboard window for the board header.
 *
 * The dates come from the server (D8) as `YYYY-MM-DD` calendar dates — the
 * client never computes them. This module only turns that pair into a label
 * like `25–31 Aug`. The year is shown only when the window straddles a year
 * boundary; within one year it is left off, matching the header mockup.
 */

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

// en-US keeps every month at three letters ("Sep", not en-GB's "Sept").
const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" })

function day(date: Date): number {
  return date.getUTCDate()
}

function monthDay(date: Date): string {
  return `${day(date)} ${monthFmt.format(date)}`
}

function monthDayYear(date: Date): string {
  return `${monthDay(date)} ${date.getUTCFullYear()}`
}

/**
 * `25–31 Aug` within a month, `28 Aug – 3 Sep` across months, and
 * `28 Dec 2025 – 3 Jan 2026` across a year. Returns `null` when either date is
 * missing — the header then just omits the range.
 */
export function formatBoardWindow(start: string | null, end: string | null): string | null {
  if (!start || !end) return null

  const s = parse(start)
  const e = parse(end)

  const sameYear = s.getUTCFullYear() === e.getUTCFullYear()
  if (!sameYear) {
    return `${monthDayYear(s)} – ${monthDayYear(e)}`
  }

  const sameMonth = s.getUTCMonth() === e.getUTCMonth()
  if (sameMonth) {
    return `${day(s)}–${day(e)} ${monthFmt.format(e)}`
  }

  return `${monthDay(s)} – ${monthDay(e)}`
}
