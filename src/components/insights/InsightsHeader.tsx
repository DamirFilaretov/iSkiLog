import { useNavigate } from "react-router-dom"

export default function InsightsHeader() {
  const navigate = useNavigate()

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Insights
          </h1>
          <p className="text-sm text-gray-500">
            Your training overview
          </p>
        </div>

        <button
          onClick={() => navigate("/history")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
          aria-label="View history"
        >
          <span className="text-sm text-gray-700">🕒</span>
        </button>
      </div>
    </div>
  )
}
