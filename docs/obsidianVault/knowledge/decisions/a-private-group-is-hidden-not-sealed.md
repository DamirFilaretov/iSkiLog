---
title: A private group is visible but code-gated
date: 2026-09-03
tags:
  - decision
  - groups
  - security
status: active
---

# A private group is visible but code-gated

> [!info] Revised 2026-09-03 (same day)
> The original design (D26) **hid** private groups from `list_groups` /
> `search_groups` entirely. The user changed it: a private group is now
> **discoverable** — it shows in browse and search with a lock icon — but
> joining still needs the 6-digit code. Migration
> `20260903175342_private_groups_discoverable`.

A **private group** appears in the directory and search like any other, flagged
`is_private`. The client shows a lock on the card; tapping it opens a "enter the
code" prompt instead of a one-tap join. `join_group_by_code` is the only way in;
`join_group` still refuses a private group's id with `groups.code_required`.

The code is **member-shared and not access control** (D27):

- `list_groups` / `search_groups` return `is_private` but **never** `join_code`.
  Only `list_my_groups` returns a real code, and only to a member.
- A non-member can *see* a private group exists but needs a member to hand them
  the code.
- `join_group_by_code` is **not rate-limited**. ~1,000,000 codes is enumerable by
  a determined script.
- So "private" means **you need an invite**, not **unreachable**.

This is the user's explicit choice, made with the brute-force risk on the table.

## Why it's defensible

- Rate-limiting the code would need an append-only attempt log and a lock — real
  infrastructure — for a feature whose whole point is convenience.
- A determined attacker with many accounts defeats a modest limit anyway.
- The threat model for a training-log club feature is low. A private group shares
  the same data as a public one — profile name and discipline-broken-down set
  counts, never set contents.
- Part 5's policy copy is written to match: a private group is "invite-only" and
  the code "keeps people from wandering in, not from getting in if a member gives
  it to them." Nothing overclaims.

## Consequences

- **Names stay globally unique** across public and private — the
  `canonical_group_name` index is privacy-blind. A create colliding with a
  private name returns `groups.name_taken` (EC-37). Less of an oracle now that
  private groups are listed anyway.
- **Any member sees the code** on the board (D28); it **never rotates**. No owner
  role (D4). A leaked code is fixed by leave-and-recreate.
- Directory tap routing lives in `directoryCardTap` (`groupDirectory.ts`):
  member → board, non-member + private → code prompt, else → join modal.
- If the posture ever needs tightening: a longer alphanumeric code, or an attempt
  log with a per-user lock — both additive, neither shipped.

## Related

- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
- [[browse-is-not-a-membership-list]]
- [[the-kill-switch-stops-spread-not-escape]]
- [[2026-09-03-private-groups]]
