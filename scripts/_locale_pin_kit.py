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

Local fallback (added 2026-09-10): when R2 credentials are not available in
the environment, `build_board(..., local_dir=<path>)` or `PIN_LOCAL_DIR=<path>`
renders the same 1000x1500 PNGs into that directory instead of uploading, and
writes a `manual-upload.csv` beside them (filename, title, description, link,
keywords, alt_text, board) so the owner can upload the pins by hand in the
Pinterest UI. Nothing else changes: the inventory CSV still records the R2
object key the pin WOULD have, and the importer CSV is still built through
build_pinterest_upload.py, so once the PNGs reach R2 the normal bulk-upload
path works unchanged. The directory must be OUTSIDE the repo tree -- pins are
never committed (see docs/pinterest-r2-migration.md) -- and the kit refuses
anything under ROOT.
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

# Hand-upload sheet written next to locally rendered PNGs (local fallback only).
MANUAL_COLUMNS = ["filename", "title", "description", "link", "keywords",
                  "alt_text", "board"]


def _resolve_local_dir(local_dir):
    """Validate the local-render directory: explicit arg wins over the
    PIN_LOCAL_DIR env var; must lie outside the repo tree."""
    local_dir = local_dir or os.environ.get("PIN_LOCAL_DIR")
    if not local_dir:
        return None
    local_dir = os.path.abspath(local_dir)
    root = os.path.abspath(ROOT)
    if os.path.commonpath([local_dir, root]) == root:
        raise SystemExit(
            f"_locale_pin_kit: local_dir {local_dir} is inside the repo -- pin "
            f"PNGs are never written into the tree (assets/ least of all). Use "
            f"a scratch directory outside the checkout.")
    os.makedirs(local_dir, exist_ok=True)
    return local_dir


def build_board(locale, pins, board, dest, campaign, cta, url_suffix,
                describe, alt, local_dir=None):
    """Render every pin, write the inventory CSV, and build the importer CSV.

    locale       e.g. "de" -> pinterest/boards/de/ on R2, data/de_pinterest_pins.csv
    pins         list of pin dicts (each: slug, kicker, headline, benefit,
                 rows, title, kw; optional `dest` overrides the destination URL)
    board        Pinterest board name (native)
    dest         default destination URL (the locale homepage)
    campaign     utm_campaign token
    cta          native tap-to-copy line shown on the pin
    url_suffix   path shown after the wordmark, e.g. "/de"
    describe     fn(pin) -> native pin description
    alt          fn(pin) -> native alt text
    local_dir    optional; render PNGs here instead of uploading to R2 (also
                 settable via PIN_LOCAL_DIR). Default None = upload to R2.
    """
    import sys
    sys.path.insert(0, os.path.join(ROOT, "scripts", "lib"))
    import r2_pinterest as R2
    csv_out = os.path.join(ROOT, "data", f"{locale}_pinterest_pins.csv")
    local_dir = _resolve_local_dir(local_dir)

    out = []
    manual = []
    uploaded = 0
    for pin in pins:
        svg = pin_svg(pin, cta, url_suffix)
        r2_key = f"pinterest/boards/{locale}/{pin['slug']}.png"
        if local_dir:
            png = R2.render_svg_png(svg, PIN_W, PIN_H)
            with open(os.path.join(local_dir, f"{pin['slug']}.png"), "wb") as f:
                f.write(png)
            status = "local"
        else:
            _, status = R2.render_and_upload(svg, r2_key, PIN_W, PIN_H)
        if status != "skipped-identical":
            uploaded += 1
        pin_dest = pin.get("dest", dest)
        out.append({
            "slug": pin["slug"],
            "image_path": r2_key,
            "width": str(PIN_W), "height": str(PIN_H),
            "board": board,
            "pin_title": pin["title"],
            "pin_description": describe(pin),
            "pin_keywords": ", ".join(pin["kw"]),
            "pin_alt_text": alt(pin),
            "destination_url": pin_dest,
            "utm_destination_url": _utm(pin_dest, campaign, pin["slug"]),
        })
        manual.append({
            "filename": f"{pin['slug']}.png",
            "title": pin["title"],
            "description": describe(pin),
            "link": _utm(pin_dest, campaign, pin["slug"]),
            "keywords": ", ".join(pin["kw"]),
            "alt_text": alt(pin),
            "board": board,
        })
    with open(csv_out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    if local_dir:
        sheet = os.path.join(local_dir, "manual-upload.csv")
        with open(sheet, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=MANUAL_COLUMNS)
            w.writeheader()
            w.writerows(manual)
        print(f"rendered {uploaded}/{len(out)} {locale} pins locally -> "
              f"{local_dir}/ (R2 not used; upload by hand with {sheet})")
    else:
        print(f"uploaded {uploaded}/{len(out)} {locale} pins -> R2 "
              f"{R2.public_base_url()}/pinterest/boards/{locale}/")
    print(f"wrote inventory -> data/{locale}_pinterest_pins.csv")

    # build the Pinterest-importer CSV through the shared pipeline
    BU = _load(os.path.join(HERE, "build_pinterest_upload.py"), "buildupload")
    BU.convert(locale)

    for r in out:
        tl, dl = len(r["pin_title"]), len(r["pin_description"])
        flag = "" if (40 <= tl <= 100 and 100 <= dl <= 500) else "  <-- check len"
        print(f"  {r['slug']:22} title {tl:3} desc {dl:3}{flag}")
    return out
