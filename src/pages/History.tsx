import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { EventKey } from "../types/sets"

import HistoryHeader from "../components/history/HistoryHeader"
import TimeRangeTabs, { type RangeKey } from "../components/history/TimeRangeTabs"
import HistoryItem from "../components/history/HistoryItem"
import DateFieldNativeOverlay from "../components/date/DateFieldNativeOverlay"
import { useSetsStore } from "../store/setsStore"
import { useFavoriteToggle } from "../hooks/useFavoriteToggle"
import {
  daysAgoLocalIsoDate,
  filterByDateRange,
  todayLocalIsoDate
} from "../features/dateRange/dateRange"

export default function History() {
  const navigate = useNavigate()
  const { sets, getActiveSeason, setsHydrated } = useSetsStore()
  const [range, setRange] = useState<RangeKey>("day")
  const [eventFilter, setEventFilter] = useState<EventKey | "all">("all")
  const [customStart, setCustomStart] = useState(daysAgoLocalIsoDate(30))
  const [customEnd, setCustomEnd] = useState(todayLocalIsoDate())
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const { favoriteError, togglingFavoriteIds, handleToggleFavorite } = useFavoriteToggle()

  useEffect(() => {
    if (range !== "custom") return
    if (customStart && customEnd) return

    setCustomStart(daysAgoLocalIsoDate(30))
    setCustomEnd(todayLocalIsoDate())
  }, [range, customStart, customEnd])
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
    const filteredByRange = filterByDateRange(listToFilter, range, {
      customStart,
      customEnd
    })
    const filteredByEvent =
      eventFilter === "all"
        ? filteredByRange
        : filteredByRange.filter(setItem => setItem.event === eventFilter)
    const filtered = favoritesOnly
      ? filteredByEvent.filter(setItem => setItem.isFavorite)
      : filteredByEvent

    return [...filtered].sort((a, b) => {
      if (a.date > b.date) return -1
      if (a.date < b.date) return 1
      return 0
    })
  }, [range, listToFilter, eventFilter, favoritesOnly, customStart, customEnd])

  const customRangeInvalid = range === "custom" && customStart > customEnd

  const needsSeasonButMissing = range !== "all" && !activeSeason
  const seasonHasNoSets = range !== "all" && activeSeason && seasonOnlySets.length === 0

  const showLoading = !setsHydrated

  function handleToggleFavoritesFilter() {
    setFavoritesOnly(prev => !prev)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <HistoryHeader />
      <TimeRangeTabs
        value={range}
        onChange={setRange}
        eventFilter={eventFilter}
        onEventFilterChange={setEventFilter}
        favoritesOnly={favoritesOnly}
        onFavoritesToggle={handleToggleFavoritesFilter}
      />
      {range === "custom" ? (
        <div className="px-4 mt-3 flex flex-col gap-3 lg:grid lg:grid-cols-2">
          <DateFieldNativeOverlay
            value={customStart}
            onChange={setCustomStart}
            label="Start date"
            placeholder="Select start date"
            variant="insight"
          />
          <DateFieldNativeOverlay
            value={customEnd}
            onChange={setCustomEnd}
            label="End date"
            placeholder="Select end date"
            variant="insight"
          />
        </div>
      ) : null}

      <div className="mt-4 px-4 space-y-4 pb-6">
        {customRangeInvalid ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-red-600">
              Start date must be before end date.
            </p>
          </div>
        ) : null}

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

        {showLoading || needsSeasonButMissing || seasonHasNoSets || customRangeInvalid ? null : filteredAndSorted.length === 0 ? (
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
