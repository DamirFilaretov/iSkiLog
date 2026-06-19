const PRESS_CLASS = "press-feedback-active"
const PRESS_DURATION_MS = 120

declare global {
  interface Window {
    __iskilogButtonPressFeedbackInstalled?: boolean
  }
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function isDisabled(target: HTMLElement) {
  if (target instanceof HTMLButtonElement) return target.disabled
  return target.getAttribute("aria-disabled") === "true"
}

function findPressTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>('button, [role="button"]')
}

function installButtonPressFeedback() {
  if (typeof window === "undefined") return
  if (window.__iskilogButtonPressFeedbackInstalled) return

  window.__iskilogButtonPressFeedbackInstalled = true
  const timers = new WeakMap<HTMLElement, number>()

  window.addEventListener(
    "pointerdown",
    event => {
      if (prefersReducedMotion()) return

      const target = findPressTarget(event.target)
      if (!target || isDisabled(target)) return

      const existingTimer = timers.get(target)
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer)
      }

      target.classList.remove(PRESS_CLASS)
      window.requestAnimationFrame(() => {
        target.classList.add(PRESS_CLASS)
        const timer = window.setTimeout(() => {
          target.classList.remove(PRESS_CLASS)
          timers.delete(target)
        }, PRESS_DURATION_MS)
        timers.set(target, timer)
      })
    },
    { passive: true }
  )
}

installButtonPressFeedback()

export {}
