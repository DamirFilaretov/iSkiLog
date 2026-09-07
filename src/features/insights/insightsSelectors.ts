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
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const start = new Date(now)
  start.setDate(now.getDate() - 6)
  start.setHours(0, 0, 0, 0)

  const thisWeek = sets.filter(s => {
    const d = isoToDate(s.date)
    return d >= start && d <= end
  })

  const lastWeekStart = new Date(start)
  lastWeekStart.setDate(start.getDate() - 7)
  lastWeekStart.setHours(0, 0, 0, 0)

  const lastWeekEnd = new Date(end)
  lastWeekEnd.setDate(end.getDate() - 7)
  lastWeekEnd.setHours(23, 59, 59, 999)

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
    totalLastWeek: lastWeek.length,
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
        ? "--"
        : `${stats.deltaPercent > 0 ? "Up" : "Down"} ${Math.abs(
            Math.round(stats.deltaPercent)
          )}% from last week`
  }
}

export function getMonthlyChartBars(
  sets: SkiSet[],
  now = new Date()
): WeeklyChartBars {
  const rangeEnd = new Date(now)
  rangeEnd.setHours(23, 59, 59, 999)
  const rangeStart = new Date(now)
  rangeStart.setDate(rangeEnd.getDate() - 29)
  rangeStart.setHours(0, 0, 0, 0)

  const previousRangeStart = new Date(rangeStart)
  previousRangeStart.setDate(previousRangeStart.getDate() - 30)
  previousRangeStart.setHours(0, 0, 0, 0)
  const previousRangeEnd = new Date(rangeStart)
  previousRangeEnd.setDate(previousRangeEnd.getDate() - 1)
  previousRangeEnd.setHours(23, 59, 59, 999)

  const thisRangeSets = sets.filter(s => {
    const d = isoToDate(s.date)
    return d >= rangeStart && d <= rangeEnd
  })

  const previousRangeSets = sets.filter(s => {
    const d = isoToDate(s.date)
    return d >= previousRangeStart && d <= previousRangeEnd
  })

  const bars = []
  for (let i = 0; i < 30; i += 1) {
    const currentDate = new Date(rangeStart)
    currentDate.setDate(rangeStart.getDate() + i)
    const iso = dateToIso(currentDate)
    const count = thisRangeSets.filter(s => normalizeIsoDay(s.date) === iso).length
    bars.push({
      day: currentDate.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
      count
    })
  }

  const max = Math.max(...bars.map(d => d.count), 1)
  const deltaPercent =
    previousRangeSets.length === 0
      ? null
      : ((thisRangeSets.length - previousRangeSets.length) / previousRangeSets.length) * 100

  return {
    bars: bars.map(d => ({
      day: d.day,
      count: d.count,
      heightPercent: (d.count / max) * 100
    })),
    totalText: `Total last 30 days: ${thisRangeSets.length} sets`,
    deltaText:
      deltaPercent === null
        ? "--"
        : `${deltaPercent > 0 ? "Up" : "Down"} ${Math.abs(
            Math.round(deltaPercent)
          )}% from previous 30 days`
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
  totalPasses: number
  averagePassesPerSet: number
  averageScore: number
  averageBuoys: number
  averageRope: number
  averageSpeed: number
  bestSet: SlalomBestSet | null
}

export type SlalomSeriesPoint = {
  label: string
  value: number
  bestSet: SlalomBestSet | null
  startDate: string
  endDate: string
}

function ropeIndexFromLength(value: string | number | null | undefined): number {
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
  const slalom = sets.filter((s): s is SkiSet & { event: "slalom" } => s.event === "slalom")
  const totalSets = slalom.length
  const totalPasses = slalom.reduce((sum, set) => {
    const value = set.data.passesCount
    if (value === null || value === undefined || !Number.isFinite(value)) return sum
    return sum + Math.max(0, value)
  }, 0)
  const averagePassesPerSet = totalSets === 0 ? 0 : totalPasses / totalSets

  const scoreValues = slalom.map(s =>
    getSlalomScore(s.data.ropeLength ?? "", s.data.buoys ?? null)
  )

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

  const best = getBestSlalomSet(slalom)

  return {
    totalSets,
    totalPasses,
    averagePassesPerSet,
    averageScore,
    averageBuoys,
    averageRope,
    averageSpeed,
    bestSet: best
  }
}

function getBestSlalomSet(slalom: (SkiSet & { event: "slalom" })[]): SlalomBestSet | null {
  return slalom.reduce<SlalomBestSet | null>((current, set) => {
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
}

/*
  Chart series for the "Results Over Time" bar chart: one point per slalom set,
  the most recent `count` sets across all history, ordered oldest → newest.
  Deliberately ignores season and date-range filters so the chart is always
  dense (no empty buckets).
*/
export function getSlalomLastNSets(
  sets: SkiSet[],
  count: number
): SlalomSeriesPoint[] {
  if (count <= 0) return []

  const slalom = sets
    .filter((s): s is SkiSet & { event: "slalom" } => s.event === "slalom")
    .map((set, index) => ({ set, index }))
    .sort((a, b) => {
      const dayA = normalizeIsoDay(a.set.date)
      const dayB = normalizeIsoDay(b.set.date)
      if (dayA !== dayB) return dayA < dayB ? -1 : 1

      const timeA = a.set.timeOfDay ?? ""
      const timeB = b.set.timeOfDay ?? ""
      if (timeA !== timeB) return timeA < timeB ? -1 : 1

      return a.index - b.index
    })
    .map(entry => entry.set)

  return slalom.slice(-count).map(set => {
    const iso = normalizeIsoDay(set.date)
    const bestSet: SlalomBestSet = {
      buoys: set.data.buoys ?? null,
      ropeLength: set.data.ropeLength ?? "",
      speed: set.data.speed ?? "",
      date: set.date,
      score: getSlalomScore(set.data.ropeLength ?? "", set.data.buoys ?? null)
    }

    return {
      label: isoToDate(iso).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
      value: bestSet.score,
      bestSet,
      startDate: iso,
      endDate: iso
    }
  })
}

