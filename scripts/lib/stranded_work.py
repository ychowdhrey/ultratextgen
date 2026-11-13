"""The one definition of "stranded work": classify every remote branch against main.

`scripts/check-stranded-work.py` prints and exits on this; `scripts/test-check-stranded-work.py`
drives it against throwaway repositories. Network-free: open PRs and existing recovery tasks are
passed in, never fetched.

States
------
MERGED        the tip is an ancestor of main.
TRACKED       an open PR has this branch as its head.
LANDED        not an ancestor, but nothing is missing: every line the branch adds is in main's copy of
              the file and every line it removes is gone from it. Work that reached main by a squash,
              a cherry-pick or a later PR that redid it. Reported, never a task.
STRANDED      carries content main does not have and no open PR tracks it. One recovery task each.
EXCLUDED      would be STRANDED, but data/stranded_work_exclusions.json records why it is left.
DISJOINT      shares no history with main at all. main was rewritten on 2026-07-10 (new root
              1476ae1, old root e512cc9), and every branch cut before that hangs off the old root, so
              `git merge-base` is empty on any clone, full or shallow. These are measured by content
              instead: a commit counts as on main when main has a commit with the same author date,
              author email and subject (a history rewrite keeps all three); the rest are checked line
              by line like STRANDED. Files that never existed in main's history were moved out of this
              repository by the rewrite and are counted, not treated as lost. A DISJOINT branch with
              nothing missing is reconciled; one with residue is listed in a single recovery task,
              because none of them can be merged (GitHub will not open a PR between unrelated
              histories) and all of them need the same recovery: port the content by hand or drop it.
UNMEASURABLE  no merge-base in a SHALLOW clone. The clone cannot answer; never read as clean.

"Residue" is the measure throughout: added lines missing from main, plus removed lines main still
has. It is line-set containment, so it can call a line present when main has the same text elsewhere
in the file (a false LANDED for an exact duplicate line), and it reports a line main later rewrote as
missing. The task shows the files and counts so a person decides; the number is never the decision.
"""
import datetime as dt
import hashlib
import json
import pathlib
import re
import subprocess

MAIN = 'origin/main'
TASK_LABEL = 'stranded-work'
MARKER_RE = re.compile(r'<!--\s*stranded-work\s+(.*?)\s*-->', re.S)
PRE_REWRITE_KEY = 'pre-rewrite'


class Repo:
    def __init__(self, path, main=MAIN):
        self.path = pathlib.Path(path)
        self.main = main
        self._main_lines = {}
        self._main_keys = None
        self._main_objects = None
        self._main_paths = None
        self._commit_residue = {}

    # -- plumbing ------------------------------------------------------------------------------
    def git(self, *args, check=False):
        r = subprocess.run(['git', *args], capture_output=True, text=True, errors='replace', cwd=self.path)
        if check and r.returncode:
            raise RuntimeError(f'git {" ".join(args)}: {r.stderr.strip()}')
        return r.stdout

    def ok(self, *args):
        return subprocess.run(['git', *args], capture_output=True, cwd=self.path).returncode == 0

    def shallow(self):
        return self.git('rev-parse', '--is-shallow-repository').strip() == 'true'

    def branches(self):
        for name in self.git('for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin').splitlines():
            name = name.strip()
            if name and not name.endswith('/HEAD') and name != self.main and name != 'origin':
                yield name

    # -- main-side indexes (built lazily, once) -------------------------------------------------
    def main_file_lines(self, path):
        if path not in self._main_lines:
            if self.ok('cat-file', '-e', f'{self.main}:{path}'):
                text = self.git('show', f'{self.main}:{path}')
                self._main_lines[path] = {ln.strip() for ln in text.splitlines()}
            else:
                self._main_lines[path] = None
        return self._main_lines[path]

    def main_keys(self):
        if self._main_keys is None:
            self._main_keys = set(self.git('log', '--format=%aI%x09%ae%x09%s', self.main).splitlines())
        return self._main_keys

    def main_objects(self):
        if self._main_objects is None:
            self._main_objects = {ln.split(' ', 1)[0] for ln in self.git('rev-list', '--objects', self.main).splitlines()}
        return self._main_objects

    def main_paths(self):
        if self._main_paths is None:
            self._main_paths = set(self.git('log', '--format=', '--name-only', self.main).splitlines()) - {''}
        return self._main_paths

    # -- residue ----------------------------------------------------------------------------------
    @staticmethod
    def parse_diff(text):
        """{path: {'add': set, 'del': set, 'binary': bool, 'deleted': bool}} from `git diff -U0`."""
        files, cur = {}, None
        for ln in text.splitlines():
            if ln.startswith('diff --git '):
                cur = None
                m = re.match(r'diff --git a/(.*) b/(.*)$', ln)
                if m:
                    cur = files.setdefault(m.group(2), {'add': set(), 'del': set(), 'binary': False, 'deleted': False})
            elif cur is None:
                continue
            elif ln.startswith('deleted file mode'):
                cur['deleted'] = True
            elif ln.startswith('Binary files '):
                cur['binary'] = True
            elif ln.startswith('+++') or ln.startswith('---'):
                continue
            elif ln.startswith('+') and ln[1:].strip():
                cur['add'].add(ln[1:].strip())
            elif ln.startswith('-') and ln[1:].strip():
                cur['del'].add(ln[1:].strip())
        return files

    def file_residue(self, path, change, tip):
        """Number of this change's lines main is missing (0 = landed)."""
        main_lines = self.main_file_lines(path)
        if change['deleted']:
            return 0 if main_lines is None else 1
        if change['binary']:
            blob = self.git('rev-parse', '-q', '--verify', f'{tip}:{path}').strip()
            return 0 if blob and blob in self.main_objects() else 1
        if main_lines is None:
            return len(change['add']) or 1
        missing = {a for a in change['add'] if a not in main_lines}
        tip_lines = None
        if change['del']:
            tip_lines = {ln.strip() for ln in self.git('show', f'{tip}:{path}').splitlines()}
        still = {d for d in change['del'] if d in main_lines and d not in tip_lines} if tip_lines is not None else set()
        return len(missing) + len(still)

    def range_residue(self, base, tip):
        out = {}
        for path, change in self.parse_diff(self.git('diff', '-U0', '--no-color', '--no-renames', base, tip)).items():
            n = self.file_residue(path, change, tip)
            if n:
                out[path] = n
        return out

    def disjoint_residue(self, tip):
        """(residue {path: n}, moved-out paths) for a branch with no common history."""
        keys = self.main_keys()
        main_paths = self.main_paths()
        residue, moved = {}, set()
        for row in self.git('log', '--no-merges', '--format=%H%x09%aI%x09%ae%x09%s', tip).splitlines():
            sha, key = row.split('\t', 1)
            if key in keys:
                continue
            if sha not in self._commit_residue:
                self._commit_residue[sha] = self.parse_diff(
                    self.git('show', '-U0', '--no-color', '--no-renames', '--format=', '--root', sha))
            for path, change in self._commit_residue[sha].items():
                if path not in main_paths:
                    moved.add(path)
                    continue
                n = self.file_residue(path, change, tip)
                if n:
                    residue[path] = residue.get(path, 0) + n
        # A path the branch tip carries byte-identical to some version main has had is landed,
        # whatever the intermediate commits said.
        for path in list(residue):
            blob = self.git('rev-parse', '-q', '--verify', f'{tip}:{path}').strip()
            if blob and blob in self.main_objects():
                del residue[path]
        return residue, sorted(moved)

    # -- classification ---------------------------------------------------------------------------
    def age_days(self, ref, now):
        iso = self.git('log', '-1', '--format=%cI', ref).strip()
        if not iso:
            return None, None
        when = dt.datetime.fromisoformat(iso)
        return (now - when).days, when.date().isoformat()

    def classify(self, branch, tracked, excluded, shallow, now):
        tip = self.git('rev-parse', branch).strip()
        if not tip:
            return None
        short = branch.split('/', 1)[1] if '/' in branch else branch
        row = {'branch': branch, 'short': short, 'tip': tip[:9], 'tip_full': tip}
        base = self.git('merge-base', self.main, branch).strip()
        if not base:
            if shallow:
                return {**row, 'state': 'UNMEASURABLE'}
            row['age'], row['date'] = self.age_days(branch, now)
            if branch in excluded:
                return {**row, 'state': 'EXCLUDED', 'disjoint': True}
            residue, moved = self.disjoint_residue(tip)
            return {**row, 'state': 'DISJOINT', 'residue': residue, 'moved': moved}
        if self.ok('merge-base', '--is-ancestor', tip, self.main):
            return {**row, 'state': 'MERGED'}
        if short in tracked:
            return {**row, 'state': 'TRACKED'}
        row['age'], row['date'] = self.age_days(branch, now)
        row['commits'] = int(self.git('rev-list', '--count', f'{self.main}..{branch}').strip() or 0)
        if branch in excluded:
            return {**row, 'state': 'EXCLUDED'}
        residue = self.range_residue(base, tip)
        row['residue'] = residue
        row['subjects'] = self.git('log', '--format=%h %s', f'{self.main}..{branch}').splitlines()
        return {**row, 'state': 'STRANDED' if residue else 'LANDED'}


def classify_all(repo, tracked, excluded, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    shallow = repo.shallow()
    rows = [r for r in (repo.classify(b, tracked, excluded, shallow, now) for b in repo.branches()) if r]
    return rows, shallow


# -- recovery tasks -----------------------------------------------------------------------------------
def marker(**fields):
    return '<!-- stranded-work ' + ' '.join(f'{k}={v}' for k, v in fields.items()) + ' -->'


def parse_marker(body):
    m = MARKER_RE.search(body or '')
    if not m:
        return None
    return dict(kv.split('=', 1) for kv in m.group(1).split() if '=' in kv)


def read_tasks(path):
    """Existing recovery issues by key, open ones first. None when no task list was supplied."""
    if not path:
        return None
    raw = pathlib.Path(path).read_text(encoding='utf-8').strip()
    issues = json.loads(raw) if raw else []
    by_key = {}
    for issue in sorted(issues, key=lambda i: (i.get('state', '').upper() != 'OPEN', -int(i.get('number', 0)))):
        fields = parse_marker(issue.get('body'))
        if fields and 'key' in fields:
            by_key.setdefault(fields['key'], {**issue, 'fields': fields})
    return by_key


def _residue_table(residue, limit=25):
    lines = ['| file | lines main is missing |', '|---|---|']
    for path, n in sorted(residue.items(), key=lambda kv: (-kv[1], kv[0]))[:limit]:
        lines.append(f'| `{path}` | {n} |')
    if len(residue) > limit:
        lines.append(f'| … {len(residue) - limit} more | |')
    return '\n'.join(lines)


def stranded_body(row, repo_slug):
    compare = f'https://github.com/{repo_slug}/compare/main...{row["short"]}?expand=1' if repo_slug else None
    subjects = '\n'.join(f'- {s}' for s in row.get('subjects', [])[:20])
    total = sum(row['residue'].values())
    return f"""{marker(key='branch:' + row['short'], tip=row['tip'])}
`{row['short']}` carries {row.get('commits', '?')} commit(s) that no open PR tracks, newest {row.get('date', '?')} \
({row.get('age', '?')} days old). {total} changed line(s) across {len(row['residue'])} file(s) are not on main.

**Commits not on main**

{subjects}

**What main is missing** (lines this branch adds that main lacks, plus lines it removes that main still has)

{_residue_table(row['residue'])}

**Recover it, one of three ways**

1. **It should ship:** open a PR from the branch as it stands{f' ([compare]({compare}))' if compare else ''}. Do not rebase, \
amend or force-push it; merge `main` into it if it conflicts. This task closes itself on the next daily run once the PR is open.
2. **Main already has it in another form:** check the files above against main. If the residue is only generated output \
or a line main fixed differently, record the branch in `data/stranded_work_exclusions.json` with that reason.
3. **It is abandoned:** record it in `data/stranded_work_exclusions.json` with the reason, or delete the branch.

Closing this issue without one of those reopens it on the next run: the detector, not the issue, is the record.

_Filed by the daily Stranded work run (`scripts/check-stranded-work.py`)._"""


def pre_rewrite_body(rows):
    members = sorted(r['short'] for r in rows)
    digest = hashlib.sha1(','.join(members).encode()).hexdigest()[:12]
    table = ['| branch | newest commit | files | lines main is missing | top files |', '|---|---|---|---|---|']
    for r in sorted(rows, key=lambda r: -sum(r['residue'].values())):
        top = ', '.join(f'`{p}`' for p, _ in sorted(r['residue'].items(), key=lambda kv: -kv[1])[:3])
        table.append(f'| `{r["short"]}` | {r.get("date", "?")} | {len(r["residue"])} | {sum(r["residue"].values())} | {top} |')
    return f"""{marker(key=PRE_REWRITE_KEY, set=digest, members=','.join(members))}
{len(members)} branch(es) were cut before main's history was rewritten on 2026-07-10 and carry content main does not have. \
They share no commit with main, so none can be merged or opened as a PR; each needs the content ported onto a fresh branch \
from main, or an exclusion recording why it is dropped.

{chr(10).join(table)}

How this is measured: a commit counts as on main when main has one with the same author date, author email and subject; the \
remaining commits' added lines are checked against main's current files. Paths that never existed in main's history were \
moved out of this repository by the rewrite and are not counted. A branch drops off this list by itself once its content \
lands or it is excluded in `data/stranded_work_exclusions.json`.

_Filed by the daily Stranded work run (`scripts/check-stranded-work.py`)._"""


def plan_tasks(rows, tasks, repo_slug=None):
    """Actions that bring the recovery issues in line with the branches.

    Each action: {'action': create|reopen|update|close, 'issue', 'title', 'body', 'comment', 'alert', 'key'}.
    `alert` marks what is newly stranded: a branch with no task, a task closed while the work is still stranded, new
    commits on a stranded branch, or a branch new to the pre-rewrite list. Only alerts fail the run.
    `tasks` None (no task list supplied) plans a create for everything, so nothing is waved through.
    """
    known = tasks if tasks is not None else {}
    actions, live_keys = [], set()

    for row in (r for r in rows if r['state'] == 'STRANDED'):
        key = 'branch:' + row['short']
        live_keys.add(key)
        title = f'Stranded work: {row["short"]}'
        body = stranded_body(row, repo_slug)
        issue = known.get(key)
        if issue is None:
            actions.append({'action': 'create', 'key': key, 'title': title, 'body': body, 'alert': True})
        elif issue.get('state', '').upper() != 'OPEN':
            actions.append({'action': 'reopen', 'key': key, 'issue': issue['number'], 'title': title, 'body': body,
                            'comment': f'Reopened: `{row["short"]}` still carries work main does not have (tip `{row["tip"]}`).',
                            'alert': True})
        elif issue['fields'].get('tip') != row['tip']:
            actions.append({'action': 'update', 'key': key, 'issue': issue['number'], 'title': title, 'body': body,
                            'comment': f'New commits on `{row["short"]}` since this task was filed: tip moved '
                                       f'`{issue["fields"].get("tip")}` → `{row["tip"]}`, and no open PR tracks them.',
                            'alert': True})

    pre = [r for r in rows if r['state'] == 'DISJOINT' and r['residue']]
    issue = known.get(PRE_REWRITE_KEY)
    if pre:
        live_keys.add(PRE_REWRITE_KEY)
        body = pre_rewrite_body(pre)
        members = {r['short'] for r in pre}
        title = f'Stranded work: {len(pre)} pre-rewrite branch(es) with content not on main'
        if issue is None:
            actions.append({'action': 'create', 'key': PRE_REWRITE_KEY, 'title': title, 'body': body, 'alert': True})
        else:
            before = set(filter(None, issue['fields'].get('members', '').split(',')))
            added, gone = sorted(members - before), sorted(before - members)
            reopen = issue.get('state', '').upper() != 'OPEN'
            if added or gone or reopen:
                note = []
                if added:
                    note.append('New on the list: ' + ', '.join(f'`{b}`' for b in added) + '.')
                if gone:
                    note.append('Resolved since the last run: ' + ', '.join(f'`{b}`' for b in gone) + '.')
                if reopen:
                    note.append('Reopened: these branches still carry content main does not have.')
                actions.append({'action': 'reopen' if reopen else 'update', 'key': PRE_REWRITE_KEY,
                                'issue': issue['number'], 'title': title, 'body': body, 'comment': ' '.join(note),
                                'alert': bool(added) or reopen})

    by_branch = {r['short']: r for r in rows}
    for key, issue in known.items():
        if key in live_keys or issue.get('state', '').upper() != 'OPEN':
            continue
        if key == PRE_REWRITE_KEY:
            why = 'no pre-rewrite branch carries content main lacks any more.'
        else:
            row = by_branch.get(key.split(':', 1)[1])
            why = {
                None: 'the branch no longer exists.',
                'MERGED': 'the branch is merged into main.',
                'TRACKED': 'an open PR now tracks the branch.',
                'LANDED': 'everything the branch changes is now on main.',
                'EXCLUDED': 'the branch is recorded in data/stranded_work_exclusions.json.',
            }.get(row and row['state'], f'the branch is now {row and row["state"]}.')
        actions.append({'action': 'close', 'key': key, 'issue': issue['number'],
                        'comment': f'Resolved: {why} Closed by the daily Stranded work run.', 'alert': False})
    return actions
