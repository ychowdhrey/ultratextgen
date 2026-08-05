#!/usr/bin/env python3
"""
French "kaomoji mignons" Pinterest board — the kaomoji library pages
(fr/library/{kaomoji,love-kaomoji,cat-kaomoji,cute-kaomoji}). Same zero-cost,
platform-fit logic as generate-fr-esthetique-pins.py — small GSC seed
("coeur kaomoji", "kaomoji copier coller"), pages already ship, zero
cannibalization risk against the existing 14-pin board.

Native-phrasing note: avoid "kikoo jap" — confirmed pejorative slang for this
content in French (forum-language-dictionary.csv) — never use it in pin copy.

Glyph safety: many real kaomoji on these pages use halfwidth Japanese forms
(｡ ･ ﾟ) and the modifier letter ᵕ, which do NOT rasterize with cairosvg + the
installed font stack (confirmed empirically, tofu boxes) even though they
render fine in any browser. Every kaomoji below was individually verified
tofu-free before use.

Run:  python3 scripts/generate-fr-kaomoji-pins.py
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = importlib.util.spec_from_file_location(
    "lpk", os.path.join(HERE, "_locale_pin_kit.py"))
_m = importlib.util.module_from_spec(KIT)
KIT.loader.exec_module(_m)
build_board = _m.build_board

LOCALE = "fr_kaomoji"
LIB = "https://ultratextgen.com/fr/library"

BOARD = "Kaomoji Mignons à Copier-Coller ✨"
CAMPAIGN = "fr_kaomoji_pins"
CTA = "APPUYEZ POUR COPIER"
SUFFIX = "/fr"

KAOMOJI = f"{LIB}/kaomoji/"
LOVE = f"{LIB}/love-kaomoji/"
CAT = f"{LIB}/cat-kaomoji/"
CUTE = f"{LIB}/cute-kaomoji/"

PINS = [
    dict(slug="kaomoji-mignons", dest=KAOMOJI,
         kicker="ULTRATEXTGEN · KAOMOJI",
         headline="Kaomoji Mignons à Copier",
         benefit="Des dizaines de kaomoji prêts à coller.",
         rows=[("Joyeux", "( ◜‿◝ )"), ("Content", "(=^◡^=)")],
         title="Kaomoji Mignons ᕕ(ᐛ)ᕗ à Copier-Coller — Gratuit",
         kw=["kaomoji copier coller"]),
    dict(slug="tous-les-kaomoji", dest=KAOMOJI,
         kicker="ULTRATEXTGEN · LISTE",
         headline="Tous les Kaomoji",
         benefit="Liste complète, classée par émotion, à copier-coller.",
         rows=[("Deux points", "(=^‥^=)"), ("Simple", "(=^‥^)")],
         title="Tous les Kaomoji — Liste Complète à Copier-Coller",
         kw=["kaomoji copier coller", "liste kaomoji"]),
    dict(slug="kaomoji-amour", dest=LOVE,
         kicker="ULTRATEXTGEN · AMOUR",
         headline="Kaomoji d'Amour",
         benefit="Pour dire je t'aime avec du style — copier-coller.",
         rows=[("Tendre", "(´• ω •`⊂)"), ("Sourire", "(*^3^)")],
         title="Kaomoji d'Amour ♡(ˆ⌣ˆԅ) à Copier-Coller — Gratuit",
         kw=["kaomoji amour", "kaomoji copier coller"]),
    dict(slug="kaomoji-coeur", dest=LOVE,
         kicker="ULTRATEXTGEN · CŒUR",
         headline="Kaomoji Cœur pour Bio",
         benefit="Pour bios et messages doux — copier-coller.",
         rows=[("Doux", "( ◜‿◝ )"), ("Câlin", "(´• ω •`⊂)")],
         title="Kaomoji Cœur pour Bio & Messages — Copier-Coller",
         kw=["coeur kaomoji", "kaomoji coeur"]),
    dict(slug="kaomoji-chat", dest=CAT,
         kicker="ULTRATEXTGEN · CHAT",
         headline="Kaomoji Chat à Copier",
         benefit="Émoticônes chat trop mignonnes, prêtes à coller.",
         rows=[("Chat content", "(=^▽^=)"), ("Chat calme", "(=˘ω˘=)")],
         title="Kaomoji Chat (=^･ω･^=) à Copier-Coller Gratuit",
         kw=["kaomoji chat"]),
    dict(slug="emoticones-chat-mignonnes", dest=CAT,
         kicker="ULTRATEXTGEN · MIGNON",
         headline="Émoticônes Chat Mignonnes",
         benefit="Toutes les variantes de chat kaomoji à copier-coller.",
         rows=[("Câlin", "(=^◡^=)"), ("Malicieux", "(=^‥^=)")],
         title="Emoticônes Chat Trop Mignonnes — Copier-Coller",
         kw=["kaomoji chat", "emoticone chat"]),
    dict(slug="kaomoji-cute", dest=CUTE,
         kicker="ULTRATEXTGEN · CUTE",
         headline="Kaomoji Cute à Copier",
         benefit="Les plus mignons, prêts à copier-coller.",
         rows=[("Adorable", "(◕‿◕)"), ("Timide", "(≖ ‿ ≖)")],
         title="Kaomoji Cute — Les Plus Mignons à Copier-Coller",
         kw=["kaomoji cute"]),
    dict(slug="smiley-japonais-mignons", dest=CUTE,
         kicker="ULTRATEXTGEN · SMILEY",
         headline="Smiley Japonais Mignons",
         benefit="Le style kaomoji japonais à copier-coller.",
         rows=[("Yeux ronds", "(◕‿◕)"), ("Câlin", "(◕ᴥ◕)")],
         title="Smiley Japonais Mignons à Copier-Coller — Gratuit",
         kw=["smiley japonais", "kaomoji copier coller"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Copie-les directement sur "
         f"UltraTextGen : gratuit, dans le navigateur, sans appli. Idéal pour "
         f"bio, messages et commentaires.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin vertical en français : {pin['headline']} — kaomoji à "
            f"copier-coller depuis UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, KAOMOJI, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
