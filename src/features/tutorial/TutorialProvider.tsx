import { createContext, useCallback, useEffect, useState } from 'react'
import { Joyride, ACTIONS, EVENTS, STATUS, type EventData } from 'react-joyride'
import { useNavigate } from 'react-router-dom'
import { tutorialSteps, type TutorialStep } from './tutorialSteps'

const TUTORIAL_KEY = 'iskilog:tutorial:completed'

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
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(
    () => Boolean(localStorage.getItem(TUTORIAL_KEY))
  )

  // Auto-start on mount for users who haven't seen the tour yet.
  // TutorialProvider is rendered only after all gates pass and hydration
  // succeeds, so the app is ready by the time this fires.
  useEffect(() => {
    if (localStorage.getItem(TUTORIAL_KEY)) return
    navigate('/')
    const t = setTimeout(() => setRun(true), 600)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startTutorial = useCallback(() => {
    setStepIndex(0)
    navigate('/')
    setTimeout(() => setRun(true), 400)
  }, [navigate])

  const restartTutorial = useCallback(() => {
    localStorage.removeItem(TUTORIAL_KEY)
    setIsCompleted(false)
    setStepIndex(0)
    setRun(false)
    navigate('/')
    setTimeout(() => setRun(true), 400)
  }, [navigate])

  const completeTour = useCallback(() => {
    setRun(false)
    localStorage.setItem(TUTORIAL_KEY, 'true')
    setIsCompleted(true)
    navigate('/')
  }, [navigate])

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

        if (targetRoute !== window.location.pathname) {
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
