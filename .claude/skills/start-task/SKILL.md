---
name: start-task
description: Start work on a GitHub issue from the Abangers project board — reads the issue, cuts a correctly named branch from the latest dev, and summarizes what to build. Use when the user says "start #123", "pick up issue 123", or "work on S1-05.2".
argument-hint: <issue number>
---

# Start a task from a GitHub issue

Issue: `$ARGUMENTS` (a number like `142` or `#142`). If none was given,
ask which issue — don't guess.

## 1. Read the issue

```bash
gh issue view <n> --repo zedric-git/abangers --json number,title,body,labels,state,assignees
```

- If it's **closed**, stop and tell the user.
- If it's a **user story** (`[S<n>-<nn>]` with no `.task` part, e.g.
  `[S2-01] As a renter...`), it's usually too big for one branch. List
  its open sub-issues and ask which one to start:
  ```bash
  gh issue list --repo zedric-git/abangers --state open --search "[S2-01."
  ```
- If it's assigned to someone else, mention it and ask before continuing.

## 2. Make sure the working tree is safe to switch

```bash
git status --short
```

If there are uncommitted changes, stop and ask — never stash, reset, or
discard someone's work on your own.

## 3. Cut the branch from the latest `dev`

Branch name: `<prefix>/<slug>` (see AGENTS.md, "Branching strategy").

- **prefix:** `fix` if the issue has the `bug` label; `docs` if it's
  only documentation; `chore` for tooling/data; otherwise `feature`.
- **slug:** 3–5 lowercase words from the title, hyphenated, without the
  `[S1-05.2]` tag (e.g. `feature/renter-profile-form`).

```bash
git fetch origin
git switch -c <branch> origin/dev
git branch --unset-upstream   # so a bare `git push` can never target dev
```

Then assign the issue to the current user:

```bash
gh issue edit <n> --repo zedric-git/abangers --add-assignee @me
```

Moving the board card to **In Progress** needs the `project` scope on
the `gh` token, which most of us don't have — tell the user to drag the
card themselves.

## 4. Get oriented before writing code

- Read the parts of `AGENTS.md` that apply (database work → "Non-negotiable
  rules" and "Database"; maps → "Maps and location"; auth → "Known gaps").
- Find the files the issue touches and read them.
- If the issue changes the database, use the `new-migration` skill.

## 5. Report back

Tell the user, briefly: the branch name, what the issue asks for (in
your own words), which files you expect to change, and anything unclear
in the issue that needs a decision before building.
