#!/usr/bin/env python3
"""Fail when a copy tile does not contain the codepoint its own label names.

Why this exists
---------------
A tile whose label reads "Ohm Sign (U+2126)" must put U+2126 on the clipboard.
On 2026-08-13 a sweep found 172 tiles across 89 pages that did not, in three
families:

  * U+2126 OHM SIGN     -> shipped as U+03A9 GREEK CAPITAL OMEGA
  * U+212A KELVIN SIGN  -> shipped as U+004B LATIN CAPITAL LETTER K
  * U+00A0 and the U+2000..U+205F space run -> shipped as U+0020 SPACE

The first two are not typos. U+2126 and U+212A are the two characters in
common use that have a *singleton canonical decomposition*, so any NFC
normalisation pass silently rewrites them:

    unicodedata.normalize('NFC', 'Ω') == 'Ω'

That is why U+200B and U+3164 on the very same pages were fine while these
were not, and why re-typing the glyph does not durably fix it — the next
formatter or editor that normalises the file breaks it again. The repair is to
write the character as an HTML numeric entity (&#x2126;), which is inert
under both NFC and whitespace collapsing; the HTML parser hands the real
character back to `getAttribute('data-symbol')` at runtime.

These pages exist to deliver one exact codepoint. A page that promises U+00A0
and hands over a plain space fails its only job, silently, on the platforms
whose behaviour it is describing. This check is cheap and the backlog is zero,
so it gates rather than informs.

Usage:  python3 scripts/check-tile-codepoints.py [--json out.json]
Exit 0 when clean, 1 when any tile contradicts its own label.
"""
import argparse
import glob
import html
import json
import re
import sys

TILE_RE = re.compile(
    r'<button class="flag-emoji symbol-tile" data-symbol="(?P<sym>[^"]*)" '
    r'aria-label="(?P<aria>[^"]*)">(?P<glyph>.*?)</button>\s*'
    r'<span class="flag-label">(?P<label>.*?)</span>', re.S)

# "U+2126" anywhere in the label is a promise about what the tile copies.
CP_RE = re.compile(r'U\+([0-9A-Fa-f]{4,6})')


def scan(paths):
    bad = []
    for path in paths:
        try:
            src = open(path, encoding='utf-8').read()
        except (OSError, UnicodeDecodeError):
            continue
        for m in TILE_RE.finditer(src):
            label = m.group('label')
            codes = CP_RE.findall(label)
            # Only adjudicate when the label names exactly one codepoint and the
            # tile carries exactly one character — anything else is a combo or a
            # prose label, and not this check's business.
            if len(codes) != 1:
                continue
            sym = html.unescape(m.group('sym'))
            if len(sym) != 1:
                continue
            want = int(codes[0], 16)
            if ord(sym) != want:
                bad.append({
                    'file': path,
                    'label': re.sub(r'<[^>]+>', '', label)[:80],
                    'promised': f'U+{want:04X}',
                    'actual': f'U+{ord(sym):04X}',
                })
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--json')
    ap.add_argument('paths', nargs='*')
    args = ap.parse_args()

    paths = args.paths or sorted(set(
        glob.glob('library/*/index.html') + glob.glob('*/library/*/index.html') +
        glob.glob('symbol/*/index.html') + glob.glob('*/symbol/*/index.html') +
        glob.glob('*/index.html')))
    bad = scan(paths)

    print(f'Scanned {len(paths)} page(s).')
    print(f'  tiles contradicting their own label: {len(bad)}')
    if args.json:
        json.dump(bad, open(args.json, 'w'), indent=1)

    if not bad:
        print('\nEvery tile that names a codepoint delivers that codepoint. ✓')
        return 0

    print()
    for b in bad[:60]:
        print(f'✗ {b["file"]}')
        print(f'    label promises {b["promised"]} but the tile copies {b["actual"]}')
        print(f'    "{b["label"]}"')
    if len(bad) > 60:
        print(f'  ... and {len(bad) - 60} more')
    print('\n  Fix: write the character as an HTML numeric entity in both')
    print('  data-symbol and the button text, e.g. data-symbol="&#x2126;".')
    print('  A literal U+2126/U+212A will be destroyed again by the next NFC pass.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
