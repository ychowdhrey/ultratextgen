#!/usr/bin/env python3
"""
Generates the gaming-name / nickname Pinterest pin board for UltraTextGen,
driving to the gaming-name JTBD pages:
  - /id/usecase/nama-ff-keren/        (Free Fire, Indonesian)
  - /id/usecase/nama-guild-ff-keren/  (FF guild/squad, Indonesian)
  - /id/usecase/nama-ml-keren/        (Mobile Legends, Indonesian)
  - /usecase/nickname-generator/      (stylish/cute nickname, English)

Why a dedicated set (vs scripts/generate-pinterest.py): this board is organised
by the *job* ("nama FF keren", "nama guild", "nickname ML") rather than by page,
and the hero is the literal decorated name — the thing searchers actually want
to preview. It files to the existing "Gaming Symbols & Usernames" board.

It reuses the exact brand skin and the Unicode style transforms by importing the
shared helpers from generate-site-art.py and generate-id-pins.py (single sources
of truth), then lays the styled-name rows onto the tall 1000x1500 pin.

IMPORTANT (rasterization): the Javanese payung ꧁꧂ and Tibetan ༒ ༺ ༻ ࿐ glyphs do
NOT rasterize in the bundled pin fonts, so the *pin images* use raster-safe
ornaments (≪ ≫ ⊱ ⊰ ★ ♛ † ✦) instead. The literal payung frames still live on the
HTML pages (where the user's browser font renders them) and in the CSV text.

Outputs:
  - assets/pinterest/gaming-names/<slug>.png   1000x1500 vertical pins
  - data/gaming_names_pinterest_pins.csv       internal inventory
  - data/gaming_names_pinterest_pins_upload.csv Pinterest-importer-ready CSV

Run:  python3 scripts/generate-gaming-names-pins.py
Requires: cairosvg + a font covering the Mathematical Alphanumeric block
          (apt: fonts-symbola fonts-noto-core fonts-noto-extra).
"""
import csv
import importlib.util
import os
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BOARD_SLUG = "gaming-names"
PIN_DIR = os.path.join(ROOT, "assets", "pinterest", BOARD_SLUG)
CSV_OUT = os.path.join(ROOT, "data", "gaming_names_pinterest_pins.csv")
os.makedirs(PIN_DIR, exist_ok=True)

PIN_W, PIN_H = 1000, 1500
BASE = "https://ultratextgen.com"


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# Shared brand system + Unicode style transforms (single sources of truth).
ID = _load(os.path.join(HERE, "generate-id-pins.py"), "idpins")
ART = ID.ART
PURPLE, BLUE, INK, SUB = ART.PURPLE, ART.BLUE, ART.INK, ART.SUB
PANEL, SANS = ART.PANEL, ART.SANS
defs, esc = ART.defs, ART.esc
AES = ID.AES
st, wrap, fit_size = ID.st, ID.wrap, ID.fit_size

# Real Pinterest board on the UltraTextGen account.
BOARD = "Gaming Symbols & Usernames"

FF = f"{BASE}/id/usecase/nama-ff-keren/"
GUILD = f"{BASE}/id/usecase/nama-guild-ff-keren/"
ML = f"{BASE}/id/usecase/nama-ml-keren/"
NICK = f"{BASE}/usecase/nickname-generator/"

CTA_ID = "KETUK UNTUK SALIN"
CTA_EN = "TAP TO COPY"


# ============================================================ pin definitions
PINS = [
    dict(
        slug="nama-ff-keren",
        dest=FF, cta=CTA_ID,
        kicker="ULTRATEXTGEN · FREE FIRE",
        headline="Nama FF Keren",
        benefit="Font & simbol keren buat nickname Free Fire — ketik, salin, tempel.",
        rows=[("Bold", wrap("≪", st("Bold", "SANZ"), "≫")),
              ("Small Caps", wrap("★", st("Small Caps", "savage"), "★")),
              ("Fraktur", wrap("⊱", st("Fraktur", "Reaper"), "⊰")),
              ("Double-struck", wrap("♛", st("Double-struck", "King"), "♛"))],
        title="Nama FF Keren — Simbol Payung ꧁꧂ & Font Nickname Free Fire",
        kw=["nama ff keren", "nama ff keren payung", "nickname ff keren",
            "simbol nama ff", "font ff keren"],
    ),
    dict(
        slug="nama-ff-keren-cowok",
        dest=FF, cta=CTA_ID,
        kicker="ULTRATEXTGEN · FREE FIRE",
        headline="Nama FF Cowok Keren",
        benefit="Nama FF cowok yang sangar buat push rank — tinggal salin.",
        rows=[("Bold", wrap("≪", st("Bold", "DARK"), "≫")),
              ("Fraktur", wrap("†", st("Fraktur", "Venom"), "†")),
              ("Small Caps", wrap("⊱", st("Small Caps", "predator"), "⊰")),
              ("Double-struck", wrap("★", st("Double-struck", "Zayn"), "★"))],
        title="Nama FF Keren Cowok — Nickname Free Fire Sangar Copy Paste",
        kw=["nama ff keren cowok", "nama ff keren", "nama ff cowok",
            "nickname ff cowok keren", "nama ff sangar"],
    ),
    dict(
        slug="nama-ff-keren-cewek",
        dest=FF, cta=CTA_ID,
        kicker="ULTRATEXTGEN · FREE FIRE",
        headline="Nama FF Cewek Aesthetic",
        benefit="Nama FF cewek yang aesthetic & lembut — font script plus bunga.",
        rows=[("Script", wrap("✿", st("Script", "Luna"), "✿")),
              ("Script", wrap("❀", st("Script", "Nayla"), "❀")),
              ("Small Caps", wrap("˚✧", st("Small Caps", "kiara"), "✧˚")),
              ("Double-struck", wrap("⊹", st("Double-struck", "Mia"), "⊹"))],
        title="Nama FF Keren Cewek — Nickname Free Fire Aesthetic Copy Paste",
        kw=["nama ff keren cewek", "nama ff aesthetic", "nama ff cewek",
            "nickname ff cewek aesthetic", "nama ff keren perempuan"],
    ),
    dict(
        slug="nama-guild-ff-keren",
        dest=GUILD, cta=CTA_ID,
        kicker="ULTRATEXTGEN · GUILD",
        headline="Nama Guild FF Keren",
        benefit="Tag squad pendek & nama tim Free Fire yang solid — salin & tempel.",
        rows=[("Bold", wrap("≪", st("Bold", "REX"), "≫")),
              ("Small Caps", wrap("★", st("Small Caps", "fury"), "★")),
              ("Double-struck", wrap("⊱", st("Double-struck", "Void"), "⊰")),
              ("Fraktur", wrap("⚔", st("Fraktur", "Apex"), "⚔"))],
        title="Nama Guild FF Keren — Tag Squad & Nama Tim Free Fire",
        kw=["nama guild ff keren", "nama squad ff keren", "tag guild ff",
            "nama tim ff keren", "nama guild ff"],
    ),
    dict(
        slug="nama-ml-keren",
        dest=ML, cta=CTA_ID,
        kicker="ULTRATEXTGEN · MOBILE LEGENDS",
        headline="Nama ML Keren",
        benefit="Font aesthetic & simbol buat nickname Mobile Legends — tinggal salin.",
        rows=[("Bold", wrap("≪", st("Bold", "KAIZEN"), "≫")),
              ("Fraktur", wrap("†", st("Fraktur", "Vanish"), "†")),
              ("Small Caps", wrap("⊱", st("Small Caps", "alucard"), "⊰")),
              ("Double-struck", wrap("♛", st("Double-struck", "Zeus"), "♛"))],
        title="Nama ML Keren — Font Aesthetic & Simbol Nickname Mobile Legends",
        kw=["nama ml keren", "font ml aesthetic", "nickname ml keren",
            "nama ml aesthetic", "nama mlbb keren"],
    ),
    dict(
        slug="nama-ml-keren-girl",
        dest=ML, cta=CTA_ID,
        kicker="ULTRATEXTGEN · MOBILE LEGENDS",
        headline="Nama ML Girl Aesthetic",
        benefit="Nama ML cewek yang aesthetic — font script, bunga & bintang kecil.",
        rows=[("Script", wrap("✿", st("Script", "Aira"), "✿")),
              ("Script", wrap("❀", st("Script", "Luna"), "❀")),
              ("Small Caps", wrap("˚✧", st("Small Caps", "kiara"), "✧˚")),
              ("Double-struck", wrap("⊹", st("Double-struck", "Diana"), "⊹"))],
        title="Nama ML Keren Girl — Nickname Mobile Legends Aesthetic Cewek",
        kw=["nama ml keren girl", "nama ml aesthetic girl", "nama ml cewek",
            "nickname ml girl aesthetic", "username ml aesthetic girl"],
    ),
    dict(
        slug="simbol-keren-nama-game",
        dest=FF, cta=CTA_ID,
        kicker="ULTRATEXTGEN · SIMBOL",
        headline="Simbol Keren Nama Game",
        benefit="Bingkai & ornamen buat hiasin nama FF, ML & game lain. Klik untuk salin.",
        rows=[("Bingkai", "≪ ≫   ⊱ ⊰   ❰ ❱"),
              ("Mahkota & belati", "♛ ♚ † ‡ ⚔"),
              ("Bintang & bunga", "★ ☆ ✦ ✶ ✿ ❀ ⊹")],
        title="Simbol Keren Nama Game — Bingkai & Ornamen Nickname Copy Paste",
        kw=["simbol nama keren", "simbol keren untuk nama", "simbol nama ff",
            "simbol nama game", "bingkai nama keren"],
    ),
    dict(
        slug="nickname-generator",
        dest=NICK, cta=CTA_EN,
        kicker="ULTRATEXTGEN · NICKNAME",
        headline="Nickname Generator",
        benefit="Type your name for stylish & cute nicknames with fonts and symbols.",
        rows=[("Bold", wrap("≪", st("Bold", "NOVA"), "≫")),
              ("Script", wrap("✿", st("Script", "Lily"), "✿")),
              ("Small Caps", wrap("★", st("Small Caps", "shadow"), "★")),
              ("Double-struck", wrap("♛", st("Double-struck", "Rex"), "♛"))],
        title="Nickname Generator — Stylish & Cute Name Maker Copy Paste",
        kw=["nickname generator", "stylish name maker", "cute name generator",
            "nickname ideas", "name generator"],
    ),
]


# ============================================================ pin renderer
def pin_svg(pin):
    p = "gn" + pin["slug"].replace("-", "")[:8]
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
    y = card_y + pad_top
    rows_svg = ""
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
        letter-spacing="3" fill="{PURPLE}" text-anchor="middle">{esc(pin['cta'])}</text>
  <g transform="translate(330 1432)">
    <rect x="0" y="-38" width="56" height="56" rx="16" fill="url(#gv{p})"/>
    <text x="28" y="3" font-family="{SANS}" font-size="34" font-weight="800"
          fill="#fff" text-anchor="middle">U</text>
    <text x="74" y="4" font-family="{SANS}" font-size="40" font-weight="800"
          fill="{INK}">UltraTextGen<tspan fill="{PURPLE}">.com</tspan></text>
  </g>
</svg>"""


# ============================================================ pin copy
def utm(slug, dest):
    sep = "&" if "?" in dest else "?"
    return (f"{dest}{sep}utm_source=pinterest&utm_medium=social"
            f"&utm_campaign=gaming_names_pins&utm_content={slug}")


def description(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Ketik nama kamu, pilih gaya font "
         f"& simbol, lalu salin. Gratis di UltraTextGen, langsung di browser, "
         f"tanpa aplikasi. Cocok buat Free Fire, Mobile Legends & game lain.")
    if pin["cta"] == CTA_EN:
        d = (f"{pin['headline']} — {pin['benefit']} Type once, copy stylish and "
             f"cute nickname styles with ꧁꧂ frames and symbols. Free in the "
             f"browser, no app, no sign-up. Works in games, TikTok, Instagram & Discord.")
    if len(d) > 500:
        d = d[:497].rsplit(" ", 1)[0] + "…"
    return d


def alt(pin):
    return (f"Vertical Pinterest pin: {pin['headline']} — decorated game name "
            f"examples in Unicode fonts and symbols, from UltraTextGen.")


COLUMNS = ["slug", "image_path", "width", "height", "board", "pin_title",
           "pin_description", "pin_keywords", "pin_alt_text",
           "destination_url", "utm_destination_url"]


def main():
    import cairosvg
    out = []
    for pin in PINS:
        svg = pin_svg(pin)
        path = os.path.join(PIN_DIR, f"{pin['slug']}.png")
        cairosvg.svg2png(bytestring=svg.encode(), write_to=path,
                         output_width=PIN_W, output_height=PIN_H)
        out.append({
            "slug": pin["slug"],
            "image_path": f"assets/pinterest/{BOARD_SLUG}/{pin['slug']}.png",
            "width": str(PIN_W), "height": str(PIN_H),
            "board": BOARD,
            "pin_title": pin["title"],
            "pin_description": description(pin),
            "pin_keywords": ", ".join(pin["kw"]),
            "pin_alt_text": alt(pin),
            "destination_url": pin["dest"],
            "utm_destination_url": utm(pin["slug"], pin["dest"]),
        })
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    print(f"generated {len(out)} gaming-name pins -> assets/pinterest/{BOARD_SLUG}/")
    print(f"wrote inventory -> data/gaming_names_pinterest_pins.csv")

    conv = _load(os.path.join(HERE, "build_pinterest_upload.py"), "build_upload")
    conv.convert("gaming_names")

    for r in out:
        tl, dl = len(r["pin_title"]), len(r["pin_description"])
        flag = "" if (40 <= tl <= 100 and 100 <= dl <= 500) else "  <-- check len"
        print(f"  {r['slug']:26} title {tl:3} desc {dl:3}{flag}")


if __name__ == "__main__":
    main()
