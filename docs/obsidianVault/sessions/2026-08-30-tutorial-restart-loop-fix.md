---
title: "2026-08-30 — Tutorial restart loop fix"
date: 2026-08-30
tags:
  - session
  - tutorial
  - onboarding
  - ios
  - debugging
---

# 2026-08-30 — Tutorial restart loop fix

## Problem

On a **fresh account's first onboarding tour**, steps 1–2 are fine; pressing Next into step 3 makes the screen thrash between routes for under a second and the tour jumps back to the start, repeatedly, with Skip the only escape. First reported on the App Store iOS build; later confirmed to reproduce **deterministically in a plain browser** with a brand-new account, **independent of network speed**. Existing accounts never hit it (tour already complete → effect early-returns). Settings → Restart Tutorial always worked.

## First attempt (commit `07c6ea5`) — wrong diagnosis

Guessed the trigger was the Supabase `user` object getting a new reference from the Welcome / policy-gate `updateUser` writes landing late over mobile network, re-running the auto-start `useEffect` (which had `user` in its deps). Split the effect in two and narrowed the auto-start deps to `[navigate]`, assuming `navigate` is stable in react-router v7.

It did not fix anything, and the browser repro then made the network-race theory untenable.

## Real root cause

The app uses `<BrowserRouter>` (not a data router), so `useNavigate()` returns react-router's **unstable** `navigate` — a `useCallback` that lists `locationPathname` in its deps, so **`navigate` gets a new identity on every pathname change**.

The auto-start effect calls `navigate('/')` in its body *and* listed `navigate` in its deps. So:

1. Step 2 → Next → route-sync effect navigates to `/add` for step 3.
2. Pathname change → new `navigate` identity → auto-start effect re-runs → fires `navigate('/')`.
3. Pathname change → new `navigate` identity → route-sync effect runs → step 3 wants `/add` → `navigate('/add')`.
4. Loop, many times per second. `run` / `routeReady` toggle; Joyride flashes its centered step-0 tooltip → looks like a restart.

Steps 1–2 don't navigate (both on `/`), so step 3 — the first route-changing step — is exactly where it breaks.

## Fix

`src/features/tutorial/TutorialProvider.tsx`: auto-start effect deps are now **`[]`** with an `eslint-disable react-hooks/exhaustive-deps`. Runs once on mount, reads `user` from the mount-time closure, cannot re-fire from route or auth churn. No `<React.StrictMode>` in `main.tsx`, so one mount = one run. The flag-only completion-sync effect stays separate and may still watch `user` (it never navigates).

## Verification

`tsc --noEmit` clean · `npm run test:run` 56/56 · `npm run build` succeeds. No automated regression test — repo has no component-test harness (no jsdom / testing-library) and no tutorial E2E spec. Manual verification: fresh account, browser, walk past step 3.

## Notes

- Broader trap recorded in [[tutorial-restart-loop-from-navigate-in-effect-deps]]: **any** effect/callback/memo in this codebase that lists `navigate` re-runs on every route change; fine for navigation-reactive effects, a bug for one-shot side effects (tour start, analytics, modal open, fetch kickoff).
- A concurrent visual-polish refactor (headers, `src/lib/eventVisuals.tsx`, `pt-safe` utility) was landing on `fix/tutorial-visual-polish` in parallel; left untouched.

## Follow-ups

- [ ] `App.tsx` — Welcome / policy gates build `nextMeta` from a stale `previousMeta` snapshot; read via `supabase.auth.getUser()` first so the two writes don't clobber each other.
- [ ] Tutorial E2E coverage (Playwright), fresh-account path past step 3.
- [ ] Consider an eslint rule / grep check flagging `navigate` in a dependency array without a matching `location` dep.

## Documentation impact

- New: [[tutorial-restart-loop-from-navigate-in-effect-deps]]
- Updated: [[tutorial-uses-react-joyride-with-controlled-step-index]] — constraint on the auto-start effect deps.
