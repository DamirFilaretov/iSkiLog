export default function BaseFields() {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">
          Date
        </label>
        <input
          type="date"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1">
          Notes
        </label>
        <textarea
          placeholder="Add your thoughts, observations, or areas to improve…"
          className="w-full h-28 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 resize-none"
        />
      </div>
    </div>
  )
}
