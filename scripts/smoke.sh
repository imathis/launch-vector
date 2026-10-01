#!/usr/bin/env bash
# Create workspaces from this checkout, install them, and verify they build.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
work="$(mktemp -d "${TMPDIR:-/tmp}/vector-smoke.XXXXXX")"
trap 'rm -rf "$work"' EXIT
vector="$work/vector"

go build -C "$root" -o "$vector" ./cmd/vector

check_workspace() {
  local dir="$1"
  cd "$dir"
  # Links the checkout's Lab, installs managed skills, and runs bun install.
  "$vector" update --skip-self
  test -f .agents/skills/vector-design-lab/SKILL.md
  test -L .claude/skills/vector-design-lab
  test -L .claude/skills/shadcn
  grep -q "vector:begin" AGENTS.md
  bun run check
  # A second update must leave every file as it was.
  local before after
  before="$(find . -path ./node_modules -prune -o -type f -newer "$vector" -print | sort | xargs shasum)"
  "$vector" update --skip-self >/dev/null
  after="$(find . -path ./node_modules -prune -o -type f -newer "$vector" -print | sort | xargs shasum)"
  [ "$before" = "$after" ] || { echo "smoke: second update changed files in $dir" >&2; exit 1; }
}

"$vector" new "$work/full" --from "$root"
grep -q '"@launch-vector/lab": "link:@launch-vector/lab"' "$work/full/apps/lab/package.json"
check_workspace "$work/full"

"$vector" new "$work/no-lab" --from "$root" --no-lab
test ! -e "$work/no-lab/apps/lab"
check_workspace "$work/no-lab"

echo "smoke: ok"
