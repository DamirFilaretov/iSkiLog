import { useSetsStore } from "../../store/setsStore"

export default function SeasonSummaryCard() {
  const { setsHydrated, activeSeasonId, getTotalSetsForActiveSeason } = useSetsStore()

  const ready = setsHydrated && !!activeSeasonId
  const totalText = ready ? String(getTotalSetsForActiveSeason()) : "Loading…"

  return (
    <div className="mt-6 px-4">
      <div className="rounded-2xl bg-blue-600 p-6 shadow-md">
        <p className="text-sm text-white/80">
          Total sets this season
        </p>

        <p className="mt-2 text-4xl font-bold text-white">
          {totalText}
        </p>
      </div>
    </div>
  )
}
