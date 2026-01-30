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
    cuts: 0,
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
    case "cuts":
      return "bg-gradient-to-r from-emerald-500 to-teal-400"
    default:
      return "bg-gradient-to-r from-indigo-500 to-blue-400"
  }
}
