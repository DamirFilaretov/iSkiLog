type Props = {
  // Controlled value for duration in minutes.
  duration: number | null

  // Called when the duration changes.
  onDurationChange: (value: number | null) => void

  // Controlled value for trick type.
  trickType: "hands" | "toes"

  // Called when the trick type changes.
  onTrickTypeChange: (value: "hands" | "toes") => void
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
  return (
    <div className="space-y-4">
      {/* Duration */}
      <div>
        <label className="block text-sm text-gray-500 mb-1">Duration</label>

        <input
          type="number"
          placeholder="minutes"
          min={0}
          step={1}
          // Convert null -> empty string so the input stays controlled.
          value={duration ?? ""}
          onChange={e => {
            // Empty input means "no value yet"
            if (e.target.value === "") {
              onDurationChange(null)
            } else {
              // Convert string to number explicitly
              onDurationChange(Number(e.target.value))
            }
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>

      {/* Trick type */}
      <div>
        <label className="block text-sm text-gray-500 mb-1">Trick Type</label>

        <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
          <button
            type="button"
            // Parent owns the value, so we call the change handler.
            onClick={() => onTrickTypeChange("hands")}
            className={[
              "flex-1 rounded-lg py-2 text-sm transition",
              trickType === "hands" ? "bg-blue-600 text-white" : "text-gray-700"
            ].join(" ")}
          >
            Hands
          </button>

          <button
            type="button"
            onClick={() => onTrickTypeChange("toes")}
            className={[
              "flex-1 rounded-lg py-2 text-sm transition",
              trickType === "toes" ? "bg-blue-600 text-white" : "text-gray-700"
            ].join(" ")}
          >
            Toes
          </button>
        </div>
      </div>
    </div>
  )
}
