// src/components/addSet/AddSetHeader.tsx
import { useNavigate } from "react-router-dom"

export default function AddSetHeader({ disabled = false }: { disabled?: boolean }) {
  const navigate = useNavigate()

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          disabled={disabled}
          className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-50"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-semibold text-gray-900">Add Set</h1>
          <p className="text-sm text-gray-500">Log your training</p>
        </div>
      </div>
    </div>
  )
}
