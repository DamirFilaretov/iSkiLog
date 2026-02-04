import type { SkiSet, EventKey } from "../../types/sets"
import type {
  WeeklyStats,
  WeeklyChartBars,
  MonthlyProgressItem,
  EventBreakdownItem,
  MostPracticedEvent
} from "./insightsTypes"

/* -----------------------------
   Date helpers (pure)
----------------------------- */

function normalizeIsoDay(iso: string) {
  return iso.slice(0, 10)
}

function isoToDate(iso: string) {
  const dayIso = normalizeIsoDay(iso)
  const [y, m, d] = dayIso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function dateToIso(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function startOfWeekMonday(date: Date) {
  const day = date.getDay() || 7
  const start = new Date(date)
  start.setDate(date.getDate() - day + 1)
  return start
}

function monthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthLabelFromKey(key: string) {
  const [yStr, mStr] = key.split("-")
  const y = Number(yStr)
  const m = Number(mStr)
  const d = new Date(y, (m ?? 1) - 1, 1)

  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  })
}

/* -----------------------------
   Core helpers
----------------------------- */

function uniqueDates(sets: SkiSet[]) {
  return Array.from(new Set(sets.map(s => normalizeIsoDay(s.date))))
}

/* -----------------------------
   Current streak
----------------------------- */

export function getCurrentStreak(
  sets: SkiSet[],
  now = new Date()
): number {
  if (sets.length === 0) return 0

  const uniqueDays = Array.from(
    new Set(sets.map(s => normalizeIsoDay(s.date)))
  ).sort((a, b) => (a > b ? -1 : 1))

  if (uniqueDays.length === 0) return 0

  const todayIso = dateToIso(now)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const yesterdayIso = dateToIso(yesterday)

  const hasToday = uniqueDays.includes(todayIso)
  const hasYesterday = uniqueDays.includes(yesterdayIso)

  if (!hasToday && !hasYesterday) return 0

  let expectedIso = hasToday ? todayIso : yesterdayIso
  let streak = 0

  while (uniqueDays.includes(expectedIso)) {
    streak += 1
    const d = isoToDate(expectedIso)
    d.setDate(d.getDate() - 1)
    expectedIso = dateToIso(d)
  }

  return streak
}

/* -----------------------------
   Weekly stats
----------------------------- */

export function getWeeklyStats(
  sets: SkiSet[],
  now = new Date()
): WeeklyStats {
  const start = startOfWeekMonday(now)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const thisWeek = sets.filter(s => {
    const d = isoToDate(s.date)
    return d >= start && d <= end
  })

  const lastWeekStart = new Date(start)
  lastWeekStart.setDate(start.getDate() - 7)

  const lastWeekEnd = new Date(end)
  lastWeekEnd.setDate(end.getDate() - 7)

  const lastWeek = sets.filter(s => {
    const d = isoToDate(s.date)
    return d >= lastWeekStart && d <= lastWeekEnd
  })

  const thisWeekTrainingDays = uniqueDates(thisWeek).length
  const lastWeekTrainingDays = uniqueDates(lastWeek).length

  const avgThisWeek =
    thisWeekTrainingDays === 0
      ? 0
      : thisWeek.length / thisWeekTrainingDays

  const avgLastWeek =
    lastWeekTrainingDays === 0
      ? 0
      : lastWeek.length / lastWeekTrainingDays

  const deltaPercent =
    avgLastWeek === 0
      ? null
      : ((avgThisWeek - avgLastWeek) / avgLastWeek) * 100

  return {
    avgPerTrainingDay: avgThisWeek,
    deltaPercent,
    totalThisWeek: thisWeek.length,
    dailyCounts: buildWeekDailyCounts(thisWeek, start)
  }
}

function buildWeekDailyCounts(
  sets: SkiSet[],
  weekStart: Date
) {
  const days: { label: string; count: number }[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const iso = dateToIso(d)

    days.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      count: sets.filter(s => normalizeIsoDay(s.date) === iso).length
    })
  }

  return days
}

/* -----------------------------
   Weekly chart adapter
----------------------------- */

export function getWeeklyChartBars(
  sets: SkiSet[]
): WeeklyChartBars {
  const stats = getWeeklyStats(sets)

  const max = Math.max(...stats.dailyCounts.map(d => d.count), 1)

  return {
    bars: stats.dailyCounts.map(d => ({
      day: d.label,
      count: d.count,
      heightPercent: (d.count / max) * 100
    })),
    totalText: `Total this week: ${stats.totalThisWeek} sets`,
    deltaText:
      stats.deltaPercent === null
        ? "—"
        : `${stats.deltaPercent > 0 ? "↑" : "↓"} ${Math.abs(
            Math.round(stats.deltaPercent)
          )}% from last week`
  }
}

/* -----------------------------
   Monthly stats
----------------------------- */

export function getMonthlyTrainingDays(
  sets: SkiSet[],
  now = new Date()
): number {
  const month = now.getMonth()
  const year = now.getFullYear()

  const monthSets = sets.filter(s => {
    const d = isoToDate(s.date)
    return d.getMonth() === month && d.getFullYear() === year
  })

  return uniqueDates(monthSets).length
}

/*
  Monthly progress compares the last N calendar months in order.
  One extra month is included so the last visible row can still compare.
*/

export function getMonthlyProgress(
  sets: SkiSet[],
  now = new Date(),
  monthsToShow = 3
): MonthlyProgressItem[] {
  const byMonth = new Map<string, SkiSet[]>()

  sets.forEach(set => {
    const d = isoToDate(set.date)
    const key = monthKeyFromDate(d)
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(set)
  })

  const monthsToCompute = monthsToShow + 1

  const months: string[] = []
  let anchor = now

  for (const s of sets) {
    const d = isoToDate(s.date)
    if (d > anchor) anchor = d
  }

  const cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1)


  for (let i = 0; i < monthsToCompute; i++) {
    months.push(monthKeyFromDate(cursor))
    cursor.setMonth(cursor.getMonth() - 1)
  }

  const computed = months.map((key, index) => {
    const monthSets = byMonth.get(key) ?? []
    const trainingDays = uniqueDates(monthSets).length
    const totalSets = monthSets.length

    const prevKey = months[index + 1]
    const prevSets = prevKey ? (byMonth.get(prevKey) ?? []) : []
    const prevCount = prevSets.length

    const baseline = prevCount <= 1 ? 1 : prevCount

    const deltaPercent =
      prevKey === undefined
        ? null
        : prevCount <= 1
          ? Math.round((totalSets / baseline) * 100)
          : Math.round(((totalSets - prevCount) / prevCount) * 100)

    return {
      monthLabel: monthLabelFromKey(key),
      trainingDays,
      totalSets,
      deltaPercent
    }
  })

  return computed
}

/* -----------------------------
   Event stats
----------------------------- */

export function getEventBreakdown(
  sets: SkiSet[]
): EventBreakdownItem[] {
  const counts: Record<EventKey, number> = {
    slalom: 0,
    tricks: 0,
    jump: 0,
    other: 0
  }

  sets.forEach(s => {
    counts[s.event]++
  })

  const total = sets.length

  return Object.entries(counts).map(([event, count]) => ({
    event: event as EventKey,
    count,
    percentage: total === 0 ? 0 : Math.round((count / total) * 100),
    gradientClass: getEventGradient(event as EventKey)
  }))
}

export function getMostPracticedEvent(
  sets: SkiSet[]
): MostPracticedEvent {
  const breakdown = getEventBreakdown(sets)

  return breakdown.reduce((max, item) =>
    item.count > max.count ? item : max
  )
}

/* -----------------------------
   UI helpers
----------------------------- */

function getEventGradient(event: EventKey) {
  switch (event) {
    case "slalom":
      return "bg-gradient-to-r from-blue-500 to-cyan-400"
    case "jump":
      return "bg-gradient-to-r from-orange-500 to-yellow-400"
    case "tricks":
      return "bg-gradient-to-r from-purple-500 to-pink-400"
    default:
      return "bg-gradient-to-r from-indigo-500 to-blue-400"
  }
}

/* -----------------------------
   Slalom helpers
----------------------------- */

function parseRopeLengthMeters(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return Number.POSITIVE_INFINITY
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
  }

  const match = value.match(/[\d.]+/)
  if (!match) return Number.POSITIVE_INFINITY
  const num = Number.parseFloat(match[0])
  return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY
}

function parseSpeed(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return Number.NEGATIVE_INFINITY
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY
  }

  const match = value.match(/[\d.]+/)
  if (!match) return Number.NEGATIVE_INFINITY
  const num = Number.parseFloat(match[0])
  return Number.isFinite(num) ? num : Number.NEGATIVE_INFINITY
}

export type SlalomBestSet = {
  buoys: number | null
  ropeLength: string
  speed: string
  date: string
  score: number
}

export type SlalomStats = {
  totalSets: number
  averageScore: number
  averageBuoys: number
  averageRope: number
  averageSpeed: number
  bestSet: SlalomBestSet | null
}

export type SlalomSeriesPoint = {
  label: string
  value: number
}

function ropeIndexFromLength(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? ropeIndexFromLength(String(value))
      : 0
  }

  const match = value.match(/[\d.]+/)
  if (!match) return 0
  const num = Number.parseFloat(match[0])
  if (!Number.isFinite(num)) return 0

  const lengths = [18, 16, 14, 13, 12, 11.25, 10.75, 10.25, 9.75]
  const index = lengths.findIndex(l => Math.abs(l - num) < 0.01)
  return index === -1 ? 0 : index
}

export function getSlalomScore(ropeLength: string | null | undefined, buoys: number | null) {
  const ropeIndex = ropeIndexFromLength(ropeLength)
  const buoysValue = buoys ?? 0
  return ropeIndex * 6 + buoysValue
}

export function getSlalomStats(sets: SkiSet[]): SlalomStats {
  const slalom = sets.filter(s => s.event === "slalom")
  const totalSets = slalom.length

  const scoreValues = slalom.map(s => {
    return getSlalomScore(s.data.ropeLength ?? "", s.data.buoys ?? null)
  })

  const averageScore =
    scoreValues.length === 0
      ? 0
      : scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length

  const buoysValues = slalom
    .map(s => s.data.buoys)
    .filter((v): v is number => v !== null && Number.isFinite(v))

  const averageBuoys =
    buoysValues.length === 0
      ? 0
      : buoysValues.reduce((sum, v) => sum + v, 0) / buoysValues.length

  const ropeValues = slalom
    .map(s => parseRopeLengthMeters(s.data.ropeLength))
    .filter(v => Number.isFinite(v) && v !== Number.POSITIVE_INFINITY)

  const averageRope =
    ropeValues.length === 0
      ? 0
      : ropeValues.reduce((sum, v) => sum + v, 0) / ropeValues.length

  const speedValues = slalom
    .map(s => parseSpeed(s.data.speed))
    .filter(v => Number.isFinite(v) && v !== Number.NEGATIVE_INFINITY)

  const averageSpeed =
    speedValues.length === 0
      ? 0
      : speedValues.reduce((sum, v) => sum + v, 0) / speedValues.length

  const best = slalom.reduce<SlalomBestSet | null>((current, set) => {
    const score = getSlalomScore(set.data.ropeLength ?? "", set.data.buoys ?? null)
    const candidate: SlalomBestSet = {
      buoys: set.data.buoys ?? null,
      ropeLength: set.data.ropeLength ?? "",
      speed: set.data.speed ?? "",
      date: set.date,
      score
    }

    if (!current) return candidate

    if (candidate.score > current.score) return candidate
    if (candidate.score < current.score) return current

    const currentRope = parseRopeLengthMeters(current.ropeLength)
    const candidateRope = parseRopeLengthMeters(candidate.ropeLength)

    if (candidateRope < currentRope) return candidate
    if (candidateRope > currentRope) return current

    const currentSpeed = parseSpeed(current.speed)
    const candidateSpeed = parseSpeed(candidate.speed)

    if (candidateSpeed > currentSpeed) return candidate
    return current
  }, null)

  return {
    totalSets,
    averageScore,
    averageBuoys,
    averageRope,
    averageSpeed,
    bestSet: best
  }
}

export function getSlalomSeries(
  sets: SkiSet[],
  range: "week" | "month" | "season",
  now = new Date()
): SlalomSeriesPoint[] {
  const slalom = sets.filter(s => s.event === "slalom")
  if (slalom.length === 0) return []

  if (range === "week") {
    const start = startOfWeekMonday(now)
    const days: SlalomSeriesPoint[] = []

    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const iso = dateToIso(d)
      const daySets = slalom.filter(s => normalizeIsoDay(s.date) === iso)
      const avg =
        daySets.length === 0
          ? 0
          : daySets.reduce((sum, s) => {
              return sum + getSlalomScore(s.data.ropeLength ?? "", s.data.buoys ?? null)
            }, 0) / daySets.length

      days.push({
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        value: Number.isFinite(avg) ? avg : 0
      })
    }

    return days
  }

  if (range === "month") {
    const month = now.getMonth()
    const year = now.getFullYear()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const points: SlalomSeriesPoint[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      const iso = dateToIso(d)
      const daySets = slalom.filter(s => normalizeIsoDay(s.date) === iso)
      if (daySets.length === 0) continue
      const avg =
        daySets.reduce((sum, s) => {
          return sum + getSlalomScore(s.data.ropeLength ?? "", s.data.buoys ?? null)
        }, 0) / daySets.length
      points.push({
        label: String(day),
        value: Number.isFinite(avg) ? avg : 0
      })
    }

    return points
  }

  const byMonth = new Map<string, SkiSet[]>()
  slalom.forEach(set => {
    const d = isoToDate(set.date)
    const key = monthKeyFromDate(d)
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(set)
  })

  const monthKeys = Array.from(byMonth.keys()).sort()

  return monthKeys.map(key => {
    const monthSets = byMonth.get(key) ?? []
    const avg =
      monthSets.length === 0
        ? 0
        : monthSets.reduce((sum, s) => {
            return sum + getSlalomScore(s.data.ropeLength ?? "", s.data.buoys ?? null)
          }, 0) / monthSets.length

    return {
      label: monthLabelFromKey(key),
      value: Number.isFinite(avg) ? avg : 0
    }
  })
}
