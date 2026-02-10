import { useEffect, useMemo, useState } from "react"
import { Trophy, TrendingUp } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis
} from "recharts"
import type { SkiSet } from "../../types/sets"
import { usePreferences } from "../../lib/preferences"
import DateFieldNativeOverlay from "../date/DateFieldNativeOverlay"
import {
  getSlalomSeries,
  getSlalomStats,
  type SlalomSeriesPoint
} from "../../features/insights/insightsSelectors"

type RangeKey = "week" | "month" | "season" | "custom"

type Props = {
  sets: SkiSet[]
}

const ROPE_LENGTHS = [18, 16, 14, 13, 12, 11.25, 10.75, 10.25, 9.75]
const ROPE_OFF = ["15off", "22off", "28off", "32off", "35off", "38off", "39.5off", "41off", "43off"]

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

function roundBuoys(value: number) {
  const rounded = Math.round(value * 4) / 4
  const whole = Math.floor(rounded)
  const fraction = rounded - whole

  if (fraction === 0.75) {
    return whole + 1
  }

  return rounded
}

function trimNumber(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "")
}

function extractNumberText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "�"
  if (typeof value === "number") {
    return Number.isFinite(value) ? trimNumber(value) : "�"
  }
  const match = value.match(/[\d.]+/)
  return match ? match[0] : "�"
}

function formatRopeDisplay(meters: number, unit: "meters" | "feet") {
  if (!Number.isFinite(meters)) return "�"
  const index = ROPE_LENGTHS.findIndex(value => Math.abs(value - meters) < 0.01)
  if (unit === "feet" && index >= 0) {
    return ROPE_OFF[index]
  }
  return `${trimNumber(meters)} m`
}

function formatSpeedDisplay(speed: number | string, unit: "kmh" | "mph") {
  const numeric = typeof speed === "number" ? speed : Number.parseFloat(speed)
  if (!Number.isFinite(numeric) || numeric <= 0) return "--"
  const converted = unit === "kmh" ? numeric * 1.60934 : numeric
  const value = Math.round(converted)
  return unit === "kmh" ? `${value}kph` : `${value}mph`
}

function describeAvgResultRule(score: number, speed: number) {
  const ropeIndex = Math.min(
    Math.max(Math.floor(score / 6), 0),
    ROPE_LENGTHS.length - 1
  )
  const buoys = score - ropeIndex * 6
  const rope = ROPE_LENGTHS[ropeIndex]
  const speedText = Number.isFinite(speed) && speed > 0 ? Math.round(speed) : "�"
  return `avgScore=${score.toFixed(2)} => ropeIndex=floor(score/6)=${ropeIndex}, buoys=score-${ropeIndex}*6=${buoys.toFixed(2)}, rope=${rope}m, speed=round(${speed.toFixed(2)})=${speedText}`
}

function formatAvgResult(
  score: number,
  speed: number,
  speedUnit: "kmh" | "mph",
  ropeUnit: "meters" | "feet"
) {
  if (!Number.isFinite(score) || score <= 0) {
    return "�"
  }

  const ropeIndex = Math.min(
    Math.max(Math.floor(score / 6), 0),
    ROPE_LENGTHS.length - 1
  )
  const buoys = roundBuoys(score - ropeIndex * 6)
  const buoysText = trimNumber(buoys)
  const ropeText = formatRopeDisplay(ROPE_LENGTHS[ropeIndex], ropeUnit)
  const speedText = formatSpeedDisplay(speed, speedUnit)

  if (speedText === "�") {
    return `${buoysText}/� @ ${ropeText}`
  }

  return `${buoysText}/${speedText} @ ${ropeText}`
}

function formatBestSet(
  best: ReturnType<typeof getSlalomStats>["bestSet"],
  speedUnit: "kmh" | "mph",
  ropeUnit: "meters" | "feet"
) {
  if (!best) return "�"
  const buoys = best.buoys === null ? "�" : trimNumber(roundBuoys(best.buoys))
  const ropeValue = best.ropeLength ? Number.parseFloat(extractNumberText(best.ropeLength)) : NaN
  const rope = formatRopeDisplay(ropeValue, ropeUnit)
  const speed = best.speed ? formatSpeedDisplay(best.speed, speedUnit) : "�"
  return `${buoys}/${speed} @ ${rope}`
}

function formatChartLabel(score: number) {
  if (!Number.isFinite(score) || score <= 0) return ""
  const ropeIndex = Math.min(
    Math.max(Math.floor(score / 6), 0),
    ROPE_LENGTHS.length - 1
  )
  const buoys = roundBuoys(score - ropeIndex * 6)
  return trimNumber(buoys)
}

type ChartPoint = {
  label: string
  value: number
  bestSet: SlalomSeriesPoint["bestSet"]
  startDate: string
  endDate: string
}

function SeriesChart({
  points,
  speedUnit,
  ropeUnit
}: {
  points: SlalomSeriesPoint[]
  speedUnit: "kmh" | "mph"
  ropeUnit: "meters" | "feet"
}) {
  if (points.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
        No slalom results yet.
      </div>
    )
  }

  const data: ChartPoint[] = points.map(point => ({
    label: point.label,
    value: point.value,
    bestSet: point.bestSet,
    startDate: point.startDate,
    endDate: point.endDate
  }))

  const renderTooltip = ({ active, payload, label }: TooltipContentProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null
    const item = payload[0]?.payload as ChartPoint | undefined
    const best = item?.bestSet ?? null
    const result = formatBestSet(best, speedUnit, ropeUnit)
    return (
      <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg shadow-slate-200/70">
        <p className="text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{result}</p>
      </div>
    )
  }

  return (
    <div className="mt-3">
      <div className="h-40 w-full rounded-2xl bg-slate-50 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={value => formatChartLabel(Number(value))}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={renderTooltip} cursor={{ stroke: "rgba(37, 99, 235, 0.15)", strokeWidth: 2 }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#2563eb" }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  )
}

export default function SlalomInsights({ sets }: Props) {
  const [range, setRange] = useState<RangeKey>("week")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const { preferences } = usePreferences()

  useEffect(() => {
    if (range !== "custom") return
    if (customStart && customEnd) return
    const end = todayLocalIso()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`
    setCustomStart(startIso)
    setCustomEnd(end)
  }, [range, customStart, customEnd])

  const filteredSets = useMemo(
    () => filterSetsByRange(sets, range, customStart, customEnd),
    [sets, range, customStart, customEnd]
  )

  const stats = useMemo(() => getSlalomStats(filteredSets), [filteredSets])
  const series = useMemo(
    () => getSlalomSeries(filteredSets, range, customStart, customEnd),
    [filteredSets, range, customStart, customEnd]
  )

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (!Number.isFinite(stats.averageScore) || stats.averageScore <= 0) return
    console.debug(
      "[Slalom Avg Result]",
      describeAvgResultRule(stats.averageScore, stats.averageSpeed)
    )
  }, [stats.averageScore, stats.averageSpeed])

  const hasSlalomSets = stats.totalSets > 0
  const bestResult = hasSlalomSets
    ? formatBestSet(stats.bestSet, preferences.speedUnit, preferences.ropeUnit)
    : "No sets yet"
  const averageResult = hasSlalomSets
    ? formatAvgResult(
        stats.averageScore,
        stats.averageSpeed,
        preferences.speedUnit,
        preferences.ropeUnit
      )
    : "No sets yet"

  const trendText = series.length > 1 && series[series.length - 1].value >= series[0].value
    ? "Improving trend"
    : "Keep pushing"

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
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Trophy className="h-4 w-4" />
            </div>
            <p className="text-xs text-slate-500">Best Result</p>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900 leading-tight">
            {bestResult}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-xs text-slate-500">Average Result</p>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900 leading-tight">
            {averageResult}
          </p>
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Results Over Time</p>
            <span className="text-xs text-emerald-600">{trendText}</span>
          </div>
          <SeriesChart
            points={series}
            speedUnit={preferences.speedUnit}
            ropeUnit={preferences.ropeUnit}
          />
          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>Season progress tracking</span>
          </div>
        </div>
      </div>
    </div>
  )
}



