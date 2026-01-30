import type { EventKey } from "../../types/sets"

/* -----------------------------
   Weekly
----------------------------- */

export type WeeklyStats = {
  avgPerTrainingDay: number
  deltaPercent: number | null
  totalThisWeek: number
  dailyCounts: {
    label: string
    count: number
  }[]
}

export type WeeklyChartBars = {
  bars: {
    day: string
    count: number
    heightPercent: number
  }[]
  totalText: string
  deltaText: string
}

/* -----------------------------
   Monthly
----------------------------- */

export type MonthlyProgressItem = {
  monthLabel: string
  trainingDays: number
  totalSets: number
  deltaPercent: number | null
}

/* -----------------------------
   Events
----------------------------- */

export type EventBreakdownItem = {
  event: EventKey
  count: number
  percentage: number
  gradientClass: string
}

export type MostPracticedEvent = {
  event: EventKey
  count: number
}
