---
title: A concurrency test must be proven by removing the lock
date: 2026-09-01
tags:
  - pattern
  - testing
  - database
  - groups
status: active
---

# A concurrency test must be proven by removing the lock

A race-condition test that passes tells you nothing until you have watched it **fail with the protection removed**. A single-threaded version of the same test passes either way, which makes it worse than no test — it reports safety that was never checked.

Both locks in the Groups boundary were verified this way.

## What this caught

**`lock_group` (reap trigger).** Removed it, and "reaps when the last two members leave concurrently" failed with an orphaned zero-member group while the other three reap tests still passed — so the test isolates exactly the defect. Under Read Committed each leaver's trigger still sees the other's uncommitted row, so neither performs the cleanup, and no future delete will ever fire for that group.

**`lock_creator` (quota).** The first version of this test passed *with the lock removed*, because it fired two `supabase-js` calls under `Promise.all`. **Two overlapping HTTP requests do not produce two overlapping database transactions** — they serialise before reaching the contended window. Rewritten against two `pg` connections impersonating the user and held open across it, the test now fails without the lock: both creates succeed and produce an eleventh group past a limit of ten.

## How to write one here

Use `tests/db/helpers/asUser.ts`, which opens a connection, begins a transaction, sets `role authenticated` and a `request.jwt.claims` blob so `auth.uid()` resolves — the way PostgREST does. Then:

1. Open two connections as the same (or different) user.
2. Do the first mutation, but **do not commit**.
3. Fire the second without awaiting it; sleep briefly so it reaches the lock.
4. Commit the first, then await the second.
5. Assert the ordering of outcomes, not just the final state.

Asserting the final state alone is often satisfiable by accident. Collect an ordered list of what happened and compare the sequence.

## Related

- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
- [[optimistic-ui-uses-versioned-reconciliation]]
