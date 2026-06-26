#!/usr/bin/env python3
"""
Generates the Discord Pinterest pin board for UltraTextGen.

Mirrors scripts/generate-id-pins.py (the reference how-to board): same brand
skin imported from generate-site-art.py, same 1000x1500 vertical pin, same
Symbola-safe styled-text heroes. Differences: English copy, a "TAP TO COPY"
cue, and a *per-pin* destination — each pin points to the page that actually
ranks for its keyword (the /discord/ generator, the /answers/ explainers, or
the /library/discord-symbols/ reference).

Demand is dominated by the "discord fonts" head term (~70K US/mo across
discord fonts / discord font / fonts for discord / font for discord) plus
how-to-change (6.5K), name-as-a-font (5.3K), bold/small/size (3.5K),
commands (2.4K) and what-font (1.5K) — Search Console + Semrush. ("No Nitro"
is near-zero volume, so it lives in copy, not as its own pin.)

Outputs:
  - assets/pinterest/discord/<slug>.png   1000x1500 vertical pins
  - data/discord_pinterest_pins.csv       internal inventory
  - data/discord_pinterest_pins_upload.csv Pinterest-importer-ready CSV

Run:  python3 scripts/generate-discord-pins.py
Requires: cairosvg + a Symbola font (apt: fonts-symbola fonts-noto-core).
"""
import csv
import importlib.util
import os
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PIN_DIR = os.path.join(ROOT, "assets", "pinterest", "discord")
CSV_OUT = os.path.join(ROOT, "data", "discord_pinterest_pins.csv")
os.makedirs(PIN_DIR, exist_ok=True)

DOMAIN = "https://ultratextgen.com"
PIN_W, PIN_H = 1000, 1500
CAMPAIGN = "discord_pins"
BOARD = "Discord Fonts, Symbols & Names"

AES = ("Symbola, 'Noto Sans Math', 'Noto Sans Symbols2', "
       "'Noto Sans CJK JP', 'DejaVu Sans', sans-serif")


# ---- shared brand system + reused style maps (single sources of truth) -----
def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ART = _load(os.path.join(HERE, "generate-site-art.py"), "siteart")
PURPLE, BLUE, INK, SUB = ART.PURPLE, ART.BLUE, ART.INK, ART.SUB
PANEL, SANS = ART.PANEL, ART.SANS
defs, esc = ART.defs, ART.esc

# Reuse the exact Symbola-safe style transforms from the id generator so every
# board renders identical fonts (don't re-define the Unicode maps).
IDGEN = _load(os.path.join(HERE, "generate-id-pins.py"), "idgen")
st, smallcaps, wrap = IDGEN.st, IDGEN.smallcaps, IDGEN.wrap


def _build_upload():
    conv = _load(os.path.join(HERE, "build_pinterest_upload.py"), "build_upload")
    conv.convert("discord")


# ============================================================ pin definitions
# Each pin: slug, kicker, headline, benefit, 3-4 hero rows (label, sample),
# title, kw, dest (the ranking page for that keyword).
DISCORD = f"{DOMAIN}/discord/"
PINS = [
    dict(
        slug="fonts-copy-paste",
        kicker="ULTRATEXTGEN · DISCORD",
        headline="Discord Fonts Copy & Paste",
        benefit="Type once, copy any style, paste into Discord — no Nitro needed.",
        rows=[("Bold", st("Bold", "discord")),
              ("Italic", st("Italic", "discord")),
              ("Script", st("Script", "discord")),
              ("Fraktur", st("Fraktur", "discord"))],
        title="Discord Fonts Copy & Paste (No Nitro Needed) — Free Generator",
        kw=["discord fonts", "discord fonts copy and paste", "fonts for discord",
            "discord font copy and paste", "discord font"],
        dest=DISCORD,
    ),
    dict(
        slug="name-as-a-font",
        kicker="ULTRATEXTGEN · NAME",
        headline="Turn Your Discord Name Into a Font",
        benefit="Style your username in seconds — works in your display name & profile.",
        rows=[("Bold", st("Bold", "Nova")),
              ("Script", st("Script", "Nova")),
              ("Double-struck", st("Double-struck", "Nova")),
              ("Small Caps", wrap("★", smallcaps("Nova")))],
        title="Turn Your Discord Name Into a Font — Copy & Paste Username Styles",
        kw=["discord name as a font", "discord name font", "discord name fonts",
            "different discord fonts for name", "discord username fonts"],
        dest=DISCORD,
    ),
    dict(
        slug="change-name-font",
        kicker="ULTRATEXTGEN · HOW TO",
        headline="How to Change Your Discord Name Font",
        benefit="Three steps: type your name, pick a font, paste it into Discord.",
        rows=[("1 · Type", "your name"),
              ("2 · Pick a font", st("Script", "your name")),
              ("3 · Paste", st("Bold", "your name ✓"))],
        title="How to Change Your Discord Name Font — 3 Easy Steps (Free)",
        kw=["how to change discord name font", "how to change font on discord",
            "how to change font in discord", "discord font change", "discord font changer"],
        dest=DISCORD,
    ),
    dict(
        slug="font-generator",
        kicker="ULTRATEXTGEN · GENERATOR",
        headline="Free Discord Font Generator",
        benefit="Dozens of copy-paste fonts for names, messages and bios.",
        rows=[("Bold", st("Bold", "gamer")),
              ("Monospace", st("Monospace", "gamer")),
              ("Bold Script", st("Bold Script", "gamer")),
              ("Circled", st("Circled", "gamer"))],
        title="Free Discord Font Generator — Copy & Paste Fonts for Discord",
        kw=["discord font generator", "font generator discord", "discord fonts generator",
            "font generator for discord", "font for discord"],
        dest=DISCORD,
    ),
    dict(
        slug="bold-small-text",
        kicker="ULTRATEXTGEN · STYLES",
        headline="Bold, Italic & Small Text for Discord",
        benefit="Real Unicode bold, italics and tiny small-caps that paste anywhere.",
        rows=[("Bold", st("Bold", "bold text")),
              ("Italic", st("Italic", "italic text")),
              ("Small Caps", smallcaps("small text"))],
        title="Bold, Italic & Small Text for Discord — Copy & Paste",
        kw=["discord bold font", "small font discord", "discord bold text",
            "discord italic", "discord text font"],
        dest=DISCORD,
    ),
    dict(
        slug="text-formatting",
        kicker="ULTRATEXTGEN · FORMATTING",
        headline="Discord Text Formatting & Font Commands",
        benefit="Markdown does bold & italics; Unicode fonts do everything else.",
        rows=[("Markdown bold", "**bold**"),
              ("Markdown italic", "*italic*  __underline__"),
              ("Unicode fonts", st("Script", "everything else"))],
        title="Discord Text Formatting & Font Commands — Bold, Italic & Beyond",
        kw=["discord font commands", "discord text formatting", "discord fonts commands",
            "discord font size command", "how do discord font"],
        dest=DISCORD,
    ),
    dict(
        slug="what-font-discord",
        kicker="ULTRATEXTGEN · ANSWER",
        headline="What Font Does Discord Use?",
        benefit="Discord's default is gg sans — here's how to add fancy fonts yourself.",
        rows=[("Default", "gg sans"),
              ("Add your own", st("Bold", "fancy fonts")),
              ("Copy & paste", st("Script", "anywhere"))],
        title="What Font Does Discord Use? (And How to Add Your Own)",
        kw=["what font does discord use", "what font does discord use for text",
            "discord font name", "discord text fonts", "font discord"],
        dest=f"{DOMAIN}/answers/what-font-does-discord-use/",
    ),
    dict(
        slug="display-name-styles",
        kicker="ULTRATEXTGEN · DISPLAY NAME",
        headline="Discord Display Name Styles",
        benefit="Style your display name without touching your real username.",
        rows=[("Script", wrap("⊹", st("Script", "moonlight"))),
              ("Double-struck", wrap("⊱", st("Double-struck", "Phantom"), "⊰")),
              ("Small Caps", wrap("✦", smallcaps("aesthetic")))],
        title="Discord Display Name Styles — Aesthetic Fonts to Copy & Paste",
        kw=["discord display name font", "discord display name", "display name discord",
            "discord name style", "discord display name styles"],
        dest=DISCORD,
    ),
    dict(
        slug="names-copy-paste",
        kicker="ULTRATEXTGEN · IDEAS",
        headline="Aesthetic Discord Names to Copy & Paste",
        benefit="Ready-made styled names — just copy your favourite and paste.",
        rows=[("Script", wrap("✶", st("Script", "stardust"))),
              ("Fraktur", wrap("☆", st("Fraktur", "nightfall"))),
              ("Small Caps", wrap("♡", smallcaps("honey")))],
        title="Aesthetic Discord Names to Copy & Paste — Username Ideas",
        kw=["discord names copy and paste", "aesthetic discord names",
            "cool discord fonts", "discord username ideas", "discord fonts copy and paste"],
        dest=DISCORD,
    ),
    dict(
        slug="symbols-for-names",
        kicker="ULTRATEXTGEN · SYMBOLS",
        headline="Discord Symbols for Usernames",
        benefit="Decorate your name with brackets, stars and dividers that paste cleanly.",
        rows=[("Stars & hearts", "✶ ⋆ ✧ ★ ♡ ✰"),
              ("Brackets", "≪ ≫  ⊱ ⊰  ⟨ ⟩"),
              ("Dividers", "✦ ── ✦   ⊹ ˚ ⊹")],
        title="Discord Symbols for Usernames — Copy & Paste Name Decorations",
        kw=["discord symbols", "discord font symbols", "symbols for discord name",
            "discord symbols copy and paste", "discord fonts symbols"],
        dest=f"{DOMAIN}/library/discord-symbols/",
    ),
    dict(
        slug="allowed-characters",
        kicker="ULTRATEXTGEN · ANSWER",
        headline="Which Characters Work in Discord Names",
        benefit="Not every symbol survives Discord's filter — here's what actually pastes.",
        rows=[("Works", st("Bold", "abc") + "  " + st("Script", "abc") + "  ✶ ★ ♡"),
              ("Risky", "emoji-only · zalgo · invisible"),
              ("Safe pick", st("Double-struck", "clean name"))],
        title="Which Characters Work in Discord Names — Allowed Symbols Guide",
        kw=["discord allowed characters", "symbols that work in discord",
            "discord name characters", "characters for discord name", "discord symbols"],
        dest=f"{DOMAIN}/answers/discord-allowed-characters/",
    ),
    dict(
        slug="server-channel-fonts",
        kicker="ULTRATEXTGEN · SERVER",
        headline="Fonts for Discord Servers & Channels",
        benefit="Style channel names, categories and intro text so your server stands out.",
        rows=[("Channel", st("Bold", "welcome")),
              ("Category", smallcaps("rules & info")),
              ("Intro", st("Script", "say hi"))],
        title="Fonts for Discord Servers & Channels — Copy & Paste Styles",
        kw=["introduction fonts discord", "discord channel symbols",
            "discord server fonts", "channel name fonts discord", "fonts discord"],
        dest=DISCORD,
    ),
]


# ============================================================ pin renderer
def fit_size(samples, base, lo, max_chars):
    longest = max((len(s) for s in samples), default=1)
    if longest <= max_chars:
        return base
    return max(lo, int(base * max_chars / longest))


def pin_svg(pin):
    p = "dc" + pin["slug"].replace("-", "")[:8]
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
         f"style at UltraTextGen: free, in your browser, no app and no Nitro. "
         f"Great for usernames, display names, bios, messages and server text.")
    if len(d) > 500:
        d = d[:497].rsplit(" ", 1)[0] + "…"
    return d


def alt(pin):
    return (f"Vertical Pinterest pin: {pin['headline']} — copy-paste Discord font "
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
            "image_path": f"assets/pinterest/discord/{pin['slug']}.png",
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
    print(f"generated {len(out)} Discord pins -> assets/pinterest/discord/")
    print(f"wrote inventory -> data/discord_pinterest_pins.csv")
    _build_upload()
    for r in out:
        tl, dl = len(r["pin_title"]), len(r["pin_description"])
        flag = "" if (40 <= tl <= 100 and 100 <= dl <= 500) else "  <-- check len"
        print(f"  {r['slug']:24} title {tl:3} desc {dl:3}{flag}")


if __name__ == "__main__":
    main()
