import { ChevronDown } from "lucide-react"

type Props = {
  seasons: { id: string; label: string }[]
  selectedSeasonId: string | null
  onSeasonChange: (seasonId: string) => void
}

export default function InsightsHeader({
  seasons,
  selectedSeasonId,
  onSeasonChange
}: Props) {
  const disableDropdown = seasons.length <= 1

  return (
    <div className="px-4 pt-10 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Insights
          </h1>
          <p className="text-sm text-gray-500">
            Your training overview
          </p>
        </div>

        {seasons.length > 0 ? (
          <div className="relative">
            <select
              value={selectedSeasonId ?? ""}
              onChange={e => onSeasonChange(e.target.value)}
              disabled={disableDropdown}
              className={[
                "appearance-none bg-white text-slate-900 font-medium text-sm pl-4 pr-10 py-2.5 rounded-full shadow-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow",
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

