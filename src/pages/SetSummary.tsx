import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { deleteSetFromDb } from "../data/setsUpdateDeleteApi"

import { useSetsStore } from "../store/setsStore"
import type { SkiSet } from "../types/sets"

/**
 * Small UI helper to keep event icons consistent.
 */
function eventIcon(eventType: SkiSet["event"]) {
  if (eventType === "slalom") return "🌊"
  if (eventType === "tricks") return "🏆"
  if (eventType === "jump") return "✈️"
  if (eventType === "cuts") return "💨"
  return "➕"
}

/**
 * Small UI helper to show a readable event label.
 */
function eventLabel(eventType: SkiSet["event"]) {
  if (eventType === "slalom") return "Slalom"
  if (eventType === "tricks") return "Tricks"
  if (eventType === "jump") return "Jump"
  if (eventType === "cuts") return "Cuts"
  return "Other"
}

/**
 * Convert ISO "YYYY-MM-DD" to a local Date without timezone shifting.
 * This prevents the one day back bug in the UI.
 */
function isoToLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function formatDateLabel(iso: string) {
  const d = isoToLocalDate(iso)
  if (Number.isNaN(d.getTime())) return iso

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  })
}

export default function SetSummary() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id ?? ""

  const { getSetById, deleteSet } = useSetsStore()

  const [confirmOpen, setConfirmOpen] = useState(false)

  // Prevent rapid delete spam and prevent multiple navigations racing each other.
  const [isDeleting, setIsDeleting] = useState(false)

  const skiSet = useMemo(() => {
    return id ? getSetById(id) : undefined
  }, [id, getSetById])

  /**
   * Back button behavior
   * After many deletes, the browser history can contain routes to deleted sets.
   * A deterministic navigation is more stable than navigate(-1).
   */
  function goBackSafe() {
    navigate(-1)

  }

  /**
   * If we do not find the set, show a simple not found screen.
   * This can happen if the set was deleted, or if the store is not hydrated yet.
   */
  if (!skiSet) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={goBackSafe}
              className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
            >
              ←
            </button>

            <div>
              <h1 className="text-xl font-semibold text-gray-900">Set Summary</h1>
              <p className="text-sm text-gray-500">Set not found</p>
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">This set does not exist</p>
            <p className="mt-1 text-sm text-gray-500">
              It may have been deleted. Return to History and pick another set.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const metrics: { label: string; value: string }[] =
    skiSet.event === "slalom"
      ? [
          { label: "Buoys", value: skiSet.data.buoys === null ? "—" : String(skiSet.data.buoys) },
          { label: "Rope Length", value: skiSet.data.ropeLength || "—" },
          { label: "Speed", value: skiSet.data.speed || "—" }
        ]
      : skiSet.event === "tricks"
        ? [
            {
              label: "Duration",
              value: skiSet.data.duration === null ? "—" : `${skiSet.data.duration} min`
            },
            { label: "Trick Type", value: skiSet.data.trickType }
          ]
        : skiSet.event === "jump"
          ? [
              {
                label: "Attempts",
                value: skiSet.data.attempts === null ? "—" : String(skiSet.data.attempts)
              },
              {
                label: "Passed",
                value: skiSet.data.passed === null ? "—" : String(skiSet.data.passed)
              },
              { label: "Made", value: skiSet.data.made === null ? "—" : String(skiSet.data.made) }
            ]
          : skiSet.event === "cuts"
            ? [{ label: "Passes", value: skiSet.data.passes === null ? "—" : String(skiSet.data.passes) }]
            : [{ label: "Name", value: skiSet.data.name || "—" }]

  const details: { label: string; value: string }[] = [
    { label: "Event Type", value: eventLabel(skiSet.event) },
    { label: "Date Logged", value: formatDateLabel(skiSet.date) }
  ]

  /**
   * Confirmed delete handler.
   * Guarded so it cannot run twice in parallel.
   */
  async function handleConfirmDelete() {
  if (isDeleting) return

  setIsDeleting(true)

  try {
    await deleteSetFromDb(id)
    deleteSet(id)
    setConfirmOpen(false)

    // Go back to whatever screen opened this set (History or Home)
    navigate(-1)
  } catch (err) {
    console.error("Failed to delete set", err)
    alert("Failed to delete set. Try again.")
    setConfirmOpen(false)
    setIsDeleting(false)
  }
}


  return (
    <div className="min-h-screen bg-gray-100">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
          >
            ←
          </button>

          <div>
            <h1 className="text-xl font-semibold text-gray-900">Set Summary</h1>
            <p className="text-sm text-gray-500">Review your training</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5 pb-28">
        <div className="rounded-2xl bg-blue-600 p-5 shadow-md flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center text-white text-lg">
            {eventIcon(skiSet.event)}
          </div>

          <div className="flex-1">
            <div className="text-white text-lg font-medium">{eventLabel(skiSet.event)}</div>

            <div className="mt-1 flex items-center gap-4 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>{formatDateLabel(skiSet.date)}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2">Performance Metrics</h2>

          <div className="space-y-3">
            {metrics.map(m => (
              <div key={m.label} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-xs text-gray-500">{m.label}</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2">Notes & Reflections</h2>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed">
              {skiSet.notes.trim() ? skiSet.notes : "No notes for this set."}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2">Session Details</h2>

          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            {details.map((row, idx) => (
              <div
                key={row.label}
                className={[
                  "flex items-center justify-between px-4 py-3",
                  idx === 0 ? "" : "border-t border-gray-100"
                ].join(" ")}
              >
                <span className="text-sm text-gray-500">{row.label}</span>
                <span className="text-sm font-medium text-gray-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <button
            type="button"
            aria-label="Close delete confirmation"
            onClick={() => {
              if (isDeleting) return
              setConfirmOpen(false)
            }}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Delete this set?</h3>
            <p className="mt-1 text-sm text-gray-500">This action cannot be undone.</p>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-900 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 px-4 pb-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={isDeleting}
            onClick={() => navigate(`/add?id=${skiSet.id}`, { replace: true })}
            className="w-full rounded-full bg-blue-600 py-4 text-white font-semibold shadow-md disabled:opacity-60"
          >
            Edit
          </button>

          <button
            disabled={isDeleting}
            onClick={() => setConfirmOpen(true)}
            className="w-full rounded-full bg-white py-4 text-red-600 font-semibold shadow-md border border-gray-200 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
