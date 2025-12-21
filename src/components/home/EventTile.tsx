import { useNavigate } from "react-router-dom"

export type EventKey = "slalom" | "tricks" | "jump" | "cuts" | "other"

type EventTileProps = {
  event: EventKey
  label: string
  color: string
  icon: string
}

export default function EventTile({ event, label, color, icon }: EventTileProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/add?event=${event}`)}
      className="rounded-2xl bg-white p-4 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition"
    >
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center text-white"
        style={{ backgroundColor: color }}
      >
        <span className="text-lg">{icon}</span>
      </div>

      <span className="text-sm text-gray-800">
        {label}
      </span>
    </button>
  )
}
