-- Abangers — Migration 0012: a new listing needs a PH mobile number on
-- the landlord's profile (#225, follow-up to 0010 / 0011 / #201)
--
-- WHY: the profile forms now show a fixed +63 and take only the 10 digits
-- after it (PhMobileNumberInput, #225). For a PH mobile number those 10
-- digits start with 9: +63 917 123 4567. The forms still save the number
-- the way they did before, in its local form: 0, then the same 10 digits
-- (09171234567). landlordProfileSchema in src/lib/validations/profile.ts
-- now accepts only that form, /^09\d{9}$/, so this policy has to check
-- the same thing: if the two disagree, landlords get errors the app can't
-- explain.
--
-- WHAT IT DOES: drops and recreates "landlords can insert their own
-- listings" with 0011's rule, except for the contact number:
--   0010 / 0011   contact_number ~ '^[0-9]{11}$'    any 11 digits
--   0012          contact_number ~ '^09[0-9]{9}$'   09, then 9 more digits
-- No table, column, grant or data changes, and the read, update and
-- delete policies aren't touched, so existing listings stay up and stay
-- editable. A saved number that starts with 09 still passes (the seed
-- landlords' do). A landlord whose number doesn't start with 09 can't
-- create a new listing until they save a mobile number on their Profile
-- page, which is what the app tells them (src/lib/auth/can-create-listings.ts).
--
-- THIS IS NOW THE CURRENT DEFINITION of the policy. To change the rule,
-- start a new migration from this one, and change landlordProfileSchema
-- in src/lib/validations/profile.ts in the same PR.
--
-- SAFE TO RE-RUN: the policy is dropped "if exists" before it's created.


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
        -- A PH mobile number, in the form the profile forms save it: 09,
        -- then 9 more digits (09171234567 for +63 917 123 4567). The same
        -- as landlordProfileSchema's /^09\d{9}$/. Before 0012, any 11
        -- digits.
        and profiles.contact_number ~ '^09[0-9]{9}$'
        -- At least one social media link that isn't blank. The regex
        -- looks for one character that ISN'T in this list, which is
        -- exactly the characters JavaScript's .trim() removes, so this is
        -- the same test as `.trim() !== ""` in landlordProfileSchema:
        --   (space)          space
        --   \t \n \v \f \r   tab, newline, vertical tab, form feed, return
        --   \u00a0           no-break space
        --   \u1680           Ogham space mark
        --   \u2000-\u200a    en quad ... hair space (11 fixed-width spaces)
        --   \u2028 \u2029    line separator, paragraph separator
        --   \u202f           narrow no-break space
        --   \u205f           medium mathematical space
        --   \u3000           ideographic space
        --   \ufeff           zero-width no-break space (byte order mark)
        -- Add any new character as a \uXXXX escape like these, never as
        -- the character itself: that's what made 0010's list invisible.
        -- (Not '\S': what that counts as a space depends on the database's
        -- locale, and on this project it differs from .trim() for a couple
        -- of characters.) An empty (NULL) link never matches.
        and (
          profiles.facebook_url
            ~ '[^ \t\n\v\f\r\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]'
          or profiles.instagram_url
            ~ '[^ \t\n\v\f\r\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]'
          or profiles.x_url
            ~ '[^ \t\n\v\f\r\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]'
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
