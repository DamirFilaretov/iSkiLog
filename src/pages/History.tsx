import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import HistoryHeader from "../components/history/HistoryHeader"
import TimeRangeTabs, { type RangeKey } from "../components/history/TimeRangeTabs"
import HistoryItem from "../components/history/HistoryItem"
import { useSetsStore } from "../store/setsStore"
import type { SkiSet } from "../types/sets"
import { updateSetFavoriteInDb } from "../data/setsUpdateDeleteApi"

function isRangeKey(value: string | null): value is RangeKey {
  return value === "day" || value === "week" || value === "month" || value === "season" || value === "all"
}

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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { sets, getActiveSeason, setsHydrated, setFavorite } = useSetsStore()

  const initialRange = isRangeKey(searchParams.get("range"))
    ? (searchParams.get("range") as RangeKey)
    : "day"

  const [range, setRange] = useState<RangeKey>(initialRange)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)
  const [togglingFavoriteIds, setTogglingFavoriteIds] = useState<Set<string>>(
    () => new Set()
  )

  useEffect(() => {
    const param = searchParams.get("range")
    if (isRangeKey(param) && param !== range) {
      setRange(param)
    }
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get("range") === range) return
    const next = new URLSearchParams(searchParams)
    next.set("range", range)
    setSearchParams(next, { replace: true })
  }, [range, searchParams, setSearchParams])

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
    const filteredByRange = filterByRange(range, listToFilter)
    const filtered = favoritesOnly
      ? filteredByRange.filter(setItem => setItem.isFavorite)
      : filteredByRange

    return [...filtered].sort((a, b) => {
      if (a.date > b.date) return -1
      if (a.date < b.date) return 1
      return 0
    })
  }, [range, listToFilter, favoritesOnly])

  const needsSeasonButMissing = range !== "all" && !activeSeason
  const seasonHasNoSets = range !== "all" && activeSeason && seasonOnlySets.length === 0

  const showLoading = !setsHydrated

  function handleToggleFavoritesFilter() {
    setFavoritesOnly(prev => {
      const next = !prev
      if (next && range === "day") {
        setRange("all")
      }
      return next
    })
  }

  async function handleToggleFavorite(setItem: SkiSet, nextValue: boolean) {
    const id = setItem.id
    if (togglingFavoriteIds.has(id)) return

    setFavoriteError(null)
    setTogglingFavoriteIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })

    setFavorite(id, nextValue)

    try {
      await updateSetFavoriteInDb({ id, isFavorite: nextValue })
    } catch (err) {
      console.error("Failed to update favourite", err)
      setFavorite(id, setItem.isFavorite)
      setFavoriteError("Failed to update favourite set. Please try again.")
    } finally {
      setTogglingFavoriteIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <HistoryHeader />
      <TimeRangeTabs
        value={range}
        onChange={setRange}
        favoritesOnly={favoritesOnly}
        onFavoritesToggle={handleToggleFavoritesFilter}
      />

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
        ) : seasonHasNoSets ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">No sets in this season</p>
            <p className="mt-1 text-sm text-gray-500">
              Your logged sets will appear here by date.
            </p>
            <button
              onClick={() => navigate("/add")}
              className="mt-4 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600"
            >
              Log a set
            </button>
          </div>
        ) : null}

        {favoriteError ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-red-600">{favoriteError}</p>
          </div>
        ) : null}

        {showLoading || needsSeasonButMissing || seasonHasNoSets ? null : filteredAndSorted.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">
              {favoritesOnly ? "No favourite sets in this range" : "No sets in this range"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {favoritesOnly
                ? "Try another filter or mark sets as favourites."
                : "Try a different time range or add a new set."}
            </p>
          </div>
        ) : (
          filteredAndSorted.map(setItem => (
            <HistoryItem
              key={setItem.id}
              set={setItem}
              onToggleFavorite={handleToggleFavorite}
              favoriteDisabled={togglingFavoriteIds.has(setItem.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
