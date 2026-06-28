#!/usr/bin/env python3
"""
Shared renderer + builder for single-language Pinterest boards.

Extracted from scripts/generate-es-pins.py so every localized board
(de, fr, it, nl, pl, pt, tr, vi, …) renders on the IDENTICAL brand pin —
soft off-white panel, faint dot grid, purple→blue spine, focal style card,
UltraTextGen wordmark — without duplicating the Mathematical-Alphanumeric
tables or the SVG template eight times. Same dedicated, single-destination,
single-language pattern as the /es/ and /id/ boards.

A per-locale generator (`scripts/generate-<locale>-pins.py`) only declares its
native PINS + board metadata and calls `build_board(...)`. The brand skin and
style machinery are imported from generate-site-art.py / generate-id-pins.py —
the single sources of truth — exactly as generate-es-pins.py does.

Requires: cairosvg, plus a font covering the Mathematical Alphanumeric block
          (Symbola) — apt: fonts-symbola fonts-noto-core fonts-noto-extra.
"""
import csv
import importlib.util
import os
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

PIN_W, PIN_H = 1000, 1500


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# Reuse the brand skin + the ID generator's style machinery (Unicode style maps,
# st(), wrap(), smallcaps(), the AES font stack and fit_size) — single source of
# truth, no duplicated Mathematical-Alphanumeric tables.
ART = _load(os.path.join(HERE, "generate-site-art.py"), "siteart")
IDG = _load(os.path.join(HERE, "generate-id-pins.py"), "idpins")
PURPLE, BLUE, INK, SUB = ART.PURPLE, ART.BLUE, ART.INK, ART.SUB
PANEL, SANS = ART.PANEL, ART.SANS
defs, esc = ART.defs, ART.esc
st, wrap, smallcaps, AES, fit_size = IDG.st, IDG.wrap, IDG.smallcaps, IDG.AES, IDG.fit_size


# combining-mark styles the math-alphanumeric block can't express
def strike(t):
    return "".join(c + "̶" for c in t)


def under(t):
    return "".join(c + "̲" for c in t)


# ============================================================ pin renderer
def pin_svg(pin, cta, url_suffix):
    """Render one 1000x1500 vertical pin. `cta` is the native tap-to-copy line;
    `url_suffix` is the locale path shown after the wordmark (e.g. "/de")."""
    p = "lp" + pin["slug"].replace("-", "")[:8]
    headline = esc(pin["headline"])
    rows = pin["rows"]

    wrapped = textwrap.wrap(headline, width=17)[:3]
    if len(wrapped) <= 1:
        fs, lh = 84, 96
    elif len(wrapped) == 2:
        fs, lh = 78, 90
    else:
        fs, lh = 64, 76
    ty0 = 250
    tspans = "".join(f'<tspan x="80" y="{ty0 + i*lh}">{l}</tspan>'
                     for i, l in enumerate(wrapped))
    title_bottom = ty0 + (len(wrapped) - 1) * lh

    card_x, card_y, card_w, card_h = 80, 470, 840, 740
    n = len(rows)
    pad_top = 70
    slot = (card_h - pad_top - 40) // n
    samples = [s for _, s in rows]
    size = fit_size(samples, 70, 40, 18)
    rows_svg = ""
    y = card_y + pad_top
    for label, sample in rows:
        if label:
            rows_svg += (f'<text x="{card_x + 60}" y="{y}" font-family="{SANS}" '
                         f'font-size="24" font-weight="700" letter-spacing="2" '
                         f'fill="{PURPLE}">{esc(label.upper())}</text>')
        font = SANS if sample.isascii() else AES
        rows_svg += (f'<text x="{card_x + 60}" y="{y + 58}" font-family="{font}" '
                     f'font-size="{size}" fill="{INK}">{esc(sample)}</text>')
        if (label, sample) != rows[-1]:
            ly = y + slot - 24
            rows_svg += (f'<line x1="{card_x + 60}" y1="{ly}" '
                         f'x2="{card_x + card_w - 60}" y2="{ly}" '
                         f'stroke="{INK}" stroke-opacity="0.08" stroke-width="2"/>')
        y += slot

    blines = textwrap.wrap(esc(pin["benefit"]), width=40)[:2]
    by0 = card_y + card_h + 66
    bspans = "".join(f'<tspan x="500" y="{by0 + i*44}">{l}</tspan>'
                     for i, l in enumerate(blines))

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PIN_W} {PIN_H}"
     width="{PIN_W}" height="{PIN_H}">
  {defs(p)}
  <rect width="{PIN_W}" height="{PIN_H}" fill="{PANEL}"/>
  <rect width="{PIN_W}" height="{PIN_H}" fill="url(#dots{p})"/>
  <circle cx="860" cy="90" r="420" fill="url(#glow{p})"/>
  <circle cx="120" cy="1380" r="360" fill="url(#glow{p})"/>
  <rect x="0" y="0" width="16" height="{PIN_H}" fill="url(#gv{p})"/>

  <text x="80" y="150" font-family="{SANS}" font-size="28" font-weight="700"
        letter-spacing="4" fill="{PURPLE}">{esc(pin['kicker'])}</text>
  <text font-family="{SANS}" font-size="{fs}" font-weight="800"
        fill="{INK}">{tspans}</text>
  <rect x="82" y="{title_bottom + 34}" width="120" height="9" rx="4"
        fill="url(#g{p})"/>

  <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="48"
        fill="#fff" stroke="{INK}" stroke-opacity="0.08"/>
  <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="48"
        fill="url(#glow{p})"/>
  {rows_svg}

  <text font-family="{SANS}" font-size="32" fill="{SUB}"
        text-anchor="middle">{bspans}</text>

  <line x1="330" y1="1392" x2="610" y2="1392" stroke="url(#g{p})"
        stroke-width="3" opacity="0.5"/>
  <text x="500" y="1352" font-family="{SANS}" font-size="26" font-weight="700"
        letter-spacing="3" fill="{PURPLE}" text-anchor="middle">{esc(cta)}</text>
  <g transform="translate(300 1432)">
    <rect x="0" y="-38" width="56" height="56" rx="16" fill="url(#gv{p})"/>
    <text x="28" y="3" font-family="{SANS}" font-size="34" font-weight="800"
          fill="#fff" text-anchor="middle">U</text>
    <text x="74" y="4" font-family="{SANS}" font-size="40" font-weight="800"
          fill="{INK}">UltraTextGen<tspan fill="{PURPLE}">.com{esc(url_suffix)}</tspan></text>
  </g>
</svg>"""


def _utm(base, campaign, slug):
    sep = "&" if "?" in base else "?"
    return (f"{base}{sep}utm_source=pinterest&utm_medium=social"
            f"&utm_campaign={campaign}&utm_content={slug}")


COLUMNS = ["slug", "image_path", "width", "height", "board", "pin_title",
           "pin_description", "pin_keywords", "pin_alt_text",
           "destination_url", "utm_destination_url"]


def build_board(locale, pins, board, dest, campaign, cta, url_suffix,
                describe, alt):
    """Render every pin, write the inventory CSV, and build the importer CSV.

    locale       e.g. "de" -> assets/pinterest/de/, data/de_pinterest_pins.csv
    pins         list of pin dicts (each: slug, kicker, headline, benefit,
                 rows, title, kw; optional `dest` overrides the destination URL)
    board        Pinterest board name (native)
    dest         default destination URL (the locale homepage)
    campaign     utm_campaign token
    cta          native tap-to-copy line shown on the pin
    url_suffix   path shown after the wordmark, e.g. "/de"
    describe     fn(pin) -> native pin description
    alt          fn(pin) -> native alt text
    """
    import cairosvg
    pin_dir = os.path.join(ROOT, "assets", "pinterest", locale)
    csv_out = os.path.join(ROOT, "data", f"{locale}_pinterest_pins.csv")
    os.makedirs(pin_dir, exist_ok=True)

    out = []
    for pin in pins:
        svg = pin_svg(pin, cta, url_suffix)
        path = os.path.join(pin_dir, f"{pin['slug']}.png")
        cairosvg.svg2png(bytestring=svg.encode(), write_to=path,
                         output_width=PIN_W, output_height=PIN_H)
        pin_dest = pin.get("dest", dest)
        out.append({
            "slug": pin["slug"],
            "image_path": f"assets/pinterest/{locale}/{pin['slug']}.png",
            "width": str(PIN_W), "height": str(PIN_H),
            "board": board,
            "pin_title": pin["title"],
            "pin_description": describe(pin),
            "pin_keywords": ", ".join(pin["kw"]),
            "pin_alt_text": alt(pin),
            "destination_url": pin_dest,
            "utm_destination_url": _utm(pin_dest, campaign, pin["slug"]),
        })
    with open(csv_out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    print(f"generated {len(out)} {locale} pins -> assets/pinterest/{locale}/")
    print(f"wrote inventory -> data/{locale}_pinterest_pins.csv")

    # build the Pinterest-importer CSV through the shared pipeline
    BU = _load(os.path.join(HERE, "build_pinterest_upload.py"), "buildupload")
    BU.convert(locale)

    for r in out:
        tl, dl = len(r["pin_title"]), len(r["pin_description"])
        flag = "" if (40 <= tl <= 100 and 100 <= dl <= 500) else "  <-- check len"
        print(f"  {r['slug']:22} title {tl:3} desc {dl:3}{flag}")
    return out
