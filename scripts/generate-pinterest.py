#!/usr/bin/env python3
"""
Generates the Pinterest-ready pin image set + pin inventory for UltraTextGen.

Pinterest needs a *vertical* 2:3 image (1000x1500), distinct from the
1200x630 Open Graph cards in assets/og/ (which stay untouched and remain
correct for OG / Twitter / LinkedIn / Facebook / Google Images).

Rather than invent a new visual language, this extends the existing brand
system: it imports the very same motifs + registry used by
scripts/generate-site-art.py (and guide/assets/_generate.py) and re-lays
them out into a tall pin template. The result feels like the same family as
the OG cards — soft off-white panel, brand purple->blue gradients, faint dot
grid, one focal motif — just stacked vertically with a big keyword title on
top and the UltraTextGen.com wordmark at the bottom.

For every *eligible* content page in data/image_seo_status.csv it emits:
  - assets/pinterest/<slug>.png   1000x1500 vertical pin

and writes the full pin inventory to:
  - data/pinterest_pins.csv

Run:  python3 scripts/generate-pinterest.py
Requires: cairosvg (PNG rasterization).
"""
import csv
import functools
import importlib.util
import os
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PIN_DIR = os.path.join(ROOT, "assets", "pinterest")
CSV_IN = os.path.join(ROOT, "data", "image_seo_status.csv")
CSV_OUT = os.path.join(ROOT, "data", "pinterest_pins.csv")
os.makedirs(PIN_DIR, exist_ok=True)

DOMAIN = "https://ultratextgen.com/"

PIN_W, PIN_H = 1000, 1500


# ---- import the existing brand system (motifs + registry) -----------------
def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ART = _load(os.path.join(HERE, "generate-site-art.py"), "siteart")
GUIDE = _load(os.path.join(ROOT, "guide", "assets", "_generate.py"), "guideart")

# shared tokens / helpers from the site-art module (single source of truth)
PURPLE, BLUE, INK, SUB = ART.PURPLE, ART.BLUE, ART.INK, ART.SUB
PANEL, PANEL2 = ART.PANEL, ART.PANEL2
SANS = ART.SANS
defs = ART.defs
esc = ART.esc

K_GUIDE = "ULTRATEXTGEN · GUIDE"
K_HOME = "ULTRATEXTGEN · GENERATOR"


# ---------------------------------------------------------------- slug rules
def url_to_slug(url):
    """assets/pinterest/<slug>.png — slug derived from the URL path."""
    path = url.replace(DOMAIN, "").strip("/")
    return "homepage" if path == "" else path.replace("/", "-")


# Localized homepage slug -> locale code (so /de/ resolves to the master brand
# motif + the translated title/subtitle already defined in the site-art set).
LOCALIZED_HOME_BY_SLUG = {}
for _loc, (_fname, _t, _s) in ART.LOCALIZED_HOME.items():
    LOCALIZED_HOME_BY_SLUG[_loc] = (_t, _s)


def resolve_design(slug, row):
    """Return (title, subtitle, motif_callable, kicker) for a page slug,
    reusing the existing brand registry wherever possible."""
    if slug in ART.PAGES:
        title, sub, motif, kicker = ART.PAGES[slug]
        return title, sub, motif, kicker
    if slug == "homepage":
        return ("Fancy Text Generator",
                "60+ Unicode fonts to copy and paste anywhere",
                ART.m_brand, K_HOME)
    if slug in LOCALIZED_HOME_BY_SLUG:
        title, sub = LOCALIZED_HOME_BY_SLUG[slug]
        return title, sub, ART.m_brand, ART.K_SITE
    if slug.startswith("guide-") or slug == "guide":
        gkey = "index" if slug == "guide" else slug[len("guide-"):]
        if gkey in GUIDE.GUIDES:
            title, sub, motif = GUIDE.GUIDES[gkey]
            return title, sub, motif, K_GUIDE
    # Fallback: should not happen for eligible pages; use a generic brand card.
    title = (row.get("Primary intent") or slug.replace("-", " ")).title()
    return title, "Copy and paste Unicode fonts and symbols", ART.m_brand, K_HOME


# ---------------------------------------------------------------- pin builder
def pin_svg(slug, title, sub, motif, kicker, a=PURPLE, b=BLUE):
    """Vertical 1000x1500 pin: kicker + big keyword title up top, the focal
    motif on a soft card in the middle, a benefit line, then the wordmark."""
    p = "pin" + slug.replace("-", "")[:8]
    t, s = esc(title), esc(sub)

    # --- title: keyword-led, wrapped, sized down only when it runs long ---
    wrapped = textwrap.wrap(t, width=15)[:4]
    if len(wrapped) <= 2:
        fs, lh = 92, 104
    elif len(wrapped) == 3:
        fs, lh = 84, 96
    else:
        fs, lh = 70, 80
    ty0 = 250
    tspans = "".join(
        f'<tspan x="80" y="{ty0 + i*lh}">{line}</tspan>'
        for i, line in enumerate(wrapped))
    title_bottom = ty0 + (len(wrapped) - 1) * lh

    # --- centerpiece card with the focal motif (motif draws in a 360 box) ---
    card_x, card_y, card_w, card_h = 110, 470, 780, 760
    cx, cy = card_x + card_w / 2, card_y + card_h / 2
    scale = 1.95
    tx, ty = cx - 180 * scale, cy - 180 * scale

    # --- benefit line under the card (centered, max two lines) ---
    blines = textwrap.wrap(s, width=34)[:2]
    by0 = card_y + card_h + 70
    bspans = "".join(
        f'<tspan x="500" y="{by0 + i*46}">{line}</tspan>'
        for i, line in enumerate(blines))

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PIN_W} {PIN_H}"
     width="{PIN_W}" height="{PIN_H}">
  {defs(p, a, b)}
  <rect width="{PIN_W}" height="{PIN_H}" fill="{PANEL}"/>
  <rect width="{PIN_W}" height="{PIN_H}" fill="url(#dots{p})"/>
  <circle cx="860" cy="90" r="420" fill="url(#glow{p})"/>
  <circle cx="120" cy="1380" r="360" fill="url(#glow{p})"/>
  <rect x="0" y="0" width="16" height="{PIN_H}" fill="url(#gv{p})"/>

  <!-- kicker + keyword title -->
  <text x="80" y="150" font-family="{SANS}" font-size="28" font-weight="700"
        letter-spacing="4" fill="{PURPLE}">{esc(kicker)}</text>
  <text font-family="{SANS}" font-size="{fs}" font-weight="800"
        fill="{INK}">{tspans}</text>
  <rect x="82" y="{title_bottom + 34}" width="120" height="9" rx="4"
        fill="url(#g{p})"/>

  <!-- focal motif on a soft brand card -->
  <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="52"
        fill="#fff" stroke="{INK}" stroke-opacity="0.08"/>
  <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="52"
        fill="url(#glow{p})"/>
  <g transform="translate({tx:.1f} {ty:.1f}) scale({scale})">{motif(p)}</g>

  <!-- benefit line -->
  <text font-family="{SANS}" font-size="34" fill="{SUB}"
        text-anchor="middle">{bspans}</text>

  <!-- wordmark -->
  <line x1="360" y1="1392" x2="640" y2="1392" stroke="url(#g{p})"
        stroke-width="3" opacity="0.5"/>
  <g transform="translate(330 1430)">
    <rect x="0" y="-38" width="56" height="56" rx="16" fill="url(#gv{p})"/>
    <text x="28" y="3" font-family="{SANS}" font-size="34" font-weight="800"
          fill="#fff" text-anchor="middle">U</text>
    <text x="74" y="4" font-family="{SANS}" font-size="40" font-weight="800"
          fill="{INK}">UltraTextGen<tspan fill="{PURPLE}">.com</tspan></text>
  </g>
</svg>"""


# ---------------------------------------------------------------- eligibility
def classify(row):
    """Return (include: bool, exclusion_reason: str). exclusion_reason is ''
    when the page is included."""
    ptype = (row["Page type"] or "").strip().lower()
    slug = url_to_slug(row["Page URL"])
    if ptype == "legal/info":
        return False, ("legal page" if slug in ("privacy", "terms")
                       else "utility page")
    if ptype == "embed" or slug.startswith("embed-") or "/embed/" in row["Page URL"]:
        return False, "embed page"
    # The overview hubs (/category/, /usecase/, /library/, /answers/, /guide/)
    # are kept: each is a strong topical landing page with real keyword + visual
    # intent, not pure navigation.
    return True, ""


# ---------------------------------------------------------------- boards
B_DISCORD = "Discord Fonts, Symbols & Names"
B_INSTA = "Instagram Bio Symbols & Aesthetic Text"
B_FANCY = "Fancy Text Generator & Copy Paste Fonts"
B_INTL = "International Fancy Font Generators"
B_TIKTOK = "TikTok, Snapchat & WhatsApp Fonts"
B_LINKEDIN = "LinkedIn Fonts & Professional Text"
B_GAMING = "Gaming Symbols & Usernames"
B_SPECIAL = "Special Characters, Unicode & Keyboard Symbols"
B_EMOJI = "Emoji Copy Paste & Emoji Combos"
B_CUTE = "Cute Symbols, Hearts & Decorative Text"
B_TEXTART = "Text Art, Kaomoji & ASCII Faces"
B_GUIDES = "Font Guides & Typography Tips"

ALL_BOARDS = [B_DISCORD, B_INSTA, B_FANCY, B_INTL, B_TIKTOK, B_LINKEDIN,
              B_GAMING, B_SPECIAL, B_EMOJI, B_CUTE, B_TEXTART, B_GUIDES]

# keyword -> board, scanned against (url + intent + title), in priority order.
KEYWORD_BOARDS = [
    (B_DISCORD, ["discord"]),
    (B_INSTA, ["instagram", "bio", "aesthetic", "comment font", "vertical text",
               "stacked text", "zalgo", "bubble", "cursive", "coquette", "y2k"]),
    (B_TIKTOK, ["tiktok", "snapchat", "whatsapp", "telegram", "facebook",
                "youtube", "twitter", "x-twitter", "x (twitter)"]),
    (B_LINKEDIN, ["linkedin"]),
    (B_GAMING, ["roblox", "minecraft", "fortnite", "gaming", "username",
                "gamer", "free fire", "mobile legends", "ml name"]),
    (B_SPECIAL, ["slash", "backslash", "unicode", "ascii", "alt code", "greek",
                 "arrow", "bracket", "math", "fraction", "box drawing",
                 "special character", "dash", "keyboard", "html entit",
                 "latex", "ipa", "punctuation", "currency", "degree", "number"]),
    (B_EMOJI, ["emoji", "emojis", "flag", "animal emoji", "sports emoji",
               "text to emoji", "emoji combination", "emoji combo"]),
    (B_CUTE, ["heart", "star", "flower", "sparkle", "bow", "ribbon", "crown",
              "border", "divider", "cute", "kawaii", "fairycore", "cottagecore"]),
    (B_TEXTART, ["kaomoji", "text face", "ascii face", "text art", "meme text"]),
]


def board_matches(haystack):
    """Ordered list of keyword-matched boards (deduped, priority preserved)."""
    out = []
    for board, kws in KEYWORD_BOARDS:
        if any(k in haystack for k in kws) and board not in out:
            out.append(board)
    return out


def assign_boards(slug, row, title, sub):
    """Return (primary, secondary). page_type takes precedence for
    localized (International) and guide/answer (Font Guides); otherwise the
    ordered keyword rules decide, with Fancy Text as the fallback."""
    ptype = (row["Page type"] or "").strip().lower()
    hay = " ".join([row["Page URL"], row.get("Primary intent", ""),
                    title, sub, slug]).lower()
    matches = board_matches(hay)

    if ptype == "localized":
        primary = B_INTL
        secondary = next((m for m in matches if m != primary), "")
        return primary, secondary
    if ptype in ("guide", "answer"):
        primary = B_GUIDES
        secondary = next((m for m in matches if m != primary), "")
        return primary, secondary
    if slug == "homepage":
        return B_FANCY, ""
    # overview hubs land on their natural topical board (not the bare keyword)
    if slug == "library":
        return B_SPECIAL, B_EMOJI
    if slug in ("category", "usecase"):
        return B_FANCY, ""

    if matches:
        primary = matches[0]
        secondary = matches[1] if len(matches) > 1 else ""
        # symbol-library pages pair naturally with Special Characters / Cute
        if not secondary and ptype == "symbol library":
            if primary not in (B_SPECIAL,) and any(
                    k in hay for k in ["symbol", "sign", "mark"]):
                secondary = B_SPECIAL if primary != B_CUTE else ""
        return primary, secondary
    return B_FANCY, ""


# ---------------------------------------------------------------- visual glyphs
VECTOR_MOTIF_DESC = {
    "m_chat": "styled chat bubbles", "m_profile": "styled profile card",
    "m_play": "video play card", "m_pins": "stacked pin cards",
    "m_qa": "question-and-answer card", "m_headline": "highlighted headline",
    "m_zalgo": "Z̸A̸L̸G̸O̸ glitch text", "m_doc": "document with seal",
    "m_brand": "A g x ★ U brand glyph cluster", "m_grid": "grid of style tiles",
    "m_paw": "paw print", "m_smiley": "smiley face", "m_camera": "camera",
    "m_flag": "waving flag", "m_trophy": "trophy ★", "m_ribbon": "award ribbon",
    "m_bow": "coquette bow", "m_car": "vehicle", "m_ball": "sport ball",
    "m_person": "person profile", "m_sign": "warning sign", "m_block": "3D block",
    "m_xmark": "X mark", "m_ankh": "ankh ☥", "m_rune": "Norse runes",
    "m_divider": "✦ line dividers ✦", "m_kaomoji": "(•‿•) kaomoji face",
    "m_cup": "hot drink cup", "m_at": "@ symbol", "m_transform": "A → ★ transform",
    "m_vertical": "vertically stacked letters",
}


def motif_glyphs(motif):
    """(text, is_real) — is_real means the string is actual symbol characters
    shown in the pin (vs. a description of a vector motif)."""
    if isinstance(motif, functools.partial):
        kw = motif.keywords
        if "glyphs" in kw:
            return " ".join(kw["glyphs"]), True
        name = motif.func.__name__
        sample = kw.get("sample") or kw.get("label")
        if sample and name == "m_typo":
            return sample.strip(), True
    else:
        name = getattr(motif, "__name__", "")
    return VECTOR_MOTIF_DESC.get(name, "Unicode font and symbol samples"), False


def clean_name(title):
    """A natural noun phrase from a page title (drops 'Generator'/'Collection',
    nudges a trailing singular 'Symbol' to plural)."""
    n = (title.replace(" Font Generator", "").replace(" Generator", "")
              .replace(" Collection", "").strip())
    if n.endswith(" Symbol"):
        n += "s"
    return n


# ---------------------------------------------------------------- pin copy
def design_template(row, slug):
    ptype = (row["Page type"] or "").strip().lower()
    if slug == "homepage":
        return "homepage_vertical"
    if ptype == "localized":
        return "localized_vertical"
    if ptype == "guide":
        return "guide_vertical"
    if ptype == "answer":
        return "answer_vertical"
    if ptype == "symbol library":
        return "library_symbols_vertical"
    if ptype == "category":
        return "category_vertical"
    if ptype == "use case":
        return "usecase_vertical"
    # platform, tiktok, youtube, roblox
    return "platform_vertical"


def pin_title(row, slug, title, sub):
    """Keyword-first, natural, 40-90 char target."""
    ptype = (row["Page type"] or "").strip().lower()
    base = title.strip()
    q = base.endswith("?")
    name = clean_name(base)

    if slug == "homepage":
        t = "Fancy Text Generator — Copy and Paste Fonts and Symbols"
    elif ptype == "localized":
        t = f"{base} — Copy and Paste Fonts"
    elif ptype == "guide":
        # avoid "...Typography Guide: A Practical Typography Guide"
        if "guide" in base.lower() or "typography" in base.lower():
            t = f"{base} — Copy and Paste Fonts"
        else:
            t = f"{base}: A Practical Typography Guide"
    elif ptype == "answer" or q:
        t = base if (q or "answer" in base.lower()) else f"{base} — Quick Answer"
        t = f"{t} | Fonts & Symbols Help" if len(t) < 40 else t
    elif ptype == "symbol library":
        t = f"{name} to Copy and Paste"
    elif ptype == "category":
        t = f"{name} — Copy and Paste Font Style"
    elif ptype == "use case":
        t = f"{name}: Style Text to Copy and Paste"
    else:  # platform family
        t = f"{name} Fonts and Symbols to Copy and Paste"

    # length guardrails (target 40-90)
    if len(t) < 40:
        t = f"{t} — UltraTextGen"
    if len(t) > 90:
        t = t[:88].rsplit(" ", 1)[0].rstrip(" —:|")
    return t


USE_BY_TYPE = {
    "platform_vertical": "display names, usernames, bios, posts and chats",
    "library_symbols_vertical": "bios, captions, usernames, posts and comments",
    "usecase_vertical": "bios, captions, comments and posts",
    "category_vertical": "bios, captions, usernames and headlines",
    "guide_vertical": "social bios, posts, comments and headlines",
    "answer_vertical": "your profiles, posts and usernames",
    "localized_vertical": "bios, captions, usernames and posts",
    "homepage_vertical": "bios, captions, usernames, posts and chats",
}


def pin_description(row, slug, title, sub, tmpl, glyphs, glyphs_real):
    """Unique 150-300 char description woven from the page's own title,
    subtitle, intent and use case."""
    name = clean_name(title)
    use = USE_BY_TYPE.get(tmpl, "bios, captions, usernames and posts")
    subtxt = sub.strip().rstrip(".")
    paren = f" ({glyphs})" if glyphs_real else ""

    if tmpl == "homepage_vertical":
        d = (f"Turn plain text into 60+ stylish Unicode fonts and symbols you "
             f"can copy and paste anywhere. Perfect for {use}. UltraTextGen "
             f"is free, works in your browser and needs no app or sign-up.")
    elif tmpl == "localized_vertical":
        d = (f"{title}. {subtxt}. Copy and paste stylish Unicode fonts and "
             f"symbols for {use} — free, fast and right in your browser with "
             f"UltraTextGen.")
    elif tmpl == "guide_vertical":
        d = (f"{title} — {subtxt}. Learn how to use Unicode fonts and symbols "
             f"for {use}, with copy-and-paste examples you can try right away "
             f"on UltraTextGen.")
    elif tmpl == "answer_vertical":
        d = (f"{title} {subtxt}. A short, clear answer plus copy-and-paste "
             f"fonts and symbols you can use across {use} with UltraTextGen.")
    elif tmpl == "library_symbols_vertical":
        d = (f"Copy and paste {name}{paren} for {use}. Browse the full {name} "
             f"collection on UltraTextGen — tap any symbol or emoji to copy "
             f"it instantly, free and with no sign-up.")
    elif tmpl == "category_vertical":
        d = (f"{title}: {subtxt}. Copy and paste this Unicode font style for "
             f"{use}. Type once and grab every variation instantly with "
             f"UltraTextGen — free and in your browser.")
    elif tmpl == "usecase_vertical":
        d = (f"{title} — {subtxt}. Create copy-and-paste Unicode text for "
             f"{use} in seconds with UltraTextGen. Free, fast and no app "
             f"required.")
    else:  # platform_vertical
        d = (f"Copy and paste {name} fonts, symbols and styled text for {use}. "
             f"{subtxt}. Create clean Unicode styles in seconds with "
             f"UltraTextGen — free and no app needed.")

    # guardrails: 150-300 chars
    if len(d) > 300:
        d = d[:297].rsplit(" ", 1)[0] + "…"
    if len(d) < 150:
        d = (d + " Free to use, works on mobile and desktop, and copies with "
             "a single tap.")[:300]
    return d


def pin_keywords(row, slug, title, tmpl, glyphs):
    intent = (row.get("Primary intent") or "").strip().lower()
    name = clean_name(title).lower()
    kws = []

    def add(k):
        k = k.strip().lower()
        if k and k not in kws and len(kws) < 9:
            kws.append(k)

    if intent and intent != "/":
        add(intent)
    add(name)
    if tmpl == "library_symbols_vertical":
        add(f"{name} copy paste")
        add("copy and paste symbols")
        add("unicode symbols")
        add("aesthetic symbols")
    elif tmpl == "platform_vertical":
        add(f"{name} fonts")
        add(f"{name} symbols")
        add("copy and paste fonts")
        add("fancy text")
    elif tmpl == "category_vertical":
        add("fancy text generator")
        add("copy and paste fonts")
        add("unicode fonts")
        add("aesthetic fonts")
    elif tmpl == "usecase_vertical":
        add("copy and paste fonts")
        add("aesthetic text")
        add("stylish text")
    elif tmpl in ("guide_vertical", "answer_vertical"):
        add("font guide")
        add("typography tips")
        add("unicode fonts")
        add("copy and paste text")
    elif tmpl == "localized_vertical":
        add("fancy text generator")
        add("copy paste fonts")
        add("unicode fonts")
    else:
        add("fancy text generator")
    add("copy and paste")
    add("ultratextgen")
    return ", ".join(kws[:9])


def pin_alt(row, slug, title, glyphs, tmpl):
    name = clean_name(title)
    if tmpl == "library_symbols_vertical":
        return f"Vertical Pinterest graphic showing {name.lower()} for copy and paste."
    if tmpl in ("guide_vertical", "answer_vertical"):
        return f"Vertical Pinterest graphic for the UltraTextGen guide: {name}."
    if tmpl == "homepage_vertical":
        return "Vertical Pinterest graphic for the UltraTextGen fancy text generator."
    if tmpl == "localized_vertical":
        return f"Vertical Pinterest graphic for {name}, a copy and paste font generator."
    return f"Vertical Pinterest graphic showing {name} fonts and symbols for copy and paste."


def utm_url(page_url, slug):
    sep = "&" if "?" in page_url else "?"
    return (f"{page_url}{sep}utm_source=pinterest&utm_medium=social"
            f"&utm_campaign=organic_pins&utm_content={slug}")


# ---------------------------------------------------------------- main
COLUMNS = [
    "page_url", "page_path", "page_type", "primary_intent", "priority",
    "search_volume", "include_in_pinterest", "exclusion_reason",
    "og_image_path", "pinterest_image_path", "pinterest_image_width",
    "pinterest_image_height", "pinterest_board_primary",
    "pinterest_board_secondary", "pin_title", "pin_description",
    "pin_keywords", "pin_alt_text", "pin_destination_url",
    "utm_destination_url", "pin_status", "published_pin_url",
    "design_template", "visual_glyphs", "notes",
]


def main():
    import cairosvg
    rows = list(csv.DictReader(open(CSV_IN, encoding="utf-8")))
    out_rows = []
    generated = 0
    included = 0
    excluded = 0
    board_counts = {b: 0 for b in ALL_BOARDS}
    used_titles = set()
    issues = []

    for row in rows:
        page_url = row["Page URL"].strip()
        slug = url_to_slug(page_url)
        path = page_url.replace(DOMAIN, "")
        path = "/" + path.strip("/") + "/" if path.strip("/") else "/"
        include, reason = classify(row)
        ptype = (row["Page type"] or "").strip()
        intent = (row.get("Primary intent") or "").strip()
        if intent == "/" or not intent:
            intent = slug.replace("-", " ")
        priority = (row.get("Priority") or "").strip()
        svol = (row.get("Search volume") or "").strip()
        og = (row.get("OG image path") or "").strip()

        rec = {c: "" for c in COLUMNS}
        rec.update({
            "page_url": page_url,
            "page_path": path,
            "page_type": ptype,
            "primary_intent": intent,
            "priority": priority,
            "search_volume": svol,
            "og_image_path": og,
            "pin_status": "pending",
        })

        if not include:
            excluded += 1
            rec["include_in_pinterest"] = "no"
            rec["exclusion_reason"] = reason
            out_rows.append(rec)
            continue

        included += 1
        title, sub, motif, kicker = resolve_design(slug, row)
        tmpl = design_template(row, slug)
        glyphs, glyphs_real = motif_glyphs(motif)
        primary, secondary = assign_boards(slug, row, title, sub)
        board_counts[primary] += 1

        # unique pin title: disambiguate any collision with subtitle keywords
        # (e.g. the two "Bold Fonts" category variants share a base title).
        ptitle = pin_title(row, slug, title, sub)
        if ptitle in used_titles:
            extra = " ".join(sub.split()[:4]).strip(" —:.,")
            ptitle = f"{clean_name(title)} — {extra}"
            if len(ptitle) > 90:
                ptitle = ptitle[:88].rsplit(" ", 1)[0].rstrip(" —:|")
            if len(ptitle) < 40:
                ptitle = f"{ptitle} | UltraTextGen"
            while ptitle in used_titles:
                ptitle += " ·"
        used_titles.add(ptitle)

        pin_path = f"assets/pinterest/{slug}.png"
        rec.update({
            "include_in_pinterest": "yes",
            "pinterest_image_path": pin_path,
            "pinterest_image_width": str(PIN_W),
            "pinterest_image_height": str(PIN_H),
            "pinterest_board_primary": primary,
            "pinterest_board_secondary": secondary,
            "pin_title": ptitle,
            "pin_description": pin_description(row, slug, title, sub, tmpl, glyphs, glyphs_real),
            "pin_keywords": pin_keywords(row, slug, title, tmpl, glyphs),
            "pin_alt_text": pin_alt(row, slug, title, glyphs, tmpl),
            "pin_destination_url": page_url,
            "utm_destination_url": utm_url(page_url, slug),
            "design_template": tmpl,
            "visual_glyphs": glyphs,
            "notes": "",
        })

        # render the pin image
        svg = pin_svg(slug, title, sub, motif, kicker)
        cairosvg.svg2png(bytestring=svg.encode(),
                         write_to=os.path.join(PIN_DIR, f"{slug}.png"),
                         output_width=PIN_W, output_height=PIN_H)
        generated += 1
        out_rows.append(rec)

        # copy-length diagnostics
        if not (40 <= len(rec["pin_title"]) <= 90):
            issues.append(f"title len {len(rec['pin_title'])}: {slug}")
        if not (150 <= len(rec["pin_description"]) <= 300):
            issues.append(f"desc len {len(rec['pin_description'])}: {slug}")

    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out_rows)

    print(f"reviewed {len(rows)} pages | included {included} | excluded {excluded}")
    print(f"generated {generated} pinterest images -> assets/pinterest/")
    print(f"wrote inventory -> data/pinterest_pins.csv")
    # derive the Pinterest-importer-ready upload CSV (schema owned by
    # scripts/pinterest_csv.py); never upload the inventory above directly.
    _load(os.path.join(HERE, "build_pinterest_upload.py"), "build_upload").convert("page")
    print("--- pins per board (primary) ---")
    for b in ALL_BOARDS:
        print(f"  {board_counts[b]:4}  {b}")
    if issues:
        print(f"--- {len(issues)} copy-length notes ---")
        for i in issues[:40]:
            print("  ", i)
    else:
        print("all pin titles 40-90 chars, all descriptions 150-300 chars")


if __name__ == "__main__":
    main()
