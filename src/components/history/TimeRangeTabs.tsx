import { useState } from "react"

type RangeKey = "day" | "week" | "month" | "season"

export default function TimeRangeTabs() {
  const [active, setActive] = useState<RangeKey>("day")

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
          const isActive = active === tab.key

          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={[
                "flex-1 rounded-full py-2 text-sm transition",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-700"
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
