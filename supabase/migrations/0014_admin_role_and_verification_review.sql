-- Abangers — Migration 0014: the admin role, and admins reviewing
-- landlord verifications (S2-11.1, #255 — part of S2-11, #207)
--
-- WHY: landlords verify their account by sending photos of a government ID
-- and a selfie (S1-15, #198). Each submission waits as pending until an
-- admin approves it (the landlord is then verified and can post listings,
-- 0012) or rejects it with a reason the landlord sees (#205). Until now
-- there was no admin: nobody could read another landlord's submission or
-- change its status from the app (0008, 0009). This adds the admin role and
-- exactly what an admin needs to review, enforced here in RLS. The admin
-- dashboard itself is S2-11.2 (#256).
--
-- WHAT IT DOES
--   1. profiles.role can be 'admin' too, but nobody can give themselves
--      that role from the app: a new profile can only be a renter's or a
--      landlord's, and 0007's trigger already stops anyone changing their
--      role. An admin is made with SQL only (section 1).
--   2. landlord_verifications gets reviewed_by: the admin who decided.
--   3. Admins can read every submission, and change a pending one to
--      approved or rejected, recording themselves as the reviewer. Only the
--      four review columns can change, and a reviewed submission can't be
--      changed again.
--   4. Admins can read every file in the private verification-documents
--      bucket (0009), which is what a short-lived signed link needs. They
--      still can't upload, replace or delete anything there.
--
-- WHAT STAYS THE SAME FOR LANDLORDS: they still submit their own pending
-- verification and read only their own, and they still can't approve,
-- edit or withdraw one. "Verified" still means "has an approved
-- submission", so an approval unlocks new listings (0012) and locks the
-- landlord's name (0008) straight away.
--
-- ERRORS THE APP WILL SEE (for the review action, #256):
--   42501  not allowed: not an admin, someone else as reviewed_by, a status
--          other than approved or rejected, no reviewed_at, or a column
--          other than the four review columns
--   23514  0008's rejection_reason_matches_status CHECK: a rejection
--          without a reason, or an approval with one
--   no error and no row back: the submission isn't pending any more (e.g.
--          another admin reviewed it first), or it doesn't exist
-- And 42501 when someone tries to create their profile as an admin.
--
-- SAFE TO RE-RUN: the CHECK and every policy are dropped "if exists"
-- before they're created, the column and the index use "if not exists",
-- and running a grant twice changes nothing.


-- ── 1. The admin role ───────────────────────────────────────────────
-- 0001 allowed only renter and landlord (a CHECK that Postgres named
-- profiles_role_check). Keep this list in sync with roleSchema in
-- src/lib/validations/auth.ts, which S2-11.2 (#256) gives 'admin' too.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('renter', 'landlord', 'admin'));

-- Nobody can make themselves an admin. 0001's insert policy only checked
-- that the new profile is the caller's own (auth.uid() = id), so once the
-- CHECK above allows 'admin', anyone could sign up and create their
-- profile as an admin. Now a profile created from the app can only be a
-- renter's or a landlord's: what sign-up offers (signUpWithProfile), and
-- what login recreates from the sign-up details when the row is missing
-- (resolvePostLoginPath). An upsert can't get around it: Postgres checks
-- this policy on the row an upsert proposes to insert (see 0010).
-- Changing a role is already blocked by 0007's trigger.
--
-- So an admin can only be made with SQL run as postgres, which skips RLS
-- and 0007's trigger: seed.sql (admin@abangers.test), or the SQL editor
-- in the Supabase dashboard, for an account that has already signed up:
--   update public.profiles set role = 'admin' where id = '<user id>';
drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (
    auth.uid() = id
    and role in ('renter', 'landlord')
  );


-- ── 2. Who reviewed a submission ────────────────────────────────────
-- reviewed_at (0008) says when; this says which admin. The review sets
-- both (section 3 makes sure it's the admin themselves), and both stay
-- empty while the submission is pending. If that admin's account is ever
-- deleted, reviewed_by becomes empty and the decision stays.
alter table public.landlord_verifications
  add column if not exists reviewed_by uuid
    references public.profiles (id) on delete set null;

-- So the foreign key is indexed, like landlord_id in 0008: deleting an
-- account looks up the submissions it reviewed by this column.
create index if not exists landlord_verifications_reviewed_by_idx
  on public.landlord_verifications (reviewed_by);

-- A landlord's new submission can't come with a reviewer either. 0008's
-- insert policy only accepts a fresh pending submission (no rejection
-- reason, no reviewed_at), and 0008's insert grant covers every column,
-- this new one included. So: the same policy, plus reviewed_by is null.
drop policy if exists "landlords can submit their own verification"
  on public.landlord_verifications;
create policy "landlords can submit their own verification"
  on public.landlord_verifications for insert
  to authenticated
  with check (
    landlord_id = auth.uid()
    -- Renters and admins don't verify. Same role check as 0007's listing
    -- policies.
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'landlord'
    )
    and status = 'pending'
    and rejection_reason is null
    and reviewed_at is null
    and reviewed_by is null
  );


-- ── 3. Admins review submissions ────────────────────────────────────
-- "Is the caller an admin?" is the same lookup as the landlord checks in
-- 0007 to 0013: any signed-in user can read profiles (0001), and only SQL
-- can make an admin (section 1).

-- Read: every submission. Landlords keep their own read policy (0008).
-- Postgres lets a row through when any one of the select policies does.
drop policy if exists "admins can read every verification"
  on public.landlord_verifications;
create policy "admins can read every verification"
  on public.landlord_verifications for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Review: approve or reject a submission that's still pending.
--   USING (which rows it can change): only pending ones, so a decision is
--     final. Taking one back isn't something the app does (#207's plan);
--     fix a mistake with SQL. Reviewing a submission that isn't pending
--     any more changes nothing and returns no row, which is how the app
--     notices that another admin got there first.
--   WITH CHECK (what the row becomes): approved or rejected, with the
--     admin themselves as reviewed_by, and reviewed_at set. The reason is
--     0008's rejection_reason_matches_status CHECK: a rejection needs one
--     the landlord can read, and an approval has none.
drop policy if exists "admins can review pending verifications"
  on public.landlord_verifications;
create policy "admins can review pending verifications"
  on public.landlord_verifications for update
  to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    status in ('approved', 'rejected')
    and reviewed_by = auth.uid()
    and reviewed_at is not null
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Grants: an update can only ever touch these four columns. The landlord,
-- the ID type, the file paths, the consent and when it was sent stay
-- exactly as the landlord submitted them, even for an admin: changing any
-- other column is "permission denied" (42501). Still no delete grant, and
-- still nothing at all for anon (0008).
--
-- The grant goes to authenticated, which landlords and renters are too:
-- Postgres can't grant something to admins only, because every signed-in
-- user is the same Postgres role. That's fine: the policy above is the
-- only update policy, and it only lets admins through. For anyone else an
-- update matches no rows and changes nothing (no error). Before this
-- migration it failed with 42501 instead (the DB tests say so).
grant update (status, rejection_reason, reviewed_at, reviewed_by)
  on public.landlord_verifications to authenticated;


-- ── 4. Admins can open the ID photos and selfies ────────────────────
-- In the private verification-documents bucket (0009), an admin can read
-- every file. That covers making a short-lived signed link (how the admin
-- dashboard shows them, #256), downloading and listing. Landlords keep
-- reading only their own folder (0009). Nothing else changes: only
-- landlords upload, only into their own folder, and nobody can replace,
-- move or delete a file from the app.
--
-- GRANTS: none needed, same as 0009. Supabase already grants
-- storage.objects to authenticated, and RLS is on for storage.objects, so
-- the policies are the only access there is.
drop policy if exists "admins can read every verification document"
  on storage.objects;
create policy "admins can read every verification document"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
