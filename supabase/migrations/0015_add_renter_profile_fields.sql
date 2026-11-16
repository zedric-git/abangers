-- Abangers — Migration 0015: Add gender and occupation_status to profiles
-- (fixes #9, #78, #82, #83)
--
-- WHAT IT DOES
--   1. Adds gender and occupation_status to public.profiles for renters (S2-01).
--   2. Enforces allowed values with CHECK constraints:
--      - gender in ('Male', 'Female', 'Other', 'Prefer not to say')
--      - occupation_status in ('Student', 'Worker', 'Student & Worker', 'Other')
--      Both columns are nullable so existing landlord and incomplete renter rows
--      stay valid without any data.
--
-- SAFE TO RE-RUN: "add column if not exists", and constraints are dropped
-- if exists before adding.
--
-- RLS / GRANTS: no changes needed. The existing profiles policies in
-- 0001_init.sql are row-based (auth.uid() = id), and the table-level
-- grants in 0002_grant_table_privileges.sql already cover new columns.

alter table public.profiles
  add column if not exists gender text,
  add column if not exists occupation_status text;

alter table public.profiles
  drop constraint if exists profiles_gender_check,
  drop constraint if exists profiles_occupation_status_check;

alter table public.profiles
  add constraint profiles_gender_check
    check (gender is null or gender in ('Male', 'Female', 'Other', 'Prefer not to say')),
  add constraint profiles_occupation_status_check
    check (occupation_status is null or occupation_status in ('Student', 'Worker', 'Student & Worker', 'Other'));
