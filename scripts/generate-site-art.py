#!/usr/bin/env python3
"""
Generates the site-wide illustration set for UltraTextGen.

Extends the visual system introduced for the /guide/ section (see
guide/assets/_generate.py, PR #243) to every page that was still falling back
to the generic /logo.png social card.

For each page it emits:
  - /assets/hero/<slug>.svg   in-page decorative hero banner (1200x340)
  - /assets/og/<slug>.png     1200x630 social card with baked title + brand

Run:  python3 scripts/generate-site-art.py
Requires: cairosvg (PNG rasterization). SVGs are valid standalone assets.
Arabic titles additionally need arabic-reshaper + python-bidi (cairosvg has
no shaping/bidi engine of its own — see spanned()) and the fonts-noto-core
apt package for Noto Sans Arabic/Devanagari glyph coverage.

Visual system (shared with the guide set): soft off-white panel, brand
purple->blue gradient accents, a faint dot grid, and one focal motif per page
built from vector primitives + raster-safe system-font glyphs only. Colour
emoji, runic and hieroglyph code points do NOT rasterize in the bundled fonts,
so those themes use hand-drawn vector motifs instead of baked glyphs.
"""
import os
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
HERO = os.path.join(ROOT, "assets", "hero")
OG = os.path.join(ROOT, "assets", "og")
os.makedirs(HERO, exist_ok=True)
os.makedirs(OG, exist_ok=True)

PURPLE = "#8b5cf6"
BLUE = "#3b82f6"
INK = "#1a1a2e"
SUB = "#64748b"
PANEL = "#FBFBFE"
PANEL2 = "#F2F1FB"
SANS = "Liberation Sans, DejaVu Sans, sans-serif"
SERIF = "Georgia, 'Liberation Serif', 'DejaVu Serif', serif"
SYM = "DejaVu Sans, sans-serif"  # raster-safe symbol coverage

# ---------------------------------------------------------------- shared defs


def defs(idp, a=PURPLE, b=BLUE):
    return f"""
  <defs>
    <linearGradient id="g{idp}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{a}"/>
      <stop offset="1" stop-color="{b}"/>
    </linearGradient>
    <linearGradient id="gv{idp}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{a}"/>
      <stop offset="1" stop-color="{b}"/>
    </linearGradient>
    <radialGradient id="glow{idp}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="{a}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="{a}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots{idp}" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="{INK}" opacity="0.06"/>
    </pattern>
  </defs>"""


def esc(s):
    return (s.replace("&amp;", "&").replace("&", "&amp;")
             .replace("<", "&lt;").replace(">", "&gt;"))


# ------------------------------------------------- non-Latin script fallback
# cairosvg resolves ONE font per <text>/<tspan> run (no per-glyph fallback
# like a browser) — and picks it by matching the FIRST name in font-family
# that fontconfig can find, not the first that actually covers the glyph. So
# a mixed-run title (Korean headline + a "★" someone typed into the SEO
# title, a Devanagari headline with a Latin brand name in it) needs every
# run that Liberation Sans can't render pulled into its own
# <tspan font-family="..."> pointing at a font that can.
#
# Rather than hand-list Unicode block ranges per script (fragile — this site's
# titles routinely carry decorative marks from unrelated blocks: Javanese
# ꧁꧂ frames, Tibetan ༺༻, misc dingbats), each candidate font's cmap is read
# directly so ANY character gets routed to a font that actually contains it.
NATIVE_SCRIPT = {
    "ar": "Noto Sans Arabic",
    "hi": "Noto Sans Devanagari",
    "th": "Noto Sans Thai",
    "ja": "Noto Sans CJK JP",
    "ko": "Noto Sans CJK KR",
    "zh": "WenQuanYi Zen Hei",
}

# (family name written into the SVG, glob patterns to find its file).
# Checked in order after the locale's own native family; DejaVu Sans alone
# covers most decorative dingbats already in use across the site.
_FALLBACK_FONTS = [
    ("DejaVu Sans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ("Noto Sans Symbols2", "/usr/share/fonts/truetype/noto/NotoSansSymbols2-Regular.ttf"),
    ("Noto Sans Symbols", "/usr/share/fonts/truetype/noto/NotoSansSymbols-Regular.ttf"),
    ("Noto Sans Javanese", "/usr/share/fonts/truetype/noto/NotoSansJavanese-Regular.ttf"),
    ("Noto Serif Tibetan", "/usr/share/fonts/truetype/noto/NotoSerifTibetan-Regular.ttf"),
    ("Noto Sans CJK JP", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
]
_NATIVE_FONT_FILE = {
    "Noto Sans Arabic": "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
    "Noto Sans Devanagari": "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
    "Noto Sans Thai": "/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf",
    "Noto Sans CJK JP": "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "Noto Sans CJK KR": "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "WenQuanYi Zen Hei": "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
}

_cmap_cache = {}


def _cmap(path):
    if path not in _cmap_cache:
        cps = set()
        if os.path.exists(path):
            from fontTools.ttLib import TTFont
            tt = TTFont(path, fontNumber=0, lazy=True)
            for table in tt["cmap"].tables:
                cps.update(table.cmap.keys())
        _cmap_cache[path] = cps
    return _cmap_cache[path]


_LIBERATION_SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"


def _resolve_family(ch, native_family):
    """None -> the default font-family chain already renders this char.
    A family name -> wrap it in a tspan for that family. False -> no
    installed font covers it; drop the character rather than show tofu."""
    cp = ord(ch)
    if cp in _cmap(_LIBERATION_SANS):
        return None
    if native_family and cp in _cmap(_NATIVE_FONT_FILE[native_family]):
        return native_family
    for family, path in _FALLBACK_FONTS:
        if cp in _cmap(path):
            return family
    return False


def spanned(text, native):
    """esc(text), wrapping any run the default font can't render in its own
    <tspan font-family="...">, resolved per-character against installed
    font cmaps. native is a family name from NATIVE_SCRIPT, or None."""
    if not text:
        return ""
    if native == "Noto Sans Arabic":
        # cairosvg has no shaping engine — it draws codepoints in logical
        # order, left to right, which renders Arabic as disconnected
        # isolated-form letters read in the wrong direction. Reshape into
        # the correct contextual (joined) presentation forms, then reorder
        # into visual order, so the plain per-character layout below,
        # which resolves each *already-correct* glyph against font cmaps,
        # just works.
        import arabic_reshaper
        from bidi.algorithm import get_display
        text = get_display(arabic_reshaper.reshape(text))
    runs, cur, cur_family = [], "", None
    first = True
    for ch in text:
        fam = _resolve_family(ch, native)
        if fam is False:
            continue  # no installed font covers this glyph — drop it
        if first or fam == cur_family:
            cur += ch
        else:
            runs.append((cur_family, cur))
            cur = ch
        cur_family = fam
        first = False
    if cur:
        runs.append((cur_family, cur))
    out = ""
    for fam, chunk in runs:
        out += (f'<tspan font-family="{fam}">{esc(chunk)}</tspan>'
                if fam else esc(chunk))
    return out


def smart_wrap(text, width):
    """textwrap.wrap, but falls back to fixed-width character chunking when
    there are no spaces to break on (Thai and Japanese titles routinely have
    none — a single 'word' would otherwise blow past the card width)."""
    words = textwrap.wrap(text, width=width)
    if len(words) <= 1 and len(text) > width:
        return [text[i:i + width] for i in range(0, len(text), width)]
    return words


def wrap_width_for(text, native):
    if native in ("Noto Sans CJK JP", "Noto Sans CJK KR"):
        return 9  # CJK glyphs render roughly twice as wide as Latin
    if native:
        return 14
    return 17


# ---------------------------------------------------------------- motifs
# Each motif draws inside a 360x360 box (origin top-left) and is translated into
# place by the caller. Motifs receive the gradient-id prefix `p` and optionally
# a tuple of extra params via functools.partial in the registry.


def scatter_glyphs(p, glyphs, accent=PURPLE):
    """A constellation of raster-safe symbol glyphs, one rendered as the bold
    focal mark on the brand chip and the rest orbiting it on thin links."""
    # layout: focal centre + up to 4 satellites
    spots = [(70, 96, 60, "stroke"), (300, 104, 52, "blue"),
             (108, 282, 50, "sub"), (286, 262, 50, "ink")]
    g = [esc(ch) for ch in glyphs[:5]]
    focal = g[0]
    sats = g[1:5]
    lines = ""
    nodes = ""
    for i, ch in enumerate(sats):
        x, y, sz, kind = spots[i]
        lines += f'<line x1="180" y1="158" x2="{x}" y2="{y-18}" stroke="{accent}" stroke-width="1.5" opacity="0.32"/>'
        if kind == "blue":
            nodes += (f'<text x="{x}" y="{y}" font-family="{SYM}" font-size="{sz}" '
                      f'fill="{BLUE}" text-anchor="middle">{ch}</text>')
        elif kind == "sub":
            nodes += (f'<text x="{x}" y="{y}" font-family="{SYM}" font-size="{sz}" '
                      f'fill="{SUB}" text-anchor="middle" opacity="0.8">{ch}</text>')
        elif kind == "ink":
            nodes += (f'<text x="{x}" y="{y}" font-family="{SYM}" font-size="{sz}" '
                      f'fill="{INK}" text-anchor="middle">{ch}</text>')
        else:
            nodes += (f'<text x="{x}" y="{y}" font-family="{SYM}" font-size="{sz}" '
                      f'fill="none" stroke="{INK}" stroke-width="1.6" text-anchor="middle">{ch}</text>')
    return f"""
    <g>{lines}</g>
    {nodes}
    <circle cx="180" cy="158" r="58" fill="url(#g{p})"/>
    <text x="180" y="182" font-family="{SYM}" font-size="66" fill="#fff"
          text-anchor="middle">{focal}</text>"""


def m_typo(p, sample="Aa", **kw):
    """A type specimen for category pages: a sample set in the category's
    own treatment, on the brand chip, with a faint echo behind it."""
    ff = kw.get("ff", SANS)
    weight = kw.get("weight", "700")
    style = kw.get("style", "normal")
    deco = kw.get("deco", "none")
    rot = kw.get("rot", 0)
    size = kw.get("size", 120)
    label = esc(kw.get("label", ""))
    sample = esc(sample)
    spacing = kw.get("spacing", "0")
    inner = (f'<text x="180" y="208" font-family="{ff}" font-size="{size}" '
             f'font-weight="{weight}" font-style="{style}" '
             f'text-decoration="{deco}" letter-spacing="{spacing}" '
             f'fill="#fff" text-anchor="middle">{sample}</text>')
    extra = kw.get("extra", "")
    lab_ff = kw.get("lab_ff", SANS)
    lab = ""
    if label:
        lab = (f'<text x="180" y="318" font-family="{lab_ff}" font-size="20" '
               f'fill="{SUB}" text-anchor="middle">{label}</text>')
    return f"""
    <text x="180" y="208" font-family="{ff}" font-size="{size+40}"
          font-weight="{weight}" font-style="{style}" fill="url(#g{p})"
          text-anchor="middle" opacity="0.12">{sample}</text>
    <rect x="40" y="120" width="280" height="150" rx="28" fill="url(#g{p})"/>
    <g transform="rotate({rot} 180 195)">{inner}</g>
    {extra}{lab}"""


def m_chat(p, accent=PURPLE):
    """Stacked message bubbles, one styled — for messaging platforms."""
    return f"""
    <g>
      <rect x="34" y="66" width="180" height="62" rx="18" fill="#fff"
            stroke="{INK}" stroke-opacity="0.12"/>
      <rect x="56" y="88" width="120" height="9" rx="4" fill="{SUB}" opacity="0.5"/>
      <rect x="56" y="106" width="78" height="9" rx="4" fill="{SUB}" opacity="0.3"/>
    </g>
    <g>
      <rect x="92" y="146" width="232" height="80" rx="22" fill="url(#g{p})"/>
      <rect x="116" y="172" width="150" height="11" rx="5" fill="#fff"/>
      <rect x="116" y="194" width="104" height="11" rx="5" fill="#fff" opacity="0.7"/>
      <polygon points="120,224 120,252 148,224" fill="url(#g{p})"/>
    </g>
    <g>
      <rect x="54" y="246" width="172" height="58" rx="18" fill="#fff"
            stroke="{INK}" stroke-opacity="0.12"/>
      <rect x="76" y="266" width="112" height="9" rx="4" fill="{SUB}" opacity="0.5"/>
    </g>"""


def m_profile(p, accent=PURPLE):
    """Profile card with avatar, styled name and bio lines."""
    return f"""
    <rect x="54" y="64" width="252" height="232" rx="26" fill="#fff"
          stroke="{INK}" stroke-opacity="0.10"/>
    <circle cx="116" cy="128" r="34" fill="url(#g{p})"/>
    <rect x="166" y="106" width="118" height="16" rx="8" fill="{INK}"/>
    <rect x="166" y="134" width="86" height="11" rx="5" fill="{SUB}" opacity="0.5"/>
    <rect x="80" y="194" width="200" height="11" rx="5" fill="{SUB}" opacity="0.4"/>
    <rect x="80" y="216" width="170" height="11" rx="5" fill="{SUB}" opacity="0.4"/>
    <rect x="80" y="252" width="120" height="26" rx="13" fill="url(#gv{p})"/>"""


def m_play(p, accent=PURPLE):
    """Video card with a play button — for video platforms."""
    return f"""
    <rect x="46" y="78" width="268" height="166" rx="24" fill="url(#g{p})"/>
    <circle cx="180" cy="161" r="46" fill="#fff"/>
    <polygon points="166,138 166,184 206,161" fill="url(#g{p})"/>
    <rect x="46" y="262" width="190" height="13" rx="6" fill="{SUB}" opacity="0.5"/>
    <rect x="46" y="288" width="120" height="13" rx="6" fill="{SUB}" opacity="0.3"/>"""


def m_pins(p, accent=PURPLE):
    """Offset pin cards — for Pinterest."""
    return f"""
    <rect x="40" y="70" width="120" height="150" rx="20" fill="url(#g{p})"/>
    <rect x="176" y="60" width="120" height="100" rx="20" fill="#fff"
          stroke="{INK}" stroke-opacity="0.12"/>
    <rect x="176" y="176" width="120" height="120" rx="20" fill="{PANEL2}"/>
    <rect x="40" y="236" width="120" height="60" rx="18" fill="#fff"
          stroke="{INK}" stroke-opacity="0.12"/>
    <circle cx="236" cy="236" r="26" fill="url(#gv{p})"/>"""


def m_qa(p, accent=PURPLE):
    """A question mark over an answer card — for the answers section."""
    return f"""
    <circle cx="180" cy="120" r="64" fill="url(#g{p})"/>
    <text x="180" y="150" font-family="{SANS}" font-size="86" font-weight="700"
          fill="#fff" text-anchor="middle">?</text>
    <rect x="60" y="208" width="240" height="92" rx="20" fill="#fff"
          stroke="{INK}" stroke-opacity="0.10"/>
    <rect x="84" y="232" width="150" height="11" rx="5" fill="{SUB}" opacity="0.5"/>
    <rect x="84" y="254" width="192" height="11" rx="5" fill="{SUB}" opacity="0.35"/>
    <rect x="84" y="276" width="120" height="11" rx="5" fill="{SUB}" opacity="0.35"/>"""


def m_transform(p, a="A", b="B", accent=PURPLE):
    """A -> B transformation — for converter use cases."""
    return f"""
    <rect x="30" y="120" width="120" height="120" rx="24" fill="#fff"
          stroke="{INK}" stroke-opacity="0.12"/>
    <text x="90" y="200" font-family="{SANS}" font-size="58" font-weight="700"
          fill="{SUB}" text-anchor="middle">{a}</text>
    <g transform="translate(180 180)">
      <rect x="-26" y="-5" width="48" height="10" rx="5" fill="url(#g{p})"/>
      <polygon points="18,-12 40,0 18,12" fill="{BLUE}"/>
    </g>
    <rect x="210" y="120" width="120" height="120" rx="24" fill="url(#g{p})"/>
    <text x="270" y="200" font-family="{SYM}" font-size="58" font-weight="700"
          fill="#fff" text-anchor="middle">{b}</text>"""


def m_vertical(p, letters="WAIT", accent=PURPLE):
    g = ""
    for i, ch in enumerate(letters[:4]):
        y = 96 + i * 60
        g += (f'<text x="128" y="{y}" font-family="{SANS}" font-size="52" '
              f'font-weight="700" fill="url(#gv{p})" text-anchor="middle">{ch}</text>')
    flow = ""
    for i in range(4):
        y = 78 + i * 60
        flow += (f'<line x1="178" y1="{y}" x2="316" y2="{y}" stroke="{SUB}" '
                 f'stroke-width="9" stroke-linecap="round" opacity="0.22"/>')
    return f"{flow}{g}"


def m_headline(p, accent=PURPLE):
    """A highlighted first line over muted body lines."""
    return f"""
    <rect x="48" y="84" width="232" height="30" rx="9" fill="url(#g{p})"/>
    <rect x="48" y="138" width="180" height="12" rx="6" fill="{SUB}" opacity="0.35"/>
    <rect x="48" y="164" width="216" height="12" rx="6" fill="{SUB}" opacity="0.35"/>
    <rect x="48" y="190" width="150" height="12" rx="6" fill="{SUB}" opacity="0.35"/>
    <g transform="translate(286 70)">
      <path d="M0 30 L10 8 L20 24 L30 4 L40 24 L50 8 L60 30 Z" fill="url(#g{p})"/>
    </g>"""


def m_zalgo(p, accent=PURPLE):
    """Glitch text: a base word with stacked diacritic chaos."""
    marks = ""
    import math
    base = "ZALGO"
    spans = ""
    for i, ch in enumerate(base):
        x = 60 + i * 50
        spans += (f'<text x="{x}" y="190" font-family="{SANS}" font-size="56" '
                  f'font-weight="700" fill="url(#gv{p})">{ch}</text>')
        for k in range(4):
            yy = 150 - k * 14
            spans += (f'<line x1="{x+6}" y1="{yy}" x2="{x+18}" y2="{yy-8}" '
                      f'stroke="{INK}" stroke-width="2" opacity="{0.5 - k*0.1:.2f}"/>')
        for k in range(4):
            yy = 210 + k * 13
            spans += (f'<line x1="{x+8}" y1="{yy}" x2="{x+16}" y2="{yy+7}" '
                      f'stroke="{PURPLE}" stroke-width="2" opacity="{0.5 - k*0.1:.2f}"/>')
    return spans


def m_doc(p, accent=PURPLE):
    """A document sheet with a seal — for legal pages."""
    return f"""
    <rect x="92" y="58" width="176" height="234" rx="14" fill="#fff"
          stroke="{INK}" stroke-opacity="0.12"/>
    <rect x="116" y="86" width="128" height="11" rx="5" fill="{INK}" opacity="0.7"/>
    <rect x="116" y="116" width="128" height="8" rx="4" fill="{SUB}" opacity="0.4"/>
    <rect x="116" y="134" width="110" height="8" rx="4" fill="{SUB}" opacity="0.4"/>
    <rect x="116" y="152" width="128" height="8" rx="4" fill="{SUB}" opacity="0.4"/>
    <rect x="116" y="170" width="92" height="8" rx="4" fill="{SUB}" opacity="0.4"/>
    <circle cx="232" cy="248" r="40" fill="url(#g{p})"/>
    <path d="M214 248 l12 12 l22 -24" fill="none" stroke="#fff" stroke-width="7"
          stroke-linecap="round" stroke-linejoin="round"/>"""


def m_brand(p, accent=PURPLE):
    """Typographic constellation — the master brand motif."""
    return f"""
    <g stroke="{PURPLE}" stroke-width="1.5" opacity="0.35">
      <line x1="78" y1="92" x2="180" y2="158"/>
      <line x1="180" y1="158" x2="296" y2="100"/>
      <line x1="180" y1="158" x2="124" y2="276"/>
      <line x1="180" y1="158" x2="282" y2="256"/>
    </g>
    <text x="78" y="108" font-family="{SANS}" font-size="60" font-weight="700"
          fill="none" stroke="{INK}" stroke-width="2" text-anchor="middle">A</text>
    <text x="298" y="116" font-family="{SERIF}" font-size="58" font-style="italic"
          fill="{BLUE}" text-anchor="middle">g</text>
    <text x="124" y="292" font-family="{SANS}" font-size="54" font-weight="700"
          fill="{SUB}" text-anchor="middle">x</text>
    <text x="282" y="272" font-family="{SYM}" font-size="52"
          fill="{INK}" text-anchor="middle">★</text>
    <circle cx="180" cy="158" r="50" fill="url(#g{p})"/>
    <text x="180" y="178" font-family="{SANS}" font-size="52" font-weight="700"
          fill="#fff" text-anchor="middle">U</text>"""


def m_grid(p, accent=PURPLE):
    """A grid of style tiles — for index / overview pages."""
    cells = ""
    items = [("Aa", "700", "normal", SANS), ("Aa", "400", "italic", SERIF),
             ("★", "400", "normal", SYM), ("Aa", "700", "normal", SERIF),
             ("Aa", "400", "normal", SANS), ("♥", "400", "normal", SYM)]
    i = 0
    for r in range(2):
        for c in range(3):
            x = 40 + c * 100
            y = 96 + r * 104
            sample, w, st, ff = items[i]
            hot = (i == 1)
            fill = f"url(#g{p})" if hot else "#fff"
            txt = "#fff" if hot else INK
            cells += f"""
            <rect x="{x}" y="{y}" width="84" height="84" rx="18" fill="{fill}"
                  stroke="{INK}" stroke-opacity="{0 if hot else 0.10}"/>
            <text x="{x+42}" y="{y+56}" font-family="{ff}" font-size="40"
                  font-weight="{w}" font-style="{st}" fill="{txt}"
                  text-anchor="middle">{sample}</text>"""
            i += 1
    return cells


# ----- vector motifs for emoji-only / branded themes (no safe glyph) -----

def m_paw(p, accent=PURPLE):
    pads = ""
    for cx, cy, r in [(140, 120, 20), (180, 104, 22), (222, 116, 20), (250, 150, 18)]:
        pads += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#g{p})"/>'
    return f"""{pads}
    <path d="M150 230 q40 -52 80 0 q22 38 -22 52 q-18 6 -36 0 q-44 -14 -22 -52 Z"
          fill="url(#gv{p})"/>"""


def m_smiley(p, accent=PURPLE):
    return f"""
    <circle cx="180" cy="180" r="96" fill="url(#g{p})"/>
    <circle cx="150" cy="156" r="13" fill="#fff"/>
    <circle cx="210" cy="156" r="13" fill="#fff"/>
    <path d="M138 206 q42 46 84 0" fill="none" stroke="#fff" stroke-width="11"
          stroke-linecap="round"/>"""


def m_sunglasses(p, accent=PURPLE):
    """A pair of flat sunglasses lenses on a bridge — sunglasses emoji is
    color-only and does not rasterize in the bundled fonts."""
    return f"""
    <rect x="76" y="150" width="92" height="66" rx="20" fill="url(#g{p})"/>
    <rect x="192" y="150" width="92" height="66" rx="20" fill="url(#g{p})"/>
    <path d="M168 168 q12 -10 24 0" fill="none" stroke="url(#g{p})" stroke-width="9"
          stroke-linecap="round"/>
    <line x1="66" y1="164" x2="76" y2="170" stroke="{SUB}" stroke-width="8" stroke-linecap="round"/>
    <line x1="294" y1="164" x2="284" y2="170" stroke="{SUB}" stroke-width="8" stroke-linecap="round"/>"""


def m_camera(p, accent=PURPLE):
    return f"""
    <rect x="60" y="116" width="240" height="160" rx="30" fill="url(#g{p})"/>
    <rect x="120" y="96" width="80" height="34" rx="12" fill="url(#g{p})"/>
    <circle cx="180" cy="196" r="52" fill="{PANEL}"/>
    <circle cx="180" cy="196" r="30" fill="url(#gv{p})"/>
    <circle cx="262" cy="146" r="10" fill="#fff"/>"""


def m_calendar(p, accent=PURPLE):
    """A calendar page with binder rings and a highlighted date cell — the
    calendar emoji is color-only and does not rasterize in bundled fonts."""
    return f"""
    <rect x="88" y="112" width="184" height="168" rx="24" fill="{PANEL}" stroke="{INK}" stroke-opacity="0.08" stroke-width="2"/>
    <path d="M88 168 v-32 a24 24 0 0 1 24 -24 h136 a24 24 0 0 1 24 24 v32 Z" fill="url(#g{p})"/>
    <rect x="124" y="88" width="16" height="40" rx="8" fill="{INK}"/>
    <rect x="220" y="88" width="16" height="40" rx="8" fill="{INK}"/>
    <rect x="112" y="192" width="30" height="26" rx="6" fill="{SUB}" opacity="0.18"/>
    <rect x="150" y="192" width="30" height="26" rx="6" fill="{SUB}" opacity="0.18"/>
    <rect x="188" y="192" width="30" height="26" rx="6" fill="{SUB}" opacity="0.18"/>
    <rect x="112" y="228" width="30" height="26" rx="6" fill="{SUB}" opacity="0.18"/>
    <rect x="150" y="228" width="30" height="26" rx="6" fill="url(#gv{p})"/>
    <rect x="188" y="228" width="30" height="26" rx="6" fill="{SUB}" opacity="0.18"/>
    <text x="165" y="248" font-family="{SANS}" font-size="17" font-weight="700"
          fill="#fff" text-anchor="middle">17</text>"""


def m_flag(p, accent=PURPLE):
    return f"""
    <line x1="92" y1="60" x2="92" y2="300" stroke="{INK}" stroke-width="9"
          stroke-linecap="round"/>
    <path d="M92 72 q60 -28 120 0 q60 28 120 0 l0 96 q-60 28 -120 0 q-60 -28 -120 0 Z"
          fill="url(#g{p})"/>"""


def m_trophy(p, accent=PURPLE):
    return f"""
    <path d="M120 86 h120 v40 a60 60 0 0 1 -120 0 Z" fill="url(#g{p})"/>
    <path d="M118 96 h-26 a22 22 0 0 0 44 6" fill="none" stroke="{PURPLE}"
          stroke-width="8"/>
    <path d="M242 96 h26 a22 22 0 0 1 -44 6" fill="none" stroke="{PURPLE}"
          stroke-width="8"/>
    <rect x="168" y="184" width="24" height="44" fill="url(#gv{p})"/>
    <rect x="132" y="228" width="96" height="22" rx="8" fill="url(#g{p})"/>
    <rect x="146" y="252" width="68" height="20" rx="8" fill="{SUB}" opacity="0.5"/>
    <text x="180" y="142" font-family="{SYM}" font-size="44" fill="#fff"
          text-anchor="middle">★</text>"""


def m_ribbon(p, accent=PURPLE):
    return f"""
    <path d="M180 80 C150 80 132 104 132 138 C132 168 156 188 180 188
             C204 188 228 168 228 138 C228 104 210 80 180 80 Z M180 110
             a28 28 0 1 0 0.1 0 Z" fill="url(#g{p})"/>
    <path d="M164 182 L138 280 L172 256 L180 292 L188 256 L222 280 L196 182 Z"
          fill="url(#gv{p})"/>"""


def m_bow(p, accent=PURPLE):
    return f"""
    <path d="M180 180 L92 132 q-26 48 0 96 Z" fill="url(#g{p})"/>
    <path d="M180 180 L268 132 q26 48 0 96 Z" fill="url(#g{p})"/>
    <circle cx="180" cy="180" r="22" fill="url(#gv{p})"/>
    <path d="M168 198 L132 286" stroke="url(#gv{p})" stroke-width="14"
          stroke-linecap="round"/>
    <path d="M192 198 L228 286" stroke="url(#gv{p})" stroke-width="14"
          stroke-linecap="round"/>"""


def m_car(p, accent=PURPLE):
    return f"""
    <path d="M64 210 l24 -56 q8 -18 28 -18 h128 q20 0 28 18 l24 56 v44 h-32
             a26 26 0 0 1 -52 0 h-64 a26 26 0 0 1 -52 0 h-32 Z" fill="url(#g{p})"/>
    <path d="M110 158 h60 v34 h-78 Z" fill="#fff" opacity="0.85"/>
    <path d="M186 158 h44 l14 34 h-58 Z" fill="#fff" opacity="0.85"/>
    <circle cx="118" cy="254" r="20" fill="{INK}"/>
    <circle cx="244" cy="254" r="20" fill="{INK}"/>"""


def m_ball(p, accent=PURPLE):
    return f"""
    <circle cx="180" cy="180" r="92" fill="url(#g{p})"/>
    <path d="M180 110 l40 30 -16 48 h-48 l-16 -48 Z" fill="#fff"/>
    <path d="M180 100 v-8 M252 158 l8 -4 M232 250 l6 6 M128 250 l-6 6 M108 158 l-8 -4"
          stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.7"/>"""


def m_person(p, accent=PURPLE):
    return f"""
    <circle cx="180" cy="128" r="46" fill="url(#g{p})"/>
    <path d="M96 296 a84 84 0 0 1 168 0 Z" fill="url(#gv{p})"/>
    <circle cx="262" cy="110" r="26" fill="#fff" stroke="{INK}" stroke-opacity="0.12"/>
    <path d="M250 110 l8 8 l16 -18" fill="none" stroke="{PURPLE}" stroke-width="6"
          stroke-linecap="round" stroke-linejoin="round"/>"""


def m_sign(p, accent=PURPLE):
    return f"""
    <polygon points="180,72 300,288 60,288" fill="url(#g{p})"/>
    <polygon points="180,104 268,272 92,272" fill="{PANEL}"/>
    <rect x="170" y="150" width="20" height="64" rx="8" fill="{INK}"/>
    <circle cx="180" cy="240" r="13" fill="{INK}"/>"""


def m_block(p, accent=PURPLE):
    return f"""
    <path d="M180 70 L286 128 L180 186 L74 128 Z" fill="url(#g{p})"/>
    <path d="M74 128 L180 186 L180 300 L74 242 Z" fill="url(#gv{p})" opacity="0.85"/>
    <path d="M286 128 L180 186 L180 300 L286 242 Z" fill="{PURPLE}" opacity="0.5"/>
    <circle cx="150" cy="150" r="7" fill="#fff"/>
    <circle cx="208" cy="150" r="7" fill="#fff"/>"""


def m_xmark(p, accent=PURPLE):
    return f"""
    <rect x="80" y="80" width="200" height="200" rx="36" fill="url(#g{p})"/>
    <path d="M132 132 L228 228 M228 132 L132 228" stroke="#fff" stroke-width="22"
          stroke-linecap="round"/>"""


def m_ankh(p, accent=PURPLE):
    # gradient-filled rects (not lines: a zero-width line has a degenerate
    # objectBoundingBox and a gradient stroke would not paint).
    return f"""
    <rect x="60" y="64" width="34" height="232" rx="8" fill="{SUB}" opacity="0.16"/>
    <rect x="266" y="64" width="34" height="232" rx="8" fill="{SUB}" opacity="0.16"/>
    <circle cx="180" cy="120" r="42" fill="none" stroke="url(#g{p})" stroke-width="22"/>
    <rect x="168" y="156" width="24" height="148" rx="10" fill="url(#gv{p})"/>
    <rect x="112" y="196" width="136" height="24" rx="10" fill="url(#gv{p})"/>"""


def m_rune(p, accent=PURPLE):
    """Angular rune-style strokes (vector, since the Runic block is tofu)."""
    strokes = [
        "M96 70 L96 290 M96 70 L168 150 M96 200 L160 150",
        "M210 70 L210 290 M210 70 L276 110 L210 150 M210 150 L276 110",
        "M300 70 L300 290",
    ]
    g = ""
    for i, d in enumerate(strokes):
        col = f"url(#gv{p})" if i == 1 else INK
        op = "1" if i == 1 else "0.85"
        g += (f'<path d="{d}" fill="none" stroke="{col}" stroke-width="14" '
              f'stroke-linecap="round" stroke-linejoin="round" opacity="{op}"/>')
    return g


def m_divider(p, accent=PURPLE):
    rows = ""
    samples = ["✦ ━━━━ ✦", "•   •   •", "❖ ⁂ ❖", "─── ★ ───"]
    for i, s in enumerate(samples):
        y = 96 + i * 56
        hot = (i == 1)
        if hot:
            rows += f'<rect x="40" y="{y-34}" width="280" height="48" rx="14" fill="url(#g{p})"/>'
            rows += (f'<text x="180" y="{y}" font-family="{SYM}" font-size="30" '
                     f'fill="#fff" text-anchor="middle" letter-spacing="4">{s}</text>')
        else:
            rows += (f'<text x="180" y="{y}" font-family="{SYM}" font-size="28" '
                     f'fill="{SUB}" text-anchor="middle" letter-spacing="4" '
                     f'opacity="0.7">{s}</text>')
    return rows


def m_kaomoji(p, accent=PURPLE):
    return f"""
    <rect x="44" y="120" width="272" height="120" rx="28" fill="url(#g{p})"/>
    <text x="180" y="208" font-family="{SYM}" font-size="60" font-weight="700"
          fill="#fff" text-anchor="middle">(•‿•)</text>
    <text x="96" y="300" font-family="{SYM}" font-size="34" fill="{SUB}"
          text-anchor="middle" opacity="0.6">^_^</text>
    <text x="270" y="96" font-family="{SYM}" font-size="34" fill="{SUB}"
          text-anchor="middle" opacity="0.6">ʕ•ᴥ•ʔ</text>"""


def m_cup(p, accent=PURPLE):
    return f"""
    <path d="M104 140 h132 l-12 132 a20 20 0 0 1 -20 18 h-68 a20 20 0 0 1 -20 -18 Z"
          fill="url(#g{p})"/>
    <path d="M236 156 h26 a26 26 0 0 1 0 52 h-22" fill="none" stroke="{PURPLE}"
          stroke-width="10"/>
    <path d="M140 108 q8 -16 0 -32 M170 108 q8 -16 0 -32 M200 108 q8 -16 0 -32"
          fill="none" stroke="{SUB}" stroke-width="7" stroke-linecap="round"
          opacity="0.5"/>"""


def m_at(p, accent=PURPLE):
    return f"""
    <circle cx="180" cy="180" r="92" fill="none" stroke="url(#gv{p})" stroke-width="16"/>
    <text x="180" y="226" font-family="{SANS}" font-size="150" font-weight="700"
          fill="url(#g{p})" text-anchor="middle">@</text>"""


def m_gamepad(p, accent=PURPLE):
    """A game controller — for gaming-nickname generators and tags."""
    return f"""
    <path d="M84 168 q6 -54 66 -54 h60 q60 0 66 54 l12 62 a32 32 0 0 1 -58 26
             l-18 -30 h-56 l-18 30 a32 32 0 0 1 -58 -26 Z" fill="url(#g{p})"/>
    <rect x="116" y="152" width="10" height="36" rx="4" fill="#fff"/>
    <rect x="99" y="164" width="44" height="10" rx="4" fill="#fff"/>
    <circle cx="258" cy="158" r="11" fill="#fff"/>
    <circle cx="232" cy="182" r="11" fill="#fff" opacity="0.85"/>
    <circle cx="284" cy="182" r="11" fill="#fff" opacity="0.7"/>"""


def m_plane(p, accent=PURPLE):
    """A paper-plane dart on a flight path — for travel content."""
    return f"""
    <path d="M180 70 L232 220 L182 196 L150 236 L146 190 L60 176 Z" fill="url(#g{p})"/>
    <path d="M180 70 L182 196" stroke="{PANEL}" stroke-width="4" opacity="0.5"/>
    <path d="M60 262 q60 -20 120 0 q60 20 120 0" fill="none" stroke="{SUB}"
          stroke-width="6" stroke-linecap="round" opacity="0.3"/>"""


def m_microphone(p, accent=PURPLE):
    """A microphone capsule with grille lines and a stand base — the
    microphone emoji is color-only and does not rasterize in bundled fonts."""
    return f"""
    <rect x="140" y="70" width="80" height="140" rx="40" fill="url(#g{p})"/>
    <line x1="156" y1="100" x2="204" y2="100" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
    <line x1="156" y1="122" x2="204" y2="122" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
    <line x1="156" y1="144" x2="204" y2="144" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
    <line x1="156" y1="166" x2="204" y2="166" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
    <path d="M110 190 a70 70 0 0 0 140 0" fill="none" stroke="url(#g{p})" stroke-width="12" stroke-linecap="round"/>
    <line x1="180" y1="260" x2="180" y2="292" stroke="{INK}" stroke-width="10" stroke-linecap="round"/>
    <line x1="146" y1="300" x2="214" y2="300" stroke="{INK}" stroke-width="10" stroke-linecap="round"/>"""


def m_pumpkin(p, accent=PURPLE):
    """A jack-o'-lantern — for Halloween/spooky content."""
    return f"""
    <rect x="168" y="60" width="24" height="46" rx="10" fill="{SUB}"/>
    <path d="M96 190 q-6 -86 84 -86 q90 0 84 86 q6 76 -84 76 q-90 0 -84 -76 Z" fill="url(#g{p})"/>
    <path d="M136 130 v120 M180 122 v128 M224 130 v120" stroke="{PURPLE}" stroke-width="6"
          opacity="0.35" stroke-linecap="round"/>
    <path d="M144 190 l16 -16 l16 16 M200 190 l16 -16 l16 16" fill="none" stroke="#fff"
          stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M150 226 q30 20 60 0" fill="none" stroke="#fff" stroke-width="8"
          stroke-linecap="round"/>"""


def m_tree(p, accent=PURPLE):
    """A tiered, ornamented tree — for Christmas/holiday content."""
    return f"""
    <path d="M180 62 L228 146 H204 L246 220 H214 L254 288 H106 L146 220 H114
             L156 146 H132 Z" fill="url(#gv{p})"/>
    <rect x="164" y="288" width="32" height="24" rx="6" fill="{SUB}"/>
    <circle cx="180" cy="90" r="10" fill="#fff"/>
    <circle cx="150" cy="180" r="8" fill="#fff" opacity="0.85"/>
    <circle cx="212" cy="200" r="8" fill="#fff" opacity="0.85"/>
    <circle cx="170" cy="250" r="8" fill="#fff" opacity="0.7"/>"""


def m_note(p, accent=PURPLE):
    """A beamed pair of eighth notes — for music content."""
    return f"""
    <rect x="172" y="70" width="14" height="150" rx="6" fill="url(#gv{p})"/>
    <rect x="252" y="70" width="14" height="130" rx="6" fill="url(#gv{p})"/>
    <path d="M172 78 q54 -22 94 0 v34 q-40 -18 -94 0 Z" fill="url(#g{p})"/>
    <ellipse cx="158" cy="228" rx="34" ry="26" fill="url(#g{p})"/>
    <ellipse cx="238" cy="208" rx="30" ry="24" fill="url(#g{p})"/>"""


def m_gear(p, accent=PURPLE):
    """A settings gear — for tech/status content."""
    teeth = "".join(
        f'<rect x="164" y="92" width="32" height="46" rx="6" fill="url(#g{p})" '
        f'transform="rotate({i * 45} 180 180)"/>'
        for i in range(8))
    return f"""{teeth}
    <circle cx="180" cy="180" r="72" fill="url(#g{p})"/>
    <circle cx="180" cy="180" r="32" fill="{PANEL}"/>"""


def m_coin(p, accent=PURPLE):
    """Two stacked coins with a dollar mark — for money/currency content."""
    return f"""
    <ellipse cx="180" cy="264" rx="86" ry="20" fill="{SUB}" opacity="0.25"/>
    <circle cx="180" cy="228" r="70" fill="url(#gv{p})"/>
    <circle cx="180" cy="158" r="70" fill="url(#g{p})"/>
    <text x="180" y="182" font-family="{SANS}" font-size="70" font-weight="700"
          fill="#fff" text-anchor="middle">$</text>"""


def m_shield(p, accent=PURPLE):
    """A shield with an alert mark — for security/warning/hazard content."""
    return f"""
    <path d="M180 64 L268 96 V180 q0 82 -88 118 q-88 -36 -88 -118 V96 Z" fill="url(#g{p})"/>
    <rect x="170" y="112" width="20" height="76" rx="8" fill="#fff"/>
    <circle cx="180" cy="212" r="12" fill="#fff"/>"""


def m_circled_letter(p, letter="A", accent=PURPLE):
    """A bold letter in a ring — for glyphs that don't rasterize in the
    bundled fonts (e.g. circled-Latin anarchy symbol Ⓐ)."""
    return f"""
    <circle cx="180" cy="180" r="104" fill="none" stroke="url(#g{p})" stroke-width="16"/>
    <text x="180" y="222" font-family="{SANS}" font-size="140" font-weight="800"
          fill="url(#g{p})" text-anchor="middle">{esc(letter)}</text>"""


def m_burst_angry(p, accent=PURPLE):
    """A tight comic anger-burst — anger-symbol glyph (💢) is emoji-only
    tofu in the bundled fonts."""
    import math
    cx, cy = 180, 180
    rays = ""
    for i in range(6):
        ang = math.radians(i * 60)
        x1, y1 = cx + 46 * math.cos(ang), cy + 46 * math.sin(ang)
        x2, y2 = cx + 118 * math.cos(ang), cy + 118 * math.sin(ang)
        rays += (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                 f'stroke="{PURPLE}" stroke-width="14" stroke-linecap="round"/>')
    return f"""{rays}
    <circle cx="{cx}" cy="{cy}" r="44" fill="url(#g{p})"/>"""


def m_hamsa(p, accent=PURPLE):
    """A simplified open-palm hand with a central eye — hamsa-symbol glyph
    (🪬) is emoji-only tofu in the bundled fonts."""
    return f"""
    <path d="M180 92 q-40 0 -50 54 q-4 24 4 44
             q-38 -8 -50 22 q-10 26 14 44 q22 16 46 4
             q-6 30 16 48 q20 16 40 0
             q22 -18 16 -48
             q24 12 46 -4 q24 -18 14 -44 q-12 -30 -50 -22
             q8 -20 4 -44 q-10 -54 -50 -54 Z" fill="url(#g{p})"/>
    <circle cx="180" cy="188" r="24" fill="{PANEL}"/>
    <circle cx="180" cy="188" r="11" fill="url(#gv{p})"/>"""


def m_lotus_om(p, accent=PURPLE):
    """A lotus-ring badge — om-symbol glyph (ॐ, Devanagari) needs a font
    this pipeline doesn't bundle."""
    import math
    petals = ""
    for i in range(8):
        ang = math.radians(i * 45)
        x, y = 180 + 96 * math.cos(ang), 180 + 96 * math.sin(ang)
        petals += (f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="26" ry="14" '
                   f'transform="rotate({i * 45} {x:.1f} {y:.1f})" '
                   f'fill="url(#g{p})" opacity="0.85"/>')
    return f"""{petals}
    <circle cx="180" cy="180" r="52" fill="{PANEL}"/>
    <circle cx="180" cy="180" r="52" fill="none" stroke="url(#gv{p})" stroke-width="8"/>"""


def m_pentagram(p, accent=PURPLE):
    """A 5-point star inside a ring — pentagram-symbol glyph (⛧) is
    emoji-only tofu in the bundled fonts."""
    import math
    cx, cy, r = 180, 180, 96
    pts = []
    for i in range(5):
        ang = -math.pi / 2 + i * 2 * math.pi / 5
        pts.append(f"{cx + r * math.cos(ang):.1f},{cy + r * math.sin(ang):.1f}")
    path = f"M{pts[0]} L{pts[2]} L{pts[4]} L{pts[1]} L{pts[3]} Z"
    return f"""
    <circle cx="{cx}" cy="{cy}" r="118" fill="none" stroke="url(#g{p})" stroke-width="10"/>
    <path d="{path}" fill="none" stroke="url(#gv{p})" stroke-width="10"
          stroke-linejoin="round"/>"""


def m_stop_octagon(p, accent=PURPLE):
    """A regular octagon with a bar — stop-sign glyph (🛑) is emoji-only
    tofu in the bundled fonts."""
    import math
    cx, cy, r = 180, 180, 110
    pts = [f"{cx + r * math.sin(math.radians(22.5 + i * 45)):.1f},"
           f"{cy - r * math.cos(math.radians(22.5 + i * 45)):.1f}"
           for i in range(8)]
    return f"""
    <polygon points="{' '.join(pts)}" fill="url(#g{p})"/>
    <rect x="{cx - 70}" y="{cy - 16}" width="140" height="32" rx="8" fill="#fff"/>"""


def m_braille_blank(p, accent=PURPLE):
    """An 8-dot Braille cell drawn with every dot unfilled — the
    invisible-character glyph (⠀, U+2800 BRAILLE PATTERN BLANK) renders as
    nothing at all, so the motif draws the cell structure itself (the "no
    dots raised" pattern) instead of the invisible glyph."""
    cx, cy = 180, 180
    xs = [cx - 32, cx + 32]
    ys = [cy - 68, cy - 22, cy + 22, cy + 68]
    dots = "".join(
        f'<circle cx="{x}" cy="{y}" r="13" fill="none" stroke="url(#g{p})" stroke-width="5"/>'
        for x in xs for y in ys)
    return f"""
    <rect x="{cx - 92}" y="{cy - 112}" width="184" height="224" rx="26"
          fill="none" stroke="url(#gv{p})" stroke-width="4"
          stroke-dasharray="10 8" opacity="0.5"/>
    {dots}"""


# ----- per-letter printables motifs (parametrized by the page's own letter) -----


def m_letter_bubble(p, letter="A"):
    """A single letter in a rounded bubble-outline chip — bubble-letter printables."""
    return f"""
    <rect x="40" y="90" width="280" height="200" rx="36" fill="url(#g{p})"/>
    <circle cx="180" cy="190" r="76" fill="none" stroke="#fff" stroke-width="8"/>
    <text x="180" y="212" font-family="{SANS}" font-size="130" font-weight="800"
          fill="#fff" text-anchor="middle">{esc(letter)}</text>"""


def m_letter_cursive(p, letter="A"):
    """Capital + lowercase pair in italic serif — cursive per-letter printables.
    Italic serif is the raster-safe stand-in for script glyphs (the Unicode
    Mathematical Script block does not rasterize in the bundled fonts)."""
    return f"""
    <rect x="40" y="90" width="280" height="200" rx="36" fill="url(#g{p})"/>
    <line x1="70" y1="252" x2="290" y2="252" stroke="#fff" stroke-width="3" opacity="0.55" stroke-dasharray="2 7"/>
    <text x="150" y="238" font-family="{SERIF}" font-style="italic" font-size="132" font-weight="400"
          fill="#fff" text-anchor="middle">{esc(letter.upper())}</text>
    <text x="252" y="238" font-family="{SERIF}" font-style="italic" font-size="96" font-weight="400"
          fill="#fff" text-anchor="middle">{esc(letter.lower())}</text>"""


def m_letter_dots(p, letter="A"):
    """A large letter surrounded by numbered-dot scatter — dot-to-dot printables."""
    spots = [(70, 90), (300, 80), (60, 260), (310, 250), (180, 50),
             (40, 170), (320, 170), (150, 300), (220, 300)]
    dots = "".join(f'<circle cx="{x}" cy="{y}" r="6" fill="{PURPLE}" opacity="0.55"/>'
                    for x, y in spots)
    return f"""{dots}
    <text x="180" y="250" font-family="{SANS}" font-size="200" font-weight="800"
          fill="url(#g{p})" text-anchor="middle" opacity="0.9">{esc(letter)}</text>"""


def m_letter_outline(p, letter="A"):
    """A hollow letter outline with a crayon — alphabet coloring-page printables."""
    return f"""
    <text x="180" y="250" font-family="{SANS}" font-size="220" font-weight="800"
          fill="none" stroke="url(#g{p})" stroke-width="6" text-anchor="middle">{esc(letter)}</text>
    <g transform="translate(268 244) rotate(28)">
      <rect x="-10" y="-56" width="20" height="70" rx="8" fill="url(#gv{p})"/>
      <path d="M-10 -56 L10 -56 L0 -78 Z" fill="{INK}"/>
    </g>"""


# ----- holiday / event motifs -----


def m_lantern(p, accent=PURPLE):
    """A Chinese paper lantern — Chinese New Year content."""
    return f"""
    <rect x="160" y="46" width="40" height="16" rx="5" fill="{SUB}"/>
    <line x1="180" y1="62" x2="180" y2="82" stroke="{SUB}" stroke-width="4"/>
    <path d="M100 90 Q100 82 180 82 Q260 82 260 90 Q276 170 260 250 Q260 258 180 258
             Q100 258 100 250 Q84 170 100 90 Z" fill="url(#g{p})"/>
    <line x1="132" y1="88" x2="132" y2="252" stroke="#fff" stroke-width="4" opacity="0.45"/>
    <line x1="180" y1="84" x2="180" y2="256" stroke="#fff" stroke-width="4" opacity="0.45"/>
    <line x1="228" y1="88" x2="228" y2="252" stroke="#fff" stroke-width="4" opacity="0.45"/>
    <rect x="160" y="252" width="40" height="16" rx="5" fill="{SUB}"/>
    <line x1="180" y1="268" x2="180" y2="300" stroke="{SUB}" stroke-width="4"/>
    <circle cx="180" cy="306" r="8" fill="{SUB}"/>"""


def m_lamp(p, accent=PURPLE):
    """A diya oil lamp with a flame — Diwali content."""
    return f"""
    <path d="M90 210 Q90 240 180 250 Q270 240 270 210 Q270 195 230 195 L130 195
             Q90 195 90 210 Z" fill="url(#g{p})"/>
    <path d="M172 195 Q168 150 180 120 Q192 150 188 195 Z" fill="#fbbf24"/>
    <path d="M175 195 Q173 165 180 145 Q187 165 185 195 Z" fill="#f97316"/>
    <circle cx="120" cy="220" r="6" fill="{PURPLE}" opacity="0.5"/>
    <circle cx="240" cy="220" r="6" fill="{BLUE}" opacity="0.5"/>"""


def m_crescent(p, accent=PURPLE):
    """A crescent moon and star — Eid content."""
    return f"""
    <circle cx="170" cy="180" r="95" fill="url(#g{p})"/>
    <circle cx="215" cy="150" r="80" fill="{PANEL}"/>
    <path d="M280 110 l10 26 l26 10 l-26 10 l-10 26 l-10 -26 l-26 -10 l26 -10 Z" fill="{PURPLE}"/>"""


def m_necktie(p, accent=PURPLE):
    """A striped necktie — Father's Day content."""
    return f"""
    <path d="M160 70 L200 70 L212 100 L180 118 L148 100 Z" fill="url(#g{p})"/>
    <path d="M164 112 L196 112 L216 220 L180 270 L144 220 Z" fill="url(#gv{p})"/>
    <line x1="150" y1="150" x2="210" y2="140" stroke="#fff" stroke-width="6" opacity="0.3"/>
    <line x1="152" y1="180" x2="208" y2="172" stroke="#fff" stroke-width="6" opacity="0.3"/>"""


def m_bouquet(p, accent=PURPLE):
    """A wrapped flower bouquet — Mother's Day content."""
    return f"""
    <path d="M120 230 L240 230 L206 300 L154 300 Z" fill="url(#gv{p})"/>
    <line x1="150" y1="230" x2="150" y2="150" stroke="{SUB}" stroke-width="5"/>
    <line x1="180" y1="230" x2="180" y2="130" stroke="{SUB}" stroke-width="5"/>
    <line x1="210" y1="230" x2="210" y2="150" stroke="{SUB}" stroke-width="5"/>
    <circle cx="150" cy="135" r="26" fill="url(#g{p})"/>
    <circle cx="180" cy="110" r="34" fill="url(#g{p})"/>
    <circle cx="210" cy="135" r="26" fill="url(#g{p})"/>"""


def m_firework(p, accent=PURPLE):
    """Two radiating firework bursts — New Year content."""
    # Rays are solid-color, not gradient: a purely vertical <line> has a
    # zero-width objectBoundingBox, so a gradient stroke silently fails to
    # paint (same pitfall documented on m_ankh below).
    def burst(cx, cy, inner, outer, opacity=1):
        rays = ""
        for i in range(8):
            ang = i * 45
            rays += (f'<g transform="rotate({ang} {cx} {cy})" opacity="{opacity}">'
                      f'<line x1="{cx}" y1="{cy-inner}" x2="{cx}" y2="{cy-outer}" '
                      f'stroke="{PURPLE}" stroke-width="6" stroke-linecap="round"/>'
                      f'<circle cx="{cx}" cy="{cy-outer}" r="5" fill="{BLUE}"/></g>')
        return rays
    return burst(200, 130, 18, 76) + burst(100, 250, 10, 42, 0.55)


def m_heart(p, accent=PURPLE):
    """A single vector heart — Valentine's/heart-themed content."""
    return f"""
    <path d="M180 260 C 100 200 100 130 150 110 C 175 100 180 120 180 130
             C 180 120 185 100 210 110 C 260 130 260 200 180 260 Z" fill="url(#g{p})"/>
    <ellipse cx="145" cy="140" rx="14" ry="9" fill="#fff" opacity="0.4"/>"""


def m_bunny(p, accent=PURPLE):
    """A rabbit face with long ears — Easter content."""
    return f"""
    <ellipse cx="150" cy="90" rx="20" ry="62" fill="url(#g{p})"/>
    <ellipse cx="210" cy="90" rx="20" ry="62" fill="url(#g{p})"/>
    <ellipse cx="150" cy="94" rx="9" ry="42" fill="#fbcfe8" opacity="0.6"/>
    <ellipse cx="210" cy="94" rx="9" ry="42" fill="#fbcfe8" opacity="0.6"/>
    <circle cx="180" cy="210" r="78" fill="url(#g{p})"/>
    <circle cx="155" cy="195" r="9" fill="{PANEL}"/>
    <circle cx="205" cy="195" r="9" fill="{PANEL}"/>
    <ellipse cx="180" cy="222" rx="10" ry="7" fill="{PANEL}"/>"""


def m_pie(p, accent=PURPLE):
    """A sliced pie on a plate — Thanksgiving content."""
    return f"""
    <circle cx="180" cy="200" r="95" fill="url(#g{p})"/>
    <circle cx="180" cy="200" r="95" fill="none" stroke="{PANEL}" stroke-width="6" opacity="0.5"/>
    <path d="M180 200 L180 118 A82 82 0 0 1 251 241 Z" fill="{PANEL}" opacity="0.28"/>
    <line x1="180" y1="200" x2="180" y2="118" stroke="{PANEL}" stroke-width="4" opacity="0.6"/>
    <line x1="180" y1="200" x2="251" y2="241" stroke="{PANEL}" stroke-width="4" opacity="0.6"/>"""


def m_thumb(p, accent=PURPLE):
    """A rounded thumbs-up badge — reaction/"Like"-themed content."""
    return f"""
    <rect x="66" y="66" width="228" height="228" rx="44" fill="url(#g{p})"/>
    <g transform="translate(150 96)">
      <path d="M42 40
               C 30 20 34 -4 54 -10
               C 70 -15 84 -4 86 14
               L 90 46
               L 118 46
               C 132 46 142 60 136 74
               L 116 128
               C 111 140 99 148 86 148
               L 30 148
               C 18 148 8 138 8 126
               L 8 70
               C 8 58 14 48 24 42
               Z" fill="#fff"/>
      <rect x="-30" y="66" width="34" height="90" rx="14" fill="#fff" opacity="0.92"/>
    </g>"""


# ----- printables-tool motifs -----


def m_banner(p, accent=PURPLE):
    """A strung pennant banner — banner-maker printable."""
    flags = ""
    for i, x in enumerate([70, 140, 210, 280]):
        fill = f"url(#g{p})" if i % 2 == 0 else "#fff"
        stroke = "" if i % 2 == 0 else f'stroke="{PURPLE}" stroke-width="3"'
        flags += f'<path d="M{x-30} 110 L{x+30} 110 L{x} 180 Z" fill="{fill}" {stroke}/>'
        flags += (f'<circle cx="{x-22}" cy="116" r="3" fill="{SUB}"/>'
                   f'<circle cx="{x+22}" cy="116" r="3" fill="{SUB}"/>')
    return f'<path d="M50 100 Q180 130 310 100" fill="none" stroke="{SUB}" stroke-width="4"/>{flags}'


def m_letter_stencil(p, letter="B"):
    """A bold block letter with a dashed cut-line border — block-letter printables."""
    return f"""
    <rect x="50" y="70" width="260" height="220" rx="18" fill="none" stroke="{SUB}"
          stroke-width="3" stroke-dasharray="10 8"/>
    <text x="180" y="235" font-family="{SANS}" font-size="200" font-weight="800"
          fill="url(#g{p})" text-anchor="middle">{esc(letter)}</text>"""


def m_crayons(p, accent=PURPLE):
    """Three fanned crayons over a colorable outline card — coloring-page maker."""
    def crayon(x, rot, fill):
        return (f'<g transform="translate({x} 220) rotate({rot})">'
                f'<rect x="-14" y="-90" width="28" height="100" rx="6" fill="{fill}"/>'
                f'<path d="M-14 -90 L14 -90 L0 -118 Z" fill="{INK}"/></g>')
    return (f'<rect x="40" y="80" width="280" height="200" rx="24" fill="none" '
            f'stroke="{SUB}" stroke-width="3" stroke-dasharray="10 8"/>'
            + crayon(140, -18, f"url(#g{p})") + crayon(180, 0, PURPLE) + crayon(220, 18, BLUE))


def m_pencil_ruled(p, accent=PURPLE):
    """A pencil writing on ruled lines — handwriting-worksheet generator."""
    return f"""
    <line x1="60" y1="150" x2="300" y2="150" stroke="{SUB}" stroke-width="4"/>
    <line x1="60" y1="200" x2="300" y2="200" stroke="{SUB}" stroke-width="4" stroke-dasharray="8 8"/>
    <line x1="60" y1="250" x2="300" y2="250" stroke="{SUB}" stroke-width="4"/>
    <g transform="translate(230 130) rotate(35)">
      <rect x="-12" y="-70" width="24" height="90" rx="4" fill="url(#gv{p})"/>
      <path d="M-12 -70 L12 -70 L0 -96 Z" fill="{INK}"/>
      <rect x="-12" y="18" width="24" height="16" fill="#fbbf24"/>
    </g>"""


def m_trace_rows(p, sample="Emma"):
    """A solid sample row, a dashed trace-echo row, and a blank rule — name/word tracing."""
    s = esc(sample)
    return f"""
    <text x="180" y="130" font-family="{SANS}" font-size="70" font-weight="800"
          fill="url(#g{p})" text-anchor="middle">{s}</text>
    <text x="180" y="195" font-family="{SANS}" font-size="70" font-weight="800"
          fill="none" stroke="{SUB}" stroke-width="1.5" stroke-dasharray="3 3"
          text-anchor="middle" opacity="0.6">{s}</text>
    <line x1="70" y1="250" x2="290" y2="250" stroke="{SUB}" stroke-width="3"/>"""


def m_puzzle(p, accent=PURPLE):
    """Two interlocking jigsaw pieces — name-puzzle maker."""
    return f"""
    <rect x="60" y="100" width="110" height="140" rx="16" fill="url(#g{p})"/>
    <circle cx="170" cy="150" r="20" fill="url(#g{p})"/>
    <rect x="190" y="100" width="110" height="140" rx="16" fill="#fff" stroke="{PURPLE}" stroke-width="5"/>
    <circle cx="190" cy="150" r="20" fill="#fff" stroke="{PURPLE}" stroke-width="5"/>"""


# ----- misc single-subject motifs -----


def m_skull(p, accent=PURPLE):
    """A skull and crossbones — skull-themed ASCII-art content."""
    return f"""
    <path d="M110 130 Q110 70 180 70 Q250 70 250 130 Q250 175 225 195 L225 220
             L135 220 L135 195 Q110 175 110 130 Z" fill="url(#g{p})"/>
    <circle cx="150" cy="135" r="18" fill="#fff"/>
    <circle cx="210" cy="135" r="18" fill="#fff"/>
    <path d="M170 165 L190 165 L180 185 Z" fill="{PANEL}"/>
    <rect x="140" y="220" width="80" height="20" rx="6" fill="url(#g{p})"/>
    <line x1="120" y1="270" x2="160" y2="250" stroke="{SUB}" stroke-width="8" stroke-linecap="round"/>
    <line x1="240" y1="270" x2="200" y2="250" stroke="{SUB}" stroke-width="8" stroke-linecap="round"/>
    <line x1="120" y1="250" x2="160" y2="270" stroke="{SUB}" stroke-width="8" stroke-linecap="round"/>
    <line x1="240" y1="250" x2="200" y2="270" stroke="{SUB}" stroke-width="8" stroke-linecap="round"/>"""


def m_star(p, accent=PURPLE):
    """A single 5-point star with two sparkle accents — star-themed content."""
    import math
    cx, cy, r_out, r_in = 180, 178, 92, 38
    pts = []
    for i in range(10):
        r = r_out if i % 2 == 0 else r_in
        ang = -math.pi / 2 + i * math.pi / 5
        pts.append(f"{cx + r * math.cos(ang):.1f},{cy + r * math.sin(ang):.1f}")
    return f"""
    <polygon points="{' '.join(pts)}" fill="url(#g{p})"/>
    <path d="M270 90 l8 20 l20 8 l-20 8 l-8 20 l-8 -20 l-20 -8 l20 -8 Z" fill="{PURPLE}" opacity="0.7"/>
    <path d="M90 260 l6 14 l14 6 l-14 6 l-6 14 l-6 -14 l-14 -6 l14 -6 Z" fill="{BLUE}" opacity="0.6"/>"""


def m_clover(p, accent=PURPLE):
    """A four-leaf clover on a stem — St Patrick's Day."""
    return f"""
    <circle cx="150" cy="148" r="46" fill="url(#g{p})"/>
    <circle cx="212" cy="148" r="46" fill="url(#g{p})"/>
    <circle cx="150" cy="210" r="46" fill="url(#g{p})"/>
    <circle cx="212" cy="210" r="46" fill="url(#g{p})"/>
    <path d="M181 214 q6 48 -22 76" stroke="{PURPLE}" stroke-width="10"
          fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M276 96 l7 17 l17 7 l-17 7 l-7 17 l-7 -17 l-17 -7 l17 -7 Z"
          fill="{BLUE}" opacity="0.6"/>"""


def m_gradcap(p, accent=PURPLE):
    """A mortarboard with a tassel — graduation."""
    return f"""
    <path d="M180 108 L296 156 L180 204 L64 156 Z" fill="url(#g{p})"/>
    <path d="M108 176 L108 232 q72 40 144 0 L252 176" stroke="{PURPLE}"
          stroke-width="12" fill="none" stroke-linejoin="round" opacity="0.85"/>
    <path d="M290 158 L290 224" stroke="{BLUE}" stroke-width="8"
          fill="none" stroke-linecap="round"/>
    <circle cx="290" cy="232" r="12" fill="{BLUE}"/>"""


def m_arc(p, letters="ARC"):
    """Letters individually rotated along a circular arc — curved/arc text tool."""
    import math
    n = len(letters)
    # Virtual circle centered above the canvas; letters sit on its lower rim,
    # each at angle theta from straight-down, giving a downward-bulging arc.
    cx, cy, r = 180, 130, 150
    spread = 80
    step = spread / max(n - 1, 1)
    start = -spread / 2
    chars = ""
    for i, ch in enumerate(letters):
        theta = start + i * step
        rad = math.radians(theta)
        x = cx + r * math.sin(rad)
        y = cy + r * math.cos(rad)
        chars += (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{SANS}" font-size="72" '
                   f'font-weight="800" fill="url(#g{p})" text-anchor="middle" '
                   f'transform="rotate({theta:.1f} {x:.1f} {y:.1f})">{esc(ch)}</text>')
    half = math.radians(spread / 2)
    ex, ey = r * math.sin(half), cy + r * math.cos(half)
    arc = (f'<path d="M {cx - ex:.1f} {ey:.1f} A {r:.1f} {r:.1f} 0 0 0 {cx + ex:.1f} {ey:.1f}" '
           f'fill="none" stroke="{SUB}" stroke-width="2" stroke-dasharray="4 6" opacity="0.4"/>')
    return arc + chars


def m_kana_grid(p, accent=PURPLE):
    """A glyph-free grid of chip tiles with a seal accent — kana reference charts.
    Deliberately embeds no hiragana/katakana characters: cairosvg has no per-
    glyph font fallback and the bundled fonts don't cover the kana block."""
    cells = ""
    for r in range(2):
        for c in range(3):
            x, y = 40 + c * 100, 96 + r * 104
            hot = (r == 0 and c == 1)
            fill = f"url(#g{p})" if hot else "#fff"
            cells += (f'<rect x="{x}" y="{y}" width="84" height="84" rx="18" fill="{fill}" '
                       f'stroke="{INK}" stroke-opacity="{0 if hot else 0.10}"/>')
    return f'{cells}<circle cx="272" cy="112" r="20" fill="#dc2626"/>'


# ---------------------------------------------------------------- registry
# slug -> (title, subtitle, motif_callable, kicker)
# slug matches the page directory with "/" replaced by "-".
from functools import partial as P

K_LIB = "ULTRATEXTGEN · LIBRARY"
K_CAT = "ULTRATEXTGEN · FONTS"
K_USE = "ULTRATEXTGEN · GENERATOR"
K_PLAT = "ULTRATEXTGEN · PLATFORM"
K_ANS = "ULTRATEXTGEN · ANSWERS"
K_SYM = "ULTRATEXTGEN · SYMBOLS"
K_SITE = "ULTRATEXTGEN"
K_PRINT = "ULTRATEXTGEN · PRINTABLES"
K_UPDATE = "ULTRATEXTGEN · UPDATES"


def glyphs(*g):
    return P(scatter_glyphs, glyphs=list(g))


# Localized homepage social cards. Each localized homepage (de/, es/, ...) used
# to share the English homepage card, leaving English copy on a translated page.
# Each entry is  locale -> (og_filename, title, subtitle)  and renders with the
# master brand motif by default. Filenames are descriptive (keyword-led) for
# Google Images.
LOCALIZED_HOME = {
  "de": ("coole-schriftarten-generator-preview",
         "Coole Schriftarten Generator", "Schöne Schriftarten und Symbole kopieren"),
  "es": ("generador-de-letras-bonitas-preview",
         "Generador de Letras Bonitas", "Fuentes y símbolos para copiar y pegar"),
  "fr": ("generateur-de-polices-preview",
         "Générateur de Polices", "Polices et symboles à copier-coller"),
  "it": ("generatore-di-testo-stilizzato-preview",
         "Generatore di Testo Stilizzato", "Caratteri e simboli da copiare e incollare"),
  "nl": ("mooie-letters-generator-preview",
         "Mooie Letters Generator", "Stijlvolle lettertypen en symbolen om te kopiëren"),
  "pl": ("generator-ladnych-czcionek-preview",
         "Generator Ładnych Czcionek", "Stylowe czcionki i symbole do skopiowania"),
  "pt": ("gerador-de-letras-diferentes-preview",
         "Gerador de Letras Diferentes", "Fontes e símbolos para copiar e colar"),
  "tr": ("sekilli-yazi-olusturucu-preview",
         "Şekilli Yazı Oluşturucu", "Havalı yazı tipleri ve sembolleri kopyala"),
  "id": ("generator-font-aesthetic-preview",
         "Generator Font Aesthetic", "Font dan simbol keren untuk disalin"),
  "vi": ("tao-chu-kieu-dep-preview",
         "Tạo Chữ Kiểu Đẹp", "Phông chữ và ký tự đặc biệt để sao chép"),
  "hu": ("betu-generator-preview",
         "Betű Generátor", "Menő betűtípusok és szimbólumok másolása"),
}

# Bespoke motifs for the locales with demonstrated organic performance (GSC
# click share), replacing the master brand motif with a type specimen tuned
# to that market's actual query intent. Every other locale keeps m_brand —
# bespoke treatment is gated on demand, same as everywhere else on the site;
# more locales earn one here as their traffic does.
LOCALIZED_HOME_MOTIF = {
  # id: the #1 site-wide query cluster is "huruf aesthetic" / "tulisan
  # aesthetic" — echo the spaced vaporwave treatment used on
  # category-aesthetic-fonts instead of the generic brand mark.
  "id": P(m_typo, sample="a e s", size=72, spacing="6", label="huruf aesthetic"),
  # es: mirrors the es-letras-bonitas landing page (its top-performing page)
  # so the homepage card foreshadows the styling searchers land on.
  "es": P(m_typo, sample="Aa", style="italic", size=88, label="letras bonitas"),
  # pl: the Ł/ł letterform is uniquely Polish — more locale-authentic than
  # a generic "Aa" for the "ładne literki" (pretty letters) query set.
  "pl": P(m_typo, sample="Łł", size=84, label="ładne literki"),
}

# The homepage card filename (root index.html + the fallback for localized
# homepages). Lives under assets/og/ like every other per-page card.
HOME_CARD = "fancy-text-generator-preview"


PAGES = {
  # ---- localized game-nickname generators & symbol libraries (new markets) ----
  "pt-espaco-invisivel": ("Espaço Invisível", "Caractere em branco para copiar", m_block, K_LIB),
  "pt-library-simbolos-para-free-fire": ("Símbolos para Nick de Free Fire", "Guarda-chuva, coroas e símbolos para o FF", m_grid, K_LIB),
  "ro-nume-pentru-free-fire": ("Nume pentru Free Fire", "Generator de nick-uri și simboluri", m_trophy, K_USE),
  "ro-caractere-speciale": ("Caractere Speciale", "Simboluri de copiat pentru nume", m_grid, K_LIB),
  "hu-becenev-generator": ("Becenév Generátor", "Menő nevek és nickek játékokhoz", m_trophy, K_USE),
  "hu-kulonleges-karakterek": ("Különleges Karakterek", "Szimbólumok másoláshoz", m_grid, K_LIB),
  "cs-generator-prezdivek": ("Generátor Přezdívek", "Hezké nicky do her", m_trophy, K_USE),
  "cs-specialni-znaky": ("Speciální Znaky", "Symboly na kopírování", m_grid, K_LIB),
  "hr-generator-nadimaka": ("Generator Nadimaka", "Fensi nadimci za igre", m_trophy, K_USE),
  "hr-posebni-znakovi": ("Posebni Znakovi", "Simboli za kopiranje", m_grid, K_LIB),

  # ---- zh-tw (Traditional Chinese / Taiwan) pilot locale ----
  # Root gets the highest-opportunity keyword for this market (kaomoji,
  # per data/tw_piliapp_niche_keywords research: 110K volume, incumbent
  # only #11) rather than a generic translated homepage — same pattern
  # as ko/'s root going to "특수문자" instead of the font tool.
  "zh-tw": ("顏文字大全", "複製貼上可愛表情符號", m_kaomoji, K_SITE),
  "zh-tw-yingwen-ziti": ("英文字體產生器", "花式英文字體，複製貼上", m_typo, K_USE),
  "zh-tw-library-xingzuo-fuhao": ("十二星座符號", "星座與行星符號大全", glyphs("♈", "♋", "♌", "♏", "♐"), K_LIB),
  "zh-tw-library-kongbai-fuhao": ("空白符號", "隱形字元，貼哪都不留痕跡",
        glyphs("␣", "▢", "◌", "▯", "□"), K_LIB),
  "zh-tw-da-xiao-xie-zhuanhuan": ("大小寫轉換", "英文大寫、小寫一鍵轉換",
        P(m_typo, sample="Aa", weight="700", size=88, label="UPPER / lower"), K_CAT),
  "zh-tw-usecase-ciqing-ziti": ("刺青字體產生器", "紋身字體預覽比較",
        P(m_typo, sample="Love", ff=SERIF, style="italic", weight="400", size=64,
          label="cursive · gothic · italic"), K_USE),
  "zh-tw-usecase-youxi-mingzi-fuhao": ("遊戲暱稱特殊符號", "傳說對決・Discord暱稱裝飾", m_gamepad, K_USE),
  "zh-tw-ig-ziti": ("IG 字體產生器", "個人簡介・名稱特殊字體",
        P(m_typo, sample="ig", weight="700", size=88, label="bold · script · caps"), K_USE),
  "zh-tw-shufa-ziti": ("書法字體產生器", "英文花體字，複製貼上",
        P(m_typo, sample="Sofia", ff=SERIF, style="italic", weight="400", size=64,
          label="cursive · script"), K_CAT),
  "zh-tw-keai-ziti": ("可愛字體產生器", "圈圈字、泡泡字與可愛符號",
        glyphs("♡", "✧", "❀", "✿", "❥"), K_CAT),
  "zh-tw-library-jiantou-fuhao": ("箭頭符號大全", "各種方向箭頭，複製貼上", glyphs("→", "⇒", "↑", "➜", "↩"), K_LIB),
  "zh-tw-library-shuzi-fuhao": ("數字符號大全", "圈形、上標、羅馬數字", glyphs("①", "⁵", "Ⅹ", "₂", "❶"), K_LIB),
  "zh-tw-library-xingxing-fuhao": ("星星符號大全", "星星、閃光與評分符號", glyphs("★", "✦", "✰", "✧", "✩"), K_LIB),

  "kaomoji-dictionary": ("Kaomoji Dictionary", "Decode any text face", m_kaomoji, K_SITE),
  "kaomoji-generator": ("Kaomoji Generator", "Build your own text face", m_kaomoji, K_SITE),
  # ---- site root / overview ----
  "about": ("About UltraTextGen", "The team and the mission behind the tool", m_brand, K_SITE),
  "contact": ("Contact UltraTextGen", "Questions, feedback, and partnerships", m_at, K_SITE),
  "privacy": ("Privacy Policy", "What we collect, and what we never do", m_doc, K_SITE),
  "terms": ("Terms of Service", "The agreement for using UltraTextGen", m_doc, K_SITE),

  # ---- category overview + pages ----
  "category": ("Unicode Font Categories", "Choose a style by its visual intent", m_grid, K_CAT),
  "pl-category": ("Kategorie Czcionek Unicode", "Wybierz styl pasujący do klimatu", m_grid, K_CAT),
  "category-aesthetic-fonts": ("Aesthetic Font Generator", "Soft, spaced-out vaporwave styling",
        P(m_typo, sample="a e s", size=72, spacing="6", label="a e s t h e t i c"), K_CAT),
  "category-bold-fonts": ("Bold Fonts Generator", "Heavy weight that commands attention",
        P(m_typo, sample="Bold", weight="800", size=88, label="strong & striking"), K_CAT),
  "category-bold-fonts-alternating": ("Alternating Bold Fonts", "Bold and light, letter by letter",
        P(m_typo, sample="BoLd", weight="800", size=88, label="aLtErNaTiNg"), K_CAT),
  "category-bold-fonts-bold": ("Bold Fonts Generator", "The classic heavy Unicode weight",
        P(m_typo, sample="Bold", weight="800", size=88, label="maximum emphasis"), K_CAT),
  "category-bold-fonts-bold-italic": ("Bold Italic Fonts", "Heavy weight with a forward lean",
        P(m_typo, sample="Bold", weight="800", style="italic", size=84, label="bold + italic"), K_CAT),
  "category-bubble-fonts": ("Bubble Fonts Generator", "Letters inside rounded bubbles",
        P(m_typo, sample="ab", size=92, label="bubbled",
          extra='<circle cx="118" cy="195" r="56" fill="none" stroke="#fff" stroke-width="7"/>'
                '<circle cx="240" cy="195" r="56" fill="none" stroke="#fff" stroke-width="7"/>'), K_CAT),
  "category-bubble-fonts-circle": ("Circle Fonts Generator", "Crisp circled-letter styling",
        P(m_typo, sample="ab", size=92, label="circled",
          extra='<circle cx="118" cy="195" r="56" fill="none" stroke="#fff" stroke-width="7"/>'
                '<circle cx="240" cy="195" r="56" fill="none" stroke="#fff" stroke-width="7"/>'), K_CAT),
  "category-classified": ("Classified Text Generator", "Redacted, censored-document styling",
        P(m_typo, sample="TOP", weight="800", size=70, label="[ CLASSIFIED ]",
          extra='<rect x="64" y="222" width="232" height="30" rx="6" fill="#fff"/>'
                '<rect x="84" y="150" width="120" height="24" rx="4" fill="#0d0d18"/>'), K_CAT),
  "category-cursive-fonts": ("Cursive Fonts Generator", "Flowing handwritten-style script",
        P(m_typo, sample="Cursive", ff=SERIF, style="italic", weight="400", size=58,
          label="elegant & flowing"), K_CAT),
  "category-cursive-fonts-script": ("Script Fonts Generator", "Refined connected script styling",
        P(m_typo, sample="Script", ff=SERIF, style="italic", weight="400", size=62,
          label="signature script"), K_CAT),
  "category-cute-fonts": ("Cute Font Generator", "Playful styling with soft accents",
        P(m_typo, sample="cute", size=84, label="so cute",
          extra=f'<text x="262" y="150" font-family="{SYM}" font-size="40" fill="#fff">♥</text>'), K_CAT),
  "category-gothic-fonts": ("Gothic Fonts Generator", "Blackletter weight and gravitas",
        P(m_typo, sample="Goth", ff=SERIF, weight="800", size=80, label="dark & dramatic"), K_CAT),
  "category-gothic-fonts-fraktur": ("Fraktur Fonts Generator", "Old-world blackletter styling",
        P(m_typo, sample="Frak", ff=SERIF, weight="800", style="italic", size=72,
          label="blackletter"), K_CAT),
  "category-italic-fonts": ("Italic Fonts Generator", "A clean forward slant",
        P(m_typo, sample="Italic", style="italic", weight="600", size=72, label="emphasis & flow"), K_CAT),
  "category-small-text": ("Small Text Generator", "Tiny superscript and subscript letters",
        P(m_typo, sample=" small", size=44, label="tiny + small"), K_CAT),
  "category-subscript": ("Subscript Generator", "Chemistry formulas, footnotes & indices",
        P(m_typo, sample="H₂O", size=76, label="subscript notation"), K_CAT),
  "category-superscript": ("Superscript Generator", "Exponents, ordinals & tiny asides",
        P(m_typo, sample="x²", size=88, label="superscript notation"), K_CAT),
  "de-tiefgestellt": ("Tiefgestellt Generator", "Chemieformeln, tiefgestellte Zahlen & Indizes",
        P(m_typo, sample="H₂O", size=76, label="tiefgestellte Zeichen"), K_CAT),
  "de-hochgestellt": ("Hochgestellt Generator", "Exponenten, hochgestellte Zahlen & Zeichen",
        P(m_typo, sample="x²", size=88, label="hochgestellte Zeichen"), K_CAT),
  "category-small-caps": ("Small Caps Generator", "Capital-shaped small letters for bios & headings",
        P(m_typo, sample="AaBb", size=68, label="small caps style"), K_CAT),
  "category-strikethrough-text": ("Strikethrough Text Generator", "A line struck through every word",
        P(m_typo, sample="strike", size=64, deco="line-through", label="crossed out"), K_CAT),
  "category-underline-text": ("Underline Text Generator", "Clean underlines under every word",
        P(m_typo, sample="under", size=68, deco="underline", label="emphasised"), K_CAT),
  "category-upside-down-text": ("Upside Down Text Generator", "Flipped, mirrored, reversed text",
        P(m_typo, sample="flip", weight="700", size=80, rot=180, label=" uʍop ǝpısdn"), K_CAT),
  "category-text-decorator": ("Text Decorator", "Decorate text with symbols and borders",
        glyphs("⟦", "❖", "⟧", "✦", "⟨"), K_CAT),

  # ---- usecase overview + pages ----
  "usecase": ("Choose What to Create", "Generators grouped by what you need", m_grid, K_USE),
  "pl-usecase": ("Co Chcesz Stworzyć?", "Generatory pogrupowane według potrzeb", m_grid, K_USE),
  "usecase-before-after-emoji": ("Emoji Transformation Captions", "Before → after, told with emoji",
        P(m_transform, a="A", b="★"), K_USE),
  "usecase-stumble-guys-name-generator": ("Stumble Guys Name Generator", "Funny & stylish nicknames, 4-12 char checker", m_gamepad, K_USE),
  "usecase-clash-of-clans-name-generator": ("Clash of Clans Name Generator", "Stylish COC nicknames, 2-15 char checker", m_gamepad, K_USE),
  "usecase-clash-royale-name-generator": ("Clash Royale Name Generator", "Stylish CR names, 2-15 char checker", m_gamepad, K_USE),
  "usecase-xbox-name-generator": ("Xbox Gamertag Generator", "Cool, funny & sweaty name ideas", m_gamepad, K_USE),
  "usecase-playstation-name-generator": ("PlayStation Name Generator", "PSN Online ID ideas & checker", m_gamepad, K_USE),
  "usecase-fortnite-name-generator": ("Fortnite Name Generator", "Stylish Epic Games names, 3-16 char checker", m_gamepad, K_USE),
  "usecase-pubg-name-generator": ("PUBG Name Generator", "Stylish PUBG & BGMI names, 14 char checker", m_gamepad, K_USE),
  "usecase-mobile-legends-name-generator": ("Mobile Legends Name Generator", "Stylish MLBB names, 4-16 char checker", m_gamepad, K_USE),
  "usecase-aesthetic-instagram-names": ("Aesthetic Instagram Names", "Cute username & display name ideas", m_heart, K_USE),
  "id-usecase-nama-stumble-guys-keren": ("Nama Stumble Guys Keren", "Nickname lucu & aesthetic, cek 4-12 karakter", m_gamepad, K_USE),
  "usecase-aesthetic-contact-names": ("Aesthetic Contact Names", "Cute names for bae's phone contact", m_heart, K_USE),
  "id-usecase-nama-kontak-pacar-aesthetic": ("Nama Kontak Pacar Aesthetic", "Nama kontak estetik berhias hati", m_heart, K_USE),
  "usecase-group-name-generator": ("Group Name Generator", "Cool names for squads, circles & group chats", m_chat, K_USE),
  "id-usecase-nama-grup-keren": ("Nama Grup Keren", "Nama grup WA & circle aesthetic", m_chat, K_USE),

  # ---- contact-names / group-name / stumble-guys locale expansion ----
  "tr-usecase-rehber-adi-estetik": ("Rehber Adı Estetik", "Sevgiline özel estetik rehber ismi", m_heart, K_USE),
  "pt-usecase-nomes-de-contato-aesthetic": ("Nomes de Contato Aesthetic", "Nome de contato estiloso pro crush", m_heart, K_USE),
  "pl-usecase-nazwy-do-kontaktu": ("Nazwy do Kontaktu", "Estetyczna nazwa kontaktu dla ukochanej osoby", m_heart, K_USE),
  "it-usecase-nomi-per-contatti-aesthetic": ("Nomi per Contatti Aesthetic", "Nome estetico per il contatto del tuo amore", m_heart, K_USE),
  "fr-usecase-nom-de-contact-aesthetic": ("Nom de Contact Aesthetic", "Nom de contact stylé pour ton crush", m_heart, K_USE),
  "es-usecase-nombres-de-contacto-aesthetic": ("Nombres de Contacto Aesthetic", "Nombre de contacto bonito para tu pareja", m_heart, K_USE),
  "de-usecase-kontaktname-aesthetic": ("Kontaktname Aesthetic", "Süßer Kontaktname für deinen Schatz", m_heart, K_USE),
  "zh-tw-usecase-tongxunlu-nicheng": ("通訊錄暱稱", "情侶通訊錄暱稱裝飾", m_heart, K_USE),
  "ja-usecase-renrakusaki-aesthetic": ("連絡先の名前 かわいいジェネレーター", "彼氏彼女の連絡先をおしゃれに", m_heart, K_USE),

  "tr-usecase-grup-ismi": ("Grup İsmi", "WhatsApp grubu ve arkadaş çevresi için isimler", m_chat, K_USE),
  "pt-usecase-nomes-para-grupo": ("Nomes para Grupo", "Nomes estilosos pro grupo do zap e da galera", m_chat, K_USE),
  "pl-usecase-nazwy-grupy": ("Nazwy Grupy", "Fajne nazwy dla grupy WhatsApp i paczki znajomych", m_chat, K_USE),
  "it-usecase-nomi-per-gruppi": ("Nomi per Gruppi", "Nomi per gruppi WhatsApp, cerchie di amici e team", m_chat, K_USE),
  "fr-usecase-nom-de-groupe": ("Nom de Groupe", "Noms stylés pour groupe WhatsApp et bande de potes", m_chat, K_USE),
  "es-usecase-nombres-para-grupos": ("Nombres para Grupos", "Nombres bonitos para el grupo de WhatsApp y amigos", m_chat, K_USE),
  "de-usecase-gruppennamen": ("Gruppennamen", "Coole Namen für WhatsApp-Gruppe und Freundeskreis", m_chat, K_USE),

  "tr-usecase-stumble-guys-nick": ("Stumble Guys Nick", "Komik & şık takma isimler, 4-12 karakter kontrolü", m_gamepad, K_USE),
  "pt-usecase-nomes-para-stumble-guys": ("Nomes para Stumble Guys", "Nomes engraçados e estilosos, checagem 4-12 caracteres", m_gamepad, K_USE),
  "pl-usecase-nazwy-do-stumble-guys": ("Nazwy do Stumble Guys", "Zabawne i stylowe nicki, sprawdzenie 4-12 znaków", m_gamepad, K_USE),
  "it-usecase-nomi-stumble-guys": ("Nomi Stumble Guys", "Nomi buffi e stilosi, controllo 4-12 caratteri", m_gamepad, K_USE),
  "fr-usecase-pseudo-stumble-guys": ("Pseudo Stumble Guys", "Pseudos drôles et stylés, vérification 4-12 caractères", m_gamepad, K_USE),
  "es-usecase-nombres-para-stumble-guys": ("Nombres para Stumble Guys", "Nombres divertidos y con estilo, chequeo 4-12 caracteres", m_gamepad, K_USE),
  "de-usecase-stumble-guys-namensgenerator": ("Stumble Guys Namensgenerator", "Lustige & stylische Nicknames, 4-12-Zeichen-Check", m_gamepad, K_USE),

  "usecase-bio-font": ("Bio Font Generator", "Fonts, symbols and dividers for any bio", m_profile, K_USE),
  "usecase-bio-font-instagram": ("Instagram Bio Font Generator", "Fonts, symbols and aesthetic bio templates", m_camera, K_USE),
  "usecase-bio-font-discord": ("Discord Bio Font Generator", "Style your About Me — no Nitro needed", m_chat, K_USE),
  "usecase-bio-font-whatsapp": ("WhatsApp Bio Font Generator", "Style your About — 139-char limit", m_chat, K_USE),
  "usecase-bio-font-tiktok": ("TikTok Bio Font Generator", "Fonts and aesthetic bio ideas, 80-char limit", m_camera, K_USE),

  # ---- bio-font locale translations ----
  "de-usecase-bio-schriftart": ("Bio-Schriftart Generator", "Schriften, Symbole und Vorlagen für dein Bio", m_profile, K_USE),
  "tr-usecase-biyografi-yazi-tipi": ("Biyografi Yazı Tipi", "Instagram biyografin için fontlar ve semboller", m_profile, K_USE),
  "th-usecase-bio-font-ig": ("ฟอนต์ไบโอไอจี", "ฟอนต์และสัญลักษณ์สำหรับไบโออินสตาแกรม", m_profile, K_USE),
  "ja-usecase-bio-font": ("プロフィール文字装飾", "インスタプロフィール用のフォントと記号", m_profile, K_USE),
  "pt-usecase-fontes-para-bio": ("Gerador de Fontes para Bio", "Fontes, símbolos e modelos para sua bio", m_profile, K_USE),
  "fr-usecase-ecriture-bio": ("Écriture Stylée pour Bio", "Polices et symboles pour votre bio Instagram", m_profile, K_USE),
  "es-usecase-letras-para-bio": ("Letras para Bio", "Fuentes y símbolos para tu biografía de Instagram", m_profile, K_USE),
  "it-usecase-font-per-bio": ("Font per la Bio", "Caratteri e simboli per la tua bio Instagram", m_profile, K_USE),
  "ar-usecase-khat-bio": ("خط للبايو", "خطوط ورموز لبايو انستقرام", m_profile, K_USE),
  "cs-usecase-pismo-pro-bio": ("Písmo pro Bio", "Fonty a symboly pro tvoje bio na Instagramu", m_profile, K_USE),
  "sk-usecase-pismo-pre-bio": ("Písmo pre Bio", "Fonty a symboly pre tvoje bio na Instagrame", m_profile, K_USE),
  "nl-usecase-lettertype-voor-bio": ("Lettertype voor Bio", "Lettertypes en symbolen voor je Instagram bio", m_profile, K_USE),
  "tl-usecase-bio-font": ("Bio Font Generator", "Fancy fonts at symbols para sa iyong bio", m_profile, K_USE),
  "usecase-comment-font": ("Comment Style Generator", "Make your comment stand out", m_chat, K_USE),
  "usecase-emoji-combinations": ("Emoji Combinations", "Copy-and-paste pairings for social",
        P(m_transform, a="+", b="★"), K_USE),
  "usecase-linkedin-headline": ("LinkedIn Headline Text", "Style the line under your name", m_headline, K_USE),
  "usecase-text-to-emoji": ("Text to Emoji Generator", "Turn words into emoji-styled text",
        P(m_transform, a="T", b="★"), K_USE),
  "usecase-vertical-text": ("Vertical & Stacked Text", "Stack your text top to bottom",
        P(m_vertical, letters="TEXT"), K_USE),
  "usecase-zalgo-text": ("Zalgo Text Generator", "Create creepy glitch text", m_zalgo, K_USE),

  # ---- localized emoji-translator + emoji-letters cards ----
  # (bio-font locale cards are owned by the bio-font localization effort.)
  # Arabic and Devanagari both get their own card: spanned() pre-shapes
  # Arabic through arabic_reshaper + python-bidi before layout (cairosvg has
  # no shaping/bidi engine of its own), and Noto Sans Devanagari's
  # precomposed conjuncts already render correctly with simple mark
  # placement, so neither needs the shared-English-card fallback.
  "de-usecase-emoji-uebersetzer": ("Emoji-Übersetzer", "Text in Emojis – und zurück", m_smiley, K_USE),
  "tr-usecase-emoji-ceviri": ("Emoji Çevirici", "Metni emojiye çevir, geri çöz", m_smiley, K_USE),
  "ar-usecase-mutarjim-emoji": ("مترجم إيموجي", "النص إلى إيموجي، وبالعكس", m_smiley, K_USE),
  "hi-usecase-emoji-anuvadak": ("इमोजी अनुवादक", "टेक्स्ट से इमोजी, और वापस", m_smiley, K_USE),
  "vi-usecase-dich-emoji": ("Dịch Emoji", "Chuyển văn bản thành emoji", m_smiley, K_USE),
  "es-usecase-traductor-de-emojis": ("Traductor de Emojis", "Texto a emojis y al revés", m_smiley, K_USE),
  "pt-usecase-tradutor-de-emojis": ("Tradutor de Emojis", "Texto em emojis e de volta", m_smiley, K_USE),
  "fr-usecase-traducteur-emoji": ("Traducteur Emoji", "Texte en emojis, et l'inverse", m_smiley, K_USE),
  "it-usecase-traduttore-emoji": ("Traduttore Emoji", "Testo in emoji e viceversa", m_smiley, K_USE),
  "id-usecase-penerjemah-emoji": ("Penerjemah Emoji", "Teks jadi emoji dan sebaliknya", m_smiley, K_USE),
  "pl-usecase-tlumacz-emoji": ("Tłumacz Emoji", "Tekst na emoji i z powrotem", m_smiley, K_USE),
  "de-usecase-emoji-buchstaben": ("Emoji-Buchstaben", "Namen im Emoji-Alphabet", m_flag, K_USE),
  "tr-usecase-emoji-harfler": ("Emoji Harfleri", "İsmini emoji alfabesiyle yaz", m_flag, K_USE),
  "usecase-nickname-generator": ("Nickname Generator", "Stylish & cute name maker, copy and paste",
        m_gamepad, K_USE),
  "usecase-name-to-symbols": ("Name to Symbols", "Your name rewritten in rare Unicode letterforms",
        m_gamepad, K_USE),
  "id-library-simbol-ml": ("Simbol ML", "Simbol nama Mobile Legends, tinggal salin",
        m_gamepad, K_LIB),
  "es-library-simbolos-para-fortnite": ("Símbolos para Fortnite", "Signos para tu nombre de jugador",
        m_gamepad, K_LIB),
  "usecase-clan-tag-generator": ("Clan Tag Generator", "Stylish [TAG] maker with a shareable team template",
        m_gamepad, K_USE),
  "usecase-free-fire-clan-tag-generator": ("Free Fire Clan Tag Generator", "A shared prefix your whole squad pastes into their name",
        m_trophy, K_USE),
  "es-usecase-tag-de-clan-free-fire": ("Tag para Clan de Free Fire", "Etiqueta corta que todo el clan comparte",
        m_trophy, K_USE),
  "pt-usecase-tag-de-cla-ff": ("Tag de Clã para Free Fire", "Etiqueta curta que todo o clã compartilha",
        m_trophy, K_USE),

  # ---- gaming-name use cases (Indonesian) ----
  "id-usecase-nama-ff-keren": ("Nama FF Keren", "Simbol payung & font keren buat nickname Free Fire",
        m_gamepad, K_USE),
  "id-usecase-nama-guild-ff-keren": ("Nama Guild FF Keren", "Tag squad & bingkai nama tim Free Fire",
        m_trophy, K_USE),
  "id-usecase-nama-ml-keren": ("Nama ML Keren", "Font aesthetic & simbol nickname Mobile Legends",
        m_gamepad, K_USE),
  "id-usecase-nama-squad-ml-keren": ("Nama Squad ML Keren", "Tag singkatan & font aesthetic squad Mobile Legends",
        m_trophy, K_USE),
  "id-usecase-nama-roblox-keren": ("Nama Roblox Keren", "Simbol & generator nickname buat display name Roblox",
        m_gamepad, K_USE),
  "id-huruf-kecil-diatas": ("Huruf Kecil Diatas", "Superscript buat nickname Free Fire & status WA",
        P(m_typo, sample="Sanz", size=76, label="huruf kecil diatas"), K_USE),
  "id-tulisan-cuping": ("Font Cuping", "Generator cute typing ala RP buat WA & Telegram",
        m_kaomoji, K_CAT),

  # ---- localized zalgo ----
  "de-usecase-zalgo-text": ("Zalgo-Textgenerator", "Erstelle gruseligen Glitch-Text", m_zalgo, K_USE),
  "es-usecase-zalgo-text": ("Generador de Texto Zalgo", "Crea texto glitch y espeluznante", m_zalgo, K_USE),
  "fr-usecase-zalgo-text": ("Générateur de Texte Zalgo", "Créez du texte glitch et effrayant", m_zalgo, K_USE),
  "id-usecase-zalgo-text": ("Generator Teks Zalgo", "Buat teks glitch dan menyeramkan", m_zalgo, K_USE),
  "it-usecase-zalgo-text": ("Generatore di Testo Zalgo", "Crea testo glitch e inquietante", m_zalgo, K_USE),
  "nl-usecase-zalgo-text": ("Zalgo Tekstgenerator", "Maak griezelige glitch tekst", m_zalgo, K_USE),
  "pl-usecase-zalgo-text": ("Generator Tekstu Zalgo", "Twórz przerażający tekst glitch", m_zalgo, K_USE),
  "pl-usecase-nazwy-do-robloxa": ("Fajne Nazwy do Robloxa", "Symbole i generator nicków na nazwę wyświetlaną",
        m_gamepad, K_USE),
  "pt-usecase-zalgo-text": ("Gerador de Texto Zalgo", "Crie texto glitch e assustador", m_zalgo, K_USE),
  "pt-letras-diferentes": ("Letras Diferentes", "Fontes para copiar e colar em qualquer app",
        P(m_typo, sample="Abc", weight="700", size=88, label="copiar e colar"), K_USE),
  "pt-fontes-para-instagram": ("Fontes para Instagram", "Letras para bio, nick e legenda", m_camera, K_PLAT),
  "pt-usecase-nick-ff": ("Gerador de Nick FF", "Símbolos e fontes para Free Fire", m_gamepad, K_USE),
  "pt-library-simbolos": ("Símbolos para Copiar", "Símbolos para nick, bio e Insta", m_grid, K_LIB),
  "pt-letras-pequenas": ("Letra Pequena", "Texto pequeno para copiar e colar",
        P(m_typo, sample=" small", size=44, label="letra pequena"), K_CAT),
  "pt-letra-cursiva": ("Letra Cursiva", "Alfabeto cursivo para copiar e colar",
        P(m_typo, sample="Cursiva", ff=SERIF, style="italic", weight="400", size=58,
          label="elegante e fluida"), K_CAT),
  "pt-letras-aesthetic": ("Letras Aesthetic", "Fontes aesthetic para copiar e colar",
        P(m_typo, sample="a e s", size=72, spacing="6", label="a e s t h e t i c"), K_CAT),
  "pt-fonte-gotica": ("Fonte Gótica", "Letras góticas e dark para copiar",
        P(m_typo, sample="Goth", ff=SERIF, weight="800", size=80, label="dark e dramática"), K_CAT),
  "tr-usecase-zalgo-text": ("Zalgo Metin Oluşturucu", "Ürkütücü bozuk metin oluşturun", m_zalgo, K_USE),
  "tr-sekilli-nick": ("Şekilli Nick Oluşturucu", "꧁꧂ çerçeveli nickler kopyala yapıştır", m_gamepad, K_USE),
  "tr-usecase-pubg-nick": ("PUBG Şekilli Nick", "PUBG Mobile isimleri ve sembolleri", m_gamepad, K_USE),
  "tr-usecase-free-fire-nick": ("Free Fire Şekilli Nick", "Free Fire isimleri, semboller ve isim kontrolü", m_gamepad, K_USE),
  "tr-usecase-mobile-legends-nick": ("Mobile Legends Şekilli Nick", "MLBB isimleri, semboller ve isim kontrolü", m_gamepad, K_USE),
  "tr-usecase-valorant-nick": ("Valorant Nick", "Riot ID kontrolü ve stil isimler", m_gamepad, K_USE),
  "tr-library-semboller": ("Şekilli Semboller", "Nick ve bio için semboller", m_grid, K_LIB),
  "tr-kucuk-yazi": ("Küçük Yazı", "Minik harfler kopyala yapıştır",
        P(m_typo, sample=" small", size=44, label="küçük yazı"), K_CAT),
  "tr-el-yazisi-fontu": ("El Yazısı Fontu", "El yazısı alfabesi kopyala yapıştır",
        P(m_typo, sample="Yazi", ff=SERIF, style="italic", weight="400", size=58,
          label="zarif ve akıcı"), K_CAT),
  "tr-kalin-yazi": ("Kalın Yazı", "Kalın font kopyala yapıştır",
        P(m_typo, sample="Bold", weight="800", size=80, label="kalın ve net"), K_CAT),
  "tr-alti-cizili-yazi": ("Altı Çizili Yazı", "Altı çizili font kopyala yapıştır",
        P(m_typo, sample="Çizili", size=64, deco="underline", label="vurgulu ve net"), K_CAT),
  "tr-instagram-yazi-tipi": ("Instagram Yazı Tipi", "Bio için şekilli yazı ve semboller", m_camera, K_PLAT),
  "tr-snapchat-yazi-tipi": ("Snapchat Yazı Tipi", "Snap ve görünen ad için şekilli yazı", m_chat, K_PLAT),
  "fr-police-d-ecriture": ("Police d'Écriture", "Polices à copier-coller",
        P(m_typo, sample="Abc", weight="700", size=88, label="copier-coller"), K_USE),
  "fr-ecriture-speciale": ("Écriture Spéciale", "Lettres spéciales à copier-coller",
        P(m_typo, sample="Spécial", size=64, spacing="3", label="lettres spéciales"), K_USE),
  "fr-police-instagram": ("Police Instagram", "Écriture insta pour ta bio", m_camera, K_PLAT),
  "fr-pseudo-style": ("Pseudo Stylé", "꧁꧂ pseudos à copier-coller", m_gamepad, K_USE),
  "fr-ecriture-cursive": ("Écriture Cursive", "Alphabet calligraphie à copier",
        P(m_typo, sample="Écrire", ff=SERIF, style="italic", weight="400", size=58,
          label="élégante et fluide"), K_CAT),
  "fr-ecriture-italique": ("Écriture Italique", "Texte italique à copier-coller",
        P(m_typo, sample="Italique", style="italic", weight="500", size=58, label="penché et net"), K_CAT),
  "fr-texte-en-gras": ("Texte en Gras", "Gras Unicode à copier-coller",
        P(m_typo, sample="Gras", weight="800", size=80, label="épais et net"), K_CAT),
  "fr-library-symboles": ("Symboles Spéciaux", "Cœurs, étoiles et déco pour bio", m_grid, K_LIB),
  "fr-ecriture-gothique": ("Écriture Gothique", "Lettres gothiques à copier-coller",
        P(m_typo, sample="Goth", ff=SERIF, weight="800", size=80, label="dark et médiévale"), K_CAT),
  "fr-petite-ecriture": ("Petite Écriture", "Petit texte à copier-coller",
        P(m_typo, sample=" small", size=44, label="petite écriture"), K_CAT),
  "fr-usecase-pseudo-fortnite": ("Pseudo Fortnite Stylé", "Symboles tryhard et pseudos 16 caractères", m_gamepad, K_USE),
  "fr-usecase-pseudo-free-fire": ("Pseudo Free Fire Stylé", "Symboles ombrelle et pseudos 12 caractères", m_gamepad, K_USE),
  "fr-ecriture-aesthetic": ("Écriture Aesthetic", "Lettres et symboles aesthetic à copier",
        P(m_typo, sample="a e s", size=72, spacing="6", label="a e s t h e t i c"), K_CAT),
  "fr-belle-ecriture": ("Belle Écriture", "Jolies écritures à copier-coller",
        P(m_typo, sample="Belle", ff=SERIF, style="italic", weight="400", size=64,
          label="jolie et élégante"), K_CAT),
  "fr-changeur-de-police": ("Changeur de Police", "Change ton écriture en ligne",
        P(m_transform, a="A", b="𝓐"), K_USE),
  "fr-calligraphie": ("Calligraphie en Ligne", "Alphabet calligraphie à copier-coller",
        P(m_typo, sample="Callig", ff=SERIF, style="italic", weight="400", size=58,
          label="sans plume ni encre"), K_CAT),
  "fr-police-linkedin": ("Police LinkedIn", "Écrire en gras et stylé sur LinkedIn", m_headline, K_PLAT),
  "fr-ecriture-facebook": ("Écriture Facebook", "Gras et polices stylées pour FB", m_profile, K_PLAT),
  "fr-police-snapchat": ("Police Snapchat", "Snaps et pseudo stylés à copier-coller", m_chat, K_PLAT),
  "usecase-tattoo-fonts": ("Tattoo Fonts", "Preview your tattoo lettering before the ink",
        P(m_typo, sample="Love", ff=SERIF, style="italic", weight="400", size=64,
          label="cursive · gothic · italic"), K_USE),
  "de-usecase-tattoo-schrift": ("Tattoo Schrift", "Teste deinen Schriftzug vor der Nadel",
        P(m_typo, sample="Liebe", ff=SERIF, style="italic", weight="400", size=60,
          label="kursiv · gotisch · kursiviert"), K_USE),
  "es-usecase-letras-para-tatuajes": ("Letras para Tatuajes", "Prueba tu letra antes de la tinta",
        P(m_typo, sample="Amor", ff=SERIF, style="italic", weight="400", size=64,
          label="cursiva · gótica · itálica"), K_USE),
  "id-usecase-font-tato": ("Font Tato", "Tes tulisan tatomu sebelum ditinta",
        P(m_typo, sample="Cinta", ff=SERIF, style="italic", weight="400", size=62,
          label="sambung · gotik · miring"), K_USE),
  "it-usecase-font-tatuaggi": ("Font Tatuaggi", "Prova la tua scritta prima dell'inchiostro",
        P(m_typo, sample="Amore", ff=SERIF, style="italic", weight="400", size=60,
          label="corsivo · gotico · italico"), K_USE),
  "nl-usecase-tattoo-letters": ("Tattoo Letters", "Test je lettertype vóór de inkt",
        P(m_typo, sample="Liefde", ff=SERIF, style="italic", weight="400", size=58,
          label="sierlijk · gotisch · cursief"), K_USE),
  "pl-usecase-czcionki-tatuaze": ("Czcionki na Tatuaż", "Sprawdź napis przed tuszem",
        P(m_typo, sample="Ty", ff=SERIF, style="italic", weight="400", size=72,
          label="kursywa · gotyk · italik"), K_USE),
  "pt-usecase-letras-para-tatuagem": ("Letras para Tatuagem", "Teste sua letra antes da tinta",
        P(m_typo, sample="Amor", ff=SERIF, style="italic", weight="400", size=64,
          label="cursiva · gótica · itálica"), K_USE),
  "tr-usecase-dovme-yazi-fontlari": ("Dövme Yazı Fontları", "Mürekkepten önce yazını test et",
        P(m_typo, sample="Ask", ff=SERIF, style="italic", weight="400", size=66,
          label="el yazısı · gotik · italik"), K_USE),
  "fr-usecase-ecriture-tatouage": ("Écriture Tatouage", "Teste ton lettrage avant l'encre",
        P(m_typo, sample="Amour", ff=SERIF, style="italic", weight="400", size=60,
          label="cursive · gothique · italique"), K_USE),
  "nl-mooie-letters": ("Mooie Letters", "Mooie lettertypes om te kopiëren",
        P(m_typo, sample="Abc", weight="700", size=88, label="kopiëren en plakken"), K_USE),
  "nl-sierlijke-letters": ("Sierlijke Letters", "Sierletters en kalligrafie om te kopiëren",
        P(m_typo, sample="Sierlijk", ff=SERIF, style="italic", weight="400", size=54,
          label="krullend en elegant"), K_CAT),
  "nl-instagram-lettertype": ("Instagram Lettertype", "Ander lettertype voor je insta bio", m_camera, K_PLAT),
  "nl-facebook-lettertype": ("Facebook Lettertype", "Vette letters voor je Facebook-post", m_profile, K_PLAT),
  "nl-vetgedrukte-letters": ("Vetgedrukte Letters", "Dikgedrukte tekst om te kopiëren",
        P(m_typo, sample="Vet", weight="800", size=80, label="dik en opvallend"), K_CAT),
  "nl-cursieve-letters": ("Cursieve Letters", "Schuine tekst om te kopiëren",
        P(m_typo, sample="Cursief", style="italic", weight="500", size=58, label="schuin en subtiel"), K_CAT),
  "nl-kleine-letters": ("Kleine Letters", "Kleine tekst om te kopiëren",
        P(m_typo, sample=" klein", size=44, label="kleine letters"), K_CAT),
  "nl-library-speciale-tekens": ("Speciale Tekens", "Hartjes, sterretjes en symbolen voor je bio", m_grid, K_LIB),
  "vi-usecase-zalgo-text": ("Trình Tạo Chữ Zalgo", "Tạo chữ lỗi và rùng rợn", m_zalgo, K_USE),

  # ---- localized vertical text ----
  "de-usecase-vertical-text": ("Vertikaler Text-Generator", "Text von oben nach unten stapeln",
        P(m_vertical, letters="TEXT"), K_USE),
  "es-usecase-vertical-text": ("Generador de Texto Vertical", "Apila tu texto de arriba abajo",
        P(m_vertical, letters="TEXT"), K_USE),
  "fr-usecase-vertical-text": ("Générateur de Texte Vertical", "Empilez votre texte de haut en bas",
        P(m_vertical, letters="TEXT"), K_USE),
  "id-usecase-vertical-text": ("Generator Teks Vertikal", "Susun tulisan dari atas ke bawah",
        P(m_vertical, letters="TEKS"), K_USE),
  "it-usecase-vertical-text": ("Generatore di Testo Verticale", "Impila il testo dall'alto in basso",
        P(m_vertical, letters="TEST"), K_USE),
  "nl-usecase-vertical-text": ("Verticale Tekst Generator", "Stapel je tekst van boven naar beneden",
        P(m_vertical, letters="TEKS"), K_USE),
  "pl-usecase-vertical-text": ("Generator Tekstu Pionowego", "Ułóż tekst od góry do dołu",
        P(m_vertical, letters="TEKS"), K_USE),
  "pt-usecase-vertical-text": ("Gerador de Texto Vertical", "Empilhe seu texto de cima para baixo",
        P(m_vertical, letters="TEXT"), K_USE),
  "tr-usecase-vertical-text": ("Dikey Yazı Oluşturucu", "Metni yukarıdan aşağıya dizin",
        P(m_vertical, letters="YAZI"), K_USE),
  "vi-usecase-vertical-text": ("Trình Tạo Chữ Dọc", "Xếp chữ từ trên xuống dưới",
        P(m_vertical, letters="DOC"), K_USE),

  # ---- platform pages ----
  "discord": ("Discord Font Generator", "Copy-and-paste fonts — no Nitro needed", m_chat, K_PLAT),
  "facebook": ("Facebook Font Generator", "Stylish text for posts and profiles", m_profile, K_PLAT),
  "instagram": ("Instagram Font Generator", "Fonts for bios and captions", m_camera, K_PLAT),
  "linkedin": ("LinkedIn Font Generator", "Professional text styling that pastes anywhere", m_headline, K_PLAT),
  "pinterest": ("Pinterest Text Generator", "Text that pops on every pin", m_pins, K_PLAT),
  "snapchat": ("Snapchat Font Generator", "Style your snaps and display name", m_chat, K_PLAT),
  "ar-khat-snapchat": ("خط سناب شات", "زخرفة الاسم والكابشن بالنسخ واللصق", m_chat, K_PLAT),
  "telegram": ("Telegram Font Generator", "Styles optimised for Telegram", m_chat, K_PLAT),
  "threads": ("Threads Font Generator", "No bold or italic button — style with copy-paste fonts", m_profile, K_PLAT),
  "whatsapp": ("WhatsApp Font Generator", "Friendly formatting and styles", m_chat, K_PLAT),
  "x": ("X (Twitter) Font Generator", "Stylish text for posts and bio", P(m_profile), K_PLAT),
  "youtube": ("YouTube Font Generator", "Channel name and description styling", m_play, K_PLAT),
  "youtube-name-generator": ("YouTube Channel Name Generator", "Find a name that stands out", m_play, K_PLAT),
  "tiktok": ("TikTok Font Generator", "Copy-and-paste fonts for TikTok", m_play, K_PLAT),
  "tiktok-name-generator": ("TikTok Name Generator", "Stylish names and handles", m_play, K_PLAT),
  "roblox": ("Roblox Username Tools", "Style your Roblox name and display", m_block, K_PLAT),
  "roblox-name-generator": ("Roblox Username Generator", "Generate available-looking names", m_block, K_PLAT),
  "roblox-old-roblox-font": ("Old Roblox Font Generator", "The 2008-era look as free PNG & SVG", m_block, K_PLAT),

  # ---- answers ----
  "answers": ("Quick Answers", "Short, sourced answers to common questions", m_qa, K_ANS),
  "answers-change-font-size-on-facebook": ("Change Font Size on Facebook", "What's possible, and the workaround", m_qa, K_ANS),
  "answers-discord-allowed-characters": ("Discord Allowed Characters", "Which characters paste cleanly", m_qa, K_ANS),
  "answers-why-is-my-name-showing-as-boxes": ("Name Showing as Boxes?", "The missing-glyph fix, and safe styles", m_qa, K_ANS),
  "answers-why-was-my-game-name-rejected": ("Why Was My Game Name Rejected?", "The filter and the length limit", m_qa, K_ANS),
  "answers-how-to-make-a-blank-name": ("How to Make a Blank Name", "The invisible-character method, and the catch", m_qa, K_ANS),
  "answers-where-do-fancy-fonts-work-username-vs-display-name": ("Username vs Display Name", "Where fancy fonts actually work", m_qa, K_ANS),
  "answers-do-fancy-fonts-work-with-arabic": ("Do Fancy Fonts Work With Arabic?", "Why not — and what does work", m_qa, K_ANS),
  "answers-do-you-need-nitro-for-discord-fonts": ("Do You Need Nitro for Fonts?", "The honest answer for Discord users", m_qa, K_ANS),
  "answers-what-are-discord-display-name-styles": ("Discord Display Name Styles", "What Nitro styles do, and where they stop", m_qa, K_ANS),
  "answers-how-to-change-roblox-username": ("Change Your Roblox Username", "The steps and the catch", m_qa, K_ANS),
  "answers-how-to-change-tiktok-username": ("Change Your TikTok Username", "How and how often you can", m_qa, K_ANS),
  "answers-how-to-change-minecraft-username": ("Change Your Minecraft Username", "Java vs. Bedrock, free vs. paid", m_qa, K_ANS),
  "answers-how-to-type-kaomoji": ("How to Type Kaomoji", "On Windows, iPhone, Android & Mac", m_kaomoji, K_ANS),
  "answers-is-linkedin-bold-text-safe": ("Is LinkedIn Bold Text Safe?", "Accessibility and reach, explained", m_qa, K_ANS),
  "answers-what-does-o7-mean": ("What Does o7 Mean?", "The saluting text face, explained", m_kaomoji, K_ANS),
  "answers-what-does-owo-mean": ("What Does OwO Mean?", "The wide-eyed text face, explained", m_kaomoji, K_ANS),
  "answers-what-does-uwu-mean": ("What Does UwU Mean?", "The cute text face, explained", m_kaomoji, K_ANS),
  "answers-what-does-xd-mean": ("What Does XD Mean?", "The laughing text face, explained", m_kaomoji, K_ANS),
  "answers-what-font-does-discord-use": ("What Font Does Discord Use?", "gg sans, and what it means for you", m_qa, K_ANS),
  "answers-what-font-does-facebook-use": ("What Font Does Facebook Use?", "The system fonts behind the feed", m_qa, K_ANS),
  "answers-what-font-does-linkedin-use": ("What Font Does LinkedIn Use?", "The typeface and your options", m_qa, K_ANS),
  "answers-what-font-does-roblox-use": ("What Font Does Roblox Use?", "Builder Sans, and the Comic Sans myth", m_qa, K_ANS),
  "answers-what-font-does-snapchat-use": ("What Font Does Snapchat Use?", "The app typeface, explained", m_qa, K_ANS),
  "answers-what-is-a-tiktok-handle": ("What Is a TikTok Handle?", "Handle vs name, made simple", m_qa, K_ANS),
  "answers-what-is-kaomoji": ("What Is a Kaomoji?", "Japanese text faces, explained", m_kaomoji, K_ANS),

  # ---- embed ----
  "embed": ("Embeddable Widgets", "Free tools for your website", m_grid, K_USE),
  "embed-linkedin-headline-generator": ("LinkedIn Headline Generator", "Embeddable headline styler", m_headline, K_USE),
  "embed-bio-font-generator": ("Bio Font Generator", "Embeddable bio & symbol styler", m_profile, K_USE),
  "embed-nickname-generator": ("Nickname Generator", "Embeddable name & frame styler", m_gamepad, K_USE),
  "embed-zalgo-text-generator": ("Zalgo Text Generator", "Embeddable cursed text styler", m_zalgo, K_USE),
  "embed-character-counter": ("Character Counter", "Embeddable word & character counter",
        P(m_typo, sample="123", weight="800", size=88, label="words · characters"), K_USE),
  "embed-name-checker": ("Game Name Checker", "Embeddable platform name-fit checker",
        glyphs("✓", "⚠", "✗"), K_USE),

  # ---- library overview ----
  "library": ("Symbol & Emoji Library", "Copy-and-paste reference collections", m_grid, K_LIB),

  # ---- symbol pillar: single-glyph identity pages ----
  "symbol": ("Symbol Lookup", "Meaning, history & how to type any symbol",
        glyphs("°", "÷", "∞", "√", "×"), K_SYM),
  "symbol-degree-symbol": ("Degree Symbol", "° meaning, history & how to type it", glyphs("°"), K_SYM),
  "symbol-division-sign": ("Division Sign", "÷ meaning, history & how to type it", glyphs("÷"), K_SYM),
  "symbol-infinity": ("Infinity Symbol", "∞ meaning, history & how to type it", glyphs("∞"), K_SYM),
  "symbol-invisible-character": ("Invisible Character", "⠀ meaning, blank names & how to use it", m_braille_blank, K_SYM),
  "symbol-square-root": ("Square Root Symbol", "√ meaning, history & how to type it", glyphs("√"), K_SYM),
  "symbol-multiplication-sign": ("Multiplication Sign", "Copy & paste the × times symbol", glyphs("×"), K_SYM),
  "symbol-squared-cubed": ("Squared & Cubed", "Copy & paste ² and ³ exponents", glyphs("²", "³"), K_SYM),
  "symbol-euro-sign": ("Euro Sign", "€ meaning, history & how to type it", glyphs("€"), K_SYM),
  "symbol-pound-sign": ("Pound Sign", "£ meaning, history & how to type it", glyphs("£"), K_SYM),
  "symbol-alpha-symbol": ("Alpha Symbol", "Α α meaning, history & how to type it", glyphs("Α", "α"), K_SYM),
  "symbol-ampersand": ("Ampersand Symbol", "& meaning, history & how to type it", glyphs("&"), K_SYM),
  "symbol-anarchy-symbol": ("Anarchy Symbol", "Ⓐ meaning, history & how to type it", P(m_circled_letter, letter="A"), K_SYM),
  "symbol-anger-symbol": ("Anger Symbol", "💢 meaning & how to type it", m_burst_angry, K_SYM),
  "symbol-ankh-symbol": ("Ankh Symbol", "☥ meaning, history & how to type it", m_ankh, K_SYM),
  "symbol-aquarius-symbol": ("Aquarius Symbol", "♒ meaning & how to type it", glyphs("♒"), K_SYM),
  "symbol-aries-symbol": ("Aries Symbol", "♈ meaning & how to type it", glyphs("♈"), K_SYM),
  "symbol-at-symbol": ("At Symbol", "@ meaning, history & how to type it", glyphs("@"), K_SYM),
  "symbol-autism-symbol": ("Autism Symbol", "∞ meaning & how to type it", glyphs("∞"), K_SYM),
  "symbol-backwards-question-mark": ("Backwards Question Mark", "⸮ meaning & how to type it", glyphs("⸮"), K_SYM),
  "symbol-biohazard-symbol": ("Biohazard Symbol", "☣ meaning, history & how to type it", glyphs("☣"), K_SYM),
  "symbol-bitcoin-symbol": ("Bitcoin Symbol", "₿ meaning, history & how to type it", m_coin, K_SYM),
  "symbol-black-moon-lilith": ("Black Moon Lilith", "⚸ meaning & how to type it", glyphs("⚸"), K_SYM),
  "symbol-cancer-symbol": ("Cancer Symbol", "♋ meaning & how to type it", glyphs("♋"), K_SYM),
  "symbol-capricorn-symbol": ("Capricorn Symbol", "♑ meaning & how to type it", glyphs("♑"), K_SYM),
  "symbol-celsius-symbol": ("Celsius Symbol", "℃ meaning & how to type it", glyphs("℃"), K_SYM),
  "symbol-cent-sign": ("Cent Sign", "¢ meaning, history & how to type it", glyphs("¢"), K_SYM),
  "symbol-checkmark-symbol": ("Check Mark Symbol", "✓ meaning & how to type it", glyphs("✓", "✔"), K_SYM),
  "symbol-congruent-symbol": ("Congruent Symbol", "≅ meaning & how to type it", glyphs("≅"), K_SYM),
  "symbol-copyright-symbol": ("Copyright Symbol", "© meaning, history & how to type it", glyphs("©"), K_SYM),
  "symbol-cross-symbol": ("Cross Symbol", "✝ meaning, history & how to type it", glyphs("✝"), K_SYM),
  "symbol-delta-symbol": ("Delta Symbol", "Δ δ meaning & how to type it", glyphs("Δ", "δ"), K_SYM),
  "symbol-diameter-symbol": ("Diameter Symbol", "⌀ meaning & how to type it", glyphs("⌀"), K_SYM),
  "symbol-dollar-sign": ("Dollar Sign", "$ meaning, history & how to type it", glyphs("$"), K_SYM),
  "symbol-down-arrow": ("Down Arrow Symbol", "↓ meaning & how to type it", glyphs("↓"), K_SYM),
  "symbol-em-dash": ("Em Dash", "— meaning & how to type it", glyphs("—"), K_SYM),
  "symbol-fahrenheit-symbol": ("Fahrenheit Symbol", "℉ meaning & how to type it", glyphs("℉"), K_SYM),
  "symbol-fleur-de-lis-symbol": ("Fleur-de-lis Symbol", "⚜ meaning, history & how to type it", glyphs("⚜"), K_SYM),
  "symbol-gemini-symbol": ("Gemini Symbol", "♊ meaning & how to type it", glyphs("♊"), K_SYM),
  "symbol-hamsa-symbol": ("Hamsa Symbol", "🪬 meaning, history & how to type it", m_hamsa, K_SYM),
  "symbol-heart-symbol": ("Heart Symbol", "♥ meaning, history & how to type it", glyphs("♥", "♡"), K_SYM),
  "symbol-khanda-symbol": ("Khanda Symbol", "☬ meaning, history & how to type it", glyphs("☬"), K_SYM),
  "symbol-left-arrow": ("Left Arrow Symbol", "← meaning & how to type it", glyphs("←"), K_SYM),
  "symbol-leo-symbol": ("Leo Symbol", "♌ meaning & how to type it", glyphs("♌"), K_SYM),
  "symbol-less-than-greater-than": ("Less Than & Greater Than", "< > meaning & how to type them", glyphs("<", ">"), K_SYM),
  "symbol-libra-symbol": ("Libra Symbol", "♎ meaning & how to type it", glyphs("♎"), K_SYM),
  "symbol-micro-sign": ("Micro Sign", "µ meaning, history & how to type it", glyphs("µ"), K_SYM),
  "symbol-not-equal-sign": ("Not Equal Sign", "≠ meaning & how to type it", glyphs("≠"), K_SYM),
  "symbol-ohm-symbol": ("Ohm Symbol", "Ω meaning & how to type it", glyphs("Ω"), K_SYM),
  "symbol-om-symbol": ("Om Symbol", "ॐ meaning, history & how to type it", m_lotus_om, K_SYM),
  "symbol-omega-symbol": ("Omega Symbol", "Ω ω meaning & how to type it", glyphs("Ω", "ω"), K_SYM),
  "symbol-orthodox-cross": ("Orthodox Cross", "☦ meaning, history & how to type it", glyphs("☦"), K_SYM),
  "symbol-peace-sign": ("Peace Symbol", "☮ meaning, history & how to type it", glyphs("☮"), K_SYM),
  "symbol-pentagram-symbol": ("Pentagram Symbol", "⛧ meaning, history & how to type it", m_pentagram, K_SYM),
  "symbol-pi-symbol": ("Pi Symbol", "π meaning & how to type it", glyphs("π"), K_SYM),
  "symbol-pilcrow": ("Pilcrow Symbol", "¶ meaning, history & how to type it", glyphs("¶"), K_SYM),
  "symbol-pisces-symbol": ("Pisces Symbol", "♓ meaning & how to type it", glyphs("♓"), K_SYM),
  "symbol-plus-minus": ("Plus-Minus Symbol", "± meaning & how to type it", glyphs("±"), K_SYM),
  "symbol-quotation-mark": ("Quotation Mark", "“ ” meaning & how to type it", glyphs("“", "”"), K_SYM),
  "symbol-recycling-symbol": ("Recycling Symbol", "♻ meaning, history & how to type it", glyphs("♻"), K_SYM),
  "symbol-right-arrow": ("Right Arrow Symbol", "→ meaning & how to type it", glyphs("→"), K_SYM),
  "symbol-rupee-sign": ("Indian Rupee Sign", "₹ meaning, history & how to type it", glyphs("₹"), K_SYM),
  "symbol-sagittarius-symbol": ("Sagittarius Symbol", "♐ meaning & how to type it", glyphs("♐"), K_SYM),
  "symbol-scorpio-symbol": ("Scorpio Symbol", "♏ meaning & how to type it", glyphs("♏"), K_SYM),
  "symbol-section-sign": ("Section Sign", "§ meaning, history & how to type it", glyphs("§"), K_SYM),
  "symbol-sigma-symbol": ("Sigma Symbol", "Σ σ meaning & how to type it", glyphs("Σ", "σ"), K_SYM),
  "symbol-star-of-david": ("Star of David", "✡ meaning, history & how to type it", glyphs("✡"), K_SYM),
  "symbol-star-symbol": ("Star Symbol", "★ meaning & how to type it", glyphs("★"), K_SYM),
  "symbol-stop-sign": ("Stop Sign", "🛑 meaning & how to type it", m_stop_octagon, K_SYM),
  "symbol-taurus-symbol": ("Taurus Symbol", "♉ meaning & how to type it", glyphs("♉"), K_SYM),
  "symbol-trademark-symbol": ("Trademark Symbol", "™ meaning, history & how to type it", glyphs("™"), K_SYM),
  "symbol-up-arrow": ("Up Arrow Symbol", "↑ meaning & how to type it", glyphs("↑"), K_SYM),
  "symbol-vertical-line": ("Vertical Line Symbol", "| meaning & how to type it", glyphs("|"), K_SYM),
  "symbol-virgo-symbol": ("Virgo Symbol", "♍ meaning & how to type it", glyphs("♍"), K_SYM),
  "symbol-wheelchair-symbol": ("Wheelchair Symbol", "♿ meaning, history & how to type it", glyphs("♿"), K_SYM),
  "symbol-won-sign": ("Won Sign", "₩ meaning, history & how to type it", glyphs("₩"), K_SYM),
  "symbol-yen-sign": ("Yen Sign", "¥ meaning, history & how to type it", glyphs("¥"), K_SYM),
  "symbol-yin-yang": ("Yin Yang Symbol", "☯ meaning, history & how to type it", glyphs("☯"), K_SYM),

  # 2026-07-22 GSC 404 cleanup: shipped without og:image/twitter:image at all.
  "symbol-asterisk-symbol": ("Asterisk Symbol", "* meaning, history & how to type it", glyphs("*", "⁂"), K_SYM),
  "symbol-chi-symbol": ("Chi Symbol", "Χ χ meaning, history & how to type it", glyphs("Χ", "χ"), K_SYM),
  "symbol-crescent-and-star": ("Star and Crescent", "☪ meaning, history & how to type it", glyphs("☪"), K_SYM),
  "symbol-en-dash": ("En Dash", "– meaning & how to type it", glyphs("–"), K_SYM),
  "symbol-interrobang": ("Interrobang", "‽ meaning, history & how to type it", glyphs("‽"), K_SYM),
  "symbol-lambda-symbol": ("Lambda Symbol", "Λ λ meaning, history & how to type it", glyphs("Λ", "λ"), K_SYM),
  "symbol-pawn-symbol": ("Pawn Symbol", "♟ ♙ meaning & how to type it", glyphs("♟", "♙"), K_SYM),
  "symbol-peso-sign": ("Peso Sign", "₱ meaning, history & how to type it", glyphs("₱"), K_SYM),
  "symbol-phi-symbol": ("Phi Symbol", "Φ φ meaning, history & how to type it", glyphs("Φ", "φ"), K_SYM),
  "symbol-psi-symbol": ("Psi Symbol", "Ψ ψ meaning, history & how to type it", glyphs("Ψ", "ψ"), K_SYM),
  "symbol-ruble-sign": ("Ruble Sign", "₽ meaning, history & how to type it", glyphs("₽"), K_SYM),
  "symbol-skull-and-crossbones": ("Skull and Crossbones", "☠ meaning, history & how to type it", m_skull, K_SYM),
  "symbol-snapchat-heart-colors": ("Snapchat Heart Colors", "What each heart emoji color means", m_heart, K_SYM),
  "symbol-spade-symbol": ("Spade Symbol", "♠ ♤ meaning & how to type it", glyphs("♠", "♤"), K_SYM),
  "symbol-sunglasses-symbol": ("Sunglasses Symbol", "😎 meaning, codepoint & how to type it", m_sunglasses, K_SYM),
  "symbol-theta-symbol": ("Theta Symbol", "Θ θ meaning, history & how to type it", glyphs("Θ", "θ"), K_SYM),
  "symbol-tilde-symbol": ("Tilde Symbol", "~ meaning, history & how to type it", glyphs("~"), K_SYM),
  "symbol-underscore-symbol": ("Underscore", "_ meaning, history & how to type it", glyphs("_"), K_SYM),
  "symbol-calendar-emoji": ("Calendar Emoji", "Why it's always frozen on July 17", m_calendar, K_SYM),
  "symbol-lighthouse-emoji": ("Lighthouse Emoji", "Confirmed for Unicode 18.0, Sept 16 2026",
        glyphs("☀", "✦", "⚓", "☾", "✧"), K_SYM),
  "symbol-cracking-face-emoji": ("Cracking Face Emoji", "Draft Emoji 18.0 candidate, not live yet", m_smiley, K_SYM),
  "symbol-distorted-face-emoji": ("Distorted Face Emoji", "U+1FAEA — meaning, codepoint & origin", m_smiley, K_SYM),
  "symbol-melting-face-emoji": ("Melting Face Emoji", "U+1FAE0 — meaning, sarcasm reading & origin", m_smiley, K_SYM),
  "symbol-pickle-emoji": ("Pickle Emoji", "Draft Emoji 18.0 candidate, not live yet", m_cup, K_SYM),
  "symbol-meteor-emoji": ("Meteor Emoji", "Draft Emoji 18.0 candidate, not live yet",
        glyphs("☄", "✦", "★", "☆", "✧"), K_SYM),
  "symbol-monarch-butterfly-emoji": ("Monarch Butterfly Emoji", "Draft Emoji 18.0 candidate, not live yet", m_paw, K_SYM),
  "symbol-thumb-sign-emoji": ("Thumb Sign Emoji", "Draft Emoji 18.0 candidate, not live yet",
        glyphs("☝", "☞", "☜", "☟", "✌"), K_SYM),
  "symbol-dirham-sign": ("Dirham Sign", "Frozen for Unicode 18.0 publication", m_coin, K_SYM),
  "symbol-omani-rial-sign": ("Omani Rial Sign", "Frozen for Unicode 18.0 publication", m_coin, K_SYM),
  "symbol-saudi-riyal-sign": ("Saudi Riyal Sign", "Final since Unicode 17.0", m_coin, K_SYM),
  "symbol-rufiyaa-sign": ("Rufiyaa Sign", "Accepted for Unicode 18.0 publication", m_coin, K_SYM),
  "symbol-belarusian-ruble-sign": ("Belarusian Ruble Sign", "Provisional at U+20C5, targeting Unicode 19.0", m_coin, K_SYM),
  "ru-symbol-znak-belorusskogo-rublya": ("Знак белорусского рубля", "Предварительно U+20C5, прицел на Unicode 19.0", m_coin, K_SYM),

  # ---- library: safe-glyph motifs ----
  "library-accent-marks-diacritics": ("Accent Marks & Diacritics", "Add accents to any letter",
        glyphs("é", "ñ", "ü", "á", "ô"), K_LIB),
  "library-achievement-symbols": ("Achievement Symbols", "Trophies, medals and milestones", m_trophy, K_LIB),
  "library-aesthetic-borders-frames": ("Aesthetic Borders & Frames", "Wrap text in decorative frames",
        glyphs("❖", "⟦", "⟧", "✦", "❝"), K_LIB),
  "library-aesthetic-symbols": ("Aesthetic Symbols", "Soft, decorative Unicode accents",
        glyphs("✦", "❀", "☾", "✧", "⊹"), K_LIB),
  "ar-library-aesthetic-symbols": ("رموز جمالية", "لمسات يونيكود ناعمة وزخرفية",
        glyphs("✦", "❀", "☾", "✧", "⊹"), K_LIB),
  "pl-library-symbole-estetyczne": ("Symbole estetyczne", "Delikatne ozdobniki Unicode",
        glyphs("✦", "❀", "☾", "✧", "⊹"), K_LIB),
  "ru-library-esteticheskie-simvoly": ("Эстетические символы", "Мягкие декоративные знаки Unicode",
        glyphs("✦", "❀", "☾", "✧", "⊹"), K_LIB),
  "th-library-aesthetic-symbols": ("สัญลักษณ์ Aesthetic", "ตัวตกแต่ง Unicode แนวนุ่มนวล",
        glyphs("✦", "❀", "☾", "✧", "⊹"), K_LIB),
  "library-angry-kaomoji": ("Angry Kaomoji", "Mad, raging text faces", m_kaomoji, K_LIB),
  "zh-tw-library-cat-kaomoji": ("貓咪顏文字", "可愛貓咪臉文字", m_kaomoji, K_LIB),
  "zh-tw-library-crying-kaomoji": ("哭泣顏文字", "傷心流淚臉文字", m_kaomoji, K_LIB),
  "zh-tw-library-cute-kaomoji": ("可愛顏文字", "萌系臉文字", m_kaomoji, K_LIB),
  "zh-tw-library-divider-kaomoji": ("顏文字分隔線", "可愛文字分隔符號", m_kaomoji, K_LIB),
  "zh-tw-library-happy-kaomoji": ("開心顏文字", "微笑愉快臉文字", m_kaomoji, K_LIB),
  "zh-tw-library-heart-kaomoji": ("愛心顏文字", "愛心眼臉文字", m_kaomoji, K_LIB),
  "zh-tw-library-love-kaomoji": ("戀愛顏文字", "告白愛心臉文字", m_kaomoji, K_LIB),
  "zh-tw-library-sad-kaomoji": ("傷心顏文字", "難過臉文字", m_kaomoji, K_LIB),
  "zh-tw-library-shrug-kaomoji": ("攤手顏文字", "無奈聳肩臉文字", m_kaomoji, K_LIB),
  "ja-library-angry-kaomoji": ("怒り顔文字", "怒った顔文字", m_kaomoji, K_LIB),
  "ja-library-cat-kaomoji": ("猫の顔文字", "可愛い猫の顔文字", m_kaomoji, K_LIB),
  "ja-library-crying-kaomoji": ("泣き顔文字", "悲しい涙の顔文字", m_kaomoji, K_LIB),
  "ja-library-divider-kaomoji": ("顔文字区切り線", "可愛い文字の区切り記号", m_kaomoji, K_LIB),
  "ja-library-happy-kaomoji": ("嬉しい顔文字", "笑顔の顔文字", m_kaomoji, K_LIB),
  "ja-library-heart-kaomoji": ("ハート顔文字", "ハート目の顔文字", m_kaomoji, K_LIB),
  "ja-library-hug-kaomoji": ("ハグ顔文字", "抱きしめる顔文字", m_kaomoji, K_LIB),
  "ja-library-love-kaomoji": ("恋する顔文字", "告白ハートの顔文字", m_kaomoji, K_LIB),
  "ja-library-sad-kaomoji": ("悲しい顔文字", "落ち込んだ顔文字", m_kaomoji, K_LIB),
  "ja-library-shrug-kaomoji": ("肩をすくめる顔文字", "やれやれ顔文字", m_kaomoji, K_LIB),
  "library-animal-emojis": ("Animal & Creature Emojis", "Paste creatures into any caption", m_paw, K_LIB),
  "library-arrow-symbols": ("Arrow Symbols", "Every direction, every weight",
        glyphs("→", "←", "↑", "↓", "⟶"), K_LIB),
  "library-awareness-ribbons": ("Awareness Ribbon Symbols", "Ribbons for every cause", m_ribbon, K_LIB),
  "library-bear-kaomoji": ("Bear Kaomoji", "Cute bear text faces", m_kaomoji, K_LIB),
  "library-blushing-kaomoji": ("Blushing Kaomoji", "Shy, blushing text faces", m_kaomoji, K_LIB),
  "library-body-language-emojis": ("Body Language Emojis", "Gestures and reactions", m_person, K_LIB),
  "library-bow-ribbon-symbols": ("Bow & Ribbon Symbols", "Coquette bows and ribbons", m_bow, K_LIB),
  "library-bracket-symbols": ("Brackets, Braces & Parentheses", "Every enclosing pair",
        glyphs("⟦", "⟧", "⟨", "⟩", "❲"), K_LIB),
  "library-bullet-point-symbols": ("Bullet Point Symbols", "Lead every list with style",
        glyphs("•", "◦", "▪", "‣", "◆"), K_LIB),
  "tr-library-madde-imi-sembolleri": ("Madde İmi Sembolleri", "Listelerine tarz kat",
        glyphs("•", "◦", "▪", "‣", "◆"), K_LIB),
  "it-library-simboli-punto-elenco": ("Simboli Punto Elenco", "Dai stile a ogni lista",
        glyphs("•", "◦", "▪", "‣", "◆"), K_LIB),
  "ja-library-bullet-point-symbols": ("箇条書き記号", "リストにスタイルを",
        glyphs("•", "◦", "▪", "‣", "◆"), K_LIB),
  "ru-library-markery-spiska": ("Маркеры для списка", "Стиль для каждого списка",
        glyphs("•", "◦", "▪", "‣", "◆"), K_LIB),
  "th-library-bullet-point-symbols": ("สัญลักษณ์จุดหัวข้อ", "เพิ่มสไตล์ให้ทุกลิสต์",
        glyphs("•", "◦", "▪", "‣", "◆"), K_LIB),
  "library-bunny-kaomoji": ("Bunny Kaomoji", "Cute rabbit text faces", m_kaomoji, K_LIB),
  "library-card-suit-symbols": ("Card Suit Symbols", "Spades, hearts, diamonds, clubs",
        glyphs("♠", "♥", "♦", "♣", "♤"), K_LIB),
  "library-cat-kaomoji": ("Cat Kaomoji", "Cute cat text faces", m_kaomoji, K_LIB),
  "library-checkmark-symbols": ("Checkmark Symbols", "Ticks, checks and crosses",
        glyphs("✓", "✔", "☑", "✗", "✕"), K_LIB),
  "library-chess-symbols": ("Chess Piece Symbols", "Kings, queens and the full set",
        glyphs("♚", "♛", "♞", "♜", "♝"), K_LIB),
  "library-copyright-trademark-symbols": ("Copyright & Trademark Symbols", "©, ®, ™ and legal marks",
        glyphs("©", "®", "™", "§", "¶"), K_LIB),
  "library-coquette-symbols": ("Coquette Symbols", "Soft, girly, ribbon-and-heart accents",
        glyphs("♡", "❀", "✦", "❝", "✿"), K_LIB),
  "library-cottagecore-symbols": ("Cottagecore Symbols", "Flowers, leaves and rustic charm",
        glyphs("❀", "✿", "☘", "⚘", "❁"), K_LIB),
  "library-cross-x-symbols": ("Cross & X Symbols", "Crosses, x-marks and plus signs",
        glyphs("✗", "✕", "✚", "†", "✜"), K_LIB),
  "library-crown-royalty-symbols": ("Crown & Royalty Symbols", "Crowns, kings and queens",
        glyphs("♚", "♛", "⚜", "♔", "♕"), K_LIB),
  "library-crying-kaomoji": ("Crying & Sad Kaomoji", "Tearful text faces", m_kaomoji, K_LIB),
  "library-currency-symbols": ("Currency Symbols", "Money marks from around the world",
        m_coin, K_LIB),
  "library-cute-kaomoji": ("Cute Kaomoji", "Kawaii text faces", m_kaomoji, K_LIB),
  "library-dark-academia-symbols": ("Dark Academia Symbols", "Vintage books, candles and scholarly accents",
        glyphs("❦", "⁂", "§", "Ⅰ", "⟪"), K_LIB),
  "library-dash-hyphen-symbols": ("Dash & Hyphen Symbols", "Em, en and every dash between",
        glyphs("—", "–", "―", "·", "‐"), K_LIB),
  "library-discord-symbols": ("Discord Symbols", "Symbols that paste cleanly in Discord",
        glyphs("✦", "★", "⚔", "♥", "➤"), K_LIB),
  "library-divider-kaomoji": ("Kaomoji Dividers", "Cute text dividers & spacers", m_kaomoji, K_LIB),
  "library-dog-kaomoji": ("Dog Kaomoji", "Cute puppy text faces", m_kaomoji, K_LIB),
  "library-dongers": ("Dongers", "Arms-raised text faces", m_kaomoji, K_LIB),
  "library-egyptian-hieroglyphs": ("Egyptian Hieroglyphs", "Ankhs and ancient glyphs", m_ankh, K_LIB),
  "library-email-symbols": ("Email Symbols", "@, envelopes and contact marks", m_at, K_LIB),
  "library-emoji-flags": ("Flag Emoji Explorer", "Flags from every country", m_flag, K_LIB),
  "library-emoji-meanings-guide": ("Emoji Meanings Guide", "What each emoji really means", m_smiley, K_LIB),
  "library-excited-kaomoji": ("Excited Kaomoji", "Hyped, arms-up text faces", m_kaomoji, K_LIB),
  "library-face-emojis": ("Face & Emotion Emojis", "Every mood, every expression", m_smiley, K_LIB),
  "library-facebook-symbols": ("Facebook Symbols", "Reactions, hearts, and dividers for FB",
        m_thumb, K_LIB),
  "library-flower-kaomoji": ("Flower Kaomoji", "Blossom-framed text faces", m_kaomoji, K_LIB),
  "library-flower-symbols": ("Flower & Nature Symbols", "Blooms and botanical accents",
        glyphs("❀", "✿", "❁", "❃", "⚘"), K_LIB),
  "library-food-drink-emojis": ("Food & Drink Emojis", "Snacks, meals and drinks", m_cup, K_LIB),
  "library-fraction-symbols": ("Fraction Symbols", "Halves, thirds and quarters",
        glyphs("½", "⅓", "¼", "¾", "⅔"), K_LIB),
  "library-gaming-aesthetic-symbols": ("Gaming Aesthetic Symbols", "Clan tag frames, HUD bars and battle icons",
        glyphs("▰", "▱", "⌖", "━", "▮"), K_LIB),
  "library-vrchat-symbols": ("VRChat Symbols", "Name symbols that fit the 16-character limit",
        glyphs("✦", "⚡", "♡", "❖", "･"), K_LIB),
  "library-geometric-symbols": ("Geometric Symbols", "Circles, squares and triangles",
        glyphs("●", "▲", "■", "◆", "◇"), K_LIB),
  "library-goth-grunge-symbols": ("Goth & Grunge Symbols", "Dark, edgy decorative marks",
        glyphs("✝", "☓", "✗", "†", "♰"), K_LIB),
  "library-hand-symbols": ("Hand Gesture Symbols", "Pointing hands and gestures",
        glyphs("☝", "☞", "☜", "☟", "✌"), K_LIB),
  "library-happy-kaomoji": ("Happy Kaomoji", "Smiling, joyful text faces", m_kaomoji, K_LIB),
  "library-heart-kaomoji": ("Heart Kaomoji", "Heart-eyed text faces", m_kaomoji, K_LIB),
  "library-heart-symbols": ("Heart Symbol Collection", "Hearts for love and everything else",
        glyphs("♥", "♡", "❣", "❤", "♥"), K_LIB),
  "library-hug-kaomoji": ("Hug Kaomoji", "Open-armed hugging faces", m_kaomoji, K_LIB),
  "library-instagram-symbols": ("Instagram Symbols", "Symbols that shine in your bio", m_camera, K_LIB),
  "library-iphone-emojis": ("iPhone Emojis", "Copy Apple's emoji artwork", m_smiley, K_LIB),
  "library-kawaii-cute-symbols": ("Kawaii & Cute Symbols", "Adorable Japanese-style accents",
        glyphs("♡", "❀", "✧", "⊹", "✦"), K_LIB),
  "library-kiss-kaomoji": ("Kiss Kaomoji", "Kiss-blowing text faces", m_kaomoji, K_LIB),
  "library-laughing-kaomoji": ("Laughing Kaomoji", "Giggling, LOL text faces", m_kaomoji, K_LIB),
  "library-lenny-face": ("Lenny Face", "The smirking text face", m_kaomoji, K_LIB),
  "library-line-divider-symbols": ("Line Dividers & Separators", "Break up text beautifully", m_divider, K_LIB),
  "library-linkedin-symbol-library": ("LinkedIn Symbol Library", "Professional symbols and bullets",
        glyphs("▸", "✓", "★", "•", "➤"), K_LIB),
  "library-love-kaomoji": ("Love & Heart Kaomoji", "Affectionate text faces", m_kaomoji, K_LIB),
  "library-math-symbols": ("Math Symbols", "Operators, sets and Greek",
        glyphs("∑", "∫", "√", "π", "∞"), K_LIB),
  "library-moon-celestial-symbols": ("Moon & Celestial Symbols", "Moons, suns and stars",
        glyphs("☽", "☾", "☀", "★", "✦"), K_LIB),
  "library-music-kaomoji": ("Music Kaomoji", "Singing, dancing text faces", m_kaomoji, K_LIB),
  "library-music-symbols": ("Music Note Symbols", "Notes, clefs and rests",
        m_note, K_LIB),
  "library-norse-viking-runes": ("Norse & Viking Runes", "Elder Futhark rune styling", m_rune, K_LIB),
  "library-number-symbols": ("Number & Numeral Symbols", "Circled, styled and special numbers",
        glyphs("①", "②", "③", "№", "#"), K_LIB),
  "library-people-profession-emojis": ("People & Profession Emojis", "Roles and people", m_person, K_LIB),
  "library-religious-symbols": ("Religious & Spiritual Symbols", "Faiths and beliefs",
        glyphs("✝", "☪", "☮", "☯", "✡"), K_LIB),
  # ar/library translation (2026-07-23) — same motif as the EN parent above.
  "ar-library-religious-symbols": ("الرموز الدينية والروحية", "رموز الأديان والمعتقدات",
        glyphs("✝", "☪", "☮", "☯", "✡"), K_LIB),
  "library-roblox-symbols": ("Roblox Symbols", "Symbols for Roblox names and chat", m_block, K_LIB),
  "library-sad-kaomoji": ("Sad Kaomoji", "Downcast text faces", m_kaomoji, K_LIB),
  "library-shocked-kaomoji": ("Shocked Kaomoji", "Wide-eyed, stunned faces", m_kaomoji, K_LIB),
  "library-shrug-kaomoji": ("Shrug Kaomoji", "The shruggie and variants", m_kaomoji, K_LIB),
  # 2026-07-22 GSC 404 cleanup: shipped without og:image/twitter:image at all.
  "library-snapchat-symbols": ("Snapchat Symbols", "Ghost, sparkle & bio decorations to copy",
        glyphs("✧", "★", "♡", "✦"), K_LIB),
  "library-table-flip-kaomoji": ("Table Flip Kaomoji", "Rage-quit text faces to copy", m_kaomoji, K_LIB),
  "library-slash-backslash-symbols": ("Slash & Backslash Symbols", "Dividers and dividing marks",
        glyphs("/", "\\", "⁄", "∕", "｜"), K_LIB),
  "library-sleepy-kaomoji": ("Sleepy Kaomoji", "Drowsy, dozing text faces", m_kaomoji, K_LIB),
  "library-smiley-face-guide": ("Smiley Face Guide", "Every smiley and what it signals", m_smiley, K_LIB),
  "library-sparkle-kaomoji": ("Sparkle & Star Kaomoji", "Sparkly text faces", m_kaomoji, K_LIB),
  "library-sparkle-symbols": ("Sparkle & Decorative Symbols", "Add shine to any text",
        glyphs("✦", "✧", "✩", "⁂", "❉"), K_LIB),
  "library-special-characters": ("Special Characters", "The marks your keyboard hides",
        glyphs("§", "¶", "†", "‡", "★"), K_LIB),
  "library-sports-emojis": ("Sports & Activity Emojis", "Games, balls and movement", m_ball, K_LIB),
  "library-star-kaomoji": ("Star Kaomoji", "Starry-eyed text faces", m_kaomoji, K_LIB),
  "library-star-symbols": ("Star Symbol Collection", "Stars in every weight and style",
        glyphs("★", "☆", "✦", "✧", "✩"), K_LIB),
  "library-text-faces-kaomoji": ("Text Faces & Kaomoji", "Japanese emoticons, copy-ready", m_kaomoji, K_LIB),
  "library-tiktok-symbols": ("TikTok Symbols", "Symbols for TikTok names and bios", m_play, K_LIB),
  "library-traffic-road-sign-symbols": ("Traffic & Road Sign Symbols", "Signs and road markers", m_sign, K_LIB),
  "library-transport-symbols": ("Transport & Map Symbols", "Vehicles and travel marks", m_car, K_LIB),
  "library-weather-symbols": ("Weather Symbols & Emojis", "Sun, clouds, rain and snow",
        glyphs("☀", "☁", "☂", "❄", "☼"), K_LIB),
  "library-witchy-occult-symbols": ("Witchy & Occult Symbols", "Moons, signs and the arcane",
        glyphs("☽", "☿", "✦", "☉", "♆"), K_LIB),
  "library-x-twitter-symbols": ("X (Twitter) Symbols", "Symbols for posts and your bio", m_xmark, K_LIB),
  "library-y2k-symbols": ("Y2K Symbols", "Retro-futuristic 2000s accents",
        glyphs("✦", "☆", "⌘", "✧", "⊹"), K_LIB),
  "library-zodiac-symbols": ("Zodiac & Astrology Symbols", "All twelve signs and planets",
        glyphs("♈", "♋", "♌", "♏", "♐"), K_LIB),

  # ---- library pages added for full social-card coverage ----
  # Emoji/CJK pages use vector motifs (colour emoji and CJK glyphs do not
  # rasterize in the bundled fonts); symbol pages use raster-safe glyphs.
  "library-alt-codes": ("Alt Code Symbols", "Type symbols by their numeric codes",
        glyphs("☺", "♣", "♠", "♂", "♀"), K_LIB),
  "library-angry-emoji": ("Angry Emoji Collection", "Every shade of mad and furious", m_smiley, K_LIB),
  "library-anime-symbols": ("Anime Symbols", "Sparkle, battle and moon accents for fandom names",
        glyphs("✦", "⚔", "☽", "✧", "☠"), K_LIB),
  "library-art-stationery-emojis": ("Art & Stationery Emojis", "Pens, brushes and craft supplies",
        glyphs("✎", "✏", "✐", "✁", "✂"), K_LIB),
  "library-ascii-table": ("ASCII Table", "Every character and its code",
        glyphs("@", "#", "&", "%", "*"), K_LIB),
  "library-beauty-nails-emojis": ("Beauty & Nails Emojis", "Glam, makeup and self-care",
        glyphs("✦", "♡", "❀", "✧", "❁"), K_LIB),
  "library-box-drawing-symbols": ("Box-Drawing Symbols", "Lines and borders for text art",
        glyphs("╔", "╗", "║", "═", "╬"), K_LIB),
  "library-braille-pattern-symbols": ("Braille Pattern Symbols", "Dotted blocks for text art",
        glyphs("⠿", "⣿", "⠛", "⡇", "⠶"), K_LIB),
  "library-brainrot-slang-emojis": ("Brainrot & Slang Emojis", "The internet's latest reactions", m_smiley, K_LIB),
  "library-chinese-symbols": ("Chinese Symbols", "Characters and marks for names", m_grid, K_LIB),
  "library-christmas-symbols": ("Christmas Symbols", "Festive snow, stars and cheer",
        m_tree, K_LIB),
  "library-clock-time-symbols": ("Clock & Time Symbols", "Hourglasses, dials and timers",
        glyphs("⌛", "◷", "◴", "◵", "○"), K_LIB),
  "library-clothing-fashion-emojis": ("Clothing & Fashion Emojis", "Outfits, style and accessories", m_bow, K_LIB),
  "library-color-emoji-combos": ("Color Emoji Combos", "Vivid copy-and-paste pairings", m_smiley, K_LIB),
  "library-crying-emoji": ("Crying Emoji Collection", "Tears of joy and sorrow", m_smiley, K_LIB),
  "library-dice-domino-symbols": ("Dice & Domino Symbols", "Faces for games and luck",
        glyphs("⚀", "⚁", "⚂", "⚃", "⚄"), K_LIB),
  "library-diwali-symbols": ("Diwali Symbols", "Lamps and light for the festival",
        glyphs("✦", "☀", "❉", "✺", "★"), K_LIB),
  "library-dreamcore-weirdcore-symbols": ("Dreamcore & Weirdcore Symbols", "Surreal, liminal accents",
        glyphs("☽", "✦", "◌", "❍", "✧"), K_LIB),
  "library-easter-symbols": ("Easter Symbols", "Spring, blooms and renewal",
        glyphs("✝", "❀", "✿", "❁", "✦"), K_LIB),
  "library-electrical-circuit-symbols": ("Electrical & Circuit Symbols", "Currents, charges and components",
        glyphs("⚡", "⊕", "⊖", "Ω", "~"), K_LIB),
  "library-emoji-combos": ("Emoji Combos", "Copy-and-paste emoji pairings", m_smiley, K_LIB),
  "library-evil-eye-hamsa-symbols": ("Evil Eye & Hamsa Symbols", "Protective marks and charms",
        glyphs("◉", "☽", "✦", "❂", "☉"), K_LIB),
  # ar/library translation (2026-08-01) — same motif as the EN parent above.
  "ar-library-evil-eye-hamsa-symbols": ("رموز العين الزرقاء والخمسة", "تميمة النظرة وكف الخمسة",
        glyphs("◉", "☽", "✦", "❂", "☉"), K_LIB),
  "library-fairycore-symbols": ("Fairycore Symbols", "Whimsical, magical accents",
        glyphs("✦", "✧", "❀", "✿", "❁"), K_LIB),
  "library-fantasy-mythical-emojis": ("Fantasy & Mythical Emojis", "Dragons, magic and legends",
        glyphs("★", "✦", "☽", "⚔", "☾"), K_LIB),
  "library-fortnite-symbols": ("Fortnite Name Symbols", "Sharp marks for your gamertag",
        glyphs("⚔", "★", "✦", "☠", "➤"), K_LIB),
  "library-fourth-of-july-symbols": ("Fourth of July Symbols", "Stars and stripes for the day",
        glyphs("★", "☆", "✯", "✪", "✦"), K_LIB),
  "library-free-fire-name-symbols": ("Free Fire Name Symbols", "Stylish marks for your in-game name",
        glyphs("☠", "⚔", "★", "✦", "➤"), K_LIB),
  "library-pubg-symbols": ("PUBG / BGMI Name Symbols", "Battle-tested marks for your in-game name",
        glyphs("彡", "乂", "★", "亗", "꧁"), K_LIB),
  "library-steam-symbols": ("Steam Name Symbols", "Characters that actually survive your profile",
        glyphs("★", "✦", "⚡", "☆", "✧"), K_LIB),
  "library-friendship-emojis": ("Friendship Emojis", "Show the bond with every send",
        glyphs("♥", "♡", "❣", "✦", "★"), K_LIB),
  "library-funny-emoji-combos": ("Funny Emoji Combos", "Pairings that land the joke", m_smiley, K_LIB),
  "library-gender-symbols": ("Gender Symbols", "Identity and biology marks",
        glyphs("♀", "♂", "⚥", "☿", "✦"), K_LIB),
  "library-greek-letter-symbols": ("Greek Letter Symbols", "Alpha to omega, copy-ready",
        glyphs("α", "β", "Δ", "Ω", "π"), K_LIB),
  "library-greeting-message-emojis": ("Greeting & Message Emojis", "Open every chat with warmth", m_chat, K_LIB),
  "library-halloween-symbols": ("Halloween Symbols", "Spooky marks for the season",
        m_pumpkin, K_LIB),
  "library-happy-emoji": ("Happy Emoji Collection", "Smiles for every good mood", m_smiley, K_LIB),
  "library-hazard-warning-symbols": ("Hazard & Warning Symbols", "Caution marks that demand attention",
        m_shield, K_LIB),
  "library-hindi-symbols": ("Hindi Symbols", "Characters and marks for names", m_grid, K_LIB),
  "library-html-entities": ("HTML Entities", "Named and numeric character codes",
        glyphs("&", "<", ">", "§", "©"), K_LIB),
  "library-invisible-character": ("Invisible Character", "Blank space that pastes anywhere",
        glyphs("␣", "▢", "◌", "▯", "□"), K_LIB),
  # root-level invisible-character/blank-space cluster translations (ar/ko/ja/ru/th, 2026-07-30)
  # — no "-library-" segment since these pages live at locale root, matching
  # slug_for(path)'s directory-path convention (e.g. it-testo-invisibile above).
  "ar-nas-ghayr-marii": ("نص غير مرئي", "مسافة فارغة تُلصق في أي مكان",
        glyphs("␣", "▢", "◌", "▯", "□"), K_LIB),
  "ko-bin-kan-munja": ("빈칸 문자", "어디에든 붙여넣는 투명 공백",
        glyphs("␣", "▢", "◌", "▯", "□"), K_LIB),
  "ja-kuuhaku-moji": ("空白文字", "どこにでも貼り付けられる空白",
        glyphs("␣", "▢", "◌", "▯", "□"), K_LIB),
  "ru-nevidimyy-tekst": ("Невидимый Текст", "Пустое место, которое вставляется где угодно",
        glyphs("␣", "▢", "◌", "▯", "□"), K_LIB),
  "th-khokhwam-long-hon": ("ข้อความล่องหน", "ช่องว่างที่วางได้ทุกที่",
        glyphs("␣", "▢", "◌", "▯", "□"), K_LIB),
  "library-ipa-phonetic-symbols": ("IPA Phonetic Symbols", "Sounds of every language",
        glyphs("ə", "ʃ", "θ", "ʒ", "ŋ"), K_LIB),
  "library-islamic-symbols": ("Islamic Symbols", "Crescents and marks of faith",
        glyphs("☪", "✦", "☾", "❂", "★"), K_LIB),
  # ar/library translation (2026-07-23) — same motif as the EN parent above.
  "ar-library-islamic-symbols": ("الرموز الإسلامية", "الهلال ورموز الإيمان",
        glyphs("☪", "✦", "☾", "❂", "★"), K_LIB),
  "library-japanese-symbols": ("Japanese Symbols", "Characters and marks for names", m_grid, K_LIB),
  "library-jewelry-gem-emojis": ("Jewelry & Gem Emojis", "Sparkle, shine and treasure",
        glyphs("◆", "◇", "♦", "✦", "❖"), K_LIB),
  "library-keyboard-symbols": ("Keyboard Symbols", "Command, shift and key marks",
        glyphs("⌘", "⌥", "⇧", "⏎", "⌫"), K_LIB),
  "library-korean-symbols": ("Korean Symbols", "Characters and marks for names", m_grid, K_LIB),
  "library-latex-symbols": ("LaTeX Symbols", "Math notation, copy-ready",
        glyphs("∑", "∫", "√", "∂", "∇"), K_LIB),
  "library-laughing-emoji": ("Laughing Emoji Collection", "From giggles to full-on LOL", m_smiley, K_LIB),
  "library-laundry-care-symbols": ("Laundry Care Symbols", "Wash, dry and iron marks",
        glyphs("○", "△", "□", "◇", "▽"), K_LIB),
  "library-loading-text-symbols": ("Loading & Spinner Symbols", "Animated-style progress marks",
        glyphs("◐", "◓", "◑", "◒", "○"), K_LIB),
  "library-media-control-symbols": ("Media Control Symbols", "Play, pause and skip marks",
        glyphs("▶", "◀", "■", "▲", "▼"), K_LIB),
  "library-medical-symbols": ("Medical Symbols", "Health, care and pharmacy marks",
        glyphs("✚", "☤", "⚕", "✛", "✠"), K_LIB),
  "library-meme-text-art": ("Meme Text Art", "Copy-ready ASCII meme classics", m_kaomoji, K_LIB),
  "library-minecraft-symbols": ("Minecraft Symbols", "Blocky marks for names and chat", m_block, K_LIB),
  "library-ml-name-symbols": ("Mobile Legends Name Symbols", "Stylish marks for your MLBB name",
        m_gamepad, K_LIB),
  "library-moai-emoji": ("Moai Emoji", "The stone-faced statue, decoded", m_block, K_LIB),
  "library-money-emojis": ("Money Emojis", "Cash, coins and currency",
        m_coin, K_LIB),
  "library-movie-night-emojis": ("Movie Night Emojis", "Films, popcorn and the big screen", m_play, K_LIB),
  "library-nature-emojis": ("Nature Emojis", "Plants, weather and the outdoors",
        glyphs("☘", "❀", "✿", "⚘", "❁"), K_LIB),
  "library-nerd-emoji": ("Nerd Emoji Collection", "Glasses-on and proud", m_smiley, K_LIB),
  "library-nickname-symbols": ("Nickname Symbols", "Decorate any name or handle",
        glyphs("✦", "★", "♛", "⚔", "✰"), K_LIB),
  "library-object-emojis": ("Object Emojis", "Everyday things, copy-ready",
        glyphs("✉", "✂", "✎", "☎", "✰"), K_LIB),
  "library-party-celebration-emojis": ("Party & Celebration Emojis", "Confetti for every occasion",
        glyphs("✦", "★", "❉", "✺", "❋"), K_LIB),
  "library-poop-emoji": ("Poop Emoji", "The internet's favourite pile", m_smiley, K_LIB),
  "library-preppy-emoji-combos": ("Preppy Emoji Combos", "Polished, coastal-cool pairings", m_bow, K_LIB),
  "library-pride-lgbtq-symbols": ("Pride & LGBTQ Symbols", "Flags and identity colors, copy-ready",
        glyphs("⚧", "♡", "✦", "⚢", "✧"), K_LIB),
  "library-punctuation-symbols": ("Punctuation Symbols", "Marks beyond the basics",
        glyphs("‽", "¶", "§", "†", "‡"), K_LIB),
  "library-recycle-environment-symbols": ("Recycle & Environment Symbols", "Green marks for a cause",
        glyphs("♻", "☘", "⚘", "❀", "✿"), K_LIB),
  "library-roblox-text-art": ("Roblox Text Art", "Blocky art for names and chat", m_block, K_LIB),
  "library-sad-emoji": ("Sad Emoji Collection", "Every shade of down and blue", m_smiley, K_LIB),
  "library-school-education-emojis": ("School & Education Emojis", "Class, study and graduation",
        glyphs("✎", "✏", "✐", "✦", "★"), K_LIB),
  "library-seasonal-emoji-combos": ("Seasonal Emoji Combos", "Pairings for every time of year",
        glyphs("❄", "☀", "❀", "☂", "★"), K_LIB),
  "library-shocked-emoji": ("Shocked Emoji Collection", "Gasps, surprise and disbelief", m_smiley, K_LIB),
  "library-side-eye-emoji": ("Side-Eye Emoji", "The look that says it all", m_smiley, K_LIB),
  "library-tech-status-symbols": ("Tech & Status Symbols", "Gears, power and signal marks",
        m_gear, K_LIB),
  "library-text-art": ("Text Art Gallery", "ASCII and Unicode art, copy-ready", m_kaomoji, K_LIB),
  "library-thanksgiving-symbols": ("Thanksgiving Symbols", "Harvest, gratitude and autumn",
        glyphs("❀", "❁", "☘", "✿", "✦"), K_LIB),
  "library-therian-symbols": ("Therian Symbols", "Paws and marks for the community", m_paw, K_LIB),
  "library-thumbs-up-emoji": ("Thumbs-Up Emoji", "The universal sign of approval",
        glyphs("☝", "✌", "☞", "☜", "☟"), K_LIB),
  "library-travel-vacation-emojis": ("Travel & Vacation Emojis", "Planes, maps and getaways", m_plane, K_LIB),
  "library-unit-measurement-symbols": ("Unit & Measurement Symbols", "Degrees, primes and more",
        glyphs("°", "′", "″", "µ", "Ω"), K_LIB),
  "library-vertical-line-symbols": ("Vertical Line Symbols", "Bars and pipes for dividers",
        glyphs("│", "┃", "║", "╎", "┊"), K_LIB),
  "library-weapon-tool-emojis": ("Weapon & Tool Emojis", "Blades, gear and hardware",
        glyphs("⚔", "⚒", "⚓", "✂", "†"), K_LIB),
  "library-wedding-anniversary-emojis": ("Wedding & Anniversary Emojis", "Love, rings and celebration",
        glyphs("♥", "♡", "❣", "❀", "✦"), K_LIB),
  "library-whatsapp-symbols": ("WhatsApp Symbols", "Symbols that paste cleanly in chats", m_chat, K_LIB),

  # --- World Cup / football library batch (nations, players, trophies) ---
  "library-algeria-emoji-combos": ("Algeria Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-argentina-emoji-combos": ("Argentina Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-australia-emoji-combos": ("Australia Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-austria-emoji-combos": ("Austria Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-belgium-emoji-combos": ("Belgium Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-bellingham-emoji-combos": ("Bellingham Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-benzema-emoji-combos": ("Benzema Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-brazil-emoji-combos": ("Brazil Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-cameroon-emoji-combos": ("Cameroon Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-canada-emoji-combos": ("Canada Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-card-emoji-soccer": ("Yellow & Red Card Emoji", "Match cards, refs and VAR", m_ball, K_LIB),
  "library-chile-emoji-combos": ("Chile Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-china-emoji-combos": ("China Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-colombia-emoji-combos": ("Colombia Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-costa-rica-emoji-combos": ("Costa Rica Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-croatia-emoji-combos": ("Croatia Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-de-bruyne-emoji-combos": ("De Bruyne Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-denmark-emoji-combos": ("Denmark Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-di-maria-emoji-combos": ("Di Maria Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-ecuador-emoji-combos": ("Ecuador Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-egypt-emoji-combos": ("Egypt Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-england-emoji-combos": ("England Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-foden-emoji-combos": ("Foden Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-football-ascii-art": ("Football ASCII Art", "Soccer balls, goals and pitches", m_ball, K_LIB),
  "library-football-emoji-copy-paste": ("Football Emoji Copy & Paste", "Soccer, rugby and trophies", m_ball, K_LIB),
  "library-football-kaomoji": ("Football Kaomoji", "Cute football text faces", m_kaomoji, K_LIB),
  "library-football-reaction-emojis": ("Football Reaction Emojis", "Goal, win and banter combos", m_ball, K_LIB),
  "library-football-symbols": ("Football Symbols & Combos", "Goals, cards and match sets", m_ball, K_LIB),
  "library-football-username-ideas": ("Football Username Ideas & Symbols", "Ready-made handles and symbols", m_ball, K_LIB),
  "library-guess-soccer-player-by-emoji": ("Guess the Soccer Player by Emoji", "Emoji clues with answers", m_ball, K_LIB),
  "library-guess-soccer-team-by-emoji": ("Guess the Soccer Team by Emoji", "Team emoji clues with answers", m_flag, K_LIB),
  "library-football-trophy-emoji": ("Football & World Cup Trophy Emoji", "Trophies, medals and crowns", m_trophy, K_LIB),
  "library-france-emoji-combos": ("France Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-gavi-emoji-combos": ("Gavi Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-germany-emoji-combos": ("Germany Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-ghana-emoji-combos": ("Ghana Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-goal-emoji-combos": ("Goal Emoji & Celebration Combos", "Goal celebration emoji sets", m_ball, K_LIB),
  "library-goat-emoji-combos": ("GOAT Emoji Combos", "Greatest-of-all-time emoji sets", m_trophy, K_LIB),
  "library-greece-emoji-combos": ("Greece Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-griezmann-emoji-combos": ("Griezmann Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-haaland-emoji-combos": ("Haaland Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-honduras-emoji-combos": ("Honduras Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-india-emoji-combos": ("India Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-iran-emoji-combos": ("Iran Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-ireland-emoji-combos": ("Ireland Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-italy-emoji-combos": ("Italy Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-ivory-coast-emoji-combos": ("Ivory Coast Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-jamaica-emoji-combos": ("Jamaica Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-japan-emoji-combos": ("Japan Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-kane-emoji-combos": ("Kane Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-kvaratskhelia-emoji-combos": ("Kvaratskhelia Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-lautaro-martinez-emoji-combos": ("Lautaro Martinez Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-lewandowski-emoji-combos": ("Lewandowski Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-mbappe-emoji-combos": ("Mbappe Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-messi-emoji-combos": ("Messi Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-mexico-emoji-combos": ("Mexico Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-modric-emoji-combos": ("Modric Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-morocco-emoji-combos": ("Morocco Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-musiala-emoji-combos": ("Musiala Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-netherlands-emoji-combos": ("Netherlands Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-new-zealand-emoji-combos": ("New Zealand Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-neymar-emoji-combos": ("Neymar Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-nigeria-emoji-combos": ("Nigeria Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-nkunku-emoji-combos": ("Nkunku Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-norway-emoji-combos": ("Norway Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-osimhen-emoji-combos": ("Osimhen Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-panama-emoji-combos": ("Panama Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-paraguay-emoji-combos": ("Paraguay Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-pedri-emoji-combos": ("Pedri Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-peru-emoji-combos": ("Peru Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-poland-emoji-combos": ("Poland Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-portugal-emoji-combos": ("Portugal Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-qatar-emoji-combos": ("Qatar Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-rashford-emoji-combos": ("Rashford Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-rodri-emoji-combos": ("Rodri Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-rodrygo-emoji-combos": ("Rodrygo Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-ronaldo-emoji-combos": ("Ronaldo Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-saka-emoji-combos": ("Saka Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-salah-emoji-combos": ("Salah Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-saudi-arabia-emoji-combos": ("Saudi Arabia Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-scotland-emoji-combos": ("Scotland Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-senegal-emoji-combos": ("Senegal Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-serbia-emoji-combos": ("Serbia Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-soccer-emoji-copy-paste": ("Soccer Emoji Copy & Paste", "Balls, goals, gloves and more", m_ball, K_LIB),
  "library-son-emoji-combos": ("Son Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-south-africa-emoji-combos": ("South Africa Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-south-korea-emoji-combos": ("South Korea Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-spain-emoji-combos": ("Spain Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-wink-kaomoji": ("Wink Kaomoji", "Playful winking text faces", m_kaomoji, K_LIB),
  "library-wave-kaomoji": ("Wave Kaomoji", "Waving hello & goodbye faces", m_kaomoji, K_LIB),
  "library-thumbs-up-kaomoji": ("Thumbs Up Kaomoji", "Approving text faces", m_kaomoji, K_LIB),
  "library-suarez-emoji-combos": ("Suarez Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-sweden-emoji-combos": ("Sweden Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-switzerland-emoji-combos": ("Switzerland Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-tunisia-emoji-combos": ("Tunisia Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-turkey-emoji-combos": ("Turkey Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-ukraine-emoji-combos": ("Ukraine Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-uruguay-emoji-combos": ("Uruguay Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-usa-emoji-combos": ("USA Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-venezuela-emoji-combos": ("Venezuela Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-vinicius-emoji-combos": ("Vinicius Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-wales-emoji-combos": ("Wales Emoji Combos", "Fan emoji sets to copy and paste", m_flag, K_LIB),
  "library-wirtz-emoji-combos": ("Wirtz Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),
  "library-world-cup-emoji-combos": ("World Cup Emoji & Combos", "Tournament emoji sets for 2026", m_trophy, K_LIB),
  "library-yamal-emoji-combos": ("Yamal Emoji Combos", "Fan emoji sets to copy and paste", m_ball, K_LIB),

  # ---- localized expansion: emoji combos / discord / stacked text / symbols ----
  # German
  "de-library-emoji-flags": ("Länderflaggen", "Flaggen-Emojis aller Länder", m_flag, K_LIB),
  # Portuguese
  "pt-fontes-para-discord": ("Fontes para Discord", "Letras para nick, canal e bio — sem Nitro", m_chat, K_PLAT),
  "pt-library-emoji-flags": ("Emoji de Bandeiras", "Bandeiras de todos os países", m_flag, K_LIB),
  # Vietnamese
  "vi-combo-emoji": ("Combo Emoji", "Bộ emoji để sao chép và dán", m_smiley, K_LIB),
  "vi-font-discord": ("Font Discord", "Chữ kiểu cho nick và bio Discord", m_chat, K_PLAT),
  "vi-library-emoji-flags": ("Cờ Các Nước", "Emoji lá cờ mọi quốc gia", m_flag, K_LIB),
  "vi-symbol-checkmark-symbol": ("Dấu Tích", "Ý nghĩa dấu tích & cách gõ", glyphs("✓", "✔"), K_SYM),
  "vi-symbol-quotation-mark": ("Dấu Ngoặc Kép", "Ý nghĩa & cách gõ dấu ngoặc", glyphs("“", "”"), K_SYM),
  "vi-library-math-symbols": ("Ký Hiệu Toán Học", "Toán tử, tập hợp và Hy Lạp",
        glyphs("∑", "∫", "√", "π", "∞"), K_LIB),
  "vi-library-bullet-point-symbols": ("Ký Hiệu Chấm Tròn", "Dẫn đầu danh sách thật đẹp",
        glyphs("•", "◦", "▪", "‣", "◆"), K_LIB),
  # Spanish
  "es-library-emoji-flags": ("Emoji Bandera", "Banderas de todos los países", m_flag, K_LIB),
  "es-letras-en-otros-idiomas": ("Letras en Otros Idiomas", "Alfabetos y letras del mundo para copiar",
        P(m_typo, sample="Åß", size=88, label="letras del mundo"), K_LIB),
  "es-letras-bonitas": ("Letras Bonitas", "Letras lindas para copiar y pegar",
        P(m_typo, sample="Aa", size=88, style="italic", label="letras bonitas"), K_CAT),
  # French
  "fr-police-discord": ("Police Discord", "Écriture pour pseudo et bio — sans Nitro", m_chat, K_PLAT),
  # Polish
  "pl-literki": ("Literki", "Ładne literki do skopiowania",
        P(m_typo, sample="Aa", size=88, label="ładne literki"), K_CAT),
  "pl-litery-do-skopiowania": ("Litery do Skopiowania", "Alfabet w różnych stylach do skopiowania",
        P(m_typo, sample="Ab", size=88, label="do skopiowania"), K_CAT),
  "pl-ozdobniki": ("Ozdobniki do Skopiowania", "Symbole i ozdoby do nicku i bio", m_grid, K_LIB),
  "pl-library": ("Biblioteka Symboli i Emotek", "Kolekcje gotowe do skopiowania", m_grid, K_LIB),
  "pl-library-emoji-flags": ("Flagi Emoji — Wszystkie Kraje", "Flaga każdego kraju do skopiowania", m_flag, K_LIB),
  "pl-library-alfabet-grecki": ("Alfabet Grecki", "Alfa do omega, gotowe do skopiowania",
        glyphs("α", "β", "Δ", "Ω", "π"), K_LIB),
  # Turkish
  "tr-sekilli-yazi": ("Şekilli Yazı", "Şekilli harfler kopyala yapıştır",
        P(m_typo, sample="Şa", size=88, label="şekilli yazı"), K_CAT),

  # ---- Discord font pages (demand-validated locales) ----
  "de-discord-schriftart": ("Discord Schriftart", "Schriften für Nick, Bio und Kanal — ohne Nitro", m_chat, K_PLAT),
  "es-fuentes-para-discord": ("Fuentes para Discord", "Letras para nick, canal y bio — sin Nitro", m_chat, K_PLAT),
  "pl-czcionki-discord": ("Czcionki na Discord", "Czcionki do nicku, kanału i bio — bez Nitro", m_chat, K_PLAT),
  "id-font-discord": ("Font Discord", "Font untuk nama, channel, dan bio — tanpa Nitro", m_chat, K_PLAT),

  # ---- Roblox font pages (demand-validated locales) ----
  "es-fuentes-para-roblox": ("Fuentes para Roblox", "Letras para el nombre y la bio", m_chat, K_PLAT),
  "pl-czcionki-na-roblox": ("Czcionki na Roblox", "Generator czcionek do nazwy i bio", m_chat, K_PLAT),
  "vi-font-roblox": ("Font Chữ Roblox", "Tạo chữ đẹp cho tên và bio", m_chat, K_PLAT),

  # ---- single-emoji spokes added 2026-07-13 (broad-match opportunity batch) ----
  "library-heart-emoji": ("Heart Emoji Collection", "Every heart color and meaning", m_heart, K_LIB),
  "library-check-mark-emoji": ("Check Mark Emoji", "Done, approved and verified marks",
        glyphs("✓", "✔", "☑"), K_LIB),
  "library-eyes-emoji": ("Eyes Emoji Collection", "The watching-this meme, in every form", m_smiley, K_LIB),
  "library-skull-emoji": ("Skull Emoji Collection", "The internet's favorite way to say I'm dead", m_skull, K_LIB),
  "library-praying-hands-emoji": ("Praying Hands Emoji", "Prayer, thanks and high-fives", m_smiley, K_LIB),
  "library-thinking-emoji": ("Thinking Emoji Collection", "Hmm, skeptical and shrug faces", m_smiley, K_LIB),
  "library-star-emoji": ("Star Emoji Collection", "Ratings, sparkle and shooting stars", m_star, K_LIB),
  "library-fire-emoji": ("Fire Emoji Collection", "This is fire — hype and heat symbols", m_smiley, K_LIB),
  "library-sunglasses-emoji": ("Sunglasses Emoji Collection", "Cool, confident and unbothered", m_smiley, K_LIB),
  "library-tired-emoji": ("Tired Emoji Collection", "Sleepy, exhausted and running on empty", m_smiley, K_LIB),

  # ---- single-emoji spokes added 2026-07-13 (broad-match opportunity batch 2) ----
  "library-sick-emoji": ("Sick Emoji Collection", "Queasy, feverish and woozy faces", m_smiley, K_LIB),
  "library-seahorse-emoji": ("Seahorse Emoji", "Why it doesn't exist, and the closest alternatives", m_smiley, K_LIB),
  "library-blush-emoji": ("Blush Emoji Collection", "Bashful, shy and flattered faces", m_smiley, K_LIB),
  "library-freaky-emoji": ("Freaky Emoji Collection", "Flirty, mischievous and devilish faces", m_smiley, K_LIB),
  "library-kiss-emoji": ("Kiss Emoji Collection", "Every kissing face and kiss mark", m_smiley, K_LIB),
  "library-eye-roll-emoji": ("Eye Roll Emoji Collection", "Exasperated, unimpressed reactions", m_smiley, K_LIB),
  "library-wink-emoji": ("Wink Emoji Collection", "Playful winks and teasing faces", m_smiley, K_LIB),
  "library-salute-emoji": ("Salute Emoji Collection", "Respect, honor and acknowledgment", m_smiley, K_LIB),
  "library-lip-bite-emoji": ("Lip Bite Emoji Collection", "Flirty faces and teasing kaomoji", m_smiley, K_LIB),
  "library-tongue-emoji": ("Tongue Emoji Collection", "Silly, playful tongue-out faces", m_smiley, K_LIB),
  "library-smirk-emoji": ("Smirk Emoji Collection", "Smug, confident and sly faces", m_smiley, K_LIB),
  "library-scared-emoji": ("Scared Emoji Collection", "Fearful, panicked and spooky faces", m_smiley, K_LIB),
  "library-chefs-kiss-emoji": ("Chef's Kiss Emoji Collection", "This is absolutely perfect", m_smiley, K_LIB),
  "library-handshake-emoji": ("Handshake Emoji Collection", "Greetings, deals and agreements", m_smiley, K_LIB),
  "library-middle-finger-emoji": ("Middle Finger Emoji Collection", "The rude gesture and its variants", m_smiley, K_LIB),
  "library-devil-emoji": ("Devil Emoji Collection", "Demons, monsters and villain symbols", m_smiley, K_LIB),
  "library-confused-emoji": ("Confused Emoji Collection", "Baffled, puzzled and lost faces", m_smiley, K_LIB),
  "library-eggplant-emoji": ("Eggplant Emoji Collection", "Literal meaning and internet slang", m_smiley, K_LIB),
  "library-facepalm-emoji": ("Facepalm Emoji Collection", "Exasperated, done-with-it reactions", m_smiley, K_LIB),
  "library-clown-emoji": ("Clown Emoji Collection", "Circus symbols and clown-check memes", m_smiley, K_LIB),

  # ---- single-emoji spokes added 2026-07-13 (broad-match opportunity batch 3) ----
  "library-pleading-emoji": ("Pleading Emoji Collection", "Puppy eyes and begging faces", m_smiley, K_LIB),
  "library-embarrassed-emoji": ("Embarrassed Emoji Collection", "Mortified and caught-off-guard faces", m_smiley, K_LIB),
  "library-annoyed-emoji": ("Annoyed Emoji Collection", "Irritated, fed-up and exasperated faces", m_smiley, K_LIB),
  "library-cringe-emoji": ("Cringe Emoji Collection", "Secondhand embarrassment and yikes faces", m_smiley, K_LIB),
  "library-sigh-emoji": ("Sigh Emoji Collection", "Relief, resignation and exhaling faces", m_smiley, K_LIB),
  "library-choking-emoji": ("Choking Emoji Collection", "Knocked-out and dying-of-laughter faces", m_smiley, K_LIB),
  "library-halo-emoji": ("Halo Emoji Collection", "Innocent and angelic smiley faces", m_smiley, K_LIB),
  "library-rocket-emoji": ("Rocket Emoji Collection", "Launch, hype and to-the-moon symbols", m_plane, K_LIB),
  "library-high-five-emoji": ("High Five Emoji Collection", "Celebration and team-cheer hands", m_thumb, K_LIB),
  "library-clap-emoji": ("Clap Emoji Collection", "Applause and word-for-word emphasis combos", m_thumb, K_LIB),
  "library-crown-emoji": ("Crown Emoji Collection", "Royalty, queen and king slang symbols", m_trophy, K_LIB),
  "library-ghost-emoji": ("Ghost Emoji Collection", "Spooky faces and ghosting slang symbols", m_pumpkin, K_LIB),
  "library-angel-emoji": ("Angel Emoji Collection", "Guardian angels and in-loving-memory symbols", m_heart, K_LIB),
  "library-peace-emoji": ("Peace Emoji Collection", "Peace sign, dove and harmony symbols", m_thumb, K_LIB),
  "library-dancing-emoji": ("Dancing Emoji Collection", "Dancer figures and dance-floor symbols", m_note, K_LIB),
  "library-cowboy-emoji": ("Cowboy Emoji Collection", "Yeehaw and Wild West symbols", m_smiley, K_LIB),
  "library-muscle-emoji": ("Muscle Emoji Collection", "Flex, gym and gains symbols", m_thumb, K_LIB),
  "library-gift-emoji": ("Gift Emoji Collection", "Presents, surprises and celebration symbols", m_firework, K_LIB),

  # ---- 2026-07-24 localization batch ----
  # Alt-codes: 6 new locales
  "tr-library-alt-kodlari": ("Alt Kodları", "Türkçe karakterler, para birimi ve tam liste", m_block, K_LIB),
  "nl-library-alt-codes": ("Alt Codes", "é alt-code en volledige toetsenbordlijst", m_block, K_LIB),
  "pl-library-kody-alt": ("Kody Alt", "Waluta, matematyka i znaki zachodnie", m_block, K_LIB),
  "ko-library-alt-kodeu": ("알트 코드", "닉네임 꾸미기 기호와 전체 목록", m_block, K_LIB),
  "id-library-kode-alt": ("Kode Alt", "Daftar lengkap kode simbol keyboard", m_block, K_LIB),
  "es-library-codigos-alt": ("Códigos Alt", "Lista completa de símbolos del teclado", m_block, K_LIB),

  # ---- 2026-07-30: ar + th alt-codes ----
  "ar-library-alt-codes": ("أكواد Alt", "القائمة الكاملة لرموز لوحة المفاتيح", m_block, K_LIB),
  "th-library-alt-codes": ("Alt Code ครบชุด", "พิมพ์สัญลักษณ์ด้วยรหัสตัวเลข", m_block, K_LIB),
  # Library symbol batches: 5 new locale pages
  "th-library-discord-symbols": ("สัญลักษณ์ Discord", "คัดลอกวางสำหรับชื่อผู้ใช้และไบโอ", m_block, K_LIB),
  "th-library-greek-letter-symbols": ("รวมอักษรกรีก", "ตั้งแต่อัลฟาถึงโอเมกา คัดลอกได้ทันที",
        glyphs("α", "β", "Δ", "Ω", "π"), K_LIB),
  "th-library-heart-symbols": ("สัญลักษณ์หัวใจ", "อิโมจิหัวใจทุกสี คัดลอกวางได้เลย",
        glyphs("♥", "♡", "❣", "❤", "♥"), K_LIB),
  "ms-library-simbol-roblox": ("Simbol Roblox", "Salin & tampal untuk nama paparan", m_block, K_LIB),
  "ar-library-y2k-symbols": ("رموز Y2K", "زخارف سايبر للنسخ واللصق", m_block, K_LIB),
  "ru-library-simvoly-y2k": ("Символы Y2K", "Киберэстетика для копирования", m_block, K_LIB),
  "ru-library-grecheskiy-alfavit": ("Греческий алфавит", "От альфы до омеги, готово к копированию",
        glyphs("α", "β", "Δ", "Ω", "π"), K_LIB),
  "ms-library-simbol-y2k": ("Simbol Y2K", "Hiasan cyber aesthetic untuk bio", m_block, K_LIB),
  # Printables: 5 new locale hub pages
  "pl-do-druku-litery-bombelkowe": ("Bąbelkowe litery do druku", "Obrysuj, pokoloruj, pobierz PNG — A–Z i 0–9", m_grid, K_PRINT),
  "pl-do-druku-alfabet-kursywny": ("Alfabet kursywny do druku", "Karty kaligraficzne A–Z do obrysowania", m_grid, K_PRINT),
  "pl-do-druku-alfabet-do-kolorowania": ("Alfabet do kolorowania", "Darmowe litery A–Z do druku i kolorowania", m_grid, K_PRINT),
  "de-zum-ausdrucken-blasenbuchstaben": ("Blasenbuchstaben zum Ausdrucken", "Nachfahren, Ausmalen, PNG — A–Z & 0–9", m_grid, K_PRINT),
  "de-zum-ausdrucken-alphabet-ausmalbilder": ("Alphabet-Ausmalbilder", "Kostenlose Buchstaben A–Z zum Ausdrucken", m_grid, K_PRINT),
  # New symbol/ EN parents + id/ translations
  "symbol-microphone-emoji": ("Microphone Emoji", "🎤 meaning, history & every way to type it", m_microphone, K_SYM),
  "symbol-less-than-or-equal-to-symbol": ("Less Than or Equal To Symbol", "≤ meaning, Alt Code & LaTeX", glyphs("≤"), K_SYM),
  "id-symbol-mikrofon-emoji": ("Emoji Mikrofon", "🎤 arti, sejarah & kode Unicode-nya", m_microphone, K_SYM),
  "id-symbol-simbol-kurang-dari-sama-dengan": ("Simbol Kurang Dari Sama Dengan", "≤ arti, Alt Code & LaTeX", glyphs("≤"), K_SYM),
}


# ---- printables letter pages (bubble/dot-to-dot/coloring, A-Z x 3 types) ----
# Highly templatable — one motif per alphabet type, a title/subtitle pattern per
# letter — so these are generated in a loop instead of 78 hand-typed dict lines.
LETTER_WORD = {
    "a": "Apple", "b": "Ball", "c": "Cat", "d": "Dog", "e": "Elephant",
    "f": "Fish", "g": "Goat", "h": "Hat", "i": "Igloo", "j": "Jellyfish",
    "k": "Kite", "l": "Lion", "m": "Monkey", "n": "Nest", "o": "Owl",
    "p": "Penguin", "q": "Queen", "r": "Rabbit", "s": "Sun", "t": "Tiger",
    "u": "Umbrella", "v": "Violin", "w": "Whale", "x": "Xylophone", "y": "Yak",
    "z": "Zebra",
}
for _l, _word in LETTER_WORD.items():
    _L = _l.upper()
    PAGES[f"printables-bubble-letters-letter-{_l}"] = (
        f"Bubble Letter {_L}", "Free printable trace, color & print outline",
        P(m_letter_bubble, letter=_L), K_PRINT)
    PAGES[f"printables-dot-to-dot-alphabet-letter-{_l}"] = (
        f"Letter {_L} Dot to Dot", f"{_L} is for {_word} — connect the dots",
        P(m_letter_dots, letter=_L), K_PRINT)
    PAGES[f"printables-alphabet-coloring-pages-letter-{_l}"] = (
        f"Letter {_L} Coloring Page", f"{_L} is for {_word} — color the outline",
        P(m_letter_outline, letter=_L), K_PRINT)
    PAGES[f"printables-cursive-alphabet-letter-{_l}"] = (
        f"Cursive {_L}", f"Capital & lowercase {_L} in cursive — free printable",
        P(m_letter_cursive, letter=_L), K_PRINT)

# ---- /learn/ education pillar ----
PAGES.update({
"learn-hub": ("Learn", "Stage-by-stage guides for handwriting & lettering",
    P(m_doc), K_PRINT),
"learn-dot-to-dots": ("Dot-to-Dots & Pencil Control", "A progression guide from many dots to freehand",
    P(m_typo, sample="•••", size=92, label="pencil control"), K_PRINT),
"learn-coloring-and-fine-motor": ("Coloring Letters", "Fine motor skills through letter-shaped coloring",
    P(m_typo, sample="Aa", size=92, label="fine motor"), K_PRINT),
"learn-handwriting": ("Teaching Handwriting", "A practical, stage-by-stage guide — readiness to cursive",
    P(m_typo, sample="Aa", size=92, label="stage by stage"), K_PRINT),
"learn-handwriting-when-to-start-handwriting": ("When to Start Handwriting", "Readiness signs that matter more than age",
    P(m_typo, sample="A?", size=92, label="readiness"), K_PRINT),
"learn-handwriting-pre-writing-strokes": ("Pre-Writing Strokes", "The lines every letter is built from",
    P(m_typo, sample="l○", size=92, label="pre-writing"), K_PRINT),
"learn-handwriting-first-letters-uppercase": ("First Letters", "Why uppercase usually comes first",
    P(m_typo, sample="Aa", size=92, label="first letters"), K_PRINT),
"learn-handwriting-lowercase-and-reversals": ("Lowercase & Reversals", "Fixing b/d/p/q confusion",
    P(m_typo, sample="bd", size=92, label="reversals"), K_PRINT),
"learn-handwriting-stroke-order-and-start-dots": ("Stroke Order & Start Dots", "Why how you trace matters more than how much",
    P(m_typo, sample="1→", size=92, label="stroke order"), K_PRINT),
"learn-handwriting-from-tracing-to-writing": ("From Tracing to Writing", "The 7-step fading ladder",
    P(m_typo, sample="Aa", size=92, label="7 levels"), K_PRINT),
"learn-handwriting-name-writing": ("Name Writing", "The first word worth practicing",
    P(m_typo, sample="Aa", size=92, label="name writing"), K_PRINT),
"learn-handwriting-cursive-when-and-how": ("Cursive: When & How", "Letter families, lowercase first, joins throughout",
    P(m_typo, sample="Aa", ff=SERIF, style="italic", weight="400", size=92, label="cursive"), K_PRINT),
"learn-handwriting-how-much-practice": ("How Much Practice?", "How much helps, and how to measure progress",
    P(m_typo, sample="5m", size=92, label="practice & progress"), K_PRINT),
})

PAGES["printables-bubble-letters"] = (
    "Printable Bubble Letters", "Big puffy A-Z outlines to trace, color and print",
    P(m_letter_bubble, letter="B"), K_PRINT)
PAGES["printables-dot-to-dot-alphabet"] = (
    "Dot-to-Dot Alphabet", "Connect the dots to reveal each letter A-Z",
    P(m_letter_dots, letter="D"), K_PRINT)
PAGES["printables-alphabet-coloring-pages"] = (
    "Alphabet Coloring Pages", "Printable ABC letter outlines to color",
    P(m_letter_outline, letter="C"), K_PRINT)


# ---- remaining image-SEO gap: answers / events / printables tools / category /
# ---- ascii-art library / gaming usecase / misc standalone pages ----
PAGES.update({
"answers-can-you-search-fancy-text": ("Can You Search Fancy Text?", "Why stylized Unicode doesn't match plain search", m_qa, K_ANS),
"answers-cny-greetings-what-to-say": ("Chinese New Year Greetings", "What to say, in Chinese, pinyin & English", m_qa, K_ANS),
"answers-diwali-wishes-what-to-say": ("Diwali Wishes: What to Say", "Hindi greetings, romanized, plus English lines", m_qa, K_ANS),
"answers-do-fancy-fonts-work-on-iphone": ("Do Fancy Fonts Work on iPhone?", "Yes, but some styles show as empty boxes", m_qa, K_ANS),
"answers-do-fancy-fonts-work-with-vietnamese": ("Fancy Fonts With Vietnamese?", "Stacked marks break most styles — here's what works", m_qa, K_ANS),
"answers-does-zalgo-work-on-roblox": ("Does Zalgo Text Work on Roblox?", "What survives the filter, and what never does", m_zalgo, K_ANS),
"answers-eid-mubarak-meaning-and-reply": ("What Does Eid Mubarak Mean?", "The meaning, and how to reply", m_qa, K_ANS),
"answers-fancy-text-with-n-and-accented-letters": ("Fancy Text With ñ and Accents", "Why accented letters often stay plain", m_qa, K_ANS),
"answers-fathers-day-messages-what-to-write": ("Father's Day Messages: What to Write", "Short, sincere lines for dads and father figures", m_qa, K_ANS),
"answers-halloween-messages-what-to-write": ("Halloween Messages: What to Write", "Spooky captions and card lines that land", m_qa, K_ANS),
"answers-happy-new-year-wishes-what-to-write": ("New Year Wishes: What to Write", "Funny, heartfelt & professional message ideas", m_qa, K_ANS),
"answers-how-to-change-discord-username": ("Change Your Discord Username", "Unique name vs display name, explained", m_qa, K_ANS),
"answers-how-to-change-instagram-username": ("Change Your Instagram Username", "The rules, the 14-day limit, and fancy fonts", m_qa, K_ANS),
"answers-how-to-make-bold-text-in-discord": ("Bold Text in Discord", "Markdown for messages, Unicode for names", m_qa, K_ANS),
"answers-how-to-underline-in-discord": ("Underline in Discord", "Markdown for messages, Unicode for names", m_qa, K_ANS),
"answers-how-to-make-big-text-in-discord": ("Big Text in Discord", "Headers for messages, a font for names", m_qa, K_ANS),
"answers-how-to-remove-zalgo-text": ("How to Remove Zalgo Text", "Strip combining marks and recover the original", m_zalgo, K_ANS),
"answers-how-to-uncover-redacted-text": ("Can You Uncover Redacted Text?", "Unicode blocks are permanent, images sometimes aren't", m_qa, K_ANS),
"answers-is-fancy-text-bad-for-accessibility": ("Is Fancy Text Bad for Accessibility?", "How screen readers handle styled Unicode", m_qa, K_ANS),
"answers-is-fancy-text-bad-for-seo": ("Is Fancy Text Bad for SEO?", "Fine as decoration, risky on keywords", m_qa, K_ANS),
"answers-is-zalgo-text-safe": ("Is Zalgo Text Safe?", "No virus, no hack — the two real caveats", m_zalgo, K_ANS),
"answers-merry-christmas-in-different-languages": ("Merry Christmas in Other Languages", "Feliz Navidad, Joyeux Noël & more, translated", m_qa, K_ANS),
"answers-christmas-card-what-to-write": ("What to Write in a Christmas Card", "Lines by relationship, family to boss", m_qa, K_ANS),
"answers-mothers-day-messages-what-to-write": ("Mother's Day Messages: What to Write", "Heartfelt lines for Mom, Grandma & more", m_qa, K_ANS),
"answers-valentines-day-messages-what-to-write": ("Valentine's Day Messages: What to Write", "Sweet lines for partners, crushes & friends", m_qa, K_ANS),
"answers-what-font-does-instagram-use": ("What Font Does Instagram Use?", "System fonts, Instagram Sans, and fancy fonts", m_qa, K_ANS),
"answers-what-font-does-tiktok-use": ("What Font Does TikTok Use?", "TikTok Sans, and how it differs from styled text", m_qa, K_ANS),
"answers-what-font-does-twitter-use": ("What Font Does Twitter/X Use?", "Chirp, the brand font, explained", m_qa, K_ANS),
"answers-what-font-does-youtube-use": ("What Font Does YouTube Use?", "Roboto and YouTube Sans, explained", m_qa, K_ANS),
"answers-youtube-handle-vs-channel-name": ("YouTube Handle vs Channel Name", "Two fields, two rule sets — which is which", m_qa, K_ANS),
"id-answers-handle-vs-nama-channel-youtube": ("Handle vs Nama Channel YouTube", "Dua kolom, dua aturan berbeda", m_qa, K_ANS),
"id-answers-cara-mengganti-nama-channel-youtube": ("Cara Mengganti Nama Channel YouTube", "Langkahnya, batasnya, dan biayanya", m_qa, K_ANS),
"tr-answers-youtube-handle-mi-kanal-adi-mi": ("YouTube Handle mı Kanal Adı mı", "İki alan, iki farklı kural", m_qa, K_ANS),
"tr-answers-youtube-kanal-adi-nasil-degistirilir": ("YouTube Kanal Adı Nasıl Değiştirilir", "Adımlar, 14 gün sınırı ve bedeli", m_qa, K_ANS),
"pt-answers-handle-ou-nome-do-canal-do-youtube": ("Handle ou Nome do Canal do YouTube", "Dois campos, duas regras diferentes", m_qa, K_ANS),
"pt-answers-como-mudar-o-nome-do-canal-do-youtube": ("Como Mudar o Nome do Canal do YouTube", "O passo a passo, o limite e o custo", m_qa, K_ANS),
"answers-how-to-change-youtube-channel-name": ("How to Change Your YouTube Channel Name", "The steps, the 14-day limit, the badge cost", m_qa, K_ANS),
"answers-what-is-ascii": ("What Is ASCII?", "The 128-character code behind plain text", m_qa, K_ANS),
"answers-why-does-copied-fancy-text-lose-formatting": ("Why Fancy Text Loses Formatting", "It was never formatting — just substitute characters", m_qa, K_ANS),
"answers-why-fancy-text-looks-different-on-iphone-vs-android": ("Fancy Text: iPhone vs Android", "Same characters, different system fonts", m_qa, K_ANS),
"answers-why-fancy-text-removes-accents": ("Why Fancy Text Removes Accents", "Unicode has no styled á, ñ or ữ — here's why", m_qa, K_ANS),
"answers-why-wont-discord-accept-fancy-username": ("Why Won't Discord Accept My Username?", "Usernames are ASCII-only; display names aren't", m_qa, K_ANS),
"answers-why-wont-instagram-accept-my-fancy-username": ("Why Won't Instagram Accept My Username?", "Handles are ASCII-only — style your Name instead", m_qa, K_ANS),
"events": ("Holiday & Event Text Generators", "Fonts, emoji, and phrases for every calendar holiday", m_grid, K_USE),
"events-ramadan": ("Ramadan Text & Symbol Generator", "Crescent, lantern, and Ramadan Kareem greetings", m_crescent, K_USE),
"events-st-patricks-day": ("St Patrick's Day Fonts & Symbols", "Shamrock, clover, and Irish blessing phrases", m_clover, K_USE),
"events-july-4th": ("4th of July Fonts & Emoji Generator", "Fireworks, flags, and Independence Day captions", m_firework, K_USE),
"events-graduation": ("Graduation Text & Symbol Generator", "Cap, scroll, and congratulations messages", m_gradcap, K_USE),
"events-chinese-new-year": ("Chinese New Year Text & Symbol Generator", "Lanterns, fireworks, and Lunar New Year phrases", m_lantern, K_USE),
"events-christmas": ("Christmas Fonts & Emoji Generator", "Style greetings with tree, Santa, and snow emoji", m_tree, K_USE),
"events-diwali": ("Diwali Fonts & Symbol Generator", "Diya, fireworks, and festival-of-lights phrases", m_lamp, K_USE),
"events-easter": ("Easter Fonts & Emoji Generator", "Bunny, egg, and chick emoji for spring greetings", m_bunny, K_USE),
"events-eid-mubarak": ("Eid Mubarak Text & Symbol Generator", "Crescent moon emoji and ready-made Eid phrases", m_crescent, K_USE),
"events-fathers-day": ("Father's Day Message Generator", "Bold, rugged fonts for World's Best Dad messages", m_necktie, K_USE),
"events-halloween": ("Halloween Fonts & Emoji Generator", "Pumpkin, ghost, and bat emoji for spooky greetings", m_pumpkin, K_USE),
"events-mothers-day": ("Mother's Day Message Generator", "Warm cursive fonts for Happy Mother's Day messages", m_bouquet, K_USE),
"events-new-year": ("New Year Countdown Text Generator", "Firework emoji and Happy New Year phrases to paste", m_firework, K_USE),
"events-thanksgiving": ("Thanksgiving Fonts & Emoji Generator", "Turkey, pie, and autumn-leaf emoji for gratitude posts", m_pie, K_USE),
"events-valentines-day": ("Valentine's Day Text Generator", "Hearts, roses, and Be My Valentine phrases to style", m_heart, K_USE),
"printables-banner-maker": ("Printable Banner Maker", "One flag per letter, cut and strung to spell any word", m_banner, K_PRINT),
"printables-block-letters": ("Printable Block Letters & Stencils", "Bold hollow A-Z & 0-9 stencils to trace, cut and use", P(m_letter_stencil, letter="B"), K_PRINT),
"printables-calligraphy-alphabet": ("Calligraphy Alphabet", "Blackletter and script letters to trace and print", P(m_typo, sample="Aa", ff=SERIF, weight="800", style="italic", size=90, label="blackletter & script"), K_PRINT),
"printables-coloring-page-maker": ("Coloring Page Maker", "Any name or word becomes a colorable outline to print", m_crayons, K_PRINT),
"printables-dot-to-dot-name": ("Dot-to-Dot Name Generator", "Any name becomes a personalized connect-the-dots", P(m_letter_dots, letter="Em"), K_PRINT),
"printables-cursive-alphabet": ("Cursive Alphabet", "Cursive A-Z practice sheets to trace and print", P(m_typo, sample="Aa", ff=SERIF, style="italic", weight="400", size=92, label="cursive practice"), K_PRINT),
"printables-handwriting-worksheet-generator": ("Handwriting Worksheet Generator", "Dial dotted-to-blank tracing difficulty for any word", m_pencil_ruled, K_PRINT),
"printables": ("Printable Letters & Alphabets", "Bubble letters, cursive sheets, tracing pages and more", m_grid, K_PRINT),
"printables-name-puzzle-maker": ("Name Puzzle Maker", "Any name becomes a cut-apart letter jigsaw puzzle", m_puzzle, K_PRINT),
"printables-name-tracing": ("Name Tracing Worksheets", "Model row, faded trace rows and blank practice lines", P(m_trace_rows, sample="Emma"), K_PRINT),
"printables-sight-word-tracing": ("Sight Word Tracing Worksheets", "Dolch sight words to trace at adjustable difficulty", P(m_trace_rows, sample="said"), K_PRINT),

# 2026-07-22 GSC 404 cleanup: these pages shipped without ever being
# registered here, so they had no og:image/hero art at all.
"category-case-converter": ("Case Converter", "UPPERCASE, lowercase & Title Case",
      P(m_typo, sample="Aa", weight="700", size=88, label="UPPER / lower"), K_CAT),
"usecase-old-english-translator": ("Old English Translator", "Thee, thou & thy — Shakespearean text",
      P(m_typo, sample="Thee", ff=SERIF, style="italic", weight="400", size=64, label="ye olde english"), K_USE),
"usecase-pirate-translator": ("Pirate Translator", "Arrr! Turn any text into pirate speak", m_skull, K_USE),
"printables-monogram-maker": ("Monogram Maker", "Up to 3 initials, classic or circle-frame", P(m_circled_letter, letter="M"), K_PRINT),
"printables-cross-stitch-letters": ("Cross-Stitch Letters", "Any word as a charted stitch pattern", m_grid, K_PRINT),
"printables-spanish-alphabet-chart": ("Spanish Alphabet Chart", "All 27 letters, A-Z plus Ñ, one printable chart", P(m_letter_stencil, letter="Ñ"), K_PRINT),
"fr-imprimables-alphabet-espagnol": ("Alphabet Espagnol à Imprimer", "Les 27 lettres, A-Z plus Ñ, une seule fiche", P(m_letter_stencil, letter="Ñ"), K_PRINT),
"es-imprimibles-abecedario-espanol": ("Abecedario Español para Imprimir", "Las 27 letras, A-Z más la Ñ, una sola tabla", P(m_letter_stencil, letter="Ñ"), K_PRINT),
"pt-imprimiveis-alfabeto-espanhol": ("Alfabeto Espanhol para Imprimir", "As 27 letras, A-Z mais o Ñ, numa só tabela", P(m_letter_stencil, letter="Ñ"), K_PRINT),
"pl-do-druku-alfabet-hiszpanski": ("Hiszpański Alfabet do Druku", "Wszystkie 27 liter, A-Z plus Ñ, jedna karta", P(m_letter_stencil, letter="Ñ"), K_PRINT),
"de-zum-ausdrucken-spanisches-alphabet": ("Spanisches Alphabet zum Ausdrucken", "Alle 27 Buchstaben, A-Z plus Ñ, eine Karte", P(m_letter_stencil, letter="Ñ"), K_PRINT),
"it-da-stampare-alfabeto-spagnolo": ("Alfabeto Spagnolo da Stampare", "Tutte le 27 lettere, A-Z più la Ñ, una scheda", P(m_letter_stencil, letter="Ñ"), K_PRINT),
"printables-best-friend-in-cursive": ("Best Friend in Cursive", "Free printable tracing worksheet", P(m_trace_rows, sample="Friends"), K_PRINT),
"printables-dad-in-cursive": ("Dad in Cursive", "Free printable tracing worksheet", P(m_trace_rows, sample="Dad"), K_PRINT),
"printables-family-in-cursive": ("Family in Cursive", "Free printable tracing worksheet", P(m_trace_rows, sample="Family"), K_PRINT),
"printables-happy-birthday-in-cursive": ("Happy Birthday in Cursive", "Free printable tracing worksheet", P(m_trace_rows, sample="Birthday"), K_PRINT),
"printables-love-in-cursive": ("Love in Cursive", "Free printable tracing worksheet", P(m_trace_rows, sample="Love"), K_PRINT),
"printables-mom-in-cursive": ("Mom in Cursive", "Free printable tracing worksheet", P(m_trace_rows, sample="Mom"), K_PRINT),

"category-ancient-fonts": ("Ancient & Rune Fonts", "Rune, Cherokee & ancient script styling",
      P(m_typo, sample="Rune", ff=SERIF, weight="800", size=84, label="runic · cherokee · ethiopic"), K_CAT),
"category-emoji-letter-fonts": ("Emoji Letter Generator", "Block, squared & flag-emoji letter styles",
      P(m_typo, sample="AB", weight="800", size=88, label="block · squared · flag letters",
        extra='<rect x="256" y="230" width="50" height="36" rx="6" fill="#fff" opacity="0.9"/>'
              f'<rect x="256" y="230" width="50" height="12" fill="{PURPLE}"/>'), K_CAT),
"category-faux-fonts": ("Faux Script Generator", "Faux Cyrillic, Greek & katakana lookalikes",
      P(m_typo, sample="СОРҮ", size=66, spacing="2", label="cyrillic · greek · katakana"), K_CAT),
"category-fullwidth-fonts": ("Fullwidth Text Generator", "Wide, spaced-out vaporwave lettering",
      P(m_typo, sample="A b", size=64, spacing="14", label="vaporwave · full width"), K_CAT),
"category-novelty-fonts": ("Novelty Font Generator", "Keycap numbers & currency-symbol letters",
      P(m_typo, sample="₳¥", ff=SYM, weight="700", size=100, label="currency + keycap symbols",
        extra='<rect x="246" y="228" width="58" height="58" rx="14" fill="#fff"/>'
              f'<text x="275" y="270" font-family="{SANS}" font-size="34" font-weight="800" fill="{INK}" text-anchor="middle">5</text>'), K_CAT),
"library-cat-ascii-art": ("Cat ASCII Art", "Cat faces, loafs & long cats in plain text", m_paw, K_LIB),
"library-dog-ascii-art": ("Dog ASCII Art", "Puppy faces and sitting dogs in plain text", m_paw, K_LIB),
"library-heart-ascii-art": ("Heart ASCII Art", "Text hearts from tiny <3 to big solid hearts", m_heart, K_LIB),
"library-skull-ascii-art": ("Skull ASCII Art", "Skulls and crossbones drawn in plain text", m_skull, K_LIB),
"library-star-ascii-art": ("Star ASCII Art", "Sparkles, shooting stars & big text stars", m_star, K_LIB),
"usecase-free-fire-guild-name-generator": ("Free Fire Guild Name Generator", "Squad tags in ꧁꧂ brackets, copy & paste", m_gamepad, K_USE),
"usecase-mobile-legends-squad-name-generator": ("Mobile Legends Squad Name Generator", "Squad tags & aesthetic fonts, copy & paste", m_trophy, K_USE),
"usecase-free-fire-name-generator": ("Free Fire Name Generator", "Stylish FF names with symbols & katakana", m_gamepad, K_USE),
"usecase-stylish-name": ("Stylish Name Maker", "Fancy names for FF, Instagram & Facebook", m_gamepad, K_USE),
"usecase-valorant-name-generator": ("Valorant Name Generator", "Live Riot ID checker + stylish names", m_gamepad, K_USE),
"ascii-art-generator": ("ASCII Art Generator", "Turn any word into big block-letter ASCII art",
      P(m_transform, a="A", b="█"), K_USE),
"ascii-converter": ("ASCII Converter", "Text to hex, binary, decimal & octal, and back",
      P(m_transform, a="A", b="01"), K_USE),
"curved-text": ("Curved & Arc Text Generator", "Bend text into arcs, waves, spirals & shapes",
      P(m_arc, letters="ARC"), K_USE),
# 2026-07-22 GSC 404 cleanup: shipped without og:image/twitter:image at all.
"character-counter": ("Character Counter", "Live word & character stats as you type",
      P(m_typo, sample="123", weight="800", size=88, label="words · characters"), K_USE),
"characters-to-words": ("Characters to Words", "Convert any character count to words & pages",
      P(m_typo, sample="1000", weight="800", size=80, label="characters → words"), K_USE),
"ja-mojisu-kaunto": ("文字数カウント", "文字数・単語数をリアルタイムで数える無料ツール",
      P(m_typo, sample="字", weight="800", size=96, label="文字数 · 単語数", ff="Noto Sans CJK JP", lab_ff="Noto Sans CJK JP"), K_USE),
"ko-geuljasu-segi": ("글자수세기", "공백 포함/제외 글자수를 실시간으로 세는 무료 도구",
      P(m_typo, sample="글", weight="800", size=96, label="글자 수 · 단어 수", ff="Noto Sans CJK KR", lab_ff="Noto Sans CJK KR"), K_USE),
"zh-tw-zishu-tongji": ("字數統計", "免費線上計算字數與字元數的工具",
      P(m_typo, sample="字", weight="800", size=96, label="字數 · 字元數", ff="Noto Sans CJK TC", lab_ff="Noto Sans CJK TC"), K_USE),
"hiragana-chart": ("Hiragana Chart", "All 46 kana with romaji, printable & tap-to-copy", m_kana_grid, K_LIB),
"katakana-chart": ("Katakana Chart", "All 46 kana with romaji, printable & tap-to-copy", m_kana_grid, K_LIB),

# ---- tr/library — piliapp-mining individual-symbol pages (2026-07-12) ----
"tr-library-japon-alfabesi": ("Japon Alfabesi", "Hiragana, katakana ve kanji kopyala yapıştır", m_kana_grid, K_LIB),
"tr-library-onay-isaretleri": ("Onay İşaretleri", "Tik, çarpı ve durum sembolleri kopyala", glyphs("✓", "✔", "☑", "✗"), K_LIB),
"tr-library-ok-isaretleri": ("Ok İşaretleri", "Yön, çift ve emoji oklar kopyala yapıştır", glyphs("→", "⇒", "↩", "➤"), K_LIB),
"tr-library-derece-isareti": ("Derece İşareti", "Sıcaklık, açı ve geometri sembolleri kopyala", glyphs("°", "℃", "∠", "′"), K_LIB),
"tr-library-para-birimi-sembolleri": ("Para Birimi Sembolleri", "Türk Lirası, euro, dolar ve dünya paraları", glyphs("₺", "€", "$", "£"), K_LIB),
"tr-library-yunan-alfabesi-sembolleri": ("Yunan Alfabesi Sembolleri", "Alfa, beta, pi ve tüm Yunan harfleri kopyala", glyphs("α", "β", "π", "Ω"), K_LIB),
"tr-library-matematik-sembolleri": ("Matematik Sembolleri", "Artı eksi, eşitsizlik ve küme işaretleri", glyphs("±", "≥", "≠", "∫"), K_LIB),
"tr-library-nazar-sembolleri": ("Nazar Sembolleri", "Nazar, hamsa ve göz işaretleri kopyala yapıştır",
      glyphs("◉", "☽", "✦", "❂", "☉"), K_LIB),
})


# ---------------------------------------------------------------- builders


def hero_svg(slug, title, motif, kicker, a=PURPLE, b=BLUE):
    p = "h" + slug.replace("-", "")[:8]
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 340"
     width="1200" height="340" role="img">
  {defs(p, a, b)}
  <rect width="1200" height="340" rx="20" fill="{PANEL}"/>
  <rect width="1200" height="340" rx="20" fill="url(#dots{p})"/>
  <circle cx="1010" cy="60" r="260" fill="url(#glow{p})"/>
  <rect x="0" y="0" width="8" height="340" fill="url(#gv{p})"/>
  <g transform="translate(740 -10) scale(1.02)">{motif(p)}</g>
  <g transform="translate(420 -10) scale(0.62)" opacity="0.10">{motif(p)}</g>
</svg>"""


def og_png_svg(slug, title, sub, motif, kicker, a=PURPLE, b=BLUE, native=None):
    p = "o" + slug.replace("-", "")[:8]
    wrapped = smart_wrap(title, wrap_width_for(title, native))[:3]
    tspans = ""
    y0 = 250 - (len(wrapped) - 1) * 33
    for i, line in enumerate(wrapped):
        tspans += f'<tspan x="80" y="{y0 + i*72}">{spanned(line, native)}</tspan>'
    s = spanned(sub, native)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"
     width="1200" height="630">
  {defs(p, a, b)}
  <rect width="1200" height="630" fill="{PANEL}"/>
  <rect width="1200" height="630" fill="url(#dots{p})"/>
  <circle cx="1080" cy="120" r="380" fill="url(#glow{p})"/>
  <rect x="0" y="0" width="14" height="630" fill="url(#gv{p})"/>
  <text x="80" y="96" font-family="{SANS}" font-size="22" font-weight="700"
        letter-spacing="3" fill="{PURPLE}">{esc(kicker)}</text>
  <text font-family="{SANS}" font-size="60" font-weight="700" fill="{INK}">{tspans}</text>
  <text x="80" y="{y0 + len(wrapped)*72 + 6}" font-family="{SANS}" font-size="26"
        fill="{SUB}">{s}</text>
  <g transform="translate(740 150) scale(1.20)">{motif(p)}</g>
</svg>"""


def _native_for_slug(slug):
    """slug's locale prefix ('zh-tw...' -> 'zh', 'ja-...' -> 'ja') looked up
    against NATIVE_SCRIPT, or None for slugs with no non-Latin script."""
    for loc, fam in NATIVE_SCRIPT.items():
        if slug == loc or slug.startswith(loc + "-"):
            return fam
    return None


# ---- /updates/ — dated Unicode/platform/game rule-change log ----
PAGES.update({
"updates": ("UltraTextGen Updates", "What changed, and why your Check may too", m_doc, K_UPDATE),
"updates-unicode-17-new-emoji-rollout": ("Unicode 17.0's New Emoji: Rollout Tracker", "8 new emoji, tracked platform by platform", m_doc, K_UPDATE),
"updates-uae-dirham-symbol-unicode-18": ("UAE Dirham Symbol Approved for Unicode 18.0", "Approved for encoding, not on keyboards yet", m_doc, K_UPDATE),
"ar-updates-uae-dirham-symbol-unicode-18": ("رمز الدرهم الإماراتي يُعتمد في يونيكود 18.0", "معتمد للترميز، وليس على لوحات المفاتيح بعد", m_doc, K_UPDATE),
"de-updates-vae-dirham-symbol-unicode-18": ("VAE-Dirham-Symbol für Unicode 18.0 genehmigt", "Zur Kodierung genehmigt, noch nicht auf Tastaturen", m_doc, K_UPDATE),
"es-updates-simbolo-dirham-emiratos-unicode-18": ("Símbolo del Dirham de los EAU Aprobado para Unicode 18.0", "Aprobado para codificación, aún no en teclados", m_doc, K_UPDATE),
"it-updates-simbolo-dirham-unicode-18": ("Simbolo del Dirham degli Emirati Arabi Uniti Approvato per Unicode 18.0", "Approvato per la codifica, non ancora sulle tastiere", m_doc, K_UPDATE),
"ko-updates-dirham-giho-unicode-18": ("UAE 디르함 기호, 유니코드 18.0 인코딩 승인", "인코딩 승인, 아직 키보드엔 없음", m_doc, K_UPDATE),
"nl-updates-dirham-symbool-unicode-18": ("VAE-dirhamsymbool goedgekeurd voor Unicode 18.0", "Goedgekeurd voor codering, nog niet op toetsenborden", m_doc, K_UPDATE),
"sv-updates-dirham-symbol-unicode-18": ("Förenade Arabemiratens dirhamsymbol godkänd för Unicode 18.0", "Godkänd för kodning, ännu inte på tangentbord", m_doc, K_UPDATE),
"tr-updates-dirhem-sembolu-unicode-18": ("BAE Dirhemi Sembolü Unicode 18.0 İçin Onaylandı", "Kodlama için onaylandı, henüz klavyelerde değil", m_doc, K_UPDATE),
"updates-middle-east-currency-symbols-scorecard": ("Middle East Currency Symbols in Unicode: The Scorecard", "5 have their own sign, 3 share one, 7 have none", m_doc, K_UPDATE),
"ar-updates-middle-east-currency-symbols-scorecard": ("رموز عملات الشرق الأوسط في يونيكود: البطاقة التقييمية بعد إصدار 18.0", "5 عملات لها رمزها الخاص. 3 تتشارك رمزاً عاماً. 7 على الأقل بلا رمز.", m_doc, K_UPDATE),
"de-updates-naher-osten-waehrungssymbole-unicode-18": ("Währungssymbole im Nahen Osten in Unicode: Die Bilanz nach 18.0", "5 Währungen haben ein eigenes Zeichen. 3 teilen sich eins. Mindestens 7 haben keins.", m_doc, K_UPDATE),
"es-updates-simbolos-moneda-oriente-medio-unicode-18": ("Símbolos de Moneda de Oriente Medio en Unicode: El Marcador Tras la 18.0", "5 monedas tienen su propio signo. 3 comparten uno genérico. Al menos 7 no tienen ninguno.", m_doc, K_UPDATE),
"it-updates-simboli-valuta-medio-oriente-unicode-18": ("I Simboli di Valuta del Medio Oriente in Unicode: Il Bilancio Dopo Unicode 18.0", "5 valute hanno un proprio segno. 3 ne condividono uno. Almeno 7 non ne hanno nessuno.", m_doc, K_UPDATE),
"ko-updates-jungdong-hwapye-giho-unicode-18": ("유니코드 속 중동 화폐 기호: 18.0 이후 현황표", "5개 통화는 전용 기호를 갖췄습니다. 3개는 공용 기호를 씁니다. 최소 7개는 기호가 없습니다.", m_doc, K_UPDATE),
"nl-updates-valutasymbolen-midden-oosten-unicode-18": ("Valutasymbolen Midden-Oosten in Unicode: het scorebord na versie 18.0", "5 valuta's hebben een eigen teken. 3 delen er een. Minstens 7 hebben er geen.", m_doc, K_UPDATE),
"sv-updates-valutasymboler-mellanostern-unicode-18": ("Mellanösterns valutasymboler i Unicode: Lägesrapporten efter 18.0", "5 valutor har ett eget tecken. 3 delar ett. Minst 7 saknar helt.", m_doc, K_UPDATE),
"tr-updates-orta-dogu-para-birimi-sembolleri-unicode-18": ("Unicode'da Orta Doğu Para Birimi Sembolleri: 18.0 Sonrası Karne", "5 para birimi kendi sembolüne sahip. 3'ü ortak sembol kullanıyor. En az 7'sinde sembol yok.", m_doc, K_UPDATE),
"updates-unicode-18-beta-review-opens": ("Unicode 18.0 Beta Review Opens: What's Shipping", "13,047 new characters, four scripts, 9 draft emoji", m_doc, K_UPDATE),
"ar-updates-unicode-18-beta-review-opens": ("انطلاق المراجعة التجريبية ليونيكود 18.0: ما الجديد", "13,047 حرفاً جديداً، أربع كتابات، 9 إيموجي أولية", m_doc, K_UPDATE),
"de-updates-unicode-18-beta-startet": ("Unicode 18.0 Beta startet: Was jetzt kommt", "13.047 neue Zeichen, vier Schriftsysteme, 9 Entwurfs-Emojis", m_doc, K_UPDATE),
"es-updates-unicode-18-beta-comienza-revision": ("Se Abre la Revisión Beta de Unicode 18.0: Qué Trae", "13.047 caracteres nuevos, cuatro escrituras, 9 emojis provisionales", m_doc, K_UPDATE),
"it-updates-revisione-beta-unicode-18": ("Revisione Beta di Unicode 18.0 al Via: Cosa Sta Arrivando", "13.047 nuovi caratteri, quattro scritture, 9 emoji provvisorie", m_doc, K_UPDATE),
"ko-updates-unicode-18-beta-sijak": ("유니코드 18.0 베타 심사 시작: 이번에 추가되는 것들", "새 문자 13,047개, 4종 문자 체계, 초안 이모지 9종", m_doc, K_UPDATE),
"nl-updates-unicode-18-beta-van-start": ("Unicode 18.0-bèta van start: wat erin zit", "13.047 nieuwe tekens, vier schriftsystemen, 9 concept-emoji", m_doc, K_UPDATE),
"sv-updates-unicode-18-betagranskning-oppnar": ("Unicode 18.0:s betagranskning öppnar: Det här ingår", "13 047 nya tecken, fyra skriftsystem, 9 utkastemoji", m_doc, K_UPDATE),
"tr-updates-unicode-18-beta-inceleme-basliyor": ("Unicode 18.0 Beta İncelemesi Başlıyor: Neler Geliyor", "13.047 yeni karakter, dört yazı sistemi, 9 taslak emoji", m_doc, K_UPDATE),
"updates-unicode-18-release-date-confirmed": ("Unicode 18.0 Date Confirmed", "September 16, 2026 — and one script got cut", m_doc, K_UPDATE),
"ar-updates-unicode-18-release-date-confirmed": ("تأكيد موعد إصدار يونيكود 18.0", "16 سبتمبر 2026 — وكتابة واحدة حُذفت", m_doc, K_UPDATE),
"de-updates-unicode-18-erscheinungsdatum-bestaetigt": ("Unicode 18.0: Datum bestätigt", "16. September 2026 — eine Schrift gestrichen", m_doc, K_UPDATE),
"es-updates-unicode-18-fecha-lanzamiento-confirmada": ("Unicode 18.0: fecha confirmada", "16 de septiembre de 2026 — una escritura cortada", m_doc, K_UPDATE),
"fr-updates-unicode-18-date-de-sortie-confirmee": ("Unicode 18.0 : date confirmée", "16 septembre 2026 — une écriture retirée", m_doc, K_UPDATE),
"id-updates-tanggal-rilis-unicode-18-dipastikan": ("Tanggal Rilis Unicode 18.0", "16 September 2026 — satu aksara dicoret", m_doc, K_UPDATE),
"it-updates-data-di-uscita-unicode-18-confermata": ("Unicode 18.0: data confermata", "16 settembre 2026 — una scrittura tolta", m_doc, K_UPDATE),
"ja-updates-unicode-18-release-date-confirmed": ("Unicode 18.0 リリース日確定", "2026年9月16日 — 文字体系が1つ削除", m_doc, K_UPDATE),
"ko-updates-unicode-18-chulsi-il-hwakjeong": ("유니코드 18.0 출시일 확정", "2026년 9월 16일 — 문자 하나 제외", m_doc, K_UPDATE),
"nl-updates-unicode-18-releasedatum-bevestigd": ("Unicode 18.0: datum bevestigd", "16 september 2026 — één schrift geschrapt", m_doc, K_UPDATE),
"pl-updates-unicode-18-data-premiery-potwierdzona": ("Unicode 18.0: data potwierdzona", "16 września 2026 — jedno pismo usunięte", m_doc, K_UPDATE),
"pt-updates-data-de-lancamento-unicode-18-confirmada": ("Unicode 18.0: data confirmada", "16 de setembro de 2026 — uma escrita cortada", m_doc, K_UPDATE),
"ru-updates-unicode-18-release-date-confirmed": ("Дата выхода Unicode 18.0", "16 сентября 2026 — одна письменность исключена", m_doc, K_UPDATE),
"th-updates-unicode-18-release-date-confirmed": ("ยืนยันวันปล่อย Unicode 18.0", "16 กันยายน 2026 — ตัดอักษรออกหนึ่งชุด", m_doc, K_UPDATE),
"tr-updates-unicode-18-cikis-tarihi-onaylandi": ("Unicode 18.0 çıkış tarihi onaylandı", "16 Eylül 2026 — bir yazı çıkarıldı", m_doc, K_UPDATE),
"updates-unicode-18-most-anticipated-emoji": ("Unicode 18.0's New Emoji: Cracking Face Wins the Vote", "Pickle and Meteor round out the public's top 3", m_doc, K_UPDATE),
"ar-updates-unicode-18-most-anticipated-emoji": ("إيموجي يونيكود 18.0 الجديدة: الوجه المتصدّع يفوز بالتصويت العام", "مخلل وشهاب يكملان المراكز الثلاثة الأولى", m_doc, K_UPDATE),
"de-updates-unicode-18-emoji-abstimmung": ("Unicode 18.0: Neue Emojis – Berstendes Gesicht gewinnt die Abstimmung", "Essiggurke und Meteor komplettieren die Top 3", m_doc, K_UPDATE),
"es-updates-unicode-18-nuevos-emojis-votacion": ("Los Nuevos Emojis de Unicode 18.0: Cara Agrietada Gana la Votación", "Pepinillo y Meteoro completan el top 3", m_doc, K_UPDATE),
"fr-updates-unicode-18-nouveaux-emojis-vote": ("Nouveaux Emoji Unicode 18.0 : Visage Fissuré Remporte le Vote", "Cornichon et Météore complètent le top 3", m_doc, K_UPDATE),
"id-updates-unicode-18-emoji-baru-voting": ("Emoji Baru Unicode 18.0: Cracking Face Menang Voting", "Pickle dan Meteor melengkapi 3 besar", m_doc, K_UPDATE),
"ja-updates-unicode-18-most-anticipated-emoji": ("Unicode 18.0の新絵文字：「ひび割れ顔」が投票で1位に", "ピクルスと流れ星が続く", m_doc, K_UPDATE),
"ko-updates-unicode-18-imoji-tupyo": ("유니코드 18.0 신규 이모지: 공개 투표 1위는 Cracking Face", "Pickle과 Meteor가 2, 3위", m_doc, K_UPDATE),
"nl-updates-unicode-18-nieuwe-emoji-stemming": ("Nieuwe emoji in Unicode 18.0: Cracking Face wint de stemming", "Pickle en Meteor maken de top 3 compleet", m_doc, K_UPDATE),
"pl-updates-unicode-18-nowe-emoji-glosowanie": ("Nowe Emoji Unicode 18.0: Pękająca Twarz Wygrywa Głosowanie", "Kiszony Ogórek i Meteor uzupełniają podium", m_doc, K_UPDATE),
"pt-updates-unicode-18-novos-emojis-votacao": ("Novos Emojis do Unicode 18.0: Rosto Rachando Vence a Votação", "Picles e Meteoro completam o top 3", m_doc, K_UPDATE),
"ru-updates-unicode-18-most-anticipated-emoji": ("Новые эмодзи Unicode 18.0: «Трескающееся лицо» побеждает в голосовании", "Солёный огурец и Метеор замыкают тройку лидеров", m_doc, K_UPDATE),
"th-updates-unicode-18-most-anticipated-emoji": ("อีโมจิใหม่ Unicode 18.0: ใบหน้าแตกร้าวคว้าอันดับ 1 โหวต", "แตงกวาดองและดาวตกครองอันดับ 2-3", m_doc, K_UPDATE),
"tr-updates-unicode-18-yeni-emoji-oylama": ("Unicode 18.0'ın Yeni Emojileri: Oylamayı Cracking Face Kazandı", "Pickle ve Meteor ilk 3'ü tamamlıyor", m_doc, K_UPDATE),
"updates-forza-horizon-6-gamertag-rules": ("Forza Horizon 6: Gamertag and Driver Name Split", "Two name fields, two very different rule sets", m_doc, K_UPDATE),
"updates-whatsapp-usernames-rollout": ("WhatsApp Usernames: The New @Handle Rules, Explained", "3-35 characters, lowercase only, no styled Unicode", m_doc, K_UPDATE),
"updates-xbox-gamertag-15-character-limit": ("Xbox Gamertags Grow From 12 to 15 Characters", "Only for unique, available, Latin-character gamertags", m_doc, K_UPDATE),
"updates-lienquan-mobile-name-penalty-update": ("Liên Quân Mobile Tightens Rename Locks for Invalid Names", "Auto-corrected names now lock renames up to 3 years", m_doc, K_UPDATE),
})

# ---- Finnish locale build (2026-08-02): the five pages the FI keyword pull
# ---- evidenced (horoskooppimerkit, kaunokirjoitus, asteen merkki,
# ---- merkkilaskuri, euron merkki).
PAGES.update({
  "fi-library-horoskooppimerkit": (
      "Horoskooppimerkit",
      "Tähtimerkit ja planeetat kopioitavaksi", m_star, K_LIB),
  "fi-kaunokirjoitus": (
      "Kaunokirjoitus",
      "Kaunokirjaimet A–Z, sanat ja nimet", m_letter_cursive, K_CAT),
  "fi-symbol-asteen-merkki": (
      "Asteen merkki °",
      "Lämpötila- ja kulmamerkit", m_circled_letter, K_SYM),
  "fi-symbol-euron-merkki": (
      "Euron merkki €",
      "Valuuttamerkit kopioitavaksi", m_coin, K_SYM),
  "fi-merkkilaskuri": (
      "Merkkilaskuri",
      "Sanat, merkit ja palvelujen rajat", m_doc, K_USE),
})


# ---- 2026-07-30: th/library/star-symbols translation ----
PAGES["th-library-star-symbols"] = (
    "สัญลักษณ์ดาว ★ ☆ ✦", "รวมดาว ดอกจัน และอีโมจิดาวทุกแบบ",
    glyphs("★", "☆", "✦", "✧", "✩"), K_LIB)

# ---- 2026-07-30: library/math-symbols translations (fr, it, ja, ru, th) ----
PAGES["fr-library-symboles-mathematiques"] = (
    "Symboles Mathématiques", "Opérateurs, ensembles et grec",
    glyphs("∑", "∫", "√", "π", "∞"), K_LIB)
PAGES["it-library-simboli-matematici"] = (
    "Simboli Matematici", "Operatori, insiemi e greco",
    glyphs("∑", "∫", "√", "π", "∞"), K_LIB)
PAGES["ja-library-math-symbols"] = (
    "数学記号", "演算子・集合・ギリシャ文字",
    glyphs("∑", "∫", "√", "π", "∞"), K_LIB)
PAGES["ru-library-matematicheskie-simvoly"] = (
    "Математические символы", "Операторы, множества и греческий алфавит",
    glyphs("∑", "∫", "√", "π", "∞"), K_LIB)
PAGES["th-library-math-symbols"] = (
    "สัญลักษณ์คณิตศาสตร์", "ตัวดำเนินการ เซต และอักษรกรีก",
    glyphs("∑", "∫", "√", "π", "∞"), K_LIB)

# ---- 2026-07-30: library/arrow-symbols translations (it, pl, ru, th) ----
PAGES["it-library-simboli-freccia"] = (
    "Simboli Freccia", "Frecce dritte, doppie e curve",
    glyphs("→", "←", "↑", "↓", "⟶"), K_LIB)
PAGES["pl-library-symbole-strzalek"] = (
    "Symbole Strzałek", "Strzałki proste, podwójne i zakrzywione",
    glyphs("→", "←", "↑", "↓", "⟶"), K_LIB)
PAGES["ru-library-strelki"] = (
    "Стрелки", "Простые, двойные и изогнутые стрелки",
    glyphs("→", "←", "↑", "↓", "⟶"), K_LIB)
PAGES["th-library-arrow-symbols"] = (
    "สัญลักษณ์ลูกศร", "ลูกศรตรง คู่ และโค้งทุกแบบ",
    glyphs("→", "←", "↑", "↓", "⟶"), K_LIB)

# ---- 2026-08-07: zh-tw mesh-completion backfill (7 pages) + it/vi (1 each) ----
# zh-tw was promoted Tier 3 -> Tier 2 on 2026-08-06; these clusters were
# already 15-18 locales deep and simply hadn't been backfilled yet. Glyph
# picks reuse the exact same sets as the equivalent EN/other-locale keys
# above for cross-locale visual consistency.
PAGES["zh-tw-library-biaoqing-fuhao-zuhe"] = (
    "表情符號組合大全", "美學風格複製貼上表情符號組合",
    m_smiley, K_LIB)
PAGES["zh-tw-library-xila-zimu-fuhao"] = (
    "希臘字母符號", "α β Δ Σ Ω π 複製貼上",
    glyphs("α", "β", "Δ", "Ω", "π"), K_LIB)
PAGES["zh-tw-library-shuxue-fuhao"] = (
    "數學符號", "運算子、根號、無限大複製貼上",
    glyphs("∑", "∫", "√", "π", "∞"), K_LIB)
PAGES["zh-tw-library-aixin-fuhao"] = (
    "愛心符號大全", "複製貼上愛心表情符號與字元",
    glyphs("♥", "♡", "❣", "❤", "♥"), K_LIB)
PAGES["zh-tw-library-huobi-fuhao"] = (
    "貨幣符號大全", "複製貼上世界貨幣符號",
    m_coin, K_LIB)
PAGES["zh-tw-library-keai-mengxi-fuhao"] = (
    "可愛萌系符號", "柔美風格裝飾符號複製貼上",
    glyphs("♡", "❀", "✧", "⊹", "✦"), K_LIB)
PAGES["zh-tw-library-teshu-fuhao"] = (
    "特殊符號", "複製貼上獨特 Unicode 符號",
    glyphs("§", "¶", "†", "‡", "★"), K_LIB)
PAGES["it-library-caratteri-speciali-simboli"] = (
    "Caratteri Speciali", "Simboli Unicode unici da copiare e incollare",
    glyphs("§", "¶", "†", "‡", "★"), K_LIB)
PAGES["vi-library-ky-tu-hy-lap"] = (
    "Ký Tự Hy Lạp", "Sao chép & dán bảng chữ cái Hy Lạp",
    glyphs("α", "β", "Δ", "Ω", "π"), K_LIB)


def main():
    import cairosvg
    import sys
    # Optional slug-prefix filter (e.g. `... printables-cursive-alphabet-letter`)
    # regenerates only the matching pages instead of rewriting the whole set —
    # keeps incremental additions from churning hundreds of existing assets.
    only = sys.argv[1] if len(sys.argv) > 1 else None
    n = 0
    for slug, (title, sub, motif, kicker) in PAGES.items():
        if only and not slug.startswith(only):
            continue
        native = _native_for_slug(slug)
        with open(os.path.join(HERO, f"{slug}.svg"), "w", encoding="utf-8") as f:
            f.write(hero_svg(slug, title, motif, kicker))
        cairosvg.svg2png(
            bytestring=og_png_svg(slug, title, sub, motif, kicker, native=native).encode(),
            write_to=os.path.join(OG, f"{slug}.png"),
            output_width=1200, output_height=630)
        n += 1

    # Homepage social card + hero figure. The English root index.html
    # references both. Skipped when a slug filter is active — a filtered run
    # is an incremental addition, not a full regeneration.
    if only:
        print(f"wrote {n} hero SVGs and OG PNGs (filter: {only})")
        return
    with open(os.path.join(HERO, f"{HOME_CARD}.svg"), "w", encoding="utf-8") as f:
        f.write(hero_svg(HOME_CARD, "Fancy Text Generator", m_brand, K_SITE))
    cairosvg.svg2png(
        bytestring=og_png_svg(
            HOME_CARD, "Fancy Text Generator",
            "60+ Unicode fonts to copy and paste anywhere",
            m_brand, K_SITE).encode(),
        write_to=os.path.join(OG, f"{HOME_CARD}.png"),
        output_width=1200, output_height=630)

    # Localized homepage cards — translated copy on a translated page.
    # High-demand locales (LOCALIZED_HOME_MOTIF) get a bespoke motif; the
    # rest still use the master brand motif.
    for loc, (fname, title, sub) in LOCALIZED_HOME.items():
        motif = LOCALIZED_HOME_MOTIF.get(loc, m_brand)
        cairosvg.svg2png(
            bytestring=og_png_svg(fname, title, sub, motif, K_SITE).encode(),
            write_to=os.path.join(OG, f"{fname}.png"),
            output_width=1200, output_height=630)

    print(f"wrote {n} hero SVGs to assets/hero/ and {n} OG PNGs to assets/og/")
    print(f"wrote homepage card + {len(LOCALIZED_HOME)} localized homepage cards "
          "to assets/og/")
    report_orphan_keys()


def report_orphan_keys():
    """Report PAGES keys with no live page AND no page referencing their art.

    The loop above has no page-existence guard: it writes art for every key
    unconditionally, so a key left behind by a retired, renamed or never-built
    page silently keeps producing an orphan asset pair on every full run. Twelve
    such keys accumulated undetected (three retired-and-301'd pages, four
    library->symbol lane migrations, three locale pages whose slug never matched
    the page's real URL, two pages never built) because nothing looked.

    Deliberately a report, not a skip. A key legitimately need not match a page
    slug — `learn-hub` serves `learn/index.html` — so skipping on "no directory"
    would stop generating art that is genuinely in use. Referenced art is
    therefore never flagged, and the decision to delete a key stays a human one.
    """
    import glob as _glob
    import re as _re
    pages = [p for p in _glob.glob("**/index.html", recursive=True) if os.sep in p]
    live = {os.path.dirname(p).replace(os.sep, "-") for p in pages}
    # One pass over the pages collecting every slug any page actually serves,
    # rather than re-scanning every page per key (1k keys x 4k pages of file
    # reads is slow enough that nobody would leave the report enabled).
    used = set()
    ref = _re.compile(r'assets/(?:og|hero)/([A-Za-z0-9._-]+)\.(?:png|svg)')
    for p in pages:
        with open(p, encoding="utf-8") as fh:
            used.update(ref.findall(fh.read()))
    orphans = [s for s in PAGES if s not in live and s not in used]
    if orphans:
        print(f"\nORPHAN PAGES KEYS ({len(orphans)}) — no live page, art unreferenced.")
        print("Each writes an unused asset pair on every full run. Retire the key,")
        print("or build the page it was added for:")
        for s in sorted(orphans):
            print("  -", s)


if __name__ == "__main__":
    main()
