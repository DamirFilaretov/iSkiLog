import { createContext, useCallback, useEffect, useState } from 'react'
import { Joyride, ACTIONS, EVENTS, STATUS, type EventData } from 'react-joyride'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '../../auth/AuthProvider'
import { supabase } from '../../lib/supabaseClient'
import { tutorialSteps, type TutorialStep } from './tutorialSteps'

const TUTORIAL_KEY = 'iskilog:tutorial:completed'

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
  const { user } = useAuth()
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(
    () => hasCompletedTutorial(user) || Boolean(localStorage.getItem(TUTORIAL_KEY))
  )

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

  const startTutorial = useCallback(() => {
    setStepIndex(0)
    navigate('/')
    setTimeout(() => setRun(true), 400)
  }, [navigate])

  const restartTutorial = useCallback(() => {
    setStepIndex(0)
    setRun(false)
    navigate('/')
    setTimeout(() => setRun(true), 400)
  }, [navigate])

  const completeTour = useCallback(() => {
    setRun(false)
    localStorage.setItem(TUTORIAL_KEY, 'true')
    setIsCompleted(true)
    persistTutorialCompletion()
    navigate('/')
  }, [navigate, persistTutorialCompletion])

  const handleCallback = useCallback((data: EventData) => {
    const { action, index, status, type } = data

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const delta = action === ACTIONS.PREV ? -1 : 1
      const nextIndex = index + delta

      if (nextIndex >= tutorialSteps.length) {
        // In controlled-stepIndex mode Joyride never fires STATUS.FINISHED
        // automatically — detect the boundary here and finish manually.
        completeTour()
        return
      }

      if (nextIndex >= 0) {
        const nextStep = tutorialSteps[nextIndex] as TutorialStep
        const targetRoute = nextStep.route

        const currentRoute = `${window.location.pathname}${window.location.search}`

        if (targetRoute !== currentRoute) {
          navigate(targetRoute)
          setTimeout(() => {
            window.scrollTo(0, 0)
            setStepIndex(nextIndex)
          }, 400)
        } else {
          window.scrollTo(0, 0)
          setStepIndex(nextIndex)
        }
      }
    }

    // Skip button / close — Joyride fires STATUS.SKIPPED via tour:end event
    if (status === STATUS.SKIPPED || status === STATUS.FINISHED) {
      completeTour()
    }
  }, [navigate, completeTour])

  return (
    <TutorialContext.Provider value={{ startTutorial, restartTutorial, isCompleted }}>
      <Joyride
        continuous
        scrollToFirstStep
        run={run}
        stepIndex={stepIndex}
        steps={tutorialSteps}
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
