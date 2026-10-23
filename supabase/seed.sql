-- Abangers — development seed data
--
-- Creates a fixed set of test accounts (3 landlords, 2 renters and an
-- admin) plus sample boarding house listings around Cebu City, so everyone
-- on the team can log in and see real-looking data right away.
--
-- NEEDS MIGRATION 0014 (the admin role and reviewed_by) on the project.
--
-- HOW TO RUN
--   npm run db:seed              (runs this file against the linked project,
--                                 then supabase/seed-storage.mjs, which
--                                 uploads the seed verifications' sample
--                                 ID photos and the seed listings' sample
--                                 photo)
--   npx supabase db reset --linked   (wipes the DB, re-runs migrations, then
--                                     runs this file automatically; run
--                                     npm run db:seed afterwards for the
--                                     photos)
--
-- IDEMPOTENT: safe to run as many times as you like. Running it again
-- does NOT create duplicates — it brings the seed accounts and listings
-- back to exactly what's written below (resetting passwords, names,
-- roles, landlord profiles, verifications and listing details). Anything
-- NOT in this file (e.g. accounts you created by signing up in the app)
-- is left alone.
--
-- TEST ACCOUNTS — every account uses the same password: Abangers123!
--   landlord1@abangers.test   Maria Santos      (landlord, verified)
--   landlord2@abangers.test   Jun Dela Cruz     (landlord, NOT verified)
--   landlord3@abangers.test   Rosa Villanueva   (landlord, verification
--                                                waiting for review)
--   renter1@abangers.test     Ana Reyes         (renter)
--   renter2@abangers.test     Paolo Garcia      (renter)
--   admin@abangers.test       Abangers Admin    (admin)
--
-- All three landlords have a complete profile. landlord1 is also verified,
-- so they can create listings; landlord2 isn't, so they can't (S1-15,
-- #206). landlord3 sent a verification that's waiting for the admin, so
-- the admin dashboard has one to review (S2-11, #207). The DB tests
-- (npm run test:db) rely on all three: try the verification flow on
-- landlord2 and the review on landlord3, then run this file again to put
-- them back.
--
-- The admin can only be made here (or with SQL in the dashboard): the app
-- never lets anyone create or turn their profile into an admin (0014).
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
        ('landlord1@abangers.test', 'Maria Santos',    'landlord'),
        ('landlord2@abangers.test', 'Jun Dela Cruz',   'landlord'),
        ('landlord3@abangers.test', 'Rosa Villanueva', 'landlord'),
        ('renter1@abangers.test',   'Ana Reyes',       'renter'),
        ('renter2@abangers.test',   'Paolo Garcia',    'renter'),
        ('admin@abangers.test',     'Abangers Admin',  'admin')
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


-- ── 2. Landlord profiles: complete ──────────────────────────────────
-- What a landlord fills in on the Profile page. A complete profile is a
-- name, a PH mobile number (saved as 09 + 9 digits; the form shows
-- +63 917...) and at least one social media link (landlordProfileSchema
-- in src/lib/validations/profile.ts), and the listings insert policy
-- (0012) checks it. The numbers are the ones in
-- their listings below (landlord3 has no listings); the links are made
-- up. landlord1 has only a Facebook link, landlord2 only an Instagram one
-- and landlord3 only an X one, so the policy's "any of the three links"
-- is tested all three ways. email and profile_completed are what the
-- profile forms save too (nothing checks profile_completed). Renters' and
-- the admin's profiles are left alone.
update public.profiles as p
set contact_number    = v.contact_number,
    email             = v.email,
    facebook_url      = v.facebook_url,
    instagram_url     = v.instagram_url,
    x_url             = v.x_url,
    profile_completed = true
from (
  values
    ('landlord1@abangers.test', '09175550101',
     'https://www.facebook.com/abangers.test.landlord1', null::text, null::text),
    ('landlord2@abangers.test', '09285550202',
     null::text, 'https://www.instagram.com/abangers.test.landlord2', null::text),
    ('landlord3@abangers.test', '09395550303',
     null::text, null::text, 'https://x.com/abangers_test_landlord3')
) as v (email, contact_number, facebook_url, instagram_url, x_url)
join auth.users as u on u.email = v.email
where p.id = u.id;


-- ── 3. Landlord verification ────────────────────────────────────────
-- "Verified" means the landlord has an approved landlord_verifications
-- row (0008). Every run leaves the seed landlords with exactly this:
--   landlord1  one submission, approved by the seed admin (verified)
--   landlord2  none (not verified)
--   landlord3  one submission waiting for review (pending), for the admin
--              dashboard (S2-11, #207). It's a passport, so it has only
--              the photo page and the selfie, no back photo. Approve or
--              reject it in the app as often as you like: running this
--              file again puts it back to pending.
-- Both submissions have fixed ids, so a re-run updates them instead of
-- adding more. The DB tests use them too (src/__tests__/db-helpers.ts).
--
-- Anything else the seed landlords submitted (e.g. while trying the
-- submit form, #204) is deleted first. That also keeps the insert below
-- from clashing with another pending or approved row (a landlord can only
-- have one, 23505). The deleted rows' files stay in the
-- verification-documents bucket: SQL can't delete Storage files, so
-- remove them in the dashboard if needed.
--
-- The file paths follow the submit form's folder layout (0009):
-- <landlord id>/<submission id>/<file>. SQL can't upload files either, so
-- supabase/seed-storage.mjs uploads the sample images in
-- supabase/seed-storage/ to these paths (npm run db:seed runs it after
-- this file). A passport's photo page is called id-front, like the
-- submit form calls it.
do $$
declare
  landlord1_submission_id constant uuid := 'b1b2c3d4-0000-4000-8000-000000000001';
  landlord3_submission_id constant uuid := 'b1b2c3d4-0000-4000-8000-000000000002';
  landlord1_id uuid;
  landlord3_id uuid;
  admin_id uuid;
  landlord1_folder text;
  landlord3_folder text;
begin
  select id into landlord1_id
  from auth.users
  where email = 'landlord1@abangers.test';

  select id into landlord3_id
  from auth.users
  where email = 'landlord3@abangers.test';

  select id into admin_id
  from auth.users
  where email = 'admin@abangers.test';

  landlord1_folder :=
    landlord1_id::text || '/' || landlord1_submission_id::text || '/';
  landlord3_folder :=
    landlord3_id::text || '/' || landlord3_submission_id::text || '/';

  delete from public.landlord_verifications as lv
  using auth.users as u
  where lv.landlord_id = u.id
    and u.email in (
      'landlord1@abangers.test',
      'landlord2@abangers.test',
      'landlord3@abangers.test'
    )
    and lv.id not in (landlord1_submission_id, landlord3_submission_id);

  insert into public.landlord_verifications (
    id, landlord_id, id_type, id_front_path, id_back_path, selfie_path,
    status, rejection_reason, consent_given_at, submitted_at, reviewed_at,
    reviewed_by
  ) values
    -- landlord1: approved by the seed admin.
    (landlord1_submission_id, landlord1_id, 'national_id',
     landlord1_folder || 'id-front.jpg', landlord1_folder || 'id-back.jpg',
     landlord1_folder || 'selfie.jpg',
     'approved', null, now(), now(), now(), admin_id),
    -- landlord3: a passport, waiting for review (nobody has reviewed it).
    (landlord3_submission_id, landlord3_id, 'passport',
     landlord3_folder || 'id-front.jpg', null,
     landlord3_folder || 'selfie.jpg',
     'pending', null, now(), now(), null, null)
  on conflict (id) do update
    set landlord_id      = excluded.landlord_id,
        id_type          = excluded.id_type,
        id_front_path    = excluded.id_front_path,
        id_back_path     = excluded.id_back_path,
        selfie_path      = excluded.selfie_path,
        status           = excluded.status,
        rejection_reason = excluded.rejection_reason,
        consent_given_at = excluded.consent_given_at,
        submitted_at     = excluded.submitted_at,
        reviewed_at      = excluded.reviewed_at,
        reviewed_by      = excluded.reviewed_by;
end $$;


-- ── 4. Listings ─────────────────────────────────────────────────────
-- Each listing has a fixed id, so re-running updates it in place
-- instead of inserting a copy. The landlord is looked up by email
-- (landlord ids differ between databases).
--
-- Every listing fills in what the listing form requires (listingSchema
-- in src/lib/validations/listing.ts), so each one can be opened in Edit
-- and saved as it is (#243):
--   - total_rooms is never below available_rooms (the column default is
--     1, which made four of these listings invalid, #231);
--   - city, property_type, occupancy_type and allowed_gender use the
--     form's own option lists (PROPERTY_TYPES, OCCUPANCY_TYPES and
--     GENDER_POLICIES in src/components/LandlordListingForm.tsx), so Edit
--     shows the right choice instead of the form's default.
-- The photos (images, cover_image) aren't set here: SQL can't upload the
-- file, and it doesn't know the project's URL. supabase/seed-storage.mjs
-- uploads a sample photo and sets them (npm run db:seed runs it after
-- this file).
insert into public.listings (
  id, landlord_id, title, monthly_rent, available_rooms, total_rooms,
  city, property_type, occupancy_type, allowed_gender, amenities,
  house_rules, address, latitude, longitude, contact_info, availability_status
)
select
  v.id::uuid, u.id, v.title, v.monthly_rent, v.available_rooms, v.total_rooms,
  v.city, v.property_type, v.occupancy_type, v.allowed_gender, v.amenities,
  v.house_rules, v.address, v.latitude, v.longitude, v.contact_info, v.availability_status
from (
  values
    -- Maria Santos (landlord1)
    ('a1b2c3d4-0000-4000-8000-000000000001', 'landlord1@abangers.test',
     'Santos Boarding House near USC Talamban', 3500, 4, 6,
     'Cebu City', 'Boarding House', 'Bedspace', 'Any / Co-ed',
     array['WiFi', 'Shared kitchen', 'Laundry area', 'Study area'],
     'Curfew 10 PM. No visitors of the opposite sex in rooms. Keep common areas clean.',
     'Nasipit Rd, Talamban, Cebu City', 10.3530, 123.9125,
     'Maria Santos — 0917 555 0101', 'available'),

    ('a1b2c3d4-0000-4000-8000-000000000002', 'landlord1@abangers.test',
     'Air-conditioned Bedspace in Lahug (near UP Cebu)', 4500, 1, 4,
     'Cebu City', 'Boarding House', 'Bedspace', 'Any / Co-ed',
     array['WiFi', 'Air conditioning', 'Private CR', 'Water included'],
     'No smoking. No pets. Quiet hours from 10 PM to 6 AM.',
     'Gorordo Ave, Lahug, Cebu City', 10.3229, 123.8990,
     'Maria Santos — 0917 555 0101', 'almost_full'),

    ('a1b2c3d4-0000-4000-8000-000000000003', 'landlord1@abangers.test',
     'IT Park Studio Rooms for Working Professionals', 7000, 0, 5,
     'Cebu City', 'Apartment', 'Studio', 'Any / Co-ed',
     array['WiFi', 'Air conditioning', 'Private CR', 'Kitchenette', '24/7 security'],
     'No curfew. No loud parties. Electricity billed separately per sub-meter.',
     'Salinas Dr, Apas, Cebu City', 10.3302, 123.9060,
     'Maria Santos — 0917 555 0101', 'fully_occupied'),

    -- Jun Dela Cruz (landlord2)
    ('a1b2c3d4-0000-4000-8000-000000000004', 'landlord2@abangers.test',
     'Dela Cruz Dorm — walking distance to UC Main', 2800, 6, 10,
     'Cebu City', 'Dormitory', 'Shared Room', 'Any / Co-ed',
     array['WiFi', 'Shared CR', 'Water included', 'Electricity included'],
     'Curfew 11 PM. Cooking allowed in the shared kitchen only.',
     'Sanciangko St, Cebu City', 10.2978, 123.8978,
     'Jun Dela Cruz — 0928 555 0202', 'available'),

    ('a1b2c3d4-0000-4000-8000-000000000005', 'landlord2@abangers.test',
     'Female-only Boarding House near CIT-U', 3200, 2, 8,
     'Cebu City', 'Boarding House', 'Shared Room', 'Female Only',
     array['WiFi', 'Shared kitchen', 'Laundry area', 'CCTV'],
     'Female tenants only. Curfew 9 PM. Visitors allowed in the lobby until 8 PM.',
     'N. Bacalso Ave, Labangon, Cebu City', 10.2950, 123.8815,
     'Jun Dela Cruz — 0928 555 0202', 'almost_full'),

    ('a1b2c3d4-0000-4000-8000-000000000006', 'landlord2@abangers.test',
     'Budget Rooms near USJ-R Main', 2500, 3, 5,
     'Cebu City', 'Boarding House', 'Single Room', 'Any / Co-ed',
     array['Shared CR', 'Water included', 'Study area'],
     'Curfew 10 PM. One-month advance and one-month deposit required.',
     'P. Del Rosario St, Cebu City', 10.2936, 123.8997,
     'Jun Dela Cruz — 0928 555 0202', 'available')
) as v (
  id, landlord_email, title, monthly_rent, available_rooms, total_rooms,
  city, property_type, occupancy_type, allowed_gender, amenities,
  house_rules, address, latitude, longitude, contact_info, availability_status
)
join auth.users u on u.email = v.landlord_email
on conflict (id) do update
  set landlord_id         = excluded.landlord_id,
      title               = excluded.title,
      monthly_rent        = excluded.monthly_rent,
      available_rooms     = excluded.available_rooms,
      total_rooms         = excluded.total_rooms,
      city                = excluded.city,
      property_type       = excluded.property_type,
      occupancy_type      = excluded.occupancy_type,
      allowed_gender      = excluded.allowed_gender,
      amenities           = excluded.amenities,
      house_rules         = excluded.house_rules,
      address             = excluded.address,
      latitude            = excluded.latitude,
      longitude           = excluded.longitude,
      contact_info        = excluded.contact_info,
      availability_status = excluded.availability_status;
