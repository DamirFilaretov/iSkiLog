import { useMemo } from "react"
import { useNavigate } from "react-router-dom"

import { useSetsStore } from "../store/setsStore"

import InsightsHeader from "../components/insights/InsightsHeader"
import SeasonOverviewCard from "../components/insights/SeasonOverviewCard"
import QuickStatsGrid from "../components/insights/QuickStatsGrid"
import EventBreakdown from "../components/insights/EventBreakdown"
import WeeklyActivityChart from "../components/insights/WeeklyActivityChart"
import MonthlyProgressList from "../components/insights/MonthlyProgressList"

import {
  getWeeklyStats,
  getMonthlyTrainingDays,
  getEventBreakdown,
  getMostPracticedEvent,
  getWeeklyChartBars,
  getMonthlyProgress
} from "../features/insights/insightsSelectors"

export default function Insights() {
  const navigate = useNavigate()

  const { sets, setsHydrated, getActiveSeason } = useSetsStore()
  const activeSeason = getActiveSeason()

  if (!setsHydrated) {
    return (
      <div className="px-4 pt-6">
        <p className="text-sm text-gray-500">
          Loading insights
        </p>
      </div>
    )
  }

  if (!activeSeason) {
    return (
      <div className="px-4 pt-6">
        <InsightsHeader />

        <p className="mt-4 text-sm text-gray-500">
          No active season found
        </p>

        <button
          onClick={() => navigate("/season-settings")}
          className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Set up season
        </button>
      </div>
    )
  }

  const seasonSets = useMemo(
    () => sets.filter(s => s.seasonId === activeSeason.id),
    [sets, activeSeason.id]
  )

  const weeklyStats = useMemo(
    () => getWeeklyStats(seasonSets),
    [seasonSets]
  )

  const weeklyBars = useMemo(
    () => getWeeklyChartBars(seasonSets),
    [seasonSets]
  )

  const trainingDaysThisMonth = useMemo(
    () => getMonthlyTrainingDays(seasonSets),
    [seasonSets]
  )

  const mostPracticed = useMemo(
    () => getMostPracticedEvent(seasonSets),
    [seasonSets]
  )

  const eventBreakdown = useMemo(
    () => getEventBreakdown(seasonSets),
    [seasonSets]
  )

  const monthlyProgress = useMemo(
    () => getMonthlyProgress(seasonSets),
    [seasonSets]
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <InsightsHeader />

      <div className="space-y-4">
        <SeasonOverviewCard
          seasonName={activeSeason.name}
          totalSets={seasonSets.length}
        />

        <QuickStatsGrid
          avgPerDay={weeklyStats.avgPerTrainingDay.toFixed(2)}
          avgDeltaText={
            weeklyStats.deltaPercent === null
              ? "—"
              : `${weeklyStats.deltaPercent > 0 ? "↑" : "↓"} ${Math.abs(
                  Math.round(weeklyStats.deltaPercent)
                )}% vs last week`
          }
          trainingDaysThisMonth={String(trainingDaysThisMonth)}
          mostPracticedLabel={mostPracticed.event}
          mostPracticedSubtext={`${mostPracticed.count} sets`}
          currentStreak="—"
        />

        <EventBreakdown items={eventBreakdown} />

        <WeeklyActivityChart
          bars={weeklyBars.bars}
          totalText={weeklyBars.totalText}
          deltaText={weeklyBars.deltaText}
        />

        <MonthlyProgressList items={monthlyProgress} />
      </div>
    </div>
  )
}
