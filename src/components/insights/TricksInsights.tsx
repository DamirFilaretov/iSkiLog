import { useEffect, useMemo, useState } from "react"
import { Clock3, Trophy, Hand, Footprints, ListChecks, Sparkles } from "lucide-react"
import type { SkiSet } from "../../types/sets"

type RangeKey = "week" | "month" | "season" | "custom"
type TrickType = "hands" | "toes"
type SkillStatus = "learned" | "in_progress" | "to_learn"

type TrickSession = {
  id: string
  date: string
  durationMinutes: number
  trickType: TrickType
}

type TrickSkill = {
  id: string
  name: string
  status: SkillStatus
  learnedAt?: string
}

type TricksInsightDataSource = {
  sessions: TrickSession[]
  skills: TrickSkill[]
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

function dateDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toLocalIso(d)
}

function mockSkills(): TrickSkill[] {
  return [
    { id: "s1", name: "Wake 180", status: "learned" },
    { id: "s2", name: "Back to Front", status: "learned", learnedAt: dateDaysAgo(7) },
    { id: "s7", name: "Body Over", status: "learned", learnedAt: dateDaysAgo(12) },
    { id: "s3", name: "Toe Wake 180", status: "in_progress" },
    { id: "s4", name: "Surface 360", status: "in_progress" },
    { id: "s5", name: "Line Backroll", status: "to_learn" },
    { id: "s6", name: "Toe Back to Front", status: "to_learn" }
  ]
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
  const [range, setRange] = useState<RangeKey>("week")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  // Backend-ready boundary: metrics come from real sets by default, skills remain mocked for now.
  const sourceSessions = useMemo(
    () => dataSource?.sessions ?? sessionsFromSets(sets),
    [dataSource?.sessions, sets]
  )
  const sourceSkills = useMemo(
    () => dataSource?.skills ?? mockSkills(),
    [dataSource?.skills]
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

  const learnedSkills = useMemo(
    () => sourceSkills.filter(skill => skill.status === "learned"),
    [sourceSkills]
  )

  const inProgressOrToLearn = useMemo(
    () => sourceSkills.filter(skill => skill.status === "in_progress" || skill.status === "to_learn"),
    [sourceSkills]
  )

  const learnedThisMonth = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    return learnedSkills.filter(skill => {
      if (!skill.learnedAt) return false
      const d = isoToDate(skill.learnedAt)
      return d.getMonth() === month && d.getFullYear() === year
    }).length
  }, [learnedSkills])

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
        <div className="px-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Start date</label>
            <input
              type="date"
              value={customStart}
              onChange={event => setCustomStart(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">End date</label>
            <input
              type="date"
              value={customEnd}
              onChange={event => setCustomEnd(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm"
            />
          </div>
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
            {learnedSkills.length}
          </p>
          <p className="mt-1 text-xs text-emerald-600">+{learnedThisMonth} this month</p>
        </div>
      </div>

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
          {learnedSkills.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No learned tricks yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {learnedSkills.map(skill => (
                <li key={skill.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {skill.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200/70">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">In Progress / To Learn</p>
            <Sparkles className="h-4 w-4 text-orange-500" />
          </div>
          {inProgressOrToLearn.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No pending tricks.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {inProgressOrToLearn.map(skill => (
                <li key={skill.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {skill.status === "in_progress" ? "In Progress: " : "To Learn: "}
                  {skill.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
