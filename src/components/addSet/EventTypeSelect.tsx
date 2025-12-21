import { useState } from "react"
import type { EventKey } from "../../types/sets" // Shared type lives in src/types/sets.ts

// UI config stays here because it is presentation only, not the data model.
const EVENTS: { id: EventKey; label: string; icon: string; color: string }[] = [
  { id: "slalom", label: "Slalom", icon: "🌊", color: "bg-blue-600" },
  { id: "tricks", label: "Tricks", icon: "🏆", color: "bg-purple-600" },
  { id: "jump", label: "Jump", icon: "✈️", color: "bg-orange-500" },
  { id: "cuts", label: "Cuts", icon: "💨", color: "bg-green-600" },
  { id: "other", label: "Other", icon: "➕", color: "bg-indigo-600" }
]

type Props = {
  // The currently selected event type.
  value: EventKey

  // Callback to inform the parent that the event type changed.
  onChange: (value: EventKey) => void
}

export default function EventTypeSelect({ value, onChange }: Props) {
  // Controls dropdown open state only.
  const [open, setOpen] = useState(false)

  // Derive the selected event for display.
  // Fallback to the first item if something unexpected happens.
  const selected = EVENTS.find(e => e.id === value) ?? EVENTS[0]

  return (
    <div className="relative">
      <label className="block text-sm text-gray-500 mb-1">Event Type</label>

      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-6 w-6 rounded-md flex items-center justify-center text-white ${selected.color}`}
          >
            {selected.icon}
          </div>
          <span className="text-gray-900">{selected.label}</span>
        </div>

        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-10 mt-2 w-full rounded-xl bg-white shadow-lg border border-gray-100 overflow-hidden">
          {EVENTS.map(event => (
            <button
              key={event.id}
              onClick={() => {
                // Tell the parent what was selected.
                onChange(event.id)

                // Close the dropdown after selection.
                setOpen(false)
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50"
            >
              <div
                className={`h-6 w-6 rounded-md flex items-center justify-center text-white ${event.color}`}
              >
                {event.icon}
              </div>
              <span className="text-gray-900">{event.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
