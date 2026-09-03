---
title: The database is managed by Supabase migrations
date: 2026-09-03
tags:
  - decision
  - database
  - supabase
  - workflow
status: enforced
---

# The database is managed by Supabase migrations

> [!success] Decision
> The schema lives in `supabase/migrations/` as Supabase CLI migrations. One
> baseline was dumped from the hosted project; every change since is its own
> timestamped, forward-only file. The old hand-maintained `tests/e2e/db/schema.sql`
> is gone.

## Why

`schema.sql` had **drifted** from the hosted project (`rfxydppaevgpaenjimds`):
production had a real `event_type` enum, `numeric(3,1)` buoys, integer `speed`,
extra timestamp columns, CHECK constraints, partial-unique indexes, `*_own` /
`*_via_parent` policy names — and *no* `trg_sets_updated_at` trigger and *no*
`set_notes` policies, both of which `schema.sql` had invented. Deploying Groups by
running `schema.sql` at production would have created duplicate policies and run
data mutations against a schema it didn't actually match.

## How it was adopted (2026-09-03)

1. `supabase link --project-ref rfxydppaevgpaenjimds`.
2. Marked the 5 stale remote migration-history rows `reverted` (bookkeeping only).
3. `supabase db pull` → `20260903155020_baseline_from_production.sql`, marked `applied`.
4. Groups moved out of `schema.sql` into `20260903160619_groups_foundation.sql`
   (verbatim; two known denylist defects carried forward — see
   [[a-denylist-trigger-on-the-sign-in-path-locks-users-out]] and
   [[current_priorities]] "Blockers before Groups Part 5").
5. Test harness (`tests/e2e/scripts/_db.mjs`, `global.setup.ts`, `db-prepare.mjs`,
   `tests/db/helpers/schema.ts`) rewired off `schema.sql` onto `supabase db reset`
   / `applyFeatureMigrations()`.

`db diff --linked` after the baseline: clean except `drop extension "pg_net"` (a
Supabase-managed platform extension — a migration must never touch it).

## Rules

> [!danger] Never change the hosted database outside a migration
> No DDL in the hosted SQL editor or Table Editor — it bypasses migration history
> and `db push` starts failing.

- Never edit a migration that has been pushed — add a new one. Forward-only.
- Every migration must survive a clean `npx supabase db reset`, and is committed
  with the code that needs it.
- `db push` only from reviewed, committed migrations (ideally CI).
- Local DB is disposable: if it's wrong, `npx supabase db reset`.

## Everyday loop

```
npx supabase migration new <name>
# write the DDL
npx supabase db reset && npm run test:db   # (and e2e:db:prepare)
git add supabase/migrations && git commit
```

Deploy: `npx supabase db push` (after `--dry-run`).

## Related
- [[the-database-is-postgres-with-rls-and-subtype-tables]]
- [[supabase-provides-auth-postgres-and-rpc]]
- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
