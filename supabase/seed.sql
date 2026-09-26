-- Abangers — development seed data
--
-- Creates a fixed set of test accounts (2 landlords, 2 renters) plus
-- sample boarding house listings around Cebu City, so everyone on the
-- team can log in and see real-looking data right away.
--
-- HOW TO RUN
--   npm run db:seed              (runs this file against the linked project)
--   npx supabase db reset --linked   (wipes the DB, re-runs migrations, then
--                                     runs this file automatically)
--
-- IDEMPOTENT: safe to run as many times as you like. Running it again
-- does NOT create duplicates — it brings the seed accounts and listings
-- back to exactly what's written below (resetting passwords, names,
-- roles and listing details). Anything NOT in this file (e.g. accounts
-- you created by signing up in the app) is left alone.
--
-- TEST ACCOUNTS — every account uses the same password: Abangers123!
--   landlord1@abangers.test   Maria Santos      (landlord)
--   landlord2@abangers.test   Jun Dela Cruz     (landlord)
--   renter1@abangers.test     Ana Reyes         (renter)
--   renter2@abangers.test     Paolo Garcia      (renter)
--
-- These are fake, dev-only credentials. Never reuse them anywhere real.


-- ── 1. Accounts (auth.users + auth.identities + public.profiles) ────
-- Supabase Auth normally creates these rows for us during sign-up. Here
-- we write them directly so the accounts exist without going through
-- the sign-up form or email confirmation.
--
-- Accounts are matched by EMAIL, not by a hard-coded id. That way, if
-- someone already signed up with one of these emails through the app,
-- we reuse their existing user instead of crashing on the unique email
-- constraint.
do $$
declare
  acct record;
  user_id uuid;
begin
  for acct in
    select *
    from (
      values
        ('landlord1@abangers.test', 'Maria Santos',  'landlord'),
        ('landlord2@abangers.test', 'Jun Dela Cruz', 'landlord'),
        ('renter1@abangers.test',   'Ana Reyes',     'renter'),
        ('renter2@abangers.test',   'Paolo Garcia',  'renter')
    ) as t (email, full_name, role)
  loop
    select id into user_id from auth.users where email = acct.email;

    if user_id is null then
      -- New account. The empty-string token columns matter: Supabase Auth
      -- errors on login ("converting NULL to string") if they're NULL.
      user_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated',
        acct.email, extensions.crypt('Abangers123!', extensions.gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', acct.full_name, 'role', acct.role),
        now(), now(),
        '', '', '', ''
      );
    else
      -- Existing account: reset it back to the seed state.
      update auth.users
      set encrypted_password = extensions.crypt('Abangers123!', extensions.gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                               || jsonb_build_object('full_name', acct.full_name, 'role', acct.role),
          updated_at = now()
      where id = user_id;
    end if;

    -- Email/password logins also need a matching identity row.
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      user_id::text, user_id,
      jsonb_build_object('sub', user_id::text, 'email', acct.email, 'email_verified', true),
      'email',
      now(), now(), now()
    )
    on conflict (provider_id, provider) do nothing;

    -- The app-side profile row (role + display name).
    insert into public.profiles (id, role, full_name)
    values (user_id, acct.role, acct.full_name)
    on conflict (id) do update
      set role = excluded.role,
          full_name = excluded.full_name;
  end loop;
end $$;


-- ── 2. Listings ─────────────────────────────────────────────────────
-- Each listing has a fixed id, so re-running updates it in place
-- instead of inserting a copy. The landlord is looked up by email
-- (landlord ids differ between databases).
insert into public.listings (
  id, landlord_id, title, monthly_rent, available_rooms, amenities,
  house_rules, address, latitude, longitude, contact_info, availability_status
)
select
  v.id::uuid, u.id, v.title, v.monthly_rent, v.available_rooms, v.amenities,
  v.house_rules, v.address, v.latitude, v.longitude, v.contact_info, v.availability_status
from (
  values
    -- Maria Santos (landlord1)
    ('a1b2c3d4-0000-4000-8000-000000000001', 'landlord1@abangers.test',
     'Santos Boarding House near USC Talamban', 3500, 4,
     array['WiFi', 'Shared kitchen', 'Laundry area', 'Study area'],
     'Curfew 10 PM. No visitors of the opposite sex in rooms. Keep common areas clean.',
     'Nasipit Rd, Talamban, Cebu City', 10.3530, 123.9125,
     'Maria Santos — 0917 555 0101', 'available'),

    ('a1b2c3d4-0000-4000-8000-000000000002', 'landlord1@abangers.test',
     'Air-conditioned Bedspace in Lahug (near UP Cebu)', 4500, 1,
     array['WiFi', 'Air conditioning', 'Private CR', 'Water included'],
     'No smoking. No pets. Quiet hours from 10 PM to 6 AM.',
     'Gorordo Ave, Lahug, Cebu City', 10.3229, 123.8990,
     'Maria Santos — 0917 555 0101', 'almost_full'),

    ('a1b2c3d4-0000-4000-8000-000000000003', 'landlord1@abangers.test',
     'IT Park Studio Rooms for Working Professionals', 7000, 0,
     array['WiFi', 'Air conditioning', 'Private CR', 'Kitchenette', '24/7 security'],
     'No curfew. No loud parties. Electricity billed separately per sub-meter.',
     'Salinas Dr, Apas, Cebu City', 10.3302, 123.9060,
     'Maria Santos — 0917 555 0101', 'fully_occupied'),

    -- Jun Dela Cruz (landlord2)
    ('a1b2c3d4-0000-4000-8000-000000000004', 'landlord2@abangers.test',
     'Dela Cruz Dorm — walking distance to UC Main', 2800, 6,
     array['WiFi', 'Shared CR', 'Water included', 'Electricity included'],
     'Curfew 11 PM. Cooking allowed in the shared kitchen only.',
     'Sanciangko St, Cebu City', 10.2978, 123.8978,
     'Jun Dela Cruz — 0928 555 0202', 'available'),

    ('a1b2c3d4-0000-4000-8000-000000000005', 'landlord2@abangers.test',
     'Female-only Boarding House near CIT-U', 3200, 2,
     array['WiFi', 'Shared kitchen', 'Laundry area', 'CCTV'],
     'Female tenants only. Curfew 9 PM. Visitors allowed in the lobby until 8 PM.',
     'N. Bacalso Ave, Labangon, Cebu City', 10.2950, 123.8815,
     'Jun Dela Cruz — 0928 555 0202', 'almost_full'),

    ('a1b2c3d4-0000-4000-8000-000000000006', 'landlord2@abangers.test',
     'Budget Rooms near USJ-R Main', 2500, 3,
     array['Shared CR', 'Water included', 'Study area'],
     'Curfew 10 PM. One-month advance and one-month deposit required.',
     'P. Del Rosario St, Cebu City', 10.2936, 123.8997,
     'Jun Dela Cruz — 0928 555 0202', 'available')
) as v (
  id, landlord_email, title, monthly_rent, available_rooms, amenities,
  house_rules, address, latitude, longitude, contact_info, availability_status
)
join auth.users u on u.email = v.landlord_email
on conflict (id) do update
  set landlord_id         = excluded.landlord_id,
      title               = excluded.title,
      monthly_rent        = excluded.monthly_rent,
      available_rooms     = excluded.available_rooms,
      amenities           = excluded.amenities,
      house_rules         = excluded.house_rules,
      address             = excluded.address,
      latitude            = excluded.latitude,
      longitude           = excluded.longitude,
      contact_info        = excluded.contact_info,
      availability_status = excluded.availability_status;
