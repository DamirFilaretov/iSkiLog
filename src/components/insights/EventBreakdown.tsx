type EventBreakdownItem = {
  event: string
  count: number
  percentage: number
  gradientClass: string
}

type Props = {
  items: EventBreakdownItem[]
}

export default function EventBreakdown({ items }: Props) {
  return (
    <div className="px-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-slate-900 mb-4">
          Event Breakdown
        </h3>

        <div className="space-y-3">
          {items.map(item => (
            <div key={item.event}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-700 text-sm">
                  {item.event}
                </span>

                <span className="text-slate-900 text-sm">
                  {item.count} sets
                </span>
              </div>

              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.gradientClass}`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
