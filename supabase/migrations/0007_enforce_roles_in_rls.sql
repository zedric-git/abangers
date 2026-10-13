-- Abangers — Migration 0007: Enforce renter/landlord roles in RLS
-- (fixes #173 and #174)
--
-- PROBLEM: the policies in 0001_init.sql only check *who owns a row*,
-- never *what role the user has*:
--   - #174: "users can update their own profile" allows changing any
--     column, including `role`. A renter could make themselves a
--     landlord with one API call using the public anon key.
--   - #173: "landlords can insert their own listings" only checks
--     auth.uid() = landlord_id, so a renter could insert a listing under
--     their own id directly — no role change needed.
-- Either way, a renter could publish listings that everyone can see.
--
-- FIX:
--   1. A trigger that stops app users from CHANGING their role once the
--      profile exists. Setting it on insert (sign-up) still works, and
--      writing the same value back (LandlordProfileForm upserts
--      role = 'landlord' on every save) is not a change, so it's allowed.
--   2. Listing insert/update policies also require the caller's profile
--      to have role = 'landlord'.
--
-- Changing a role on purpose is still possible from the Supabase
-- dashboard / SQL editor / seed.sql, which run as `postgres`, not as an
-- app user.
--
-- SAFE TO RE-RUN: "create or replace" for the function, and every
-- trigger/policy is dropped "if exists" before being created.


-- ── 1. #174: lock profiles.role after it's first set ────────────────
-- Why a trigger instead of column-level grants: revoking UPDATE on the
-- role column would also break LandlordProfileForm's upsert, which
-- always sends role = 'landlord' even when nothing changes. The trigger
-- only rejects an actual change.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- current_user is 'authenticated' / 'anon' for requests from the app
  -- (Supabase's API), and 'postgres' for the dashboard, SQL editor, and
  -- seed.sql — only block the app.
  if new.role is distinct from old.role
     and current_user in ('authenticated', 'anon') then
    raise exception 'profiles.role cannot be changed once set'
      using errcode = '42501'; -- insufficient_privilege, same as RLS
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update of role on public.profiles
  for each row
  execute function public.prevent_role_change();


-- ── 2. #173: only landlords can create or edit listings ─────────────
-- "Is the caller a landlord?" is checked by looking up their own
-- profiles row. That lookup works under RLS because any signed-in user
-- can read profiles ("profiles are viewable by authenticated users").

drop policy if exists "landlords can insert their own listings" on public.listings;
create policy "landlords can insert their own listings"
  on public.listings for insert
  to authenticated
  with check (
    auth.uid() = landlord_id
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
  );

drop policy if exists "landlords can update their own listings" on public.listings;
create policy "landlords can update their own listings"
  on public.listings for update
  to authenticated
  using (auth.uid() = landlord_id)
  with check (
    auth.uid() = landlord_id
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
  );

-- Delete stays owner-only ("landlords can delete their own listings" in
-- 0001_init.sql): with inserts locked to landlords, only landlords can
-- own listings, and letting an owner remove their own row is harmless.
