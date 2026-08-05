#!/usr/bin/env python3
"""
Generates additional Pinterest pin-image VARIANTS for pages that already have
a base pin from scripts/generate-pinterest.py.

This does not replace or touch the base pin set (data/pinterest_pins.csv,
assets/pinterest/<slug>.png) — it is purely additive. For a subset of pages,
selected and weighted by real opportunity signal (search demand, competitive
keyword gap, existing Pinterest reach, and how visual/Pinterest-native the
query is — see BOARD_OPPORTUNITY_WEIGHT below), it renders extra creative
variants of the same pin pointing at the same real destination URL:

  - assets/pinterest/<slug>--v2.png, --v3.png, ...  (1000x1500, same brand skin)
  - data/pinterest_pins_variants.csv                (inventory, same schema
    family as data/pinterest_pins.csv plus a variant_index column)
  - data/pinterest_pins_variants_upload.csv          (importer-ready, built via
    build_pinterest_upload.py -> pinterest_csv.py, same as every other board)

Nothing here invents a new visual template: it imports and calls the exact
same resolve_design()/pin_svg()/assign_boards() functions used by
generate-pinterest.py, and reuses generate-site-art.py's brand tokens
transitively through that import. Only the pin TEXT (title/subtitle rendered
in the image, plus the CSV title/description/keywords/alt metadata) and,
where a page has a secondary board, the board assignment vary per variant.
Colors, fonts, layout and the wordmark are identical to the base pin.

Precedent for multiple pins -> one destination URL: scripts/generate-id-pins.py
already ships 27 distinct pins to https://ultratextgen.com/id/ with no
downstream issue (build_pinterest_upload.py's convert() is a stateless
per-row map with no uniqueness requirement on the destination URL).

Run:  python3 scripts/generate-pinterest-variants.py
Requires: cairosvg (PNG rasterization). Idempotent per run (title collisions
across the whole run, including against v1, are guarded the same way
generate-pinterest.py guards them).
"""
import csv
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PIN_DIR = os.path.join(ROOT, "assets", "pinterest")
CSV_IN = os.path.join(ROOT, "data", "image_seo_status.csv")
CSV_OUT = os.path.join(ROOT, "data", "pinterest_pins_variants.csv")


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


GP = _load(os.path.join(HERE, "generate-pinterest.py"), "genpin")

# ---------------------------------------------------------------------------
# Opportunity weighting
#
# Per-board multipliers reflecting relative Pinterest opportunity, derived
# from Search Console performance, competitive keyword-gap data, existing
# Pinterest Analytics reach, and how visual/Pinterest-native each board's
# queries are (fonts/symbols/emoji/aesthetic text rank higher than policy or
# Q&A content). The underlying research lives in the private strategy repo,
# not here — these are just the resulting tuning weights, same as any other
# ranking constant in this file.
#
# Higher weight = more variants allocated per page on that board, on top of
# the page's own Priority multiplier below.
# ---------------------------------------------------------------------------
BOARD_OPPORTUNITY_WEIGHT = {
    # placeholder — filled from opportunity analysis before running
}

PRIORITY_WEIGHT = {
    "Highest": 3.0,
    "High": 2.0,
    "Medium": 1.0,
    "Lower": 0.6,
    "Low": 0.4,
}

# Hard ceiling on total pins (v1 + variants) any single page can accumulate.
# Keeps the board looking natural rather than one URL flooding a feed; the
# existing generate-id-pins.py precedent tops out at 27 pins to one URL.
MAX_PINS_PER_PAGE = 40

TOTAL_VARIANT_BUDGET = 12598  # 15,000 target total - 2,402 existing base pins


# ---------------------------------------------------------------------------
# Text variant banks
#
# Two independently-cycling axes (opener x closer) per design_template, so a
# single page gets len(openers) * len(closers) distinct title phrasings
# before any repeat -- comfortably above MAX_PINS_PER_PAGE. Every phrase is
# generic/accurate (free, copy-paste, no sign-up) rather than inventing
# claims about the page. The used_titles collision-guard below (identical
# logic to generate-pinterest.py's) is the backstop if two different pages
# still land on the same string.
# ---------------------------------------------------------------------------
TITLE_BANK = {
    "library_symbols_vertical": (
        ["Copy and Paste", "Free", "How to Get", "Grab", "The Best", "Quick",
         "Easy", "Instant"],
        ["— Tap to Copy", "for Bios & Captions", "— No Sign-Up Needed",
         "in Seconds", "for Instagram & Discord", "— 100% Free", "Online",
         "for Any App"],
    ),
    "platform_vertical": (
        ["Copy and Paste", "Free", "The Best", "Grab", "Quick", "Easy",
         "Instant", "Aesthetic"],
        ["— Tap to Copy", "Generator", "— No Sign-Up Needed", "in Seconds",
         "for Bios & Posts", "— 100% Free", "Online", "for Any Platform"],
    ),
    "localized_vertical": (
        ["Copy and Paste", "Free", "Try the", "Grab", "Quick", "Easy",
         "Instant", "Aesthetic"],
        ["— Tap to Copy", "Generator", "— No Sign-Up Needed", "in Seconds",
         "for Bios & Posts", "— 100% Free", "Online", "Font Style"],
    ),
    "category_vertical": (
        ["Copy and Paste", "Free", "Try the", "Grab", "Quick", "Easy",
         "Instant", "Aesthetic"],
        ["— Tap to Copy", "Font Generator", "— No Sign-Up Needed",
         "in Seconds", "for Bios & Posts", "— 100% Free", "Style", "Font"],
    ),
    "usecase_vertical": (
        ["Copy and Paste", "Free", "Style Your", "Create a", "Quick", "Easy",
         "Instant", "Aesthetic"],
        ["— Tap to Copy", "Generator", "— No Sign-Up Needed", "in Seconds",
         "Text Ideas", "— 100% Free", "Online", "for Any App"],
    ),
    "guide_vertical": (
        ["How to Use", "The Complete Guide to", "Everything About",
         "Understanding", "A Quick Guide to", "Tips for", "Learn",
         "Explained:"],
        ["— UltraTextGen Guide", "for Fonts & Symbols", "(Copy & Paste Tips)",
         "— Read This First", "in Plain English", "— Free Guide",
         "for Beginners", "— Practical Tips"],
    ),
    "answer_vertical": (
        ["Answered:", "Quick Answer:", "Here's the Truth About",
         "What You Need to Know:", "The Short Answer:", "FAQ:",
         "Explained Simply:", "Straight Answer:"],
        ["— UltraTextGen", "(Fonts & Symbols FAQ)", "— Read This First",
         "in Plain English", "— Quick Read", "for Fonts & Symbols",
         "— No Fluff", "— Explained"],
    ),
    "homepage_vertical": (
        ["Free", "Try the", "The Best", "Instant", "Copy and Paste",
         "Aesthetic", "Easy", "Quick"],
        ["Fancy Text Generator", "— 60+ Fonts", "— No Sign-Up",
         "Font & Symbol Tool", "— Tap to Copy", "Text Styles",
         "for Any Platform", "Generator Online"],
    ),
}
TITLE_BANK["default"] = TITLE_BANK["platform_vertical"]

DESC_BANK = {
    "library_symbols_vertical": [
        "Looking for {name_l}{paren}? Browse the full collection and copy any symbol in one tap for {use}, free on UltraTextGen.",
        "A free, ready-to-copy {name_l}{paren} collection for {use}. Works instantly in your browser — no app, no sign-up.",
        "Grab {name_l}{paren} for {use} in seconds. UltraTextGen keeps this copy-paste symbol library free and up to date.",
        "{name}{paren} for {use} — copy, paste, done. Free, mobile-friendly and always available on UltraTextGen.",
        "Every symbol in this {name_l}{paren} set copies with one tap, ready for {use}. No account needed on UltraTextGen.",
        "Need {name_l}{paren} fast? This UltraTextGen collection is built for {use} — tap, copy, paste, free forever.",
    ],
    "platform_vertical": [
        "Copy and paste {name_l} fonts and symbols for {use}, free and instantly on UltraTextGen — no app, no sign-up.",
        "Turn plain text into {name_l} in seconds. Built for {use}, free to use on any device with UltraTextGen.",
        "A fast, free {name_l} generator for {use}. Type once, copy any style, paste anywhere — UltraTextGen.",
        "{name} fonts and symbols, ready to copy for {use}. Works instantly in your browser, no sign-up required.",
        "Style your text as {name_l} for {use} in seconds — free, mobile-friendly and always available on UltraTextGen.",
    ],
    "localized_vertical": [
        "{title}. {subtxt}. Free copy-and-paste Unicode fonts and symbols for {use}, ready instantly on UltraTextGen.",
        "{subtxt} — try {title} for {use}, free and in your browser. No app or sign-up needed on UltraTextGen.",
        "Fast, free stylish text for {use}. {title} works instantly on UltraTextGen — just type, copy and paste.",
        "{title}: {subtxt}. Built for {use}, free forever, no account required on UltraTextGen.",
    ],
    "category_vertical": [
        "{title}: {subtxt}. Copy and paste this font style for {use}, free and instant on UltraTextGen.",
        "Type once, copy every {name_l} variation instantly. Built for {use}, free on UltraTextGen — no sign-up.",
        "{subtxt} — try {name_l} for {use} in seconds, free and mobile-friendly on UltraTextGen.",
    ],
    "usecase_vertical": [
        "{title} — {subtxt}. Create copy-and-paste text for {use} in seconds, free on UltraTextGen.",
        "{subtxt}. Style text for {use} instantly — no app, no sign-up, just UltraTextGen.",
        "Fast, free text styling for {use}. {title} works right in your browser on UltraTextGen.",
    ],
    "guide_vertical": [
        "{title} — {subtxt}. A practical, copy-and-paste-ready guide for {use} on UltraTextGen.",
        "{subtxt} Learn the essentials of {name_l} for {use}, with real examples on UltraTextGen.",
        "Everything you need on {name_l} for {use} — clear, practical and free on UltraTextGen.",
    ],
    "answer_vertical": [
        "{title} {subtxt}. A short, clear answer plus copy-and-paste fonts and symbols for {use} on UltraTextGen.",
        "{subtxt} Straight answer, no fluff — plus tools for {use} on UltraTextGen, free.",
        "Wondering about {name_l}? {subtxt} Get the answer and copy-paste tools for {use} on UltraTextGen.",
    ],
    "homepage_vertical": [
        "Turn plain text into 60+ stylish Unicode fonts and symbols for {use}. Free, browser-based, no sign-up — UltraTextGen.",
        "The free fancy text generator for {use}. Type once, copy any of 60+ styles instantly on UltraTextGen.",
        "Style your text for {use} in seconds with 60+ free Unicode fonts. No app, no account — UltraTextGen.",
    ],
}
DESC_BANK["default"] = DESC_BANK["platform_vertical"]


def variant_title(tmpl, name, n):
    openers, closers = TITLE_BANK.get(tmpl, TITLE_BANK["default"])
    idx = n - 2
    o = openers[idx % len(openers)]
    c = closers[(idx // len(openers)) % len(closers)]
    t = f"{o} {name} {c}".strip()
    if len(t) < 40:
        t = f"{t} — UltraTextGen"
    if len(t) > 90:
        t = t[:88].rsplit(" ", 1)[0].rstrip(" —:|")
    return t


def variant_description(tmpl, n, **fmt):
    bank = DESC_BANK.get(tmpl, DESC_BANK["default"])
    idx = (n - 2) % len(bank)
    d = bank[idx].format(**fmt)
    if len(d) > 300:
        d = d[:297].rsplit(" ", 1)[0] + "…"
    if len(d) < 150:
        d = (d + " Free to use, works on mobile and desktop, and copies with "
                  "a single tap.")[:300]
    return d


# Short headline/sub variants for the IMAGE itself (independent of the CSV
# title/description above) so variant pins also read as visually distinct in
# a Pinterest feed, not just re-captioned duplicates of the same graphic.
HEADLINE_BANK = ["{name}", "Copy & Paste {name}", "Free {name}",
                 "{name} — Copy Paste", "{name} Online"]
SUBLINE_BANK = [
    "Tap to copy — free, no sign-up needed",
    "Works on Instagram, Discord, TikTok & more",
    "Free Unicode fonts & symbols, ready to paste",
    "Copy instantly in your browser, no app needed",
    "Fast, free & mobile-friendly copy and paste",
]


def variant_image_text(name, n):
    idx = n - 2
    headline = HEADLINE_BANK[idx % len(HEADLINE_BANK)].format(name=name)
    subline = SUBLINE_BANK[idx % len(SUBLINE_BANK)]
    return headline, subline


def board_for_variant(primary, secondary, n):
    return secondary if (secondary and n % 2 == 0) else primary


COLUMNS = GP.COLUMNS + ["variant_index"]


def allocate(rows):
    """Return {slug: total_pin_count} (including v1) for every included page,
    weighted by board opportunity x page priority, capped, normalized to hit
    TOTAL_VARIANT_BUDGET new (v2+) pins across the whole run."""
    weighted = []
    for row in rows:
        include, _ = GP.classify(row)
        if not include:
            continue
        slug = GP.url_to_slug(row["Page URL"].strip())
        title, sub, motif, kicker = GP.resolve_design(slug, row)
        primary, secondary = GP.assign_boards(slug, row, title, sub)
        w = (BOARD_OPPORTUNITY_WEIGHT.get(primary, 1.0)
             * PRIORITY_WEIGHT.get((row.get("Priority") or "").strip(), 1.0))
        weighted.append((slug, w))

    total_w = sum(w for _, w in weighted) or 1.0
    raw = {slug: (w / total_w) * TOTAL_VARIANT_BUDGET for slug, w in weighted}

    counts = {}
    overflow = 0.0
    for slug, extra in raw.items():
        n = 1 + round(extra)
        if n > MAX_PINS_PER_PAGE:
            overflow += (n - MAX_PINS_PER_PAGE)
            n = MAX_PINS_PER_PAGE
        counts[slug] = n

    # redistribute overflow (from capped pages) across everyone still under
    # the cap, proportional to their original weight -- one more pass is
    # enough given the budget is a small fraction of eligible pages * cap.
    if overflow > 0:
        under_cap = {s: w for s, w in weighted if counts[s] < MAX_PINS_PER_PAGE}
        under_w = sum(under_cap.values()) or 1.0
        for slug, w in under_cap.items():
            bonus = round(overflow * (w / under_w))
            counts[slug] = min(MAX_PINS_PER_PAGE, counts[slug] + bonus)

    return counts


def main():
    import cairosvg
    rows = list(csv.DictReader(open(CSV_IN, encoding="utf-8")))
    counts = allocate(rows)
    out_rows = []
    used_titles = set()
    generated = 0
    board_counts = {b: 0 for b in GP.ALL_BOARDS}

    for row in rows:
        page_url = row["Page URL"].strip()
        slug = GP.url_to_slug(page_url)
        total_pins = counts.get(slug, 1)
        if total_pins <= 1:
            continue

        include, _ = GP.classify(row)
        if not include:
            continue

        path = page_url.replace(GP.DOMAIN, "")
        path = "/" + path.strip("/") + "/" if path.strip("/") else "/"
        title, sub, motif, kicker = GP.resolve_design(slug, row)
        tmpl = GP.design_template(row, slug)
        glyphs, glyphs_real = GP.motif_glyphs(motif)
        primary, secondary = GP.assign_boards(slug, row, title, sub)
        name = GP.clean_name(title)
        use = GP.USE_BY_TYPE.get(tmpl, "bios, captions, usernames and posts")
        paren = f" ({glyphs})" if glyphs_real else ""
        subtxt = sub.strip().rstrip(".")

        for n in range(2, total_pins + 1):
            board = board_for_variant(primary, secondary, n)
            board_counts[board] += 1

            vtitle = variant_title(tmpl, name, n)
            while vtitle in used_titles:
                vtitle = (vtitle[:96] if len(vtitle) <= 96 else vtitle[:96]) + " ·"
                if len(vtitle) > 100:
                    suffix = f" [{slug[-10:]}-{n}]"
                    vtitle = vtitle[:100 - len(suffix)].rstrip(" —:|,.") + suffix
                    break
            used_titles.add(vtitle)

            vdesc = variant_description(
                tmpl, n, name=name, name_l=name.lower(), use=use,
                title=title, subtxt=subtxt, paren=paren)

            headline, subline = variant_image_text(name, n)
            svg = GP.pin_svg(slug, headline, subline, motif, kicker)
            img_path = f"assets/pinterest/{slug}--v{n}.png"
            cairosvg.svg2png(bytestring=svg.encode(),
                             write_to=os.path.join(ROOT, img_path),
                             output_width=GP.PIN_W, output_height=GP.PIN_H)
            generated += 1

            rec = {c: "" for c in COLUMNS}
            rec.update({
                "page_url": page_url,
                "page_path": path,
                "page_type": (row.get("Page type") or "").strip(),
                "primary_intent": (row.get("Primary intent") or "").strip() or slug.replace("-", " "),
                "priority": (row.get("Priority") or "").strip(),
                "search_volume": (row.get("Search volume") or "").strip(),
                "include_in_pinterest": "yes",
                "exclusion_reason": "",
                "og_image_path": (row.get("OG image path") or "").strip(),
                "pinterest_image_path": img_path,
                "pinterest_image_width": str(GP.PIN_W),
                "pinterest_image_height": str(GP.PIN_H),
                "pinterest_board_primary": board,
                "pinterest_board_secondary": "",
                "pin_title": vtitle,
                "pin_description": vdesc,
                "pin_keywords": GP.pin_keywords(row, slug, title, tmpl, glyphs),
                "pin_alt_text": GP.pin_alt(row, slug, title, glyphs, tmpl),
                "pin_destination_url": page_url,
                "utm_destination_url": GP.utm_url(page_url, slug) + f"--v{n}",
                "pin_status": "pending",
                "published_pin_url": "",
                "design_template": tmpl,
                "visual_glyphs": glyphs,
                "notes": f"variant of {slug}.png",
                "variant_index": str(n),
            })
            out_rows.append(rec)

    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out_rows)

    print(f"generated {generated} variant pins -> assets/pinterest/")
    print(f"wrote inventory -> data/pinterest_pins_variants.csv ({len(out_rows)} rows)")
    _load(os.path.join(HERE, "build_pinterest_upload.py"), "build_upload").convert("variants")
    print("--- variant pins per board ---")
    for b in GP.ALL_BOARDS:
        if board_counts[b]:
            print(f"  {board_counts[b]:5}  {b}")


if __name__ == "__main__":
    main()
