[4/10/2026 8:57 AM] Damir: # iSkiLog Project Handoff

## Purpose
iSkiLog is a training log and analysis app for tournament-style waterski practice. The current product is built for individual skiers to:

- log practice sets across four event families: slalom, tricks, jump, and other
- organize all logged sets into season-based history
- review trends and insights by event and date range
- manage short training tasks and practice focus items
- export training summaries for reporting or sharing
- use the app both as a web app and as a Capacitor-wrapped Android app

This is not a generic social fitness product. The core value is structured self-tracking for waterski training, with the data model and UI shaped around real ski-session logging rather than general note-taking.

## Current Source of Truth
Workspace:

C:\dev\iskilog

This document reflects the codebase state as of April 10, 2026.

If a future chat needs to verify anything, trust the code over this document and validate against:

- [package.json](/c:/dev/iskilog/package.json)
- [src/app/App.tsx](/c:/dev/iskilog/src/app/App.tsx)
- [src/auth/AuthProvider.tsx](/c:/dev/iskilog/src/auth/AuthProvider.tsx)
- [src/store/setsStore.tsx](/c:/dev/iskilog/src/store/setsStore.tsx)
- [tests/e2e/db/schema.sql](/c:/dev/iskilog/tests/e2e/db/schema.sql)

## Product Model
The app is centered around a single main domain object: a set.

A set always has shared base fields:

- event type
- date
- season id
- notes
- favourite flag

Each set also has event-specific subtype data:

- slalom: buoys, rope length, speed, passes count
- tricks: duration, trick type (hands or toes)
- jump: jump or cuts submode, attempts/passed/made/distance/cuts data
- other: freeform activity name and duration

The product treats a training year as a calendar-year season. That is a deliberate design choice, not an incidental implementation detail. The hydration layer actively normalizes season bounds to YYYY-01-01 through YYYY-12-31.

## What The App Does Today

### Authentication and onboarding
- Email/password auth is supported.
- Google OAuth is supported for web and native.
- Native OAuth uses Capacitor browser + deep-link callback handling.
- New and returning users are gated by:
  - welcome completion metadata
  - policy acceptance metadata for Google-auth users

### Core training workflows
- Log a new set.
- Edit an existing set.
- Delete a set.
- Mark a set as favourite.
- Browse history with filters by event, date range, and favourites.
- See event-specific insights and all-event season summaries.
- Maintain lightweight tasks from the home screen.
- Maintain tricks-library state using learned and in-progress toggles.
- Export report summaries as CSV or PDF.

### Platforms
- Primary runtime: browser SPA.
- Secondary runtime: Capacitor Android app.
- Sentry is wired for both browser and Capacitor-native crash/error capture.

## Technical Stack
- React 19
- TypeScript
- Vite
- React Router v7
- Supabase Auth + Postgres + RPC
- Capacitor Android
- Recharts
- jsPDF + jspdf-autotable
- Playwright + Vitest
- Sentry React + Sentry Capacitor + Sentry Vite plugin

Important dependency versions are in [package.json](/c:/dev/iskilog/package.json).

## High-Level Architecture

### Runtime composition
Startup flow:

1. [src/main.tsx](/c:/dev/iskilog/src/main.tsx) imports Sentry instrumentation first.
2. React root is created with Sentry React 19 error hooks.
3. [src/app/App.tsx](/c:/dev/iskilog/src/app/App.tsx) wraps the app in:
   - SetsProvider
   - AuthProvider
4. AuthProvider resolves auth state and hydrates all user-owned training data.
5. Routing and tab-shell rendering happen after hydration and onboarding gates pass.

### Data ownership model
The frontend is the main application layer. Supabase is the backend/data store. There is no separate custom Node/Express backend in this repo.

That means most business logic is split between:

- frontend UI + state orchestration in src/
- DB-side RPC and RLS behavior in Supabase schema/functions

When debugging a data problem, always think in two layers:
[4/10/2026 8:57 AM] Damir: 1. frontend shape and optimistic state behavior
2. Supabase RPC / table policy / SQL behavior

## Routing and App Shell
Primary routes live in [src/app/App.tsx](/c:/dev/iskilog/src/app/App.tsx).

Main user routes:

- / home
- /history
- /history/all
- /add
- /set/:id
- /insights
- /insights/tricks-library
- /settings
- /season-settings
- /profile
- /about
- /privacy-security

/personal-info redirects to /profile.

Bottom tabs are intentionally restricted to:

- home
- insights
- settings

History and add/edit flows are outside the tab shell.

## State Architecture

### Global store
The central client store is [src/store/setsStore.tsx](/c:/dev/iskilog/src/store/setsStore.tsx).

It manages:

- sets
- seasons
- activeSeasonId
- setsHydrated

Key architectural decisions:

- reducer-based state instead of Zustand/Redux
- ADD_SET and UPDATE_SET move the changed set to the top of the list
- SET_ALL preserves fetch order from backend hydration
- store persists per-user cache to localStorage

Per-user cache key:

iskilog:cache:user:<userId>

### Other caches
Other local caches in the app:

- preferences: iskilog:preferences
- tasks: iskilog:tasks:<userId>
- learned tricks: iskilog:learned-tricks:<userId>
- in-progress tricks: iskilog:in-progress-tricks:<userId>

These caches exist to improve perceived load speed and preserve state between refreshes, not to replace backend truth.

## Authentication and Hydration

### Auth provider responsibilities
[src/auth/AuthProvider.tsx](/c:/dev/iskilog/src/auth/AuthProvider.tsx) is one of the most important files in the app.

It is responsible for:

- reading initial Supabase session
- subscribing to auth state changes
- clearing app-local caches on sign-out / auth identity change
- setting Sentry user context
- hydrating seasons and sets
- normalizing seasons to calendar-year boundaries
- ensuring the current season exists
- activating the current season
- exposing retryable hydration state to the UI

Hydration states:

- idle
- loading
- success
- error

If hydration fails, the user gets a retry screen instead of a partially broken app shell.

### Onboarding metadata
The app uses Supabase user metadata for onboarding gates:

- welcome_completed
- welcome_completed_at
- policy_accepted
- policy_accepted_at

This is product-significant. If a future change modifies onboarding, it must remain compatible with these metadata checks unless a migration is introduced.

## Supabase Backend Design

### Frontend access pattern
The app does not use raw table reads/writes everywhere. It intentionally uses a mixed approach:

- RPCs for set hydration and transactional subtype operations
- direct table CRUD for tasks, seasons, tricks-library state, profile updates, and some deletes/flags

Key files:

- [src/data/setsApi.ts](/c:/dev/iskilog/src/data/setsApi.ts)
- [src/data/setsWriteApi.ts](/c:/dev/iskilog/src/data/setsWriteApi.ts)
- [src/data/setsUpdateDeleteApi.ts](/c:/dev/iskilog/src/data/setsUpdateDeleteApi.ts)
- [src/data/seasonsApi.ts](/c:/dev/iskilog/src/data/seasonsApi.ts)
- [src/data/tasksApi.ts](/c:/dev/iskilog/src/data/tasksApi.ts)
- [src/data/tricksLearnedApi.ts](/c:/dev/iskilog/src/data/tricksLearnedApi.ts)
- [src/data/setSubtypeRpcPayload.ts](/c:/dev/iskilog/src/data/setSubtypeRpcPayload.ts)

### Important RPCs
The current app relies on these Supabase functions:

- fetch_sets_hydrated
- create_set_with_subtype
- update_set_with_subtype
- set_active_season_atomic

These are not optional implementation details. If they change, the app’s create/edit/hydrate path changes with them.

### Schema shape
Reference test/local schema:

[tests/e2e/db/schema.sql](/c:/dev/iskilog/tests/e2e/db/schema.sql)

Important tables:

- profiles
- seasons
- sets
- slalom_sets
- tricks_sets
- jump_sets
- other_sets
- user_tasks
- user_learned_tricks
- user_in_progress_tricks

The app assumes RLS is enabled and user-owned rows are scoped correctly.

## Feature Areas

### Home
[src/pages/Home.tsx](/c:/dev/iskilog/src/pages/Home.tsx)

Purpose:
[4/10/2026 8:57 AM] Damir: - landing dashboard after successful hydration
- current season summary
- quick navigation into set logging
- task management

Key behavior:

- shows empty-season state when active season exists but has no sets
- tasks are loaded and managed from the home page, not from a dedicated task page

### Add / Edit Set
[src/pages/AddSet.tsx](/c:/dev/iskilog/src/pages/AddSet.tsx)

Purpose:

- single unified create/edit form for all set types

Key implementation decisions:

- one page handles both create and edit
- event-specific field groups are split into components
- unit conversions depend on stored user preferences
- create/update path is transactional via RPC
- handled save errors are reported to Sentry and also surfaced in UI

### Set Summary
[src/pages/SetSummary.tsx](/c:/dev/iskilog/src/pages/SetSummary.tsx)

Purpose:

- display a fully logged set
- allow deletion

Important:

- delete failures are manually captured to Sentry

### History
[src/pages/History.tsx](/c:/dev/iskilog/src/pages/History.tsx)  
[src/pages/HistoryAll.tsx](/c:/dev/iskilog/src/pages/HistoryAll.tsx)

Purpose:

- browse filtered sets
- toggle favourites

Current filtering model:

- event filter
- time range filter
- custom date range
- favourites-only toggle

History depends heavily on hydrated sets from AuthProvider. There is no separate page-local fetch for the main history dataset.

### Insights
[src/pages/Insights.tsx](/c:/dev/iskilog/src/pages/Insights.tsx)

Purpose:

- summarize a season or date-bounded subset of sets
- render event-specific analytics
- export summary data

Subsections:

- SlalomInsights
- TricksInsights
- JumpInsights
- OtherInsights

Important design choices:

- all-event and event-specific analytics are derived client-side from hydrated set data
- report export is generated client-side
- PDF export includes chart/table output
- native runtime uses Capacitor file write + share flow instead of browser download

### Tricks Library
[src/pages/TricksLibrary.tsx](/c:/dev/iskilog/src/pages/TricksLibrary.tsx)

Purpose:

- manage learned and in-progress tricks against a fixed catalog

Important implementation detail:

- optimistic toggles are race-safe using versioned reconciliation logic in learnedToggle.ts

### Settings and profile
Relevant pages:

- [src/pages/Settings.tsx](/c:/dev/iskilog/src/pages/Settings.tsx)
- [src/pages/ProfileSettings.tsx](/c:/dev/iskilog/src/pages/ProfileSettings.tsx)
- [src/pages/SeasonSettings.tsx](/c:/dev/iskilog/src/pages/SeasonSettings.tsx)
- [src/pages/About.tsx](/c:/dev/iskilog/src/pages/About.tsx)
- [src/pages/PrivacySecurity.tsx](/c:/dev/iskilog/src/pages/PrivacySecurity.tsx)

Current behavior:

- profile editing
- password change
- unit preferences
- logout
- reset welcome state
- season information
- static policy and account-deletion related flows

## Error Monitoring and Observability

### Sentry status
Sentry is fully initialized and active. The previous handoff version saying runtime initialization did not exist is obsolete.

Main files:

- [src/instrument.ts](/c:/dev/iskilog/src/instrument.ts)
- [src/main.tsx](/c:/dev/iskilog/src/main.tsx)
- [src/lib/sentryHandled.ts](/c:/dev/iskilog/src/lib/sentryHandled.ts)

Current coverage:

- browser/runtime initialization before app boot
- Capacitor native integration
- React Router v7 tracing
- session replay
- log capture API enabled
- React 19 root error handlers
- source map upload through Vite plugin
- manual handled-error capture in important product flows

### Handled vs unhandled policy
The current code distinguishes between:

- unhandled runtime errors: auto-captured by global Sentry hooks
- handled business-flow errors: manually captured through captureHandledException
- non-blocking warnings: logged through captureHandledWarning

This is a deliberate architecture decision. If a user-visible catch block only sets UI error state and does not capture to Sentry, observability regresses.

### Current handled error scope
Manual capture exists for important flows including:
[4/10/2026 8:57 AM] Damir: - set create/update
- set delete
- task load/create/update/toggle/delete
- history-related hydration/favourite failures
- tricks insights load failures
- export/report failures

## Native / Capacitor Architecture

### Capacitor setup
- app id: com.damir.iskilog
- app name: iSkiLog
- web dir: dist

Config file:

[capacitor.config.ts](/c:/dev/iskilog/capacitor.config.ts)

### Android
Tracked Android project exists in:

C:\dev\iskilog\android

Important implications:

- web changes that affect the native app require npx cap sync android
- Google OAuth native callback depends on deep-link handling
- Sentry Capacitor native integration is wired into Android sync output

### Native-specific helpers
Relevant files:

- [src/lib/nativeOAuth.ts](/c:/dev/iskilog/src/lib/nativeOAuth.ts)
- [src/lib/nativeFileExport.ts](/c:/dev/iskilog/src/lib/nativeFileExport.ts)

Current native responsibilities:

- OAuth browser/deep-link flow
- native file share for exports

## Environment Variables

### App runtime
Required or expected in local/dev/prod:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_SENTRY_DSN

Optional but used:

- VITE_APP_VERSION

### Sentry build-time variables
Used for release/source map upload:

- SENTRY_AUTH_TOKEN
- SENTRY_ORG
- SENTRY_PROJECT

### E2E
Expected in .env.test:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- E2E_SUPABASE_DB_URL
- E2E_TEST_EMAIL_DOMAIN
- E2E_BASE_URL

## Testing Strategy

### Unit tests
The project has lightweight unit coverage around calculation and domain helpers, not exhaustive component tests.

Main test areas today:

- insights math
- task sorting
- tricks learned-toggle behavior
- trick catalog search
- utility counting

### E2E tests
Playwright E2E exists and is wired to a local Supabase stack.

Important files:

- [tests/e2e/specs/auth.spec.ts](/c:/dev/iskilog/tests/e2e/specs/auth.spec.ts)
- [tests/e2e/specs/sets-crud.spec.ts](/c:/dev/iskilog/tests/e2e/specs/sets-crud.spec.ts)
- [tests/e2e/specs/reports.spec.ts](/c:/dev/iskilog/tests/e2e/specs/reports.spec.ts)
- [tests/e2e/specs/tasks.spec.ts](/c:/dev/iskilog/tests/e2e/specs/tasks.spec.ts)
- [docs/testing/e2e-runbook.md](/c:/dev/iskilog/docs/testing/e2e-runbook.md)

Interpretation:

- the app is not test-free
- but changes to UX-heavy areas should still be verified manually, especially on mobile/native paths

## Operational Decisions and Constraints

### Key architectural decisions already made
- calendar-year seasons are enforced
- one page handles set create and edit
- set hydration is centralized in auth lifecycle, not route-local fetching
- analytics are mostly computed client-side from hydrated data
- tasks and tricks-library rely on optimistic UI with backend rollback handling
- browser and native runtimes are both first-class
- Sentry is part of the expected production runtime, not optional tooling

### Constraints future agents should respect
- do not casually change season semantics
- do not bypass RPC shape for set CRUD without understanding subtype consistency
- do not remove manual Sentry capture from handled user-facing flows
- do not assume there is a separate custom backend
- do not trust stale docs over current schema/RPC/tests

## Known Gaps or Things To Verify Before Big Changes
- There is no separate backend service in this repo beyond Supabase-backed logic. If future work introduces Edge Functions, document them explicitly.
- Browser zoom has been disabled via viewport meta tag in [index.html](/c:/dev/iskilog/index.html). Any accessibility-related discussion should account for that deliberate choice.
- Report export is client-generated and can produce large bundles. Build warnings about large chunks are expected at the moment.
- The project currently targets Android native usage. There is no tracked iOS project in the repo.

## Recommended Next-Chat Baseline
When a new AI agent starts work, the minimum correct baseline is:
[4/10/2026 8:57 AM] Damir: 1. Confirm workspace path is C:\dev\iskilog.
2. Read this file.
3. Check git status.
4. Read [package.json](/c:/dev/iskilog/package.json).
5. Read [src/app/App.tsx](/c:/dev/iskilog/src/app/App.tsx), [src/auth/AuthProvider.tsx](/c:/dev/iskilog/src/auth/AuthProvider.tsx), and [src/store/setsStore.tsx](/c:/dev/iskilog/src/store/setsStore.tsx).
6. If the task touches data contracts, compare against [tests/e2e/db/schema.sql](/c:/dev/iskilog/tests/e2e/db/schema.sql).
7. Run npm run build.
8. Run npm run test:run if logic changed.
9. Run npx cap sync android for native-affecting web changes.

## Short Summary For A New Agent
iSkiLog is a React 19 + Supabase + Capacitor training log for waterski practice. The app’s core model is a season-bound set log with event-specific subtype data. Hydration is centralized in AuthProvider, state is reducer-based in SetsProvider, set CRUD is RPC-backed, analytics are mostly client-side, Android/native support matters, and Sentry is already fully integrated for both unhandled and handled production failures.