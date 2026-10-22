---
name: new-migration
description: "Create a new Supabase migration file for Abangers with the correct next number and the required RLS, grants, role checks, and DB test. Use for any database schema change — new table, new column, policy change, storage bucket."
argument-hint: <short description, e.g. "add favorites table">
---

# Create a Supabase migration

Change: `$ARGUMENTS`. If it's unclear what the change is, ask first.

The migration should already be in the task's approved plan (AGENTS.md,
"Plan before you build"). If it isn't, or it differs from what the plan
says, update the plan on the issue and get the PM's approval before
writing it — a schema change affects the whole team.

The database is **one shared project for the whole team** — nothing in
this skill touches it except the read-only checks. CI tests the
migration on the PR and applies it to the shared project after the PR
merges (step 6, AGENTS.md "Database (Supabase)", #258).

## 1. Check the current state (read-only)

```bash
git fetch origin
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

The dry run should say nothing is pending. If something is pending,
**stop and tell the user**: either CI's `apply-database` job failed or
was off after a merge (its comment on that PR says why), or the shared
database has drifted from `supabase/migrations/` (see #172 for what that
looks like). Never run `supabase migration repair`, even if the CLI
suggests it.

Inspect what exists before changing it:

```bash
npx supabase db query --linked "select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name='<table>' order by ordinal_position;"
npx supabase db query --linked "select policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname='public' and tablename='<table>';"
```

## 2. Pick the number and filename

Next number = highest `NNNN_` prefix in `supabase/migrations/` **on
`origin/dev`** + 1, zero-padded to 4 digits. Also check open PRs for
another migration that might take the same number:

```bash
git ls-tree --name-only origin/dev supabase/migrations/
gh pr list --repo zedric-git/abangers --state open --search "migration"
```

Filename: `NNNN_<snake_case_description>.sql`. Numbers must be unique —
Supabase tracks migrations by number, so a duplicate is silently skipped.
If another open PR's migration takes a lower number and merges after
yours, the shared database won't apply it out of order: agree with that
PR's author who renumbers before either merges.

## 3. Write the migration

Start with a header comment explaining **why** (link the issue), and
whether it's safe to re-run. Then follow these rules from AGENTS.md:

- **Re-runnable:** `create table if not exists`, `add column if not exists`,
  `drop policy if exists` before `create policy`, `create or replace function`.
- **New table:** in the same file —
  1. `alter table ... enable row level security;`
  2. explicit policies per operation, scoped with `auth.uid()`
  3. `grant` only the privileges the policies allow, to `anon` /
     `authenticated` (no policy → no grant). Without grants every request
     fails with `42501` no matter how correct the policies are.
- **Role-restricted actions** (e.g. landlords only) must check the role,
  not just ownership:
  ```sql
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'landlord'
  )
  ```
- **Location data:** `latitude` / `longitude` columns, not just an address.
- **Never** edit a migration that's already on `origin/dev` — a hook
  blocks it. Write a new one instead.

Copy the patterns from `0001_init.sql` (policies),
`0002_grant_table_privileges.sql` (grants), and
`0007_enforce_roles_in_rls.sql` (role checks, triggers).

## 4. Add a DB test for every policy

Add cases to `src/__tests__/rls-<table>.db.test.ts` using the helpers in
`src/__tests__/db-helpers.ts` (seed accounts: two landlords, a renter).
Test both what's **allowed** and what's **blocked**. Tests must leave
shared data unchanged — use blocked writes, write current values back,
or clean up anything you create in the same test.

Don't run the new tests against the shared DB before merge: the
migration isn't there yet, and blocked-write tests would actually
change data. CI's `database` job runs them on the PR instead, on a
throwaway Supabase with your migration applied.

## 5. Update app code and docs

- Update `src/lib/validations/` Zod schemas if the shape changed.
- Don't regenerate `src/types/database.ts` yourself: CI commits it to
  the branch (step 6).
- Update `AGENTS.md` if a rule, convention, or known gap changed.
- Run `npm run check`.

## 6. What happens on the PR and after merge

Nothing to run by hand: don't `db push`, `db:types`, `db:seed` or
`test:db`, and don't put apply steps in the PR.

- **On the PR,** CI's `database` job applies every migration (yours
  included) to an empty throwaway Supabase, runs the seed twice and
  every DB test. If it fails, fix the migration or the test on the
  branch.
- **If `src/types/database.ts` changed,** the `database-types` job
  commits it to the branch, and CI runs again: `git pull` before
  pushing again.
- **After merge,** the `apply-database` job applies it to the shared
  project, re-runs the seed and the DB tests there, and comments on the
  PR. If the comment says something failed, tell the user and the PM:
  don't edit the merged migration, and never run
  `supabase migration repair`.
