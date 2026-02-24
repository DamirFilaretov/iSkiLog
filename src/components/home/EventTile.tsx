import { useNavigate } from "react-router-dom"
import type { ReactNode } from "react"
import type { EventKey } from "../../types/sets"

type EventTileProps = {
  event: EventKey
  label: string
  gradient: string
  icon: ReactNode
}

export default function EventTile({ event, label, gradient, icon }: EventTileProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/add?event=${event}`)}
      className="rounded-2xl bg-white px-5 py-4 shadow-sm flex flex-col items-center justify-center gap-2.5 min-h-[128px]"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${gradient}`}>
        {icon}
      </div>

      <span className="text-sm text-slate-800">
        {label}
      </span>
    </button>
  )
}
