---
title: Notes are stored as six structured sections
date: 2026-06-19
tags:
  - decision
  - product
  - data-model
status: shipped
---

# Notes are stored as six structured sections

> [!success] Decision (Approved 2026-04-10, shipped)
> A set's notes are **not** a single freeform string. They are six named sections, stored in a dedicated `set_notes` table (one row per set). Design spec: [`docs/superpowers/specs/2026-04-10-structured-notes-design.md`](../../../superpowers/specs/2026-04-10-structured-notes-design.md).

## The six sections

| Field key | Display label |
|---|---|
| `summary` | Session Summary |
| `workedOn` | What I Worked On |
| `mistakes` | Mistakes & Struggles |
| `whatHelped` | What Helped |
| `nextSet` | Focus for Next Set |
| `other` | Other Notes |

## Why
Structured prompts make post-session reflection more intentional and the logged data more useful to review later — better fit for [[the-product-is-structured-self-tracking-not-social-fitness|structured self-tracking]] than a blank box.

## Implementation facts
- **Storage:** `set_notes` table, `UNIQUE(set_id)` → enables upsert on update. `sets` has **no** notes column.
- **Migration:** old freeform `notes` text was migrated into the `other` column, then the `sets.notes` column was dropped.
- **Backward compat in edit:** older plain-string notes encountered in edit state are normalized into the `other` field.
- **RPCs:** create/update take `p_notes` as **JSON** and upsert into `set_notes`. `fetch_sets_hydrated` joins and returns prefixed columns mapped into a `StructuredNotes` object.
- **Type:** `StructuredNotes` + `emptyNotes` in `src/types/sets.ts`; `SetBase.notes` is `StructuredNotes`.
- **UI:** all six sections always visible in `BaseFields.tsx`; `SetSummary` shows only non-empty sections.
- **Tests:** `tests/e2e/specs/structured-notes.spec.ts`.

## Related
- [[set-crud-must-go-through-rpcs]]
- [[a-set-is-a-discriminated-union-narrow-by-event]]
- [[the-database-is-postgres-with-rls-and-subtype-tables]]
