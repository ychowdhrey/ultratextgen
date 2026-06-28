#!/usr/bin/env python3
"""
German "schöne Schrift & coole Symbole" Pinterest board — every pin drives to
https://ultratextgen.com/de/ (the Zalgo pin to the /de/ zalgo use case page).
Mirrors generate-es-pins.py via scripts/_locale_pin_kit.py. Topics track the
/de/ page intent reinforced in the recent "Schriftarten und Symbole" + Discord
PR: schöne/coole Schrift zum Kopieren, Schriftarten, Insta-Bio, Schreibschrift,
Gamer-Namen, Discord, WhatsApp-Status, Symbole, TikTok, gotische Schrift, fett.

Run:  python3 scripts/generate-de-pins.py
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

LOCALE = "de"
DEST = "https://ultratextgen.com/de/"
ZALGO = "https://ultratextgen.com/de/usecase/zalgo-text/"
BOARD = "Schöne Schrift & coole Symbole zum Kopieren ✨"
CAMPAIGN = "de_howto_pins"
CTA = "ZUM KOPIEREN TIPPEN"
SUFFIX = "/de"

PINS = [
    dict(slug="schrift-kopieren", kicker="ULTRATEXTGEN · SO GEHT'S",
         headline="Schöne Schrift zum Kopieren",
         benefit="Tippe deinen Text und kopiere ihn in vielen Stilen.",
         rows=[("normal", "stil"), ("Schreibschrift", st("Script", "stil")),
               ("Fett", st("Bold", "stil")), ("Outline", st("Double-struck", "stil"))],
         title="Schöne Schrift zum Kopieren und Einfügen — Gratis",
         kw=["schöne schrift zum kopieren", "schöne schrift", "schrift zum kopieren",
             "schöne schriftarten", "kopieren und einfügen"]),
    dict(slug="schriftarten", kicker="ULTRATEXTGEN · SCHRIFTARTEN",
         headline="Coole Schriftarten und Symbole",
         benefit="Wandle deinen Text sofort in viele Schriftarten um.",
         rows=[("Fett", st("Bold", "text")), ("Schreibschrift", st("Script", "text")),
               ("Fraktur", st("Fraktur", "text")), ("Mono", st("Monospace", "text"))],
         title="Coole Schriftarten und Symbole zum Kopieren",
         kw=["coole schriftarten", "schriftarten und symbole", "schriftarten zum kopieren",
             "schriftgenerator", "schöne schrift"]),
    dict(slug="schrift-generator", kicker="ULTRATEXTGEN · GENERATOR",
         headline="Schriftgenerator zum Kopieren",
         benefit="Ein Klick — viele Stile zum Einfügen überall.",
         rows=[("Fett", st("Bold", "stil")), ("Kursiv", st("Italic", "stil")),
               ("Schreibschrift", st("Script", "stil")), ("Kapitälchen", smallcaps("stil"))],
         title="Schriftgenerator zum Kopieren und Einfügen",
         kw=["schriftgenerator", "schrift generator", "schriftarten generator",
             "schöne schrift", "kopieren und einfügen"]),
    dict(slug="instagram-bio", kicker="ULTRATEXTGEN · INSTAGRAM",
         headline="Schöne Schrift für Instagram Bio",
         benefit="Gestalte Bio, Name und Stories auf Instagram.",
         rows=[("Schreibschrift", wrap("✶", st("Script", "self love"))),
               ("Kursiv", wrap("⊹", st("Italic", "good vibes"))),
               ("Kapitälchen", wrap("˚✧", smallcaps("sei du selbst"), "✧˚"))],
         title="Schöne Schrift für Instagram Bio — Copy Paste",
         kw=["schrift für instagram", "instagram bio schrift", "instagram bio aesthetic",
             "schöne schrift instagram", "aesthetic"]),
    dict(slug="schreibschrift", kicker="ULTRATEXTGEN · SCHREIBSCHRIFT",
         headline="Schreibschrift zum Kopieren",
         benefit="Elegante Schreibschrift, fertig zum Einfügen.",
         rows=[("Schreibschrift", st("Script", "hallo")),
               ("Fette Schreibschrift", st("Bold Script", "hallo")),
               ("Kursiv", st("Italic", "hallo"))],
         title="Schreibschrift zum Kopieren — Schöne Schrift",
         kw=["schreibschrift zum kopieren", "schreibschrift", "kursive schrift",
             "schöne schrift", "handschrift"]),
    dict(slug="namen", kicker="ULTRATEXTGEN · NAMEN",
         headline="Dein Name in schöner Schrift",
         benefit="Wandle deinen Namen für Profile und Nicks um.",
         rows=[("Schreibschrift", st("Script", "Mia")), ("Fett", st("Bold", "Mia")),
               ("Fraktur", st("Fraktur", "Mia")), ("Outline", st("Double-struck", "Mia"))],
         title="Dein Name in schöner Schrift zum Kopieren — Gratis",
         kw=["name in schöner schrift", "namen in schöner schrift", "schöne namen",
             "schöne schrift", "name umwandeln"]),
    dict(slug="discord", kicker="ULTRATEXTGEN · DISCORD",
         headline="Schrift und Symbole für Discord",
         benefit="Name, Nickname und Bio auf Discord mit Stil.",
         rows=[("Fett", st("Bold", "server")), ("Mono", st("Monospace", "online")),
               ("Outline", st("Double-struck", "gilde"))],
         title="Schrift und Symbole für Discord — Kopieren",
         kw=["discord schrift", "schrift für discord", "discord symbole",
             "discord schriftarten", "schöne schrift"]),
    dict(slug="whatsapp", kicker="ULTRATEXTGEN · WHATSAPP",
         headline="Schöne Schrift für WhatsApp",
         benefit="Status, Name und Nachrichten mit Stil.",
         rows=[("Schreibschrift", st("Script", "good vibes")),
               ("Fett Kursiv", st("Bold Italic", "sei froh")),
               ("Mono", st("Monospace", "online"))],
         title="Schöne Schrift für WhatsApp — Status Kopieren",
         kw=["schrift für whatsapp", "whatsapp status schrift", "whatsapp schriftarten",
             "schöne schrift", "kopieren und einfügen"]),
    dict(slug="symbole", kicker="ULTRATEXTGEN · SYMBOLE",
         headline="Coole Symbole zum Kopieren",
         benefit="Verzierungen und Symbole für deinen Text mit einem Klick.",
         rows=[("Herzen & Sterne", "♡ ✶ ⋆ ˚ ✧ ♥"),
               ("Blumen & Deko", "❀ ✿ ⊹ ☆ ✰ ◇"),
               ("Trenner", "✦ ── ✦   ⊱ ⋆ ⊰")],
         title="Coole Symbole zum Kopieren — Text verzieren",
         kw=["coole symbole zum kopieren", "symbole zum kopieren", "symbole",
             "zeichen zum kopieren", "schöne schrift"]),
    dict(slug="tiktok", kicker="ULTRATEXTGEN · TIKTOK",
         headline="Schöne Schrift für TikTok",
         benefit="Gestalte Name und Bio auf TikTok.",
         rows=[("Fett", st("Bold", "nutzer")), ("Mono", st("Monospace", "highlight")),
               ("Kursiv", st("Italic", "vibe"))],
         title="Schöne Schrift für TikTok — Name & Bio Kopieren",
         kw=["schrift für tiktok", "tiktok schriftarten", "tiktok bio schrift",
             "schöne schrift", "tiktok name"]),
    dict(slug="gotische-schrift", kicker="ULTRATEXTGEN · GOTISCH",
         headline="Gotische Schrift zum Kopieren",
         benefit="Dunkler, eleganter Stil für Nicks, Bios und Posts.",
         rows=[("Fraktur", st("Fraktur", "dunkel")), ("Fraktur", st("Fraktur", "Reich")),
               ("Outline", st("Double-struck", "nacht"))],
         title="Gotische Schrift zum Kopieren und Einfügen — Fraktur",
         kw=["gotische schrift", "gotische schrift zum kopieren", "fraktur schrift",
             "schöne schrift", "altdeutsche schrift"]),
    dict(slug="fette-schrift", kicker="ULTRATEXTGEN · FETT",
         headline="Fette Schrift zum Kopieren",
         benefit="Fettschrift, die in jedem sozialen Netzwerk wirkt.",
         rows=[("Fett", st("Bold", "TITEL")), ("Fett Kursiv", st("Bold Italic", "highlight")),
               ("Outline", st("Double-struck", "TITEL"))],
         title="Fette Schrift zum Kopieren und Einfügen — Gratis",
         kw=["fette schrift", "fett schreiben", "fette schrift zum kopieren",
             "schöne schrift", "kopieren und einfügen"]),
    dict(slug="aesthetic", kicker="ULTRATEXTGEN · AESTHETIC",
         headline="Aesthetic Schrift zum Kopieren",
         benefit="Sanfter Stil mit hübschen Symbolen für deine Profile.",
         rows=[("Schreibschrift", wrap("✶", st("Script", "vibes"))),
               ("Kursiv", st("Italic", "soft")),
               ("Kapitälchen", wrap("˚✧", smallcaps("aesthetic"), "✧˚"))],
         title="Aesthetic Schrift zum Kopieren und Einfügen",
         kw=["aesthetic schrift", "aesthetic", "aesthetic font", "schöne schrift",
             "kopieren und einfügen"]),
    dict(slug="gamer-namen", kicker="ULTRATEXTGEN · GAMING",
         headline="Coole Schrift für Gamer-Namen",
         benefit="Erstelle deinen Spielernamen mit Stil und Symbolen.",
         rows=[("Mono", wrap("≪", st("Monospace", "PROGAMER"), "≫")),
               ("Kapitälchen", wrap("★", smallcaps("legende"))),
               ("Outline", wrap("⊱", st("Double-struck", "Jaeger"), "⊰"))],
         title="Coole Schrift für Gamer-Namen — Kopieren",
         kw=["gamer namen", "coole gaming namen", "schrift für gaming namen",
             "spielername", "schöne schrift"]),
    dict(slug="zalgo", kicker="ULTRATEXTGEN · ZALGO", dest=ZALGO,
         headline="Zalgo Text (Glitch) zum Kopieren",
         benefit="Gruseliger Glitch-Text für Posts und Nicks.",
         rows=[("Zalgo", "t̷e̷x̷t̷"), ("Glitch", "g̸l̸i̸t̸c̸h̸"),
               ("Gruselig", "g̶r̶u̶s̶e̶l̶i̶g̶")],
         title="Zalgo Text (Glitch) zum Kopieren und Einfügen",
         kw=["zalgo text", "zalgo generator", "glitch text", "gruseliger text",
             "schöne schrift"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Einmal tippen und alle Unicode-"
         f"Stile bei UltraTextGen kopieren: kostenlos, im Browser, ohne App. "
         f"Ideal für Bio, Name, Nick, Status und Kommentare.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Vertikaler Pin auf Deutsch: {pin['headline']} — Beispiele für "
            f"schöne Schrift zum Kopieren von UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, DEST, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
