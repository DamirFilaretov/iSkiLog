import { useNavigate } from "react-router-dom"

export default function RecentPreview() {
  const navigate = useNavigate()

  return (
    <div className="mt-6 px-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-900">
          Recent
        </h2>
        <button
          onClick={() => navigate("/history")}
          className="text-sm text-blue-600"
        >
          View All
        </button>
      </div>

      <button
        onClick={() => navigate("/set/1")}
        className="w-full text-left rounded-2xl bg-white p-4 shadow-sm flex items-center justify-between active:scale-95 transition"
      >
        <div>
          <p className="text-sm font-medium text-gray-900">
            Slalom Session
          </p>
          <p className="mt-1 text-sm text-gray-500">
            5 sets · 15m, 18m, 22m rope
          </p>
        </div>

        <span className="text-xs text-gray-400">
          2h ago
        </span>
      </button>
    </div>
  )
}
