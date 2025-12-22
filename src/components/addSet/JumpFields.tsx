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
 */
export default function JumpFields({
  attempts,
  passed,
  made,
  onAttemptsChange,
  onPassedChange,
  onMadeChange
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">Attempts</label>

        <input
          type="number"
          placeholder="e.g. 3"
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
            placeholder="e.g. 2"
            min={0}
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
          <label className="block text-sm text-gray-500 mb-1">Made</label>

          <input
            type="number"
            placeholder="e.g. 1"
            min={0}
            step={1}
            value={made ?? ""}
            onChange={e => {
              if (e.target.value === "") {
                onMadeChange(null)
                return
              }
              onMadeChange(Number(e.target.value))
            }}
            // Fixed typo: rounded-xl (was rouAnded-xl)
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
          />
        </div>
      </div>
    </div>
  )
}
