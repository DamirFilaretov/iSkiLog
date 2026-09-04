---
title: "2026-09-04 — Groups Part 6: two-user E2E + release checklist"
date: 2026-09-04
tags:
  - session
  - groups
  - testing
  - e2e
  - playwright
---

# 2026-09-04 — Groups Part 6: two-user E2E + release checklist

The last build part. A two-user Playwright suite for Groups, the harness
changes it needed, a 360×800 project, and the staged-release checklist. Branch
`feature/groups-workflow`.

## Harness fixes (the documented Part 6 blockers)

- **`playwright.config.ts` served the app from the hosted project.** `webServer`
  ran `npm run dev` (Vite dev mode → `.env.local` → hosted). Now `npm run dev --
  --mode test …`, so Vite loads `.env.test` (local Docker) and ignores
  `.env.local`. `groups.spec.ts` cannot pass any other way — the Groups schema
  and `groups_enabled` differ between the two. See
  [[e2e-serves-the-app-from-the-wrong-supabase]] (now resolved).
- **`logoutUser()` waited for a `Settings` heading that does not exist** —
  `Settings.tsx` has no page title. Now waits for the "Log Out" button. This was
  the pre-existing `auth.spec` "flow 2" failure — **now passing**.
- **`skipWelcome()` now also seeds `iskilog:tutorial:completed`** so the 10-step
  tour never hijacks a flow that leaves Home.
- **`signUpThenLogin()` takes optional `firstName` / `lastName`** so two test
  users get distinct `profiles.full_name` and their leaderboard rows can be told
  apart.

## The mobile project

`playwright.config.ts` gains a second project, `mobile`, at **360×800** —
`testMatch: /groups\.spec\.ts/`. The `chromium` project `testIgnore`s the Groups
spec. The leaderboard's two-line row layout is built around 360px and had no
automated coverage; the desktop specs were written for 1280×900 and stay there.

## The suite — `tests/e2e/specs/groups.spec.ts`, 8 flows, serial

Two `browser.newContext()` people (Alex, Sam) created in `beforeAll`, plus
`setGroupsFlag(true)` (and `false` in `afterAll`). `test.describe.configure({
mode: "serial" })` — one global `groups_enabled` row. `beforeEach` clears
`group_creation_log` for both (the serial spec blows past the 5-per-hour limit).

1. Alex creates a group → Sam discovers it; a case/whitespace-dup name collides and reconciles to the join modal.
2. A first-time member hits the consent gate (with a Terms link), accepts, joins.
3. Sets seeded for Alex show on Sam's board after a reload (D15 — no cache); breakdown `SL 1 · TR 1`; the 30-day toggle refetches.
4. A non-member opening `/groups/:id` gets "This group isn't available".
5. Sam leaves (group persists); Alex leaves as last member (group reaped).
6. Private group: Sam sees it with a lock, one-tap join refused, wrong code rejected, right code joins.
7. Sam reports Alex's group from the join modal → `abuse_reports` row with the name/description snapshot.
8. Sam blocks Alex from the board → both drop off each other's boards → Sam unblocks in Privacy & Security → Alex returns.

**Set seeding** goes straight into `public.sets` via `pg` (`seedSets`) — the
board counts rows by `user_id`/`event_type`/`date` and joins no subtype table,
so this keeps the board test off the add-set form. Contexts are pinned
`timezoneId: "UTC"` so the client's board window and the DB's `current_date`
agree.

## Pre-existing E2E rot found (NOT fixed — out of scope)

Once `--mode test` pointed the suite at local Docker, the `sets-crud` /
`structured-notes` / `reports` / `tasks` (flow 19) specs surface as broken. They
were written against an older app: `sets.ts` waits for a `heading "Add Set"` that
`AddSetHeader` dropped months ago (`a01e2c9`), and History filters sets by a
notes field the summary no longer shows. `auth.spec` and most of `tasks` pass.
These are drift in the non-Groups specs, unrelated to this branch — left for the
cleanup pass. A one-line `sets.ts` fix recovers `sets-crud` flows 3–4; the rest
need real work.

## Release — `docs/groups-release-checklist.md`

Stages 1–2 (schema + moderation) are done. Remaining: merge, `npx cap sync`
both platforms, build web + native, store submissions with the UGC declarations
(runbook has the reviewer notes), then flip `groups_enabled` to `'true'`.

## Verification

`npx playwright test --project=mobile` — **8/8 Groups flows green**.
`npx playwright test --project=chromium` — `auth.spec` 3/3, `tasks` 5/6; the
`sets-crud` / `structured-notes` / `reports` specs fail on the pre-existing drift
above (they hit local Docker for the first time now).

## Follow-ups

- `tests/e2e/scripts/_db.mjs:65` still deletes zero-member groups unscoped.
- The mobile rope-length picker truncates to "S…" — the desktop `addSlalomSet`
  helper's rope selector wouldn't work at 360px (not exercised; the Groups spec
  seeds sets via SQL).

## Documentation impact

- New: this note, `docs/groups-release-checklist.md`
- Updated: [[current_priorities]], [[index]], the 6-part plan (Part 6),
  [[e2e-serves-the-app-from-the-wrong-supabase]] → resolved
