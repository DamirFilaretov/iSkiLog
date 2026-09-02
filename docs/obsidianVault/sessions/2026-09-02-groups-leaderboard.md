---
title: "2026-09-02 — Groups: the leaderboard (Part 4)"
date: 2026-09-02
tags:
  - session
  - groups
  - frontend
  - database
  - tdd
---

# 2026-09-02 — Groups: the leaderboard (Part 4)

Built Part 4 of six: the leaderboard page, the 7/30-day toggle, the two-line discipline rows, and Leave. Branch `feature/groups-workflow`, commit `ed7b2b1`.

Follows [[2026-09-01-groups-directory-and-joining]] (Part 3).

## Scope cut, decided at the top of the session

**Blocking and reporting are dropped from the plan entirely** — not moved to Part 5, deferred with no date. The member sheet, Block/Report controls and the blocked-users screen are a future addition, not a launch requirement. The Part 1 SQL for them (`block_group_member`, `list_blocks`, `unblock`, and the symmetric block filter inside `fetch_group_leaderboard`) stays in place, dormant — nothing client-side calls it. See [[blocking-and-reporting-are-deferred]]. Part 5 is now moderation of names and groups only.

Consequence: Part 4 shrank to the board + toggle + Leave. The row is static (no member sheet to open), the header member count is trusted from `list_my_groups` alone, and there is no EC-12 tension in practice because no client can create a block.

## Delivered

| File | What |
|---|---|
| `tests/e2e/db/schema.sql` | `fetch_group_leaderboard` drop-and-recreated: `window_start` / `window_end` columns, and marked **STABLE** |
| `tests/db/leaderboard.test.ts` | +3: window matches period, window in the caller's timezone, function is STABLE |
| `src/types/groups.ts` | `GroupBoard` = `{ windowStart, windowEnd, rows }` |
| `src/data/groupLeaderboardApi.ts` | reads the window off row 0 |
| `src/features/groups/leaderboardWindow.ts` | `formatBoardWindow` — `25–31 Aug` / `28 Aug – 3 Sep` / across a year |
| `src/features/groups/leaderboardRows.ts` | `shapeLeaderboardRows` — rank, non-zero `SL·TR·JP·OT` breakdown tagged with its event, `hasSets` |
| `src/components/groups/` | `LeaderboardRow`, `BoardPeriodToggle`, `LeaveGroupDialog` |
| `src/pages/GroupLeaderboard.tsx` | placeholder → real board |
| `src/lib/eventVisuals.tsx` | `eventTextClass` — discipline accent as text colour, same hues as `eventBgClass` |

Row colours match the app: SL blue, TR purple, JP orange, OT emerald.

## The window decision (D8 held)

`fetch_group_leaderboard` now returns the resolved window, repeated on every row. Computing it in JS was rejected — the client's window could disagree with the server's, the drift D15 cited when it banned a period-keyed memo. The client only ever sends a period and a timezone; the server owns the dates and echoes them back for the header. A drop-and-recreate, because `create or replace` cannot change a `RETURNS TABLE` shape.

## Review — seven findings, all real, all fixed

An external review returned one P1 and six P2s. None were wrong; severity varied but every fix was cheap.

- **P1 — snapshot consistency.** `fetch_group_leaderboard` was the default `VOLATILE`, so its membership gate and its `RETURN QUERY` take separate snapshots; a `leave_group` landing between them lets a just-left caller read the remaining rows once. Fixed by marking the function `STABLE` — the correct classification for a read anyway. A live race test is not feasible (you cannot pause between two internal statements), so a catalogue test pins `provolatile = 's'`. See [[a-gated-read-rpc-must-be-stable]].
- **Period toggle labelled old rows with the new period.** Split into `period` (what the board shows) and `pendingPeriod` (what was tapped); the filled pill and the rows now move together on success.
- **Refetch errors were not mapped** — a concurrent removal returning `groups.not_a_member` now drops to the not-member state instead of a generic banner over a stale board.
- **Member-count fallback** derived from `board.rows.length`, which is viewer-specific once blocking exists (EC-12). Now omitted when `list_my_groups` fails.
- **Leave did not refresh access state** — `confirmLeave` now `await`s the `GroupsStatusProvider` refresh, so leaving your last group with the kill switch on hides the tab at once.
- **z-index** — all four Groups modals shared `z-50` with the bottom tab bar, which renders later and won the tie. Raised to `z-[60]`.

## Flag-state independence

The DB suite had six tests silently assuming `groups_enabled = 'false'` at rest. Extracted `withFeatureEnabled` / `withFeatureDisabled` into `tests/db/helpers/featureFlag.ts` — both now **capture the current value and restore it**, and the six tests wrap explicitly. `npm run test:db` passes with the flag on or off, so the local flag can be left on to use the app. Dev helpers: `npm run groups:on` / `groups:off`, and `tests/e2e/scripts/seed-demo-group.mjs` (40-member demo, deterministic, idempotent).

## Verification

`npm run test:db` 134/134 — twice, flag on and off · `npm run test:run` 173/173 · `npm run build` clean · `npm run e2e:db:prepare` re-runnable · seed script idempotent across runs · demo group looked at in a real browser with the flag on.

## Follow-ups

- [ ] Part 5 — moderation of names and groups: denylist seeded and enforced, `report_group` / `report_profile` wiring + copy, policy text in all three places, contact address, runbook. **Not** blocking.
- [ ] Correct spec §11 EC-33 — still claims every RPC refuses when the flag is off ([[the-kill-switch-stops-spread-not-escape]])
- [ ] Before Part 5 seeds the denylist: the profile trigger's `like` matching and the backfill ordering ([[a-denylist-trigger-on-the-sign-in-path-locks-users-out]])
- [ ] Other pure-read Groups RPCs (`list_groups`, `search_groups`, `list_my_groups`, `list_blocks`) are still `VOLATILE`. Harmless — each runs a single data query — but STABLE is the honest label. Tidy at Part 5 or 6
- [ ] `playwright.config.ts` serves from `.env.local`, not `.env.test` ([[e2e-serves-the-app-from-the-wrong-supabase]]) — blocks Part 6
- [ ] Part 6 owns the two-user E2E suite and the 360px mobile project

## Documentation impact

- New: [[blocking-and-reporting-are-deferred]], [[a-gated-read-rpc-must-be-stable]]
- Updated: [[current_priorities]], [[index]]
