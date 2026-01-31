import { useEffect, useRef, useState } from "react"
import { usePreferences } from "../../lib/preferences"

type Props = {
  // Buoys is numeric by definition.
  buoys: number | null
  ropeLength: string
  speed: string

  onBuoysChange: (value: number | null) => void
  onRopeLengthChange: (value: string) => void
  onSpeedChange: (value: string) => void

  buoysError?: string
}

/**
 * Rope length dropdown options and their UI colors.
 * These values are stored as strings to match the existing data model.
 */
const ROPE_LENGTHS: { id: string; label: string; color: string }[] = [
  { id: "18m", label: "18m/15off", color: "bg-red-600" },
  { id: "16m", label: "16m/22off", color: "bg-orange-500" },
  { id: "14m", label: "14m/28off", color: "bg-yellow-400" },
  { id: "13m", label: "13m/32off", color: "bg-green-600" },
  { id: "12m", label: "12m/35off", color: "bg-blue-600" },
  { id: "11.25m", label: "11.25m/38off", color: "bg-purple-600" },
  { id: "10.75m", label: "10.75m/39.5off", color: "bg-gray-500" },
  { id: "10.25m", label: "10.25m/41off", color: "bg-pink-500" },
  { id: "9.75m", label: "9.75m/43off", color: "bg-black" }
]

export default function SlalomFields({
  buoys,
  ropeLength,
  speed,
  onBuoysChange,
  onRopeLengthChange,
  onSpeedChange,
  buoysError
}: Props) {
  const { preferences } = usePreferences()
  const speedPlaceholder = preferences.speedUnit === "kmh" ? "e.g. 55 km/h" : "e.g. 34 mph"
  // Controls rope dropdown open state only.
  const [ropeOpen, setRopeOpen] = useState(false)
  const [buoysInput, setBuoysInput] = useState("")

  // Ref used to detect clicks outside this dropdown.
  const ropeDropdownRef = useRef<HTMLDivElement>(null)

  // Derive selected rope for display.
  const selectedRope = ROPE_LENGTHS.find(r => r.id === ropeLength) ?? null

  useEffect(() => {
    if (buoys === null || Number.isNaN(buoys)) {
      setBuoysInput("")
    } else {
      setBuoysInput(String(buoys))
    }
  }, [buoys])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const el = ropeDropdownRef.current
      if (!el) return

      const target = event.target as Node | null
      if (!target) return

      // If user taps outside the dropdown wrapper, close it.
      if (!el.contains(target)) setRopeOpen(false)
    }

    // Works for both desktop and mobile.
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">Buoys</label>

        <input
          type="text"
          placeholder="e.g. 3.5"
          value={buoysInput}
          onChange={e => {
            const raw = e.target.value
            setBuoysInput(raw)

            if (raw.trim() === "") {
              onBuoysChange(null)
              return
            }

            const normalized = raw.replace(",", ".")
            const next = Number.parseFloat(normalized)
            onBuoysChange(Number.isFinite(next) ? next : null)
          }}
          className={[
            "w-full rounded-xl border bg-white px-4 py-3 text-gray-900",
            buoysError ? "border-red-300" : "border-gray-200"
          ].join(" ")}
        />

        {buoysError ? (
          <p className="mt-1 text-xs text-red-600">{buoysError}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">Max 6</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div ref={ropeDropdownRef} className="relative">
          <label className="block text-sm text-gray-500 mb-1">Rope Length</label>

          <button
            onClick={() => setRopeOpen(prev => !prev)}
            className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 flex items-center justify-between"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-6 w-6 rounded-md flex items-center justify-center text-white ${
                  selectedRope ? selectedRope.color : "bg-gray-200"
                }`}
              >
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
                    onRopeLengthChange(r.id)
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
            placeholder={speedPlaceholder}
            value={speed}
            onChange={e => onSpeedChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
          />
        </div>
      </div>
    </div>
  )
}
