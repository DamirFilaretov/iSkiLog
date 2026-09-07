---
title: "2026-09-01 — Groups: directory, creating and joining (Part 3)"
date: 2026-09-01
tags:
  - session
  - groups
  - frontend
  - rollout
  - tdd
---

# 2026-09-01 — Groups: directory, creating and joining (Part 3)

Built Part 3 of six: the Groups tab, the directory, the create and join modals, and the consent gate. **First user-visible Groups work** — Parts 1 and 2 shipped nothing on screen. Branch `feature/groups-workflow`.

Follows [[2026-09-01-groups-client-data-layer]] (Part 2) and [[2026-09-01-groups-database-foundation]] (Part 1).

## Delivered

| File | What |
|---|---|
| `tests/e2e/db/schema.sql` | `list_my_groups()` — the one new RPC |
| `tests/db/myGroups.test.ts` | 9 tests: unfiltered, uncapped, and the escape hatch |
| `src/features/groups/groupDirectory.ts` | Merge, dedupe, sort, and the reconcile decision |
| `src/features/groups/groupsAccess.ts` | Four access levels, not one boolean |
| `src/features/groups/GroupsStatusProvider.tsx` | Session-scoped `groups_status()`, revalidated |
| `src/components/groups/` | Avatar, card, create modal, join modal, consent gate, route guard |
| `src/pages/Groups.tsx` | Directory: browse, search, skeleton, error, two empty states |
| `src/pages/GroupLeaderboard.tsx` | Placeholder that verifies membership |
| `src/components/nav/BottomTabBar.tsx` | 3 → 4 tabs, `w-24` → `flex-1 min-w-0` |

## Two decisions taken before writing code

Both were open blockers in [[current_priorities]]:

- **`list_my_groups` was added rather than deferred.** The directory was the only route to a group, and it hides what you are blocked from and caps at 200 — so a member blocked by their group's creator had no path to `leave_group` at all. See [[browse-is-not-a-membership-list]].
- **The tab is hidden while the flag is off**, so rollout stage 3 — client shipped ahead of the flag — is invisible rather than a dead tab.

## What review caught

Two review rounds. Every finding was verified against the code before implementing; none needed pushback.

**Round 1** — four fixes, all real:

- `Intl.Collator` for the name tie-break. Comparing UTF-16 code units sorts every accented name after `zulu`; Postgres orders under a locale collation.
- `groups_status()` revalidates on foreground and reconnect. Without it a resident native app never sees the kill switch flip — the whole point of EC-33.
- A failed search no longer fakes an empty result, which made a group past the 200-row cap read as "no such group".
- The board placeholder verifies membership. A non-member typing `/groups/:id` was being told "You are in this group".

**Round 2** — the P1 was mine, and it was the interesting one:

> The kill switch still traps existing members.

Correct, and the premise held exactly: `groups_enabled()` appears in only `create_group` and `join_group`. My blanket redirect closed off the board, Leave, Block and Report — all of which the database deliberately keeps open. The fix split one boolean into four access levels; see [[the-kill-switch-stops-spread-not-escape]]. Latent today (Part 3 has no Leave button) but it would have shipped as a trap the moment Part 4 added one.

The other three: a failed status refresh recorded its throttle timestamp *before* the request, so a recovery within 30s was discarded — the retry could suppress itself. A failed search could still render "No groups match that name". And the character counters counted raw input while validation counted normalised input, so 40 characters plus trailing spaces showed a red `45/40` with Create still enabled.

## Notable

- **Consent is checked twice on purpose.** The screen pre-empts it from `groups_status()` so nobody presses Create twice, and the `groups.consent_required` hint is still handled — because the database is where consent is actually enforced, and the two must never drift.
- **Member rows navigate straight to the board**; only non-member rows open the join modal. The spec's "Open" state survives for a row whose membership the screen learned late.
- **No Report link in the join modal.** §8 puts one there, but Part 5 owns report flows; shipping the control ahead of its copy and runbook would be backwards.
- Verified in a real browser with the flag flipped on locally, then flipped back. The throwaway spec was deleted — Part 6 owns the E2E suite — but what it taught is written down in [[e2e-serves-the-app-from-the-wrong-supabase]].

## Verification

`npm run test:run` 162/162 (21 files) · `npm run test:db` 130/130 (16 files) · `npm run build` clean · `npm run e2e:db:prepare` twice consecutively · 7 browser flows including the kill-switch-with-membership path.

## Follow-ups

- [ ] Part 4 — leaderboard, period toggle, member sheet, Leave, blocked-users screen. **First task:** `fetch_group_leaderboard` gains `window_start` / `window_end`, decided this session; the board header shows the range. A drop-and-recreate, since `create or replace` cannot change a `RETURNS TABLE` shape
- [ ] Correct §11 EC-33 in the spec — it claims every RPC refuses when the flag is off, which the shipped SQL deliberately contradicts. Must happen before Part 5 writes policy copy repeating it
- [ ] `playwright.config.ts` serves the app from `.env.local`, not `.env.test` — [[e2e-serves-the-app-from-the-wrong-supabase]]. Blocks Part 6
- [ ] **Before Part 5 seeds the denylist:** the profile trigger's `like` matching and the backfill ordering — see [[a-denylist-trigger-on-the-sign-in-path-locks-users-out]]
- [ ] `npx cap sync` regenerates native config to add `@capacitor-community/apple-sign-in` to the **Android** build and reorder `Package.swift`. Unrelated pre-existing drift, reverted rather than folded in; deal with it at Part 6's release sync

## Documentation impact

- New: [[browse-is-not-a-membership-list]], [[the-kill-switch-stops-spread-not-escape]], [[e2e-serves-the-app-from-the-wrong-supabase]]
- Updated: [[current_priorities]], [[index]]
