#!/usr/bin/env python3
"""Tests for the stranded-work detector, against throwaway git repositories.

Each fixture is a bare "origin" plus a full clone, built so that every state the detector
distinguishes exists exactly once, including the pre-rewrite case that the daily run reported
as 381 UNMEASURABLE branches until 2026-11-11. Run: python3 scripts/test-check-stranded-work.py
"""
import io
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import contextlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / 'lib'))
sys.path.insert(0, str(HERE))
import stranded_work as sw  # noqa: E402

check = __import__('check-stranded-work')

FAILS = []


def expect(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        FAILS.append(msg)


def sh(cwd, *args, env=None):
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, env={**os.environ, **(env or {})})
    if r.returncode:
        raise RuntimeError(f'{args}: {r.stderr}')
    return r.stdout.strip()


def commit(cwd, msg, files, date, delete=()):
    for path, text in files.items():
        p = pathlib.Path(cwd, path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
        sh(cwd, 'git', 'add', path)
    for path in delete:
        sh(cwd, 'git', 'rm', '-q', path)
    env = {'GIT_AUTHOR_DATE': date, 'GIT_COMMITTER_DATE': date}
    sh(cwd, 'git', 'commit', '-q', '-m', msg, env=env)
    return sh(cwd, 'git', 'rev-parse', 'HEAD')


def build(root):
    """Return (clone path, bare path). Branch → intended state is in the names."""
    root = pathlib.Path(root)
    bare, work = root / 'origin.git', root / 'work'
    sh(root, 'git', 'init', '-q', '--bare', str(bare))
    sh(root, 'git', 'init', '-q', '-b', 'main', str(work))
    for k, v in (('user.email', 'a@example.com'), ('user.name', 'A'), ('commit.gpgsign', 'false')):
        sh(work, 'git', 'config', k, v)
    sh(work, 'git', 'remote', 'add', 'origin', str(bare))
    d = lambda n: f'2026-08-{n:02d}T10:00:00+00:00'  # noqa: E731

    # Pre-rewrite history: old root, then a branch off it.
    sh(work, 'git', 'checkout', '-q', '--orphan', 'old')
    # The old root carries a path the rewrite filtered out, so its tree (and every SHA after it) differs.
    commit(work, 'init', {'page.html': 'a\nb\n', 'strategy/readme.md': 'old\n'}, d(1))
    commit(work, 'add strategy doc', {'strategy/plan.md': 'secret\n'}, d(2))
    commit(work, 'add faq', {'page.html': 'a\nb\nfaq\n'}, d(3))
    old_tip = sh(work, 'git', 'rev-parse', 'HEAD')
    sh(work, 'git', 'checkout', '-q', '-b', 'old-reconciled')          # every commit has a twin on main
    sh(work, 'git', 'checkout', '-q', old_tip)
    sh(work, 'git', 'checkout', '-q', '-b', 'old-moved')               # only touches a moved-out path
    commit(work, 'more strategy', {'strategy/plan.md': 'secret\nmore\n'}, d(4))
    sh(work, 'git', 'checkout', '-q', old_tip)
    sh(work, 'git', 'checkout', '-q', '-b', 'old-residue')             # content main never got
    commit(work, 'add pricing table', {'page.html': 'a\nb\nfaq\npricing table\n'}, d(5))

    # Rewritten main: same author dates, emails and subjects, strategy/ filtered out.
    sh(work, 'git', 'checkout', '-q', '--orphan', 'main')
    sh(work, 'git', 'rm', '-rq', '--cached', '.')
    for p in ('page.html', 'strategy'):
        sh(work, 'rm', '-rf', p)
    commit(work, 'init', {'page.html': 'a\nb\n'}, d(1))
    commit(work, 'add faq', {'page.html': 'a\nb\nfaq\n'}, d(3))
    base = sh(work, 'git', 'rev-parse', 'HEAD')

    def branch(name, *commits):
        sh(work, 'git', 'checkout', '-q', '-b', name, base)
        for c in commits:
            commit(work, *c)
        sh(work, 'git', 'checkout', '-q', 'main')

    branch('merged', ('merged work', {'merged.txt': 'm\n'}, d(10)))
    branch('stranded', ('lost page', {'lost.html': 'lost line\n'}, d(11)))
    branch('tracked', ('pr work', {'tracked.txt': 't\n'}, d(12)))
    branch('excluded', ('dead work', {'dead.txt': 'd\n'}, d(13)))
    branch('landed', ('fix typo', {'page.html': 'a\nb\nfaq\nfixed\n'}, d(14)))
    branch('deletes', ('drop page', {}, d(15), ('page.html',)))
    branch('docsonly', ('add a design note', {'docs/notes.md': 'a design note\n'}, d(17)))
    sh(work, 'git', 'merge', '-q', '--no-ff', '-m', 'Merge merged', 'merged')
    # The landed branch's change reaches main as a different commit (a squash), so it is not an ancestor.
    commit(work, 'squash: fix typo', {'page.html': 'a\nb\nfaq\nfixed\n'}, d(16))

    for b in ('main', 'merged', 'stranded', 'tracked', 'excluded', 'landed', 'deletes', 'docsonly',
              'old-reconciled', 'old-moved', 'old-residue'):
        sh(work, 'git', 'push', '-q', 'origin', b)
    sh(work, 'git', 'fetch', '-q', 'origin')
    return work, bare


def run(work, tasks=None, prs=('tracked',), excl=('origin/excluded',), tmp=None, closed=(), keep_recover=False):
    """prs: head names, or PR dicts as gh prints them. excl: branch names, or {branch: ledger entry}.
    closed: closed-PR dicts; None means no closed-PR list was supplied."""
    tmp = pathlib.Path(tmp)
    prs_path = tmp / 'prs.json'
    prs_path.write_text(json.dumps([p if isinstance(p, dict) else {'number': 1, 'headRefName': p} for p in prs]))
    closed_path = None
    if closed is not None:
        closed_path = tmp / 'closed.json'
        closed_path.write_text(json.dumps(list(closed)))
    tasks_path = None
    if tasks is not None:
        tasks_path = tmp / 'tasks.json'
        tasks_path.write_text(json.dumps(tasks))
    ledger = tmp / 'excl.json'
    entries = excl if isinstance(excl, dict) else {b: {'reason': 'test', 'date': '2026-11-11'} for b in excl}
    ledger.write_text(json.dumps(entries))
    plan_path = tmp / 'plan.json'
    if plan_path.exists():
        plan_path.unlink()
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        code = check.run(str(work), str(prs_path), tasks_path and str(tasks_path), str(plan_path), 'o/r', ledger,
                         closed_prs=closed_path and str(closed_path))
    plan = json.loads(plan_path.read_text()) if plan_path.exists() else []
    if not keep_recover:  # the recovery stage has its own tests; the task tests read only task actions
        plan = [a for a in plan if a['action'] != 'recover']
    return code, buf.getvalue(), plan


def as_issues(plan, state='OPEN', start=10):
    """The issues GitHub would hold after the plan's creates applied (what the next run reads)."""
    return [{'number': i, 'state': state, 'body': a['body']}
            for i, a in enumerate((a for a in plan if a['action'] == 'create'), start=start)]


def scenarios(work, tmp, first):
    """2026-11-17: recovery, reconciliation and automation. One block per case the brief names."""
    base_tasks = as_issues(first)
    num = {sw.parse_marker(t['body'])['key']: t['number'] for t in base_tasks}
    # The plan written by a run that already saw these issues: the steady state every later case starts from.
    _, _, steady = run(work, tasks=base_tasks, tmp=tmp, keep_recover=True)
    expect(steady == [] or all(a['action'] == 'recover' for a in steady),
           f'repeated run over the issues its own plan created: no task changes (got {[a["action"] for a in steady]})')
    _, _, again = run(work, tasks=base_tasks, tmp=tmp, keep_recover=True)
    expect(again == steady, 'a third run plans exactly what the second did (idempotent)')

    print('existing work on main')
    sh(work, 'git', 'push', '-q', 'origin', 'origin/stranded:refs/heads/main-tmp')
    code, _, plan = run(work, tasks=base_tasks + [{'number': 90, 'state': 'OPEN',
                                                   'body': sw.marker(key='branch:merged', tip='0', v='3')}], tmp=tmp)
    close = [a for a in plan if a['key'] == 'branch:merged']
    expect(len(close) == 1 and close[0]['action'] == 'close' and close[0]['reason'] == 'completed'
           and 'merged into main' in close[0]['comment'], 'a task whose branch is now merged closes as completed')
    sh(work, 'git', 'push', '-q', 'origin', ':main-tmp')

    print('superseded and abandoned work, by recorded decision')
    tip = sw.Repo(work).git('rev-parse', 'origin/stranded').strip()
    for disp in ('SUPERSEDED', 'ABANDONED'):
        excl = {'origin/excluded': {'reason': 'test', 'date': '2026-11-11'},
                'origin/stranded': {'reason': f'redone on main ({disp})', 'date': '2026-11-17', 'disposition': disp,
                                    'tip': tip[:9]}}
        code, _, plan = run(work, tasks=base_tasks, excl=excl, tmp=tmp)
        close = [a for a in plan if a['key'] == 'branch:stranded']
        want = 'completed' if disp == 'SUPERSEDED' else 'not planned'
        expect(code == 0 and len(close) == 1 and close[0]['action'] == 'close' and close[0]['reason'] == want
               and disp in close[0]['comment'], f'{disp} with the current tip: task closes as {want}, naming it')
    excl['origin/stranded']['tip'] = 'deadbeef0'
    code, out, plan = run(work, tasks=base_tasks, excl=excl, tmp=tmp)
    acts = [a for a in plan if a['key'] == 'branch:stranded']
    expect(not any(a['action'] == 'close' for a in acts) and 'cover an older tip' in out,
           'a decision pinned to an older tip does not cover new commits: the branch stays stranded')
    expect(acts and 'no longer covers this branch' in acts[0]['body'], 'and its task says why')

    print('intentional hold')
    hold = {'origin/excluded': {'reason': 'test', 'date': '2026-11-11'},
            'origin/stranded': {'reason': 'needs a re-implementation decision', 'date': '2026-11-17',
                                'disposition': 'INTENTIONAL_HOLD', 'tip': tip[:9]}}
    code, out, plan = run(work, tasks=base_tasks, excl=hold, tmp=tmp, keep_recover=True)
    acts = [a for a in plan if a['key'] == 'branch:stranded']
    expect(code == 0 and len(acts) == 1 and acts[0]['action'] == 'update' and not acts[0]['alert']
           and 'Decision recorded: INTENTIONAL_HOLD' in acts[0]['comment'],
           'a hold keeps the task open, updates it once, no alert')
    expect('Recorded decision: INTENTIONAL_HOLD' in acts[0]['body'] and 'needs a re-implementation decision' in acts[0]['body'],
           'the task shows the decision and its reason')
    expect(not any(a['action'] == 'recover' and a['key'] == 'branch:stranded' for a in plan), 'a held branch is never recovered')
    code, _, plan = run(work, tasks=[t for t in base_tasks if num.get('branch:stranded') != t['number']], excl=hold, tmp=tmp)
    made = [a for a in plan if a['key'] == 'branch:stranded']
    expect(made and made[0]['action'] == 'create' and not made[0]['alert'], 'a held branch with no task gets one, no alert')
    closed_tasks = [dict(t, state='CLOSED') if t['number'] == num['branch:stranded'] else t for t in base_tasks]
    code, _, plan = run(work, tasks=closed_tasks, excl=hold, tmp=tmp)
    ro = [a for a in plan if a['key'] == 'branch:stranded']
    expect(code == 0 and ro and ro[0]['action'] == 'reopen' and not ro[0]['alert'],
           'a closed task of a held branch reopens (the work is not on main) but does not alert')

    print('branch created before the history rewrite')
    pre = {'origin/excluded': {'reason': 'test', 'date': '2026-11-11'},
           'origin/old-residue': {'reason': 'port pending a demand check', 'date': '2026-11-17', 'disposition': 'NEEDS_EVIDENCE'}}
    code, out, plan = run(work, tasks=base_tasks, excl=pre, tmp=tmp, keep_recover=True)
    pr = [a for a in plan if a['key'] == 'pre-rewrite']
    expect(code == 0 and pr and not pr[0]['alert'] and 'Decision recorded, now held: `old-residue`' in pr[0]['comment'],
           'a pre-rewrite branch given an open decision moves to the held list, no alert')
    expect('**Held by a recorded decision** (1)' in pr[0]['body'] and 'port pending a demand check' in pr[0]['body'],
           'the pre-rewrite task lists it under held, with the reason')
    expect(not any(a['action'] == 'recover' and 'old-' in a['key'] for a in plan), 'a pre-rewrite branch is never auto-recovered')
    held_tasks = [dict(t, body=pr[0]['body']) if t['number'] == num['pre-rewrite'] else t for t in base_tasks]
    code, _, plan = run(work, tasks=held_tasks, excl=pre, tmp=tmp)
    expect(not [a for a in plan if a['key'] == 'pre-rewrite'], 'and the next run leaves it alone')

    print('active recovery PR')
    rec = {'number': 41, 'headRefName': 'port-stranded', 'isDraft': True,
           'body': 'Ports part of it.\n' + sw.recovery_marker('branch:stranded', tip[:9])}
    code, out, plan = run(work, tasks=base_tasks, prs=('tracked', rec), tmp=tmp, keep_recover=True)
    acts = [a for a in plan if a['key'] == 'branch:stranded']
    expect(code == 0 and len(acts) == 1 and acts[0]['action'] == 'update' and '#41' in acts[0]['comment']
           and not acts[0]['alert'], 'an open recovery PR is noted on the task once, no alert, task stays open')
    expect('1 branch(es) have a recovery PR open' in out and 'origin/stranded' in out.split('have a recovery PR open')[1][:200],
           'the run reports the branch as recovering')
    expect('state=RECOVERING' in acts[0]['body'], 'and the task records the state')
    expect(not any(a['action'] == 'recover' and a['key'] == 'branch:stranded' for a in plan),
           'no second recovery is planned while one is open')

    print('failed recovery PR')
    rec_tasks = [dict(t, body=acts[0]['body']) if t['number'] == num['branch:stranded'] else t for t in base_tasks]
    code, _, plan = run(work, tasks=rec_tasks, closed=[{'number': 41, 'headRefName': 'port-stranded', 'mergedAt': None},
                                                        {'number': 42, 'headRefName': 'stranded', 'mergedAt': None}], tmp=tmp, keep_recover=True)
    acts = [a for a in plan if a['key'] == 'branch:stranded']
    expect(acts and acts[0]['action'] == 'update' and 'no longer open' in acts[0]['comment'] and not acts[0]['alert'],
           'a recovery PR closed unmerged: the task says so, stays open, no alert')
    expect('Closed without merging:** #42' in acts[0]['body'], 'a rejected PR from the branch is listed on the task')

    print('qualification (automated recovery is only for the clearly low-risk)')
    code, _, plan = run(work, tasks=base_tasks, tmp=tmp, keep_recover=True)
    rec = [a for a in plan if a['action'] == 'recover']
    expect([a['key'] for a in rec] == ['branch:docsonly'] and rec[0]['draft'] and 'stranded-recovery key=branch:docsonly' in rec[0]['body'],
           f'only the docs-only branch qualifies, as a draft PR carrying the recovery marker (got {[a["key"] for a in rec]})')
    repo = sw.Repo(work)
    rows, _ = sw.classify_all(repo, {'tracked': [{'number': 1, 'draft': False}]}, {}, prs=sw.read_prs(
        _write(tmp, 'o.json', []), _write(tmp, 'c.json', [])))
    st = {r['short']: r for r in rows}
    q = sw.qualify(repo, st['stranded'])
    failed = [c['check'] for c in q['checks'] if not c['ok']]
    expect(q['verdict'] == 'REVIEW' and any('low-risk' in f for f in failed),
           f'a page outside docs/ is a production change: owner review (failed: {failed})')
    qd = sw.qualify(repo, st['deletes'])
    expect(qd['verdict'] == 'REVIEW' and any('overwrites' in c['check'] or 'low-risk' in c['check']
                                             for c in qd['checks'] if not c['ok']),
           'deleting a page main still serves is never automated')
    code, _, plan = run(work, tasks=base_tasks, closed=None, tmp=tmp, keep_recover=True)
    expect(not [a for a in plan if a['action'] == 'recover'],
           'without the closed-PR list a rejection cannot be ruled out, so nothing qualifies')
    code, _, plan = run(work, tasks=base_tasks, closed=[{'number': 5, 'headRefName': 'docsonly', 'mergedAt': None}], tmp=tmp, keep_recover=True)
    expect(not [a for a in plan if a['action'] == 'recover'], 'a branch whose PR was closed unmerged is never auto-recovered')
    code, _, plan = run(work, tasks=base_tasks, prs=('tracked', {'number': 8, 'headRefName': 'docsonly', 'isDraft': True}),
                        tmp=tmp, keep_recover=True)
    expect(not [a for a in plan if a['action'] == 'recover'], 'repeated run after the draft PR opened: no second PR')
    body = next(a['body'] for a in first if a['key'] == 'branch:stranded')
    expect('**Qualification**' in body and 'OWNER REVIEW' in body, 'every task carries its qualification record')

    print('main already cites the work')
    sh(work, 'git', 'checkout', '-q', 'main')
    commit(work, f'feat: re-land the lost page from {tip[:9]}', {'relanded.html': 'x\n'}, '2026-08-20T10:00:00+00:00')
    sh(work, 'git', 'push', '-q', 'origin', 'main')
    sh(work, 'git', 'fetch', '-q', 'origin')
    code, _, plan = run(work, tasks=base_tasks, tmp=tmp)
    acts = [a for a in plan if a['key'] == 'branch:stranded']
    expect(acts and 'Main already mentions this work' in acts[0]['body'] and 're-land the lost page' in acts[0]['body'],
           'a main commit naming the branch\'s commit is shown on the task')
    expect(acts and 'main cites none of this work | **fail**' in acts[0]['body'], 'and blocks automated recovery')
    sh(work, 'git', 'reset', '-q', '--hard', 'HEAD~1')
    sh(work, 'git', 'merge', '-q', '--no-ff', '-m', 'Merge pull request #3 from o/stranded', 'origin/tracked')
    sh(work, 'git', 'push', '-q', '-f', 'origin', 'main')
    sh(work, 'git', 'fetch', '-q', 'origin')
    code, _, plan = run(work, tasks=base_tasks, tmp=tmp)
    expect(not [a for a in plan if a['key'] == 'branch:stranded'],
           'the merge of the PR a branch was stranded off names the branch, but is not a citation')
    sh(work, 'git', 'reset', '-q', '--hard', 'HEAD~1')
    sh(work, 'git', 'push', '-q', '-f', 'origin', 'main')
    sh(work, 'git', 'fetch', '-q', 'origin')

    print('duplicate issues')
    dup = base_tasks + [{'number': 99, 'state': 'OPEN', 'body': next(t['body'] for t in base_tasks
                                                                       if t['number'] == num['branch:stranded'])}]
    code, _, plan = run(work, tasks=dup, tmp=tmp)
    d = [a for a in plan if a.get('duplicate')]
    expect(code == 0 and len(d) == 1 and d[0]['issue'] == 99 and f'Duplicate of #{num["branch:stranded"]}' in d[0]['comment'],
           'a second open issue for one branch is closed as a duplicate of the oldest, no alert')
    expect(not any(a['action'] == 'create' for a in plan), 'and no third issue is created')

    print('ledger problems fail closed')
    code, out, _ = run(work, tasks=base_tasks, excl={'origin/excluded': {'reason': 'x', 'date': '2026-11-17',
                                                                          'disposition': 'MAYBE'}}, tmp=tmp)
    expect(code == 4 and 'unknown disposition' in out, f'an unknown disposition is exit 4, not a silent skip (got {code})')

    print('apply: idempotent recovery and the off switch')
    fake = pathlib.Path(tmp, 'bin')
    fake.mkdir(exist_ok=True)
    log = pathlib.Path(tmp, 'gh.log')
    (fake / 'gh').write_text('#!/bin/sh\necho "$@" >> ' + str(log) + '\n'
                             'case "$1 $2" in "pr list") echo "$GH_FAKE_OPEN" ;; esac\nexit 0\n')
    (fake / 'gh').chmod(0o755)
    plan_path = pathlib.Path(tmp, 'rec-plan.json')
    code, _, plan = run(work, tasks=base_tasks, tmp=tmp, keep_recover=True)
    plan_path.write_text(json.dumps([a for a in plan if a['action'] == 'recover']))
    apply = str(HERE / 'apply-stranded-work-tasks.py')

    def applied(*extra, open_prs='[]'):
        log.write_text('')
        env = {**os.environ, 'PATH': f'{fake}:{os.environ["PATH"]}', 'GH_FAKE_OPEN': open_prs}
        r = subprocess.run([sys.executable, apply, str(plan_path), *extra], capture_output=True, text=True, env=env)
        return r.returncode, r.stdout, log.read_text()
    rc, out, calls = applied()
    expect(rc == 0 and 'pr create' not in calls and 'automated recovery is off' in out, 'off by default: nothing created')
    rc, out, calls = applied('--recover')
    expect(rc == 0 and calls.count('pr create --draft') == 1, 'with --recover: exactly one draft PR')
    rc, out, calls = applied('--recover', open_prs='[{"number": 8}]')
    expect(rc == 0 and 'pr create' not in calls and 'already open' in out,
           'a PR opened since the plan was written: re-checked live, not duplicated')


def _write(tmp, name, data):
    path = pathlib.Path(tmp, name)
    path.write_text(json.dumps(data))
    return str(path)


def main():
    with tempfile.TemporaryDirectory() as tmp:
        work, bare = build(tmp)
        repo = sw.Repo(work)
        rows, shallow = sw.classify_all(repo, {'tracked'}, {'origin/excluded'})
        st = {r['short']: r for r in rows}

        print('classification (full clone)')
        expect(not shallow, 'fixture clone is full')
        for name, want in (('merged', 'MERGED'), ('stranded', 'STRANDED'), ('tracked', 'TRACKED'),
                           ('excluded', 'EXCLUDED'), ('landed', 'LANDED'), ('deletes', 'STRANDED'),
                           ('docsonly', 'STRANDED'),
                           ('old-reconciled', 'DISJOINT'), ('old-moved', 'DISJOINT'), ('old-residue', 'DISJOINT')):
            expect(st.get(name, {}).get('state') == want, f'{name} -> {want} (got {st.get(name, {}).get("state")})')
        expect(st['old-reconciled']['residue'] == {}, 'pre-rewrite branch whose commits all have twins on main: no residue')
        expect(st['old-moved']['residue'] == {} and st['old-moved']['moved'] == ['strategy/plan.md'],
               'pre-rewrite branch touching only a moved-out path: no residue, path reported as moved')
        expect(st['old-residue']['residue'] == {'page.html': 1}, 'pre-rewrite branch with a new line: residue 1 line')
        expect(st['deletes']['residue'] == {'page.html': 1}, 'a deletion main does not have counts as residue')
        expect(st['stranded']['residue'] == {'lost.html': 1}, 'a new file counts its lines as residue')

        print('exit codes and alerts')
        code, out, plan = run(work, tmp=tmp, keep_recover=True)
        expect(code == 1, f'no task list: everything stranded is new, exit 1 (got {code})')
        keys = sorted(a['key'] for a in plan if a['action'] != 'recover')
        expect(keys == ['branch:deletes', 'branch:docsonly', 'branch:stranded', 'pre-rewrite'],
               f'creates one task per item (got {keys})')
        expect(all(a['action'] == 'create' and a['alert'] for a in plan if a['action'] != 'recover'),
               'every first sighting is an alert')
        expect('compare/main...stranded' in next(a['body'] for a in plan if a['key'] == 'branch:stranded'),
               'task body carries the compare link')

        def issues(state='OPEN', tips=None, members='old-residue', version=sw.TEMPLATE_VERSION):
            tips = tips or {}
            out = []
            for i, a in enumerate((a for a in plan if a['action'] != 'recover'), start=10):
                fields = sw.parse_marker(a['body'])
                if a['key'] in tips:
                    fields['tip'] = tips[a['key']]
                if a['key'] == 'pre-rewrite':
                    fields['members'] = members
                if version is None:
                    fields.pop('v', None)
                else:
                    fields['v'] = version
                out.append({'number': i, 'state': state,
                            'body': sw.marker(**fields) + '\nbody'})
            return out

        code, out, plan2 = run(work, tasks=issues(), tmp=tmp)
        expect(code == 0, f'known backlog with open tasks: exit 0 (got {code})')
        expect(plan2 == [], f'known backlog: no task changes (got {[a["action"] for a in plan2]})')
        expect('No newly stranded work' in out, 'says so')

        code, _, plan3 = run(work, tasks=issues(state='CLOSED'), tmp=tmp)
        expect(code == 1 and sorted((a['action'], a['key']) for a in plan3)
               == [('reopen', 'branch:deletes'), ('reopen', 'branch:docsonly'), ('reopen', 'branch:stranded'), ('reopen', 'pre-rewrite')],
               f'task closed while work still stranded: reopened, alert (got {code}, {[a["action"] for a in plan3]})')

        code, _, plan4 = run(work, tasks=issues(tips={'branch:stranded': 'deadbeef0'}), tmp=tmp)
        expect(code == 1 and [a['action'] for a in plan4] == ['update'],
               f'new commits on a stranded branch: update + alert (got {code}, {[a["action"] for a in plan4]})')

        code, _, plan5 = run(work, tasks=issues(members='old-residue,old-gone'), tmp=tmp)
        expect(code == 0 and [a['action'] for a in plan5] == ['update'] and not plan5[0]['alert'],
               'a pre-rewrite branch resolving: body updated, no alert')

        code, _, plan6 = run(work, tasks=issues(members=''), tmp=tmp)
        expect(code == 1 and plan6[0]['alert'] and 'old-residue' in plan6[0]['comment'],
               'a branch new to the pre-rewrite list: alert naming it')

        code, _, plan7 = run(work, tasks=issues(), prs=('tracked', {'number': 7, 'headRefName': 'stranded', 'isDraft': True}),
                             tmp=tmp)
        acts = [(a['action'], a['key']) for a in plan7]
        expect(code == 0 and ('close', 'branch:stranded') not in acts,
               f'a draft PR from the branch does not close its task: a PR is not a ship (got {acts})')
        upd = [a for a in plan7 if a['key'] == 'branch:stranded']
        expect(len(upd) == 1 and upd[0]['action'] == 'update' and not upd[0]['alert'] and '#7' in upd[0]['comment'],
               'the task is updated once, naming the PR, without an alert')

        code, _, plan8 = run(work, tasks=issues(), excl=('origin/excluded', 'origin/deletes'), tmp=tmp)
        expect(code == 0 and [(a['action'], a['key']) for a in plan8] == [('close', 'branch:deletes')],
               'an exclusion closes the task without an alert')

        code, out, _ = run(work, tasks=issues(), excl=('origin/excluded', 'origin/merged'), tmp=tmp)
        expect('entr(ies) no longer match' in out and 'origin/merged' in out, 'a stale exclusion is reported')

        code, out, plan9 = run(work, tasks=issues(version=None), tmp=tmp)
        refreshed = [a for a in plan9 if a.get('refresh')]
        expect(code == 0 and len(plan9) == 4 and len(refreshed) == 4
               and all(a['action'] == 'update' and not a['alert'] and not a.get('comment') for a in refreshed),
               f'tasks written from an older template: one silent rewrite each, no alert '
               f'(got {code}, {[(a["action"], a.get("refresh")) for a in plan9]})')
        expect('(wording refresh)' in out, 'the refresh is labelled in the run output')
        code, _, plan10 = run(work, tasks=issues(version=None, tips={'branch:stranded': 'deadbeef0'}), tmp=tmp)
        expect(code == 1 and [a['alert'] for a in plan10 if a['key'] == 'branch:stranded'] == [True],
               'new commits still alert when the template is also old')

        scenarios(work, tmp, plan)

        print('task wording (2026-11-15: #1218 was opened from a branch whose commit a recorded decision held)')
        body = next(a['body'] for a in plan if a['key'] == 'branch:stranded')
        expect('none of them is the default' in body, 'no recovery is called the default')
        expect('Before opening a PR, cherry-picking or porting' in body and 'check for a recorded decision' in body,
               'asks for a recorded decision before a PR, a cherry-pick or a port')
        expect(body.index('**Before you choose**') < body.index('1. **'), 'the check comes before the options')
        expect('ship as it stands, and no recorded decision says otherwise' in body, 'the PR option is conditional')
        expect('It should ship:** open a PR' not in body, 'the unconditional first option is gone')
        expect(not any(t in body.lower() for t in ('utg-work', 'control plane', 'wip-', '-lab')),
               'names no tool or workspace outside this repository')
        pre = next(a['body'] for a in plan if a['key'] == 'pre-rewrite')
        expect('check for a recorded decision on the files' in pre, 'the pre-rewrite task asks the same before a port')
        many = {'short': 'big', 'tip': 'abc123456', 'commits': 1, 'date': '2026-11-15', 'age': 0,
                'residue': {f'locales/l{i:02d}.json': 30 - i for i in range(30)}, 'subjects': ['abc1234567 big']}
        big = sw.stranded_body(many, 'o/r')
        expect(all(f'`{path}`' in big for path in many['residue']), 'every file is named, not only the largest 25')
        expect('<summary>The other 5 file(s)</summary>' in big, 'the rest sit in a collapsed list')
        huge = sw.stranded_body(dict(many, residue={f'docs/research/a-long-folder-name/p{i:04d}.html': 1
                                                    for i in range(3000)}), 'o/r')
        expect(len(huge) < 65536 and 'and 2575 more' in huge,
               f'a 3,000-file branch stays under the issue body limit and says what it left out ({len(huge)} chars)')

        print('fails closed')
        buf = io.StringIO()
        empty = pathlib.Path(tmp, 'empty.json')
        empty.write_text('')
        with contextlib.redirect_stdout(buf):
            code = check.run(str(work), str(empty), None, None, None, pathlib.Path(tmp, 'none.json'))
        expect(code == 2, f'no open-PR data: exit 2 (got {code})')

        shallow_dir = pathlib.Path(tmp, 'shallow')
        sh(tmp, 'git', 'clone', '-q', '--depth', '1', '--no-single-branch', f'file://{bare}', str(shallow_dir))
        code, out, _ = run(shallow_dir, tasks=[], tmp=tmp)
        expect(code == 3 and 'UNMEASURABLE' in out, f'shallow clone: UNMEASURABLE, exit 3, never clean (got {code})')

    print('the repository ledger (gated here: the daily run is not a PR gate)')
    real = check.LEDGER
    try:
        problems = check.validate_ledger(check.load_exclusions(real))
    except ValueError as e:
        problems = [f'unreadable: {e}']
    expect(real.exists() and not problems, f'{real.name} is readable, every entry valid ({problems[:3]})')

    print('')
    if FAILS:
        print(f'{len(FAILS)} FAILED')
        return 1
    print('all passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
