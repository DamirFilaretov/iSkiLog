import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useSetsStore } from "../store/setsStore"
import type { EventKey } from "../types/sets"

import InsightsHeader from "../components/insights/InsightsHeader"
import SeasonOverviewCard from "../components/insights/SeasonOverviewCard"
import QuickStatsGrid from "../components/insights/QuickStatsGrid"
import EventBreakdown from "../components/insights/EventBreakdown"
import WeeklyActivityChart from "../components/insights/WeeklyActivityChart"
import MonthlyProgressList from "../components/insights/MonthlyProgressList"
import SlalomInsights from "../components/insights/SlalomInsights"
import TricksInsights from "../components/insights/TricksInsights"
import JumpInsights from "../components/insights/JumpInsights"
import OtherInsights from "../components/insights/OtherInsights"

import {
  getWeeklyStats,
  getMonthlyTrainingDays,
  getEventBreakdown,
  getMostPracticedEvent,
  getWeeklyChartBars,
  getMonthlyProgress,
  getCurrentStreak
} from "../features/insights/insightsSelectors"

type ExportRange = "season" | "month" | "week" | "custom"

type ExportFormat = "csv" | "excel"

type ResolvedRange =
  | { ok: true; start: string; end: string; label: string }
  | { ok: false; error: string }

type ExportCsvResult =
  | { ok: true; csv: string; filename: string }
  | { ok: false; error: string }

function toLocalIsoDate(date: Date) {
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

function uniqueTrainingDaysCount(sets: { date: string }[]) {
  return new Set(sets.map(s => s.date.slice(0, 10))).size
}

function csvEscape(value: string) {
  const needsQuotes = /[",\n]/.test(value)
  const escaped = value.replace(/"/g, "\"\"")
  return needsQuotes ? `"${escaped}"` : escaped
}

export default function Insights() {
  const navigate = useNavigate()

  const { sets, setsHydrated, seasons, activeSeasonId } = useSetsStore()
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventKey | "all">("all")
  const [exportOpen, setExportOpen] = useState(false)
  const [exportRange, setExportRange] = useState<ExportRange>("season")
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [exportError, setExportError] = useState<string | null>(null)

  const getSeasonLabel = (startDate: string) => {
    const year = startDate.slice(0, 4)
    return `${year} Season`
  }

  const getEventLabel = (event: EventKey | "all") => {
    if (event === "all") return "Training"
    return event.charAt(0).toUpperCase() + event.slice(1)
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

  const activeSeason = useMemo(() => {
    if (!activeSeasonId) return undefined
    return seasons.find(season => season.id === activeSeasonId)
  }, [seasons, activeSeasonId])

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

  const filteredSeasonSets = useMemo(() => {
    if (selectedEvent === "all") return seasonSets
    return seasonSets.filter(s => s.event === selectedEvent)
  }, [seasonSets, selectedEvent])

  const weeklyStats = useMemo(() => getWeeklyStats(filteredSeasonSets), [filteredSeasonSets])

  const weeklyBars = useMemo(
    () => getWeeklyChartBars(filteredSeasonSets),
    [filteredSeasonSets]
  )

  const trainingDaysThisMonth = useMemo(
    () => getMonthlyTrainingDays(filteredSeasonSets),
    [filteredSeasonSets]
  )

  const mostPracticed = useMemo(
    () => getMostPracticedEvent(filteredSeasonSets),
    [filteredSeasonSets]
  )

  const eventBreakdown = useMemo(
    () => getEventBreakdown(filteredSeasonSets),
    [filteredSeasonSets]
  )

  const monthlyProgress = useMemo(
    () => getMonthlyProgress(filteredSeasonSets),
    [filteredSeasonSets]
  )

  const currentStreak = useMemo(
    () => getCurrentStreak(filteredSeasonSets),
    [filteredSeasonSets]
  )

  const seasonTitle = selectedSeason
    ? `${selectedSeason.startDate.slice(0, 4)} ${getEventLabel(selectedEvent)} Training`
    : ""

  const seasonSubtitle =
    selectedEvent === "all"
      ? "Total training sets"
      : `${getEventLabel(selectedEvent)} sets logged`
  const showSlalomInsights = selectedEvent === "slalom"
  const showTricksInsights = selectedEvent === "tricks"
  const showJumpInsights = selectedEvent === "jump"
  const showOtherInsights = selectedEvent === "other"
  const showAllEventOverview = selectedEvent === "all"

  function resolveExportRange(): ResolvedRange {
    if (!activeSeason) {
      return {
        ok: false,
        error: "No active season found."
      }
    }

    const today = new Date()
    const seasonStart = activeSeason.startDate
    const seasonEnd = activeSeason.endDate

    if (exportRange === "season") {
      return {
        ok: true,
        start: seasonStart,
        end: seasonEnd,
        label: getSeasonLabel(activeSeason.startDate)
      }
    }

    if (exportRange === "week") {
      const start = toLocalIsoDate(startOfWeekMonday(today))
      const end = toLocalIsoDate(today)
      return { ok: true, start, end, label: "Current Week" }
    }

    if (exportRange === "month") {
      const start = toLocalIsoDate(new Date(today.getFullYear(), today.getMonth(), 1))
      const end = toLocalIsoDate(today)
      return { ok: true, start, end, label: "Current Month" }
    }

    if (!customStart || !customEnd) {
      return { ok: false, error: "Choose both start and end dates." }
    }

    if (customStart > customEnd) {
      return { ok: false, error: "Start date must be before end date." }
    }

    return { ok: true, start: customStart, end: customEnd, label: "Custom Range" }
  }

  function buildExportCsv(): ExportCsvResult {
    const range = resolveExportRange()
    if (!range.ok) return { ok: false, error: range.error }

    const baseSets = activeSeasonId
      ? sets.filter(s => s.seasonId === activeSeasonId)
      : []

    const filtered = baseSets.filter(s => {
      return s.date >= range.start && s.date <= range.end
    })

    const totalSets = filtered.length
    const trainingDays = uniqueTrainingDaysCount(filtered)
    const breakdown = getEventBreakdown(filtered)
    const mostPracticedEvent = getMostPracticedEvent(filtered)
    const breakdownWithPercent = breakdown.map(item => {
      const percent =
        totalSets === 0 ? 0 : (item.count / totalSets) * 100
      return { ...item, percent }
    })

    const formatLabel = exportFormat === "excel" ? "Excel (CSV)" : "CSV"
    const lines: string[] = []

    lines.push("iSkiLog Export")
    lines.push(`Range,${csvEscape(range.label)}`)
    lines.push(`Start Date,${range.start}`)
    lines.push(`End Date,${range.end}`)
    lines.push(`Format,${formatLabel}`)
    lines.push(`Total Sets,${totalSets}`)
    lines.push(`Total Training Days,${trainingDays}`)
    lines.push(
      `Most Practiced,${csvEscape(
        `${mostPracticedEvent.event} (${mostPracticedEvent.count} sets)`
      )}`
    )

    lines.push("")
    lines.push("Breakdown Summary")
    breakdownWithPercent.forEach(item => {
      lines.push(
        `${csvEscape(item.event)} Sets,${item.count}`
      )
    })

    lines.push("")
    lines.push("Breakdown")
    lines.push("Event,Count,Percentage")

    breakdownWithPercent.forEach(item => {
      lines.push(
        `${csvEscape(item.event)},${item.count},${item.percent.toFixed(1)}%`
      )
    })

    const csv = lines.join("\n")
    const filename = `iSkiLog_${range.start}_to_${range.end}.csv`

    return { ok: true, csv, filename }
  }

  function handleExport() {
    const result = buildExportCsv()
    if (!result.ok) {
      setExportError(result.error ?? "Unable to export.")
      return
    }

    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setExportOpen(false)
    setExportError(null)
  }

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
        <div className="px-4">
          <select
            value={selectedEvent}
            onChange={e => setSelectedEvent(e.target.value as EventKey | "all")}
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-slate-900 shadow-lg shadow-slate-200/60"
          >
            <option value="all">All Events</option>
            <option value="slalom">Slalom</option>
            <option value="tricks">Tricks</option>
            <option value="jump">Jump</option>
            <option value="other">Other</option>
          </select>
        </div>

        <SeasonOverviewCard
          seasonTitle={seasonTitle}
          totalSets={filteredSeasonSets.length}
          subtitle={seasonSubtitle}
          event={selectedEvent}
        />

        {showSlalomInsights ? (
          <SlalomInsights sets={filteredSeasonSets} />
        ) : null}

        {showTricksInsights ? (
          <TricksInsights sets={filteredSeasonSets} />
        ) : null}

        {showJumpInsights ? (
          <JumpInsights sets={filteredSeasonSets} />
        ) : null}

        {showOtherInsights ? (
          <OtherInsights sets={filteredSeasonSets} />
        ) : null}

        {showAllEventOverview ? (
          <>
            <QuickStatsGrid
              avgPerDay={weeklyStats.avgPerTrainingDay.toFixed(2)}
              avgDeltaText={
                weeklyStats.deltaPercent === null
                  ? "--"
                  : `${weeklyStats.deltaPercent > 0 ? "Up" : "Down"} ${Math.abs(
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
          </>
        ) : null}

      </div>

      {showAllEventOverview ? (
        <div className="px-4 pt-6 pb-10">
          <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Export season details</p>
                <p className="mt-1 text-sm text-slate-500">
                  Download summary stats for the active season
                </p>
              </div>
              <button
                onClick={() => {
                  setExportOpen(true)
                  setExportError(null)
                }}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exportOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <button
            type="button"
            aria-label="Close export dialog"
            onClick={() => setExportOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Export Season Details</h3>
            <p className="mt-1 text-sm text-slate-500">
              Choose a timeline and file format.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs text-slate-500">Timeline</label>
                <select
                  value={exportRange}
                  onChange={e => {
                    setExportRange(e.target.value as ExportRange)
                    setExportError(null)
                  }}
                  className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm"
                >
                  <option value="season">Season</option>
                  <option value="month">Current Month</option>
                  <option value="week">Current Week</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {exportRange === "custom" ? (
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
                  <div className="min-w-0">
                    <label className="text-xs text-slate-500">Start date</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={e => {
                        setCustomStart(e.target.value)
                        setExportError(null)
                      }}
                      className="ios-date-fix mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-base"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-slate-500">End date</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={e => {
                        setCustomEnd(e.target.value)
                        setExportError(null)
                      }}
                      className="ios-date-fix mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-base"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="text-xs text-slate-500">Format</label>
                <select
                  value={exportFormat}
                  onChange={e => setExportFormat(e.target.value as ExportFormat)}
                  className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm"
                >
                  <option value="csv">CSV</option>
                  <option value="excel">Excel (CSV)</option>
                </select>
              </div>
            </div>

            {exportError ? (
              <p className="mt-4 text-sm text-red-600">{exportError}</p>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false)
                  setExportError(null)
                }}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-medium text-white"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
