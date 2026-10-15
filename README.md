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

You need **Node.js 22+** (CI uses 22 — see `.nvmrc`) and **npm**.

1. **Clone and install**

   ```bash
   git clone https://github.com/zedric-git/abangers.git
   cd abangers
   npm install
   ```

   Open the folder in VS Code and accept the prompt to install the
   recommended extensions (Prettier, ESLint, Tailwind, Vitest). The
   repo's `.vscode/settings.json` then formats and fixes lint on save,
   the same way CI checks it.

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

| Command                 | What it does                                                      |
| ----------------------- | ----------------------------------------------------------------- |
| `npm run dev`           | Local dev server                                                  |
| `npm run check`         | **Everything CI checks** — run before opening a PR                |
| `npm test`              | Unit tests (`*.test.ts`, Vitest)                                  |
| `npm run test:db`       | RLS tests against the shared database (`*.db.test.ts`, not in CI) |
| `npm run format`        | Auto-format with Prettier                                         |
| `npm run db:seed`       | Load/reset test accounts + sample listings (safe to re-run)       |
| `npm run db:types`      | Regenerate `src/types/database.ts` after a migration is pushed    |
| `npx supabase db push`  | Apply new migrations in `supabase/migrations/` to the DB          |
| `npx shadcn add <name>` | Add a shadcn/ui component                                         |

`npm run check` runs, in order: Next.js type generation, `tsc`, ESLint,
the Prettier check, the migration check (`scripts/check-migrations.mjs`)
and the unit tests. CI runs the same steps plus a production build. A
pre-commit hook (Husky) auto-formats staged files, so most formatting
happens for you on `git commit`.

> [!WARNING]
> `npx supabase db reset --linked` **wipes the shared database for the
> whole team** — every account and listing, not just yours — then
> re-runs migrations and the seed. Ask in the group chat before running
> it.

## How we work

- **Branches:** `feature/*` → `dev` → `main`. `dev` is the default
  branch and is protected — nobody (admins included) can push to it
  directly. Cut your branch from the latest `dev`, open a PR into
  `dev`, and merge once CI passes. `dev` goes to `main` only at the end
  of each sprint. Full rules and the sprint schedule are in
  [AGENTS.md](./AGENTS.md#branching-strategy).
- **Branch names:** `feature/<task>`, `fix/<bug>`, `chore/<tooling>`,
  `docs/<what>` — e.g. `feature/login-form`.
- **Issues:** every task is an issue on the
  [project board](https://github.com/users/zedric-git/projects/3),
  titled with its sprint ID (e.g. `[S1-02.1] Build login form UI`).
  The board is the source of truth for what's done and who's on what.
- **PRs:** write `Closes #<issue>` in the PR description so the issue
  closes and the board card moves to Done automatically when it merges.

### A typical task, start to finish

```bash
git switch dev && git pull                 # 1. start from the latest dev
git switch -c feature/listing-search       # 2. one branch per task
# ...write code, commit as you go...
npm run check                              # 3. same checks as CI
git push -u origin feature/listing-search  # 4. then open a PR into dev
```

**Changing the database?** Add a new file in `supabase/migrations/`
(highest number + 1 — never edit an existing one), with RLS policies
**and** grants, then `npx supabase db push` and `npm run db:types`. The
full checklist is in
[`.claude/skills/new-migration/SKILL.md`](./.claude/skills/new-migration/SKILL.md).

### Using Claude Code (optional)

The repo ships shared Claude Code config in `.claude/`: safe commands
are pre-approved, dangerous ones (`db reset`, force-push, pushing to
`dev`/`main`) are blocked, and a hook stops it from editing applied
migrations. It also adds three commands that automate the workflow
above:

- `/start-task <issue>` — read the issue and cut the right branch
- `/new-migration <description>` — write a migration the safe way
- `/open-pr` — run the checks and open a PR into `dev`

They're plain Markdown checklists in `.claude/skills/`, so they're
worth reading even if you don't use Claude Code.

## Project structure

```
src/
  app/                     routes only (App Router)
    (auth)/                profile-setup (login/sign-up is the modal on the home page)
    dashboard/landlord/    dashboard, profile, listings (new, [id], [id]/edit)
    dashboard/renter/      renter dashboard
    listings/              public search + listings/[id] detail
  components/ui/           shadcn/ui primitives (generated by the CLI)
  components/map/          Leaflet/OpenStreetMap maps (client-only)
  components/              shared components (listing form, cards, modals, ...)
  lib/auth/                post-login routing (where to send a user after login)
  lib/supabase/            Supabase clients (browser, server) + session refresh
  lib/validations/         Zod schemas — single source of truth for data rules
  types/                   database.ts (generated — don't edit) + derived types
  __tests__/               database (RLS) tests + helpers
  proxy.ts                 refreshes the auth session on every request
                           (Next.js 16's name for middleware.ts)
supabase/
  migrations/              SQL migrations, applied in order (0001, 0002, ...)
  seed.sql                 test accounts + sample listings
scripts/                   repo checks run by `npm run check` and CI
.claude/                   shared Claude Code settings, hooks and skills
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
