---
name: open-pr
description: 'Verify, push, and open a pull request into dev for the current Abangers branch, with the PR template filled in, Closes # lines for the right issues, and a link to each approved plan. Use when the user says "open a PR", "make a PR", or "ship this".'
argument-hint: "[issue numbers this PR finishes, e.g. 142 143]"
---

# Open a PR into `dev`

Issues this PR finishes: `$ARGUMENTS` (may be empty — see step 3).

## 1. Check the branch

```bash
git branch --show-current
git status --short
git log --oneline origin/dev..HEAD
```

- On `dev` or `main`? **Stop.** Changes must go through a feature branch
  (`feature/`, `fix/`, `chore/`, `docs/`). Offer to create one from the
  current changes.
- Uncommitted changes? Show them and ask whether they belong in this PR
  before committing. Don't commit `.env*`, `.claude/settings.local.json`,
  or unrelated files.
- No commits ahead of `origin/dev`? Nothing to open — tell the user.

## 2. Verify

```bash
npm run check
```

If it fails, fix what's in scope and re-run. Don't open the PR with a
failing check, and never use `--no-verify`.

If the branch adds a migration or touches RLS/auth, `npm run check`
doesn't test it: CI's `database` job does, on the PR, by running every
migration, the seed and the DB tests on a throwaway Supabase. Don't
`db push` it or run `npm run test:db` against the shared DB first, and
don't put apply steps in the PR: CI applies it after merge (AGENTS.md,
"Database (Supabase)").

## 3. Work out which issues it closes

If none were passed in:

- look for `#123` in the branch's commit messages
  (`git log origin/dev..HEAD --format=%B`), and
- check issues assigned to the user:
  `gh issue list --repo zedric-git/abangers --assignee @me --state open`.

Confirm the list with the user if it's not obvious. Every finished task
gets its own `Closes #<n>` line.

## 4. Find the approved plan

Every task needs a plan the PM approved before any code was written
(AGENTS.md, "Plan before you build"). For each issue, find the plan
comment (it starts with `## Plan`) and the PM's approval — a 👍 from
`zedric-git` on it, or a reply from `zedric-git` approving it:

```bash
# comments on the issue: id, link, author, 👍 count, start of the body
gh api repos/zedric-git/abangers/issues/<n>/comments --jq '.[] | {id, url: .html_url, user: .user.login, thumbs_up: .reactions["+1"], body: .body[0:120]}'
# who gave the plan comment a 👍
gh api repos/zedric-git/abangers/issues/comments/<plan-comment-id>/reactions --jq '.[] | select(.content == "+1") | .user.login'
```

Compare the plan with what the branch changes
(`git diff --stat origin/dev...HEAD`) and note anything built
differently, for the PR's "Changes from the plan".

**No plan, or never approved?** Stop and tell the user — this work
skipped the plan step. Don't write a plan now and present it as if it
came first. Ask how they want to handle it (e.g. post the plan now,
saying it was written after the code, and get the PM's OK before
opening the PR).

## 5. Push and open the PR

```bash
git push -u origin <branch>
```

Then create the PR into **`dev`** (never `main` — that's only the
end-of-sprint merge). Fill in `.github/pull_request_template.md`:

- **What:** one or two sentences, plus a short bullet list of changes.
- `Closes #<n>` lines.
- **Plan:** the link to each approved plan comment, and anything built
  differently from it (or "None").
- **Checklist:** tick only what's actually true.
- **Tested:** what you ran and saw, and what you didn't test.

```bash
gh pr create --repo zedric-git/abangers --base dev --head <branch> --title "<type>(<area>): <summary>" --body-file <file>
```

Title style matches the repo history: `feat(...)`, `fix(...)`,
`chore(...)`, `docs(...)`.

## 6. Tell the user what happens after merge

`dev` is the default branch, so the `Closes #` lines close the issues
and move their board cards to Done when the PR merges. `dev` is also
protected: the PR can only merge once the `checks` and `database` CI
runs pass.

Give the user the PR link. If it changes the database, tell them:

- if `src/types/database.ts` needed updating, CI commits it to the
  branch, so `git pull` before pushing again;
- after merge, CI applies the change to the shared database and
  comments on the PR. If that comment says something failed, the PM
  decides the fix.
