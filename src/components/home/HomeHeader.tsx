import { useNavigate } from "react-router-dom"

export default function HomeHeader() {
  const navigate = useNavigate()

  return (
    <div>
      <div className="h-4" />

      <div className="flex items-center justify-between mb-4">
        {/* App title */}
        <div>
          <h1 className="text-slate-900 mb-0.5">
            iSkiLog
          </h1>
          <p className="text-sm text-slate-500">
            Track your progression
          </p>
        </div>

        {/* History button */}
        <button
          onClick={() => navigate("/history")}
          className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
          aria-label="History"
        >
          <span className="text-sm text-slate-700">🕒</span>
        </button>
      </div>
    </div>
  )
}
