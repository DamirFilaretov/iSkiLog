export type DateRangeKey = "day" | "week" | "month" | "season" | "custom" | "all"
export type InsightRangeKey = "week" | "month" | "season" | "custom"

type DateRangeFilterOptions = {
  customStart?: string
  customEnd?: string
  now?: Date
}

type DateLike = {
  date: string
}

export function toLocalIsoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function todayLocalIsoDate(now = new Date()) {
  return toLocalIsoDate(now)
}

export function daysAgoLocalIsoDate(days: number, now = new Date()) {
  const next = new Date(now)
  next.setDate(next.getDate() - days)
  return toLocalIsoDate(next)
}

function normalizeIsoDay(iso: string) {
  return iso.slice(0, 10)
}

function isoToLocalDate(iso: string) {
  const [y, m, d] = normalizeIsoDay(iso).split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function filterByDateRange<T extends DateLike>(
  items: T[],
  range: DateRangeKey | null,
  options?: DateRangeFilterOptions
): T[] {
  const now = options?.now ?? new Date()
  const customStart = options?.customStart ?? ""
  const customEnd = options?.customEnd ?? ""

  if (range === null || range === "all" || range === "season") {
    return items
  }

  if (range === "day") {
    const today = todayLocalIsoDate(now)
    return items.filter(item => normalizeIsoDay(item.date) === today)
  }

  if (range === "week") {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)

    return items.filter(item => {
      const day = isoToLocalDate(item.date)
      return day >= start && day <= end
    })
  }

  if (range === "month") {
    const month = now.getMonth()
    const year = now.getFullYear()

    return items.filter(item => {
      const day = isoToLocalDate(item.date)
      return day.getMonth() === month && day.getFullYear() === year
    })
  }

  if (range === "custom") {
    if (!customStart || !customEnd) return items
    if (customStart > customEnd) return []

    return items.filter(item => {
      const dayIso = normalizeIsoDay(item.date)
      return dayIso >= customStart && dayIso <= customEnd
    })
  }

  return items
}

