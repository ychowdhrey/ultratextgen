#!/usr/bin/env python3
"""
Generate data/categories.yaml from UCD data, applying scope guards.

Source files (already fetched to /tmp):
  - UnicodeData.txt
  - Blocks.txt
  - DerivedAge.txt
  - Scripts.txt
"""

import re
from collections import defaultdict
from pathlib import Path

UCD = Path("/tmp")
OUT_YAML = Path("/home/runner/work/ultratextgen/ultratextgen/data/categories.yaml")

# ---------- Parse UnicodeData.txt ----------
# Fields: 0=cp, 1=name, 2=general_category
chars = {}  # cp_int -> (name, gc)
range_starts = {}  # name (without ", First>") -> cp
for line in (UCD / "UnicodeData.txt").read_text().splitlines():
    if not line:
        continue
    fields = line.split(";")
    cp = int(fields[0], 16)
    name = fields[1]
    gc = fields[2]
    chars[cp] = (name, gc)

# Handle range markers (e.g., "<CJK Ideograph, First>" / "<CJK Ideograph, Last>").
# UnicodeData.txt only lists endpoints; need to expand for counting.
# Re-scan to build ranges:
range_blocks = []  # list of (start_cp, end_cp, name_label, gc)
prev_first = None
for line in (UCD / "UnicodeData.txt").read_text().splitlines():
    if not line:
        continue
    fields = line.split(";")
    cp = int(fields[0], 16)
    name = fields[1]
    gc = fields[2]
    if name.endswith(", First>"):
        prev_first = (cp, name[1:-len(", First>")], gc)
    elif name.endswith(", Last>") and prev_first is not None:
        start_cp = prev_first[0]
        label = prev_first[1]
        rgc = prev_first[2]
        range_blocks.append((start_cp, cp, label, rgc))
        prev_first = None

# Build assigned-codepoint set: every cp explicitly listed + every cp in a range.
assigned = set()
gc_of = {}
name_of = {}
for cp, (name, gc) in chars.items():
    if name.startswith("<") and (name.endswith(", First>") or name.endswith(", Last>")):
        continue  # handled below
    assigned.add(cp)
    gc_of[cp] = gc
    name_of[cp] = name

for start, end, label, gc in range_blocks:
    for cp in range(start, end + 1):
        assigned.add(cp)
        gc_of[cp] = gc
        # Construct a synthetic name like "CJK UNIFIED IDEOGRAPH-4E00"
        name_of[cp] = f"{label.upper()}-{cp:04X}"

# ---------- Parse Blocks.txt ----------
blocks = []  # list of (start, end, name)
block_re = re.compile(r"^([0-9A-F]+)\.\.([0-9A-F]+);\s*(.+?)\s*$")
for line in (UCD / "Blocks.txt").read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    m = block_re.match(line)
    if not m:
        continue
    s = int(m.group(1), 16)
    e = int(m.group(2), 16)
    nm = m.group(3)
    blocks.append((s, e, nm))

# ---------- Parse DerivedAge.txt for unicode version of block ----------
# DerivedAge format: "0000..001F    ; 1.1 #..."
age_of = {}  # cp -> age string
age_re = re.compile(
    r"^([0-9A-F]+)(?:\.\.([0-9A-F]+))?\s*;\s*([0-9.]+)"
)
for line in (UCD / "DerivedAge.txt").read_text().splitlines():
    line = line.split("#", 1)[0].strip()
    if not line:
        continue
    m = age_re.match(line)
    if not m:
        continue
    s = int(m.group(1), 16)
    e = int(m.group(2), 16) if m.group(2) else s
    ver = m.group(3)
    for cp in range(s, e + 1):
        age_of[cp] = ver

# ---------- Parse Scripts.txt for scripts in block ----------
script_of = {}  # cp -> script
script_re = re.compile(
    r"^([0-9A-F]+)(?:\.\.([0-9A-F]+))?\s*;\s*(\w+)"
)
for line in (UCD / "Scripts.txt").read_text().splitlines():
    line = line.split("#", 1)[0].strip()
    if not line:
        continue
    m = script_re.match(line)
    if not m:
        continue
    s = int(m.group(1), 16)
    e = int(m.group(2), 16) if m.group(2) else s
    sc = m.group(3)
    for cp in range(s, e + 1):
        script_of[cp] = sc

# ---------- Scope guard ----------
EXCLUDED_GC = {"Cc", "Cs", "Co"}

def assigned_in_block(start, end):
    """Return list of (cp, name, gc) for assigned, non-excluded cps in block."""
    result = []
    for cp in range(start, end + 1):
        if cp in assigned and gc_of.get(cp) not in EXCLUDED_GC:
            result.append((cp, name_of[cp], gc_of[cp]))
    return result

skipped = []  # (block_name, range_str, reason)

# ---------- Master category mapping ----------
# Heuristic by block name keywords + scripts present.
SCRIPT_LIKE_KEYWORDS = (
    "Latin", "Greek", "Cyrillic", "Armenian", "Hebrew", "Arabic", "Syriac",
    "Thaana", "NKo", "Samaritan", "Mandaic", "Devanagari", "Bengali",
    "Gurmukhi", "Gujarati", "Oriya", "Tamil", "Telugu", "Kannada",
    "Malayalam", "Sinhala", "Thai", "Lao", "Tibetan", "Myanmar", "Georgian",
    "Hangul", "Ethiopic", "Cherokee", "Canadian Aboriginal", "Ogham",
    "Runic", "Khmer", "Mongolian", "Limbu", "Tai Le", "New Tai Lue",
    "Buginese", "Balinese", "Sundanese", "Batak", "Lepcha", "Ol Chiki",
    "Vedic", "Phonetic", "Bopomofo", "Hiragana", "Katakana", "Kanbun",
    "Yi ", "Lisu", "Vai", "Bamum", "Syloti", "Phags-pa", "Saurashtra",
    "Kayah", "Rejang", "Javanese", "Cham", "Tai Viet", "Meetei", "Adlam",
    "Mende", "Khojki", "Mahajani", "Sharada", "Khudawadi", "Grantha",
    "Tirhuta", "Newa", "Tangut", "Nushu", "Duployan", "Sutton",
    "Coptic", "Glagolitic", "Phoenician", "Lydian", "Lycian", "Carian",
    "Meroitic", "Old Italic", "Gothic", "Ugaritic", "Old Persian",
    "Cuneiform", "Brahmi", "Kaithi", "Sora Sompeng", "Chakma", "Takri",
    "Manichaean", "Avestan", "Inscriptional", "Pahlavi", "Parthian",
    "Old Turkic", "Old Hungarian", "Hanifi Rohingya", "Old Sogdian",
    "Sogdian", "Elymaic", "Nandinagari", "Zanabazar", "Soyombo",
    "Marchen", "Masaram", "Modi", "Pau Cin Hau", "Pollard", "Miao",
    "Tagalog", "Hanunoo", "Buhid", "Tagbanwa", "Mro", "Bassa", "Pahawh",
    "Caucasian Albanian", "Linear A", "Linear B", "Aegean", "Cypriot",
    "Hatran", "Imperial Aramaic", "Nabataean", "Palmyrene", "Old North Arabian",
    "Old South Arabian", "Anatolian Hieroglyphs", "Egyptian Hieroglyphs",
    "Mende Kikakui", "Sundanese", "Tangsa", "Toto", "Vithkuqi", "Yezidi",
    "Chorasmian", "Dives Akuru", "Khitan Small Script", "Wancho",
    "Nag Mundari", "Kawi", "Cypro-Minoan", "Old Uyghur", "Garay",
    "Gurung Khema", "Kirat Rai", "Ol Onal", "Sunuwar", "Todhri", "Tulu",
    "Beria", "Sidetic", "Tai Yo", "Tolong Siki",
    "Syllabics", "Syllabary", "Jamo", "Kana", "Ideographic Symbols",
    "Hentaigana", "Tifinagh", "Osmanya", "Osage", "Elbasan",
)

def master_category_for(block_name, scripts_in_block):
    bn = block_name
    bn_l = bn.lower()
    # numbers
    if "number" in bn_l or bn == "Counting Rod Numerals" or bn == "Rumi Numeral Symbols" or bn == "Sinhala Archaic Numbers":
        return "numbers"
    if "digit" in bn_l:
        return "numbers"
    # diacritics
    if "diacritical" in bn_l or "combining" in bn_l and "marks" in bn_l:
        return "diacritics"
    # emoji-ish
    if ("emoticons" in bn_l or "emoji" in bn_l or "pictograph" in bn_l
            or "transport and map" in bn_l or "ornamental dingbats" in bn_l
            or "symbols and pictographs" in bn_l):
        return "emoji"
    # punctuation
    if "punctuation" in bn_l or "quotation" in bn_l:
        return "punctuation"
    # technical (math, technical, control pictures, OCR, braille, optical)
    if ("mathematical" in bn_l or "technical" in bn_l or "ocr" in bn_l
            or "control pictures" in bn_l or "braille" in bn_l
            or "supplemental math" in bn_l or "letterlike" in bn_l):
        return "technical"
    # arrows / shapes / symbols
    if ("arrow" in bn_l or "shape" in bn_l or "geometric" in bn_l
            or "dingbat" in bn_l or "symbol" in bn_l or "currency" in bn_l
            or "playing cards" in bn_l or "chess" in bn_l or "domino" in bn_l
            or "mahjong" in bn_l or "musical" in bn_l or "alchemical" in bn_l
            or "weather" in bn_l or "box drawing" in bn_l or "block elements" in bn_l
            or "halfwidth and fullwidth forms" in bn_l):
        return "symbols"
    # script-like
    if any(kw.lower() in bn_l for kw in SCRIPT_LIKE_KEYWORDS):
        return "scripts"
    if scripts_in_block and scripts_in_block != {"Common"} and scripts_in_block != {"Inherited"}:
        return "scripts"
    return "symbols"

def slugify(name):
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s

def id_for(name):
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")

# ---------- Page mapping (for has_page) ----------
LIBRARY_DIR = Path("/home/runner/work/ultratextgen/ultratextgen/library")
existing_pages = {p.name for p in LIBRARY_DIR.iterdir() if p.is_dir()}

# Map block name -> page slug under /library/ when there's a clear correspondence.
# Conservative mapping; pages that are themed/multi-block are not mapped.
BLOCK_TO_PAGE = {
    "Arrows": "arrow-symbols",
    "Currency Symbols": "currency-symbols",
    "Runic": "norse-viking-runes",
    "Egyptian Hieroglyphs": "egyptian-hieroglyphs",
    "Mathematical Operators": "math-symbols",
    "Geometric Shapes": "geometric-symbols",
    "Box Drawing": "line-divider-symbols",
    "Musical Symbols": "music-symbols",
    "Miscellaneous Symbols": "witchy-occult-symbols",  # partial; many pages overlap
    "Dingbats": "sparkle-symbols",  # partial
}

def page_path_for(block_name):
    slug = BLOCK_TO_PAGE.get(block_name)
    if slug and slug in existing_pages:
        return f"library/{slug}/index.html"
    return None

# ---------- Build entries ----------
entries = []
for start, end, name in blocks:
    total = end - start + 1
    assigned_list = assigned_in_block(start, end)
    if not assigned_list:
        skipped.append((name, f"U+{start:04X}..U+{end:04X}", "no assigned codepoints (excluding Cc/Cs/Co)"))
        continue
    # Scope: skip if >90% unassigned (i.e., assigned_count/total <= 0.10)
    ratio_assigned = len(assigned_list) / total
    if ratio_assigned <= 0.10:
        skipped.append((name, f"U+{start:04X}..U+{end:04X}",
                        f">90% unassigned ({len(assigned_list)}/{total})"))
        continue

    # Scripts
    scripts_set = set()
    for cp in range(start, end + 1):
        sc = script_of.get(cp)
        if sc and sc not in ("Common", "Inherited", "Unknown"):
            scripts_set.add(sc.replace("_", " "))
    # Unicode version: oldest age of any assigned cp in block
    versions = {age_of[cp] for cp, _, _ in assigned_list if cp in age_of}
    if versions:
        # numeric sort
        def ver_key(v):
            return tuple(int(x) for x in v.split("."))
        unicode_version = sorted(versions, key=ver_key)[0]
    else:
        unicode_version = ""

    # CJK Unified Ideograph special handling
    is_cjk_bulk = "CJK Unified Ideograph" in name or "CJK Compatibility Ideograph" in name or "Tangut" in name
    notes = ""
    if is_cjk_bulk:
        notes = "bulk block, manual handling"

    # sample symbols: 5 representative assigned cps spread across block
    sample_count = min(5, len(assigned_list))
    if sample_count > 0:
        step = max(1, len(assigned_list) // sample_count)
        samples = [assigned_list[i * step][0] for i in range(sample_count)]
    else:
        samples = []
    sample_chars = []
    for cp in samples:
        try:
            sample_chars.append(chr(cp))
        except ValueError:
            pass

    pp = page_path_for(name)
    has_page = pp is not None

    mc = master_category_for(name, scripts_set)

    entries.append({
        "id": id_for(name),
        "name": name,
        "slug": slugify(name),
        "range": f"U+{start:04X}..U+{end:04X}",
        "range_start": start,
        "master_category": mc,
        "description": "",  # filled below
        "symbol_count": len(assigned_list),
        "sample_symbols": sample_chars,
        "unicode_version": unicode_version,
        "scripts": sorted(scripts_set),
        "has_page": has_page,
        "page_path": pp,
        "notes": notes,
    })

# ---------- Descriptions (templated, deterministic) ----------
def make_description(e):
    n = e["name"]
    mc = e["master_category"]
    sc = e["scripts"]
    cnt = e["symbol_count"]
    if e["notes"] == "bulk block, manual handling":
        return f"Large bulk block of {cnt} ideographic characters; not suitable for manual symbol catalogs."
    if mc == "scripts" and sc:
        return f"Letters and characters used to write {', '.join(sc)}. Contains {cnt} assigned codepoints."
    if mc == "scripts":
        return f"Script characters used in writing systems associated with this block. Contains {cnt} assigned codepoints."
    if mc == "numbers":
        return f"Numeric characters and number-related symbols. Contains {cnt} assigned codepoints."
    if mc == "diacritics":
        return f"Combining marks and diacritics applied to base characters. Contains {cnt} assigned codepoints."
    if mc == "emoji":
        return f"Pictographic and emoji-style characters. Contains {cnt} assigned codepoints."
    if mc == "punctuation":
        return f"Punctuation marks and related typographic characters. Contains {cnt} assigned codepoints."
    if mc == "technical":
        return f"Technical, mathematical, or specialized notation symbols. Contains {cnt} assigned codepoints."
    return f"Symbol characters in the {n} block. Contains {cnt} assigned codepoints."

for e in entries:
    e["description"] = make_description(e)

# ---------- Sort: master_category, then range_start ----------
MC_ORDER = {"scripts": 0, "symbols": 1, "punctuation": 2, "numbers": 3,
            "diacritics": 4, "emoji": 5, "technical": 6}
entries.sort(key=lambda e: (MC_ORDER.get(e["master_category"], 99), e["range_start"]))

# ---------- Write YAML manually (no PyYAML dep) ----------
def yaml_str(s):
    if s == "":
        return '""'
    if re.search(r'[:\#\[\]\{\},&\*!\|>\'"%@`]', s) or s.startswith(("-", "?")) or s != s.strip() or "\n" in s:
        # Quote and escape
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return s

def yaml_char(ch):
    # always quote symbols to be safe (some chars confuse parsers)
    cp = ord(ch)
    if cp < 0x20 or cp == 0x7F:
        return f'"\\u{cp:04X}"'
    # Use double-quoted form with the literal char (UTF-8 yaml is fine).
    return '"' + ch.replace("\\", "\\\\").replace('"', '\\"') + '"'

OUT_YAML.parent.mkdir(parents=True, exist_ok=True)
with OUT_YAML.open("w", encoding="utf-8") as f:
    f.write("# data/categories.yaml\n")
    f.write("# Auto-generated catalog of Unicode blocks for page-creation decisions.\n")
    f.write("# Source: Unicode Character Database (UnicodeData.txt, Blocks.txt,\n")
    f.write("# DerivedAge.txt, Scripts.txt) at unicode.org/Public/UCD/latest/ucd/.\n")
    f.write("# Scope guard: excludes general categories Cc/Cs/Co and blocks where\n")
    f.write("# >90% of codepoints are unassigned. CJK Unified Ideograph blocks are\n")
    f.write("# listed but flagged 'bulk block, manual handling'.\n")
    f.write("# Sorted by master_category, then by range start.\n")
    f.write("categories:\n")
    for e in entries:
        f.write(f"  - id: {yaml_str(e['id'])}\n")
        f.write(f"    name: {yaml_str(e['name'])}\n")
        f.write(f"    slug: {yaml_str(e['slug'])}\n")
        f.write(f"    range: {yaml_str(e['range'])}\n")
        f.write(f"    master_category: {e['master_category']}\n")
        f.write(f"    description: {yaml_str(e['description'])}\n")
        f.write(f"    symbol_count: {e['symbol_count']}\n")
        if e["sample_symbols"]:
            f.write(f"    sample_symbols:\n")
            for ch in e["sample_symbols"]:
                f.write(f"      - {yaml_char(ch)}\n")
        else:
            f.write(f"    sample_symbols: []\n")
        # Always quote so YAML treats it as a string (e.g. "1.1" not float).
        uv = e["unicode_version"]
        f.write(f'    unicode_version: "{uv}"\n')
        if e["scripts"]:
            f.write(f"    scripts:\n")
            for s in e["scripts"]:
                f.write(f"      - {yaml_str(s)}\n")
        else:
            f.write(f"    scripts: []\n")
        f.write(f"    has_page: {'true' if e['has_page'] else 'false'}\n")
        f.write(f"    page_path: {yaml_str(e['page_path']) if e['page_path'] else 'null'}\n")
        f.write(f"    notes: {yaml_str(e['notes'])}\n")

# ---------- Summary ----------
from collections import Counter
mc_counts = Counter(e["master_category"] for e in entries)
print(f"Wrote {len(entries)} entries to {OUT_YAML}")
print("By master_category:")
for mc in ["scripts", "symbols", "punctuation", "numbers", "diacritics", "emoji", "technical"]:
    print(f"  {mc}: {mc_counts.get(mc, 0)}")
print(f"\nSkipped {len(skipped)} blocks under scope guard:")
for nm, rg, reason in skipped:
    print(f"  - {nm} ({rg}): {reason}")
