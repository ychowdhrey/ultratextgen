#!/usr/bin/env python3
"""Inventory every non-ASCII character / emoji sequence that UltraTextGen exposes.
READ-ONLY on the public repo (path argument). Output goes into this study only.
Sources (each unit records which):
  style_output : strings the style registry emits for a probe alphabet (cache/styles_dump.json, produced by utg_styles_dump.js)
  copy_attr    : data-symbol / data-copy / data-text / data-value / data-example / data-symbols attribute values in HTML (what a 'copy' button copies)
  js_literal   : non-ASCII string literals in shipped JS (root *.js and js/**, tests excluded)
  page_text    : visible text of HTML pages (scripts/styles/head removed) - characters a reader sees but is not offered to copy
Units: an emoji unit is a whole grapheme cluster containing Extended_Pictographic / regional indicators / keycap / tags;
       every other grapheme cluster is decomposed into code points (rendered with a dotted-circle base when combining).
Usage: utg_inventory.py <public-repo-path> [--commit SHA]"""
import sys, os, re, json, glob, gzip, csv, html, collections, subprocess
import regex
import ucd_lib as U
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
repo = sys.argv[1]
sha = subprocess.run(['git', '-C', repo, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
ud, udr = U.unicode_data(); age = U.derived_age(); ep = U.binary_props('emoji-data.txt'); dcp = U.binary_props('DerivedCoreProperties.txt'); scripts = U.simple_prop('Scripts.txt'); blocks = U.simple_prop('Blocks.txt')
vsb = U.vs_sequences()
dates = U.release_dates()
GR = regex.compile(r'\X')
nonascii = re.compile(r'[^\x00-\x7f]')

def is_emoji_unit(g):
    cps = [ord(c) for c in g]
    return len(cps) > 1 and any(ep['Extended_Pictographic'].get(c) is not None or 0x1F1E6 <= c <= 0x1F1FF or c == 0x20E3 or 0xE0020 <= c <= 0xE007F for c in cps) \
        or (len(cps) == 1 and (ep['Emoji_Presentation'].get(cps[0]) is not None) )

units = {}   # text -> dict
page_units = []   # (page, text, source)
def add(text, source, page=None):
    for g in GR.findall(text):
        if not nonascii.search(g): continue
        if is_emoji_unit(g) or (len(g) == 1 and False): ks = [g]
        else: ks = list(g)
        for k in ks:
            if not nonascii.search(k): continue
            u = units.setdefault(k, dict(sources=collections.Counter(), pages=set()))
            u['sources'][source] += 1
            if page: u['pages'].add(page); page_units.append((page, k, source))

# A. style registry
d = json.load(open(f'{ROOT}/cache/styles_dump.json'))
for name, st in d['styles'].items():
    for o in st['outputs']: add(o, 'style_output', f'[style] {name}')
# B. HTML
SKIP = ('node_modules/', 'docs/', 'research/', 'reports/')
ATTRS = re.compile(r'\sdata-(symbol|copy|text|value|example|symbols)="([^"]*)"')
tag_strip = re.compile(r'<(script|style|head|noscript|svg)\b.*?</\1>', re.S | re.I)
n_pages = 0
for p in sorted(glob.glob(f'{repo}/**/*.html', recursive=True)):
    rel = os.path.relpath(p, repo)
    if rel.startswith(SKIP) or rel.endswith('.test.html'): continue
    t = open(p, encoding='utf-8', errors='ignore').read(); n_pages += 1
    page = '/' + rel.replace('index.html', '')
    for m in ATTRS.finditer(t): add(html.unescape(m.group(2)), 'copy_attr', page)
    body = re.sub(r'<[^>]+>', ' ', tag_strip.sub(' ', t)); body = html.unescape(body)
    add(body, 'page_text', page)
# C. JS literals
for p in sorted(glob.glob(f'{repo}/*.js') + glob.glob(f'{repo}/js/**/*.js', recursive=True)):
    rel = os.path.relpath(p, repo)
    if '.test.' in rel or rel.startswith(SKIP): continue
    t = open(p, encoding='utf-8', errors='ignore').read()
    for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`", t):
        s = m.group(1) or m.group(2) or m.group(3) or ''
        if nonascii.search(s): add(s, 'js_literal', '[js] ' + rel)
# metadata
rows = []
for text, u in sorted(units.items(), key=lambda kv: [ord(c) for c in kv[0]]):
    cps = [ord(c) for c in text]
    kind = 'emoji_unit' if len(cps) > 1 or is_emoji_unit(text) else 'codepoint'
    r = dict(unit_hex=' '.join(f'{c:04X}' for c in cps), text=text, kind=kind, n_cps=len(cps),
             sources='|'.join(f'{k}:{v}' for k, v in sorted(u['sources'].items())), n_pages=len(u['pages']),
             in_copy_surface=int(any(k in u['sources'] for k in ('copy_attr', 'style_output', 'js_literal'))))
    if kind == 'codepoint':
        c = cps[0]
        nm, gc, ccc = (ud[c]['name'], ud[c]['gc'], ud[c]['ccc']) if c in ud else (None, 'Cn', 0)
        if nm is None:
            for lo, hi, n2, g2, c2 in udr:
                if lo <= c <= hi: nm, gc, ccc = f'{n2.upper()}-{c:04X}', g2, c2
        v = age.get(c) or '?'
        r.update(cp_int=c, unicode_name=nm or '', general_category=gc, unicode_version=v, unicode_release_date=dates.get(v, ''),
                 script=scripts.get(c) or 'Unknown', block=blocks.get(c) or 'No_Block',
                 combining_character=int(gc in ('Mn', 'Mc', 'Me') or ccc > 0), default_ignorable=int(dcp['Default_Ignorable_Code_Point'].get(c) is not None),
                 emoji_property=int(ep['Emoji'].get(c) is not None), emoji_presentation_property=int(ep['Emoji_Presentation'].get(c) is not None),
                 extended_pictographic=int(ep['Extended_Pictographic'].get(c) is not None))
    rows.append(r)
cols = []
for r in rows:
    for k in r:
        if k not in cols: cols.append(k)
os.makedirs(f'{ROOT}/data/derived', exist_ok=True)
with open(f'{ROOT}/data/derived/utg_units.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=cols); w.writeheader(); w.writerows(rows)
with gzip.open(f'{ROOT}/data/derived/utg_page_units.csv.gz', 'wt', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['page', 'unit_hex', 'source'])
    for page, k, s in sorted(set(page_units)): w.writerow([page, ' '.join(f'{ord(c):04X}' for c in k), s])
meta = dict(public_repo_commit=sha, html_pages_scanned=n_pages, units=len(rows), emoji_units=sum(1 for r in rows if r['kind'] == 'emoji_unit'),
            codepoint_units=sum(1 for r in rows if r['kind'] == 'codepoint'), in_copy_surface=sum(r['in_copy_surface'] for r in rows), styles_dumped=d['n_styles'])
json.dump(meta, open(f'{ROOT}/data/derived/utg_inventory_meta.json', 'w'), indent=1)
print(meta)
