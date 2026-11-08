-- Abangers — Migration 0017: viewing requests (S3-02.1, #107)
--
-- WHY: a renter asks to see a listing at a date and time (S3-02, #77),
-- the landlord confirms or declines it (S3-03, #17), the renter can
-- cancel it (S3-04, #20), and after the visit the landlord marks it
-- completed (S3-07, #27). Each request is one row here. This file is only
-- the table and the rules the database enforces: the form, the pages and
-- the server actions are their own issues (#108 to #114, #122, #123).
-- Plan: https://github.com/zedric-git/abangers/issues/107#issuecomment-6720226428
--
-- WHAT IT DOES
--   1. Creates public.viewing_requests, with CHECK rules for the status,
--      the number of attendees, the time slot and the two notes.
--   2. A trigger copies the listing's landlord into landlord_id, whatever
--      the app sends, so a request can't be filed under someone else.
--   3. Unique indexes: while a request is pending or confirmed, no other
--      request can take that landlord's date and start time (the slot
--      lock, #77, #109), and the renter can't send a second request for
--      the same listing.
--   4. A trigger decides which status changes are allowed, and who can
--      make them.
--   5. RLS: renters send requests and read their own; landlords read the
--      requests on their listings. Both can change a request, within
--      section 4's rules. Nobody can delete one.
--   6. Grants: after a request is sent, only its status and decline
--      reason can change.
--
-- TIMES ARE PHILIPPINE TIME. A request's slot is viewing_date +
-- start_time on the Philippine clock, and the viewing has "started" once
-- now() at time zone 'Asia/Manila' reaches it. The server's own clock is
-- UTC, so never compare a slot with plain now() or current_date. The Mark
-- Completed button (#122) has to use this same rule.
--
-- ERRORS THE APP WILL SEE (for #109, #111, #113 and #123):
--   42501  not allowed: not a renter, someone else as the renter, a new
--          request that isn't plain pending, a time that has started, a
--          listing that's fully occupied or doesn't exist, a status change
--          section 4 doesn't allow, or a column other than status and
--          decline_reason
--   23505  the slot is taken (viewing_requests_one_active_request_per_slot)
--          or the renter already has a pending or confirmed request for
--          this listing (viewing_requests_one_active_request_per_listing).
--          The error message names the index.
--   23514  one of the CHECK rules in section 1, named in the error
--   no error and no row back: the request isn't the caller's, or it no
--          longer has the status the app filtered on, i.e. it changed in
--          the meantime. #111 and #123 filter by the status they expect.
--
-- SAFE TO RE-RUN: "if not exists" for the table and the indexes, "create
-- or replace" for the functions, every trigger and policy is dropped "if
-- exists" before it's created, and the revoke and grants end up the same.


-- ── 1. The table ────────────────────────────────────────────────────
create table if not exists public.viewing_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  renter_id uuid not null references public.profiles (id) on delete cascade,

  -- Always the listing's landlord: section 2's trigger fills it in. It's
  -- stored so the slot lock (section 3) can be per landlord, since one
  -- landlord can't show two places at once, and so pages can filter on
  -- it without joining listings.
  landlord_id uuid not null references public.profiles (id) on delete cascade,

  -- The slot, in Philippine time (see the header). Slots have a fixed
  -- length, set by the slot picker (#108), so start_time names the slot.
  viewing_date date not null,
  start_time time not null,
  end_time time not null,

  attendees smallint not null default 1,
  message text,               -- the renter's note, optional

  status text not null default 'pending',
  decline_reason text,        -- optional, and only on a declined request

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Named CHECK rules: when one fails, the error (23514) names the rule.
  -- Keep these lists and limits in sync with
  -- src/lib/validations/viewing-request.ts.
  constraint status_is_known check (
    status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed')
  ),
  constraint attendees_in_range check (attendees between 1 and 5),
  constraint time_slot_in_order check (end_time > start_time),
  -- An empty note is saved as null, not as ''.
  constraint message_length check (
    message is null
    or (btrim(message) <> '' and char_length(message) <= 500)
  ),
  -- The landlord can give a reason when declining, but doesn't have to.
  -- No other status has one.
  constraint decline_reason_only_when_declined check (
    decline_reason is null
    or (
      status = 'declined'
      and btrim(decline_reason) <> ''
      and char_length(decline_reason) <= 500
    )
  )
);


-- ── 2. The landlord comes from the listing ──────────────────────────
-- landlord_id is always the listing's landlord. The app doesn't need to
-- send it, and whatever it sends is replaced, so a renter can't file a
-- request under another landlord or get around the slot lock.
--
-- Runs as the caller (not security definer), so it only finds listings
-- the caller can read, which today is every listing (0001). Once listing
-- visibility lands (#276), a listing the renter can't see gives no
-- landlord, and the insert fails instead of going through.
create or replace function public.set_viewing_request_landlord()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.landlord_id := (
    select listings.landlord_id
    from public.listings
    where listings.id = new.listing_id
  );
  return new;
end;
$$;

drop trigger if exists viewing_requests_set_landlord on public.viewing_requests;
create trigger viewing_requests_set_landlord
  before insert on public.viewing_requests
  for each row execute function public.set_viewing_request_landlord();


-- ── 3. Indexes ──────────────────────────────────────────────────────
-- The slot lock (#77, #109): while a request is pending or confirmed, no
-- other request can take the same landlord, date and start time. A
-- declined, cancelled or completed request doesn't hold its slot. Being
-- an index, it holds even when two renters send a request at the same
-- moment.
create unique index if not exists viewing_requests_one_active_request_per_slot
  on public.viewing_requests (landlord_id, viewing_date, start_time)
  where status in ('pending', 'confirmed');

-- One pending or confirmed request per renter per listing, so a renter
-- can't fill a landlord's calendar with requests for the same place.
create unique index if not exists viewing_requests_one_active_request_per_listing
  on public.viewing_requests (renter_id, listing_id)
  where status in ('pending', 'confirmed');

-- What the pages look up: a landlord's requests and a renter's, by date.
-- These also index the foreign keys, so deleting a listing or an account
-- finds its requests quickly.
create index if not exists viewing_requests_landlord_id_viewing_date_idx
  on public.viewing_requests (landlord_id, viewing_date);
create index if not exists viewing_requests_renter_id_viewing_date_idx
  on public.viewing_requests (renter_id, viewing_date);
create index if not exists viewing_requests_listing_id_idx
  on public.viewing_requests (listing_id);


-- ── 4. Which status changes are allowed ─────────────────────────────
-- After a request is sent, only its status and decline reason can change
-- (section 6), and the status only like this:
--
--   the listing's landlord:  pending   -> confirmed or declined
--                            confirmed -> completed, once the viewing
--                                         has started
--   the renter:              pending or confirmed -> cancelled, before
--                                         the viewing starts
--
-- declined, cancelled and completed are final. Anything else, including
-- an update that keeps the status (e.g. rewriting a decline reason), is
-- refused with 42501. RLS (section 5) already limits each person to their
-- own requests; this decides what they can do with them, which a policy
-- can't: a policy sees the row either before or after the change, never
-- both at once.
--
-- Like 0007's role trigger, it only checks requests from the app
-- (current_user is authenticated or anon). SQL run as postgres, such as
-- seed.sql or the dashboard's SQL editor, can still reset a request.
create or replace function public.check_viewing_request_status_change()
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

  -- Philippine time, like everything about slots (see the header).
  has_started :=
    (old.viewing_date + old.start_time) <= (now() at time zone 'Asia/Manila');

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

  -- The renter can cancel until the viewing starts.
  if caller = old.renter_id
     and old.status in ('pending', 'confirmed')
     and new.status = 'cancelled'
     and not has_started then
    return new;
  end if;

  raise exception 'a viewing request can''t change from % to % (see 0017)',
    old.status, new.status
    using errcode = '42501'; -- insufficient_privilege, same as RLS
end;
$$;

drop trigger if exists viewing_requests_check_status_change on public.viewing_requests;
create trigger viewing_requests_check_status_change
  before update on public.viewing_requests
  for each row execute function public.check_viewing_request_status_change();

-- Keep updated_at current without every app-side write remembering it,
-- with the function listings uses (0001).
drop trigger if exists viewing_requests_set_updated_at on public.viewing_requests;
create trigger viewing_requests_set_updated_at
  before update on public.viewing_requests
  for each row execute function public.set_updated_at();


-- ── 5. Row Level Security ───────────────────────────────────────────
alter table public.viewing_requests enable row level security;

-- Read: a renter sees their own requests (My Viewings, #113), and a
-- landlord sees the requests on their listings (Viewing Requests, #110).
-- Postgres lets a row through when any one of the select policies does.
-- There's no admin policy: admins don't see viewing requests.
drop policy if exists "renters can read their own viewing requests"
  on public.viewing_requests;
create policy "renters can read their own viewing requests"
  on public.viewing_requests for select
  to authenticated
  using (renter_id = auth.uid());

drop policy if exists "landlords can read requests for their listings"
  on public.viewing_requests;
create policy "landlords can read requests for their listings"
  on public.viewing_requests for select
  to authenticated
  using (landlord_id = auth.uid());

-- Request: only a renter, only for themselves, and only as a fresh
-- pending request, for a slot that hasn't started yet, on a listing that
-- still has room. Section 2's trigger has already filled in landlord_id
-- by the time this runs (Postgres checks policies after BEFORE triggers).
drop policy if exists "renters can request a viewing"
  on public.viewing_requests;
create policy "renters can request a viewing"
  on public.viewing_requests for insert
  to authenticated
  with check (
    renter_id = auth.uid()
    -- Landlords and admins don't request viewings. Same role check as
    -- 0007's listing policies.
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'renter'
    )
    and status = 'pending'
    and decline_reason is null
    -- Not a slot that has already started, on the Philippine clock.
    and (viewing_date + start_time) > (now() at time zone 'Asia/Manila')
    -- The listing exists and isn't fully occupied (its
    -- availability_status, the AVAILABILITY_STATUSES list in
    -- src/lib/validations/listing.ts).
    and exists (
      select 1 from public.listings
      where listings.id = viewing_requests.listing_id
        and listings.availability_status <> 'fully_occupied'
    )
  );

-- Change: a renter their own requests, a landlord the requests on their
-- listings. These only pick the rows; section 4's trigger decides which
-- status changes each of them can make (a renter can only cancel), and
-- section 6's grants keep every other column as the renter sent it.
-- renter_id and landlord_id can't change, so a request never moves to
-- someone else.
drop policy if exists "renters can change their own viewing requests"
  on public.viewing_requests;
create policy "renters can change their own viewing requests"
  on public.viewing_requests for update
  to authenticated
  using (
    renter_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'renter'
    )
  )
  with check (
    renter_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'renter'
    )
  );

drop policy if exists "landlords can change requests for their listings"
  on public.viewing_requests;
create policy "landlords can change requests for their listings"
  on public.viewing_requests for update
  to authenticated
  using (
    landlord_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
  )
  with check (
    landlord_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
  );

-- No delete policy, on purpose: a renter cancels instead, so both sides
-- keep the record.


-- ── 6. Grants ───────────────────────────────────────────────────────
-- This project's default privileges give anon and authenticated
-- TRUNCATE, REFERENCES, TRIGGER and MAINTAIN on every new table, so start
-- from nothing (like 0008) and grant exactly what the policies allow:
--   select, insert  signed-in users; the policies pick the rows
--   update          only status and decline_reason, so the date, time,
--                   attendees, message, renter and listing stay as the
--                   renter sent them. Changing any other column is
--                   "permission denied" (42501).
--   delete          nobody
-- and nothing at all for anon.
revoke all on public.viewing_requests from anon, authenticated;
grant select, insert on public.viewing_requests to authenticated;
grant update (status, decline_reason)
  on public.viewing_requests to authenticated;
