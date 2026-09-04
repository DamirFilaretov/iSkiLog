import { useEffect, useRef, useState } from "react"
import { KeyRound, Plus } from "lucide-react"

/**
 * Floating entry point for the two group-entry actions (create / join by
 * code). Hidden on scroll-down, shown on scroll-up or near the top — a
 * gesture-driven affordance instead of a bar permanently competing with the
 * list for space. Collapsed it's a plain "+"; a tap expands it in place to
 * reveal both actions rather than navigating anywhere.
 */

type Props = {
  onCreate: () => void
  onJoinByCode: () => void
}

const SCROLL_THRESHOLD_PX = 8

export default function GroupsFab({ onCreate, onJoinByCode }: Props) {
  const [visible, setVisible] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    lastY.current = window.scrollY
    function onScroll() {
      const y = window.scrollY
      const delta = y - lastY.current
      if (y <= SCROLL_THRESHOLD_PX) {
        setVisible(true)
      } else if (delta > SCROLL_THRESHOLD_PX) {
        setVisible(false)
        setExpanded(false)
      } else if (delta < -SCROLL_THRESHOLD_PX) {
        setVisible(true)
      }
      lastY.current = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      {expanded ? (
        <button
          type="button"
          aria-label="Close"
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-30"
        />
      ) : null}

      <div
        className={`fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 transition-all duration-200 ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        {expanded ? (
          <div className="flex items-center gap-1 rounded-full bg-white p-1.5 shadow-xl shadow-slate-900/15">
            <button
              type="button"
              onClick={() => {
                setExpanded(false)
                onCreate()
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Create group
            </button>

            <button
              type="button"
              onClick={() => {
                setExpanded(false)
                onJoinByCode()
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-blue-600"
            >
              <KeyRound className="h-4 w-4" />
              Join with a code
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Group actions"
            aria-expanded={expanded}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>
    </>
  )
}
