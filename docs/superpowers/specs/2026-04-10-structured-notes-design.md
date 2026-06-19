# Structured Notes Design

**Date:** 2026-04-10  
**Status:** Approved

## Context

The Add Set form currently has a single free-text "Notes" textarea. Users want structured sections to capture different aspects of a training pass: what they worked on, mistakes, what helped, and what to focus on next. This makes post-session reflection more intentional and makes the logged data more useful to review later.

## Design Decisions

- **Layout:** All 6 sections always visible (no accordion, no tabs). Scroll through, fill what's relevant, skip the rest.
- **Storage:** Separate `set_notes` table — one row per set, one column per section. Clean relational design; notes fields are not queried or filtered in SQL so a join is sufficient.
- **Backward compatibility:** Existing `notes` text data is migrated into the `other` column of `set_notes` during the DB migration. The `notes` column is then dropped from `sets`.
- **View page:** SetSummary displays each non-empty section with its label. Empty sections are hidden.

## Section Labels

| Field key   | Display label         |
|-------------|-----------------------|
| `summary`   | Session Summary       |
| `workedOn`  | What I Worked On      |
| `mistakes`  | Mistakes & Struggles  |
| `whatHelped`| What Helped           |
| `nextSet`   | Focus for Next Set    |
| `other`     | Other Notes           |

## Database

### New table

```sql
CREATE TABLE public.set_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id      uuid NOT NULL REFERENCES public.sets(id) ON DELETE CASCADE,
  summary     text NOT NULL DEFAULT '',
  worked_on   text NOT NULL DEFAULT '',
  mistakes    text NOT NULL DEFAULT '',
  what_helped text NOT NULL DEFAULT '',
  next_set    text NOT NULL DEFAULT '',
  other       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id)
);
```

### Migration steps (run on Supabase)

```sql
-- 1. Create table
-- (see above)

-- 2. Migrate existing notes into other field
INSERT INTO public.set_notes (set_id, other)
SELECT id, notes FROM public.sets WHERE notes != '';

-- 3. Drop old column
ALTER TABLE public.sets DROP COLUMN notes;
```

### RPC changes

All three RPCs that reference `notes` must be updated:

**`fetch_sets_hydrated`**
- Add `LEFT JOIN public.set_notes sn ON sn.set_id = s.id`
- Return `sn.summary AS notes_summary`, `sn.worked_on AS notes_worked_on`, `sn.mistakes AS notes_mistakes`, `sn.what_helped AS notes_what_helped`, `sn.next_set AS notes_next_set`, `sn.other AS notes_other`

**`create_set_with_subtype`**
- Replace parameter `p_notes text` with `p_notes jsonb`
- After inserting the set row, insert into `set_notes`:
  ```sql
  INSERT INTO public.set_notes (set_id, summary, worked_on, mistakes, what_helped, next_set, other)
  VALUES (new_set_id,
    coalesce(p_notes->>'summary', ''),
    coalesce(p_notes->>'workedOn', ''),
    coalesce(p_notes->>'mistakes', ''),
    coalesce(p_notes->>'whatHelped', ''),
    coalesce(p_notes->>'nextSet', ''),
    coalesce(p_notes->>'other', ''));
  ```

**`update_set_with_subtype`**
- Replace parameter `p_notes text` with `p_notes jsonb`
- After updating the set row, upsert into `set_notes`:
  ```sql
  INSERT INTO public.set_notes (set_id, summary, worked_on, mistakes, what_helped, next_set, other)
  VALUES (p_set_id, ...)
  ON CONFLICT (set_id) DO UPDATE SET
    summary     = excluded.summary,
    worked_on   = excluded.worked_on,
    mistakes    = excluded.mistakes,
    what_helped = excluded.what_helped,
    next_set    = excluded.next_set,
    other       = excluded.other;
  ```
  (The `UNIQUE (set_id)` constraint in the table definition enables this conflict target)

## TypeScript

### New type (`src/types/sets.ts`)

```ts
export type StructuredNotes = {
  summary: string;
  workedOn: string;
  mistakes: string;
  whatHelped: string;
  nextSet: string;
  other: string;
};

export const emptyNotes: StructuredNotes = {
  summary: '', workedOn: '', mistakes: '', whatHelped: '', nextSet: '', other: ''
};
```

`SetBase.notes` changes from `string` to `StructuredNotes`.

## Files to Modify

| File | Change |
|------|--------|
| `tests/e2e/db/schema.sql` | Add `set_notes` table, update 3 RPCs, drop `notes` from `sets` |
| `src/types/sets.ts` | Add `StructuredNotes` type + `emptyNotes` constant; update `SetBase.notes` |
| `src/data/setSubtypeRpcPayload.ts` | `p_notes: string` → `p_notes: object` (the `StructuredNotes` object) |
| `src/data/setsApi.ts` | Map 6 prefixed RPC result columns into `StructuredNotes` object |
| `src/components/addSet/BaseFields.tsx` | Replace single textarea with 6 labeled textareas |
| `src/pages/AddSet.tsx` | State: `string` → `StructuredNotes`; use `emptyNotes` as default |
| `src/pages/SetSummary.tsx` | Render each non-empty section with its label |

## Verification

1. `npm run build` — confirms TypeScript compiles with no errors
2. Manual: create a new set with notes in multiple sections → save → open set → all sections display correctly
3. Manual: open an existing set that has old plain-text notes → "Other Notes" field pre-populated → save → verify stored correctly
4. Manual: create a set with all notes fields empty → save/view without errors
5. `npm run test:run` — unit tests pass (no notes-specific unit tests today; build passing is the gate)
