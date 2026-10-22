-- Abangers — Migration 0013: lock down the listing-photos bucket (#234)
--
-- WHY: a code audit (2026-10-22) found two holes in the public
-- listing-photos bucket:
--   - 0006's insert, update and delete policies only check that the file
--     is in the caller's own "<user id>/" folder, so renters could upload
--     too. That breaks AGENTS.md rule 1 ("if only one role should do
--     something, the policy must check the role"), and since the bucket is
--     public, anything uploaded there gets a public URL.
--   - The bucket had no file_size_limit and no allowed_mime_types (both
--     null), so any file of any size was accepted: an SVG (which can
--     contain scripts), a HEIC most browsers can't show, a 50 MB video.
--     ImageUploader promised "PNG, JPG, WEBP up to 10MB", but nothing
--     enforced it.
--
-- WHAT IT DOES
--   1. Bucket: stays public, now 10 MB per file, JPEG/PNG/WebP only (the
--      same file types as verification-documents in 0009).
--   2. Upload / replace / delete: landlords only, and still only inside
--      their own folder (0006's rule plus the role check from 0007/0009).
--   3. Read: unchanged, anyone (0006's "listing photos are viewable by
--      everyone"). Listing pages show the photos to anonymous visitors.
--
-- The limits only apply to new uploads. The 33 files already in the
-- bucket (October 2026) are all JPEG, PNG or WebP, the biggest 5.2 MB,
-- all in landlords' folders, so none of them are affected.
--
-- ERRORS THE APP WILL SEE (error.statusCode from supabase.storage, a
-- string — not error.status, which is always 400; see AGENTS.md, #213):
--   403  not allowed: not a landlord, or not their own folder
--   413  the file is over 10 MB
--   415  not a JPEG, PNG or WebP
--
-- GRANTS: none needed, same as 0006 and 0009. Supabase already grants
-- storage.objects to anon and authenticated, and RLS is on for
-- storage.objects, so the policies are the only access there is.
--
-- SAFE TO RE-RUN: the bucket is an upsert ("on conflict ... do update",
-- which also undoes any edits made in the dashboard), and every policy is
-- dropped "if exists" before it's created.


-- ── 1. The bucket ───────────────────────────────────────────────────
-- Keep the size limit and the file types in sync with
-- src/lib/listing-photo.ts (LISTING_PHOTO_MAX_BYTES, LISTING_PHOTO_TYPES),
-- which ImageUploader checks before it uploads anything.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,        -- public: listing pages show the photos by URL
  10485760,    -- 10 MB = 10 * 1024 * 1024 bytes
  -- Not 'image/*': that would also allow SVG (which can contain scripts)
  -- and HEIC/TIFF (which most browsers can't show).
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ── 2. Write: landlords only, only in their own "<user id>/" folder ──
-- Same names as 0006, so these replace its policies. storage.foldername()
-- splits "abc-123/photo.jpg" into {'abc-123'}, so [1] is the top-level
-- folder, which must equal the caller's id. The role check is the same
-- as 0007's listing policies and 0009's verification-documents upload.
drop policy if exists "users can upload photos to their own folder"
  on storage.objects;
create policy "users can upload photos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    -- Renters don't post listings, so they don't upload listing photos.
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
  );

-- Replacing a file (upload with upsert: true, or update()). Both the old
-- file (using) and the new one (with check) must be the landlord's own.
drop policy if exists "users can replace photos in their own folder"
  on storage.objects;
create policy "users can replace photos in their own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
  )
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
  );

drop policy if exists "users can delete photos in their own folder"
  on storage.objects;
create policy "users can delete photos in their own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
  );


-- ── 3. Read: anyone, unchanged ──────────────────────────────────────
-- 0006's "listing photos are viewable by everyone" (select, to anon and
-- authenticated) stays as it is.
