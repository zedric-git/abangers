# Abangers

Boarding house discovery & matching platform. "Abang" means rent in
Bisaya — Abangers are the renters. Team CaNAl (Camilotes, Napoles,
Alcover).

For AI coding assistants: see [AGENTS.md](./AGENTS.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase
(Postgres + Auth + Storage) · React Hook Form + Zod

## Getting started (do this once, on your own machine)

1. **Clone and install**

   ```bash
   git clone <repo-url>
   cd abangers
   npm install
   ```

2. **Get Supabase keys.** Ask whoever created the Supabase project for
   the Project URL and anon key (Supabase dashboard -> Settings -> API),
   or create the project yourself if one doesn't exist yet.

3. **Set up your env file**

   ```bash
   cp .env.example .env.local
   ```

   Paste the two values from step 2 into `.env.local`.

4. **Apply the database schema.** The Supabase CLI is already a project
   dependency (not a global install — global installs aren't supported
   anymore). Just prefix every command with `npx`:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

   This runs everything in `supabase/migrations/` against your project.
   `link` will ask for your database password (the one you saved when
   creating the project).

   > If a fresh clone is missing the CLI for some reason:
   > `npm install -D supabase`.

5. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Adding a UI component

shadcn/ui components aren't an npm package — the CLI copies the
component's source into `src/components/ui/`, so you own and can edit
the code directly.

```bash
npx shadcn add button
```

## Everyday commands

| Command                 | What it does                                           |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Local dev server                                       |
| `npm run lint`          | ESLint                                                 |
| `npm run format`        | Auto-format with Prettier                              |
| `npm run format:check`  | Check formatting without changing files (what CI runs) |
| `npx shadcn add <name>` | Add a shadcn/ui component                              |

A pre-commit hook (Husky) auto-lints and auto-formats staged files, so
most of this happens for you on `git commit`.

## Project structure

```
src/
  app/             routes only (App Router)
  components/ui/   shadcn/ui primitives
  components/      shared components, grouped by area
  lib/supabase/    Supabase client setup (browser + server + middleware)
  lib/validations/ Zod schemas — single source of truth for data rules
supabase/migrations/  SQL migrations, applied in order
```

## Team

| Member    | Role |
| --------- | ---- |
| Camilotes | TBD  |
| Napoles   | TBD  |
| Alcover   | TBD  |
