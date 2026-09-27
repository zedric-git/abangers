-- BoardingHub — Migration 0002: Add contact_number, email, and social links to profiles
--
-- Extends public.profiles table so landlords can complete their profile with
-- contact details and social media accounts.

alter table public.profiles
  add column if not exists contact_number text,
  add column if not exists email text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists x_url text;
