# Abangers

Boarding house discovery & matching platform. "Abang" means rent in
Bisaya — Abangers are the renters. Renters (students/workers) search
boarding house listings; landlords post and manage them.

Team CaNAl (Camilotes, Napoles, Alcover) · MVP due Week 8.

- **Project board:** [abangers scrum project](https://github.com/users/zedric-git/projects/3)
- **For AI coding assistants:** see [AGENTS.md](./AGENTS.md) (also the
  best deep-dive on project rules for humans).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase
(Postgres + Auth + Storage) · React Hook Form + Zod

## Getting started (do this once, on your own machine)

You need **Node.js 22+** (CI uses 22) and **npm**.

1. **Clone and install**

   ```bash
   git clone https://github.com/zedric-git/abangers.git
   cd abangers
   npm install
   ```

2. **Get the Supabase keys.** The whole team shares **one** hosted
   Supabase project — don't create your own. Ask the PM for the
   Project URL and anon key (Supabase dashboard → Settings → API).

3. **Set up your env file**

   ```bash
   cp .env.example .env.local
   ```

   Paste the two values from step 2 into `.env.local`. It's gitignored —
   never commit real keys.

4. **Link the Supabase CLI.** The CLI is a project devDependency (not a
   global install), so always prefix it with `npx`:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   ```

   The project ref is the subdomain of the Project URL
   (`https://<project-ref>.supabase.co`). `link` asks for the database
   password — get it from the PM.

5. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

The shared database already has the schema and seed data, so you don't
need to run migrations or the seed just to start developing. Only run
`db push` when you've added a new migration (see below).

## Test accounts

`supabase/seed.sql` creates these accounts (already confirmed, ready to
log in). They all share one password — it's in the header comment of
`supabase/seed.sql`.

| Email                     | Name          | Role     | Listings |
| ------------------------- | ------------- | -------- | -------- |
| `landlord1@abangers.test` | Maria Santos  | landlord | 3        |
| `landlord2@abangers.test` | Jun Dela Cruz | landlord | 3        |
| `renter1@abangers.test`   | Ana Reyes     | renter   | —        |
| `renter2@abangers.test`   | Paolo Garcia  | renter   | —        |

If the seed data gets messed up, run `npm run db:seed` — it's safe to
re-run and puts the seed accounts and listings back without touching
anything else.

## Everyday commands

| Command                 | What it does                                                |
| ----------------------- | ----------------------------------------------------------- |
| `npm run dev`           | Local dev server                                            |
| `npm run lint`          | ESLint                                                      |
| `npm run format`        | Auto-format with Prettier                                   |
| `npm run format:check`  | Check formatting without changing files (what CI runs)      |
| `npm run db:seed`       | Load/reset test accounts + sample listings (safe to re-run) |
| `npx supabase db push`  | Apply new migrations in `supabase/migrations/` to the DB    |
| `npx shadcn add <name>` | Add a shadcn/ui component                                   |

A pre-commit hook (Husky) auto-formats staged files, so most formatting
happens for you on `git commit`.

> [!WARNING]
> `npx supabase db reset --linked` **wipes the shared database for the
> whole team** — every account and listing, not just yours — then
> re-runs migrations and the seed. Ask in the group chat before running
> it.

## How we work

- **Branches:** `feature/*` → `dev` → `main`. Cut your branch from the
  latest `dev`, open a PR into `dev`, and merge once CI passes. `dev`
  goes to `main` only at the end of each sprint. Full rules and the
  sprint schedule are in [AGENTS.md](./AGENTS.md#branching-strategy).
- **Branch names:** `feature/<task>`, `fix/<bug>`, `chore/<tooling>`,
  `docs/<what>` — e.g. `feature/login-form`.
- **Issues:** every task is an issue on the
  [project board](https://github.com/users/zedric-git/projects/3),
  titled with its sprint ID (e.g. `[S1-02.1] Build login form UI`).
- **PRs:** write `Closes #<issue>` in the PR description so the issue
  closes and the board card moves to Done automatically when it merges.

## Project status

What works today on `dev`:

- ✅ Sign-up (name, email, password, renter/landlord role) with Supabase
  Auth and clear error messages
- ✅ Landing page with a landlord sign-in / sign-up popup
- ✅ Database schema (`profiles`, `listings`) with Row Level Security,
  plus seed data

Still placeholder pages (next up — see the board for owners):

- ⏳ Login page, landlord + renter dashboards
- ⏳ Add / edit listing, listings search, listing detail

## Project structure

```
src/
  app/                     routes only (App Router)
    (auth)/login, signup   auth pages
    dashboard/landlord     landlord dashboard + listings/new, listings/[id]/edit
    dashboard/renter       renter dashboard
    listings, listings/[id] public search + detail
  components/ui/           shadcn/ui primitives (generated by the CLI)
  components/              shared components (e.g. LandlordAuthModal)
  lib/supabase/            Supabase clients (browser, server) + session refresh
  lib/validations/         Zod schemas — single source of truth for data rules
  proxy.ts                 refreshes the auth session on every request
                           (Next.js 16's name for middleware.ts)
supabase/
  migrations/              SQL migrations, applied in order (0001, 0002, ...)
  seed.sql                 test accounts + sample listings
```

## Adding a UI component

shadcn/ui components aren't an npm package — the CLI copies the
component's source into `src/components/ui/`, so you own and can edit
the code directly.

```bash
npx shadcn add button
```

## Team

| Member           | GitHub                                             | Role            |
| ---------------- | -------------------------------------------------- | --------------- |
| Zedric Camilotes | [@zedric-git](https://github.com/zedric-git)       | Project Manager |
| EJ Kate Alcover  | [@ejkatealcover](https://github.com/ejkatealcover) | Co-developer    |
| Chielsea Napoles | [@chilsi-n](https://github.com/chilsi-n)           | Co-developer    |
