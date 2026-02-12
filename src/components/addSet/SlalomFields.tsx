import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { usePreferences } from "../../lib/preferences"

type Props = {
  // Buoys is numeric by definition.
  buoys: number | null
  ropeLength: string
  speed: string
  passesCount: number | null

  onBuoysChange: (value: number | null) => void
  onRopeLengthChange: (value: string) => void
  onSpeedChange: (value: string) => void
  onPassesCountChange: (value: number | null) => void

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
  passesCount,
  onBuoysChange,
  onRopeLengthChange,
  onSpeedChange,
  onPassesCountChange,
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

  function sanitizeDecimalInput(raw: string) {
    const cleaned = raw.replace(/[^0-9.,]/g, "")
    const normalized = cleaned.replace(/,/g, ".")
    const parts = normalized.split(".")
    if (parts.length === 1) return cleaned
    return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`
  }

  function sanitizeIntegerInput(raw: string) {
    return raw.replace(/[^\d]/g, "")
  }

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
        <label className="block text-sm text-gray-500 mb-1">Total Passes</label>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="e.g. 6"
          value={passesCount ?? ""}
          onChange={e => {
            const cleaned = sanitizeIntegerInput(e.target.value)
            if (!cleaned) {
              onPassesCountChange(null)
              return
            }

            onPassesCountChange(Number(cleaned))
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">The best result of the set</p>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="min-w-0">
            <label className="block text-xs text-gray-500 mb-1">Buoys</label>

            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="e.g. 3.5"
              value={buoysInput}
              onChange={e => {
                const raw = e.target.value
                const cleaned = sanitizeDecimalInput(raw)
                setBuoysInput(cleaned)

                if (cleaned.trim() === "") {
                  onBuoysChange(null)
                  return
                }

                const normalized = cleaned.replace(",", ".")
                const next = Number.parseFloat(normalized)
                onBuoysChange(Number.isFinite(next) ? next : null)
              }}
              className={[
                "w-full rounded-xl border bg-white px-3 py-2.5 text-gray-900",
                buoysError ? "border-red-300" : "border-gray-200"
              ].join(" ")}
            />

            {buoysError ? <p className="mt-1 text-xs text-red-600">{buoysError}</p> : null}
          </div>

          <div ref={ropeDropdownRef} className="relative min-w-0">
            <label className="block text-xs text-gray-500 mb-1">Rope Length</label>

            <button
              onClick={() => setRopeOpen(prev => !prev)}
              className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 flex items-center justify-between"
              type="button"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className={`h-5 w-5 shrink-0 rounded-md ${
                    selectedRope ? selectedRope.color : "bg-gray-200"
                  }`}
                />

                <span className="text-gray-900 text-sm truncate">
                  {selectedRope ? selectedRope.label : "Select"}
                </span>
              </div>

              <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
            </button>

            {ropeOpen && (
              <div className="absolute left-0 z-10 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl bg-white shadow-lg border border-gray-100 overflow-hidden">
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
                    <div className={`h-6 w-6 shrink-0 rounded-md ${r.color}`} />
                    <span className="text-gray-900">{r.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <label className="block text-xs text-gray-500 mb-1">Speed</label>

            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder={speedPlaceholder}
              value={speed}
              onChange={e => {
                const cleaned = sanitizeDecimalInput(e.target.value)
                onSpeedChange(cleaned)
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
