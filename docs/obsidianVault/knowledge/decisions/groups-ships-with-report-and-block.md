---
title: Groups ships with report and block
date: 2026-09-03
tags:
  - decision
  - groups
  - moderation
  - scope
  - rollout
status: active
---

# Groups ships with report and block

> [!success] Decision (2026-09-03, spec v5)
> In-app **reporting** (groups and profile names) and **mutual blocking** with a
> blocked-members screen are **in Part 5**, not deferred. This reverses
> [[blocking-and-reporting-are-deferred]].

## Why it changed

The deferral (2026-09-01) rested on "Groups isn't going to the stores until
Part 6, and if the stores require blocking it comes back off the shelf." The
maintainer's call on 2026-09-03: **Groups ships in the native App Store and
Google Play builds** from the start. Apple Guideline 1.2 and Google Play's UGC
policy both require, for user-to-user content, all of: content filtering, a
mechanism to **report**, a mechanism to **block**, and a published contact —
plus a stated commitment to act on reports. The denylist + kill switch cover
filtering and takedown only.

So the least-complicated path that passes review is not removing reporting —
it is wiring up what Part 1 already built.

## What this costs

Almost nothing on the server. `report_group`, `report_profile`,
`block_group_member`, `list_blocks`, `unblock`, `abuse_reports`, `user_blocks`
and the symmetric block filter in `fetch_group_leaderboard` were all built,
tested (`tests/db/reports.test.ts`, `blocks.test.ts`) and pushed dormant in
Part 1. The client wrappers exist in `src/data/groupsApi.ts` from Part 2.

Part 5 adds **UI only**:

- "Report this group" link in `GroupJoinModal` → `ReportDialog`.
- `LeaderboardRow` becomes tappable → `MemberActionSheet` (Report / Block a
  member). Block refetches the board.
- A blocked-members section in `PrivacySecurity.tsx` (`list_blocks` / `unblock`)
  — mandatory because blocking is mutual: the blocked person leaves every board,
  so this is the only surviving unblock path (D17).

## Consequences

- The leaderboard row is **no longer static** (Part 4 built it static because
  there was nothing for it to open).
- The consent-gate copy already says "you can block or report another member" —
  it now matches reality.
- Store-listing UGC declarations must be updated and review notes must point to
  where the report and block controls live.
- Moderation becomes an ongoing commitment: a runbook with a one-business-day
  response target, read from the Supabase dashboard (no in-app queue).

## Related

- [[blocking-and-reporting-are-deferred]] (superseded)
- [[the-kill-switch-stops-spread-not-escape]]
- [[a-denylist-trigger-on-the-sign-in-path-locks-users-out]]
- [[the-database-is-managed-by-supabase-migrations]]
