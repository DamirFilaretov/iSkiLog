---
title: Tutorial restart loop from navigate() in effect deps
date: 2026-08-30
tags:
  - debugging
  - tutorial
  - onboarding
  - react
  - react-router
status: solved
---

# Tutorial restart loop from navigate() in effect deps

> [!bug] Symptom
> On a **fresh account's first run of the onboarding tour**, steps 1 and 2 are fine. Pressing **Next** into step 3 makes the screen thrash between views for under a second and the tour jumps back to the start; retrying step 3 repeats it, and only **Skip** escapes. Reproduces **deterministically in a plain browser** with a brand-new account, **independent of network speed**. Existing accounts never see it because the tour is already complete and the effect early-returns.

## Root cause

`TutorialProvider`'s auto-start `useEffect` calls `navigate('/')` in its body **and listed `navigate` in its dependency array**.

The app renders `<BrowserRouter>` (not a data router), so react-router gives us the **"unstable" `useNavigate`** (`useNavigateUnstable`). Its returned `navigate` is a `useCallback` whose deps include `locationPathname` — so **`navigate` gets a new identity every time the pathname changes**.

The loop:

1. Tour is on step 2 (route `/`). User taps Next → `setStepIndex(2)`, `setRouteReady(false)`.
2. The route-sync effect sees step 3 wants `/add` ≠ `/` → `navigate('/add')`.
3. Pathname changes → `navigate` identity changes → the **auto-start effect re-runs** → tour not complete → it fires `navigate('/')`.
4. Pathname changes back → `navigate` identity changes → route-sync effect runs → step 3 still wants `/add` → `navigate('/add')` → back to step 3.
5. GOTO 3, forever. Routes flip `/` ↔ `/add` many times per second; `run` / `routeReady` toggle, Joyride flashes its centered step-0 tooltip, and it reads as "the tutorial restarted".

Steps 1–2 never trigger it because they don't navigate (both on `/`). **Step 3 is the first step that changes route**, which is exactly where it breaks.

### Why the first fix attempt (commit `07c6ea5`) did not work

That commit narrowed the deps from `[navigate, persistTutorialCompletion, user]` to `[navigate]`, on the wrong assumption that `navigate` is stable in react-router v7. It is not stable under `<BrowserRouter>`. The effect still re-ran on every navigation and still fired `navigate('/')`.

## Fix

Auto-start effect deps are now **`[]`** (empty) with an `eslint-disable react-hooks/exhaustive-deps`. It runs once on mount, reads `user` via the mount-time closure (correct — the provider only mounts after all gates pass), and can never re-fire from route or auth churn. No `<React.StrictMode>` in `main.tsx`, so a single mount = a single run.

The flag-only completion-sync effect (localStorage / `setIsCompleted` / remote backfill) is still a separate effect that may watch `user` — it never navigates, so re-running it is harmless.

`src/features/tutorial/TutorialProvider.tsx`.

## How to recognize this class elsewhere

> [!question] Could this bite a new feature?
> Any `useEffect` / `useCallback` / `useMemo` in this codebase that lists **`navigate`** (or anything derived from it) in its dependency array will re-run on **every route change**, because `<BrowserRouter>` + `useNavigate` is unstable here. That is fine for effects that *should* react to navigation (they usually also list `location.*`). It is a bug for any effect that performs a **one-shot side effect** — starting a tour, firing analytics, opening a modal, kicking off a fetch. Give those `[]` deps (or a ref guard) and read `navigate` from a stale closure.
>
> Same trap for auth: the Supabase `user` object gets a fresh reference on every `SIGNED_IN` / `USER_UPDATED` / `TOKEN_REFRESHED` / app-resume event.

## Related follow-up (not fixed here)

`Welcome` and `GooglePolicyGate` in `App.tsx` each build `nextMeta` from a possibly-stale `previousMeta` snapshot, so their two `updateUser` calls can partially clobber each other. Reading fresh metadata via `supabase.auth.getUser()` before each write would fix that.

## Related

- [[tutorial-uses-react-joyride-with-controlled-step-index]]
- [[hydration-is-centralized-in-authprovider]]
- [[2026-08-30-tutorial-restart-loop-fix]]
