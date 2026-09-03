---
title: A private group is hidden, not sealed
date: 2026-09-03
tags:
  - decision
  - groups
  - security
status: active
---

# A private group is hidden, not sealed

A **private group** (D26) is removed from `list_groups` and `search_groups` and joined with a **6-digit numeric code** via `join_group_by_code`. That code is the *only* new way in.

The code is **not access control** (D27):

- `join_group_by_code` is **not rate-limited**. No attempt log, no per-user lock.
- ~1,000,000 codes is enumerable by a determined script.
- So "private" means **undiscoverable**, not **unreachable**.

This was the user's explicit choice, made with the brute-force risk on the table. It is a deliberate, documented acceptance — not a gap.

## Why it's defensible

- Rate-limiting the code would need another append-only attempt log and a lock — real infrastructure — for a feature whose whole point is convenience.
- A determined attacker with many accounts defeats a modest limit anyway.
- The threat model for a training-log club feature is low. The data a private group shares among members is the same as a public group's — profile name and discipline-broken-down set counts, no set contents.
- Part 5's policy copy is written to match: a private group is "not listed" and the code "keeps people from stumbling in, not from getting in if they have it." Nothing overclaims.

## Consequences

- **Names stay globally unique** across public and private — the `canonical_group_name` index is privacy-blind. A create that collides with a hidden private name returns `groups.name_taken`, which is a minor existence-by-name oracle. Accepted, consistent with the posture (EC-37).
- **Any member sees the code** on the board (D28), and it **never rotates**. No owner role (D4). A badly-leaked code is fixed by leave-and-recreate.
- `join_group` refuses a private group's id with `groups.code_required` — belt-and-suspenders, since no RPC hands a non-member a private group's id.
- `list_my_groups` is the only RPC that returns a real `join_code`, and only to a member. `list_groups` / `search_groups` never carry the column.
- If the posture ever needs to change: a longer alphanumeric code, or an attempt log with a per-user lock — both additive, neither shipped.

## Related

- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
- [[browse-is-not-a-membership-list]]
- [[the-kill-switch-stops-spread-not-escape]]
- [[2026-09-03-private-groups]]
