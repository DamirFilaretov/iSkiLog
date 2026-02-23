import { useEffect, useMemo, useState } from "react"
import { Trophy, TrendingUp, Plane, Flag } from "lucide-react"
import type { SkiSet } from "../../types/sets"
import DateFieldNativeOverlay from "../date/DateFieldNativeOverlay"
import {
  daysAgoLocalIsoDate,
  filterByDateRange,
  type InsightRangeKey,
  todayLocalIsoDate
} from "../../features/dateRange/dateRange"

type RangeKey = InsightRangeKey

type JumpInsightSource = {
  bestDistanceMeters: number
  averageDistanceMeters: number
  avgDistanceDeltaVsLastMonthMeters: number
  jumpSetCount: number
  cutsSetCount: number
  totalJumped: number
  totalPassed: number
  openCutsSetCount: number
  cutPassSetCount: number
}

type Props = {
  sets: SkiSet[]
  dataSource?: JumpInsightSource
}

function isoToDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function buildJumpSourceFromSets(
  sets: SkiSet[],
  range: RangeKey,
  customStart: string,
  customEnd: string
): JumpInsightSource {
  const jumpSets = sets.filter((set): set is SkiSet & { event: "jump" } => set.event === "jump")
  const selected = filterByDateRange(jumpSets, range, { customStart, customEnd }).filter(
    (set): set is SkiSet & { event: "jump" } => set.event === "jump"
  )

  const jumpOnly = selected.filter(set => (set.data.subEvent ?? "jump") === "jump")
  const cutsOnly = selected.filter(set => (set.data.subEvent ?? "jump") === "cuts")

  const distances = jumpOnly
    .map(set => set.data.distance ?? null)
    .filter((distance): distance is number => distance !== null && Number.isFinite(distance))

  const bestDistanceMeters = distances.length === 0 ? 0 : Math.max(...distances)
  const averageDistanceMeters = average(distances)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const thisMonthJump = jumpSets.filter(set => {
    const d = isoToDate(set.date)
    return d >= monthStart && d <= monthEnd && (set.data.subEvent ?? "jump") === "jump"
  })
  const lastMonthJump = jumpSets.filter(set => {
    const d = isoToDate(set.date)
    return d >= lastMonthStart && d <= lastMonthEnd && (set.data.subEvent ?? "jump") === "jump"
  })

  const thisMonthDistances = thisMonthJump
    .map(set => set.data.distance ?? null)
    .filter((distance): distance is number => distance !== null && Number.isFinite(distance))
  const lastMonthDistances = lastMonthJump
    .map(set => set.data.distance ?? null)
    .filter((distance): distance is number => distance !== null && Number.isFinite(distance))

  const avgDistanceDeltaVsLastMonthMeters = average(thisMonthDistances) - average(lastMonthDistances)

  const totalSets = selected.length
  const jumpSetCount = jumpOnly.length
  const cutsSetCount = cutsOnly.length
  const jumpSetPercent = totalSets === 0 ? 0 : Math.round((jumpSetCount / totalSets) * 100)
  const cutsSetPercent = totalSets === 0 ? 0 : Math.round((cutsSetCount / totalSets) * 100)

  const totalJumped = jumpOnly.reduce((sum, set) => sum + (set.data.made ?? 0), 0)
  const totalPassed = jumpOnly.reduce((sum, set) => sum + (set.data.passed ?? 0), 0)
  const openCutsSetCount = cutsOnly.filter(set => set.data.cutsType === "open_cuts").length
  const cutPassSetCount = cutsOnly.filter(set => set.data.cutsType === "cut_pass").length

  return {
    bestDistanceMeters,
    averageDistanceMeters,
    avgDistanceDeltaVsLastMonthMeters,
    jumpSetCount: jumpSetPercent,
    cutsSetCount: cutsSetPercent,
    totalJumped,
    totalPassed,
    openCutsSetCount,
    cutPassSetCount
  }
}

export default function JumpInsights({ sets, dataSource }: Props) {
  const [range, setRange] = useState<RangeKey>("week")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  useEffect(() => {
    if (range !== "custom") return
    if (customStart && customEnd) return
    setCustomStart(daysAgoLocalIsoDate(30))
    setCustomEnd(todayLocalIsoDate())
  }, [range, customStart, customEnd])

  // Default source is computed from real jump sets. dataSource stays as an override hook.
  const source = useMemo<JumpInsightSource>(() => {
    if (dataSource) return dataSource
    return buildJumpSourceFromSets(sets, range, customStart, customEnd)
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

      <div className="px-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <p className="text-sm font-semibold text-slate-900">Jump vs Cuts Ratio</p>

          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Plane className="h-4 w-4 text-orange-500" />
                  <span>Jump Sets</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{source.jumpSetCount}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${source.jumpSetCount}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Flag className="h-4 w-4 text-amber-500" />
                  <span>Cuts Sets</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{source.cutsSetCount}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${source.cutsSetCount}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <p className="text-sm font-semibold text-slate-900">Jump Activity</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-3">
              <p className="text-xs text-slate-500">Jumps Made</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{source.totalJumped}</p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-3">
              <p className="text-xs text-slate-500">Total Passed</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{source.totalPassed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <p className="text-sm font-semibold text-slate-900">Cuts Activity</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3">
              <p className="text-xs text-slate-500">Open Cuts Sets</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{source.openCutsSetCount}</p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3">
              <p className="text-xs text-slate-500">Cut & Pass Sets</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{source.cutPassSetCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/70 min-h-[148px]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <Trophy className="h-4 w-4" />
            </div>
            <p className="mt-3 text-xs text-slate-500">Best Distance</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">
              {source.bestDistanceMeters.toFixed(1)}m
            </p>
            <p className="mt-1 text-xs text-indigo-400">Personal record</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/70 min-h-[148px]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="mt-3 text-xs text-slate-500">Average Distance</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900 leading-none">
              {source.averageDistanceMeters.toFixed(1)}m
            </p>
            <p className="mt-1 text-xs text-emerald-600">
              {source.avgDistanceDeltaVsLastMonthMeters > 0 ? "+" : ""}
              {source.avgDistanceDeltaVsLastMonthMeters.toFixed(1)}m vs last month
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
