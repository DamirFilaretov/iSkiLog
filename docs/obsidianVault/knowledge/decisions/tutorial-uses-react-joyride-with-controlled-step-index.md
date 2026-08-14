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

Use **react-joyride** (v3) with a manually controlled `stepIndex` for the onboarding tutorial. Cross-route navigation is handled in the `onEvent` callback by calling `navigate()` followed by a 400 ms `setTimeout` before advancing `stepIndex`.

## Why

- react-joyride renders its tooltip in a portal and works across routes; driver.js does not
- Controlled `stepIndex` gives full control over when to advance (needed for the navigate → wait → show pattern)
- No `before` hooks exist in the stable v3 API, so navigation must happen in the callback

## Critical constraints

- **Provider must live inside `<BrowserRouter>`** — `useNavigate()` is only available under the router; wrapping from outside causes a runtime error
- **`STATUS.FINISHED` never fires in controlled mode** — Joyride waits for the consumer to advance `stepIndex` past the last step; detect the boundary with `nextIndex >= tutorialSteps.length` in the `STEP_AFTER` handler and call `setRun(false)` + persistence manually
- **Full-page-height targets break the overlay** — steps targeting `min-h-screen` root divs push the tooltip to the bottom and strip the grey background; use `target: 'body'` + `placement: 'center'` instead
- **Scroll to top on every step** — call `window.scrollTo(0, 0)` before advancing `stepIndex` (inside the setTimeout for cross-route steps, immediately for same-route steps)

## Persistence

`iskilog:tutorial:completed` in localStorage. Auto-cleared by `clearAppLocalCaches()` on sign-out, so the tour re-runs on the next login for a new session.

## Entry points

- Auto-start: `TutorialProvider` `useEffect` on mount (fires once, 600 ms after mount)
- Manual restart: `restartTutorial()` from `useTutorial()`, surfaced in Settings

Related: [[2026-06-24-onboarding-tutorial]]
