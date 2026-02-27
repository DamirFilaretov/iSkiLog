import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Check, Search } from "lucide-react"

import {
  fetchInProgressTrickIds,
  fetchLearnedTrickIds,
  setTrickInProgress,
  setTrickLearned
} from "../data/tricksLearnedApi"
import { applyToggleResponse, setLearnedState } from "../features/tricks/learnedToggle"
import { searchTricks, TRICK_CATALOG } from "../features/tricks/trickCatalog"

type ToggleTarget = "learned" | "in_progress"

const SURFACE_TRICK_CODES = new Set([
  "S",
  "B",
  "F",
  "O",
  "BB",
  "5B",
  "5F",
  "7F",
  "7B"
])

const SURFACE_TOES_TRICK_CODES = new Set([
  "TS",
  "TB",
  "TF",
  "TO",
  "TBB",
  "T5B",
  "T7F",
  "T5F"
])

const WAKE_TRICK_CODES = new Set([
  "WB",
  "WF",
  "WO",
  "WBB",
  "W5B",
  "W5F",
  "W7F",
  "W7B",
  "W9B",
  "W9F"
])

const WAKE_TOES_TRICK_CODES = new Set([
  "TWB",
  "TWF",
  "TWO",
  "TWBB",
  "TW5B",
  "TW7F",
  "TW5F"
])

const TOE_WAKE_LINES_CODES = new Set([
  "TW7B",
  "TWLB",
  "TWLF",
  "TWLO",
  "TWLBB",
  "TWL5B",
  "TWL5F"
])

const STEPOVER_TRICK_CODES = new Set([
  "LB",
  "LF",
  "WLB",
  "WLF",
  "WLO",
  "WLBB",
  "WL5B",
  "WL5LB",
  "WL7F",
  "WL9B",
  "WL5F",
  "WL5LF",
  "WL7B",
  "WL9F"
])

const FLIP_TRICK_CODES = new Set([
  "FFL",
  "BFL",
  "BDFL",
  "BFLO",
  "BFLBB",
  "BFLB",
  "BFLLB",
  "BFLF",
  "BFL5F",
  "BFL5B",
  "FFLB"
])

const SKILINE_TRICK_CODES = new Set([
  "SLB",
  "SLF",
  "SLO",
  "SLBB",
  "SL5B",
  "SL5F",
  "SL7B",
  "SL7F"
])

function sectionCode(trickCode: string) {
  return trickCode.startsWith("R") ? trickCode.slice(1) : trickCode
}

function isToesTrickCode(trickName: string) {
  const code = sectionCode(trickName)
  return (
    SURFACE_TOES_TRICK_CODES.has(code) ||
    WAKE_TOES_TRICK_CODES.has(code) ||
    TOE_WAKE_LINES_CODES.has(code)
  )
}

export default function TricksLibrary() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [disciplineFilter, setDisciplineFilter] = useState<"hands" | "toes">("hands")

  const [learnedIds, setLearnedIds] = useState<Set<string>>(() => new Set())
  const [inProgressIds, setInProgressIds] = useState<Set<string>>(() => new Set())
  const [savingKeys, setSavingKeys] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const latestRequestVersionRef = useRef<Record<string, number>>({})

  const query = searchParams.get("q") ?? ""

  const filteredTricks = useMemo(() => {
    return searchTricks(query)
  }, [query])

  const trickSections = useMemo(() => {
    const surfaceTricks = filteredTricks.filter(trick => SURFACE_TRICK_CODES.has(sectionCode(trick.name)))
    const surfaceToesTricks = filteredTricks.filter(trick => SURFACE_TOES_TRICK_CODES.has(sectionCode(trick.name)))
    const wakeTricks = filteredTricks.filter(trick => WAKE_TRICK_CODES.has(sectionCode(trick.name)))
    const wakeToesTricks = filteredTricks.filter(trick => WAKE_TOES_TRICK_CODES.has(sectionCode(trick.name)))
    const toeWakeLinesTricks = filteredTricks.filter(trick => TOE_WAKE_LINES_CODES.has(sectionCode(trick.name)))
    const stepoverTricks = filteredTricks.filter(trick => STEPOVER_TRICK_CODES.has(sectionCode(trick.name)))
    const flipTricks = filteredTricks.filter(trick => FLIP_TRICK_CODES.has(sectionCode(trick.name)))
    const skilineTricks = filteredTricks.filter(trick => SKILINE_TRICK_CODES.has(sectionCode(trick.name)))
    const otherTricks = filteredTricks.filter(trick => {
      const code = sectionCode(trick.name)
      return (
        !SURFACE_TRICK_CODES.has(code) &&
        !SURFACE_TOES_TRICK_CODES.has(code) &&
        !WAKE_TRICK_CODES.has(code) &&
        !WAKE_TOES_TRICK_CODES.has(code) &&
        !TOE_WAKE_LINES_CODES.has(code) &&
        !STEPOVER_TRICK_CODES.has(code) &&
        !FLIP_TRICK_CODES.has(code) &&
        !SKILINE_TRICK_CODES.has(code)
      )
    })

    return [
      { title: "Surface tricks", tricks: surfaceTricks },
      { title: "Surface Toes Tricks", tricks: surfaceToesTricks },
      { title: "Wake tricks", tricks: wakeTricks },
      { title: "Toes Wake Tricks", tricks: wakeToesTricks },
      { title: "Toes Wake Lines", tricks: toeWakeLinesTricks },
      { title: "Stepovers", tricks: stepoverTricks },
      { title: "Flips", tricks: flipTricks },
      { title: "Ski Lines *", tricks: skilineTricks },
      { title: "Other tricks", tricks: otherTricks }
    ].filter(section => section.tricks.length > 0)
  }, [filteredTricks])

  const visibleSections = useMemo(() => {
    if (disciplineFilter === "hands") {
      return trickSections.filter(section => !section.title.toLowerCase().includes("toes"))
    }
    return trickSections.filter(section => section.title.toLowerCase().includes("toes"))
  }, [trickSections, disciplineFilter])

  const disciplineTotals = useMemo(() => {
    const relevantCatalog =
      disciplineFilter === "toes"
        ? TRICK_CATALOG.filter(trick => isToesTrickCode(trick.name))
        : TRICK_CATALOG.filter(trick => !isToesTrickCode(trick.name))

    const learnedCount = relevantCatalog.reduce((sum, trick) => {
      return sum + (learnedIds.has(trick.id) ? 1 : 0)
    }, 0)

    return {
      learned: learnedCount,
      total: relevantCatalog.length
    }
  }, [disciplineFilter, learnedIds])

  useEffect(() => {
    let active = true

    async function loadLearned() {
      setLoading(true)
      setLoadError(null)

      try {
        const [learned, inProgress] = await Promise.all([
          fetchLearnedTrickIds(),
          fetchInProgressTrickIds()
        ])
        if (!active) return
        setLearnedIds(learned)
        setInProgressIds(inProgress)
      } catch (err) {
        console.error("Failed to load trick selections", err)
        if (!active) return
        setLoadError("Unable to load trick selections")
      } finally {
        if (active) setLoading(false)
      }
    }

    loadLearned()

    return () => {
      active = false
    }
  }, [])

  function updateQuery(nextValue: string) {
    const nextParams = new URLSearchParams(searchParams)
    const trimmed = nextValue.trim()

    if (trimmed.length > 0) {
      nextParams.set("q", nextValue)
    } else {
      nextParams.delete("q")
    }

    setSearchParams(nextParams, { replace: true })
  }

  async function handleToggle(trickId: string, target: ToggleTarget) {
    if (loading) return

    const requestKey = `${trickId}:${target}`
    if (savingKeys.has(requestKey)) return

    setSaveError(null)

    const isLearnedToggle = target === "learned"
    const previousValue = isLearnedToggle
      ? learnedIds.has(trickId)
      : inProgressIds.has(trickId)
    const nextValue = !previousValue

    const requestVersion = (latestRequestVersionRef.current[requestKey] ?? 0) + 1
    latestRequestVersionRef.current[requestKey] = requestVersion

    setSavingKeys(prev => {
      const next = new Set(prev)
      next.add(requestKey)
      return next
    })

    if (isLearnedToggle) {
      setLearnedIds(prev => setLearnedState(prev, trickId, nextValue))
    } else {
      setInProgressIds(prev => setLearnedState(prev, trickId, nextValue))
    }

    try {
      if (isLearnedToggle) {
        await setTrickLearned({ trickId, learned: nextValue })
      } else {
        await setTrickInProgress({ trickId, inProgress: nextValue })
      }

      const latestVersion = latestRequestVersionRef.current[requestKey] ?? 0
      if (isLearnedToggle) {
        setLearnedIds(prev => {
          return applyToggleResponse({
            current: prev,
            trickId,
            latestVersion,
            responseVersion: requestVersion,
            succeeded: true,
            previousLearned: previousValue
          })
        })
      } else {
        setInProgressIds(prev => {
          return applyToggleResponse({
            current: prev,
            trickId,
            latestVersion,
            responseVersion: requestVersion,
            succeeded: true,
            previousLearned: previousValue
          })
        })
      }
    } catch (err) {
      console.error("Failed to save trick selection", err)
      setSaveError("Unable to save trick selection. Please try again.")
      const latestVersion = latestRequestVersionRef.current[requestKey] ?? 0
      if (isLearnedToggle) {
        setLearnedIds(prev => {
          return applyToggleResponse({
            current: prev,
            trickId,
            latestVersion,
            responseVersion: requestVersion,
            succeeded: false,
            previousLearned: previousValue
          })
        })
      } else {
        setInProgressIds(prev => {
          return applyToggleResponse({
            current: prev,
            trickId,
            latestVersion,
            responseVersion: requestVersion,
            succeeded: false,
            previousLearned: previousValue
          })
        })
      }
    } finally {
      const latestVersion = latestRequestVersionRef.current[requestKey] ?? 0
      if (latestVersion !== requestVersion) return

      setSavingKeys(prev => {
        const next = new Set(prev)
        next.delete(requestKey)
        return next
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="px-4 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/insights?event=tricks")}
            className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
            aria-label="Go back to insights"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>

          <div>
            <h1 className="text-xl font-semibold text-slate-900">Tricks Library</h1>
            <p className="text-sm text-slate-500">Mark tricks as learned or in progress</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <label className="text-xs text-slate-500">Search trick code</label>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={event => updateQuery(event.target.value)}
              placeholder="Search by trick code"
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
            />
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
            <select
              value={disciplineFilter}
              onChange={event => setDisciplineFilter(event.target.value as "hands" | "toes")}
              aria-label="Filter by hands or toes"
              className="bg-transparent text-sm font-medium text-slate-700 outline-none"
            >
              <option value="hands">Hands</option>
              <option value="toes">Toes</option>
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Learned in {disciplineFilter}: {loading ? "..." : disciplineTotals.learned} of {disciplineTotals.total}
        </p>
      </div>

      {loadError ? (
        <div className="px-4 mt-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        </div>
      ) : null}

      {saveError ? (
        <div className="px-4 mt-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {saveError}
          </div>
        </div>
      ) : null}

      <div className="px-4 mt-4">
        {loading ? (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-6 text-sm text-slate-500">Loading tricks...</div>
          </div>
        ) : filteredTricks.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-6 text-sm text-slate-500">No tricks found for your search.</div>
          </div>
        ) : visibleSections.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-6 text-sm text-slate-500">No tricks found for this filter.</div>
          </div>
        ) : (
          visibleSections.map((section, sectionIndex) => (
            <div key={section.title} className={sectionIndex > 0 ? "mt-4" : ""}>
              <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <p className="text-[15px] font-bold text-slate-700">
                    {section.title}
                  </p>
                </div>
                <div className="grid grid-cols-4 items-center gap-3 border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <span className="justify-self-start">Trick code</span>
                  <span className="justify-self-start">Points</span>
                  <span className="text-center">In Progress</span>
                  <span className="text-right">Learned</span>
                </div>
                {section.tricks.map(trick => {
                  return (
                    <div
                      key={trick.id}
                      className="grid grid-cols-4 items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                    >
                      <span className="justify-self-start text-sm text-slate-900">{trick.name}</span>
                      <span className="justify-self-start text-sm text-slate-700">
                        {trick.points2.toLocaleString()}
                      </span>
                      <div className="flex justify-center">
                        {(() => {
                          const checked = inProgressIds.has(trick.id)
                          const saving = savingKeys.has(`${trick.id}:in_progress`)

                          return (
                            <button
                              type="button"
                              onClick={() => handleToggle(trick.id, "in_progress")}
                              disabled={saving || loading}
                              className={[
                                "h-7 w-7 rounded-full border flex items-center justify-center transition",
                                checked
                                  ? "border-orange-500 bg-orange-500 text-white"
                                  : "border-slate-300 bg-white text-transparent",
                                saving ? "opacity-60 cursor-not-allowed" : ""
                              ].join(" ")}
                              aria-label={checked ? `Unmark ${trick.name} as in progress` : `Mark ${trick.name} as in progress`}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )
                        })()}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleToggle(trick.id, "learned")}
                          disabled={savingKeys.has(`${trick.id}:learned`) || loading}
                          className={[
                            "h-7 w-7 rounded-full border flex items-center justify-center transition",
                            learnedIds.has(trick.id)
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 bg-white text-transparent",
                            savingKeys.has(`${trick.id}:learned`) ? "opacity-60 cursor-not-allowed" : ""
                          ].join(" ")}
                          aria-label={learnedIds.has(trick.id) ? `Unmark ${trick.name}` : `Mark ${trick.name} as learned`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

