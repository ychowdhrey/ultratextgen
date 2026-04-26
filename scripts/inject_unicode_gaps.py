#!/usr/bin/env python3
"""
Insert missing Unicode block symbols into existing /library/ pages,
preserving all existing entries. Adds one new section per page titled
"Additional Block Symbols" with rows in the canonical format.
"""
import re
from pathlib import Path

REPO = Path("/home/runner/work/ultratextgen/ultratextgen")

# Load UCD names
chars = {}
for line in open('/tmp/UnicodeData.txt'):
    f = line.rstrip('\n').split(';')
    if not f or not f[0]:
        continue
    cp = int(f[0], 16); name = f[1]; gc = f[2]
    if name.startswith('<') and name != '<control>':
        continue
    chars[cp] = (name, gc)
EXCLUDED_GC = {"Cc", "Cs", "Co"}

PAGE_BLOCKS = {
    'arrow-symbols':       ('Arrows', 0x2190, 0x21FF),
    'currency-symbols':    ('Currency Symbols', 0x20A0, 0x20CF),
    'norse-viking-runes':  ('Runic', 0x16A0, 0x16FF),
}

def label_from(name):
    # "RIGHTWARDS ARROW WITH STROKE" -> "Rightwards Arrow With Stroke"
    return ' '.join(w.capitalize() for w in name.split())

def make_row(ch, name):
    label = label_from(name)
    # HTML-escape the symbol attribute is fine for these chars; none are <>"'&.
    return (
        '    <div class="flag-row">\n'
        f'      <button class="flag-emoji symbol-tile" data-symbol="{ch}" aria-label="Copy {ch}">{ch}</button>\n'
        f'      <span class="flag-label">{label}</span>\n'
        '    </div>\n'
    )

added_summary = {}

for slug, (block_name, start, end) in PAGE_BLOCKS.items():
    path = REPO / 'library' / slug / 'index.html'
    html = path.read_text()
    existing = set(re.findall(r'data-symbol="([^"]+)"', html))
    missing = []
    for cp in range(start, end + 1):
        if cp not in chars:
            continue
        name, gc = chars[cp]
        if gc in EXCLUDED_GC:
            continue
        ch = chr(cp)
        if ch in existing:
            continue
        missing.append((cp, ch, name))
    if not missing:
        added_summary[slug] = 0
        continue

    rows = ''.join(make_row(ch, name) for _, ch, name in missing)
    section_id = f"additional-{block_name.lower().replace(' ', '-')}"
    section_html = (
        '\n<div class="section-divider"></div>\n\n'
        f'<!-- ADDITIONAL {block_name.upper()} BLOCK COVERAGE (auto-added from UCD) -->\n'
        f'<section class="mood-explainers" id="{section_id}">\n'
        f'  <span class="article-section-label">Complete Block Coverage</span>\n'
        f'  <h2>More from the Unicode {block_name} Block</h2>\n'
        f'  <p style="color:var(--text-secondary);margin-bottom:0.5rem;">Remaining assigned codepoints from the Unicode {block_name} block (U+{start:04X}–U+{end:04X}) not listed in the curated sections above.</p>\n'
        '  <div class="flag-rows">\n'
        f'{rows}'
        '  </div>\n'
        '</section>\n\n'
    )
    # Insert before "<!-- CTA -->" anchor
    anchor = '<!-- CTA -->'
    if anchor not in html:
        raise SystemExit(f"Anchor not found in {path}")
    new_html = html.replace(anchor, section_html + anchor, 1)
    path.write_text(new_html)
    added_summary[slug] = len(missing)
    print(f"{slug}: added {len(missing)} symbols")

print("\nSummary:", added_summary)
