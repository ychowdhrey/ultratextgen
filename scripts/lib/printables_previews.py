"""
printables_previews.py — which printables pages carry a sheet preview, where
its PNG lives, how to capture it, and what its alt text says.

One owner for those four facts, read by:
  - scripts/capture-printables-previews.js (via wire-printables-previews.py
    --list-json), which captures each PNG from the page's own engine;
  - scripts/wire-printables-previews.py, which writes the <img> into the page.

Moved here 2026-09-23 from generate-printables-previews.py when that Python
re-implementation of the engine was retired: its drawing had drifted from the
engine (outline dots after the engine moved to the writing centreline, no
counters on the dot-to-dot letters, words centred that the engine left-aligns),
and the preview is now page 1 of the page's own PDF. The discovery, slug and
alt rules below are carried over unchanged unless a comment says otherwise.
"""
from __future__ import annotations

import html as htmlmod
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT_DIR = os.path.join(REPO, "assets", "printables-previews")
OUT_URL = "/assets/printables-previews"

ENGINE_MARKERS = ("window.UTG_PRINTABLE", "crossStitchEngine.js", "monogramEngine.js")
LOCALE_DIRS = ("de", "es", "fr", "id", "it", "pl", "pt")

# The PDF buttons capture-printables-previews.js presses, in its PRIMARY order.
# Listed here only so capture_query() can tell which one a page will use.
TOOL_PDF_IDS = ("pt-gen-print", "pt-design-print", "pt-banner-print", "pt-puzzle-print",
                "mono-print", "cs-print", "pt-practice-print")


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
    designer = re.search(r"\bdesigner\s*:\s*\{[^}]*?\bdemo\s*:\s*\"([^\"]*)\"", cfg, re.S)
    # The cross-stitch pages carry no *Demo key: their sample word is the
    # value the reader actually sees in the chart input on load.
    stitch_demo = re.search(r'<input\b(?=[^>]*\bid="cs-input")[^>]*\bvalue="([^"]*)"', h)
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
        "demo": (_cfg_str(cfg, "nameDemo") or _cfg_str(cfg, "genDemo") or _cfg_str(cfg, "bannerDemo")
                 or _cfg_str(cfg, "puzzleDemo") or (_js_str(designer.group(1)) if designer else None)
                 or (htmlmod.unescape(stitch_demo.group(1)).strip() or None if stitch_demo else None)),
        "initialChar": _cfg_str(cfg, "initialChar"),
        "ids": set(re.findall(r'\bid="([^"]+)"', h)),
        # The designer's heading field: its placeholder carries the page's own
        # example heading in the page's own language, and maxlength its cap.
        "headingPh": (htmlmod.unescape(head.group(1)) if (head := re.search(
            r'<input\b(?=[^>]*\bid="pt-design-heading")[^>]*\bplaceholder="([^"]*)"', h)) else None),
        "headingMax": (int(hm.group(1)) if (hm := re.search(
            r'<input\b(?=[^>]*\bid="pt-design-heading")[^>]*\bmaxlength="(\d+)"', h)) else 48),
    }


def discover_pages():
    """Every printables landing and spoke, EN and locale, that loads one of the
    three printables engines. Hubs (printables/index.html and each locale's
    printables index) load no engine and are excluded by that fact rather
    than by a hardcoded list."""
    rels = []
    for top in ("printables",) + LOCALE_DIRS:
        for root, dirs, files in os.walk(os.path.join(REPO, top)):
            if "index.html" in files:
                rels.append(os.path.relpath(os.path.join(root, "index.html"), REPO))
    pages = []
    for rel in sorted(rels):
        p = parse_page(rel)
        if p:
            pages.append(p)
    return pages


def page_url(page):
    return "/" + page["rel"][: -len("index.html")]


def capture_query(page):
    """The URL preset a capture opens the page with, or "".

    An alphabet landing whose primary PDF is the A-Z set prints one big letter
    per page by default, so page 1 would be the same sheet as its own letter-A
    spoke's preview: two URLs, one picture. `size=small` is the tiled set, a
    configuration the page's own size control offers."""
    ids = page["ids"]
    if page["initialChar"] or any(i in ids for i in TOOL_PDF_IDS):
        return ""
    return "?size=small" if "pt-alphabet-print" in ids else ""


# "e.g. " / "z. B. " / "es. " / "np. " -- one or two short letter groups, each
# closed by a period. Every locale writes its own, so the example heading is
# read off the page and the lead-in stripped rather than authored here.
EG_PREFIX_RE = re.compile(r"^(?:[^\W\d_]{1,3}\.\s*){1,2}", re.UNICODE)


def heading_example(raw):
    """The example heading a designer page shows in its own
    `#pt-design-heading` placeholder, minus the locale's "for example" lead-in.

    Refuses rather than guesses: a lead-in this does not recognise would put
    "np. Kolorowanka Emmy" onto the sheet, and an image is the one surface no
    gate in this repo reads, so the failure would be silent."""
    txt = (raw or "").strip()
    out = EG_PREFIX_RE.sub("", txt).strip()
    if not out or "." in out[:6]:
        raise SystemExit(
            f"heading placeholder {txt!r}: cannot tell the \"for example\" lead-in from the "
            f"heading. Teach EG_PREFIX_RE this locale's form rather than shipping the lead-in "
            f"into the preview image.")
    return out


def capture_setup(page):
    """Controls the capture sets before pressing the PDF button, or None.

    The coloring-page maker boots into a plain hollow word with no heading
    and no border. Its preview shows a configuration the tool really produces
    and the default does not -- a heart fill, a star border and the page's own
    example heading -- as it has since 2026-09-16: the page's alt text
    describes exactly that sheet. The heading is harvested from the page's
    placeholder, never authored here, and dropped when it is longer than the
    field accepts (it/da-stampare/nome-da-colorare's example is 30 characters
    against a cap of 26), because the sheet could only ever carry a
    truncation of it."""
    if page["key"] != "coloring-page-maker":
        return None
    heading = heading_example(page["headingPh"]) if page["headingPh"] else ""
    if len(heading) > page["headingMax"]:
        heading = ""
    return {
        "heading": heading,
        "click": ['#pt-design-fill-group [data-value="hearts"]',
                  '#pt-design-border-group [data-value="stars"]'],
    }


def png_path(page):
    return os.path.join(OUT_DIR, page["slug"] + ".png")


def png_size(path):
    """(width, height) from a PNG's IHDR, without an image library."""
    with open(path, "rb") as fh:
        head = fh.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG")
    return int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")


# ------------------------------------------------------------------ alt text

# English alt copy per family. {ch} is the spoke's character, {kind} is
# "letter" or "number", {demo} the page's own demo word. No em dashes: this
# is English page copy and data/em_dash_locale_policy.json bans them.
#
# Each line describes page 1 of that family's PDF, which is what the preview
# now is (revised 2026-09-23; the earlier copy described the Python-drawn
# composites -- "four tracing levels", "A, B and C shown" -- that the capture
# replaced). Letter ranges are not named: "the first sheet of the set" stays
# true when the tiling changes, "A to P" would not.
EN_ALT = {
    "block-letters": {
        "spoke": "Printable block {kind} {ch} stencil: hollow outline to print, trace and cut out",
        "landing": "Printable block letter alphabet: the first sheet of the A to Z and 0 to 9 set, hollow stencil outlines",
    },
    "bubble-letters": {
        "spoke": "Printable bubble {kind} {ch}: puffy hollow outline to print, trace and color in",
        "landing": "Printable bubble letter alphabet: the first sheet of the A to Z and 0 to 9 set, rounded hollow outlines to color in",
    },
    "alphabet-coloring-pages": {
        "spoke": "{Kind} {ch} coloring page: large outline {kind} to print and color in",
        "landing": "Alphabet coloring page: the first sheet of the A to Z and 0 to 9 set, outline letters to print and color in",
    },
    "dot-to-dot-alphabet": {
        "spoke": "{Kind} {ch} dot to dot: numbered dots to connect that reveal the {kind}",
        "landing": "Dot to dot alphabet: the letter A as numbered dots to connect, its outline and the triangle inside it",
    },
    "cursive-alphabet": {
        "spoke": "Cursive {kind} {ch} practice sheet: uppercase and lowercase in hollow outline on ruled lines, to trace",
        "landing": "Cursive alphabet practice sheet: model letters with traceable copies on ruled rows",
    },
    "calligraphy-alphabet": {
        "spoke": "Calligraphy {kind} {ch} practice sheet: blackletter uppercase and lowercase in hollow outline, to trace",
        "landing": "Calligraphy alphabet practice sheet: blackletter models with traceable copies on ruled rows",
    },
    "spanish-alphabet-chart": {
        "landing": "Printable Spanish alphabet chart: the first sheet of the 27-letter set in hollow block letters, the letter enye included",
    },
    "graffiti-letters": {
        "landing": "Printable graffiti letters: the first sheet of the A to Z set as hollow graffiti outlines to color in",
    },
    "letter-tracing": {
        "landing": "Letter tracing worksheet sample: {demo} as a solid model above dotted rows to trace on ruled handwriting lines",
    },
    "name-tracing": {
        "landing": "Name tracing worksheet sample for {demo}: a solid model above outlined rows to trace, then blank ruled lines",
    },
    "handwriting-worksheet-generator": {
        "landing": "Handwriting worksheet sample for {demo}: a solid model above bold dotted rows to trace, then blank ruled lines",
    },
    "sight-word-tracing": {
        "landing": "Sight word tracing worksheet sample for the word {demo}: a solid model above dotted rows to trace on ruled lines",
    },
    "coloring-page-maker": {
        "landing": "Name coloring page sample: the name {demo} as large hollow letters filled with hearts to color in, under a heading and inside a star border",
    },
    "dot-to-dot-name": {
        "landing": "Dot to dot name sample: {DEMO} as numbered dots to connect, one loop per letter",
    },
    "name-puzzle-maker": {
        "landing": "Name puzzle sample: {DEMO} as hollow letter pieces separated by dashed cut lines",
    },
    "banner-maker": {
        "landing": "Printable banner sample: the first sheet of pennant flags spelling {demo}, one letter per flag",
    },
    "cross-stitch-letters": {
        "landing": "Cross-stitch letter chart sample: the word {DEMO} as X stitches on a 5 by 7 grid",
    },
    "monogram-maker": {
        "landing": "Monogram sample: the initials J, S and L in an elegant serif, small, large, small",
    },
    "_cursive_phrase": {
        "landing": "{demo} in cursive: a script model above outlined copies to trace on ruled lines",
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
    """Which sheet family a page belongs to, for its alt text. Locale pages
    reuse EN keys except where a locale page carries its own key for the same
    engine setup."""
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
