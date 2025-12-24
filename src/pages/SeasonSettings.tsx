import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

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

  const {
    activeSeasonId,
    getActiveSeason,
    upsertSeason
  } = useSetsStore()

  const activeSeason = getActiveSeason()

  const [seasonStart, setSeasonStart] = useState("")
  const [seasonEnd, setSeasonEnd] = useState("")
  const [saving, setSaving] = useState(false)

  // Prevents prefill from overwriting user edits
  const didPrefillRef = useRef(false)

  // Reset prefill lock when active season changes
  useEffect(() => {
    didPrefillRef.current = false
  }, [activeSeasonId])

  // Prefill only once per active season
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

      // Save to Supabase
      await updateSeasonDates({
        seasonId: activeSeason.id,
        startDate: seasonStart,
        endDate: seasonEnd
      })

      // Update local store so the app uses new dates immediately
      upsertSeason({
        ...activeSeason,
        startDate: seasonStart,
        endDate: seasonEnd
      })

      navigate(-1)
    } catch (err) {
      console.error("Failed to update season", err)
      alert("Failed to save season settings. Try again.")
    } finally {
      setSaving(false)
    }
  }

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 pt-4">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-2 rounded-full bg-white px-3 py-1 shadow"
          >
            ←
          </button>

          <h1 className="text-xl font-semibold">Season Settings</h1>
          <p className="text-sm text-gray-500">Define your season timeline</p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow">
          <p className="font-medium text-gray-900">No active season found</p>
          <p className="mt-1 text-sm text-gray-500">
            Log in again to trigger default season creation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 pt-4 pb-28">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-2 rounded-full bg-white px-3 py-1 shadow"
        >
          ←
        </button>

        <h1 className="text-xl font-semibold">Season Settings</h1>
        <p className="text-sm text-gray-500">Define your season timeline</p>
      </div>

      {/* Current Season */}
      <div className="mb-4 rounded-xl bg-blue-50 p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
            <span className="text-white">📅</span>
          </div>

          <div>
            <p className="text-sm text-gray-600">Current Season</p>
            <p className="font-medium">{activeSeason.name}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-3">
          <p className="text-sm text-gray-500">Season Duration</p>
          <p className="text-sm">
            {formatIsoDateForDisplay(activeSeason.startDate)} - {formatIsoDateForDisplay(activeSeason.endDate)}
          </p>
        </div>
      </div>

      {/* Season Start */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500">
            <span className="text-white">📅</span>
          </div>

          <div>
            <p className="font-medium">Season Start</p>
            <p className="text-sm text-gray-500">
              When does your season begin?
            </p>
          </div>
        </div>

        <input
          type="date"
          value={seasonStart}
          onChange={(e) => setSeasonStart(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />

        <p className="mt-1 text-xs text-gray-400">
          {seasonStart ? formatIsoDateForDisplay(seasonStart) : ""}
        </p>
      </div>

      {/* Season End */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
            <span className="text-white">📅</span>
          </div>

          <div>
            <p className="font-medium">Season End</p>
            <p className="text-sm text-gray-500">
              When does your season end?
            </p>
          </div>
        </div>

        <input
          type="date"
          value={seasonEnd}
          onChange={(e) => setSeasonEnd(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />

        <p className="mt-1 text-xs text-gray-400">
          {seasonEnd ? formatIsoDateForDisplay(seasonEnd) : ""}
        </p>
      </div>

      {/* Inline validation */}
      {dateError && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow">
          <p className="text-sm font-medium text-red-600">{dateError}</p>
        </div>
      )}

      {/* About */}
      <div className="rounded-xl bg-blue-50 p-4">
        <p className="text-sm text-blue-700">
          Your season dates help iSkiLog organize your training data and
          calculate statistics for the active season. You can change these
          dates at any time.
        </p>
      </div>

      {/* Save button fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 px-4 pb-4 pt-2">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-full bg-blue-600 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Season"}
        </button>
      </div>
    </div>
  )
}
