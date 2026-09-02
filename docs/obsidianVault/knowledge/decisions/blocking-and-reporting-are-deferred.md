---
title: Blocking and reporting are deferred
date: 2026-09-02
tags:
  - decision
  - groups
  - moderation
  - scope
status: active
---

# Blocking and reporting are deferred

Decided at the start of Part 4 (2026-09-02). The user-facing **block** and **report** controls — the member sheet, the Report link on the join modal, and the blocked-users screen in Settings — are cut from the plan. Not moved to Part 5. Deferred with no date, as a future addition.

## What stays

The **database side shipped in Part 1 and stays exactly as it is**, dormant:

- `block_group_member`, `list_blocks`, `unblock`, `report_group`, `report_profile`
- the symmetric block filter inside `fetch_group_leaderboard`
- `abuse_reports`, `user_blocks` tables, their revokes and RLS
- every database test covering them

Nothing client-side calls the block/report RPCs. Removing tested security-boundary SQL to match a UI scope cut would be pure churn and risk, so it was left in place.

## What changed in the plan

- **Part 4** shrank to: the board, the 7/30-day toggle, the two-line rows, Leave.
- **Part 5** is now moderation *of names and groups only*: the denylist seeded and enforced on both surfaces, `report_group` / `report_profile` wiring and copy, the policy text, the contact address, the runbook.
- The leaderboard **row is static** — with no member sheet there is nothing for it to open.
- The board header's member count is trusted from `list_my_groups` alone. [[browse-is-not-a-membership-list|EC-12]] — the directory count including blocked members — is latent, not live: no client can create a block, so `member_count` and the visible row count never diverge in this build.

## Why it's safe to ship Groups without blocking

Apple 1.2 and Google Play's UGC policy require filtering, reporting *and* blocking for user-to-user content. Groups is not going to the stores until Part 6, and Part 5's report + denylist work lands first. If the stores require blocking before approval, it comes back off this shelf — the database is already built and tested.

## Related

- [[browse-is-not-a-membership-list]]
- [[the-kill-switch-stops-spread-not-escape]]
- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
- [[2026-09-02-groups-leaderboard]]
