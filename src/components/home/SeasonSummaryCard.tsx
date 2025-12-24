import { useSetsStore } from "../../store/setsStore"

/**
 * Home season summary card.
 * Shows total sets for the active season
 * without exposing season name.
 */
export default function SeasonSummaryCard() {
  const { getTotalSetsForActiveSeason } = useSetsStore()

  const totalSets = getTotalSetsForActiveSeason()

  return (
    <div className="mt-6 px-4">
      <div className="rounded-2xl bg-blue-600 p-6 shadow-md">
        <p className="text-sm text-white/80">
          Total sets this season
        </p>

        <p className="mt-2 text-4xl font-bold text-white">
          {totalSets}
        </p>
      </div>
    </div>
  )
}
