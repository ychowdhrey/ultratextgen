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
  * people-profession-emojis (en, es): every person-role emoji as person, man and
                                           woman, every couple and every family sequence
  * body-language-emojis     (en, es): frowning, pouting and deaf person, and the man
                                           and woman forms of every person gesture
  * hand-symbols             (en + 5 locales): the pushing hands and the selfie hand
  * emoji runs added into existing sections (2026-10-24): face (+11 locales),
    food (+4), travel (+1), objects (+2), road signs (+1) and the Sark flag
    on emoji-flags (+16); see EMOJI_RUNS
  * greek-letter-symbols      (en + 19 locales): mathematical bold, italic, bold
                                           italic, sans-serif bold and sans-serif
                                           bold italic Greek, archaic letters,
                                           lunate sigma forms and accented vowels
                                           (a code point a page already shows in an
                                           older section is not repeated)
  * japanese-symbols         (en + 9 locales): the hiragana and katakana gojūon
                                           charts, dakuten/handakuten and small kana
  * unit-measurement-symbols (en + 3 locales): 44 CJK squared units
  * music-symbols            (en + 16 locales): the 79 Musical Symbols (U+1D100..U+1D1FF)
                                           the original sections left out, in four
                                           sections; the precomposed notes
                                           U+1D15E..U+1D164 must stay one scalar each
  * witchy-occult-symbols    (en + 9 locales): every ALCHEMICAL SYMBOL FOR ... character,
                                           U+1F700..U+1F773, labelled from its UCD name
  * keyboard-symbols         (en + 10 locales): the ISO/IEC 9995-7 function-key symbols
  * chess-symbols            (en + 16 locales): draughts and shogi pieces

Emoji tiles (kind 'emoji') are checked against data/emoji_sequences.json (generated from
emoji-test.txt): every tile must be a fully-qualified sequence with no skin-tone modifier.

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
import json

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


# Musical Symbols: what the original sections already carried, and the Unicode 18.0 additions no
# device has a font for yet. Everything else in the block's job subset is laid out in four sections.
MUSIC_SHOWN = set(map(ord, '\U0001D100\U0001D101\U0001D102\U0001D103\U0001D106\U0001D107\U0001D110\U0001D111\U0001D11E'
                          '\U0001D121\U0001D122\U0001D12A\U0001D12B\U0001D13B\U0001D13C\U0001D13E\U0001D13F\U0001D18F\U0001D191'))
MUSIC_U18 = {0x1D1ED, 0x1D1EE, 0x1D1F3, 0x1D1F4, 0x1D1F5, 0x1D1F6, 0x1D1FF}
MUSIC_NOTE_HOME = 'barlines-repeats-segno-coda'
# The existing rests section once labelled U+1D13B (WHOLE REST) as the half rest and U+1D13C (HALF REST) as
# the quarter rest, on all 17 pages. Repaired 2026-10-24; these are the labels, per page language, so they
# cannot drift back. Keys are the cluster's locale keys.
MUSIC_RESTS = {
    'en': ('Whole Rest', 'Half Rest'), 'ar': ('صمت كامل', 'صمت نصفي'), 'es': ('Silencio de redonda', 'Silencio de blanca'),
    'id': ('Istirahat Penuh', 'Istirahat Setengah'), 'ko': ('온쉼표', '2분쉼표(반쉼표)'), 'pt': ('Pausa de Semibreve', 'Pausa de Mínima'),
    'de': ('Ganze Pause', 'Halbe Pause'), 'fr': ('Pause', 'Demi-pause'), 'it': ('Pausa di semibreve', 'Pausa di minima'),
    'ja': ('全休符', '二分休符'), 'nl': ('Hele rust', 'Halve rust'), 'pl': ('Pauza całonutowa', 'Pauza półnutowa'),
    'ru': ('Целая пауза', 'Половинная пауза'), 'th': ('ตัวหยุดตัวกลม', 'ตัวหยุดตัวขาว'), 'tr': ('Birlik sus', 'İkilik sus'),
    'vi': ('Lặng tròn', 'Lặng trắng'), 'zh-TW': ('全休止符', '二分休止符'),
}


def music_sections():
    secs = {
        MUSIC_NOTE_HOME: [0x1D104, 0x1D105] + list(range(0x1D108, 0x1D110)),
        'clefs-staff-time-signatures': list(range(0x1D116, 0x1D11C)) + [0x1D11F, 0x1D120, 0x1D123, 0x1D124, 0x1D125, 0x1D126,
                                        0x1D134, 0x1D135, 0x1D12C, 0x1D12D, 0x1D12E, 0x1D12F, 0x1D133],
        'notes-grace-notes-rests': list(range(0x1D15C, 0x1D165)) + [0x1D194, 0x1D195, 0x1D129, 0x1D13A, 0x1D13D, 0x1D140, 0x1D141,
                                    0x1D142] + list(range(0x1D1C1, 0x1D1C7)),
        'noteheads-mezzo-pedal': list(range(0x1D143, 0x1D15A)) + [0x1D190, 0x1D1AE, 0x1D1AF, 0x1D1B0],
    }
    allcp = [cp for v in secs.values() for cp in v]
    assert len(allcp) == len(set(allcp)) == 79 and not set(allcp) & (MUSIC_SHOWN | MUSIC_U18)
    assert all(unicodedata.name(chr(cp)).startswith('MUSICAL SYMBOL ') for cp in allcp)
    return secs


def cps(seq):
    return [(chr(cp), None) for cp in seq]


# ---------------------------------------------------------------- emoji sequences
# Derived from data/emoji_sequences.json (generated from emoji-test.txt) plus code-point rules, never a
# hand-typed list of sequences.
def _fq():
    d = json.load(open(os.path.join(ROOT, 'data', 'emoji_sequences.json'), encoding='utf-8'))
    return [''.join(chr(int(h, 16)) for h in x.split()) for x in d['fully_qualified']]


FQ_LIST = _fq()
FQ = set(FQ_LIST)
ZWJ, VS16, MALE, FEMALE = '\u200d', '\ufe0f', '\u2642\ufe0f', '\u2640\ufe0f'
TONES = {chr(c) for c in range(0x1F3FB, 0x1F400)}
PERSON, MAN, WOMAN = '\U0001F9D1', '\U0001F468', '\U0001F469'
BOY, GIRL, CHILD = '\U0001F466', '\U0001F467', '\U0001F9D2'


def q(base):
    """The fully-qualified form of a base: as is, or with U+FE0F."""
    for c in (base, base + VS16):
        if c in FQ:
            return c
    raise KeyError(f'no fully-qualified form of {base!r}')


def by_role(obj):
    """person, man, woman + ZWJ + object (the profession pattern)."""
    return [q(p + ZWJ + obj) if (p + ZWJ + obj) in FQ else q(p + ZWJ + obj.rstrip(VS16)) for p in (PERSON, MAN, WOMAN)]


def by_gender(base):
    """base, base + ZWJ + male sign, base + ZWJ + female sign."""
    b = q(base)
    return [b, b + ZWJ + MALE, b + ZWJ + FEMALE]


def people_only(seq, members):
    parts = seq.split(ZWJ)
    return len(parts) >= 2 and all(p in members for p in parts)


def families():
    adults = [s for s in FQ_LIST if people_only(s, {PERSON, CHILD}) and CHILD in s and not (TONES & set(s))]
    parents = [s for s in FQ_LIST if people_only(s, {MAN, WOMAN, BOY, GIRL}) and (BOY in s or GIRL in s)]
    shown = MAN + ZWJ + WOMAN + ZWJ + GIRL + ZWJ + BOY  # carried by the page's older children section
    return ['\U0001F46A'] + adults + [s for s in parents if s != shown]


def couples():
    toneless = [s for s in FQ_LIST if not (TONES & set(s))]
    kiss = [s for s in toneless if '\U0001F48B' in s and ZWJ in s]
    heart = [s for s in toneless if s.split(ZWJ)[0] in (MAN, WOMAN) and '\u2764\ufe0f' in s and '\U0001F48B' not in s]
    return [PERSON + ZWJ + '\U0001F91D' + ZWJ + PERSON, '\U0001F46D', '\U0001F46B', '\U0001F46C', '\U0001F48F'] + kiss + ['\U0001F491'] + heart


def emo(seqs):
    return [(s, None) for s in seqs]


GESTURE_PERSONS = '\U0001F647\U0001F481\U0001F926\U0001F937\U0001F64B\U0001F646\U0001F645'  # bowing, tipping hand, facepalm, shrug, raising hand, OK, NO
# Tiles a page must carry somewhere (added inside existing sections, whose other tiles are curated).
INCLUDES = {
    'people': lambda: [x for o in ('\U0001F393', '\U0001F4BC', '\U0001F3A8', '\U0001F3A4', '\U0001F52C', '\U0001F527', '\U0001F37C')
                       for x in by_role(o)],
    'gestures': lambda: [x for b in GESTURE_PERSONS for x in by_gender(b)] + ['\U0001FAC6'],
    'hands': lambda: ['\U0001FAF7', '\U0001FAF8', '\U0001F933'],
}


# ---------------------------------------------------------------- greek-letter-symbols (mathematical styled Greek, archaic, lunate, accented)
# Every set is derived from UCD names. A code point the page already carries as a tile in one of its own
# older sections is left out of the new section (no duplicate tiles), so the expected set is page-aware.
GREEK_NAMES = [unicodedata.name(chr(c)).split()[-1] for c in range(0x3B1, 0x3CA) if c != 0x3C2]
GREEK_VARIANT_KEYS = ['CAPITAL THETA SYMBOL', 'NABLA', 'PARTIAL DIFFERENTIAL', 'EPSILON SYMBOL', 'THETA SYMBOL',
                      'KAPPA SYMBOL', 'PHI SYMBOL', 'RHO SYMBOL', 'PI SYMBOL']
GREEK_STYLES = {'greek-math-bold': ('BOLD', 0x1D6A8), 'greek-math-italic': ('ITALIC', 0x1D6E2),
                'greek-math-bold-italic': ('BOLD ITALIC', 0x1D71C), 'greek-math-sans-bold': ('SANS-SERIF BOLD', 0x1D756),
                'greek-math-sans-bold-italic': ('SANS-SERIF BOLD ITALIC', 0x1D790)}
GREEK_NEW_IDS = list(GREEK_STYLES) + ['greek-archaic-letters', 'greek-lunate-sigma', 'greek-accented-vowels']
_GC = {unicodedata.name(chr(c), ''): c for c in range(0x370, 0x400)}


def greek_styled(sid):
    word, base = GREEK_STYLES[sid]
    pre = f'MATHEMATICAL {word} '
    block = {unicodedata.name(chr(c))[len(pre):]: c for c in range(base, base + 58)}
    out = [block['CAPITAL ' + g] for g in GREEK_NAMES]
    for g in GREEK_NAMES:
        out += ([block['SMALL FINAL SIGMA']] if g == 'SIGMA' else []) + [block['SMALL ' + g]]
    out += [block[k] for k in GREEK_VARIANT_KEYS]
    if word == 'BOLD':
        out += [ord(unicodedata.lookup(pre + 'CAPITAL DIGAMMA')), ord(unicodedata.lookup(pre + 'SMALL DIGAMMA'))]
    return out


def greek_archaic():
    out = []
    for k in ['DIGAMMA', 'PAMPHYLIAN DIGAMMA', 'STIGMA', 'HETA', 'SAN', 'ARCHAIC KOPPA', 'KOPPA', 'SAMPI', 'ARCHAIC SAMPI', 'SHO']:
        out += [_GC.get('GREEK CAPITAL LETTER ' + k) or _GC['GREEK LETTER ' + k], _GC['GREEK SMALL LETTER ' + k]]
    return out


def greek_lunate():
    out = []
    for k in ['LUNATE SIGMA SYMBOL', 'REVERSED LUNATE SIGMA SYMBOL', 'DOTTED LUNATE SIGMA SYMBOL', 'REVERSED DOTTED LUNATE SIGMA SYMBOL']:
        out += [_GC['GREEK CAPITAL ' + k], _GC.get('GREEK SMALL ' + k) or _GC['GREEK ' + k]]
    return out + [_GC['GREEK REVERSED LUNATE EPSILON SYMBOL']]


def greek_accented():
    v = ['ALPHA', 'EPSILON', 'ETA', 'IOTA', 'OMICRON', 'UPSILON', 'OMEGA']
    return ([_GC[f'GREEK CAPITAL LETTER {x} WITH TONOS'] for x in v] + [_GC[f'GREEK SMALL LETTER {x} WITH TONOS'] for x in v]
            + [_GC[f'GREEK CAPITAL LETTER {x} WITH DIALYTIKA'] for x in ('IOTA', 'UPSILON')]
            + [_GC[f'GREEK SMALL LETTER {x} WITH DIALYTIKA'] for x in ('IOTA', 'UPSILON')]
            + [_GC[f'GREEK SMALL LETTER {x} WITH DIALYTIKA AND TONOS'] for x in ('IOTA', 'UPSILON')])


def greek_older_tiles(page_text):
    """Tiles the page carries outside the new sections."""
    for sid in GREEK_NEW_IDS:
        page_text = re.sub(rf'<section class="mood-explainers" id="{sid}">.*?</section>', '', page_text, flags=re.S)
    return {html.unescape(x) for x in re.findall(r'data-symbol="([^"]*)"', page_text)}


def greek_expect(seq_fn):
    def expect(lc, page_text):
        have = greek_older_tiles(page_text)
        return [(chr(cp), None) for cp in seq_fn() if chr(cp) not in have]
    return expect


def greek_en_label_problem(cp, label):
    """The EN label must name what the UCD name says: the letter, its case, and its accent."""
    name = unicodedata.name(chr(cp))
    lab = label.casefold()
    words = name.replace('LAMDA', 'LAMBDA').split()
    if 'CAPITAL' in words and 'capital' not in lab:
        return 'UCD says CAPITAL'
    if 'SMALL' in words and 'small' not in lab:
        return 'UCD says SMALL'
    for w in ('TONOS', 'DIALYTIKA', 'NABLA', 'PARTIAL', 'FINAL', 'REVERSED', 'DOTTED', 'ARCHAIC', 'PAMPHYLIAN'):
        if w in words and w.casefold() not in lab:
            return f'UCD says {w}'
    tail = [w for w in words if w not in ('MATHEMATICAL', 'BOLD', 'ITALIC', 'SANS-SERIF', 'GREEK', 'CAPITAL', 'SMALL', 'LETTER',
                                          'SYMBOL', 'WITH', 'AND', 'TONOS', 'DIALYTIKA', 'FINAL', 'REVERSED', 'DOTTED', 'LUNATE',
                                          'ARCHAIC', 'PAMPHYLIAN', 'DIFFERENTIAL')]
    if tail and tail[-1].casefold() not in lab:
        return f'UCD letter is {tail[-1]}'
    return None


KANA_VOWELS = 'AIUEO'
KANA_BASIC = list(KANA_VOWELS) + [c + v for c in 'KSTNHM' for v in KANA_VOWELS] + ['YA', 'YU', 'YO'] + \
    ['R' + v for v in KANA_VOWELS] + ['WA', 'WO', 'N']
KANA_VOICED = [c + v for c in 'GZDBP' for v in KANA_VOWELS]
KANA_SMALL = ['A', 'I', 'U', 'E', 'O', 'TU', 'YA', 'YU', 'YO', 'WA']
# UCD kana names are Nihon-shiki; the tiles carry Hepburn (ぢ/づ also show the keys typed for them).
KANA_HEPBURN = {'SI': 'shi', 'TI': 'chi', 'TU': 'tsu', 'HU': 'fu', 'ZI': 'ji', 'DI': 'ji (di)', 'DU': 'zu (du)'}


def kana_chart(script):
    return [(unicodedata.lookup(f'{script} LETTER {s}'), KANA_HEPBURN.get(s, s.lower())) for s in KANA_BASIC]


def kana_extras(script):
    """Voiced forms (plus ヴ in katakana), then small kana. A small kana's expected label is '~romaji':
    the label must carry the romaji as a word, worded in the page's language."""
    out = [(unicodedata.lookup(f'{script} LETTER {s}'), KANA_HEPBURN.get(s, s.lower())) for s in KANA_VOICED]
    if script == 'KATAKANA':
        out.append(('\u30F4', 'vu'))
    out += [(unicodedata.lookup(f'{script} LETTER SMALL {s}'), '~' + KANA_HEPBURN.get(s, s.lower())) for s in KANA_SMALL]
    return out


# CJK Compatibility squares chosen as units in everyday Japanese/Korean/Chinese text, minus the nine
# the pages already carried (㎏㎜㎝㎞㎡㎥㎒㎓㏄). Each tile's label must carry the unit as its decomposition spells it.
CJK_UNITS = [0x339F, 0x33A0, 0x33A2, 0x33CA, 0x33A3, 0x33A4, 0x33A6, 0x339A, 0x339B, 0x338D, 0x338E,
             0x3395, 0x3396, 0x3397, 0x3398, 0x3385, 0x3386, 0x3387, 0x3390, 0x3391, 0x3394,
             0x3383, 0x33B7, 0x33B8, 0x33C0, 0x33C1, 0x33BD, 0x33BE, 0x33BF, 0x3388, 0x3389,
             0x33A9, 0x3371, 0x33AA, 0x33AB, 0x33A7, 0x33A8, 0x33B0, 0x33B1, 0x33B2, 0x33B3, 0x33C8, 0x33D6, 0x33D7]


def unit_abbr(cp):
    d = unicodedata.decomposition(chr(cp))
    raw = ''.join(chr(int(h, 16)) for h in d.split()[1:]) if d.startswith('<square>') else None
    if raw is None:
        return None
    return 'pH' if raw == 'PH' else raw.replace('\u2113', 'l').replace('\u2215', '/')


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
    'people': {
        'pages': {'en': 'library/people-profession-emojis', 'es': 'es/library/emojis-de-profesiones'},
        'sections': {
            'farm-factory-emoji': (lambda lc: emo(by_role('\U0001F33E') + by_role('\U0001F3ED')), 'emoji'),
            'pilot-astronaut-emoji': (lambda lc: emo(by_role('\u2708\ufe0f') + by_role('\U0001F680')), 'emoji'),
            'detective-guard-emoji': (lambda lc: emo(by_gender('\U0001F575') + by_gender('\U0001F482') + ['\U0001F977']), 'emoji'),
            'royalty-wedding-emoji': (lambda lc: emo(['\U0001FAC5', '\U0001F934', '\U0001F478'] + by_gender('\U0001F935') + by_gender('\U0001F470')), 'emoji'),
            'head-covering-emoji': (lambda lc: emo(by_gender('\U0001F473') + ['\U0001F472', '\U0001F9D5']), 'emoji'),
            'couples-emoji': (lambda lc: emo(couples()), 'emoji'),
            'family-emoji': (lambda lc: emo(families()), 'emoji'),
        },
    },
    'gestures': {
        'pages': {'en': 'library/body-language-emojis', 'es': 'es/library/emojis-lenguaje-corporal'},
        'sections': {
            'frowning-pouting-deaf': (lambda lc: emo(by_gender('\U0001F64D') + by_gender('\U0001F64E') + by_gender('\U0001F9CF')), 'emoji'),
        },
    },
    'hands': {
        'pages': {'en': 'library/hand-symbols', 'de': 'de/library/hand-symbole', 'ru': 'ru/library/simvoly-ruk',
                  'es': 'es/library/simbolos-de-manos', 'ja': 'ja/library/te-emoji', 'ko': 'ko/library/son-giho'},
        'sections': {},
    },
    'kana': {
        'pages': {'en': 'library/japanese-symbols', 'es': 'es/library/simbolos-japoneses', 'id': 'id/library/simbol-jepang',
                  'ja': 'ja/library/japanese-symbols', 'ko': 'ko/library/ilboneo-giho', 'pt': 'pt/library/simbolos-japoneses',
                  'ar': 'ar/library/japanese-symbols', 'tr': 'tr/library/japon-alfabesi', 'de': 'de/library/japanische-symbole',
                  'sv': 'sv/library/japanska-tecken'},
        'sections': {
            'hiragana-gojuon-chart': (lambda lc: kana_chart('HIRAGANA'), 'kana'),
            'hiragana-dakuten-small-kana': (lambda lc: kana_extras('HIRAGANA'), 'kana'),
            'katakana-gojuon-chart': (lambda lc: kana_chart('KATAKANA'), 'kana'),
            'katakana-dakuten-small-kana': (lambda lc: kana_extras('KATAKANA'), 'kana'),
        },
    },
    'units': {
        'pages': {'en': 'library/unit-measurement-symbols', 'ko': 'ko/library/danwi-giho', 'tr': 'tr/library/derece-isareti',
                  'es': 'es/library/simbolos-de-unidades'},
        'sections': {'cjk-squared-units': (lambda lc: [(chr(cp), unit_abbr(cp)) for cp in CJK_UNITS], 'unit')},
    },
    'music': {
        'pages': {'en': 'library/music-symbols', 'ar': 'ar/library/music-symbols', 'es': 'es/library/simbolos-de-musica',
                  'id': 'id/library/simbol-musik', 'ko': 'ko/library/eumak-giho', 'pt': 'pt/library/simbolos-musicais',
                  'de': 'de/library/musik-symbole', 'fr': 'fr/library/symboles-musicaux', 'it': 'it/library/simboli-musicali',
                  'ja': 'ja/library/music-symbols', 'nl': 'nl/library/muzieksymbolen', 'pl': 'pl/library/symbole-muzyczne',
                  'ru': 'ru/library/muzykalnye-simvoly', 'th': 'th/library/music-symbols', 'tr': 'tr/library/muzik-sembolleri',
                  'vi': 'vi/library/ky-hieu-am-nhac', 'zh-TW': 'zh-tw/library/yinyue-fuhao'},
        'sections': {sid: ((lambda s: lambda lc: cps(s))(seq), 'music') for sid, seq in music_sections().items()},
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
    'greek': {
        'page_aware': True,
        'pages': {'en': 'library/greek-letter-symbols', 'ar': 'ar/library/greek-letter-symbols', 'es': 'es/letras-griegas',
                  'fr': 'fr/library/alphabet-grec', 'id': 'id/library/simbol-yunani', 'it': 'it/library/simboli-greci',
                  'ko': 'ko/library/geurisa-munja', 'pt': 'pt/library/alfabeto-grego', 'nl': 'nl/library/griekse-letters',
                  'pl': 'pl/library/alfabet-grecki', 'ja': 'ja/library/greek-letter-symbols', 'tr': 'tr/library/yunan-alfabesi-sembolleri',
                  'de': 'de/library/griechische-symbole', 'sv': 'sv/library/grekiska-bokstaver', 'da': 'da/library/graeske-bogstaver',
                  'ru': 'ru/library/grecheskiy-alfavit', 'th': 'th/library/greek-letter-symbols', 'zh-TW': 'zh-tw/library/xila-zimu-fuhao',
                  'vi': 'vi/library/ky-tu-hy-lap', 'no': 'no/library/greske-bokstaver'},
        'sections': dict([(sid, (greek_expect((lambda x: lambda: greek_styled(x))(sid)), 'greek')) for sid in GREEK_STYLES]
                         + [('greek-archaic-letters', (greek_expect(greek_archaic), 'greek')),
                            ('greek-lunate-sigma', (greek_expect(greek_lunate), 'greek')),
                            ('greek-accented-vowels', (greek_expect(greek_accented), 'greek'))]),
    },
}

# Emoji runs added INTO existing thematic sections (2026-10-24). A run is the exact
# sequence of tiles that must sit immediately after an anchor tile, in a section
# named by id (or, where the locale sections carry no ids, the page's only copy of
# the anchor). Sequences are written as code points, so a fully-qualified emoji
# (U+FE0F, ZWJ, regional-indicator pair) is checked byte for byte. 'worded' runs
# must not reuse the English label on a locale page; 'place' runs are proper names
# (Sark) that several languages write the same way.
def seq(*cps_):
    return ''.join(chr(int(c, 16)) for c in cps_)


FACE_PAGES = {'en': 'library/face-emojis', 'de': 'de/library/gesichts-emojis', 'es': 'es/library/emojis-de-caras',
              'fr': 'fr/library/emojis-visages', 'id': 'id/library/emoji-wajah', 'it': 'it/library/emoji-faccine',
              'pt': 'pt/library/emojis-de-rosto', 'tr': 'tr/library/yuz-emojileri', 'ja': 'ja/library/kao-emoji',
              'vi': 'vi/library/emoji-mat-cuoi', 'zh-TW': 'zh-tw/library/biaoqing-emoji', 'ko': 'ko/library/eolgul-imoji'}
FLAG_PAGES = {'en': 'library/emoji-flags', 'de': 'de/library/emoji-flags', 'es': 'es/library/emoji-flags',
              'pt': 'pt/library/emoji-flags', 'vi': 'vi/library/emoji-flags', 'ar': 'ar/library/emoji-flags',
              'pl': 'pl/library/emoji-flags', 'th': 'th/library/emoji-flags', 'fr': 'fr/library/emoji-drapeaux',
              'ja': 'ja/library/kokki-emoji', 'it': 'it/library/emoji-bandiere', 'zh-TW': 'zh-tw/library/guoqi-emoji',
              'ko': 'ko/library/gukgi-imoji', 'id': 'id/library/emoji-bendera', 'tr': 'tr/library/emoji-bayraklar',
              'nl': 'nl/library/emoji-vlaggen', 'ru': 'ru/library/emodzi-flagi'}
SARK = seq('1F1E8', '1F1F6')
EMOJI_RUNS = {
    'face': {'pages': FACE_PAGES, 'runs': [
        (None, seq('1F973'), [seq('1F638')], 'worded'),            # grinning cat with smiling eyes
        (None, seq('1F971'), [seq('1FAE9')], 'worded'),            # face with bags under eyes (E16.0)
    ]},
    'food': {'pages': {'en': 'library/food-drink-emojis', 'th': 'th/library/food-drink-emojis',
                       'es': 'es/library/emojis-de-comida', 'tr': 'tr/library/yemek-emojileri', 'ko': 'ko/library/eumsik-imoji'},
             'runs': [
        (None, seq('1FAD8'), [seq('1F95C'), seq('1FADA'), seq('1FADB'), seq('1F344', '200D', '1F7EB'), seq('1FADC')], 'worded'),
        (None, seq('1F365'), [seq(c) for c in ('1F358', '1F35B', '1F362', '1F364', '1F96E', '1F361', '1F95F', '1F960', '1F961')], 'worded'),
    ]},
    'travel': {'pages': {'en': 'library/travel-vacation-emojis', 'es': 'es/library/emojis-de-viaje'}, 'runs': [
        ('sightseeing', seq('1F3A1'), [seq(c) for c in ('1F3EF', '26F2')] + [seq('1F3D9', 'FE0F')]
         + [seq(c) for c in ('1F309', '1F3A2', '1F3E2', '1F3EC', '1F3EA', '1F3E3', '1F3E4', '1F3ED')]
         + [seq('1F3D8', 'FE0F'), seq('1F9F1'), seq('1F488')], 'worded'),
        ('packing-hotel', seq('1F3E8'), [seq('1F6D6'), seq('1F3E9')], 'worded'),
        ('packing-hotel', seq('1F6C2'), [seq('1F6C3'), seq('1F6C4'), seq('1F6C5')], 'worded'),
    ]},
    'objects': {'pages': {'en': 'library/object-emojis', 'es': 'es/library/emojis-de-objetos', 'ko': 'ko/library/samul-imoji'}, 'runs': [
        ('everyday-items', seq('1F4E6'), [seq('1FAAA'), seq('1FAA7'), seq('1F6AC')], 'worded'),
    ]},
    'signs': {'pages': {'en': 'library/traffic-road-sign-symbols', 'es': 'es/library/simbolos-de-transito'}, 'runs': [
        ('facilities-services', seq('26FD'), [seq('1F6AE'), seq('1F6B0'), seq('1F6BC')], 'worded'),
    ]},
    'flags': {'pages': FLAG_PAGES, 'runs': [
        ('territory-flags', None, [SARK], 'place'),
    ]},
}


def check_runs(read, only=None):
    """Each run must sit right after its anchor; Sark must appear once, in territory-flags, with the Android note."""
    errors, n = [], 0
    for cname, c in EMOJI_RUNS.items():
        if only and cname != only:
            continue
        en_labels = {}
        for lc, path in c['pages'].items():
            try:
                text = read(path)
            except FileNotFoundError:
                errors.append(f'/{path}/: missing page')
                continue
            for sid, anchor, run_, kind in c['runs']:
                if sid:
                    found = sections_of(text).get(sid, [])
                    if len(found) != 1:
                        errors.append(f'/{path}/#{sid}: section found {len(found)} times, expected once')
                        continue
                    tiles = found[0]
                else:
                    tiles = [tuple(html.unescape(x) for x in m) for m in TILE_RE.findall(text)]
                where = f'/{path}/#{sid or "page"}'
                syms = [t[0] for t in tiles]
                if anchor is None:
                    if syms.count(run_[0]) != 1:
                        errors.append(f'{where}: {run_[0]!r} found {syms.count(run_[0])} times, expected once')
                        continue
                    i = syms.index(run_[0])
                    got = tiles[i:i + len(run_)]
                    if SARK in run_ and 'CQ' not in text:
                        errors.append(f'{where}: the Emoji 16.0 Sark tile needs its one-sentence note (letters CQ on older Android)')
                else:
                    if syms.count(anchor) != 1:
                        errors.append(f'{where}: anchor {anchor!r} found {syms.count(anchor)} times, expected once')
                        continue
                    i = syms.index(anchor)
                    got = tiles[i + 1:i + 1 + len(run_)]
                    # nothing in the run may also appear elsewhere on the same section/page
                for s in run_:
                    if syms.count(s) > 1:
                        errors.append(f'{where}: duplicate tile {s!r}')
                if [g[0] for g in got] != run_:
                    errors.append(f'{where}: run after {anchor!r} differs: expected {run_}, got {[g[0] for g in got]}')
                    continue
                for sym, aria, label in got:
                    n += 1
                    tag = f'{where} {sym!r}'
                    if not label.strip():
                        errors.append(f'{tag}: empty label')
                    elif label.casefold() not in aria.casefold():
                        errors.append(f'{tag}: aria-label {aria!r} does not contain the visible label {label!r}')
                    if lc == 'en':
                        en_labels[sym] = label
                    elif kind == 'worded' and en_labels.get(sym) == label:
                        errors.append(f'{tag}: label is the English one ({label!r}); a {lc} page needs its own wording')
    return errors, n


# Siblings deliberately not carrying the sections yet, with the reason. Empty since
# 2026-10-24: the owner released ko/library/nemo-giho and sv/library/kortfarg-symboler
# from their forward-prediction windows, and both now carry the sections.
HELD = {}

# ---------------------------------------------------------------- parsing

TILE_RE = re.compile(r'<button class="flag-emoji symbol-tile" data-symbol="([^"]*)" aria-label="([^"]*)">[^<]*</button>\s*'
                     r'<span class="flag-label">([^<]*)</span>')


def sections_of(text):
    out = {}
    for m in re.finditer(r'<section class="mood-explainers" id="([^"]+)"[^>]*>(.*?)</section>', text, re.S):
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
        if kind == 'emoji':
            if sym not in FQ:
                errors.append(f'{tag}: not a fully-qualified emoji sequence')
            if TONES & set(sym):
                errors.append(f'{tag}: carries a skin-tone modifier')
        elif kind == 'keycap':
            if not (len(cpl) == 3 and cpl[1:] == [0xFE0F, 0x20E3] and sym[0] in '0123456789#*') and sym != '\U0001F51F':
                errors.append(f'{tag}: not a fully-qualified keycap (base + U+FE0F + U+20E3)')
        elif any(c in VS_OR_JOINER for c in cpl):
            errors.append(f'{tag}: carries a variation selector or joiner')
        for c in cpl:
            try:
                unicodedata.name(chr(c))
            except ValueError:
                errors.append(f'{tag}: U+{c:04X} is unassigned or unnamed')
            if c in MUSIC_U18:
                errors.append(f'{tag}: U+{c:04X} is Unicode 18.0 (no device font yet)')
            if c in EXCLUDED and not where.endswith('#' + EXCLUDED_HOME):
                errors.append(f'{tag}: U+{c:04X} is excluded (no Android system glyph)')
        if len(cpl) != 1 and kind not in ('keycap', 'emoji') and not (kind == 'braille-alphabet' and len(cpl) == 2 and sym[0] == NUMBER_SIGN):
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
        if kind == 'kana' and exp_label:
            if exp_label.startswith('~'):
                if not re.search(r'(?<![a-z])' + re.escape(exp_label[1:]) + r'(?![a-z])', label):
                    errors.append(f'{tag}: small kana label {label!r} does not carry its romaji {exp_label[1:]!r}')
            elif label != exp_label:
                errors.append(f'{tag}: label {label!r} but the Hepburn reading is {exp_label!r}')
        if kind == 'unit':
            if not exp_label:
                errors.append(f'{tag}: not a squared unit (no <square> decomposition)')
            elif exp_label not in label and sym not in label:
                errors.append(f'{tag}: label {label!r} names neither the unit {exp_label!r} nor the character')
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
            if kind == 'greek' and greek_en_label_problem(cp, label):
                errors.append(f'{tag}: label {label!r}: {greek_en_label_problem(cp, label)}')
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
        if en_tiles is not None and (kind in ('box', 'card', 'roman', 'arrow', 'emoji', 'greek', 'unit', 'music', 'alchemy', 'isokey', 'ucdname')
                                     or (kind == 'kana' and exp_label and exp_label.startswith('~'))):
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
            if cname in INCLUDES:
                text = read(path)
                have = {html.unescape(x) for x in re.findall(r'data-symbol="([^"]*)"', text)}
                for seq in INCLUDES[cname]():
                    if seq not in have:
                        errors.append(f'/{path}/: missing the tile {seq!r}')
                    elif seq not in FQ:
                        errors.append(f'/{path}/: {seq!r} is not a fully-qualified emoji sequence')
            if cname == 'music':
                page_tiles = [tuple(html.unescape(x) for x in t) for t in TILE_RE.findall(read(path))]
                for sym, want in zip(('\U0001D13B', '\U0001D13C'), MUSIC_RESTS[lc]):
                    hits = [t for t in page_tiles if t[0] == sym]
                    if len(hits) != 1 or hits[0][2] != want or want.casefold() not in hits[0][1].casefold():
                        errors.append(f'/{path}/: U+{ord(sym):04X} must be labelled {want!r} ({unicodedata.name(sym).title()}); found {hits}')
            for sid, (expect, kind) in c['sections'].items():
                where = f'/{path}/#{sid}'
                found = secs.get(sid, [])
                if len(found) != 1:
                    errors.append(f'{where}: section found {len(found)} times, expected once')
                    continue
                tiles = found[0]
                if sid == EXCLUDED_HOME and not any(w in read(path) for w in ('Android', '안드로이드')):
                    errors.append(f'{where}: the section carrying glyphs Android cannot draw must say so')
                if sid == MUSIC_NOTE_HOME:
                    para = re.search(r'id="%s">.*?<p[^>]*>(.*?)</p>' % sid, read(path), re.S).group(1)
                    if 'Android' not in para and '안드로이드' not in para or 'iPhon' not in para:  # pl declines it: iPhonie
                        errors.append(f'{where}: the first music section must carry the Android/iPhone font note')
                n_tiles += len(tiles)
                en_tiles = en_secs.get(sid, [None])[0] if en_secs and lc != 'en' else None
                want = expect(lc, read(path)) if c.get('page_aware') else expect(lc)
                check_tiles(where, tiles, want, kind, lc, en_tiles, errors, read(path))
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
    ppath = CLUSTERS['people']['pages']['es']
    pgood = open(os.path.join(ROOT, ppath, 'index.html'), encoding='utf-8').read()
    mutations['emoji not fully qualified'] = (ppath, pgood.replace('data-symbol="🕵️"', 'data-symbol="🕵"', 1), 'not a fully-qualified emoji')
    mutations['family tile dropped'] = (ppath, re.sub(r'\s*<div class="flag-row">\s*<button[^>]*data-symbol="👩‍👧‍👧"[^<]*</button>\s*<span[^<]*</span>\s*</div>', '', pgood, count=1), 'set/order differs')
    mutations['toned tile'] = (ppath, pgood.replace('data-symbol="👨‍✈️"', 'data-symbol="👨🏽‍✈️"', 1), 'skin-tone modifier')
    mutations['inserted tile missing'] = (ppath, pgood.replace('data-symbol="👩‍🎓"', 'data-symbol="🎓"', 1), "missing the tile")
    gpath, gdpath = CLUSTERS['greek']['pages']['en'], CLUSTERS['greek']['pages']['de']
    ggood = open(os.path.join(ROOT, gpath, 'index.html'), encoding='utf-8').read()
    gdgood = open(os.path.join(ROOT, gdpath, 'index.html'), encoding='utf-8').read()
    mutations['greek wrong case'] = (gpath, ggood.replace('<span class="flag-label">Capital Omega with Tonos</span>', '<span class="flag-label">Small Omega with Tonos</span>', 1)
                                     .replace('aria-label="Copy Capital Omega with Tonos"', 'aria-label="Copy Small Omega with Tonos"', 1), 'UCD says CAPITAL')
    mutations['greek dropped bold psi'] = (gdpath, re.sub(r'\s*<div class="flag-row">\s*<button[^>]*data-symbol="𝚿"[^<]*</button>\s*<span[^<]*</span>\s*</div>', '', gdgood, count=1), 'missing')
    mutations['greek English label on de'] = (gdpath, gdgood.replace('<span class="flag-label">Großes Alpha mit Tonos</span>', '<span class="flag-label">Capital Alpha with Tonos</span>', 1)
                                              .replace('aria-label="Kopieren Großes Alpha mit Tonos"', 'aria-label="Kopieren Capital Alpha with Tonos"', 1), 'is the English one')
    kpath = CLUSTERS['kana']['pages']['de']
    kgood = open(os.path.join(ROOT, kpath, 'index.html'), encoding='utf-8').read()
    upath = CLUSTERS['units']['pages']['es']
    ugood = open(os.path.join(ROOT, upath, 'index.html'), encoding='utf-8').read()
    mutations['wrong romaji'] = (kpath, kgood.replace('aria-label="Kopieren Hiragana shi">し</button>\n      <span class="flag-label">shi</span>',
                                                      'aria-label="Kopieren Hiragana si">し</button>\n      <span class="flag-label">si</span>', 1), 'Hepburn reading is')
    mutations['English small-kana label'] = (kpath, kgood.replace('aria-label="Kopieren Katakana kleines tsu">ッ</button>\n      <span class="flag-label">kleines tsu</span>',
                                                                  'aria-label="Kopieren Katakana small tsu">ッ</button>\n      <span class="flag-label">small tsu</span>', 1), 'is the English one')
    mutations['unit label without unit'] = (upath, ugood.replace('<span class="flag-label">kW (kilovatio)</span>', '<span class="flag-label">kilovatio</span>', 1)
                                            .replace('aria-label="Copiar kW (kilovatio)"', 'aria-label="Copiar kilovatio"', 1), 'names neither the unit')
    mutations['katakana-word square'] = (upath, ugood.replace('data-symbol="㏖"', 'data-symbol="㌔"', 1).replace('>㏖<', '>㌔<', 1), 'set/order differs')
    mpath_ = CLUSTERS['music']['pages']['de']
    mgood = open(os.path.join(ROOT, mpath_, 'index.html'), encoding='utf-8').read()
    half = '\U0001D15E'
    mutations['decomposed half note'] = (mpath_, mgood.replace(f'data-symbol="{half}"', 'data-symbol="\U0001D157\U0001D165"', 1), 'code points in a single-character tile')
    mutations['Unicode 18 musical symbol'] = (mpath_, mgood.replace('data-symbol="\U0001D104"', 'data-symbol="\U0001D1FF"', 1), 'Unicode 18.0')
    mutations['whole rest labelled as half rest'] = (mpath_, mgood.replace('<span class="flag-label">Ganze Pause</span>', '<span class="flag-label">Halbe Pause</span>', 1), 'must be labelled')
    mutations['music font note removed'] = (mpath_, mgood.replace('iPhon', 'XXXX'), 'font note')
    apath = CLUSTERS['alchemy']['pages']['en']
    agood = open(os.path.join(ROOT, apath, 'index.html'), encoding='utf-8').read()
    kcpath = CLUSTERS['checkers']['pages']['nl']
    kcgood = open(os.path.join(ROOT, kcpath, 'index.html'), encoding='utf-8').read()
    mutations['alchemy label drift'] = (apath, agood.replace('<span class="flag-label">Borax II</span>', '<span class="flag-label">Borax III</span>', 1)
                                        .replace('aria-label="Copy Borax II"', 'aria-label="Copy Borax III"', 1), "UCD says 'Borax II'")
    mutations['glyph Android cannot draw'] = (apath, agood.replace('data-symbol="🝳"', 'data-symbol="🝴"', 1).replace('>🝳<', '>🝴<', 1), 'no Android system glyph')
    mutations['English checkers label on a locale page'] = (kcpath, kcgood.replace('<span class="flag-label">Witte dam</span>', '<span class="flag-label">White Draughts King</span>', 1)
                                                            .replace('aria-label="Kopiëren Witte dam"', 'aria-label="Kopiëren White Draughts King"', 1), 'is the English one')
    failed = []
    fpath, epath = EMOJI_RUNS['food']['pages']['ko'], EMOJI_RUNS['flags']['pages']['ru']
    fgood = open(os.path.join(ROOT, fpath, 'index.html'), encoding='utf-8').read()
    egood = open(os.path.join(ROOT, epath, 'index.html'), encoding='utf-8').read()
    run_mutations = {
        'emoji run reordered': ('food', fpath, fgood.replace('data-symbol="🍘"', 'data-symbol="🍛X"', 1), 'differs'),
        'brown mushroom unqualified': ('food', fpath, fgood.replace('data-symbol="🍄\u200d🟫"', 'data-symbol="🍄🟫"', 1), 'differs'),
        'English label on a locale emoji tile': ('food', fpath, fgood.replace('<span class="flag-label">땅콩</span>', '<span class="flag-label">Peanuts</span>', 1)
                                                 .replace('aria-label="복사 땅콩"', 'aria-label="복사 Peanuts"', 1), 'is the English one'),
        'Sark note removed': ('flags', epath, egood.replace('буквы CQ', 'буквы', 1), 'needs its one-sentence note'),
        'Sark dropped': ('flags', epath, re.sub(r'\s*<div class="flag-row">\s*<button[^>]*data-symbol="🇨🇶"[^<]*</button>\s*<span[^<]*</span>\s*</div>', '', egood, count=1), 'found 0 times'),
    }
    for name, (cl, mpath, text, expect) in run_mutations.items():
        orig = fgood if mpath == fpath else egood
        if text == orig:
            failed.append(f'{name}: the mutation did not apply (fixture drifted)')
            continue
        errs, _ = check_runs(lambda p, mp=mpath, tx=text: tx if p == mp else open(os.path.join(ROOT, p, 'index.html'), encoding='utf-8').read(), cl)
        hit = [e for e in errs if expect in e]
        if not hit:
            failed.append(f'{name}: NOT caught (errors: {errs[:2]})')
        else:
            print(f'  caught  {name}: {hit[0][:110]}')
    for name, (mpath, text, expect) in mutations.items():
        orig = {path: good, cpath: cgood, npath: ngood, ppath: pgood, gpath: ggood, gdpath: gdgood, kpath: kgood, upath: ugood, mpath_: mgood, apath: agood, kcpath: kcgood}[mpath]
        if text == orig:
            failed.append(f'{name}: the mutation did not apply (fixture drifted)')
            continue
        only = {path: 'braille', cpath: 'cards', npath: 'numbers', ppath: 'people', gpath: 'greek', gdpath: 'greek', kpath: 'kana', upath: 'units', mpath_: 'music', apath: 'alchemy', kcpath: 'checkers'}[mpath]
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
    run_errors, rn = check_runs(lambda p: open(os.path.join(ROOT, p, 'index.html'), encoding='utf-8').read())
    errors += run_errors
    n += rn
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
