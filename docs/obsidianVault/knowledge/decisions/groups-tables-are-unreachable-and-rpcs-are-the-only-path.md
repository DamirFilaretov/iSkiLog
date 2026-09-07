---
title: Groups tables are unreachable; RPCs are the only path
date: 2026-09-01
tags:
  - decision
  - groups
  - security
  - supabase
status: active
---

# Groups tables are unreachable; RPCs are the only path

**No Groups table is reachable from a client. No exceptions.** All privileges are revoked from `anon` and `authenticated` on all eight; RLS is enabled underneath as defence in depth. No Groups table carries a policy, because none carries a grant.

Every read and write goes through a `security definer` RPC that verifies membership and returns **aggregates and opaque handles only** — never an `auth.users` UUID.

## Why

Supabase exposes tables over PostgREST, so **a grant is a public API**:

- A `select` policy on `groups` would still leak `created_by` for every row — RLS filters rows, not columns.
- A write policy would bypass the RPCs entirely, skipping name normalisation, quota, denylist and the transactional membership insert, leaving an unreachable zero-member group in the directory forever.
- `user_blocks` was briefly an exception. It could not be: `blocked_id` *is* an `auth.users` UUID, so reading your own blocks handed you a stable cross-group identifier, and its foreign key gave a UUID-existence oracle on insert. Making it private removed the exception and forced the blocked-users screen that mutual blocking needed anyway.

This was not theoretical. The failing test showed all 16 privileges granted by default, with a signed-in client able to insert into `groups`.

## Consequences

- Adding a Groups table means revoking its privileges in the same statement block. `tests/db/acl.test.ts` sweeps the catalogue and fails otherwise.
- Anything the client needs to see requires an RPC returning an explicit shape. `create_group` returns a named composite (`public.group_public`) rather than the table row, because the row carries `created_by`.
- Members are addressed by `group_members.id`, blocks by `user_blocks.id` — opaque per-row handles, so nobody can be correlated across groups.
- `EXECUTE` must be revoked from `public` and `anon` on every function. Postgres grants it to `PUBLIC` by default; the internal helpers were over-exposed until the ACL sweep caught it.
- A consequence for tests: `28000` is unobservable from a client. With `EXECUTE` revoked, an anonymous call is refused at the privilege layer and never enters the function body.

## Related

- [[a-concurrency-test-must-be-proven-by-removing-the-lock]]
- [[set-crud-must-go-through-rpcs]] — the same posture, for a single-user reason
- [[the-database-is-postgres-with-rls-and-subtype-tables]]
