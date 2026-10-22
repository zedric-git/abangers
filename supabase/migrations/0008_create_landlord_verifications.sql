-- Abangers — Migration 0008: landlord_verifications table + name lock
-- (S1-15.1, #199 — part of S1-15, #198)
--
-- WHY: landlords verify their account by uploading a government ID (front
-- and back; for a passport, only the photo page) and taking a live selfie.
-- An admin approves or rejects each submission (Sprint 2, #207), and only
-- verified landlords can create listings (#201).
--
-- WHY A SEPARATE TABLE, not columns on profiles: any signed-in user can
-- read every profiles row ("profiles are viewable by authenticated
-- users"), and landlords can update every profiles column except role. A
-- "verified" column there would be public, and landlords could set it
-- themselves. Here a landlord can only INSERT their own PENDING
-- submission and READ their own rows. Nothing in this file lets them
-- update or delete a row, so a landlord can never approve themselves.
--
-- WHAT IT DOES
--   1. Creates public.landlord_verifications: one row per submission. A
--      resubmission after a rejection is a new row, so the history stays.
--   2. Allows only one pending-or-approved submission per landlord.
--   3. RLS + grants: landlords submit and read their own; nothing else.
--   4. Locks profiles.full_name once the landlord is verified (a trigger,
--      same pattern as the role lock in 0007).
--
-- "VERIFIED" MEANS: the landlord has a row with status = 'approved'. The
-- listings insert rule (#201) and the name lock below both use that.
-- Existing landlords have no rows yet, so they start Not verified; their
-- listings are not touched.
--
-- ERRORS THE APP WILL SEE (for the submit action, #204):
--   42501  not allowed: not a landlord, someone else's landlord_id, or
--          not a fresh pending submission (RLS)
--   23505  they already have a pending or approved submission
--   23514  a CHECK rule failed: unknown ID type, back photo missing (or
--          sent for a passport), or a file outside their own folder
--
-- SAFE TO RE-RUN: "if not exists" for the table and indexes, "create or
-- replace" for the function, and every policy/trigger is dropped
-- "if exists" before it's created.


-- ── 1. The table ────────────────────────────────────────────────────
create table if not exists public.landlord_verifications (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles (id) on delete cascade,

  -- Which ID was uploaded. Keep this list in sync with the submit form's
  -- Zod schema (#204); changing it needs a new migration.
  id_type text not null,

  -- Paths of the files in the private verification-documents bucket
  -- (#200), e.g. '<landlord id>/<file name>' — never public URLs.
  id_front_path text not null,
  id_back_path text,          -- empty only for a passport (photo page only)
  selfie_path text not null,

  status text not null default 'pending',
  rejection_reason text,      -- shown to the landlord when rejected

  -- When the landlord ticked the consent checkbox. No default on purpose:
  -- the app has to send it, so a submission can't be saved without
  -- going through the consent step.
  consent_given_at timestamptz not null,

  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,    -- set by the admin review (Sprint 2, #207)

  -- Named CHECK rules: when one fails, the error (23514) names the rule.
  constraint id_type_is_known check (
    id_type in (
      'national_id',      -- PhilSys National ID
      'drivers_license',
      'passport',
      'umid',
      'prc_id',
      'postal_id'
    )
  ),
  constraint status_is_known check (
    status in ('pending', 'approved', 'rejected')
  ),
  -- A passport only has its photo page; every other ID needs its back.
  constraint id_back_matches_id_type check (
    (id_type = 'passport' and id_back_path is null)
    or (id_type <> 'passport' and id_back_path is not null)
  ),
  -- A rejection always comes with a reason the landlord can read, and
  -- only a rejection has one.
  constraint rejection_reason_matches_status check (
    (status = 'rejected'
      and rejection_reason is not null
      and btrim(rejection_reason) <> '')
    or (status <> 'rejected' and rejection_reason is null)
  ),
  -- Every file must sit in the landlord's own "<landlord id>/" folder —
  -- the same rule the bucket's upload policy uses (#200), like
  -- listing-photos in 0006 — so a submission can't point at another
  -- landlord's ID photos.
  constraint files_in_landlords_own_folder check (
    starts_with(id_front_path, landlord_id::text || '/')
    and starts_with(selfie_path, landlord_id::text || '/')
    and (id_back_path is null
      or starts_with(id_back_path, landlord_id::text || '/'))
  )
);


-- ── 2. One open submission per landlord ─────────────────────────────
-- A landlord can have at most ONE submission that is pending or approved,
-- so a second one fails with 23505 (unique_violation): no resubmitting
-- while one is waiting for review, or after being verified. Rejected rows
-- don't count, so after a rejection they can submit again.
--
-- Why a unique index and not a "not exists (...)" check in the insert
-- policy: two submits at the same moment could both pass that check. The
-- index can't be raced.
create unique index if not exists landlord_verifications_one_pending_or_approved
  on public.landlord_verifications (landlord_id)
  where status in ('pending', 'approved');

-- For "what's my latest submission?" (dashboard status, #205), and so the
-- landlord_id foreign key is indexed.
create index if not exists landlord_verifications_landlord_id_submitted_at_idx
  on public.landlord_verifications (landlord_id, submitted_at desc);


-- ── 3. Row Level Security ───────────────────────────────────────────
alter table public.landlord_verifications enable row level security;

-- Read: a landlord sees only their own submissions (to show Pending,
-- Rejected with the reason, or Verified). Admins get their own policy in
-- Sprint 2 (#207).
drop policy if exists "landlords can read their own verifications"
  on public.landlord_verifications;
create policy "landlords can read their own verifications"
  on public.landlord_verifications for select
  to authenticated
  using (landlord_id = auth.uid());

-- Submit: only a landlord, only for themselves, and only as a fresh
-- pending submission. Inserting a row that's already approved (or
-- rejected, or reviewed) is blocked, so nobody can verify themselves.
drop policy if exists "landlords can submit their own verification"
  on public.landlord_verifications;
create policy "landlords can submit their own verification"
  on public.landlord_verifications for insert
  to authenticated
  with check (
    landlord_id = auth.uid()
    -- Renters don't verify. Same role check as 0007's listing policies.
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
    and status = 'pending'
    and rejection_reason is null
    and reviewed_at is null
  );

-- No update or delete policy, on purpose: once a submission is sent, a
-- landlord can't edit it, approve it, or withdraw it. Only an admin will
-- change the status (Sprint 2, #207).


-- ── 4. Grants ───────────────────────────────────────────────────────
-- This project's default privileges give anon and authenticated
-- TRUNCATE, REFERENCES, TRIGGER and MAINTAIN on every new table. None of
-- those can be used through the API, but this table points at ID photos,
-- so start from nothing and grant exactly what the policies above allow:
-- read + submit for signed-in users, nothing at all for anon.
revoke all on public.landlord_verifications from anon, authenticated;
grant select, insert on public.landlord_verifications to authenticated;


-- ── 5. Lock profiles.full_name once verified ────────────────────────
-- The admin checks the name on the ID against the profile's name, so once
-- a landlord is verified their name can't change (#205 shows it
-- read-only). Same approach as prevent_role_change() in 0007:
--   - only an actual change is rejected. LandlordProfileForm upserts
--     full_name on every save, and writing the same value back is fine.
--   - only app users (authenticated / anon) are blocked. The dashboard,
--     SQL editor and seed.sql run as postgres and can still fix a name.
-- While a submission is only pending, the name can still change (#199's
-- plan): the admin compares the ID with the name shown at review time.
--
-- The function runs as the caller (not "security definer"), so
-- current_user is the app's role, and the lookup below goes through RLS.
-- That works: only a profile's owner can update it (profiles update
-- policy), and owners can read their own verification rows.
create or replace function public.prevent_verified_name_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.full_name is distinct from old.full_name
     and current_user in ('authenticated', 'anon')
     and exists (
       select 1 from public.landlord_verifications
       where landlord_verifications.landlord_id = old.id
         and landlord_verifications.status = 'approved'
     ) then
    raise exception 'profiles.full_name cannot be changed once the account is verified'
      using errcode = '42501'; -- insufficient_privilege, same as RLS
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_verified_name_change on public.profiles;
create trigger profiles_prevent_verified_name_change
  before update of full_name on public.profiles
  for each row
  execute function public.prevent_verified_name_change();
