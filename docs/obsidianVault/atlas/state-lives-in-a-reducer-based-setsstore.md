---
title: State lives in a reducer-based SetsStore
date: 2026-06-19
tags:
  - atlas
  - architecture
  - state
---

# State lives in a reducer-based SetsStore

The central client store is [`src/store/setsStore.tsx`](../../../src/store/setsStore.tsx) — React Context + `useReducer`. Deliberately **not** Zustand/Redux.

## What it manages

- `sets`
- `seasons`
- `activeSeasonId`
- `setsHydrated`

## Reducer behavior worth knowing

- `ADD_SET` and `UPDATE_SET` move the changed set to the **top** of the list (most-recent-first feel).
- `SET_ALL` **preserves** the backend fetch order from hydration.
- After [[hydration-is-centralized-in-authprovider|hydration]] associates a cache user id, the store writes a per-user localStorage cache.

> [!warning] The cache is write-only at boot
> The store writes `iskilog:cache:user:<userId>` but **does not read it back** during boot. `fetchSets()` from the backend remains the source of truth. Don't assume the cache accelerates cold start. See [[per-user-localstorage-caches-carry-a-version]].

## Where data comes in

Components never fetch sets themselves — they read from this store, which is populated by [[hydration-is-centralized-in-authprovider|AuthProvider]]. History and Insights both depend on this single hydrated dataset.

## Related
- [[the-app-is-a-react19-supabase-capacitor-training-log]]
- [[a-set-is-a-discriminated-union-narrow-by-event]]
- [[per-user-localstorage-caches-carry-a-version]]
