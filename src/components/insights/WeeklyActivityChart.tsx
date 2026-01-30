type DayBar = {
  day: string
  count: number
  heightPercent: number
}

type Props = {
  bars: DayBar[]
  totalText: string
  deltaText: string
}

export default function WeeklyActivityChart({
  bars,
  totalText,
  deltaText
}: Props) {
  const maxCount = Math.max(...bars.map(b => b.count), 1)

  return (
    <div className="px-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h3 className="text-slate-900 mb-4">
          Weekly Activity
        </h3>

        <div className="flex items-end justify-between gap-2 h-40 mb-3">
          {bars.map(bar => {
            const count = bar.count

            const height =
              count > 0
                ? Math.max((count / maxCount) * 85, 50)
                : 0

            return (
              <div
                key={bar.day}
                className="flex-1 flex flex-col items-center gap-2 h-full"
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
                  {bar.day}
                </span>
              </div>
            )
          })}
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
