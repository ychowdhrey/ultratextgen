#!/usr/bin/env python3
"""Find work that will never reach `main` because nothing tracks it, and plan a recovery task for each.

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

What it reports, and when it fails
----------------------------------
The definitions live in `scripts/lib/stranded_work.py`. In short: a branch whose
content main already has (squash, cherry-pick, redone elsewhere) is LANDED and
never a task; a branch carrying content main lacks with no open PR is STRANDED and
gets one recovery issue; branches cut before main's history was rewritten on
2026-07-10 share no commit with main and are measured by content (DISJOINT), their
residue listed in one recovery issue.

The run fails only on something NEW: a stranded branch with no recovery task, a
task closed while its work is still stranded, new commits on a stranded branch, or
a branch new to the pre-rewrite list. A known backlog item has its task and is
reported every run without turning it red. That replaces an age cut-off: a branch
whose PR is closed unmerged a week after its last commit is newly stranded, and a
"newer than N days" rule would never have alerted on it.

Two design constraints, both learned from getting them wrong
------------------------------------------------------------
**1. Ancestry needs a full clone.** On a shallow clone `git merge-base` is empty
for most branches and `git rev-list main..branch` then reports a branch's whole
history as unmerged ("399 branches carrying 420,704 commits" was one such
measurement). A shallow clone's empty merge-base is UNMEASURABLE and fails the run
(exit 3). On a full clone an empty merge-base means genuinely unrelated history,
which is measured by content instead. The 381 "unmeasurable" branches the
scheduled run reported every day through 2026-11-11 were that case, on a full
clone: all of them hang off the pre-rewrite root.

**2. It fails closed.** No open-PR data means it cannot tell STRANDED from TRACKED
(exit 2). No recovery-task list means it cannot tell new from known, so everything
stranded is planned as new and the run fails.

Inputs arrive as files, so the script is network-free and testable; the workflow
fetches them with `gh` and applies the planned tasks with
`scripts/apply-stranded-work-tasks.py`.

Usage:
    gh pr list --state open --json number,headRefName --limit 300 > prs.json
    gh issue list --label stranded-work --state all --json number,state,body --limit 500 > tasks.json
    python3 scripts/check-stranded-work.py --open-prs prs.json --tasks tasks.json --plan-out plan.json

Exit: 0 nothing new · 1 newly stranded work (tasks planned) · 2 no open-PR data · 3 UNMEASURABLE (shallow clone)
"""
import argparse
import json
import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent / 'lib'))
import stranded_work as sw  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
LEDGER = REPO / 'data' / 'stranded_work_exclusions.json'


def load_exclusions(path):
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding='utf-8'))
    return {k: v for k, v in data.items() if not k.startswith('_')}


def read_open_prs(path):
    raw = pathlib.Path(path).read_text(encoding='utf-8') if path else (
        '' if sys.stdin.isatty() else sys.stdin.read()
    )
    raw = raw.strip()
    if not raw:
        return None
    refs = set()
    for pr in json.loads(raw):
        ref = pr.get('headRefName') or (pr.get('head') or {}).get('ref')
        if ref:
            refs.add(ref)
    return refs


def residue_line(r):
    res = r.get('residue') or {}
    return f'{sum(res.values())} line(s) in {len(res)} file(s) not on main'


def run(repo_path, open_prs, tasks_path, plan_out, repo_slug, ledger, out=print):
    repo = sw.Repo(repo_path)
    tracked = read_open_prs(open_prs)

    out('Stranded-work check')
    out(f'  base:     {repo.main} @ {repo.git("rev-parse", "--short", repo.main).strip()}')

    if tracked is None:
        out('  open PRs: NONE SUPPLIED')
        out('')
        out('Cannot distinguish tracked work from stranded work without the')
        out('open-PR list, and reporting "0 stranded" from here would be a')
        out('reassuring lie. Pass it in:')
        out('')
        out('  gh pr list --state open --json number,headRefName --limit 300 > prs.json')
        out('  python3 scripts/check-stranded-work.py --open-prs prs.json')
        return 2

    tasks = sw.read_tasks(tasks_path)
    excl = load_exclusions(ledger)
    rows, shallow = sw.classify_all(repo, tracked, excl)
    by = {}
    for r in rows:
        by.setdefault(r['state'], []).append(r)
    n = lambda s: len(by.get(s, []))  # noqa: E731
    disjoint = by.get('DISJOINT', [])
    pre_residue = [r for r in disjoint if r['residue']]

    out(f'  open PRs: {len(tracked)}')
    out(f'  tasks:    {"NONE SUPPLIED - everything stranded is treated as new" if tasks is None else len(tasks)}')
    out(f'  branches: {len(rows)}  ({n("MERGED")} merged, {n("TRACKED")} tracked by an open PR, '
        f'{n("LANDED")} landed by content, {len(disjoint)} pre-rewrite, {n("EXCLUDED")} excluded)')
    out('')

    stranded = sorted(by.get('STRANDED', []), key=lambda r: (-(r.get('age') or 0), r['branch']))
    if stranded:
        out(f'{len(stranded)} branch(es) carry work that no open PR tracks:')
        out('')
        for r in stranded:
            task = (tasks or {}).get('branch:' + r['short'])
            ref = f'task #{task["number"]} ({task.get("state", "?").lower()})' if task else 'NO TASK YET'
            out(f'  {r["branch"]}  [{ref}]')
            out(f'    {r["commits"]} commit(s) not on main, newest {r.get("age", "?")}d old, tip {r["tip"]}; '
                f'{residue_line(r)}')
        out('')

    landed = by.get('LANDED', [])
    if landed:
        out(f'{len(landed)} branch(es) are not ancestors of main but everything they change is on main '
            '(squashed, cherry-picked or redone); safe to delete, never a task:')
        for r in sorted(landed, key=lambda r: r['branch']):
            out(f'  {r["branch"]}  ({r["commits"]} commit(s), tip {r["tip"]})')
        out('')

    if disjoint:
        moved = sum(1 for r in disjoint if not r['residue'] and r['moved'])
        out(f'{len(disjoint)} branch(es) predate the 2026-07-10 history rewrite (no common commit with main; '
            'measured by content):')
        out(f'  {len(disjoint) - len(pre_residue) - moved} have every commit on main')
        out(f'  {moved} differ only in paths moved out of this repository by the rewrite')
        out(f'  {len(pre_residue)} carry content main does not have (one recovery task lists them):')
        for r in sorted(pre_residue, key=lambda r: -sum(r['residue'].values())):
            out(f'    {r["branch"]}  newest {r.get("date", "?")}; {residue_line(r)}')
        out('')

    unmeasurable = by.get('UNMEASURABLE', [])
    if unmeasurable:
        out(f'{len(unmeasurable)} branch(es) UNMEASURABLE: no merge-base in this SHALLOW clone.')
        out('  Run on a full clone (fetch-depth: 0); do not read this as "clean".')
        out('')

    excluded = by.get('EXCLUDED', [])
    if excluded:
        out(f'{len(excluded)} excluded by {ledger.name}, reported not failed:')
        for r in excluded:
            out(f'  {r["branch"]} — {excl[r["branch"]].get("reason", "no reason given")}')
        out('')
    stale = sorted(set(excl) - {r['branch'] for r in excluded})
    if stale:
        out(f'{len(stale)} {ledger.name} entr(ies) no longer match an unmerged branch (merged, tracked by an open PR, or deleted); '
            'the entry can go:')
        for b in stale:
            out(f'  {b}')
        out('')

    plan = sw.plan_tasks(rows, tasks, repo_slug)
    if plan_out:
        pathlib.Path(plan_out).write_text(json.dumps(plan, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    alerts = [a for a in plan if a['alert']]
    if plan:
        out(f'Recovery tasks: {sum(a["action"] == "create" for a in plan)} to open, '
            f'{sum(a["action"] == "reopen" for a in plan)} to reopen, {sum(a["action"] == "update" for a in plan)} to update, '
            f'{sum(a["action"] == "close" for a in plan)} to close.')
        for a in plan:
            target = f'#{a["issue"]}' if a.get('issue') else 'new issue'
            out(f'  {a["action"]:6} {target:>10}  {a["key"]}{"  <- NEW" if a["alert"] else ""}')
        out('')

    if unmeasurable:
        return 3
    if alerts:
        out(f'{len(alerts)} newly stranded item(s). Each is finished work that will never reach main on its own;')
        out('its recovery task says how to land it, or how to record it as deliberately left.')
        return 1
    known = len(stranded) + (1 if pre_residue else 0)
    out(f'No newly stranded work. ✓  ({known} known item(s), each with an open recovery task)' if known
        else 'No untracked work. ✓')
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--open-prs', help='JSON file of open PRs (else stdin)')
    ap.add_argument('--tasks', help='JSON file of existing recovery issues (gh issue list --label stranded-work '
                                    '--state all --json number,state,body). Omit and everything stranded is new.')
    ap.add_argument('--plan-out', help='write the planned task actions here, for apply-stranded-work-tasks.py')
    ap.add_argument('--repo-slug', default=os.environ.get('GITHUB_REPOSITORY'),
                    help='owner/name, for compare links in task bodies (default: $GITHUB_REPOSITORY)')
    ap.add_argument('--repo-path', default=str(REPO), help=argparse.SUPPRESS)
    ap.add_argument('--exclusions', default=str(LEDGER), help=argparse.SUPPRESS)
    args = ap.parse_args()
    return run(args.repo_path, args.open_prs, args.tasks, args.plan_out, args.repo_slug,
               pathlib.Path(args.exclusions))


if __name__ == '__main__':
    sys.exit(main())
