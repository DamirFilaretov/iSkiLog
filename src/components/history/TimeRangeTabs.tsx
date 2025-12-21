type RangeKey = "day" | "week" | "month" | "season"

type Props = {
  // Controlled value so the parent page owns the selection.
  value: RangeKey

  // Notify the parent when the user selects a tab.
  onChange: (value: RangeKey) => void
}

/**
 * Time range selector for History.
 * This is controlled by the History page so we can actually filter data.
 */
export default function TimeRangeTabs({ value, onChange }: Props) {
  const tabs: { key: RangeKey; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "season", label: "Season" }
  ]

  return (
    <div className="px-4 mt-4">
      <div className="bg-white rounded-full p-1 flex gap-1 shadow-sm">
        {tabs.map(tab => {
          const isActive = value === tab.key

          return (
            <button
              key={tab.key}
              // Parent controls selection so we call onChange.
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
