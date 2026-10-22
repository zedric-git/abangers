-- Abangers — Migration 0010: only verified landlords with a complete
-- profile can create listings (S1-15.3, #201 — part of S1-15, #198)
--
-- WHY: renters should be able to trust, and reach, whoever posts a
-- listing. From now on a landlord can only create a NEW listing once:
--   1. their profile is complete (a name, an 11-digit contact number and
--      at least one social media link), and
--   2. their account is verified: an admin approved one of their
--      landlord_verifications submissions (0008; the admin review itself
--      comes in Sprint 2, #207).
-- createListingAction checks the same rule first, so a landlord normally
-- sees a clear message about what's missing; this policy is what actually
-- enforces it.
--
-- WHAT IT DOES
--   Replaces the listings insert policy from 0007 ("landlords can insert
--   their own listings"). It keeps both of 0007's checks (the listing is
--   the caller's own, and the caller is a landlord) and adds the two above.
--
-- WHAT IT DOESN'T CHANGE (on purpose)
--   - Existing listings stay up: the read policy is unchanged.
--   - The update and delete policies are unchanged, so a landlord who isn't
--     verified yet can still edit their existing listings and switch them
--     between available / almost full / fully occupied. No landlord is
--     verified when this ships, and approvals only become routine with the
--     admin review (#207), so requiring verification for edits now would
--     freeze every existing listing.
--   - No grants: 0002 already lets signed-in users insert into listings;
--     this policy decides which of those inserts get through.
--
-- "COMPLETE PROFILE" = the fields the profile forms already require. Keep
-- this in sync with landlordProfileSchema in src/lib/validations/profile.ts
-- (used by the profile forms and by createListingAction) — change both
-- together:
--   full_name        not empty
--   contact_number   exactly 11 digits, e.g. 09171234567
--   facebook_url / instagram_url / x_url
--                    at least one that isn't blank
-- profiles.profile_completed is NOT used: landlords can set that flag
-- themselves (they can update every profiles column except role), and the
-- profile setup screen never sets it in profiles, so it proves nothing.
--
-- "VERIFIED" = the landlord has a landlord_verifications row with
-- status = 'approved', the same definition 0008's name lock uses.
--
-- ERRORS THE APP WILL SEE: 42501 (RLS) when any of the checks fails,
-- whichever one it is. That's why createListingAction checks first: it can
-- tell the landlord which step is missing.
--
-- SAFE TO RE-RUN: the policy is dropped "if exists" before it's created.
-- seed.sql runs as postgres, which skips RLS, so seeding listings still
-- works.


-- ── The listings insert policy ──────────────────────────────────────
-- Both lookups below run as the caller and go through RLS, which works:
-- any signed-in user can read profiles ("profiles are viewable by
-- authenticated users", 0001), and a landlord can read their own
-- landlord_verifications rows (0008).
--
-- An upsert (insert ... on conflict do update) can't be used to get
-- around this: Postgres checks this policy on the row an upsert proposes
-- to insert, before it looks for a conflict.

drop policy if exists "landlords can insert their own listings" on public.listings;
create policy "landlords can insert their own listings"
  on public.listings for insert
  to authenticated
  with check (
    -- 1. Only under their own landlord_id (0001).
    auth.uid() = landlord_id

    -- 2. The caller is a landlord (0007) with a complete profile.
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
        and profiles.full_name <> ''
        and profiles.contact_number ~ '^[0-9]{11}$'
        -- At least one social media link that isn't blank. The regex
        -- looks for one character that ISN'T in this list: exactly the
        -- characters JavaScript's .trim() removes (space, tab, the line
        -- breaks, and the other Unicode spaces such as U+00A0 no-break
        -- space and U+3000 ideographic space). So this is the same test as
        -- `.trim() !== ""` in landlordProfileSchema. (Not '\S': what that
        -- counts as a space depends on the database's locale, and on this
        -- project it differs from .trim() for a couple of characters.)
        -- An empty (NULL) link never matches.
        and (
          profiles.facebook_url
            ~ '[^ \t\n\v\f\r   -     　﻿]'
          or profiles.instagram_url
            ~ '[^ \t\n\v\f\r   -     　﻿]'
          or profiles.x_url
            ~ '[^ \t\n\v\f\r   -     　﻿]'
        )
    )

    -- 3. The caller is verified: an admin approved one of their
    --    submissions (0008).
    and exists (
      select 1 from public.landlord_verifications
      where landlord_verifications.landlord_id = auth.uid()
        and landlord_verifications.status = 'approved'
    )
  );
