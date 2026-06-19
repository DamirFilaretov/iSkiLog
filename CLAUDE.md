# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Is

iSkiLog is a training log and analysis app for tournament-style waterski practice. React 19 SPA + Capacitor-wrapped Android & iOS app. No custom backend — all storage and auth via Supabase (Auth + Postgres + RPC).

Core domain: a **set** is one logged training pass. Every set has a shared base (event type, date, optional time of day, season ID, structured notes, favourite flag) plus event-specific subtype data:
- **slalom**: buoys, rope length, speed, passes count
- **tricks**: duration, trick type (hands/toes)
- **jump**: sub-mode (jump or cuts), attempts/passed/made/distance
- **other**: freeform name and duration

`notes` is a **structured object** (`StructuredNotes` in `src/types/sets.ts`): `summary`, `workedOn`, `mistakes`, `whatHelped`, `nextSet`, `other` — all strings. Use `emptyNotes` for defaults.

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
npx cap sync ios        # sync web build to iOS after web changes
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
iskilog:cache:user:<userId>          # sets + seasons + activeSeasonId (CACHE_VERSION = 4)
iskilog:preferences                  # rope/speed unit preferences
iskilog:tasks:<userId>               # tasks
iskilog:learned-tricks:<userId>      # learned tricks
iskilog:in-progress-tricks:<userId>  # in-progress tricks
```

**CACHE_VERSION = 4** — bump when cache shape changes; old caches will be invalidated.

### Data Layer

**API files** (each goes through its named RPC — do not bypass these for set CRUD):
- `src/data/setsApi.ts` — `fetchSets()` via `fetch_sets_hydrated` (returns sets + subtype data joined)
- `src/data/setsWriteApi.ts` — `createSet()` via `create_set_with_subtype` (transactional create of set + subtype row)
- `src/data/setsUpdateDeleteApi.ts` — update/delete/favorite; update via `update_set_with_subtype` (transactional)
- `src/data/setSubtypeRpcPayload.ts` — shapes event-specific RPC payloads; **read before touching set CRUD**
- `src/data/seasonsApi.ts` — season CRUD; `setActiveSeason()` via `set_active_season_atomic` (atomic)
- `src/data/tasksApi.ts` — task CRUD with localStorage cache
- `src/data/tricksLearnedApi.ts` — learned/in-progress trick toggles

**Database tables:** `profiles`, `seasons`, `sets`, `slalom_sets`, `tricks_sets`, `jump_sets`, `other_sets`, `user_tasks`, `user_learned_tricks`, `user_in_progress_tricks`

Schema source of truth: `tests/e2e/db/schema.sql`

### Auth & Hydration

`src/auth/AuthProvider.tsx`: reads the initial session and subscribes to auth changes; hydrates sets + seasons (normalizing seasons to calendar-year bounds and auto-creating the current-year season if missing); sets Sentry user context, clears all caches on sign-out, and sets user metadata after OAuth sign-in (`profile_name`, etc.).

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
- `src/lib/skiFormat.ts` — shared rope-length/speed/jump-distance formatting (used by History, SetSummary, Insights)

### Features

- `src/features/insights/` — client-side analytics (selectors, utils, types)
- `src/features/tricks/` — trick catalog (`trickCatalog.ts`) + versioned toggle logic (`learnedToggle.ts`)
- `src/features/tasks/` — task sort helpers
- `src/features/dateRange/` — date range filter utilities

### Native / Capacitor

- App ID: `com.damir.iskilog`. Tracked native projects: Android (`./android/`) and iOS (`./ios/`).
- iOS builds via **Xcode Cloud** (`ios/App/ci_scripts/ci_post_clone.sh`); Xcode project at `ios/App/App.xcodeproj`.
- Google OAuth: Capacitor Browser opens OAuth → deep-link callback → `supabase.auth.exchangeCodeForSession()`. Handled in `App.tsx` via `CapacitorApp.addListener("appUrlOpen")`.
- **After any web change affecting native**: run `npx cap sync android` and `npx cap sync ios`.

### Sentry

`src/instrument.ts` initializes Sentry (imported first in `main.tsx`). Unhandled errors auto-capture via React 19 root error hooks; handled business-flow errors use `captureHandledException` and non-blocking warnings use `captureHandledWarning` (both in `src/lib/sentryHandled.ts`). Do not remove manual Sentry capture from user-facing catch blocks.

### Testing

**Unit tests:** Co-located with source, `.test.ts` suffix. Coverage: insights math, task sorting, trick toggle race-safety, trick catalog validation, set counting utilities.

**E2E tests** (`tests/e2e/specs/`): `auth.spec.ts` (sign-up/login/logout/session), `sets-crud.spec.ts` (CRUD for all event types), `tasks.spec.ts` (task flows), `reports.spec.ts` (CSV/PDF export), `structured-notes.spec.ts` (structured notes flows).

## Constraints

- Do not change season-to-calendar-year semantics.
- Do not bypass RPC for set CRUD — use `setsWriteApi`/`setsUpdateDeleteApi`.
- Do not remove `captureHandledException` calls from handled error flows.
- The app targets Android and iOS native (both tracked); after web changes run `npx cap sync` for the affected platform(s).
- Browser zoom is intentionally disabled via viewport meta in `index.html`.
- There is no separate backend service — no Express, no Edge Functions currently.
- Trust `tests/e2e/db/schema.sql` as the source of truth for the database schema.
- Bump `CACHE_VERSION` in `setsStore.tsx` whenever the localStorage cache shape changes.

## Obsidian Knowledge Vault
Knowledge vault: docs/obsidianVault
### At session start
Read `00-home/index.md` and `current priorities.md`.
If the task involves a module, read the corresponding note from `knowledge/`.
### Upon completion (user: "save session")
1. Create a note in `sessions/` with the date.
2. Update `current priorities.md`.
3. If it is a decision, create a note in `knowledge/decisions/`.
4. If it is a bug, create a note in `knowledge/debugging/`.
