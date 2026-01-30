import { useSetsStore } from "../../store/setsStore"

export default function SeasonSummaryCard() {
  const { setsHydrated, activeSeasonId, getTotalSetsForActiveSeason } = useSetsStore()

  const ready = setsHydrated && !!activeSeasonId
  const totalText = ready ? String(getTotalSetsForActiveSeason()) : "Loading…"

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-3xl p-4 mb-4 shadow-lg shadow-blue-500/20">
      <p className="text-blue-100 text-sm mb-1">
          Total sets this season
        </p>

      <p className="text-white text-5xl tracking-tight">{totalText}</p>
    </div>
  )
}
