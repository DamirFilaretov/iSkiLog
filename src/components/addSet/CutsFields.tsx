type Props = {
  // Controlled numeric value for passes.
  passes: number | null

  // Change handler to update AddSet state.
  onPassesChange: (value: number | null) => void
}

/**
 * CutsFields is controlled by AddSet so values can be saved into the store.
 */
export default function CutsFields({ passes, onPassesChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">Passes</label>

        <input
          type="number"
          placeholder="e.g. 12"
          min={0}
          step={1}
          // Convert null to empty string so the input stays controlled.
          value={passes ?? ""}
          onChange={e => {
            if (e.target.value === "") {
              onPassesChange(null)
              return
            }
            onPassesChange(Number(e.target.value))
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>
    </div>
  )
}
