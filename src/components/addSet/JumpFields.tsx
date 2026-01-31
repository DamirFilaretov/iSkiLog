type Props = {
  // Controlled numeric values for jump fields.
  attempts: number | null
  passed: number | null
  made: number | null

  // Change handlers to update AddSet state.
  onAttemptsChange: (value: number | null) => void
  onPassedChange: (value: number | null) => void
  onMadeChange: (value: number | null) => void
}

/**
 * JumpFields is controlled by AddSet so values can be saved into the store.
 * Auto fill behavior is handled in AddSet:
 * when user edits passed, made is auto computed
 * when user edits made, passed is auto computed
 */
export default function JumpFields({
  attempts,
  passed,
  made,
  onAttemptsChange,
  onPassedChange,
  onMadeChange
}: Props) {
  // When attempts is known, we cap passed and made at attempts using max.
  // This is UI guidance. Final validation is enforced in AddSet before saving.
  const maxWhenAttemptsKnown = attempts ?? undefined

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">Total Attempts</label>

        <input
          type="number"
          placeholder="e.g. 10"
          min={0}
          step={1}
          // Convert null to empty string so the input stays controlled.
          value={attempts ?? ""}
          onChange={e => {
            if (e.target.value === "") {
              onAttemptsChange(null)
              return
            }
            onAttemptsChange(Number(e.target.value))
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />

      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Passed</label>

          <input
            type="number"
            placeholder="e.g. 4"
            min={0}
            max={maxWhenAttemptsKnown}
            step={1}
            value={passed ?? ""}
            onChange={e => {
              if (e.target.value === "") {
                onPassedChange(null)
                return
              }
              onPassedChange(Number(e.target.value))
            }}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
          />

        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Jumped</label>

          <input
            type="number"
            placeholder="e.g. 6"
            min={0}
            max={maxWhenAttemptsKnown}
            step={1}
            value={made ?? ""}
            onChange={e => {
              if (e.target.value === "") {
                onMadeChange(null)
                return
              }
              onMadeChange(Number(e.target.value))
            }}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
          />

        </div>
      </div>
    </div>
  )
}
