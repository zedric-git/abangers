-- Abangers — Migration 0019: landlord visit availability (S3-01.1, #104)
--
-- WHY: landlords need to set which days of the week and hours they accept
-- physical property visits (S3-01, #10), so renters only see and request
-- open times (S3-02, #77). Each landlord has at most one row here.
-- Plan: https://github.com/zedric-git/abangers/issues/104#issuecomment-7199173956
--
-- DECISIONS
--   1. One row per landlord (landlord_id, available_days, start_time,
--      end_time): matches VisitAvailabilityForm.tsx (#105) and one upsert
--      in #106.
--   2. Weekdays use Postgres isodow numbering (1 = Monday .. 7 = Sunday).
--   3. Slot length is 60 minutes (VISIT_SLOT_MINUTES = 60), shared across
--      #108, #109 and the seed's 1-hour visit requests.
--   4. Available-hours enforcement on visit requests lives in #109's
--      server action (comparing against Philippine time, Asia/Manila),
--      keeping 0017/0018's visit_requests insert policy unchanged.
--
-- ERRORS THE APP WILL SEE (for #106 and #109):
--   42501  not allowed: not a landlord, writing another landlord's row,
--          deleting a row, or an anonymous caller (no grants for anon)
--   23514  one of the CHECK rules in section 1, named in the error:
--          landlord_visit_availability_days_check or
--          landlord_visit_availability_hours_check
--
-- SAFE TO RE-RUN: "if not exists" for the table, every trigger and policy
-- is dropped "if exists" before it's created, and the revoke and grants
-- end up the same.


-- ── 1. The table ────────────────────────────────────────────────────
create table if not exists public.landlord_visit_availability (
  landlord_id uuid primary key references public.profiles (id) on delete cascade,

  -- Postgres isodow numbers: 1 = Monday .. 7 = Sunday.
  available_days smallint[] not null,
  start_time time not null,
  end_time time not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Named CHECK rules: when one fails, the error (23514) names the rule.
  constraint landlord_visit_availability_days_check check (
    cardinality(available_days) >= 1
    and available_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  constraint landlord_visit_availability_hours_check check (
    end_time > start_time
  )
);


-- ── 2. Keep updated_at current ──────────────────────────────────────
drop trigger if exists landlord_visit_availability_set_updated_at
  on public.landlord_visit_availability;
create trigger landlord_visit_availability_set_updated_at
  before update on public.landlord_visit_availability
  for each row execute function public.set_updated_at();


-- ── 3. Row Level Security ───────────────────────────────────────────
alter table public.landlord_visit_availability enable row level security;

-- Read: any signed-in user (renters viewing a listing and landlords
-- loading their own settings).
drop policy if exists "authenticated users can read visit availability"
  on public.landlord_visit_availability;
create policy "authenticated users can read visit availability"
  on public.landlord_visit_availability for select
  to authenticated
  using (true);

-- Insert: only a landlord, and only for themselves.
drop policy if exists "landlords can create their own visit availability"
  on public.landlord_visit_availability;
create policy "landlords can create their own visit availability"
  on public.landlord_visit_availability for insert
  to authenticated
  with check (
    landlord_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
  );

-- Update: only a landlord, and only their own row.
drop policy if exists "landlords can update their own visit availability"
  on public.landlord_visit_availability;
create policy "landlords can update their own visit availability"
  on public.landlord_visit_availability for update
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

-- No delete policy: once set, a landlord updates their schedule in place.


-- ── 4. Grants ───────────────────────────────────────────────────────
-- Start from nothing (default privileges grant extra permissions on new
-- tables) and grant only what the policies allow, with nothing for anon.
revoke all on public.landlord_visit_availability from anon, authenticated;
grant select, insert, update on public.landlord_visit_availability to authenticated;
