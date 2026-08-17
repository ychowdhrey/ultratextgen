#!/usr/bin/env python3
"""
French "symboles clavier" Pinterest board — single-glyph identity pages
(fr/symbol/*), each answering "comment taper ce symbole au clavier". Distinct
visual template from the other locale/topic boards: one large hero glyph
(not a multi-style demo), since these pages identify ONE symbol rather than
showcase font styles. Reuses the exact brand chrome (panel, dot grid, glow,
gradient spine, wordmark) from generate-site-art.py — only the card content
differs. The two collection/reference pins (codes-alt, alphabet-grec) reuse
the standard multi-row renderer from _locale_pin_kit.py instead, since they
list several items rather than identifying one.

Rationale: largest volume estimate in the whole competitor corpus (~206K/mo
across "clavier" keyword variants), picked here by real in-window GSC
page-level impressions (symbole-esperluette highest at 469).

Glyph safety: every glyph below was empirically verified to rasterize cleanly
(no tofu) with cairosvg + the installed font stack (fonts-symbola,
fonts-noto-core, fonts-noto-extra, fonts-noto-cjk) before being used here.

Run:  python3 scripts/generate-fr-clavier-pins.py
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
st, wrap, smallcaps, AES, fit_size = IDG.st, IDG.wrap, IDG.smallcaps, IDG.AES, IDG.fit_size

LPK = _load(os.path.join(HERE, "_locale_pin_kit.py"), "lpk")

LOCALE = "fr_clavier"
BASE = "https://ultratextgen.com"
BOARD = "Symboles Clavier — Comment Faire Chaque Symbole ✨"
CAMPAIGN = "fr_clavier_pins"
CTA = "APPUYEZ POUR COPIER"
SUFFIX = "/fr"
PIN_W, PIN_H = 1000, 1500

SYM = f"{BASE}/fr/symbol"
LIB = f"{BASE}/fr/library"

# ---------------------------------------------------------------- glyph pins
GLYPHS = [
    dict(slug="symbole-esperluette", glyph="&", name="Esperluette",
         caption="Alt+38 ou Maj+7 (AZERTY)",
         title="Comment Faire le Symbole Esperluette (&) au Clavier",
         kw=["esperluette clavier", "esperluette clavier azerty", "symbole et", "et symbole"]),
    dict(slug="symbole-coche", glyph="✓", name="Coche",
         caption="Alt+0252 (Wingdings) ou copier-coller",
         title="Symbole Coche (✓) — Copier-Coller & Raccourci Clavier",
         kw=["symbole coche", "coche clavier", "symbole copier coller"]),
    dict(slug="barre-verticale", glyph="|", name="Barre Verticale",
         caption="AltGr+6 (AZERTY)",
         title="Barre Verticale ( | ) — Comment la Taper au Clavier",
         kw=["barre verticale clavier", "symbole pipe clavier"]),
    dict(slug="symbole-plus-ou-moins", glyph="±", name="Plus ou Moins",
         caption="Alt+0177",
         title="Symbole Plus ou Moins (±) — Copier-Coller",
         kw=["symbole plus ou moins", "plus ou moins clavier"]),
    dict(slug="symbole-infini", glyph="∞", name="Infini",
         caption="Alt+236 — copier-coller",
         title="Symbole Infini (∞) — Copier-Coller & Signification",
         kw=["symbole infini", "symbole infini clavier", "signe infini"]),
    dict(slug="symbole-micro", glyph="µ", name="Micro (Mu)",
         caption="Alt+0181 (AZERTY : touche μ)",
         title="Symbole Micro (µ) — Comment le Taper au Clavier",
         kw=["symbole micro clavier", "symbole mu clavier"]),
    dict(slug="symbole-cancer", glyph="♋", name="Cancer (Zodiaque)",
         caption="Alt+9803 — copier-coller",
         title="Symbole Cancer (♋) — Copier-Coller (Astrologie)",
         kw=["symbole cancer astrologie", "signe cancer symbole", "cœur symbole clavier"]),
    dict(slug="symbole-guillemet", glyph="« »", name="Guillemets Français",
         caption="Alt+174 / Alt+175 (AZERTY)",
         title="Symbole Guillemet (« ») — Copier-Coller à la Française",
         kw=["guillemet clavier", "guillemets français clavier"]),
    dict(slug="symbole-etoile", glyph="★ ☆", name="Étoile",
         caption="Alt+9733 / Alt+9734",
         title="Symbole Étoile (★☆) — Tous les Styles à Copier",
         kw=["symbole étoile clavier", "étoile copier coller"]),
    dict(slug="symbole-different", glyph="≠", name='"Différent de"',
         caption="Alt+8800 — copier-coller",
         title='Symbole "Différent de" (≠) — Copier-Coller',
         kw=["symbole différent clavier", "signe différent de"]),
    dict(slug="symbole-carre-cube", glyph="² ³", name="Carré & Cube",
         caption="Alt+0178 / Alt+0179",
         title="Symbole Carré & Cube (² ³) — Comment les Taper",
         kw=["symbole carré clavier", "exposant clavier", "symbole cube clavier"]),
    dict(slug="symbole-marque-deposee", glyph="® ™", name="Marque Déposée",
         caption="Alt+0174 / Alt+0153",
         title="Symbole Marque Déposée (® ™) — Copier-Coller",
         kw=["symbole marque déposée", "symbole trademark clavier"]),
    dict(slug="symbole-racine-carree", glyph="√", name="Racine Carrée",
         caption="Alt+251 — copier-coller",
         title="Symbole Racine Carrée (√) — Copier-Coller",
         kw=["symbole racine carrée", "symbole racine carré clavier"]),
    dict(slug="symbole-fleche-bas", glyph="↓", name="Flèche vers le Bas",
         caption="Alt+25 — copier-coller",
         title="Flèche vers le Bas (↓) — Tous les Styles de Flèches",
         kw=["flèche bas clavier", "symbole flèche copier coller"]),
    dict(slug="symbole-division", glyph="÷", name="Division",
         caption="Alt+0247",
         title="Symbole Division (÷) — Copier-Coller Gratuit",
         kw=["symbole division clavier", "signe division"]),
    dict(slug="symbole-euro", glyph="€", name="Euro",
         caption="AltGr+E (AZERTY)",
         title="Symbole Euro (€) — Comment le Taper au Clavier",
         kw=["signe euro sur clavier", "euro clavier"]),
    dict(slug="symbole-arobase", glyph="@", name="Arobase",
         caption="AltGr+0 (AZERTY)",
         title="Symbole Arobase (@) — Comment le Taper au Clavier",
         kw=["arobase clavier", "symbole arobase azerty"]),
]

# Batch 2 — next tier by GSC page-level impressions (currencies, arrows,
# religious/cultural symbols), same pattern as the ID board's own "Batch 2".
# Zodiac signs are deliberately excluded here — they get their own themed
# board (generate-fr-zodiaque-pins.py) instead of folding into a utility one.
GLYPHS += [
    dict(slug="symbole-fleche-droite", glyph="→", name="Flèche vers la Droite",
         caption="Alt+26 — copier-coller",
         title="Flèche vers la Droite (→) — Copier-Coller Gratuit",
         kw=["flèche droite clavier", "symbole flèche copier coller"]),
    dict(slug="tiret-cadratin", glyph="—", name="Tiret Cadratin",
         caption="Alt+0151",
         title="Tiret Cadratin (—) — Comment le Taper au Clavier",
         kw=["tiret cadratin clavier", "tiret long clavier"]),
    dict(slug="symbole-inferieur-superieur", glyph="≤ ≥", name="Inférieur ou Égal / Supérieur ou Égal",
         caption="Alt+8804 / Alt+8805",
         title="Symbole Inférieur ou Égal (≤ ≥) — Copier-Coller",
         kw=["symbole inférieur ou égal", "symbole supérieur ou égal"]),
    dict(slug="symbole-anarchie", glyph="Ⓐ", name="Anarchie",
         caption="Copier-coller — pas de raccourci clavier standard",
         title="Symbole Anarchie (Ⓐ) — Copier-Coller Gratuit",
         kw=["symbole anarchie", "logo anarchie copier coller"]),
    dict(slug="symbole-degre", glyph="°", name="Degré",
         caption="Alt+0176",
         title="Symbole Degré (°) — Comment le Taper au Clavier",
         kw=["symbole degré clavier", "signe degré"]),
    dict(slug="point-interrogation-inverse", glyph="¿", name="Point d'Interrogation Inversé",
         caption="Alt+0191",
         title="Point d'Interrogation Inversé (¿) — Copier-Coller",
         kw=["point interrogation inversé", "point interrogation espagnol"]),
    dict(slug="symbole-fleche-gauche", glyph="←", name="Flèche vers la Gauche",
         caption="Alt+27 — copier-coller",
         title="Flèche vers la Gauche (←) — Copier-Coller Gratuit",
         kw=["flèche gauche clavier"]),
    dict(slug="symbole-won", glyph="₩", name="Won",
         caption="Alt+8361 — copier-coller",
         title="Symbole Won (₩) — Comment le Taper au Clavier",
         kw=["symbole won clavier", "signe won coréen"]),
    dict(slug="croix-orthodoxe", glyph="☦", name="Croix Orthodoxe",
         caption="Copier-coller — pas de raccourci clavier standard",
         title="Croix Orthodoxe (☦) — Copier-Coller Gratuit",
         kw=["croix orthodoxe symbole", "symbole religieux copier coller"]),
    dict(slug="symbole-croix", glyph="✝", name="Croix",
         caption="Copier-coller — pas de raccourci clavier standard",
         title="Symbole Croix (✝) — Copier-Coller Gratuit",
         kw=["symbole croix", "croix chrétienne symbole"]),
    dict(slug="symbole-copyright", glyph="©", name="Copyright",
         caption="Alt+0169",
         title="Symbole Copyright (©) — Comment le Taper au Clavier",
         kw=["symbole copyright clavier", "signe copyright"]),
    dict(slug="symbole-cent", glyph="¢", name="Cent",
         caption="Alt+0162",
         title="Symbole Cent (¢) — Comment le Taper au Clavier",
         kw=["symbole cent clavier", "signe cent dollar"]),
    dict(slug="symbole-danger-biologique", glyph="☣", name="Danger Biologique",
         caption="Copier-coller — pas de raccourci clavier standard",
         title="Symbole Danger Biologique (☣) — Copier-Coller",
         kw=["symbole danger biologique", "symbole biohazard"]),
    dict(slug="symbole-yen", glyph="¥", name="Yen",
         caption="Alt+0165",
         title="Symbole Yen (¥) — Comment le Taper au Clavier",
         kw=["symbole yen clavier", "signe yen japonais"]),
    dict(slug="symbole-recyclage", glyph="♻", name="Recyclage",
         caption="Copier-coller — pas de raccourci clavier standard",
         title="Symbole Recyclage (♻) — Copier-Coller Gratuit",
         kw=["symbole recyclage", "logo recyclage copier coller"]),
    dict(slug="symbole-sigma", glyph="Σ", name="Sigma",
         caption="Alt+228 — copier-coller",
         title="Symbole Sigma (Σ) — Copier-Coller Gratuit",
         kw=["symbole sigma clavier", "lettre grecque sigma"]),
    dict(slug="symbole-livre-sterling", glyph="£", name="Livre Sterling",
         caption="Alt+0163",
         title="Symbole Livre Sterling (£) — Comment le Taper",
         kw=["symbole livre sterling clavier", "signe livre anglaise"]),
    dict(slug="symbole-pentagramme", glyph="⛧", name="Pentagramme",
         caption="Copier-coller — pas de raccourci clavier standard",
         title="Symbole Pentagramme (⛧) — Copier-Coller Gratuit",
         kw=["symbole pentagramme", "pentagramme copier coller"]),
    dict(slug="symbole-roupie", glyph="₹", name="Roupie",
         caption="Alt+8377 — copier-coller",
         title="Symbole Roupie (₹) — Comment le Taper au Clavier",
         kw=["symbole roupie clavier", "signe roupie indienne"]),
    dict(slug="symbole-fleche-haut", glyph="↑", name="Flèche vers le Haut",
         caption="Alt+24 — copier-coller",
         title="Flèche vers le Haut (↑) — Copier-Coller Gratuit",
         kw=["flèche haut clavier"]),
    dict(slug="etoile-de-david", glyph="✡", name="Étoile de David",
         caption="Copier-coller — pas de raccourci clavier standard",
         title="Étoile de David (✡) — Copier-Coller Gratuit",
         kw=["étoile de david symbole", "symbole religieux juif"]),
    dict(slug="symbole-lilith", glyph="⚸", name="Lilith",
         caption="Copier-coller — pas de raccourci clavier standard",
         title="Symbole Lilith (⚸) — Copier-Coller Gratuit",
         kw=["symbole lilith", "lilith noire astrologie"]),
    dict(slug="symbole-celsius", glyph="℃", name="Celsius",
         caption="Alt+8451 — copier-coller",
         title="Symbole Celsius (℃) — Comment le Taper au Clavier",
         kw=["symbole celsius clavier", "degré celsius symbole"]),
    dict(slug="symbole-congruent", glyph="≅", name="Congruent",
         caption="Alt+8773 — copier-coller",
         title="Symbole Congruent (≅) — Copier-Coller Gratuit",
         kw=["symbole congruent", "signe congruence mathématique"]),
    dict(slug="symbole-fleur-de-lys", glyph="⚜", name="Fleur de Lys",
         caption="Copier-coller — pas de raccourci clavier standard",
         title="Symbole Fleur de Lys (⚜) — Copier-Coller",
         kw=["symbole fleur de lys", "fleur de lys copier coller"]),
    dict(slug="symbole-paragraphe", glyph="¶", name="Signe de Paragraphe",
         caption="Alt+0182",
         title="Signe de Paragraphe (¶) — Comment le Taper au Clavier",
         kw=["signe paragraphe clavier", "symbole paragraphe word"]),
    dict(slug="symbole-pied-de-mouche", glyph="¶", name="Pied-de-Mouche",
         caption="Alt+0182 — même symbole que le signe de paragraphe",
         title="Pied-de-Mouche (¶) — Copier-Coller & Origine",
         kw=["pied de mouche symbole", "pied de mouche typographie"]),
    dict(slug="symbole-ohm", glyph="Ω", name="Ohm",
         caption="Alt+234 — copier-coller",
         title="Symbole Ohm (Ω) — Comment le Taper au Clavier",
         kw=["symbole ohm clavier", "lettre grecque oméga"]),
]

# ------------------------------------------------------------- reference pins
# Multi-row hub pins — reuse the STANDARD renderer (rows-based), not the
# single-glyph card, since these list several items rather than one.
REFS = [
    dict(slug="codes-alt", dest=f"{LIB}/codes-alt/",
         kicker="ULTRATEXTGEN · RACCOURCIS",
         headline="Raccourcis Clavier pour Symboles",
         benefit="Tous les codes Alt pour taper un symbole sans le copier.",
         rows=[("Euro", "€  =  Alt+0128"), ("Marque déposée", "™  =  Alt+0153"),
               ("Degré", "°  =  Alt+0176")],
         title="Raccourcis Clavier pour Tous les Symboles — Liste Complète",
         kw=["raccourci clavier symbole", "code alt symbole", "symbole clavier"]),
    dict(slug="alphabet-grec", dest=f"{LIB}/alphabet-grec/",
         kicker="ULTRATEXTGEN · GREC",
         headline="Alphabet Grec à Copier",
         benefit="Toutes les lettres grecques, majuscules et minuscules.",
         rows=[("Majuscules", "Α Β Γ Δ Ω"), ("Minuscules", "α β γ δ ω"),
               ("Souvent cherché", "θ Δ Σ π")],
         title="Alphabet Grec — Toutes les Lettres à Copier-Coller",
         kw=["alphabet grec clavier", "lettres grecques copier coller"]),
]


# ============================================================ single-glyph card
def glyph_pin_svg(pin):
    p = "cl" + pin["slug"].replace("-", "")[:8]
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
        letter-spacing="4" fill="{PURPLE}">ULTRATEXTGEN · CLAVIER</text>
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


def describe_glyph(pin):
    d = (f"Comment taper le symbole {pin['name'].lower()} ({pin['glyph']}) au "
         f"clavier — {pin['caption']}. Ou copie-le directement sur "
         f"UltraTextGen, gratuit et sans appli.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt_glyph(pin):
    return (f"Pin vertical en français : symbole {pin['name']} ({pin['glyph']}) "
            f"— raccourci clavier et copier-coller depuis UltraTextGen.")


def describe_ref(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Copie-les directement sur "
         f"UltraTextGen : gratuit, dans le navigateur, sans appli.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt_ref(pin):
    return (f"Pin vertical en français : {pin['headline']} — symboles à "
            f"copier-coller depuis UltraTextGen.")


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
            "pin_description": describe_glyph(pin),
            "pin_keywords": ", ".join(pin["kw"]),
            "pin_alt_text": alt_glyph(pin),
            "destination_url": dest,
            "utm_destination_url": _utm(dest, pin["slug"]),
        })

    for pin in REFS:
        svg = LPK.pin_svg(pin, CTA, SUFFIX)
        r2_key = f"pinterest/boards/{LOCALE}/{pin['slug']}.png"
        R2.render_and_upload(svg, r2_key, PIN_W, PIN_H)
        out.append({
            "slug": pin["slug"],
            "image_path": r2_key,
            "width": str(PIN_W), "height": str(PIN_H),
            "board": BOARD, "pin_title": pin["title"],
            "pin_description": describe_ref(pin),
            "pin_keywords": ", ".join(pin["kw"]),
            "pin_alt_text": alt_ref(pin),
            "destination_url": pin["dest"],
            "utm_destination_url": _utm(pin["dest"], pin["slug"]),
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
