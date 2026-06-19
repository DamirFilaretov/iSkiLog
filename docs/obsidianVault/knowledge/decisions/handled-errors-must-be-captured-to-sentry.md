---
title: Handled errors must be captured to Sentry
date: 2026-06-19
tags:
  - decision
  - observability
  - constraint
status: enforced
---

# Handled errors must be captured to Sentry

> [!success] Decision
> Any user-facing catch block in a business flow must call `captureHandledException` (or `captureHandledWarning` for non-blocking issues) — not just set UI error state.

## Why
Unhandled crashes are auto-captured, but **handled** failures (a failed save that shows a toast) are invisible to global hooks. If the catch block swallows the error into UI state only, observability silently regresses and these failures never reach Sentry.

## The rule in practice
- Helpers: [`src/lib/sentryHandled.ts`](../../../src/lib/sentryHandled.ts).
- `captureHandledException` normalizes Supabase/PostgREST errors into real `Error`s and attaches code/details/hint/message metadata.
- Required in: set create/update, set delete, favourite toggles, task CRUD/toggle, auth hydration, tricks insights load, export/report.

## Constraint
> [!danger] Don't remove manual capture
> Removing a `captureHandledException` from a handled user-facing flow is a regression even if the UI still "works." Reviewers should flag it.

## Related
- [[sentry-captures-handled-and-unhandled-errors]]
- [[set-crud-must-go-through-rpcs]]
