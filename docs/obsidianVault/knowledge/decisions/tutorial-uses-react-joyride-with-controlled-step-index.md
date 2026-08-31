---
title: Tutorial uses react-joyride with controlled stepIndex
date: 2026-06-24
tags:
  - decision
  - tutorial
  - onboarding
---

# Tutorial uses react-joyride with controlled stepIndex

## Decision

Use **react-joyride** (v3) with a manually controlled `stepIndex` for the onboarding tutorial. The provider derives route readiness from React Router's `useLocation()` and pauses Joyride until the route and query string for the current step are mounted.

## Why

- react-joyride renders its tooltip in a portal and works across routes; driver.js does not
- Controlled `stepIndex` gives full control over the navigate → route-ready → show sequence
- No `before` hooks exist in the stable v3 API, so navigation must happen in the callback

## Critical constraints

- **Provider must live inside `<BrowserRouter>`** — `useNavigate()` is only available under the router; wrapping from outside causes a runtime error
- **`STATUS.FINISHED` never fires in controlled mode** — Joyride waits for the consumer to advance `stepIndex` past the last step; detect the boundary with `nextIndex >= tutorialSteps.length` in the `STEP_AFTER` handler and call `setRun(false)` + persistence manually
- **Full-page-height targets break the overlay** — steps targeting `min-h-screen` root divs push the tooltip to the bottom and strip the grey background; use `target: 'body'` + `placement: 'center'` instead
- **Do not advance Joyride while a route is mounting** — set `routeReady` false when the step changes; the location effect navigates, waits 150 ms after the exact pathname + search match, scrolls to top, then resumes Joyride
- **Compare pathname and query string** — the Tricks Library discovery step depends on `/insights?event=tricks`
- **Keep `user` out of the auto-start effect's deps** — the effect calls `navigate('/')`; if it re-runs when the Supabase `user` object gets a new reference (every `USER_UPDATED` / `TOKEN_REFRESHED`), it yanks a fresh account off step 3 into a restart loop. Deps are `[navigate]` only; flag-only completion sync lives in a separate effect that may watch `user`. See [[tutorial-restart-loop-from-user-object-in-effect-deps]]

## Persistence

Completion is stored both in localStorage (`iskilog:tutorial:completed`) and Supabase user metadata (`tutorial_completed`, `tutorial_completed_at`). Remote metadata prevents the tutorial replaying on a new device; existing local completions are backfilled remotely. Restarting from Settings replays the tour without erasing completion.

## Entry points

- Auto-start: `TutorialProvider` `useEffect` on mount (fires once, 600 ms after mount; deps `[navigate]` only — must not react to `user` changes)
- Manual restart: `restartTutorial()` from `useTutorial()`, surfaced in Settings

## Current flow

The merged tour has 10 steps: welcome, quick add, set details, season goals, history entry point, history, insights, Tricks Library entry point, Tricks Library, and completion.

Related: [[2026-06-24-onboarding-tutorial]], [[2026-08-14-tutorial-release-and-reliability]]
