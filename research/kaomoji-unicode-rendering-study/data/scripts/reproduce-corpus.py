#!/usr/bin/env python3
"""Rebuild the list of kaomoji faces from a checkout of the site, with their Unicode properties.

Usage: python3 reproduce-corpus.py <site checkout> [--ucd <folder with the Unicode 18.0.0 files listed in source-files.csv>] [--out <folder>] [--no-pin]
Writes faces-all-columns.csv, codepoints.csv, occurrences.csv, exclusions.csv and extraction-manifest.json to the output folder (default ./out).
--no-pin lets it run on a commit other than the one the study used; the face list was identical on the commits we tried.

What counts as a face (a copy tile is a button whose text is what gets copied):
  tile-dedicated            a tile on a kaomoji collection page (slug contains 'kaomoji', or its language equivalent)
  tile-embedded             a tile in a section whose id contains kaomoji, kamoji or emoticon, on any other page
  tile-facey-outside-lane   any other tile that is face-shaped by structure: 3+ characters, a bracket pair (or U+0361/U+035C), at least
                            one character that is not a bracket, no emoji picture, no run of 3+ Latin letters or small-capital,
                            modifier-letter or circled-letter words, no mathematical alphanumerics
  generator-preset          the generator's 16 starter faces, assembled with the generator's own formula
  decoder-named             the decoder dictionary's named faces
Pure-emoji tiles are left out and listed in exclusions.csv. Faces the generator could combine but nobody published are not counted.
"""
import csv, hashlib, html, json, os, re, subprocess, sys, unicodedata
from html.parser import HTMLParser
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ucd_reader import UCD

PIN = "761bda3b9426b62c61c355a56684c3a79e025c13"
HERE = os.path.dirname(os.path.abspath(__file__))
def opt(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default
ROOT = sys.argv[1]
PIN = opt("--pin", PIN)
UCD_DIR = opt("--ucd", "ucd-18.0.0")   # folder holding the Unicode 18.0.0 files (see source-files.csv)
FLAT_OUT = opt("--out", "out")
DUMP_JS = opt("--dump-js", os.path.join(HERE, "dump-kaomoji-data.mjs"))
head = subprocess.run(["git", "-C", ROOT, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
if head != PIN and "--no-pin" not in sys.argv: sys.exit(f"site checkout is at {head}, pinned {PIN} (pass --no-pin to run on another commit)")
dirty = subprocess.run(["git", "-C", ROOT, "status", "--porcelain", "--untracked-files=no"], capture_output=True, text=True).stdout.strip()
if dirty: sys.exit("site checkout has tracked modifications")
UCD_DIR, FLAT_OUT, DUMP_JS = [os.path.abspath(x) if x else x for x in (UCD_DIR, FLAT_OUT, DUMP_JS)]
os.chdir(ROOT)
u = UCD(UCD_DIR)
LOCALES = sorted(f[:-5] for f in os.listdir("locales") if f.endswith(".json"))
REPO = "ychowdhrey/ultratextgen"
SKIP = ("node_modules", "/.git", "./docs", "./research", "./reports")

class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.st = []; s.tiles = []; s.cur = None; s.title = ""; s._t = False
    def handle_starttag(s, tag, a):
        a = dict(a)
        if tag == "title": s._t = True
        if tag == "section": s.st.append(a.get("id", ""))
        if tag == "button" and "data-symbol" in a and "symbol-tile" in (a.get("class") or "").split():
            s.cur = {"sym": a["data-symbol"], "aria": a.get("aria-label", ""), "sec": s.st[-1] if s.st else "", "text": ""}
    def handle_data(s, d):
        if s._t: s.title += d
        if s.cur is not None: s.cur["text"] += d
    def handle_endtag(s, tag):
        if tag == "title": s._t = False
        if tag == "button" and s.cur is not None: s.tiles.append(s.cur); s.cur = None
        if tag == "section" and s.st: s.st.pop()

def locale_of(path):
    f = path.split("/")[0]
    return f if f in LOCALES and f != "en" and os.path.isdir(f) else "en"

pages = {}
for root, dirs, files in os.walk("."):
    dirs.sort()
    if any(x in root for x in SKIP): continue
    if "index.html" in files:
        p = os.path.join(root, "index.html")[2:]
        pp = P(); pp.feed(open(p, encoding="utf-8").read()); pages[p] = pp

dedicated = {p for p in pages if re.search(r"(^|/)library/[^/]*kaomoji[^/]*/index\.html$", p)}
# locale equivalents whose slug lacks 'kaomoji': hreflang from dedicated pages, and page specs
for p in sorted(dedicated):
    for m in re.finditer(r'hreflang="[^"]+" href="https://ultratextgen\.com/([^"]+)/"', open(p, encoding="utf-8").read()):
        q = m.group(1) + "/index.html"
        if q in pages and "/library/" in q: dedicated.add(q)
spec_dir = "data/library_page_specs"
for sp in sorted(os.listdir(spec_dir)) if os.path.isdir(spec_dir) else []:
    if "kaomoji" in sp and sp.endswith(".json"):
        try: d = json.load(open(os.path.join(spec_dir, sp), encoding="utf-8"))
        except Exception: continue
        lc = next((l for l in LOCALES if sp.startswith(l + "-")), None)
        if lc and d.get("slug"):
            q = f"{lc}/library/{d['slug']}/index.html"
            if q in pages: dedicated.add(q)
EMB = re.compile(r"kaomoji|kamoji|emoticon", re.I)
EMOJI_RX = re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F]")
OPEN_B, CLOSE_B = set("([{（［｛｢ʕʢ༼"), set(")]}）］｝｣ʔʡ༽")   # quote brackets 「」『』 and angle brackets are deliberately not face brackets
LETTER_RUN = re.compile(r"[A-Za-z\u00C0-\u00FF]{3,}|[\u1D00-\u1D2B\uA730-\uA7AF\u0299\u0262\u029C\u029F\u0274\u0280\u028F\u1D43-\u1D5B\u02B0-\u02B8\u02E1-\u02E3\u2460-\u24E9]{2,}")   # words, small-caps/modifier-letter words, circled letters
MATH_ALNUM = re.compile("[\U0001D400-\U0001D7FF]")
def facey(sym):
    """Structural face test (v1.1): >=3 scalars; a bracket pair (or U+0361/U+035C); at least one non-bracket non-space
    scalar; no emoji presentation; no run of 3+ Latin letters (names/words); no mathematical alphanumerics (styled text)."""
    if len(sym) < 3 or EMOJI_RX.search(sym) or LETTER_RUN.search(sym) or MATH_ALNUM.search(sym): return False
    pair = any(c in OPEN_B for c in sym) and any(c in CLOSE_B for c in sym)
    mark = "\u0361" in sym or "\u035c" in sym
    body = [c for c in sym if not c.isspace() and c not in OPEN_B and c not in CLOSE_B]
    return (pair or mark) and bool(body)
def pure_emoji(sym):
    ns = [c for c in sym if not c.isspace()]
    return bool(ns) and all((u.extpict.get(ord(c)) or ord(c) in (0x200D, 0xFE0F) or u.info(ord(c))[1] in ("Mn", "Cf")) for c in ns) and any(u.extpict.get(ord(c)) for c in ns)

occ = []; exclusions = []
def add(face, source_type, path, locale, section, label, method, text_eq, extra=""):
    occ.append({"face_raw": face, "source_type": source_type, "source_path": path, "locale": locale, "section": section,
                "display_label": label, "extraction_method": method, "visible_text_equals_data_symbol": text_eq,
                "source_url": f"https://github.com/{REPO}/blob/{PIN}/{path}"})
excl_sections = {}
for p in sorted(pages):
    pg = pages[p]; loc = locale_of(p)
    for t in pg.tiles:
        sym = t["sym"]
        if p in dedicated: st = "tile-dedicated"
        elif EMB.search(t["sec"]): st = "tile-embedded"
        elif facey(sym): st = "tile-facey-outside-lane"
        else:
            excl_sections[(p, t["sec"])] = excl_sections.get((p, t["sec"]), 0) + 1; continue
        if pure_emoji(sym): exclusions.append({"extracted_candidate": sym, "exclusion_reason": "pure emoji tile (not a text face), v1.1", "source_path": p, "reviewer": "script"}); continue
        if sym == "": exclusions.append({"extracted_candidate": "", "exclusion_reason": "empty data-symbol", "source_path": p, "reviewer": "script"}); continue
        add(sym, st, p, loc, t["sec"], t["aria"], "html-parse:button.symbol-tile[data-symbol]", str(t["text"].strip() == sym.strip()))
for (p, sec), n in sorted(excl_sections.items()):
    # section-level exclusion record: tiles on pages/sections outside the kaomoji lane
    exclusions.append({"extracted_candidate": f"[{n} tiles in section '{sec}']", "exclusion_reason": "tile section outside kaomoji lane (not dedicated page, section id lacks kaomoji|kamoji|emoticon)", "source_path": p, "reviewer": "script"})

js = json.loads(subprocess.run(["node", DUMP_JS, "."], capture_output=True, text=True, check=True).stdout)
for pr in js["presets"]:
    add(pr["face"], "generator-preset", "js/kaomoji/kaomojiData.js", "en", "PRESETS", pr["label"], "node-vm:evaluate + generator assembleFrom formula", "")
for n in js["named"]:
    add(n["face"], "decoder-named", "js/kaomoji/kaomojiDict.js", "en", "NAMED", n["name"], "node-vm:evaluate NAMED", "")

# ---- occurrence ids, face table ----
def fid(s): return "F-" + hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]
occ.sort(key=lambda o: (o["source_type"], o["source_path"], o["section"], o["display_label"], o["face_raw"]))
seq = {}
for o in occ:
    o["face_id"] = fid(o["face_raw"]); o["source_repo"] = REPO; o["source_sha"] = PIN
    k = o["face_id"]; seq[k] = seq.get(k, 0)
    o["occurrence_id"] = f"O-{o['face_id'][2:]}-{seq[k]:03d}"; seq[k] += 1
    o["expression_raw"] = o.pop("face_raw")
OCC_COLS = ["occurrence_id", "face_id", "expression_raw", "source_repo", "source_sha", "source_path", "locale", "section", "display_label", "extraction_method", "source_type", "visible_text_equals_data_symbol", "source_url"]

ENT = re.compile(r"&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);")
faces = {}; cprows = []
for o in occ:
    f = faces.setdefault(o["face_id"], {"raw": o["expression_raw"], "occ": 0, "types": set(), "locales": set(), "en_pages": set(), "pages": set()})
    f["occ"] += 1; f["types"].add(o["source_type"]); f["locales"].add(o["locale"]); f["pages"].add(o["source_path"])
    if o["locale"] == "en" and o["source_type"].startswith("tile"): f["en_pages"].add(o["source_path"])

def width(cp, ambiguous_wide):
    info = u.info(cp)
    if info[1] in ("Mn", "Me", "Cf") or info[2] > 0 or u.default_ignorable.get(cp): return 0
    e = u.eaw.get(cp)
    return 2 if e in ("W", "F") or (e == "A" and ambiguous_wide) else 1

def nfkc_group(s): return unicodedata.normalize("NFKC", s)  # NOTE: Python's unicodedata is 15.1; used only for equivalence grouping, flagged
FACE_COLS = ["face_id", "expression_raw", "codepoint_count", "grapheme_count", "utf16_units", "utf8_bytes", "nfc_changed", "nfkc_changed", "nfc_group_id", "nfkc_group_id",
             "unicode_version", "source_occurrence_count", "source_type", "locale_count", "en_page_count", "page_count", "content_class_auto",
             "has_literal_entity_text", "has_leading_trailing_space", "has_combining", "has_variation_selector", "has_zwj", "has_astral",
             "has_private_use", "has_unassigned", "has_default_ignorable", "has_extended_pictographic", "has_ambiguous_eaw", "scripts_noncommon",
             "script_count_noncommon", "cols_ambiguous_narrow", "cols_ambiguous_wide", "annotation_status"]
face_rows = []
for fid_, f in sorted(faces.items()):
    s = f["raw"]; cps = [ord(c) for c in s]
    nfc = unicodedata.normalize("NFC", s); nfkc = unicodedata.normalize("NFKC", s)
    scripts = []; flags = dict(comb=0, vs=0, zwj=0, ast=0, pua=0, una=0, di=0, ep=0, amb=0)
    for i, cp in enumerate(cps):
        name, gc, ccc, bidi = u.info(cp); sc = u.script.get(cp); scx = u.scx.get(cp) or ""
        eaw = u.eaw.get(cp)
        if gc in ("Mn", "Me", "Mc"): flags["comb"] += 1
        if 0xFE00 <= cp <= 0xFE0F or 0xE0100 <= cp <= 0xE01EF: flags["vs"] += 1
        if cp == 0x200D: flags["zwj"] += 1
        if cp > 0xFFFF: flags["ast"] += 1
        if gc == "Co": flags["pua"] += 1
        if gc == "Cn": flags["una"] += 1
        if u.default_ignorable.get(cp): flags["di"] += 1
        if u.extpict.get(cp): flags["ep"] += 1
        if eaw == "A": flags["amb"] += 1
        if sc not in ("Common", "Inherited", "Unknown"): scripts.append(sc)
        cprows.append({"face_id": fid_, "position": i, "scalar_hex": f"U+{cp:04X}", "char": chr(cp), "unicode_name": name, "general_category": gc, "script": sc,
                       "script_extensions": scx, "unicode_block": u.block.get(cp), "east_asian_width": eaw, "combining_class": ccc,
                       "default_ignorable": bool(u.default_ignorable.get(cp)), "variation_selector": 0xFE00 <= cp <= 0xFE0F, "bidi_class": bidi,
                       "grapheme_break": u.gcb.get(cp), "extended_pictographic": bool(u.extpict.get(cp)), "display_role": "", "role_confidence": ""})
    gr = u.graphemes(s)
    nonspace = [c for c in s if not c.isspace()]
    if all(ord(c) < 128 for c in s): cc = "ascii_only"
    elif flags["ep"] and all(u.extpict.get(ord(c)) or u.info(ord(c))[1] in ("Mn", "Cf") or ord(c) in (0x200D, 0xFE0F) for c in nonspace): cc = "emoji_only"
    elif flags["ep"]: cc = "emoji_mixed"
    else: cc = "non_ascii_text"
    ss = sorted(set(scripts))
    face_rows.append({"face_id": fid_, "expression_raw": s, "codepoint_count": len(cps), "grapheme_count": len(gr),
        "utf16_units": sum(2 if c > 0xFFFF else 1 for c in cps), "utf8_bytes": len(s.encode("utf-8")), "nfc_changed": nfc != s, "nfkc_changed": nfkc != s,
        "nfc_group_id": fid(nfc), "nfkc_group_id": fid(nfkc), "unicode_version": u.version, "source_occurrence_count": f["occ"],
        "source_type": "+".join(sorted(f["types"])), "locale_count": len(f["locales"]), "en_page_count": len(f["en_pages"]), "page_count": len(f["pages"]),
        "content_class_auto": cc, "has_literal_entity_text": bool(ENT.search(s)), "has_leading_trailing_space": s != s.strip(),
        "has_combining": flags["comb"] > 0, "has_variation_selector": flags["vs"] > 0, "has_zwj": flags["zwj"] > 0, "has_astral": flags["ast"] > 0,
        "has_private_use": flags["pua"] > 0, "has_unassigned": flags["una"] > 0, "has_default_ignorable": flags["di"] > 0,
        "has_extended_pictographic": flags["ep"] > 0, "has_ambiguous_eaw": flags["amb"] > 0, "scripts_noncommon": "|".join(ss), "script_count_noncommon": len(ss),
        "cols_ambiguous_narrow": sum(width(c, False) for c in cps), "cols_ambiguous_wide": sum(width(c, True) for c in cps), "annotation_status": "auto-unreviewed"})

def write(path, cols, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, lineterminator="\n"); w.writeheader()
        for r in rows: w.writerow({c: r.get(c, "") for c in cols})
def dest(flat): return os.path.join(FLAT_OUT, flat)
write(dest("occurrences.csv"), OCC_COLS, occ)
write(dest("faces-all-columns.csv"), FACE_COLS, face_rows)
write(dest("codepoints.csv"), list(cprows[0].keys()), cprows)
write(dest("exclusions.csv"), ["extracted_candidate", "exclusion_reason", "source_path", "reviewer"], exclusions)
manifest = {"site_repo": REPO, "site_commit": head, "unicode_version": u.version,
            "locales": LOCALES, "dedicated_pages": len(dedicated), "pages_with_tiles": sum(1 for p in pages if pages[p].tiles),
            "occurrences": len(occ), "unique_faces_A": len(face_rows), "codepoint_rows": len(cprows),
            "by_source_type": {k: sum(1 for o in occ if o["source_type"] == k) for k in sorted({o["source_type"] for o in occ})},
            "node": subprocess.run(["node", "-v"], capture_output=True, text=True).stdout.strip(), "python": sys.version.split()[0]}
mp = dest("extraction-manifest.json")
json.dump(manifest, open(mp, "w"), indent=1, sort_keys=True); open(mp, "a").write("\n")
print(json.dumps(manifest, indent=1))
