-- Abangers — initial schema (Phase 1 / MVP)
--
-- HOW RLS WORKS HERE (read this before adding new tables):
-- Supabase enables Postgres Row Level Security. Once RLS is ON for a
-- table, Postgres denies ALL access by default — even to the table's
-- owner — until a policy explicitly allows an operation. That's why
-- "RLS on, zero policies" is safe (returns nothing) but "RLS off" is
-- dangerous (anyone with the anon key sees/edits everything).
--
-- Rule for this project: every new table gets
--   1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
--   2. explicit CREATE POLICY statements for each operation you want
--      to allow (select/insert/update/delete), scoped to auth.uid().
-- No exceptions — see Section 5 of the project doc.

-- ── profiles ────────────────────────────────────────────────────────
-- Supabase Auth's built-in `auth.users` table holds email/password but
-- has no room for our app-specific fields (role, display name). This
-- table extends it 1:1.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('renter', 'landlord')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone signed in can read any profile (needed to show "posted by
-- landlord X" on a listing). Adjust later if you want landlord
-- identities more private.
create policy "profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- A user can only ever create/edit their own profile row.
create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- ── listings ────────────────────────────────────────────────────────
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  monthly_rent numeric not null check (monthly_rent > 0),
  available_rooms integer not null default 0 check (available_rooms >= 0),
  amenities text[] not null default '{}',
  house_rules text,
  address text not null,
  latitude double precision,
  longitude double precision,
  contact_info text not null,
  availability_status text not null default 'available'
    check (availability_status in ('available', 'almost_full', 'fully_occupied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings enable row level security;

-- Public read: renters browse listings without needing an account.
-- (Reconsider this if you later want "sign up to see contact info".)
create policy "listings are viewable by everyone"
  on public.listings for select
  to anon, authenticated
  using (true);

-- Only the listing's own landlord can create it, and only into their
-- own landlord_id — this is the policy that stops "landlord A edits
-- landlord B's listing by guessing an ID" from Section 6 of the doc.
create policy "landlords can insert their own listings"
  on public.listings for insert
  to authenticated
  with check (auth.uid() = landlord_id);

create policy "landlords can update their own listings"
  on public.listings for update
  to authenticated
  using (auth.uid() = landlord_id)
  with check (auth.uid() = landlord_id);

create policy "landlords can delete their own listings"
  on public.listings for delete
  to authenticated
  using (auth.uid() = landlord_id);

-- Keep updated_at accurate without every app-side write remembering to set it.
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();
