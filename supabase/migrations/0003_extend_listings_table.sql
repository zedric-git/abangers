-- BoardingHub — Migration 0003: Extend listings table with comprehensive property fields (S1-05.2)
--
-- Adds missing columns to public.listings for property classification, capacity, 
-- gender policies, feature checklists, and extended text details.
-- RLS policies remain completely intact.

alter table public.listings
  add column if not exists city text,
  add column if not exists total_rooms integer default 1 check (total_rooms >= 0),
  add column if not exists property_type text,
  add column if not exists occupancy_type text,
  add column if not exists allowed_gender text,
  add column if not exists utilities text[] default '{}',
  add column if not exists room_features text[] default '{}',
  add column if not exists bathroom_features text[] default '{}',
  add column if not exists kitchen_features text[] default '{}',
  add column if not exists laundry_features text[] default '{}',
  add column if not exists safety_features text[] default '{}',
  add column if not exists description text;
