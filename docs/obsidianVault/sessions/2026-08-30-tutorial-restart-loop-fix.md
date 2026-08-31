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

## Problem investigated

Fresh accounts on the App Store iOS build hit a restart loop on tutorial step 3: the screen thrashed between routes for under a second and the tour jumped back to the start, repeatedly, with Skip the only way out. Not reproducible on web; Settings → Restart Tutorial always worked.

## Root cause

`TutorialProvider`'s auto-start `useEffect` listed `user` (and `persistTutorialCompletion`, which closes over `user`) in its deps and unconditionally called `navigate('/')`. On a new account the Welcome and policy gates fire `supabase.auth.updateUser(...)` writes that resolve seconds later over mobile network, each emitting a Supabase `USER_UPDATED` event → new `user` object reference → effect re-runs → stray `navigate('/')`. Steps 1–2 sit on `/` so it's invisible; step 3 routes to `/add`, so the stray navigation fights the tour's own route-sync effect and Joyride flashes its centered step-0 tooltip, reading as a restart.

Full write-up: [[tutorial-restart-loop-from-user-object-in-effect-deps]].

## Change

`src/features/tutorial/TutorialProvider.tsx` only. Split the single effect in two:

- **Completion-sync effect** — deps `[persistTutorialCompletion, user]`, flag-only (localStorage / `setIsCompleted` / remote backfill), no navigation.
- **Auto-start effect** — deps narrowed to `[navigate]` (stable in react-router v7), runs once on mount; reads `user` via stale mount-time closure for the "already completed?" check.

No behaviour change for existing users; the tour still auto-starts once and Restart from Settings is unaffected.

## Verification

- `tsc --noEmit` clean, `npm run test:run` 56/56, `npm run build` succeeds.
- No automated regression test added — repo has no component-test harness (no jsdom / testing-library) and no tutorial E2E spec. A Playwright test that steps past step 3 while metadata writes are in flight is the right guard.

## Notes / housekeeping

- A concurrent visual-polish refactor was in progress on `fix/tutorial-visual-polish` (headers, `src/lib/eventVisuals.tsx`). Left untouched — this commit contains only the tutorial fix and vault docs.
- `npx cap sync` on Windows rewrote `ios/App/CapApp-SPM/Package.swift` paths with backslashes and added an Android entry for the iOS-only Apple Sign In plugin; both reverted. The fix is pure runtime JS and needs no native re-sync.

## Follow-ups

- [ ] `App.tsx` — Welcome / policy gates build `nextMeta` from a stale `previousMeta` snapshot; reads via `supabase.auth.getUser()` first would stop the two writes clobbering each other and cut `USER_UPDATED` churn.
- [ ] Tutorial E2E coverage (Playwright), fresh-account path.

## Documentation impact

- New: [[tutorial-restart-loop-from-user-object-in-effect-deps]]
- Updated: [[tutorial-uses-react-joyride-with-controlled-step-index]] — added the "keep `user` out of the auto-start effect deps" constraint.
