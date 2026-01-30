import { useNavigate } from "react-router-dom"

export type EventKey = "slalom" | "tricks" | "jump" | "cuts" | "other"

type EventTileProps = {
  event: EventKey
  label: string
  gradient: string
  icon: string
}

export default function EventTile({ event, label, gradient, icon }: EventTileProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/add?event=${event}`)}
      className="rounded-2xl bg-white p-3.5 shadow-sm flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow"
    >
      <div
        className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white ${gradient}`}
      >
        <span className="text-lg">{icon}</span>
      </div>

      <span className="text-sm text-slate-800">
        {label}
      </span>
    </button>
  )
}
