#!/bin/bash
# Spawns the backend and frontend dev servers, each in its own Git Bash
# terminal window, so you can watch their logs live.
#
# Backend  -> ./gradlew bootRunLocal (spring.profiles.active=local)
# Frontend -> npm run web, pointed at the local backend via frontend/.env.local
#
# Run from a real (non-sandboxed) Git Bash terminal:
#   ./scripts/run-local.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GIT_BASH="/c/Program Files/Git/git-bash.exe"

if [ ! -f "$GIT_BASH" ]; then
  echo "Git Bash not found at $GIT_BASH - edit GIT_BASH in this script to match your install." >&2
  exit 1
fi

"$GIT_BASH" -c "cd '$REPO_ROOT/backend' && ./gradlew bootRunLocal; exec bash" &
"$GIT_BASH" -c "cd '$REPO_ROOT/frontend' && npm run web; exec bash" &

echo "Spawned backend (bootRunLocal) and frontend (npm run web) in separate Git Bash windows."
