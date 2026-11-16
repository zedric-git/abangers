## What

<!-- One or two sentences on what this PR does. -->

Closes #

<!-- One "Closes #<issue>" line per task this PR finishes — it moves the board card to Done on merge. -->

## Plan

<!-- Link the PM-approved plan comment on each issue (see "Plan before you build" in AGENTS.md). Not needed for the end-of-sprint dev → main merge. -->

Plan:

<!-- Anything you built differently from the plan, and why. "None" if it matches. -->

Changes from the plan:

## Checklist

- [ ] The plan was posted on the issue and approved by the PM before any code was written
- [ ] Targets `dev` (not `main`, unless this is the end-of-sprint merge)
- [ ] `npm run check` passes locally
- [ ] Tested the change in the browser (`npm run dev`) — logged in as the relevant seed account if it's behind auth

**Only if this PR changes the database** (delete this section otherwise):

<!-- Don't `db push` or run `db:types` yourself: CI's `database` job tests the migration here and commits the regenerated src/types/database.ts to this branch (pull before pushing again), and after merge CI applies it to the shared database and comments on this PR. -->

- [ ] New migration file (next number on `dev`) — no edits to existing migrations
- [ ] New tables/migrations include RLS policies **and** grants (with a role check if only renters or landlords should do it)
- [ ] Added/updated a `*.db.test.ts` case for each policy, and CI's `database` job passes (every migration, the seed and the DB tests, on a throwaway Supabase)
- [ ] If this changes a rule, convention, file path, or known gap, I updated `AGENTS.md`
