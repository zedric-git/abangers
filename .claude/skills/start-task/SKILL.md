---
name: start-task
description: 'Start work on a GitHub issue from the Abangers project board — reads the issue, writes the plan with the user and posts it for the PM to approve, then cuts a correctly named branch from the latest dev. Use when the user says "start #123", "pick up issue 123", or "work on S1-05.2", and again once the PM has approved the plan.'
argument-hint: <issue number>
---

# Start a task from a GitHub issue

Issue: `$ARGUMENTS` (a number like `142` or `#142`). If none was given,
ask which issue — don't guess.

Every implementation is planned before it's built (AGENTS.md, "Plan
before you build"). This skill ends with an approved plan and a fresh
branch, or stops to wait for the PM's approval. Don't edit files,
create a branch, or post anything until the step that says to.

## 1. Read the issue and its comments

```bash
gh issue view <n> --repo zedric-git/abangers --json number,title,body,labels,state,assignees,comments
```

- If it's **closed**, stop and tell the user.
- If it's a **user story** (`[S<n>-<nn>]` with no `.task` part, e.g.
  `[S2-01] As a renter...`), it's usually too big for one branch. List
  its open sub-issues and ask which one to start:
  ```bash
  gh issue list --repo zedric-git/abangers --state open --search "[S2-01."
  ```
- If it's assigned to someone else, mention it and ask before continuing.
- If it **already has a plan** (a comment starting with `## Plan`),
  you're picking the task up after the plan was posted — skip to step 4
  to check whether it's approved. Don't write a second plan.

## 2. Get oriented

- Read the parts of `AGENTS.md` that apply (database work → "Non-negotiable
  rules" and "Database"; maps → "Maps and location"; auth → "Known gaps").
- Find the files the issue touches and read them.
- If the issue needs a database change, put the migration in the plan.
  It gets written later, with the `new-migration` skill.

## 3. Write the plan and agree it with the user

Draft the plan with the template in AGENTS.md ("Plan before you build"),
sized to the task. Anything unclear in the issue goes under "Risks /
questions" — don't guess at it.

Show the plan to the user and ask, in one question, whether it's right
and whether you can post it on issue #<n> and assign the issue to them.
Revise it until they say yes.

Then write the plan to a temporary file outside the repo and post it:

```bash
gh issue comment <n> --repo zedric-git/abangers --body-file <plan-file>
gh issue edit <n> --repo zedric-git/abangers --add-assignee @me
```

## 4. Check the PM has approved it

```bash
gh api user --jq .login
```

- **`zedric-git`** (the PM): their go-ahead on the plan (in step 3, or
  when they posted it earlier) is the approval — go on to step 5.
- **Anyone else:** the PM approves on the issue, with a 👍 reaction on
  the plan comment or a reply approving it. Check both:

  ```bash
  # comments on the issue: id, author, 👍 count, start of the body
  gh api repos/zedric-git/abangers/issues/<n>/comments --jq '.[] | {id, user: .user.login, thumbs_up: .reactions["+1"], body: .body[0:120]}'
  # who gave the plan comment a 👍
  gh api repos/zedric-git/abangers/issues/comments/<plan-comment-id>/reactions --jq '.[] | select(.content == "+1") | .user.login'
  ```

  - **Approved** (`zedric-git` gave it a 👍, or replied approving it) →
    go on to step 5.
  - **Changes asked for** → revise the plan with the user (step 3),
    edit the plan comment or post the new version, and stop again.
  - **No answer yet** → stop here. Tell the user the plan is posted and
    waiting for the PM, and to run `/start-task <n>` again once it's
    approved. Don't cut the branch or write code in the meantime.

## 5. Make sure the working tree is safe to switch

```bash
git status --short
```

If there are uncommitted changes, stop and ask — never stash, reset, or
discard someone's work on your own.

## 6. Cut the branch from the latest `dev`

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

Moving the board card to **In Progress** needs the `project` scope on
the `gh` token, which most of us don't have — tell the user to drag the
card themselves.

## 7. Report back, then build the plan

Tell the user, briefly: the branch name, the link to the approved plan,
and what you'll build first. Then build what the plan says. If the
approach or scope has to change partway, stop and update the plan on
the issue before carrying on (AGENTS.md, "Plan before you build").
