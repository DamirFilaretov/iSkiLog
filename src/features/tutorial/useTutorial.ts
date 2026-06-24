import { useContext } from 'react'
import { TutorialContext } from './TutorialProvider'

export function useTutorial() {
  return useContext(TutorialContext)
}
