import type { MonthlyProgressItem } from "../../features/insights/insightsTypes"

type Props = {
  items: MonthlyProgressItem[]
}

function shortMonthFromLabel(monthLabel: string) {
  const firstWord = monthLabel.trim().split(" ")[0] ?? ""
  return firstWord.slice(0, 3)
}

function formatDelta(deltaPercent: number) {
  const sign = deltaPercent > 0 ? "+" : ""
  return `${sign}${deltaPercent}%`
}

function deltaColorClass(deltaPercent: number) {
  if (deltaPercent > 0) return "text-emerald-600"
  if (deltaPercent < 0) return "text-rose-600"
  return "text-slate-600"
}

export default function MonthlyProgressList({ items }: Props) {
  const visibleItems = items.slice(0, 3)

  return (
    <div className="px-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-slate-900 mb-4">Monthly Progress</h3>

        <div className="space-y-3">
          {visibleItems.length === 0 ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div>
                <p className="text-slate-900 text-sm mb-0.5">
                  No monthly data yet
                </p>
                <p className="text-slate-500 text-xs">
                  Log a set to see month to month progress
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">—</p>
                <p className="text-slate-400 text-xs"></p>
              </div>
            </div>
          ) : (
            visibleItems.map((item, index) => {
              const prev = items[index + 1] ?? null
              const hasPrev = prev !== null

              const hasDelta = item.deltaPercent !== null
              const deltaText = hasDelta ? formatDelta(item.deltaPercent!) : "—"

              const vsText = hasPrev
                ? `vs ${shortMonthFromLabel(prev!.monthLabel)}`
                : ""

              const colorClass = hasDelta
                ? deltaColorClass(item.deltaPercent!)
                : "text-slate-400"

              return (
                <div
                  key={`${item.monthLabel}-${index}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50"
                >
                  <div>
                    <p className="text-slate-900 text-sm mb-0.5">
                      {item.monthLabel}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {item.trainingDays} days • {item.totalSets} sets
                    </p>
                  </div>

                  <div className="text-right">
                    <p className={`${colorClass} text-sm`}>
                      {deltaText}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {vsText}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
