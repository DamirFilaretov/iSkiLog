import { useNavigate } from "react-router-dom"
export default function HistoryHeader() {
  const navigate = useNavigate()

  return (
    <div className="px-4 pt-6 pb-4 bg-slate-50 rounded-b-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
          >
            ←
          </button>

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
