# iSkiLog Project Handoff

## Purpose
iSkiLog is a training log and analysis app for tournament-style waterski practice. The current product is built for individual skiers to:

- log practice sets across four event families: slalom, tricks, jump, and other
- organize logged sets into calendar-year seasons
- review trends and insights by event, season, and date range
- manage short training tasks and practice focus items
- maintain learned and in-progress trick-library state
- export training summaries for reporting or sharing
- use the app both as a browser SPA and as a Capacitor-wrapped Android app

This is not a generic social fitness product. The core value is structured self-tracking for waterski training, with the data model and UI shaped around real ski-session logging rather than general note-taking.

## Current Source Of Truth
Workspace:

`C:\dev\iSkiLog`

This document reflects the codebase state as of June 19, 2026.

If a future chat needs to verify anything, trust the code over this document and validate against:

- [package.json](C:/dev/iSkiLog/package.json)
- [src/app/App.tsx](C:/dev/iSkiLog/src/app/App.tsx)
- [src/auth/AuthProvider.tsx](C:/dev/iSkiLog/src/auth/AuthProvider.tsx)
- [src/store/setsStore.tsx](C:/dev/iSkiLog/src/store/setsStore.tsx)
- [src/types/sets.ts](C:/dev/iSkiLog/src/types/sets.ts)
- [tests/e2e/db/schema.sql](C:/dev/iSkiLog/tests/e2e/db/schema.sql)

## Product Model
The app is centered around a single main domain object: a set.

A set always has shared base fields:

- event type
- date
- optional time of day
- season id
- favourite flag
- structured notes

Structured notes are not a single freeform string in the current model. They are stored as six named sections:

- summary
- workedOn
- mistakes
- whatHelped
- nextSet
- other

Each set also has event-specific subtype data:

- slalom: buoys, rope length, speed, passes count
- tricks: duration, trick type (hands or toes)
- jump: jump or cuts submode, attempts, passed, made, distance, cuts type, cuts count
- other: freeform activity name and duration

The product treats a training year as a calendar-year season. That is a deliberate design choice, not an incidental implementation detail. The hydration layer normalizes season bounds to `YYYY-01-01` through `YYYY-12-31`.

## What The App Does Today

### Authentication And Onboarding
- Email/password auth is supported.
- Google OAuth is supported for web and native.
- Native OAuth uses Capacitor Browser plus deep-link callback handling.
- New and returning users are gated by welcome completion metadata.
- Google-auth users are additionally gated by policy acceptance metadata.
- Profile names are backfilled from auth metadata when the profile row has no `full_name`.

### Core Training Workflows
- Log a new set.
- Edit an existing set.
- Delete a set.
- Add date, optional time, and structured notes to a set.
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

Important dependency versions are in [package.json](C:/dev/iSkiLog/package.json).

## High-Level Architecture

### Runtime Composition
Startup flow:

1. [src/main.tsx](C:/dev/iSkiLog/src/main.tsx) imports Sentry instrumentation first.
2. React root is created with Sentry React 19 error hooks.
3. [src/app/App.tsx](C:/dev/iSkiLog/src/app/App.tsx) wraps the app in `SetsProvider` and `AuthProvider`.
4. `AuthProvider` resolves auth state and hydrates user-owned training data.
5. Routing and tab-shell rendering happen after hydration and onboarding gates pass.

### Data Ownership Model
The frontend is the main application layer. Supabase is the backend/data store. There is no separate custom Node/Express backend in this repo.

Most business logic is split between:

- frontend UI + state orchestration in `src/`
- DB-side RPC, RLS policy, and table behavior in the Supabase schema/functions

When debugging a data problem, always think in two layers:

1. frontend shape and optimistic state behavior
2. Supabase RPC, table policy, and SQL behavior

## Routing And App Shell
Primary routes live in [src/app/App.tsx](C:/dev/iSkiLog/src/app/App.tsx).

Main user routes:

- `/`
- `/history`
- `/history/all`
- `/add`
- `/set/:id`
- `/insights`
- `/insights/tricks-library`
- `/settings`
- `/season-settings`
- `/profile`
- `/about`
- `/privacy-security`

`/personal-info` redirects to `/profile`.

Bottom tabs are intentionally restricted to:

- home
- insights
- settings

History and add/edit flows are outside the tab shell.

## State Architecture

### Global Store
The central client store is [src/store/setsStore.tsx](C:/dev/iSkiLog/src/store/setsStore.tsx).

It manages:

- sets
- seasons
- activeSeasonId
- setsHydrated

Key architectural decisions:

- reducer-based state instead of Zustand/Redux
- `ADD_SET` and `UPDATE_SET` move the changed set to the top of the list
- `SET_ALL` preserves fetch order from backend hydration
- store writes a per-user localStorage cache after hydration has associated a cache user id

Per-user cache key:

`iskilog:cache:user:<userId>`

The store currently writes this cache but does not read it back during boot. Backend hydration through `fetchSets()` remains the source of truth.

### Other Local Caches
Other local caches in the app:

- preferences: `iskilog:preferences`
- tasks: `iskilog:tasks:<userId>`
- learned tricks: `iskilog:learned-tricks:<userId>`
- in-progress tricks: `iskilog:in-progress-tricks:<userId>`

These caches exist to improve perceived load speed and preserve state between refreshes, not to replace backend truth.

`clearAppLocalCaches()` removes only keys with the `iskilog:` prefix so sign-out and identity changes do not touch unrelated localStorage data.

## Authentication And Hydration

### Auth Provider Responsibilities
[src/auth/AuthProvider.tsx](C:/dev/iSkiLog/src/auth/AuthProvider.tsx) is one of the most important files in the app.

It is responsible for:

- reading the initial Supabase session
- subscribing to auth state changes
- clearing app-local caches on sign-out or auth identity change
- setting Sentry user context
- ensuring profile name data exists
- hydrating seasons and sets
- normalizing seasons to calendar-year boundaries
- ensuring the current-year season exists
- activating the current-year season through `set_active_season_atomic`
- avoiding duplicate hydration for the same user unless retry is requested
- exposing retryable hydration state to the UI

Hydration states:

- `idle`
- `loading`
- `success`
- `error`

If hydration fails, the user gets a retry screen instead of a partially broken app shell.

### Onboarding Metadata
The app uses Supabase user metadata for onboarding gates:

- `welcome_completed`
- `welcome_completed_at`
- `policy_accepted`
- `policy_accepted_at`

This is product-significant. If a future change modifies onboarding, it must remain compatible with these metadata checks unless a migration is introduced.

## Supabase Backend Design

### Frontend Access Pattern
The app intentionally uses a mixed access pattern:

- RPCs for set hydration and transactional set create/update with subtype rows and structured notes
- direct table CRUD for tasks, seasons, tricks-library state, profile updates, some deletes, and favourite toggles

Key files:

- [src/data/setsApi.ts](C:/dev/iSkiLog/src/data/setsApi.ts)
- [src/data/setsWriteApi.ts](C:/dev/iSkiLog/src/data/setsWriteApi.ts)
- [src/data/setsUpdateDeleteApi.ts](C:/dev/iSkiLog/src/data/setsUpdateDeleteApi.ts)
- [src/data/seasonsApi.ts](C:/dev/iSkiLog/src/data/seasonsApi.ts)
- [src/data/tasksApi.ts](C:/dev/iSkiLog/src/data/tasksApi.ts)
- [src/data/tricksLearnedApi.ts](C:/dev/iSkiLog/src/data/tricksLearnedApi.ts)
- [src/data/setSubtypeRpcPayload.ts](C:/dev/iSkiLog/src/data/setSubtypeRpcPayload.ts)

### Important RPCs
The current app relies on these Supabase functions:

- `fetch_sets_hydrated`
- `create_set_with_subtype`
- `update_set_with_subtype`
- `set_active_season_atomic`

These are not optional implementation details. If they change, the app's create/edit/hydrate paths change with them.

### Schema Shape
Reference test/local schema:

[tests/e2e/db/schema.sql](C:/dev/iSkiLog/tests/e2e/db/schema.sql)

Important tables:

- `profiles`
- `seasons`
- `sets`
- `set_notes`
- `slalom_sets`
- `tricks_sets`
- `jump_sets`
- `other_sets`
- `user_tasks`
- `user_learned_tricks`
- `user_in_progress_tricks`

Important shape details:

- `sets.time_of_day` is nullable.
- `sets` has no freeform notes column; structured notes live in `set_notes`.
- `fetch_sets_hydrated` joins `sets`, `set_notes`, and all subtype tables into one hydrated row shape.
- create/update RPCs accept `p_notes` JSON and upsert into `set_notes`.
- The app assumes RLS is enabled and user-owned rows are scoped correctly.

## Feature Areas

### Home
[src/pages/Home.tsx](C:/dev/iSkiLog/src/pages/Home.tsx)

Purpose:

- landing dashboard after successful hydration
- current season summary
- quick navigation into set logging
- task management

Key behavior:

- shows empty-season state when active season exists but has no sets
- tasks are loaded and managed from the home page, not from a dedicated task page

### Add / Edit Set
[src/pages/AddSet.tsx](C:/dev/iSkiLog/src/pages/AddSet.tsx)

Purpose:

- single unified create/edit form for all set types

Key implementation decisions:

- one page handles both create and edit
- event-specific field groups are split into components
- shared base fields include date, optional time, and six structured note sections
- older string notes are normalized into the `other` structured-note field when encountered in edit state
- unit conversions depend on stored user preferences
- create/update path is transactional via RPC
- handled save errors are reported to Sentry and also surfaced in UI

### Set Summary
[src/pages/SetSummary.tsx](C:/dev/iSkiLog/src/pages/SetSummary.tsx)

Purpose:

- display a fully logged set
- show structured notes sections with content
- allow deletion

Important:

- delete failures are manually captured to Sentry
- shared ski value formatting is imported from [src/lib/skiFormat.ts](C:/dev/iSkiLog/src/lib/skiFormat.ts)

### History
[src/pages/History.tsx](C:/dev/iSkiLog/src/pages/History.tsx)  
[src/pages/HistoryAll.tsx](C:/dev/iSkiLog/src/pages/HistoryAll.tsx)

Purpose:

- browse filtered sets
- toggle favourites
- open set summaries

Current filtering model:

- event filter
- time range filter
- custom date range
- favourites-only toggle

History depends heavily on hydrated sets from `AuthProvider`. There is no separate page-local fetch for the main history dataset.

### Insights
[src/pages/Insights.tsx](C:/dev/iSkiLog/src/pages/Insights.tsx)

Purpose:

- summarize a season or date-bounded subset of sets
- render event-specific analytics
- export summary data

Subsections:

- `SeasonOverviewCard`
- `QuickStatsGrid`
- `EventBreakdown`
- `WeeklyActivityChart`
- `MonthlyProgressList`
- `SlalomInsights`
- `TricksInsights`
- `JumpInsights`
- `OtherInsights`

Important design choices:

- all-event and event-specific analytics are derived client-side from hydrated set data
- insights support season, week, month, and custom range views depending on selected event/range
- report export is generated client-side
- PDF export includes chart/table output
- native runtime uses Capacitor file write + share flow instead of browser download

### Tricks Library
[src/pages/TricksLibrary.tsx](C:/dev/iSkiLog/src/pages/TricksLibrary.tsx)

Purpose:

- manage learned and in-progress tricks against a fixed catalog

Important implementation detail:

- optimistic toggles are race-safe using versioned reconciliation logic in [src/features/tricks/learnedToggle.ts](C:/dev/iSkiLog/src/features/tricks/learnedToggle.ts)

### Settings And Profile
Relevant pages:

- [src/pages/Settings.tsx](C:/dev/iSkiLog/src/pages/Settings.tsx)
- [src/pages/ProfileSettings.tsx](C:/dev/iSkiLog/src/pages/ProfileSettings.tsx)
- [src/pages/SeasonSettings.tsx](C:/dev/iSkiLog/src/pages/SeasonSettings.tsx)
- [src/pages/About.tsx](C:/dev/iSkiLog/src/pages/About.tsx)
- [src/pages/PrivacySecurity.tsx](C:/dev/iSkiLog/src/pages/PrivacySecurity.tsx)

Current behavior:

- profile editing
- password change
- unit preferences
- logout
- reset welcome state
- season information
- static policy and account-deletion related flows

## Shared Formatting And Utilities

### Ski Value Formatting
[src/lib/skiFormat.ts](C:/dev/iSkiLog/src/lib/skiFormat.ts) holds shared display formatting for:

- tournament rope length labels in meters/off notation
- speed display in mph/kph
- jump distance display in meters/feet

`HistoryItem`, `SetSummary`, and `SlalomInsights` use the shared rope constants. `SlalomInsights` still keeps its own number-oriented display helpers where precision/axis behavior differs.

### Date Ranges
[src/features/dateRange/dateRange.ts](C:/dev/iSkiLog/src/features/dateRange/dateRange.ts) owns reusable local-date range behavior used by history/insights flows.

## Error Monitoring And Observability

### Sentry Status
Sentry is fully initialized and active.

Main files:

- [src/instrument.ts](C:/dev/iSkiLog/src/instrument.ts)
- [src/main.tsx](C:/dev/iSkiLog/src/main.tsx)
- [src/lib/sentryHandled.ts](C:/dev/iSkiLog/src/lib/sentryHandled.ts)

Current coverage:

- browser/runtime initialization before app boot
- Capacitor native integration
- React Router v7 tracing
- session replay
- log capture API enabled
- React 19 root error handlers
- source map upload through Vite plugin when Sentry build-time variables are present
- manual handled-error capture in important product flows

### Handled Vs Unhandled Policy
The current code distinguishes between:

- unhandled runtime errors: auto-captured by global Sentry hooks
- handled business-flow errors: manually captured through `captureHandledException`
- non-blocking warnings: logged through `captureHandledWarning`

`captureHandledException` normalizes Supabase/PostgREST-style error objects into real `Error` instances and attaches PostgREST code/details/hint/message metadata when present.

This is a deliberate architecture decision. If a user-visible catch block only sets UI error state and does not capture to Sentry, observability regresses.

### Current Handled Error Scope
Manual capture exists for important flows including:

- auth hydration
- set create/update
- set delete
- favourite toggles
- task load/create/update/toggle/delete
- tricks insights load failures
- export/report failures

## Native / Capacitor Architecture

### Capacitor Setup
- app id: `com.damir.iskilog`
- app name: `iSkiLog`
- web dir: `dist`

Config file:

[capacitor.config.ts](C:/dev/iSkiLog/capacitor.config.ts)

### Android
Tracked Android project exists in:

`C:\dev\iSkiLog\android`

Important implications:

- web changes that affect the native app require `npx cap sync android`
- Google OAuth native callback depends on deep-link handling
- Sentry Capacitor native integration is wired into Android sync output

### Native-Specific Helpers
Relevant files:

- [src/lib/nativeOAuth.ts](C:/dev/iSkiLog/src/lib/nativeOAuth.ts)
- [src/lib/nativeFileExport.ts](C:/dev/iSkiLog/src/lib/nativeFileExport.ts)

Current native responsibilities:

- OAuth browser/deep-link flow
- native file share for exports

## Environment Variables

### App Runtime
Required or expected in local/dev/prod:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN`

Optional but used:

- `VITE_APP_VERSION`

### Sentry Build-Time Variables
Used for release/source map upload:

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

### E2E
Expected in `.env.test`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `E2E_SUPABASE_DB_URL`
- `E2E_TEST_EMAIL_DOMAIN`
- `E2E_BASE_URL`

## Testing Strategy

### Unit Tests
The project has focused unit coverage around calculation and domain helpers, not exhaustive component tests.

Current unit test files:

- [src/data/setsApi.test.ts](C:/dev/iSkiLog/src/data/setsApi.test.ts)
- [src/features/insights/slalomSpeedSteps.test.ts](C:/dev/iSkiLog/src/features/insights/slalomSpeedSteps.test.ts)
- [src/features/tasks/taskSort.test.ts](C:/dev/iSkiLog/src/features/tasks/taskSort.test.ts)
- [src/features/tricks/learnedToggle.test.ts](C:/dev/iSkiLog/src/features/tricks/learnedToggle.test.ts)
- [src/features/tricks/trickCatalog.test.ts](C:/dev/iSkiLog/src/features/tricks/trickCatalog.test.ts)
- [src/utils/countSets.test.ts](C:/dev/iSkiLog/src/utils/countSets.test.ts)

Main test areas today:

- hydrated set mapping
- insights/slalom speed-step helpers
- task sorting
- tricks learned-toggle behavior
- trick catalog search
- utility counting

### E2E Tests
Playwright E2E exists and is wired to a local Supabase stack.

Important files:

- [tests/e2e/specs/auth.spec.ts](C:/dev/iSkiLog/tests/e2e/specs/auth.spec.ts)
- [tests/e2e/specs/sets-crud.spec.ts](C:/dev/iSkiLog/tests/e2e/specs/sets-crud.spec.ts)
- [tests/e2e/specs/structured-notes.spec.ts](C:/dev/iSkiLog/tests/e2e/specs/structured-notes.spec.ts)
- [tests/e2e/specs/reports.spec.ts](C:/dev/iSkiLog/tests/e2e/specs/reports.spec.ts)
- [tests/e2e/specs/tasks.spec.ts](C:/dev/iSkiLog/tests/e2e/specs/tasks.spec.ts)
- [docs/testing/e2e-runbook.md](C:/dev/iSkiLog/docs/testing/e2e-runbook.md)

Interpretation:

- the app is not test-free
- structured notes have dedicated E2E coverage
- UX-heavy areas should still be verified manually, especially on mobile/native paths

## Operational Decisions And Constraints

### Key Architectural Decisions Already Made
- calendar-year seasons are enforced
- one page handles set create and edit
- set hydration is centralized in auth lifecycle, not route-local fetching
- set create/update goes through transactional RPCs because subtype rows and structured notes must stay consistent
- analytics are mostly computed client-side from hydrated data
- tasks and tricks-library rely on optimistic UI with backend rollback handling
- browser and native runtimes are both first-class
- Sentry is part of the expected production runtime, not optional tooling

### Constraints Future Agents Should Respect
- do not casually change season semantics
- do not bypass RPC shape for set CRUD without understanding subtype and `set_notes` consistency
- do not remove manual Sentry capture from handled user-facing flows
- do not assume there is a separate custom backend
- do not trust stale docs over current schema/RPC/tests

## Known Gaps Or Things To Verify Before Big Changes
- There is no separate backend service in this repo beyond Supabase-backed logic. If future work introduces Edge Functions, document them explicitly.
- Browser zoom has been disabled via viewport meta tag in [index.html](C:/dev/iSkiLog/index.html). Any accessibility-related discussion should account for that deliberate choice.
- Report export is client-generated and can produce large bundles. Build warnings about large chunks are expected at the moment.
- The project currently targets Android native usage. There is no tracked iOS project in the repo.
- Some local/IDE artifacts and personal media may exist in the working tree; check `git status` before making assumptions about project-owned files.

## Recommended Next-Chat Baseline
When a new AI agent starts work, the minimum correct baseline is:

1. Confirm workspace path is `C:\dev\iSkiLog`.
2. Read this file.
3. Check `git status`.
4. Read [package.json](C:/dev/iSkiLog/package.json).
5. Read [src/types/sets.ts](C:/dev/iSkiLog/src/types/sets.ts).
6. Read [src/app/App.tsx](C:/dev/iSkiLog/src/app/App.tsx), [src/auth/AuthProvider.tsx](C:/dev/iSkiLog/src/auth/AuthProvider.tsx), and [src/store/setsStore.tsx](C:/dev/iSkiLog/src/store/setsStore.tsx).
7. If the task touches data contracts, compare against [tests/e2e/db/schema.sql](C:/dev/iSkiLog/tests/e2e/db/schema.sql).
8. Run `npm run build` for code changes.
9. Run `npm run test:run` if logic changed.
10. Run relevant Playwright specs for user-flow or data-contract changes.
11. Run `npx cap sync android` for native-affecting web changes.

## Short Summary For A New Agent
iSkiLog is a React 19 + Supabase + Capacitor training log for waterski practice. The app's core model is a season-bound set log with event-specific subtype data, optional time of day, and six-field structured notes stored through `set_notes`. Hydration is centralized in `AuthProvider`, state is reducer-based in `SetsProvider`, set create/update is RPC-backed, analytics are mostly client-side, Android/native support matters, and Sentry is already integrated for both unhandled and handled production failures.
