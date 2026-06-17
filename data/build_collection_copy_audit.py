#!/usr/bin/env python3
"""Build / refresh the collection-copy suitability ledger for every library page.

A page is a "collection" (copy-the-whole-set is a real job, rendered via
``UltraTextGen.buildGrids``) per the taxonomy in
``docs/emoji-combination-taxonomy.md`` §3. Two sources classify each page, in
priority order:

1. **Spec** (authoritative). If ``data/library_page_specs/<slug>.json`` exists,
   ``copy_pattern == "collection"`` means the page should ship set-copy.
2. **Legacy dict** (``LEGACY_AUDIT`` below). Manual judgements for the original
   pre-spec pages that have no spec file.

The verdict is then *derived* from (opportunity, has_collection_now) so the
ledger always reflects current reality:

    opportunity=yes & has now -> KEEP     (correct: keep set-copy)
    opportunity=yes & missing -> ADD      (should add set-copy)
    opportunity=no  & has now -> REMOVE   (set-copy is a poor fit)
    opportunity=no  & missing -> N/A      (correct as a single-glyph page)

Idempotent: rows in data/collection_copy_audit.csv are updated in place and new
pages appended; the CSV holds exactly one row per current library/*/index.html
page, sorted by slug. Run from the repo root:
python3 data/build_collection_copy_audit.py
"""
import csv
import datetime
import glob
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(REPO, "data", "collection_copy_audit.csv")
SPECS_DIR = os.path.join(REPO, "data", "library_page_specs")
TODAY = datetime.date.today().isoformat()

FIELDS = [
    "slug", "page_path", "symbol_category", "copy_pattern", "has_collection_now",
    "collection_opportunity", "verdict", "rationale", "source", "checked_date",
]

# Legacy manual judgements for the original pre-spec pages (used only when no
# spec file exists for the slug). Tuple: (symbol_category, collection_opportunity,
# _verdict, rationale). The third element is historical; the verdict column is now
# derived in main(). has_collection_now is detected from the page source.
LEGACY_AUDIT = {
    "accent-marks-diacritics": ("Combining diacritics", "no", "N/A",
        "Combining marks attach to individual letters; users copy one mark at a time, not a set."),
    "achievement-symbols": ("Achievement emojis", "no", "N/A",
        "Trophies, medals and award emojis are copied individually for a specific accolade, not pasted as a group."),
    "aesthetic-borders-frames": ("Decorative borders/frames", "yes", "ADD",
        "Entire page is multi-symbol borders, frames and dividers (Floral/Star/Heart Borders, Corner Frames, Minimalist Dividers) meant to be pasted as a unit."),
    "aesthetic-symbols": ("Aesthetic decoration", "yes", "ADD",
        "Aesthetic bio strings and divider/border sets (Sparkle/Heart/Nature aesthetic sets, Arrow & Divider sets) are typically pasted whole."),
    "animal-emojis": ("Animal emojis", "no", "N/A",
        "Users pick one animal emoji for context; there is no natural set pasted together."),
    "arrow-symbols": ("Directional arrows", "no", "N/A",
        "Arrows are functional single glyphs chosen for direction, not strung together as a collection."),
    "awareness-ribbons": ("Awareness ribbons", "no", "N/A",
        "A single cause ribbon is copied for a specific cause, not a set."),
    "body-language-emojis": ("Gesture/body emojis", "no", "N/A",
        "Expressive body and gesture emojis are used singly in context."),
    "bow-ribbon-symbols": ("Coquette bows/ribbons", "yes", "ADD",
        "Coquette/preppy bio decoration; bow+heart combos and ribbon strings are pasted together (page has a Bow & Heart Combos section)."),
    "box-drawing-symbols": ("Box-drawing / blocks", "yes", "ADD",
        "Box-drawing runs (lines, corners, junctions, shading) are assembled into multi-character borders and boxes - a textbook collection use."),
    "bracket-symbols": ("Brackets/braces", "no", "N/A",
        "A bracket pair is copied individually to wrap text, not as a symbol set."),
    "braille-pattern-symbols": ("Braille patterns", "no", "N/A",
        "Braille glyphs are looked up and copied individually (blank or solid fill), not as a curated set."),
    "bullet-point-symbols": ("Bullet markers", "no", "N/A",
        "Users copy one bullet to mark list items; the set is not pasted together."),
    "card-suit-symbols": ("Card suits", "no", "N/A",
        "Card suits are copied individually; the four-suit set is small and rarely pasted as a unit."),
    "checkmark-symbols": ("Checkmarks/status", "no", "N/A",
        "Checkmarks and crosses are status glyphs chosen one at a time (explicit single-glyph case)."),
    "chess-symbols": ("Chess pieces", "yes", "KEEP",
        "Has a Chess Piece Sets grouping; full white/black piece sets form a coherent unit, though intent is borderline single-glyph."),
    "copyright-trademark-symbols": ("Legal marks", "no", "N/A",
        "Copyright/registered/trademark marks are inserted individually next to a name; no set use."),
    "coquette-symbols": ("Coquette aesthetic", "yes", "ADD",
        "Soft feminine bio decoration; bows, hearts and dust strings are pasted together as aesthetic units."),
    "cottagecore-symbols": ("Cottagecore aesthetic", "yes", "ADD",
        "Cottagecore bio decoration including a Soft Cottagecore Borders set pasted as a unit."),
    "cross-x-symbols": ("Crosses / X marks", "no", "N/A",
        "Crosses and X marks are copied individually for a specific glyph."),
    "crown-royalty-symbols": ("Crowns/royalty", "no", "N/A",
        "A single crown or tiara is copied for a username; it is not pasted as a set."),
    "currency-symbols": ("Currency signs", "no", "N/A",
        "Currency signs are copied one at a time for a price (explicit single-glyph case)."),
    "dash-hyphen-symbols": ("Dashes/hyphens", "no", "N/A",
        "A specific dash or hyphen is copied for typography, not as a collection."),
    "degree-symbol": ("Degree/angle signs", "no", "N/A",
        "The degree sign and related marks are single-glyph inserts (explicit single-glyph case)."),
    "dice-domino-symbols": ("Dice/dominoes", "no", "N/A",
        "A single die or domino face is copied; the full face run is a minor sequence, not a typical paste unit."),
    "discord-symbols": ("Discord decoration", "yes", "ADD",
        "Explicit Symbol Combo Templates and Dividers sections are built to be pasted whole into Discord bios and channels."),
    "egyptian-hieroglyphs": ("Hieroglyphs", "no", "N/A",
        "A reference of 1,072 glyphs browsed to copy one specific hieroglyph."),
    "email-symbols": ("Email utility symbols", "no", "N/A",
        "Subject grabbers, bullets and status icons are inserted individually; dividers are single-character."),
    "emoji-flags": ("Country flags", "yes", "KEEP",
        "Regional flag grids are pasted as sets - already implemented and a genuine fit."),
    "emoji-meanings-guide": ("Editorial guide", "no", "N/A",
        "Editorial guide explaining emoji meanings, not a copy-grid page."),
    "face-emojis": ("Face emojis", "no", "N/A",
        "One expressive face emoji is chosen per context."),
    "flower-symbols": ("Flowers/nature", "yes", "ADD",
        "Has a Floral Dividers & Aesthetic Bio Sets section; floral strings are pasted whole as decoration."),
    "food-drink-emojis": ("Food/drink emojis", "no", "N/A",
        "Food and drink emojis are picked individually."),
    "fraction-symbols": ("Fractions", "no", "N/A",
        "A specific fraction glyph is copied; there is no set use."),
    "gender-symbols": ("Gender signs", "no", "N/A",
        "A single gender or orientation sign is copied for identity."),
    "geometric-symbols": ("Geometric shapes", "no", "N/A",
        "Geometric shapes are functional single glyphs used for formatting."),
    "goth-grunge-symbols": ("Goth/grunge aesthetic", "yes", "ADD",
        "Dark-aesthetic bio decoration; crosses, daggers and dark florals are strung together as units."),
    "greek-letter-symbols": ("Greek letters", "no", "N/A",
        "Primary intent is one Greek letter (alpha, pi); full-alphabet copy is already covered as a math sequence."),
    "hand-symbols": ("Hand emojis", "no", "N/A",
        "Hand gestures are copied singly."),
    "hazard-warning-symbols": ("Hazard/warning signs", "no", "N/A",
        "A specific warning sign is copied for labeling."),
    "heart-symbols": ("Hearts", "yes", "ADD",
        "Colored-heart sets and decorative heart strings are commonly pasted whole into bios (weaker fit than dedicated decoration pages)."),
    "instagram-symbols": ("Instagram decoration", "yes", "ADD",
        "Explicit Instagram Symbol Combos are built to paste as bio and caption units."),
    "kawaii-cute-symbols": ("Kawaii aesthetic", "yes", "ADD",
        "Cute decorative marks and pastel motifs are pasted together as aesthetic strings."),
    "keyboard-symbols": ("Keyboard glyphs", "no", "N/A",
        "Modifier and key glyphs are inserted individually into shortcuts."),
    "laundry-care-symbols": ("Care symbols", "no", "N/A",
        "Care symbols are referenced and copied one at a time."),
    "line-divider-symbols": ("Line dividers", "yes", "ADD",
        "Built around Decorative Divider Combos and Ornamental Separator Combos - multi-symbol dividers pasted as a unit."),
    "linkedin-comment-styling": ("Editorial guide", "no", "N/A",
        "Editorial how-to guide, not a copy-grid page."),
    "linkedin-symbol-library": ("LinkedIn utility", "no", "N/A",
        "Professional arrows, bullets and numbers are copied individually with no formatting loss."),
    "math-symbols": ("Math operators", "no", "REMOVE",
        "Math operators, comparison and set symbols are looked up one at a time (explicit single-glyph case); collection copy is a poor fit despite current use."),
    "media-control-symbols": ("Media controls", "no", "N/A",
        "Play/pause/stop glyphs are inserted individually."),
    "medical-symbols": ("Medical signs", "no", "N/A",
        "A specific medical sign (Rx, caduceus) is copied alone."),
    "moon-celestial-symbols": ("Moon/celestial", "yes", "KEEP",
        "Moon-phase sequences and night-sky sets are pasted as decorative units - already implemented and a genuine fit."),
    "music-symbols": ("Music notes", "yes", "ADD",
        "Has a Music Note Bio Decorations section; note strings are pasted as decoration (weaker fit; page is mostly single-note lookup)."),
    "norse-viking-runes": ("Runes", "yes", "KEEP",
        "Full futhark alphabets are copied as runic sets - already implemented and a genuine fit."),
    "number-symbols": ("Numerals", "no", "REMOVE",
        "Circled, superscript and Roman numerals are chosen individually (explicit individual-numerals case); collection copy is a poor fit despite current use."),
    "peace-symbol": ("Peace symbols", "no", "N/A",
        "A single peace sign or dove is copied."),
    "people-profession-emojis": ("Profession emojis", "no", "N/A",
        "One profession emoji is picked per context."),
    "punctuation-symbols": ("Punctuation marks", "no", "N/A",
        "Special punctuation marks are inserted individually."),
    "recycle-environment-symbols": ("Recycling/eco signs", "no", "N/A",
        "A specific recycling or eco sign is copied alone."),
    "religious-symbols": ("Faith symbols", "no", "N/A",
        "A single faith symbol is copied per tradition."),
    "roblox-symbols": ("Roblox decoration", "yes", "ADD",
        "Cute/Y2K decoration strings for Roblox display names are pasted as units within the content filter (weaker, platform-driven fit)."),
    "slash-backslash-symbols": ("Slashes", "no", "N/A",
        "A specific slash or backslash glyph is copied alone."),
    "smiley-face-guide": ("Editorial guide", "no", "N/A",
        "Editorial guide on smiley meanings, not a copy-grid page."),
    "sparkle-symbols": ("Sparkles", "yes", "ADD",
        "Sparkle/glitter strings, aesthetic decorators and divider/border characters are pasted whole (explicit sparkle-string case)."),
    "special-characters": ("Standalone specials", "no", "N/A",
        "Meaningful standalone symbols are copied individually by definition."),
    "sports-emojis": ("Sports emojis", "no", "N/A",
        "One sport or activity emoji is picked per post."),
    "star-symbols": ("Stars", "yes", "ADD",
        "Has Aesthetic Star Bio Decorations; star strings are pasted whole as decoration."),
    "tech-status-symbols": ("Status glyphs", "no", "N/A",
        "Wi-Fi, battery and power glyphs are inserted individually."),
    "text-faces-kaomoji": ("Kaomoji", "yes", "ADD",
        "Themed kaomoji combos can be offered as sets, though each kaomoji is already a self-contained unit (task-listed case; weaker fit)."),
    "tiktok-symbols": ("TikTok decoration", "yes", "ADD",
        "Has TikTok Bio Separators & Dividers built to paste as multi-symbol units."),
    "traffic-road-sign-symbols": ("Traffic/road signs", "no", "N/A",
        "A specific traffic or road sign is copied; the stoplight trio is a minor sequence."),
    "transport-symbols": ("Transport emojis", "no", "N/A",
        "One vehicle or transport emoji is picked per context."),
    "unit-measurement-symbols": ("Units/measures", "no", "N/A",
        "Scientific unit symbols are inserted individually."),
    "weather-symbols": ("Weather", "no", "N/A",
        "A single weather glyph is copied per condition."),
    "witchy-occult-symbols": ("Occult aesthetic", "yes", "ADD",
        "Witchy bio decoration; pentagram, moon and planetary strings are pasted as aesthetic units, though it doubles as an alchemical reference (weaker fit)."),
    "x-twitter-symbols": ("X/Twitter formatting", "no", "N/A",
        "Thread-formatting, quote markers and verification glyphs are functional single inserts."),
    "y2k-symbols": ("Y2K aesthetic", "yes", "ADD",
        "Explicit Y2K Combo Templates; cyber, star and butterfly strings are pasted as decorative units."),
    "yin-yang-symbol": ("Yin yang", "no", "N/A",
        "The yin-yang glyph and related balance characters are copied individually."),
    "zodiac-symbols": ("Zodiac/astrology", "yes", "KEEP",
        "Has a Zodiac & Astrology Sets grouping; the 12-sign set and astrology strings are pasted as units - already implemented."),
}


def detect_has_collection(page_path):
    try:
        html = open(os.path.join(REPO, page_path), encoding="utf-8").read()
    except OSError:
        return "no"
    return "yes" if re.search(r"buildGrids|copy-collection-btn", html) else "no"


def load_spec(slug):
    path = os.path.join(SPECS_DIR, slug + ".json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def classify(slug):
    """Return (symbol_category, copy_pattern, collection_opportunity, rationale,
    source) for a slug, preferring its spec over the legacy dict."""
    spec = load_spec(slug)
    if spec is not None:
        pattern = spec.get("copy_pattern", "")
        opportunity = "yes" if pattern == "collection" else "no"
        category = spec.get("breadcrumb") or spec.get("hero_h1") or slug
        if opportunity == "yes":
            rationale = ("Spec copy_pattern=collection: page ships a buildGrids "
                         "set-copy block; pasting the whole set is a real job.")
        else:
            rationale = ("Spec copy_pattern=single: glyphs are copied "
                         "individually; there is no whole-set paste job.")
        return category, pattern, opportunity, rationale, "spec"

    if slug in LEGACY_AUDIT:
        category, opportunity, _verdict, rationale = LEGACY_AUDIT[slug]
        pattern = "collection" if opportunity == "yes" else "single"
        return category, pattern, opportunity, rationale, "legacy"

    return None


def derive_verdict(opportunity, has_now):
    if opportunity == "yes":
        return "KEEP" if has_now == "yes" else "ADD"
    return "REMOVE" if has_now == "yes" else "N/A"


def main():
    pages = sorted(glob.glob(os.path.join(REPO, "library", "*", "index.html")))
    slugs = [os.path.basename(os.path.dirname(p)) for p in pages]

    missing = [s for s in slugs if classify(s) is None]
    if missing:
        sys.exit("ERROR: no spec or legacy-audit entry for: " + ", ".join(missing))

    # Load existing ledger (idempotent merge).
    existing = {}
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                existing[row["slug"]] = row

    rows = []
    counts = {"KEEP": 0, "ADD": 0, "REMOVE": 0, "N/A": 0}
    for slug in slugs:
        page_path = "library/%s/index.html" % slug
        category, pattern, opportunity, rationale, source = classify(slug)
        has_now = detect_has_collection(page_path)
        verdict = derive_verdict(opportunity, has_now)
        counts[verdict] += 1
        row = existing.get(slug, {})
        row.update({
            "slug": slug,
            "page_path": page_path,
            "symbol_category": category,
            "copy_pattern": pattern,
            "has_collection_now": has_now,
            "collection_opportunity": opportunity,
            "verdict": verdict,
            "rationale": rationale,
            "source": source,
            "checked_date": TODAY,
        })
        rows.append(row)

    rows.sort(key=lambda r: r["slug"])
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        w.writerows(rows)

    print("Wrote %d rows to %s (pages found: %d)" % (len(rows), CSV_PATH, len(pages)))
    print("Verdicts: KEEP=%(KEEP)d ADD=%(ADD)d REMOVE=%(REMOVE)d N/A=%(N/A)d" % counts)
    if counts["ADD"]:
        print("ADD (need collection-copy):")
        for r in rows:
            if r["verdict"] == "ADD":
                print("  - %s [%s]" % (r["slug"], r["source"]))
    if counts["REMOVE"]:
        print("REMOVE (collection-copy is a poor fit):")
        for r in rows:
            if r["verdict"] == "REMOVE":
                print("  - %s [%s]" % (r["slug"], r["source"]))
    assert len(rows) == len(pages), "row count != page count"


if __name__ == "__main__":
    main()
