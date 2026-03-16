# iSkiLog Project Handoff

## Scope of this handoff
This handoff reflects the current app in:

`C:\dev\iskilog`

Snapshot refreshed: **March 10, 2026**.

## Stack
- Frontend: React 19 + TypeScript + Vite (`src/`)
- Routing: `react-router-dom` v7 (`src/app/App.tsx`)
- State: reducer-based store in `src/store/setsStore.tsx`
- Charts: `recharts`
- Icons: `lucide-react`
- Backend/Auth/DB: Supabase (`src/lib/supabaseClient.ts`)
- Native shell: Capacitor Android (`android/`, `capacitor.config.ts`)
- Export: `jspdf`, `jspdf-autotable`, Capacitor `filesystem` + `share`
- Error monitoring dependency: `@sentry/react` is installed
- Tests: Vitest (unit) + Playwright (E2E)

## Run and build
- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Unit tests: `npm run test:run`
- E2E tests: `npm run e2e`
- E2E DB prepare: `npm run e2e:db:prepare`
- E2E DB cleanup: `npm run e2e:db:cleanup`
- Android sync after web changes: `npx cap sync android`

## Environment variables

### App runtime
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- optional: `VITE_APP_VERSION` (used in About page)

### E2E (`.env.test`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `E2E_SUPABASE_DB_URL`
- `E2E_TEST_EMAIL_DOMAIN`
- `E2E_BASE_URL`

## App architecture

### Root composition
- `src/main.tsx` mounts `App` and imports `supabaseClient` for startup env validation.
- `src/app/App.tsx` wraps app in:
  - `SetsProvider` (`src/store/setsStore.tsx`)
  - `AuthProvider` (`src/auth/AuthProvider.tsx`)

### Routing
Main routes in `src/app/App.tsx`:
- `/` Home
- `/insights`
- `/insights/tricks-library`
- `/settings`
- `/history`
- `/history/all`
- `/add`
- `/set/:id`
- `/season-settings`
- `/profile`
- `/personal-info` -> redirects to `/profile`
- `/about`
- `/privacy-security`

`TabLayout` renders bottom tabs only for `/`, `/insights*`, `/settings*`.

## Authentication, onboarding, and hydration

### Auth UI
- Page: `src/pages/Auth.tsx`
- Supports:
  - email/password login
  - signup with metadata (`first_name`, `last_name`)
  - Google OAuth

### Native + web Google OAuth
- Native/web branch in `handleGoogle` (`src/pages/Auth.tsx`)
- Native helpers in `src/lib/nativeOAuth.ts`
- Native callback handled in `src/app/App.tsx` via Capacitor `appUrlOpen`
  - closes in-app browser
  - exchanges auth code via `supabase.auth.exchangeCodeForSession(code)`
  - token-hash fallback is also implemented

### Onboarding gates
- Welcome gate before app usage unless user metadata has completion:
  - `welcome_completed`, `welcome_completed_at`
- Google policy gate for Google-auth users:
  - `policy_accepted`, `policy_accepted_at`
  - links to static `/policy.html`

### Hydration lifecycle (`AuthProvider`)
- Hydration state: `idle | loading | success | error`
- On sign-in:
  - ensures profile name
  - fetches seasons
  - normalizes season dates to calendar-year bounds
  - ensures current year season exists
  - sets active season via RPC `set_active_season_atomic`
  - fetches hydrated sets via RPC `fetch_sets_hydrated`
- On sign-out:
  - clears store
  - clears app local caches via `clearAppLocalCaches()`

## State and caching

### Sets store
- `src/store/setsStore.tsx` centralizes:
  - `sets`
  - `seasons`
  - `activeSeasonId`
  - `setsHydrated`
- Per-user local cache key format: `iskilog:cache:user:<userId>`
- Reducer behavior:
  - `ADD_SET` and `UPDATE_SET` push item to top
  - `SET_ALL` preserves server ordering

### Other local caches
- Global app cache prefix: `iskilog:`
- Preferences cache: `iskilog:preferences`
- Tasks cache: `iskilog:tasks:<userId>`
- Learned tricks cache: `iskilog:learned-tricks:<userId>`
- In-progress tricks cache: `iskilog:in-progress-tricks:<userId>`

## Data access layer (`src/data`)
- `setsApi.ts`
  - `fetchSets()` -> `rpc("fetch_sets_hydrated")`
- `setsWriteApi.ts`
  - `createSet()` -> `rpc("create_set_with_subtype")`
- `setsUpdateDeleteApi.ts`
  - `updateSetInDb()` -> `rpc("update_set_with_subtype")`
  - `deleteSetFromDb()` -> delete from `sets` (cascade)
  - `updateSetFavoriteInDb()` -> update `sets.is_favorite`
- `seasonsApi.ts`
  - fetch/insert/update seasons
  - active-season switch via `rpc("set_active_season_atomic")`
- `tasksApi.ts`
  - CRUD on `user_tasks` with ownership filters
  - local task cache helpers
- `tricksLearnedApi.ts`
  - CRUD for learned and in-progress trick tables
  - local cache helpers
- `setSubtypeRpcPayload.ts`
  - maps app set model to RPC payloads for create/update

## Supabase schema and RPC contracts
Reference schema for local/E2E:

`tests/e2e/db/schema.sql`

Key tables:
- `profiles`
- `seasons`
- `sets`
- `slalom_sets`
- `tricks_sets`
- `jump_sets`
- `other_sets`
- `user_tasks`
- `user_learned_tricks`
- `user_in_progress_tricks`

Key RPCs:
- `fetch_sets_hydrated`
- `create_set_with_subtype`
- `update_set_with_subtype`
- `set_active_season_atomic`

RLS is enabled with per-user policies on all user-owned tables.

## Feature map

### Home
- `src/pages/Home.tsx`
- Sections:
  - `SeasonSummaryCard`
  - `QuickAdd`
  - `TasksBlock`
- Empty-season state shown when active season exists but has zero sets.

### Tasks
- Components:
  - `src/components/home/TasksBlock.tsx`
  - `src/components/home/TaskModal.tsx`
- Behavior:
  - first-time default seed tasks
  - due-date month calendar
  - optimistic done toggle with rollback
  - delete confirmation modal
  - sorted open/done via `src/features/tasks/taskSort.ts`

### Add / Edit set
- Page: `src/pages/AddSet.tsx`
- Event-specific form blocks:
  - Slalom
  - Tricks
  - Jump (jump/cuts modes)
  - Other
- Save/update uses transactional Supabase RPC path.
- Converts speed and jump distance using user preference units.

### History
- Pages:
  - `src/pages/History.tsx`
  - `src/pages/HistoryAll.tsx`
- Filters:
  - favourites toggle
  - timeline select (`day|week|month|season|custom|all`)
  - event select (`all|slalom|tricks|jump|other`)
  - custom date range
- Supports favourite toggling with optimistic update.

### Insights
- Page: `src/pages/Insights.tsx`
- Event-specific sections:
  - `SlalomInsights.tsx`
  - `TricksInsights.tsx`
  - `JumpInsights.tsx`
  - `OtherInsights.tsx`
- All-events view includes report export modal:
  - CSV export
  - PDF export (with chart/table)
  - Native runtime shares file via Capacitor Share

### Tricks library
- Page: `src/pages/TricksLibrary.tsx`
- Catalog: `src/features/tricks/trickCatalog.ts`
- Supports:
  - learned and in-progress toggles
  - race-safe optimistic toggles (`learnedToggle.ts`)
  - search + hands/toes filter
  - sectioned trick groups
  - learned count for selected discipline

### Settings and profile
- `Settings` page: logout, reset welcome flag, navigation cards
- `ProfileSettings` page:
  - edit display name
  - password change
  - unit preferences (rope/speed)
- `SeasonSettings` page is informational (calendar-year model)
- `PrivacySecurity` page includes static account deletion request flow
- `About` page shows app summary and version

## Native/mobile specifics

### Capacitor
- App id: `com.damir.iskilog` (`capacitor.config.ts`)
- App name: `iSkiLog`
- Web dir: `dist`

### Android
- Deep-link OAuth intent filter:
  - scheme: `com.damir.iskilog`
  - host: `auth`
- Security-related manifest values currently:
  - `android:usesCleartextTraffic="false"`
  - `android:allowBackup="false"`

### Native export
- `src/lib/nativeFileExport.ts`
- Flow:
  - Blob -> base64
  - write to Capacitor cache dir
  - share via `@capacitor/share`

## Testing

### Unit tests
- `src/features/insights/slalomSpeedSteps.test.ts`
- `src/features/tasks/taskSort.test.ts`
- `src/features/tricks/learnedToggle.test.ts`
- `src/features/tricks/trickCatalog.test.ts`
- `src/utils/countSets.test.ts`

### E2E tests
- `tests/e2e/specs/auth.spec.ts`
- `tests/e2e/specs/sets-crud.spec.ts`
- `tests/e2e/specs/reports.spec.ts`
- `tests/e2e/specs/tasks.spec.ts`
- Runbook: `docs/testing/e2e-runbook.md`
- E2E DB setup/cleanup scripts:
  - `tests/e2e/scripts/db-prepare.mjs`
  - `tests/e2e/scripts/db-cleanup.mjs`

## Current known repository state
- Working tree is not clean.
- Current local modifications include:
  - `package.json`
  - `package-lock.json`
- `android/` is present and tracked in this workspace.
- `src/lib/nativeFileExport.ts` is present in workspace and used by Insights export.

## Known caveats for next work
- `@sentry/react` is installed but no runtime initialization exists in `src/main.tsx` yet.
- `tests/e2e/utils/sets.ts` has helper assumptions that can drift from current History UI controls; verify E2E helper compatibility when editing History filters.
- `src/features/insights/insightsUtils.ts` exists but is currently empty.
- `src/pages/PersonalInfo.tsx` exists as placeholder UI and is not directly routed (route redirects to `/profile`).

## High-confidence next-chat checklist
1. Confirm active workspace path.
2. Capture `git status` baseline.
3. Run `npm run build`.
4. If touching tests, run `npm run test:run` and targeted `npm run e2e`.
5. If mobile issue: `npx cap sync android`, then rebuild/run from Android Studio.
6. For DB/RPC issues: compare logic against `tests/e2e/db/schema.sql`.
