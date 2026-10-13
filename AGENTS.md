<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Abangers — project context

Context for any AI coding assistant (Claude Code, Cursor, Copilot, etc.)
working in this repo. Read this before making changes.

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
  from the highest number + 1, and never run migration SQL by hand in
  the Supabase dashboard: that's how `0003`/`0004` drifted from what's
  recorded. Before any `db push`, run
  `npx supabase migration list --linked` and
  `npx supabase db push --dry-run` and check only your new file is
  pending.
- **The database schema is the source of truth for types.**
  `src/types/database.ts` is generated from the shared project with
  `npm run db:types` — never edit it by hand; re-run the script after
  any migration is pushed. Prefer it over hand-written types like
  `src/types/listing.ts`, which has drifted (e.g. it has a `price`
  field the table doesn't have).
- **Branch flow: `feature/*` → `dev` → `main`.** See "Branching strategy"
  below for the full rules and sprint schedule.

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

## Branching strategy

Three-tier flow: `feature/*` → `dev` → `main`.

- **`feature/*` branches** — where actual development happens. One
  branch per feature/task, cut from the current `dev`. Naming:
  `feature/<short-description>` (e.g. `feature/listing-search-filters`).
  The same flow applies to non-feature work with a different prefix:
  `fix/<bug>`, `chore/<tooling-or-data>`, `docs/<what>`.
  Open a PR into `dev` when ready; needs a passing CI check to merge.
  Delete the branch after it merges.
- **`dev` branch** — the integration branch for the sprint currently in
  progress. All `feature/*` branches merge here first. This is where we
  test and stabilize everything the sprint is supposed to ship. Nothing
  goes to `main` directly from a feature branch. CI runs on every PR
  into `dev`, but `dev` isn't branch-protected yet — don't push to it
  directly; always go through a PR.
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
- Board statuses: `Product Backlog` / `Sprint N Backlog` (stories) →
  `Todo` → `In Progress` → `Code Review` → `Done`.
- **Every PR description must say `Closes #<issue>`** for each task it
  finishes, so the PR and issue are linked.
- **`Closes #` does NOT auto-close issues on PRs into `dev`.** GitHub
  only auto-closes when a PR merges into the default branch, which is
  `main`. After a PR into `dev` merges, close its issues by hand
  (`gh issue close <n> --comment "Fixed by #<pr>"`) so the board card
  moves to Done. Skipping this is why the board goes stale.

## Database (Supabase)

- **There is one shared, hosted Supabase project** for the whole team.
  There's no local Supabase/Docker setup — the CLI is linked straight
  to the shared project (`npx supabase link`). Anything you do to the
  database affects everyone immediately.
- **Schema changes only go through new migration files** in
  `supabase/migrations/` (next number in sequence), applied with
  `npx supabase db push`. Never edit a migration that's already been
  pushed — write a new one.
- **`npx supabase db reset --linked` wipes the shared database for the
  whole team** (all accounts and listings), then re-applies migrations
  and runs `supabase/seed.sql`. Never run it without asking the team
  first.
- **`supabase/seed.sql` must stay idempotent** (safe to re-run with
  `npm run db:seed`). Seed accounts are matched by email and seed
  listings by fixed UUID, with `on conflict ... do update`. Follow that
  pattern for any new seed data — no plain `INSERT`s that duplicate on
  a second run. Seed credentials are dev-only; the shared password is in
  the file header.
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
- **Duplicated auth forms.** Post-login routing is shared
  (`resolvePostLoginPath` in `src/lib/auth/post-login.ts` — use it for
  any new sign-in entry point), but `src/components/LandlordAuthModal.tsx`
  still has its own sign-in/sign-up forms that don't use `loginSchema` /
  `signUpSchema` from `src/lib/validations/auth.ts`. Don't add a third
  copy; when touching auth, move the modal onto the shared schemas.
- **RLS doesn't check roles (#173, #174).** The `listings` insert
  policy only checks `auth.uid() = landlord_id`, so a renter can create
  listings through the API. The `profiles` update policy lets users
  change their own `role`. Don't rely on RLS to enforce "landlords
  only" until these are fixed, and don't build features that assume it.

## Commands

- **`npm run check` — run this before saying a change is done.** It's
  everything CI runs: `next typegen`, `tsc --noEmit`, ESLint, Prettier
  check, and the unit tests.
- `npm run dev` — local dev server
- `npm test` — unit tests (`*.test.ts`, Vitest). Put a test next to the
  file it tests; see `src/lib/validations/auth.test.ts` for the pattern.
- `npm run test:db` — tests that run against the **shared** Supabase
  project (`*.db.test.ts`), e.g. the listings RLS test. Needs
  `.env.local` and the seed data. Not run in CI. Any new table's RLS
  policies should get a test here; DB tests must leave shared data
  unchanged.
- `npm run lint` — ESLint
- `npm run format` — Prettier (auto-runs on commit via Husky)
- `npm run format:check` — Prettier check only
- `npm run db:types` — regenerate `src/types/database.ts` from the
  shared project's schema
- `npx shadcn add <component>` — add a new shadcn/ui component
- `npx supabase db push` — apply pending migrations to the linked project
  (run `npx supabase link --project-ref <ref>` once first)
- `npm run db:seed` — load test accounts + sample listings from
  `supabase/seed.sql` into the linked project (safe to re-run)

## Agent guardrails (Claude Code)

`.claude/settings.json` is shared team config for Claude Code (personal
overrides go in the gitignored `.claude/settings.local.json`):

- **Auto-approved:** read-only and routine commands (`npm run check`,
  `npm test`, `git status/diff/log`, `gh issue/pr view`,
  `npx supabase migration list`, `db push --dry-run`, ...).
- **Always blocked:** `supabase db reset`, force-pushes, pushing
  straight to `main`/`dev`, and `git commit --no-verify`.
- **Hook:** `.claude/hooks/protect-applied-migrations.mjs` blocks edits
  to any migration that's already on `origin/dev` (run `git fetch` to
  keep that current). New migration files are unaffected.

These only apply inside Claude Code (its `Bash` tool — not other shells
or other AI tools). If you use Cursor/Copilot, the same rules still
apply; you just don't get the automatic block.

## When you're unsure

This is a learning project for the team, not just a shipping deadline.
Prefer clear, slightly more verbose code with comments over clever
one-liners, especially in Supabase policies and validation logic —
teammates need to be able to read and modify what you write.
