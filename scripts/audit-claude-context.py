#!/usr/bin/env python3
"""Report on the Claude Code context architecture: root size, rule scoping, links.

Why this exists
---------------
`CLAUDE.md` reached 5,581 lines because nearly every substantial change appended a
narrative section to it. The four-layer split (root / .claude/rules / .claude/skills
/ docs) fixes the state; nothing was measuring the *trend*, and this repo's own
record on hand-maintained invariants is nine consecutive stale hand-corrections.

It is INFORMATIONAL and never gates, for the reason
docs/architecture/validation-system.md gives: a check with a real standing backlog
is one people learn to ignore, and the useful signal here is a budget being crossed
rather than a defect. It exits non-zero only on a structural problem it can state
plainly -- a rule with no `paths` (which would load every session, silently
defeating the scoping), unreadable frontmatter, or a broken internal link.

Usage:
    python3 scripts/audit-claude-context.py          # report
    python3 scripts/audit-claude-context.py --full   # list pre-existing stale links
    python3 scripts/audit-claude-context.py --strict # non-zero when over budget too
"""
import itertools
import json
import pathlib
import re
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
ROOT_BUDGET = 250

# A link target inside the repo, as written in a rule/skill/doc. Bare words, npm
# aliases and shell fragments are not links and are not checked.
LINK = re.compile(r'`((?:\.claude|docs|scripts|data|assets|js)/[A-Za-z0-9_./*<>-]+)`')


def expand_braces(pattern):
    """Expand {a,b} groups the way the rules loader's glob budget describes."""
    m = re.search(r'\{([^{}]*)\}', pattern)
    if not m:
        return [pattern]
    return list(itertools.chain.from_iterable(
        expand_braces(pattern[:m.start()] + opt + pattern[m.end():])
        for opt in m.group(1).split(',')))


def glob_re(pattern):
    """`**` spans directories; a single `*` does not cross a separator.

    That distinction is the whole reason this pass exists: `*.js` plus
    `js/**/*.js` silently matched none of the 21 feature scripts that live beside
    their own page, so the rule governing them never loaded.
    """
    rx = (re.escape(pattern)
          .replace(r'\*\*/', '(?:.*/)?')
          .replace(r'\*\*', '.*')
          .replace(r'\*', '[^/]*')
          .replace(r'\?', '[^/]'))
    return re.compile(rx + r'\Z')


def tracked_files():
    out = subprocess.run(['git', 'ls-files'], cwd=REPO, capture_output=True, text=True)
    return out.stdout.split() if out.returncode == 0 else []


def ignored(rel):
    """True when git ignores this path, so its absence is by design."""
    try:
        return subprocess.run(['git', 'check-ignore', '-q', rel], cwd=REPO,
                              capture_output=True).returncode == 0
    except OSError:
        return False


def frontmatter(text):
    """Return (dict-ish paths list, error) for a leading YAML block.

    Deliberately a narrow reader rather than a YAML dependency: this repo installs
    no Python packages for validators, and the only field that matters here is a
    list of glob strings.
    """
    if not text.startswith('---\n'):
        return None, 'no YAML frontmatter'
    end = text.find('\n---', 4)
    if end == -1:
        return None, 'frontmatter is never closed'
    block = text[4:end]
    if not re.search(r'^paths:\s*$', block, re.M):
        return None, 'no `paths:` list'
    paths = re.findall(r'^\s*-\s*"?([^"\n]+)"?\s*$', block, re.M)
    return [p.strip() for p in paths if p.strip()], None


def main():
    strict = '--strict' in sys.argv
    problems, notes = [], []

    root = REPO / 'CLAUDE.md'
    root_lines = len(root.read_text(encoding='utf-8').splitlines())
    over = root_lines > ROOT_BUDGET
    print(f'root CLAUDE.md: {root_lines} lines (budget {ROOT_BUDGET})'
          + ('  OVER BUDGET' if over else ''))
    if over:
        notes.append(
            f'CLAUDE.md is {root_lines - ROOT_BUDGET} line(s) over budget. Something '
            'in it probably belongs in .claude/rules/, a skill, or docs/ -- see '
            'docs/architecture/claude-context-architecture.md.')

    rules_dir = REPO / '.claude' / 'rules'
    rules = sorted(rules_dir.glob('**/*.md')) if rules_dir.is_dir() else []
    print(f'\n.claude/rules: {len(rules)} rule(s)')
    total = 0
    for f in rules:
        text = f.read_text(encoding='utf-8')
        n = len(text.splitlines())
        total += n
        paths, err = frontmatter(text)
        if err:
            # A rule without `paths` loads at launch with root priority. That is
            # not a scoped rule; it is more global context wearing a filename.
            problems.append(f'{f.relative_to(REPO)}: {err} -- would load EVERY session')
            print(f'  ! {f.relative_to(REPO).name:34s} {n:4d}L  {err}')
        else:
            print(f'    {f.relative_to(REPO).name:34s} {n:4d}L  {len(paths)} pattern(s)')
    print(f'  total scoped rule lines: {total} (loaded only on matching reads)')

    # A glob that matches nothing is a rule that never loads, and it looks
    # identical to a rule that is simply not needed yet. Four such gaps shipped in
    # the first cut of this architecture, so this is measured, not trusted.
    files = tracked_files()
    if not files:
        problems.append('could not list tracked files (not a git repo?) '
                        '-- glob coverage UNKNOWN, not clean')
    else:
        print('\n  glob coverage (matched tracked files per rule):')
        for f in rules:
            paths, err = frontmatter(f.read_text(encoding='utf-8'))
            if err:
                continue
            dead, total = [], 0
            for raw in paths:
                n = 0
                for pat in expand_braces(raw):
                    rx = glob_re(pat)
                    n += sum(1 for p in files if rx.match(p))
                total += n
                if n == 0:
                    dead.append(raw)
            name = f.relative_to(REPO).name
            print(f'    {name:34s} {total:6d} file(s)'
                  + (f'   DEAD: {", ".join(dead)}' if dead else ''))
            for raw in dead:
                problems.append(f'{f.relative_to(REPO)}: glob {raw!r} matches no '
                                'tracked file -- this rule will never load for it')

        # The localization rule hardcodes the locale list its own text forbids
        # discovering by glob. Keep the two in step or locale #31 silently loses
        # the entire rule.
        reg = REPO / 'data' / 'locale_qualification_tiers.json'
        loc_rule = REPO / '.claude' / 'rules' / 'localization.md'
        if reg.exists() and loc_rule.exists():
            known = set(json.loads(reg.read_text(encoding='utf-8'))['locales'])
            paths, err = frontmatter(loc_rule.read_text(encoding='utf-8'))
            globbed = set()
            for raw in (paths or []):
                for pat in expand_braces(raw):
                    head = pat.split('/')[0]
                    if head in known:
                        globbed.add(head)
            missing = sorted(known - globbed)
            if missing:
                problems.append(
                    'localization.md: locale(s) in data/locale_qualification_tiers.json '
                    'but not in its paths: ' + ', '.join(missing))
            else:
                print(f'    localization covers all {len(known)} registered locales')

    skills = sorted((REPO / '.claude' / 'skills').glob('*/SKILL.md'))
    print(f'\n.claude/skills: {len(skills)} skill(s)')
    for f in skills:
        text = f.read_text(encoding='utf-8')
        if not text.startswith('---\n'):
            problems.append(f'{f.relative_to(REPO)}: no YAML frontmatter')
        elif not re.search(r'^name:\s*\S', text, re.M) or not re.search(r'^description:', text, re.M):
            problems.append(f'{f.relative_to(REPO)}: frontmatter needs name and description')
        print(f'    {f.parent.name:34s} {len(text.splitlines()):4d}L')

    # Broken internal links are the one way this architecture fails silently: a rule
    # that points at a doc nobody wrote reads exactly like a rule with deep context.
    #
    # Scoped to the layers this architecture OWNS. The older docs/ tree legitimately
    # names gitignored directories, planned files in a plan document and files that
    # existed when a dated review was written -- 24 of them -- and erroring on those
    # would make this permanently red for reasons no change can fix, which is the
    # failure mode docs/architecture/validation-system.md exists to prevent. They are
    # reported separately, as information.
    owned = rules + skills + [root] + sorted((REPO / 'docs' / 'architecture').glob('*.md')) \
        + sorted((REPO / 'docs' / 'decisions').glob('*.md'))
    legacy = [f for f in sorted((REPO / 'docs').glob('**/*.md')) if f not in set(owned)]

    def missing_links(files):
        out = []
        for f in files:
            for target in sorted(set(LINK.findall(f.read_text(encoding='utf-8')))):
                if any(c in target for c in '*<>') or target.endswith('...'):
                    continue
                if (REPO / target).exists():
                    continue
                if ignored(target):          # gitignored by design, e.g. built assets
                    continue
                out.append((f.relative_to(REPO), target))
        return out

    broken = missing_links(owned)
    for f, target in broken:
        problems.append(f'{f}: broken link -> {target}')
    print(f'\ninternal links, owned layers ({len(owned)} files): {len(broken)} broken')

    stale = missing_links(legacy)
    print(f'internal links, pre-existing docs ({len(legacy)} files): '
          f'{len(stale)} unresolved (reported, never enforced)')
    if '--full' in sys.argv:
        for f, target in stale:
            print(f'    {f} -> {target}')

    for p in problems:
        print(f'\nERROR  {p}')
    for n in notes:
        print(f'\nNOTE   {n}')

    if problems:
        return 1
    if over and strict:
        return 1
    print('\nOK' if not over else '\nOK (over budget, reported not enforced)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
