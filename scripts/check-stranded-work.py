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

import os

REPO = pathlib.Path(os.environ.get('STRANDED_WORK_REPO') or pathlib.Path(__file__).resolve().parent.parent)
LEDGER = REPO / 'data' / 'stranded_work_exclusions.json'  # read relative to the measured repo
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


def is_shallow():
    return git('rev-parse', '--is-shallow-repository') == 'true'


def classify(branch, tracked_refs, shallow=None):
    """MERGED / TRACKED / STRANDED / UNRELATED / UNMEASURABLE for one branch.

    No merge-base means two different things depending on the clone, and the
    difference decides whether the run may pass:

    * shallow clone: the graft hides the common ancestor. UNMEASURABLE, and it
      fails closed -- this clone cannot answer the question.
    * full clone: the branch and main genuinely share no history. Measured
      2026-11-11 on a full clone: all 381 such branches share one root commit
      that main does not have, and none carries a commit newer than
      2026-07-10 -- main's history was rewritten then. UNRELATED is reported
      with its age; it fails the run only when it is recent, exactly like
      STRANDED. Before this split the 381 failed every scheduled run (and
      were described as "a shallow checkout", which the CI checkout is not).
    """
    tip = git('rev-parse', branch)
    if not tip:
        return None
    if shallow is None:
        shallow = is_shallow()
    iso = git('log', '-1', '--format=%cI', branch)
    age = None
    if iso:
        when = dt.datetime.fromisoformat(iso)
        age = (dt.datetime.now(dt.timezone.utc) - when).days

    if not git('merge-base', MAIN, branch):
        return {'state': 'UNMEASURABLE' if shallow else 'UNRELATED', 'branch': branch,
                'tip': tip[:9], 'commits': 0, 'age': age, 'equivalent': None}

    on_main = subprocess.run(
        ['git', 'merge-base', '--is-ancestor', tip, MAIN], cwd=REPO
    ).returncode == 0
    if on_main:
        return {'state': 'MERGED', 'branch': branch, 'tip': tip[:9],
                'commits': 0, 'age': age, 'equivalent': None}

    n = int(git('rev-list', '--count', '--no-merges', f'{MAIN}..{branch}') or 0)
    # `git cherry` marks a commit '-' when an equivalent patch is already on
    # main (cherry-picked or re-landed by another PR). All '-' means the work
    # reached main another way: a superseded candidate, not lost work.
    cherry = git('cherry', MAIN, branch).splitlines()
    equivalent = sum(1 for c in cherry if c.startswith('-'))

    short = branch.split('/', 1)[1] if '/' in branch else branch
    state = 'TRACKED' if short in tracked_refs else 'STRANDED'
    return {'state': state, 'branch': branch, 'tip': tip[:9],
            'commits': n, 'age': age, 'equivalent': equivalent,
            'unique': max(len(cherry) - equivalent, 0)}


def recovery_action(r, excl):
    """The recommended action for one stranded branch. Advisory: nothing here
    merges, deletes, rebases or force-pushes anyone's branch."""
    if r['branch'] in excl:
        return 'excluded', excl[r['branch']].get('reason', 'no reason given')
    if r.get('unique') == 0 and r.get('commits'):
        return 'superseded-candidate', ('every commit has an equivalent patch on main; '
                                        'confirm, then record in the exclusions ledger')
    return 'open-pr', 'open a PR from the branch as it stands (a merge commit, never a rebase)'


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
    ap.add_argument('--fail-newer-than-days', type=int, default=None,
                    help='fail only on stranded branches whose newest commit is at most this many days old; '
                         'older ones are listed as a standing backlog without failing (the scheduled run uses 3)')
    ap.add_argument('--json', help='also write every non-clean branch as a recovery record (category, action) to this file')
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
    shallow = is_shallow()
    rows = [r for r in (classify(b, tracked, shallow) for b in branches()) if r]

    buckets = {}
    for r in rows:
        buckets.setdefault(r['state'], []).append(r)

    stranded = [r for r in buckets.get('STRANDED', [])
                if r['branch'] not in excl]
    excluded = [r for r in buckets.get('STRANDED', []) if r['branch'] in excl]
    unmeasurable = buckets.get('UNMEASURABLE', [])
    unrelated = buckets.get('UNRELATED', [])
    window = args.fail_newer_than_days

    def recent(r):
        # A branch with no measurable age counts as recent, so it can never be waved through.
        return window is None or r['age'] is None or r['age'] <= window

    print(f'  clone:    {"SHALLOW" if shallow else "full"}')
    print(f'  branches: {len(rows)}  '
          f'({len(buckets.get("MERGED", []))} merged, '
          f'{len(buckets.get("TRACKED", []))} tracked by an open PR, '
          f'{len(unrelated)} with unrelated history)')
    print('')

    if stranded:
        stranded.sort(key=lambda r: (-(r['age'] or 0), r['branch']))
        print(f'{len(stranded)} branch(es) carry commits that no open PR tracks:')
        print('')
        for r in stranded:
            age = f'{r["age"]}d' if r['age'] is not None else '?'
            action, _ = recovery_action(r, excl)
            print(f'  {r["branch"]}')
            print(f'    {r["commits"]} commit(s) not on main ({r["unique"]} with no equivalent patch on main), '
                  f'newest {age} old, tip {r["tip"]} -> {action}')
        print('')

    if unmeasurable:
        print(f'{len(unmeasurable)} branch(es) UNMEASURABLE: this is a shallow clone, so no merge-base')
        print('  could be resolved. Run on a full clone; do not read this as "clean".')
        print('')

    if unrelated:
        newest = min((r['age'] for r in unrelated if r['age'] is not None), default=None)
        print(f'{len(unrelated)} branch(es) share NO history with main on this full clone (a history')
        print(f'  rewrite left them behind); newest commit {newest}d old. Their content cannot be')
        print('  measured against main by ancestry; recover by reading, never by merging.')
        late = [r for r in unrelated if recent(r)]
        for r in late:
            print(f'  RECENT: {r["branch"]} tip {r["tip"]}, newest {r["age"]}d old')
        print('')

    if excluded:
        print(f'{len(excluded)} excluded by {LEDGER.name}, reported not failed:')
        for r in excluded:
            print(f'  {r["branch"]} — {excl[r["branch"]].get("reason", "no reason given")}')
        print('')

    new_stranded = [r for r in stranded if recent(r)]
    new_unrelated = [r for r in unrelated if recent(r)]
    backlog = [r for r in stranded if not recent(r)]
    if window is not None and backlog:
        print(f'{len(backlog)} stranded branch(es) are older than {window} day(s): standing backlog, '
              'reported every run, not failed.')
        print('')

    if args.json:
        def rec(r, category):
            action, why = recovery_action(r, excl) if r['state'] == 'STRANDED' else (
                'read-and-decide' if r['state'] == 'UNRELATED' else 'rerun-on-full-clone', '')
            return {**r, 'category': category, 'action': action, 'action_basis': why}
        out = {
            'base': git('rev-parse', MAIN), 'clone': 'shallow' if shallow else 'full',
            'generated_at': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
            'fail_newer_than_days': window,
            'counts': {'branches': len(rows), 'merged': len(buckets.get('MERGED', [])),
                       'tracked': len(buckets.get('TRACKED', [])), 'new_stranded': len(new_stranded),
                       'historical_stranded': len(backlog), 'excluded': len(excluded),
                       'superseded_candidates': sum(1 for r in stranded if recovery_action(r, excl)[0] == 'superseded-candidate'),
                       'unrelated_history': len(unrelated), 'unrelated_recent': len(new_unrelated),
                       'unmeasurable': len(unmeasurable)},
            'records': ([rec(r, 'new-stranded') for r in new_stranded]
                        + [rec(r, 'historical-stranded') for r in backlog]
                        + [rec(r, 'excluded') for r in excluded]
                        + [rec(r, 'unrelated-history') for r in unrelated]
                        + [rec(r, 'unmeasurable') for r in unmeasurable]),
        }
        pathlib.Path(args.json).write_text(json.dumps(out, indent=1, sort_keys=True) + '\n', encoding='utf-8')

    if not new_stranded and not unmeasurable and not new_unrelated:
        print('No newly stranded work. ✓' if window is not None else 'No untracked work. ✓')
        return 0

    print('Each of these is finished work that will never reach main on its own.')
    print('Open a PR from the branch as it stands — do not rebase, amend or')
    print('force-push someone else\'s branch; a merge commit keeps their')
    print('checkout valid. If a branch is deliberately abandoned, record it in')
    print(f'{LEDGER.relative_to(REPO)} with a reason.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
