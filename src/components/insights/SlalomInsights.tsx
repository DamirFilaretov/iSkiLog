import { useMemo, useState } from "react"
import { Trophy, TrendingUp, ChevronDown } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  getSlalomLastNSets,
  getSlalomStats,
  type SlalomSeriesPoint
} from "../../features/insights/insightsSelectors"
import { getAverageTournamentSpeedStep } from "../../features/insights/slalomSpeedSteps"
import { ROPE_LENGTHS, ROPE_OFF } from "../../lib/skiFormat"
import {
  filterByDateRange,
  type InsightRangeKey
} from "../../features/dateRange/dateRange"

type RangeKey = InsightRangeKey

type Props = {
  sets: SkiSet[]
  allSets: SkiSet[]
  range: RangeKey
  customStart: string
  customEnd: string
  onRangeChange: (range: RangeKey) => void
  onCustomStartChange: (date: string) => void
  onCustomEndChange: (date: string) => void
}

const CHART_SET_COUNTS = [7, 14, 30] as const
type ChartSetCount = (typeof CHART_SET_COUNTS)[number]

const SCORE_PASS_SIZE = 6
const SCORE_EPSILON = 1e-9
const CHART_ROPE_SCORE_TICKS = ROPE_LENGTHS.map((_, index) => (index + 1) * SCORE_PASS_SIZE)

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
  if (unit === "kmh") {
    return `${Math.round(converted)}kph`
  }
  const roundedToTenth = Math.round(converted * 10) / 10
  const valueText = Number.isInteger(roundedToTenth)
    ? roundedToTenth.toFixed(0)
    : roundedToTenth.toFixed(1)
  return `${valueText}mph`
}

function decodeScoreToRopeAndBuoys(score: number) {
  if (!Number.isFinite(score) || score <= 0) return null

  const maxRopeIndex = ROPE_LENGTHS.length - 1
  const ropeIndex = Math.min(
    Math.max(Math.floor((score - SCORE_EPSILON) / SCORE_PASS_SIZE), 0),
    maxRopeIndex
  )
  const rawBuoys = score - ropeIndex * SCORE_PASS_SIZE
  const buoys = roundBuoys(Math.min(Math.max(rawBuoys, 0), SCORE_PASS_SIZE))

  return {
    buoys,
    ropeMeters: ROPE_LENGTHS[ropeIndex]
  }
}

function formatAvgResult(
  score: number,
  speed: number | null,
  speedUnit: "kmh" | "mph",
  ropeUnit: "meters" | "feet"
) {
  const decoded = decodeScoreToRopeAndBuoys(score)
  if (!decoded) {
    return "--"
  }

  const buoysText = trimNumber(decoded.buoys)
  const ropeText = formatRopeDisplay(decoded.ropeMeters, ropeUnit)
  const speedText = speed === null ? "--" : formatSpeedDisplay(speed, speedUnit)

  if (speedText === "--") {
    return `${buoysText}/-- @ ${ropeText}`
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

function formatChartRopeLabel(score: number, ropeUnit: "meters" | "feet") {
  const decoded = decodeScoreToRopeAndBuoys(score)
  if (!decoded) return ""
  if (ropeUnit === "feet") {
    return formatRopeDisplay(decoded.ropeMeters, ropeUnit)
  }
  return trimNumber(decoded.ropeMeters)
}

type ChartPoint = {
  idx: number
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

  const data: ChartPoint[] = points.map((point, idx) => ({
    idx,
    label: point.label,
    value: point.value,
    bestSet: point.bestSet,
    startDate: point.startDate,
    endDate: point.endDate
  }))

  const renderTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null
    const item = payload[0]?.payload as ChartPoint | undefined
    const best = item?.bestSet ?? null
    const result = formatBestSet(best, speedUnit, ropeUnit)
    return (
      <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg shadow-slate-200/70">
        <p className="text-slate-500">{item?.label ?? ""}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{result}</p>
      </div>
    )
  }

  return (
    <div className="mt-3">
      <div className="h-40 min-h-[10rem] w-full min-w-0 rounded-2xl bg-slate-50 p-3">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
            <XAxis
              dataKey="idx"
              type="category"
              tickFormatter={value => data[Number(value)]?.label ?? ""}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={value => formatChartRopeLabel(Number(value), ropeUnit)}
              ticks={CHART_ROPE_SCORE_TICKS}
              reversed={false}
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
            <Tooltip content={renderTooltip} cursor={{ fill: "rgba(37, 99, 235, 0.08)" }} />
            <Bar
              dataKey="value"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              minPointSize={3}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  )
}

export default function SlalomInsights({ sets, allSets, range, customStart, customEnd, onRangeChange, onCustomStartChange, onCustomEndChange }: Props) {
  const { preferences } = usePreferences()
  const [chartSetCount, setChartSetCount] = useState<ChartSetCount>(14)

  const filteredSets = useMemo(
    () =>
      filterByDateRange(sets, range, {
        customStart,
        customEnd
      }),
    [sets, range, customStart, customEnd]
  )

  const stats = useMemo(() => getSlalomStats(filteredSets), [filteredSets])
  const averageTournamentSpeed = useMemo(
    () => getAverageTournamentSpeedStep(filteredSets),
    [filteredSets]
  )
  const series = useMemo(
    () => getSlalomLastNSets(allSets, chartSetCount),
    [allSets, chartSetCount]
  )

  const hasSlalomSets = stats.totalSets > 0
  const bestResult = hasSlalomSets
    ? formatBestSet(stats.bestSet, preferences.speedUnit, preferences.ropeUnit)
    : "No sets yet"
  const averageResult = hasSlalomSets
      ? formatAvgResult(
        stats.averageScore,
        averageTournamentSpeed?.mph ?? null,
        preferences.speedUnit,
        preferences.ropeUnit
      )
    : "No sets yet"
  const totalPassesText = hasSlalomSets ? String(stats.totalPasses) : "No sets yet"
  const avgPassesPerSetText = hasSlalomSets ? trimNumber(stats.averagePassesPerSet) : "No sets yet"

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
              onClick={() => onRangeChange(key)}
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
            onChange={onCustomStartChange}
            label="Start date"
            placeholder="Select start date"
            variant="insight"
          />
          <DateFieldNativeOverlay
            value={customEnd}
            onChange={onCustomEndChange}
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

        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <p className="text-xs text-slate-500">Total Passes</p>
          <p className="mt-3 text-sm font-semibold text-slate-900 leading-tight">
            {totalPassesText}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <p className="text-xs text-slate-500">Avg Passes / Set</p>
          <p className="mt-3 text-sm font-semibold text-slate-900 leading-tight">
            {avgPassesPerSetText}
          </p>
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Results Over Time</p>
            <div className="relative shrink-0">
              <select
                value={chartSetCount}
                onChange={e => setChartSetCount(Number(e.target.value) as ChartSetCount)}
                aria-label="How many recent slalom sets to chart"
                className="appearance-none rounded-full bg-slate-100 py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CHART_SET_COUNTS.map(count => (
                  <option key={count} value={count}>
                    Last {count} sets
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
          <SeriesChart
            points={series}
            speedUnit={preferences.speedUnit}
            ropeUnit={preferences.ropeUnit}
          />
          <div className="mt-2 flex justify-end text-[11px] text-slate-400">
            <span className="text-emerald-600">{trendText}</span>
          </div>
        </div>
      </div>
    </div>
  )
}




