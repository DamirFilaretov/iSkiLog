import { useSetsStore } from "../../store/setsStore"
import { Trophy } from "lucide-react"

export default function SeasonSummaryCard() {
  const {
    setsHydrated,
    activeSeasonId,
    getTotalSetsForActiveSeason
  } = useSetsStore()

  const ready = setsHydrated && !!activeSeasonId
  const totalText = ready ? String(getTotalSetsForActiveSeason()) : "Loading..."
  const label = "Season Total:"

  return (
    <div className="bg-gradient-to-l from-blue-600 to-blue-500 rounded-xl p-4 mb-4 shadow-lg shadow-blue-500/20">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white text-sm font-medium">
            {label}
          </p>
          <p className="mt-1 text-white text-3xl font-semibold leading-none tracking-tight">
            {totalText}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/95 ring-1 ring-white/20">
          <Trophy className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}
