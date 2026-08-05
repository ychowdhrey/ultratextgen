#!/usr/bin/env python3
"""
French "pseudo stylé gaming & Discord" Pinterest board — unlike
generate-fr-pins.py (which drives everything to the /fr/ homepage), every pin
here points at the specific deep FR page that ranks for its own keyword
cluster: Fortnite/Free Fire/Roblox pseudo pages, the Discord font page, the
Discord symbols library page, and the Discord-safe-rename guide. Mirrors
scripts/generate-discord-pins.py's per-pin-destination pattern via the shared
scripts/_locale_pin_kit.py renderer (same brand skin as every other locale
board).

Rationale: real GSC volume (Fortnite/pseudo cluster 470 impr/12 clk, Discord
cluster 255 impr/5 clk this window) and forum research found zero Pinterest
competitor presence in this space despite real French competitor sites.

Run:  python3 scripts/generate-fr-gaming-pins.py
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

LOCALE = "fr_gaming"
BASE = "https://ultratextgen.com"
FORTNITE = f"{BASE}/fr/usecase/pseudo-fortnite/"
FREEFIRE = f"{BASE}/fr/usecase/pseudo-free-fire/"
GUILDE = f"{BASE}/fr/usecase/guilde-free-fire/"
ROBLOX = f"{BASE}/fr/library/symboles-roblox/"
PSEUDO_STYLE = f"{BASE}/fr/pseudo-style/"
INVISIBLE = f"{BASE}/fr/texte-invisible/"
DISCORD_FONT = f"{BASE}/fr/police-discord/"
DISCORD_SYM = f"{BASE}/fr/library/symboles-discord/"
DISCORD_GUIDE = f"{BASE}/fr/guide/pseudo-discord-sans-risque/"

BOARD = "Pseudo Stylé Gaming & Discord ✨"
CAMPAIGN = "fr_gaming_pins"
CTA = "APPUYEZ POUR COPIER"
SUFFIX = "/fr"

PINS = [
    dict(slug="pseudo-fortnite", dest=FORTNITE,
         kicker="ULTRATEXTGEN · FORTNITE",
         headline="Pseudo Fortnite Stylé",
         benefit="Génère et copie ton pseudo Fortnite en un clic.",
         rows=[("Gras", wrap("≪", st("Bold", "Sniper"), "≫")),
               ("Petites capitales", wrap("★", smallcaps("tryhard"), "★")),
               ("Gothique", wrap("⊱", st("Fraktur", "Reaper"), "⊰"))],
         title="Pseudo Fortnite Stylé — Génère et Copie ton Nom",
         kw=["pseudo fortnite stylé", "pseudo fortnite style",
             "caractère spéciaux fortnite", "symbole pseudo fortnite"]),
    dict(slug="fortnite-caracteres-speciaux", dest=FORTNITE,
         kicker="ULTRATEXTGEN · FORTNITE",
         headline="Caractères Spéciaux Pseudo Fortnite",
         benefit="Symboles et lettres stylées pour ton pseudo, à copier-coller.",
         rows=[("Symboles", "≪ ≫ ⊱ ⊰ ★ ✦ ⚡ †"),
               ("Ajouré", st("Double-struck", "King")),
               ("Mini lettre", smallcaps("mini"))],
         title="Caractères Spéciaux pour Pseudo Fortnite — Copier-Coller",
         kw=["caractere speciaux fortnite", "caractères spéciaux pseudo fortnite",
             "symbole fortnite", "mini lettre pour pseudo"]),
    dict(slug="pseudo-tryhard", dest=PSEUDO_STYLE,
         kicker="ULTRATEXTGEN · TRYHARD",
         headline="Pseudo Tryhard Stylé",
         benefit="Générateur de pseudo gratuit pour tous les jeux.",
         rows=[("Gras", st("Bold", "Sanz")), ("Ajouré", st("Double-struck", "Void")),
               ("Gothique", st("Fraktur", "Venom"))],
         title="Pseudo Tryhard Stylé — Générateur Gratuit",
         kw=["pseudo tryhard", "pseudo tryhard en x", "pseudo stylé",
             "générateur de pseudo"]),
    dict(slug="pseudo-free-fire", dest=FREEFIRE,
         kicker="ULTRATEXTGEN · FREE FIRE",
         headline="Pseudo Free Fire Stylé",
         benefit="12 caractères max — génère et copie ton pseudo FF.",
         rows=[("Gras", wrap("≪", st("Bold", "Zeus"), "≫")),
               ("Petites capitales", smallcaps("sniper")),
               ("Gothique", st("Fraktur", "Reaper"))],
         title="Pseudo Free Fire Stylé — 12 Caractères Max",
         kw=["pseudo free fire stylé", "pseudo free fire", "symbole pseudo free fire"]),
    dict(slug="symboles-free-fire", dest=FREEFIRE,
         kicker="ULTRATEXTGEN · FREE FIRE",
         headline="Symboles pour Pseudo Free Fire",
         benefit="Symboles et caractères spéciaux prêts à copier-coller.",
         rows=[("Symboles", "★ ⊱ ⊰ ♛ † ‡"), ("Ajouré", st("Double-struck", "Fire")),
               ("Gras", st("Bold", "Sanz"))],
         title="Symboles pour Pseudo Free Fire à Copier-Coller",
         kw=["symbole free fire", "caractère spécial free fire", "pseudo free fire"]),
    dict(slug="nom-guilde-free-fire", dest=GUILDE,
         kicker="ULTRATEXTGEN · GUILDE",
         headline="Nom de Guilde Free Fire Stylé",
         benefit="Générateur gratuit pour ton tag et ton nom de guilde.",
         rows=[("Gras", wrap("≪", st("Bold", "REX"), "≫")),
               ("Petites capitales", smallcaps("squad")),
               ("Ajouré", st("Double-struck", "Apex"))],
         title="Nom de Guilde Free Fire Stylé — Générateur Gratuit",
         kw=["nom de guilde free fire", "guilde free fire stylé"]),
    dict(slug="symboles-roblox", dest=ROBLOX,
         kicker="ULTRATEXTGEN · ROBLOX",
         headline="Symboles Roblox pour Pseudo",
         benefit="Symboles et lettres stylées pour ton nom Roblox.",
         rows=[("Symboles", "★ ⊱ ⊰ ✦ ⋆ ˚"), ("Gras", st("Bold", "Nova")),
               ("Petites capitales", smallcaps("robl0x"))],
         title="Symboles Roblox pour Pseudo & Bio — Copier-Coller",
         kw=["symbole roblox", "roblox copier coller"]),
    dict(slug="pseudo-roblox", dest=ROBLOX,
         kicker="ULTRATEXTGEN · ROBLOX",
         headline="Pseudo Roblox Stylé",
         benefit="Copie et colle ton pseudo Roblox stylé.",
         rows=[("Gras", st("Bold", "Nova")), ("Ajouré", st("Double-struck", "Nova")),
               ("Gothique", st("Fraktur", "Nova"))],
         title="Pseudo Roblox Stylé — Copie et Colle ton Nom",
         kw=["pseudo roblox stylé", "nom roblox stylé"]),
    dict(slug="nom-vide-invisible", dest=INVISIBLE,
         kicker="ULTRATEXTGEN · INVISIBLE",
         headline="Nom Vide / Pseudo Invisible",
         benefit="Espace invisible pour ton pseudo dans les jeux — copier-coller.",
         rows=[("Espace invisible", "[ ]  →  [⠀]"),
               ("Caractère invisible", "‎ (copie-le tel quel)"),
               ("Pseudo vide", "☐ → ☐")],
         title="Nom Vide / Pseudo Invisible pour Jeux — Copier-Coller",
         kw=["espace invisible pseudo", "caractère invisible", "pseudo vide"]),
    dict(slug="police-discord", dest=DISCORD_FONT,
         kicker="ULTRATEXTGEN · DISCORD",
         headline="Police Discord Stylée",
         benefit="Écriture stylée pour ton serveur, ton nom et ta bio.",
         rows=[("Gras", st("Bold", "serveur")), ("Mono", st("Monospace", "en ligne")),
               ("Ajouré", st("Double-struck", "guilde"))],
         title="Police Discord — Écriture Stylée pour ton Serveur",
         kw=["police discord", "police d'écriture discord", "police discord copier-coller",
             "ecriture special discord"]),
    dict(slug="bio-discord", dest=DISCORD_FONT,
         kicker="ULTRATEXTGEN · DISCORD",
         headline="Bio Discord Stylée",
         benefit="Personnalise ta bio et ton statut Discord — copier-coller.",
         rows=[("Cursive", st("Script", "en ligne")),
               ("Italique", st("Italic", "good vibes")),
               ("Petites capitales", smallcaps("afk"))],
         title="Bio Discord Stylée à Copier-Coller — Gratuit",
         kw=["bio discord copier coller", "ecriture stylé discord"]),
    dict(slug="symboles-discord", dest=DISCORD_SYM,
         kicker="ULTRATEXTGEN · DISCORD",
         headline="Symboles Discord à Copier",
         benefit="Décore tes salons et ton pseudo Discord.",
         rows=[("Salons", "︱ ┊ ⌗ ✦"), ("Séparateurs", "─── ✦ ───"),
               ("Déco", "★ ⊱ ⊰ ♛")],
         title="Symboles Discord à Copier-Coller — Déco de Salon",
         kw=["symbole discord", "discord caractère spéciaux"]),
    dict(slug="pseudo-discord-sans-risque", dest=DISCORD_GUIDE,
         kicker="ULTRATEXTGEN · GUIDE",
         headline="Pseudo Discord Sans Risque",
         benefit="Comment changer ton pseudo sans te faire bannir.",
         rows=[("Gras", st("Bold", "pseudo")), ("Ajouré", st("Double-struck", "safe")),
               ("Mono", st("Monospace", "✓ vérifié"))],
         title="Pseudo Discord Sans Risque — Guide Stylé",
         kw=["pseudo discord", "changer pseudo discord sans risque"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Tape une fois et copie tous les "
         f"styles Unicode sur UltraTextGen : gratuit, dans le navigateur, sans "
         f"appli. Idéal pour pseudos, guildes, serveurs et bios de jeux.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin vertical en français : {pin['headline']} — exemples de texte "
            f"stylé à copier-coller depuis UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, FORTNITE, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
