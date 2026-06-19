---
title: Subtype RPC payloads are shaped in one place
date: 2026-06-19
tags:
  - pattern
  - supabase
  - data-layer
---

# Subtype RPC payloads are shaped in one place

All event-specific RPC payload shaping lives in [`src/data/setSubtypeRpcPayload.ts`](../../../src/data/setSubtypeRpcPayload.ts). **Read it before touching set CRUD.**

## What it does
Given a [[a-set-is-a-discriminated-union-narrow-by-event|SkiSet]], it branches on `event` and builds the subtype JSON the [[set-crud-must-go-through-rpcs|create/update RPCs]] expect, plus the `p_notes` JSON for [[notes-are-stored-as-six-structured-sections|structured notes]].

## Why centralize it
- `create_set_with_subtype` and `update_set_with_subtype` must receive **identically shaped** payloads. One shared shaper keeps create and edit from drifting.
- The mapping from TS field names (camelCase) to DB/RPC params is non-obvious and easy to get wrong per-call.
- Adding a subtype field = change one file, both flows benefit.

> [!tip] When adding a field to an event subtype
> Touch four things in sync: the DB column ([[the-database-is-postgres-with-rls-and-subtype-tables|schema]]) + RPC, the TS type (`src/types/sets.ts`), **this payload shaper**, and the read mapping in `src/data/setsApi.ts`.

## Related
- [[set-crud-must-go-through-rpcs]]
- [[a-set-is-a-discriminated-union-narrow-by-event]]
- [[supabase-provides-auth-postgres-and-rpc]]
