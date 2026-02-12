import { Star } from "lucide-react"

type RangeKey = "day" | "week" | "month" | "season" | "custom" | "all"

type Props = {
  value: RangeKey | null
  onChange: (value: RangeKey | null) => void
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
  favoritesOnly,
  onFavoritesToggle
}: Props) {
  const tabs: { key: RangeKey; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "season", label: "Season" },
    { key: "custom", label: "Custom" }
  ]

  return (
    <div className="pl-4 pr-2 mt-4">
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

        <div className="flex-1 rounded-full bg-white p-1.5 shadow-sm">
          <div className="grid grid-cols-5 gap-1 text-sm text-slate-500">
          {tabs.map(tab => {
            const isActive = value === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChange(isActive ? null : tab.key)}
                className={[
                  "rounded-full px-2 py-2 leading-none transition",
                  isActive
                    ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                ].join(" ")}
              >
                {tab.label}
              </button>
            )
          })}
          </div>
        </div>
      </div>
    </div>
  )
}

export type { RangeKey }
