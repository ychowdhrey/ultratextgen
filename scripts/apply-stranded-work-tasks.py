#!/usr/bin/env python3
"""Apply the recovery-task plan `check-stranded-work.py --plan-out` wrote, as GitHub issues.

Kept apart from the detector so the detector stays network-free and testable; this is the
only part that talks to GitHub, through `gh`. Every action is idempotent against the
marker the detector writes into each issue body, so a rerun of the same day's plan
creates nothing twice: the detector re-reads the issues before planning.

Usage (needs GH_TOKEN with issues: write):
    python3 scripts/apply-stranded-work-tasks.py plan.json
    python3 scripts/apply-stranded-work-tasks.py plan.json --dry-run

Exit 0 when every action applied, 1 when any failed (each failure is printed).
"""
import argparse
import json
import pathlib
import subprocess
import sys
import tempfile

LABEL = 'stranded-work'  # created by the workflow step that lists the tasks


def gh(args, dry):
    print('  gh ' + ' '.join(a if len(a) < 60 else a[:57] + '...' for a in args))
    if dry:
        return True
    r = subprocess.run(['gh', *args], capture_output=True, text=True)
    if r.returncode:
        print(f'    FAILED: {r.stderr.strip()}')
    return r.returncode == 0


def body_file(text):
    f = tempfile.NamedTemporaryFile('w', suffix='.md', delete=False, encoding='utf-8')
    f.write(text)
    f.close()
    return f.name


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('plan')
    ap.add_argument('--dry-run', action='store_true')
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
            ok &= gh(['issue', 'close', n, '--reason', 'completed', '--comment', a['comment']], args.dry_run)
        else:
            print(f'  unknown action {a["action"]!r}')
            ok = False
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
