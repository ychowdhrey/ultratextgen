#!/usr/bin/env python3
"""
Generates the guide illustration set for UltraTextGen.

For each guide it emits:
  - <slug>.svg        in-page decorative hero banner (1200x340), no critical text
  - og/<slug>.png     1200x630 social card with baked title + brand

Run:  python3 _generate.py
Requires: cairosvg (PNG rasterization). SVGs are also valid standalone assets.

Visual system: editorial / typographic. Soft off-white panel, brand
purple->blue gradient accents, a faint dot grid, and one bold focal motif per
guide built from vector primitives + safe system fonts (no Math-Alphanumeric
glyphs are baked into rasters).
"""
import os
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
OG = os.path.join(HERE, "og")
os.makedirs(OG, exist_ok=True)

PURPLE = "#8b5cf6"
BLUE = "#3b82f6"
INK = "#1a1a2e"
SUB = "#64748b"
PANEL = "#FBFBFE"
PANEL2 = "#F2F1FB"
SANS = "Liberation Sans, DejaVu Sans, sans-serif"

# ---------------------------------------------------------------- shared defs


def defs(idp):
    return f"""
  <defs>
    <linearGradient id="g{idp}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{PURPLE}"/>
      <stop offset="1" stop-color="{BLUE}"/>
    </linearGradient>
    <linearGradient id="gv{idp}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{PURPLE}"/>
      <stop offset="1" stop-color="{BLUE}"/>
    </linearGradient>
    <radialGradient id="glow{idp}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="{PURPLE}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="{PURPLE}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots{idp}" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="{INK}" opacity="0.06"/>
    </pattern>
  </defs>"""


# ---------------------------------------------------------------- motifs
# Each motif draws inside a 360x360 box centred at (cx, cy)=(180,180) and is
# translated into place by the caller. Returns an SVG fragment string.


def m_index(p):
    # typographic constellation: glyphs in varied treatments, linked by lines
    return f"""
    <g stroke="{PURPLE}" stroke-width="1.5" opacity="0.35">
      <line x1="70" y1="80" x2="180" y2="150"/>
      <line x1="180" y1="150" x2="300" y2="90"/>
      <line x1="180" y1="150" x2="120" y2="270"/>
      <line x1="180" y1="150" x2="280" y2="250"/>
    </g>
    <text x="70" y="95" font-family="{SANS}" font-size="64" font-weight="700"
          fill="none" stroke="{INK}" stroke-width="2" text-anchor="middle">A</text>
    <text x="300" y="105" font-family="{SANS}" font-size="58" font-style="italic"
          fill="{BLUE}" text-anchor="middle">g</text>
    <g transform="translate(120 270) rotate(180)">
      <text font-family="{SANS}" font-size="56" font-weight="700"
            fill="{SUB}" text-anchor="middle">R</text>
    </g>
    <g transform="translate(280 250)">
      <text font-family="{SANS}" font-size="56" font-weight="700"
            fill="{INK}" text-anchor="middle">S</text>
      <line x1="-26" y1="-18" x2="26" y2="-18" stroke="{PURPLE}" stroke-width="4"/>
    </g>
    <circle cx="180" cy="150" r="46" fill="url(#g{p})"/>
    <text x="180" y="170" font-family="{SANS}" font-size="52" font-weight="700"
          fill="#fff" text-anchor="middle">e</text>"""


def m_rhetoric(p):
    return f"""
    <text x="74" y="150" font-family="Georgia, {SANS}" font-size="190"
          font-weight="700" fill="url(#g{p})" opacity="0.9">&#8220;</text>
    <g transform="translate(150 215)">
      <text font-family="{SANS}" font-size="46" font-weight="600"
            fill="{INK}">brilliant</text>
      <line x1="-2" y1="-14" x2="196" y2="-14" stroke="{PURPLE}" stroke-width="6"/>
    </g>
    <text x="150" y="280" font-family="{SANS}" font-size="20" fill="{SUB}">
      meaning &#215; counter-meaning</text>"""


def m_comments(p):
    return f"""
    <g>
      <rect x="40" y="70" width="180" height="64" rx="18" fill="#fff"
            stroke="{INK}" stroke-opacity="0.12"/>
      <rect x="62" y="92" width="120" height="9" rx="4" fill="{SUB}" opacity="0.5"/>
      <rect x="62" y="110" width="80" height="9" rx="4" fill="{SUB}" opacity="0.3"/>
    </g>
    <g>
      <rect x="90" y="150" width="230" height="80" rx="20" fill="url(#g{p})"/>
      <rect x="114" y="176" width="150" height="11" rx="5" fill="#fff"/>
      <rect x="114" y="198" width="100" height="11" rx="5" fill="#fff" opacity="0.7"/>
      <polygon points="120,228 120,256 146,228" fill="url(#g{p})"/>
    </g>
    <g>
      <rect x="60" y="248" width="170" height="60" rx="18" fill="#fff"
            stroke="{INK}" stroke-opacity="0.12"/>
      <rect x="82" y="268" width="110" height="9" rx="4" fill="{SUB}" opacity="0.5"/>
    </g>"""


def m_branding(p):
    cells = ""
    xs = [40, 132, 224]
    for i, x in enumerate(xs):
        fill = f"url(#g{p})" if i == 1 else "#fff"
        stroke = "none" if i == 1 else f"{INK}"
        mark = "#fff" if i == 1 else PURPLE
        cells += f"""
        <g transform="translate({x} 130)">
          <rect width="84" height="100" rx="16" fill="{fill}" stroke="{stroke}"
                stroke-opacity="0.12"/>
          <path d="M22 40 L42 24 L62 40 L54 64 L30 64 Z" fill="{mark}"/>
          <rect x="22" y="76" width="40" height="8" rx="4" fill="{mark}" opacity="0.8"/>
        </g>"""
    return f"""{cells}
    <text x="180" y="290" font-family="{SANS}" font-size="20" fill="{SUB}"
          text-anchor="middle">repetition &#8594; recognition</text>"""


def m_linkedin_comments(p):
    bars = ""
    data = [(40, 230, 70, "#e9e7fb"), (132, 170, 130, "#d7d4f7"),
            (224, 110, 190, f"url(#gv{p})")]
    for x, y, h, fill in data:
        bars += f'<rect x="{x}" y="{y}" width="84" height="{h}" rx="14" fill="{fill}"/>'
    return f"""
    {bars}
    <g transform="translate(266 64)">
      <path d="M0 30 L10 8 L20 24 L30 4 L40 24 L50 8 L60 30 Z" fill="url(#g{p})"/>
    </g>
    <text x="82" y="220" font-family="{SANS}" font-size="30" font-weight="700"
          fill="{SUB}" text-anchor="middle">3</text>
    <text x="174" y="160" font-family="{SANS}" font-size="34" font-weight="700"
          fill="{INK}" text-anchor="middle">2</text>
    <text x="266" y="100" font-family="{SANS}" font-size="40" font-weight="700"
          fill="#fff" text-anchor="middle">1</text>"""


def m_personal_branding(p):
    return f"""
    <path d="M50 250 C 90 90, 150 90, 150 180 C 150 250, 120 250, 140 170
             C 160 90, 230 90, 300 250"
          fill="none" stroke="url(#g{p})" stroke-width="10"
          stroke-linecap="round"/>
    <circle cx="300" cy="250" r="10" fill="{BLUE}"/>
    <text x="180" y="300" font-family="{SANS}" font-size="20" fill="{SUB}"
          text-anchor="middle">a signature people recognize</text>"""


def m_stop_scroll(p):
    return f"""
    <rect x="60" y="60" width="120" height="11" rx="5" fill="{SUB}" opacity="0.35"/>
    <rect x="60" y="86" width="160" height="11" rx="5" fill="{SUB}" opacity="0.35"/>
    <rect x="60" y="120" width="210" height="26" rx="8" fill="url(#g{p})"/>
    <rect x="60" y="170" width="140" height="11" rx="5" fill="{SUB}" opacity="0.35"/>
    <rect x="60" y="196" width="180" height="11" rx="5" fill="{SUB}" opacity="0.35"/>
    <g transform="translate(180 270)">
      <path d="M-70 0 Q0 -46 70 0 Q0 46 -70 0 Z" fill="none"
            stroke="{INK}" stroke-width="4" opacity="0.8"/>
      <circle cx="0" cy="0" r="18" fill="url(#g{p})"/>
    </g>"""


def m_hooks(p):
    return f"""
    <rect x="56" y="78" width="210" height="26" rx="8" fill="url(#g{p})"/>
    <rect x="56" y="124" width="150" height="11" rx="5" fill="{SUB}" opacity="0.35"/>
    <rect x="56" y="148" width="176" height="11" rx="5" fill="{SUB}" opacity="0.35"/>
    <path d="M250 60 L250 220 Q250 290 180 290 Q120 290 120 244"
          fill="none" stroke="url(#gv{p})" stroke-width="12" stroke-linecap="round"/>
    <circle cx="250" cy="56" r="12" fill="{PURPLE}"/>"""


def m_vertical(p):
    letters = "WAIT"
    g = ""
    for i, ch in enumerate(letters):
        y = 80 + i * 62
        g += f"""<text x="120" y="{y}" font-family="{SANS}" font-size="54"
              font-weight="700" fill="url(#gv{p})" text-anchor="middle">{ch}</text>"""
    flow = ""
    for i in range(4):
        y = 60 + i * 62
        flow += f'<line x1="170" y1="{y}" x2="320" y2="{y}" stroke="{SUB}" stroke-width="9" stroke-linecap="round" opacity="0.22"/>'
    return f"""{flow}{g}
    <text x="245" y="305" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">orientation = friction</text>"""


def m_boxes(p):
    # a styled glyph that degrades into tofu boxes — the compatibility story
    boxes = ""
    for i in range(3):
        x = 196 + i * 56
        boxes += f"""<rect x="{x}" y="150" width="44" height="60" rx="6"
              fill="none" stroke="{SUB}" stroke-width="4" opacity="0.55"/>
            <line x1="{x}" y1="150" x2="{x+44}" y2="210" stroke="{SUB}"
              stroke-width="3" opacity="0.4"/>
            <line x1="{x+44}" y1="150" x2="{x}" y2="210" stroke="{SUB}"
              stroke-width="3" opacity="0.4"/>"""
    return f"""
    <g transform="translate(70 150)">
      <rect x="-6" y="0" width="120" height="60" rx="14" fill="url(#g{p})"/>
      <text x="54" y="44" font-family="Georgia, {SANS}" font-size="44"
            font-weight="700" font-style="italic" fill="#fff"
            text-anchor="middle">Aa</text>
    </g>
    <text x="176" y="190" font-family="{SANS}" font-size="34" fill="{SUB}"
          text-anchor="middle">&#8594;</text>
    {boxes}
    <text x="180" y="280" font-family="{SANS}" font-size="19" fill="{SUB}"
          text-anchor="middle">a glyph the device can&#8217;t draw</text>"""


def m_accessibility(p):
    # a styled letter being read aloud as code-point names — sound waves
    waves = ""
    for i in range(5):
        x = 226 + i * 26
        h = [22, 46, 70, 40, 18][i]
        waves += f'<rect x="{x}" y="{180-h/2}" width="12" height="{h}" rx="6" fill="url(#gv{p})"/>'
    return f"""
    <g transform="translate(60 120)">
      <rect width="120" height="120" rx="22" fill="#fff" stroke="{INK}"
            stroke-opacity="0.12"/>
      <text x="60" y="84" font-family="Georgia, {SANS}" font-size="74"
            font-weight="700" fill="url(#g{p})" text-anchor="middle">B</text>
    </g>
    <path d="M196 180 L214 168 L214 192 Z" fill="{INK}" opacity="0.6"/>
    {waves}
    <text x="180" y="290" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">&#8220;mathematical bold capital B&#8230;&#8221;</text>"""


def m_accents(p):
    # a diacritic that survives styling next to one that drops it
    return f"""
    <g transform="translate(70 130)">
      <rect width="110" height="110" rx="20" fill="url(#g{p})"/>
      <text x="55" y="80" font-family="Georgia, {SANS}" font-size="66"
            font-weight="700" fill="#fff" text-anchor="middle">&#225;</text>
    </g>
    <circle cx="204" cy="122" r="16" fill="{PURPLE}"/>
    <path d="M196 122 L201 128 L212 114" stroke="#fff" stroke-width="3.5"
          fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <g transform="translate(230 130)">
      <rect width="110" height="110" rx="20" fill="#fff" stroke="{INK}"
            stroke-opacity="0.12"/>
      <text x="55" y="80" font-family="Georgia, {SANS}" font-size="66"
            font-weight="700" fill="{SUB}" text-anchor="middle" opacity="0.55">a</text>
    </g>
    <circle cx="364" cy="122" r="16" fill="{SUB}" opacity="0.55"/>
    <path d="M357 115 L371 129 M371 115 L357 129" stroke="#fff" stroke-width="3.5"
          stroke-linecap="round"/>
    <text x="200" y="288" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">the mark survives here &#8212; drops there</text>"""


def m_discord(p):
    # the 3-system model: three stacked chips
    rows = [("MD", "#fff", INK, "message only"),
            ("Uni", "url(#g" + p + ")", "#fff", "names everywhere"),
            ("Nitro", "#fff", INK, "color, not in-server")]
    g = ""
    for i, (label, fill, ink, note) in enumerate(rows):
        y = 70 + i * 78
        stroke = "none" if fill.startswith("url") else INK
        g += f"""
        <g transform="translate(50 {y})">
          <rect width="260" height="60" rx="16" fill="{fill}" stroke="{stroke}"
                stroke-opacity="0.12"/>
          <text x="24" y="39" font-family="{SANS}" font-size="26"
                font-weight="700" fill="{ink}">{label}</text>
          <text x="250" y="38" font-family="{SANS}" font-size="16" fill="{ink}"
                opacity="0.75" text-anchor="end">{note}</text>
        </g>"""
    return g


def m_personality(p):
    # a palette of the same letter in six personality treatments
    chips = [("A", "700", "normal", "normal", PURPLE),
             ("A", "700", "italic", "Georgia", BLUE),
             ("A", "400", "normal", "normal", INK),
             ("a", "700", "normal", "normal", SUB),
             ("A", "400", "italic", "Georgia", PURPLE),
             ("A", "700", "normal", "Courier New, monospace", BLUE)]
    g = ""
    for i, (ch, w, st, fam, col) in enumerate(chips):
        cx = 40 + (i % 3) * 110
        cy = 70 + (i // 3) * 130
        fill = f"url(#g{p})" if i == 0 else "#fff"
        stroke = "none" if i == 0 else INK
        ink = "#fff" if i == 0 else col
        famn = fam if fam not in ("normal",) else SANS
        g += f"""
        <g transform="translate({cx} {cy})">
          <rect width="96" height="108" rx="16" fill="{fill}" stroke="{stroke}"
                stroke-opacity="0.12"/>
          <text x="48" y="74" font-family="{famn}" font-size="58" font-weight="{w}"
                font-style="{st}" fill="{ink}" text-anchor="middle">{ch}</text>
        </g>"""
    return g


def m_unicode_layers(p):
    # the Four-Layer Model: character -> code point -> encoding -> glyph
    rows = [("A", "character"), ("U+0041", "code point"),
            ("01000001", "encoding"), ("𝗔?", "glyph")]
    g = ""
    for i, (label, note) in enumerate(rows):
        y = 56 + i * 66
        fill = f"url(#g{p})" if i == 3 else "#fff"
        ink = "#fff" if i == 3 else INK
        g += f"""
        <g transform="translate(60 {y})">
          <rect width="240" height="52" rx="14" fill="{fill}" stroke="{INK}"
                stroke-opacity="0.12"/>
          <text x="22" y="34" font-family="Courier New, monospace" font-size="24"
                font-weight="700" fill="{ink}">{label}</text>
          <text x="222" y="33" font-family="{SANS}" font-size="15" fill="{ink}"
                opacity="0.7" text-anchor="end">{note}</text>
        </g>"""
        if i < 3:
            g += f'<line x1="180" y1="{y+52}" x2="180" y2="{y+66}" stroke="{PURPLE}" stroke-width="4"/>'
    return g


def m_li_reach(p):
    # two near-equal bars: bold vs plain — no algorithmic penalty
    return f"""
    <rect x="70" y="100" width="84" height="180" rx="14" fill="url(#gv{p})"/>
    <rect x="200" y="112" width="84" height="168" rx="14" fill="#d7d4f7"/>
    <text x="112" y="86" font-family="{SANS}" font-size="24" font-weight="700"
          fill="{INK}" text-anchor="middle">bold</text>
    <text x="242" y="86" font-family="{SANS}" font-size="24"
          fill="{SUB}" text-anchor="middle">plain</text>
    <line x1="50" y1="292" x2="310" y2="292" stroke="{SUB}" stroke-width="3"
          opacity="0.4"/>
    <text x="180" y="326" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">no penalty — just restraint</text>"""


def m_ig_linebreaks(p):
    # a bio card whose spacer line is held open by an invisible character
    return f"""
    <g transform="translate(60 60)">
      <rect width="240" height="240" rx="22" fill="#fff" stroke="{INK}"
            stroke-opacity="0.12"/>
      <rect x="26" y="34" width="150" height="12" rx="6" fill="{INK}" opacity="0.75"/>
      <rect x="26" y="62" width="188" height="10" rx="5" fill="{SUB}" opacity="0.4"/>
      <g>
        <rect x="26" y="96" width="188" height="26" rx="8" fill="{PANEL2}"/>
        <circle cx="44" cy="109" r="4" fill="url(#g{p})"/>
        <circle cx="60" cy="109" r="4" fill="url(#g{p})"/>
        <circle cx="76" cy="109" r="4" fill="url(#g{p})" opacity="0.45"/>
        <text x="206" y="115" font-family="Courier New, monospace" font-size="15"
              fill="{PURPLE}" text-anchor="end">U+2800</text>
      </g>
      <rect x="26" y="140" width="170" height="10" rx="5" fill="{SUB}" opacity="0.4"/>
      <rect x="26" y="164" width="140" height="10" rx="5" fill="{SUB}" opacity="0.4"/>
      <rect x="26" y="198" width="98" height="24" rx="12" fill="url(#g{p})"/>
    </g>
    <text x="180" y="330" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">the blank line that survives save</text>"""


def m_ig_shadowban(p):
    # a magnifier that can't match a styled name — myth vs real cost
    return f"""
    <g transform="translate(56 84)">
      <rect width="248" height="54" rx="16" fill="#fff" stroke="{INK}"
            stroke-opacity="0.12"/>
      <text x="20" y="36" font-family="Georgia, {SANS}" font-size="28"
            font-style="italic" font-weight="700" fill="url(#g{p})">𝓢𝓪𝓻𝓪𝓱 ✿</text>
    </g>
    <g transform="translate(56 168)">
      <rect width="248" height="54" rx="16" fill="{PANEL2}"/>
      <text x="20" y="35" font-family="{SANS}" font-size="24" fill="{SUB}">sarah</text>
      <text x="228" y="35" font-family="{SANS}" font-size="24" fill="{PURPLE}"
            text-anchor="end">0 results</text>
    </g>
    <g transform="translate(250 210)">
      <circle cx="0" cy="0" r="34" fill="none" stroke="{INK}" stroke-width="8"
              opacity="0.75"/>
      <line x1="24" y1="24" x2="58" y2="58" stroke="{INK}" stroke-width="10"
            stroke-linecap="round" opacity="0.75"/>
    </g>
    <text x="180" y="316" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">not banned — unfindable</text>"""


def m_discord_fields(p):
    # field permission matrix: checks and crosses
    rows = [("@handle", False), ("display", True), ("nickname", True),
            ("#channel", False)]
    g = ""
    for i, (label, ok) in enumerate(rows):
        y = 62 + i * 62
        mark = ("✓", f"url(#g{p})", "#fff") if ok else ("✕", "#fff", SUB)
        stroke = "none" if ok else INK
        g += f"""
        <g transform="translate(56 {y})">
          <rect width="180" height="48" rx="12" fill="#fff" stroke="{INK}"
                stroke-opacity="0.12"/>
          <text x="20" y="32" font-family="{SANS}" font-size="21"
                font-weight="600" fill="{INK}">{label}</text>
        </g>
        <g transform="translate(256 {y})">
          <rect width="48" height="48" rx="12" fill="{mark[1]}" stroke="{stroke}"
                stroke-opacity="0.12"/>
          <text x="24" y="33" font-family="{SANS}" font-size="26" font-weight="700"
                fill="{mark[2]}" text-anchor="middle">{mark[0]}</text>
        </g>"""
    return g + f"""
    <text x="180" y="330" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">every field has a rule</text>"""


def m_dividers(p):
    # divider anatomy: motif + symmetry + weight
    return f"""
    <line x1="60" y1="86" x2="300" y2="86" stroke="{SUB}" stroke-width="2"
          opacity="0.5" stroke-dasharray="2 7"/>
    <line x1="60" y1="146" x2="140" y2="146" stroke="{INK}" stroke-width="4"
          opacity="0.6"/>
    <circle cx="180" cy="146" r="12" fill="url(#g{p})"/>
    <line x1="220" y1="146" x2="300" y2="146" stroke="{INK}" stroke-width="4"
          opacity="0.6"/>
    <line x1="60" y1="206" x2="300" y2="206" stroke="url(#g{p})" stroke-width="10"
          stroke-linecap="round"/>
    <line x1="60" y1="258" x2="300" y2="258" stroke="{SUB}" stroke-width="3" opacity="0.5"/>
    <line x1="60" y1="268" x2="300" y2="268" stroke="{SUB}" stroke-width="3" opacity="0.5"/>
    <text x="180" y="322" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">motif · symmetry · weight</text>"""


def m_li_ats(p):
    # recruiter search bar that can't see a styled name
    return f"""
    <g transform="translate(52 70)">
      <rect width="256" height="56" rx="28" fill="#fff" stroke="{INK}"
            stroke-opacity="0.12"/>
      <circle cx="34" cy="28" r="11" fill="none" stroke="{SUB}" stroke-width="4"/>
      <line x1="42" y1="37" x2="52" y2="47" stroke="{SUB}" stroke-width="4"
            stroke-linecap="round"/>
      <text x="70" y="37" font-family="{SANS}" font-size="24" fill="{INK}">Sarah Chen</text>
    </g>
    <g transform="translate(52 168)">
      <rect width="256" height="70" rx="18" fill="url(#g{p})"/>
      <text x="24" y="30" font-family="Georgia, {SANS}" font-size="26"
            font-style="italic" font-weight="700" fill="#fff">𝓢𝓪𝓻𝓪𝓱 𝓒𝓱𝓮𝓷 ✨</text>
      <text x="24" y="56" font-family="{SANS}" font-size="16" fill="#fff"
            opacity="0.8">invisible to this search</text>
    </g>
    <path d="M170 132 L180 156 L190 132" fill="none" stroke="{SUB}"
          stroke-width="4" stroke-linecap="round" opacity="0.6"/>
    <text x="180" y="300" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">styled name, empty results page</text>"""


def m_discord_ansi(p):
    # a code block with colored lines — desktop yes, mobile no
    return f"""
    <g transform="translate(48 60)">
      <rect width="264" height="180" rx="18" fill="{INK}"/>
      <text x="22" y="36" font-family="Courier New, monospace" font-size="17"
            fill="#8a8fa3">```ansi</text>
      <rect x="22" y="52" width="120" height="13" rx="6" fill="#e06c75"/>
      <rect x="22" y="80" width="168" height="13" rx="6" fill="#98c379"/>
      <rect x="22" y="108" width="96" height="13" rx="6" fill="#61afef"/>
      <rect x="152" y="108" width="60" height="13" rx="6" fill="#e5c07b"/>
      <text x="22" y="152" font-family="Courier New, monospace" font-size="17"
            fill="#8a8fa3">```</text>
    </g>
    <g transform="translate(238 216)">
      <rect width="76" height="98" rx="16" fill="#fff" stroke="{INK}"
            stroke-opacity="0.14"/>
      <text x="38" y="44" font-family="Courier New, monospace" font-size="13"
            fill="{SUB}" text-anchor="middle">[2;31m</text>
      <text x="38" y="70" font-family="{SANS}" font-size="24" fill="{PURPLE}"
            text-anchor="middle">?</text>
    </g>
    <text x="150" y="300" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">8 colors, code blocks only</text>"""


def m_tiktok_font(p):
    # two phones: the app's UI font vs the text you control
    return f"""
    <g transform="translate(58 52)">
      <rect width="110" height="216" rx="22" fill="#fff" stroke="{INK}"
            stroke-opacity="0.14"/>
      <rect x="18" y="30" width="74" height="12" rx="6" fill="{INK}" opacity="0.8"/>
      <rect x="18" y="56" width="58" height="10" rx="5" fill="{SUB}" opacity="0.4"/>
      <rect x="18" y="80" width="66" height="10" rx="5" fill="{SUB}" opacity="0.4"/>
      <text x="55" y="140" font-family="{SANS}" font-size="15" fill="{SUB}"
            text-anchor="middle">app font</text>
      <text x="55" y="166" font-family="{SANS}" font-size="15" fill="{SUB}"
            text-anchor="middle">not yours</text>
    </g>
    <g transform="translate(192 52)">
      <rect width="110" height="216" rx="22" fill="url(#g{p})"/>
      <text x="55" y="52" font-family="Georgia, {SANS}" font-size="26"
            font-weight="700" font-style="italic" fill="#fff"
            text-anchor="middle">𝓃𝒶𝓂𝑒</text>
      <text x="55" y="92" font-family="{SANS}" font-size="22" font-weight="700"
            fill="#fff" text-anchor="middle">𝗯𝗶𝗼</text>
      <text x="55" y="146" font-family="{SANS}" font-size="15" fill="#fff"
            opacity="0.85" text-anchor="middle">your text</text>
      <text x="55" y="170" font-family="{SANS}" font-size="15" fill="#fff"
            opacity="0.85" text-anchor="middle">yours to style</text>
    </g>
    <text x="180" y="316" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">two different &#8220;fonts&#8221;</text>"""


def m_game_names(p):
    # a name tag with accepted and rejected symbols
    return f"""
    <g transform="translate(48 76)">
      <rect width="264" height="64" rx="16" fill="#fff" stroke="{INK}"
            stroke-opacity="0.12"/>
      <text x="22" y="42" font-family="{SANS}" font-size="26" font-weight="700"
            fill="{INK}">Nova_7</text>
      <g transform="translate(226 32)">
        <circle r="18" fill="url(#g{p})"/>
        <text y="8" font-family="{SANS}" font-size="22" font-weight="700"
              fill="#fff" text-anchor="middle">✓</text>
      </g>
    </g>
    <g transform="translate(48 170)">
      <rect width="264" height="64" rx="16" fill="{PANEL2}"/>
      <text x="22" y="43" font-family="{SANS}" font-size="26" font-weight="700"
            fill="{SUB}">꧁Nova꧂</text>
      <g transform="translate(226 32)">
        <circle r="18" fill="#fff" stroke="{INK}" stroke-opacity="0.15"/>
        <text y="8" font-family="{SANS}" font-size="22" font-weight="700"
              fill="{SUB}" text-anchor="middle">✕</text>
      </g>
    </g>
    <text x="180" y="292" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">handle strict &#183; display name free</text>"""


def m_recovery_triage(p):
    # same broken complaint, three different failures at three layers
    cols = [(70, "□", "cosmetic", SUB, False),
            (180, "Ã©", "reversible", PURPLE, False),
            (290, "?", "permanent", INK, True)]
    g = ""
    for cx, ch, note, col, filled in cols:
        fill = f"url(#g{p})" if filled else "#fff"
        stroke = "none" if filled else INK
        ink = "#fff" if filled else col
        g += f"""
        <g transform="translate({cx-46} 90)">
          <rect width="92" height="92" rx="18" fill="{fill}" stroke="{stroke}"
                stroke-opacity="0.12"/>
          <text x="46" y="62" font-family="{SANS}" font-size="38" font-weight="700"
                fill="{ink}" text-anchor="middle">{ch}</text>
        </g>
        <text x="{cx}" y="212" font-family="{SANS}" font-size="15" fill="{SUB}"
              text-anchor="middle">{note}</text>"""
    g += f"""
    <text x="180" y="300" font-family="{SANS}" font-size="18" fill="{SUB}"
          text-anchor="middle">same complaint, three different breaks</text>"""
    return g


def m_search_tax(p):
    # a styled search query, checked against four contexts
    rows = [("Display", True), ("Google", False), ("Hashtag", False), ("@Mention", False)]
    g = f"""
    <g transform="translate(50 46)">
      <rect width="260" height="50" rx="25" fill="url(#g{p})"/>
      <text x="24" y="33" font-family="Georgia, {SANS}" font-size="22" font-style="italic"
            font-weight="700" fill="#fff">&#119990;&#119942;&#119938;&#119955;&#119940;&#119945;</text>
    </g>"""
    for i, (label, ok) in enumerate(rows):
        y = 116 + i * 54
        mark = ("✓", f"url(#g{p})", "#fff") if ok else ("✕", "#fff", SUB)
        stroke = "none" if ok else INK
        g += f"""
        <g transform="translate(50 {y})">
          <rect width="188" height="42" rx="12" fill="#fff" stroke="{INK}" stroke-opacity="0.12"/>
          <text x="18" y="28" font-family="{SANS}" font-size="17" font-weight="600"
                fill="{INK}">{label}</text>
        </g>
        <g transform="translate(254 {y})">
          <rect width="42" height="42" rx="12" fill="{mark[1]}" stroke="{stroke}"
                stroke-opacity="0.12"/>
          <text x="21" y="29" font-family="{SANS}" font-size="21" font-weight="700"
                fill="{mark[2]}" text-anchor="middle">{mark[0]}</text>
        </g>"""
    g += f"""
    <text x="180" y="336" font-family="{SANS}" font-size="16" fill="{SUB}"
          text-anchor="middle">renders everywhere, indexed nowhere</text>"""
    return g


def m_restraint(p):
    # a symbol-dump bio card next to a one-anchor, quiet-core bio card
    return f"""
    <g transform="translate(40 50)">
      <rect width="120" height="220" rx="18" fill="{PANEL2}"/>
      <text x="60" y="34" font-family="{SANS}" font-size="14" fill="{SUB}"
            text-anchor="middle">&#10022;&#9734;&#10023;&#9790;&#9825;</text>
      <text x="60" y="58" font-family="{SANS}" font-size="14" fill="{SUB}"
            text-anchor="middle">&#9672;&#24417;&#9733;&#24417;&#9672;</text>
      <rect x="14" y="76" width="92" height="9" rx="4" fill="{SUB}" opacity="0.4"/>
      <rect x="14" y="94" width="92" height="9" rx="4" fill="{SUB}" opacity="0.4"/>
      <text x="60" y="126" font-family="{SANS}" font-size="14" fill="{SUB}"
            text-anchor="middle">&#9601;&#9602;&#9603;&#9604;&#9605;&#9606;&#9607;</text>
      <rect x="14" y="146" width="92" height="9" rx="4" fill="{SUB}" opacity="0.4"/>
      <text x="60" y="180" font-family="{SANS}" font-size="14" fill="{SUB}"
            text-anchor="middle">&#9760;&#9734;&#24417;&#12641;&#65295;&#12309;</text>
      <text x="60" y="252" font-family="{SANS}" font-size="14" fill="{SUB}"
            text-anchor="middle">reads as spam</text>
    </g>
    <g transform="translate(200 50)">
      <rect width="120" height="220" rx="18" fill="#fff" stroke="{INK}" stroke-opacity="0.12"/>
      <circle cx="60" cy="34" r="10" fill="url(#g{p})"/>
      <rect x="26" y="60" width="68" height="10" rx="5" fill="{INK}" opacity="0.75"/>
      <rect x="20" y="82" width="80" height="8" rx="4" fill="{SUB}" opacity="0.4"/>
      <line x1="20" y1="106" x2="100" y2="106" stroke="{SUB}" stroke-width="2" opacity="0.3"/>
      <rect x="20" y="122" width="80" height="8" rx="4" fill="{SUB}" opacity="0.4"/>
      <rect x="20" y="140" width="60" height="8" rx="4" fill="{SUB}" opacity="0.4"/>
      <line x1="20" y1="164" x2="100" y2="164" stroke="{SUB}" stroke-width="2" opacity="0.3"/>
      <rect x="30" y="182" width="60" height="20" rx="10" fill="url(#g{p})"/>
      <text x="60" y="252" font-family="{SANS}" font-size="14" fill="{SUB}"
            text-anchor="middle">one anchor, quiet core</text>
    </g>
    <text x="180" y="322" font-family="{SANS}" font-size="17" fill="{SUB}"
          text-anchor="middle">restraint reads as intentional</text>"""


def m_discord_safe_name(p):
    # a styled Discord name checked against three field-specific filters
    rows = [("Member list", True), ("@Mention", True), ("Impersonation", False)]
    g = f"""
    <g transform="translate(60 60)">
      <rect width="240" height="54" rx="16" fill="url(#g{p})"/>
      <text x="20" y="36" font-family="Georgia, {SANS}" font-size="25" font-weight="700"
            fill="#fff">N&#232;va &#9876;</text>
    </g>"""
    for i, (label, ok) in enumerate(rows):
        y = 138 + i * 58
        mark = ("✓", f"url(#g{p})", "#fff") if ok else ("✕", "#fff", SUB)
        stroke = "none" if ok else INK
        g += f"""
        <g transform="translate(60 {y})">
          <rect width="190" height="44" rx="12" fill="#fff" stroke="{INK}" stroke-opacity="0.12"/>
          <text x="18" y="29" font-family="{SANS}" font-size="18" font-weight="600"
                fill="{INK}">{label}</text>
        </g>
        <g transform="translate(266 {y})">
          <rect width="44" height="44" rx="12" fill="{mark[1]}" stroke="{stroke}"
                stroke-opacity="0.12"/>
          <text x="22" y="30" font-family="{SANS}" font-size="22" font-weight="700"
                fill="{mark[2]}" text-anchor="middle">{mark[0]}</text>
        </g>"""
    g += f"""
    <text x="180" y="336" font-family="{SANS}" font-size="16" fill="{SUB}"
          text-anchor="middle">tasteful passes all three</text>"""
    return g


def m_encoding_ladder(p):
    # the proposal pipeline: idea -> proposal -> UTC vote -> code point -> device
    rows = [("Idea", "spot the gap"), ("Proposal", "L2 doc + evidence"),
            ("UTC Vote", "quarterly review"), ("Code Point", "U+1FA7B"),
            ("Your Phone", "vendor ships it")]
    g = ""
    for i, (label, note) in enumerate(rows):
        y = 40 + i * 58
        fill = f"url(#g{p})" if i == 4 else "#fff"
        ink = "#fff" if i == 4 else INK
        g += f"""
        <g transform="translate(60 {y})">
          <rect width="240" height="48" rx="14" fill="{fill}" stroke="{INK}"
                stroke-opacity="0.12"/>
          <text x="18" y="31" font-family="{SANS}" font-size="19"
                font-weight="700" fill="{ink}">{label}</text>
          <text x="222" y="30" font-family="{SANS}" font-size="13" fill="{ink}"
                opacity="0.7" text-anchor="end">{note}</text>
        </g>"""
        if i < 4:
            g += f'<line x1="180" y1="{y+48}" x2="180" y2="{y+58}" stroke="{PURPLE}" stroke-width="4"/>'
    return g


GUIDES = {
    "emoticon-vs-emoji-vs-kaomoji": ("Emoticon vs Emoji vs Kaomoji",
              "How three kinds of text faces differ", m_comments),
    "index": ("Guides for Expressive Typography",
              "Frameworks & playbooks for Unicode text", m_index),
    "the-rhetoric-of-fonts": ("The Rhetoric of Fonts",
              "The meaning behind every Unicode style", m_rhetoric),
    "comments-that-stand-out": ("Comments That Stand Out",
              "A field guide to styled replies", m_comments),
    "branding-with-fonts-for-social-media": ("Branding With Fonts",
              "Turn Unicode styles into brand assets", m_branding),
    "linkedin-comments-guide": ("LinkedIn Comment Archetypes",
              "Comment like the top 1% of creators", m_linkedin_comments),
    "personal-branding-through-typography": ("Personal Branding Through Typography",
              "Make your formatting a signature", m_personal_branding),
    "stop-the-scroll-with-font-variation": ("Stop the Scroll",
              "Font variation that makes posts scannable", m_stop_scroll),
    "style-linkedin-hooks-to-stand-out": ("Style Your LinkedIn Hooks",
              "Scroll-stopping first lines", m_hooks),
    "vertical-text-guide": ("Vertical Text",
              "The science of reading disruption", m_vertical),
    "why-fonts-show-as-boxes": ("Why Fonts Show as Boxes",
              "Which Unicode styles are safe everywhere", m_boxes),
    "fancy-fonts-accessibility-guide": ("Are Fancy Fonts Bad for Accessibility?",
              "An honest guide for creators", m_accessibility),
    "discord-text-formatting-explained": ("Discord Text Formatting Decoded",
              "Markdown vs Unicode vs Nitro", m_discord),
    "font-personality-and-brand": ("Font Personality & Brand",
              "Match a Unicode style to your identity", m_personality),
    "how-unicode-fonts-work": ("How Unicode Text Styling Really Works",
              "The four layers behind every fancy font", m_unicode_layers),
    "linkedin-bold-text-reach": ("Does Bold Text Hurt LinkedIn Reach?",
              "What 1M+ posts reveal about the myth", m_li_reach),
    "instagram-bio-line-breaks": ("Why Your Instagram Bio Collapses",
              "Make line breaks and spacing stick", m_ig_linebreaks),
    "instagram-fonts-shadowban-myth": ("Do Fonts Get You Shadowbanned?",
              "The myth, busted — and the real costs", m_ig_shadowban),
    "discord-where-fonts-work": ("Where Fancy Fonts Work in Discord",
              "The field-by-field permission map", m_discord_fields),
    "dividers-separators-guide": ("Dividers, Separators & Headers",
              "Structure a bio or post with symbols", m_dividers),
    "linkedin-fonts-recruiters-ats": ("Will Recruiters See Your Fancy Text?",
              "LinkedIn search, ATS parsing & your name", m_li_ats),
    "discord-colored-text-guide": ("Colored Text in Discord (ANSI)",
              "What's possible, what breaks on mobile", m_discord_ansi),
    "tiktok-font-changed": ("Why Did TikTok Change My Font?",
              "TikTok Sans vs the fonts you control", m_tiktok_font),
    "game-username-allowed-symbols": ("Game Username Character Rules",
              "Roblox, Fortnite, Valorant & COD", m_game_names),
    "boxes-vs-mojibake-vs-question-marks": ("Boxes, Mojibake, or a Question Mark?",
              "Which breaks are fixable, which aren't", m_recovery_triage),
    "fonts-and-search-visibility": ("Will Fancy Text Make You Invisible?",
              "The SEO myths vs the real search costs", m_search_tax),
    "bio-formatting-without-spam": ("Format a Bio Without Looking Spammy",
              "The Restraint Framework for symbols", m_restraint),
    "discord-safe-name-styling": ("Style a Discord Name Without Getting Filtered",
              "Member list, mentions & impersonation", m_discord_safe_name),
    "fancy-fonts-and-accents": ("Accents, Diacritics & Fancy Fonts",
              "What keeps its marks and what breaks", m_accents),
    "unicode-symbol-approval-process": ("How New Unicode Symbols Get Approved",
              "The real proposal-to-code-point pipeline", m_encoding_ladder),
}


def hero_svg(slug, motif):
    p = slug.replace("-", "")[:8] or "x"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 340"
     width="1200" height="340" role="img">
  {defs(p)}
  <rect width="1200" height="340" rx="20" fill="{PANEL}"/>
  <rect width="1200" height="340" rx="20" fill="url(#dots{p})"/>
  <circle cx="1010" cy="60" r="260" fill="url(#glow{p})"/>
  <rect x="0" y="0" width="8" height="340" fill="url(#gv{p})"/>
  <g transform="translate(740 -10) scale(1.02)">{motif(p)}</g>
  <g transform="translate(420 -10) scale(0.62)" opacity="0.10">{motif(p)}</g>
</svg>"""


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def og_png(slug, title, sub, motif):
    p = "og" + slug.replace("-", "")[:6]
    title, sub = esc(title), esc(sub)
    wrapped = textwrap.wrap(title, width=18)[:3]
    tspans = ""
    y0 = 250 - (len(wrapped) - 1) * 33
    for i, line in enumerate(wrapped):
        tspans += f'<tspan x="80" y="{y0 + i*72}">{line}</tspan>'
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"
     width="1200" height="630">
  {defs(p)}
  <rect width="1200" height="630" fill="{PANEL}"/>
  <rect width="1200" height="630" fill="url(#dots{p})"/>
  <circle cx="1080" cy="120" r="380" fill="url(#glow{p})"/>
  <rect x="0" y="0" width="14" height="630" fill="url(#gv{p})"/>
  <text x="80" y="96" font-family="{SANS}" font-size="22" font-weight="700"
        letter-spacing="3" fill="{PURPLE}">ULTRATEXTGEN &#183; GUIDE</text>
  <text font-family="{SANS}" font-size="62" font-weight="700" fill="{INK}">{tspans}</text>
  <text x="80" y="{y0 + len(wrapped)*72 + 6}" font-family="{SANS}" font-size="26"
        fill="{SUB}">{sub}</text>
  <g transform="translate(720 150) scale(1.25)">{motif(p)}</g>
</svg>"""
    return svg


def main():
    import cairosvg
    for slug, (title, sub, motif) in GUIDES.items():
        with open(os.path.join(HERE, f"{slug}.svg"), "w") as f:
            f.write(hero_svg(slug, motif))
        png_path = os.path.join(OG, f"{slug}.png")
        cairosvg.svg2png(bytestring=og_png(slug, title, sub, motif).encode(),
                         write_to=png_path, output_width=1200, output_height=630)
        print("wrote", slug + ".svg", "and og/" + slug + ".png")


if __name__ == "__main__":
    main()
