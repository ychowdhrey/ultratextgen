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


GUIDES = {
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
