---
title: Groups have no owner or admin role (D4)
date: 2026-08-31
tags:
  - decision
  - groups
status: active
---

# Groups have no owner or admin role (D4)

> [!info] From the original design spec (2026-08-31)
> "Ownership / roles: **None.** Everyone has 'Leave'; no owner, no admins."

`groups.created_by` exists and is shown nowhere as a privilege — it's a
moderation breadcrumb only, nullable (`on delete set null` when the creator's
account is deleted), and every member has exactly the same standing:

- Everyone can Leave. There's no "transfer ownership" or "remove a member" —
  see [[a-private-group-is-hidden-not-sealed|D28]]: **any** member sees the
  private-group invite code, specifically reasoned as "no member has powers
  another lacks."
- Leaving as the last member reaps the group (D5) — there's no owner to
  reassign it to first.
- The directory tap logic (`directoryCardTap`) treats "created it" as
  irrelevant; only current membership matters.

## Why this keeps mattering

Every time a feature is proposed that implies "the creator/admin can X," it
runs into this directly, because it would be the *first* privileged role in
a system deliberately built flat:

- **Editing a group's name/photo after creation** — raised 2026-09-04, not
  built. See [[groups-ship-with-real-photos]]. Unresolved question: what
  happens once the creator leaves, or their account is deleted and
  `created_by` goes null — does editing freeze forever, fall to any member,
  or does the app need a real transfer/promote mechanism?
- **Regenerating a leaked invite code** — considered and rejected in D28's
  own reasoning: a rotation RPC "would reintroduce 'one member can disrupt
  the others' and is not worth it here." Fixed by leave-and-recreate instead.

## Related

- [[a-private-group-is-hidden-not-sealed]]
- [[groups-ship-with-real-photos]]
