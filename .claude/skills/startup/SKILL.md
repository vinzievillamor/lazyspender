---
name: startup
description: Orient a fresh Claude Code session on this project — recent commits, working tree state, relevant memories, and in-flight planning docs — without the user having to re-explain context. Use at the start of a session, or whenever asked to catch up, get oriented, or check what's changed.
---

# Startup

Build a compact orientation picture of the project's current state and recent
history, then summarize it briefly for the user. This is not a report to
produce for its own sake — it's working context to load before doing anything
else. Keep the summary short; the goal is efficient orientation, not an audit.

Every time this skill is triggered (SessionStart hook, or an explicit ask to
catch up / get oriented), it must end with output to the user — never run
silently. If the conversation already has enough context (e.g. this is a
continuation, not a fresh session), skip the full gather in Steps 1-3 and
say so in one line instead (e.g. "Already oriented from earlier in this
session, skipping re-gather") rather than producing no output at all.

## Step 1 — Gather signals (run in parallel)

- `git status`
- `git log --oneline -15`
- `git branch --show-current`
- `git stash list`

If `git status` shows staged or unstaged changes, also run `git diff --stat`
(staged and unstaged) to see the shape of in-progress work — not the full
diff, just filenames and line counts.

## Step 2 — Check memory

Read `MEMORY.md` from the auto-memory directory described in your system
context (`# auto memory` section, project-scoped path under
`~/.claude/projects/.../memory/`). This index holds `project` memories (active
initiatives, deadlines, decisions) and `feedback` memories (corrections and
confirmed preferences) accumulated across past sessions.

- Read the index itself (cheap, always worth it).
- Only follow links to individual memory files that look relevant to the
  current git state (e.g. a `project` memory whose subject matches files
  changed in recent commits, or `feedback` memories about the area currently
  being touched). Don't read every linked file — that defeats the "minimal
  context" goal.
- If `MEMORY.md` doesn't exist yet or is empty, say so in one clause and move
  on — it just means no memory has been built up yet.

## Step 3 — Check for in-flight planning docs

`ls -lt docs/*.md 2>/dev/null | head -5` — if any planning doc has been
modified more recently than the last few commits, it may describe work that's
designed but not yet (fully) implemented. Skim its title/intro, don't read it
in full unless it's clearly relevant to what the user asks next.

## Step 4 — Summarize

Give the user a short orientation summary (aim for well under 200 words).
Open with a one-line recap of what this run actually did — which steps ran
vs. were skipped — so the summary reads as a report of actions taken, not
just a content dump. For example: "Orientation: checked git log/status,
scanned the memory index, looked for in-flight docs." If Step 2 or 3 found
nothing (empty memory, no recent docs), say so explicitly rather than
omitting them silently — "no memory recorded yet" / "no in-flight docs" is
itself useful signal that those steps ran. Then give the findings:

- Branch + working tree state (clean, or what's in progress and where)
- What's landed recently (1-3 lines pulled from the commit log, grouped by
  theme if there are several — not a raw log dump)
- Anything from memory that's still load-bearing (an open initiative, a
  standing preference relevant to likely next work) — if nothing relevant
  surfaced, say so in one clause rather than dropping the line
- Any in-flight planning doc worth flagging, or "none" if none found

Do not pad this with a "how can I help" closer or restate CLAUDE.md content
(architecture, commands, etc.) — that's already in context. This step is
purely about *recent, changing* state that CLAUDE.md doesn't capture.
