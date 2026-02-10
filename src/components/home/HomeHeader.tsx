import { useNavigate } from "react-router-dom"
import { History } from "lucide-react"

export default function HomeHeader() {
  const navigate = useNavigate()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="mb-0.5 text-xl font-semibold text-slate-900">
            iSkiLog
          </h1>
          <p className="text-sm text-slate-500">
            Track your progression
          </p>
        </div>

        <button
          onClick={() => navigate("/history")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:text-slate-900 hover:shadow-md"
          aria-label="History"
        >
          <History className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  )
}
