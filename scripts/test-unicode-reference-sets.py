#!/usr/bin/env python3
"""Gate: the complete Unicode reference sets on four library clusters stay complete and correct.

What it covers
--------------
Four library pages carry sections that promise a complete, ordered Unicode set,
and their locale siblings carry the same sections:

  * braille-pattern-symbols  (en, de, es): the braille alphabet and all 256 cells
  * box-drawing-symbols      (en, de, ko): the rest of U+2500..U+259F
  * card-suit-symbols        (en + 9 locales): the 52-card deck, the tarot knights
                                           and the white joker
  * dice-domino-symbols      (en): every domino tile and the mahjong set

A tile on these pages is a promise about one exact code point, and a label is a
promise about what that code point is. Neither shows up as broken in a
screenshot: a wrong cell in a 256-cell grid looks like every other cell. So
every expectation here is derived from the code points themselves (dot bits,
UCD names, block arithmetic), never from a second hand-typed list.

Checks, per section and per locale:
  1. the section exists exactly once;
  2. every tile is assigned, free of variation selectors and joiners, and is a
     single scalar (except the braille number tiles: number sign + letter);
  3. the set is exactly the expected one, in the expected order, no duplicate;
  4. the label agrees with the code point (dot numbers, UCD names, card ranks);
  5. the aria-label is present and contains the visible label (WCAG 2.5.3);
  6. a locale sibling carries the same code points in the same order, and its
     worded labels are not the English ones (dot numbers and letters are
     language-neutral and must match instead);
  7. nothing from the excluded sets ships: tarot trumps U+1F0E0..U+1F0F5 and
     the red joker U+1F0BF, which Android's system symbol font does not draw.

`--self-test` runs the checker against deliberately broken copies of a page and
fails unless every mutation is caught, so this cannot go quietly inert.

Usage:  python3 scripts/test-unicode-reference-sets.py [--self-test]
Exit 0 clean, 1 on any defect, 2 when a page it expects is missing.
"""
import html
import os
import re
import sys
import unicodedata

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
VS_OR_JOINER = {0xFE0E, 0xFE0F, 0x200D}
EXCLUDED = set(range(0x1F0E0, 0x1F0F6)) | {0x1F0BF}

# ---------------------------------------------------------------- expected sets

BRAILLE_LETTERS = 'A⠁ B⠃ C⠉ D⠙ E⠑ F⠋ G⠛ H⠓ I⠊ J⠚ K⠅ L⠇ M⠍ N⠝ O⠕ P⠏ Q⠟ R⠗ S⠎ T⠞ U⠥ V⠧ W⠺ X⠭ Y⠽ Z⠵'.split()
BRAILLE_EXTRA = {'en': [], 'de': 'Ä⠜ Ö⠪ Ü⠳ ß⠮'.split(), 'es': 'Á⠷ É⠮ Í⠌ Ó⠬ Ú⠾ Ü⠳ Ñ⠻'.split()}
CAPITAL = {'en': '⠠', 'de': None, 'es': '⠨'}
NUMBER_SIGN = '⠼'


def dot_label(cp):
    bits = cp - 0x2800
    return '-'.join(str(i + 1) for i in range(8) if bits >> i & 1)


def braille_alphabet(lc):
    out = [(p[1], p[0]) for p in BRAILLE_LETTERS + BRAILLE_EXTRA[lc]]
    out.append((NUMBER_SIGN, None))
    for d, letter in zip('1234567890', 'ABCDEFGHIJ'):
        out.append((NUMBER_SIGN + dict((p[0], p[1]) for p in BRAILLE_LETTERS)[letter], d))
    if CAPITAL[lc]:
        out.append((CAPITAL[lc], None))
    return out


def braille_grid(lo):
    return [(chr(cp), dot_label(cp) or None) for cp in range(lo, lo + 64)]


def box_rest():
    """The 127 code points of U+2500..U+259F the original three sections did not carry."""
    shown = set(map(ord, '─│┌┐└┘├┤┬┴┼═║╔╗╚╝╬━┃┏┓█▉▊▌▎▏▀▄░▒▓'))
    return [cp for cp in range(0x2500, 0x25A0) if cp not in shown]


def box_sections():
    rest = box_rest()
    heavy_double = [cp for cp in rest if re.fullmatch(r'BOX DRAWINGS (HEAVY|DOUBLE) \w+ AND \w+', unicodedata.name(chr(cp)))]
    rounded_dashed = [cp for cp in rest if 'ARC' in unicodedata.name(chr(cp))] + \
                     [cp for cp in rest if 'DASH' in unicodedata.name(chr(cp))]
    half_diag = [cp for cp in range(0x2574, 0x2580)] + [0x2571, 0x2572, 0x2573]
    blocks = [cp for cp in rest if cp >= 0x2580]  # code order: rising lower eighths, other fractions, quadrants
    single_double = [cp for cp in rest if re.search(r'SINGLE', unicodedata.name(chr(cp)))]
    taken = set(heavy_double + rounded_dashed + half_diag + blocks + single_double)
    light_heavy = [cp for cp in rest if cp not in taken]
    return {
        'heavy-double-pieces': heavy_double,
        'rounded-dashed-lines': rounded_dashed,
        'half-lines-diagonals': half_diag,
        'mixed-light-heavy': light_heavy,
        'mixed-single-double': single_double,
        'bar-chart-quadrants': blocks,
    }


def box_en_label(cp):
    return unicodedata.name(chr(cp)).title().replace(' And ', ' and ').replace(' To ', ' to ')


CARD_SUITS = [(0x1F0A0, 'SPADES'), (0x1F0B0, 'HEARTS'), (0x1F0C0, 'DIAMONDS'), (0x1F0D0, 'CLUBS')]
DECK = [base + i for base, _ in CARD_SUITS for i in range(1, 15) if i != 12]
KNIGHTS = [base + 12 for base, _ in CARD_SUITS]


def card_en_label(cp):
    n = unicodedata.name(chr(cp))
    return n.replace('PLAYING CARD ', '').title().replace(' Of ', ' of ')


DOMINO_H_REST = list(range(0x1F031 + 7, 0x1F062))
DOMINO_V = list(range(0x1F062, 0x1F094))
MAHJONG_SHOWN = set(map(ord, '🀄🀅🀆🀀🀇🀐🀙🀁'))
MAHJONG_REST = [cp for cp in range(0x1F000, 0x1F02C) if cp not in MAHJONG_SHOWN]


def domino_label(cp):
    m = re.match(r'DOMINO TILE (HORIZONTAL|VERTICAL)-(\d\d)-(\d\d)', unicodedata.name(chr(cp)))
    if m:
        return 'Domino Tile %s %d-%d' % (m.group(1).title(), int(m.group(2)), int(m.group(3)))
    return unicodedata.name(chr(cp)).title()


def cps(seq):
    return [(chr(cp), None) for cp in seq]


# label kinds: 'neutral' (must equal EN), 'worded' (EN checked against UCD, locales must differ from EN)
CLUSTERS = {
    'braille': {
        'pages': {'en': 'library/braille-pattern-symbols', 'de': 'de/library/braille-symbole', 'es': 'es/library/simbolos-braille'},
        'sections': {
            'braille-alphabet': (braille_alphabet, 'braille-alphabet'),
            'braille-six-dot-cells': (lambda lc: braille_grid(0x2800), 'dots'),
            'braille-dot-7-cells': (lambda lc: braille_grid(0x2840), 'dots'),
            'braille-dot-8-cells': (lambda lc: braille_grid(0x2880), 'dots'),
            'braille-dots-7-8-cells': (lambda lc: braille_grid(0x28C0), 'dots'),
        },
    },
    'box': {
        'pages': {'en': 'library/box-drawing-symbols', 'de': 'de/library/rahmenzeichen', 'ko': 'ko/library/nemo-giho'},
        'sections': {sid: ((lambda s: lambda lc: cps(s))(seq), 'box') for sid, seq in box_sections().items()},
    },
    'cards': {
        'pages': {'en': 'library/card-suit-symbols', 'pt': 'pt/library/naipes-de-baralho', 'de': 'de/library/spielkarten-symbole',
                  'pl': 'pl/library/symbole-kart', 'ja': 'ja/library/trump-kigou', 'ko': 'ko/library/teureompeu-kadeu-giho',
                  'es': 'es/library/simbolos-de-cartas', 'tr': 'tr/library/iskambil-sembolleri',
                  'it': 'it/library/simboli-carte-da-gioco', 'sv': 'sv/library/kortfarg-symboler'},
        'sections': {
            'full-deck-52-cards': (lambda lc: cps(DECK), 'card'),
            'tarot-knights-white-joker': (lambda lc: cps(KNIGHTS + [0x1F0DF]), 'card'),
        },
    },
    'dice': {
        'pages': {'en': 'library/dice-domino-symbols'},
        'sections': {
            'dominoes-horizontal-rest': (lambda lc: cps(DOMINO_H_REST), 'domino'),
            'dominoes-vertical': (lambda lc: cps(DOMINO_V), 'domino'),
            'mahjong-full-set': (lambda lc: cps(MAHJONG_REST), 'mahjong'),
        },
    },
}

# ---------------------------------------------------------------- parsing

TILE_RE = re.compile(r'<button class="flag-emoji symbol-tile" data-symbol="([^"]*)" aria-label="([^"]*)">[^<]*</button>\s*'
                     r'<span class="flag-label">([^<]*)</span>')


def sections_of(text):
    out = {}
    for m in re.finditer(r'<section class="mood-explainers" id="([^"]+)">(.*?)</section>', text, re.S):
        out.setdefault(m.group(1), []).append(
            [(html.unescape(a), html.unescape(b), html.unescape(c)) for a, b, c in TILE_RE.findall(m.group(2))])
    return out


# ---------------------------------------------------------------- checks

def check_tiles(where, tiles, expected, kind, lc, en_tiles, errors):
    syms = [t[0] for t in tiles]
    want = [e[0] for e in expected]
    if syms != want:
        missing = [s for s in want if s not in syms]
        extra = [s for s in syms if s not in want]
        errors.append(f'{where}: set/order differs from the expected {len(want)} (missing {missing[:8]}, extra {extra[:8]})')
    if len(set(syms)) != len(syms):
        errors.append(f'{where}: duplicate tiles {sorted({s for s in syms if syms.count(s) > 1})}')
    for i, (sym, aria, label) in enumerate(tiles):
        tag = f'{where} tile {i + 1} {sym!r}'
        cpl = [ord(c) for c in sym]
        if any(c in VS_OR_JOINER for c in cpl):
            errors.append(f'{tag}: carries a variation selector or joiner')
        for c in cpl:
            try:
                unicodedata.name(chr(c))
            except ValueError:
                errors.append(f'{tag}: U+{c:04X} is unassigned or unnamed')
            if c in EXCLUDED:
                errors.append(f'{tag}: U+{c:04X} is excluded (no Android system glyph)')
        if len(cpl) != 1 and not (kind == 'braille-alphabet' and len(cpl) == 2 and sym[0] == NUMBER_SIGN):
            errors.append(f'{tag}: {len(cpl)} code points in a single-character tile')
        if not label.strip() or not aria.strip():
            errors.append(f'{tag}: empty label or aria-label')
        elif label.casefold() not in aria.casefold():
            errors.append(f'{tag}: aria-label {aria!r} does not contain the visible label {label!r}')
        exp_label = expected[i][1] if i < len(expected) else None
        if kind == 'dots' and exp_label and label != exp_label:
            errors.append(f'{tag}: label {label!r} but the cell raises dots {exp_label}')
        if kind == 'braille-alphabet' and exp_label and label != exp_label:
            errors.append(f'{tag}: label {label!r} but the cell is {exp_label}')
        if lc == 'en':
            cp = cpl[0]
            if kind == 'box':
                want_l = box_en_label(cp) if cp < 0x2580 else unicodedata.name(chr(cp)).title().replace(' And ', ' and ')
                if label != want_l:
                    errors.append(f'{tag}: label {label!r}, UCD says {want_l!r}')
            if kind == 'card' and label != card_en_label(cp):
                errors.append(f'{tag}: label {label!r}, UCD says {card_en_label(cp)!r}')
            if kind == 'domino' and label != domino_label(cp):
                errors.append(f'{tag}: label {label!r}, UCD says {domino_label(cp)!r}')
            if kind == 'mahjong' and label != unicodedata.name(chr(cp)).title().replace(' Of ', ' of '):
                errors.append(f'{tag}: label {label!r} does not match its UCD name')
        elif en_tiles is not None and kind in ('box', 'card'):
            en_label = dict((t[0], t[2]) for t in en_tiles).get(sym)
            if en_label is not None and label == en_label:
                errors.append(f'{tag}: label is the English one ({label!r}); a {lc} page needs its own wording')


def run(read=lambda p: open(os.path.join(ROOT, p, 'index.html'), encoding='utf-8').read(), only=None):
    errors, missing_pages, n_tiles = [], [], 0
    for cname, c in CLUSTERS.items():
        if only and cname != only:
            continue
        en_secs = None
        for lc, path in c['pages'].items():
            try:
                secs = sections_of(read(path))
            except FileNotFoundError:
                missing_pages.append(path)
                continue
            if lc == 'en':
                en_secs = secs
            for sid, (expect, kind) in c['sections'].items():
                where = f'/{path}/#{sid}'
                found = secs.get(sid, [])
                if len(found) != 1:
                    errors.append(f'{where}: section found {len(found)} times, expected once')
                    continue
                tiles = found[0]
                n_tiles += len(tiles)
                en_tiles = en_secs.get(sid, [None])[0] if en_secs and lc != 'en' else None
                check_tiles(where, tiles, expect(lc), kind, lc, en_tiles, errors)
    return errors, missing_pages, n_tiles


def self_test():
    """Each mutation must be caught. A checker that passes its own broken input is not a checker."""
    path = CLUSTERS['braille']['pages']['en']
    good = open(os.path.join(ROOT, path, 'index.html'), encoding='utf-8').read()
    cpath = CLUSTERS['cards']['pages']['de']
    cgood = open(os.path.join(ROOT, cpath, 'index.html'), encoding='utf-8').read()
    # name: (page, mutated text, a substring the error must carry, so a mutation cannot
    # pass by tripping some unrelated check)
    mutations = {
        'swapped cell': (path, good.replace('data-symbol="⠃" aria-label="Copy braille dots 1-2"', 'data-symbol="⠅" aria-label="Copy braille dots 1-2"', 1), 'set/order differs'),
        'dropped tile': (path, re.sub(r'\s*<div class="flag-row">\s*<button[^>]*data-symbol="⣿" aria-label="Copy braille dots[^"]*"[^<]*</button>\s*<span[^<]*</span>\s*</div>', '', good, count=1), "missing ['⣿']"),
        'variation selector': (path, good.replace('data-symbol="⠁" aria-label="Copy braille letter A"', 'data-symbol="⠁&#xFE0F;" aria-label="Copy braille letter A"', 1), 'variation selector'),
        'wrong dot label': (path, good.replace('<span class="flag-label">1-2-5</span>', '<span class="flag-label">1-2-6</span>', 1), 'raises dots 1-2-5'),
        'aria without label': (path, good.replace('aria-label="Copy braille letter B"', 'aria-label="Copy"', 1), 'does not contain the visible label'),
        'English label on a locale page': (cpath, cgood.replace('<span class="flag-label">Pik-Drei</span>', '<span class="flag-label">Three of Spades</span>', 1)
                                           .replace('aria-label="Kopieren Pik-Drei"', 'aria-label="Kopieren Three of Spades"', 1), 'is the English one'),
        'excluded trump': (cpath, cgood.replace('data-symbol="🃟"', 'data-symbol="🃠"', 1).replace('>🃟<', '>🃠<', 1), 'excluded'),
    }
    failed = []
    for name, (mpath, text, expect) in mutations.items():
        orig = good if mpath == path else cgood
        if text == orig:
            failed.append(f'{name}: the mutation did not apply (fixture drifted)')
            continue
        only = 'braille' if mpath == path else 'cards'
        errs, _, _ = run(lambda p, mp=mpath, t=text: t if p == mp else open(os.path.join(ROOT, p, 'index.html'), encoding='utf-8').read(), only)
        hit = [e for e in errs if expect in e]
        if not hit:
            failed.append(f'{name}: NOT caught (errors: {errs[:2]})')
        else:
            print(f'  caught  {name}: {hit[0][:110]}')
    return failed


def main():
    if '--self-test' in sys.argv:
        failed = self_test()
        for f in failed:
            print('  FAIL  ' + f)
        print('self-test:', 'FAILED' if failed else 'every mutation caught')
        return 1 if failed else 0
    errors, missing, n = run()
    print('Unicode reference sets')
    print(f'  pages checked: {sum(len(c["pages"]) for c in CLUSTERS.values()) - len(missing)}  tiles checked: {n}')
    for p in missing:
        print(f'  MISSING PAGE  /{p}/')
    for e in errors:
        print('  ' + e)
    if missing:
        return 2
    if errors:
        print(f'\n{len(errors)} defect(s).')
        return 1
    print('  all sections complete, labelled and localized ✓')
    return 0


if __name__ == '__main__':
    sys.exit(main())
