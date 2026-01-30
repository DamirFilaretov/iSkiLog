import { useMemo, useState } from "react"

import HistoryHeader from "../components/history/HistoryHeader"
import TimeRangeTabs, { type RangeKey } from "../components/history/TimeRangeTabs"
import HistoryItem from "../components/history/HistoryItem"
import { useSetsStore } from "../store/setsStore"
import type { SkiSet } from "../types/sets"

function todayLocalIsoDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function isoToLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/**
 * Filter sets based on selected range.
 * For day, week, month, season: input should already be season filtered.
 * For all: we ignore season filtering and show everything.
 */
function filterByRange(range: RangeKey, sets: SkiSet[]) {
  const todayIso = todayLocalIsoDate()

  if (range === "day") {
    return sets.filter(s => s.date === todayIso)
  }

  if (range === "week") {
    const today = isoToLocalDate(todayIso)
    const start = new Date(today)
    start.setDate(start.getDate() - 6)

    return sets.filter(s => {
      const d = isoToLocalDate(s.date)
      return d >= start && d <= today
    })
  }

  if (range === "month") {
    const t = isoToLocalDate(todayIso)
    const tMonth = t.getMonth()
    const tYear = t.getFullYear()

    return sets.filter(s => {
      const d = isoToLocalDate(s.date)
      return d.getMonth() === tMonth && d.getFullYear() === tYear
    })
  }

  if (range === "season") {
    return sets
  }

  return sets
}

export default function History() {
  const { sets, getActiveSeason, setsHydrated } = useSetsStore()

  const [range, setRange] = useState<RangeKey>("day")

  const activeSeason = getActiveSeason()

  const seasonOnlySets = useMemo(() => {
    if (!activeSeason) return []

    // Season membership is now stored on the set itself.
    return sets.filter(s => {
      return s.seasonId === activeSeason.id
    })
  }, [sets, activeSeason])

  const listToFilter = useMemo(() => {
    if (range === "all") return sets
    return seasonOnlySets
  }, [range, sets, seasonOnlySets])

  const filteredAndSorted = useMemo(() => {
    const filtered = filterByRange(range, listToFilter)

    return [...filtered].sort((a, b) => {
      if (a.date > b.date) return -1
      if (a.date < b.date) return 1
      return 0
    })
  }, [range, listToFilter])

  const needsSeasonButMissing = range !== "all" && !activeSeason

  const showLoading = !setsHydrated

  return (
    <div className="min-h-screen bg-gray-100">
      <HistoryHeader />
      <TimeRangeTabs value={range} onChange={setRange} />

      <div className="mt-4 px-4 space-y-4 pb-6">
        {showLoading ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">Loading history</p>
            <p className="mt-1 text-sm text-gray-500">
              Fetching your sets
            </p>
          </div>
        ) : needsSeasonButMissing ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">No active season</p>
            <p className="mt-1 text-sm text-gray-500">
              Go to Settings to view season details.
            </p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
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
