---
title: "2026-09-01 — Groups: client data layer (Part 2)"
date: 2026-09-01
tags:
  - session
  - groups
  - frontend
  - unicode
  - tdd
---

# 2026-09-01 — Groups: client data layer (Part 2)

Built Part 2 of six: the TypeScript types, the two API modules, the hint-token mapping and the pure helpers. Branch `feature/groups-workflow`. Still nothing user-visible — Part 3 is where the tab appears.

Follows [[2026-09-01-groups-database-foundation]], which delivered the whole server-side boundary.

## Delivered

| File | What |
|---|---|
| `src/types/groups.ts` | `Group`, `CreatedGroup`, `LeaderboardRow`, `GroupPeriod`, `GroupsStatus`, `BlockedUser` — opaque handles only |
| `src/features/groups/groupPeriod.ts` | Labels; computes no dates (D8) |
| `src/features/groups/groupName.ts` | Normalise, canonicalise, check |
| `src/features/groups/groupWhitespace.ts` | The server's whitespace class and the shared corpus |
| `src/features/groups/groupAvatar.ts` | Grapheme-safe initials, colour hashed from the canonical name |
| `src/features/groups/groupErrors.ts` | `toGroupError()` — branches on `error.hint`, never SQLSTATE |
| `src/data/groupsApi.ts` | 11 RPCs |
| `src/data/groupLeaderboardApi.ts` | Board fetch + `resolveTimezone()` |
| `tests/db/groupNameMirror.test.ts` | Proves the client mirror against the real database |

API modules stay thin and throw the raw `PostgrestError`, so the hint survives to the UI. Per the plan they get no mocked tests — Part 1 and Part 6 cover them. Every response shape was checked against Part 1's real API tests rather than against the spec.

## What review caught

An external review raised nine findings. Two were in Part 2 and both were real:

- **Whitespace divergence.** JS `\s` is not Postgres `\s`. I measured the actual set against the database instead of reasoning about it, and the divergence was wider than the review reported: U+001C–U+001F as well as U+0085. Fixed by mirroring the server exactly — see [[the-client-mirrors-the-servers-whitespace-rules-exactly]]. The review proposed replacing the set and was right to; my first instinct (a superset) would have fixed only one of the two failure directions.
- **Grapheme splitting.** `[...word][0]` gave `"🇺S"` for `"🇺🇸 Ski"` (half a flag) and uppercasing produced `"SSC"` for `"ßki Club"`. Fixed with `Intl.Segmenter` plus a code-point fallback, uppercasing *before* truncating.
- **Code-point counting.** `checkGroupName` counted UTF-16 units, so a valid 21-emoji name was blocked client-side. The client may be more permissive than the server, never stricter.

One finding was declined: the `unknown` bucket reports a server error with no hint as "Couldn't reach the server." That is imprecise, but spec §10's last row explicitly specifies the conflation, so changing it is a copy decision rather than a bug fix.

The critical finding was not in Part 2 at all — see [[a-denylist-trigger-on-the-sign-in-path-locks-users-out]]. Fixed in the client so no committed SQL moved.

## Notable

- The corpus is shared between a unit test and a database test. A mirror asserted only against itself is not a mirror.
- `AuthProvider.tsx` is a component and there is no DOM harness, so the denylist decision was extracted into a pure module to get coverage at all.
- Sentry's `area` union gained `"groups"`.

## Verification

`npm run test:run` 132/132 (19 files) · `npm run test:db` 121/121 (15 files) · `npm run build` clean.

## Follow-ups

- [ ] Part 3 — directory, create and join modals, consent gate, tab bar 3→4
- [ ] **Before Part 5 seeds the denylist:** the profile trigger's `like` matching (`schema.sql:1148`) and the backfill ordering (`schema.sql:1443`)
- [ ] No `list_my_groups`. Two consequences land in Part 3: a member blocked by a group's creator loses the only path to `leave_group`, and your own 1-member group falls off the 200-row browse cap
- [ ] `fetch_group_leaderboard` returns no window dates, but §8's mockup shows a date range in the header. Either the RPC returns the window or the header drops it — a Part 4 decision
- [ ] `tests/e2e/scripts/_db.mjs:65` deletes zero-member groups unscoped by test-email domain. Low blast radius (the reap trigger means they barely exist) but it is the only unscoped statement in cleanup
- [ ] Inline `'\s+'` in a query sent through the `pg` driver does not collapse whitespace, while the identical text inside a deployed function does. Unresolved; avoid writing regexes into inline SQL in `tests/db`

## Documentation impact

- New: [[the-client-mirrors-the-servers-whitespace-rules-exactly]], [[a-denylist-trigger-on-the-sign-in-path-locks-users-out]]
- Updated: [[current_priorities]]
