import { useEffect, useMemo, useState } from "react"
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
  getMonthlyProgress,
  getCurrentStreak
} from "../features/insights/insightsSelectors"

export default function Insights() {
  const navigate = useNavigate()

  const { sets, setsHydrated, seasons, activeSeasonId } = useSetsStore()
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)

  const getSeasonLabel = (startDate: string) => {
    const year = startDate.slice(0, 4)
    return `${year} Season`
  }

  const sortedSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [seasons])

  useEffect(() => {
    if (sortedSeasons.length === 0) {
      setSelectedSeasonId(null)
      return
    }

    const hasSelected = selectedSeasonId
      ? sortedSeasons.some(season => season.id === selectedSeasonId)
      : false

    if (!hasSelected) {
      setSelectedSeasonId(activeSeasonId ?? sortedSeasons[0].id)
    }
  }, [sortedSeasons, selectedSeasonId, activeSeasonId])

  const selectedSeason = useMemo(() => {
    if (!selectedSeasonId) return undefined
    return seasons.find(season => season.id === selectedSeasonId)
  }, [seasons, selectedSeasonId])

  const dropdownSeasons = useMemo(() => {
    return sortedSeasons.map(season => ({
      id: season.id,
      label: getSeasonLabel(season.startDate)
    }))
  }, [sortedSeasons])

  const seasonSets = useMemo(() => {
    if (!selectedSeasonId) return []
    return sets.filter(s => s.seasonId === selectedSeasonId)
  }, [sets, selectedSeasonId])

  const weeklyStats = useMemo(() => getWeeklyStats(seasonSets), [seasonSets])

  const weeklyBars = useMemo(
    () => getWeeklyChartBars(seasonSets),
    [seasonSets]
  )

  const trainingDaysThisMonth = useMemo(
    () => getMonthlyTrainingDays(sets),
    [sets]
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
    () => getMonthlyProgress(sets),
    [sets]
  )

  const currentStreak = useMemo(
    () => getCurrentStreak(seasonSets),
    [seasonSets]
  )

  if (!setsHydrated) {
    return (
      <div className="px-4 pt-6">
        <p className="text-sm text-gray-500">
          Loading insights
        </p>
      </div>
    )
  }

  if (!selectedSeason) {
    return (
      <div className="px-4 pt-6">
        <InsightsHeader
          seasons={dropdownSeasons}
          selectedSeasonId={selectedSeasonId}
          onSeasonChange={setSelectedSeasonId}
        />

        <p className="mt-4 text-sm text-gray-500">
          No active season found
        </p>

        <button
          onClick={() => navigate("/season-settings")}
          className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm text-white"
        >
          View season details
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <InsightsHeader
        seasons={dropdownSeasons}
        selectedSeasonId={selectedSeasonId}
        onSeasonChange={setSelectedSeasonId}
      />

      <div className="space-y-4">
        <SeasonOverviewCard
          seasonName={getSeasonLabel(selectedSeason.startDate)}
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
          currentStreak={String(currentStreak)}
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
