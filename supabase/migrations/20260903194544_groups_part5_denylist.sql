-- Groups Part 5: fix the profile-name denylist and seed moderation_terms.
--
-- Two defects carried forward verbatim from 20260903160619_groups_foundation.sql
-- (which is pushed and cannot be edited):
--   1. normalise_profile_name() matched with
--        lower(NEW.full_name) like '%' || t.term || '%'
--      — it never lowercased t.term, and %/_ inside a term acted as wildcards.
--      The group path (create_group) already uses contains_denylisted_term();
--      this brings the profile path onto the same matcher.
--   2. The foundation migration's profiles backfill runs AFTER the trigger is
--      created, so re-applying it against a populated moderation_terms fires the
--      trigger and can abort. This migration seeds the terms first, then runs
--      its own trigger-safe backfill, so every full_name ends up normalised AND
--      denylist-clean — the foundation backfill is then a no-op on every
--      subsequent re-apply and never fires the trigger on a denylisted row.

-- 1. Same literal, case-insensitive matcher as create_group.
create or replace function public.normalise_profile_name()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  NEW.full_name := left(
    btrim(regexp_replace(
      regexp_replace(coalesce(NEW.full_name, ''), '[[:cntrl:]]', '', 'g'),
      '\s+', ' ', 'g')),
    60);

  if NEW.full_name <> '' and public.contains_denylisted_term(NEW.full_name) then
    raise exception 'display name is not allowed'
      using errcode = '22023', hint = 'groups.name_rejected';
  end if;

  return NEW;
end;
$fn$;

-- 2. Seed BEFORE the backfill, so the very first production application cleans
--    any existing profile name that matches a seeded term (not only re-runs).
--    Lowercase, literal substrings, matched case-insensitively by
--    contains_denylisted_term. on conflict do nothing so a re-apply never
--    clobbers terms the maintainer added in the dashboard.
--
--    Deliberately short and unambiguous — substring matching over-blocks any
--    innocent word that contains a term, so the seed avoids terms that are
--    common substrings (excluded for that reason: spic -> "spice"/"conspicuous",
--    coon -> "raccoon"/"tycoon", rapist -> "therapist", kike -> the name "Kike",
--    chink -> "a chink in", retard -> "retardant"). The maintainer expands the
--    list in the dashboard; the runbook has the SQL.
insert into public.moderation_terms (term) values
  ('nigger'), ('nigga'), ('faggot'), ('wetback'), ('pedophile'), ('paedophile')
on conflict (term) do nothing;

-- 3. Trigger-safe, re-runnable backfill. A denylisted legacy name is blanked
--    (the leaderboard renders '' as "Skier", EC-9) rather than raising, exactly
--    as the sign-in path already degrades (profileNameFallback.ts). The
--    normalise expression is written once, in the CTE.
alter table public.profiles disable trigger profiles_normalise_name;

with normalized as (
  select user_id,
         left(btrim(regexp_replace(
           regexp_replace(coalesce(full_name, ''), '[[:cntrl:]]', '', 'g'),
           '\s+', ' ', 'g')), 60) as n
    from public.profiles
)
update public.profiles p
   set full_name = case when public.contains_denylisted_term(z.n) then '' else z.n end
  from normalized z
 where z.user_id = p.user_id
   and p.full_name is distinct from
       (case when public.contains_denylisted_term(z.n) then '' else z.n end);

alter table public.profiles enable trigger profiles_normalise_name;
