import { useEffect, useRef, useState } from "react"
import { ChevronDown, Route, Shuffle, Rocket, Zap } from "lucide-react"
import type { EventKey } from "../../types/sets"

const EVENTS: { id: EventKey; label: string; icon: React.ReactNode; color: string }[] = [
  {
    id: "slalom",
    label: "Slalom",
    icon: <Route className="h-3.5 w-3.5 text-white" strokeWidth={2} />,
    color: "bg-blue-600"
  },
  {
    id: "tricks",
    label: "Tricks",
    icon: <Shuffle className="h-3.5 w-3.5 text-white" strokeWidth={2} />,
    color: "bg-purple-600"
  },
  {
    id: "jump",
    label: "Jump",
    icon: <Rocket className="h-3.5 w-3.5 text-white" strokeWidth={2} />,
    color: "bg-orange-500"
  },
  {
    id: "other",
    label: "Other",
    icon: <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2} />,
    color: "bg-emerald-500"
  }
]

type Props = {
  value: EventKey
  onChange: (value: EventKey) => void
}

export default function EventTypeSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selected = EVENTS.find(e => e.id === value) ?? EVENTS[0]

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const el = wrapperRef.current
      if (!el) return

      const target = event.target as Node | null
      if (!target) return

      if (!el.contains(target)) setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-sm text-gray-500">Event Type</label>

      <button
        onClick={() => setOpen(prev => !prev)}
        type="button"
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-md ${selected.color}`}
          >
            {selected.icon}
          </div>
          <span className="text-gray-900">{selected.label}</span>
        </div>

        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {open ? (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          {EVENTS.map(event => (
            <button
              key={event.id}
              type="button"
              onClick={() => {
                onChange(event.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-50"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-md ${event.color}`}
              >
                {event.icon}
              </div>
              <span className="text-gray-900">{event.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
