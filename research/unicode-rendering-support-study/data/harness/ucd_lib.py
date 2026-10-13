"""Parsers for the Unicode Character Database files stored in data/raw/ucd and data/raw/emoji.
Nothing here is hard-coded about *which* Unicode version is current: the newest version is
whatever DerivedAge.txt / publicationdates.html say it is."""
import re, html, os, bisect
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.normpath(os.path.join(HERE, '..', 'data', 'raw'))

def _lines(path):
    with open(path, encoding='utf-8') as f:
        for l in f:
            l = l.split('#', 1)[0].strip()
            if l:
                yield l

def parse_ranges(path, nfields=1):
    """lines like 'AAAA..BBBB ; v' -> list of (lo, hi, [fields])"""
    out = []
    for l in _lines(path):
        parts = [p.strip() for p in l.split(';')]
        r = parts[0]
        lo, _, hi = r.partition('..')
        out.append((int(lo, 16), int(hi or lo, 16), parts[1:]))
    return out

class RangeMap:
    def __init__(self, ranges):
        self.r = sorted(ranges, key=lambda x: x[0])
        self.starts = [x[0] for x in self.r]
    def get(self, cp, default=None):
        i = bisect.bisect_right(self.starts, cp) - 1
        if i >= 0 and self.r[i][0] <= cp <= self.r[i][1]:
            return self.r[i][2]
        return default

def release_dates():
    """version -> ISO date, from the saved copy of unicode.org/history/publicationdates.html"""
    t = open(os.path.join(RAW, 'ucd', 'publicationdates.html'), encoding='utf-8').read()
    i = t.find('Unicode Release Dates')
    s = re.sub(r'<[^>]+>', '|', t[i:i + 9000]); s = html.unescape(re.sub(r'\s+', ' ', s))
    s = re.sub(r'(\| ?)+', '|', s)
    months = {m: i + 1 for i, m in enumerate('January February March April May June July August September October November December'.split())}
    out = {}
    for m in re.finditer(r'\|(\d+)\.(\d+)\.(\d+)\|(\d{4})\|([A-Za-z]+) (\d+)(?=\|)', s):
        a, b, c, y, mo, d = m.groups()
        if mo in months:
            ver = f'{a}.{b}'
            if c == '0' or ver not in out:
                out[ver] = f'{int(y):04d}-{months[mo]:02d}-{int(d):02d}'
    return out

def unicode_data():
    """cp -> dict(name, gc, ccc); ranges (First/Last) expanded lazily via range_name()"""
    d = {}; ranges = []
    first = None
    for l in open(os.path.join(RAW, 'ucd', 'UnicodeData.txt'), encoding='utf-8'):
        f = l.rstrip('\n').split(';')
        cp = int(f[0], 16); name = f[1]
        if name.endswith(', First>'):
            first = (cp, name[1:-8], f[2], int(f[3]))
            continue
        if name.endswith(', Last>'):
            ranges.append((first[0], cp, first[1], first[2], first[3])); continue
        d[cp] = dict(name=name, gc=f[2], ccc=int(f[3]))
    return d, ranges

def derived_age():
    return RangeMap([(lo, hi, f[0].split()[0]) for lo, hi, f in parse_ranges(os.path.join(RAW, 'ucd', 'DerivedAge.txt'))])

def simple_prop(fname):
    return RangeMap([(lo, hi, f[0]) for lo, hi, f in parse_ranges(os.path.join(RAW, 'ucd', fname))])

def binary_props(fname):
    """multi-property file (PropList, emoji-data, DerivedCoreProperties) -> {prop: RangeMap-ish set of ranges}"""
    props = {}
    for lo, hi, f in parse_ranges(os.path.join(RAW, 'ucd', fname)):
        props.setdefault(f[0], []).append((lo, hi, True))
    return {k: RangeMap(v) for k, v in props.items()}

def vs_sequences():
    """emoji-variation-sequences.txt -> set of base cps that have a VS15/VS16 sequence"""
    bases = set()
    for l in _lines(os.path.join(RAW, 'ucd', 'emoji-variation-sequences.txt')):
        seq = l.split(';')[0].split()
        bases.add(int(seq[0], 16))
    return bases

def emoji_test():
    """emoji-test.txt -> list of dict(seq(tuple), status, version, name, group, subgroup)"""
    out = []; group = sub = None
    for l in open(os.path.join(RAW, 'emoji', 'emoji-test.txt'), encoding='utf-8'):
        l = l.rstrip('\n')
        if l.startswith('# group:'): group = l.split(':', 1)[1].strip()
        elif l.startswith('# subgroup:'): sub = l.split(':', 1)[1].strip()
        elif l and not l.startswith('#'):
            m = re.match(r'([0-9A-F ]+?)\s*;\s*(\S+)\s*#\s*(\S+)\s+E([\d.]+)\s+(.*)$', l)
            if not m: continue
            out.append(dict(seq=tuple(int(x, 16) for x in m[1].split()), status=m[2], version=m[4], name=m[5], group=group, subgroup=sub))
    return out

def sequence_type(seq):
    """classify an emoji sequence by structure (not by which file it came from)"""
    s = list(seq); n = len(s)
    ri = lambda c: 0x1F1E6 <= c <= 0x1F1FF
    if n == 1: return 'single'
    if 0x200D in s: return 'zwj'
    if n == 2 and s[1] == 0xFE0F and True: return 'vs16_emoji_presentation'
    if n == 2 and ri(s[0]) and ri(s[1]): return 'flag_regional_indicator'
    if 0xE0020 <= s[-1] <= 0xE007F and s[0] == 0x1F3F4: return 'flag_subdivision_tag'
    if s[-1] == 0x20E3: return 'keycap'
    if any(0x1F3FB <= c <= 0x1F3FF for c in s[1:]): return 'skin_tone_modifier'
    return 'other'

def emoji_release_table():
    """UTS #51 'Emoji Versions' table (saved copy data/raw/emoji/emoji-versions.html) ->
    {emoji_version: (iso_date, unicode_version)}.  Emoji 12.1 and 13.1 are emoji-only releases."""
    t = open(os.path.join(RAW, 'emoji', 'emoji-versions.html'), encoding='utf-8').read()
    t = re.sub(r'<[^>]+>', '|', t); t = html.unescape(re.sub(r'\s+', ' ', t)); t = re.sub(r'(\| ?)+', '|', t)
    return {m[0]: (m[1], m[2]) for m in re.findall(r'\|Emoji (\d+\.\d+)\|(\d{4}-\d\d-\d\d)\|Unicode (\d+\.\d+)', t)}

def canonical_decomposables():
    """code points with a canonical (non-<compat>) decomposition mapping in UnicodeData.txt field 5 (HarfBuzz recomposes/decomposes these when a font lacks the precomposed glyph)"""
    out = set()
    for l in open(os.path.join(RAW, 'ucd', 'UnicodeData.txt'), encoding='utf-8'):
        f = l.split(';')
        if f[5] and not f[5].startswith('<'): out.add(int(f[0], 16))
    return out

def canonical_decomp_map():
    """cp -> full (recursive) canonical decomposition as a tuple of code points"""
    direct = {}
    for l in open(os.path.join(RAW, 'ucd', 'UnicodeData.txt'), encoding='utf-8'):
        f = l.split(';')
        if f[5] and not f[5].startswith('<'): direct[int(f[0], 16)] = [int(x, 16) for x in f[5].split()]
    def full(c):
        return sum((full(x) if x in direct else (x,) for x in direct[c]), ()) if False else tuple(y for x in direct[c] for y in (full(x) if x in direct else (x,)))
    return {c: full(c) for c in direct}
