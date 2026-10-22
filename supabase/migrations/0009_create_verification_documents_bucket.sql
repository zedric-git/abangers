-- Abangers — Migration 0009: private verification-documents storage bucket
-- (S1-15.2, #200 — part of S1-15, #198)
--
-- WHY: landlords verify their account with a government ID (front and
-- back; for a passport, only the photo page) and a live selfie. Those
-- photos are personal data, so they get their own PRIVATE bucket: unlike
-- listing-photos (0004/0006), nothing in it can be opened by URL alone.
-- The app opens a file only through a short-lived signed link (the
-- landlord now, the admin review in Sprint 2, #207).
--
-- WHAT IT DOES
--   1. Creates the bucket: private, 5 MB per file, JPEG/PNG/WebP only.
--   2. Lets a landlord upload files, only into their own folder.
--   3. Lets a signed-in user read files, only in their own folder.
--   4. Nothing else: no update or delete policy, so once a file is
--      uploaded it can't be replaced, moved or removed from the app.
--
-- FOLDER LAYOUT (for the submit action, #204): one folder per submission,
--   <landlord id>/<submission id>/id-front.jpg
--   <landlord id>/<submission id>/id-back.jpg    (not for a passport)
--   <landlord id>/<submission id>/selfie.jpg
-- <submission id> is a new UUID the app makes and then uses as the
-- landlord_verifications row's id (0008). A resubmission after a
-- rejection gets a new folder, so it never touches the rejected
-- submission's files — and even a reused path couldn't replace a file
-- (section 4).
--
-- ERRORS THE APP WILL SEE (error.status from supabase.storage, #204):
--   403  not allowed: not a landlord, someone else's folder, no folder,
--        or trying to replace an existing file (upsert)
--   409  a file already exists at that path
--   413  the file is over 5 MB
--   415  not a JPEG, PNG or WebP
--
-- GRANTS: none needed. Supabase already grants storage.objects to anon
-- and authenticated, and RLS is on for storage.objects, so the policies
-- below are the only access there is — same as listing-photos in 0006.
--
-- SAFE TO RE-RUN: the bucket is an upsert ("on conflict ... do update",
-- which also undoes any edits made in the dashboard), and every policy is
-- dropped "if exists" before it's created.


-- ── 1. The bucket ───────────────────────────────────────────────────
-- Keep the size limit and the file types in sync with the submit form's
-- Zod schema (#204).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,       -- private: no public URLs
  5242880,     -- 5 MB = 5 * 1024 * 1024 bytes
  -- Not 'image/*': that would also allow SVG (which can contain scripts)
  -- and HEIC/TIFF (which most browsers can't show the admin).
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ── 2. Upload: landlords only, only into their own folder ───────────
-- storage.foldername(name) splits 'abc-123/sub-1/selfie.jpg' into
-- {'abc-123','sub-1'}, so [1] is the top-level folder, which must equal
-- the caller's id (same rule as listing-photos in 0006). It accepts
-- exactly the paths 0008's files_in_landlords_own_folder CHECK accepts
-- (every path starts with '<landlord id>/'), so a submission can only
-- point at files in the landlord's own folder, and only that landlord
-- can put files there. A file at the bucket root (no folder) fails both.
drop policy if exists "landlords can upload verification documents to their own folder"
  on storage.objects;
create policy "landlords can upload verification documents to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    -- Renters don't verify. Same role check as 0007 and 0008.
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
  );


-- ── 3. Read: only your own folder ───────────────────────────────────
-- Covers downloading, creating a signed link, and listing. No role check,
-- same as landlord_verifications' read policy in 0008: only landlords can
-- upload here, so anyone else's folder is always empty. Admins get their
-- own read policy in Sprint 2 (#207).
drop policy if exists "landlords can read verification documents in their own folder"
  on storage.objects;
create policy "landlords can read verification documents in their own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ── 4. No update or delete policy, on purpose ───────────────────────
-- Unlike listing-photos, a landlord can't overwrite (upsert), move or
-- remove a file once it's uploaded. While an admin reviews a submission,
-- its photos stay exactly as submitted, and a rejected submission's files
-- stay next to its row as history.
--
-- The catch: if the uploads succeed but saving the submission row then
-- fails, those files stay in the landlord's folder. The submit action
-- (#204) should check everything (including that the landlord isn't
-- already Pending or Verified) before it uploads anything.
