#!/usr/bin/env python3
"""Fail when a page's document structure would hide its own <head> metadata.

Why this exists
---------------
On 2026-08-13 two pages — es/decorador-de-texto and es/simbolos-para-free-fire —
were found with an `<link rel="alternate" hreflang=...>` sitting ABOVE
`<!DOCTYPE html>`. Two separate failures from one line:

  1. Anything before the doctype puts the browser in quirks mode.
  2. The link is outside <head>, so no crawler counts it — while every audit in
     this repo *did* count it, because they grep the file as text. The page was
     the only declared `tr` (resp. `vi`) sibling in its cluster, so the mesh
     looked complete and was not.

Root cause was in scripts/audit-hreflang.js, now fixed: its anchor regexes
matched only double-quoted `rel="alternate"`. These two pages are the only two
on the site written with single-quoted attributes, so no anchor was found,
`lastAltIdx` stayed -1, and `lastAltIdx + 1` spliced the new link in at line 0 —
sailing straight past the `if (insertAt < 0) continue` guard that existed to
prevent exactly this.

The lesson generalises past hreflang: a text-level audit cannot tell where in
the document a tag lives, so "the string is in the file" is not the same claim
as "a crawler will see it." This check asks the structural question the others
cannot.

Checks (all currently at zero site-wide, which is why this gates):
  * no content before <!DOCTYPE
  * a </head> exists
  * no rel=alternate / rel=canonical after </head>
  * at most one canonical per page

Usage:  python3 scripts/check-document-head.py [paths...]
Exit 0 when clean, 1 otherwise.
"""
import glob
import re
import sys

DOCTYPE_RE = re.compile(r'<!DOCTYPE', re.I)
HEAD_END_RE = re.compile(r'</head>', re.I)
ALT_OR_CANON_RE = re.compile(r'<link[^>]*rel=[\'"](?:alternate|canonical)[\'"][^>]*>', re.I)
CANON_RE = re.compile(r'<link[^>]*rel=[\'"]canonical[\'"][^>]*>', re.I)


def check(path):
    """Return a list of problem strings for one file."""
    try:
        src = open(path, encoding='utf-8').read()
    except (OSError, UnicodeDecodeError) as exc:
        return [f'unreadable: {exc}']

    problems = []

    m = DOCTYPE_RE.search(src)
    if not m:
        problems.append('no <!DOCTYPE> at all')
    elif m.start() > 0 and src[:m.start()].strip():
        stray = src[:m.start()].strip().replace('\n', ' ')[:100]
        problems.append(f'content before <!DOCTYPE> (quirks mode): {stray}')

    hm = HEAD_END_RE.search(src)
    if not hm:
        problems.append('no </head>')
        return problems

    head, body = src[:hm.start()], src[hm.end():]

    for stray in ALT_OR_CANON_RE.findall(body):
        problems.append(f'rel=alternate/canonical after </head> (crawlers ignore it): {stray[:90]}')

    canons = CANON_RE.findall(head)
    if len(canons) > 1:
        problems.append(f'{len(canons)} canonical tags in <head>')

    return problems


def main():
    paths = sys.argv[1:] or sorted(
        p for p in glob.glob('**/index.html', recursive=True) if 'node_modules' not in p)

    bad = []
    for path in paths:
        for problem in check(path):
            bad.append((path, problem))

    print(f'Scanned {len(paths)} page(s).')
    print(f'  document-structure problems: {len(bad)}')

    if not bad:
        print('\nEvery page declares its head metadata where a crawler will see it. ✓')
        return 0

    print()
    for path, problem in bad[:60]:
        print(f'✗ {path}\n    {problem}')
    if len(bad) > 60:
        print(f'  ... and {len(bad) - 60} more')
    print('\n  Fix: move the tag inside <head>, after the canonical.')
    print('  If a generator put it there, fix the generator too — see this file\'s')
    print('  header for the audit-hreflang.js insertion bug that caused the first two.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
