#!/usr/bin/env python3
"""
English printables Pinterest board (the "E1" cell, 2026-09-10): one board of
pins for the /printables/* pages, the site's visual-asset lane (block letters,
cursive alphabet, name tracing, name puzzles, bubble letters, banners, and the
rest). Pinterest is the native discovery surface for exactly this content
type; the French sibling board (scripts/generate-fr-imprimables-pins.py) is
the pattern this mirrors. Same shared renderer, scripts/_locale_pin_kit.py,
same brand skin imported from generate-site-art.py, per-pin destinations.

Search vocabulary: Semrush (2026-09-10) plus teacher-community phrasing.
Head terms per destination are the first keyword on each pin, secondary
variants follow. "Editable name tracing" is pitched on the site's actual
advantage over the PDF/font-file competitors: no Adobe, no font install, no
name-length cap, renders in the browser.

Copy rule: no em dashes in new English strings (CLAUDE.md, Editorial
Footprint); a colon, comma or full stop does the joint instead.

Run:  python3 scripts/generate-en-printables-pins.py
      # R2 credentials absent? Render locally instead (PNGs are never
      # committed; the directory must be outside the repo):
      PIN_LOCAL_DIR=/path/outside/repo python3 scripts/generate-en-printables-pins.py
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

LOCALE = "en_printables"
BASE = "https://ultratextgen.com"
HUB = f"{BASE}/printables/"
BLOCK = f"{BASE}/printables/block-letters/"
CURSIVE = f"{BASE}/printables/cursive-alphabet/"
TRACING = f"{BASE}/printables/name-tracing/"
HANDWRITING = f"{BASE}/printables/handwriting-worksheet-generator/"
PUZZLE = f"{BASE}/printables/name-puzzle-maker/"
COLORING = f"{BASE}/printables/alphabet-coloring-pages/"
BUBBLE = f"{BASE}/printables/bubble-letters/"
BANNER = f"{BASE}/printables/banner-maker/"
GRAFFITI = f"{BASE}/printables/graffiti-letters/"
DOT2DOT = f"{BASE}/printables/dot-to-dot-alphabet/"
BIRTHDAY = f"{BASE}/printables/happy-birthday-in-cursive/"
MONOGRAM = f"{BASE}/printables/monogram-maker/"

BOARD = "Printable Letters & Name Worksheets: Free to Print ✨"
CAMPAIGN = "en_printables_pins"
CTA = "TAP TO OPEN AND PRINT"
SUFFIX = "/printables"

# A traced-outline look for name-tracing rows, DejaVu/Symbola-safe.
def outline(t):
    return "┊" + "┊".join(t) + "┊"


PINS = [
    dict(slug="printable-block-letters", dest=BLOCK,
         kicker="ULTRATEXTGEN · PRINTABLE",
         headline="Printable Block Letters A-Z",
         benefit="Large printable letters and digits, free to print and cut.",
         rows=[("Block", st("Bold", "ABCDE")),
               ("Lowercase", st("Bold", "abcde")),
               ("Digits", st("Bold", "01234"))],
         title="Printable Block Letters A-Z: Large Letters Free to Print and Cut",
         kw=["printable block letters", "large printable letters",
             "letter stencils", "printable letters"]),
    dict(slug="letter-stencils", dest=BLOCK,
         kicker="ULTRATEXTGEN · STENCILS",
         headline="Free Letter Stencils to Print",
         benefit="Type any word, print it as bold stencil letters.",
         rows=[("Stencil", st("Bold", "SALE")),
               ("Stencil", st("Bold", "OPEN")),
               ("Digits", st("Bold", "2026"))],
         title="Free Letter Stencils to Print: Type Any Word, Cut It Out",
         kw=["letter stencils", "printable letter stencils",
             "printable block letters"]),
    dict(slug="bulletin-board-letters", dest=BLOCK,
         kicker="ULTRATEXTGEN · CLASSROOM",
         headline="Bulletin Board Letters",
         benefit="Big, bold classroom letters, one per page, free.",
         rows=[("Bulletin", st("Bold", "WELCOME")),
               ("Bulletin", st("Bold", "READ")),
               ("Bulletin", st("Bold", "ABC"))],
         title="Bulletin Board Letters: Big Printable Classroom Letters, Free",
         kw=["bulletin board letters", "large printable letters",
             "printable letters for bulletin board"]),
    dict(slug="cursive-alphabet-printable", dest=CURSIVE,
         kicker="ULTRATEXTGEN · CURSIVE",
         headline="Cursive Alphabet Printable A-Z",
         benefit="The full cursive chart, upper and lower case, free.",
         rows=[("Cursive", st("Script", "abcde")),
               ("Capitals", st("Script", "ABCDE")),
               ("Bold cursive", st("Bold Script", "fghij"))],
         title="Cursive Alphabet Printable A-Z: Free Cursive Letters Chart",
         kw=["cursive alphabet printable", "cursive letters chart",
             "cursive alphabet"]),
    dict(slug="cursive-practice-sheets", dest=CURSIVE,
         kicker="ULTRATEXTGEN · PRACTICE",
         headline="Cursive Practice Sheets",
         benefit="Free handwriting practice for every cursive letter.",
         rows=[("Trace", st("Script", "a")),
               ("Join", st("Script", "and")),
               ("Word", st("Script", "school"))],
         title="Cursive Practice Sheets: Free Printable Cursive Handwriting Practice",
         kw=["cursive practice sheets", "cursive handwriting practice",
             "cursive worksheets"]),
    dict(slug="name-tracing-worksheet", dest=TRACING,
         kicker="ULTRATEXTGEN · NAME TRACING",
         headline="Name Tracing Worksheet",
         benefit="Type a name, print a dotted tracing sheet in seconds.",
         rows=[("Trace", outline("Emma")),
               ("Print", st("Italic", "Emma")),
               ("Cursive", st("Script", "Emma"))],
         title="Name Tracing Worksheet: Type Any Name, Print a Free Tracing Sheet",
         kw=["name tracing worksheet", "name tracing printable",
             "name tracing generator"]),
    dict(slug="editable-name-tracing", dest=TRACING,
         kicker="ULTRATEXTGEN · NO ADOBE",
         headline="Editable Name Tracing",
         benefit="No Adobe, no font install, no name-length cap. Just type.",
         rows=[("Type", "Olivia"),
               ("Trace", outline("Olivia")),
               ("Cursive", st("Script", "Olivia"))],
         title="Editable Name Tracing: No Adobe, No Font Install, Any Name Length",
         kw=["editable name tracing", "name tracing worksheet",
             "editable name tracing worksheets"]),
    dict(slug="handwriting-worksheet-generator", dest=HANDWRITING,
         kicker="ULTRATEXTGEN · GENERATOR",
         headline="Handwriting Worksheet Generator",
         benefit="Any sentence, adjustable dotted lines, free to print.",
         rows=[("Dotted", outline("cat sat")),
               ("Print", st("Italic", "The cat sat.")),
               ("Cursive", st("Script", "The cat sat."))],
         title="Handwriting Worksheet Generator: Any Sentence, Adjustable Dotted Tracing",
         kw=["handwriting worksheet generator", "handwriting practice sheets",
             "handwriting worksheets"]),
    dict(slug="preschool-name-puzzle", dest=PUZZLE,
         kicker="ULTRATEXTGEN · PRESCHOOL",
         headline="Preschool Name Puzzle",
         benefit="A cut-apart puzzle of your child's name, free to print.",
         rows=[("Puzzle", st("Circled", "NOAH")),
               ("Pieces", "N | O | A | H"),
               ("Name", st("Bold", "NOAH"))],
         title="Preschool Name Puzzle: Free Printable Cut-Apart Name Puzzle",
         kw=["name puzzle printable", "preschool name puzzle",
             "name puzzle for kids"]),
    dict(slug="alphabet-coloring-pages", dest=COLORING,
         kicker="ULTRATEXTGEN · COLORING",
         headline="Alphabet Coloring Pages A-Z",
         benefit="One big letter per page, free ABC coloring sheets.",
         rows=[("Color A", st("Circled", "A")),
               ("Crayons", "✎ ✏"),
               ("Color B", st("Circled", "B"))],
         title="Alphabet Coloring Pages A-Z: Free Printable ABC Coloring Sheets",
         kw=["alphabet coloring pages", "abc coloring pages",
             "letter coloring pages"]),
    dict(slug="bubble-letters-printable", dest=BUBBLE,
         kicker="ULTRATEXTGEN · BUBBLE LETTERS",
         headline="Bubble Letters Printable",
         benefit="Type any word or name, print it in bubble letters.",
         rows=[("Bubble", st("Circled", "LUNA")),
               ("Lowercase", st("Circled", "luna")),
               ("Digits", st("Circled", "2026"))],
         title="Bubble Letters Printable: Type Any Word or Name, Free to Print",
         kw=["bubble letters printable", "printable bubble letters",
             "bubble letters"]),
    dict(slug="printable-banner-letters", dest=BANNER,
         kicker="ULTRATEXTGEN · PARTY",
         headline="Printable Banner Letters",
         benefit="Free banner flags spelling any word, print and string up.",
         rows=[("Banner", st("Bold", "PARTY")),
               ("Flags", "▽ ▽ ▽ ▽ ▽"),
               ("Banner", st("Bold", "HAPPY"))],
         title="Printable Banner Letters: Free Party Banner Flags to Print and Cut",
         kw=["printable banner letters", "printable banner",
             "banner maker printable"]),
    dict(slug="graffiti-letters-printable", dest=GRAFFITI,
         kicker="ULTRATEXTGEN · GRAFFITI",
         headline="Graffiti Letters A-Z to Print",
         benefit="A free graffiti alphabet, big enough to color and cut.",
         rows=[("Graffiti", st("Bold Italic", "STYLE")),
               ("Outline", st("Double-struck", "STYLE")),
               ("Tag", st("Fraktur", "style"))],
         title="Graffiti Letters A-Z to Print: Free Printable Graffiti Alphabet",
         kw=["graffiti letters printable", "graffiti alphabet",
             "graffiti letters"]),
    dict(slug="dot-to-dot-alphabet", dest=DOT2DOT,
         kicker="ULTRATEXTGEN · CONNECT THE DOTS",
         headline="Dot-to-Dot Alphabet",
         benefit="Connect the dots to form every letter, free to print.",
         rows=[("Dots", "· · · · ·"),
               ("Letter", st("Bold", "A B C")),
               ("Connect", "A · B · C")],
         title="Dot-to-Dot Alphabet A-Z: Free Printable Connect-the-Dots Letters",
         kw=["dot to dot alphabet", "connect the dots letters",
             "dot to dot printable"]),
    dict(slug="happy-birthday-in-cursive", dest=BIRTHDAY,
         kicker="ULTRATEXTGEN · BIRTHDAY",
         headline="Happy Birthday in Cursive",
         benefit="A free printable for cards, cakes and banners.",
         rows=[("Cursive", st("Script", "Happy")),
               ("Cursive", st("Script", "Birthday")),
               ("Bold cursive", st("Bold Script", "Happy"))],
         title="Happy Birthday in Cursive: Free Printable for Cards and Cake Toppers",
         kw=["happy birthday in cursive", "happy birthday cursive printable",
             "cursive happy birthday"]),
    dict(slug="free-monogram-maker", dest=MONOGRAM,
         kicker="ULTRATEXTGEN · MONOGRAM",
         headline="Free Monogram Maker",
         benefit="Printable initial monograms for gifts, decor and stationery.",
         rows=[("Script", st("Script", "AB")),
               ("Bold script", st("Bold Script", "JM")),
               ("Fraktur", st("Fraktur", "KL"))],
         title="Free Monogram Maker: Printable Initial Monograms for Gifts and Decor",
         kw=["monogram maker", "printable monogram",
             "free monogram maker"]),
]


def describe(pin):
    d = (f"{pin['headline']}. {pin['benefit']} Free and instant on UltraTextGen: "
         f"no account, no app, no download, it prints straight from your browser. "
         f"Made for classrooms, homeschool, parties and home decor.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "..."


def alt(pin):
    return (f"Vertical pin: {pin['headline']}, a free printable sheet generated "
            f"on UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, HUB, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
