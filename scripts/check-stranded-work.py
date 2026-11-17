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
      · 4 the exclusions ledger has an entry the detector cannot read
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


def validate_ledger(excl):
    """Problems in the ledger: an unknown disposition, a missing reason or date, a malformed tip."""
    problems = []
    for branch, e in sorted(excl.items()):
        if not isinstance(e, dict):
            problems.append(f'{branch}: entry is not an object')
            continue
        if not str(e.get('reason', '')).strip():
            problems.append(f'{branch}: no reason')
        if not str(e.get('date', '')).strip():
            problems.append(f'{branch}: no date')
        d = e.get('disposition')
        if d is not None and str(d).upper() not in sw.DISPOSITIONS:
            problems.append(f'{branch}: unknown disposition {d!r} (one of {", ".join(sorted(sw.DISPOSITIONS))})')
        t = e.get('tip')
        if t is not None and not (isinstance(t, str) and 7 <= len(t) <= 40 and all(c in '0123456789abcdef' for c in t)):
            problems.append(f'{branch}: tip {t!r} is not a 7-40 character lowercase commit SHA')
    return problems


def read_open_prs(path, closed=None):
    """sw.read_prs on a file, or on stdin when no path is given. None when there is no open-PR data."""
    if not path:
        raw = '' if sys.stdin.isatty() else sys.stdin.read()
        if not raw.strip():
            return None
        tmp = pathlib.Path(os.environ.get('TMPDIR', '/tmp'), f'stranded-open-prs-{os.getpid()}.json')
        tmp.write_text(raw, encoding='utf-8')
        path = tmp
    return sw.read_prs(path, closed)


def residue_line(r):
    res = r.get('residue') or {}
    return f'{sum(res.values())} line(s) in {len(res)} file(s) not on main'


def run(repo_path, open_prs, tasks_path, plan_out, repo_slug, ledger, out=print, closed_prs=None, decisions_out=None):
    repo = sw.Repo(repo_path)
    prs = read_open_prs(open_prs, closed_prs)
    tracked = prs and prs['open']

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
    problems = validate_ledger(excl)
    rows, shallow = sw.classify_all(repo, tracked, excl, prs=prs)
    by = {}
    for r in rows:
        by.setdefault(r['state'], []).append(r)
    n = lambda s: len(by.get(s, []))  # noqa: E731
    disjoint = by.get('DISJOINT', [])
    pre_residue = [r for r in disjoint if r['residue']]

    out(f'  open PRs: {sum(len(v) for v in tracked.values())} '
        f'({sum(len(v) for v in prs["recovery"].values())} declaring a recovery; '
        f'{"closed PRs not supplied" if closed_prs is None else str(sum(len(v) for v in prs["rejected"].values())) + " closed unmerged"})')
    out(f'  tasks:    {"NONE SUPPLIED - everything stranded is treated as new" if tasks is None else len(tasks)}'
        + (f' ({len(tasks.duplicates)} duplicate open issue(s))' if tasks is not None and tasks.duplicates else ''))
    out(f'  branches: {len(rows)}  ({n("MERGED")} merged, {n("TRACKED")} tracked by an open PR, '
        f'{n("LANDED")} landed by content, {len(disjoint)} pre-rewrite, {n("EXCLUDED")} excluded, '
        f'{n("HELD")} held by a recorded decision, {n("RECOVERING")} with a recovery PR open)')
    out('')
    if problems:
        out(f'{len(problems)} problem(s) in {ledger.name}:')
        for p in problems:
            out(f'  {p}')
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

    for state, label in (('RECOVERING', 'have a recovery PR open (not shipped until it merges)'),
                         ('HELD', 'are held by a recorded decision (task open, no alert, never recovered automatically)')):
        group = [r for r in by.get(state, []) if not r.get('disjoint')]
        if group:
            out(f'{len(group)} branch(es) {label}:')
            for r in sorted(group, key=lambda r: r['branch']):
                extra = (f'recovery PR {", ".join("#" + str(p["number"]) for p in r["recovery_prs"])}'
                         if state == 'RECOVERING' else f'{r["disposition"]}: {r["decision"].get("reason", "")[:110]}')
                out(f'  {r["branch"]}  ({residue_line(r)}; {extra})')
            out('')
    with_task = [r for r in by.get('TRACKED', []) if (tasks or {}).get('branch:' + r['short'])]
    if with_task:
        out(f'{len(with_task)} branch(es) with a recovery task now have an open PR (the task stays open until main has it):')
        for r in with_task:
            out(f'  {r["branch"]}  PR {", ".join("#" + str(p["number"]) + (" draft" if p["draft"] else "") for p in r["prs"])}')
        out('')

    qualifications = {}
    for r in by.get('STRANDED', []):
        qualifications['branch:' + r['short']] = sw.qualify(repo, r)
    if qualifications:
        auto = sorted(k for k, q in qualifications.items() if q['verdict'] == 'AUTO')
        out(f'Qualification: {len(auto)} of {len(qualifications)} stranded branch(es) qualify for automated recovery '
            f'(a draft PR from the branch as it stands); the rest go to owner review.')
        for k, q in sorted(qualifications.items()):
            failed = [c['check'] for c in q['checks'] if not c['ok']]
            out(f'  {q["verdict"]:6} {k}' + (f'  (fails: {"; ".join(failed)})' if failed else ''))
        out('')
    if decisions_out:
        record = [{'key': k, 'branch': next(r['branch'] for r in rows if 'branch:' + r['short'] == k), **q}
                  for k, q in sorted(qualifications.items())]
        pathlib.Path(decisions_out).write_text(json.dumps(record, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    landed = by.get('LANDED', [])
    if landed:
        out(f'{len(landed)} branch(es) are not ancestors of main but everything they change is on main '
            '(squashed, cherry-picked or redone); safe to delete, never a task:')
        for r in sorted(landed, key=lambda r: r['branch']):
            out(f'  {r["branch"]}  ({r["commits"]} commit(s), tip {r["tip"]})')
        out('')

    held_disjoint = [r for r in by.get('HELD', []) if r.get('disjoint')]
    if held_disjoint:
        out(f'{len(held_disjoint)} pre-rewrite branch(es) held by a recorded decision (listed in the pre-rewrite task):')
        for r in sorted(held_disjoint, key=lambda r: r['branch']):
            out(f'  {r["branch"]}  {r["disposition"]}; {residue_line(r)}')
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
    stale_pins = [r for r in rows if r.get('stale_disposition')]
    if stale_pins:
        out(f'{len(stale_pins)} {ledger.name} entr(ies) cover an older tip; the branch has moved on, so the decision '
            'no longer applies and the branch is classified without it:')
        for r in stale_pins:
            out(f'  {r["branch"]}  decision for {r["stale_disposition"]["tip"]}, tip now {r["tip"]}')
        out('')
    covered = {r['branch'] for r in rows if r['state'] in ('EXCLUDED', 'HELD') or r.get('stale_disposition')}
    stale = sorted(set(excl) - covered)
    if stale:
        out(f'{len(stale)} {ledger.name} entr(ies) no longer match an unmerged branch (merged, tracked by an open PR, or deleted); '
            'the entry can go:')
        for b in stale:
            out(f'  {b}')
        out('')

    plan = sw.plan_tasks(rows, tasks, repo_slug, qualifications)
    plan += sw.plan_recoveries(rows, qualifications, repo_slug)
    if plan_out:
        pathlib.Path(plan_out).write_text(json.dumps(plan, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    alerts = [a for a in plan if a['alert']]
    if plan:
        out(f'Recovery tasks: {sum(a["action"] == "create" for a in plan)} to open, '
            f'{sum(a["action"] == "reopen" for a in plan)} to reopen, {sum(a["action"] == "update" for a in plan)} to update, '
            f'{sum(a["action"] == "close" for a in plan)} to close'
            f' ({sum(bool(a.get("duplicate")) for a in plan)} as duplicates); '
            f'{sum(a["action"] == "recover" for a in plan)} draft recovery PR(s) qualified.')
        for a in plan:
            target = f'#{a["issue"]}' if a.get('issue') else ('draft PR' if a['action'] == 'recover' else 'new issue')
            out(f'  {a["action"]:7} {target:>10}  {a["key"]}{"  <- NEW" if a["alert"] else ""}'
                f'{"  (wording refresh)" if a.get("refresh") else ""}{"  (duplicate)" if a.get("duplicate") else ""}')
        out('')

    if unmeasurable:
        return 3
    if alerts:
        out(f'{len(alerts)} newly stranded item(s). Each is finished work that will never reach main on its own;')
        out('its recovery task says how to land it, or how to record it as deliberately left.')
        return 1
    if problems:
        out(f'{len(problems)} problem(s) in {ledger.name}; a decision the detector cannot read is not a decision.')
        return 4
    known = len(stranded) + (1 if pre_residue else 0)
    held_n = len([r for r in by.get('HELD', []) if not r.get('disjoint')]) + len(by.get('RECOVERING', []))
    tail = f'; {held_n} held or recovering, each task open' if held_n else ''
    out(f'No newly stranded work. ✓  ({known} known item(s), each with an open recovery task{tail})' if known or held_n
        else 'No untracked work. ✓')
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--open-prs', help='JSON file of open PRs (else stdin)')
    ap.add_argument('--tasks', help='JSON file of existing recovery issues (gh issue list --label stranded-work '
                                    '--state all --json number,state,body). Omit and everything stranded is new.')
    ap.add_argument('--closed-prs', help='JSON file of closed PRs (gh pr list --state closed --json number,headRefName,'
                                         'mergedAt). A PR from a branch closed unmerged blocks its automated recovery; '
                                         'without this file, rejections are unknown and nothing qualifies.')
    ap.add_argument('--plan-out', help='write the planned task actions here, for apply-stranded-work-tasks.py')
    ap.add_argument('--decisions-out', help='write the qualification decision record (every check, per branch) here')
    ap.add_argument('--repo-slug', default=os.environ.get('GITHUB_REPOSITORY'),
                    help='owner/name, for compare links in task bodies (default: $GITHUB_REPOSITORY)')
    ap.add_argument('--validate-ledger', action='store_true',
                    help='only check data/stranded_work_exclusions.json (no git, no PR data); exit 4 on a problem')
    ap.add_argument('--repo-path', default=str(REPO), help=argparse.SUPPRESS)
    ap.add_argument('--exclusions', default=str(LEDGER), help=argparse.SUPPRESS)
    args = ap.parse_args()
    if args.validate_ledger:
        path = pathlib.Path(args.exclusions)
        try:
            problems = validate_ledger(load_exclusions(path))
        except (ValueError, OSError) as e:
            problems = [f'cannot read {path.name}: {e}']
        for p in problems:
            print(f'  {p}')
        print(f'{path.name}: {len(problems)} problem(s)' if problems else f'{path.name}: every entry readable ✓')
        return 4 if problems else 0
    return run(args.repo_path, args.open_prs, args.tasks, args.plan_out, args.repo_slug,
               pathlib.Path(args.exclusions), closed_prs=args.closed_prs, decisions_out=args.decisions_out)


if __name__ == '__main__':
    sys.exit(main())
