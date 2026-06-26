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
    lab = ""
    if label:
        lab = (f'<text x="180" y="318" font-family="{SANS}" font-size="20" '
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


def m_camera(p, accent=PURPLE):
    return f"""
    <rect x="60" y="116" width="240" height="160" rx="30" fill="url(#g{p})"/>
    <rect x="120" y="96" width="80" height="34" rx="12" fill="url(#g{p})"/>
    <circle cx="180" cy="196" r="52" fill="{PANEL}"/>
    <circle cx="180" cy="196" r="30" fill="url(#gv{p})"/>
    <circle cx="262" cy="146" r="10" fill="#fff"/>"""


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


# ---------------------------------------------------------------- registry
# slug -> (title, subtitle, motif_callable, kicker)
# slug matches the page directory with "/" replaced by "-".
from functools import partial as P

K_LIB = "ULTRATEXTGEN · LIBRARY"
K_CAT = "ULTRATEXTGEN · FONTS"
K_USE = "ULTRATEXTGEN · GENERATOR"
K_PLAT = "ULTRATEXTGEN · PLATFORM"
K_ANS = "ULTRATEXTGEN · ANSWERS"
K_SITE = "ULTRATEXTGEN"


def glyphs(*g):
    return P(scatter_glyphs, glyphs=list(g))


# Localized homepage social cards. Each localized homepage (de/, es/, ...) used
# to share the English homepage card, leaving English copy on a translated page.
# Each entry is  locale -> (og_filename, title, subtitle)  and renders with the
# master brand motif. Filenames are descriptive (keyword-led) for Google Images.
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
}

# The homepage card filename (root index.html + the fallback for localized
# homepages). Lives under assets/og/ like every other per-page card.
HOME_CARD = "fancy-text-generator-preview"


PAGES = {
  # ---- site root / overview ----
  "about": ("About UltraTextGen", "The team and the mission behind the tool", m_brand, K_SITE),
  "contact": ("Contact UltraTextGen", "Questions, feedback, and partnerships", m_at, K_SITE),
  "privacy": ("Privacy Policy", "What we collect, and what we never do", m_doc, K_SITE),
  "terms": ("Terms of Service", "The agreement for using UltraTextGen", m_doc, K_SITE),

  # ---- category overview + pages ----
  "category": ("Unicode Font Categories", "Choose a style by its visual intent", m_grid, K_CAT),
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
  "category-strikethrough-text": ("Strikethrough Text Generator", "A line struck through every word",
        P(m_typo, sample="strike", size=64, deco="line-through", label="crossed out"), K_CAT),
  "category-underline-text": ("Underline Text Generator", "Clean underlines under every word",
        P(m_typo, sample="under", size=68, deco="underline", label="emphasised"), K_CAT),
  "category-upside-down-text": ("Upside Down Text Generator", "Flipped, mirrored, reversed text",
        P(m_typo, sample="flip", weight="700", size=80, rot=180, label=" uʍop ǝpısdn"), K_CAT),
  "category-word-wrappers": ("Word Wrapper Generator", "Wrap text in brackets and symbols",
        glyphs("⟦", "❖", "⟧", "✦", "⟨"), K_CAT),

  # ---- usecase overview + pages ----
  "usecase": ("Choose What to Create", "Generators grouped by what you need", m_grid, K_USE),
  "usecase-before-after-emoji": ("Emoji Transformation Captions", "Before → after, told with emoji",
        P(m_transform, a="A", b="★"), K_USE),
  "usecase-bio-font": ("Bio Font Generator", "Fonts, symbols and dividers for any bio", m_profile, K_USE),
  "usecase-comment-font": ("Comment Style Generator", "Make your comment stand out", m_chat, K_USE),
  "usecase-emoji-combinations": ("Emoji Combinations", "Copy-and-paste pairings for social",
        P(m_transform, a="+", b="★"), K_USE),
  "usecase-linkedin-headline": ("LinkedIn Headline Text", "Style the line under your name", m_headline, K_USE),
  "usecase-text-to-emoji": ("Text to Emoji Generator", "Turn words into emoji-styled text",
        P(m_transform, a="T", b="★"), K_USE),
  "usecase-vertical-text": ("Vertical & Stacked Text", "Stack your text top to bottom",
        P(m_vertical, letters="TEXT"), K_USE),
  "usecase-zalgo-text": ("Zalgo Text Generator", "Create creepy glitch text", m_zalgo, K_USE),
  "usecase-nickname-generator": ("Nickname Generator", "Stylish & cute name maker, copy and paste",
        P(m_typo, sample="@Aa"), K_USE),

  # ---- gaming-name use cases (Indonesian) ----
  "id-usecase-nama-ff-keren": ("Nama FF Keren", "Simbol payung & font keren buat nickname Free Fire",
        m_profile, K_USE),
  "id-usecase-nama-guild-ff-keren": ("Nama Guild FF Keren", "Tag squad & bingkai nama tim Free Fire",
        m_trophy, K_USE),
  "id-usecase-nama-ml-keren": ("Nama ML Keren", "Font aesthetic & simbol nickname Mobile Legends",
        m_profile, K_USE),

  # ---- localized zalgo ----
  "de-usecase-zalgo-text": ("Zalgo-Textgenerator", "Erstelle gruseligen Glitch-Text", m_zalgo, K_USE),
  "es-usecase-zalgo-text": ("Generador de Texto Zalgo", "Crea texto glitch y espeluznante", m_zalgo, K_USE),
  "fr-usecase-zalgo-text": ("Générateur de Texte Zalgo", "Créez du texte glitch et effrayant", m_zalgo, K_USE),
  "id-usecase-zalgo-text": ("Generator Teks Zalgo", "Buat teks glitch dan menyeramkan", m_zalgo, K_USE),
  "it-usecase-zalgo-text": ("Generatore di Testo Zalgo", "Crea testo glitch e inquietante", m_zalgo, K_USE),
  "nl-usecase-zalgo-text": ("Zalgo Tekstgenerator", "Maak griezelige glitch tekst", m_zalgo, K_USE),
  "pl-usecase-zalgo-text": ("Generator Tekstu Zalgo", "Twórz przerażający tekst glitch", m_zalgo, K_USE),
  "pt-usecase-zalgo-text": ("Gerador de Texto Zalgo", "Crie texto glitch e assustador", m_zalgo, K_USE),
  "tr-usecase-zalgo-text": ("Zalgo Metin Oluşturucu", "Ürkütücü bozuk metin oluşturun", m_zalgo, K_USE),
  "vi-usecase-zalgo-text": ("Trình Tạo Chữ Zalgo", "Tạo chữ lỗi và rùng rợn", m_zalgo, K_USE),

  # ---- platform pages ----
  "discord": ("Discord Font Generator", "Copy-and-paste fonts — no Nitro needed", m_chat, K_PLAT),
  "facebook": ("Facebook Font Generator", "Stylish text for posts and profiles", m_profile, K_PLAT),
  "instagram": ("Instagram Font Generator", "Fonts for bios and captions", m_camera, K_PLAT),
  "linkedin": ("LinkedIn Font Generator", "Professional text styling that pastes anywhere", m_headline, K_PLAT),
  "pinterest": ("Pinterest Text Generator", "Text that pops on every pin", m_pins, K_PLAT),
  "snapchat": ("Snapchat Font Generator", "Style your snaps and display name", m_chat, K_PLAT),
  "telegram": ("Telegram Font Generator", "Styles optimised for Telegram", m_chat, K_PLAT),
  "whatsapp": ("WhatsApp Font Generator", "Friendly formatting and styles", m_chat, K_PLAT),
  "x": ("X (Twitter) Font Generator", "Stylish text for posts and bio", P(m_profile), K_PLAT),
  "youtube": ("YouTube Font Generator", "Channel name and description styling", m_play, K_PLAT),
  "youtube-name-generator": ("YouTube Channel Name Generator", "Find a name that stands out", m_play, K_PLAT),
  "youtube-what-font-does-youtube-use": ("What Font Does YouTube Use?", "The UI typeface, explained", m_play, K_ANS),
  "tiktok": ("TikTok Font Generator", "Copy-and-paste fonts for TikTok", m_play, K_PLAT),
  "tiktok-name-generator": ("TikTok Name Generator", "Stylish names and handles", m_play, K_PLAT),
  "tiktok-what-font-does-tiktok-use": ("What Font Does TikTok Use?", "The app's typeface, explained", m_play, K_ANS),
  "roblox": ("Roblox Username Tools", "Style your Roblox name and display", m_block, K_PLAT),
  "roblox-name-generator": ("Roblox Username Generator", "Generate available-looking names", m_block, K_PLAT),

  # ---- answers ----
  "answers": ("Quick Answers", "Short, sourced answers to common questions", m_qa, K_ANS),
  "answers-change-font-size-on-facebook": ("Change Font Size on Facebook", "What's possible, and the workaround", m_qa, K_ANS),
  "answers-discord-allowed-characters": ("Discord Allowed Characters", "Which characters paste cleanly", m_qa, K_ANS),
  "answers-do-you-need-nitro-for-discord-fonts": ("Do You Need Nitro for Fonts?", "The honest answer for Discord users", m_qa, K_ANS),
  "answers-how-to-change-roblox-username": ("Change Your Roblox Username", "The steps and the catch", m_qa, K_ANS),
  "answers-how-to-change-tiktok-username": ("Change Your TikTok Username", "How and how often you can", m_qa, K_ANS),
  "answers-is-linkedin-bold-text-safe": ("Is LinkedIn Bold Text Safe?", "Accessibility and reach, explained", m_qa, K_ANS),
  "answers-what-font-does-discord-use": ("What Font Does Discord Use?", "gg sans, and what it means for you", m_qa, K_ANS),
  "answers-what-font-does-facebook-use": ("What Font Does Facebook Use?", "The system fonts behind the feed", m_qa, K_ANS),
  "answers-what-font-does-linkedin-use": ("What Font Does LinkedIn Use?", "The typeface and your options", m_qa, K_ANS),
  "answers-what-font-does-snapchat-use": ("What Font Does Snapchat Use?", "The app typeface, explained", m_qa, K_ANS),
  "answers-what-is-a-tiktok-handle": ("What Is a TikTok Handle?", "Handle vs name, made simple", m_qa, K_ANS),

  # ---- embed ----
  "embed-linkedin-headline-generator": ("LinkedIn Headline Generator", "Embeddable headline styler", m_headline, K_USE),

  # ---- library overview ----
  "library": ("Symbol & Emoji Library", "Copy-and-paste reference collections", m_grid, K_LIB),

  # ---- library: safe-glyph motifs ----
  "library-accent-marks-diacritics": ("Accent Marks & Diacritics", "Add accents to any letter",
        glyphs("é", "ñ", "ü", "á", "ô"), K_LIB),
  "library-achievement-symbols": ("Achievement Symbols", "Trophies, medals and milestones", m_trophy, K_LIB),
  "library-aesthetic-borders-frames": ("Aesthetic Borders & Frames", "Wrap text in decorative frames",
        glyphs("❖", "⟦", "⟧", "✦", "❝"), K_LIB),
  "library-aesthetic-symbols": ("Aesthetic Symbols", "Soft, decorative Unicode accents",
        glyphs("✦", "❀", "☾", "✧", "⊹"), K_LIB),
  "library-animal-emojis": ("Animal & Creature Emojis", "Paste creatures into any caption", m_paw, K_LIB),
  "library-arrow-symbols": ("Arrow Symbols", "Every direction, every weight",
        glyphs("→", "←", "↑", "↓", "⟶"), K_LIB),
  "library-awareness-ribbons": ("Awareness Ribbon Symbols", "Ribbons for every cause", m_ribbon, K_LIB),
  "library-body-language-emojis": ("Body Language Emojis", "Gestures and reactions", m_person, K_LIB),
  "library-bow-ribbon-symbols": ("Bow & Ribbon Symbols", "Coquette bows and ribbons", m_bow, K_LIB),
  "library-bracket-symbols": ("Brackets, Braces & Parentheses", "Every enclosing pair",
        glyphs("⟦", "⟧", "⟨", "⟩", "❲"), K_LIB),
  "library-bullet-point-symbols": ("Bullet Point Symbols", "Lead every list with style",
        glyphs("•", "◦", "▪", "‣", "◆"), K_LIB),
  "library-card-suit-symbols": ("Card Suit Symbols", "Spades, hearts, diamonds, clubs",
        glyphs("♠", "♥", "♦", "♣", "♤"), K_LIB),
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
  "library-currency-symbols": ("Currency Symbols", "Money marks from around the world",
        glyphs("€", "£", "¥", "¢", "₿"), K_LIB),
  "library-dash-hyphen-symbols": ("Dash & Hyphen Symbols", "Em, en and every dash between",
        glyphs("—", "–", "―", "·", "‐"), K_LIB),
  "library-degree-symbol": ("Degree Symbol", "Temperature, angles and more",
        glyphs("°", "℃", "℉", "∠", "′"), K_LIB),
  "library-discord-symbols": ("Discord Symbols", "Symbols that paste cleanly in Discord",
        glyphs("✦", "★", "⚔", "♥", "➤"), K_LIB),
  "library-egyptian-hieroglyphs": ("Egyptian Hieroglyphs", "Ankhs and ancient glyphs", m_ankh, K_LIB),
  "library-email-symbols": ("Email Symbols", "@, envelopes and contact marks", m_at, K_LIB),
  "library-emoji-flags": ("Flag Emoji Explorer", "Flags from every country", m_flag, K_LIB),
  "library-emoji-meanings-guide": ("Emoji Meanings Guide", "What each emoji really means", m_smiley, K_LIB),
  "library-face-emojis": ("Face & Emotion Emojis", "Every mood, every expression", m_smiley, K_LIB),
  "library-flower-symbols": ("Flower & Nature Symbols", "Blooms and botanical accents",
        glyphs("❀", "✿", "❁", "❃", "⚘"), K_LIB),
  "library-food-drink-emojis": ("Food & Drink Emojis", "Snacks, meals and drinks", m_cup, K_LIB),
  "library-fraction-symbols": ("Fraction Symbols", "Halves, thirds and quarters",
        glyphs("½", "⅓", "¼", "¾", "⅔"), K_LIB),
  "library-geometric-symbols": ("Geometric Symbols", "Circles, squares and triangles",
        glyphs("●", "▲", "■", "◆", "◇"), K_LIB),
  "library-goth-grunge-symbols": ("Goth & Grunge Symbols", "Dark, edgy decorative marks",
        glyphs("✝", "☓", "✗", "†", "♰"), K_LIB),
  "library-hand-symbols": ("Hand Gesture Symbols", "Pointing hands and gestures",
        glyphs("☝", "☞", "☜", "☟", "✌"), K_LIB),
  "library-heart-symbols": ("Heart Symbol Collection", "Hearts for love and everything else",
        glyphs("♥", "♡", "❣", "❤", "♥"), K_LIB),
  "library-instagram-symbols": ("Instagram Symbols", "Symbols that shine in your bio", m_camera, K_LIB),
  "library-kawaii-cute-symbols": ("Kawaii & Cute Symbols", "Adorable Japanese-style accents",
        glyphs("♡", "❀", "✧", "⊹", "✦"), K_LIB),
  "library-line-divider-symbols": ("Line Dividers & Separators", "Break up text beautifully", m_divider, K_LIB),
  "library-linkedin-comment-styling": ("LinkedIn Comment Styling", "Make your comments stand out", m_chat, K_LIB),
  "library-linkedin-symbol-library": ("LinkedIn Symbol Library", "Professional symbols and bullets",
        glyphs("▸", "✓", "★", "•", "➤"), K_LIB),
  "library-math-symbols": ("Math Symbols", "Operators, sets and Greek",
        glyphs("∑", "∫", "√", "π", "∞"), K_LIB),
  "library-moon-celestial-symbols": ("Moon & Celestial Symbols", "Moons, suns and stars",
        glyphs("☽", "☾", "☀", "★", "✦"), K_LIB),
  "library-music-symbols": ("Music Note Symbols", "Notes, clefs and rests",
        glyphs("♪", "♫", "♬", "♩", "♭"), K_LIB),
  "library-norse-viking-runes": ("Norse & Viking Runes", "Elder Futhark rune styling", m_rune, K_LIB),
  "library-number-symbols": ("Number & Numeral Symbols", "Circled, styled and special numbers",
        glyphs("①", "②", "③", "№", "#"), K_LIB),
  "library-people-profession-emojis": ("People & Profession Emojis", "Roles and people", m_person, K_LIB),
  "library-religious-symbols": ("Religious & Spiritual Symbols", "Faiths and beliefs",
        glyphs("✝", "☪", "☮", "☯", "✡"), K_LIB),
  "library-roblox-symbols": ("Roblox Symbols", "Symbols for Roblox names and chat", m_block, K_LIB),
  "library-slash-backslash-symbols": ("Slash & Backslash Symbols", "Dividers and dividing marks",
        glyphs("/", "\\", "⁄", "∕", "｜"), K_LIB),
  "library-smiley-face-guide": ("Smiley Face Guide", "Every smiley and what it signals", m_smiley, K_LIB),
  "library-sparkle-symbols": ("Sparkle & Decorative Symbols", "Add shine to any text",
        glyphs("✦", "✧", "✩", "⁂", "❉"), K_LIB),
  "library-special-characters": ("Special Characters", "The marks your keyboard hides",
        glyphs("§", "¶", "†", "‡", "★"), K_LIB),
  "library-sports-emojis": ("Sports & Activity Emojis", "Games, balls and movement", m_ball, K_LIB),
  "library-star-symbols": ("Star Symbol Collection", "Stars in every weight and style",
        glyphs("★", "☆", "✦", "✧", "✩"), K_LIB),
  "library-text-faces-kaomoji": ("Text Faces & Kaomoji", "Japanese emoticons, copy-ready", m_kaomoji, K_LIB),
  "library-tiktok-symbols": ("TikTok Symbols", "Symbols for TikTok names and bios", m_play, K_LIB),
  "library-traffic-road-sign-symbols": ("Traffic & Road Sign Symbols", "Signs and road markers", m_sign, K_LIB),
  "library-transport-symbols": ("Transport & Map Symbols", "Vehicles and travel marks", m_car, K_LIB),
  "library-weather-symbols": ("Weather Symbols & Emojis", "Sun, clouds, rain and snow",
        glyphs("☀", "☁", "☂", "❄", "☼"), K_LIB),
  "library-whisper-subliminal-symbols": ("Whisper & Subliminal Symbols", "Quiet, faded accents",
        glyphs("❛", "❜", "✧", "·", "✦"), K_LIB),
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
        glyphs("❄", "★", "❅", "❆", "✦"), K_LIB),
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
  "library-friendship-emojis": ("Friendship Emojis", "Show the bond with every send",
        glyphs("♥", "♡", "❣", "✦", "★"), K_LIB),
  "library-funny-emoji-combos": ("Funny Emoji Combos", "Pairings that land the joke", m_smiley, K_LIB),
  "library-gender-symbols": ("Gender Symbols", "Identity and biology marks",
        glyphs("♀", "♂", "⚥", "☿", "✦"), K_LIB),
  "library-greek-letter-symbols": ("Greek Letter Symbols", "Alpha to omega, copy-ready",
        glyphs("α", "β", "Δ", "Ω", "π"), K_LIB),
  "library-greeting-message-emojis": ("Greeting & Message Emojis", "Open every chat with warmth", m_chat, K_LIB),
  "library-halloween-symbols": ("Halloween Symbols", "Spooky marks for the season",
        glyphs("☠", "☽", "✝", "★", "✟"), K_LIB),
  "library-happy-emoji": ("Happy Emoji Collection", "Smiles for every good mood", m_smiley, K_LIB),
  "library-hazard-warning-symbols": ("Hazard & Warning Symbols", "Caution marks that demand attention",
        glyphs("⚠", "☢", "☣", "⚡", "☠"), K_LIB),
  "library-hindi-symbols": ("Hindi Symbols", "Characters and marks for names", m_grid, K_LIB),
  "library-html-entities": ("HTML Entities", "Named and numeric character codes",
        glyphs("&", "<", ">", "§", "©"), K_LIB),
  "library-invisible-character": ("Invisible Character", "Blank space that pastes anywhere",
        glyphs("␣", "▢", "◌", "▯", "□"), K_LIB),
  "library-ipa-phonetic-symbols": ("IPA Phonetic Symbols", "Sounds of every language",
        glyphs("ə", "ʃ", "θ", "ʒ", "ŋ"), K_LIB),
  "library-islamic-symbols": ("Islamic Symbols", "Crescents and marks of faith",
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
        glyphs("⚔", "★", "✦", "♛", "➤"), K_LIB),
  "library-moai-emoji": ("Moai Emoji", "The stone-faced statue, decoded", m_block, K_LIB),
  "library-money-emojis": ("Money Emojis", "Cash, coins and currency",
        glyphs("$", "€", "£", "¥", "¢"), K_LIB),
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
  "library-peace-symbol": ("Peace Symbol", "Signs of calm and harmony",
        glyphs("☮", "✌", "☯", "♡", "✦"), K_LIB),
  "library-poop-emoji": ("Poop Emoji", "The internet's favourite pile", m_smiley, K_LIB),
  "library-preppy-emoji-combos": ("Preppy Emoji Combos", "Polished, coastal-cool pairings", m_bow, K_LIB),
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
        glyphs("⚙", "⌘", "⚡", "⊗", "✦"), K_LIB),
  "library-text-art": ("Text Art Gallery", "ASCII and Unicode art, copy-ready", m_kaomoji, K_LIB),
  "library-thanksgiving-symbols": ("Thanksgiving Symbols", "Harvest, gratitude and autumn",
        glyphs("❀", "❁", "☘", "✿", "✦"), K_LIB),
  "library-therian-symbols": ("Therian Symbols", "Paws and marks for the community", m_paw, K_LIB),
  "library-thumbs-up-emoji": ("Thumbs-Up Emoji", "The universal sign of approval",
        glyphs("☝", "✌", "☞", "☜", "☟"), K_LIB),
  "library-travel-vacation-emojis": ("Travel & Vacation Emojis", "Planes, maps and getaways", m_car, K_LIB),
  "library-unit-measurement-symbols": ("Unit & Measurement Symbols", "Degrees, primes and more",
        glyphs("°", "′", "″", "µ", "Ω"), K_LIB),
  "library-vertical-line-symbols": ("Vertical Line Symbols", "Bars and pipes for dividers",
        glyphs("│", "┃", "║", "╎", "┊"), K_LIB),
  "library-weapon-tool-emojis": ("Weapon & Tool Emojis", "Blades, gear and hardware",
        glyphs("⚔", "⚒", "⚓", "✂", "†"), K_LIB),
  "library-wedding-anniversary-emojis": ("Wedding & Anniversary Emojis", "Love, rings and celebration",
        glyphs("♥", "♡", "❣", "❀", "✦"), K_LIB),
  "library-whatsapp-symbols": ("WhatsApp Symbols", "Symbols that paste cleanly in chats", m_chat, K_LIB),
  "library-yin-yang-symbol": ("Yin & Yang Symbol", "Balance, duality and trigrams",
        glyphs("☯", "☰", "☲", "☴", "☵"), K_LIB),

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
  "library-football-emoji-copy-paste": ("Football Emoji Copy & Paste", "Soccer, rugby and trophies", m_ball, K_LIB),
  "library-football-symbols": ("Football Symbols & Combos", "Goals, cards and match sets", m_ball, K_LIB),
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
}


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


def og_png_svg(slug, title, sub, motif, kicker, a=PURPLE, b=BLUE):
    p = "o" + slug.replace("-", "")[:8]
    t, s = esc(title), esc(sub)
    wrapped = textwrap.wrap(t, width=17)[:3]
    tspans = ""
    y0 = 250 - (len(wrapped) - 1) * 33
    for i, line in enumerate(wrapped):
        tspans += f'<tspan x="80" y="{y0 + i*72}">{line}</tspan>'
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


def main():
    import cairosvg
    n = 0
    for slug, (title, sub, motif, kicker) in PAGES.items():
        with open(os.path.join(HERO, f"{slug}.svg"), "w", encoding="utf-8") as f:
            f.write(hero_svg(slug, title, motif, kicker))
        cairosvg.svg2png(
            bytestring=og_png_svg(slug, title, sub, motif, kicker).encode(),
            write_to=os.path.join(OG, f"{slug}.png"),
            output_width=1200, output_height=630)
        n += 1

    # Homepage social card. The English root index.html references this card.
    cairosvg.svg2png(
        bytestring=og_png_svg(
            HOME_CARD, "Fancy Text Generator",
            "60+ Unicode fonts to copy and paste anywhere",
            m_brand, K_SITE).encode(),
        write_to=os.path.join(OG, f"{HOME_CARD}.png"),
        output_width=1200, output_height=630)

    # Localized homepage cards — translated copy on a translated page.
    for _loc, (fname, title, sub) in LOCALIZED_HOME.items():
        cairosvg.svg2png(
            bytestring=og_png_svg(fname, title, sub, m_brand, K_SITE).encode(),
            write_to=os.path.join(OG, f"{fname}.png"),
            output_width=1200, output_height=630)

    print(f"wrote {n} hero SVGs to assets/hero/ and {n} OG PNGs to assets/og/")
    print(f"wrote homepage card + {len(LOCALIZED_HOME)} localized homepage cards "
          "to assets/og/")


if __name__ == "__main__":
    main()
