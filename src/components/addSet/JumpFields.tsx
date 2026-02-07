import { useEffect, useState } from "react"

type Props = {
  subEvent: "jump" | "cuts"
  onSubEventChange: (value: "jump" | "cuts") => void

  attempts: number | null
  passed: number | null
  made: number | null
  distance: number | null
  distanceUnit: "meters" | "feet"

  cutsType: "cut_pass" | "open_cuts"
  cutsCount: number | null

  onAttemptsChange: (value: number | null) => void
  onPassedChange: (value: number | null) => void
  onMadeChange: (value: number | null) => void
  onDistanceChange: (value: number | null) => void
  onCutsTypeChange: (value: "cut_pass" | "open_cuts") => void
  onCutsCountChange: (value: number | null) => void
}

export default function JumpFields({
  subEvent,
  onSubEventChange,
  attempts,
  passed,
  made,
  distance,
  distanceUnit,
  cutsType,
  cutsCount,
  onAttemptsChange,
  onPassedChange,
  onMadeChange,
  onDistanceChange,
  onCutsTypeChange,
  onCutsCountChange
}: Props) {
  const [distanceInput, setDistanceInput] = useState("")

  useEffect(() => {
    if (distance === null || Number.isNaN(distance)) {
      setDistanceInput("")
      return
    }
    setDistanceInput(String(distance))
  }, [distance])

  function sanitizeIntegerInput(raw: string) {
    return raw.replace(/[^\d]/g, "")
  }

  function sanitizeDecimalInput(raw: string) {
    const cleaned = raw.replace(/[^0-9.,]/g, "")
    const normalized = cleaned.replace(/,/g, ".")
    const parts = normalized.split(".")
    if (parts.length === 1) return cleaned
    return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">Jump Type</label>
        <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
          <button
            type="button"
            onClick={() => onSubEventChange("jump")}
            className={[
              "flex-1 rounded-lg py-2 text-sm transition",
              subEvent === "jump" ? "bg-blue-600 text-white" : "text-gray-700"
            ].join(" ")}
          >
            Jump
          </button>
          <button
            type="button"
            onClick={() => onSubEventChange("cuts")}
            className={[
              "flex-1 rounded-lg py-2 text-sm transition",
              subEvent === "cuts" ? "bg-blue-600 text-white" : "text-gray-700"
            ].join(" ")}
          >
            Cuts
          </button>
        </div>
      </div>

      {subEvent === "jump" ? (
        <>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Total Attempts</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="e.g. 10"
              value={attempts ?? ""}
              onChange={e => {
                const cleaned = sanitizeIntegerInput(e.target.value)
                if (cleaned === "") {
                  onAttemptsChange(null)
                  return
                }
                onAttemptsChange(Number(cleaned))
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Passed</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 4"
                value={passed ?? ""}
                onChange={e => {
                  const cleaned = sanitizeIntegerInput(e.target.value)
                  if (cleaned === "") {
                    onPassedChange(null)
                    return
                  }
                  onPassedChange(Number(cleaned))
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Jumped</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 6"
                value={made ?? ""}
                onChange={e => {
                  const cleaned = sanitizeIntegerInput(e.target.value)
                  if (cleaned === "") {
                    onMadeChange(null)
                    return
                  }
                  onMadeChange(Number(cleaned))
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Distance ({distanceUnit === "feet" ? "ft" : "m"}, optional)
            </label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder={distanceUnit === "feet" ? "e.g. 140.5" : "e.g. 42.5"}
              value={distanceInput}
              onChange={e => {
                const cleaned = sanitizeDecimalInput(e.target.value)
                setDistanceInput(cleaned)
                if (cleaned === "") {
                  onDistanceChange(null)
                  return
                }
                const next = Number.parseFloat(cleaned.replace(",", "."))
                onDistanceChange(Number.isFinite(next) ? next : null)
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Cuts Type</label>
            <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
              <button
                type="button"
                onClick={() => onCutsTypeChange("cut_pass")}
                className={[
                  "flex-1 rounded-lg py-2 text-sm transition",
                  cutsType === "cut_pass" ? "bg-blue-600 text-white" : "text-gray-700"
                ].join(" ")}
              >
                Cut & Pass
              </button>
              <button
                type="button"
                onClick={() => onCutsTypeChange("open_cuts")}
                className={[
                  "flex-1 rounded-lg py-2 text-sm transition",
                  cutsType === "open_cuts" ? "bg-blue-600 text-white" : "text-gray-700"
                ].join(" ")}
              >
                Open Cuts
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Cuts</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="e.g. 12"
              value={cutsCount ?? ""}
              onChange={e => {
                const cleaned = sanitizeIntegerInput(e.target.value)
                if (cleaned === "") {
                  onCutsCountChange(null)
                  return
                }
                onCutsCountChange(Number(cleaned))
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
            />
          </div>
        </>
      )}
    </div>
  )
}
