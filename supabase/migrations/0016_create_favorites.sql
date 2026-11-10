-- Abangers — Migration 0016: Create favorites table with RLS and explicit grants (S2-08.1, #95)
--
-- A junction table recording which listings a renter has saved to Favorites.
--
-- Access rules:
-- 1. Table privileges: SELECT, INSERT, DELETE granted to authenticated only.
--    No anon access; no update privilege needed as bookmark rows are immutable.
-- 2. Row Level Security:
--    - Renter can view, insert, and delete only their own rows (auth.uid() = renter_id).
--    - Role enforcement (Rule 1): the user's profile must have role = 'renter'.
--    - Landlords and unauthenticated visitors cannot read, insert, or delete favorites.
--
-- SAFE TO RE-RUN: "if not exists" for the table and index, and each policy
-- is dropped "if exists" before it is created.

create table if not exists public.favorites (
  renter_id  uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamp with time zone default now() not null,
  primary key (renter_id, listing_id)
);

-- Index for reverse lookup and fast cascade deletes on listing removal.
create index if not exists favorites_listing_id_idx on public.favorites(listing_id);

-- Explicit grants: only authenticated users can select, insert, or delete (Rule 1).
grant select, insert, delete on table public.favorites to authenticated;

-- Enable Row Level Security (Rule 1).
alter table public.favorites enable row level security;

-- Policy: Renters can view only their own favorites.
drop policy if exists "renters can view own favorites" on public.favorites;
create policy "renters can view own favorites"
  on public.favorites for select
  to authenticated
  using (
    auth.uid() = renter_id
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'renter'
    )
  );

-- Policy: Renters can insert only their own favorites.
drop policy if exists "renters can insert own favorites" on public.favorites;
create policy "renters can insert own favorites"
  on public.favorites for insert
  to authenticated
  with check (
    auth.uid() = renter_id
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'renter'
    )
  );

-- Policy: Renters can delete only their own favorites.
drop policy if exists "renters can delete own favorites" on public.favorites;
create policy "renters can delete own favorites"
  on public.favorites for delete
  to authenticated
  using (
    auth.uid() = renter_id
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'renter'
    )
  );
