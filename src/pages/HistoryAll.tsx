import { useMemo } from "react"
import { useNavigate } from "react-router-dom"

import HistoryItem from "../components/history/HistoryItem"
import { useSetsStore } from "../store/setsStore"
import { useFavoriteToggle } from "../hooks/useFavoriteToggle"

export default function HistoryAll() {
  const navigate = useNavigate()
  const { sets, setsHydrated } = useSetsStore()
  const { favoriteError, togglingFavoriteIds, handleToggleFavorite } = useFavoriteToggle()

  const sortedSets = useMemo(() => {
    return [...sets].sort((a, b) => {
      if (a.date > b.date) return -1
      if (a.date < b.date) return 1
      return 0
    })
  }, [sets])

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="px-4 pt-10 pb-4 bg-gray-100 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/history", { replace: true })}
            className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
          >
            {"\u2190"}
          </button>

          <div>
            <h1 className="text-xl font-semibold text-gray-900">All Sets</h1>
            <p className="text-sm text-gray-500">Complete training history</p>
          </div>
        </div>
      </div>

      <div className="mt-4 px-4 space-y-4 pb-6">
        {!setsHydrated ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">Loading sets</p>
            <p className="mt-1 text-sm text-gray-500">Fetching your complete history</p>
          </div>
        ) : null}

        {favoriteError ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-red-600">{favoriteError}</p>
          </div>
        ) : null}

        {setsHydrated && sortedSets.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">No sets yet</p>
            <p className="mt-1 text-sm text-gray-500">Add your first set to start tracking.</p>
          </div>
        ) : null}

        {setsHydrated
          ? sortedSets.map(setItem => (
              <HistoryItem
                key={setItem.id}
                set={setItem}
                onToggleFavorite={handleToggleFavorite}
                favoriteDisabled={togglingFavoriteIds.has(setItem.id)}
              />
            ))
          : null}
      </div>
    </div>
  )
}

