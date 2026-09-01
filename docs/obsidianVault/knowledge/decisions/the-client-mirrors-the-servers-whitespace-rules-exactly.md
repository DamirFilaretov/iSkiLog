---
title: The client mirrors the server's whitespace rules exactly
date: 2026-09-01
tags:
  - decision
  - groups
  - unicode
  - validation
status: active
---

# The client mirrors the server's whitespace rules exactly

`src/features/groups/groupWhitespace.ts` defines the whitespace class the client normalises group names with. It is **not** JavaScript's `\s`. It is the set PostgreSQL's `\s` collapses in this database, measured against the deployed `canonical_group_name` and re-measured on every run by `tests/db/groupNameMirror.test.ts`.

Length checking stays deliberately non-authoritative — the server decides. **Whitespace does not.**

## Why

`canonicalGroupName()` is what the create flow uses to answer "is this the group I just made?" after a lost response returns `groups.name_taken` (D18, EC-26). It compares the canonical form of the typed name against the canonical form of the name the server stored. A mismatch in either direction is a bug, and they are *different* bugs:

- **Collapsing less than the server** makes the client miss its own group. The server stores `A<U+0085>B` as `A B`; a client that leaves U+0085 alone sees two different names and tells the user someone else took the name they just created.
- **Collapsing more than the server** can match a *different* group. The server keeps `A<U+FEFF>B` and `A B` apart, so both can exist as separate groups. A client that folds U+FEFF into a space can navigate the user to a group they never created.

A superset would have fixed only the first. Only an exact mirror fixes both.

## The measured divergence

| Direction | Characters |
|---|---|
| Server collapses, JavaScript does not | U+001C, U+001D, U+001E, U+001F, U+0085 |
| JavaScript collapses, server does not | U+FEFF |

Everything else agrees, including NBSP (U+00A0), U+2003 and U+3000 — which is *not* what reasoning about glibc locales would have predicted. The set came from probing the database, not from a table.

## Consequences

- The corpus lives in one module and is imported by both the unit tests and a database test. A mirror asserted only against itself is not a mirror.
- If the hosted project's collation differs from local Docker, `tests/db/groupNameMirror.test.ts` fails rather than the create flow silently misreconciling.
- `groupAvatar` splits words through `normaliseGroupName` rather than its own `\s`, so there is one definition of whitespace in the feature.
- Client length checks count **code points** (`[...s].length`), matching `char_length()`. Counting UTF-16 code units made the client stricter than the server and blocked valid emoji names — the client may be more permissive than the server, never less.

## Related

- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
- [[a-denylist-trigger-on-the-sign-in-path-locks-users-out]]
