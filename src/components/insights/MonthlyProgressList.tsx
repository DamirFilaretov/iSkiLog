type MonthlyItem = {
  monthLabel: string
  trainingDays: number
  totalSets: number
  deltaPercent: number | null
}

type Props = {
  items: MonthlyItem[]
}

export default function MonthlyProgressList({ items }: Props) {
  return (
    <div className="px-4 pb-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-slate-900 mb-4">
          Monthly Progress
        </h3>

        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.monthLabel}
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
                {item.deltaPercent !== null ? (
                  <>
                    <p className="text-emerald-600 text-sm">
                      +{item.deltaPercent}%
                    </p>
                    <p className="text-slate-400 text-xs">
                      vs previous
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 text-xs">
                    —
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
