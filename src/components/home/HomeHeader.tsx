import { useNavigate } from "react-router-dom"


export default function HomeHeader() {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between px-4 pt-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          iSkiLog
        </h1>
        <p className="text-sm text-gray-500">
          Track your progression
        </p>
      </div>
      
      <button
        onClick={() => navigate("/history")}
        className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
      >
        <span className="text-gray-700 text-sm">🕒</span>
      </button>

    </div>
  )
}
