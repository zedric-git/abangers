-- Abangers — Migration 0018: viewing requests are now visit requests (#321)
--
-- WHY: the app now calls an in-person visit to a place a "visit", not a
-- "viewing" ("My Visits", "Visit Requests"), and the team uses one word
-- for one thing, from the pages down to the database. 0017 created the
-- table as viewing_requests; it's already applied, so it can't change, and
-- this file renames everything 0017 named "viewing".
-- Plan: https://github.com/zedric-git/abangers/issues/321#issuecomment-7165316506
--
-- WHAT IT RENAMES (nothing else changes: same columns, rules, RLS and
-- grants)
--   table      viewing_requests                -> visit_requests
--   column     viewing_date                    -> visit_date
--   indexes    viewing_requests_*              -> visit_requests_*
--              (and *_viewing_date_idx         -> *_visit_date_idx)
--   keys       viewing_requests_pkey and the three foreign keys
--                                              -> visit_requests_*
--   triggers   viewing_requests_*              -> visit_requests_*
--   functions  set_viewing_request_landlord    -> set_visit_request_landlord
--              check_viewing_request_status_change
--                                              -> check_visit_request_status_change
--   policies   the three whose names say "viewing" now say "visit"
--
-- WHAT FOLLOWS BY ITSELF: Postgres keeps policies, CHECK rules, grants
-- (including the column grant on status and decline_reason) and indexes
-- by the table's and column's internal ids, not their names, so they
-- carry on working after the rename. Triggers point at their function by
-- id too. The one thing that doesn't follow is a function body, which is
-- stored as text: check_visit_request_status_change reads visit_date, so
-- section 6 recreates it. Its logic is 0017's, word for word, apart from
-- the names.
--
-- ERRORS THE APP WILL SEE: the same codes as 0017's header lists, with
-- the new names. A duplicate (23505) names one of two indexes:
--   visit_requests_one_active_request_per_slot     the slot is taken
--   visit_requests_one_active_request_per_listing  the renter already has
--                                                  a pending or confirmed
--                                                  request for the listing
--
-- READING 0017 AFTER THIS: its comments still say viewing_requests,
-- viewing_date and src/lib/validations/viewing-request.ts. They're now
-- visit_requests, visit_date and src/lib/validations/visit-request.ts.
--
-- SAFE TO RE-RUN: every rename only happens if the old name is still
-- there, and the function is "create or replace".


-- ── 1. The table ────────────────────────────────────────────────────
alter table if exists public.viewing_requests rename to visit_requests;


-- ── 2. The date column ──────────────────────────────────────────────
-- The slot is visit_date + start_time, on the Philippine clock (0017's
-- header).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'visit_requests'
      and column_name = 'viewing_date'
  ) then
    alter table public.visit_requests rename column viewing_date to visit_date;
  end if;
end;
$$;


-- ── 3. Indexes ──────────────────────────────────────────────────────
-- The slot lock and the one-request-per-listing rule are these unique
-- indexes, and a 23505 names them, so the app looks for the new names.
alter index if exists public.viewing_requests_one_active_request_per_slot
  rename to visit_requests_one_active_request_per_slot;
alter index if exists public.viewing_requests_one_active_request_per_listing
  rename to visit_requests_one_active_request_per_listing;
alter index if exists public.viewing_requests_landlord_id_viewing_date_idx
  rename to visit_requests_landlord_id_visit_date_idx;
alter index if exists public.viewing_requests_renter_id_viewing_date_idx
  rename to visit_requests_renter_id_visit_date_idx;
alter index if exists public.viewing_requests_listing_id_idx
  rename to visit_requests_listing_id_idx;


-- ── 4. The primary key and the foreign keys ─────────────────────────
-- Postgres named these after the table when 0017 created it. Renaming the
-- primary key also renames the index behind it. The generated types show
-- the foreign keys' names, and a join that has to pick one of the two
-- keys to profiles names it, e.g. profiles!visit_requests_renter_id_fkey.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.visit_requests'::regclass
      and conname = 'viewing_requests_pkey'
  ) then
    alter table public.visit_requests
      rename constraint viewing_requests_pkey to visit_requests_pkey;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.visit_requests'::regclass
      and conname = 'viewing_requests_listing_id_fkey'
  ) then
    alter table public.visit_requests
      rename constraint viewing_requests_listing_id_fkey
      to visit_requests_listing_id_fkey;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.visit_requests'::regclass
      and conname = 'viewing_requests_renter_id_fkey'
  ) then
    alter table public.visit_requests
      rename constraint viewing_requests_renter_id_fkey
      to visit_requests_renter_id_fkey;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.visit_requests'::regclass
      and conname = 'viewing_requests_landlord_id_fkey'
  ) then
    alter table public.visit_requests
      rename constraint viewing_requests_landlord_id_fkey
      to visit_requests_landlord_id_fkey;
  end if;
end;
$$;


-- ── 5. Triggers ─────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.visit_requests'::regclass
      and tgname = 'viewing_requests_set_landlord'
  ) then
    alter trigger viewing_requests_set_landlord on public.visit_requests
      rename to visit_requests_set_landlord;
  end if;

  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.visit_requests'::regclass
      and tgname = 'viewing_requests_check_status_change'
  ) then
    alter trigger viewing_requests_check_status_change on public.visit_requests
      rename to visit_requests_check_status_change;
  end if;

  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.visit_requests'::regclass
      and tgname = 'viewing_requests_set_updated_at'
  ) then
    alter trigger viewing_requests_set_updated_at on public.visit_requests
      rename to visit_requests_set_updated_at;
  end if;
end;
$$;


-- ── 6. Trigger functions ────────────────────────────────────────────
-- Renaming a function keeps its id, so the triggers above keep calling
-- it. set_visit_request_landlord's body doesn't mention the renamed
-- column, so a rename is all it needs.
do $$
begin
  if to_regprocedure('public.set_viewing_request_landlord()') is not null then
    alter function public.set_viewing_request_landlord()
      rename to set_visit_request_landlord;
  end if;

  if to_regprocedure('public.check_viewing_request_status_change()') is not null then
    alter function public.check_viewing_request_status_change()
      rename to check_visit_request_status_change;
  end if;
end;
$$;

-- check_visit_request_status_change reads the date, so its body is
-- replaced with one that says visit_date. Everything else is 0017's
-- section 4, unchanged:
--
--   the listing's landlord:  pending   -> confirmed or declined
--                            confirmed -> completed, once the visit has
--                                         started
--   the renter:              pending or confirmed -> cancelled, before
--                                         the visit starts
--
-- declined, cancelled and completed are final, and anything else is
-- refused with 42501. Only requests from the app are checked (current_user
-- is authenticated or anon), so seed.sql can still reset a request.
create or replace function public.check_visit_request_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  has_started boolean;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Philippine time, like everything about slots (0017's header).
  has_started :=
    (old.visit_date + old.start_time) <= (now() at time zone 'Asia/Manila');

  -- The landlord answers a pending request...
  if caller = old.landlord_id
     and old.status = 'pending'
     and new.status in ('confirmed', 'declined') then
    return new;
  end if;

  -- ...and marks a confirmed one completed once it has started.
  if caller = old.landlord_id
     and old.status = 'confirmed'
     and new.status = 'completed'
     and has_started then
    return new;
  end if;

  -- The renter can cancel until the visit starts.
  if caller = old.renter_id
     and old.status in ('pending', 'confirmed')
     and new.status = 'cancelled'
     and not has_started then
    return new;
  end if;

  raise exception 'a visit request can''t change from % to % (see 0017 and 0018)',
    old.status, new.status
    using errcode = '42501'; -- insufficient_privilege, same as RLS
end;
$$;


-- ── 7. Policies ─────────────────────────────────────────────────────
-- Only the names change: what each policy allows is 0017's section 5.
-- The two landlord policies' names don't say "viewing", so they stay.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'visit_requests'
      and policyname = 'renters can read their own viewing requests'
  ) then
    alter policy "renters can read their own viewing requests"
      on public.visit_requests
      rename to "renters can read their own visit requests";
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'visit_requests'
      and policyname = 'renters can request a viewing'
  ) then
    alter policy "renters can request a viewing"
      on public.visit_requests
      rename to "renters can request a visit";
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'visit_requests'
      and policyname = 'renters can change their own viewing requests'
  ) then
    alter policy "renters can change their own viewing requests"
      on public.visit_requests
      rename to "renters can change their own visit requests";
  end if;
end;
$$;
