---
title: Supabase provides auth, Postgres, and RPC
date: 2026-06-19
tags:
  - integration
  - supabase
  - backend
---

# Supabase provides auth, Postgres, and RPC

Supabase **is** the backend. No Express, no Edge Functions (yet). Client singleton: [`src/lib/supabaseClient.ts`](../../../src/lib/supabaseClient.ts) — PKCE auth, session persistence.

## Three roles

1. **Auth** — email/password + Google OAuth ([[google-oauth-uses-capacitor-browser-and-deep-links]]); onboarding state in `user_metadata`.
2. **Postgres** — schema + RLS ([[the-database-is-postgres-with-rls-and-subtype-tables]]).
3. **RPC** — transactional functions the app must not bypass for set CRUD.

## Access pattern is intentionally mixed

- **RPCs** for: set hydration + transactional create/update (subtype rows + `set_notes`). See [[set-crud-must-go-through-rpcs]].
- **Direct table CRUD** for: tasks, seasons, tricks-library state, profile updates, some deletes, favourite toggles.

## The four RPCs that matter

| RPC | Used by |
|---|---|
| `fetch_sets_hydrated` | `src/data/setsApi.ts` — joins sets + set_notes + all subtypes |
| `create_set_with_subtype` | `src/data/setsWriteApi.ts` |
| `update_set_with_subtype` | `src/data/setsUpdateDeleteApi.ts` |
| `set_active_season_atomic` | `src/data/seasonsApi.ts` |

Create/update RPCs take `p_notes` as JSON and upsert into `set_notes` ([[notes-are-stored-as-six-structured-sections]]).

## Data-layer files
`setsApi.ts`, `setsWriteApi.ts`, `setsUpdateDeleteApi.ts`, `seasonsApi.ts`, `tasksApi.ts`, `tricksLearnedApi.ts`, and [[subtype-rpc-payloads-are-shaped-in-one-place|setSubtypeRpcPayload.ts]].

## Related
- [[the-database-is-postgres-with-rls-and-subtype-tables]]
- [[handled-errors-must-be-captured-to-sentry]] (PostgREST errors get normalized)
