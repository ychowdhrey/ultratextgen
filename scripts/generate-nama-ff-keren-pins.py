#!/usr/bin/env python3
"""
Generates a dedicated, single-destination Pinterest pin board for UltraTextGen:
every pin drives to https://ultratextgen.com/id/usecase/nama-ff-keren/.

Why a dedicated board (vs adding more to the existing "Gaming Symbols &
Usernames" board in generate-gaming-names-pins.py): that board is organised
across four different destinations (FF, guild, ML, English nickname). This
board is 100% single-destination — every pin is a different real angle
*already on* the nama-ff-keren page (the ready-made name lists by
cowok/cewek/old-pro/4-letter, the payung symbol hook, the spasi trick, the
belum-dipakai/unique-name pitch, the nama-epep synonym, the terminology FAQ,
the character-limit checker, the "kotak" troubleshooting FAQ) rather than one
pin per destination page. Each pin's copy is traceable to a real section or
FAQ answer already live on the page — nothing here is invented content.

It reuses the exact brand skin and the Unicode style transforms by importing
the shared helpers from generate-site-art.py and generate-id-pins.py (single
sources of truth), exactly like generate-gaming-names-pins.py does.

IMPORTANT (rasterization): the Javanese payung ꧁꧂ and Tibetan ༒ ༺ ༻ ࿐ glyphs do
NOT rasterize in the bundled pin fonts, so pin images use raster-safe
ornaments (≪ ≫ ⊱ ⊰ ❰ ❱ ★ ♛ † ✦) instead, same convention as the gaming-names
board. The literal payung frames still live on the HTML page itself.

Outputs:
  - assets/pinterest/nama-ff-keren/<slug>.png   1000x1500 vertical pins
  - data/nama_ff_keren_pinterest_pins.csv        internal inventory
  - data/nama_ff_keren_pinterest_pins_upload.csv Pinterest-importer-ready CSV

Pinterest board: this script writes "Nama FF Keren" into every row's `board`
field. That board does not exist yet on the UltraTextGen Pinterest account —
create it (exact name match) before importing the upload CSV, or let
Pinterest's bulk-create tool auto-create it on first import.

Run:  python3 scripts/generate-nama-ff-keren-pins.py
Requires: cairosvg + a font covering the Mathematical Alphanumeric block
          (apt: fonts-symbola fonts-noto-core fonts-noto-extra).
"""
import csv
import importlib.util
import os
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BOARD_SLUG = "nama-ff-keren"
PIN_DIR = os.path.join(ROOT, "assets", "pinterest", BOARD_SLUG)
CSV_OUT = os.path.join(ROOT, "data", "nama_ff_keren_pinterest_pins.csv")
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

# New, dedicated board — does not exist yet on the account (see docstring).
BOARD = "Nama FF Keren"

FF = f"{BASE}/id/usecase/nama-ff-keren/"
CTA_ID = "KETUK UNTUK SALIN"


# ============================================================ pin definitions
# Every pin destination is the same page. Each covers a distinct angle already
# live on that page (a ready-made name section, a how-to, or an FAQ answer) —
# see the page's own sections/FAQ for the source of each pin's copy.
PINS = [
    dict(
        slug="nama-ff-keren",
        kicker="ULTRATEXTGEN · FREE FIRE",
        headline="Nama FF Keren",
        benefit="Generator nama FF keren — bold, gotik, kursif, small caps, tinggal salin.",
        rows=[("Bold", wrap("≪", st("Bold", "SANZ"), "≫")),
              ("Gotik", wrap("⊱", st("Fraktur", "Reaper"), "⊰")),
              ("Kursif", wrap("✿", st("Script", "Luna"), "✿")),
              ("Small Caps", wrap("★", st("Small Caps", "king"), "★"))],
        title="Nama FF Keren — Generator Font & Simbol Nickname Free Fire",
        kw=["nama ff keren", "nickname ff", "nama ff", "font ff keren",
            "nama ff keren payung"],
    ),
    dict(
        slug="nama-ff-keren-cowok",
        kicker="ULTRATEXTGEN · FREE FIRE",
        headline="Nama FF Cowok Sangar",
        benefit="Nickname FF cowok yang sangar & pro — klik buat salin langsung.",
        rows=[("Bold", wrap("≪", st("Bold", "SANZ"), "≫")),
              ("Gotik", wrap("†", st("Fraktur", "Ravel"), "†")),
              ("Small Caps", wrap("⊱", st("Small Caps", "ghost"), "⊰")),
              ("Double-struck", wrap("★", st("Double-struck", "Blade"), "★"))],
        title="Nama FF Keren Cowok — Nickname Sangar Copy Paste",
        kw=["nama ff keren cowok", "nama ff cowok", "nickname ff cowok keren",
            "nama ff sangar", "nama ff keren pro"],
    ),
    dict(
        slug="nama-ff-keren-cewek",
        kicker="ULTRATEXTGEN · FREE FIRE",
        headline="Nama FF Cewek Aesthetic",
        benefit="Nama FF cewek lembut & estetik — bunga, bintang, font script.",
        rows=[("Script", wrap("✿", st("Script", "Aira"), "✿")),
              ("Script", wrap("❀", st("Script", "Sakura"), "❀")),
              ("Small Caps", wrap("˚✧", st("Small Caps", "bella"), "✧˚")),
              ("Double-struck", wrap("⊹", st("Double-struck", "Nova"), "⊹"))],
        title="Nama FF Keren Cewek — Nickname Aesthetic Copy Paste",
        kw=["nama ff keren cewek", "nama ff aesthetic", "nama ff cewek",
            "nickname ff cewek aesthetic", "nama ff keren perempuan"],
    ),
    dict(
        slug="nama-ff-keren-old-pro",
        kicker="ULTRATEXTGEN · FREE FIRE",
        headline="Nama FF Old & Pro Player",
        benefit="Gaya simpel & bersih, khas akun lama & pro player.",
        rows=[("Old", st("Small Caps", "badboy")),
              ("Pro", wrap("•", st("Small Caps", "pro"), "•")),
              ("Tag lama", "xX_" + st("Small Caps", "sniper") + "_Xx"),
              ("Trademark", st("Small Caps", "alpha") + "™")],
        title="Nama FF Keren Old & Pro Player — Nickname Simpel Copy Paste",
        kw=["nama ff keren old", "nama ff keren pro", "nama ff old",
            "nama ff keren 2021 pro player"],
    ),
    dict(
        slug="nama-ff-keren-4-huruf",
        kicker="ULTRATEXTGEN · FREE FIRE",
        headline="Nama FF Keren 4 Huruf",
        benefit="Nama pendek & gampang diinget — cocok buat clan tag.",
        rows=[("Bold", st("Bold", "ZAIN")),
              ("Small Caps", st("Small Caps", "king")),
              ("Gotik", st("Fraktur", "Fury")),
              ("Small Caps", wrap("•", st("Small Caps", "ace"), "•"))],
        title="Nama FF Keren 4 Huruf — Nickname Pendek Copy Paste",
        kw=["nama ff keren 4 huruf", "nama 4 huruf keren ff", "nama ff pendek"],
    ),
    dict(
        slug="nama-ff-keren-payung",
        kicker="ULTRATEXTGEN · SIMBOL",
        headline="Simbol Payung Nama FF",
        benefit="Bingkai payung Jawa & ornamen buat nickname Free Fire kamu.",
        rows=[("Payung", "≪ ≫   ⊰ ⊱"),
              ("Trisula & tengkorak", "☬ ⚔ †"),
              ("Bintang & mahkota", "★ ♛ ✦")],
        title="Simbol Payung Nama FF Keren — Bingkai & Ornamen Copy Paste",
        kw=["nama ff keren payung", "nama ff payung", "nama ff keren 2021 payung",
            "simbol nama ff"],
    ),
    dict(
        slug="cara-ganti-nama-ff",
        kicker="ULTRATEXTGEN · CARA PAKAI",
        headline="Cara Ganti Nama FF",
        benefit="Salin nama keren, tempel di kolom nickname pakai Kartu Ganti Nama.",
        rows=[("1", "Salin nama"),
              ("2", "Buka profil FF"),
              ("3", "Ketuk ikon pensil"),
              ("4", "Tempel & konfirmasi")],
        title="Cara Ganti Nama FF — Ganti Nickname Pakai Kartu Ganti Nama",
        kw=["ganti nama ff", "cara ganti nama ff", "cara mengganti nama ff",
            "aplikasi ganti nama ff"],
    ),
    dict(
        slug="nama-ff-spasi",
        kicker="ULTRATEXTGEN · FREE FIRE",
        headline="Nama FF Pakai Spasi",
        benefit="FF nolak spasi biasa — pakai karakter tak terlihat, ini triknya.",
        rows=[("Salin", "karakter spasi kosong"),
              ("Taruh", "di antara dua kata"),
              ("Hasil", "aman & ada spasinya")],
        title="Nama FF Pakai Spasi — Trik Karakter Tak Terlihat",
        kw=["spasi nama ff", "nama ff spasi", "nickname ff spasi",
            "nama ff keren pakai spasi"],
    ),
    dict(
        slug="nama-ff-belum-dipakai",
        kicker="ULTRATEXTGEN · FREE FIRE",
        headline="Nama FF Belum Dipakai",
        benefit="Kombinasi nama + font + simbol biar nickname kamu gak kembar.",
        rows=[("Font unik", st("Fraktur", "Nova")),
              ("+ simbol", wrap("⊱", st("Fraktur", "Nova"), "⊰")),
              ("= belum dipakai", wrap("★⊱", st("Fraktur", "Nova"), "⊰★"))],
        title="Nama FF Belum Dipakai & Unik — Racik Sendiri, Anti Kembar",
        kw=["nama ff keren yang belum dipakai", "nama ff yang belum dipakai",
            "nama ff keren 2021 yang belum dipakai"],
    ),
    dict(
        slug="nama-epep-keren",
        kicker="ULTRATEXTGEN · NAMA EPEP",
        headline="Nama Epep Keren",
        benefit="“Epep” = slang gamer buat Free Fire — generator nama epep di sini.",
        rows=[("Bold", wrap("≪", st("Bold", "EPEP"), "≫")),
              ("Gotik", st("Fraktur", "legend")),
              ("Small Caps", wrap("★", st("Small Caps", "savage"), "★"))],
        title="Nama Epep Keren — Generator Nickname Free Fire Gaul",
        kw=["nama epep keren", "nama epep", "nama ff keren"],
    ),
    dict(
        slug="nickname-ff-vs-nama-epep",
        kicker="ULTRATEXTGEN · FAQ",
        headline="Nickname FF vs Nama Epep",
        benefit="Tiga istilah, satu arti: nickname Free Fire yang dihias font & simbol.",
        rows=[("Nickname FF", "istilah Inggris"),
              ("Nama Epep", "slang gamer ID"),
              ("Nama FF Keren", "istilah umum")],
        title="Nickname FF vs Nama Epep vs Nama FF Keren — Bedanya Apa?",
        kw=["nickname ff", "nama epep", "nama ff keren", "nickname ff keren"],
    ),
    dict(
        slug="cek-nama-ff-karakter",
        kicker="ULTRATEXTGEN · CEK NAMA",
        headline="Cek Nama FF — Berapa Karakter?",
        benefit="FF cuma terima 12 karakter, simbol hias dihitung 2. Cek dulu sebelum tempel.",
        rows=[("Batas", "12 karakter"),
              ("Simbol", "= 2 karakter/simbol"),
              ("Contoh", "⊱KING⊰ = 8/12")],
        title="Cek Nama FF — Berapa Karakter Muat di Nickname Free Fire",
        kw=["nama ff maksimal berapa karakter", "batas karakter nama ff",
            "nickname ff keren simpel"],
    ),
    dict(
        slug="nama-ff-kotak-ditolak",
        kicker="ULTRATEXTGEN · FAQ",
        headline="Kenapa Nama FF Jadi Kotak?",
        benefit="Simbol langka kadang gak didukung — ganti ke gaya yang aman ini.",
        rows=[("Aman", "Small Caps & Bold"),
              ("Aman juga", "™ ★ ⊱ ⊰"),
              ("Kalau kotak", "ganti ke gaya lain")],
        title="Kenapa Nama FF Jadi Kotak? — Cara Perbaiki Nickname Ditolak",
        kw=["nama ff ditolak", "nama ff jadi kotak", "nickname ff error"],
    ),
]


# ============================================================ pin renderer
def pin_svg(pin):
    p = "nfk" + pin["slug"].replace("-", "")[:8]
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
        letter-spacing="3" fill="{PURPLE}" text-anchor="middle">{esc(CTA_ID)}</text>
  <g transform="translate(330 1432)">
    <rect x="0" y="-38" width="56" height="56" rx="16" fill="url(#gv{p})"/>
    <text x="28" y="3" font-family="{SANS}" font-size="34" font-weight="800"
          fill="#fff" text-anchor="middle">U</text>
    <text x="74" y="4" font-family="{SANS}" font-size="40" font-weight="800"
          fill="{INK}">UltraTextGen<tspan fill="{PURPLE}">.com</tspan></text>
  </g>
</svg>"""


# ============================================================ pin copy
def utm(slug):
    return (f"{FF}?utm_source=pinterest&utm_medium=social"
            f"&utm_campaign=nama_ff_keren_pins&utm_content={slug}")


def description(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Ketik nama kamu, pilih gaya font "
         f"& simbol, lalu salin. Gratis di UltraTextGen, langsung di browser, "
         f"tanpa aplikasi, buat nickname Free Fire.")
    if len(d) > 500:
        d = d[:497].rsplit(" ", 1)[0] + "…"
    return d


def alt(pin):
    return (f"Vertical Pinterest pin: {pin['headline']} — Free Fire nickname "
            f"example in Unicode fonts and symbols, from UltraTextGen.")


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
            "destination_url": FF,
            "utm_destination_url": utm(pin["slug"]),
        })
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    print(f"generated {len(out)} nama-ff-keren pins -> assets/pinterest/{BOARD_SLUG}/")
    print(f"wrote inventory -> data/nama_ff_keren_pinterest_pins.csv")

    conv = _load(os.path.join(HERE, "build_pinterest_upload.py"), "build_upload")
    conv.convert("nama_ff_keren")

    for r in out:
        tl, dl = len(r["pin_title"]), len(r["pin_description"])
        flag = "" if (40 <= tl <= 100 and 100 <= dl <= 500) else "  <-- check len"
        print(f"  {r['slug']:26} title {tl:3} desc {dl:3}{flag}")


if __name__ == "__main__":
    main()
