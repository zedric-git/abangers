<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BoardingHub — project context

Context for any AI coding assistant (Claude Code, Cursor, Copilot, etc.)
working in this repo. Read this before making changes.

## What this project is

BoardingHub — a web app where renters (students/workers) search boarding
house listings, and landlords post/manage them. School team project,
3-person team (Camilotes, Napoles, Alcover), MVP due Week 8.

## Stack

- Next.js (App Router), TypeScript strict, `src/` directory
- Tailwind CSS + shadcn/ui (components are copied into `src/components/ui`,
  not an npm dependency — add new ones with `npx shadcn add <name>`)
- Supabase: Postgres + Auth + Storage (see `src/lib/supabase/`). CLI is a
  local devDependency, not global — always run it as `npx supabase <cmd>`.
- React Hook Form + Zod for forms (`src/lib/validations/`)
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
- **`main` is protected.** Pushes must go through a PR with a passing
  CI check — including from the PM's own machine. Work on a branch.

## Non-negotiable rules

1. **Every new Supabase table gets Row Level Security.** No exceptions.
   Add `ENABLE ROW LEVEL SECURITY` and explicit policies in the same
   migration that creates the table. See `supabase/migrations/0001_init.sql`
   for the pattern (deny by default, then allow specific operations
   scoped to `auth.uid()`).
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

## Commands

- `npm run dev` — local dev server
- `npm run lint` — ESLint
- `npm run format` — Prettier (auto-runs on commit via Husky)
- `npx shadcn add <component>` — add a new shadcn/ui component
- `npx supabase db push` — apply pending migrations to the linked project
  (run `npx supabase link --project-ref <ref>` once first)

## When you're unsure

This is a learning project for the team, not just a shipping deadline.
Prefer clear, slightly more verbose code with comments over clever
one-liners, especially in Supabase policies and validation logic —
teammates need to be able to read and modify what you write.
