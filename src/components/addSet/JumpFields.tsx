export default function JumpFields() {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">
          Attempts
        </label>
        <input
          type="number"
          placeholder="e.g. 3"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
          min={0}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">
            Passed
          </label>
          <input
            type="number"
            placeholder="e.g. 2"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
            min={0}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">
            Made
          </label>
          <input
            type="number"
            placeholder="e.g. 1"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
            min={0}
          />
        </div>
      </div>
    </div>
  )
}
