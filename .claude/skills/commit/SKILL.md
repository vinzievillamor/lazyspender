---
name: commit
description: Group the current local changes into logically separate, atomic git commits with Conventional Commits messages, split by project boundary (backend/frontend/docs/root) in this monorepo. Use when the user asks to commit changes, split changes into commits, or clean up a messy working tree into proper commits. Does not push.
---

# Commit

Turn the current working tree into one or more well-formed, atomic commits. This
skill only creates local commits — it never pushes and never force-pushes.

## Don'ts

- **Never push, under any circumstances** — not `git push`, not `git push
  --force`/`--force-with-lease`. This skill's job ends at a local commit. Pushing
  requires the user to explicitly ask for it in that specific moment, every
  time — a prior push or a general "yes go ahead" earlier in the conversation
  does not carry forward.
- **Never `--amend`.** If a previous commit made in this run needs a fix, make a
  new commit — don't rewrite one that already exists.
- **Never `--no-verify` or otherwise skip hooks.** If a pre-commit hook fails,
  fix the underlying issue, re-stage, and commit again.
- **Never `git add -A` or `git add .`.** Always stage explicit file paths per
  group so an unrelated untracked file can't get swept into the wrong commit.
- **Never `git reset --hard` or touch history that predates this run.**
- **Never stage secrets or local-only files** (`.env`, credentials, anything
  that looks like a key/token, or files clearly meant to stay local).

## Step 1 — Gather full context

Run these in parallel:

- `git status` (never `-uall`, it can be slow/expensive on large repos)
- `git diff` (unstaged changes) and `git diff --staged` (already-staged changes)
- `git log --oneline -20` (this repo's existing message style, for tone/casing reference)
- `git branch --show-current`

Read enough of the actual diff content (not just filenames) to understand *why*
each file changed, not just *that* it changed. Filenames alone are not enough to
group correctly — a rename-only frontend change and a new backend endpoint that
happen to touch files in the same directory are not the same logical change.

## Step 2 — Split into commit groups

Apply these rules, in order:

1. **Hard boundary: monorepo project.** `backend/`, `frontend/`, `docs/`, and
   anything else (root-level config, `.vscode/`, `CLAUDE.md`, etc.) always go into
   **separate commits**, even if they're part of the same feature. Never mix files
   from two of these boundaries into one commit.
2. **Within a boundary, split by logical concern.** If a boundary's changes contain
   more than one unrelated reason for change (e.g. a real bug fix plus an
   incidental formatting change, or two unrelated features), split further into
   separate commits — one concern per commit.
3. **Keep genuinely atomic changes together.** Don't over-split: if a bug fix
   touches a service, its repository, and a mapper because that's what the fix
   requires, that's one commit, not three.
4. **Generated/lock files ride with the change that caused them** (e.g.
   `package-lock.json` alongside the `package.json` dependency bump that produced
   it). Don't create a standalone "update lockfile" commit unless the lockfile is
   the only thing that changed.
5. **Never stage secrets or local-only files** (see Don'ts) — check `.gitignore`
   and the diff content itself, not just the filename.
6. **Order commits sensibly** — e.g. a backend change a frontend change depends on
   goes first; docs updates that describe a finished feature go last.

Stage files explicitly per group with `git add <specific files>` (see Don'ts).

## Step 3 — Write each commit message (Conventional Commits)

Format:

```
<type>(<scope>): <imperative, lowercase, no trailing period>
```

One line only — no body, ever.

- **type**: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`, `perf`,
  `build`, or `ci` — pick the one that matches the actual intent of the change.
- **scope**: the project boundary or a more specific area inside it —
  `backend`, `frontend`, `docs`, `backend(planned-payments)`,
  `frontend(dashboard)`, etc. Use whatever scope best communicates *where*
  without being redundant with the subject.
- **subject**: imperative mood ("add", not "added"/"adds"), ≤72 characters,
  no period at the end.

Show the user the proposed grouping (files → commit message) before running
`git commit`, so miscategorized files can be caught before they're permanent
history — a short list is enough, no need for a separate approval step per
commit since invoking this skill is the go-ahead to commit.

## Step 4 — Create the commits

For each group, in order:

```bash
git add <specific files for this group>
git commit -m "<type>(<scope>): <subject>"
```

See Don'ts above for what to avoid while doing this (no `--amend`, no
`--no-verify`, no bulk `git add`).

## Step 5 — Confirm

Run `git status` and `git log --oneline -n <number of commits just made>` to
show the final state. Report the commits created. Do **not** push (see Don'ts) —
pushing is a separate, explicit action the user has to ask for, every time.

## Best practices this skill enforces (for reference)

- **Atomic commits**: each commit is one reviewable, revertible unit of change.
  If you can't summarize a commit in one sentence without "and", it's probably
  two commits.
- **Conventional Commits**: machine-parseable type/scope/subject makes it
  possible to generate changelogs, filter history by area, and understand
  intent at a glance in `git log --oneline`.
- **Imperative mood**: a commit message completes the sentence "If applied,
  this commit will ___". ("add contributors functionality", not "added" or
  "adds").
- **Small, frequent commits over one giant commit**: easier to review, bisect,
  and revert independently.
