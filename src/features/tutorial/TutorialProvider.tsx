import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { Joyride, ACTIONS, EVENTS, STATUS, type EventData } from 'react-joyride'
import { useLocation, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '../../auth/AuthProvider'
import { supabase } from '../../lib/supabaseClient'
import { tutorialSteps, type TutorialStep } from './tutorialSteps'

const TUTORIAL_KEY = 'iskilog:tutorial:completed'
const TARGET_WAIT_TIMEOUT_MS = 8_000

function getTargetElement(target: TutorialStep['target']) {
  if (typeof target === 'string') return document.querySelector(target)
  if (typeof target === 'function') return target()
  if (target && 'current' in target) return target.current
  return target
}

function waitForTarget(target: TutorialStep['target'], timeout = TARGET_WAIT_TIMEOUT_MS) {
  return new Promise<boolean>(resolve => {
    const startedAt = performance.now()
    let frame = 0
    let previousRect = ''
    let stableFrames = 0

    const check = () => {
      const element = getTargetElement(target)

      if (element) {
        const rect = element.getBoundingClientRect()
        const nextRect = `${rect.top}:${rect.left}:${rect.width}:${rect.height}`
        stableFrames = nextRect === previousRect && rect.width > 0 && rect.height > 0
          ? stableFrames + 1
          : 0
        previousRect = nextRect

        // Wait for two settled animation frames so async page content cannot move
        // the target immediately after Joyride measures it.
        if (stableFrames >= 2) {
          resolve(true)
          return
        }
      }

      if (performance.now() - startedAt >= timeout) {
        resolve(false)
        return
      }

      frame = requestAnimationFrame(check)
    }

    frame = requestAnimationFrame(check)

    // Keep the frame id referenced for browsers that aggressively optimize the loop.
    void frame
  })
}

function readSafeAreaInsets() {
  const probe = document.createElement('div')
  probe.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top)',
    'padding-bottom:env(safe-area-inset-bottom)',
  ].join(';')
  document.body.appendChild(probe)
  const styles = getComputedStyle(probe)
  const insets = {
    top: Number.parseFloat(styles.paddingTop) || 0,
    bottom: Number.parseFloat(styles.paddingBottom) || 0,
  }
  probe.remove()
  return insets
}

function hasCompletedTutorial(user: User | null) {
  const meta = user?.user_metadata as Record<string, unknown> | undefined
  if (!meta) return false
  if (meta.tutorial_completed === true) return true
  return typeof meta.tutorial_completed_at === 'string' && meta.tutorial_completed_at.length > 0
}

type TutorialContextValue = {
  startTutorial: () => void
  restartTutorial: () => void
  isCompleted: boolean
}

export const TutorialContext = createContext<TutorialContextValue>({
  startTutorial: () => {},
  restartTutorial: () => {},
  isCompleted: false,
})

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [run, setRun] = useState(false)
  const [routeReady, setRouteReady] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)
  const [safeArea, setSafeArea] = useState({ top: 0, bottom: 0 })
  const [isCompleted, setIsCompleted] = useState(
    () => hasCompletedTutorial(user) || Boolean(localStorage.getItem(TUTORIAL_KEY))
  )

  useEffect(() => {
    const updateSafeArea = () => {
      const next = readSafeAreaInsets()
      setSafeArea(previous => (
        previous.top === next.top && previous.bottom === next.bottom ? previous : next
      ))
    }
    updateSafeArea()
    window.addEventListener('resize', updateSafeArea)
    window.visualViewport?.addEventListener('resize', updateSafeArea)
    window.visualViewport?.addEventListener('scroll', updateSafeArea)

    return () => {
      window.removeEventListener('resize', updateSafeArea)
      window.visualViewport?.removeEventListener('resize', updateSafeArea)
      window.visualViewport?.removeEventListener('scroll', updateSafeArea)
    }
  }, [])

  const joyrideSteps = useMemo<TutorialStep[]>(() => tutorialSteps.map(step => {
    const collisionPadding = {
      top: safeArea.top + 16,
      right: 16,
      bottom: safeArea.bottom + 16,
      left: 16,
    }

    return {
      ...step,
      scrollOffset: safeArea.top + 20,
      targetWaitTimeout: TARGET_WAIT_TIMEOUT_MS,
      floatingOptions: {
        ...step.floatingOptions,
        autoUpdate: { animationFrame: true, ...step.floatingOptions?.autoUpdate },
        flipOptions: step.floatingOptions?.flipOptions === false
          ? false as const
          : { padding: collisionPadding, ...step.floatingOptions?.flipOptions },
        shiftOptions: {
          padding: collisionPadding,
          ...step.floatingOptions?.shiftOptions,
        },
      },
    }
  }), [safeArea])

  const persistTutorialCompletion = useCallback(() => {
    if (!user) return

    const previousMeta = (user.user_metadata as Record<string, unknown> | undefined) ?? {}
    const nextMeta = {
      ...previousMeta,
      tutorial_completed: true,
      tutorial_completed_at:
        typeof previousMeta.tutorial_completed_at === 'string' &&
        previousMeta.tutorial_completed_at.length > 0
          ? previousMeta.tutorial_completed_at
          : new Date().toISOString(),
    }

    void supabase.auth.updateUser({ data: nextMeta }).then(({ error }) => {
      if (error) {
        console.error('Failed to save tutorial completion', error)
      }
    })
  }, [user])

  // Auto-start on mount for users who haven't seen the tour yet.
  // TutorialProvider is rendered only after all gates pass and hydration
  // succeeds, so the app is ready by the time this fires.
  useEffect(() => {
    const remoteCompleted = hasCompletedTutorial(user)
    const localCompleted = localStorage.getItem(TUTORIAL_KEY) === 'true'

    if (remoteCompleted || localCompleted) {
      localStorage.setItem(TUTORIAL_KEY, 'true')
      setIsCompleted(true)

      if (localCompleted && !remoteCompleted) {
        persistTutorialCompletion()
      }
      return
    }

    navigate('/')
    const t = setTimeout(() => setRun(true), 600)
    return () => clearTimeout(t)
  }, [navigate, persistTutorialCompletion, user])

  useEffect(() => {
    if (!run) {
      setRouteReady(true)
      return
    }

    const currentStep = tutorialSteps[stepIndex] as TutorialStep | undefined
    if (!currentStep) return

    const currentRoute = `${location.pathname}${location.search}`
    if (currentStep.route !== currentRoute) {
      setRouteReady(false)
      navigate(currentStep.route)
      return
    }

    let cancelled = false
    window.scrollTo(0, 0)
    void waitForTarget(currentStep.target).then(found => {
      if (!cancelled && found) setRouteReady(true)
    })

    return () => { cancelled = true }
  }, [location.pathname, location.search, navigate, run, stepIndex])

  const startTutorial = useCallback(() => {
    setStepIndex(0)
    setRouteReady(false)
    navigate('/')
    setTimeout(() => setRun(true), 400)
  }, [navigate])

  const restartTutorial = useCallback(() => {
    setStepIndex(0)
    setRouteReady(false)
    setRun(false)
    navigate('/')
    setTimeout(() => setRun(true), 400)
  }, [navigate])

  const completeTour = useCallback(() => {
    setRun(false)
    setRouteReady(true)
    localStorage.setItem(TUTORIAL_KEY, 'true')
    setIsCompleted(true)
    persistTutorialCompletion()
    navigate('/')
  }, [navigate, persistTutorialCompletion])

  const handleCallback = useCallback((data: EventData) => {
    const { action, index, status, type } = data

    if (type === EVENTS.TARGET_NOT_FOUND) {
      const currentStep = tutorialSteps[index] as TutorialStep | undefined
      if (currentStep) {
        setRouteReady(false)
        void waitForTarget(currentStep.target).then(found => {
          if (found) setRouteReady(true)
        })
      }
      return
    }

    if (type === EVENTS.STEP_AFTER) {
      const delta = action === ACTIONS.PREV ? -1 : 1
      const nextIndex = index + delta

      if (nextIndex >= tutorialSteps.length) {
        // In controlled-stepIndex mode Joyride never fires STATUS.FINISHED
        // automatically — detect the boundary here and finish manually.
        completeTour()
        return
      }

      if (nextIndex >= 0) {
        setRouteReady(false)
        setStepIndex(nextIndex)
      }
    }

    // Skip button / close — Joyride fires STATUS.SKIPPED via tour:end event
    if (status === STATUS.SKIPPED || status === STATUS.FINISHED) {
      completeTour()
    }
  }, [completeTour])

  return (
    <TutorialContext.Provider value={{ startTutorial, restartTutorial, isCompleted }}>
      <Joyride
        continuous
        scrollToFirstStep
        run={run && routeReady}
        stepIndex={stepIndex}
        steps={joyrideSteps}
        onEvent={handleCallback}
        locale={{ last: "Start Skiing!" }}
        styles={{
          tooltip: {
            borderRadius: 20,
            fontFamily: "'Open Sans', sans-serif",
          },
          tooltipTitle: {
            fontFamily: "'Open Sans', sans-serif",
            fontWeight: 600,
          },
          buttonPrimary: {
            borderRadius: 999,
            fontFamily: "'Open Sans', sans-serif",
          },
          buttonBack: {
            borderRadius: 999,
            fontFamily: "'Open Sans', sans-serif",
          },
          buttonSkip: {
            fontFamily: "'Open Sans', sans-serif",
          },
        }}
        options={{
          primaryColor: '#2563eb',
          overlayColor: 'rgba(0,0,0,0.55)',
          zIndex: 1000,
          showProgress: true,
          buttons: ['back', 'skip', 'primary'],
        }}
      />
      {children}
    </TutorialContext.Provider>
  )
}
