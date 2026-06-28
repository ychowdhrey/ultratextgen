#!/usr/bin/env python3
"""
Dutch "mooie letters / sierletters" Pinterest board — every pin drives to
https://ultratextgen.com/nl/ (the Zalgo pin to the /nl/ zalgo use case page).
Mirrors generate-es-pins.py via scripts/_locale_pin_kit.py. Topics track the
/nl/ page intent: mooie letters / sierletters / aesthetic fonts / coole symbolen
om te kopiëren en plakken — Instagram bio, TikTok, WhatsApp-status, Discord-naam,
gamertags.

Run:  python3 scripts/generate-nl-pins.py
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

LOCALE = "nl"
DEST = "https://ultratextgen.com/nl/"
ZALGO = "https://ultratextgen.com/nl/usecase/zalgo-text/"
BOARD = "Mooie Letters & Sierletters om te Kopiëren ✨"
CAMPAIGN = "nl_howto_pins"
CTA = "TIK OM TE KOPIËREN"
SUFFIX = "/nl"

PINS = [
    dict(slug="kopieren-plakken", kicker="ULTRATEXTGEN · ZO WERKT HET",
         headline="Mooie Letters om te Kopiëren en Plakken",
         benefit="Typ je tekst en kopieer hem in tientallen stijlen.",
         rows=[("normaal", "stijl"), ("Sierletters", st("Script", "stijl")),
               ("Vet", st("Bold", "stijl")), ("Open", st("Double-struck", "stijl"))],
         title="Mooie Letters om te Kopiëren en Plakken — Gratis",
         kw=["mooie letters om te kopiëren", "mooie letters", "letters om te kopiëren",
             "sierletters", "kopiëren en plakken"]),
    dict(slug="letter-generator", kicker="ULTRATEXTGEN · GENERATOR",
         headline="Lettergenerator om te Kopiëren",
         benefit="Zet je tekst direct om in allerlei lettertypes.",
         rows=[("normaal", "tekst"), ("Sierletters", st("Script", "tekst")),
               ("Vet", st("Bold", "tekst")), ("Mono", st("Monospace", "tekst"))],
         title="Lettergenerator om te Kopiëren en Plakken",
         kw=["lettergenerator", "letter generator", "lettertypes generator",
             "mooie letters", "kopiëren en plakken"]),
    dict(slug="sierletters", kicker="ULTRATEXTGEN · SIERLETTERS",
         headline="Sierletters om te Kopiëren",
         benefit="Sierlijke letters, klaar om te plakken.",
         rows=[("Sierletters", st("Script", "hallo")),
               ("Vette Sierletters", st("Bold Script", "hallo")),
               ("Schuin", st("Italic", "hallo"))],
         title="Sierletters om te Kopiëren en Plakken — Gratis",
         kw=["sierletters", "sierletters om te kopiëren", "sierlijke letters",
             "mooie letters", "handschrift letters"]),
    dict(slug="instagram-bio", kicker="ULTRATEXTGEN · INSTAGRAM",
         headline="Mooie Letters voor Instagram Bio",
         benefit="Versier je bio, naam en stories op Instagram.",
         rows=[("Sierletters", wrap("✶", st("Script", "self love"))),
               ("Schuin", wrap("⊹", st("Italic", "good vibes"))),
               ("Kapitaaltjes", wrap("˚✧", smallcaps("wees jezelf"), "✧˚"))],
         title="Mooie Letters voor Instagram Bio — Copy Paste",
         kw=["letters voor instagram", "instagram bio aesthetic", "mooie letters instagram",
             "instagram bio letters", "aesthetic"]),
    dict(slug="aesthetic", kicker="ULTRATEXTGEN · AESTHETIC",
         headline="Aesthetic Letters om te Kopiëren",
         benefit="Zachte stijl met mooie symbolen voor je socials.",
         rows=[("Sierletters", wrap("✶", st("Script", "vibes"))),
               ("Schuin", st("Italic", "soft")),
               ("Kapitaaltjes", wrap("˚✧", smallcaps("aesthetic"), "✧˚"))],
         title="Aesthetic Letters om te Kopiëren en Plakken",
         kw=["aesthetic letters", "aesthetic fonts", "aesthetic tekst",
             "aesthetic", "mooie letters"]),
    dict(slug="namen", kicker="ULTRATEXTGEN · NAMEN",
         headline="Jouw Naam in Mooie Letters",
         benefit="Zet je naam om voor profielen, nicks en games.",
         rows=[("Sierletters", st("Script", "Sara")), ("Vet", st("Bold", "Sara")),
               ("Gotisch", st("Fraktur", "Sara")), ("Open", st("Double-struck", "Sara"))],
         title="Jouw Naam in Mooie Letters — Kopiëren en Plakken",
         kw=["naam in mooie letters", "namen in mooie letters", "mooie namen",
             "mooie letters", "naam omzetten"]),
    dict(slug="symbolen", kicker="ULTRATEXTGEN · SYMBOLEN",
         headline="Coole Symbolen om te Kopiëren",
         benefit="Versieringen en symbolen voor je tekst met één klik.",
         rows=[("Hartjes & sterren", "♡ ✶ ⋆ ˚ ✧ ♥"),
               ("Bloemen & deco", "❀ ✿ ⊹ ☆ ✰ ◇"),
               ("Scheidingen", "✦ ── ✦   ⊱ ⋆ ⊰")],
         title="Coole Symbolen om te Kopiëren — Tekst Versieren",
         kw=["coole symbolen", "symbolen om te kopiëren", "speciale tekens",
             "symbolen kopiëren", "mooie letters"]),
    dict(slug="whatsapp", kicker="ULTRATEXTGEN · WHATSAPP",
         headline="Mooie Letters voor WhatsApp",
         benefit="Status, naam en berichten met stijl.",
         rows=[("Sierletters", st("Script", "good vibes")),
               ("Vet Schuin", st("Bold Italic", "wees blij")),
               ("Mono", st("Monospace", "online"))],
         title="Mooie Letters voor WhatsApp — Status Kopiëren",
         kw=["letters voor whatsapp", "whatsapp status letters", "mooie letters whatsapp",
             "mooie letters", "kopiëren en plakken"]),
    dict(slug="tiktok", kicker="ULTRATEXTGEN · TIKTOK",
         headline="Mooie Letters voor TikTok",
         benefit="Personaliseer je naam en bio op TikTok.",
         rows=[("Vet", st("Bold", "gebruiker")), ("Mono", st("Monospace", "highlight")),
               ("Schuin", st("Italic", "vibe"))],
         title="Mooie Letters voor TikTok — Naam & Bio Kopiëren",
         kw=["letters voor tiktok", "tiktok lettertypes", "tiktok bio letters",
             "mooie letters", "tiktok naam"]),
    dict(slug="gotisch", kicker="ULTRATEXTGEN · GOTISCH",
         headline="Gotische Letters om te Kopiëren",
         benefit="Donkere, elegante stijl voor nicks, bio's en posts.",
         rows=[("Gotisch", st("Fraktur", "donker")), ("Gotisch", st("Fraktur", "Rijk")),
               ("Open", st("Double-struck", "nacht"))],
         title="Gotische Letters om te Kopiëren en Plakken",
         kw=["gotische letters", "gotisch lettertype", "gotische letters kopiëren",
             "mooie letters", "dark"]),
    dict(slug="vet", kicker="ULTRATEXTGEN · VET",
         headline="Vette Letters om te Kopiëren",
         benefit="Vet dat werkt op elk sociaal netwerk.",
         rows=[("Vet", st("Bold", "TITEL")), ("Vet Schuin", st("Bold Italic", "highlight")),
               ("Open", st("Double-struck", "TITEL"))],
         title="Vette Letters om te Kopiëren en Plakken — Gratis",
         kw=["vette letters", "vet tekst", "vette letters kopiëren",
             "mooie letters", "kopiëren en plakken"]),
    dict(slug="discord", kicker="ULTRATEXTGEN · DISCORD",
         headline="Letters en Symbolen voor Discord",
         benefit="Naam, bijnaam en bio op Discord met stijl.",
         rows=[("Vet", st("Bold", "server")), ("Mono", st("Monospace", "online")),
               ("Open", st("Double-struck", "guild"))],
         title="Letters en Symbolen voor Discord — Kopiëren",
         kw=["letters voor discord", "discord lettertypes", "discord symbolen",
             "mooie letters", "discord"]),
    dict(slug="gamertag", kicker="ULTRATEXTGEN · GAMING",
         headline="Coole Letters voor Gamertags",
         benefit="Maak je spelersnaam met stijl en symbolen.",
         rows=[("Mono", wrap("≪", st("Monospace", "PROGAMER"), "≫")),
               ("Kapitaaltjes", wrap("★", smallcaps("legende"))),
               ("Open", wrap("⊱", st("Double-struck", "Jager"), "⊰"))],
         title="Coole Letters voor Gamertags — Kopiëren en Plakken",
         kw=["gamertag letters", "coole gamertags", "letters voor games",
             "spelersnaam", "mooie letters"]),
    dict(slug="zalgo", kicker="ULTRATEXTGEN · ZALGO", dest=ZALGO,
         headline="Zalgo Tekst (Glitch) om te Kopiëren",
         benefit="Griezelige glitch-tekst voor posts en nicks.",
         rows=[("Zalgo", "t̷e̷k̷s̷t̷"), ("Glitch", "g̸l̸i̸t̸c̸h̸"),
               ("Griezelig", "g̶r̶i̶e̶z̶e̶l̶i̶g̶")],
         title="Zalgo Tekst (Glitch) om te Kopiëren en Plakken",
         kw=["zalgo tekst", "zalgo generator", "glitch tekst", "griezelige tekst",
             "mooie letters"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Typ één keer en kopieer alle "
         f"Unicode-stijlen op UltraTextGen: gratis, in je browser, zonder app. "
         f"Ideaal voor bio, naam, nick, status en reacties.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Verticale pin in het Nederlands: {pin['headline']} — voorbeelden "
            f"van mooie letters om te kopiëren van UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, DEST, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
