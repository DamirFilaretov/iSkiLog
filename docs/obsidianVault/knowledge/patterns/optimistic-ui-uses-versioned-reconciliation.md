---
title: Optimistic UI uses versioned reconciliation
date: 2026-06-19
tags:
  - pattern
  - state
  - concurrency
---

# Optimistic UI uses versioned reconciliation

Tricks-library toggles (learned / in-progress) update the UI **optimistically**, then reconcile with the server response in a **race-safe** way. Logic: [`src/features/tricks/learnedToggle.ts`](../../../src/features/tricks/learnedToggle.ts).

## The shape

```ts
applyToggleResponse({ current, trickId, latestVersion, responseVersion, succeeded, previousLearned }) {
  if (responseVersion !== latestVersion) return current   // stale → ignore
  if (succeeded) return current                            // keep optimistic state
  return setLearnedState(current, trickId, previousLearned) // failed → roll back
}
```

## Why it's built this way
A user can tap the same trick repeatedly. Responses can arrive **out of order**. Each toggle carries a monotonically increasing version; a response only acts if its `responseVersion` is still the `latestVersion`. Stale responses are dropped; only failures of the *current* version roll back.

> [!tip] Reusable principle
> For any optimistic toggle where rapid repeats are possible: stamp each action with a version, ignore responses that aren't the latest, and only roll back the current one on failure. Don't blindly apply whatever the server last said.

This is the fix described in [[out-of-order-toggle-responses-can-clobber-state]] and is covered by `learnedToggle.test.ts`.

## Related
- [[out-of-order-toggle-responses-can-clobber-state]]
- [[per-user-localstorage-caches-carry-a-version]]
