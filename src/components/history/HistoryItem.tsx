import { useNavigate } from "react-router-dom"
import type { SkiSet } from "../../types/sets"
import { usePreferences } from "../../lib/preferences"
import { formatRopeLength, formatSpeed, formatJumpDistance } from "../../lib/skiFormat"
import { eventIcon, eventBgClass, eventLabel } from "../../lib/eventVisuals"
import { Star } from "lucide-react"

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
  const setPath = `/set/${set.id}`

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(setPath)}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          navigate(setPath)
        }
      }}
      className="flex w-full items-start gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-95"
    >
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl text-white",
          eventBgClass(set)
        ].join(" ")}
      >
        {eventIcon(set)}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{eventLabel(set)}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{set.date}{set.timeOfDay ? ` · ${set.timeOfDay}` : ""}</span>
            <button
              type="button"
              onClick={event => {
                event.preventDefault()
                event.stopPropagation()
                onToggleFavorite(set, !set.isFavorite)
              }}
              disabled={favoriteDisabled}
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full transition",
                set.isFavorite ? "text-amber-500" : "text-gray-300 hover:text-amber-500",
                favoriteDisabled ? "cursor-not-allowed opacity-50" : ""
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

        <p className="mt-1 text-sm font-medium text-blue-600">
          {highlight(set, preferences.ropeUnit, preferences.speedUnit)}
        </p>

        <p className="mt-1 text-sm text-gray-500">
          {(["summary", "workedOn", "mistakes", "whatHelped", "nextSet", "other"] as const)
            .map(k => set.notes[k])
            .find(v => v.trim()) ?? "No notes."}
        </p>
      </div>
    </div>
  )
}
