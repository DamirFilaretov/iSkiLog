import { useState } from "react"

type Props = {
  // Buoys is numeric by definition.
  buoys: number | null
  ropeLength: string
  speed: string

  onBuoysChange: (value: number | null) => void
  onRopeLengthChange: (value: string) => void
  onSpeedChange: (value: string) => void
}

/**
 * Rope length dropdown options and their UI colors.
 * These values are stored as strings to match the existing data model.
 */
const ROPE_LENGTHS: { id: string; label: string; color: string }[] = [
  { id: "18m", label: "18m", color: "bg-red-600" },
  { id: "16m", label: "16m", color: "bg-orange-500" },
  { id: "14m", label: "14m", color: "bg-yellow-400" },
  { id: "13m", label: "13m", color: "bg-green-600" },
  { id: "12m", label: "12m", color: "bg-blue-600" },
  { id: "11.25m", label: "11.25m", color: "bg-purple-600" },
  { id: "10.75m", label: "10.75m", color: "bg-gray-500" },
  { id: "10.25m", label: "10.25m", color: "bg-pink-500" },
  { id: "9.75m", label: "9.75m", color: "bg-black" }
]

export default function SlalomFields({
  buoys,
  ropeLength,
  speed,
  onBuoysChange,
  onRopeLengthChange,
  onSpeedChange
}: Props) {
  // Controls rope dropdown open state only.
  const [ropeOpen, setRopeOpen] = useState(false)

  // Derive selected rope for display.
  const selectedRope = ROPE_LENGTHS.find(r => r.id === ropeLength) ?? null

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">Buoys</label>

        <input
          type="number"
          step="0.25"
          min={0}
          max={6}
          placeholder="e.g. 3.5"
          // Convert null to empty string so the input stays controlled.
          value={buoys ?? ""}
          onChange={e => {
            // Empty input means "no value yet".
            if (e.target.value === "") {
              onBuoysChange(null)
              return
            }

            // Convert string to number explicitly.
            const next = Number(e.target.value)
            onBuoysChange(Number.isFinite(next) ? next : null)
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />

        <p className="mt-1 text-xs text-gray-500">Max 6</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm text-gray-500 mb-1">Rope Length</label>

          <button
            onClick={() => setRopeOpen(!ropeOpen)}
            className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 flex items-center justify-between"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-6 w-6 rounded-md flex items-center justify-center text-white ${
                  selectedRope ? selectedRope.color : "bg-gray-200"
                }`}
              >
                {/* Small dot to indicate the rope length color */}
                {selectedRope ? "●" : ""}
              </div>

              <span className="text-gray-900">
                {selectedRope ? selectedRope.label : "Select"}
              </span>
            </div>

            <span className="text-gray-400">▾</span>
          </button>

          {ropeOpen && (
            <div className="absolute z-10 mt-2 w-full rounded-xl bg-white shadow-lg border border-gray-100 overflow-hidden">
              {ROPE_LENGTHS.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    // Tell parent what rope length was selected.
                    onRopeLengthChange(r.id)

                    // Close dropdown after selection.
                    setRopeOpen(false)
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50"
                  type="button"
                >
                  <div
                    className={`h-6 w-6 rounded-md flex items-center justify-center text-white ${r.color}`}
                  >
                    ●
                  </div>
                  <span className="text-gray-900">{r.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Speed</label>

          <input
            type="text"
            placeholder="e.g. 34 mph"
            value={speed}
            onChange={e => onSpeedChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
          />
        </div>
      </div>
    </div>
  )
}
