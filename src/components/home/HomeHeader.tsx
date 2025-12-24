import { useNavigate } from "react-router-dom"

export default function HomeHeader() {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between px-4 pt-6">
      {/* App title */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          iSkiLog
        </h1>
        <p className="text-sm text-gray-500">
          Track your progression
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* History button */}
        <button
          onClick={() => navigate("/history")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <span className="text-sm text-gray-700">🕒</span>
        </button>

        {/* Settings button */}
        <button
          onClick={() => navigate("/settings")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <span className="text-sm text-gray-700">⚙️</span>
        </button>
      </div>
    </div>
  )
}
