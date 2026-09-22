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
import pathlib
import re
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
ROOT_BUDGET = 250

# A link target inside the repo, as written in a rule/skill/doc. Bare words, npm
# aliases and shell fragments are not links and are not checked.
LINK = re.compile(r'`((?:\.claude|docs|scripts|data|assets|js)/[A-Za-z0-9_./*<>-]+)`')


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
