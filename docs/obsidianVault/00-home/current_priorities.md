---
title: Current Priorities
date: 2026-06-19
tags:
  - home
  - planning
status: active
---

# Current Priorities

> [!note] How to use this note
> This is the "what's hot right now" board. Update it at the start/end of work sessions. Move finished items to a [[2026-06-19-built-the-knowledge-vault|session log]]; move fuzzy ideas to [[unprocessed-items]].

## Recently shipped (from git history)

- [x] Apple Sign In — native iOS via `signInWithIdToken` + nonce; policy gate extended to cover Apple users; Debug entitlements fix ([[apple-sign-in-uses-native-sdk-and-signInWithIdToken]])
- [x] Dedup ski formatters, drop dead code, tidy gitignore — see [[recharts-and-jspdf-power-charts-and-exports|shared formatting]] / `src/lib/skiFormat.ts`
- [x] Insights timeline overview card synced to selected time range — see [[analytics-are-computed-client-side]]
- [x] Structured notes shipped — six-section notes via `set_notes` ([[notes-are-stored-as-six-structured-sections]])

## Recently shipped (this session)

- [x] Onboarding tutorial merged in PRs #39 and #40 — 10-step cross-route tour, durable completion metadata, and mobile Safari route synchronization ([[tutorial-uses-react-joyride-with-controlled-step-index]], [[2026-08-14-tutorial-release-and-reliability]])
- [x] Set create/update reliability — 8-second per-attempt timeout and one automatic retry for transport failures ([[set-writes-time-out-and-retry-transport-failures]])
- [x] iOS release version advanced to `1.0.1` build `25` ([[deployment-targets-web-spa-and-native]])
- [x] Brand refresh — new app logo across iOS AppIcon, Splash + Loading imagesets, simplified `LaunchScreen.storyboard`, and browser favicon (`public/newlogobrowser.png`)
- [x] Native Privacy Policy link opens an in-app `PolicyModal` (gated by `isNativeRuntime()`) instead of a browser tab that fails inside the Capacitor webview

## Recently shipped (2026-08-30)

- [x] Fixed tutorial restart loop at step 3 on fresh accounts (browser + native) — auto-start `useEffect` had `navigate` in its deps and `<BrowserRouter>`'s `useNavigate` is unstable, so it re-fired `navigate('/')` on every route change; deps now `[]` ([[tutorial-restart-loop-from-navigate-in-effect-deps]], [[2026-08-30-tutorial-restart-loop-fix]])
- [x] Fixed oversized grey band at the top of every native screen — safe-area inset was being *added* to a fixed `2.5rem` gap; replaced with a `pt-safe` utility using `max()` ([[native-safe-area-inset-stacked-on-fixed-top-gap]])

## Recently shipped (2026-09-01)

- [x] **Groups — Part 1 of 6 complete**: the entire server-side security boundary. Eight tables, 21 functions, two triggers, all privileges revoked, 119 database tests. Ships behind `groups_enabled = false` ([[2026-09-01-groups-database-foundation]], [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]])
- [x] **Groups — Part 2 of 6 complete**: client data layer. Types, two API modules, hint-token mapping, pure helpers, and a Unicode corpus shared between unit and database tests ([[2026-09-01-groups-client-data-layer]], [[the-client-mirrors-the-servers-whitespace-rules-exactly]])
- [x] Sign-in survives a denylisted OAuth display name instead of stranding the user on the hydration retry screen ([[a-denylist-trigger-on-the-sign-in-path-locks-users-out]])
- [x] **Groups — Part 3 of 6 complete**: the first user-visible Groups work. Fourth tab, directory with browse and server search, create and join modals, consent gate, and `list_my_groups`. Still behind `groups_enabled = false` ([[2026-09-01-groups-directory-and-joining]], [[browse-is-not-a-membership-list]], [[the-kill-switch-stops-spread-not-escape]])

## Recently shipped (2026-09-02)

- [x] **Groups — Part 4 of 6 complete**: the leaderboard. Board page, 7/30-day toggle, two-line discipline rows (SL blue · TR purple · JP orange · OT emerald), Leave. `fetch_group_leaderboard` returns `window_start` / `window_end` and is now `STABLE`. Commit `ed7b2b1` ([[2026-09-02-groups-leaderboard]])
- [x] **Blocking and reporting cut from the plan** — deferred with no date, not moved to Part 5. Part 1 SQL stays dormant ([[blocking-and-reporting-are-deferred]])
- [x] Review P1 fixed: a gated read RPC takes a snapshot per internal statement unless marked `STABLE` ([[a-gated-read-rpc-must-be-stable]])
- [x] DB suite is flag-state independent — `tests/db/helpers/featureFlag.ts` captures and restores `groups_enabled`; `npm run test:db` passes with the flag on or off. Dev helpers `npm run groups:on` / `groups:off`, and `seed-demo-group.mjs`

## Recently shipped (2026-09-03)

- [x] **Groups — Part 4.5: private groups**. A creator can make a group private — hidden from the directory and search, joined with a 6-digit code any member shares from the board. Spec v3 (D26–D28), commits `2202aae` + `7fac2d6`. The code is a discovery boundary, not access control — `join_group_by_code` is not rate-limited, by deliberate choice ([[2026-09-03-private-groups]], [[a-private-group-is-hidden-not-sealed]])
- [x] **Database moved to Supabase migrations**. `tests/e2e/db/schema.sql` had drifted from the hosted project; replaced with a baseline dumped from production plus `groups_foundation` as its own migration. Test harness runs `supabase db reset`. `test:db` 153/153, `test:run` 180/180 ([[the-database-is-managed-by-supabase-migrations]])
- [x] **`update_set_with_subtype` IDOR fixed and DEPLOYED** (`20260903164850`). The drift surfaced it: production's SECURITY DEFINER function lost the `if not found then raise` guard that `schema.sql` always carried (via `20260414134719`), so any authenticated caller could overwrite another user's `set_notes` / subtype rows for any set id they knew. Regression test `tests/db/setOwnership.test.ts` proven against the vulnerable body.
- [x] **Groups schema pushed to production** (`20260903160619` + `20260903164850`, `supabase db push` 2026-09-03). All 8 tables live, sealed (RLS on, no grants), `groups_enabled = 'false'` — dormant. `profiles` gained the normalise trigger + `≤60` constraint (0 rows affected). Migration history synced. Post-push `get_advisors`: no new findings — all pre-existing or the reviewed RPC-only design.
  - Part 5 hardening migration should also: `set search_path = ''` on the 5 set/season SECURITY DEFINER functions (qualify the `::event_type` cast); `revoke execute ... from anon` on `create/update_set_with_subtype`.
  - Dashboard: enable Auth leaked-password protection.

## In flight

- [ ] Branch `feature/groups-workflow` — **Part 5 next**: moderation of names and groups only (no blocking). Denylist seeded and enforced, `report_group` / `report_profile` wiring + copy, policy text in three places (add the "private = unlisted, not sealed" line), contact address, runbook. Part 6 follows: two-user E2E and staged release
- [ ] Branch `chore/cleanup-dedup-dead-code` — cleanup / dedup pass

## Blockers before Groups Part 5

> [!warning] Both live in `supabase/migrations/20260903160619_groups_foundation.sql` (grep the symbols) and must be fixed in the Part 5 moderation migration before `moderation_terms` is seeded
> - `normalise_profile_name` (the `profiles` trigger) matches with `lower(NEW.full_name) like '%' || t.term || '%'`: it never lowercases `t.term`, and `%` or `_` inside a term act as wildcards. The group path was hardened into `contains_denylisted_term`; this one was left behind, so the two surfaces disagree on the same denylist. Fix: call `contains_denylisted_term` here too.
> - The `profiles` full-name backfill `update` runs *after* the trigger is created, so re-applying the foundation migration against a populated denylist aborts mid-migration, taking `profiles_full_name_length` with it. `applyFeatureMigrations()` in `test:db` re-runs it — the Part 5 migration must make the backfill trigger-safe (disable the trigger around it, or seed terms after).

## Part 5 starts here

> [!todo] Scope, revised 2026-09-02
> Moderation of **names and groups only** — blocking is out ([[blocking-and-reporting-are-deferred]]). Seed `moderation_terms` and enforce it on both write surfaces; wire `report_group` (join modal) and `report_profile` (a member-level Report on the board) with their copy; publish the policy text in `public/policy.html`, `PrivacySecurity.tsx` and the consent gate, naming the discipline breakdown explicitly; add the contact address to About; write the runbook (daily dashboard check, 24-hour target).
>
> **First, unblock the denylist** — the two `groups_foundation.sql` issues below must land before `moderation_terms` is seeded.

- [x] ~~`fetch_group_leaderboard` window dates~~ — shipped in Part 4 ([[2026-09-02-groups-leaderboard]])
- [x] ~~There is no `list_my_groups`~~ — added in Part 3 ([[browse-is-not-a-membership-list]])
- [x] ~~Private groups~~ — shipped as Part 4.5 ([[2026-09-03-private-groups]])

## Follow-ups queued

- [ ] `App.tsx` Welcome / policy gates read stale `previousMeta`; use `supabase.auth.getUser()` before each `updateUser` to stop the two writes clobbering each other
- [ ] Playwright E2E for the tutorial, fresh-account path past step 3
- [ ] **Spec §11 EC-33 is wrong**: it says flipping `groups_enabled` makes every RPC refuse, but the shipped SQL deliberately exempts `leave_group`, the board and the moderation RPCs. Correct it before Part 5 writes policy copy repeating it ([[the-kill-switch-stops-spread-not-escape]])
- [ ] `list_groups`, `search_groups`, `list_my_groups`, `list_blocks` are still `VOLATILE`. Harmless (each runs one data query after an unchanging `auth.uid()` check) but `STABLE` is the honest label — tidy at Part 5 or 6 ([[a-gated-read-rpc-must-be-stable]])
- [ ] Private-group `join_code` is generated with `random()`, not a CSPRNG (`groups_foundation.sql`, `create_group`). It is a discovery boundary not access control ([[a-private-group-is-hidden-not-sealed]]) and rate-limiting was declined by choice, but swap to `extensions.gen_random_bytes` in the Part 5 hardening migration — cheap, and settles it alongside the denylist fixes. Flagged by automated security review 2026-09-03.
- [ ] `playwright.config.ts` serves the app from `.env.local` (hosted project), not `.env.test` (local Docker) — the DB helpers and the browser point at different databases. Blocks Part 6 ([[e2e-serves-the-app-from-the-wrong-supabase]])
- [ ] E2E specs need `iskilog:tutorial:completed` seeded, and any flag-flipping spec needs `describe.configure({ mode: "serial" })` — Playwright runs 2 workers locally
- [ ] `npx cap sync` regenerates native config to add the Apple Sign In plugin to the **Android** build and reorder `Package.swift`. Pre-existing drift, unrelated to Groups; settle it at Part 6's release sync
- [ ] `auth.spec.ts` "flow 2" fails on `main` too — `logoutUser` waits for a Settings heading `Settings.tsx` does not have. Blocks Groups Part 6
- [ ] No component-test harness (no jsdom / testing-library); Playwright runs only desktop 1280×900 while the Groups row layout is driven by a 360px constraint. Needed before Groups Part 6. Parts 3–4 worked around it by keeping logic in pure modules (`groupDirectory.ts`, `groupsAccess.ts`, `leaderboardWindow.ts`, `leaderboardRows.ts`)
- [ ] `tests/e2e/scripts/_db.mjs:65` deletes zero-member groups without scoping to the test email domain — the only unscoped statement in cleanup
- [ ] Inline `'\s+'` in a query sent through the `pg` driver does not collapse whitespace, while the same text inside a deployed function does. Unresolved; avoid regexes in inline SQL in `tests/db`

## Watch list / known gaps

> [!warning] Groups is not deployed
> Everything from Part 1 exists on the **local Docker Supabase only**. The hosted project is untouched until the staged release in Parts 5–6: schema with the flag off → policy and moderation live → client shipped → flip one row. Moderation is an ongoing commitment, not a build task.

> [!warning] Carry-over risks from the handoff
> - Report export is client-generated and can produce **large bundles**; large-chunk build warnings are expected. See [[recharts-and-jspdf-power-charts-and-exports]].
> - Browser zoom is intentionally disabled via the viewport meta tag — factor into any accessibility work.
> - iOS project is tracked (`ios/App/`); both Android and iOS are native targets ([[capacitor-wraps-the-app-for-android]]).
> - The per-user sets cache is **written but not read back** at boot — don't assume it speeds up cold start ([[per-user-localstorage-caches-carry-a-version]]).

## Guardrails that constrain every change

- [[seasons-are-calendar-year-only]]
- [[set-crud-must-go-through-rpcs]]
- [[handled-errors-must-be-captured-to-sentry]]
- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
- [[the-kill-switch-stops-spread-not-escape]]

Back to [[index]].
