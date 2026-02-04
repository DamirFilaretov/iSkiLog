import { useNavigate } from "react-router-dom"
import type { SkiSet } from "../../types/sets"

/**
 * UI helpers for icons and labels.
 * Keep these here so HistoryItem stays self contained.
 */
function eventIcon(set: SkiSet) {
  if (set.event === "slalom") return "🌉"
  if (set.event === "tricks") return "🏆"
  if (set.event === "jump") {
    return set.data.subEvent === "cuts" ? "💨" : "✈️"
  }
  return "➕"
}

function eventLabel(set: SkiSet) {
  if (set.event === "slalom") return "Slalom"
  if (set.event === "tricks") return "Tricks"
  if (set.event === "jump") {
    return set.data.subEvent === "cuts" ? "Cuts" : "Jump"
  }
  return "Other"
}

/**
 * Build a short highlight line that depends on the event type.
 */
function highlight(set: SkiSet) {
  if (set.event === "slalom") {
    const buoys = set.data.buoys === null ? "—" : String(set.data.buoys)
    return buoys
  }

  if (set.event === "tricks") {
    return set.data.duration === null ? "—" : `${set.data.duration} min`
  }

  if (set.event === "jump") {
    if (set.data.subEvent === "cuts") {
      const cuts = set.data.cutsCount === null || set.data.cutsCount === undefined
        ? "—"
        : String(set.data.cutsCount)
      return `${cuts} cuts`
    }
    const attempts = set.data.attempts === null ? "—" : String(set.data.attempts)
    return `${attempts} attempts`
  }

  return set.data.name || "—"
}

type Props = {
  set: SkiSet
}

export default function HistoryItem({ set }: Props) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/set/${set.id}`)}
      className="w-full text-left flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm active:scale-95 transition"
    >
      <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
        {eventIcon(set)}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{eventLabel(set)}</p>
          <span className="text-xs text-gray-400">{set.date}</span>
        </div>

        <p className="mt-1 text-sm font-medium text-blue-600">{highlight(set)}</p>

        <p className="mt-1 text-sm text-gray-500">
          {set.notes.trim() ? set.notes : "No notes."}
        </p>
      </div>
    </button>
  )
}
