import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"

type Props = {
  disabled?: boolean
  rightAction?: ReactNode
}

export default function AddSetHeader({ disabled = false, rightAction }: Props) {
  const navigate = useNavigate()

  return (
    <div className="px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-4">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          disabled={disabled}
          className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-50"
        >
          {"\u2190"}
        </button>

        {rightAction ?? null}
      </div>
    </div>
  )
}
