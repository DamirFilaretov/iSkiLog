---
title: Out-of-order toggle responses can clobber state
date: 2026-06-19
tags:
  - debugging
  - concurrency
  - state
status: solved
---

# Out-of-order toggle responses can clobber state

> [!bug] Symptom (bug class)
> A user rapidly toggles a trick (learned ↔ not). Network responses return **out of order**. A late-arriving response for an earlier tap overwrites the user's most recent choice — the UI "snaps back" to a stale value.

## Root cause
Naively applying "whatever the server last confirmed" ignores that an older request can resolve **after** a newer one. The last response wins, but the last response isn't necessarily the latest intent.

## Fix: versioned reconciliation
Each toggle is stamped with a monotonically increasing version. A response is only applied if its `responseVersion` still equals `latestVersion`; otherwise it's dropped. Only a failed *current* version rolls back. Implemented in [`src/features/tricks/learnedToggle.ts`](../../../src/features/tricks/learnedToggle.ts) and described as the reusable [[optimistic-ui-uses-versioned-reconciliation|versioned-reconciliation pattern]].

Regression coverage: `src/features/tricks/learnedToggle.test.ts`.

## How to recognize this class elsewhere
> [!question] Could this bite a new feature?
> Any optimistic control where the same item can be re-actioned before the first request resolves (favourite toggles, task done/undone, in-progress trick toggles) is vulnerable. Apply the same version guard.

---

> [!note] Debugging log convention
> Add new solved bugs here as `the-symptom-...` notes: **Symptom → Root cause → Fix → How to recognize**. Link the fix to a [[optimistic-ui-uses-versioned-reconciliation|pattern]] when one emerges.

## Related
- [[optimistic-ui-uses-versioned-reconciliation]]
