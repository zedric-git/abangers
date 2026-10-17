-- Abangers — Migration 0011: write the listings insert policy's
-- blank-character list as visible escapes (#216, follow-up to 0010 / #201)
--
-- WHY: 0010's listings insert policy decides whether a social media link
-- is blank with a regex that lists the characters JavaScript's .trim()
-- removes. That list was meant to be written as escapes like \u00a0, but
-- 0010 holds the raw characters (U+00A0, U+1680, U+2000-U+200A, U+2028,
-- U+2029, U+202F, U+205F, U+3000, U+FEFF), and so does the policy as
-- Postgres stored it. They work exactly like the escapes, but:
--   - the list looks like a few spaces, in the file and in the
--     dashboard's policy view;
--   - VS Code warns about "unusual line terminators" (U+2028 / U+2029)
--     and offers to remove them, which would quietly change the rule in
--     any copy of it. 0010 itself can't change: it's applied, and
--     scripts/check-migrations.mjs fails on edits. .vscode/settings.json
--     turns that prompt off for .sql files.
--
-- WHAT IT DOES: drops and recreates "landlords can insert their own
-- listings" with EXACTLY 0010's rule; only the way the list is written
-- changes, so nobody's access changes. No table, column or grant changes,
-- and the read, update and delete policies aren't touched. For what the
-- rule is and why, see 0010's header.
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
        and profiles.contact_number ~ '^[0-9]{11}$'
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
