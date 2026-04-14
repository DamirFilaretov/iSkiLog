# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Is

iSkiLog is a training log and analysis app for tournament-style waterski practice. React 19 SPA + Capacitor-wrapped Android app. No custom backend — all storage and auth via Supabase (Auth + Postgres + RPC).

Core domain: a **set** is one logged training pass. Every set has a shared base (event type, date, season ID, notes, favourite flag) plus event-specific subtype data:
- **slalom**: buoys, rope length, speed, passes count
- **tricks**: duration, trick type (hands/toes)
- **jump**: sub-mode (jump or cuts), attempts/passed/made/distance
- **other**: freeform name and duration

Seasons are **calendar-year only** (YYYY-01-01 → YYYY-12-31). Intentional product decision — do not change.

## Commands

```bash
npm run dev             # start dev server
npm run build           # tsc + vite build
npm run test            # vitest watch (unit tests only)
npm run test:run        # vitest run (CI-style, no watch)
npm run e2e             # Playwright E2E (needs .env.test + local Supabase)
npm run e2e:flow1       # run only "flow 1:" labelled tests
npm run e2e:db:prepare  # reset E2E test DB schema + clean test users
npx cap sync android    # sync web build to Android after web changes
```

E2E tests require `.env.test`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `E2E_SUPABASE_DB_URL`, `E2E_TEST_EMAIL_DOMAIN`, `E2E_BASE_URL`. See `docs/testing/e2e-runbook.md`.

App runtime requires `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`. Source-map upload (optional): `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

## Architecture

### Startup & Gate Flow

`src/main.tsx` → imports Sentry instrumentation first → creates React root with Sentry error hooks → renders `App`.

`src/app/App.tsx` wraps everything in two providers (outer → inner):
1. `SetsProvider` (`src/store/setsStore.tsx`) — reducer-based store for all sets, seasons, active season
2. `AuthProvider` (`src/auth/AuthProvider.tsx`) — resolves Supabase session, hydrates all user data

Before routing, three ordered gates are checked:
1. **Auth gate** → shows `<Auth />` if no session
2. **Welcome gate** → shows `<Welcome />` if `user_metadata.welcome_completed` is falsy
3. **Policy gate** → shows `<GooglePolicyGate />` for Google users if `user_metadata.policy_accepted` is falsy

Hydration is centralized in `AuthProvider`, not route-local. Components read from the store.

### Routes

Tab shell (`/`, `/insights`, `/settings`) renders `<BottomTabBar>`. All other routes are outside the tab shell.

```
/                         Home (dashboard, tasks, quick-add)
/insights                 Insights (analytics + export)
/insights/tricks-library  TricksLibrary
/settings                 Settings
/history                  History (recent sets, filters)
/history/all              HistoryAll (paginated full history)
/add                      AddSet (create OR edit — same page)
/set/:id                  SetSummary (view + delete)
/season-settings          SeasonSettings
/profile                  ProfileSettings
/about                    About
/privacy-security         PrivacySecurity
/personal-info            → redirects to /profile
```

### State & Caching

`src/store/setsStore.tsx` — React context + `useReducer`. Manages: `sets`, `seasons`, `activeSeasonId`, `setsHydrated`.

LocalStorage caches (all keyed per-user):
```
iskilog:cache:user:<userId>          # sets + seasons + activeSeasonId (CACHE_VERSION = 2)
iskilog:preferences                  # rope/speed unit preferences
iskilog:tasks:<userId>               # tasks
iskilog:learned-tricks:<userId>      # learned tricks
iskilog:in-progress-tricks:<userId>  # in-progress tricks
```

**CACHE_VERSION = 2** — bump when cache shape changes; old caches will be invalidated.

### Data Layer

**API files:**
- `src/data/setsApi.ts` — `fetchSets()` via `fetch_sets_hydrated` RPC
- `src/data/setsWriteApi.ts` — `createSet()` via `create_set_with_subtype` RPC
- `src/data/setsUpdateDeleteApi.ts` — update/delete/favorite; update via `update_set_with_subtype` RPC
- `src/data/setSubtypeRpcPayload.ts` — shapes event-specific RPC payloads; **read before touching set CRUD**
- `src/data/seasonsApi.ts` — season CRUD; `setActiveSeason()` via `set_active_season_atomic` RPC
- `src/data/tasksApi.ts` — task CRUD with localStorage cache
- `src/data/tricksLearnedApi.ts` — learned/in-progress trick toggles

**Supabase RPCs (do not bypass):**
- `fetch_sets_hydrated` — returns sets + subtype data joined
- `create_set_with_subtype` — transactionally creates set + subtype row
- `update_set_with_subtype` — transactionally updates set + subtype row
- `set_active_season_atomic` — atomically updates active season

**Database tables:** `profiles`, `seasons`, `sets`, `slalom_sets`, `tricks_sets`, `jump_sets`, `other_sets`, `user_tasks`, `user_learned_tricks`, `user_in_progress_tricks`

Schema source of truth: `tests/e2e/db/schema.sql`

### Auth & Hydration

`src/auth/AuthProvider.tsx` responsibilities:
- Reads initial session, subscribes to auth state changes
- Hydrates sets + seasons; normalizes seasons to calendar-year bounds
- Ensures current-year season exists (auto-creates if missing)
- Sets Sentry user context; clears all caches on sign-out
- Sets user metadata after OAuth sign-in (`profile_name`, etc.)

Hydration states: `idle | loading | success | error`. On error, user sees retry screen (not broken shell).

Onboarding metadata (Supabase `user_metadata`): `welcome_completed`, `welcome_completed_at`, `policy_accepted`, `policy_accepted_at`. Future onboarding changes must stay compatible unless a migration is added.

### TypeScript Types

`src/types/sets.ts` — `SkiSet` is a **discriminated union**:
```ts
type SkiSet =
  | (SetBase & { event: "slalom"; data: SlalomData })
  | (SetBase & { event: "tricks"; data: TricksData })
  | (SetBase & { event: "jump";   data: JumpData })
  | (SetBase & { event: "other";  data: OtherData })
```
Always narrow by `event` before accessing `data`.

### Key lib/ Files

- `src/lib/supabaseClient.ts` — singleton Supabase client (PKCE auth, session persistence)
- `src/lib/preferences.ts` — user unit preferences; `usePreferences()` hook
- `src/lib/localCache.ts` — `clearAppLocalCaches()` removes all `iskilog:*` keys
- `src/lib/nativeOAuth.ts` — `isNativeRuntime()`, OAuth redirect helpers
- `src/lib/nativeFileExport.ts` — PDF export via Capacitor filesystem + share
- `src/lib/sentryHandled.ts` — `captureHandledException()`, `captureHandledWarning()`

### Features

- `src/features/insights/` — client-side analytics (selectors, utils, types)
- `src/features/tricks/` — trick catalog (`trickCatalog.ts`) + versioned toggle logic (`learnedToggle.ts`)
- `src/features/tasks/` — task sort helpers
- `src/features/dateRange/` — date range filter utilities

### Native / Capacitor

- App ID: `com.damir.iskilog`; Android project: `./android/`
- Google OAuth: Capacitor Browser opens OAuth → deep-link callback → `supabase.auth.exchangeCodeForSession()`. Handled in `App.tsx` via `CapacitorApp.addListener("appUrlOpen")`.
- **After any web change affecting native**: run `npx cap sync android`

### Sentry

`src/instrument.ts` initializes Sentry; imported first in `main.tsx`.
- **Unhandled errors** — auto-captured via React 19 root error hooks
- **Handled business-flow errors** — manually via `captureHandledException` (`src/lib/sentryHandled.ts`)
- **Non-blocking warnings** — `captureHandledWarning`

Do not remove manual Sentry capture from user-facing catch blocks.

### Testing

**Unit tests:** Co-located with source, `.test.ts` suffix. Coverage: insights math, task sorting, trick toggle race-safety, trick catalog validation, set counting utilities.

**E2E tests** (`tests/e2e/specs/`):
- `auth.spec.ts` — sign-up, login, logout, session persistence
- `sets-crud.spec.ts` — create/read/update/delete all event types
- `tasks.spec.ts` — task management flows
- `reports.spec.ts` — CSV/PDF export flows

## Constraints

- Do not change season-to-calendar-year semantics.
- Do not bypass RPC for set CRUD — use `setsWriteApi`/`setsUpdateDeleteApi`.
- Do not remove `captureHandledException` calls from handled error flows.
- The app targets Android native; there is no tracked iOS project.
- Browser zoom is intentionally disabled via viewport meta in `index.html`.
- There is no separate backend service — no Express, no Edge Functions currently.
- Trust `tests/e2e/db/schema.sql` as the source of truth for the database schema.
- Bump `CACHE_VERSION` in `setsStore.tsx` whenever the localStorage cache shape changes.