---
title: "2026-09-03 — Groups: private groups (Part 4.5)"
date: 2026-09-03
tags:
  - session
  - groups
  - database
  - frontend
  - tdd
---

# 2026-09-03 — Groups: private groups (Part 4.5)

> [!info] Partly superseded the same day
> The "hidden from discovery" call below was reversed by the user hours later:
> private groups are now **discoverable** (shown with a lock, joined by code
> prompt). See [[a-private-group-is-hidden-not-sealed]] and migration
> `20260903175342_private_groups_discoverable`. Everything else here still stands.

Inserted work between Part 4 and Part 5: a creator can make a group **private**. It is then hidden from the directory and name search, and joined with a **6-digit code** any member can share from the board. Branch `feature/groups-workflow`, commits `2202aae` (spec+plan) and `7fac2d6` (build).

## The design call

Brainstormed with the user first. Two decisions that shaped everything:

- **The code is a discovery boundary, not access control** ([[a-private-group-is-hidden-not-sealed]]). `join_group_by_code` is **not rate-limited** — the user chose this knowingly. ~1M codes is enumerable by a script; "private" means unlisted, not sealed, and the policy copy (Part 5) will say exactly that. Flagged the brute-force risk clearly; it is a documented, deliberate acceptance, not an oversight.
- **Any member sees the code, and it never rotates** — mirrors D4 (no owner). A badly-leaked code is fixed by leave-and-recreate.

Design v3 of the spec: D26–D28, EC-34–EC-40. D2 is the one earlier decision this rewrites — directory visibility splits into public and private. Impact assessment concluded **not major**: additive at every layer, nothing already built gets reworked.

## Delivered

| File | What |
|---|---|
| `tests/e2e/db/schema.sql` | `groups.is_private` / `join_code` + partial unique index; `create_group` drop-recreate with `p_private` and a code-generation retry loop; new `join_group_by_code`; `join_group` private guard; `list_groups` / `search_groups` filter; `list_my_groups` drop-recreate returning the code |
| `tests/db/privateGroups.test.ts` | 17 tests — code shape, hidden from discovery, join by code, wrong code, `code_required`, consent, flag-off, uniqueness |
| `src/types/groups.ts` | `Group` / `CreatedGroup` gain `isPrivate` + `joinCode` |
| `src/data/groupsApi.ts` | `createGroup(…, isPrivate)`, `joinGroupByCode(code)` |
| `src/features/groups/joinCode.ts` | `normalizeJoinCode` / `isCompleteJoinCode` (pure, tested) |
| `src/features/groups/groupErrors.ts` | `invalid_code` / `code_required` tokens |
| `src/components/groups/` | `CreateGroupModal` toggle, `JoinByCodeModal`, `InviteCodeCard`, `GroupCard` "Private" badge |
| `src/pages/Groups.tsx` | join-by-code flow + consent handling; private create navigates to the board |
| `src/pages/GroupLeaderboard.tsx` | `InviteCodeCard` for a private group |

## Schema notes

- **`create_group` code generation** is an insert-retry loop (up to 20): a name collision is terminal (`groups.name_taken`), a `join_code` collision (private only, sub-microsecond window) regenerates. `groups_join_code_unique` is the backstop.
- **`group_public` composite type** gained two attributes, so it is `drop type ... cascade` + recreate — the cascade takes `create_group` with it, which is recreated immediately below.
- **`list_groups` / `search_groups` keep their return shape.** The directory has no reason to carry a code, and its rows are all public. The client's shared mapper defaults `isPrivate`/`joinCode` when absent. Only `list_my_groups` (membership-gated) returns the real code (D28).
- The `list_groups` block-filter `OR` chain had **no parentheses** — adding `and is_private = false` needed the chain wrapped, or `AND` would have bound to the last `OR` term.

## What broke and got fixed

- `createGroup.test.ts` "returns only public fields" asserted an exact key list — updated for `is_private` / `join_code`, kept the real assertion (no `created_by`, no auth uuid).
- `groupDirectory.test.ts`'s `group()` factory needed the two new required fields.
- The "distinct codes across many creates" DB test hit the 5-per-hour / 10-live creation limits — now leaves + clears `group_creation_log` between iterations.

## Verification

`npm run test:db` 151/151 (+17), re-runnable twice · `npm run test:run` 180/180 (+7) · `npm run build` clean · demo group re-seeded.

## Follow-ups

- [ ] Part 5 — moderation of names and groups. Private group names/descriptions are still member-visible UGC → still denylist-filtered on create, still reportable via `report_group`. Policy copy adds the "unlisted, not sealed" line for private groups
- [ ] Part 6 E2E gains a private-group scenario (create private, absent from other user's directory, joined by code, wrong code rejected)
- [ ] `list_groups` / `search_groups` / `list_my_groups` / `list_blocks` still `VOLATILE` — carry-over from Part 4 ([[a-gated-read-rpc-must-be-stable]])
- [ ] Correct spec §11 EC-33 was done in v3; still needs the same fix in the plan's prose if any repeats it

## Documentation impact

- New: [[a-private-group-is-hidden-not-sealed]]
- Updated: [[current_priorities]], [[index]], spec v3, plan
