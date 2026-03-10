import { useState } from "react"

type DayBar = {
  day: string
  count: number
  heightPercent: number
}

type ChartData = {
  bars: DayBar[]
  totalText: string
  deltaText: string
}

type Props = {
  weekData: ChartData
  monthData: ChartData
}

export default function WeeklyActivityChart({
  weekData,
  monthData
}: Props) {
  const [range, setRange] = useState<"week" | "month">("week")
  const data = range === "week" ? weekData : monthData
  const { bars, totalText, deltaText } = data
  const maxCount = Math.max(...bars.map(b => b.count), 1)
  const isMonth = range === "month"

  return (
    <div className="px-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-slate-900">
            {isMonth ? "Last 30 Days Activity" : "Last 7 Days Activity"}
          </h3>
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setRange("week")}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium transition",
                !isMonth ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              ].join(" ")}
              aria-pressed={!isMonth}
            >
              7d
            </button>
            <button
              type="button"
              onClick={() => setRange("month")}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium transition",
                isMonth ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              ].join(" ")}
              aria-pressed={isMonth}
            >
              30d
            </button>
          </div>
        </div>

        <div className={isMonth ? "overflow-x-auto" : ""}>
          <div
            className={[
              "h-40 mb-3",
              isMonth
                ? "flex items-end justify-start gap-1 min-w-[520px]"
                : "flex items-end justify-between gap-2"
            ].join(" ")}
          >
          {bars.map((bar, index) => {
            const count = bar.count

            const height =
              count > 0
                ? Math.max((count / maxCount) * 85, 50)
                : 0
            const showDayLabel = !isMonth || index % 5 === 0 || index === bars.length - 1

            return (
              <div
                key={`${bar.day}-${index}`}
                className={[
                  "flex flex-col items-center gap-2 h-full",
                  isMonth ? "w-3.5 shrink-0" : "flex-1"
                ].join(" ")}
                title={`${bar.day}: ${bar.count} sets`}
              >
                <div className="relative w-full flex flex-col items-center justify-end h-full">
                  {count > 0 ? (
                    <span className="text-slate-900 text-xs font-medium mb-1">
                      {count}
                    </span>
                  ) : null}

                  <div
                    className={[
                      "w-full rounded-lg transition-all",
                      count > 0
                        ? "bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 shadow-sm"
                        : "bg-slate-100"
                    ].join(" ")}
                    style={{ height: count > 0 ? `${height}%` : "6px" }}
                  />
                </div>

                <span className="text-slate-500 text-xs">
                  {showDayLabel ? bar.day : "\u00A0"}
                </span>
              </div>
            )
          })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <p className="text-slate-500 text-xs">
            {totalText}
          </p>

          <p className="text-emerald-600 text-xs">
            {deltaText}
          </p>
        </div>
      </div>
    </div>
  )
}
