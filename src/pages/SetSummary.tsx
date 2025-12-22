import { useNavigate, useParams } from "react-router-dom"

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

  // If something is wrong with the input, show raw value instead of crashing.
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

  // Pull store helper to find a set by id.
  const { getSetById } = useSetsStore()

  // Lookup the set only when id changes.
  // Read the set from the store for this id.
  // This stays up to date automatically when the store changes.
  const set = id ? getSetById(id) : undefined


  /**
   * If we do not find the set, show a simple not found screen.
   * This can happen if:
   * user refreshes the page (Milestone 2 storage resets)
   * user opens an old link
   * id is wrong
   */
  if (!set) {
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
              <p className="text-sm text-gray-500">Set not found</p>
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">This set does not exist</p>
            <p className="mt-1 text-sm text-gray-500">
              If you refreshed the page, local storage resets in Milestone 2. Add a set again.
            </p>
          </div>
        </div>
      </div>
    )
  }

  /**
   * Build metrics based on event type.
   * We only display fields that exist for the specific event.
   */
  const metrics: { label: string; value: string }[] =
    set.event === "slalom"
      ? [
          { label: "Buoys", value: set.data.buoys === null ? "—" : String(set.data.buoys) },
          { label: "Rope Length", value: set.data.ropeLength || "—" },
          { label: "Speed", value: set.data.speed || "—" }
        ]
      : set.event === "tricks"
        ? [
            {
              label: "Duration",
              value: set.data.duration === null ? "—" : `${set.data.duration} min`
            },
            { label: "Trick Type", value: set.data.trickType }
          ]
        : set.event === "jump"
          ? [
              { label: "Attempts", value: set.data.attempts === null ? "—" : String(set.data.attempts) },
              { label: "Passed", value: set.data.passed === null ? "—" : String(set.data.passed) },
              { label: "Made", value: set.data.made === null ? "—" : String(set.data.made) }
            ]
          : set.event === "cuts"
            ? [{ label: "Passes", value: set.data.passes === null ? "—" : String(set.data.passes) }]
            : [{ label: "Name", value: set.data.name || "—" }]

  // Simple detail rows, based on what we reliably know in Milestone 2.
  const details: { label: string; value: string }[] = [
    { label: "Event Type", value: eventLabel(set.event) },
    { label: "Date Logged", value: formatDateLabel(set.date) }
  ]

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
        {/* Hero card */}
        <div className="rounded-2xl bg-blue-600 p-5 shadow-md flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center text-white text-lg">
            {eventIcon(set.event)}
          </div>

          <div className="flex-1">
            <div className="text-white text-lg font-medium">{eventLabel(set.event)}</div>

            <div className="mt-1 flex items-center gap-4 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>{formatDateLabel(set.date)}</span>
              </div>

              {/* We do not store time yet in Milestone 2, so we do not fake it. */}
            </div>
          </div>
        </div>

        {/* Metrics */}
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

        {/* Notes */}
        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2">Notes & Reflections</h2>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed">
              {/* If notes is empty, show a friendly placeholder. */}
              {set.notes.trim() ? set.notes : "No notes for this set."}
            </p>
          </div>
        </div>

        {/* Details */}
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

      {/* Edit button */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 px-4 pb-4 pt-2">
        <button
          // For now we pass the set id in the URL so Add Set can become "edit mode" next.
          onClick={() => navigate(`/add?id=${set.id}`, { replace: true })}

          className="w-full rounded-full bg-blue-600 py-4 text-white font-semibold shadow-md"
        >
          Edit Set
        </button>
      </div>
    </div>
  )
}
