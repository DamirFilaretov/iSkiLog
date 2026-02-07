import { useNavigate } from "react-router-dom"
import type { SkiSet } from "../../types/sets"
import { usePreferences } from "../../lib/preferences"
import { Star } from "lucide-react"

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

const ROPE_LENGTHS = [18, 16, 14, 13, 12, 11.25, 10.75, 10.25, 9.75]
const ROPE_OFF = ["15off", "22off", "28off", "32off", "35off", "38off", "39.5off", "41off", "43off"]

function formatRopeLength(value: string, unit: "meters" | "feet") {
  if (!value) return "--"
  if (unit === "meters") return value

  const match = value.match(/[\d.]+/)
  if (!match) return value
  const meters = Number.parseFloat(match[0])
  if (!Number.isFinite(meters)) return value

  const index = ROPE_LENGTHS.findIndex(v => Math.abs(v - meters) < 0.01)
  if (index < 0) return value
  return ROPE_OFF[index]
}

function formatSpeed(value: string, unit: "kmh" | "mph") {
  if (!value) return "--"
  const numeric = Number.parseFloat(value)
  if (!Number.isFinite(numeric)) return "--"
  const converted = unit === "kmh" ? numeric * 1.60934 : numeric
  const rounded = Math.round(converted)
  return unit === "kmh" ? `${rounded}kph` : `${rounded}mph`
}

function formatJumpDistance(value: number | null | undefined, unit: "meters" | "feet") {
  if (value === null || value === undefined || !Number.isFinite(value)) return ""
  const converted = unit === "feet" ? value * 3.28084 : value
  const rounded = Math.round(converted * 10) / 10
  const suffix = unit === "feet" ? "ft" : "m"
  return `${rounded}${suffix}`
}


/**
 * Build a short highlight line that depends on the event type.
 */
function highlight(set: SkiSet, ropeUnit: "meters" | "feet", speedUnit: "kmh" | "mph") {
  if (set.event === "slalom") {
    const buoys = set.data.buoys === null ? "--" : String(set.data.buoys)
    const rope = formatRopeLength(set.data.ropeLength, ropeUnit)
    const speed = formatSpeed(set.data.speed, speedUnit)
    return `${buoys}/${speed} @ ${rope}`
  }

  if (set.event === "tricks") {
    return set.data.duration === null ? "--" : `${set.data.duration} min`
  }

  if (set.event === "jump") {
    if (set.data.subEvent === "cuts") {
      const cuts = set.data.cutsCount === null ? "--" : String(set.data.cutsCount)
      return `${cuts} cuts`
    }
    const attempts = set.data.attempts === null ? "--" : String(set.data.attempts)
    const distance = formatJumpDistance(set.data.distance, ropeUnit)
    return distance ? `${attempts} attempts | ${distance}` : `${attempts} attempts`
  }

  return set.data.name || "--"
}

type Props = {
  set: SkiSet
  onToggleFavorite: (set: SkiSet, nextValue: boolean) => void
  favoriteDisabled?: boolean
}

export default function HistoryItem({
  set,
  onToggleFavorite,
  favoriteDisabled = false
}: Props) {
  const { preferences } = usePreferences()
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{set.date}</span>
            <button
              type="button"
              onClick={event => {
                event.preventDefault()
                event.stopPropagation()
                onToggleFavorite(set, !set.isFavorite)
              }}
              disabled={favoriteDisabled}
              className={[
                "h-7 w-7 rounded-full flex items-center justify-center transition",
                set.isFavorite ? "text-amber-500" : "text-gray-300 hover:text-amber-500",
                favoriteDisabled ? "opacity-50 cursor-not-allowed" : ""
              ].join(" ")}
              aria-label={set.isFavorite ? "Remove from favourites" : "Add to favourites"}
            >
              <Star
                className="h-4 w-4"
                fill={set.isFavorite ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>

        <p className="mt-1 text-sm font-medium text-blue-600">{highlight(set, preferences.ropeUnit, preferences.speedUnit)}</p>

        <p className="mt-1 text-sm text-gray-500">
          {set.notes.trim() ? set.notes : "No notes."}
        </p>
      </div>
    </button>
  )
}
