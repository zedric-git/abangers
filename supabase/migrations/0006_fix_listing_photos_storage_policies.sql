-- Abangers — Migration 0006: Lock down listing-photos storage policies
--
-- WHY: 0004_create_listing_photos_bucket.sql was applied by hand, and the
-- storage policies actually created on the shared project were different
-- from the ones in that file:
--
--   "Allow storage select listing-photos"  SELECT  to public
--   "Allow storage upload listing-photos"  INSERT  to public
--   "Allow storage delete listing-photos"  DELETE  to public
--
-- "public" includes anonymous visitors, so anyone holding the anon key
-- (which ships to every browser) could upload into or delete from the
-- listing-photos bucket. Even 0004's intended policies let any signed-in
-- user delete any other landlord's photos.
--
-- WHAT THIS DOES: replaces all of the above with one consistent set:
--   - read:   anyone (photos are shown on public listing pages)
--   - upload / replace / delete: signed-in users, ONLY inside their own
--     folder. ImageUploader.tsx already stores every photo at
--     "<user id>/<file name>", so the first folder in the path is the
--     owner's id.
--
-- SAFE TO RE-RUN: every policy is dropped "if exists" before it's created.


-- ── 1. Remove the hand-made policies and 0004's intended ones ────────
drop policy if exists "Allow storage select listing-photos" on storage.objects;
drop policy if exists "Allow storage upload listing-photos" on storage.objects;
drop policy if exists "Allow storage delete listing-photos" on storage.objects;

drop policy if exists "Listing photos are publicly accessible" on storage.objects;
drop policy if exists "Authenticated landlords can upload listing photos" on storage.objects;
drop policy if exists "Authenticated landlords can update listing photos" on storage.objects;
drop policy if exists "Authenticated landlords can delete listing photos" on storage.objects;


-- ── 2. Read: anyone ──────────────────────────────────────────────────
create policy "listing photos are viewable by everyone"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'listing-photos');


-- ── 3. Write: only into your own "<user id>/" folder ─────────────────
-- storage.foldername(name) splits "abc-123/photo.jpg" into {'abc-123'},
-- so [1] is the top-level folder, which must equal the caller's id.
create policy "users can upload photos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can replace photos in their own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can delete photos in their own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
