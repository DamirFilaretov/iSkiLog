---
title: Set CRUD must go through RPCs
date: 2026-06-19
tags:
  - decision
  - architecture
  - constraint
  - supabase
status: enforced
---

# Set CRUD must go through RPCs

> [!success] Decision
> Creating and updating a set goes through transactional Supabase RPCs — never raw multi-table writes from the client.

## Why
A single logical "set" spans three rows: the base `sets` row, one event-subtype row (`slalom_sets` / `tricks_sets` / `jump_sets` / `other_sets`), and a `set_notes` row ([[notes-are-stored-as-six-structured-sections]]). Writing these separately from the client risks **partial writes** — a base row with no subtype, or notes that don't match. The RPCs make it atomic.

## The functions
- `create_set_with_subtype` → `src/data/setsWriteApi.ts`
- `update_set_with_subtype` → `src/data/setsUpdateDeleteApi.ts`
- `fetch_sets_hydrated` (read side) → `src/data/setsApi.ts`

Payload shaping for the subtype/notes JSON is centralized — see [[subtype-rpc-payloads-are-shaped-in-one-place]].

## What's allowed without RPC
Direct table CRUD is fine for tasks, seasons, tricks-library toggles, profile updates, deletes, and favourite flags. The RPC rule is specifically about **set create/update consistency**.

## Constraint
> [!danger] Don't bypass the RPC shape
> Changing set CRUD to raw table writes — or changing RPC params without understanding subtype + `set_notes` consistency — will silently corrupt set data.

## Related
- [[supabase-provides-auth-postgres-and-rpc]]
- [[the-database-is-postgres-with-rls-and-subtype-tables]]
- [[one-page-handles-both-create-and-edit]]
