#!/usr/bin/env python3
"""
French "prénom à imprimer" Pinterest board — printable/visual-asset pages
(fr/imprimables/*), the site's actual differentiator vs. plain copy-paste font
clones. Verified competitor Pinterest accounts (coloryourname.net,
supercoloring.com) already prove this channel works in French for exactly this
content type. Uses the shared scripts/_locale_pin_kit.py renderer (same brand
skin as every other locale board) with per-pin destinations.

Native-phrasing note: French GSC data shows "lettres attachées" / "alphabet en
attaché" outperforms "cursif" ~5:1 for joined/cursive handwriting in a
school-tracing context — led with "attaché" here, "cursif" kept as secondary.

Run:  python3 scripts/generate-fr-imprimables-pins.py
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

LOCALE = "fr_imprimables"
BASE = "https://ultratextgen.com"
HUB = f"{BASE}/fr/imprimables/"
ATTACHE = f"{BASE}/fr/imprimables/alphabet-cursif/"
TRACER = f"{BASE}/fr/imprimables/prenom-a-tracer/"
BULLES = f"{BASE}/fr/imprimables/lettres-bulles/"
COLORIAGE = f"{BASE}/fr/imprimables/coloriage-alphabet/"

BOARD = "Prénom à Imprimer — Bulles, Attaché & Coloriage ✨"
CAMPAIGN = "fr_imprimables_pins"
CTA = "APPUYEZ POUR OUVRIR"
SUFFIX = "/fr"

PINS = [
    dict(slug="alphabet-attache", dest=ATTACHE,
         kicker="ULTRATEXTGEN · À IMPRIMER",
         headline="Alphabet en Lettres Attachées",
         benefit="Modèle complet A-Z à imprimer gratuitement.",
         rows=[("Attaché", st("Script", "abcde")),
               ("Attaché majuscule", st("Script", "ABCDE")),
               ("Cursif", st("Bold Script", "fghij"))],
         title="Alphabet en Lettres Attachées à Imprimer — Modèle A-Z",
         kw=["alphabet en attaché à imprimer", "lettres attachées à imprimer",
             "alphabet cursif"]),
    dict(slug="ecriture-attachee", dest=ATTACHE,
         kicker="ULTRATEXTGEN · CURSIVE",
         headline="Apprendre l'Écriture Attachée",
         benefit="Fiches gratuites pour s'entraîner à la cursive.",
         rows=[("Lettre en attaché", st("Script", "a")),
               ("Mot en attaché", st("Script", "prénom")),
               ("Cursif gras", st("Bold Script", "école"))],
         title="Apprendre l'Écriture Attachée (Cursive) — Fiches Gratuites",
         kw=["lettre en attaché à imprimer", "alphabet en cursif"]),
    dict(slug="prenom-a-tracer", dest=TRACER,
         kicker="ULTRATEXTGEN · TRAÇAGE",
         headline="Prénom à Tracer",
         benefit="Fiche d'écriture gratuite avec le contour de ton prénom.",
         rows=[("Contour", "┊L┊u┊n┊a┊"), ("Italique", st("Italic", "Luna")),
               ("Attaché", st("Script", "Luna"))],
         title="Prénom à Tracer — Fiche d'Écriture Gratuite à Imprimer",
         kw=["lettre à tracer à imprimer", "contour de lettre a imprimer",
             "générateur prénom cursive"]),
    dict(slug="fiche-tracage-cadeau", dest=TRACER,
         kicker="ULTRATEXTGEN · IDÉE CADEAU",
         headline="Fiche de Traçage Personnalisée",
         benefit="Idée cadeau de naissance : le prénom du bébé à tracer.",
         rows=[("Prénom", st("Script", "Emma")), ("Contour", "┊E┊m┊m┊a┊"),
               ("Italique", st("Italic", "Emma"))],
         title="Fiche de Traçage de Prénom — Idée Cadeau de Naissance",
         kw=["prénom en italique", "générateur prénom cursive"]),
    dict(slug="lettres-bulles", dest=BULLES,
         kicker="ULTRATEXTGEN · LETTRES BULLES",
         headline="Lettres Bulles à Imprimer",
         benefit="Tape n'importe quel mot ou prénom, imprime-le en bulles.",
         rows=[("Bulles", st("Circled", "LUNA")),
               ("Bulles minuscules", st("Circled", "luna")),
               ("Mono", st("Monospace", "luna"))],
         title="Lettres Bulles à Imprimer — Tape ton Mot ou Prénom",
         kw=["bulle a imprimer", "lettres bulles"]),
    dict(slug="coloriage-lettres-bulles", dest=BULLES,
         kicker="ULTRATEXTGEN · COLORIAGE",
         headline="Coloriage Lettres Bulles",
         benefit="Prénom en bulles à colorier, gratuit et imprimable.",
         rows=[("Bulles à colorier", st("Circled", "EMMA")),
               ("Crayon", "✎ ✏"), ("Contour", st("Circled", "abc"))],
         title="Coloriage Lettres Bulles — Prénom à Colorier, Gratuit",
         kw=["bulle a imprimer", "coloriage lettres bulles"]),
    dict(slug="deco-chambre-lettres-bulles", dest=BULLES,
         kicker="ULTRATEXTGEN · DÉCO CHAMBRE",
         headline="Idée Déco Chambre Enfant",
         benefit="Prénom en lettres bulles à imprimer et accrocher au mur.",
         rows=[("Bulles", st("Circled", "LEO")), ("Bulles", st("Circled", "MIA")),
               ("Bulles", st("Circled", "NOA"))],
         title="Idée Déco Chambre Enfant — Prénom en Lettres Bulles",
         kw=["lettres bulles à imprimer", "déco chambre enfant prénom"]),
    dict(slug="alphabet-a-colorier", dest=COLORIAGE,
         kicker="ULTRATEXTGEN · ALPHABET",
         headline="Alphabet à Colorier de A à Z",
         benefit="Gratuit et imprimable, chaque lettre en grand format.",
         rows=[("A à colorier", st("Circled", "A")),
               ("B à colorier", st("Circled", "B")),
               ("C à colorier", st("Circled", "C"))],
         title="Alphabet à Colorier de A à Z — Gratuit et Imprimable",
         kw=["alphabet à colorier à imprimer"]),
    dict(slug="coloriage-alphabet-grand-format", dest=COLORIAGE,
         kicker="ULTRATEXTGEN · GRAND FORMAT",
         headline="Coloriage Alphabet Grand Format",
         benefit="Chaque lettre imprimée en pleine page pour colorier.",
         rows=[("Grand format", st("Circled", "M")), ("Crayon", "✎ ✏"),
               ("Grand format", st("Circled", "N"))],
         title="Coloriage Alphabet — Chaque Lettre en Grand Format",
         kw=["alphabet à colorier à imprimer", "coloriage alphabet"]),
    dict(slug="fiches-personnalisees", dest=HUB,
         kicker="ULTRATEXTGEN · FICHES",
         headline="Fiches d'Écriture Personnalisées",
         benefit="Crée et imprime tes fiches gratuitement, en ligne.",
         rows=[("Attaché", st("Script", "prénom")),
               ("Bulles", st("Circled", "PRENOM")),
               ("Contour", "┊P┊r┊é┊n┊o┊m┊")],
         title="Fiches d'Écriture Personnalisées — Crée et Imprime",
         kw=["fiche d'écriture prénom", "fiches à imprimer gratuites"]),
    dict(slug="4-generateurs-a-imprimer", dest=HUB,
         kicker="ULTRATEXTGEN · 4 OUTILS",
         headline="4 Générateurs de Fiches à Imprimer",
         benefit="Bulles, attaché, coloriage, traçage — tout en un seul endroit.",
         rows=[("Bulles", st("Circled", "A")), ("Attaché", st("Script", "a")),
               ("Contour", "┊a┊")],
         title="4 Générateurs de Fiches à Imprimer — Bulles, Attaché, Coloriage",
         kw=["fiches à imprimer gratuites", "générateur fiche écriture"]),
    dict(slug="activite-jour-de-pluie", dest=HUB,
         kicker="ULTRATEXTGEN · ACTIVITÉ",
         headline="Idée Activité Enfant Jour de Pluie",
         benefit="Fiches à imprimer gratuites — bulles, coloriage et traçage.",
         rows=[("Bulles", st("Circled", "JOUE")), ("Crayon", "✎ ✏"),
               ("Attaché", st("Script", "amuse-toi"))],
         title="Idée Activité Enfant Jour de Pluie — Fiches Gratuites",
         kw=["activité enfant à imprimer", "fiches à imprimer gratuites"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Crée et imprime gratuitement sur "
         f"UltraTextGen : directement dans le navigateur, sans appli ni compte. "
         f"Idéal pour l'école, les cadeaux et la déco.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin vertical en français : {pin['headline']} — fiche à imprimer "
            f"générée sur UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, HUB, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
