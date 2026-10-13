---
name: open-pr
description: 'Verify, push, and open a pull request into dev for the current Abangers branch, with the PR template filled in and Closes # lines for the right issues. Use when the user says "open a PR", "make a PR", or "ship this".'
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

If the branch adds a migration or touches RLS/auth, also confirm the
PR description will include the apply steps (see the `new-migration`
skill) — `npm run test:db` can't verify policies that aren't applied yet.

## 3. Work out which issues it closes

If none were passed in:

- look for `#123` in the branch's commit messages
  (`git log origin/dev..HEAD --format=%B`), and
- check issues assigned to the user:
  `gh issue list --repo zedric-git/abangers --assignee @me --state open`.

Confirm the list with the user if it's not obvious. Every finished task
gets its own `Closes #<n>` line.

## 4. Push and open the PR

```bash
git push -u origin <branch>
```

Then create the PR into **`dev`** (never `main` — that's only the
end-of-sprint merge). Fill in `.github/pull_request_template.md`:

- **What:** one or two sentences, plus a short bullet list of changes.
- `Closes #<n>` lines.
- **Checklist:** tick only what's actually true.
- **Tested:** what you ran and saw, and what you didn't test.

```bash
gh pr create --repo zedric-git/abangers --base dev --head <branch> --title "<type>(<area>): <summary>" --body-file <file>
```

Title style matches the repo history: `feat(...)`, `fix(...)`,
`chore(...)`, `docs(...)`.

## 5. Tell the user what happens after merge

`Closes #` does **not** auto-close issues for PRs into `dev`. After the
PR merges, the issues must be closed by hand so the board moves to Done:

```bash
gh issue close <n> --repo zedric-git/abangers --comment "Fixed by #<pr>"
```

Give the user the PR link and note any migration that still needs
applying.
