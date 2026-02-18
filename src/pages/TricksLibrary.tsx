import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Check, Search } from "lucide-react"

import { fetchLearnedTrickIds, setTrickLearned } from "../data/tricksLearnedApi"
import { applyToggleResponse, setLearnedState } from "../features/tricks/learnedToggle"
import { searchTricks } from "../features/tricks/trickCatalog"

export default function TricksLibrary() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [learnedIds, setLearnedIds] = useState<Set<string>>(() => new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const latestRequestVersionRef = useRef<Record<string, number>>({})

  const query = searchParams.get("q") ?? ""

  const filteredTricks = useMemo(() => {
    return searchTricks(query)
  }, [query])

  useEffect(() => {
    let active = true

    async function loadLearned() {
      setLoading(true)
      setLoadError(null)

      try {
        const ids = await fetchLearnedTrickIds()
        if (!active) return
        setLearnedIds(ids)
      } catch (err) {
        console.error("Failed to load learned tricks", err)
        if (!active) return
        setLoadError("Unable to load learned tricks")
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

  async function handleToggle(trickId: string) {
    if (loading) return
    if (savingIds.has(trickId)) return

    setSaveError(null)

    const previousLearned = learnedIds.has(trickId)
    const nextLearned = !previousLearned

    const requestVersion = (latestRequestVersionRef.current[trickId] ?? 0) + 1
    latestRequestVersionRef.current[trickId] = requestVersion

    setSavingIds(prev => {
      const next = new Set(prev)
      next.add(trickId)
      return next
    })

    setLearnedIds(prev => setLearnedState(prev, trickId, nextLearned))

    try {
      await setTrickLearned({ trickId, learned: nextLearned })
      const latestVersion = latestRequestVersionRef.current[trickId] ?? 0
      setLearnedIds(prev => {
        return applyToggleResponse({
          current: prev,
          trickId,
          latestVersion,
          responseVersion: requestVersion,
          succeeded: true,
          previousLearned
        })
      })
    } catch (err) {
      console.error("Failed to save learned trick", err)
      setSaveError("Unable to save learned trick. Please try again.")
      const latestVersion = latestRequestVersionRef.current[trickId] ?? 0
      setLearnedIds(prev => {
        return applyToggleResponse({
          current: prev,
          trickId,
          latestVersion,
          responseVersion: requestVersion,
          succeeded: false,
          previousLearned
        })
      })
    } finally {
      const latestVersion = latestRequestVersionRef.current[trickId] ?? 0
      if (latestVersion !== requestVersion) return

      setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(trickId)
        return next
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="px-4 pt-6 pb-4">
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
            <p className="text-sm text-slate-500">Select the tricks you already learned</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <label className="text-xs text-slate-500">Search trick code</label>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={event => updateQuery(event.target.value)}
            placeholder="Search by trick code"
            className="w-full bg-transparent text-sm text-slate-900 outline-none"
          />
        </div>
      </div>

      {loadError ? (
        <div className="px-4 mt-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Unable to load learned tricks
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
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_4.5rem_auto] gap-3 border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>Trick code</span>
            <span className="text-left">Points</span>
            <span className="text-right">Learned</span>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-sm text-slate-500">Loading tricks...</div>
          ) : filteredTricks.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">No tricks found for your search.</div>
          ) : (
            filteredTricks.map(trick => {
              const checked = learnedIds.has(trick.id)
              const saving = savingIds.has(trick.id)

              return (
                <div
                  key={trick.id}
                  className="grid grid-cols-[1fr_4.5rem_auto] gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                >
                  <span className="text-sm text-slate-900">{trick.name}</span>
                  <span className="text-sm text-slate-700 text-left">
                    {trick.points2.toLocaleString()}
                  </span>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleToggle(trick.id)}
                      disabled={saving || loading}
                      className={[
                        "h-7 w-7 rounded-full border flex items-center justify-center transition",
                        checked
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white text-transparent",
                        saving ? "opacity-60 cursor-not-allowed" : ""
                      ].join(" ")}
                      aria-label={checked ? `Unmark ${trick.name}` : `Mark ${trick.name} as learned`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
