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

## In flight

- [ ] Branch `feature/groups-workflow` — **Part 3 next**: directory, create and join modals, consent gate, tab bar 3→4. Parts 4–6 follow: leaderboard and blocking, moderation and policy, E2E and staged release
- [ ] Branch `chore/cleanup-dedup-dead-code` — cleanup / dedup pass

## Blockers before Groups Part 5

> [!warning] Both must land before `moderation_terms` is seeded
> - `schema.sql:1148` — the profile trigger matches with `lower(NEW.full_name) like '%' || t.term || '%'`: it never lowercases `t.term`, and `%` or `_` inside a term act as wildcards. The group path was hardened into `contains_denylisted_term`; this one was left behind, so the two surfaces disagree on the same denylist.
> - `schema.sql:1443` — the `profiles` backfill runs *after* the trigger is created, so re-applying `schema.sql` against a populated denylist aborts mid-script, taking `profiles_full_name_length` with it. Re-runnability is a hard requirement.

## Blockers before Groups Part 3–4

- [ ] There is no `list_my_groups`. `list_groups` and `search_groups` both hide groups whose creator you have blocked in either direction, and both cap at 200 — so a member blocked by a creator loses the only path to `leave_group`, and your own 1-member group falls off the cap
- [ ] `fetch_group_leaderboard` returns no window dates, but the design's board header shows a date range. Either the RPC returns the window or the header drops it

## Follow-ups queued

- [ ] `App.tsx` Welcome / policy gates read stale `previousMeta`; use `supabase.auth.getUser()` before each `updateUser` to stop the two writes clobbering each other
- [ ] Playwright E2E for the tutorial, fresh-account path past step 3
- [ ] `auth.spec.ts` "flow 2" fails on `main` too — `logoutUser` waits for a Settings heading `Settings.tsx` does not have. Blocks Groups Part 6
- [ ] No component-test harness (no jsdom / testing-library); Playwright runs only desktop 1280×900 while the Groups row layout is driven by a 360px constraint. Needed before Groups Part 6
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

Back to [[index]].
