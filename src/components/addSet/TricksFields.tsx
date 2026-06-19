import type { TrickType } from "../../types/sets"
import { TRICK_TYPE_OPTIONS } from "../../types/sets"

type Props = {
  // Controlled value for duration in minutes.
  duration: number | null

  // Called when the duration changes.
  onDurationChange: (value: number | null) => void

  // Controlled value for trick type.
  trickType: TrickType

  // Called when the trick type changes.
  onTrickTypeChange: (value: TrickType) => void
}

/**
 * TricksFields is controlled by AddSet so we can save the values.
 * This means it does not own its own state.
 */
export default function TricksFields({
  duration,
  onDurationChange,
  trickType,
  onTrickTypeChange
}: Props) {
  function sanitizeIntegerInput(raw: string) {
    return raw.replace(/[^\d]/g, "")
  }

  return (
    <div className="space-y-4">
      {/* Duration */}
      <div>
        <label className="block text-sm text-gray-500 mb-1">Duration (minutes)</label>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="minutes"
          // Convert null -> empty string so the input stays controlled.
          value={duration ?? ""}
          onChange={e => {
            // Empty input means "no value yet"
            const cleaned = sanitizeIntegerInput(e.target.value)
            if (cleaned === "") {
              onDurationChange(null)
            } else {
              // Convert string to number explicitly
              onDurationChange(Number(cleaned))
            }
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>

      {/* Trick type */}
      <div>
        <label className="block text-sm text-gray-500 mb-1">Trick Type</label>

        <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
          {TRICK_TYPE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              // Parent owns the value, so we call the change handler.
              onClick={() => onTrickTypeChange(option.value)}
              className={[
                "flex-1 rounded-lg py-2 text-sm transition",
                trickType === option.value ? "bg-blue-600 text-white" : "text-gray-700"
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
