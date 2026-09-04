---
title: Browse is not a membership list
date: 2026-09-01
tags:
  - decision
  - groups
  - moderation
status: active
---

# Browse is not a membership list

`list_groups` and `search_groups` are a **directory**. `list_my_groups` is a **membership list**. They answer different questions and the client must not substitute one for the other.

The directory hides groups whose creator is blocked in either direction, and stops at 200 rows. `list_my_groups` applies neither rule: no block filter, no cap.

## Why

Both directory rules can hide a group the caller is standing inside.

- **The block filter.** Blocking is mutual (D17). If a group's creator blocks a member — or the member blocks the creator — that group vanishes from the member's browse *and* their search. It is the only row that names the group, and `leave_group` is only reachable from it, so the member is sealed in a group they cannot see or leave. The creator has no kick power (D4), so neither party can undo it.
- **The 200-row cap.** Browse ranks by member count, so a one-member group — yours, the moment you make it — falls off the bottom as soon as 200 larger groups exist. Search still reaches it, but only if you remember its name.

Blocking must hide a person's **other** groups from discovery. It must never hide the group you are in. That distinction is the whole reason the third RPC exists.

## Consequences

- `list_my_groups` is **uncapped on purpose**. A cap would recreate the same trap for anyone in more than 200 groups, and the response is the caller's own membership list, so its size is their own doing.
- It is **not flag-gated**, matching `leave_group` and `list_groups` — see [[the-kill-switch-stops-spread-not-escape]].
- The directory screen merges all three sources and dedupes them, so a membership never disappears because browse or search declined to return it. That merge is pure and tested in `src/features/groups/groupDirectory.ts`.
- The create-reconcile path on `groups.name_taken` queries **both** `listMyGroups()` and `searchGroups(name)`. Search alone hides a group whose creator has blocked you, which is precisely the case where reconciling matters most (EC-26).
- `is_member` is always `true` in its rows, kept only so one mapper serves all three RPCs.

## Related

- [[the-kill-switch-stops-spread-not-escape]]
- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
- [[2026-09-01-groups-directory-and-joining]]
