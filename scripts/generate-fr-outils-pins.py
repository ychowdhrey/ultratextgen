#!/usr/bin/env python3
"""
French "outils amusants" Pinterest board — the three remaining unpinned
fr/usecase/ pages: traducteur-emoji, ecriture-bio, vertical-text. Thin on
volume individually (21-76 impr each this window) but zero marginal cost
since all three ship already; bundled into one small board rather than each
getting its own near-empty one. Uses the shared scripts/_locale_pin_kit.py
renderer.

Run:  python3 scripts/generate-fr-outils-pins.py
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

LOCALE = "fr_outils"
BASE = "https://ultratextgen.com"
TRADUCTEUR = f"{BASE}/fr/usecase/traducteur-emoji/"
BIO = f"{BASE}/fr/usecase/ecriture-bio/"
VERTICAL = f"{BASE}/fr/usecase/vertical-text/"

BOARD = "Outils Amusants — Emoji, Bio & Texte Vertical ✨"
CAMPAIGN = "fr_outils_pins"
CTA = "APPUYEZ POUR ESSAYER"
SUFFIX = "/fr"

PINS = [
    dict(slug="traducteur-emoji", dest=TRADUCTEUR,
         kicker="ULTRATEXTGEN · EMOJI",
         headline="Traducteur de Texte en Emoji",
         benefit="Transforme tes phrases en emoji, pour rire avec tes amis.",
         rows=[("Phrase", "je t'aime"), ("Emoji", "❤️ 👉 👤")],
         title="Traducteur de Texte en Emoji — Gratuit et Amusant",
         kw=["traducteur emoji", "traduire en emoji", "générateur emoji phrase"]),
    dict(slug="traducteur-emoji-bio", dest=TRADUCTEUR,
         kicker="ULTRATEXTGEN · EMOJI",
         headline="Emoji pour ta Bio",
         benefit="Traduis ta bio ou ton statut en emoji amusants.",
         rows=[("Statut", "en ligne"), ("Emoji", "🟢 💬")],
         title="Traduis ta Bio en Emoji — Générateur Gratuit",
         kw=["traducteur emoji", "emoji bio générateur"]),
    dict(slug="ecriture-bio", dest=BIO,
         kicker="ULTRATEXTGEN · BIO",
         headline="Écriture Stylée pour ta Bio",
         benefit="Bio Instagram, TikTok ou Snapchat qui se démarque.",
         rows=[("Cursive", st("Script", "sois toi-même")),
               ("Petites capitales", smallcaps("libre et heureux")),
               ("Italique", st("Italic", "vis l'instant"))],
         title="Écriture Stylée pour ta Bio — Copier-Coller",
         kw=["écriture bio", "texte stylé pour bio", "bio stylée"]),
    dict(slug="idees-bio-stylee", dest=BIO,
         kicker="ULTRATEXTGEN · IDÉES",
         headline="Idées de Bio Stylée",
         benefit="Des exemples prêts à copier pour ta bio.",
         rows=[("Cursive", st("Script", "rêveuse et libre")),
               ("Ajouré", st("Double-struck", "juste moi"))],
         title="Idées de Bio Stylée — Exemples à Copier-Coller",
         kw=["idée bio stylée", "exemple bio instagram stylée"]),
    dict(slug="texte-vertical", dest=VERTICAL,
         kicker="ULTRATEXTGEN · VERTICAL",
         headline="Générateur de Texte Vertical",
         benefit="Écriture verticale empilée pour bio et posts.",
         rows=[("Empilé, lettre par lettre", "U ⋮ L ⋮ T ⋮ R ⋮ A")],
         title="Générateur de Texte Vertical — Écriture Empilée",
         kw=["texte vertical", "générateur texte vertical", "écriture verticale"]),
    dict(slug="texte-vertical-bio", dest=VERTICAL,
         kicker="ULTRATEXTGEN · VERTICAL",
         headline="Texte Vertical pour Bio",
         benefit="Empile ton pseudo ou ta bio, lettre par lettre.",
         rows=[("Empilé, lettre par lettre", "L ⋮ U ⋮ N ⋮ A")],
         title="Texte Vertical pour Bio — Copier-Coller Gratuit",
         kw=["texte vertical bio", "écriture verticale copier coller"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Gratuit sur UltraTextGen, "
         f"directement dans le navigateur, sans appli.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin vertical en français : {pin['headline']} — depuis "
            f"UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, TRADUCTEUR, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
