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
--      trigger and can abort. This migration runs its own trigger-safe backfill
--      that leaves every full_name already normalised AND denylist-clean, so the
--      foundation backfill becomes a no-op on every subsequent re-apply.

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

-- 2. Trigger-safe, re-runnable backfill. A denylisted legacy name is blanked
--    (the leaderboard renders '' as "Skier", EC-9) rather than raising, exactly
--    as the sign-in path already degrades (profileNameFallback.ts).
alter table public.profiles disable trigger profiles_normalise_name;

update public.profiles
   set full_name = case
     when public.contains_denylisted_term(
            left(btrim(regexp_replace(
              regexp_replace(coalesce(full_name, ''), '[[:cntrl:]]', '', 'g'),
              '\s+', ' ', 'g')), 60)) then ''
     else left(btrim(regexp_replace(
              regexp_replace(coalesce(full_name, ''), '[[:cntrl:]]', '', 'g'),
              '\s+', ' ', 'g')), 60)
   end
 where full_name is distinct from case
     when public.contains_denylisted_term(
            left(btrim(regexp_replace(
              regexp_replace(coalesce(full_name, ''), '[[:cntrl:]]', '', 'g'),
              '\s+', ' ', 'g')), 60)) then ''
     else left(btrim(regexp_replace(
              regexp_replace(coalesce(full_name, ''), '[[:cntrl:]]', '', 'g'),
              '\s+', ' ', 'g')), 60)
   end;

alter table public.profiles enable trigger profiles_normalise_name;

-- 3. Seed. Lowercase, literal substrings. on conflict do nothing so a re-apply
--    never clobbers terms the maintainer added in the dashboard.
insert into public.moderation_terms (term) values
  ('nigger'), ('nigga'), ('faggot'), ('retard'), ('kike'), ('spic'),
  ('chink'), ('wetback'), ('tranny'), ('coon'), ('rapist'),
  ('pedophile'), ('paedophile')
on conflict (term) do nothing;
