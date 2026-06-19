import { useNavigate } from "react-router-dom"
import BackButton from "../nav/BackButton"

export default function HistoryHeader() {
  const navigate = useNavigate()

  return (
    <div className="px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-4 bg-slate-50 rounded-b-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => navigate("/")} />

          <div>
            <h1 className="text-xl font-semibold text-gray-900">History</h1>
            <p className="text-sm text-gray-500">Your training log</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/history/all")}
          className="h-10 rounded-full bg-white px-4 shadow-sm text-sm text-gray-700"
        >
          All
        </button>
      </div>
    </div>
  )
}
