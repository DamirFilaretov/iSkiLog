---
title: A denylist trigger on the sign-in path locks users out
date: 2026-09-01
tags:
  - debugging
  - groups
  - auth
  - moderation
status: solved
---

# A denylist trigger on the sign-in path locks users out

> [!bug] Symptom (latent — found by review, not in the wild)
> Once `moderation_terms` is seeded, a first-time Google or Apple user whose provider display name contains a denylisted substring can never enter the app. They land on the "Data load failed" retry screen, and retrying fails identically every time.

Not live today: `groups_enabled` is `false` and the denylist is empty until Part 5 seeds it. Part 1's tests pass for the same reason.

## Root cause

Three things line up, none wrong on its own:

1. `normalise_profile_name` raises `22023 / groups.name_rejected` on a denylisted name — on **every** write to `profiles.full_name`, because it is a `BEFORE` trigger and the column has two existing writers.
2. `AuthProvider.ensureProfileName()` is the **first** await in hydration, and it writes the display name the OAuth provider supplied.
3. It rethrew the upsert error, which sets `hydrationStatus = "error"`.

So the failure is unrecoverable rather than merely annoying: the user is outside the gates, and `/profile` — the one screen that could change the offending name — is *behind* the same gate. There is no path to fix it from inside the app.

The trigger's own comment already knew about this class of problem. Length **truncates** rather than raising, "because rejecting a long name from an OAuth provider would break login". The denylist branch reintroduced exactly the failure mode the length branch was written to avoid.

Only users with no existing profile name are affected — the upsert only runs when the stored name is blank — which is precisely the first-login path.

## Fix

The database is right to refuse; the sign-in path was wrong to treat the refusal as fatal. The tolerance went into the client, so no committed SQL changed:

`ensureProfileName` now distinguishes that one hint (`isDenylistedNameError`, in `src/features/groups/profileNameFallback.ts`) and falls back to writing a blank name, which the leaderboard already renders as "Skier" (EC-9). Everything else still throws, so a real transport failure still fails hydration.

What this preserves, which sanitising inside the trigger would have cost:

- A direct PostgREST write is still refused outright — Part 5's milestone and its database test stay valid.
- A deliberate rename in `ProfileSettings` still shows the user the refusal.
- Only the write that cannot afford an error degrades.

The predicate is a separate module because `AuthProvider.tsx` is a component and this repo has no DOM test harness; extracting it is the only way the decision gets unit coverage.

## How to recognize this class elsewhere

> [!question] Could this bite another change?
> Any constraint, trigger or RPC that can **raise** on a write performed before the auth gates pass. Hydration failure is not a form error — it is a locked door, because every remedy lives behind the gate. Ask of any new write on the startup path: if this rejects, what does the user do next? If the answer needs a screen they cannot reach, degrade instead of raising.

## Still open

Two related defects in the same trigger were reviewed, confirmed and deliberately queued for Part 5 rather than fixed here:

- `schema.sql:1148` still matches with `lower(NEW.full_name) like '%' || t.term || '%'` — it never lowercases `t.term`, and `%` or `_` inside a term act as wildcards. The group path was hardened into `contains_denylisted_term` (`strpos`, both sides lowercased) and the profile path was left behind, so the two surfaces disagree on the same denylist.
- `schema.sql:1443` runs the `profiles` backfill **after** creating the trigger, so re-applying `schema.sql` against a populated `moderation_terms` aborts mid-script — taking `profiles_full_name_length` with it. `schema.sql` must stay re-runnable.

Both must land before the denylist is seeded.

## Related

- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
- [[the-client-mirrors-the-servers-whitespace-rules-exactly]]
- [[hydration-is-centralized-in-authprovider]]
