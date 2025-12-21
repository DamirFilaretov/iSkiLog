import { useNavigate } from "react-router-dom"
import type { SkiSet } from "../../types/sets"

/**
 * UI helpers for icons and labels.
 * Keep these here so HistoryItem stays self contained.
 */
function eventIcon(event: SkiSet["event"]) {
  if (event === "slalom") return "🌊"
  if (event === "tricks") return "🏆"
  if (event === "jump") return "✈️"
  if (event === "cuts") return "💨"
  return "➕"
}

function eventLabel(event: SkiSet["event"]) {
  if (event === "slalom") return "Slalom"
  if (event === "tricks") return "Tricks"
  if (event === "jump") return "Jump"
  if (event === "cuts") return "Cuts"
  return "Other"
}

/**
 * Build a short highlight line that depends on the event type.
 * This replaces the old hardcoded "4 @ 11.25m" text.
 */
function highlight(set: SkiSet) {
  if (set.event === "slalom") {
    // Buoys is numeric. If missing, show a dash.
    const buoys = set.data.buoys === null ? "—" : String(set.data.buoys)
    return buoys
  }

  if (set.event === "tricks") {
    return set.data.duration === null ? "—" : `${set.data.duration} min`
  }

  if (set.event === "jump") {
    const attempts = set.data.attempts === null ? "—" : String(set.data.attempts)
    return `${attempts} attempts`
  }

  if (set.event === "cuts") {
    const passes = set.data.passes === null ? "—" : String(set.data.passes)
    return `${passes} passes`
  }

  // Other
  return set.data.name || "—"
}

type Props = {
  // Pass the real set from the store so this component can render real info.
  set: SkiSet
}

export default function HistoryItem({ set }: Props) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      // Navigate to the summary for this exact set id.
      onClick={() => navigate(`/set/${set.id}`)}
      className="w-full text-left flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm active:scale-95 transition"
    >
      <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
        {eventIcon(set.event)}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{eventLabel(set.event)}</p>

          {/* We do not store time yet, so we avoid fake "2h ago" labels. */}
          <span className="text-xs text-gray-400">{set.date}</span>
        </div>

        <p className="mt-1 text-sm font-medium text-blue-600">{highlight(set)}</p>

        <p className="mt-1 text-sm text-gray-500">
          {/* If notes are empty, show a short placeholder. */}
          {set.notes.trim() ? set.notes : "No notes."}
        </p>
      </div>
    </button>
  )
}
