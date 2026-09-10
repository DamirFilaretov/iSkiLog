import { useEffect, useState } from "react"

/**
 * Extra bottom offset (in px) a `position: fixed; bottom: 0` element needs so
 * it clears browser chrome that overlaps the layout viewport.
 *
 * `index.html` ships `viewport-fit=cover`, so on iOS (Chrome and Safari) the
 * layout viewport — what `position: fixed` is anchored to — runs edge to edge
 * behind the browser's bottom toolbar. On a freshly opened tab the toolbar is
 * retracted, so `bottom: 0` lines up with the visible edge and the tab bar
 * looks right. When the tab is restored from the background the toolbar comes
 * back fully expanded and a `bottom: 0` bar is left rendered behind / below it
 * — "somewhere below where I cannot find it".
 *
 * `window.visualViewport` reports the region actually on screen. The gap
 * between the bottom of the visual viewport and the bottom of the layout
 * viewport (`window.innerHeight`) is exactly how far up the bar has to move to
 * sit above the chrome. On native (no browser chrome) and on desktop the gap
 * is 0 and this is a no-op.
 */
export function useViewportBottomInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop
      // A small gap is browser chrome; a large one is the on-screen keyboard,
      // which the fixed bar should sit behind, not ride on top of.
      setInset(gap > 1 && gap < 160 ? Math.round(gap) : 0)
    }

    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    // A tab restored from the background fires pageshow (often bfcache) rather
    // than resize, and refocusing the window is the other restore signal.
    window.addEventListener("pageshow", update)
    window.addEventListener("focus", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      window.removeEventListener("pageshow", update)
      window.removeEventListener("focus", update)
    }
  }, [])

  return inset
}
