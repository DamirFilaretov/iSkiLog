import { useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import type { KeyboardEvent, ReactNode } from "react"
import type { EventKey } from "../../types/sets"

type EventTileProps = {
  event: EventKey
  label: string
  gradient: string
  icon: ReactNode
}

export default function EventTile({ event, label, gradient, icon }: EventTileProps) {
  const navigate = useNavigate()
  const [pressed, setPressed] = useState(false)
  const navigationTimerRef = useRef<number | null>(null)

  function clearNavigationTimer() {
    if (navigationTimerRef.current === null) return
    window.clearTimeout(navigationTimerRef.current)
    navigationTimerRef.current = null
  }

  function navigateAfterTap() {
    clearNavigationTimer()
    setPressed(true)
    navigationTimerRef.current = window.setTimeout(() => {
      navigate(`/add?event=${event}`)
    }, 90)
  }

  function handleKeyDown(keyboardEvent: KeyboardEvent<HTMLButtonElement>) {
    if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") return
    setPressed(true)
  }

  useEffect(() => {
    return clearNavigationTimer
  }, [])

  return (
    <button
      onClick={navigateAfterTap}
      onPointerDown={() => setPressed(true)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onKeyDown={handleKeyDown}
      className={[
        "rounded-2xl bg-white px-5 py-4 shadow-sm flex flex-col items-center justify-center gap-2.5 min-h-[128px]",
        "transition duration-200 ease-out",
        pressed ? "scale-95 shadow-inner brightness-95" : "scale-100 hover:shadow-md"
      ].join(" ")}
    >
      <div
        className={[
          "w-12 h-12 rounded-2xl flex items-center justify-center transition duration-200 ease-out",
          gradient,
          pressed ? "scale-90" : "scale-100"
        ].join(" ")}
      >
        {icon}
      </div>

      <span className="text-sm text-slate-800">
        {label}
      </span>
    </button>
  )
}
