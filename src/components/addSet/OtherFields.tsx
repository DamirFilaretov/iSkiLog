export default function OtherFields() {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">
          Name
        </label>
        <input
          type="text"
          placeholder="e.g. Warmup set"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>
    </div>
  )
}
