#!/bin/bash
cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Before doing anything else, run the startup skill (invoke Skill with skill=startup) to orient on recent commits, working tree state, and relevant memory. Skip it only if this conversation already has that context (e.g. mid-task continuation)."
  }
}
JSON
