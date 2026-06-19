---
title: Per-user localStorage caches carry a version
date: 2026-06-19
tags:
  - pattern
  - caching
  - state
---

# Per-user localStorage caches carry a version

All client caches are **keyed per user** under the `iskilog:` prefix, and the sets cache carries a `CACHE_VERSION` so a shape change invalidates old data.

## The caches

| Key | Holds |
|---|---|
| `iskilog:cache:user:<userId>` | sets + seasons + activeSeasonId (versioned) |
| `iskilog:preferences` | rope/speed unit preferences |
| `iskilog:tasks:<userId>` | tasks |
| `iskilog:learned-tricks:<userId>` | learned tricks |
| `iskilog:in-progress-tricks:<userId>` | in-progress tricks |

## Rules
- **Bump `CACHE_VERSION`** in `setsStore.tsx` whenever the cached sets/seasons shape changes — old caches are then discarded.
- `clearAppLocalCaches()` (`src/lib/localCache.ts`) removes **only** `iskilog:*` keys, so sign-out/identity change never touches unrelated localStorage.
- [[hydration-is-centralized-in-authprovider|AuthProvider]] clears caches on sign-out / auth identity change.

> [!warning] The sets cache is currently write-only at boot
> The store **writes** `iskilog:cache:user:<userId>` but does **not read it back** during boot — `fetchSets()` from the backend is the source of truth. So this cache does not currently speed up cold start; treat it as a persisted snapshot, not a load accelerator. See [[state-lives-in-a-reducer-based-setsstore]].

## Related
- [[state-lives-in-a-reducer-based-setsstore]]
- [[hydration-is-centralized-in-authprovider]]
