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

- [x] **Groups — Part 4.5: private groups**. A creator can make a group private. Spec v3 (D26–D28), commits `2202aae` + `7fac2d6`. **Revised same day** (`20260903175342_private_groups_discoverable`): private groups are now *discoverable* — shown in browse and search with a lock icon, tapping opens a code prompt. The code stays member-shared (`list_groups`/`search_groups` return `is_private` but never `join_code`); `join_group_by_code` is still not rate-limited, by deliberate choice ([[2026-09-03-private-groups]], [[a-private-group-is-hidden-not-sealed]])
- [x] **Database moved to Supabase migrations**. `tests/e2e/db/schema.sql` had drifted from the hosted project; replaced with a baseline dumped from production plus `groups_foundation` as its own migration. Test harness runs `supabase db reset`. `test:db` 153/153, `test:run` 180/180 ([[the-database-is-managed-by-supabase-migrations]])
- [x] **`update_set_with_subtype` IDOR fixed and DEPLOYED** (`20260903164850`). The drift surfaced it: production's SECURITY DEFINER function lost the `if not found then raise` guard that `schema.sql` always carried (via `20260414134719`), so any authenticated caller could overwrite another user's `set_notes` / subtype rows for any set id they knew. Regression test `tests/db/setOwnership.test.ts` proven against the vulnerable body.
- [x] **Groups foundation pushed to production** (`20260903160619` + `20260903164850`, `supabase db push` 2026-09-03). All 8 tables live, sealed (RLS on, no grants), `groups_enabled = 'false'` — dormant. `profiles` gained the normalise trigger + `≤60` constraint (0 rows affected). Post-push `get_advisors`: clean.
  - Dashboard: enable Auth leaked-password protection.

> [!success] Production migration state (`supabase db push` 2026-09-03, verified)
> Remote is at **`20260903195701`** — all Groups migrations are now live and dormant. `db push` applied `175342` (private groups discoverable), `194544` (Part 5 denylist + 6-term seed), `195701` (Part 5 hardening) together. Post-push checks: `groups_enabled = 'false'`, 6 `moderation_terms`, 0 production profiles match the denylist, `anon` revoked on `create/update_set_with_subtype` (`authenticated` retained), `search_path` pinned on both, `list_*` STABLE, `create_group` uses the CSPRNG code helper.
>
> `get_advisors` (security) after the push — **no new actionable findings**:
> - `rls_enabled_no_policy` (INFO) on the Groups tables — the reviewed RPC-only design (D25), RLS is defence-in-depth with no grants.
> - `authenticated_security_definer_function_executable` (WARN) on every Groups RPC + the two set RPCs — a new lint (0029) that flags the deliberate SECURITY DEFINER RPC architecture; each function carries its own `auth.uid()` + authorization guard.
> - `function_search_path_mutable` (WARN) on `set_updated_at`, `fetch_sets_hydrated`, `set_active_season_atomic` — pre-existing, all **invoker** (lower risk). Part 5 pinned the two *definer* set functions; these three are a follow-up.
> - `auth_leaked_password_protection` (WARN) — pre-existing dashboard toggle (see below).

## In flight

- [ ] Branch `feature/groups-workflow` — **Parts 5 + 6 done**. Part 5 (`a200641`…`856e181`): denylist fix + 6-term seed, hardening migration, report/block/unblock wired, policy copy, runbook — migrations live on prod, dormant. Part 6 (2026-09-04): `tests/e2e/specs/groups.spec.ts` — 8 two-user flows on a `mobile` 360×800 project, all green; harness fixes (`--mode test`, `logoutUser`, tutorial seed); `docs/groups-release-checklist.md`. Remaining: `git push` the branch (not done — user's call), then **release stages 3–4** (merge, `npx cap sync` both platforms, native builds, store submissions with the UGC declarations, flip `groups_enabled` to `'true'`). ([[2026-09-03-groups-part5-moderation]], [[2026-09-04-groups-part6-e2e]])
- [ ] Branch `chore/cleanup-dedup-dead-code` — cleanup / dedup pass

## Part 5 — DONE (implementation), pending push + Part 6

> [!done] Scope, final (spec v5, 2026-09-03)
> Moderation of names and groups **plus** in-app report + mutual block + a
> blocked-members screen — the store-review requirement, not deferred. Denylist
> matcher fixed and seeded (both write surfaces); `report_group` (join modal),
> `report_profile` + `block_group_member` (leaderboard member sheet),
> `list_blocks` / `unblock` (Privacy & Security); policy copy in
> `public/policy.html`, `PrivacySecurity.tsx`, `GroupsConsentGate.tsx` naming the
> discipline breakdown and the private-group code line; About "Report abuse"
> contact; `docs/groups-moderation-runbook.md` (daily check, one-business-day
> target). Hardening migration: set-RPC `search_path` pins + anon revokes,
> CSPRNG `join_code`, `STABLE` on the list RPCs.

- [x] ~~`fetch_group_leaderboard` window dates~~ — shipped in Part 4 ([[2026-09-02-groups-leaderboard]])
- [x] ~~There is no `list_my_groups`~~ — added in Part 3 ([[browse-is-not-a-membership-list]])
- [x] ~~Private groups~~ — shipped as Part 4.5 ([[2026-09-03-private-groups]])

## Follow-ups queued

- [ ] `App.tsx` Welcome / policy gates read stale `previousMeta`; use `supabase.auth.getUser()` before each `updateUser` to stop the two writes clobbering each other
- [ ] Playwright E2E for the tutorial, fresh-account path past step 3
- [x] ~~Spec §11 EC-33 wrong~~ — already corrected in spec v3 (the follow-up note lagged); confirmed 2026-09-03 during Part 5 ([[the-kill-switch-stops-spread-not-escape]])
- [x] ~~`list_groups` / `search_groups` / `list_my_groups` VOLATILE~~ — marked `STABLE` in `20260903195701` (Part 5 hardening). `list_blocks` left VOLATILE (harmless, one query). ([[a-gated-read-rpc-must-be-stable]])
- [x] ~~Private-group `join_code` from `random()`~~ — swapped to `extensions.gen_random_bytes` via `public.groups_new_join_code()` in `20260903195701`. ([[a-private-group-is-hidden-not-sealed]])
- [ ] `set_updated_at`, `fetch_sets_hydrated`, `set_active_season_atomic` still have a role-mutable `search_path` (advisor WARN, 2026-09-03 post-push). All **invoker** so lower risk than the two definer set RPCs Part 5 pinned. Pin them in a small migration at Part 6 or the cleanup branch.
- [ ] **Dashboard: enable Auth leaked-password protection** (HaveIBeenPwned check) — advisor WARN, pre-existing, one toggle.
- [x] ~~`playwright.config.ts` serves from `.env.local`~~ — fixed in Part 6: `webServer` runs `--mode test` ([[e2e-serves-the-app-from-the-wrong-supabase]])
- [x] ~~E2E tutorial seed / serial flag-flip specs~~ — `skipWelcome` seeds `iskilog:tutorial:completed`; `groups.spec.ts` is `describe.configure({ mode: "serial" })`
- [x] ~~`auth.spec` "flow 2" `logoutUser` heading~~ — fixed in Part 6; auth.spec 3/3 green
- [ ] `npx cap sync` regenerates native config to add the Apple Sign In plugin to the **Android** build and reorder `Package.swift`. Pre-existing drift; settle it at the Groups release sync (checklist stage 3)
- [ ] **Non-Groups E2E specs are broken** (`sets-crud`, `structured-notes`, `reports`, `tasks` flow 19) — surfaced once the suite hit local Docker for the first time. `sets.ts` waits for a `heading "Add Set"` dropped in `a01e2c9`; History filters by a notes field the summary no longer shows. Cleanup-branch work.
- [ ] Groups row layout has coverage now (`mobile` project, 360×800) but the `mobile` project runs *only* `groups.spec.ts`; the other specs stay desktop-only
- [ ] `tests/e2e/scripts/_db.mjs:65` deletes zero-member groups without scoping to the test email domain — the only unscoped statement in cleanup
- [ ] Inline `'\s+'` in a query sent through the `pg` driver does not collapse whitespace, while the same text inside a deployed function does. Unresolved; avoid regexes in inline SQL in `tests/db`

## Watch list / known gaps

> [!warning] Groups schema is deployed and dormant; the feature is not live
> All Groups migrations are on the hosted project (through `20260903195701`) with `groups_enabled = 'false'`. Rollout stages remaining: **client shipped** (web + both native builds, still seeing `disabled`) → **flip the flag** (one row). Part 6 owns the two-user E2E and the native sync before that. Moderation is an ongoing commitment (`docs/groups-moderation-runbook.md`), not a build task.

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
