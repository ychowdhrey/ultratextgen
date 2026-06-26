#!/usr/bin/env python3
"""
Generates the Roblox Pinterest pin board for UltraTextGen.

Mirrors scripts/generate-id-pins.py / generate-discord-pins.py: same brand skin
(generate-site-art.py), same 1000x1500 vertical pin, same Symbola-safe styled
heroes, English copy, "TAP TO COPY" cue and a per-pin destination.

Semrush/Search Console show Roblox demand is overwhelmingly about NAMES, not
symbols: name ideas cool/cute/funny/good ~34K US/mo, display name ~26K,
how-to-change-name ~14K, name generator ~9K, invisible name ~2K — vs symbols
~1K. So the board leads with name/display-name/generator pins (-> the
/roblox/name-generator/ tool) and keeps a small symbol/text-art set
(-> /library/roblox-symbols/, /library/roblox-text-art/). The invisible-name
intent is served by /library/invisible-character/.

Outputs:
  - assets/pinterest/roblox/<slug>.png    1000x1500 vertical pins
  - data/roblox_pinterest_pins.csv        internal inventory
  - data/roblox_pinterest_pins_upload.csv Pinterest-importer-ready CSV

Run:  python3 scripts/generate-roblox-pins.py
Requires: cairosvg + a Symbola font (apt: fonts-symbola fonts-noto-core).
"""
import csv
import importlib.util
import os
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PIN_DIR = os.path.join(ROOT, "assets", "pinterest", "roblox")
CSV_OUT = os.path.join(ROOT, "data", "roblox_pinterest_pins.csv")
os.makedirs(PIN_DIR, exist_ok=True)

DOMAIN = "https://ultratextgen.com"
PIN_W, PIN_H = 1000, 1500
CAMPAIGN = "roblox_pins"
BOARD = "Roblox Names, Display Names & Symbols"

AES = ("Symbola, 'Noto Sans Math', 'Noto Sans Symbols2', "
       "'Noto Sans CJK JP', 'DejaVu Sans', sans-serif")


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ART = _load(os.path.join(HERE, "generate-site-art.py"), "siteart")
PURPLE, BLUE, INK, SUB = ART.PURPLE, ART.BLUE, ART.INK, ART.SUB
PANEL, SANS = ART.PANEL, ART.SANS
defs, esc = ART.defs, ART.esc

IDGEN = _load(os.path.join(HERE, "generate-id-pins.py"), "idgen")
st, smallcaps, wrap = IDGEN.st, IDGEN.smallcaps, IDGEN.wrap


def _build_upload():
    conv = _load(os.path.join(HERE, "build_pinterest_upload.py"), "build_upload")
    conv.convert("roblox")


# ============================================================ pin definitions
NAMEGEN = f"{DOMAIN}/roblox/name-generator/"
SYMBOLS = f"{DOMAIN}/library/roblox-symbols/"
PINS = [
    dict(
        slug="name-generator",
        kicker="ULTRATEXTGEN · GENERATOR",
        headline="Free Roblox Name Generator",
        benefit="Type a name and get dozens of styled, copy-paste versions instantly.",
        rows=[("Type", "shadow"),
              ("Get", st("Bold", "shadow")),
              ("Or", st("Script", "shadow")),
              ("Or", st("Double-struck", "shadow"))],
        title="Free Roblox Name Generator — Copy & Paste Name Ideas",
        kw=["roblox name generator", "name generator roblox", "roblox name ideas",
            "roblox names", "names for roblox"],
        dest=NAMEGEN,
    ),
    dict(
        slug="cool-names",
        kicker="ULTRATEXTGEN · COOL",
        headline="Cool Roblox Name Ideas",
        benefit="Sharp, gamer-ready names you can copy straight into Roblox.",
        rows=[("Monospace", wrap("≪", st("Monospace", "VENOM"), "≫")),
              ("Small Caps", wrap("★", smallcaps("reaper"))),
              ("Double-struck", wrap("⊱", st("Double-struck", "Frost"), "⊰"))],
        title="Cool Roblox Name Ideas — Copy & Paste Username Styles",
        kw=["cool roblox names", "cool names for roblox", "good roblox names",
            "best roblox names", "awesome names for roblox"],
        dest=NAMEGEN,
    ),
    dict(
        slug="cute-names",
        kicker="ULTRATEXTGEN · CUTE",
        headline="Cute Roblox Name Ideas",
        benefit="Soft, aesthetic names with hearts and stars — ready to paste.",
        rows=[("Script", wrap("♡", st("Script", "honeybun"))),
              ("Small Caps", wrap("✿", smallcaps("sugar"))),
              ("Script", wrap("˚✧", st("Script", "moonpie"), "✧˚"))],
        title="Cute Roblox Name Ideas — Aesthetic Names to Copy & Paste",
        kw=["cute roblox names", "cute roblox display names", "aesthetic roblox names",
            "cute names for roblox", "roblox username ideas"],
        dest=NAMEGEN,
    ),
    dict(
        slug="funny-names",
        kicker="ULTRATEXTGEN · FUNNY",
        headline="Funny Roblox Name Ideas",
        benefit="Names that get a laugh in chat — copy your favourite and go.",
        rows=[("Bold", st("Bold", "not a bot")),
              ("Monospace", st("Monospace", "lagswitch")),
              ("Small Caps", smallcaps("error 404 name"))],
        title="Funny Roblox Name Ideas — Copy & Paste Username Jokes",
        kw=["funny roblox names", "funny names for roblox", "funny roblox usernames",
            "roblox name ideas", "names for roblox"],
        dest=NAMEGEN,
    ),
    dict(
        slug="display-name-ideas",
        kicker="ULTRATEXTGEN · DISPLAY NAME",
        headline="Roblox Display Name Ideas",
        benefit="Style your display name without changing your real @username.",
        rows=[("Script", st("Script", "starlight")),
              ("Fraktur", st("Fraktur", "phantom")),
              ("Double-struck", st("Double-struck", "nebula"))],
        title="Roblox Display Name Ideas — Styled Names to Copy & Paste",
        kw=["roblox display name ideas", "roblox display names", "display names for roblox",
            "roblox display name", "good display names for roblox"],
        dest=NAMEGEN,
    ),
    dict(
        slug="aesthetic-names",
        kicker="ULTRATEXTGEN · AESTHETIC",
        headline="Aesthetic Roblox Display Names",
        benefit="Soft-girl, Y2K and cottagecore name vibes you can paste in seconds.",
        rows=[("Script", wrap("⊹", st("Script", "fairydust"))),
              ("Small Caps", wrap("✶", smallcaps("cyber angel"))),
              ("Script", wrap("♡", st("Script", "lovecore")))],
        title="Aesthetic Roblox Display Names (Y2K & Soft) — Copy & Paste",
        kw=["aesthetic roblox names", "aesthetic roblox display names",
            "roblox display name ideas y2k", "cute roblox display names", "soft roblox names"],
        dest=NAMEGEN,
    ),
    dict(
        slug="how-to-change-name",
        kicker="ULTRATEXTGEN · HOW TO",
        headline="How to Change Your Roblox Name",
        benefit="Display name vs username explained — plus styled names to copy.",
        rows=[("Display name", "free to change"),
              ("Username", "costs Robux"),
              ("Style it", st("Script", "your name"))],
        title="How to Change Your Roblox Name — Display Name & Username Guide",
        kw=["how to change your name on roblox", "how to change your name in roblox",
            "how do you change your name in roblox", "change name roblox", "roblox name change"],
        dest=f"{DOMAIN}/answers/how-to-change-roblox-username/",
    ),
    dict(
        slug="invisible-name",
        kicker="ULTRATEXTGEN · INVISIBLE",
        headline="How to Get an Invisible Roblox Name",
        benefit="Copy a blank invisible character to use as a hidden name or text.",
        rows=[("Copy this", "⠀ (invisible)"),
              ("Looks like", "[ blank ]"),
              ("Use as", smallcaps("hidden name"))],
        title="How to Get an Invisible Roblox Name — Blank Character Copy & Paste",
        kw=["invisible roblox name", "roblox invisible display name",
            "roblox invisible name copy and paste", "blank roblox name", "invisible character"],
        dest=f"{DOMAIN}/library/invisible-character/",
    ),
    dict(
        slug="display-names-copy-paste",
        kicker="ULTRATEXTGEN · COPY PASTE",
        headline="Roblox Display Names to Copy & Paste",
        benefit="Ready-made styled display names — tap to copy, paste into Roblox.",
        rows=[("Bold Script", st("Bold Script", "Aurora")),
              ("Double-struck", wrap("✦", st("Double-struck", "Zenith"))),
              ("Small Caps", wrap("★", smallcaps("vortex")))],
        title="Roblox Display Names to Copy & Paste — Ready-Made Styled Names",
        kw=["roblox display names copy and paste", "roblox copy and paste display names",
            "roblox display name copy and paste", "roblox names copy and paste", "display names for roblox"],
        dest=SYMBOLS,
    ),
    dict(
        slug="symbols-that-work",
        kicker="ULTRATEXTGEN · SYMBOLS",
        headline="Symbols That Work in Roblox Names",
        benefit="Decorations that pass Roblox's filter — copy the ones that actually paste.",
        rows=[("Stars", "✶ ⋆ ✧ ★ ✰ ✦"),
              ("Hearts & flowers", "♡ ❀ ✿ ⊹ ◇"),
              ("Brackets", "≪ ≫  ⊱ ⊰")],
        title="Symbols That Work in Roblox Names — Copy & Paste Decorations",
        kw=["symbols that work on roblox", "roblox friendly symbols",
            "symbols that work in roblox display names", "roblox name symbols", "roblox symbols"],
        dest=SYMBOLS,
    ),
    dict(
        slug="display-name-symbols",
        kicker="ULTRATEXTGEN · SYMBOLS",
        headline="Symbols for Your Roblox Display Name",
        benefit="Frame your display name with stars, brackets and dividers.",
        rows=[("Framed", wrap("⊱", smallcaps("nova"), "⊰")),
              ("Starred", wrap("✶", st("Script", "luna"))),
              ("Divided", "✦ ── ✦   ⊹ ˚ ⊹")],
        title="Symbols for Your Roblox Display Name — Copy & Paste Name Art",
        kw=["roblox display name symbols", "symbols for roblox display name",
            "roblox symbol display name", "roblox username symbols", "roblox symbols copy and paste"],
        dest=SYMBOLS,
    ),
    dict(
        slug="text-art",
        kicker="ULTRATEXTGEN · TEXT ART",
        headline="Roblox Text Art for Your Bio",
        benefit="Copy-paste text art and dividers to decorate your Roblox bio.",
        rows=[("Divider", "•°•·.·°•  ❀  •°·.·°•"),
              ("Frame", "╭┈ ♡ ┈╮"),
              ("Accent", "⊹ ˚ ˖   ✦ ⋆ ✧ ˚")],
        title="Roblox Text Art for Your Bio — Copy & Paste Dividers & Decorations",
        kw=["roblox text art", "roblox bio art", "roblox ascii art",
            "roblox bio ideas", "roblox text art copy and paste"],
        dest=f"{DOMAIN}/library/roblox-text-art/",
    ),
]


# ============================================================ pin renderer
def fit_size(samples, base, lo, max_chars):
    longest = max((len(s) for s in samples), default=1)
    if longest <= max_chars:
        return base
    return max(lo, int(base * max_chars / longest))


def pin_svg(pin):
    p = "rb" + pin["slug"].replace("-", "")[:8]
    headline = esc(pin["headline"])
    rows = pin["rows"]

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

    card_x, card_y, card_w, card_h = 80, 470, 840, 740
    n = len(rows)
    pad_top = 70
    slot = (card_h - pad_top - 40) // n
    samples = [s for _, s in rows]
    size = fit_size(samples, 70, 38, 18)
    y = card_y + pad_top
    rows_svg = ""
    for label, sample in rows:
        if label:
            rows_svg += (f'<text x="{card_x + 60}" y="{y}" font-family="{SANS}" '
                         f'font-size="24" font-weight="700" letter-spacing="2" '
                         f'fill="{PURPLE}">{esc(label.upper())}</text>')
        font = SANS if sample.isascii() else AES
        rows_svg += (f'<text x="{card_x + 60}" y="{y + 58}" font-family="{font}" '
                     f'font-size="{size}" fill="{INK}">{esc(sample)}</text>')
        if (label, sample) != rows[-1]:
            ly = y + slot - 24
            rows_svg += (f'<line x1="{card_x + 60}" y1="{ly}" '
                         f'x2="{card_x + card_w - 60}" y2="{ly}" '
                         f'stroke="{INK}" stroke-opacity="0.08" stroke-width="2"/>')
        y += slot

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

  <line x1="350" y1="1392" x2="590" y2="1392" stroke="url(#g{p})"
        stroke-width="3" opacity="0.5"/>
  <text x="500" y="1352" font-family="{SANS}" font-size="26" font-weight="700"
        letter-spacing="3" fill="{PURPLE}" text-anchor="middle">TAP TO COPY</text>
  <g transform="translate(320 1432)">
    <rect x="0" y="-38" width="56" height="56" rx="16" fill="url(#gv{p})"/>
    <text x="28" y="3" font-family="{SANS}" font-size="34" font-weight="800"
          fill="#fff" text-anchor="middle">U</text>
    <text x="74" y="4" font-family="{SANS}" font-size="40" font-weight="800"
          fill="{INK}">UltraTextGen<tspan fill="{PURPLE}">.com</tspan></text>
  </g>
</svg>"""


# ============================================================ pin copy
def utm(slug, dest):
    sep = "&" if "?" in dest else "?"
    return (f"{dest}{sep}utm_source=pinterest&utm_medium=social"
            f"&utm_campaign={CAMPAIGN}&utm_content={slug}")


def description(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Type once and copy every Unicode "
         f"style at UltraTextGen: free, in your browser, no app. Perfect for Roblox "
         f"usernames, display names and bios.")
    if len(d) > 500:
        d = d[:497].rsplit(" ", 1)[0] + "…"
    return d


def alt(pin):
    return (f"Vertical Pinterest pin: {pin['headline']} — copy-paste Roblox name "
            f"examples from UltraTextGen.")


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
            "image_path": f"assets/pinterest/roblox/{pin['slug']}.png",
            "width": str(PIN_W), "height": str(PIN_H),
            "board": BOARD,
            "pin_title": pin["title"],
            "pin_description": description(pin),
            "pin_keywords": ", ".join(pin["kw"]),
            "pin_alt_text": alt(pin),
            "destination_url": pin["dest"],
            "utm_destination_url": utm(pin["slug"], pin["dest"]),
        })
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    print(f"generated {len(out)} Roblox pins -> assets/pinterest/roblox/")
    print(f"wrote inventory -> data/roblox_pinterest_pins.csv")
    _build_upload()
    for r in out:
        tl, dl = len(r["pin_title"]), len(r["pin_description"])
        flag = "" if (40 <= tl <= 100 and 100 <= dl <= 500) else "  <-- check len"
        print(f"  {r['slug']:26} title {tl:3} desc {dl:3}{flag}")


if __name__ == "__main__":
    main()
