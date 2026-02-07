import { Star } from "lucide-react"

type RangeKey = "day" | "week" | "month" | "season" | "all"

type Props = {
  value: RangeKey
  onChange: (value: RangeKey) => void
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
    { key: "season", label: "Season" }
  ]

  return (
    <div className="px-4 mt-4">
      <div className="bg-white rounded-full p-1 flex gap-1 shadow-sm">
        <button
          type="button"
          onClick={onFavoritesToggle}
          className={[
            "h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition",
            favoritesOnly ? "bg-amber-400 text-white" : "text-gray-500 hover:bg-gray-100"
          ].join(" ")}
          aria-label={favoritesOnly ? "Disable favourites filter" : "Enable favourites filter"}
          title={favoritesOnly ? "Favourites only" : "Show favourites"}
        >
          <Star
            className="h-4 w-4"
            fill={favoritesOnly ? "currentColor" : "none"}
          />
        </button>

        {tabs.map(tab => {
          const isActive = value === tab.key

          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={[
                "flex-1 rounded-full py-2 text-sm transition",
                isActive ? "bg-blue-600 text-white" : "text-gray-700"
              ].join(" ")}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type { RangeKey }
