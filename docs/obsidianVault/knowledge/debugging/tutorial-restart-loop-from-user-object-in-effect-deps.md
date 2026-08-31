---
title: Tutorial restart loop from user object in effect deps
date: 2026-08-30
tags:
  - debugging
  - tutorial
  - onboarding
  - ios
  - react
status: solved
---

# Tutorial restart loop from user object in effect deps

> [!bug] Symptom
> On a **fresh account, first launch of the App Store iOS build**, the onboarding tour runs. Steps 1 and 2 are fine. Pressing **Next** into step 3 makes the screen thrash between views for under a second and the tour jumps back to the start. Retrying step 3 repeats the loop; the only escape is **Skip**. Never reproduced on the website, and **Settings → Restart Tutorial always works**.

## Root cause

`TutorialProvider`'s auto-start `useEffect` had `user` (and `persistTutorialCompletion`, which itself closes over `user`) in its dependency array, and its body unconditionally calls `navigate('/')`.

On a brand-new account, several `supabase.auth.updateUser(...)` writes fire right after sign-in:

- Welcome gate → `welcome_completed` (`App.tsx`)
- Apple / Google policy gate → `policy_accepted` (`App.tsx`)
- token refresh / profile churn

On a real device over mobile network these resolve **seconds later** — after the tour has started. Each one triggers a Supabase `USER_UPDATED` event, `AuthProvider` calls `setUser(newObject)`, and React compares deps by reference (`Object.is`), so a new object counts as "changed". The auto-start effect re-runs and calls `navigate('/')` again.

Steps 1–2 live on `/`, so the stray `navigate('/')` is invisible. **Step 3 is the first step that routes away** (to `/add`). Now two effects fight: the stray auto-start keeps yanking back to `/`, and the tour's own route-sync effect navigates back to `/add`. `routeReady` flips false/true, Joyride hides and re-shows, and because step 0 and step 3 are both centered `body` tooltips the re-show reads as "the tour restarted".

**Why the website was clean:** metadata writes settle before the user reaches step 3.
**Why Settings → Restart works:** by then all onboarding writes are long done, `user` is stable, the effect never re-fires.

## Fix

Split the one effect into two (`src/features/tutorial/TutorialProvider.tsx`):

1. **Completion-sync effect** — still depends on `[persistTutorialCompletion, user]`, but only updates flags (`localStorage`, `setIsCompleted`, remote backfill). It never navigates or toggles the tour, so re-running it is harmless.
2. **Auto-start effect** — deps narrowed to `[navigate]` (stable in react-router v7), so it runs once on mount. Later `user` object churn can no longer re-trigger it. `user` is still read inside for the "already completed?" check via a stale mount-time closure, which is correct: the provider only mounts after all gates pass, so metadata is present.

## How to recognize this class elsewhere

> [!question] Could this bite a new feature?
> Any `useEffect` that performs a **navigation or other one-shot side effect** and lists `user` (or a callback derived from `user`) in its deps. The Supabase `user` object gets a fresh reference on every auth event — `SIGNED_IN`, `USER_UPDATED`, `TOKEN_REFRESHED`, app resume. If the effect must read user data but should only fire once, narrow the deps and read through a stale closure or a ref; keep flag-only reconciliation in a separate effect.

## Related follow-up (not fixed here)

`Welcome` and `GooglePolicyGate` in `App.tsx` each build `nextMeta` from a possibly-stale `previousMeta` snapshot, so their two `updateUser` calls can partially clobber each other and multiply the `USER_UPDATED` round-trips. Reading fresh metadata via `supabase.auth.getUser()` before each write would cut the churn.

## Related

- [[tutorial-uses-react-joyride-with-controlled-step-index]]
- [[hydration-is-centralized-in-authprovider]]
- [[2026-08-30-tutorial-restart-loop-fix]]
