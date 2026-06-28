#!/usr/bin/env python3
"""
Polish "ładne czcionki / stylowe literki" Pinterest board — every pin drives to
https://ultratextgen.com/pl/ (the Zalgo pin to the /pl/ zalgo use case page).
Mirrors generate-es-pins.py via scripts/_locale_pin_kit.py. Topics track the
/pl/ page intent reinforced in the recent "literki/litery do skopiowania +
ozdobniki" PR.

Run:  python3 scripts/generate-pl-pins.py
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

LOCALE = "pl"
DEST = "https://ultratextgen.com/pl/"
ZALGO = "https://ultratextgen.com/pl/usecase/zalgo-text/"
BOARD = "Ładne Czcionki & Stylowe Literki do Skopiowania ✨"
CAMPAIGN = "pl_howto_pins"
CTA = "DOTKNIJ, ABY SKOPIOWAĆ"
SUFFIX = "/pl"

PINS = [
    dict(slug="literki-do-skopiowania", kicker="ULTRATEXTGEN · JAK UŻYWAĆ",
         headline="Stylowe Literki do Skopiowania",
         benefit="Wpisz tekst i skopiuj go w dziesiątkach stylów.",
         rows=[("zwykłe", "styl"), ("Kursywa", st("Script", "styl")),
               ("Pogrubienie", st("Bold", "styl")), ("Kontur", st("Double-struck", "styl"))],
         title="Stylowe Literki do Skopiowania — Za Darmo",
         kw=["literki do skopiowania", "litery do skopiowania", "stylowe literki",
             "ładne literki", "kopiuj wklej"]),
    dict(slug="generator-czcionek", kicker="ULTRATEXTGEN · GENERATOR",
         headline="Generator Ładnych Czcionek",
         benefit="Zamień tekst na wiele czcionek w jednej chwili.",
         rows=[("zwykłe", "tekst"), ("Kursywa", st("Script", "tekst")),
               ("Pogrubienie", st("Bold", "tekst")), ("Mono", st("Monospace", "tekst"))],
         title="Generator Ładnych Czcionek — Kopiuj i Wklej",
         kw=["generator czcionek", "ładne czcionki", "generator liter",
             "czcionki do skopiowania", "stylowe literki"]),
    dict(slug="rodzaje-czcionek", kicker="ULTRATEXTGEN · RODZAJE",
         headline="Rodzaje Ładnych Czcionek",
         benefit="Kursywa, gotyk, kontur i wiele więcej w jednym miejscu.",
         rows=[("Kursywa", st("Script", "styl")), ("Gotyk", st("Fraktur", "styl")),
               ("Kontur", st("Double-struck", "styl")), ("Kapitaliki", smallcaps("styl"))],
         title="Rodzaje Ładnych Czcionek — Style do Skopiowania",
         kw=["rodzaje czcionek", "style liter", "różne czcionki",
             "ładne czcionki", "stylowe literki"]),
    dict(slug="instagram-bio", kicker="ULTRATEXTGEN · INSTAGRAM",
         headline="Ładne Literki na Bio Instagram",
         benefit="Ozdób bio, imię i relacje na Instagramie.",
         rows=[("Kursywa", wrap("✶", st("Script", "self love"))),
               ("Pochyłe", wrap("⊹", st("Italic", "good vibes"))),
               ("Kapitaliki", wrap("˚✧", smallcaps("badz soba"), "✧˚"))],
         title="Ładne Literki na Bio Instagram — Kopiuj Wklej",
         kw=["literki na instagram", "bio na instagram aesthetic", "czcionki na instagram",
             "ładne literki instagram", "aesthetic"]),
    dict(slug="kursywa", kicker="ULTRATEXTGEN · KURSYWA",
         headline="Pismo Odręczne do Skopiowania",
         benefit="Eleganckie pismo odręczne gotowe do wklejenia.",
         rows=[("Kursywa", st("Script", "czesc")),
               ("Pogrubiona Kursywa", st("Bold Script", "czesc")),
               ("Pochyłe", st("Italic", "czesc"))],
         title="Pismo Odręczne do Skopiowania — Ładne Literki",
         kw=["pismo odręczne", "kursywa do skopiowania", "litery pisane",
             "ładne czcionki", "kaligrafia"]),
    dict(slug="imiona", kicker="ULTRATEXTGEN · IMIONA",
         headline="Twoje Imię w Ładnych Literkach",
         benefit="Zamień imię na profile, nicki i statusy.",
         rows=[("Kursywa", st("Script", "Zofia")), ("Pogrubienie", st("Bold", "Zofia")),
               ("Gotyk", st("Fraktur", "Zofia")), ("Kontur", st("Double-struck", "Zofia"))],
         title="Twoje Imię w Ładnych Literkach — Kopiuj Wklej",
         kw=["imię w ładnych literkach", "imiona stylizowane", "ładne imiona",
             "ładne literki", "imię do skopiowania"]),
    dict(slug="ozdobniki", kicker="ULTRATEXTGEN · OZDOBNIKI",
         headline="Ozdobniki i Symbole do Skopiowania",
         benefit="Ozdoby i symbole do tekstu jednym kliknięciem.",
         rows=[("Serca i gwiazdki", "♡ ✶ ⋆ ˚ ✧ ♥"),
               ("Kwiatki i ozdoby", "❀ ✿ ⊹ ☆ ✰ ◇"),
               ("Separatory", "✦ ── ✦   ⊱ ⋆ ⊰")],
         title="Ozdobniki i Symbole do Skopiowania — Ozdoby Tekstu",
         kw=["ozdobniki", "symbole do skopiowania", "ozdobniki do nicku",
             "znaki specjalne", "stylowe literki"]),
    dict(slug="whatsapp", kicker="ULTRATEXTGEN · WHATSAPP",
         headline="Ładne Literki na WhatsApp",
         benefit="Status, imię i wiadomości WhatsApp ze stylem.",
         rows=[("Kursywa", st("Script", "good vibes")),
               ("Pogrubiona Pochyła", st("Bold Italic", "badz szczesliwy")),
               ("Mono", st("Monospace", "online"))],
         title="Ładne Literki na WhatsApp — Status do Skopiowania",
         kw=["literki na whatsapp", "status whatsapp", "czcionki na whatsapp",
             "ładne literki", "kopiuj wklej"]),
    dict(slug="aesthetic", kicker="ULTRATEXTGEN · AESTHETIC",
         headline="Aesthetic Literki do Skopiowania",
         benefit="Delikatny styl z ładnymi symbolami na social media.",
         rows=[("Kursywa", wrap("✶", st("Script", "vibes"))),
               ("Pochyłe", st("Italic", "soft")),
               ("Kapitaliki", wrap("˚✧", smallcaps("aesthetic"), "✧˚"))],
         title="Aesthetic Literki do Skopiowania i Wklejenia",
         kw=["aesthetic literki", "estetyczne literki", "aesthetic tekst",
             "aesthetic", "stylowe literki"]),
    dict(slug="tiktok", kicker="ULTRATEXTGEN · TIKTOK",
         headline="Ładne Literki na TikToka",
         benefit="Spersonalizuj nazwę i bio na TikToku.",
         rows=[("Pogrubienie", st("Bold", "nick")), ("Mono", st("Monospace", "highlight")),
               ("Pochyłe", st("Italic", "vibe"))],
         title="Ładne Literki na TikToka — Nazwa i Bio za Darmo",
         kw=["literki na tiktok", "czcionki na tiktok", "bio na tiktok",
             "stylowe literki", "nick na tiktok"]),
    dict(slug="gotyk", kicker="ULTRATEXTGEN · GOTYK",
         headline="Czcionka Gotycka do Skopiowania",
         benefit="Mroczny, elegancki styl na nicki, bio i posty.",
         rows=[("Gotyk", st("Fraktur", "mrok")), ("Gotyk", st("Fraktur", "Krolestwo")),
               ("Kontur", st("Double-struck", "noc"))],
         title="Czcionka Gotycka do Skopiowania i Wklejenia",
         kw=["czcionka gotycka", "litery gotyckie", "gotyk do skopiowania",
             "ładne czcionki", "dark"]),
    dict(slug="pogrubienie", kicker="ULTRATEXTGEN · POGRUBIENIE",
         headline="Pogrubione Literki do Skopiowania",
         benefit="Pogrubienie, które działa w każdej sieci.",
         rows=[("Pogrubienie", st("Bold", "TYTUL")), ("Pogrubiona Pochyła", st("Bold Italic", "highlight")),
               ("Kontur", st("Double-struck", "TYTUL"))],
         title="Pogrubione Literki do Skopiowania i Wklejenia",
         kw=["pogrubione litery", "pogrubiony tekst", "pogrubienie do skopiowania",
             "stylowe literki", "kopiuj wklej"]),
    dict(slug="nick-do-gry", kicker="ULTRATEXTGEN · GRY",
         headline="Stylowe Nicki do Gier",
         benefit="Stwórz nazwę gracza ze stylem i symbolami.",
         rows=[("Mono", wrap("≪", st("Monospace", "PROGAMER"), "≫")),
               ("Kapitaliki", wrap("★", smallcaps("legenda"))),
               ("Kontur", wrap("⊱", st("Double-struck", "Lowca"), "⊰"))],
         title="Stylowe Nicki do Gier — Kopiuj i Wklej za Darmo",
         kw=["nicki do gier", "nick do gry", "stylowe nicki",
             "stylowe literki", "nick do skopiowania"]),
    dict(slug="zalgo", kicker="ULTRATEXTGEN · ZALGO", dest=ZALGO,
         headline="Tekst Zalgo (Glitch) do Skopiowania",
         benefit="Przerażający glitchowy tekst na posty i nicki.",
         rows=[("Zalgo", "t̷e̷k̷s̷t̷"), ("Glitch", "g̸l̸i̸t̸c̸h̸"),
               ("Straszny", "s̶t̶r̶a̶s̶z̶n̶y̶")],
         title="Tekst Zalgo (Glitch) do Skopiowania i Wklejenia",
         kw=["tekst zalgo", "generator zalgo", "tekst glitch", "przerażający tekst",
             "stylowe literki"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Wpisz raz i kopiuj wszystkie style "
         f"Unicode w UltraTextGen: za darmo, w przeglądarce, bez aplikacji. "
         f"Idealne na bio, imię, nick, status i komentarze.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pionowy pin po polsku: {pin['headline']} — przykłady ładnych "
            f"literek do skopiowania z UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, DEST, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
