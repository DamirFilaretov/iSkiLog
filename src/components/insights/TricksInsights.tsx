import { useEffect, useMemo, useState } from "react"
import { Clock3, Trophy, Hand, Footprints, ListChecks, Sparkles, ExternalLink } from "lucide-react"
import type { SkiSet } from "../../types/sets"
import DateFieldNativeOverlay from "../date/DateFieldNativeOverlay"
import { useNavigate } from "react-router-dom"
import { fetchInProgressTrickIds, fetchLearnedTrickIds } from "../../data/tricksLearnedApi"
import { TRICK_CATALOG } from "../../features/tricks/trickCatalog"

type RangeKey = "week" | "month" | "season" | "custom"
type TrickType = "hands" | "toes"
type TrickSession = {
  id: string
  date: string
  durationMinutes: number
  trickType: TrickType
}

type TricksInsightDataSource = {
  sessions: TrickSession[]
}

type Props = {
  sets: SkiSet[]
  dataSource?: TricksInsightDataSource
}

function todayLocalIso() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function isoToDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function toLocalIso(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function clampRange(start: Date, end: Date) {
  const normalizedStart = new Date(start)
  const normalizedEnd = new Date(end)
  normalizedStart.setHours(0, 0, 0, 0)
  normalizedEnd.setHours(23, 59, 59, 999)
  return { start: normalizedStart, end: normalizedEnd }
}

function sessionsFromSets(sets: SkiSet[]): TrickSession[] {
  return sets
    .filter((set): set is SkiSet & { event: "tricks" } => set.event === "tricks")
    .map(set => ({
      id: set.id,
      date: set.date,
      durationMinutes: set.data.duration ?? 0,
      trickType: set.data.trickType
    }))
}

function filterSessionsByRange(
  sessions: TrickSession[],
  range: RangeKey,
  customStart: string,
  customEnd: string
) {
  const now = new Date()

  if (range === "season") return sessions

  if (range === "week") {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    const bounds = clampRange(start, end)
    return sessions.filter(session => {
      const d = isoToDate(session.date)
      return d >= bounds.start && d <= bounds.end
    })
  }

  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const bounds = clampRange(start, end)
    return sessions.filter(session => {
      const d = isoToDate(session.date)
      return d >= bounds.start && d <= bounds.end
    })
  }

  if (!customStart || !customEnd) return sessions

  const start = isoToDate(customStart)
  const end = isoToDate(customEnd)
  const bounds = clampRange(start, end)
  return sessions.filter(session => {
    const d = isoToDate(session.date)
    return d >= bounds.start && d <= bounds.end
  })
}

export default function TricksInsights({ sets, dataSource }: Props) {
  const navigate = useNavigate()
  const [range, setRange] = useState<RangeKey>("week")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [learnedTrickIds, setLearnedTrickIds] = useState<Set<string> | null>(null)
  const [inProgressTrickIds, setInProgressTrickIds] = useState<Set<string> | null>(null)
  const [selectionLoadError, setSelectionLoadError] = useState<string | null>(null)

  // Metrics come from real sets by default.
  const sourceSessions = useMemo(
    () => dataSource?.sessions ?? sessionsFromSets(sets),
    [dataSource?.sessions, sets]
  )

  useEffect(() => {
    if (range !== "custom") return
    if (customStart && customEnd) return
    const end = todayLocalIso()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setCustomStart(toLocalIso(start))
    setCustomEnd(end)
  }, [range, customStart, customEnd])

  useEffect(() => {
    let active = true

    async function loadTrickSelections() {
      setSelectionLoadError(null)

      try {
        const [learnedIds, inProgressIds] = await Promise.all([
          fetchLearnedTrickIds(),
          fetchInProgressTrickIds()
        ])
        if (!active) return
        setLearnedTrickIds(learnedIds)
        setInProgressTrickIds(inProgressIds)
      } catch (err) {
        console.error("Failed to load trick selections for insights", err)
        if (!active) return
        setSelectionLoadError("Unable to load trick selections")
      }
    }

    loadTrickSelections()

    return () => {
      active = false
    }
  }, [])

  const filteredSessions = useMemo(
    () => filterSessionsByRange(sourceSessions, range, customStart, customEnd),
    [sourceSessions, range, customStart, customEnd]
  )

  const totalMinutes = useMemo(
    () => filteredSessions.reduce((sum, session) => sum + session.durationMinutes, 0),
    [filteredSessions]
  )

  const totalHoursText = useMemo(
    () => (totalMinutes / 60).toFixed(1),
    [totalMinutes]
  )

  const handsCount = useMemo(
    () => filteredSessions.filter(session => session.trickType === "hands").length,
    [filteredSessions]
  )

  const toesCount = useMemo(
    () => filteredSessions.filter(session => session.trickType === "toes").length,
    [filteredSessions]
  )

  const totalTypeCount = handsCount + toesCount
  const handsPercent = totalTypeCount === 0 ? 0 : Math.round((handsCount / totalTypeCount) * 100)
  const toesPercent = totalTypeCount === 0 ? 0 : Math.round((toesCount / totalTypeCount) * 100)

  const learnedTricksFromCatalog = useMemo(() => {
    if (!learnedTrickIds) return []

    return TRICK_CATALOG.filter(item => learnedTrickIds.has(item.id))
  }, [learnedTrickIds])

  const inProgressTricksFromCatalog = useMemo(() => {
    if (!inProgressTrickIds) return []

    return TRICK_CATALOG.filter(item => inProgressTrickIds.has(item.id))
  }, [inProgressTrickIds])

  const learnedPreview = useMemo(() => learnedTricksFromCatalog.slice(0, 5), [learnedTricksFromCatalog])
  const hasMoreLearnedTricks = learnedTricksFromCatalog.length > learnedPreview.length
  const inProgressPreview = useMemo(() => inProgressTricksFromCatalog.slice(0, 5), [inProgressTricksFromCatalog])
  const hasMoreInProgressTricks = inProgressTricksFromCatalog.length > inProgressPreview.length

  const totalTrickCount = TRICK_CATALOG.length

  const learnedCountText =
    learnedTrickIds === null
      ? selectionLoadError
        ? `-- of ${totalTrickCount}`
        : `... of ${totalTrickCount}`
      : `${learnedTrickIds.size} of ${totalTrickCount}`

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

      <div className="grid grid-cols-2 gap-3 px-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-600">
              <Clock3 className="h-4 w-4" />
            </div>
            <p className="text-xs text-slate-500">Total Hours</p>
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900 leading-tight">
            {totalHoursText}h
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {range === "season" ? "This season" : "Selected range"}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-600">
              <Trophy className="h-4 w-4" />
            </div>
            <p className="text-xs text-slate-500">Learned</p>
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900 leading-tight">
            {learnedCountText}
          </p>
          <button
            type="button"
            onClick={() => navigate("/insights/tricks-library")}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-600 transition hover:text-slate-900"
          >
            Trick Library
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {selectionLoadError ? (
        <div className="px-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Unable to load trick selections
          </div>
        </div>
      ) : null}

      <div className="px-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <div>
            <p className="text-sm font-semibold text-slate-900">Hands vs Toes Ratio</p>
          </div>
          <div className="mt-3 space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Hand className="h-4 w-4 text-blue-500" />
                  <span>Hands</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{handsPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{ width: `${handsPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Footprints className="h-4 w-4 text-fuchsia-500" />
                  <span>Toes</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{toesPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-fuchsia-500"
                  style={{ width: `${toesPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Learned Tricks</p>
            <ListChecks className="h-4 w-4 text-emerald-600" />
          </div>
          {selectionLoadError ? (
            <p className="mt-3 text-sm text-red-600">Unable to load trick selections</p>
          ) : learnedTricksFromCatalog.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No learned tricks yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {learnedPreview.map(trick => (
                <li
                  key={trick.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span>{trick.name}</span>
                  <span className="font-semibold text-slate-900">{trick.points2}</span>
                </li>
              ))}
            </ul>
          )}

          {hasMoreLearnedTricks ? (
            <button
              type="button"
              onClick={() => navigate("/insights/tricks-library")}
              className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
            >
              See more
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">In Progress</p>
            <Sparkles className="h-4 w-4 text-orange-500" />
          </div>
          {selectionLoadError ? (
            <p className="mt-3 text-sm text-red-600">Unable to load trick selections</p>
          ) : inProgressTricksFromCatalog.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No in-progress tricks yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {inProgressPreview.map(trick => (
                <li
                  key={trick.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span>{trick.name}</span>
                  <span className="font-semibold text-slate-900">{trick.points2}</span>
                </li>
              ))}
            </ul>
          )}

          {hasMoreInProgressTricks ? (
            <button
              type="button"
              onClick={() => navigate("/insights/tricks-library")}
              className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
            >
              See more
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-4">
        <button
          type="button"
          onClick={() => navigate("/insights/tricks-library")}
          className="w-full rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm font-medium text-fuchsia-700 shadow-sm"
        >
          Manage Learned Tricks
        </button>
      </div>
    </div>
  )
}
