import { useEffect, useMemo, useState } from "react"
import { Target, Clock3 } from "lucide-react"
import type { SkiSet } from "../../types/sets"

type RangeKey = "week" | "month" | "season" | "custom"

type OtherInsightSource = {
  totalSets: number
  totalHours: number
}

type Props = {
  sets: SkiSet[]
  dataSource?: OtherInsightSource
}

function todayLocalIso() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function isoToDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function toLocalIso(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function clampRange(start: Date, end: Date) {
  const normalizedStart = new Date(start)
  const normalizedEnd = new Date(end)
  normalizedStart.setHours(0, 0, 0, 0)
  normalizedEnd.setHours(23, 59, 59, 999)
  return { start: normalizedStart, end: normalizedEnd }
}

function filterSetsByRange(
  sets: SkiSet[],
  range: RangeKey,
  customStart: string,
  customEnd: string
) {
  const now = new Date()

  if (range === "season") return sets

  if (range === "week") {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    const bounds = clampRange(start, end)
    return sets.filter(set => {
      const d = isoToDate(set.date)
      return d >= bounds.start && d <= bounds.end
    })
  }

  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const bounds = clampRange(start, end)
    return sets.filter(set => {
      const d = isoToDate(set.date)
      return d >= bounds.start && d <= bounds.end
    })
  }

  if (!customStart || !customEnd) return sets

  const start = isoToDate(customStart)
  const end = isoToDate(customEnd)
  const bounds = clampRange(start, end)
  return sets.filter(set => {
    const d = isoToDate(set.date)
    return d >= bounds.start && d <= bounds.end
  })
}

function buildOtherSourceFromSets(
  sets: SkiSet[],
  range: RangeKey,
  customStart: string,
  customEnd: string
): OtherInsightSource {
  const otherSets = sets.filter((set): set is SkiSet & { event: "other" } => set.event === "other")
  const selected = filterSetsByRange(otherSets, range, customStart, customEnd)
  const totalSets = selected.length

  // Current backend has no duration for "other", so use a deterministic 1h per set placeholder.
  // Keeping this centralized makes it easy to replace with real duration later.
  const totalHours = totalSets * 1

  return { totalSets, totalHours }
}

export default function OtherInsights({ sets, dataSource }: Props) {
  const [range, setRange] = useState<RangeKey>("week")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  useEffect(() => {
    if (range !== "custom") return
    if (customStart && customEnd) return
    const end = todayLocalIso()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setCustomStart(toLocalIso(start))
    setCustomEnd(end)
  }, [range, customStart, customEnd])

  const source = useMemo<OtherInsightSource>(() => {
    if (dataSource) return dataSource
    return buildOtherSourceFromSets(sets, range, customStart, customEnd)
  }, [dataSource, sets, range, customStart, customEnd])

  return (
    <div className="space-y-4">
      <div className="px-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Insights</h4>
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
          <div className="min-w-0">
            <label className="block text-[11px] text-slate-500 mb-1">Start date</label>
            <input
              type="date"
              value={customStart}
              onChange={event => setCustomStart(event.target.value)}
              className="date-input-insight w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-[11px] text-slate-500 mb-1">End date</label>
            <input
              type="date"
              value={customEnd}
              onChange={event => setCustomEnd(event.target.value)}
              className="date-input-insight w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm"
            />
          </div>
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
