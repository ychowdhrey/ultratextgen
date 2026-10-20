#!/usr/bin/env python3
"""Add a "how to type + codes" table to symbol pages that have none. Idempotent, deterministic.

  python3 scripts/fix-symbol-codes-table.py --check           # list pages that lack the table (exit 1 if any)
  python3 scripts/fix-symbol-codes-table.py --write [PATH...] # insert it (every symbol page, or only these)

A page qualifies when its primary tile (hero tile, else first tile) is ONE code point and the page carries no
codes table yet (no `content: "\\XXXX"` row and no HTML-entity row). Rows, each derived from the code point so
it cannot be wrong for the page it sits on:
  * Windows Alt code   only when the code decodes to this character in CP1252 (`Alt+0NNN`) or in BOTH CP437 and
                       CP850 (`Alt+NNN`); an OEM code that differs by code page is never printed.
  * Word (Windows)     hex code + Alt+X (BMP characters).
  * Windows / Mac      emoji pictographs only: the emoji picker (`Win+.`, `Control+Command+Space`).
  * HTML entity        named reference when HTML 4 defines one, plus the numeric reference.
  * CSS content        the escape.
Labels come from each locale's own existing typing sections (scripts/lib/symbol_code_labels.json), never
translated on the fly. Definition of "qualifies": scripts/lib/symbol_pages.py.
"""
import glob, html, html.entities, json, os, re, sys, unicodedata
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import symbol_pages as sp

ROOT = sp.ROOT
LABELS = json.load(open(os.path.join(ROOT, "scripts", "lib", "symbol_code_labels.json"), encoding="utf-8"))
TILE_FIRST = re.compile(r'<button\b[^>]*\bclass="[^"]*symbol-(?:hero-)?tile[^"]*"[^>]*\bdata-symbol="([^"]*)"')


def primary_symbol(src):
    m = re.search(r'<button\b[^>]*symbol-hero-tile[^>]*\bdata-symbol="([^"]*)"', src) or TILE_FIRST.search(src)
    return html.unescape(m.group(1)) if m else None


def has_codes_table(src):
    return bool(re.search(r'content:\s*"\\[0-9A-Fa-f]{4,6}"', src) or re.search(r"<code>&amp;#?[A-Za-z0-9]+;</code>", src))


def alt_code(ch):
    cp = ord(ch)
    try:
        b = ch.encode("cp1252")
        if len(b) == 1 and b[0] >= 0x80:
            return "Alt+%04d" % b[0]
    except UnicodeEncodeError:
        pass
    try:
        b437, b850 = ch.encode("cp437"), ch.encode("cp850")
        if len(b437) == 1 and b437 == b850 and 0x20 <= b437[0] < 0x7F:
            return "Alt+%d" % b437[0]
    except UnicodeEncodeError:
        pass
    return None


def named_entity(ch):
    for name, cp in html.entities.name2codepoint.items():
        if cp == ord(ch):
            return "&" + name + ";"
    return None


def rows_for(ch, labels):
    cp = ord(ch)
    emoji = "emoji" in unicodedata.name(ch, "").lower() or cp >= 0x1F000 or sp.is_default_emoji(ch)
    esc = lambda s: s.replace("&", "&amp;")
    rows = []
    if emoji:
        rows.append(("Windows", "<code>Win+.</code>"))
        rows.append((labels["mac"], "<code>Control+Command+Space</code>"))
    else:
        a = alt_code(ch)
        if a:
            rows.append((labels["alt"], "<code>%s</code>" % a))
        if cp <= 0xFFFF:
            rows.append(("Word (Windows)", "<code>%04X</code> \u2192 <code>Alt+X</code>" % cp))
    ent = named_entity(ch)
    num = "&#%d;" % cp
    rows.append((labels["html"], ("<code>%s</code> / <code>%s</code>" % (esc(ent), esc(num))) if ent else "<code>%s</code>" % esc(num)))
    rows.append((labels["css"], '<code>content: "\\%s"</code>' % ("%04X" % cp if cp <= 0xFFFF else "%06X" % cp)))
    return rows


def block(rows, labels):
    t = '<!-- TYPING -->\n<section class="editorial-section">\n  <span class="article-section-label">%s</span>\n  <h2>%s</h2>\n' % (labels["label"], labels["h2"])
    t += '  <div class="data-table-wrap">\n    <table class="data-table">\n      <thead>\n        <tr><th>%s</th><th>%s</th></tr>\n      </thead>\n      <tbody>\n' % (labels["th_method"], labels["th_input"])
    for a, b in rows:
        t += "        <tr><td>%s</td><td>%s</td></tr>\n" % (a, b)
    return t + "      </tbody>\n    </table>\n  </div>\n</section>\n\n<div class=\"section-divider\"></div>\n\n"


def insert(src, blk):
    m = re.search(r"<!-- (?:SOURCES|FAQ|CTA)[^>]*-->", src)
    if not m:
        return None
    return src[: m.start()] + blk + src[m.start():]


def qualifies(rel, src):
    if not sp.is_symbol_page(rel) or has_codes_table(src):
        return None
    ch = primary_symbol(src)
    if not ch:
        return None
    ch = sp.strip_vs(ch)
    if len(ch) != 1 or ord(ch) < 0x80 and not ch.isprintable() or not sp.assigned(ord(ch), sp.load_assigned()[1]):
        return None
    if unicodedata.category(ch) in ("Cf", "Zs", "Cc", "Mn") or ord(ch) in (0x2800, 0x3164):
        return None
    return ch


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    rels = args or sorted(os.path.relpath(p, ROOT) for p in glob.glob(os.path.join(ROOT, "**/symbol/*/index.html"), recursive=True))
    n = w = skipped = 0
    for rel in rels:
        loc = rel.split("/")[0] if not rel.startswith("symbol/") else "en"
        src = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        ch = qualifies(rel, src)
        if ch is None:
            continue
        emoji = "emoji" in unicodedata.name(ch, "").lower() or ord(ch) >= 0x1F000 or sp.is_default_emoji(ch)
        if emoji and "--emoji" not in sys.argv and not args:
            continue   # emoji are typed from the picker; the table is added to them only on request (--emoji or explicit paths)
        labels = LABELS.get(loc)
        if not labels:
            skipped += 1
            continue
        n += 1
        if "--write" in sys.argv:
            new = insert(src, block(rows_for(ch, labels), labels))
            if new is None:
                print("no insertion point:", rel)
                continue
            open(os.path.join(ROOT, rel), "w", encoding="utf-8").write(new)
            w += 1
        elif "--check" in sys.argv:
            print("no codes table:", rel)
    print(f"{n} page(s) lack the table; {w} written; {skipped} skipped (no labels for the locale)")
    sys.exit(1 if ("--check" in sys.argv and n) else 0)
