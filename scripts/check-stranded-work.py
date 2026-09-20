#!/usr/bin/env python3
"""Find work that will never reach `main` because nothing tracks it.

The failure this exists for
---------------------------
A merged PR cannot track new work. Push a commit onto a branch after its PR has
merged and the commit is finished, gate-passing, and invisible: git sees no
conflict, CI is green, no PR is open, and nothing anywhere asks the question
"is there a branch carrying commits with no PR?".

Recorded instances in this repository alone:

    PR #524  ->  5 commits pushed after   ->  16 sv/library pages, 2 MONTHS
    PR #457/#465 -> 4 commits after       ->  6 Indonesian pages, 2 months
    PR #818  ->  6 commits after          ->  30 Korean pages, 12 days
    PR #894  ->  9 backlog items after    ->  recovered by #896
    PR #904  ->  2 commits after          ->  recovered by #909, ~4 hours

Two of those sat undetected for two months.

Two design constraints, both learned from getting them wrong
------------------------------------------------------------
**1. This must run on a FULL clone, which means CI, not a session.** Sessions
here get a shallow clone. Measured on one: `git merge-base origin/main <branch>`
returns EMPTY for 381 of 757 branches, because main's graft boundary hides the
common ancestor -- and `git rev-list main..branch` then happily reports the
branch's entire history as unmerged. A first attempt at this measurement
reported "399 branches carrying 420,704 commits", which is nonsense. So an
unresolvable merge-base is reported as UNMEASURABLE and is never silently
treated as clean.

**2. It fails closed.** No PR data supplied means it cannot tell STRANDED from
TRACKED, and it says so and exits non-zero rather than printing a reassuring
"0 stranded". A coordination check whose silence reads as success is the exact
failure mode this repository has recorded four times against CI and once
against its own work-in-progress plane.

Open-PR data arrives on stdin rather than being fetched, so the script is
network-free and testable with a fixture -- the same reason
`scripts/weekly_pr_digest.py` reads PRs that way.

Usage:
    gh pr list --state open --json number,headRefName --limit 300 \\
      | python3 scripts/check-stranded-work.py

    python3 scripts/check-stranded-work.py --open-prs prs.json
    python3 scripts/check-stranded-work.py --max-age-days 400
"""
import argparse
import datetime as dt
import json
import pathlib
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
LEDGER = REPO / 'data' / 'stranded_work_exclusions.json'
MAIN = 'origin/main'


def git(*args):
    return subprocess.run(
        ['git', *args], capture_output=True, text=True, cwd=REPO
    ).stdout.strip()


def branches():
    out = git('for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin')
    for name in out.splitlines():
        name = name.strip()
        if not name or name.endswith('/HEAD') or name == MAIN:
            continue
        yield name


def classify(branch, tracked_refs):
    """MERGED / TRACKED / STRANDED / UNMEASURABLE for one branch."""
    tip = git('rev-parse', branch)
    if not tip:
        return None

    # An unresolvable merge-base means this clone cannot answer the question.
    # Saying "clean" here is how the whole class stays invisible.
    if not git('merge-base', MAIN, branch):
        return {'state': 'UNMEASURABLE', 'branch': branch, 'tip': tip[:9],
                'commits': 0, 'age': None}

    on_main = subprocess.run(
        ['git', 'merge-base', '--is-ancestor', tip, MAIN], cwd=REPO
    ).returncode == 0
    if on_main:
        return {'state': 'MERGED', 'branch': branch, 'tip': tip[:9],
                'commits': 0, 'age': None}

    n = int(git('rev-list', '--count', f'{MAIN}..{branch}') or 0)
    iso = git('log', '-1', '--format=%cI', branch)
    age = None
    if iso:
        when = dt.datetime.fromisoformat(iso)
        age = (dt.datetime.now(dt.timezone.utc) - when).days

    short = branch.split('/', 1)[1] if '/' in branch else branch
    state = 'TRACKED' if short in tracked_refs else 'STRANDED'
    return {'state': state, 'branch': branch, 'tip': tip[:9],
            'commits': n, 'age': age}


def load_exclusions():
    if not LEDGER.exists():
        return {}
    data = json.loads(LEDGER.read_text(encoding='utf-8'))
    return {k: v for k, v in data.items() if not k.startswith('_')}


def read_open_prs(path):
    raw = pathlib.Path(path).read_text(encoding='utf-8') if path else (
        '' if sys.stdin.isatty() else sys.stdin.read()
    )
    raw = raw.strip()
    if not raw:
        return None
    data = json.loads(raw)
    refs = set()
    for pr in data:
        ref = pr.get('headRefName') or (pr.get('head') or {}).get('ref')
        if ref:
            refs.add(ref)
    return refs


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--open-prs', help='JSON file of open PRs (else stdin)')
    ap.add_argument('--max-age-days', type=int, default=None,
                    help='ignore branches older than this (triage aid only)')
    args = ap.parse_args()

    tracked = read_open_prs(args.open_prs)

    print('Stranded-work check')
    print(f'  base:     {MAIN} @ {git("rev-parse", "--short", MAIN)}')

    if tracked is None:
        print('  open PRs: NONE SUPPLIED')
        print('')
        print('Cannot distinguish tracked work from stranded work without the')
        print('open-PR list, and reporting "0 stranded" from here would be a')
        print('reassuring lie. Pipe it in:')
        print('')
        print('  gh pr list --state open --json number,headRefName --limit 300 \\')
        print('    | python3 scripts/check-stranded-work.py')
        return 2

    print(f'  open PRs: {len(tracked)}')

    excl = load_exclusions()
    rows = [r for r in (classify(b, tracked) for b in branches()) if r]

    buckets = {}
    for r in rows:
        buckets.setdefault(r['state'], []).append(r)

    stranded = [r for r in buckets.get('STRANDED', [])
                if r['branch'] not in excl]
    excluded = [r for r in buckets.get('STRANDED', []) if r['branch'] in excl]
    unmeasurable = buckets.get('UNMEASURABLE', [])

    print(f'  branches: {len(rows)}  '
          f'({len(buckets.get("MERGED", []))} merged, '
          f'{len(buckets.get("TRACKED", []))} tracked by an open PR)')
    print('')

    if stranded:
        stranded.sort(key=lambda r: (-(r['age'] or 0), r['branch']))
        print(f'{len(stranded)} branch(es) carry commits that no open PR tracks:')
        print('')
        for r in stranded:
            age = f'{r["age"]}d' if r['age'] is not None else '?'
            print(f'  {r["branch"]}')
            print(f'    {r["commits"]} commit(s) not on main, newest {age} old, tip {r["tip"]}')
        print('')

    if unmeasurable:
        print(f'{len(unmeasurable)} branch(es) UNMEASURABLE in this clone '
              '(no merge-base with main).')
        print('  This is a shallow checkout. Run on a full clone; do not read')
        print('  this as "clean".')
        print('')

    if excluded:
        print(f'{len(excluded)} excluded by {LEDGER.name}, reported not failed:')
        for r in excluded:
            print(f'  {r["branch"]} — {excl[r["branch"]].get("reason", "no reason given")}')
        print('')

    if not stranded and not unmeasurable:
        print('No untracked work. ✓')
        return 0

    print('Each of these is finished work that will never reach main on its own.')
    print('Open a PR from the branch as it stands — do not rebase, amend or')
    print('force-push someone else\'s branch; a merge commit keeps their')
    print('checkout valid. If a branch is deliberately abandoned, record it in')
    print(f'{LEDGER.relative_to(REPO)} with a reason.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
