---
title: Hydration is centralized in AuthProvider
date: 2026-06-19
tags:
  - atlas
  - architecture
  - auth
---

# Hydration is centralized in AuthProvider

[`src/auth/AuthProvider.tsx`](../../../src/auth/AuthProvider.tsx) is one of the most important files in the app. All user data loads **here**, once, not in route-local fetches. Components read from [[state-lives-in-a-reducer-based-setsstore|the store]].

## Responsibilities

- Read initial Supabase session; subscribe to auth state changes
- Clear app-local caches on sign-out / auth identity change ([[per-user-localstorage-caches-carry-a-version]])
- Set Sentry user context ([[sentry-captures-handled-and-unhandled-errors]])
- Ensure profile name data exists (backfill `full_name` from auth metadata)
- Hydrate seasons + sets; **normalize seasons to calendar-year bounds** ([[seasons-are-calendar-year-only]])
- Ensure the current-year season exists; activate it via `set_active_season_atomic`
- Avoid duplicate hydration for the same user unless a retry is requested
- Expose retryable hydration state to the UI

## Hydration states

`idle → loading → success | error`

> [!tip] Failure UX
> If hydration fails, the user gets a **retry screen**, not a half-broken shell. Don't regress this — a thrown error during boot should land on retry, not a blank app.

## Onboarding gates (checked after hydration)

Driven by Supabase `user_metadata`:

1. **Auth gate** → `<Auth />` if no session
2. **Welcome gate** → `<Welcome />` if `welcome_completed` falsy
3. **Policy gate** → `<GooglePolicyGate />` for Google users if `policy_accepted` falsy

Metadata keys: `welcome_completed`, `welcome_completed_at`, `policy_accepted`, `policy_accepted_at`. Future onboarding changes must stay compatible unless a migration is added.

## Related
- [[the-app-is-a-react19-supabase-capacitor-training-log]]
- [[state-lives-in-a-reducer-based-setsstore]]
- [[google-oauth-uses-capacitor-browser-and-deep-links]]
