import { useEffect, useMemo, useState } from "react"
import { Target, Clock3 } from "lucide-react"
import type { SkiSet } from "../../types/sets"
import DateFieldNativeOverlay from "../date/DateFieldNativeOverlay"
import {
  daysAgoLocalIsoDate,
  filterByDateRange,
  todayLocalIsoDate,
  type InsightRangeKey
} from "../../features/dateRange/dateRange"

type RangeKey = InsightRangeKey

type OtherInsightSource = {
  totalSets: number
  totalHours: number
}

type Props = {
  sets: SkiSet[]
  dataSource?: OtherInsightSource
}

type OtherSet = Extract<SkiSet, { event: "other" }>

function buildOtherSourceFromSets(
  sets: SkiSet[],
  range: RangeKey,
  customStart: string,
  customEnd: string
): OtherInsightSource {
  const otherSets = sets.filter((set): set is OtherSet => set.event === "other")
  const selected = filterByDateRange(otherSets, range, { customStart, customEnd })
  const totalSets = selected.length
  const totalMinutes = selected.reduce((sum, set) => sum + (set.data.duration ?? 0), 0)
  const totalHours = totalMinutes / 60

  return { totalSets, totalHours }
}

export default function OtherInsights({ sets, dataSource }: Props) {
  const [range, setRange] = useState<RangeKey>("week")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  useEffect(() => {
    if (range !== "custom") return
    if (customStart && customEnd) return
    setCustomStart(daysAgoLocalIsoDate(30))
    setCustomEnd(todayLocalIsoDate())
  }, [range, customStart, customEnd])

  const source = useMemo<OtherInsightSource>(() => {
    if (dataSource) return dataSource
    return buildOtherSourceFromSets(sets, range, customStart, customEnd)
  }, [dataSource, sets, range, customStart, customEnd])

  return (
    <div className="space-y-4">
      <div className="px-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Time range</h4>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {(["week", "month", "season", "custom"] as RangeKey[]).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={
                key === range
                  ? "rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-900 shadow-sm"
                  : "px-2 py-1"
              }
            >
              {key === "week"
                ? "Week"
                : key === "month"
                  ? "Month"
                  : key === "season"
                    ? "Season"
                    : "Custom"}
            </button>
          ))}
        </div>
      </div>

      {range === "custom" ? (
        <div className="px-4 flex flex-col gap-3 lg:grid lg:grid-cols-2">
          <DateFieldNativeOverlay
            value={customStart}
            onChange={setCustomStart}
            label="Start date"
            placeholder="Select start date"
            variant="insight"
          />
          <DateFieldNativeOverlay
            value={customEnd}
            onChange={setCustomEnd}
            label="End date"
            placeholder="Select end date"
            variant="insight"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 px-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Target className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs text-slate-500">Total Sets</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{source.totalSets}</p>
          <p className="mt-1 text-xs text-emerald-500">
            {range === "season" ? "This season" : "Selected range"}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Clock3 className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs text-slate-500">Total Time</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{source.totalHours.toFixed(1)}h</p>
          <p className="mt-1 text-xs text-emerald-500">Training hours</p>
        </div>
      </div>
    </div>
  )
}
