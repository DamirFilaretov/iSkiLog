import { useSetsStore } from "../../store/setsStore"

export default function SeasonSummaryCard() {
  const { setsHydrated, activeSeasonId, getTotalSetsForActiveSeason } = useSetsStore()

  const ready = setsHydrated && !!activeSeasonId
  const totalText = ready ? String(getTotalSetsForActiveSeason()) : "Loading…"

  return (
    <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl p-5 mb-4 shadow-lg shadow-blue-500/20">
      <p className="text-blue-100 text-sm">
        Total sets this season
      </p>

      <p className="mt-2 text-white text-4xl font-semibold tracking-tight">
        {totalText}
      </p>

      <p className="text-blue-100 text-xs">
        Total training sets
      </p>
    </div>
  )
}
