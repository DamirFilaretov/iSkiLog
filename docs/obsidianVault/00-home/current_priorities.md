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

## In flight

- [ ] Branch `feature/groups-workflow` — **Part 2 next**: client data layer (types, API modules, hint-token mapping, pure helpers). Parts 3–6 follow: directory and consent, leaderboard and blocking, moderation and policy, E2E and staged release
- [ ] Branch `chore/cleanup-dedup-dead-code` — cleanup / dedup pass

## Follow-ups queued

- [ ] `App.tsx` Welcome / policy gates read stale `previousMeta`; use `supabase.auth.getUser()` before each `updateUser` to stop the two writes clobbering each other
- [ ] Playwright E2E for the tutorial, fresh-account path past step 3
- [ ] `auth.spec.ts` "flow 2" fails on `main` too — `logoutUser` waits for a Settings heading `Settings.tsx` does not have. Blocks Groups Part 6
- [ ] No component-test harness (no jsdom / testing-library); Playwright runs only desktop 1280×900 while the Groups row layout is driven by a 360px constraint. Needed before Groups Part 6

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
