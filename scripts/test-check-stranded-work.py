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
    sh(work, 'git', 'merge', '-q', '--no-ff', '-m', 'Merge merged', 'merged')
    # The landed branch's change reaches main as a different commit (a squash), so it is not an ancestor.
    commit(work, 'squash: fix typo', {'page.html': 'a\nb\nfaq\nfixed\n'}, d(16))

    for b in ('main', 'merged', 'stranded', 'tracked', 'excluded', 'landed', 'deletes',
              'old-reconciled', 'old-moved', 'old-residue'):
        sh(work, 'git', 'push', '-q', 'origin', b)
    sh(work, 'git', 'fetch', '-q', 'origin')
    return work, bare


def run(work, tasks=None, prs=('tracked',), excl=('origin/excluded',), tmp=None):
    tmp = pathlib.Path(tmp)
    prs_path = tmp / 'prs.json'
    prs_path.write_text(json.dumps([{'number': 1, 'headRefName': p} for p in prs]))
    tasks_path = None
    if tasks is not None:
        tasks_path = tmp / 'tasks.json'
        tasks_path.write_text(json.dumps(tasks))
    ledger = tmp / 'excl.json'
    ledger.write_text(json.dumps({b: {'reason': 'test', 'date': '2026-11-11'} for b in excl}))
    plan_path = tmp / 'plan.json'
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        code = check.run(str(work), str(prs_path), tasks_path and str(tasks_path), str(plan_path), 'o/r', ledger)
    plan = json.loads(plan_path.read_text()) if plan_path.exists() else []
    return code, buf.getvalue(), plan


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
                           ('old-reconciled', 'DISJOINT'), ('old-moved', 'DISJOINT'), ('old-residue', 'DISJOINT')):
            expect(st.get(name, {}).get('state') == want, f'{name} -> {want} (got {st.get(name, {}).get("state")})')
        expect(st['old-reconciled']['residue'] == {}, 'pre-rewrite branch whose commits all have twins on main: no residue')
        expect(st['old-moved']['residue'] == {} and st['old-moved']['moved'] == ['strategy/plan.md'],
               'pre-rewrite branch touching only a moved-out path: no residue, path reported as moved')
        expect(st['old-residue']['residue'] == {'page.html': 1}, 'pre-rewrite branch with a new line: residue 1 line')
        expect(st['deletes']['residue'] == {'page.html': 1}, 'a deletion main does not have counts as residue')
        expect(st['stranded']['residue'] == {'lost.html': 1}, 'a new file counts its lines as residue')

        print('exit codes and alerts')
        code, out, plan = run(work, tmp=tmp)
        expect(code == 1, f'no task list: everything stranded is new, exit 1 (got {code})')
        keys = sorted(a['key'] for a in plan)
        expect(keys == ['branch:deletes', 'branch:stranded', 'pre-rewrite'], f'creates one task per item (got {keys})')
        expect(all(a['action'] == 'create' and a['alert'] for a in plan), 'every first sighting is an alert')
        expect('compare/main...stranded' in next(a['body'] for a in plan if a['key'] == 'branch:stranded'),
               'task body carries the compare link')

        def issues(state='OPEN', tips=None, members='old-residue'):
            tips = tips or {}
            out = []
            for i, a in enumerate(plan, start=10):
                fields = sw.parse_marker(a['body'])
                if a['key'] in tips:
                    fields['tip'] = tips[a['key']]
                if a['key'] == 'pre-rewrite':
                    fields['members'] = members
                out.append({'number': i, 'state': state,
                            'body': sw.marker(**fields) + '\nbody'})
            return out

        code, out, plan2 = run(work, tasks=issues(), tmp=tmp)
        expect(code == 0, f'known backlog with open tasks: exit 0 (got {code})')
        expect(plan2 == [], f'known backlog: no task changes (got {[a["action"] for a in plan2]})')
        expect('No newly stranded work' in out, 'says so')

        code, _, plan3 = run(work, tasks=issues(state='CLOSED'), tmp=tmp)
        expect(code == 1 and sorted((a['action'], a['key']) for a in plan3)
               == [('reopen', 'branch:deletes'), ('reopen', 'branch:stranded'), ('reopen', 'pre-rewrite')],
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

        code, _, plan7 = run(work, tasks=issues(), prs=('tracked', 'stranded'), tmp=tmp)
        closes = [a for a in plan7 if a['action'] == 'close']
        expect(code == 0 and len(closes) == 1 and closes[0]['key'] == 'branch:stranded'
               and 'open PR' in closes[0]['comment'], 'a PR opened for the branch closes its task')

        code, _, plan8 = run(work, tasks=issues(), excl=('origin/excluded', 'origin/deletes'), tmp=tmp)
        expect(code == 0 and [(a['action'], a['key']) for a in plan8] == [('close', 'branch:deletes')],
               'an exclusion closes the task without an alert')

        code, out, _ = run(work, tasks=issues(), excl=('origin/excluded', 'origin/merged'), tmp=tmp)
        expect('entr(ies) no longer match' in out and 'origin/merged' in out, 'a stale exclusion is reported')

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

    print('')
    if FAILS:
        print(f'{len(FAILS)} FAILED')
        return 1
    print('all passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
