import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSafeBack } from "../lib/useSafeBack"
import { useSetsStore } from "../store/setsStore"
import { updateSeasonDates } from "../data/seasonsApi"

function formatIsoDateForDisplay(iso: string) {
  const parts = iso.split("-")
  if (parts.length !== 3) return iso

  const year = parts[0]
  const month = parts[1]
  const day = parts[2]

  return `${month}/${day}/${year}`
}

export default function SeasonSettings() {
  const navigate = useNavigate()
  const goBack = useSafeBack("/")
  const { activeSeasonId, getActiveSeason, upsertSeason } = useSetsStore()

  const activeSeason = getActiveSeason()

  const [seasonStart, setSeasonStart] = useState("")
  const [seasonEnd, setSeasonEnd] = useState("")
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const didPrefillRef = useRef(false)

  useEffect(() => {
    didPrefillRef.current = false
    setError(null)
  }, [activeSeasonId])

  useEffect(() => {
    if (!activeSeason) return
    if (didPrefillRef.current) return

    didPrefillRef.current = true
    setSeasonStart(activeSeason.startDate)
    setSeasonEnd(activeSeason.endDate)
  }, [activeSeasonId, activeSeason])

  const dateError = useMemo(() => {
    if (!seasonStart || !seasonEnd) return "Start and end dates are required"
    if (seasonStart >= seasonEnd) return "Start date must be before end date"
    return ""
  }, [seasonStart, seasonEnd])

  const canSave = useMemo(() => {
    if (!activeSeason) return false
    if (saving) return false
    if (dateError) return false
    return true
  }, [activeSeason, saving, dateError])

  async function handleSave() {
    if (!activeSeason) return
    if (!canSave) return

    try {
      setSaving(true)
      setError(null)

      await updateSeasonDates({
        seasonId: activeSeason.id,
        startDate: seasonStart,
        endDate: seasonEnd
      })

      upsertSeason({
        ...activeSeason,
        startDate: seasonStart,
        endDate: seasonEnd
      })

      navigate(-1)
    } catch (err) {
      console.error("Failed to update season", err)
      setError("Failed to save season settings. Try again.")
    } finally {
      setSaving(false)
    }
  }

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
            >
              ←
            </button>

            <div>
              <h1 className="text-xl font-semibold text-gray-900">Season Settings</h1>
              <p className="text-sm text-gray-500">Define your season timeline</p>
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">No active season found</p>
            <p className="mt-1 text-sm text-gray-500">
              Log in again to trigger default season creation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-28">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (saving) return
              navigate(-1)
            }}
            disabled={saving}
            className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-60"
          >
            ←
          </button>

          <div>
            <h1 className="text-xl font-semibold text-gray-900">Season Settings</h1>
            <p className="text-sm text-gray-500">Define your season timeline</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <div className="rounded-2xl bg-blue-600 p-5 shadow-md">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center text-white text-lg">
              📅
            </div>

            <div className="flex-1">
              <div className="text-white text-lg font-medium">{activeSeason.name}</div>
              <div className="mt-1 text-sm text-white/80">
                {formatIsoDateForDisplay(activeSeason.startDate)} to{" "}
                {formatIsoDateForDisplay(activeSeason.endDate)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-900">Season Start</p>
            <p className="text-sm text-gray-500">When does your season begin?</p>
          </div>

          <input
            type="date"
            value={seasonStart}
            onChange={e => setSeasonStart(e.target.value)}
            disabled={saving}
            className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
          />

          <p className="mt-2 text-xs text-gray-400">
            {seasonStart ? formatIsoDateForDisplay(seasonStart) : ""}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-900">Season End</p>
            <p className="text-sm text-gray-500">When does your season end?</p>
          </div>

          <input
            type="date"
            value={seasonEnd}
            onChange={e => setSeasonEnd(e.target.value)}
            disabled={saving}
            className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
          />

          <p className="mt-2 text-xs text-gray-400">
            {seasonEnd ? formatIsoDateForDisplay(seasonEnd) : ""}
          </p>
        </div>

        {(dateError || error) && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-red-600">{dateError || error}</p>
          </div>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            Season dates help iSkiLog organize training data and calculate totals for the active season.
            You can change these dates any time. Existing sets keep their seasonId unless you edit the set.
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 px-4 pb-4 pt-2">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-full bg-blue-600 py-4 text-white font-semibold shadow-md disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Season"}
        </button>
      </div>
    </div>
  )
}
