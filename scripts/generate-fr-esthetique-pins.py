#!/usr/bin/env python3
"""
French "symboles esthétiques par ambiance" Pinterest board — the aesthetic/vibe
symbol collections (fr/library/symboles-{cottagecore,y2k,fairycore,witchy-occult,
goth-grunge,kawaii-cute,dreamcore-weirdcore,therian,coquette,coeur,etoiles,fleurs}).
Not a new pattern: mirrors the "Cute Symbols & Hearts to Copy and Paste" EN
collection-pin board strategy already documented in
docs/collection-pins-design-logic.md, applied to French for the first time.

Tier C evidence: only "therian" and "coquette" show direct French Google
query volume in the GSC data this was researched against — the rest is a
zero-marginal-cost bet on Pinterest's own aesthetic-browse culture, not a
query-volume-backed call.

Glyph safety: the live FR pages mix real combos with color emoji (🌷🦋🎀 etc.)
and a few exotic scripts (Linear A 𐙚, Tibetan marks, Egyptian hieroglyphs,
Bamum, Yi radicals) that do NOT rasterize with cairosvg + the installed font
stack (confirmed empirically, tofu boxes). Every row below is a pure-Unicode
subset of the real page's own combos (verified safe first) — color emoji and
broken-glyph combos are deliberately excluded from the *pin*, even though they
still appear correctly on the live page itself (browsers render them fine).

Run:  python3 scripts/generate-fr-esthetique-pins.py
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = importlib.util.spec_from_file_location(
    "lpk", os.path.join(HERE, "_locale_pin_kit.py"))
_m = importlib.util.module_from_spec(KIT)
KIT.loader.exec_module(_m)
build_board = _m.build_board

LOCALE = "fr_esthetique"
LIB = "https://ultratextgen.com/fr/library"

BOARD = "Symboles Esthétiques par Ambiance ✨"
CAMPAIGN = "fr_esthetique_pins"
CTA = "APPUYEZ POUR COPIER"
SUFFIX = "/fr"

PINS = [
    dict(slug="symboles-therian", dest=f"{LIB}/symboles-therian/",
         kicker="ULTRATEXTGEN · THERIAN",
         headline="Symboles Therian pour Profil",
         benefit="La marque theta-delta et les phases de lune à copier.",
         rows=[("Marque communautaire", "θ Δ"), ("Phases de lune", "☽ ☾")],
         title="Symboles Therian pour Profil & Pseudo — Copier-Coller",
         kw=["symbole therian", "symbole therian copier coller", "logo therian copier coller"]),
    dict(slug="symboles-coquette", dest=f"{LIB}/symboles-coquette/",
         kicker="ULTRATEXTGEN · COQUETTE",
         headline="Symboles Coquette pour Bio",
         benefit="Bordures douces et séparateurs coquette à copier-coller.",
         rows=[("Bordure fleurie", "⊹ ✿ ⋆ ✧ ⋆ ✿ ⊹"), ("Séparateur ruban", "❥ ⋆ ♡ ⋆ ❥"),
               ("Pseudo cœur ailé", "ʚ ♡ ɞ")],
         title="Symboles Coquette 🎀 pour Bio Instagram — Gratuit",
         kw=["symbole coquette", "coquette symbole"]),
    dict(slug="symboles-cottagecore", dest=f"{LIB}/symboles-cottagecore/",
         kicker="ULTRATEXTGEN · COTTAGECORE",
         headline="Symboles Cottagecore",
         benefit="Séparateurs et bordures nature à copier-coller.",
         rows=[("Séparateur nature", "✦ ⋆ ✿ ⋆ ✦"), ("Bordure lune", "☾ ⋆ ✦ ⋆ ☼")],
         title="Symboles Cottagecore à Copier-Coller — Gratuit",
         kw=["symbole cottagecore", "esthétique cottagecore"]),
    dict(slug="symboles-y2k", dest=f"{LIB}/symboles-y2k/",
         kicker="ULTRATEXTGEN · Y2K",
         headline="Symboles Y2K à Copier",
         benefit="Ambiance rétro 2000s pour bio et pseudo.",
         rows=[("Croix gothique", "♱ ✟ † ✟ ♱"), ("Étoile cyber", "✮ ⋆ ✧ ⋆ ✮")],
         title="Symboles Y2K à Copier-Coller — Bio Rétro 2000s",
         kw=["symbole y2k", "esthétique y2k"]),
    dict(slug="symboles-fairycore", dest=f"{LIB}/symboles-fairycore/",
         kicker="ULTRATEXTGEN · FAIRYCORE",
         headline="Symboles Fairycore ✨",
         benefit="Bordures féeriques douces à copier-coller.",
         rows=[("Bordure féerique", "⋆˚✿˖°"), ("Vague douce", "୨୧"),
               ("Bordure féerique", "⋆˚❀˖°")],
         title="Symboles Fairycore ✨ à Copier-Coller — Gratuit",
         kw=["symbole fairycore", "esthétique fairycore"]),
    dict(slug="symboles-witchy-occult", dest=f"{LIB}/symboles-witchy-occult/",
         kicker="ULTRATEXTGEN · WITCHY",
         headline="Symboles Witchy & Occultes",
         benefit="Lune, planètes et pentagrammes à copier-coller.",
         rows=[("Lune & soleil", "☽ ˚ ✴ ˚ ☉"), ("Traînée witchy", "✶ · ✴ · ✶"),
               ("Bio planétaire", "☽ ☿ ♀ ♂ ♃ ♄")],
         title="Symboles Witchy & Occultes à Copier-Coller",
         kw=["symbole witchy", "symbole occulte copier coller"]),
    dict(slug="symboles-goth-grunge", dest=f"{LIB}/symboles-goth-grunge/",
         kicker="ULTRATEXTGEN · GOTH",
         headline="Symboles Goth & Grunge",
         benefit="Croix et dagues pour une bio sombre.",
         rows=[("Croix goth", "† ˖ ♱ ˖ †"), ("Bordure dagues", "✟ · † ‡ † · ✟")],
         title="Symboles Goth & Grunge pour Bio Sombre — Gratuit",
         kw=["symbole goth", "symbole grunge copier coller"]),
    dict(slug="symboles-kawaii-cute", dest=f"{LIB}/symboles-kawaii-cute/",
         kicker="ULTRATEXTGEN · KAWAII",
         headline="Symboles Kawaii Mignons",
         benefit="Étincelles et poussière pastel à copier-coller.",
         rows=[("Sparkle kawaii", "⊹ ⋆ ✧ ⋆ ⊹"), ("Poussière pastel", "✦ ⋆ ❀ ⋆ ✦")],
         title="Symboles Kawaii Trop Mignons à Copier-Coller",
         kw=["symbole kawaii", "symbole mignon copier coller"]),
    dict(slug="symboles-dreamcore-weirdcore", dest=f"{LIB}/symboles-dreamcore-weirdcore/",
         kicker="ULTRATEXTGEN · DREAMCORE",
         headline="Symboles Dreamcore & Weirdcore",
         benefit="Ambiance glitch et liminale à copier-coller.",
         rows=[("Glitch liminal", "░ ▒ ▓ █ ▓ ▒ ░"), ("Distorsion", "▓ ▒ ░ ⋆ ░ ▒ ▓")],
         title="Symboles Dreamcore & Weirdcore à Copier-Coller",
         kw=["symbole dreamcore", "symbole weirdcore"]),
    dict(slug="symboles-coeur", dest=f"{LIB}/symboles-coeur/",
         kicker="ULTRATEXTGEN · CŒUR",
         headline="Symboles Cœur à Copier",
         benefit="Tous les styles de cœurs pour bio et pseudo.",
         rows=[("Bordure douce", "⋆ ˖ ˚ ♡ ˚ ˖ ⋆"), ("Traînée cœur", "♡ ˚ ♡ ˚ ♡"),
               ("Séparateur floral", "❦ ˖ ♡ ˖ ❧")],
         title="Symboles Cœur ♡ à Copier-Coller — Tous les Styles",
         kw=["symbole coeur", "symbole coeur clavier", "cœur symbole clavier"]),
    dict(slug="symboles-etoiles", dest=f"{LIB}/symboles-etoiles/",
         kicker="ULTRATEXTGEN · ÉTOILES",
         headline="Symboles Étoiles à Copier",
         benefit="Bordures scintillantes et notations à copier-coller.",
         rows=[("Bordure scintillante", "⋆ ˚ ✦ ✧ ✦ ˚ ⋆"), ("Notation", "★ ★ ★ ★ ★"),
               ("Accent scintillant", "✮ ⋆ ˙ ⭒ ˙ ⋆ ✮")],
         title="Symboles Étoiles ★ à Copier-Coller pour Bio",
         kw=["symbole étoile clavier", "étoile copier coller"]),
    dict(slug="symboles-fleurs", dest=f"{LIB}/symboles-fleurs/",
         kicker="ULTRATEXTGEN · FLEURS",
         headline="Symboles Fleurs à Copier",
         benefit="Bordures florales douces pour bio et pseudo.",
         rows=[("Bordure florale", "✿ ❀ ❁ ❀ ✿"), ("Points fleuris", "✾ · ❀ · ✾"),
               ("Fleurons", "❋ ❃ ❋ ❃ ❋")],
         title="Symboles Fleurs 🌸 à Copier-Coller — Bio Douce",
         kw=["symbole fleur copier coller"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Copie-les directement sur "
         f"UltraTextGen : gratuit, dans le navigateur, sans appli. Idéal pour "
         f"bio, pseudo et posts.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin vertical en français : {pin['headline']} — symboles à "
            f"copier-coller depuis UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, f"{LIB}/symboles-cottagecore/", CAMPAIGN,
                CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
