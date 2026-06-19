import { ChevronDown } from "lucide-react"
import type { EventKey } from "../../types/sets"

type Props = {
  seasons: { id: string; label: string }[]
  selectedSeasonId: string | null
  onSeasonChange: (seasonId: string) => void
  selectedEvent: EventKey | "all"
  onEventChange: (event: EventKey | "all") => void
}

export default function InsightsHeader({
  seasons,
  selectedSeasonId,
  onSeasonChange,
  selectedEvent,
  onEventChange
}: Props) {
  const disableDropdown = seasons.length <= 1

  return (
    <div className="px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-4">
      <div className="flex items-center gap-3">
        <select
          value={selectedEvent}
          onChange={e => onEventChange(e.target.value as EventKey | "all")}
          className="min-w-0 basis-[65%] rounded-2xl bg-white px-4 py-3 text-sm text-slate-900 shadow-lg shadow-slate-200/60"
        >
          <option value="all">All Events</option>
          <option value="slalom">Slalom</option>
          <option value="tricks">Tricks</option>
          <option value="jump">Jump</option>
          <option value="other">Other</option>
        </select>

        {seasons.length > 0 ? (
          <div className="relative min-w-0 basis-[35%]">
            <select
              value={selectedSeasonId ?? ""}
              onChange={e => onSeasonChange(e.target.value)}
              disabled={disableDropdown}
              className={[
                "w-full appearance-none bg-white text-slate-900 font-medium text-sm pl-4 pr-10 py-3 rounded-2xl shadow-lg shadow-slate-200/60 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow",
                disableDropdown
                  ? "cursor-default opacity-70"
                  : "cursor-pointer hover:shadow-md"
              ].join(" ")}
            >
              {seasons.map(season => (
                <option key={season.id} value={season.id}>
                  {season.label}
                </option>
              ))}
            </select>
            {disableDropdown ? null : (
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
