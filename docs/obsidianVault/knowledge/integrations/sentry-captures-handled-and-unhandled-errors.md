---
title: Sentry captures handled and unhandled errors
date: 2026-06-19
tags:
  - integration
  - sentry
  - observability
---

# Sentry captures handled and unhandled errors

Sentry is part of the **expected production runtime**, not optional tooling. Initialized in [`src/instrument.ts`](../../../src/instrument.ts), imported **first** in `src/main.tsx`.

## Coverage
- Browser/runtime init before app boot
- Capacitor native integration ([[capacitor-wraps-the-app-for-android]])
- React Router v7 tracing
- Session replay + log-capture API
- React 19 root error handlers
- Source-map upload via Vite plugin (when build vars present)

## Three error tiers

| Tier | Mechanism |
|---|---|
| Unhandled runtime errors | Auto-captured by global Sentry hooks |
| Handled business-flow errors | `captureHandledException` |
| Non-blocking warnings | `captureHandledWarning` |

Helpers live in [`src/lib/sentryHandled.ts`](../../../src/lib/sentryHandled.ts).

> [!important] PostgREST normalization
> `captureHandledException` turns Supabase/PostgREST-style error objects into real `Error` instances and attaches code/details/hint/message metadata. This is why raw Supabase errors still produce useful Sentry events.

## Where handled capture lives

Auth hydration, set create/update, set delete, favourite toggles, task load/create/update/toggle/delete, tricks insights load, export/report failures.

> [!danger] Don't regress observability
> A user-visible catch block that only sets UI error state and skips Sentry capture is a regression. See the rule: [[handled-errors-must-be-captured-to-sentry]].

## Env
Runtime: `VITE_SENTRY_DSN`. Build/release: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

## Related
- [[handled-errors-must-be-captured-to-sentry]]
- [[supabase-provides-auth-postgres-and-rpc]]
