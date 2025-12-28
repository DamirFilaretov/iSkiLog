type DayBar = {
  day: string
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
  return (
    <div className="px-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-slate-900 mb-4">
          Weekly Activity
        </h3>

        <div className="flex items-end justify-between gap-2 h-40 mb-3">
          {bars.map(bar => (
            <div
              key={bar.day}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <div
                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg"
                style={{ height: `${bar.heightPercent}%` }}
              />
              <span className="text-slate-500 text-xs">
                {bar.day}
              </span>
            </div>
          ))}
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
