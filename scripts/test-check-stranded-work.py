#!/usr/bin/env python3
"""Fixture tests for scripts/check-stranded-work.py.

Each case builds a throwaway repository with a bare `origin`, so the script's
real git calls run unmodified. The negative cases are the point: a shallow
clone, a recently stranded branch and a recent branch with unrelated history
must each fail the run; only old unrelated history and old stranded work may
pass it (2026-11-11: 381 pre-rewrite branches failed every scheduled run).
"""
import datetime as dt
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent / 'check-stranded-work.py'


def sh(cwd, *args, env=None):
    # isolated from the caller's git config (signing hooks, identities)
    e = dict(os.environ, GIT_AUTHOR_NAME='t', GIT_AUTHOR_EMAIL='t@t', GIT_COMMITTER_NAME='t',
             GIT_COMMITTER_EMAIL='t@t', GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_NOSYSTEM='1', **(env or {}))
    return subprocess.run(args, cwd=cwd, env=e, capture_output=True, text=True, check=True).stdout


def commit(cwd, name, text, days_ago=0):
    pathlib.Path(cwd, name).write_text(text)
    sh(cwd, 'git', 'add', name)
    when = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days_ago)).strftime('%Y-%m-%dT%H:%M:%S+0000')
    sh(cwd, 'git', 'commit', '-q', '-m', name, '--date', when, env={'GIT_COMMITTER_DATE': when})


class Fixture:
    def __init__(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = pathlib.Path(self.tmp.name)
        self.origin, self.work, self.clone = root / 'origin.git', root / 'work', root / 'clone'
        sh(root, 'git', 'init', '-q', '--bare', str(self.origin))
        sh(root, 'git', 'init', '-q', '-b', 'main', str(self.work))
        sh(self.work, 'git', 'remote', 'add', 'origin', str(self.origin))
        commit(self.work, 'base.txt', 'base', days_ago=200)
        sh(self.work, 'git', 'push', '-q', 'origin', 'main')

    def branch(self, name, files, days_ago=0, orphan=False, from_ref='main'):
        if orphan:
            sh(self.work, 'git', 'checkout', '-q', '--orphan', name)
            sh(self.work, 'git', 'rm', '-q', '-rf', '.')
        else:
            sh(self.work, 'git', 'checkout', '-q', '-b', name, from_ref)
        for f in files:
            commit(self.work, f, f, days_ago=days_ago)
        sh(self.work, 'git', 'push', '-q', 'origin', name)
        sh(self.work, 'git', 'checkout', '-q', 'main')

    def run(self, prs=(), shallow=False):
        if self.clone.exists():
            sh(self.clone.parent, 'rm', '-rf', str(self.clone))
        if shallow:
            sh(self.clone.parent, 'git', 'clone', '-q', '--depth', '1', '--no-single-branch',
               f'file://{self.origin}', str(self.clone))
        else:
            sh(self.clone.parent, 'git', 'clone', '-q', str(self.origin), str(self.clone))
        prs_file = pathlib.Path(self.tmp.name, 'prs.json')
        prs_file.write_text(json.dumps([{'number': i + 1, 'headRefName': b} for i, b in enumerate(prs)]))
        out_json = pathlib.Path(self.tmp.name, 'out.json')
        r = subprocess.run([sys.executable, str(SCRIPT), '--open-prs', str(prs_file), '--fail-newer-than-days', '3',
                            '--json', str(out_json)], capture_output=True, text=True,
                           env=dict(os.environ, STRANDED_WORK_REPO=str(self.clone), GIT_CONFIG_GLOBAL=os.devnull))
        data = json.loads(out_json.read_text()) if out_json.exists() else None
        return r.returncode, r.stdout, data


class StrandedWork(unittest.TestCase):
    def setUp(self):
        self.f = Fixture()

    def tearDown(self):
        self.f.tmp.cleanup()

    def test_clean_repository_passes(self):
        rc, out, data = self.f.run()
        self.assertEqual(rc, 0, out)
        self.assertEqual(data['counts']['new_stranded'], 0)

    def test_recently_stranded_branch_fails(self):
        self.f.branch('claude/new-work', ['a.txt'], days_ago=0)
        rc, out, data = self.f.run()
        self.assertEqual(rc, 1, out)
        self.assertEqual([r['action'] for r in data['records'] if r['category'] == 'new-stranded'], ['open-pr'])

    def test_tracked_branch_passes(self):
        self.f.branch('claude/new-work', ['a.txt'], days_ago=0)
        rc, out, _ = self.f.run(prs=['claude/new-work'])
        self.assertEqual(rc, 0, out)

    def test_old_stranded_is_backlog_not_failure(self):
        self.f.branch('claude/old-work', ['a.txt'], days_ago=30)
        rc, out, data = self.f.run()
        self.assertEqual(rc, 0, out)
        self.assertEqual(data['counts']['historical_stranded'], 1)

    def test_old_unrelated_history_is_reported_not_failed(self):
        self.f.branch('claude/pre-rewrite', ['x.txt'], days_ago=120, orphan=True)
        rc, out, data = self.f.run()
        self.assertEqual(rc, 0, out)
        self.assertEqual(data['clone'], 'full')
        self.assertEqual(data['counts']['unrelated_history'], 1)
        self.assertIn('share NO history', out)

    def test_recent_unrelated_history_fails(self):
        self.f.branch('claude/fresh-orphan', ['x.txt'], days_ago=0, orphan=True)
        rc, out, data = self.f.run()
        self.assertEqual(rc, 1, out)
        self.assertEqual(data['counts']['unrelated_recent'], 1)

    def test_shallow_clone_fails_closed(self):
        self.f.branch('claude/old-work', ['a.txt'], days_ago=30)
        commit(self.f.work, 'main2.txt', 'm', days_ago=10)
        sh(self.f.work, 'git', 'push', '-q', 'origin', 'main')
        rc, out, data = self.f.run(shallow=True)
        self.assertEqual(data['clone'], 'shallow')
        self.assertGreater(data['counts']['unmeasurable'], 0, out)
        self.assertEqual(rc, 1, out)

    def test_cherry_picked_work_is_a_superseded_candidate(self):
        self.f.branch('claude/landed-elsewhere', ['p.txt'], days_ago=20)
        tip = sh(self.f.work, 'git', 'rev-parse', 'claude/landed-elsewhere').strip()
        sh(self.f.work, 'git', 'cherry-pick', tip)
        sh(self.f.work, 'git', 'push', '-q', 'origin', 'main')
        rc, out, data = self.f.run()
        actions = {r['branch']: r['action'] for r in data['records']}
        self.assertEqual(actions['origin/claude/landed-elsewhere'], 'superseded-candidate')

    def test_no_pr_data_is_not_a_pass(self):
        r = subprocess.run([sys.executable, str(SCRIPT)], capture_output=True, text=True, stdin=subprocess.DEVNULL,
                           env=dict(os.environ, STRANDED_WORK_REPO=str(self.f.work)))
        self.assertEqual(r.returncode, 2, r.stdout)


if __name__ == '__main__':
    unittest.main(verbosity=1)
