#!/usr/bin/env python3
"""
Generates the Indonesian "cara pakai / how-to" Pinterest pin board for
UltraTextGen — every pin drives to https://ultratextgen.com/id/.

Why a dedicated set (vs scripts/generate-pinterest.py):
  - generate-pinterest.py builds one pin *per page*, in English, using vector
    brand motifs. This board is single-destination (/id/) and single-language
    (Indonesian), organised by **use case** ("biar standout") rather than by
    page. The hero is the *literal* aesthetic Unicode — the thing Indonesian
    searchers actually want to see ("tulisan aesthetic" 201K, "huruf aesthetic"
    60.5K, bio IG, nickname FF/ML, status WA, ucapan ultah).

It reuses the exact brand skin (soft panel, faint dot grid, purple->blue spine,
wordmark) by importing the shared tokens/helpers from generate-site-art.py, then
lays the styled-text rows onto the tall 1000x1500 pin used across the site.

Outputs:
  - assets/pinterest/id/<slug>.png      1000x1500 vertical pins
  - data/id_pinterest_pins.csv          internal inventory (title/desc/kw/alt/url)
  - data/id_pinterest_pins_upload.csv   Pinterest-importer-ready CSV (the file you
                                        upload) — written via build_pinterest_upload

Run:  python3 scripts/generate-id-pins.py
Requires: cairosvg, plus a font covering the Mathematical Alphanumeric block
          (Symbola) — apt: fonts-symbola fonts-noto-core fonts-noto-extra.
"""
import csv
import importlib.util
import os
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PIN_DIR = os.path.join(ROOT, "assets", "pinterest", "id")
CSV_OUT = os.path.join(ROOT, "data", "id_pinterest_pins.csv")
os.makedirs(PIN_DIR, exist_ok=True)

DEST = "https://ultratextgen.com/id/"
PIN_W, PIN_H = 1000, 1500

# Font stack that actually rasterises the Mathematical Alphanumeric glyphs under
# cairosvg. Symbola is serif, so "sans" variants read as serif — fine for a pin.
AES = ("Symbola, 'Noto Sans Math', 'Noto Sans Symbols2', "
       "'Noto Sans CJK JP', 'DejaVu Sans', sans-serif")


# ---- shared brand system (single source of truth) -------------------------
def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ART = _load(os.path.join(HERE, "generate-site-art.py"), "siteart")
PURPLE, BLUE, INK, SUB = ART.PURPLE, ART.BLUE, ART.INK, ART.SUB
PANEL, SANS = ART.PANEL, ART.SANS
defs, esc = ART.defs, ART.esc


def _build_upload():
    """Derive the Pinterest-importer-ready upload CSV from the inventory just
    written, via the shared converter (single source of truth for the schema)."""
    conv = _load(os.path.join(HERE, "build_pinterest_upload.py"), "build_upload")
    conv.convert("id")


# ============================================================ style transforms
# Build A-Z / a-z / 0-9 maps onto a contiguous Unicode block, then patch the
# Letterlike-Symbols exceptions so script/fraktur/double-struck never tofu.
def _block(base_upper=None, base_lower=None, base_digit=None, exc=None):
    m = {}
    if base_upper is not None:
        for i in range(26):
            m[chr(ord('A') + i)] = chr(base_upper + i)
    if base_lower is not None:
        for i in range(26):
            m[chr(ord('a') + i)] = chr(base_lower + i)
    if base_digit is not None:
        for i in range(10):
            m[chr(ord('0') + i)] = chr(base_digit + i)
    if exc:
        m.update(exc)
    return m


BOLD = _block(0x1D400, 0x1D41A, 0x1D7CE)
ITALIC = _block(0x1D434, 0x1D44E, exc={'h': 'ℎ'})
BOLDITALIC = _block(0x1D468, 0x1D482)
SCRIPT = _block(0x1D49C, 0x1D4B6, exc={
    'B': 'ℬ', 'E': 'ℰ', 'F': 'ℱ', 'H': 'ℋ', 'I': 'ℐ',
    'L': 'ℒ', 'M': 'ℳ', 'R': 'ℛ',
    'e': 'ℯ', 'g': 'ℊ', 'o': 'ℴ'})
BOLDSCRIPT = _block(0x1D4D0, 0x1D4EA)
FRAKTUR = _block(0x1D504, 0x1D51E, exc={
    'C': 'ℭ', 'H': 'ℌ', 'I': 'ℑ', 'R': 'ℜ', 'Z': 'ℨ'})
DOUBLE = _block(0x1D538, 0x1D552, 0x1D7D8, exc={
    'C': 'ℂ', 'H': 'ℍ', 'N': 'ℕ', 'P': 'ℙ', 'Q': 'ℚ',
    'R': 'ℝ', 'Z': 'ℤ'})
MONO = _block(0x1D670, 0x1D68A, 0x1D7F6)
# (Fullwidth Ａ-Ｚ is intentionally omitted: the Symbola raster used by cairosvg
#  has no glyphs for the Halfwidth/Fullwidth Latin block, so it would tofu.)
CIRCLED = _block(0x24B6, 0x24D0, exc={str(i): chr(0x2460 + i - 1) for i in range(1, 10)})
CIRCLED['0'] = '⓪'

# small caps: lowercase -> Latin small-capital letters (phonetic block).
SMALLCAPS_MAP = {
    'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ',
    'f': 'ꜰ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ',
    'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ',
    'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 'ꜱ', 't': 'ᴛ',
    'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ',
    'z': 'ᴢ'}


def styler(m):
    return lambda t: "".join(m.get(c, c) for c in t)


def smallcaps(t):
    return "".join(SMALLCAPS_MAP.get(c.lower(), c) for c in t)


STYLES = {
    "Bold": styler(BOLD),
    "Italic": styler(ITALIC),
    "Bold Italic": styler(BOLDITALIC),
    "Script": styler(SCRIPT),
    "Bold Script": styler(BOLDSCRIPT),
    "Fraktur": styler(FRAKTUR),
    "Double-struck": styler(DOUBLE),
    "Monospace": styler(MONO),
    "Circled": styler(CIRCLED),
    "Small Caps": smallcaps,
}


def st(name, text):
    return STYLES[name](text)


# decorative wraps (DejaVu/Symbola-safe symbols only)
def wrap(sym_l, text, sym_r=None):
    return f"{sym_l} {text} {sym_r or sym_l}"


# ============================================================ pin definitions
# Each pin: slug, kicker, headline (id), benefit (id), and 3-4 hero rows
# (label, sample) where sample is the *literal* styled string shown big.
PINS = [
    dict(
        slug="cara-membuat-tulisan-aesthetic",
        kicker="ULTRATEXTGEN · CARA PAKAI",
        headline="Cara Membuat Tulisan Aesthetic",
        benefit="Ketik teks biasa, langsung jadi puluhan gaya untuk disalin.",
        rows=[("biasa", "aesthetic"),
              ("Script", st("Script", "aesthetic")),
              ("Bold", st("Bold", "aesthetic")),
              ("Double-struck", st("Double-struck", "aesthetic"))],
        title="Cara Membuat Tulisan Aesthetic — Copy Paste Gratis",
        kw=["cara membuat tulisan aesthetic", "tulisan aesthetic",
            "tulisan aesthetic copy paste", "font aesthetic", "ubah font aesthetic"],
    ),
    dict(
        slug="bio-instagram-aesthetic",
        kicker="ULTRATEXTGEN · INSTAGRAM",
        headline="Bio Instagram Aesthetic",
        benefit="Bikin bio IG kamu beda dengan font & simbol estetik.",
        rows=[("Script", wrap("✶", st("Script", "self love"))),
              ("Italic", wrap("⊹", st("Italic", "living my life"))),
              ("Small Caps", wrap("˚✧", st("Small Caps", "be kind"), "✧˚"))],
        title="Bio Instagram Aesthetic — Font & Simbol Copy Paste",
        kw=["tulisan bio ig aesthetic", "bio instagram aesthetic",
            "tulisan instagram aesthetic", "huruf aesthetic ig", "font aesthetic"],
    ),
    dict(
        slug="nama-aesthetic",
        kicker="ULTRATEXTGEN · NAMA",
        headline="Nama Aesthetic & Keren",
        benefit="Ubah namamu jadi gaya aesthetic untuk profil & display name.",
        rows=[("Script", st("Script", "Sakura")),
              ("Bold", st("Bold", "Sakura")),
              ("Fraktur", st("Fraktur", "Sakura")),
              ("Double-struck", st("Double-struck", "Sakura"))],
        title="Nama Aesthetic & Keren — Font Nama Copy Paste",
        kw=["tulisan nama aesthetic", "font nama aesthetic", "nama keren",
            "desain nama keren", "huruf aesthetic"],
    ),
    dict(
        slug="nickname-ff-ml-keren",
        kicker="ULTRATEXTGEN · GAME",
        headline="Nickname FF & ML Keren",
        benefit="Bikin nickname Free Fire & Mobile Legends yang anti-mainstream.",
        rows=[("Monospace", wrap("≪", st("Monospace", "RAJA"), "≫")),
              ("Small Caps", wrap("★", st("Small Caps", "savage"))),
              ("Double-struck", wrap("⊱", st("Double-struck", "Hunter"), "⊰"))],
        title="Nickname FF & ML Keren — Font Game Copy Paste",
        kw=["font ff aesthetic", "font ml aesthetic", "nickname ml simple",
            "bikin nickname keren", "font keren untuk nickname"],
    ),
    dict(
        slug="tulisan-whatsapp-aesthetic",
        kicker="ULTRATEXTGEN · WHATSAPP",
        headline="Tulisan WhatsApp Aesthetic",
        benefit="Ubah status & chat WA jadi font aesthetic dalam sekejap.",
        rows=[("Script", st("Script", "good vibes")),
              ("Bold Italic", st("Bold Italic", "stay humble")),
              ("Monospace", st("Monospace", "online"))],
        title="Tulisan WhatsApp Aesthetic — Font WA Copy Paste",
        kw=["font wa aesthetic", "cara mengubah tulisan di wa menjadi aesthetic",
            "tulisan aesthetic", "font aesthetic wa", "tulisan keren"],
    ),
    dict(
        slug="ucapan-ulang-tahun-aesthetic",
        kicker="ULTRATEXTGEN · UCAPAN",
        headline="Ucapan Ulang Tahun Aesthetic",
        benefit="Tulisan happy birthday aesthetic untuk caption & story.",
        rows=[("Script", st("Script", "Happy Birthday")),
              ("Bold", wrap("✶", st("Bold", "Selamat Ultah"))),
              ("Italic", st("Italic", "stay blessed"))],
        title="Tulisan Happy Birthday Aesthetic — Copy Paste",
        kw=["tulisan happy birthday aesthetic", "tulisan aesthetic happy birthday",
            "tulisan aesthetic", "font aesthetic", "ucapan aesthetic"],
    ),
    dict(
        slug="huruf-aesthetic-a-z",
        kicker="ULTRATEXTGEN · HURUF",
        headline="Huruf Aesthetic A–Z",
        benefit="Semua huruf abjad dalam puluhan gaya, tinggal salin.",
        rows=[("Bold", st("Bold", "A B C")),
              ("Script", st("Script", "A B C")),
              ("Fraktur", st("Fraktur", "A B C")),
              ("Circled", st("Circled", "A B C"))],
        title="Huruf Aesthetic A–Z — Huruf Abjad Copy Paste",
        kw=["huruf aesthetic", "huruf abjad aesthetic", "huruf a aesthetic",
            "font huruf aesthetic", "huruf alphabet aesthetic"],
    ),
    dict(
        slug="tulisan-keren-unik",
        kicker="ULTRATEXTGEN · KEREN",
        headline="Tulisan Keren & Unik",
        benefit="Gaya font keren & unik biar postingan kamu standout.",
        rows=[("Bold", st("Bold", "keren")),
              ("Fraktur", st("Fraktur", "unik")),
              ("Double-struck", st("Double-struck", "beda")),
              ("Bold Script", st("Bold Script", "estetik"))],
        title="Tulisan Keren & Unik — Font Copy Paste Gratis",
        kw=["tulisan keren", "tulisan unik", "font keren aesthetic",
            "tulisan keren aesthetic", "huruf unik"],
    ),
    dict(
        slug="simbol-aesthetic-copy-paste",
        kicker="ULTRATEXTGEN · SIMBOL",
        headline="Simbol Aesthetic Copy Paste",
        benefit="Hiasi teks dengan simbol & ornamen estetik sekali klik.",
        rows=[("Hati & bintang", "♡ ✶ ⋆ ˚ ✧ ♥"),
              ("Bunga & ornamen", "❀ ✿ ⊹ ☆ ✰ ◇"),
              ("Pembatas", "✦ ── ✦   ⊱ ⋆ ⊰")],
        title="Simbol Aesthetic Copy Paste — Hiasan Teks Keren",
        kw=["simbol aesthetic", "simbol huruf aesthetic", "simbol keren aesthetic",
            "symbols aesthetic", "tulisan aesthetic"],
    ),
    dict(
        slug="font-lucu-cute",
        kicker="ULTRATEXTGEN · CUTE",
        headline="Font Lucu & Cute",
        benefit="Font gemoy plus kaomoji buat caption & chat yang lucu.",
        rows=[("Script", wrap("ʚ", st("Script", "cutie"), "ɞ")),
              ("Kaomoji", "(◕‿◕)  (≧◡≦)  ♡(˘▽˘)♡"),
              ("Lucu", "ʕ•ᴥ•ʔ  (✿◠‿◠)  (¬‿¬)")],
        title="Font Lucu & Cute — Tulisan Gemoy Copy Paste",
        kw=["font lucu aesthetic", "tulisan lucu aesthetic", "font lucu",
            "tulisan cantik aesthetic", "kaomoji"],
    ),
    dict(
        slug="copy-paste-tanpa-aplikasi",
        kicker="ULTRATEXTGEN · COPY PASTE",
        headline="Copy Paste, Tanpa Aplikasi",
        benefit="Langsung di browser, gratis, tanpa install & tanpa daftar.",
        rows=[("Ketik", "tulisan aesthetic"),
              ("Pilih gaya", st("Script", "tulisan aesthetic")),
              ("Tap untuk salin", st("Bold", "tersalin ✓"))],
        title="Tulisan Aesthetic Copy Paste — Gratis di Browser",
        kw=["tulisan aesthetic copy", "tulisan aesthetic copy paste",
            "salin font aesthetic", "huruf aesthetic copy", "tulisan keren copy paste"],
    ),
    dict(
        slug="tulisan-estetik-caption",
        kicker="ULTRATEXTGEN · CAPTION",
        headline="Tulisan Estetik buat Caption",
        benefit="Caption estetik yang bikin orang berhenti scroll.",
        rows=[("Italic", st("Italic", "soft launch")),
              ("Script", st("Script", "golden hour")),
              ("Small Caps", st("Small Caps", "main character"))],
        title="Tulisan Estetik buat Caption — Font Copy Paste",
        kw=["tulisan estetik", "teks estetik", "huruf estetik",
            "tulisan font aesthetic", "tulisan aesthetic"],
    ),
    dict(
        slug="tulisan-aesthetic-x-twitter",
        kicker="ULTRATEXTGEN · X / TWITTER",
        headline="Tulisan Aesthetic buat X",
        benefit="Bikin tweet, bio & display name X kamu lebih menonjol.",
        rows=[("Bold", st("Bold", "thread keren")),
              ("Monospace", st("Monospace", "highlight")),
              ("Italic", st("Italic", "vibe check"))],
        title="Tulisan Aesthetic buat X / Twitter — Copy Paste",
        kw=["tulisan aesthetic twitter", "text unik", "tulisan unik",
            "font unik", "tulisan aesthetic"],
    ),
    dict(
        slug="tulisan-tumpuk-vertikal",
        kicker="ULTRATEXTGEN · VERTIKAL",
        headline="Tulisan Tumpuk / Vertikal",
        benefit="Teks vertikal yang bikin bio & komentar beda sendiri.",
        rows=[("Vertikal", "ᴋ"), ("", "ᴇ"), ("", "ʀ"), ("", "ᴇ"), ("", "ɴ")],
        title="Tulisan Tumpuk / Vertikal Keren — Copy Paste",
        kw=["tulisan tumpuk keren", "tulisan tumpuk", "tulisan unik",
            "tulisan keren", "tulisan aesthetic"],
        vertical=True,
    ),

    # ---------------------------------------------------------------- batch 2
    # 14 new keyword angles (validated against Search Console + Semrush), all
    # still driving to /id/. Samples kept within the Symbola-safe style/symbol
    # set documented above.
    dict(
        slug="tulisan-tiktok-aesthetic",
        kicker="ULTRATEXTGEN · TIKTOK",
        headline="Tulisan TikTok Aesthetic",
        benefit="Font buat nama, bio & caption TikTok biar makin standout.",
        rows=[("Script", st("Script", "fyp aesthetic")),
              ("Bold", st("Bold", "viral")),
              ("Small Caps", wrap("✶", smallcaps("for you"))) ],
        title="Tulisan TikTok Aesthetic — Font Nama & Bio Copy Paste",
        kw=["tulisan tiktok aesthetic", "font tiktok aesthetic", "nama tiktok aesthetic",
            "font tiktok", "tulisan aesthetic"],
    ),
    dict(
        slug="font-ml-aesthetic",
        kicker="ULTRATEXTGEN · MOBILE LEGENDS",
        headline="Font ML Aesthetic",
        benefit="Nickname Mobile Legends keren yang bisa dipakai di game.",
        rows=[("Monospace", wrap("≪", st("Monospace", "LORD"), "≫")),
              ("Small Caps", wrap("★", smallcaps("savage"))),
              ("Double-struck", wrap("⊱", st("Double-struck", "Mythic"), "⊰"))],
        title="Font ML Aesthetic — Nickname Mobile Legends Copy Paste",
        kw=["font ml aesthetic", "font yang bisa di ml", "nickname ml keren",
            "nickname ml simple", "font keren untuk nickname"],
    ),
    dict(
        slug="ketikan-aesthetic",
        kicker="ULTRATEXTGEN · GENERATOR",
        headline="Ubah Tulisan Jadi Aesthetic",
        benefit="Ketik teks biasa, langsung diubah jadi puluhan gaya estetik.",
        rows=[("Ketik", "ketikan aesthetic"),
              ("Jadi", st("Script", "ketikan aesthetic")),
              ("Atau", st("Bold", "ketikan aesthetic"))],
        title="Ubah Tulisan Jadi Aesthetic — Generator Gratis Copy Paste",
        kw=["ketikan aesthetic", "ubah tulisan jadi aesthetic", "bikin tulisan aesthetic",
            "buat tulisan aesthetic", "edit tulisan aesthetic"],
    ),
    dict(
        slug="gaya-tulisan-aesthetic",
        kicker="ULTRATEXTGEN · GAYA",
        headline="Gaya Tulisan Aesthetic",
        benefit="Banyak pilihan gaya font aesthetic dalam satu tempat.",
        rows=[("Script", st("Script", "gaya")),
              ("Fraktur", st("Fraktur", "tulisan")),
              ("Bold Script", st("Bold Script", "aesthetic")),
              ("Double-struck", st("Double-struck", "keren"))],
        title="Gaya Tulisan Aesthetic — Banyak Pilihan Font Copy Paste",
        kw=["gaya tulisan aesthetic", "gaya font aesthetic", "gaya tulisan",
            "model tulisan aesthetic", "tulisan aesthetic"],
    ),
    dict(
        slug="tulisan-aesthetic-dark",
        kicker="ULTRATEXTGEN · DARK",
        headline="Tulisan Aesthetic Dark",
        benefit="Vibe gelap & gothic buat nama, bio, dan caption misterius.",
        rows=[("Fraktur", st("Fraktur", "midnight")),
              ("Bold Fraktur", wrap("☆", st("Fraktur", "shadow"))),
              ("Double-struck", st("Double-struck", "after dark"))],
        title="Tulisan Aesthetic Dark & Gothic — Font Copy Paste",
        kw=["tulisan dark aesthetic", "tulisan aesthetic dark", "font gothic",
            "font dark aesthetic", "tulisan keren dark"],
    ),
    dict(
        slug="caption-aesthetic-story",
        kicker="ULTRATEXTGEN · STORY",
        headline="Caption Aesthetic buat Story",
        benefit="Caption estetik biar story & feed kamu makin nempel di mata.",
        rows=[("Italic", st("Italic", "soft launch")),
              ("Script", st("Script", "golden hour")),
              ("Small Caps", wrap("˚✧", smallcaps("main character"), "✧˚"))],
        title="Caption Aesthetic buat Story IG — Font Copy Paste",
        kw=["caption aesthetic", "tulisan story aesthetic", "caption estetik",
            "teks estetik", "tulisan aesthetic"],
    ),
    dict(
        slug="tulisan-rapi-aesthetic",
        kicker="ULTRATEXTGEN · RAPI",
        headline="Tulisan Rapi & Aesthetic",
        benefit="Font bersih dan rapi yang tetap kelihatan estetik.",
        rows=[("Italic", st("Italic", "clean & calm")),
              ("Small Caps", smallcaps("simple is nice")),
              ("Monospace", st("Monospace", "rapi"))],
        title="Tulisan Rapi & Aesthetic — Font Bersih Copy Paste",
        kw=["tulisan rapi dan aesthetic", "tulisan rapi aesthetic", "tulisan bagus aesthetic",
            "font rapi aesthetic", "tulisan aesthetic"],
    ),
    dict(
        slug="huruf-aesthetic-nickname",
        kicker="ULTRATEXTGEN · NICKNAME",
        headline="Huruf Aesthetic buat Nickname",
        benefit="Huruf estetik biar nickname & username kamu beda sendiri.",
        rows=[("Double-struck", wrap("⊱", st("Double-struck", "Luna"), "⊰")),
              ("Small Caps", wrap("★", smallcaps("ghost"))),
              ("Monospace", wrap("≪", st("Monospace", "Zero"), "≫"))],
        title="Huruf Aesthetic buat Nickname — Font Keren Copy Paste",
        kw=["huruf aesthetic untuk nickname", "font keren untuk nickname",
            "huruf aesthetic nickname", "nickname aesthetic", "huruf aesthetic"],
    ),
    dict(
        slug="abjad-aesthetic",
        kicker="ULTRATEXTGEN · ABJAD",
        headline="Abjad Aesthetic A–Z",
        benefit="Semua abjad A sampai Z dalam berbagai gaya, tinggal salin.",
        rows=[("Script", st("Script", "A B C D")),
              ("Bold", st("Bold", "A B C D")),
              ("Double-struck", st("Double-struck", "A B C D")),
              ("Circled", st("Circled", "A B C D"))],
        title="Abjad Aesthetic A–Z — Huruf Abjad Copy Paste",
        kw=["abjad aesthetic", "huruf abjad aesthetic", "tulisan abjad aesthetic",
            "abjad aesthetic copy paste", "huruf aesthetic"],
    ),
    dict(
        slug="tulisan-aesthetic-simple",
        kicker="ULTRATEXTGEN · SIMPLE",
        headline="Tulisan Aesthetic Simple",
        benefit="Gaya minimalis & simple yang tetap estetik buat profil.",
        rows=[("Small Caps", smallcaps("less is more")),
              ("Italic", st("Italic", "minimal")),
              ("Monospace", st("Monospace", "simple"))],
        title="Tulisan Aesthetic Simple & Minimalis — Copy Paste",
        kw=["tulisan aesthetic simple", "font simple aesthetic", "tulisan simple aesthetic",
            "font minimalis aesthetic", "tulisan aesthetic"],
    ),
    dict(
        slug="huruf-kecil-aesthetic",
        kicker="ULTRATEXTGEN · HURUF KECIL",
        headline="Huruf Kecil Aesthetic",
        benefit="Font huruf kecil (small caps) yang aesthetic buat bio & nama.",
        rows=[("Small Caps", smallcaps("be gentle")),
              ("Small Caps", wrap("✶", smallcaps("soft soul"))),
              ("Small Caps", wrap("˚", smallcaps("quiet luxury"), "˚"))],
        title="Huruf Kecil Aesthetic (Small Caps) — Copy Paste",
        kw=["huruf kecil aesthetic", "font kecil aesthetic", "small caps aesthetic",
            "tulisan kecil aesthetic", "huruf aesthetic"],
    ),
    dict(
        slug="simbol-huruf-aesthetic",
        kicker="ULTRATEXTGEN · SIMBOL",
        headline="Simbol & Huruf Aesthetic",
        benefit="Gabungkan huruf estetik dengan simbol hiasan sekali klik.",
        rows=[("Hati & bintang", "♡ ✶ ⋆ ˚ ✧ ♥"),
              ("Bunga", "❀ ✿ ⊹ ☆ ✰ ◇"),
              ("Huruf + simbol", wrap("✦", st("Script", "aesthetic")))],
        title="Simbol & Huruf Aesthetic Copy Paste — Hiasan Teks",
        kw=["simbol huruf aesthetic", "simbol aesthetic", "hiasan tulisan aesthetic",
            "simbol keren aesthetic", "huruf aesthetic"],
    ),
    dict(
        slug="tulisan-nama-wa-aesthetic",
        kicker="ULTRATEXTGEN · WHATSAPP",
        headline="Tulisan Nama WA Aesthetic",
        benefit="Bikin nama & status WhatsApp kamu keren dan aesthetic.",
        rows=[("Script", st("Script", "Aira")),
              ("Bold Script", st("Bold Script", "Bilqis")),
              ("Double-struck", st("Double-struck", "Reza"))],
        title="Tulisan Nama WA Keren Aesthetic — Font Copy Paste",
        kw=["tulisan nama wa keren aesthetic", "nama wa aesthetic", "font wa aesthetic",
            "tulisan nama wa", "tulisan aesthetic"],
    ),
    dict(
        slug="font-aesthetic-copy",
        kicker="ULTRATEXTGEN · COPY",
        headline="Font Aesthetic Tinggal Copy",
        benefit="Pilih gaya, tap untuk salin, langsung tempel di mana saja.",
        rows=[("Pilih", st("Script", "font aesthetic")),
              ("Salin", st("Bold", "tersalin ✓")),
              ("Tempel", st("Italic", "selesai"))],
        title="Font Aesthetic Tinggal Copy — Salin Sekali Tap",
        kw=["font aesthetic copy", "salin font aesthetic", "huruf aesthetic copy",
            "font aesthetic copy paste", "tulisan aesthetic copy"],
    ),
]

BOARD = "Tulisan Aesthetic, Font & Simbol Keren (Copy Paste)"


# ============================================================ pin renderer
def fit_size(samples, base, lo, max_chars):
    """Shrink row font-size if the longest sample would overflow the card."""
    longest = max((len(s) for s in samples), default=1)
    if longest <= max_chars:
        return base
    return max(lo, int(base * max_chars / longest))


def pin_svg(pin):
    p = "id" + pin["slug"].replace("-", "")[:8]
    headline = esc(pin["headline"])
    rows = pin["rows"]

    # --- kicker + headline (wrap, size down only when long) ---
    wrapped = textwrap.wrap(headline, width=17)[:3]
    if len(wrapped) <= 1:
        fs, lh = 84, 96
    elif len(wrapped) == 2:
        fs, lh = 78, 90
    else:
        fs, lh = 64, 76
    ty0 = 250
    tspans = "".join(f'<tspan x="80" y="{ty0 + i*lh}">{l}</tspan>'
                     for i, l in enumerate(wrapped))
    title_bottom = ty0 + (len(wrapped) - 1) * lh

    # --- hero card with the literal styled rows ---
    card_x, card_y, card_w, card_h = 80, 470, 840, 740
    rows_svg = ""
    if pin.get("vertical"):
        # stacked single glyphs, centered
        n = len(rows)
        step = min(150, (card_h - 120) // n)
        y = card_y + 110
        for _, sample in rows:
            rows_svg += (f'<text x="{card_x + card_w/2}" y="{y}" font-family="{AES}" '
                         f'font-size="120" fill="{INK}" text-anchor="middle">'
                         f'{esc(sample)}</text>')
            y += step
    else:
        n = len(rows)
        # vertical rhythm inside the card
        pad_top = 70
        slot = (card_h - pad_top - 40) // n
        samples = [s for _, s in rows]
        size = fit_size(samples, 70, 40, 18)
        y = card_y + pad_top
        for label, sample in rows:
            if label:
                rows_svg += (f'<text x="{card_x + 60}" y="{y}" font-family="{SANS}" '
                             f'font-size="24" font-weight="700" letter-spacing="2" '
                             f'fill="{PURPLE}">{esc(label.upper())}</text>')
            # plain ASCII rows (the "before" / "type this" state) use the clean
            # sans; styled rows use the Unicode-capable stack.
            font = SANS if sample.isascii() else AES
            rows_svg += (f'<text x="{card_x + 60}" y="{y + 58}" font-family="{font}" '
                         f'font-size="{size}" fill="{INK}">{esc(sample)}</text>')
            if (label, sample) != rows[-1]:
                ly = y + slot - 24
                rows_svg += (f'<line x1="{card_x + 60}" y1="{ly}" '
                             f'x2="{card_x + card_w - 60}" y2="{ly}" '
                             f'stroke="{INK}" stroke-opacity="0.08" stroke-width="2"/>')
            y += slot

    # --- benefit line under the card ---
    blines = textwrap.wrap(esc(pin["benefit"]), width=40)[:2]
    by0 = card_y + card_h + 66
    bspans = "".join(f'<tspan x="500" y="{by0 + i*44}">{l}</tspan>'
                     for i, l in enumerate(blines))

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PIN_W} {PIN_H}"
     width="{PIN_W}" height="{PIN_H}">
  {defs(p)}
  <rect width="{PIN_W}" height="{PIN_H}" fill="{PANEL}"/>
  <rect width="{PIN_W}" height="{PIN_H}" fill="url(#dots{p})"/>
  <circle cx="860" cy="90" r="420" fill="url(#glow{p})"/>
  <circle cx="120" cy="1380" r="360" fill="url(#glow{p})"/>
  <rect x="0" y="0" width="16" height="{PIN_H}" fill="url(#gv{p})"/>

  <text x="80" y="150" font-family="{SANS}" font-size="28" font-weight="700"
        letter-spacing="4" fill="{PURPLE}">{esc(pin['kicker'])}</text>
  <text font-family="{SANS}" font-size="{fs}" font-weight="800"
        fill="{INK}">{tspans}</text>
  <rect x="82" y="{title_bottom + 34}" width="120" height="9" rx="4"
        fill="url(#g{p})"/>

  <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="48"
        fill="#fff" stroke="{INK}" stroke-opacity="0.08"/>
  <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="48"
        fill="url(#glow{p})"/>
  {rows_svg}

  <text font-family="{SANS}" font-size="32" fill="{SUB}"
        text-anchor="middle">{bspans}</text>

  <line x1="330" y1="1392" x2="610" y2="1392" stroke="url(#g{p})"
        stroke-width="3" opacity="0.5"/>
  <text x="500" y="1352" font-family="{SANS}" font-size="26" font-weight="700"
        letter-spacing="3" fill="{PURPLE}" text-anchor="middle">KETUK UNTUK SALIN</text>
  <g transform="translate(300 1432)">
    <rect x="0" y="-38" width="56" height="56" rx="16" fill="url(#gv{p})"/>
    <text x="28" y="3" font-family="{SANS}" font-size="34" font-weight="800"
          fill="#fff" text-anchor="middle">U</text>
    <text x="74" y="4" font-family="{SANS}" font-size="40" font-weight="800"
          fill="{INK}">UltraTextGen<tspan fill="{PURPLE}">.com/id</tspan></text>
  </g>
</svg>"""


# ============================================================ pin copy
def utm(slug):
    return (f"{DEST}?utm_source=pinterest&utm_medium=social"
            f"&utm_campaign=id_howto_pins&utm_content={slug}")


def description(pin):
    samples = ", ".join(s for _, s in pin["rows"] if not pin.get("vertical"))[:90]
    d = (f"{pin['headline']} — {pin['benefit']} Ketik sekali, salin semua gaya "
         f"Unicode di UltraTextGen: gratis, langsung di browser, tanpa aplikasi. "
         f"Cocok untuk bio, caption, nama, status & komentar.")
    if len(d) > 500:
        d = d[:497].rsplit(" ", 1)[0] + "…"
    return d


def alt(pin):
    return (f"Pin Pinterest vertikal berbahasa Indonesia: {pin['headline']} — "
            f"contoh tulisan aesthetic untuk disalin dari UltraTextGen.")


COLUMNS = ["slug", "image_path", "width", "height", "board", "pin_title",
           "pin_description", "pin_keywords", "pin_alt_text",
           "destination_url", "utm_destination_url"]


def main():
    import cairosvg
    out = []
    for pin in PINS:
        svg = pin_svg(pin)
        path = os.path.join(PIN_DIR, f"{pin['slug']}.png")
        cairosvg.svg2png(bytestring=svg.encode(), write_to=path,
                         output_width=PIN_W, output_height=PIN_H)
        out.append({
            "slug": pin["slug"],
            "image_path": f"assets/pinterest/id/{pin['slug']}.png",
            "width": str(PIN_W), "height": str(PIN_H),
            "board": BOARD,
            "pin_title": pin["title"],
            "pin_description": description(pin),
            "pin_keywords": ", ".join(pin["kw"]),
            "pin_alt_text": alt(pin),
            "destination_url": DEST,
            "utm_destination_url": utm(pin["slug"]),
        })
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    print(f"generated {len(out)} Indonesian pins -> assets/pinterest/id/")
    print(f"wrote inventory -> data/id_pinterest_pins.csv")
    _build_upload()
    for r in out:
        tl, dl = len(r["pin_title"]), len(r["pin_description"])
        flag = "" if (40 <= tl <= 100 and 100 <= dl <= 500) else "  <-- check len"
        print(f"  {r['slug']:36} title {tl:3} desc {dl:3}{flag}")


if __name__ == "__main__":
    main()
