---
title: One page handles both create and edit
date: 2026-06-19
tags:
  - decision
  - architecture
  - ui
status: enforced
---

# One page handles both create and edit

> [!success] Decision
> [`src/pages/AddSet.tsx`](../../../src/pages/AddSet.tsx) (route `/add`) is a **single unified form** that both creates new sets and edits existing ones, across all four event types.

## Why
Create and edit share ~all of their form logic, validation, unit conversion, and the [[set-crud-must-go-through-rpcs|transactional RPC]] save path. One page avoids duplicating that surface twice and keeps the two flows from drifting apart.

## How it works
- Event-specific field groups are split into components (`SlalomFields`, `TricksFields`, `JumpFields`/`CutsFields`, `OtherFields`), with shared `BaseFields` (date, optional time, [[notes-are-stored-as-six-structured-sections|six notes sections]]).
- Edit mode pre-populates from a hydrated set; create mode starts from defaults (`emptyNotes`).
- Unit conversions depend on stored user preferences (`src/lib/preferences.ts`).
- Save is transactional via RPC; handled save errors go to Sentry **and** surface in the UI ([[handled-errors-must-be-captured-to-sentry]]).

## Related
- [[set-crud-must-go-through-rpcs]]
- [[a-set-is-a-discriminated-union-narrow-by-event]]
