---
title: Set writes time out and retry transport failures
date: 2026-07-06
tags:
  - pattern
  - reliability
  - supabase
---

# Set writes time out and retry transport failures

Set creation and full set updates run through `withTimeoutRetry()` in `src/data/withTimeoutRetry.ts`. Each attempt has an 8-second timeout and receives an `AbortSignal`; one additional attempt is allowed by default.

## Retry boundary

Retry only failures that indicate the request likely did not complete server-side:

- `RequestTimeoutError`
- `AbortError`
- transport messages containing fetch, network, timeout, or connection

Do not retry validation, constraint, or other server responses. Reissuing a request after a server response could duplicate an operation that already completed.

The wrapper currently protects `createSet()` and `updateSetInDb()`. Delete and favourite-toggle writes do not use it. Tests live in `src/data/withTimeoutRetry.test.ts`.

Related: [[set-crud-must-go-through-rpcs]], [[handled-errors-must-be-captured-to-sentry]]
