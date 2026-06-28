#!/usr/bin/env python3
"""
Italian "scritte aesthetic / testo stilizzato" Pinterest board — every pin
drives to https://ultratextgen.com/it/ (the Zalgo pin to the /it/ zalgo use
case page). Mirrors generate-es-pins.py via scripts/_locale_pin_kit.py. Topics
track the /it/ page intent reinforced in the recent "scritte/scritta stilizzata
aesthetic + simboli copia e incolla" PR.

Run:  python3 scripts/generate-it-pins.py
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

LOCALE = "it"
DEST = "https://ultratextgen.com/it/"
ZALGO = "https://ultratextgen.com/it/usecase/zalgo-text/"
BOARD = "Scritte Aesthetic & Testo Stilizzato da Copiare ✨"
CAMPAIGN = "it_howto_pins"
CTA = "TOCCA PER COPIARE"
SUFFIX = "/it"

PINS = [
    dict(slug="copia-incolla", kicker="ULTRATEXTGEN · COME SI USA",
         headline="Testo Stilizzato da Copiare e Incollare",
         benefit="Scrivi il tuo testo e copialo in tanti stili.",
         rows=[("normale", "stile"), ("Corsivo", st("Script", "stile")),
               ("Grassetto", st("Bold", "stile")), ("Vuoto", st("Double-struck", "stile"))],
         title="Testo Stilizzato da Copiare e Incollare — Gratis",
         kw=["testo stilizzato da copiare", "testo stilizzato", "scritte da copiare",
             "caratteri da copiare", "copia e incolla"]),
    dict(slug="generatore", kicker="ULTRATEXTGEN · GENERATORE",
         headline="Generatore di Caratteri Belli",
         benefit="Converte il tuo testo in tanti caratteri all'istante.",
         rows=[("normale", "testo"), ("Corsivo", st("Script", "testo")),
               ("Grassetto", st("Bold", "testo")), ("Mono", st("Monospace", "testo"))],
         title="Generatore di Caratteri Belli — Copia e Incolla",
         kw=["generatore di caratteri", "caratteri belli", "generatore di font",
             "caratteri da copiare", "testo stilizzato"]),
    dict(slug="scritte-aesthetic", kicker="ULTRATEXTGEN · AESTHETIC",
         headline="Scritte Aesthetic da Copiare",
         benefit="Stile delicato con simboli carini per i tuoi social.",
         rows=[("Corsivo", wrap("✶", st("Script", "vibes"))),
               ("Italico", st("Italic", "soft")),
               ("Maiuscoletto", wrap("˚✧", smallcaps("aesthetic"), "✧˚"))],
         title="Scritte Aesthetic da Copiare e Incollare",
         kw=["scritte aesthetic", "scritta stilizzata", "testo aesthetic",
             "aesthetic", "testo stilizzato"]),
    dict(slug="instagram-bio", kicker="ULTRATEXTGEN · INSTAGRAM",
         headline="Scritte Stilizzate per Bio Instagram",
         benefit="Decora la bio, il nome e le storie di Instagram.",
         rows=[("Corsivo", wrap("✶", st("Script", "self love"))),
               ("Italico", wrap("⊹", st("Italic", "good vibes"))),
               ("Maiuscoletto", wrap("˚✧", smallcaps("sii te stesso"), "✧˚"))],
         title="Scritte Stilizzate per Bio Instagram — Copia",
         kw=["scritte per instagram", "bio instagram aesthetic", "caratteri per instagram",
             "testo stilizzato instagram", "aesthetic"]),
    dict(slug="corsivo", kicker="ULTRATEXTGEN · CORSIVO",
         headline="Scrittura Corsiva da Copiare",
         benefit="Corsivo elegante pronto da copiare e incollare.",
         rows=[("Corsivo", st("Script", "ciao")),
               ("Corsivo Grassetto", st("Bold Script", "ciao")),
               ("Italico", st("Italic", "ciao"))],
         title="Scrittura Corsiva da Copiare e Incollare",
         kw=["scrittura corsiva", "corsivo da copiare", "lettere corsive",
             "testo stilizzato", "calligrafia"]),
    dict(slug="nomi", kicker="ULTRATEXTGEN · NOMI",
         headline="Il Tuo Nome in Scritte Belle",
         benefit="Converte il tuo nome per profili, nick e stati.",
         rows=[("Corsivo", st("Script", "Giulia")), ("Grassetto", st("Bold", "Giulia")),
               ("Gotico", st("Fraktur", "Giulia")), ("Vuoto", st("Double-struck", "Giulia"))],
         title="Il Tuo Nome in Scritte Belle — Copia e Incolla",
         kw=["nome in scritte belle", "nomi stilizzati", "nomi belli",
             "testo stilizzato", "nome da copiare"]),
    dict(slug="simboli", kicker="ULTRATEXTGEN · SIMBOLI",
         headline="Simboli da Copiare e Incollare",
         benefit="Ornamenti e simboli per decorare il testo con un clic.",
         rows=[("Cuori e stelle", "♡ ✶ ⋆ ˚ ✧ ♥"),
               ("Fiori e deco", "❀ ✿ ⊹ ☆ ✰ ◇"),
               ("Separatori", "✦ ── ✦   ⊱ ⋆ ⊰")],
         title="Simboli da Copiare e Incollare — Decora il Testo",
         kw=["simboli da copiare", "simboli copia e incolla", "caratteri speciali",
             "simboli", "testo stilizzato"]),
    dict(slug="whatsapp", kicker="ULTRATEXTGEN · WHATSAPP",
         headline="Testo Stilizzato per WhatsApp",
         benefit="Stato, nome e messaggi WhatsApp con stile.",
         rows=[("Corsivo", st("Script", "good vibes")),
               ("Grassetto Italico", st("Bold Italic", "sii felice")),
               ("Mono", st("Monospace", "online"))],
         title="Testo Stilizzato per WhatsApp — Copia e Incolla",
         kw=["testo per whatsapp", "stato whatsapp", "scritte per whatsapp",
             "testo stilizzato", "copia e incolla"]),
    dict(slug="gotico", kicker="ULTRATEXTGEN · GOTICO",
         headline="Scrittura Gotica da Copiare",
         benefit="Stile scuro ed elegante per nick, bio e post.",
         rows=[("Gotico", st("Fraktur", "oscuro")), ("Gotico", st("Fraktur", "Regno")),
               ("Vuoto", st("Double-struck", "notte"))],
         title="Scrittura Gotica da Copiare e Incollare — Gratis",
         kw=["scrittura gotica", "lettere gotiche", "carattere gotico",
             "testo stilizzato", "dark"]),
    dict(slug="tiktok", kicker="ULTRATEXTGEN · TIKTOK",
         headline="Scritte Stilizzate per TikTok",
         benefit="Personalizza nome e bio su TikTok.",
         rows=[("Grassetto", st("Bold", "utente")), ("Mono", st("Monospace", "highlight")),
               ("Italico", st("Italic", "vibe"))],
         title="Scritte Stilizzate per TikTok — Nome e Bio",
         kw=["scritte per tiktok", "caratteri tiktok", "testo stilizzato tiktok",
             "testo stilizzato", "bio tiktok"]),
    dict(slug="grassetto", kicker="ULTRATEXTGEN · GRASSETTO",
         headline="Testo in Grassetto da Copiare",
         benefit="Grassetto che funziona su ogni social.",
         rows=[("Grassetto", st("Bold", "TITOLO")), ("Grassetto Italico", st("Bold Italic", "highlight")),
               ("Vuoto", st("Double-struck", "TITOLO"))],
         title="Testo in Grassetto da Copiare e Incollare",
         kw=["testo in grassetto", "grassetto da copiare", "scrivere in grassetto",
             "testo stilizzato", "copia e incolla"]),
    dict(slug="nickname-gioco", kicker="ULTRATEXTGEN · GAMING",
         headline="Nickname Stilosi per i Giochi",
         benefit="Crea il tuo nome da giocatore con stile e simboli.",
         rows=[("Mono", wrap("≪", st("Monospace", "PROGAMER"), "≫")),
               ("Maiuscoletto", wrap("★", smallcaps("leggenda"))),
               ("Vuoto", wrap("⊱", st("Double-struck", "Cacciatore"), "⊰"))],
         title="Nickname Stilosi per i Giochi — Copia e Incolla",
         kw=["nickname per giochi", "nomi per giochi", "nickname stilosi",
             "testo stilizzato", "nick da copiare"]),
    dict(slug="frasi", kicker="ULTRATEXTGEN · FRASI",
         headline="Frasi in Scritte Belle",
         benefit="Per la tua bio, gli stati e i post.",
         rows=[("Corsivo", st("Script", "continua a brillare")),
               ("Italico", st("Italic", "good vibes")),
               ("Maiuscoletto", smallcaps("sii te stesso"))],
         title="Frasi in Scritte Belle — Copia e Incolla",
         kw=["frasi stilizzate", "frasi per bio", "frasi per stati",
             "testo stilizzato", "copia e incolla"]),
    dict(slug="zalgo", kicker="ULTRATEXTGEN · ZALGO", dest=ZALGO,
         headline="Testo Zalgo (Glitch) da Copiare",
         benefit="Testo glitch e inquietante per post e nick.",
         rows=[("Zalgo", "t̷e̷s̷t̷o̷"), ("Glitch", "g̸l̸i̸t̸c̸h̸"),
               ("Inquietante", "i̶n̶q̶u̶i̶e̶t̶o̶")],
         title="Testo Zalgo (Glitch) da Copiare e Incollare",
         kw=["testo zalgo", "generatore zalgo", "testo glitch", "testo inquietante",
             "testo stilizzato"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Scrivi una volta e copia tutti "
         f"gli stili Unicode su UltraTextGen: gratis, nel browser, senza app. "
         f"Ideale per bio, nome, nick, stato e commenti.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin verticale in italiano: {pin['headline']} — esempi di testo "
            f"stilizzato da copiare e incollare da UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, DEST, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
