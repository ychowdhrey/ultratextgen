#!/usr/bin/env python3
"""
generate-printables-previews.py — one indexable *sheet* preview per printables page.

Why this exists
---------------
Bing Images records impressions for the printables pages and no clicks. The
only indexed image per page was the branded OG card (assets/og/printables-*.png),
and the hero SVG ships aria-hidden with a null alt, so a teacher searching
"printable block letters" saw a purple brand card rather than the letters.
This script renders what the page actually prints — the hollow block letter
A, the bubble alphabet grid, a dotted cursive practice row, "Emma" on ruled
tracing lines — as a 1200x900 PNG with a descriptive filename, so each page
has one image worth indexing. scripts/wire-printables-previews.py inserts the
<img> into the page, and scripts/update-sitemap.js declares it.

What it renders, and from what
------------------------------
Every page's own `window.UTG_PRINTABLE` config is read (font family, stroke
width, letter spacing, character set, the page's demo name) and the sheet is
drawn from those values with the same geometry js/printables/printablesEngine.js
uses: outlineSVG()'s white-fill / round-joined dark stroke / paint-order
stroke, traceWordSVG()'s three ruled guides and dash specs, the dot-to-dot
engine's outer-silhouette numbered loop, flagSVG()'s dashed pennants. The
Unicode glyph families (cursive / calligraphy) go through the same registry
maps in styles.js the engine renders with. Nothing here is a second copy of
page copy: the image is text-free apart from the letters and the cred line.

Build-time only — the same line generate-site-art.py already draws: cairosvg
rasterises the SVG here, on a developer machine or in CI, and the site ships
the PNG. No runtime renderer, no server, no font binary in the repo.

Fonts
-----
The engine uses Google Fonts (Archivo Black, Fredoka, Baloo 2, Quicksand,
Playwrite DE, Playfair Display, Plus Jakarta Sans). They are NOT installed on
a stock container and must NEVER be committed (.ttf/.otf/.woff are ignored
repo-wide). The script keeps a cache OUTSIDE the repository (`--font-dir`,
default ~/.cache/utg-printables-fonts) and can fill it with `--fetch-fonts`,
which asks fonts.googleapis.com for the static TTF of each family. A family
that is still missing makes the run refuse (exit 2) unless
`--allow-font-fallback` is passed, in which case fontconfig substitutes an
installed sans and the run says so per family — a preview drawn in DejaVu
Sans is not the sheet the page prints, and silently shipping it would be the
"tofu with no error" failure generate-site-art.py documents.

Usage
-----
    python3 scripts/generate-printables-previews.py --only printables-block-letters
    python3 scripts/generate-printables-previews.py --all --fetch-fonts
    python3 scripts/generate-printables-previews.py --all --dry-run
    python3 scripts/generate-printables-previews.py --list

A bare run is refused (exit 2), like generate-site-art.py. `--only` matches
the slug by PREFIX (`printables-block-letters` also matches every
`printables-block-letters-letter-*` spoke). A page whose PNG already exists is
skipped unless `--force`, so a run only ever fills gaps.
"""
from __future__ import annotations

import argparse
import html as htmlmod
import io
import json
import math
import os
import re
import subprocess
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT_DIR = os.path.join(REPO, "assets", "printables-previews")
OUT_URL = "/assets/printables-previews"
W, H = 1200, 900
INK = "#1a1a2e"          # printablesEngine.js INK
GHOST = "#c3c9d6"        # traceWordSVG "faded" fill
GUIDE = "#9aa2b1"
GUIDE_MID = "#c7ccd8"
HINT = "#c7bdf0"         # dot-to-dot dashed hint polygon
TRACE_GRAY = "#cbd5e1"   # .cursive-print-trace colour
RULE_DOT = "#94a3b8"     # .cursive-print-row dotted border
CRED = "#8b93a7"
CRED_FONT = "Liberation Sans, DejaVu Sans, sans-serif"
MATH_FONT = "Noto Sans Math"

# Google Fonts the engine's page configs name, keyed by CSS family. `css2` is
# the fonts.googleapis.com query; `bold` says whether a 700 face exists (a
# single-weight family is requested at 400 so fontconfig never synthesises a
# bold that would double the outline's stroke).
GOOGLE_FONTS = {
    "Archivo Black": {"css2": "Archivo+Black", "bold": False},
    "Fredoka": {"css2": "Fredoka:wght@700", "bold": True},
    "Baloo 2": {"css2": "Baloo+2:wght@700", "bold": True},
    "Quicksand": {"css2": "Quicksand:wght@700", "bold": True},
    "Plus Jakarta Sans": {"css2": "Plus+Jakarta+Sans:wght@700", "bold": True},
    "Playwrite DE Grund": {"css2": "Playwrite+DE+Grund", "bold": False},
    "Playwrite DE SAS": {"css2": "Playwrite+DE+SAS", "bold": False},
    "Playfair Display": {"css2": "Playfair+Display:wght@700", "bold": True},
}
SYSTEM_FONTS = {
    MATH_FONT: "/usr/share/fonts/truetype/noto/NotoSansMath-Regular.ttf",
    "FreeSerif": "/usr/share/fonts/truetype/freefont/FreeSerif.ttf",
    "Liberation Sans": "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
}

# ------------------------------------------------------------------ pages

ENGINE_MARKERS = ("window.UTG_PRINTABLE", "crossStitchEngine.js", "monogramEngine.js")
LOCALE_DIRS = ("de", "es", "fr", "id", "it", "pl", "pt")


def esc(s):
    return htmlmod.escape(str(s), quote=True)


def slug_for(rel):
    """printables/block-letters/letter-a/index.html -> printables-block-letters-letter-a"""
    return rel[: -len("/index.html")].replace("/", "-")


def _js_str(s):
    """A JS string literal's body: id/printables/alfabet-spanyol writes its
    enye as "\\u00d1", so escapes are decoded rather than read as six
    characters."""
    if s is None or "\\" not in s:
        return s
    return re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), s).replace("\\'", "'").replace('\\"', '"')


def _cfg_str(cfg, key):
    m = re.search(r'\b%s\s*:\s*"([^"]*)"' % re.escape(key), cfg)
    return _js_str(m.group(1)) if m else None


def _cfg_num(cfg, key):
    m = re.search(r"\b%s\s*:\s*([\d.]+)" % re.escape(key), cfg)
    return float(m.group(1)) if m else None


def _first_family(font_css):
    """"'Archivo Black', 'Arial Black', sans-serif" -> "Archivo Black"."""
    if not font_css:
        return None
    first = font_css.split(",")[0].strip().strip("'\"")
    return first or None


def parse_page(rel):
    path = os.path.join(REPO, rel)
    with open(path, encoding="utf-8") as fh:
        h = fh.read()
    if not any(m in h for m in ENGINE_MARKERS):
        return None
    m = re.search(r"window\.UTG_PRINTABLE\s*=\s*(\{.*?\});\s*</script>", h, re.S)
    cfg = m.group(1) if m else ""
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", h, re.S)
    h1 = htmlmod.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h1.group(1)))).strip() if h1 else ""
    lang = re.search(r'<html[^>]*\blang="([^"]+)"', h)
    chars = re.search(r"\bchars\s*:\s*\[([^\]]*)\]", cfg)
    designer = re.search(r"\bdesigner\s*:\s*\{[^}]*?\bdemo\s*:\s*\"([^\"]*)\"", cfg, re.S)
    script_font = re.search(r'scriptOptions\s*:\s*\[\s*\{[^}]*?\bfont\s*:\s*"([^"]*)"', cfg, re.S)
    if m:
        engine = "printables"
    elif "crossStitchEngine.js" in h:
        engine = "cross-stitch"
    else:
        engine = "monogram"
    key = _cfg_str(cfg, "key") or ("cross-stitch-letters" if engine == "cross-stitch" else "monogram-maker")
    return {
        "rel": rel,
        "slug": slug_for(rel),
        "lang": (lang.group(1) if lang else "en").lower(),
        "h1": h1,
        "engine": engine,
        "key": key,
        "render": _cfg_str(cfg, "render") or "outline",
        "family": _first_family(_cfg_str(cfg, "font") or (script_font.group(1) if script_font else None)),
        "stroke": _cfg_num(cfg, "strokeWidth") or 9.0,
        "spacing": _cfg_num(cfg, "letterSpacing") or 0.0,
        "charset": _cfg_str(cfg, "charset") or "alpha",
        "chars": [_js_str(c) for c in re.findall(r'"([^"]+)"', chars.group(1))] if chars else None,
        "glyphStyle": _cfg_str(cfg, "glyphStyle") or "",
        "demo": (_cfg_str(cfg, "nameDemo") or _cfg_str(cfg, "genDemo") or _cfg_str(cfg, "bannerDemo")
                 or _cfg_str(cfg, "puzzleDemo") or (_js_str(designer.group(1)) if designer else None)),
        "initialChar": _cfg_str(cfg, "initialChar"),
    }


def discover_pages():
    """Every printables landing and spoke, EN and locale, that loads one of the
    three printables engines. Hubs (printables/index.html and each locale's
    printables index) load no engine and are excluded by that fact rather
    than by a hardcoded list."""
    rels = []
    for root, dirs, files in os.walk(os.path.join(REPO, "printables")):
        if "index.html" in files:
            rels.append(os.path.relpath(os.path.join(root, "index.html"), REPO))
    for lc in LOCALE_DIRS:
        for root, dirs, files in os.walk(os.path.join(REPO, lc)):
            if "index.html" in files:
                rels.append(os.path.relpath(os.path.join(root, "index.html"), REPO))
    pages = []
    for rel in sorted(rels):
        p = parse_page(rel)
        if p:
            pages.append(p)
    return pages


# ------------------------------------------------------------------ alt text

# English alt copy per family. {ch} is the spoke's character, {kind} is
# "letter" or "number", {demo} the page's own demo word. No em dashes: this
# is English page copy and data/em_dash_locale_policy.json bans them.
EN_ALT = {
    "block-letters": {
        "spoke": "Printable block {kind} {ch} stencil: hollow outline to print, trace and cut out",
        "landing": "Printable block letter alphabet A to Z and numbers 0 to 9: hollow stencil outlines on one sheet",
    },
    "bubble-letters": {
        "spoke": "Printable bubble {kind} {ch}: puffy hollow outline to print, trace and color in",
        "landing": "Printable bubble letter alphabet A to Z and numbers 0 to 9: rounded hollow outlines to color in",
    },
    "alphabet-coloring-pages": {
        "spoke": "{Kind} {ch} coloring page: large outline {kind} to print and color in",
        "landing": "Alphabet coloring pages A to Z and 0 to 9: outline letters to print and color in",
    },
    "dot-to-dot-alphabet": {
        "spoke": "{Kind} {ch} dot to dot: numbered dots to connect that reveal the {kind}",
        "landing": "Dot to dot alphabet: numbered dots that connect into each letter, A, B and C shown",
    },
    "cursive-alphabet": {
        "spoke": "Cursive {kind} {ch} practice sheet: uppercase and lowercase model with a lighter trace row",
        "landing": "Cursive alphabet practice sheet: model letters with traceable copies on ruled rows",
    },
    "calligraphy-alphabet": {
        "spoke": "Calligraphy {kind} {ch} practice sheet: blackletter uppercase and lowercase model with a lighter trace row",
        "landing": "Calligraphy alphabet practice sheet: blackletter models with traceable copies on ruled rows",
    },
    "spanish-alphabet-chart": {
        "landing": "Printable Spanish alphabet chart: 27 hollow block letters A to Z including the letter enye",
    },
    "graffiti-letters": {
        "landing": "Printable graffiti letters: the word {demo} in a hollow throw-up style above an A to Z outline row",
    },
    "letter-tracing": {
        "landing": "Letter tracing worksheet sample: {demo} as a solid model with dotted and dashed rows to trace on ruled handwriting lines",
    },
    "name-tracing": {
        "landing": "Name tracing worksheet sample for {demo}: solid model, dotted and dashed rows on ruled handwriting lines",
    },
    "handwriting-worksheet-generator": {
        "landing": "Handwriting worksheet sample for {demo}: the same word at four tracing levels on ruled lines",
    },
    "sight-word-tracing": {
        "landing": "Sight word tracing worksheet sample for the word {demo}: solid, dotted and dashed rows on ruled lines",
    },
    "coloring-page-maker": {
        "landing": "Name coloring page sample: the name {demo} as large hollow letters to color in",
    },
    "dot-to-dot-name": {
        "landing": "Dot to dot name sample: {DEMO} as numbered dots to connect, one loop per letter",
    },
    "name-puzzle-maker": {
        "landing": "Name puzzle sample: {DEMO} as hollow letter pieces separated by dashed cut lines",
    },
    "banner-maker": {
        "landing": "Printable banner sample: pennant flags spelling {demo}, one letter per flag",
    },
    "cross-stitch-letters": {
        "landing": "Cross-stitch letter chart sample: the word HOME as X stitches on a 5 by 7 grid",
    },
    "monogram-maker": {
        "landing": "Monogram sample: the initials J, S and L in an elegant serif, small, large, small",
    },
    "_cursive_phrase": {
        "landing": "{demo} in cursive: script model with a lighter trace copy on a ruled line",
    },
}

# Each locale's own suffix for "preview of the printable sheet". The page's
# H1 carries the locale's own words for the sheet; this only names what the
# image is.
LOCALE_SUFFIX = {
    "es": "vista previa de la hoja para imprimir",
    "fr": "aperçu de la fiche à imprimer",
    "de": "Vorschau der Druckvorlage",
    "it": "anteprima della scheda da stampare",
    "pt": "pré-visualização da folha para imprimir",
    "pl": "podgląd arkusza do druku",
    "id": "pratinjau lembar cetak",
}

CURSIVE_PHRASE_KEYS = {"mom-in-cursive", "dad-in-cursive", "love-in-cursive", "family-in-cursive",
                       "best-friend-in-cursive", "happy-birthday-in-cursive"}


def family_of(page):
    """Which renderer a page gets. Locale pages reuse EN keys except where a
    locale page carries its own key for the same engine setup."""
    key = page["key"]
    if key in CURSIVE_PHRASE_KEYS or (page["render"] == "glyph" and page["demo"]
                                       and key not in ("cursive-alphabet", "calligraphy-alphabet")):
        return "_cursive_phrase"
    if key == "grafiti-nama":
        return "graffiti-letters"
    if key == "schreibschrift-generator":
        return "handwriting-worksheet-generator"
    if key == "tulisan-selamat-ulang-tahun":
        return "_cursive_phrase"
    return key


def alt_for(page):
    fam = family_of(page)
    if page["lang"] != "en":
        h1 = page["h1"].replace(" — ", ", ").replace("—", ",").replace(" – ", ", ")
        suffix = LOCALE_SUFFIX.get(page["lang"].split("-")[0])
        return f"{h1}: {suffix}" if suffix else h1
    table = EN_ALT.get(fam)
    if not table:
        raise SystemExit(f"no English alt copy for family {fam!r} ({page['rel']})")
    ch = page["initialChar"]
    if ch:
        kind = "number" if ch.isdigit() else "letter"
        return table["spoke"].format(ch=ch, kind=kind, Kind=kind.capitalize())
    demo = page["demo"] or ""
    return table["landing"].format(demo=demo, DEMO=demo.upper())


# ------------------------------------------------------------------ fonts

def font_file(font_dir, family):
    return os.path.join(font_dir, family.replace(" ", "_") + ".ttf")


def fetch_font(font_dir, family):
    q = GOOGLE_FONTS[family]["css2"]
    req = urllib.request.Request(
        f"https://fonts.googleapis.com/css2?family={q}&display=swap",
        # A UA without woff2 support is served plain TTF, which fontconfig
        # and fontTools can both read; a browser UA gets woff2 only.
        headers={"User-Agent": "curl/7.0"})
    css = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
    m = re.search(r"https://[^)]+\.ttf", css)
    if not m:
        raise RuntimeError(f"no TTF URL in Google Fonts CSS for {family}")
    data = urllib.request.urlopen(m.group(0), timeout=60).read()
    os.makedirs(font_dir, exist_ok=True)
    with open(font_file(font_dir, family), "wb") as fh:
        fh.write(data)


def setup_fonts(font_dir, fetch, allow_fallback):
    """Point fontconfig (and therefore cairosvg) at the cache dir, filling it
    from Google Fonts when asked. Returns the families that could NOT be
    resolved to themselves."""
    if os.path.commonpath([os.path.abspath(font_dir), REPO]) == REPO:
        raise SystemExit("--font-dir must be outside the repository; font binaries are never committed")
    os.makedirs(font_dir, exist_ok=True)
    missing = []
    for fam in GOOGLE_FONTS:
        if not os.path.exists(font_file(font_dir, fam)) and fetch:
            try:
                fetch_font(font_dir, fam)
                print(f"fetched {fam}")
            except Exception as e:  # noqa: BLE001 - report, decide below
                print(f"WARN could not fetch {fam}: {e}")
        if not os.path.exists(font_file(font_dir, fam)):
            missing.append(fam)
    conf = os.path.join(font_dir, "fonts.conf")
    with open(conf, "w", encoding="utf-8") as fh:
        fh.write(
            '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n'
            '  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>\n'
            f"  <dir>{esc(os.path.abspath(font_dir))}</dir>\n"
            f"  <cachedir>{esc(os.path.join(os.path.abspath(font_dir), 'fc-cache'))}</cachedir>\n"
            "</fontconfig>\n")
    os.environ["FONTCONFIG_FILE"] = conf
    unresolved = []
    for fam in list(GOOGLE_FONTS) + [MATH_FONT]:
        try:
            got = subprocess.run(["fc-match", "-f", "%{family}", fam], capture_output=True,
                                 text=True, check=False).stdout
        except FileNotFoundError:
            got = ""
        if fam.lower() not in got.lower():
            unresolved.append((fam, got or "?"))
    for fam, got in unresolved:
        print(f"{'WARN' if allow_fallback else 'ERROR'} font {fam!r} is not available; fontconfig would draw {got!r}")
    if unresolved and not allow_fallback:
        print("Run with --fetch-fonts to fill the cache, or --allow-font-fallback to render anyway.")
        raise SystemExit(2)
    return [f for f, _ in unresolved]


class Metrics:
    """Glyph geometry from a TTF via fontTools: advances, bounding boxes and
    flattened outlines, in font units (y up). Used both to place text
    precisely (cairosvg's text-anchor is not reliable across families) and
    to walk a letter's outline for the dot-to-dot sheets."""

    def __init__(self, path):
        from fontTools.ttLib import TTFont
        self.font = TTFont(path)
        self.upm = self.font["head"].unitsPerEm
        self.cmap = self.font.getBestCmap()
        self.gs = self.font.getGlyphSet()
        self.hmtx = self.font["hmtx"]
        self._bbox = {}
        self._contours = {}

    def name(self, ch):
        return self.cmap.get(ord(ch))

    def advance(self, ch):
        n = self.name(ch)
        return self.hmtx[n][0] if n else self.upm * 0.5

    def contours(self, ch):
        """[[(x, y), ...], ...] flattened outline polygons, font units."""
        if ch in self._contours:
            return self._contours[ch]
        from fontTools.pens.recordingPen import DecomposingRecordingPen
        n = self.name(ch)
        out = []
        if n:
            pen = DecomposingRecordingPen(self.gs)
            self.gs[n].draw(pen)
            cur, start = [], None
            for op, args in pen.value:
                if op == "moveTo":
                    if cur:
                        out.append(cur)
                    cur = [args[0]]
                    start = args[0]
                elif op == "lineTo":
                    cur.append(args[0])
                elif op == "qCurveTo":
                    pts = list(args)
                    if pts[-1] is None:  # all-off-curve contour
                        pts[-1] = ((pts[0][0] + pts[-2][0]) / 2, (pts[0][1] + pts[-2][1]) / 2)
                    p0 = cur[-1] if cur else pts[-1]
                    offs, end = pts[:-1], pts[-1]
                    for i, c in enumerate(offs):
                        p2 = end if i == len(offs) - 1 else ((c[0] + offs[i + 1][0]) / 2, (c[1] + offs[i + 1][1]) / 2)
                        for t in (k / 8 for k in range(1, 9)):
                            x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0]
                            y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1]
                            cur.append((x, y))
                        p0 = p2
                elif op == "curveTo":
                    p0 = cur[-1]
                    c1, c2, p3 = args
                    for t in (k / 10 for k in range(1, 11)):
                        x = ((1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * c1[0]
                             + 3 * (1 - t) * t * t * c2[0] + t ** 3 * p3[0])
                        y = ((1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * c1[1]
                             + 3 * (1 - t) * t * t * c2[1] + t ** 3 * p3[1])
                        cur.append((x, y))
                elif op in ("closePath", "endPath"):
                    if cur:
                        if start and cur[-1] != start:
                            cur.append(start)
                        out.append(cur)
                    cur = []
            if cur:
                out.append(cur)
        self._contours[ch] = out
        return out

    def bbox(self, ch):
        if ch not in self._bbox:
            pts = [p for c in self.contours(ch) for p in c]
            if pts:
                xs, ys = [p[0] for p in pts], [p[1] for p in pts]
                self._bbox[ch] = (min(xs), min(ys), max(xs), max(ys))
            else:
                self._bbox[ch] = (0, 0, self.advance(ch), 0)
        return self._bbox[ch]

    def cap_height(self):
        return self.bbox("H")[3] or self.upm * 0.7

    def x_height(self):
        return self.bbox("x")[3] or self.upm * 0.5


_metrics = {}


def metrics(font_dir, family):
    if family not in _metrics:
        path = SYSTEM_FONTS.get(family) or font_file(font_dir, family)
        if not os.path.exists(path):
            path = SYSTEM_FONTS["Liberation Sans"]
        _metrics[family] = Metrics(path)
    return _metrics[family]


# ------------------------------------------------------------------ styles.js maps

_style_cache = {}


def style_map(name):
    """(upper, lower, nums) positional strings for a styles.js map style —
    read from the registry the engine itself renders with."""
    if name in _style_cache:
        return _style_cache[name]
    with open(os.path.join(REPO, "styles.js"), encoding="utf-8") as fh:
        s = fh.read()
    m = re.search(r'["\']%s["\']\s*:\s*\{(.*?)\n\s*\},' % re.escape(name), s, re.S)
    if not m:
        raise SystemExit(f"style {name!r} not found in styles.js")
    body = m.group(1)

    def field(k):
        f = re.search(r"\b%s\s*:\s*'([^']*)'" % k, body)
        return list(f.group(1)) if f else []
    _style_cache[name] = (field("upper"), field("lower"), field("nums"))
    return _style_cache[name]


def render_glyph(text, style):
    up, lo, nu = style_map(style)
    out = []
    for ch in text:
        o = ord(ch)
        if 65 <= o <= 90 and len(up) == 26:
            out.append(up[o - 65])
        elif 97 <= o <= 122 and len(lo) == 26:
            out.append(lo[o - 97])
        elif 48 <= o <= 57 and len(nu) == 10:
            out.append(nu[o - 48])
        else:
            out.append(ch)
    return "".join(out)


# ------------------------------------------------------------------ SVG helpers

def svg_text(x, y, s, family, size, weight=700, fill=INK, stroke=None, sw=0, extra=""):
    """A <text> run. A stroked run is emitted twice: the engine paints its
    outlines with paint-order="stroke" (stroke under fill, so only the outer
    half of the stroke shows and overlapping glyph contours stay clean), and
    cairosvg does not implement paint-order, so the same result is built as
    a stroke-only pass followed by a fill-only pass on top."""
    head = (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{esc(family)}" font-weight="{weight}"'
            f' font-size="{size:.1f}"{extra}')
    if not stroke:
        return f'{head} fill="{fill}">{esc(s)}</text>'
    return (f'{head} fill="none" stroke="{stroke}" stroke-width="{sw:.2f}" stroke-linejoin="round">'
            f'{esc(s)}</text>{head} fill="{fill}">{esc(s)}</text>')


def weight_for(family):
    g = GOOGLE_FONTS.get(family)
    return 700 if (g is None or g["bold"]) else 400


def cred_line():
    return svg_text(W - 40, H - 30, "ultratextgen.com", CRED_FONT, 24, weight=400, fill=CRED,
                    extra=' text-anchor="end"')


def sheet(body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
            f'<rect width="{W}" height="{H}" fill="#ffffff"/>{body}{cred_line()}</svg>')


class Layout:
    """Places characters of one family at a font size with the engine's
    letter-spacing, returning per-char x origins from glyph advances."""

    def __init__(self, met, size, spacing_em=0.0):
        self.met, self.size, self.s = met, size, size / met.upm
        self.gap = size * spacing_em

    def width(self, text):
        w = 0
        for i, ch in enumerate(text):
            w += self.met.advance(ch) * self.s
            if i < len(text) - 1:
                w += self.gap
        return w

    def origins(self, text, cx):
        x = cx - self.width(text) / 2
        out = []
        for ch in text:
            out.append(x)
            x += self.met.advance(ch) * self.s + self.gap
        return out

    def ink_center_x(self, ch):
        b = self.met.bbox(ch)
        return (b[0] + b[2]) / 2 * self.s


def outline_text(met, family, text, cx, baseline, size, stroke_units, spacing_em=0.0,
                 fill="#ffffff", stroke=INK):
    """outlineSVG()/wordOutlineSVG(): white fill, dark round-joined stroke
    painted under the fill. stroke_units is the engine's stroke-width at its
    font-size 210 viewBox, rescaled to this size."""
    lay = Layout(met, size, spacing_em)
    sw = stroke_units / 210 * size
    parts = []
    for ch, x in zip(text, lay.origins(text, cx)):
        if ch == " ":
            continue
        parts.append(svg_text(x, baseline, ch, family, size, weight_for(family), fill, stroke, sw))
    return "".join(parts)


def fit_size(met, text, box_w, box_h, spacing_em=0.0, cap_only=True):
    """Largest font size at which `text` fits the box by advance width and
    by cap height (or full ascender+descender when cap_only is False)."""
    upm = met.upm
    w_units = sum(met.advance(c) for c in text) + spacing_em * upm * max(0, len(text) - 1)
    size_w = box_w / (w_units / upm) if w_units else box_h
    if cap_only:
        h_units = met.cap_height()
    else:
        ys = [met.bbox(c) for c in text if c != " "]
        h_units = (max(b[3] for b in ys) - min(b[1] for b in ys)) if ys else met.cap_height()
    size_h = box_h / (h_units / upm)
    return min(size_w, size_h)


# ------------------------------------------------------------------ renderers

def r_spoke_outline(page, fd):
    fam = page["family"]
    met = metrics(fd, fam)
    ch = page["initialChar"]
    size = fit_size(met, ch, 900, 600)
    s = size / met.upm
    b = met.bbox(ch)
    cx = W / 2 - (b[0] + b[2]) / 2 * s
    baseline = H / 2 + (b[3] + b[1]) / 2 * s
    x = cx
    sw = page["stroke"] / 210 * size
    return sheet(svg_text(x, baseline, ch, fam, size, weight_for(fam), "#ffffff", INK, sw))


def r_alphabet_grid(page, fd):
    fam = page["family"]
    met = metrics(fd, fam)
    chars = page["chars"] or list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    if not page["chars"] and page["charset"] == "alnum":
        chars += list("0123456789")
    cols = 7 if len(chars) <= 28 else 9
    rows = math.ceil(len(chars) / cols)
    margin_x, top, bottom = 50, 40, 70
    cell_w = (W - 2 * margin_x) / cols
    cell_h = (H - top - bottom) / rows
    widest = max(met.advance(c) for c in chars) / met.upm
    size = min(cell_w * 0.86 / widest, cell_h * 0.66 / (met.cap_height() / met.upm))
    s = size / met.upm
    sw = max(3.0, max(4.0, page["stroke"] - 2) / 210 * size * 1.25)
    cap = met.cap_height() * s
    parts = []
    for i, ch in enumerate(chars):
        r, c = divmod(i, cols)
        b = met.bbox(ch)
        cx = margin_x + cell_w * (c + 0.5) - (b[0] + b[2]) / 2 * s
        by = top + cell_h * (r + 0.5) + cap / 2
        parts.append(svg_text(cx, by, ch, fam, size, weight_for(fam), "#ffffff", INK, sw))
    return sheet("".join(parts))


def r_word_outline(page, fd, word=None, boxed=True, stroke=None, row=False):
    """A hollow word (coloring-page-maker's designer sheet, graffiti demo)."""
    fam = page["family"]
    met = metrics(fd, fam)
    word = word or page["demo"] or "Emma"
    spacing = page["spacing"]
    parts = []
    if boxed:
        parts.append(f'<rect x="28" y="28" width="{W - 56}" height="{H - 56}" rx="26" fill="#ffffff" '
                     f'stroke="#e2e6ee" stroke-width="4"/>')
    box_h = 420 if row else 520
    size = min(fit_size(met, word, W - 200, box_h, spacing, cap_only=False), 560)
    s = size / met.upm
    bb = [met.bbox(c) for c in word if c != " "]
    ymax, ymin = max(b[3] for b in bb), min(b[1] for b in bb)
    cy = H / 2 - (70 if row else 0)
    baseline = cy + (ymax + ymin) / 2 * s
    parts.append(outline_text(met, fam, word, W / 2, baseline, size, stroke or page["stroke"], spacing))
    if row:
        letters = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        lay_size = min(72, fit_size(met, letters, W - 120, 10_000, 0.08))
        sw = max(3.0, (page["stroke"] - 2) / 210 * lay_size * 1.2)
        lay = Layout(met, lay_size, 0.08)
        xs = lay.origins(letters, W / 2)
        for ch, x in zip(letters, xs):
            parts.append(svg_text(x, H - 110, ch, fam, lay_size, weight_for(fam), "#ffffff", INK, sw))
    return sheet("".join(parts))


def r_puzzle(page, fd):
    fam = page["family"]
    met = metrics(fd, fam)
    word = (page["demo"] or "Alex").upper()
    n = len(word)
    margin = 60
    piece_w = (W - 2 * margin) / n
    widest = max(word, key=met.advance)
    size = min(fit_size(met, widest, piece_w * 0.8, 440), 560)
    s = size / met.upm
    parts = []
    for i, ch in enumerate(word):
        b = met.bbox(ch)
        cx = margin + piece_w * (i + 0.5) - (b[0] + b[2]) / 2 * s
        baseline = H / 2 + (b[3] + b[1]) / 2 * s
        parts.append(svg_text(cx, baseline, ch, fam, size, weight_for(fam), "#ffffff", INK,
                              page["stroke"] / 210 * size))
        if i < n - 1:
            x = margin + piece_w * (i + 1)
            parts.append(f'<line x1="{x:.1f}" y1="120" x2="{x:.1f}" y2="{H - 120}" stroke="{INK}" '
                         f'stroke-width="3" stroke-dasharray="14 12"/>')
    return sheet("".join(parts))


# traceWordSVG(): level specs, verbatim from the engine
TRACE_LEVELS = [
    dict(fill=INK, stroke=None, sw=0, dash="", cap="round", opacity=1),
    dict(fill="none", stroke=INK, sw=8, dash="0.1 11", cap="round", opacity=1),
    dict(fill="none", stroke=INK, sw=5, dash="0.1 16", cap="round", opacity=0.92),
    dict(fill="none", stroke=INK, sw=4, dash="15 15", cap="butt", opacity=0.85),
    dict(fill=GHOST, stroke=None, sw=0, dash="", cap="round", opacity=1),
]


def r_trace_rows(page, fd):
    fam = page["family"]
    met = metrics(fd, fam)
    word = page["demo"] or "Emma"
    rows = 4
    row_h = (H - 90) / rows
    # traceWordSVG geometry: top 50 / mid 104 / base 158 in a 210-tall row at font 132.
    k = row_h / 210
    size = min(132 * k, fit_size(met, word, W - 160, 10_000))
    lay = Layout(met, size)
    parts = []
    for r in range(rows):
        y0 = 30 + r * row_h
        top, mid, base = y0 + 50 * k, y0 + 104 * k, y0 + 158 * k
        for y, dashed in ((top, False), (mid, True), (base, False)):
            parts.append(f'<line x1="40" x2="{W - 40}" y1="{y:.1f}" y2="{y:.1f}" '
                         f'stroke="{GUIDE_MID if dashed else GUIDE}" stroke-width="{1.5 * k if dashed else 2 * k:.1f}"'
                         + (' stroke-dasharray="6 8"' if dashed else "") + "/>")
        spec = TRACE_LEVELS[r if r < 3 else 3]
        extra = ""
        if spec["stroke"]:
            extra = (f' stroke="{spec["stroke"]}" stroke-width="{spec["sw"] * k:.1f}"'
                     f' stroke-linecap="{spec["cap"]}" stroke-linejoin="round"'
                     + (f' stroke-dasharray="{spec["dash"]}"' if spec["dash"] else ""))
        if spec["opacity"] != 1:
            extra += f' opacity="{spec["opacity"]}"'
        for ch, x in zip(word, lay.origins(word, W / 2)):
            if ch == " ":
                continue
            parts.append(svg_text(x, base, ch, fam, size, weight_for(fam), spec["fill"], extra=extra))
    return sheet("".join(parts))


def _glyph_pair(page):
    ch = page["initialChar"] or "A"
    st = page["glyphStyle"] or "Ultra Script"
    return render_glyph(ch.upper(), st), render_glyph(ch.lower(), st)


def r_spoke_glyph(page, fd):
    met = metrics(fd, MATH_FONT)
    up, lo = _glyph_pair(page)
    pair = up + " " + lo
    size = min(fit_size(met, pair, W - 200, 380, cap_only=False), 440)
    lay = Layout(met, size)
    parts = []
    for ch, x in zip(pair, lay.origins(pair, W / 2)):
        if ch != " ":
            parts.append(svg_text(x, 470, ch, MATH_FONT, size, 400, INK))
    # A trace row beneath, like .cursive-print-row: light copies on a dotted rule.
    tsize = 120
    tlay = Layout(met, tsize, 0.3)
    row = (pair + "  ") * 3
    row = row.strip()
    xs = tlay.origins(row, W / 2)
    for ch, x in zip(row, xs):
        if ch != " ":
            parts.append(svg_text(x, 720, ch, MATH_FONT, tsize, 400, TRACE_GRAY))
    parts.append(f'<line x1="60" x2="{W - 60}" y1="742" y2="742" stroke="{RULE_DOT}" '
                 f'stroke-width="2" stroke-dasharray="2 6"/>')
    return sheet("".join(parts))


def r_glyph_practice(page, fd):
    met = metrics(fd, MATH_FONT)
    st = page["glyphStyle"] or "Ultra Script"
    letters = "ABCDEF"
    rows = len(letters)
    row_h = (H - 100) / rows
    size = 84
    lay = Layout(met, size, 0.25)
    parts = []
    for i, L in enumerate(letters):
        base = 40 + row_h * (i + 0.72)
        model = render_glyph(L, st) + " " + render_glyph(L.lower(), st)
        x = 90
        for ch in model:
            if ch != " ":
                parts.append(svg_text(x, base, ch, MATH_FONT, size, 400, INK))
            x += met.advance(ch) * lay.s + lay.gap
        x = 420
        for ch in (model + "  ") * 3:
            if x > W - 120:
                break
            if ch != " ":
                parts.append(svg_text(x, base, ch, MATH_FONT, size, 400, TRACE_GRAY))
            x += met.advance(ch) * lay.s + lay.gap
        parts.append(f'<line x1="60" x2="{W - 60}" y1="{base + 22:.1f}" y2="{base + 22:.1f}" '
                     f'stroke="{RULE_DOT}" stroke-width="2" stroke-dasharray="2 6"/>')
    return sheet("".join(parts))


def r_cursive_phrase(page, fd):
    met = metrics(fd, MATH_FONT)
    st = page["glyphStyle"] or "Ultra Script"
    phrase = render_glyph(page["demo"] or "Love", st)
    size = min(fit_size(met, phrase, W - 160, 300, cap_only=False), 300)
    lay = Layout(met, size)
    parts = []
    for ch, x in zip(phrase, lay.origins(phrase, W / 2)):
        if ch != " ":
            parts.append(svg_text(x, 400, ch, MATH_FONT, size, 400, INK))
    tsize = size * 0.62
    tlay = Layout(met, tsize)
    for ch, x in zip(phrase, tlay.origins(phrase, W / 2)):
        if ch != " ":
            parts.append(svg_text(x, 700, ch, MATH_FONT, tsize, 400, TRACE_GRAY))
    parts.append(f'<line x1="60" x2="{W - 60}" y1="722" y2="722" stroke="{RULE_DOT}" '
                 f'stroke-width="2" stroke-dasharray="2 6"/>')
    return sheet("".join(parts))


# --- dot-to-dot ------------------------------------------------------------

def _poly_len(pts):
    return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def _area(pts):
    return abs(sum(pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
                   for i in range(len(pts) - 1))) / 2


def _resample(pts, n):
    """n points at even arc-length along a closed polyline, starting at its
    topmost point (the natural "1" of a connect-the-dots)."""
    top = min(range(len(pts) - 1), key=lambda i: (pts[i][1], pts[i][0]))
    loop = pts[top:-1] + pts[:top] + [pts[top]]
    total = _poly_len(loop)
    step = total / n
    out, acc, target = [loop[0]], 0.0, step
    for i in range(len(loop) - 1):
        a, b = loop[i], loop[i + 1]
        seg = math.dist(a, b)
        while len(out) < n and seg > 0 and acc + seg >= target:
            t = (target - acc) / seg
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            target += step
        acc += seg
    return out[:n]


def letter_dot_layout(met, ch, n, ox, baseline, s):
    """The engine's outer-silhouette loop: the largest contour, resampled to
    n dots; holes (counters) are skipped; a detached smaller component (a
    tittle, a tilde) becomes one dot at its centroid, numbered after the
    loop. Coordinates in canvas space."""
    polys = []
    for c in met.contours(ch):
        polys.append([(ox + x * s, baseline - y * s) for x, y in c])
    polys = [p for p in polys if len(p) > 2]
    if not polys:
        return None
    main = max(polys, key=_area)
    mx0, my0 = min(p[0] for p in main), min(p[1] for p in main)
    mx1, my1 = max(p[0] for p in main), max(p[1] for p in main)
    cx, cy = (mx0 + mx1) / 2, (my0 + my1) / 2
    dots = [dict(x=x, y=y, accent=False) for x, y in _resample(main, n)]
    for p in polys:
        if p is main:
            continue
        px0, py0 = min(q[0] for q in p), min(q[1] for q in p)
        px1, py1 = max(q[0] for q in p), max(q[1] for q in p)
        inside = px0 >= mx0 - 1 and px1 <= mx1 + 1 and py0 >= my0 - 1 and py1 <= my1 + 1
        if inside:
            continue  # a counter/hole: not traced, as in the engine
        dots.append(dict(x=(px0 + px1) / 2, y=(py0 + py1) / 2, accent=True))
    return dict(loop=main, dots=dots, cx=cx, cy=cy)


def dot_word_svg(met, fam, word, n_per_letter, box, hint=True):
    """addDotWordSVG(): per-letter loops, dots, and numbers offset radially
    from each letter's centre, sized from the median nearest-dot distance
    with the engine's clamps scaled to the box."""
    x, y, bw, bh = box
    tracking = 0.14
    size = fit_size(met, word, bw, bh, tracking)
    s = size / met.upm
    lay = Layout(met, size, tracking)
    bb = [met.bbox(c) for c in word if c != " "]
    ymax, ymin = max(b[3] for b in bb), min(b[1] for b in bb)
    baseline = y + bh / 2 + (ymax + ymin) / 2 * s
    letters = []
    for ch, ox in zip(word, lay.origins(word, x + bw / 2)):
        if ch == " ":
            continue
        L = letter_dot_layout(met, ch, n_per_letter(ch), ox, baseline, s)
        if L:
            letters.append(L)
    all_pts = [(d["x"], d["y"]) for L in letters for d in L["dots"]]
    nn = []
    for i, a in enumerate(all_pts):
        best = min((math.dist(a, b) for j, b in enumerate(all_pts) if i != j), default=None)
        if best is not None:
            nn.append(best)
    nn.sort()
    med = nn[len(nn) // 2] if nn else 40
    k = bh / 820
    dot_r = max(3.2 * k, min(11 * k, med * 0.17))
    num_f = max(12 * k, min(30 * k, med * 0.6))
    parts = []
    for L in letters:
        if hint:
            pts = " ".join(f"{px:.1f},{py:.1f}" for px, py in L["loop"])
            parts.append(f'<polygon points="{pts}" fill="none" stroke="{HINT}" stroke-width="2.2" '
                         f'stroke-dasharray="5 7" stroke-linejoin="round"/>')
        for i, d in enumerate(L["dots"]):
            r = dot_r * (0.9 if d["accent"] else 1)
            parts.append(f'<circle cx="{d["x"]:.1f}" cy="{d["y"]:.1f}" r="{r:.1f}" fill="{INK}"/>')
            vx, vy = d["x"] - L["cx"], d["y"] - L["cy"]
            vl = math.hypot(vx, vy) or 1
            off = dot_r + num_f * 0.62
            lx, ly = d["x"] + vx / vl * off, d["y"] + vy / vl * off + num_f * 0.34
            parts.append(svg_text(lx, ly, str(i + 1), fam, num_f, weight_for(fam), INK, "#ffffff",
                                  num_f * 0.16, extra=' text-anchor="middle"'))
    return "".join(parts)


def r_spoke_dots(page, fd):
    fam = page["family"]
    met = metrics(fd, fam)
    ch = page["initialChar"].upper()
    return sheet(dot_word_svg(met, fam, ch, lambda c: 16, (250, 90, 700, 720)))


def r_dots_row(page, fd):
    fam = page["family"]
    met = metrics(fd, fam)
    return sheet(dot_word_svg(met, fam, "ABC", lambda c: 16, (80, 120, 1040, 620)))


def r_dots_word(page, fd):
    fam = page["family"]
    met = metrics(fd, fam)
    word = (page["demo"] or "Emma").upper()
    # medium level: 42 dots shared by outline perimeter, clamped 5..22
    per = {}
    lens = {c: _poly_len(max(met.contours(c), key=_area, default=[(0, 0), (0, 0)])) for c in set(word) if c != " "}
    total = sum(lens.values()) or 1
    for c, ln in lens.items():
        per[c] = max(5, min(22, round(42 * ln / total)))
    return sheet(dot_word_svg(met, fam, word, lambda c: per.get(c, 12), (80, 150, 1040, 520)))


# --- banner / cross-stitch / monogram --------------------------------------

def r_banner(page, fd):
    fam = page["family"]
    met = metrics(fd, fam)
    words = (page["demo"] or "HAPPY BIRTHDAY").upper().split()[:2]
    rows = words if len(words) > 1 else [words[0]]
    row_h = (H - 80) / len(rows)
    parts = []
    for ri, word in enumerate(rows):
        n = len(word)
        fw = min(220 * (row_h / 300), (W - 80) / n)
        fh = fw * 260 / 220
        x0 = W / 2 - fw * n / 2
        y0 = 40 + row_h * ri + (row_h - fh) / 2
        u = fw / 220  # flagSVG unit
        for i, ch in enumerate(word):
            fx = x0 + i * fw
            pts = (f"{fx + 16 * u:.1f},{y0 + 16 * u:.1f} {fx + 204 * u:.1f},{y0 + 16 * u:.1f} "
                   f"{fx + 110 * u:.1f},{y0 + 248 * u:.1f}")
            parts.append(f'<polygon points="{pts}" fill="#ffffff" stroke="{INK}" stroke-width="{3 * u:.1f}" '
                         f'stroke-dasharray="{10 * u:.1f} {7 * u:.1f}" stroke-linejoin="round"/>')
            for hx in (42, 178):
                parts.append(f'<circle cx="{fx + hx * u:.1f}" cy="{y0 + 46 * u:.1f}" r="{7 * u:.1f}" fill="none" '
                             f'stroke="{INK}" stroke-width="{2.5 * u:.1f}" stroke-dasharray="{3 * u:.1f} {4 * u:.1f}"/>')
            size = 104 * u
            b = met.bbox(ch)
            s = size / met.upm
            cx = fx + 110 * u - (b[0] + b[2]) / 2 * s
            parts.append(svg_text(cx, y0 + 100 * u + met.cap_height() * s * 0.5, ch, fam, size,
                                  weight_for(fam), INK))
    return sheet("".join(parts))


def _stitch_font():
    with open(os.path.join(REPO, "js", "printables", "crossStitchEngine.js"), encoding="utf-8") as fh:
        js = fh.read()
    glyphs = {}
    for m in re.finditer(r'"(.)":\s*\[((?:"[01]{5}",?\s*){7})\]', js):
        glyphs[m.group(1)] = re.findall(r'"([01]{5})"', m.group(2))
    return glyphs


def r_cross_stitch(page, fd):
    glyphs = _stitch_font()
    word = "HOME"
    cols = len(word) * 6 - 1 + 2
    rows = 7 + 2
    cell = min((W - 120) / cols, (H - 160) / rows)
    x0, y0 = (W - cols * cell) / 2, (H - rows * cell) / 2 - 20
    parts = [f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{cols * cell:.1f}" height="{rows * cell:.1f}" fill="#ffffff"/>']
    for c in range(cols + 1):
        x = x0 + c * cell
        parts.append(f'<line x1="{x:.1f}" y1="{y0:.1f}" x2="{x:.1f}" y2="{y0 + rows * cell:.1f}" stroke="#d3d7de" stroke-width="1"/>')
    for r in range(rows + 1):
        y = y0 + r * cell
        parts.append(f'<line x1="{x0:.1f}" y1="{y:.1f}" x2="{x0 + cols * cell:.1f}" y2="{y:.1f}" stroke="#d3d7de" stroke-width="1"/>')
    pad, sw = cell * 0.17, cell * 0.17
    marks = []
    for li, ch in enumerate(word):
        g = glyphs.get(ch, ["00000"] * 7)
        for r, row in enumerate(g):
            for c, bit in enumerate(row):
                if bit != "1":
                    continue
                x = x0 + (1 + li * 6 + c) * cell
                y = y0 + (1 + r) * cell
                marks.append(f'M{x + pad:.1f} {y + pad:.1f}L{x + cell - pad:.1f} {y + cell - pad:.1f}'
                             f'M{x + cell - pad:.1f} {y + pad:.1f}L{x + pad:.1f} {y + cell - pad:.1f}')
    parts.append(f'<path d="{"".join(marks)}" stroke="#2b2b2b" stroke-width="{sw:.1f}" stroke-linecap="round" fill="none"/>')
    return sheet("".join(parts))


def r_monogram(page, fd):
    fam = "Playfair Display"
    met = metrics(fd, fam)
    items = [("J", 116), ("S", 196), ("L", 116)]
    u = 2.0  # monogram viewBox is 400 wide; sheet shows it at 2x
    gap = 10 * u
    widths = [met.advance(ch) / met.upm * sz * u for ch, sz in items]
    total = sum(widths) + gap * (len(items) - 1)
    x = W / 2 - total / 2
    baseline = H / 2 + 196 * u * 0.36
    parts = []
    for (ch, sz), w in zip(items, widths):
        parts.append(svg_text(x, baseline, ch, fam, sz * u, 700, INK))
        x += w + gap
    return sheet("".join(parts))


RENDERERS = {
    "block-letters": ("spoke_outline", "alphabet_grid"),
    "bubble-letters": ("spoke_outline", "alphabet_grid"),
    "alphabet-coloring-pages": ("spoke_outline", "alphabet_grid"),
    "spanish-alphabet-chart": (None, "alphabet_grid"),
    "graffiti-letters": (None, "graffiti"),
    "dot-to-dot-alphabet": ("spoke_dots", "dots_row"),
    "cursive-alphabet": ("spoke_glyph", "glyph_practice"),
    "calligraphy-alphabet": ("spoke_glyph", "glyph_practice"),
    "name-tracing": (None, "trace_rows"),
    "handwriting-worksheet-generator": (None, "trace_rows"),
    "letter-tracing": (None, "trace_rows"),
    "sight-word-tracing": (None, "trace_rows"),
    "coloring-page-maker": (None, "word_outline"),
    "dot-to-dot-name": (None, "dots_word"),
    "name-puzzle-maker": (None, "puzzle"),
    "banner-maker": (None, "banner"),
    "cross-stitch-letters": (None, "cross_stitch"),
    "monogram-maker": (None, "monogram"),
    "_cursive_phrase": (None, "cursive_phrase"),
}


def render_svg(page, fd):
    fam = family_of(page)
    if fam not in RENDERERS:
        raise SystemExit(f"no renderer for key {page['key']!r} ({page['rel']}) - add one rather than skip the page")
    spoke, landing = RENDERERS[fam]
    which = spoke if page["initialChar"] else landing
    if which is None:
        raise SystemExit(f"{page['rel']}: unexpected spoke for family {fam!r}")
    return {
        "spoke_outline": r_spoke_outline,
        "alphabet_grid": r_alphabet_grid,
        "graffiti": lambda p, d: r_word_outline(p, d, boxed=False, row=True),
        "spoke_dots": r_spoke_dots,
        "dots_row": r_dots_row,
        "spoke_glyph": r_spoke_glyph,
        "glyph_practice": r_glyph_practice,
        "trace_rows": r_trace_rows,
        "word_outline": r_word_outline,
        "dots_word": r_dots_word,
        "puzzle": r_puzzle,
        "banner": r_banner,
        "cross_stitch": r_cross_stitch,
        "monogram": r_monogram,
        "cursive_phrase": r_cursive_phrase,
    }[which](page, fd)


def write_png(svg, out_path):
    import cairosvg
    from PIL import Image
    png = cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=W, output_height=H)
    im = Image.open(io.BytesIO(png)).convert("RGB")
    # A sheet is white, ink and a few pastels: a 64-colour palette keeps the
    # anti-aliased edges and cuts the file to roughly a quarter of the RGBA.
    im = im.quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    im.save(out_path, "PNG", optimize=True)


# ------------------------------------------------------------------ main

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", action="append", default=[], metavar="PREFIX",
                    help="render pages whose slug starts with PREFIX (repeatable)")
    ap.add_argument("--all", action="store_true", help="render every printables page")
    ap.add_argument("--force", action="store_true", help="re-render PNGs that already exist")
    ap.add_argument("--dry-run", action="store_true", help="list what would be written, write nothing")
    ap.add_argument("--list", action="store_true", help="print every page slug and its alt text")
    ap.add_argument("--font-dir", default=os.environ.get("UTG_PREVIEW_FONT_DIR")
                    or os.path.join(os.path.expanduser("~"), ".cache", "utg-printables-fonts"),
                    help="font cache OUTSIDE the repo (default ~/.cache/utg-printables-fonts)")
    ap.add_argument("--fetch-fonts", action="store_true", help="download missing Google Fonts into --font-dir")
    ap.add_argument("--allow-font-fallback", action="store_true",
                    help="render even when a family is missing (fontconfig substitutes an installed sans)")
    a = ap.parse_args(argv)

    pages = discover_pages()
    if a.list:
        for p in pages:
            print(f"{p['slug']}\t{p['lang']}\t{family_of(p)}\t{alt_for(p)}")
        return 0
    if not a.all and not a.only:
        ap.error("refusing a bare run: pass --only <slug-prefix> (repeatable) or --all")
    if a.only:
        sel = [p for p in pages if any(p["slug"].startswith(pre) for pre in a.only)]
        for pre in a.only:
            if not any(p["slug"].startswith(pre) for p in pages):
                ap.error(f"--only {pre!r} matches no printables page")
    else:
        sel = pages
    todo = [p for p in sel if a.force or not os.path.exists(os.path.join(OUT_DIR, p["slug"] + ".png"))]
    print(f"{len(sel)} page(s) selected, {len(todo)} to render, {len(sel) - len(todo)} already present")
    if a.dry_run:
        for p in todo:
            print(f"would write {OUT_URL}/{p['slug']}.png  ({family_of(p)})")
        return 0
    if not todo:
        return 0
    fallback = setup_fonts(a.font_dir, a.fetch_fonts, a.allow_font_fallback)
    os.makedirs(OUT_DIR, exist_ok=True)
    total = 0
    for p in todo:
        out = os.path.join(OUT_DIR, p["slug"] + ".png")
        write_png(render_svg(p, a.font_dir), out)
        total += os.path.getsize(out)
        print(f"wrote {os.path.relpath(out, REPO)}")
    print(f"{len(todo)} file(s), {total / 1024:.0f} KB total")
    if fallback:
        print(f"NOTE {len(fallback)} family(ies) rendered with a substitute font: {', '.join(fallback)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
