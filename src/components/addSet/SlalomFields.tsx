export default function SlalomFields() {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">
          Buoys
        </label>
        <input
          type="text"
          placeholder="e.g. 4 @ 11.25m"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">
            Rope Length
          </label>
          <input
            type="text"
            placeholder="e.g. 11.25m"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">
            Speed
          </label>
          <input
            type="text"
            placeholder="e.g. 34 mph"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
          />
        </div>
      </div>
    </div>
  )
}
