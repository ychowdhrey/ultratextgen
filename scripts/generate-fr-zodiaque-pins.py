#!/usr/bin/env python3
"""
French "symboles du zodiaque" Pinterest board — the 11 zodiac single-glyph
identity pages (fr/symbol/symbole-<sign>). Astrology is a strong, proven
Pinterest-native category (same logic as the aesthetic-vibe board), and every
page already ships. Uses the same single-glyph card template as
generate-fr-clavier-pins.py (built directly, not imported, to keep each board
script self-contained per house convention).

Cancer is deliberately excluded — it already has a pin in the Clavier board
(symbole-cancer), and this board isn't meant to duplicate that destination.

Glyph safety: all 11 zodiac glyphs were empirically verified to rasterize
cleanly (no tofu) with cairosvg + the installed font stack before use here.

Run:  python3 scripts/generate-fr-zodiaque-pins.py
Requires: cairosvg + fonts-symbola fonts-noto-core fonts-noto-extra fonts-noto-cjk
"""
import csv
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ART = _load(os.path.join(HERE, "generate-site-art.py"), "siteart")
PURPLE, BLUE, INK, SUB = ART.PURPLE, ART.BLUE, ART.INK, ART.SUB
PANEL, SANS = ART.PANEL, ART.SANS
defs, esc = ART.defs, ART.esc

IDG = _load(os.path.join(HERE, "generate-id-pins.py"), "idpins")
fit_size = IDG.fit_size
AES = IDG.AES

LOCALE = "fr_zodiaque"
BASE = "https://ultratextgen.com"
BOARD = "Symboles du Zodiaque à Copier-Coller ✨"
CAMPAIGN = "fr_zodiaque_pins"
CTA = "APPUYEZ POUR COPIER"
SUFFIX = "/fr"
PIN_W, PIN_H = 1000, 1500

SYM = f"{BASE}/fr/symbol"

GLYPHS = [
    dict(slug="symbole-belier", glyph="♈", name="Bélier",
         caption="21 mars – 19 avril",
         title="Symbole Bélier (♈) à Copier-Coller — Zodiaque",
         kw=["symbole bélier", "signe bélier symbole", "bélier astrologie"]),
    dict(slug="symbole-taureau", glyph="♉", name="Taureau",
         caption="20 avril – 20 mai",
         title="Symbole Taureau (♉) à Copier-Coller — Zodiaque",
         kw=["symbole taureau", "signe taureau symbole", "taureau astrologie"]),
    dict(slug="symbole-gemeaux", glyph="♊", name="Gémeaux",
         caption="21 mai – 20 juin",
         title="Symbole Gémeaux (♊) à Copier-Coller — Zodiaque",
         kw=["symbole gémeaux", "signe gémeaux symbole", "gémeaux astrologie"]),
    dict(slug="symbole-lion", glyph="♌", name="Lion",
         caption="23 juillet – 22 août",
         title="Symbole Lion (♌) à Copier-Coller — Zodiaque",
         kw=["symbole lion astrologie", "signe lion symbole"]),
    dict(slug="symbole-vierge", glyph="♍", name="Vierge",
         caption="23 août – 22 septembre",
         title="Symbole Vierge (♍) à Copier-Coller — Zodiaque",
         kw=["symbole vierge astrologie", "signe vierge symbole"]),
    dict(slug="symbole-balance", glyph="♎", name="Balance",
         caption="23 septembre – 22 octobre",
         title="Symbole Balance (♎) à Copier-Coller — Zodiaque",
         kw=["symbole balance astrologie", "signe balance symbole"]),
    dict(slug="symbole-scorpion", glyph="♏", name="Scorpion",
         caption="23 octobre – 21 novembre",
         title="Symbole Scorpion (♏) à Copier-Coller — Zodiaque",
         kw=["symbole scorpion astrologie", "signe scorpion symbole"]),
    dict(slug="symbole-sagittaire", glyph="♐", name="Sagittaire",
         caption="22 novembre – 21 décembre",
         title="Symbole Sagittaire (♐) à Copier-Coller — Zodiaque",
         kw=["symbole sagittaire", "signe sagittaire symbole"]),
    dict(slug="symbole-capricorne", glyph="♑", name="Capricorne",
         caption="22 décembre – 19 janvier",
         title="Symbole Capricorne (♑) à Copier-Coller — Zodiaque",
         kw=["symbole capricorne", "signe capricorne symbole"]),
    dict(slug="symbole-verseau", glyph="♒", name="Verseau",
         caption="20 janvier – 18 février",
         title="Symbole Verseau (♒) à Copier-Coller — Zodiaque",
         kw=["symbole verseau astrologie", "signe verseau symbole"]),
    dict(slug="symbole-poissons", glyph="♓", name="Poissons",
         caption="19 février – 20 mars",
         title="Symbole Poissons (♓) à Copier-Coller — Zodiaque",
         kw=["symbole poissons astrologie", "signe poissons symbole"]),
]


# ============================================================ single-glyph card
def glyph_pin_svg(pin):
    p = "zd" + pin["slug"].replace("-", "")[:8]
    name = esc(pin["name"])
    glyph = esc(pin["glyph"])
    caption = esc(pin["caption"])

    card_x, card_y, card_w, card_h = 80, 470, 840, 740
    size = fit_size([pin["glyph"]], 340, 160, 6)

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PIN_W} {PIN_H}"
     width="{PIN_W}" height="{PIN_H}">
  {defs(p)}
  <rect width="{PIN_W}" height="{PIN_H}" fill="{PANEL}"/>
  <rect width="{PIN_W}" height="{PIN_H}" fill="url(#dots{p})"/>
  <circle cx="860" cy="90" r="420" fill="url(#glow{p})"/>
  <circle cx="120" cy="1380" r="360" fill="url(#glow{p})"/>
  <rect x="0" y="0" width="16" height="{PIN_H}" fill="url(#gv{p})"/>

  <text x="80" y="150" font-family="{SANS}" font-size="28" font-weight="700"
        letter-spacing="4" fill="{PURPLE}">ULTRATEXTGEN · ZODIAQUE</text>
  <text x="80" y="250" font-family="{SANS}" font-size="72" font-weight="800"
        fill="{INK}">{name}</text>
  <rect x="82" y="284" width="120" height="9" rx="4" fill="url(#g{p})"/>

  <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="48"
        fill="#fff" stroke="{INK}" stroke-opacity="0.08"/>
  <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="48"
        fill="url(#glow{p})"/>
  <text x="500" y="{card_y + card_h//2 + int(size*0.32)}" font-family="{AES}"
        font-size="{size}" fill="{INK}" text-anchor="middle">{glyph}</text>

  <text x="500" y="{card_y + card_h - 56}" font-family="{SANS}" font-size="26"
        font-weight="700" fill="{PURPLE}" text-anchor="middle">{caption}</text>

  <text x="500" y="{card_y + card_h + 66}" font-family="{SANS}" font-size="32"
        fill="{SUB}" text-anchor="middle">Copie-le en un clic sur UltraTextGen</text>

  <line x1="330" y1="1392" x2="610" y2="1392" stroke="url(#g{p})"
        stroke-width="3" opacity="0.5"/>
  <text x="500" y="1352" font-family="{SANS}" font-size="26" font-weight="700"
        letter-spacing="3" fill="{PURPLE}" text-anchor="middle">{CTA}</text>
  <g transform="translate(300 1432)">
    <rect x="0" y="-38" width="56" height="56" rx="16" fill="url(#gv{p})"/>
    <text x="28" y="3" font-family="{SANS}" font-size="34" font-weight="800"
          fill="#fff" text-anchor="middle">U</text>
    <text x="74" y="4" font-family="{SANS}" font-size="40" font-weight="800"
          fill="{INK}">UltraTextGen<tspan fill="{PURPLE}">.com{SUFFIX}</tspan></text>
  </g>
</svg>"""


def _utm(base, slug):
    sep = "&" if "?" in base else "?"
    return (f"{base}{sep}utm_source=pinterest&utm_medium=social"
            f"&utm_campaign={CAMPAIGN}&utm_content={slug}")


def describe(pin):
    d = (f"Symbole {pin['name']} ({pin['glyph']}) — signe du zodiaque du "
         f"{pin['caption']}. Copie-le directement sur UltraTextGen, gratuit "
         f"et sans appli.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin vertical en français : symbole {pin['name']} — signe du "
            f"zodiaque à copier-coller depuis UltraTextGen.")


COLUMNS = ["slug", "image_path", "width", "height", "board", "pin_title",
           "pin_description", "pin_keywords", "pin_alt_text",
           "destination_url", "utm_destination_url"]


def main():
    import sys
    sys.path.insert(0, os.path.join(ROOT, "scripts", "lib"))
    import r2_pinterest as R2
    csv_out = os.path.join(ROOT, "data", f"{LOCALE}_pinterest_pins.csv")

    out = []
    for pin in GLYPHS:
        dest = f"{SYM}/{pin['slug']}/"
        svg = glyph_pin_svg(pin)
        r2_key = f"pinterest/boards/{LOCALE}/{pin['slug']}.png"
        R2.render_and_upload(svg, r2_key, PIN_W, PIN_H)
        out.append({
            "slug": pin["slug"],
            "image_path": r2_key,
            "width": str(PIN_W), "height": str(PIN_H),
            "board": BOARD, "pin_title": pin["title"],
            "pin_description": describe(pin),
            "pin_keywords": ", ".join(pin["kw"]),
            "pin_alt_text": alt(pin),
            "destination_url": dest,
            "utm_destination_url": _utm(dest, pin["slug"]),
        })

    with open(csv_out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    print(f"uploaded {len(out)} {LOCALE} pins -> R2 "
          f"{R2.public_base_url()}/pinterest/boards/{LOCALE}/")
    print(f"wrote inventory -> data/{LOCALE}_pinterest_pins.csv")

    BU = _load(os.path.join(HERE, "build_pinterest_upload.py"), "buildupload")
    BU.convert(LOCALE)

    for r in out:
        tl, dl = len(r["pin_title"]), len(r["pin_description"])
        flag = "" if (40 <= tl <= 100 and 100 <= dl <= 500) else "  <-- check len"
        print(f"  {r['slug']:26} title {tl:3} desc {dl:3}{flag}")


if __name__ == "__main__":
    main()
