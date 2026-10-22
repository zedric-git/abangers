-- Abangers — Migration 0005: Add contact details, social links, and
-- profile_completed to profiles (fixes #172)
--
-- HISTORY: this file used to be 0002_add_landlord_profile_fields.sql. It
-- shared the number 0002 with 0002_grant_table_privileges.sql, and
-- Supabase tracks applied migrations by number, so once the grants file
-- was applied this one was silently treated as "already done" and never
-- ran. It was renumbered to 0005 (safe: the shared database never
-- recorded it under any name).
--
-- WHAT IT DOES
--   1. Adds the columns the landlord profile forms already write to
--      (LandlordProfileForm.tsx, ProfileSetupModal.tsx).
--   2. Copies any values those forms saved into Supabase Auth user
--      metadata while the columns were missing, so landlords don't have
--      to re-enter them.
--
-- SAFE TO RE-RUN: "add column if not exists", and the backfill only
-- fills columns that are still empty (it never overwrites a value).
--
-- RLS / GRANTS: no changes needed. The existing profiles policies in
-- 0001_init.sql are row-based (auth.uid() = id), and the table-level
-- grants in 0002_grant_table_privileges.sql already cover new columns.


-- ── 1. New columns ──────────────────────────────────────────────────
-- All optional (nullable) except profile_completed, so existing rows
-- stay valid without any data.
alter table public.profiles
  add column if not exists contact_number text,
  add column if not exists email text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists x_url text,
  add column if not exists profile_completed boolean not null default false;


-- ── 2. Backfill from auth metadata ──────────────────────────────────
-- While the columns didn't exist, the forms' write to public.profiles
-- failed silently but the same fields were saved to
-- auth.users.raw_user_meta_data. Copy them over. coalesce(existing, new)
-- keeps anything already in profiles; nullif(..., '') skips blanks.
update public.profiles as p
set
  contact_number = coalesce(p.contact_number, nullif(u.raw_user_meta_data ->> 'contact_number', '')),
  email          = coalesce(p.email,          nullif(u.raw_user_meta_data ->> 'email', '')),
  facebook_url   = coalesce(p.facebook_url,   nullif(u.raw_user_meta_data ->> 'facebook_url', '')),
  instagram_url  = coalesce(p.instagram_url,  nullif(u.raw_user_meta_data ->> 'instagram_url', '')),
  x_url          = coalesce(p.x_url,          nullif(u.raw_user_meta_data ->> 'x_url', '')),
  profile_completed = p.profile_completed
    or coalesce((u.raw_user_meta_data ->> 'profile_completed')::boolean, false)
from auth.users as u
where u.id = p.id
  -- Only users who actually submitted a profile form. Don't match on
  -- 'email' alone: Supabase Auth puts an email key in EVERY user's
  -- metadata, and copying it would expose renters' emails through
  -- profiles (readable by any signed-in user).
  and u.raw_user_meta_data ?| array['contact_number', 'profile_completed'];
