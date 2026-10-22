<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Abangers — project context

Context for any AI coding assistant (Claude Code, Cursor, Copilot, etc.)
working in this repo. Read this before making changes — and make none
until your plan is approved (see "Plan before you build").

**Keep this file true.** If your change makes anything in this file
wrong (a rule, a convention, a file path, a known gap), update it in
the same PR. This file holds rules and conventions, not progress — for
what's built and what's next, check the project board and the code
itself; don't infer status from this file.

## What this project is

Abangers ("abang" = rent in Bisaya; Abangers = the renters) — a web app
where renters (students/workers) search boarding house listings, and
landlords post/manage them. School team project, 3-person team, MVP
due Week 8:

- Zedric Camilotes (`@zedric-git`) — Project Manager
- EJ Kate Alcover (`@ejkatealcover`) — co-developer
- Chielsea Napoles (`@chilsi-n`) — co-developer

Task tracking lives on the GitHub Project board:
https://github.com/users/zedric-git/projects/3

## Stack

- Next.js (App Router), TypeScript strict, `src/` directory
- Tailwind CSS + shadcn/ui (components are copied into `src/components/ui`,
  not an npm dependency — add new ones with `npx shadcn add <name>`)
- Supabase: Postgres + Auth + Storage (see `src/lib/supabase/`). CLI is a
  local devDependency, not global — always run it as `npx supabase <cmd>`.
- React Hook Form + Zod for forms (`src/lib/validations/`)
- Maps/location: OpenStreetMap (see "Maps and location" below)
- npm (not yarn/pnpm — keep `package-lock.json` as the lockfile)

## Known gotchas (things that look like bugs but aren't)

- **Auth middleware lives in `src/proxy.ts`, not `src/middleware.ts`.**
  Next.js 16 renamed this file convention. If you see `middleware.ts`
  anywhere or a teammate re-creates one out of habit, that's the old
  name — it will be silently ignored, not error, so sessions can quietly
  stop refreshing. Rename it back to `proxy.ts` with
  `npx @next/codemod@canary middleware-to-proxy .`
- **CI runs `npx next typegen` before `tsc --noEmit`.** Next.js
  auto-generates some types (e.g. `LayoutProps`) that only exist after
  running `next dev`/`next build`/`next typegen` at least once. Don't
  remove that step from `.github/workflows/ci.yml` or the type check
  will fail on a clean checkout even when it passes on your machine.
- **Migration numbers must be unique — Supabase tracks migrations by the
  number prefix, not the full filename.** Two files with the same number
  means the second is silently treated as already applied (this
  happened once — see #172, fixed by `0005`). Number new migrations
  from the highest number on `dev` + 1, and never run migration SQL by
  hand in the Supabase dashboard: that's how `0003`/`0004` drifted from
  what's recorded. `scripts/check-migrations.mjs` (part of
  `npm run check` and CI) fails on duplicate numbers and on any edit,
  rename, or delete of a migration that's already on the base branch.
  After merge, CI's `apply-database` job checks the shared database
  first and stops, changing nothing, if it has a migration `dev`
  doesn't (see "Database (Supabase)").
- **Only three files in `supabase/.temp/` are committed, on purpose.**
  `project-ref`, `linked-project.json` and `pooler-url` are what
  `npx supabase link` saves for the shared project, so every clone and
  worktree starts out linked to it (#211). The rest of the folder is
  the CLI's cache, which it rewrites by itself (`cli-latest`, the
  `*-version` files), so `.gitignore` ignores it. Don't ignore the
  whole folder — every new worktree would then need
  `npx supabase link` first. If `git status` ever shows `project-ref`
  as changed, someone linked a different project: don't commit it.
  CI's `apply-database` job reads `project-ref` and `pooler-url` too,
  to reach the shared project.
- **`supabase/config.toml` is only for CI's throwaway Supabase.** The
  `database` job in `.github/workflows/ci.yml` runs `npx supabase start`
  (Docker), which needs it. It doesn't configure the shared project;
  the Supabase dashboard does. Never run `supabase config push`: it
  would copy CI's settings (local URLs, raised rate limits, services
  turned off) over the shared project's. `.claude/settings.json` blocks
  it. Keep `[db] major_version` the same as the shared project's
  Postgres (17).
- **CI builds with placeholder Supabase env vars.** The `Build` step in
  `.github/workflows/ci.yml` has no real keys, which works because no
  page fetches data at build time. If a build fails there with a
  Supabase/network error, make that page dynamic — don't add real keys
  to CI.
- **The database schema is the source of truth for types.**
  `src/types/database.ts` is generated from the migrations — never edit
  it by hand, and you don't need to regenerate it either. On every PR,
  CI's `database` job regenerates it with `npm run db:types`
  (`scripts/db-types.mjs`, which needs the throwaway Supabase that job
  starts, so it doesn't run on our own machines). When the file
  changed, the `database-types` job commits it to the PR's branch as
  the types bot, and CI runs again on that commit: run `git pull`
  before you push again (#258). `gen types --local` leaves out the
  `__InternalSupabase` block (the shared project's PostgREST version,
  which supabase-js types queries against), so the script keeps the
  committed one. All three Supabase clients in
  `src/lib/supabase/` are typed with it, so a query on a column that
  doesn't exist is a type error. Don't write table types by hand —
  derive them (e.g. `Listing` in `src/types/listing.ts` is the
  generated `listings` row). Rows use `null` for empty columns; convert
  with `listingRowToFormValues` before passing to the listing form or
  `ListingDetailView`.
- **Landlord verification lives in `landlord_verifications`, not
  `profiles`.** Any signed-in user can read `profiles` and landlords can
  edit it, so a status column there would be public and self-approvable.
  Each submission is a row ("verified" = the landlord has an `approved`
  row); landlords can only insert their own pending rows and read their
  own — no update or delete (`0008_create_landlord_verifications.sql`).
  The ID photos and selfie go in the private `verification-documents`
  bucket (`0009`), one folder per submission
  (`<landlord id>/<submission id>/<file>`): landlords can upload to and
  read only their own folder, and can't replace or delete a file, so a
  resubmission always uploads to a new folder.
  Submit with `submitVerification` (`src/lib/auth/submit-verification.ts`,
  #204): it checks the form (`verificationSubmissionSchema`) and that the
  landlord isn't already Pending or Verified, uploads the photos straight
  from the browser, and only then saves the row. Never save the row
  before the photos (a pending row can't be fixed or withdrawn), and
  don't send the photos through a server action: Next caps those at 1 MB.
  The selfie comes from `SelfieCamera` (`src/components/SelfieCamera.tsx`,
  #202): the live front camera only, with no file picker, so an old
  photo can't be uploaded. `compressImage` (`src/lib/compress-image.ts`)
  makes it a JPEG of at most 1 MB before it's handed over as a `File`;
  compress the ID photos with it too.
  Once a landlord is verified, a trigger rejects any change to
  `profiles.full_name` with `42501`; saving the same name back is fine
  (the profile form upserts it on every save).
  Only a verified landlord with a complete profile can create a listing
  (editing existing ones doesn't need it): the listings insert policy
  (`0010`, now defined in `0012`) enforces it, and `createListingAction`
  checks first with `src/lib/auth/can-create-listings.ts` to say which
  step is missing.
  The new-listing page checks the same thing on the server and shows a
  checklist of the missing steps instead of the form (#205): link to it
  with `AddListingButton`, which shows a lock until then, and read where
  a landlord stands (for the dashboard's banner, the Profile badge and
  the read-only name) with `loadLandlordStatus` in
  `src/lib/auth/landlord-status.ts`.
  "Complete" is `landlordProfileSchema` in `src/lib/validations/profile.ts`
  (a name, a PH mobile number, one social link), not the
  `profile_completed` flag, which landlords can set themselves — change
  the schema and the policy together.
  The profile forms show the number as a fixed +63 and the 10 digits
  after it (`src/components/PhMobileNumberInput.tsx`), but save it as
  `09` + 9 digits (`09171234567`), which is what the schema and the
  policy check; `src/lib/ph-mobile-number.ts` converts between the two.
- **Storage errors arrive as HTTP 400 — read `error.statusCode`, not
  `error.status`.** Supabase Storage answers every refused request with
  status 400 and puts the real code in the response body, which
  supabase-js exposes as `error.statusCode` (a string): `"403"` not
  allowed (RLS), `"409"` the file already exists, `"413"` too big,
  `"415"` wrong file type (#213). `0009`'s header comment says
  `error.status`; it's already applied, so it can't be fixed there.
- **The camera only works on https or localhost.** Browsers give the
  camera (`SelfieCamera`) and `crypto.randomUUID()` (`submitVerification`)
  only to secure pages, and `http://localhost` counts as one. A phone
  opening `http://<your PC's IP>:3000` doesn't: the dev server blocks
  its scripts unless `allowedDevOrigins` lists that address, and even
  then the selfie step says "This browser can't open the camera". To
  test on an Android phone, turn on USB debugging (Developer options),
  plug it into your PC, open `chrome://inspect/#devices` in Chrome on
  the PC, and add a port forwarding rule from `3000` to
  `localhost:3000`. Then open `http://localhost:3000` in Chrome on the
  phone. An iPhone needs real https.
- **`/dashboard/*` and `/profile-setup` are guarded in the proxy, and
  logout must be a hard navigation.** `updateSession` in
  `src/lib/supabase/middleware.ts` sends signed-out users to the home
  page (`/`), keeps each role on its own dashboard (via
  `resolvePostLoginPath`), and lets only landlords open `/profile-setup`
  (#233). The decision is `guardRedirect` in
  `src/lib/auth/route-guard.ts`; guard a new page there. Logout uses
  `window.location.replace(...)`, not `router.push` — a client-side
  push leaves the dashboard in history and Next's client cache, so the
  Back button would show it again after logging out. Even so, pages
  visited before the logout stay in the history, and Back can show the
  browser's own copy of one without asking the server (it did in
  `next dev`, #252). `SignedInOnly` (`src/components/SignedInOnly.tsx`)
  sends a signed-out browser home from such a copy: the landlord layout
  and `/profile-setup` render it, and any new page that shows a
  signed-in user's data outside them (e.g. the renter dashboard's
  layout) should too.
- **There are no `/login` or `/signup` pages.** Login and sign-up both
  happen in `src/components/LandlordAuthModal.tsx`, opened from the home
  page. The old `/login` and `/signup` URLs redirect to `/` (see
  `redirects()` in `next.config.ts`) so they never show a 404 — if you
  remove or rename any other page, add a redirect the same way. Nobody
  should ever see a 404 page (#244): any other URL the app doesn't have
  goes home through `src/app/not-found.tsx`, and a page whose record
  isn't there (deleted, someone else's, a bad id) redirects to its list
  with a note instead of calling `notFound()` — see the listing pages
  and `lookupListing` in `src/lib/listing-lookup.ts`, which also keeps
  a failed query from being shown as "not found". Anything
  that needs a signed-out user to log in should send them to `/`. The
  logic lives in shared helpers — validation (`loginSchema` /
  `signUpSchema` in `src/lib/validations/auth.ts`), sign-up
  (`signUpWithProfile` in `src/lib/auth/sign-up.ts`) and post-login
  routing (`resolvePostLoginPath` in `src/lib/auth/post-login.ts`). Renter
  sign-up (Sprint 2) should extend the modal with those helpers rather
  than bring back a second auth form.
- **Write invisible characters as escapes, never raw.** A no-break
  space, a zero-width space, a byte order mark, a text-direction mark
  and the like look like a normal space, or like nothing at all, in an
  editor and in a PR diff, so nobody can review them. When code needs
  one (a test input, a regex that strips them), write it as an escape:
  `\u00A0` in JS/TS strings and regexes and inside a Postgres regex,
  `E'\u00A0'` elsewhere in SQL. AI tools sometimes write the raw
  character when they meant the escape; that's how `0010` got a regex
  nobody could read (#216). `scripts/check-invisible-chars.mjs` (part
  of `npm run check` and CI) fails on them in every file git tracks,
  and in new files not yet added, naming the file, line and column. The
  full list of characters is at its top. It skips binary files,
  `package-lock.json`, and `0010` (applied, so it can't change; `0011`
  recreates its policy with escapes). Visible non-ASCII is fine: em
  dashes, arrows, `₱`, full-width digits, emoji.
- **Branch flow: `feature/*` → `dev` → `main`.** See "Branching strategy"
  below for the full rules and sprint schedule.

## Plan before you build

**Every implementation starts with a written plan — the design and the
approach — and no code is written until the PM (`@zedric-git`) has
approved it.** That covers features, bug fixes, refactors, migrations,
config and docs changes, for everyone on the team and every AI
assistant. (Answering questions, reviewing code and running checks
aren't implementation, so they don't need a plan.) A plan is cheap to
change and code isn't: reviewing the plan first catches a wrong
approach, a missing RLS policy, or a clash with a teammate's task
before anyone builds it.

1. **Post the plan as a comment on the issue** before your first
   commit, using the template below. No issue for the work yet (e.g. a
   bug you just found)? Open one first — every task is an issue anyway.
2. **Wait for the PM's approval:** a 👍 reaction on the plan comment or
   a reply approving it. If the PM asks for changes, update the plan
   and wait again. When the PM is the one building it, the plan still
   goes on the issue before any code.
3. **Build what the plan says.** If the approach or scope has to change
   partway (a different design, a migration you didn't plan, work in
   files the plan doesn't mention), stop, update the plan on the issue,
   and get it approved again before carrying on. Smaller differences
   just get listed in the PR.
4. **Link the plan in the PR**, along with anything you built
   differently (the PR template has a section for this).

Size the plan to the task: a one-line fix needs only Goal, Files and
Testing, in a few lines; a feature needs every section.

```markdown
## Plan

**Goal:** what the issue asks, in your own words, and how we'll know it's done.

**Design**

- UI: screens and components, their states (loading, empty, error), mockup link
- Data: tables and columns touched; new migration? RLS + grants + role check
- Validation: which Zod schema in `src/lib/validations/` (new or existing)

**Files:** what you'll add or change, and which need `"use client"` (and why).

**Risks / questions:** anything unclear, or that needs a team decision.

**Testing:** unit tests, `*.db.test.ts` cases, what you'll check in the browser.

**Out of scope:** what this deliberately won't do.
```

**AI assistants:** your first output on a task is the plan, not an
edit. Read the issue and the code, then show the plan to the person
you're working with and wait for their explicit go-ahead before you
edit files, create a branch, or post anything. With their OK, post it
on the issue and wait for the PM's approval — if you're working with
the PM, their go-ahead in chat is that approval (still post the plan
before building). If the plan stops fitting mid-build, stop and say
so; never quietly build something different from what was approved.
In Claude Code, `/start-task` walks through all of this.

## Non-negotiable rules

1. **Every new Supabase table gets Row Level Security AND explicit
   grants.** No exceptions. In the same migration that creates the table:
   - `ENABLE ROW LEVEL SECURITY` plus explicit policies (deny by
     default, then allow specific operations scoped to `auth.uid()`) —
     see `supabase/migrations/0001_init.sql` for the pattern.
   - `GRANT` the matching table privileges to `anon` / `authenticated`
     — see `supabase/migrations/0002_grant_table_privileges.sql`. RLS
     only filters rows a role can already reach; without the grant,
     every app request fails with `permission denied for table ...`
     (Postgres 42501) no matter how correct the policies are. Grant
     only what the policies allow (no policy → no grant).
   - **If only one role should do something, the policy must check the
     role**, not just ownership — e.g. listing writes require
     `exists (select 1 from profiles where id = auth.uid() and role =
'landlord')` (see `0007_enforce_roles_in_rls.sql`). Checking only
     `auth.uid() = owner_id` let renters create listings (#173).
     `profiles.role` can't be changed by app users once set (trigger in
     the same migration).
   - Add a `*.db.test.ts` case for each policy (see
     `src/__tests__/rls-listings.db.test.ts` and `db-helpers.ts`).
2. **One Zod schema per data entity, used on both client and server.**
   Don't validate the same shape twice with different rules. Put schemas
   in `src/lib/validations/`.
3. **Never use the Supabase service role key in code that ships to the
   browser.** Only `NEXT_PUBLIC_SUPABASE_ANON_KEY` belongs in Client
   Components. If a task seems to need the service key, stop and ask —
   it usually means the task should go through RLS instead.
4. **Server Components by default.** Only add `"use client"` when a file
   genuinely needs interactivity (state, effects, event handlers, form
   libraries). Don't reflexively add it to every file.
5. Match the existing folder structure — grouped by role, not feature:
   - `src/app/` — routes only (App Router)
   - `src/components/ui/` — shadcn primitives (don't hand-edit unless
     necessary; prefer re-running the CLI)
   - `src/components/` (other subfolders) — shared, composed components
   - `src/lib/supabase/` — the two Supabase client factories + session
     refresh helper (wired up via `src/proxy.ts`)
   - `src/lib/validations/` — Zod schemas
   - `supabase/migrations/` — SQL migrations, sequentially numbered
   - `supabase/seed.sql` — dev test accounts + sample listings
   - `supabase/seed-storage.mjs` + `supabase/seed-storage/` — uploads
     the seed data's sample files (placeholder ID photos) to Storage
   - `supabase/config.toml` — settings for CI's throwaway Supabase only
   - `scripts/` — repo checks run by `npm run check` and CI, and the
     scripts CI's database jobs run (`db-types.mjs`,
     `report-database-apply.mjs`): plain Node `.mjs`, no dependencies,
     plus their unit tests
   - `.vscode/` — shared editor settings + recommended extensions
     (the team uses VS Code; personal settings stay in your user
     settings)

## Branching strategy

Three-tier flow: `feature/*` → `dev` → `main`.

- **`feature/*` branches** — where actual development happens. One
  branch per feature/task, cut from the current `dev`. Naming:
  `feature/<short-description>` (e.g. `feature/listing-search-filters`).
  The same flow applies to non-feature work with a different prefix:
  `fix/<bug>`, `chore/<tooling-or-data>`, `docs/<what>`.
  Open a PR into `dev` when ready; needs a passing CI check to merge.
  Delete the branch after it merges.
- **`dev` branch** — the repo's **default branch** and the integration
  branch for the sprint currently in progress. All `feature/*` branches
  merge here first. This is where we test and stabilize everything the
  sprint is supposed to ship. Nothing goes to `main` directly from a
  feature branch. **Protected for everyone, including admins:** changes
  need a PR whose `checks` and `database` CI runs pass (no approval
  required); no direct pushes, force-pushes, or deleting the branch.
- **`main` branch** — protected, always reflects the last stable,
  exam-ready state. `dev` only merges into `main` once every feature for
  the sprint is done and `dev` itself is stable (build/lint/tests all
  green). Pushes must go through a PR with a passing CI check — no
  direct pushes, even from the PM's own machine.

### Sprint schedule

Three sprints, timed against the exam calendar. `dev` merges to `main`
right after each exam window closes:

| Sprint   | Covers                | Ends at                   | `dev` → `main` merge |
| -------- | --------------------- | ------------------------- | -------------------- |
| Sprint 1 | Now → Midterms        | Midterm Exams (Oct 5–10)  | After Oct 10         |
| Sprint 2 | Midterms → Pre-Finals | Pre-Final Exams (Nov 5–7) | After Nov 7          |
| Sprint 3 | Pre-Finals → Finals   | Final Exams (Dec 4–11)    | After Dec 11         |

If a sprint's features aren't all done and stable on `dev` by its exam
window, that's a signal to descope for `main` rather than merge
something half-working — cut the feature branch loose and pick it up
next sprint instead of forcing the merge.

## Issues and PRs

- Every task is a GitHub issue on the project board, titled with its
  sprint ID: `[S<sprint>-<story>] ...` for user stories (e.g.
  `[S1-02] As a registered user, I want to log in ...`) and
  `[S<sprint>-<story>.<task>] ...` for the sub-issues under them (e.g.
  `[S1-02.1] Build login form UI`).
- **Every task's plan is a comment on its issue**, approved by the PM
  before any code is written (see "Plan before you build"). The PR
  links to it.
- Board statuses: `Product Backlog` / `Sprint N Backlog` (stories) →
  `Todo` → `In Progress` → `Code Review` → `Done`.
- **Every PR description must say `Closes #<issue>`** for each task it
  finishes. Because `dev` is the default branch, merging the PR closes
  those issues and moves their board cards to Done automatically. (If
  an issue was finished without a `Closes #` line, close it by hand:
  `gh issue close <n> --comment "Fixed by #<pr>"`.)

## Database (Supabase)

- **There is one shared, hosted Supabase project** for the whole team.
  There's no local Supabase/Docker setup on our own machines — the CLI
  is linked straight to the shared project (`npx supabase link`).
  Anything you do to the database affects everyone immediately. (CI
  starts a throwaway Supabase of its own to test migrations, below.)
- **Schema changes only go through new migration files** in
  `supabase/migrations/` (next number in sequence). CI applies them to
  the shared project after the PR merges (below): don't
  `npx supabase db push` them yourself. Never edit a migration that's
  already on `dev` — write a new one.
- **CI tests a PR's migrations, then applies them after merge (#258).**
  You write the migration and merge the PR; nobody runs `db push`,
  `db:seed`, `db:types` or `test:db` by hand, or has to tell the team.
  - On every PR, the `database` job starts a throwaway Supabase on the
    CI machine (`npx supabase start`, settings in `supabase/config.toml`),
    applies every migration to an empty database, runs the seed twice
    (it must be safe to re-run) and every `*.db.test.ts` suite, and
    checks the types (see "The database schema is the source of truth
    for types").
  - After a PR that changes `supabase/migrations/`, `seed.sql`,
    `seed-storage.mjs` or `seed-storage/` merges into `dev`, the
    `apply-database` job applies it to the shared project, one run at a
    time and only once `checks` and `database` passed on that commit:
    `db push --dry-run`, then `db push`, the seed and `test:db`. It
    comments on the merged PR with what was applied, and @-mentions the
    team, or with which step failed and what to do next.
  - **When it fails**, read its comment. A failing migration applies
    nothing (each one runs in a transaction), and `db push` stops there,
    so a new migration can't jump ahead of it: the PM decides the fix,
    usually correcting the rows the migration rejects, then "Re-run
    failed jobs" on that run. Don't edit or delete the merged migration.
    **Never run `supabase migration repair`**, which the CLI suggests
    when the shared database has a migration `dev` doesn't: that's drift
    to fix, not to hide.
  - The repo variable `DB_AUTO_APPLY` turns the job on (`true`); any
    other value stops it applying after merges. "Run workflow" on the
    CI workflow, on `dev`, shows what's pending on the shared project
    without changing it, or applies it with "apply" ticked.
- **The shared project's credentials are in the `shared-db` environment**
  (Settings → Environments), which only jobs on `dev` can use: a PR's
  workflow, even from a fork, can never read them. The PM set it up
  once:
  1. **The environment:** deployment branch `dev` only (set that before
     adding secrets), with the secrets `SUPABASE_DB_PASSWORD` (the
     database password; the job connects with `--db-url`, built from
     `supabase/.temp/pooler-url`, so it needs no personal access token)
     and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  2. **The types bot:** a GitHub App on the PM's account that can only
     write this repo's contents. Its `DB_BOT_APP_ID` (a variable) and
     `DB_BOT_PRIVATE_KEY` (a secret) are repo-level, because PR runs
     need them. A commit pushed with the workflow's own token wouldn't
     start CI, so the required checks would never run on it.
  3. **Then:** `DB_AUTO_APPLY` set to `true`, and `database` required on
     `dev` and `main` (Settings → Branches), next to `checks`.
- **`npx supabase db reset --linked` wipes the shared database for the
  whole team** (all accounts and listings), then re-applies migrations
  and runs `supabase/seed.sql` (run `npm run db:seed` after it for the
  sample files). Never run it without asking the team first.
- **`supabase/seed.sql` must stay idempotent** (safe to re-run with
  `npm run db:seed`): CI runs it twice on every PR, and again on the
  shared project after every database merge. Seed accounts are matched
  by email and seed listings by fixed UUID, with
  `on conflict ... do update`. Follow that
  pattern for any new seed data — no plain `INSERT`s that duplicate on
  a second run. Seed credentials are dev-only; the shared password is in
  the file header.
- **Seed landlords: landlord1 is verified, landlord2 isn't** (#206).
  Both have a complete profile; landlord1 also has an approved
  verification with sample ID photos, so only landlord1 can create
  listings. The DB tests rely on both, so try the verification flow on
  landlord2, then re-run `npm run db:seed`: it deletes every other
  verification the two seed landlords have. Each landlord has three seed
  listings that fill in everything the listing form requires, so they
  open in Edit and pass Preview as they are (#243). SQL can't upload
  files, so `npm run db:seed` runs `supabase/seed-storage.mjs` after
  `seed.sql`. It signs in as landlord1 and then landlord2 with the anon
  key (needs `.env.local`), uploads landlord1's sample ID photos and
  each landlord's sample listing photo (to
  `<landlord id>/seed/listing-sample.jpg`), and sets that photo as the
  photo and cover of their seed listings. It skips files that are
  already there. Running the seed resets the seed listings for everyone,
  photos included, and CI runs it after every database merge. Put only
  placeholder images in `supabase/seed-storage/`, never a real ID or
  photo.
- Supabase Auth only stores email/password. App fields (role, name)
  live in `public.profiles`, one row per `auth.users` row, same `id`.

## Maps and location (OpenStreetMap)

**Decision:** OpenStreetMap (OSM) is the map and location provider for
this project. Don't introduce Google Maps, Mapbox, or any other
map/geocoding provider without asking the team.

**Library:** Leaflet + `react-leaflet` with OSM tiles. Existing map
components live in `src/components/map/` (`LocationPicker` is used by
the add/edit listing form, `ReadOnlyMap` by the listing detail view;
both are loaded through `DynamicMap` without SSR). Reuse these before
writing new map code.

**Scope beyond that is not decided** (listing pins on search results,
directions, search by area or distance). Don't assume a scope — check
the relevant issue/backlog item or ask before building new map
features.

Constraints that come with OSM (keep these in mind when building):

- **Attribution is required.** Any OSM-based map must show
  "© OpenStreetMap contributors".
- **Public OSM services have usage policies.** The free tile server
  and Nominatim (geocoding) are for light use: no bulk requests, no
  search-as-you-type against Nominatim, max ~1 request/second. If a
  feature needs more, ask before adding a paid/hosted provider.
- **Store coordinates, not just addresses.** `listings` already has
  `latitude` / `longitude` columns (`0001_init.sql`). Any new table that
  needs a location should do the same (via a new migration, with RLS +
  grants like any other change).
- **Client-only rendering.** Leaflet touches `window`, so map
  components must be Client Components and loaded without SSR
  (`"use client"` + `next/dynamic` with `ssr: false`). Keep them in a
  dedicated `src/components/map/` folder.

## Known gaps

Problems in the code that aren't obvious from reading it. This is not a
progress list — for what's done or still a stub, check the project
board and the code. Each entry should link a tracking issue; delete the
entry in the PR that closes it.

- **Email confirmation is off in Supabase, and untested with it on.**
  Sign-up saves `role` / `full_name` in auth user metadata, and
  `src/lib/auth/post-login.ts` recreates a missing `profiles` row from
  it on login (#170), so turning "Confirm email" on _should_ work — but
  test sign-up → confirm → login for both roles before enabling it.

## Commands

- **`npm run check` — run this before saying a change is done.** It's
  everything CI's `checks` job runs except the production build:
  `next typegen`, `tsc --noEmit`, ESLint, Prettier check, the migration
  check, the invisible-character check, and the unit tests. (The
  `database` job needs Docker, so only CI runs it.)
- `npm run check:migrations` — just the migration check (unique numbers,
  no edits to migrations already on `origin/dev`; `git fetch` first)
- `npm run check:invisible-chars` — just the invisible-character check
  (see "Write invisible characters as escapes" above); put file paths
  after `--` to check only those files
- `npm run dev` — local dev server
- `npm test` — unit tests (`*.test.ts`, Vitest). Put a test next to the
  file it tests; see `src/lib/validations/auth.test.ts` for the pattern.
- `npm run test:db` — tests against a real Supabase (`*.db.test.ts`),
  e.g. the listings RLS test. CI runs them on every PR (on its
  throwaway Supabase) and on the shared project after every database
  merge. Run by hand, they use `.env.local` and the seed data, so they
  hit the **shared** project. Any new table's RLS policies should get a
  test here; DB tests must leave shared data unchanged.
- `npm run lint` — ESLint
- `npm run format` — Prettier (auto-runs on commit via Husky)
- `npm run format:check` — Prettier check only
- `npm run db:types` — regenerate `src/types/database.ts` from a local
  Supabase. CI runs it on every PR; it needs Docker and
  `npx supabase start`, so you don't run it yourself.
- `npx shadcn add <component>` — add a new shadcn/ui component
- `npx supabase db push` — don't: CI's `apply-database` job applies
  merged migrations to the shared project. Only the PM runs it by hand,
  e.g. while `DB_AUTO_APPLY` is off.
- `npm run db:seed` — load test accounts + sample listings from
  `supabase/seed.sql` into the linked project, then upload the seed's
  sample files (`supabase/seed-storage.mjs`, needs `.env.local`); safe
  to re-run. CI already runs it after every database merge; run it
  yourself only to reset seed data you changed while testing.

## Agent guardrails (Claude Code)

`.claude/settings.json` is shared team config for Claude Code (personal
overrides go in the gitignored `.claude/settings.local.json`):

- **Auto-approved:** read-only and routine commands (`npm run check`,
  `npm test`, `git status/diff/log`, `gh issue/pr view`,
  `npx supabase migration list`, `db push --dry-run`, ...).
- **Always blocked:** `supabase db reset`, `supabase config push`,
  force-pushes, pushing straight to `main`/`dev`, and
  `git commit --no-verify`.
- **Hook:** `.claude/hooks/protect-applied-migrations.mjs` blocks edits
  to any migration that's already on `origin/dev` (run `git fetch` to
  keep that current). New migration files are unaffected.

These only apply inside Claude Code (its `Bash` tool — not other shells
or other AI tools). If you use Cursor/Copilot, the same rules still
apply; you just don't get the automatic block. (The "don't edit applied
migrations" rule is also enforced for everyone by
`scripts/check-migrations.mjs` in CI; branch protection on GitHub
blocks direct pushes to `dev`/`main` for everyone.)

**Workflow skills** in `.claude/skills/` (run as `/<name>` in Claude
Code; they're plain Markdown checklists, so other tools can read and
follow them too):

- `/start-task <issue>` — read the issue, write the plan with you,
  post it on the issue and assign it to you; once the PM has approved
  the plan, cut a correctly named branch from the latest `dev`. (If it
  had to wait for approval, run it again once the plan is approved.)
- `/new-migration <description>` — next migration number, RLS, grants,
  role checks and a DB test. CI tests it on the PR and applies it after
  merge.
- `/open-pr [issues]` — `npm run check`, push, open a PR into `dev`
  with `Closes #` lines (they close the issues when it merges) and a
  link to the approved plan.

If you change a workflow rule in this file, update the matching skill
in the same PR.

## When you're unsure

This is a learning project for the team, not just a shipping deadline.
Prefer clear, slightly more verbose code with comments over clever
one-liners, especially in Supabase policies and validation logic —
teammates need to be able to read and modify what you write.
