import { useNavigate } from "react-router-dom"

export default function HistoryItem({ id }: { id: string }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/set/${id}`)}
      className="w-full text-left flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm active:scale-95 transition"
    >
      <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
        🌊
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">
            Slalom
          </p>
          <span className="text-xs text-gray-400">
            2h ago
          </span>
        </div>

        <p className="mt-1 text-sm font-medium text-blue-600">
          4 @ 11.25m
        </p>

        <p className="mt-1 text-sm text-gray-500">
          Felt smooth today, better gate timing.
        </p>
      </div>
    </button>
  )
}
