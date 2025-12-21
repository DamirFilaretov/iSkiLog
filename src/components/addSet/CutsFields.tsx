export default function CutsFields() {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">
          Passes
        </label>
        <input
          type="number"
          placeholder="e.g. 12"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
          min={0}
        />
      </div>
    </div>
  )
}
