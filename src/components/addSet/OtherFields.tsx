type Props = {
  // Controlled value for the custom name.
  name: string

  // Controlled value for duration in minutes.
  duration: number | null

  // Called when the user changes the name.
  onNameChange: (value: string) => void

  // Called when the duration changes.
  onDurationChange: (value: number | null) => void
}

/**
 * OtherFields is controlled by AddSet so the name can be saved and edited.
 */
export default function OtherFields({ name, duration, onNameChange, onDurationChange }: Props) {
  function sanitizeIntegerInput(raw: string) {
    return raw.replace(/[^\d]/g, "")
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">Duration (minutes)</label>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="minutes"
          value={duration ?? ""}
          onChange={e => {
            const cleaned = sanitizeIntegerInput(e.target.value)
            if (cleaned === "") {
              onDurationChange(null)
            } else {
              onDurationChange(Number(cleaned))
            }
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1">Name</label>

        <input
          type="text"
          placeholder="e.g. Warmup set"
          // Controlled input
          value={name}
          onChange={e => onNameChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>
    </div>
  )
}
