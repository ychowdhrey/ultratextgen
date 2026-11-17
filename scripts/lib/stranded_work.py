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
HELD          would be STRANDED (or a DISJOINT branch with residue), but the ledger records an OPEN
              disposition (INTENTIONAL_HOLD, NEEDS_EVIDENCE, DEPENDENCY_BLOCKED): a decision exists and the
              work is still not on main. Its task stays open and shows the decision; it never alerts and is
              never recovered automatically.

Dispositions (2026-11-17)
-------------------------
An entry in data/stranded_work_exclusions.json may carry `disposition`. TERMINAL ones (LANDED, SUPERSEDED,
ABANDONED, and an entry with none, which is how every entry before 2026-11-17 reads) make the branch EXCLUDED
and close its task. OPEN ones make it HELD and keep the task open. An entry with `tip` covers that tip only:
once the branch carries a commit the decision never saw, the entry is STALE, the branch is classified as if
the entry did not exist, and its task says why. That is what stops a decision about old commits from waving
through new ones.

Pull requests (2026-11-17)
--------------------------
An open PR, draft or not, no longer closes a task: a PR is a proposal, and the task is the record that the
work is not on main. The task names the PR and closes only when the branch is MERGED, LANDED or excluded by a
terminal disposition, which is to say once main has it. A recovery PR from a fresh branch declares the task it
recovers with RECOVERY_MARKER in its body; while one is open the branch is RECOVERING and no second recovery
is planned. A PR from the branch that was closed without merging is remembered: it is evidence of a rejection,
and the branch is never recovered automatically after it.

"Residue" is the measure throughout: added lines missing from main, plus removed lines main still
has. It is line-set containment, so it can call a line present when main has the same text elsewhere
in the file (a false LANDED for an exact duplicate line), and it reports a line main later rewrote as
missing. The task shows the files and counts so a person decides; the number is never the decision.

A task names no default recovery (2026-11-15). Its first option used to be "open a PR from the
branch as it stands", and #1218 was opened that way and closed within the hour, because that commit
was already on record as needing a decision on how to redo it against today's main, not a replay;
its port into #1217 was reverted (aa08f976). A task now asks the reader to check for a recorded decision
on the commits and every file before choosing, and lists every file. Bodies carry TEMPLATE_VERSION in
their marker, so a wording change rewrites each open task once, without an alert.
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
#: Bumped when the task wording changes: an open task whose marker carries an older version is
#: rewritten once (an update with no alert and no comment), so the new wording reaches the
#: backlog and not only the tasks filed after it.
TEMPLATE_VERSION = '3'
RECOVERY_RE = re.compile(r'<!--\s*stranded-recovery\s+(.*?)\s*-->', re.S)
TERMINAL = {'LANDED', 'SUPERSEDED', 'ABANDONED'}
OPEN_DISPOSITIONS = {'INTENTIONAL_HOLD', 'NEEDS_EVIDENCE', 'DEPENDENCY_BLOCKED'}
DISPOSITIONS = TERMINAL | OPEN_DISPOSITIONS


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
        """One row per branch. `tracked` is a set of head refs, or a {head ref: [PR dict]} map; `excluded` maps
        `origin/<branch>` to its ledger entry (a bare set still works and reads as terminal, undated)."""
        tip = self.git('rev-parse', branch).strip()
        if not tip:
            return None
        short = branch.split('/', 1)[1] if '/' in branch else branch
        row = {'branch': branch, 'short': short, 'tip': tip[:9], 'tip_full': tip}
        entry = excluded.get(branch) if isinstance(excluded, dict) else ({} if branch in excluded else None)
        kind, disposition = ledger_verdict(entry, tip)
        if kind == 'stale':
            row['stale_disposition'] = {'disposition': disposition, 'tip': (entry or {}).get('tip'),
                                        'reason': (entry or {}).get('reason', '')}
        elif kind:
            row['disposition'] = disposition
            row['decision'] = {k: v for k, v in (entry or {}).items() if k in ('reason', 'date', 'evidence', 'tip')}
        base = self.git('merge-base', self.main, branch).strip()
        if not base:
            if shallow:
                return {**row, 'state': 'UNMEASURABLE'}
            row['age'], row['date'] = self.age_days(branch, now)
            if kind == 'terminal':
                return {**row, 'state': 'EXCLUDED', 'disjoint': True}
            residue, moved = self.disjoint_residue(tip)
            if kind == 'open' and residue:
                return {**row, 'state': 'HELD', 'disjoint': True, 'residue': residue, 'moved': moved}
            return {**row, 'state': 'DISJOINT', 'residue': residue, 'moved': moved}
        if self.ok('merge-base', '--is-ancestor', tip, self.main):
            return {**row, 'state': 'MERGED'}
        prs = _prs_for(tracked, short)
        if prs is not None:
            row['prs'] = prs
            if kind != 'terminal':
                # Still measured: a PR is a proposal, and the task stays open until main has the work.
                row['age'], row['date'] = self.age_days(branch, now)
                row['commits'] = int(self.git('rev-list', '--count', f'{self.main}..{branch}').strip() or 0)
                row['residue'] = self.range_residue(base, tip)
                row['subjects'] = self.git('log', '--format=%h %s', f'{self.main}..{branch}').splitlines()
            return {**row, 'state': 'TRACKED'}
        row['age'], row['date'] = self.age_days(branch, now)
        row['commits'] = int(self.git('rev-list', '--count', f'{self.main}..{branch}').strip() or 0)
        if kind == 'terminal':
            return {**row, 'state': 'EXCLUDED'}
        residue = self.range_residue(base, tip)
        row['residue'] = residue
        row['subjects'] = self.git('log', '--format=%h %s', f'{self.main}..{branch}').splitlines()
        if not residue:
            return {**row, 'state': 'LANDED'}
        return {**row, 'state': 'HELD' if kind == 'open' else 'STRANDED'}

    # -- main commits that cite a branch ----------------------------------------------------------
    def main_messages(self, since):
        """[(sha, date, subject, full message)] for main's commits since `since` (cached on the earliest asked)."""
        if getattr(self, '_msgs_since', None) is None or since < self._msgs_since:
            # --no-merges: the merge of the PR a branch was stranded off names the branch, and is not a citation.
            raw = self.git('log', '--no-merges', f'--since={since}', '--format=%H%x1f%cs%x1f%s%x1f%B%x1e', self.main)
            self._msgs = [tuple(rec.strip('\n').split('\x1f', 3)) for rec in raw.split('\x1e') if rec.strip()]
            self._msgs_since = since
        return [m for m in self._msgs if len(m) == 4 and m[1] >= since]

    def citations(self, row):
        """Main commits, newer than the branch's oldest unmerged commit, whose message names the branch or one of
        its unmerged commits. A citation is evidence that someone handled some of this work (a re-land, a partial
        recovery, a revert); never proof that all of it is on main, so it informs the task and blocks automated
        recovery but closes nothing."""
        tip = row['tip_full']
        if row.get('disjoint') or row['state'] == 'DISJOINT':
            return []
        shas = self.git('rev-list', f'{self.main}..{tip}').split()
        if not shas:
            return []
        first = self.git('log', '-1', '--format=%cs', shas[-1]).strip() or '1970-01-01'
        needles = [row['short']] + [s[:9] for s in shas]
        hits = []
        for sha, date, subject, body in self.main_messages(first):
            if sha in shas:
                continue
            text = subject + '\n' + body
            if any(n in text for n in needles):
                hits.append({'sha': sha[:10], 'date': date, 'subject': subject})
        return hits


def ledger_verdict(entry, tip):
    """('terminal'|'open'|'stale'|None, disposition) for a ledger entry against the branch tip."""
    if entry is None:
        return None, None
    disposition = (entry.get('disposition') or 'ABANDONED').upper()
    pinned = (entry.get('tip') or '').strip()
    if pinned and not tip.startswith(pinned):
        return 'stale', disposition
    return ('open' if disposition in OPEN_DISPOSITIONS else 'terminal'), disposition


def _prs_for(tracked, short):
    """The open PRs whose head is this branch, or None. Accepts the old set-of-refs form."""
    if isinstance(tracked, dict):
        prs = tracked.get(short)
        return list(prs) if prs else None
    return [] if short in tracked else None


def classify_all(repo, tracked, excluded, now=None, prs=None):
    """Classify every remote branch. `prs` (from read_prs) adds recovery PRs, rejected PRs and citations."""
    now = now or dt.datetime.now(dt.timezone.utc)
    shallow = repo.shallow()
    rows = [r for r in (repo.classify(b, tracked, excluded, shallow, now) for b in repo.branches()) if r]
    if prs is not None:
        for r in rows:
            key = 'branch:' + r['short']
            if r['state'] in ('STRANDED', 'HELD', 'TRACKED') and not r.get('disjoint'):
                r['recovery_prs'] = prs['recovery'].get(key, [])
                r['rejected_prs'] = prs['rejected'].get(r['short'], [])
                r['rejections_known'] = prs.get('closed_known', False)
                r['citations'] = repo.citations(r)
                if r['state'] == 'STRANDED' and r['recovery_prs']:
                    r['state'] = 'RECOVERING'
    return rows, shallow


# -- pull requests ------------------------------------------------------------------------------------
def recovery_marker(key, source_tip):
    """Put in a recovery PR's body: it names the task (and the tip) it recovers."""
    return f'<!-- stranded-recovery key={key} source_tip={source_tip} -->'


def read_prs(open_path, closed_path=None):
    """{'open': {head: [pr]}, 'recovery': {task key: [pr]}, 'rejected': {head: [pr]}} from `gh pr list` JSON.

    None when no open-PR data was supplied (the caller fails closed). A PR is {'number', 'draft'}. `rejected`
    is a PR from the branch that was closed without merging; it needs the closed list, and is empty without it.
    """
    def load(path):
        raw = pathlib.Path(path).read_text(encoding='utf-8').strip() if path else ''
        return json.loads(raw) if raw else None
    opened = load(open_path)
    if opened is None:
        return None
    out = {'open': {}, 'recovery': {}, 'rejected': {}, 'closed_known': bool(closed_path)}
    for pr in opened:
        ref = pr.get('headRefName') or (pr.get('head') or {}).get('ref')
        rec = {'number': pr.get('number'), 'draft': bool(pr.get('isDraft') or pr.get('draft'))}
        if ref:
            out['open'].setdefault(ref, []).append(rec)
        for m in RECOVERY_RE.finditer(pr.get('body') or ''):
            fields = dict(kv.split('=', 1) for kv in m.group(1).split() if '=' in kv)
            if 'key' in fields:
                out['recovery'].setdefault(fields['key'], []).append(rec)
    for pr in load(closed_path) or []:
        merged = pr.get('mergedAt') or pr.get('merged_at') or pr.get('merged')
        ref = pr.get('headRefName') or (pr.get('head') or {}).get('ref')
        if ref and not merged:
            out['rejected'].setdefault(ref, []).append({'number': pr.get('number')})
    return out


# -- qualification: may a recovery be automated? -------------------------------------------------------
#: The only paths an automated recovery may touch. Everything else is shared runtime, a ledger, a generated
#: file, governance, or a page whose revenue this repository cannot see, and goes to a person.
LOW_RISK = re.compile(r'^docs/(?!README\.md$|infra-review/|decisions/)[^\0]*\.md$')
MAX_AUTO_FILES = 20
MAX_AUTO_LINES = 1000


def qualify(repo, row):
    """A decision record: every check, its result and its evidence. 'AUTO' only if every check passes.

    Deterministic and network-free. It decides whether a machine may open a draft PR from the branch as it
    stands; it never decides that the work should ship. Anything that fails a check is 'REVIEW'.
    """
    checks = []

    def check(name, ok, detail):
        checks.append({'check': name, 'ok': bool(ok), 'detail': detail})

    state = row['state']
    check('stranded, with no recorded decision', state == 'STRANDED' and not row.get('stale_disposition'),
          f'state {state}' + (f'; a {row["stale_disposition"]["disposition"]} decision covers tip '
                              f'{row["stale_disposition"]["tip"]} only' if row.get('stale_disposition') else ''))
    check('shares history with main', not row.get('disjoint') and state != 'DISJOINT',
          'cut before the 2026-07-10 rewrite: needs a port by hand' if row.get('disjoint') else 'merge-base found')
    check('no open PR or recovery PR', not row.get('prs') and not row.get('recovery_prs'),
          ', '.join(f'#{p["number"]}' for p in (row.get('prs') or []) + (row.get('recovery_prs') or [])) or 'none')
    check('no PR from this branch was closed unmerged', row.get('rejections_known') and not row.get('rejected_prs'),
          ', '.join(f'#{p["number"]}' for p in row.get('rejected_prs') or [])
          or ('none' if row.get('rejections_known') else 'UNKNOWN: no closed-PR list was supplied'))
    check('main cites none of this work', not row.get('citations'),
          ', '.join(f'{c["sha"]} {c["subject"][:60]}' for c in row.get('citations') or []) or 'none')
    residue = row.get('residue') or {}
    risky = sorted(p for p in residue if not LOW_RISK.match(p))
    check('touches only low-risk paths (docs/*.md that no generator owns)', not risky,
          ', '.join(risky[:8]) + (f' and {len(risky) - 8} more' if len(risky) > 8 else '') if risky else 'all docs')
    size = sum(residue.values())
    check(f'small (<= {MAX_AUTO_FILES} files, <= {MAX_AUTO_LINES} lines)',
          len(residue) <= MAX_AUTO_FILES and size <= MAX_AUTO_LINES, f'{len(residue)} files, {size} lines')
    if state == 'STRANDED' and not row.get('disjoint'):
        tip = row['tip_full']
        base = repo.git('merge-base', repo.main, tip).strip()
        r = subprocess.run(['git', 'merge-tree', '--write-tree', '--name-only', repo.main, tip],
                           capture_output=True, text=True, cwd=repo.path)
        conflicted = []
        for ln in r.stdout.splitlines()[1:]:
            if not ln:
                break
            conflicted.append(ln)
        check('merges into main without conflict', r.returncode == 0,
              'clean' if r.returncode == 0 else 'conflicts in ' + ', '.join(conflicted[:8]))
        changed = repo.git('diff', '--name-only', '--diff-filter=M', base, tip).split()
        newer = [f for f in changed if not repo.ok('diff', '--quiet', base, repo.main, '--', f)]
        check('overwrites nothing main changed since the branch was cut', not newer,
              ', '.join(newer[:8]) + (f' and {len(newer) - 8} more' if len(newer) > 8 else '') if newer else 'none')
    verdict = 'AUTO' if all(c['ok'] for c in checks) else 'REVIEW'
    return {'verdict': verdict, 'checks': checks}


def qualification_md(q):
    rows = ['| check | result | evidence |', '|---|---|---|']
    for c in q['checks']:
        rows.append(f'| {c["check"]} | {"pass" if c["ok"] else "**fail**"} | {c["detail"].replace("|", "/")} |')
    verdict = ('**AUTO**: every check passes, so the daily run may open a draft PR from the branch as it stands '
               '(only when automated recovery is switched on; a draft PR is a proposal, not a ship).'
               if q['verdict'] == 'AUTO' else
               '**OWNER REVIEW**: at least one check fails, so no machine recovers this. A person decides, and '
               'records the decision in `data/stranded_work_exclusions.json` (see its `_readme`).')
    return verdict + '\n\n' + '\n'.join(rows)


# -- recovery tasks -----------------------------------------------------------------------------------
def marker(**fields):
    return '<!-- stranded-work ' + ' '.join(f'{k}={v}' for k, v in fields.items()) + ' -->'


def parse_marker(body):
    m = MARKER_RE.search(body or '')
    if not m:
        return None
    return dict(kv.split('=', 1) for kv in m.group(1).split() if '=' in kv)


class Tasks(dict):
    """Recovery issues by key (the canonical one per key), plus `duplicates`: other OPEN issues with the same key."""
    duplicates = ()


def read_tasks(path):
    """Existing recovery issues by key, open ones first. None when no task list was supplied.

    The canonical issue for a key is the open one with the lowest number (the oldest, which carries the
    discussion), else the most recent closed one. Any other open issue with the same key is a duplicate.
    """
    if not path:
        return None
    raw = pathlib.Path(path).read_text(encoding='utf-8').strip()
    issues = json.loads(raw) if raw else []
    by_key, dups = Tasks(), []
    order = lambda i: (i.get('state', '').upper() != 'OPEN',  # noqa: E731
                       int(i.get('number', 0)) if i.get('state', '').upper() == 'OPEN' else -int(i.get('number', 0)))
    for issue in sorted(issues, key=order):
        fields = parse_marker(issue.get('body'))
        if not fields or 'key' not in fields:
            continue
        if fields['key'] in by_key:
            if issue.get('state', '').upper() == 'OPEN':
                dups.append({**issue, 'fields': fields, 'canonical': by_key[fields['key']]['number']})
            continue
        by_key[fields['key']] = {**issue, 'fields': fields}
    by_key.duplicates = dups
    return by_key


def _residue_table(residue, limit=25, listed=400):
    """The largest `limit` files as a table, every other one in a collapsed list.

    A task asks the reader to check each file for a recorded decision, so it names all of them.
    `listed` keeps the body under GitHub's 65,536-character limit on a very large branch.
    """
    ordered = sorted(residue.items(), key=lambda kv: (-kv[1], kv[0]))
    lines = ['| file | lines main is missing |', '|---|---|']
    for path, n in ordered[:limit]:
        lines.append(f'| `{path}` | {n} |')
    rest = ordered[limit:]
    if rest:
        lines.append(f'| … {len(rest)} more, listed below | |')
        lines += ['', f'<details><summary>The other {len(rest)} file(s)</summary>', '']
        lines += [f'- `{path}` ({n})' for path, n in rest[:listed]]
        if len(rest) > listed:
            lines.append(f'- … and {len(rest) - listed} more: see the compare link')
        lines += ['', '</details>']
    return '\n'.join(lines)


def _pr_list(prs):
    return ', '.join(f'#{p["number"]}' + (' (draft)' if p.get('draft') else '') for p in prs)


def _status_section(row):
    """What is already on record about this branch: a decision, a PR, a rejection, a citation from main."""
    out = []
    if row.get('decision'):
        d = row['decision']
        out.append(f'**Recorded decision: {row["disposition"]}** ({d.get("date", "undated")}'
                   f'{", tip " + d["tip"] if d.get("tip") else ""}). {d.get("reason", "")}'
                   f'{" Evidence: " + d["evidence"] if d.get("evidence") else ""}\n\n'
                   'The decision outranks this task. The task stays open because the work is still not on main; '
                   'it never alerts, and nothing recovers it automatically.')
    if row.get('stale_disposition'):
        sd = row['stale_disposition']
        out.append(f'**A recorded decision no longer covers this branch.** `data/stranded_work_exclusions.json` '
                   f'records {sd["disposition"]} for tip `{sd["tip"]}`, but the branch now ends at `{row["tip"]}`: '
                   f'it carries commits that decision never saw. ({sd["reason"]})')
    if row.get('prs'):
        out.append(f'**Open PR from this branch:** {_pr_list(row["prs"])}. A PR is a proposal: this task closes '
                   'when the work is on main, not when a PR opens.')
    if row.get('recovery_prs'):
        out.append(f'**Recovery PR open:** {_pr_list(row["recovery_prs"])}. It says it recovers this task, so no '
                   'other recovery is planned while it is open. If it ports only part of the branch, record the '
                   'rest in `data/stranded_work_exclusions.json` in the same PR.')
    if row.get('rejected_prs'):
        out.append(f'**Closed without merging:** {_pr_list(row["rejected_prs"])}. Read why before proposing it '
                   'again; the daily run never recovers this branch automatically.')
    if row.get('citations'):
        cites = '\n'.join(f'- `{c["sha"]}` {c["date"]} {c["subject"]}' for c in row['citations'][:12])
        out.append('**Main already mentions this work.** These commits on main name the branch or one of its '
                   'commits: some or all of it may have been recovered, redone or reverted. Read them before '
                   f'anything else.\n\n{cites}')
    return '\n\n'.join(out)


def stranded_body(row, repo_slug, qualification=None):
    compare = f'https://github.com/{repo_slug}/compare/main...{row["short"]}?expand=1' if repo_slug else None
    subjects = '\n'.join(f'- {s}' for s in row.get('subjects', [])[:20])
    total = sum(row['residue'].values())
    status = _status_section(row)
    fields = {'key': 'branch:' + row['short'], 'tip': row['tip'], 'v': TEMPLATE_VERSION,
              'state': row.get('state', 'STRANDED'),
              'hold': row.get('disposition') or ('STALE' if row.get('stale_disposition') else '-'),
              'pr': ','.join(str(p['number']) for p in (row.get('prs') or []) + (row.get('recovery_prs') or [])) or '-',
              'verdict': (qualification or {}).get('verdict', '-'),
              'cites': ','.join(c['sha'][:9] for c in row.get('citations') or []) or '-'}
    qual = f'\n\n**Qualification** (decision record from the daily run)\n\n{qualification_md(qualification)}' \
        if qualification else ''
    return f"""{marker(**fields)}
`{row['short']}` carries {row.get('commits', '?')} commit(s) that are not on main, newest {row.get('date', '?')} \
({row.get('age', '?')} days old). {total} changed line(s) across {len(row['residue'])} file(s) are not on main.
{chr(10) + status + chr(10) if status else ''}
**Commits not on main**

{subjects}

**What main is missing** (lines this branch adds that main lacks, plus lines it removes that main still has)

{_residue_table(row['residue'])}{qual}

**Before you choose**

Work left on a branch is not always meant to ship as it stands: it may have been left on purpose, or held until someone \
decides how to redo it on today's `main`. Before opening a PR, cherry-picking or porting any of it, check for a recorded \
decision on these commits, on every file listed above, and in any PR already opened from this branch, closed ones included. \
A recorded decision outranks this issue. If that decision is still pending, leave this issue open: it is the record that \
the work is not on main.

**Then resolve it one of three ways** (none of them is the default)

1. **It should ship as it stands, and no recorded decision says otherwise:** open a PR from the branch\
{f' ([compare]({compare}))' if compare else ''}. Do not rebase, amend or force-push it; merge `main` into it if it conflicts. \
To port part of it from a fresh branch instead, put `{recovery_marker('branch:' + row['short'], row['tip'])}` in the PR \
description so no second recovery is started. This task stays open until main has the work, then closes itself.
2. **Main already has it in another form:** check the files above against main. If the residue is only generated output \
or a line main fixed differently, record the branch in `data/stranded_work_exclusions.json` with that reason \
(`disposition` LANDED or SUPERSEDED, and the `tip` the decision covers).
3. **It will not ship from this branch** (it is abandoned, or a recorded decision says to redo it on a fresh branch from \
`main`): record it in `data/stranded_work_exclusions.json` with the reason (ABANDONED; or INTENTIONAL_HOLD, NEEDS_EVIDENCE \
or DEPENDENCY_BLOCKED, which keep this task open), or delete the branch once nothing depends on it.

Closing this issue without one of those reopens it on the next run: the detector, not the issue, is the record.

_Filed by the daily Stranded work run (`scripts/check-stranded-work.py`)._"""


def pre_rewrite_body(rows, held=()):
    members = sorted(r['short'] for r in rows)
    digest = hashlib.sha1(','.join(members).encode()).hexdigest()[:12]
    table = ['| branch | newest commit | files | lines main is missing | top files |', '|---|---|---|---|---|']
    for r in sorted(rows, key=lambda r: -sum(r['residue'].values())):
        top = ', '.join(f'`{p}`' for p, _ in sorted(r['residue'].items(), key=lambda kv: -kv[1])[:3])
        table.append(f'| `{r["short"]}` | {r.get("date", "?")} | {len(r["residue"])} | {sum(r["residue"].values())} | {top} |')
    held_md = ''
    if held:
        lines = ['| branch | decision | reason |', '|---|---|---|']
        for r in sorted(held, key=lambda r: r['short']):
            lines.append(f'| `{r["short"]}` | {r["disposition"]} | {r["decision"].get("reason", "").replace("|", "/")} |')
        held_md = (f'\n\n**Held by a recorded decision** ({len(held)}): still not on main, and decided. Not counted '
                   'above; listed so the decision stays visible.\n\n' + '\n'.join(lines))
    held_names = ','.join(sorted(r['short'] for r in held)) or '-'
    return f"""{marker(key=PRE_REWRITE_KEY, set=digest, members=','.join(members) or '-', held=held_names, v=TEMPLATE_VERSION)}
{len(members)} branch(es) were cut before main's history was rewritten on 2026-07-10 and carry content main does not have \
and no recorded decision. They share no commit with main, so none can be merged or opened as a PR; each needs the content \
ported onto a fresh branch from main, or a decision recorded in `data/stranded_work_exclusions.json`. Before porting any of \
it, check for a recorded decision on the files involved: a branch may have been left on purpose.

{chr(10).join(table)}{held_md}

How this is measured: a commit counts as on main when main has one with the same author date, author email and subject; the \
remaining commits' added lines are checked against main's current files. Paths that never existed in main's history were \
moved out of this repository by the rewrite and are not counted. A branch drops off this list by itself once its content \
lands or a decision is recorded for it in `data/stranded_work_exclusions.json`.

_Filed by the daily Stranded work run (`scripts/check-stranded-work.py`)._"""


TASK_STATES = ('STRANDED', 'RECOVERING', 'HELD')


def plan_tasks(rows, tasks, repo_slug=None, qualifications=None):
    """Actions that bring the recovery issues in line with the branches.

    Each action: {'action': create|reopen|update|close, 'issue', 'title', 'body', 'comment', 'alert', 'key',
    'reason'}. `alert` marks what is newly stranded: a branch with no task, a task closed while the work is still
    stranded, new commits on a stranded branch, or a branch new to the pre-rewrite list. Only alerts fail the run.
    A change of state that is not new work (a PR opened or closed, a decision recorded) updates the task with a
    comment and no alert. An open task written from an older TEMPLATE_VERSION gets a silent `refresh` update.
    A TRACKED branch keeps its open task (a PR is not a ship) but never gets a new or reopened one.
    `tasks` None (no task list supplied) plans a create for everything, so nothing is waved through.
    """
    known = tasks if tasks is not None else {}
    qualifications = qualifications or {}
    actions, live_keys = [], set()

    for row in (r for r in rows if r['state'] in TASK_STATES + ('TRACKED',) and not r.get('disjoint')):
        key = 'branch:' + row['short']
        issue = known.get(key)
        is_open = issue is not None and issue.get('state', '').upper() == 'OPEN'
        if row['state'] == 'TRACKED' and not is_open:
            continue  # ordinary work in a PR; nothing to track until it strands
        if row['state'] == 'TRACKED' and not row.get('residue'):
            continue  # everything is on main already: let the close pass below close it
        live_keys.add(key)
        title = f'Stranded work: {row["short"]}'
        body = stranded_body(row, repo_slug, qualifications.get(key))
        new = parse_marker(body)
        held = row['state'] == 'HELD'
        if issue is None:
            actions.append({'action': 'create', 'key': key, 'title': title, 'body': body, 'alert': not held})
        elif not is_open:
            actions.append({'action': 'reopen', 'key': key, 'issue': issue['number'], 'title': title, 'body': body,
                            'comment': f'Reopened: `{row["short"]}` still carries work main does not have (tip `{row["tip"]}`).'
                                       + (' A decision is recorded for it, so this is not an alert.' if held else ''),
                            'alert': not held})
        elif issue['fields'].get('tip') != row['tip']:
            actions.append({'action': 'update', 'key': key, 'issue': issue['number'], 'title': title, 'body': body,
                            'comment': f'New commits on `{row["short"]}` since this task was filed: tip moved '
                                       f'`{issue["fields"].get("tip")}` → `{row["tip"]}`'
                                       + (f', and PR {_pr_list(row["prs"])} carries them.' if row.get('prs')
                                          else ', and no open PR tracks them.'),
                            'alert': not row.get('prs') and not held})
        else:
            notes = _transition_notes(issue['fields'], new, row)
            if notes:
                actions.append({'action': 'update', 'key': key, 'issue': issue['number'], 'title': title, 'body': body,
                                'comment': ' '.join(notes), 'alert': False})
            elif issue['fields'].get('v') != TEMPLATE_VERSION or issue['fields'].get('verdict', '-') != new['verdict']:
                actions.append({'action': 'update', 'key': key, 'issue': issue['number'], 'title': title, 'body': body,
                                'comment': None, 'alert': False, 'refresh': True})

    pre = [r for r in rows if r['state'] == 'DISJOINT' and r['residue']]
    pre_held = [r for r in rows if r['state'] == 'HELD' and r.get('disjoint')]
    issue = known.get(PRE_REWRITE_KEY)
    if pre or pre_held:
        live_keys.add(PRE_REWRITE_KEY)
        body = pre_rewrite_body(pre, pre_held)
        members = {r['short'] for r in pre}
        title = (f'Stranded work: {len(pre)} pre-rewrite branch(es) with content not on main'
                 + (f' ({len(pre_held)} more held)' if pre_held else ''))
        if issue is None:
            actions.append({'action': 'create', 'key': PRE_REWRITE_KEY, 'title': title, 'body': body, 'alert': bool(pre)})
        else:
            before = {b.strip() for b in issue['fields'].get('members', '').split(',') if b.strip() and b.strip() != '-'}
            held_before = {b for b in issue['fields'].get('held', '').split(',') if b and b != '-'}
            held_now = {r['short'] for r in pre_held}
            added, gone = sorted(members - before - held_before), sorted(before - members)
            to_held = sorted(held_now - held_before)
            reopen = issue.get('state', '').upper() != 'OPEN'
            if added or gone or reopen or to_held or (held_before - held_now - members):
                note = []
                if added:
                    note.append('New on the list: ' + ', '.join(f'`{b}`' for b in added) + '.')
                resolved = [b for b in gone if b not in held_now]
                if resolved:
                    note.append('Resolved since the last run (content now on main, or a decision recorded in '
                                '`data/stranded_work_exclusions.json`): ' + ', '.join(f'`{b}`' for b in resolved) + '.')
                if to_held:
                    note.append('Decision recorded, now held: ' + ', '.join(f'`{b}`' for b in to_held) + '.')
                released = sorted(held_before - held_now - members)
                if released:
                    note.append('No longer held and nothing left to port: ' + ', '.join(f'`{b}`' for b in released) + '.')
                if reopen:
                    note.append('Reopened: these branches still carry content main does not have.')
                actions.append({'action': 'reopen' if reopen else 'update', 'key': PRE_REWRITE_KEY,
                                'issue': issue['number'], 'title': title, 'body': body, 'comment': ' '.join(note),
                                'alert': bool(added) or (reopen and bool(pre))})
            elif issue['fields'].get('v') != TEMPLATE_VERSION:
                actions.append({'action': 'update', 'key': PRE_REWRITE_KEY, 'issue': issue['number'], 'title': title,
                                'body': body, 'comment': None, 'alert': False, 'refresh': True})

    by_branch = {r['short']: r for r in rows}
    for key, issue in known.items():
        if key in live_keys or issue.get('state', '').upper() != 'OPEN':
            continue
        reason = 'completed'
        if key == PRE_REWRITE_KEY:
            why = 'no pre-rewrite branch carries content main lacks any more.'
        else:
            row = by_branch.get(key.split(':', 1)[1])
            state = row and row['state']
            tip = issue['fields'].get('tip', '?')
            why = {
                None: f'the branch no longer exists. Its last recorded tip was `{tip}`; '
                      'that commit stays reachable by its SHA if the work is ever needed.',
                'MERGED': 'the branch is merged into main.',
                'TRACKED': 'everything the branch changes is on main (an open PR still points at it).',
                'LANDED': 'everything the branch changes is now on main.',
                'EXCLUDED': (f'`data/stranded_work_exclusions.json` records it as '
                             f'{(row or {}).get("disposition", "ABANDONED")}: '
                             f'{((row or {}).get("decision") or {}).get("reason", "")}'),
            }.get(state, f'the branch is now {state}.')
            if state is None or (state == 'EXCLUDED' and (row or {}).get('disposition') not in ('LANDED', 'SUPERSEDED')):
                reason = 'not planned'
        actions.append({'action': 'close', 'key': key, 'issue': issue['number'], 'reason': reason,
                        'comment': f'Resolved: {why} Closed by the daily Stranded work run.', 'alert': False})

    for dup in getattr(known, 'duplicates', ()):
        actions.append({'action': 'close', 'key': dup['fields']['key'], 'issue': dup['number'], 'reason': 'not planned',
                        'comment': f'Duplicate of #{dup["canonical"]}, which tracks the same branch. '
                                   'Closed by the daily Stranded work run.', 'alert': False, 'duplicate': True})
    return actions


def _transition_notes(old, new, row):
    """Comments for a change of state that is not new work: a PR opened or closed, a decision recorded or lifted."""
    notes = []
    if old.get('pr', '-') != new['pr']:
        if new['pr'] == '-':
            notes.append(f'The PR that proposed this ({", ".join("#" + n for n in old.get("pr", "").split(","))}) '
                         'is no longer open and the work is still not on main.')
        else:
            notes.append(f'PR {", ".join("#" + n for n in new["pr"].split(","))} now proposes this work. '
                         'This task stays open until main has it.')
    if old.get('hold', '-') != new['hold']:
        if new['hold'] == 'STALE':
            notes.append('The recorded decision covers an older tip only; the commits after it are stranded.')
        elif new['hold'] == '-':
            notes.append('The recorded decision no longer applies; the work is stranded again.')
        else:
            notes.append(f'Decision recorded: {new["hold"]}. The task stays open; the work is still not on main.')
    before = {c for c in old.get('cites', '-').split(',') if c and c != '-'}
    added = [c for c in new['cites'].split(',') if c and c != '-' and c not in before]
    if added:
        notes.append(f'Main now has {len(added)} commit(s) that mention this work ({", ".join(added)}): some of it may '
                     'have been recovered, redone or reverted. See the list in the description.')
    return notes


def plan_recoveries(rows, qualifications, repo_slug=None):
    """Draft PRs for AUTO-qualified branches: from the branch as it stands, never rewritten, never merged."""
    out = []
    for row in rows:
        key = 'branch:' + row['short']
        q = qualifications.get(key)
        if row['state'] != 'STRANDED' or not q or q['verdict'] != 'AUTO':
            continue
        subjects = '\n'.join(f'- {s}' for s in row.get('subjects', [])[:20])
        body = (f'{recovery_marker(key, row["tip"])}\n'
                f'Opened by the daily Stranded work run as a **draft**: `{row["short"]}` carries commits that no '
                f'open PR tracked, and every qualification check passed (the recovery task has the record). '
                f'Nothing here has been reviewed by a person yet.\n\n**Commits**\n\n{subjects}\n\n'
                'Mark it ready only after a person has read it. The recovery task closes once main has the work.')
        out.append({'action': 'recover', 'key': key, 'branch': row['short'], 'tip': row['tip'],
                    'title': f'Recover stranded work: {row["short"]}', 'body': body, 'draft': True, 'alert': False})
    return out
