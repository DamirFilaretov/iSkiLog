import { useSetsStore } from "../../store/setsStore"

/**
 * Home season summary card.
 * In Milestone 2 this shows the total number of saved sets in local memory.
 */
export default function SeasonSummaryCard() {
  // Read the store so the UI updates automatically when sets change.
  const { getTotalSets } = useSetsStore()

  // Derived value from store.
  const totalSets = getTotalSets()

  return (
    <div className="mt-6 px-4">
      <div className="rounded-2xl bg-blue-600 p-6 shadow-md">
        <p className="text-sm text-white/80">Total sets this season</p>

        {/* This number will increase when you press Save Set on Add Set */}
        <p className="mt-2 text-4xl font-bold text-white">{totalSets}</p>
      </div>
    </div>
  )
}
