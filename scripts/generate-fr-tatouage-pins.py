#!/usr/bin/env python3
"""
French "police tatouage / écriture gothique" Pinterest board — the tattoo
lettering preview tool (fr/usecase/ecriture-tatouage) plus the dedicated deep
pages for gothic, cursive and calligraphy styles (distinct destinations from
the existing fr board's homepage-generic gothique/cursive pins). Uses the
shared scripts/_locale_pin_kit.py renderer.

Scope guardrail: GSC shows "tatouage" queries split into two different jobs —
lettering/style ("écriture gothique tatouage", "type d'écriture tatouage") vs.
meaning/interpretation ("signification symbole tatouage", a much larger but
unrelated cluster this site doesn't serve). Every pin here stays strictly on
lettering/style, never "signification"/"symbolique", so it doesn't pull in
meaning-seekers who'd bounce.

Run:  python3 scripts/generate-fr-tatouage-pins.py
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = importlib.util.spec_from_file_location(
    "lpk", os.path.join(HERE, "_locale_pin_kit.py"))
_m = importlib.util.module_from_spec(KIT)
KIT.loader.exec_module(_m)
st, wrap, smallcaps = _m.st, _m.wrap, _m.smallcaps
strike, under, build_board = _m.strike, _m.under, _m.build_board

LOCALE = "fr_tatouage"
BASE = "https://ultratextgen.com"
TATOUAGE = f"{BASE}/fr/usecase/ecriture-tatouage/"
GOTHIQUE = f"{BASE}/fr/ecriture-gothique/"
CURSIVE = f"{BASE}/fr/ecriture-cursive/"
CALLIGRAPHIE = f"{BASE}/fr/calligraphie/"

BOARD = "Police Tatouage & Écriture Gothique pour Prénom ✨"
CAMPAIGN = "fr_tatouage_pins"
CTA = "APPUYEZ POUR TESTER"
SUFFIX = "/fr"

PINS = [
    dict(slug="police-tatouage-prenom", dest=TATOUAGE,
         kicker="ULTRATEXTGEN · TATOUAGE",
         headline="Police d'Écriture pour Tatouage",
         benefit="Teste ton prénom dans plusieurs styles avant l'encre.",
         rows=[("Cursive", st("Script", "Luna")), ("Gothique", st("Fraktur", "Luna")),
               ("Fine", st("Italic", "Luna"))],
         title="Police d'Écriture pour Tatouage — Teste avant l'Encre",
         kw=["police tatouage prénom", "police tatouage"]),
    dict(slug="type-ecriture-tatouage", dest=TATOUAGE,
         kicker="ULTRATEXTGEN · STYLES",
         headline="Type d'Écriture pour Tatouage",
         benefit="Tous les styles à essayer avant de choisir.",
         rows=[("Script", st("Script", "toujours")), ("Fraktur", st("Fraktur", "toujours")),
               ("Double-struck", st("Double-struck", "toujours"))],
         title="Type d'Écriture pour Tatouage — Tous les Styles à Essayer",
         kw=["type d'écriture tatouage", "style d'écriture tatouage"]),
    dict(slug="style-ecriture-tatouage-apercu", dest=TATOUAGE,
         kicker="ULTRATEXTGEN · APERÇU",
         headline="Style d'Écriture Tatouage",
         benefit="Prévisualise ton texte dans chaque style avant l'encre.",
         rows=[("Cursive fine", st("Italic", "famille")),
               ("Cursive grasse", st("Bold Script", "famille")),
               ("Gothique", st("Fraktur", "famille"))],
         title="Style d'Écriture Tatouage — Prévisualise avant l'Encre",
         kw=["style d'écriture tatouage", "style d écriture tatouage"]),
    dict(slug="ecriture-gothique-tatouage", dest=GOTHIQUE,
         kicker="ULTRATEXTGEN · GOTHIQUE",
         headline="Écriture Gothique pour Tatouage",
         benefit="Lettres gothiques élégantes pour un prénom tatoué.",
         rows=[("Gothique", st("Fraktur", "Marie")), ("Gothique", st("Fraktur", "sombre")),
               ("Gothique", st("Fraktur", "Royaume"))],
         title="Écriture Gothique pour Tatouage de Prénom",
         kw=["écriture gothique tatouage", "tatouage gothique ecriture"]),
    dict(slug="tatouage-lettre-gothique-prenom", dest=GOTHIQUE,
         kicker="ULTRATEXTGEN · APERÇU GRATUIT",
         headline="Tatouage Lettre Gothique Prénom",
         benefit="Prévisualise ton prénom en gothique, gratuitement.",
         rows=[("Gothique", st("Fraktur", "Alexandre")),
               ("Gothique", st("Fraktur", "Camille")),
               ("Gothique", st("Fraktur", "Nathan"))],
         title="Tatouage Lettre Gothique Prénom — Aperçu Gratuit",
         kw=["tatouage lettre gothique prénom"]),
    dict(slug="ecriture-cursive-tatouage", dest=CURSIVE,
         kicker="ULTRATEXTGEN · CURSIVE",
         headline="Écriture Cursive pour Tatouage",
         benefit="Lettrage fin et élégant pour un prénom tatoué.",
         rows=[("Cursive", st("Script", "Émilie")), ("Cursive grasse", st("Bold Script", "Émilie")),
               ("Italique", st("Italic", "Émilie"))],
         title="Écriture Cursive pour Tatouage de Prénom",
         kw=["lettrage tatouage", "écriture cursive tatouage"]),
    dict(slug="calligraphie-tatouage", dest=CALLIGRAPHIE,
         kicker="ULTRATEXTGEN · CALLIGRAPHIE",
         headline="Calligraphie pour Tatouage",
         benefit="Styles calligraphiques pour un prénom tatoué avec finesse.",
         rows=[("Cursive grasse", st("Bold Script", "toujours")),
               ("Cursive", st("Script", "et à jamais")),
               ("Fraktur", st("Fraktur", "famille"))],
         title="Calligraphie pour Tatouage de Prénom — Aperçu Gratuit",
         kw=["calligraphie tatouage", "police tatouage"]),
    dict(slug="prenom-lettres-stylees-tatouage", dest=TATOUAGE,
         kicker="ULTRATEXTGEN · APERÇU",
         headline="Prénom en Lettres Stylées",
         benefit="Pour un tatouage — aperçu gratuit avant l'encre.",
         rows=[("Cursive", st("Script", "Chloé")), ("Gothique", st("Fraktur", "Chloé")),
               ("Fine", st("Italic", "Chloé"))],
         title="Prénom en Lettres Stylées pour Tatouage — Aperçu Gratuit",
         kw=["police tatouage prénom", "type d'écriture tatouage"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Tape ton prénom sur UltraTextGen "
         f"et prévisualise-le dans chaque style avant de le montrer à ton "
         f"tatoueur : gratuit, dans le navigateur, sans appli.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin vertical en français : {pin['headline']} — aperçu de style "
            f"d'écriture pour tatouage depuis UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, TATOUAGE, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
