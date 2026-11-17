#!/usr/bin/env python3
"""Apply the recovery-task plan `check-stranded-work.py --plan-out` wrote, as GitHub issues.

Kept apart from the detector so the detector stays network-free and testable; this is the
only part that talks to GitHub, through `gh`. Every action is idempotent against the
marker the detector writes into each issue body, so a rerun of the same day's plan
creates nothing twice: the detector re-reads the issues before planning.

Recovery PRs (action `recover`) are opened only with --recover, which the workflow passes only when
the repository variable STRANDED_AUTO_RECOVERY is 'true'. Without it they are listed as skipped, so
the decision record is still visible every run. Each is a DRAFT PR from the stranded branch as it
stands: the branch is never rebased, amended or force-pushed, and nothing here merges anything.
Before creating one it asks GitHub again whether any PR is open from that branch, so two runs that
overlap, or a person who opened one since the plan was written, never produce a second.

Usage (needs GH_TOKEN with issues: write; pull-requests: write for --recover):
    python3 scripts/apply-stranded-work-tasks.py plan.json
    python3 scripts/apply-stranded-work-tasks.py plan.json --dry-run
    python3 scripts/apply-stranded-work-tasks.py plan.json --recover

Exit 0 when every action applied, 1 when any failed (each failure is printed). A failed action
leaves GitHub as it was for that item; the next run re-plans from live state and retries it.
"""
import argparse
import json
import pathlib
import subprocess
import sys
import tempfile

LABEL = 'stranded-work'  # created by the workflow step that lists the tasks


def gh(args, dry, capture=False):
    print('  gh ' + ' '.join(a if len(a) < 60 else a[:57] + '...' for a in args))
    if dry:
        return (True, '[]') if capture else True
    r = subprocess.run(['gh', *args], capture_output=True, text=True)
    if r.returncode:
        print(f'    FAILED: {r.stderr.strip()}')
    return (r.returncode == 0, r.stdout) if capture else r.returncode == 0


def open_prs_from(branch, dry):
    """PR numbers open from `branch` right now, or None when GitHub could not be asked (then: do nothing)."""
    ok, out = gh(['pr', 'list', '--head', branch, '--state', 'open', '--json', 'number'], dry, capture=True)
    if not ok:
        return None
    try:
        return [p['number'] for p in json.loads(out or '[]')]
    except (ValueError, KeyError, TypeError):
        return None


def body_file(text):
    f = tempfile.NamedTemporaryFile('w', suffix='.md', delete=False, encoding='utf-8')
    f.write(text)
    f.close()
    return f.name


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('plan')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--recover', action='store_true', help='open the qualified draft recovery PRs (off by default)')
    args = ap.parse_args()
    plan = json.loads(pathlib.Path(args.plan).read_text(encoding='utf-8'))
    if not plan:
        print('No recovery-task changes.')
        return 0

    ok = True
    for a in plan:
        n = str(a.get('issue', ''))
        if a['action'] == 'create':
            ok &= gh(['issue', 'create', '--title', a['title'], '--label', LABEL, '--body-file', body_file(a['body'])],
                     args.dry_run)
        elif a['action'] in ('reopen', 'update'):
            if a['action'] == 'reopen':
                ok &= gh(['issue', 'reopen', n], args.dry_run)
            ok &= gh(['issue', 'edit', n, '--title', a['title'], '--body-file', body_file(a['body'])], args.dry_run)
            if a.get('comment'):
                ok &= gh(['issue', 'comment', n, '--body', a['comment']], args.dry_run)
        elif a['action'] == 'close':
            ok &= gh(['issue', 'close', n, '--reason', a.get('reason') or 'completed', '--comment', a['comment']],
                     args.dry_run)
        elif a['action'] == 'recover':
            if not args.recover:
                print(f'  skipped: draft recovery PR for {a["branch"]} (automated recovery is off; '
                      'set STRANDED_AUTO_RECOVERY=true to allow it)')
                continue
            existing = open_prs_from(a['branch'], args.dry_run)
            if existing is None:
                print(f'    not opened: could not confirm that no PR is open from {a["branch"]}')
                ok = False
            elif existing:
                print(f'    not opened: PR {", ".join("#" + str(x) for x in existing)} is already open from {a["branch"]}')
            else:
                ok &= gh(['pr', 'create', '--draft', '--base', 'main', '--head', a['branch'], '--title', a['title'],
                          '--body-file', body_file(a['body'])], args.dry_run)
        else:
            print(f'  unknown action {a["action"]!r}')
            ok = False
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
