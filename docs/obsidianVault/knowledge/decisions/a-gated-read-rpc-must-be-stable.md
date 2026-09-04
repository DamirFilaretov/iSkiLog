---
title: A gated read RPC must be STABLE
date: 2026-09-02
tags:
  - decision
  - database
  - groups
  - concurrency
status: active
---

# A gated read RPC must be STABLE

A `plpgsql` function left at the default **`VOLATILE`** takes a **fresh snapshot for every SQL statement inside it**. A `STABLE` (or `IMMUTABLE`) function uses the calling query's single snapshot for all of them.

So any read function shaped as **"check a gate, then return data"** must be `STABLE`, or the two steps can see different committed states.

## The case that surfaced it

`fetch_group_leaderboard` (Part 4 review, P1). Its body is:

1. `if not exists (select 1 from group_members where group_id = ? and user_id = auth.uid()) then raise 'not_a_member'`
2. `return query select ... from group_members m left join sets s ...`

At `VOLATILE`, a concurrent `leave_group` committing **between** step 1 and step 2 means:

- step 1 saw the caller as a member and passed,
- step 2 runs on a newer snapshot and returns the *other* members' rows — a just-left caller reads the board one more time,
- or, if the caller was the last member and the group was reaped, step 2 returns zero rows.

The window is microseconds, and the caller was legitimately a member when the request began, so the impact is low. But the gate and the data should never disagree.

## The fix

Mark the function `STABLE`. It is a read — that is the honest classification regardless of the race. Both internal statements then use the one snapshot established when PostgREST called the function.

`SECURITY DEFINER` + `STABLE` is fine. `raise exception`, `auth.uid()` (STABLE), `pg_catalog.now()` (STABLE) are all fine inside a `STABLE` function.

## Testing it

A live race test is not practical — you cannot pause execution between two statements inside a function without injecting `pg_sleep`, and a single-threaded test passes either way. Instead assert the property directly from the catalogue:

```sql
select provolatile from pg_proc
 where proname = 'fetch_group_leaderboard'  -- expect 's'
```

`'v'` volatile, `'s'` stable, `'i'` immutable. This lives in `tests/db/leaderboard.test.ts`.

## Still outstanding

`list_groups`, `search_groups`, `list_my_groups`, `list_blocks` are also `VOLATILE`. Each runs a *single* data query after a check on `auth.uid()` (which cannot change mid-call), so none has the gate/data split — harmless, but `STABLE` is still the correct label. Tidy at Part 5 or 6.

## Related

- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
- [[a-concurrency-test-must-be-proven-by-removing-the-lock]]
- [[2026-09-02-groups-leaderboard]]
