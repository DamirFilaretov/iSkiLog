type Props = {
  // Buoys is numeric by definition.
  buoys: number | null
  ropeLength: string
  speed: string

  onBuoysChange: (value: number | null) => void
  onRopeLengthChange: (value: string) => void
  onSpeedChange: (value: string) => void
}

export default function SlalomFields({
  buoys,
  ropeLength,
  speed,
  onBuoysChange,
  onRopeLengthChange,
  onSpeedChange
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">Buoys</label>

        <input
          type="number"
          step="0.25"
          placeholder="e.g. 3.5"
          // Convert null → empty string so the input stays controlled
          value={buoys ?? ""}
          onChange={e => {
            // Empty input means "no value yet"
            if (e.target.value === "") {
              onBuoysChange(null)
            } else {
              // Convert string to number explicitly
              onBuoysChange(Number(e.target.value))
            }
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Rope Length</label>

          <input
            type="text"
            placeholder="e.g. 11.25m"
            value={ropeLength}
            onChange={e => onRopeLengthChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
          />
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
