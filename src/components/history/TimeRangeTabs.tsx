import { Star } from "lucide-react"
import type { EventKey } from "../../types/sets"

type RangeKey = "day" | "week" | "month" | "season" | "custom" | "all"
type EventFilterKey = EventKey | "all"

type Props = {
  value: RangeKey
  onChange: (value: RangeKey) => void
  eventFilter: EventFilterKey
  onEventFilterChange: (value: EventFilterKey) => void
  favoritesOnly: boolean
  onFavoritesToggle: () => void
}

/**
 * Time range selector for History.
 * Controlled by the History page so we can filter data.
 */
export default function TimeRangeTabs({
  value,
  onChange,
  eventFilter,
  onEventFilterChange,
  favoritesOnly,
  onFavoritesToggle
}: Props) {
  return (
    <div className="px-4 mt-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onFavoritesToggle}
          className={
            favoritesOnly
              ? "h-12 w-12 shrink-0 rounded-full bg-amber-400 text-white shadow-sm flex items-center justify-center transition"
              : "h-12 w-12 shrink-0 rounded-full bg-white text-gray-500 hover:bg-gray-100 shadow-sm flex items-center justify-center transition"
          }
          aria-label={favoritesOnly ? "Disable favourites filter" : "Enable favourites filter"}
          title={favoritesOnly ? "Favourites only" : "Show favourites"}
        >
          <Star
            className="h-4 w-4"
            fill={favoritesOnly ? "currentColor" : "none"}
          />
        </button>

        <div className="grid flex-1 grid-cols-2 gap-2">
          <select
            value={value}
            onChange={event => onChange(event.target.value as RangeKey)}
            className="h-12 rounded-2xl bg-white px-4 text-sm text-slate-700 shadow-sm"
            aria-label="Timeline filter"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="season">Season</option>
            <option value="custom">Custom</option>
            <option value="all">All</option>
          </select>

          <select
            value={eventFilter}
            onChange={event => onEventFilterChange(event.target.value as EventFilterKey)}
            className="h-12 rounded-2xl bg-white px-4 text-sm text-slate-700 shadow-sm"
            aria-label="Event filter"
          >
            <option value="all">All Events</option>
            <option value="slalom">Slalom</option>
            <option value="tricks">Tricks</option>
            <option value="jump">Jump</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export type { RangeKey }
