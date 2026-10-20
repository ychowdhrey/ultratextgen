"""Shared definition of what is wrong on a symbol-lane page (`<lang>/symbol/<slug>/index.html`).

One definition, used by `scripts/check-symbol-pages.py` (gate), `scripts/audit-symbol-pages.py`
(whole-site dashboard) and `scripts/fix-faq-above-footer.py` (repair). Never restate a defect
anywhere else.

Defects (ids are stable; a finding names the id and the 1-based source line):

  faq-after-footer       the FAQ block is rendered after </footer>. The footer is generated and sits
                         above the last screen; a FAQ below it is unread and below the ad/footer links.
                         Keyed on the FIRST .faq-item / <details>, never on id="faq" (an id-keyed first
                         version of this check found 79 of the 263 pages that had the defect).
  tile-glyph-mismatch    a .symbol-tile whose data-symbol differs from the glyph it shows, or from the
                         code point its own label / aria-label states (U+XXXX).
  unassigned-copy        a tile copies a code point that is not assigned in the pinned Unicode data
                         (data/unicode_assigned_ranges.json), unless the tile carries data-provisional.
  double-escaped-entity  `&amp;amp;name;` outside an intentional entity demo: it shows the literal
                         text `&amp;name;` instead of `&name;`.
  alt-code-mismatch      `Alt+NNN` that does not decode (CP437 for 1-3 digits, CP1252 with a leading 0)
                         to any glyph the page copies.
Informational only (audit, never gates; precision not yet proven on every locale):
  title-promise          the title/meta promises HTML entities / CSS / Alt codes / a typing method that
                         the body does not contain.
"""
import json, os, re, html as htmlmod

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CP437_GFX = "\u0000☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼"

TILE_RE = re.compile(r'<button\b([^>]*\bsymbol-tile\b[^>]*)>(.*?)</button>', re.S)
ATTR_RE = r'%s="([^"]*)"'
UPLUS = re.compile(r"U\+([0-9A-Fa-f]{4,6})")


def is_symbol_page(rel):
    return bool(re.fullmatch(r"(?:[a-z-]+/)?symbol/[^/]+/index\.html", rel))


def load_assigned():
    p = os.path.join(ROOT, "data", "unicode_assigned_ranges.json")
    d = json.load(open(p, encoding="utf-8"))
    return d["version"], [(a, b) for a, b in d["ranges"]]


def assigned(cp, ranges):
    lo, hi = 0, len(ranges) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        a, b = ranges[mid]
        if cp < a:
            hi = mid - 1
        elif cp > b:
            lo = mid + 1
        else:
            return True
    return False


_EMOJI_PRESENTATION = None


def is_default_emoji(ch):
    """True when the character has Emoji_Presentation=Yes (drawn as an emoji by default). Ranges from
    Unicode emoji-data.txt, pinned here as the blocks that hold such characters; used only to decide which
    typing route (emoji picker vs Alt code) a page can honestly offer."""
    cp = ord(ch)
    return (0x1F300 <= cp <= 0x1FAFF) or cp in (0x231A, 0x231B, 0x23E9, 0x23EA, 0x23EB, 0x23EC, 0x23F0, 0x23F3, 0x25FD, 0x25FE, 0x2614, 0x2615, 0x267F, 0x2693, 0x26A1, 0x26AA, 0x26AB, 0x26BD, 0x26BE, 0x26C4, 0x26C5, 0x26CE, 0x26D4, 0x26EA, 0x26F2, 0x26F3, 0x26F5, 0x26FA, 0x26FD, 0x2705, 0x270A, 0x270B, 0x2728, 0x274C, 0x274E, 0x2753, 0x2754, 0x2755, 0x2757, 0x2795, 0x2796, 0x2797, 0x27B0, 0x27BF, 0x2B1B, 0x2B1C, 0x2B50, 0x2B55) or (0x2648 <= cp <= 0x2653)


def strip_vs(s):
    return "".join(c for c in s if ord(c) not in (0xFE0E, 0xFE0F))


def line_at(src, pos):
    return src.count("\n", 0, pos) + 1


def faq_block(src):
    """(start, end) of the FAQ block after </footer>, including a directly preceding <!-- FAQ --> comment, or None."""
    fo = src.find("</footer>")
    if fo < 0:
        return None
    m = re.search(r'class="faq-item"|<details\b', src[fo:])
    if not m:
        return None
    first = fo + m.start()
    sec = src.rfind("<section", fo, first)
    if sec < 0:
        return None
    end = src.find("</section>", first)
    if end < 0:
        return None
    end += len("</section>")
    c = re.search(r"<!--\s*FAQ[^>]*-->\s*$", src[max(0, sec - 80):sec])
    start = sec - (len(c.group(0)) if c else 0)
    # the footer opens with a marker comment owned by the page template; the block moves above it
    return start, end


def move_faq_above_footer(src):
    """Return (new_src, moved?). Idempotent."""
    blk = faq_block(src)
    if not blk:
        return src, False
    s, e = blk
    chunk = src[s:e].strip("\n") + "\n\n"
    rest = src[:s].rstrip("\n") + "\n\n" + src[e:].lstrip("\n")
    ft = rest.find("<footer")
    # place before the comment line directly above <footer> if there is one (e.g. <!-- FOOTER -->)
    before = rest[:ft]
    m = re.search(r"(<!--[^>]*-->\s*)$", before)
    at = ft - (len(m.group(1)) if m else 0)
    return rest[:at] + chunk + rest[at:], True


def check_page(rel, src, ranges, version):
    """-> list of (defect_id, line, detail)."""
    out = []
    # faq-after-footer
    blk = faq_block(src)
    if blk:
        out.append(("faq-after-footer", line_at(src, blk[0]), "FAQ block starts below </footer>"))
    # tiles
    glyphs = set()
    for m in TILE_RE.finditer(src):
        attrs, inner = m.group(1), m.group(2)
        ds = re.search(ATTR_RE % "data-symbol", attrs)
        if not ds:
            continue
        sym = htmlmod.unescape(ds.group(1))
        glyphs.add(strip_vs(sym))
        ln = line_at(src, m.start())
        vis = htmlmod.unescape(re.sub(r"<[^>]+>", "", inner)).strip()
        if sym.strip() and vis and not strip_vs(vis).startswith(strip_vs(sym)) and strip_vs(vis) != strip_vs(sym):
            out.append(("tile-glyph-mismatch", ln, f"data-symbol {sym!r} but the tile shows {vis[:20]!r}"))
        label = " ".join(htmlmod.unescape(x.group(1)) for x in re.finditer(r'aria-label="([^"]*)"', attrs))
        after = src[m.end():m.end() + 400]
        fl = re.match(r'\s*<span class="flag-label">(.*?)</span>', after, re.S)
        if fl:
            label += " " + htmlmod.unescape(re.sub(r"<[^>]+>", "", fl.group(1)))
        stated = [int(x, 16) for x in UPLUS.findall(label)]
        actual = [ord(c) for c in strip_vs(sym)]
        if stated and len(stated) == len(actual) and stated != actual:
            out.append(("tile-glyph-mismatch", ln, "tile copies " + " ".join("U+%04X" % c for c in actual) + " but its label states " + " ".join("U+%04X" % c for c in stated)))
        provisional = "data-provisional" in attrs
        for c in actual:
            if c >= 0x80 and not assigned(c, ranges) and not provisional:
                out.append(("unassigned-copy", ln, "U+%04X is not assigned in Unicode %s (add data-provisional only while the page states that status)" % (c, version)))
                break
    # double escaped entities
    for m in re.finditer(r"&amp;amp;((?!amp;)[a-zA-Z]{2,8});", src):
        out.append(("double-escaped-entity", line_at(src, m.start()), m.group(0)))
    # alt codes
    text = re.sub(r"<script.*?</script>|<style.*?</style>", " ", src, flags=re.S)
    text = htmlmod.unescape(re.sub(r"<[^>]+>", " ", text))
    seen = set()
    for m in re.finditer(r"Alt\s*[+＋]?\s*(\d{2,5})\b", text, re.I):
        code = m.group(1)
        if code in seen:
            continue
        seen.add(code)
        n = int(code)
        try:
            if code.startswith("0") and len(code) >= 4:
                got = bytes([n]).decode("cp1252") if n < 256 else None
            elif n < 256:
                got = CP437_GFX[n] if 0 < n < 32 else ("⌂" if n == 127 else bytes([n]).decode("cp437"))
            else:
                got = None
        except Exception:
            got = None
        if got is not None and got not in glyphs and not any(got == g or (len(g) == 1 and __import__("unicodedata").normalize("NFKC", got) == __import__("unicodedata").normalize("NFKC", g)) for g in glyphs):
            ln = line_at(src, src.find(m.group(0))) if m.group(0) in src else 0
            out.append(("alt-code-mismatch", ln, f"Alt+{code} decodes to {got!r}, which this page does not copy"))
    return out
