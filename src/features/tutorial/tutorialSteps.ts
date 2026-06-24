import type { Step } from 'react-joyride'

export type TutorialStep = Step & { route: string }

export const tutorialSteps: TutorialStep[] = [
  {
    target: 'body',
    placement: 'center',
    route: '/',
    title: 'Welcome to iSkiLog!',
    content: "Let's take a quick tour of the key features. It'll only take a minute.",
    skipBeacon: true,
  },
  {
    target: '[data-tutorial="quick-add"]',
    placement: 'bottom',
    route: '/',
    title: 'Log a Set',
    content: 'Tap here to record a training set — slalom, tricks, jump, or other.',
    skipBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    route: '/add',
    title: 'Set Details',
    content: 'Choose your event type, fill in the details, add structured notes, then save.',
    skipBeacon: true,
  },
  {
    target: '[data-tutorial="tasks-block"]',
    placement: 'top',
    route: '/',
    title: 'Season Goals',
    content: 'Set goals for your season and check them off as you work through them.',
    skipBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    route: '/history',
    title: 'Your History',
    content: 'All your logged sets live here. Tap the ★ on any set to mark it as a favourite.',
    skipBeacon: true,
  },
  {
    target: '[data-tutorial="insights-tab"]',
    placement: 'top',
    route: '/insights',
    title: 'Insights',
    content: 'Track your progress over time — event breakdowns, weekly activity, and more.',
    skipBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    route: '/insights/tricks-library',
    title: 'Tricks Library',
    content: 'Browse the full tricks catalog. Mark tricks as learned or in-progress to track what you know.',
    skipBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    route: '/',
    title: "You're all set!",
    content: "That covers the key features. Happy skiing! You can restart this tour anytime from Settings.",
    skipBeacon: true,
  },
]
