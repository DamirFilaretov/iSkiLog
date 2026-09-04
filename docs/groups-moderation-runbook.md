# Groups moderation runbook

Groups exposes user-generated content: group names, group descriptions, and
profile display names, all visible to other members on shared leaderboards.
Apple (Guideline 1.2) and Google Play (UGC policy) require filtering, reporting,
blocking, a contact address, and a timely response to reports. This document is
the response process.

## Commitment

- Check `abuse_reports` **once every business day**.
- Action anything credible within **one business day** of that check.
- Contact address for reports: **iskilog@gmail.com** (in the app: About →
  Report abuse; also stated in the policy). Reports that arrive by email are
  triaged the same way.

## Daily check

Supabase dashboard → SQL editor:

```sql
select id, created_at, target_type,
       target_group_id, target_user_id,
       snapshot_name, snapshot_description, reason
from abuse_reports
order by created_at desc
limit 50;
```

`target_group_id` (for a `group` report) and `target_user_id` (for a `profile`
report) are the identifiers the actioning steps below need. Either can be
**null** if the group or account was already deleted — in that case there is
nothing left to remove, and the `snapshot_*` columns are the retained evidence.
If a `target_user_id` is not null but you don't know their current display name,
`select full_name from profiles where user_id = '<target_user_id>'`.

## Actioning a report

**Abusive group name or description** (use the report's `target_group_id`)

```sql
-- inspect
select id, name, description, is_private, created_by, created_at
from groups where id = '<target_group_id>';

-- remove (memberships cascade; the report survives with its snapshot)
delete from groups where id = '<target_group_id>';
```

For a borderline case, edit the row instead of deleting it.

**Abusive profile display name** (use the report's `target_user_id`)

```sql
-- 1. add the offending term(s) to the blocklist (lowercase, literal substring)
insert into moderation_terms (term) values ('<lowercased term>')
on conflict (term) do nothing;

-- 2. blank the current value — the leaderboard then shows "Skier"
update profiles set full_name = '' where user_id = '<target_user_id>';
```

The trigger (`normalise_profile_name`) blocks the user from re-entering any
blocklisted term.

**A member reported repeatedly, or a severe single report**

Remove their group memberships, and/or escalate to an account action under the
main Terms of Service.

## Live incident (spreading abuse, spam wave)

Flip the kill switch:

```sql
update app_settings set value = 'false' where key = 'groups_enabled';
```

This stops **new** group creation and **new** joins only. Members already in a
group keep their board, Leave, Report and Block — deliberately, so an incident
does not trap people or remove the controls they need
(`docs/obsidianVault/knowledge/decisions/the-kill-switch-stops-spread-not-escape.md`).
Re-enable with `'true'` once handled.

## Blocklist maintenance

`moderation_terms` holds lowercase literal substrings, matched
case-insensitively by `contains_denylisted_term` on both write surfaces
(`create_group` for names and descriptions, the `profiles` trigger for display
names). Substring matching over-blocks innocent words that contain a term —
prefer longer, unambiguous terms, and remove any that generate false reports.
The seed set is in `supabase/migrations/20260903194544_groups_part5_denylist.sql`.
Add or remove terms directly in the dashboard:

```sql
insert into moderation_terms (term) values ('<term>') on conflict (term) do nothing;
delete from moderation_terms where term = '<term>';
```

## Store submission notes

Tell reviewers where the controls are:

- **Report a group:** the group's join screen has a "Report this group" link.
- **Report or block a member:** on a group's leaderboard, tap another member's
  row → "Report member" / "Block member".
- **Unblock:** Settings → Privacy & Security → Blocked members.
- **Filtering:** group names, descriptions and display names are checked against
  a blocklist before they are shown; violating input is rejected.
- **Contact:** About → Report abuse (iskilog@gmail.com), also in the policy.

Update the App Store and Play Console UGC / data-safety declarations to reflect
that Groups shares a profile name and event-type set counts among group members.
