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
  * arrow-symbols            (en + 19 locales): 40 curated arrows, each drawn by Android
  * number-symbols           (en + 6 locales): Roman numerals past XII and the
                                           keycap emoji (id/font-angka is a
                                           generator page with no tiles)
  * witchy-occult-symbols    (en + 9 locales): every ALCHEMICAL SYMBOL FOR ... character,
                                           U+1F700..U+1F773, labelled from its UCD name
  * keyboard-symbols         (en + 10 locales): the ISO/IEC 9995-7 function-key symbols
  * chess-symbols            (en + 16 locales): draughts and shogi pieces

A tile on these pages is a promise about one exact code point, and a label is a
promise about what that code point is. Neither shows up as broken in a
screenshot: a wrong cell in a 256-cell grid looks like every other cell. So
every expectation here is derived from the code points themselves (dot bits,
UCD names, block arithmetic), never from a second hand-typed list.

Checks, per section and per locale:
  1. the section exists exactly once;
  2. every tile is assigned, free of variation selectors and joiners, and is a
     single scalar (except the braille number tiles: number sign + letter, and
     keycaps, which must be exactly base + U+FE0F + U+20E3);
  3. the set is exactly the expected one, in the expected order, no duplicate;
  4. the label agrees with the code point (dot numbers, UCD names, card ranks);
  5. the aria-label is present and contains the visible label (WCAG 2.5.3);
  6. a locale sibling carries the same code points in the same order, and its
     worded labels are not the English ones (dot numbers and letters are
     language-neutral and must match instead);
  7. the sets Android's system fonts cannot draw (tarot trumps U+1F0E0..U+1F0F5 and the red
     joker U+1F0BF) appear only in their own section, and that section must tell the reader so;
     every arrow in the arrow sections is one Android draws. U+1F774..U+1F77F (the astrological
     signs at the end of the Alchemical block) and the U+1FA00 chess block have no Android glyph and
     may not appear in the alchemy, keyboard or checkers sections at all.

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
# Android's system fonts draw none of these (AOSP font cmaps, 2026-10-24). They may appear ONLY in the
# section whose paragraph tells the reader so, never mixed into a set presented as drawable.
EXCLUDED = set(range(0x1F0E0, 0x1F0F6)) | {0x1F0BF}
EXCLUDED_HOME = 'tarot-trumps-red-joker'
TAROT = [0x1F0E0] + list(range(0x1F0E1, 0x1F0F6)) + [0x1F0BF]
ROMAN_21 = 'I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX XXI'.split()
ARROWS = '⤒⤡⤢⥀⥁⟲⤸⤹⤺⤻⤶⤷' + '⟺⟻⟼⟽⟾⟿⟰⟱⟴' + '⬀⬁⬂⬃⬄⬈⬉⬊⬋⬌⬍⬎⬏⬐⬑⤣⤤⤥⤦'

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


ROMAN_EXT = list(range(0x216C, 0x2180)) + [0x2180, 0x2181, 0x2182, 0x2187, 0x2188]
KEYCAPS = [(d + '\ufe0f\u20e3', d) for d in '0123456789'] + [('\U0001F51F', '10'), ('#\ufe0f\u20e3', '#'), ('*\ufe0f\u20e3', '*')]


def roman_en_label(cp):
    n = unicodedata.name(chr(cp))  # ROMAN NUMERAL FIFTY / SMALL ROMAN NUMERAL ONE / ROMAN NUMERAL ONE THOUSAND C D
    letters = {0x216C: 'L', 0x216D: 'C', 0x216E: 'D', 0x216F: 'M'}
    if cp in letters:
        return 'Roman Numeral ' + letters[cp]
    if n.startswith('SMALL ROMAN NUMERAL'):
        return 'Small Roman Numeral ' + 'i ii iii iv v vi vii viii ix x xi xii l c d m'.split()[cp - 0x2170]
    value = {0x2180: '1000', 0x2181: '5000', 0x2182: '10000', 0x2187: '50000', 0x2188: '100000'}[cp]
    return 'Roman Numeral ' + value + (', old form' if cp == 0x2180 else '')


def cps(seq):
    return [(chr(cp), None) for cp in seq]


ALCHEMY_OVERRIDE = {0x1F70E: 'Philosophers’ Sulfur', 0x1F739: 'Sal Ammoniac', 0x1F741: 'Quicklime'}


def alchemy_en_label(cp):
    """UCD name without the ALCHEMICAL SYMBOL FOR prefix, title case, -2/-3.. as II/III.."""
    if cp in ALCHEMY_OVERRIDE:
        return ALCHEMY_OVERRIDE[cp]
    n = unicodedata.name(chr(cp)).replace('ALCHEMICAL SYMBOL FOR ', '')
    m = re.match(r'(.*)-(\d)$', n)
    base, num = (m.group(1), int(m.group(2))) if m else (n, 1)
    return base.title().replace(' Of ', ' of ') + (' ' + ['', '', 'II', 'III', 'IV', 'V'][num] if num > 1 else '')


# Every character the UCD names "ALCHEMICAL SYMBOL FOR ...": U+1F700..U+1F773. The 12 after it in the
# block (LOT OF FORTUNE .. ORCUS) are astrological, and Android draws none of them.
ALCHEMY_ALL = [cp for cp in range(0x1F700, 0x1F780) if unicodedata.name(chr(cp), '').startswith('ALCHEMICAL SYMBOL FOR ')]
assert ALCHEMY_ALL == list(range(0x1F700, 0x1F774))
NO_ANDROID_GLYPH = set(range(0x1F774, 0x1F780)) | set(range(0x1FA00, 0x1FA70))
ISO_KEYS = [0x2324, 0x2327, 0x2380, 0x2381, 0x2382, 0x2383, 0x2384, 0x2386, 0x2387, 0x2389, 0x238A, 0x238C,
            0x2396, 0x2397, 0x2398, 0x239A]
# The key each glyph stands for, from the UCD (NamesList aliases "= enter key", "= clear key", "= pause",
# "= interrupt, break"; the rest are in the character names themselves). The EN label must name it.
ISO_KEY_WORD = {0x2324: 'Enter', 0x2327: 'Clear', 0x2380: 'Insert', 0x2381: 'Continuous Underline',
                0x2382: 'Discontinuous Underline', 0x2383: 'Emphasis', 0x2384: 'Compos', 0x2386: 'Enter',
                0x2387: 'Alt', 0x2389: 'Pause', 0x238A: 'Break', 0x238C: 'Undo', 0x2396: 'Decimal Separator',
                0x2397: 'Previous Page', 0x2398: 'Next Page', 0x239A: 'Clear Screen'}
CHECKERS_SHOGI = [0x26C0, 0x26C1, 0x26C2, 0x26C3, 0x2616, 0x2617, 0x26C9, 0x26CA]


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
            'tarot-trumps-red-joker': (lambda lc: cps(TAROT), 'tarot'),
        },
    },
    'arrows': {
        'pages': {'en': 'library/arrow-symbols', 'ar': 'ar/library/arrow-symbols', 'de': 'de/library/pfeil-symbole',
                  'es': 'es/simbolos-de-flechas', 'fr': 'fr/library/symboles-fleches', 'id': 'id/library/simbol-panah',
                  'ja': 'ja/library/arrow-symbols', 'ko': 'ko/library/hwasalpyo-giho', 'pt': 'pt/library/setas',
                  'vi': 'vi/ki-tu-mui-ten', 'nl': 'nl/library/pijl-symbolen', 'tr': 'tr/library/ok-isaretleri',
                  'sv': 'sv/library/pil-symboler', 'da': 'da/library/pil-symboler', 'zh-TW': 'zh-tw/library/jiantou-fuhao',
                  'it': 'it/library/simboli-freccia', 'pl': 'pl/library/symbole-strzalek', 'ru': 'ru/library/strelki',
                  'th': 'th/library/arrow-symbols', 'no': 'no/library/pilsymboler'},
        'sections': {
            'arrows-upload-resize-circle': (lambda lc: cps(map(ord, ARROWS[:12])), 'arrow'),
            'arrows-long-extended': (lambda lc: cps(map(ord, ARROWS[12:21])), 'arrow'),
            'arrows-diagonal-bent-hooked': (lambda lc: cps(map(ord, ARROWS[21:])), 'arrow'),
        },
    },
    'numbers': {
        'pages': {'en': 'library/number-symbols', 'ar': 'ar/library/number-symbols', 'es': 'es/library/simbolos-de-numero',
                  'ko': 'ko/library/sutja-giho', 'ja': 'ja/library/suuji-kigou', 'vi': 'vi/library/ky-tu-so', 'de': 'de/library/zahlen-symbole'},
        'sections': {
            'roman-numerals-extended': (lambda lc: cps(ROMAN_EXT), 'roman'),
            'keycap-number-emoji': (lambda lc: KEYCAPS, 'keycap'),
        },
    },
    'alchemy': {
        'pages': {'en': 'library/witchy-occult-symbols', 'es': 'es/library/simbolos-witchy-occult',
                  'fr': 'fr/library/symboles-witchy-occult', 'id': 'id/library/simbol-witchy-occult',
                  'it': 'it/library/simboli-witchy-occult', 'pl': 'pl/library/symbole-witchy-occult',
                  'pt': 'pt/library/simbolos-witchy-occult', 'tr': 'tr/library/witchy-occult-sembolleri',
                  'ru': 'ru/library/magicheskie-simvoly', 'de': 'de/library/okkulte-symbole'},
        'sections': {
            'alchemical-substances': (lambda lc: cps(range(0x1F740, 0x1F75C)), 'alchemy'),
            'alchemical-processes-apparatus': (lambda lc: cps(range(0x1F75C, 0x1F76E)), 'alchemy'),
            'alchemical-time-measures': (lambda lc: cps(range(0x1F76E, 0x1F774)), 'alchemy'),
        },
    },
    # The first 64 alchemical tiles predate the sections above and carry a different section id on
    # two locales; their labels drifted off their code points once (U+1F710 "Salt", ...), so the EN
    # labels are held to the UCD here.
    'alchemy-first-64': {
        'pages': {'en': 'library/witchy-occult-symbols'},
        'sections': {'alchemical': (lambda lc: cps(range(0x1F700, 0x1F740)), 'alchemy')},
    },
    'keyboard': {
        'pages': {'en': 'library/keyboard-symbols', 'es': 'es/library/simbolos-de-teclado', 'tr': 'tr/library/klavye-sembolleri',
                  'it': 'it/library/simboli-tastiera', 'fr': 'fr/library/symboles-clavier', 'ru': 'ru/library/simvoly-na-klaviature',
                  'de': 'de/library/tastatur-symbole', 'ja': 'ja/library/keyboard-kigou', 'ar': 'ar/library/rumuz-alkibord',
                  'ko': 'ko/library/keyboard-giho', 'sv': 'sv/library/tangentbord-symboler'},
        'sections': {'iso-function-key-symbols': (lambda lc: cps(ISO_KEYS), 'isokey')},
    },
    'checkers': {
        'pages': {'en': 'library/chess-symbols', 'de': 'de/library/schach-symbole', 'pt': 'pt/library/simbolos-de-xadrez',
                  'ar': 'ar/library/chess-symbols', 'es': 'es/library/simbolos-de-ajedrez', 'fr': 'fr/library/symboles-echecs',
                  'id': 'id/library/simbol-catur', 'it': 'it/library/simboli-scacchi', 'ja': 'ja/library/chess-symbols',
                  'ko': 'ko/library/chess-gihou', 'nl': 'nl/library/schaaksymbolen', 'pl': 'pl/library/symbole-szachowe',
                  'ru': 'ru/library/shakhmatnye-simvoly', 'th': 'th/library/chess-symbols', 'tr': 'tr/library/satranc-sembolleri',
                  'vi': 'vi/library/ky-hieu-co-vua', 'zh-TW': 'zh-tw/library/guojixiangqi-fuhao'},
        'sections': {'checkers-shogi-pieces': (lambda lc: cps(CHECKERS_SHOGI), 'ucdname')},
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

# Siblings deliberately not carrying the sections yet, with the reason. Empty since
# 2026-10-24: the owner released ko/library/nemo-giho and sv/library/kortfarg-symboler
# from their forward-prediction windows, and both now carry the sections.
HELD = {}

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

def check_tiles(where, tiles, expected, kind, lc, en_tiles, errors, page_text=None):
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
        if kind == 'keycap':
            if not (len(cpl) == 3 and cpl[1:] == [0xFE0F, 0x20E3] and sym[0] in '0123456789#*') and sym != '\U0001F51F':
                errors.append(f'{tag}: not a fully-qualified keycap (base + U+FE0F + U+20E3)')
        elif any(c in VS_OR_JOINER for c in cpl):
            errors.append(f'{tag}: carries a variation selector or joiner')
        for c in cpl:
            try:
                unicodedata.name(chr(c))
            except ValueError:
                errors.append(f'{tag}: U+{c:04X} is unassigned or unnamed')
            if c in EXCLUDED and not where.endswith('#' + EXCLUDED_HOME):
                errors.append(f'{tag}: U+{c:04X} is excluded (no Android system glyph)')
        if len(cpl) != 1 and kind != 'keycap' and not (kind == 'braille-alphabet' and len(cpl) == 2 and sym[0] == NUMBER_SIGN):
            errors.append(f'{tag}: {len(cpl)} code points in a single-character tile')
        if not label.strip() or not aria.strip():
            errors.append(f'{tag}: empty label or aria-label')
        elif label.casefold() not in aria.casefold():
            errors.append(f'{tag}: aria-label {aria!r} does not contain the visible label {label!r}')
        exp_label = expected[i][1] if i < len(expected) else None
        if kind == 'dots' and exp_label and label != exp_label:
            errors.append(f'{tag}: label {label!r} but the cell raises dots {exp_label}')
        if kind == 'keycap' and exp_label and label != exp_label:
            errors.append(f'{tag}: label {label!r} but the keycap is {exp_label}')
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
            if kind == 'roman' and label != roman_en_label(cp):
                errors.append(f'{tag}: label {label!r}, expected {roman_en_label(cp)!r}')
            if kind == 'mahjong' and label != unicodedata.name(chr(cp)).title().replace(' Of ', ' of '):
                errors.append(f'{tag}: label {label!r} does not match its UCD name')
        if kind in ('alchemy', 'isokey', 'ucdname') and cpl[0] in NO_ANDROID_GLYPH:
            errors.append(f'{tag}: U+{cpl[0]:04X} has no Android system glyph')
        if lc == 'en' and kind == 'alchemy' and label != alchemy_en_label(cpl[0]):
            errors.append(f'{tag}: label {label!r}, UCD says {alchemy_en_label(cpl[0])!r}')
        if lc == 'en' and kind == 'isokey' and ISO_KEY_WORD.get(cpl[0], '\0') not in label:
            errors.append(f'{tag}: label {label!r} does not name the {ISO_KEY_WORD.get(cpl[0])} key')
        if lc == 'en' and kind == 'ucdname' and label != unicodedata.name(chr(cpl[0])).title():
            errors.append(f'{tag}: label {label!r}, UCD says {unicodedata.name(chr(cpl[0])).title()!r}')
        if kind == 'tarot':
            cp = cpl[0]
            if 0x1F0E1 <= cp <= 0x1F0F5 and label != ROMAN_21[cp - 0x1F0E1]:
                errors.append(f'{tag}: label {label!r}, expected trump {ROMAN_21[cp - 0x1F0E1]}')
            if cp == 0x1F0E0 and not label.endswith('(0)') and not label.endswith('（0）'):
                errors.append(f'{tag}: the Fool is numbered 0; label {label!r}')
        if kind in ('tarot',) and lc == 'en' and cpl[0] in (0x1F0E0, 0x1F0BF) and label not in ('Fool (0)', 'Red Joker'):
            errors.append(f'{tag}: label {label!r}')
        if kind == 'arrow' and lc == 'en' and not label:
            errors.append(f'{tag}: empty label')
        if en_tiles is not None and kind == 'tarot' and cpl[0] in (0x1F0E0, 0x1F0BF):
            en_label = dict((t[0], t[2]) for t in en_tiles).get(sym)
            if en_label is not None and label == en_label:
                errors.append(f'{tag}: label is the English one ({label!r}); a {lc} page needs its own wording')
        if en_tiles is not None and kind in ('box', 'card', 'roman', 'arrow', 'alchemy', 'isokey', 'ucdname'):
            en_label = dict((t[0], t[2]) for t in en_tiles).get(sym)
            if en_label is not None and label == en_label:
                errors.append(f'{tag}: label is the English one ({label!r}); a {lc} page needs its own wording')


def run(read=lambda p: open(os.path.join(ROOT, p, 'index.html'), encoding='utf-8').read(), only=None):
    errors, missing_pages, n_tiles = [], [], 0
    android_note_missing = []
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
                if sid == EXCLUDED_HOME and not any(w in read(path) for w in ('Android', '안드로이드')):
                    errors.append(f'{where}: the section carrying glyphs Android cannot draw must say so')
                n_tiles += len(tiles)
                en_tiles = en_secs.get(sid, [None])[0] if en_secs and lc != 'en' else None
                check_tiles(where, tiles, expect(lc), kind, lc, en_tiles, errors, read(path))
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
    npath = CLUSTERS['numbers']['pages']['ja']
    ngood = open(os.path.join(ROOT, npath, 'index.html'), encoding='utf-8').read()
    mutations['keycap without U+FE0F'] = (npath, ngood.replace('data-symbol="3&#xFE0F;&#x20E3;"', 'data-symbol="3&#x20E3;"', 1)
                                          .replace('data-symbol="3️⃣"', 'data-symbol="3⃣"', 1), 'fully-qualified keycap')
    mutations['Android note removed'] = (cpath, cgood.replace('Android', 'XXXX'), 'must say so')
    mutations['trump numeral wrong'] = (cpath, cgood.replace('<span class="flag-label">XIV</span>', '<span class="flag-label">XV</span>', 1), 'expected trump XIV')
    apath = CLUSTERS['alchemy']['pages']['en']
    agood = open(os.path.join(ROOT, apath, 'index.html'), encoding='utf-8').read()
    kpath = CLUSTERS['checkers']['pages']['nl']
    kgood = open(os.path.join(ROOT, kpath, 'index.html'), encoding='utf-8').read()
    mutations['alchemy label drift'] = (apath, agood.replace('<span class="flag-label">Borax II</span>', '<span class="flag-label">Borax III</span>', 1)
                                        .replace('aria-label="Copy Borax II"', 'aria-label="Copy Borax III"', 1), "UCD says 'Borax II'")
    mutations['glyph Android cannot draw'] = (apath, agood.replace('data-symbol="🝳"', 'data-symbol="🝴"', 1).replace('>🝳<', '>🝴<', 1), 'no Android system glyph')
    mutations['English checkers label on a locale page'] = (kpath, kgood.replace('<span class="flag-label">Witte dam</span>', '<span class="flag-label">White Draughts King</span>', 1)
                                                            .replace('aria-label="Kopiëren Witte dam"', 'aria-label="Kopiëren White Draughts King"', 1), 'is the English one')
    failed = []
    fixtures = {path: (good, 'braille'), cpath: (cgood, 'cards'), npath: (ngood, 'numbers'), apath: (agood, 'alchemy'), kpath: (kgood, 'checkers')}
    for name, (mpath, text, expect) in mutations.items():
        orig = fixtures[mpath][0]
        if text == orig:
            failed.append(f'{name}: the mutation did not apply (fixture drifted)')
            continue
        only = fixtures[mpath][1]
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
    for p, why in HELD.items():
        print(f'  held   /{p}/  ({why})')
    if missing:
        return 2
    if errors:
        print(f'\n{len(errors)} defect(s).')
        return 1
    print('  all sections complete, labelled and localized ✓')
    return 0


if __name__ == '__main__':
    sys.exit(main())
