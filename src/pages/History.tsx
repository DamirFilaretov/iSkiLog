import { useMemo, useState } from "react"

import HistoryHeader from "../components/history/HistoryHeader"
import TimeRangeTabs, { type RangeKey } from "../components/history/TimeRangeTabs"
import HistoryItem from "../components/history/HistoryItem"
import { useSetsStore } from "../store/setsStore"
import type { SkiSet } from "../types/sets"

/**
 * Returns today's LOCAL calendar date as "YYYY-MM-DD".
 * Do not use toISOString here because that is UTC and can shift the day.
 */
function todayLocalIsoDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Convert ISO "YYYY-MM-DD" to a local Date without timezone shifting.
 * Useful for week and month comparisons.
 */
function isoToLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/**
 * Filter sets based on selected range.
 */
function filterByRange(range: RangeKey, sets: SkiSet[]) {
  const todayIso = todayLocalIsoDate()

  // Day means calendar today only.
  if (range === "day") {
    return sets.filter(s => s.date === todayIso)
  }

  // Week means last 7 calendar days including today.
  if (range === "week") {
    const today = isoToLocalDate(todayIso)
    const start = new Date(today)
    start.setDate(start.getDate() - 6)

    return sets.filter(s => {
      const d = isoToLocalDate(s.date)
      return d >= start && d <= today
    })
  }

  // Month means same month and year as today.
  if (range === "month") {
    const t = isoToLocalDate(todayIso)
    const tMonth = t.getMonth()
    const tYear = t.getFullYear()

    return sets.filter(s => {
      const d = isoToLocalDate(s.date)
      return d.getMonth() === tMonth && d.getFullYear() === tYear
    })
  }

  // Season shows everything in Milestone 2.
  return sets
}

export default function History() {
  const { sets } = useSetsStore()

  // Controlled by History so we can filter data.
  const [range, setRange] = useState<RangeKey>("day")

  const filteredAndSorted = useMemo(() => {
    const filtered = filterByRange(range, sets)

    // Sort newest dates first.
    return [...filtered].sort((a, b) => {
      if (a.date > b.date) return -1
      if (a.date < b.date) return 1
      return 0
    })
  }, [range, sets])

  return (
    <div className="min-h-screen bg-gray-100">
      <HistoryHeader />
      <TimeRangeTabs value={range} onChange={setRange} />

      <div className="mt-4 px-4 space-y-4 pb-6">
        {filteredAndSorted.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">No sets in this range</p>
            <p className="mt-1 text-sm text-gray-500">
              Try a different time range or add a new set.
            </p>
          </div>
        ) : (
          filteredAndSorted.map(set => <HistoryItem key={set.id} set={set} />)
        )}
      </div>
    </div>
  )
}
