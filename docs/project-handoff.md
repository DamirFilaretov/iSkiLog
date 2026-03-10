# iSkiLog Project Handoff

## Scope of this handoff
This handoff describes the current codebase at:

`C:\dev\iskilog`

Do not assume both are in sync.

## Stack
- Frontend: React 19 + TypeScript + Vite (`src/`)
- Routing: `react-router-dom` (`src/app/App.tsx`)
- Charts: `recharts`
- Icons: `lucide-react`
- Backend/Auth/DB: Supabase (`src/lib/supabaseClient.ts`)
- Native mobile shell: Capacitor Android (`android/`, `capacitor.config.ts`)
- Export libs: `jspdf`, `jspdf-autotable`, plus Capacitor `filesystem` and `share` for native export
- Tests: Vitest (unit) + Playwright (E2E)

## Run and build
- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Unit tests: `npm run test:run`
- E2E tests: `npm run e2e`
- Android sync after web changes: `npx cap sync android`

## App architecture

### Root composition
- `src/main.tsx` mounts `App`.
- `src/app/App.tsx` wraps app with:
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
- `/about`
- `/privacy-security`

Tabbed layout for Home/Insights/Settings is handled by `TabLayout`.

## Authentication and hydration flow

### Auth UI
- Login/signup page: `src/pages/Auth.tsx`
- Supports:
  - email/password login
  - signup with metadata (`first_name`, `last_name`)
  - Google OAuth

### Google OAuth
- Native/web branching in `handleGoogle` (`src/pages/Auth.tsx`)
- Native helpers: `src/lib/nativeOAuth.ts`
  - builds deep link: `<appId>://auth`
  - detects native runtime
- Callback handling in `src/app/App.tsx` via `@capacitor/app` listener (`appUrlOpen`)
  - closes browser
  - exchanges code via `supabase.auth.exchangeCodeForSession(code)`

### Profile policy gate
- Google users are gated until policy accepted:
  - `GooglePolicyGate` in `src/app/App.tsx`
  - user metadata flag `policy_accepted` + `policy_accepted_at`
  - modal content from `src/components/auth/PolicyModal.tsx` and `src/content/policyDocument.ts`

### Hydration lifecycle
- `AuthProvider` manages hydration status state machine:
  - `idle | loading | success | error`
- On sign-in:
  - ensures profile name
  - fetches/normalizes seasons
  - enforces active season via Supabase RPC
  - fetches sets via hydrated RPC
- On sign-out:
  - clears in-memory store
  - clears all `iskilog:` localStorage caches (`src/lib/localCache.ts`)

## State management

### Sets store
- `src/store/setsStore.tsx` is reducer-based central store for:
  - sets
  - seasons
  - activeSeasonId
  - setsHydrated flag
- Includes local cache read/write keyed by user id.
- Reducer semantics:
  - add/update put most recent set first
  - full replace preserves server-provided order

## Data access layer
Data modules in `src/data/`:
- `setsApi.ts`
  - `fetchSets()` calls `rpc("fetch_sets_hydrated")`
- `setsWriteApi.ts`
  - `createSet()` calls `rpc("create_set_with_subtype")`
- `setsUpdateDeleteApi.ts`
  - `updateSetInDb()` calls `rpc("update_set_with_subtype")`
  - `deleteSetFromDb()` deletes from `sets` (subtype rows cascade)
- `seasonsApi.ts`
  - includes atomic active-season switch via `rpc("set_active_season_atomic")`
- `tasksApi.ts`
  - CRUD on `user_tasks` with auth ownership checks in query filters
  - includes localStorage task cache helpers
- `tricksLearnedApi.ts`
  - learned/in-progress trick persistence
  - local cache for fast UI load

## Supabase schema and RPC contracts
Authoritative local test schema:

`tests/e2e/db/schema.sql`

Key tables:
- `profiles`
- `seasons`
- `sets`
- `slalom_sets`
- `tricks_sets`
- `jump_sets`
- `other_sets` (includes `duration_minutes`)
- `user_learned_tricks`
- `user_in_progress_tricks`
- `user_tasks`

Key RPCs:
- `fetch_sets_hydrated`
- `create_set_with_subtype`
- `update_set_with_subtype`
- `set_active_season_atomic`

RLS is enabled with per-user policies across user-owned tables.

## Feature map

### Home
- `src/pages/Home.tsx`
- Blocks:
  - Season summary card
  - Quick add
  - Tasks

### Tasks
- `src/components/home/TasksBlock.tsx`
- `src/components/home/TaskModal.tsx`
- Behavior:
  - default seed tasks for first-time user
  - due-date calendar modal
  - optimistic done toggle with rollback
  - custom delete confirmation modal
  - open/done sorted using `src/features/tasks/taskSort.ts`

### Add/Edit set
- `src/pages/AddSet.tsx`
- Event-specific components:
  - Slalom fields
  - Tricks fields
  - Jump fields
  - Other fields
- Uses transactional RPC create/update path.
- Converts speed and distance using user preferences where needed.

### History
- `src/pages/History.tsx`
- Filters:
  - favorites toggle
  - timeline dropdown (day/week/month/season/custom/all)
  - event dropdown (all/slalom/tricks/jump/other)
  - custom date range fields

### Insights
- `src/pages/Insights.tsx`
- Event-specific insights components:
  - `SlalomInsights.tsx`
  - `TricksInsights.tsx`
  - `JumpInsights.tsx`
  - `OtherInsights.tsx`
- All-events overview includes export modal (CSV/PDF).

### Tricks library
- `src/pages/TricksLibrary.tsx`
- Catalog source:
  - `src/features/tricks/trickCatalog.ts`
- Supports:
  - learned + in-progress toggles
  - race-safe toggle handling (`src/features/tricks/learnedToggle.ts`)
  - hands/toes filter
  - sectioned trick groups
  - learned count for selected discipline

## Native/mobile specifics

### Android
- App id: `com.damir.iskilog` (`capacitor.config.ts`)
- Intent filter for OAuth deep link in:
  - `android/app/src/main/AndroidManifest.xml`
- Security flags currently include:
  - `android:usesCleartextTraffic="false"`
  - `android:allowBackup="true"`

### Native export
- `src/lib/nativeFileExport.ts`
- Flow:
  - convert Blob -> base64
  - write to Capacitor cache via Filesystem
  - open share sheet via Share plugin
- Used by Insights export on native runtime.

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

## Current known repository state
- This workspace currently has many uncommitted changes (`git status` is not clean).
- `android/` is currently untracked in this workspace status output.
- `src/lib/nativeFileExport.ts` is untracked in this workspace status output.
- If something "doesn't show in app", first confirm you are editing/building the same path and synced Android assets.

## High-confidence next-chat starting checklist
1. Confirm active workspace path.
2. Run `git status` and capture baseline.
3. Run `npm run build`.
4. If mobile issue: run `npx cap sync android` then rebuild/run in Android Studio.
5. For DB/RPC issues: verify Supabase schema/RPC parity against `tests/e2e/db/schema.sql`.
