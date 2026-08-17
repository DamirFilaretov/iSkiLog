---
title: "2026-06-24 — Onboarding Tutorial"
date: 2026-06-24
tags:
  - session
  - tutorial
  - onboarding
---

# 2026-06-24 — Onboarding Tutorial

## What shipped

Added the original 8-step cross-route guided tour using **react-joyride** (v3, named exports). It auto-started after the auth → welcome → policy gates and could be restarted from Settings. The merged implementation was later expanded and hardened; see [[2026-08-14-tutorial-release-and-reliability]].

### New files

| File | Role |
|---|---|
| `src/features/tutorial/tutorialSteps.ts` | 8-step array; each step extends `Step` with a custom `route` field |
| `src/features/tutorial/TutorialProvider.tsx` | Context + `<Joyride />` + cross-route callback + completion persistence |
| `src/features/tutorial/useTutorial.ts` | `useTutorial()` hook — exposes `startTutorial`, `restartTutorial`, `isCompleted` |

### Modified files

- `src/app/App.tsx` — `<TutorialProvider>` added **inside** `<BrowserRouter>` (required for `useNavigate()`)
- `src/pages/Home.tsx` — `data-tutorial="quick-add"` and `data-tutorial="tasks-block"`
- `src/pages/AddSet.tsx` — `data-tutorial="add-set-form"` on root div
- `src/pages/History.tsx` — `data-tutorial="history-page"` on root div
- `src/pages/TricksLibrary.tsx` — `data-tutorial="tricks-library-page"` on root div
- `src/components/nav/BottomTabBar.tsx` — `tutorialTarget="insights-tab"` on Insights tab
- `src/pages/Settings.tsx` — "Restart Tutorial" button
- `index.html` — Open Sans loaded via Google Fonts

## Key decisions

- **react-joyride over driver.js** — native multi-route support via controlled `stepIndex`
- **Provider inside BrowserRouter** — `useNavigate()` only works under the router
- **Controlled stepIndex** — cross-route navigation handled manually: navigate → 400ms delay → setStepIndex; scroll-to-top on every step
- **Steps 3 and 7 use `target: 'body'` + `placement: 'center'`** — targeting `min-h-screen` root divs caused Joyride to push the tooltip to the bottom of the page and broke the overlay
- **Finish detection is manual** — in controlled-stepIndex mode Joyride never fires `STATUS.FINISHED` automatically; boundary detected in `STEP_AFTER` handler when `nextIndex >= steps.length`

## Bugs fixed during session

1. Grey screen after last step + tutorial restarting on reload — `STATUS.FINISHED` never fired in controlled mode; fixed by detecting `nextIndex >= tutorialSteps.length` in `STEP_AFTER` and calling `completeTour()` directly
2. Tooltip extending full-page-height on `/add` and `/insights/tricks-library` — switched those steps from element-targeted to `body` + `center`

## Persistence

- Key: `iskilog:tutorial:completed` (follows `iskilog:` prefix)
- Auto-cleared on sign-out via `clearAppLocalCaches()` — tour restarts on next login

> [!note] Historical behavior
> This describes the June implementation. PR #39 later added Supabase user-metadata persistence and two navigation-discovery steps; PR #40 replaced timer-driven route advancement with location-driven route readiness for mobile Safari.

See [[tutorial-uses-react-joyride-with-controlled-step-index]].
