import { useNavigate } from "react-router-dom"
import { useSetsStore } from "../../store/setsStore"
import type { SkiSet } from "../../types/sets"

/**
 * Small helper for consistent event labels in the UI.
 */
function getEventLabel(event: SkiSet["event"]) {
  if (event === "slalom") return "Slalom"
  if (event === "tricks") return "Tricks"
  if (event === "jump") return "Jump"
  if (event === "cuts") return "Cuts"
  return "Other"
}

/**
 * Recent set preview card on Home.
 * In Milestone 2 it shows the most recently saved set from the local store.
 */
export default function RecentPreview() {
  const navigate = useNavigate()

  // Get the most recent set from the store.
  const { getRecentSet } = useSetsStore()
  const recent = getRecentSet()

  return (
    <div className="mt-auto mb-16">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-slate-900 text-lg">Recent</h2>

        <button onClick={() => navigate("/history")} className="text-sm text-blue-600">
          View All
        </button>
      </div>

      {/* If there are no sets yet, show an empty state instead of a fake card */}
      {!recent ? (
        <div className="bg-white rounded-2xl p-3.5 shadow-sm">
          <p className="text-sm font-medium text-slate-900">No sets yet</p>
          <p className="mt-1 text-xs text-slate-500">Add your first set to see it here.</p>
        </div>
      ) : (
        <button
          // Navigate to the real summary page for this specific set.
          onClick={() => navigate(`/set/${recent.id}`)}
          className="w-full text-left bg-white rounded-2xl p-3.5 shadow-sm"
        >
          <div>
            {/* Basic label based on event type */}
            <p className="text-sm font-medium text-slate-900">
              {getEventLabel(recent.event)} set
            </p>

            {/* For now we keep the subtitle simple and reliable */}
            <p className="text-xs text-slate-500">{recent.date}</p>
          </div>

          {/* Placeholder for now since we are not computing relative time yet */}
          <span className="text-xs text-slate-400">Latest</span>
        </button>
      )}
    </div>
  )
}
