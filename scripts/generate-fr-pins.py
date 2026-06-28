#!/usr/bin/env python3
"""
French "texte stylé / écriture aesthetic" Pinterest board — every pin drives to
https://ultratextgen.com/fr/ (the Zalgo pin to the /fr/ zalgo use case page).
Mirrors generate-es-pins.py via scripts/_locale_pin_kit.py. Topics track the
/fr/ page intent reinforced in the recent "écriture aesthetic + French zalgo"
PR: texte stylé à copier-coller, générateur de police, écriture aesthetic,
bio Instagram, cursive, pseudos, symboles, WhatsApp, gothique, TikTok, zalgo.

Run:  python3 scripts/generate-fr-pins.py
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

LOCALE = "fr"
DEST = "https://ultratextgen.com/fr/"
ZALGO = "https://ultratextgen.com/fr/usecase/zalgo-text/"
BOARD = "Texte Stylé & Écriture Aesthetic à Copier-Coller ✨"
CAMPAIGN = "fr_howto_pins"
CTA = "APPUYEZ POUR COPIER"
SUFFIX = "/fr"

PINS = [
    dict(slug="copier-coller", kicker="ULTRATEXTGEN · COMMENT FAIRE",
         headline="Texte Stylé à Copier-Coller",
         benefit="Tape ton texte et copie-le dans des dizaines de styles.",
         rows=[("normal", "style"), ("Cursive", st("Script", "style")),
               ("Gras", st("Bold", "style")), ("Ajouré", st("Double-struck", "style"))],
         title="Texte Stylé à Copier-Coller en Ligne — Gratuit",
         kw=["texte stylé à copier coller", "texte stylé", "écriture à copier",
             "police à copier coller", "copier coller"]),
    dict(slug="generateur-police", kicker="ULTRATEXTGEN · GÉNÉRATEUR",
         headline="Générateur de Police Stylée",
         benefit="Convertis ton texte en plein de polices à l'instant.",
         rows=[("normal", "texte"), ("Cursive", st("Script", "texte")),
               ("Gras", st("Bold", "texte")), ("Mono", st("Monospace", "texte"))],
         title="Générateur de Police Stylée — Copier-Coller",
         kw=["générateur de police", "police stylée", "générateur d'écriture",
             "police à copier", "texte stylé"]),
    dict(slug="ecriture-aesthetic", kicker="ULTRATEXTGEN · AESTHETIC",
         headline="Écriture Aesthetic à Copier",
         benefit="Style doux avec de jolis symboles pour tes réseaux.",
         rows=[("Cursive", wrap("✶", st("Script", "vibes"))),
               ("Italique", st("Italic", "soft")),
               ("Petites capitales", wrap("˚✧", smallcaps("aesthetic"), "✧˚"))],
         title="Écriture Aesthetic à Copier-Coller — Gratuit",
         kw=["écriture aesthetic", "police aesthetic", "texte aesthetic",
             "aesthetic", "texte stylé"]),
    dict(slug="instagram-bio", kicker="ULTRATEXTGEN · INSTAGRAM",
         headline="Écriture Stylée pour Bio Instagram",
         benefit="Décore ta bio, ton nom et tes stories Instagram.",
         rows=[("Cursive", wrap("✶", st("Script", "self love"))),
               ("Italique", wrap("⊹", st("Italic", "good vibes"))),
               ("Petites capitales", wrap("˚✧", smallcaps("sois toi"), "✧˚"))],
         title="Écriture Stylée pour Bio Instagram — Copier",
         kw=["écriture instagram", "bio instagram aesthetic", "police pour instagram",
             "texte stylé instagram", "aesthetic"]),
    dict(slug="cursive", kicker="ULTRATEXTGEN · CURSIVE",
         headline="Écriture Cursive à Copier",
         benefit="Cursive élégante prête à copier-coller.",
         rows=[("Cursive", st("Script", "salut")),
               ("Cursive Grasse", st("Bold Script", "salut")),
               ("Italique", st("Italic", "salut"))],
         title="Écriture Cursive à Copier-Coller — Gratuit",
         kw=["écriture cursive", "cursive à copier", "lettres cursives",
             "texte stylé", "calligraphie"]),
    dict(slug="pseudo", kicker="ULTRATEXTGEN · PSEUDO",
         headline="Ton Pseudo en Écriture Stylée",
         benefit="Convertis ton pseudo pour profils, jeux et nicks.",
         rows=[("Cursive", st("Script", "Lina")), ("Gras", st("Bold", "Lina")),
               ("Gothique", st("Fraktur", "Lina")), ("Ajouré", st("Double-struck", "Lina"))],
         title="Ton Pseudo en Écriture Stylée — Copier-Coller",
         kw=["pseudo stylé", "générateur de pseudo", "nom stylé", "texte stylé",
             "pseudo à copier"]),
    dict(slug="symboles", kicker="ULTRATEXTGEN · SYMBOLES",
         headline="Symboles Spéciaux à Copier",
         benefit="Ornements et symboles pour décorer ton texte en un clic.",
         rows=[("Cœurs & étoiles", "♡ ✶ ⋆ ˚ ✧ ♥"),
               ("Fleurs & déco", "❀ ✿ ⊹ ☆ ✰ ◇"),
               ("Séparateurs", "✦ ── ✦   ⊱ ⋆ ⊰")],
         title="Symboles Spéciaux à Copier-Coller — Déco Texte",
         kw=["symboles à copier", "symboles spéciaux", "caractères spéciaux",
             "symbole copier coller", "texte stylé"]),
    dict(slug="whatsapp", kicker="ULTRATEXTGEN · WHATSAPP",
         headline="Texte Stylé pour WhatsApp",
         benefit="Statut, nom et messages WhatsApp avec du style.",
         rows=[("Cursive", st("Script", "good vibes")),
               ("Gras Italique", st("Bold Italic", "sois heureux")),
               ("Mono", st("Monospace", "en ligne"))],
         title="Texte Stylé pour WhatsApp — Copier-Coller",
         kw=["texte stylé whatsapp", "écriture pour whatsapp", "statut whatsapp",
             "texte stylé", "copier coller"]),
    dict(slug="gothique", kicker="ULTRATEXTGEN · GOTHIQUE",
         headline="Écriture Gothique à Copier",
         benefit="Style sombre et élégant pour nicks, bios et posts.",
         rows=[("Gothique", st("Fraktur", "sombre")), ("Gothique", st("Fraktur", "Royaume")),
               ("Ajouré", st("Double-struck", "nuit"))],
         title="Écriture Gothique à Copier-Coller — Gratuit",
         kw=["écriture gothique", "lettres gothiques", "police gothique",
             "texte stylé", "dark"]),
    dict(slug="tiktok", kicker="ULTRATEXTGEN · TIKTOK",
         headline="Écriture Stylée pour TikTok",
         benefit="Personnalise ton nom et ta bio TikTok.",
         rows=[("Gras", st("Bold", "pseudo")), ("Mono", st("Monospace", "highlight")),
               ("Italique", st("Italic", "vibe"))],
         title="Écriture Stylée pour TikTok — Nom & Bio Copier",
         kw=["écriture pour tiktok", "police tiktok", "texte stylé tiktok",
             "texte stylé", "bio tiktok"]),
    dict(slug="gras", kicker="ULTRATEXTGEN · GRAS",
         headline="Écriture en Gras à Copier",
         benefit="Du gras qui fonctionne sur tous les réseaux sociaux.",
         rows=[("Gras", st("Bold", "TITRE")), ("Gras Italique", st("Bold Italic", "highlight")),
               ("Ajouré", st("Double-struck", "TITRE"))],
         title="Écriture en Gras à Copier-Coller — Gratuit",
         kw=["écriture en gras", "texte en gras", "gras à copier", "texte stylé",
             "copier coller"]),
    dict(slug="discord", kicker="ULTRATEXTGEN · DISCORD",
         headline="Police et Symboles pour Discord",
         benefit="Nom, pseudo et bio Discord avec du style.",
         rows=[("Gras", st("Bold", "serveur")), ("Mono", st("Monospace", "en ligne")),
               ("Ajouré", st("Double-struck", "guilde"))],
         title="Police et Symboles pour Discord — Copier-Coller",
         kw=["police discord", "écriture pour discord", "symboles discord",
             "texte stylé", "discord"]),
    dict(slug="citations", kicker="ULTRATEXTGEN · CITATIONS",
         headline="Citations en Écriture Stylée",
         benefit="Pour ta bio, tes statuts et tes publications.",
         rows=[("Cursive", st("Script", "brille toujours")),
               ("Italique", st("Italic", "good vibes")),
               ("Petites capitales", smallcaps("sois toi meme"))],
         title="Citations en Écriture Stylée — Copier-Coller",
         kw=["citations stylées", "phrases pour bio", "texte stylé pour statut",
             "texte stylé", "copier coller"]),
    dict(slug="zalgo", kicker="ULTRATEXTGEN · ZALGO", dest=ZALGO,
         headline="Texte Zalgo (Glitch) à Copier",
         benefit="Texte bugué et effrayant pour posts et pseudos.",
         rows=[("Zalgo", "t̷e̷x̷t̷e̷"), ("Glitch", "g̸l̸i̸t̸c̸h̸"),
               ("Effrayant", "e̶f̶f̶r̶a̶y̶a̶n̶t̶")],
         title="Texte Zalgo (Glitch) à Copier-Coller — Gratuit",
         kw=["texte zalgo", "générateur zalgo", "texte glitch", "texte effrayant",
             "texte stylé"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Tape une fois et copie tous les "
         f"styles Unicode sur UltraTextGen : gratuit, dans le navigateur, sans "
         f"appli. Idéal pour bio, nom, pseudo, statut et commentaires.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin vertical en français : {pin['headline']} — exemples de texte "
            f"stylé à copier-coller depuis UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, DEST, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
