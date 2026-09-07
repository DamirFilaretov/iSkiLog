---
title: The directory shows a stale snapshot before revalidating (D15 narrowed)
date: 2026-09-04
tags:
  - decision
  - groups
  - performance
status: active
---

# The directory shows a stale snapshot before revalidating (D15 narrowed)

> [!info] Narrows D15, doesn't repeal it
> D15 — "Caching: None at all — no localStorage, no memo" — was written for
> the **leaderboard**: a period-keyed memo goes stale across midnight and
> misses sets logged while mounted. That justification doesn't extend to the
> plain membership/browse list, which has no calendar window to drift
> against. This decision only changes the directory (`Groups.tsx`); the
> leaderboard still refetches on every mount and period switch with nothing
> held anywhere, exactly as D15 originally specified.

## The problem

Every navigation to `/groups` — including just switching tabs and back —
unmounted and remounted `Groups.tsx`, resetting `loadState` to `"loading"`
and showing `DirectorySkeleton` for the length of a real network round trip.
Other tabs (Home, Insights, Settings) don't do this because they read from
`SetsProvider`, hydrated once above the router; Groups was built with its own
per-mount fetch instead, and D15's blanket "never cache" was applied to that
fetch without carving out an exception for data that doesn't share the
leaderboard's staleness risk.

## The fix

`src/features/groups/groupDirectoryCache.ts` — an in-memory (not
localStorage, gone on reload), session-lived, per-user-id snapshot of the
last successful `{ mine, browse }` result. On mount:

- A snapshot present → render it immediately (`loadState` goes straight to
  `"ready"`, no skeleton) while the real fetch still runs in the background
  and corrects it when it lands.
- No snapshot (first visit this session) → exactly today's behaviour:
  skeleton, then the real answer.
- A background revalidation that **fails** while a snapshot is showing does
  not replace the working list with the error/retry screen — a failed
  refresh isn't a reason to break a screen that was fine a second ago.

Keyed by user id so a snapshot can never leak across an account switch
within the same tab.

## Consequences

- A just-left group, or one just created elsewhere, can render stale for one
  round trip on the next `/groups` mount before self-correcting — accepted;
  the unconditional refetch on every `load()` is unchanged, so this is
  strictly bounded.
- The mutation flows that don't call `load()` directly (join-by-code,
  reconcile) don't update the cache either — same bounded staleness, same
  self-correction on the next mount.

## Related

- [[browse-is-not-a-membership-list]]
- [[the-tab-bar-guesses-from-last-launch-while-access-waits]]
