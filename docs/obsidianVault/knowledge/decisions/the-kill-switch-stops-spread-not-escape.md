---
title: The kill switch stops spread, not escape
date: 2026-09-01
tags:
  - decision
  - groups
  - security
  - rollout
status: active
---

# The kill switch stops spread, not escape

`app_settings.groups_enabled` is narrower than "Groups is off". Exactly **two** RPCs consult it:

| Refuses when the flag is off | Keeps working |
|---|---|
| `create_group` | `leave_group` |
| `join_group` | `list_my_groups`, `list_groups`, `search_groups` |
| | `fetch_group_leaderboard` |
| | `block_group_member`, `unblock`, `list_blocks` |
| | `report_group`, `report_profile` |

So flipping the switch stops the feature **spreading**. It does not lock the people already inside.

> [!warning] The spec disagrees, and the spec is wrong
> §11 EC-33 says flipping the flag makes "every RPC refuse with `groups.disabled`". The shipped SQL deliberately does not, and `leave_group` carries a comment saying why. `tests/e2e/db/schema.sql` is the source of truth per `CLAUDE.md`; the spec line should be corrected before Part 5 writes policy copy repeating it.

## Why

The switch is the incident response (EC-33) — pulled *after* launch, when real people are in real groups. If it also removed their board, their Leave, their Block and their Report, it would take away the safety controls at precisely the moment an abuse incident made them matter, and strand every member in a group until the switch came back.

Stopping new groups and new joins is enough to contain the incident.

## Consequences

- **A single boolean gate in the client is wrong in both directions.** Gating everything strands existing members; gating nothing puts the directory in front of everyone during rollout stage 3, when the client ships ahead of the flag. The client therefore resolves an *access level*, not a boolean — `groupsAccess()` in `src/features/groups/groupsAccess.ts`, unit-tested.
- Four states: `full`, `wind_down` (flag off but the caller is in groups — their own groups and Leave, no discovery/search/create), `unavailable` (flag off, no memberships — tab hidden, routes redirect), and `unknown` (the status call itself failed).
- **`unknown` is not `unavailable`.** "We could not ask" must not be treated as "the answer was no", or the route redirects away the only screen offering a retry. `unknown` renders the page with a Retry; only `unavailable` redirects.
- Telling those apart costs one `list_my_groups` call, made **only while the flag is off**. During rollout stage 3 that is one empty answer per session; once the flag is on it never runs. A failed probe assumes membership, so the failure mode is a visible tab rather than a trapped member.
- `groups_status()` is revalidated on foreground and on reconnect, not just at startup. A native app can stay resident for days, and both the rollout flip and the kill switch have to reach it without a restart.

## Related

- [[browse-is-not-a-membership-list]]
- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
- [[deployment-targets-web-spa-and-native]]
- [[2026-09-01-groups-directory-and-joining]]
