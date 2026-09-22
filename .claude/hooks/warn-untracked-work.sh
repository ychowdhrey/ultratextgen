#!/usr/bin/env bash
# Stop hook: warn when this session is ending with commits that nothing tracks.
#
# A merged PR cannot track new work. Push onto a branch after its PR merged and
# the commit is finished, gate-passing and invisible — this repo has lost work
# that way at least five times, for between 4 hours and 2 months. The failures
# all land at the END of a session, which is exactly where a skill loaded at
# the start has no reach, so the check belongs here.
#
# Advisory only. Always exits 0 and never sets `continue: false`; a coordination
# reminder that can block a session is a reminder people disable.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null || exit 0
command -v git >/dev/null 2>&1 || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
[ -z "$branch" ] && exit 0
case "$branch" in main|master|HEAD) exit 0 ;; esac

base=origin/main
git rev-parse --verify --quiet "$base" >/dev/null 2>&1 || base=origin/master
git rev-parse --verify --quiet "$base" >/dev/null 2>&1 || exit 0

# A branch with no merge-base cannot be measured here (shallow clone). Say so
# rather than reporting a reassuring zero -- an author who reads "no problems" from
# a check that never ran is worse off than one who reads nothing.
if ! git merge-base "$base" HEAD >/dev/null 2>&1; then
  printf '{"systemMessage":"Untracked-work check could not run: no merge-base against %s (shallow clone). Run `git fetch --deepen=200` to measure."}\n' "$base"
  exit 0
fi

ahead=$(git rev-list --count "$base"..HEAD 2>/dev/null || echo 0)
[ "$ahead" -eq 0 ] 2>/dev/null && exit 0

# Compare against the branch's OWN remote ref, not @{u}: a branch created with
# `checkout -B <name> origin/main` has origin/main as its upstream, so @{u}
# answers a different question and reports a confusing zero.
unpushed=""
remote_ref="refs/remotes/origin/$branch"
if git rev-parse --verify --quiet "$remote_ref" >/dev/null 2>&1; then
  n=$(git rev-list --count "origin/$branch"..HEAD 2>/dev/null || echo 0)
  [ "$n" -gt 0 ] 2>/dev/null && unpushed=" $n of them not yet pushed."
else
  unpushed=" This branch has never been pushed."
fi

pr=""
if command -v gh >/dev/null 2>&1; then
  found=$(timeout 8 gh pr list --head "$branch" --state open --json number \
            --jq 'length' 2>/dev/null || echo "")
  if [ "$found" = "0" ]; then
    pr=" No open PR tracks this branch."
  elif [ -n "$found" ]; then
    exit 0   # an open PR tracks it; nothing to warn about
  fi
fi

msg="This session is ending with ${ahead} commit(s) on ${branch} that are not on ${base}.${unpushed}${pr} A merged PR cannot track new work — if this branch already had one merged, these commits need a NEW PR or they will never reach ${base}."
printf '{"systemMessage": %s}\n' "$(printf '%s' "$msg" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
exit 0
