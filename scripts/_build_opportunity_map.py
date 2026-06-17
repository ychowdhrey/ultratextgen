#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
One-off builder for data/library_opportunities.csv.

Expands the opportunity backlog into a full Unicode library opportunity map
using the keyword-volume CSVs (Semrush broad-match exports) and the forum
research process documented in docs/unicode-forum-research-skill.md.

Scoring follows docs/unicode-library-workflow.md section 3a:
  priority_score = search_volume_score   (0-25)
                 + forum_evidence_score  (0-25, from label)
                 + copy_usefulness_score (0-25)
                 + dedupe_score          (0-20)
                 + symbol_depth_score    (0-15)

This script does NOT generate page specs or library pages. It only writes the
opportunity CSV; the auditor is run separately.
"""

import csv
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "data" / "library_opportunities.csv"

# Slugs already published under /library/ (for dedupe sanity).
EXISTING = {
    "accent-marks-diacritics", "achievement-symbols", "aesthetic-borders-frames",
    "aesthetic-symbols", "animal-emojis", "arrow-symbols", "awareness-ribbons",
    "body-language-emojis", "bow-ribbon-symbols", "bracket-symbols",
    "bullet-point-symbols", "card-suit-symbols", "checkmark-symbols", "chess-symbols",
    "coquette-symbols", "cottagecore-symbols", "cross-x-symbols",
    "crown-royalty-symbols", "currency-symbols", "dash-hyphen-symbols",
    "discord-symbols", "egyptian-hieroglyphs", "email-symbols", "emoji-flags",
    "emoji-meanings-guide", "face-emojis", "flower-symbols", "food-drink-emojis",
    "geometric-symbols", "goth-grunge-symbols", "hand-symbols", "heart-symbols",
    "instagram-symbols", "kawaii-cute-symbols", "line-divider-symbols",
    "linkedin-comment-styling", "linkedin-symbol-library", "math-symbols",
    "moon-celestial-symbols", "music-symbols", "norse-viking-runes", "number-symbols",
    "people-profession-emojis", "religious-symbols", "roblox-symbols",
    "slash-backslash-symbols", "smiley-face-guide", "sparkle-symbols",
    "special-characters", "sports-emojis", "star-symbols", "text-faces-kaomoji",
    "tiktok-symbols", "traffic-road-sign-symbols", "transport-symbols",
    "weather-symbols", "whisper-subliminal-symbols", "witchy-occult-symbols",
    "x-twitter-symbols", "y2k-symbols", "zodiac-symbols",
    # batch-01-pilot pages now shipped on main — treat as published for dedupe.
    "copyright-trademark-symbols", "degree-symbol", "fraction-symbols",
}

FORUM_EVIDENCE_SCORE = {"none": 0, "weak": 10, "medium": 15, "strong": 25}

FIELDS = [
    "id", "page_type", "primary_keyword", "modifier", "intent", "forum_queries",
    "forum_evidence", "forum_source_urls", "search_volume", "demand_confidence",
    "symbol_category", "unicode_blocks", "copy_patterns", "slug", "title",
    "priority_score", "dedupe_status", "approval_status", "batch", "action", "notes",
]


def sv_score(v):
    """Bucket monthly search volume into 0-25."""
    if v >= 50000: return 25
    if v >= 20000: return 22
    if v >= 10000: return 18
    if v >= 5000:  return 15
    if v >= 2000:  return 12
    if v >= 1000:  return 9
    if v >= 500:   return 6
    if v >= 100:   return 3
    return 1


def approval_for(action):
    return {
        "create": "approved",
        "improve_existing": "pending",
        "needs_review": "pending",
        "skip": "rejected",
    }[action]


rows = []
_counter = [5]  # OPP-0001..0005 are the batch-01-pilot rows now on main.


def add(primary, modifier, intent, ev, vol, conf, cat, blocks, copy, slug,
        title, action, dedupe, copy_s, ded_s, depth_s, note,
        platform="reddit", batch="batch-03"):
    _counter[0] += 1
    oid = f"OPP-{_counter[0]:04d}"
    # Forum queries / urls mirror the seed-row style (site: operators + example
    # thread placeholders), keyed off the primary keyword.
    base = primary.replace(" ", "+")
    fq = (f"site:reddit.com {primary} copy paste | "
          f"site:quora.com {primary} {modifier or 'copy paste'}")
    urls = (f"https://www.reddit.com/r/Unicode/example-{base} | "
            f"https://www.quora.com/example-{base}")
    ev_score = FORUM_EVIDENCE_SCORE[ev]
    svs = sv_score(vol)
    pscore = svs + ev_score + copy_s + ded_s + depth_s
    full_note = (f"{note} score=vol{svs}+forum{ev_score}+copy{copy_s}"
                 f"+dedupe{ded_s}+depth{depth_s}={pscore}.")
    rows.append({
        "id": oid, "primary_keyword": primary, "modifier": modifier,
        "intent": intent, "forum_queries": fq, "forum_evidence": ev,
        "forum_source_urls": urls, "search_volume": str(vol),
        "demand_confidence": conf, "symbol_category": cat,
        "unicode_blocks": blocks, "copy_patterns": copy, "slug": slug,
        "title": title, "priority_score": str(pscore), "dedupe_status": dedupe,
        "approval_status": approval_for(action), "batch": batch,
        "action": action, "notes": full_note,
    })


# ===========================================================================
# A. CREATE — distinct head noun, real demand, uncovered Unicode blocks.
# ===========================================================================
# NOTE: degree, copyright/trademark, infinity and square-root were promoted to
# the batch-01-pilot and resolved on main (OPP-0001..0005): degree-symbol,
# copyright-trademark-symbols and fraction-symbols SHIPPED as pages; infinity
# and square-root were deliberately FOLDED into math-symbols. The rows below
# defer to those decisions instead of re-proposing standalone pages.
add("degree symbol", "copy paste", "find-and-copy", "strong", 110000, "high",
    "units", "Latin-1 Supplement (U+00B0) | Letterlike Symbols (U+2100..U+214F)",
    "single", "degree-symbol",
    "Degree Symbol: Copy & Paste ° Temperature & Angle Degrees",
    "improve_existing", "improve-existing:degree-symbol", 22, 8, 12,
    "ALREADY SHIPPED on main as OPP-0002 /library/degree-symbol/. Kept as "
    "improve_existing for future angle/temperature enhancements; do NOT recreate.",
    batch="batch-03")
add("copyright trademark symbols", "tm c r copy paste", "find-and-copy", "strong",
    74000, "high", "legal",
    "Latin-1 Supplement (U+00A9,U+00AE) | Letterlike Symbols (U+2120,U+2122)",
    "single", "copyright-trademark-symbols",
    "Copyright, Trademark & Legal Symbols: Copy & Paste © ® ™",
    "improve_existing", "improve-existing:copyright-trademark-symbols", 22, 8, 11,
    "ALREADY SHIPPED on main as OPP-0001 /library/copyright-trademark-symbols/. "
    "(my earlier slug 'trademark-copyright-symbols' realigned to the shipped slug.) "
    "Kept as improve_existing for service-mark/sound-recording additions.")
add("infinity symbol", "copy paste", "find-and-copy", "strong", 49500, "high",
    "math", "Mathematical Operators (U+221E) | Misc Math Symbols-B (U+29DC)",
    "single", "math-symbols",
    "Infinity Symbol & Variants (section on math-symbols)",
    "improve_existing", "fold-into:math-symbols", 20, 5, 9,
    "DEFER to main OPP-0003: deliberately FOLDED into math-symbols (only ~6 real "
    "glyphs ∞ ♾ ∝ ⧜ ⧝ ⧞ — too thin for a standalone page). Not a new page.")
add("greek letter symbols", "alpha beta delta copy paste", "find-and-copy", "strong",
    60500, "high", "greek", "Greek and Coptic (U+0370..U+03FF)", "collection",
    "greek-letter-symbols",
    "Greek Letter Symbols: Copy & Paste α β Δ Σ Ω π Alphabet",
    "create", "unique", 22, 20, 14,
    "CREATE. delta 60k/alpha 33k/sigma+omega+theta cluster; full Greek block uncovered.")
add("laundry care symbols", "washing meaning copy paste", "meaning", "strong",
    49500, "high", "care", "Miscellaneous Symbols (U+2600..U+26FF) care subset",
    "single", "laundry-care-symbols",
    "Laundry Care Symbols: Wash, Dry & Iron Symbol Meanings Chart",
    "create", "unique", 18, 20, 14,
    "CREATE. laundry 49.5k/washing 18k; reference+meaning page, no existing coverage.")
add("gender symbols", "male female copy paste", "find-and-copy", "strong", 27100,
    "high", "gender", "Miscellaneous Symbols (U+2640..U+26A9)", "single",
    "gender-symbols",
    "Gender Symbols: Copy & Paste ♂ ♀ ⚧ Male, Female & More",
    "create", "unique", 22, 20, 12,
    "CREATE. male/female 27k each + trans/nonbinary; distinct from zodiac/astro.")
add("medical symbols", "caduceus copy paste", "find-and-copy", "medium", 12100,
    "high", "medical", "Miscellaneous Symbols (U+2695,U+2624) | Dingbats", "single",
    "medical-symbols",
    "Medical Symbols: Copy & Paste ⚕ Caduceus, Rx & Health Signs",
    "create", "unique", 20, 20, 11,
    "CREATE. medical 12k/caduceus 8k; staff-of-asclepius/Rx uncovered.")
add("hazard warning symbols", "biohazard radiation copy paste", "find-and-copy",
    "medium", 18100, "high", "hazard",
    "Miscellaneous Symbols (U+2622,U+2623) | Misc Symbols and Arrows", "single",
    "hazard-warning-symbols",
    "Hazard & Warning Symbols: Copy & Paste ☢ ☣ ⚠ Danger Signs",
    "create", "unique", 21, 20, 12,
    "CREATE. biohazard 18k/radiation 8k/warning; distinct from traffic-road-sign.")
add("keyboard symbols", "command option shift mac copy paste", "find-and-copy",
    "medium", 9900, "high", "keyboard",
    "Misc Technical (U+2300..U+23FF) | command U+2318 option U+2325", "single",
    "keyboard-symbols",
    "Keyboard Symbols: Copy & Paste ⌘ ⌥ ⇧ Mac & PC Key Glyphs",
    "create", "unique", 23, 20, 12,
    "CREATE. keyboard/mac/command cluster 9.9k; Misc Technical block uncovered.")
add("media control symbols", "play pause power copy paste", "find-and-copy", "medium",
    5400, "medium", "media", "Misc Technical (U+23E9..U+23FA) | Geometric (U+25B6)",
    "single", "media-control-symbols",
    "Media Control Symbols: Copy & Paste ▶ ⏸ ⏹ Play, Pause, Power",
    "create", "unique", 22, 20, 12,
    "CREATE. power/play/pause/eject media-transport glyphs; no existing page.")
add("punctuation symbols", "dagger asterisk pilcrow copy paste", "find-and-copy",
    "medium", 6600, "medium", "punctuation",
    "General Punctuation (U+2020..U+2056) | dagger U+2020 pilcrow U+00B6", "single",
    "punctuation-symbols",
    "Punctuation Symbols: Copy & Paste † ‡ ¶ ※ ‽ Special Marks",
    "create", "unique", 20, 18, 13,
    "CREATE. dagger/asterism/pilcrow/interrobang cluster; special-characters overlaps but punctuation is a distinct head noun.")
add("peace symbol", "copy paste", "find-and-copy", "medium", 22200, "high", "peace",
    "Miscellaneous Symbols (U+262E)", "single", "peace-symbol",
    "Peace Symbol: Copy & Paste ☮ Peace Sign & Dove Characters",
    "create", "unique", 21, 18, 9,
    "CREATE. peace 22k distinct head noun; religious-symbols overlaps - confirm in audit.")
add("yin yang symbol", "copy paste", "find-and-copy", "medium", 27100, "high",
    "spiritual", "Miscellaneous Symbols (U+262F)", "single", "yin-yang-symbol",
    "Yin Yang Symbol: Copy & Paste ☯ Taijitu Balance Character",
    "create", "unique", 20, 18, 8,
    "CREATE. yin yang 27k; religious/witchy overlap possible - audit will flag.")
add("unit measurement symbols", "ohm micro angstrom copy paste", "find-and-copy",
    "medium", 14800, "medium", "units",
    "Letterlike Symbols (U+2126 ohm,U+212B angstrom) | micro U+00B5", "single",
    "unit-measurement-symbols",
    "Unit & Measurement Symbols: Copy & Paste Ω µ Å ℧ Scientific Units",
    "create", "unique", 19, 20, 12,
    "CREATE. ohm 14.8k/micro 18k/angstrom; SI/scientific units uncovered.")
add("recycle environment symbols", "recycle copy paste", "find-and-copy", "medium",
    14800, "high", "eco", "Miscellaneous Symbols (U+2672..U+2689 recycling)",
    "single", "recycle-environment-symbols",
    "Recycle Symbols: Copy & Paste ♻ ♲ Recycling & Eco Signs",
    "create", "unique", 20, 20, 12,
    "CREATE. recycle 14.8k; full recycling block U+2672.. uncovered.")
add("tech status symbols", "wifi bluetooth battery copy paste", "find-and-copy",
    "weak", 4400, "medium", "tech",
    "Misc Technical | Misc Symbols and Pictographs (battery,signal)", "single",
    "tech-status-symbols",
    "Tech & Status Symbols: Copy & Paste Wi-Fi, Bluetooth & Battery",
    "create", "unique", 19, 20, 10,
    "CREATE. wifi/bluetooth/battery UI glyphs; lower evidence but useful copy set.")

# ===========================================================================
# B. IMPROVE EXISTING — demand maps onto a published page; add a section.
# ===========================================================================
improve = [
    # (primary, modifier, intent, ev, vol, conf, cat, blocks, slug, title, copy_s, depth_s, note)
    ("star symbols", "aesthetic copy paste", "decorate-profile", "strong", 33100, "high",
     "stars", "Miscellaneous Symbols (U+2605..U+2606) | Dingbats (U+2729..U+273D)",
     "star-symbols", "Star Symbols: Copy & Paste ★ ☆ Star Characters", 20, 12,
     "IMPROVE. /library/star-symbols/ exists; add outline/sparkle-star + bio sections."),
    ("arrow symbols", "copy paste", "find-and-copy", "strong", 40500, "high", "arrows",
     "Arrows (U+2190..U+21FF) | Supplemental Arrows-A/B", "arrow-symbols",
     "Arrow Symbols: Copy & Paste → ← ↑ ↓ Arrow Characters", 20, 12,
     "IMPROVE. arrow 40k; add curved/double/directional variant sections."),
    ("right arrow symbol", "copy paste", "find-and-copy", "medium", 22200, "high",
     "arrows", "Arrows (U+2192,U+27A1)", "arrow-symbols",
     "Right Arrow Symbol Copy Paste → ➡", 18, 6,
     "FOLD variant into arrow-symbols (directional section), not a new page."),
    ("math symbols", "copy paste", "find-and-copy", "strong", 27100, "high", "math",
     "Mathematical Operators (U+2200..U+22FF)", "math-symbols",
     "Math Symbols: Copy & Paste ÷ × ≠ ≤ ≥ Math Characters", 18, 13,
     "IMPROVE. math 27k; add square-root/plus-minus/inequality sections."),
    ("square root symbol", "copy paste", "find-and-copy", "strong", 60500, "high",
     "math", "Mathematical Operators (U+221A..U+221C)", "math-symbols",
     "Square Root Symbol Copy Paste √ ∛ ∜", 18, 7,
     "FOLD into math-symbols radical section; sqrt 60k justifies a dedicated H2."),
    ("plus minus symbol", "copy paste", "find-and-copy", "medium", 33100, "high",
     "math", "Latin-1 (U+00B1) | Mathematical Operators (U+2213)", "math-symbols",
     "Plus or Minus Symbol Copy Paste ± ∓", 18, 6,
     "FOLD into math-symbols; plus-minus 33k as a section."),
    ("less than greater than symbols", "copy paste", "find-and-copy", "medium", 33100,
     "high", "math", "Mathematical Operators (U+2264,U+2265,U+2270..)", "math-symbols",
     "Less Than & Greater Than Symbols ≤ ≥ ≠", 17, 7,
     "FOLD into math-symbols inequalities section."),
    ("division symbol", "copy paste", "find-and-copy", "medium", 27100, "high", "math",
     "Latin-1 (U+00F7) | Mathematical Operators (U+2215)", "math-symbols",
     "Division Symbol Copy Paste ÷ ∕", 17, 5,
     "FOLD into math-symbols operators section."),
    ("currency symbols", "copy paste", "find-and-copy", "strong", 60500, "high",
     "currency", "Currency Symbols (U+20A0..U+20BF) | Latin-1 (cent/pound/yen)",
     "currency-symbols", "Currency Symbols: Copy & Paste € £ ¥ ₹ Money Signs",
     20, 13, "IMPROVE. euro 60k/pound 40k/yen 18k; add rupee/bitcoin/peso sections."),
    ("euro pound yen symbols", "copy paste", "find-and-copy", "strong", 60500, "high",
     "currency", "Currency Symbols (U+20AC,U+00A3,U+00A5)", "currency-symbols",
     "Euro, Pound & Yen Symbols € £ ¥", 18, 8,
     "FOLD major-currency section into currency-symbols."),
    ("bitcoin symbol", "copy paste", "find-and-copy", "weak", 4400, "medium",
     "currency", "Currency Symbols (U+20BF)", "currency-symbols",
     "Bitcoin Symbol Copy Paste ₿", 16, 4,
     "FOLD into currency-symbols crypto section."),
    ("rupee symbol", "copy paste", "find-and-copy", "medium", 9900, "high", "currency",
     "Currency Symbols (U+20B9)", "currency-symbols", "Rupee Symbol Copy Paste ₹",
     17, 4, "FOLD into currency-symbols."),
    ("music symbols", "copy paste", "decorate-profile", "strong", 22200, "high", "music",
     "Miscellaneous Symbols (U+2669..U+266F)", "music-symbols",
     "Music Symbols: Copy & Paste ♪ ♫ ♬ Note Characters", 19, 11,
     "IMPROVE. music/note 22k; add bio-decoration + clef sections."),
    ("zodiac symbols", "copy paste", "find-and-copy", "strong", 22200, "high", "zodiac",
     "Miscellaneous Symbols (U+2648..U+2653)", "zodiac-symbols",
     "Zodiac Symbols: Copy & Paste ♈ ♉ ♊ Astrology Signs", 18, 11,
     "IMPROVE. zodiac 22k; add planetary + element companion sections."),
    ("moon celestial symbols", "aesthetic copy paste", "decorate-profile", "strong",
     5400, "high", "celestial", "Miscellaneous Symbols (U+263D..U+2653) | sun/moon",
     "moon-celestial-symbols", "Moon & Celestial Symbols ☽ ☾ ☀ Copy Paste", 19, 11,
     "IMPROVE. moon/sun aesthetic; add star-and-moon bio section."),
    ("flower symbols", "aesthetic copy paste", "decorate-profile", "strong", 5400,
     "high", "flowers", "Miscellaneous Symbols (U+2698) | Dingbats (U+2740..U+2767)",
     "flower-symbols", "Flower Symbols: Copy & Paste ❀ ✿ ❁ Floral Characters", 19, 11,
     "IMPROVE. flower 5.4k; add floret/blossom aesthetic sections."),
    ("sparkle symbols", "aesthetic copy paste", "decorate-profile", "medium", 1900,
     "medium", "sparkles", "Dingbats (U+2728) | Misc Symbols (U+2734..U+2749)",
     "sparkle-symbols", "Sparkle Symbols: Copy & Paste ✨ ✩ Glitter Characters",
     18, 9, "IMPROVE. sparkle/glitter; add coquette sparkle section."),
    ("crown royalty symbols", "copy paste", "decorate-username", "medium", 2900,
     "medium", "crown", "Miscellaneous Symbols (U+265A..U+265F) | emoji crown",
     "crown-royalty-symbols", "Crown Symbols: Copy & Paste ♔ ♕ ♛ Royalty Characters",
     18, 9, "IMPROVE. crown 2.9k; add king/queen username section."),
    ("checkmark symbols", "copy paste", "find-and-copy", "strong", 22200, "high",
     "checks", "Dingbats (U+2713..U+2718)", "checkmark-symbols",
     "Check Mark Symbols: Copy & Paste ✓ ✔ ☑ Tick Characters", 20, 10,
     "IMPROVE. check/tick 22k; add ballot-box + heavy-check sections."),
    ("cross symbols", "copy paste", "find-and-copy", "strong", 27100, "high", "cross",
     "Dingbats (U+2719..U+2720) | Misc Symbols (U+271D)", "cross-x-symbols",
     "Cross & X Symbols: Copy & Paste ✝ ✕ ✖ Cross Characters", 19, 11,
     "IMPROVE. cross 27k; add religious-cross vs multiplication-x sections."),
    ("geometric symbols", "copy paste", "find-and-copy", "strong", 60500, "high",
     "geometric", "Geometric Shapes (U+25A0..U+25FF)", "geometric-symbols",
     "Geometric Symbols: Copy & Paste ■ ● ▲ Shape Characters", 19, 13,
     "IMPROVE. square 60k/circle/triangle; add filled-vs-outline sections."),
    ("weather symbols", "copy paste", "find-and-copy", "medium", 3600, "medium",
     "weather", "Miscellaneous Symbols (U+2600..U+2603) sun/cloud/snow",
     "weather-symbols", "Weather Symbols: Copy & Paste ☀ ☁ ☂ ❄ Forecast Characters",
     18, 10, "IMPROVE. weather/snow 3.6k; add snowflake + storm sections."),
    ("religious symbols", "copy paste", "find-and-copy", "medium", 14800, "high",
     "religious", "Miscellaneous Symbols (U+2625..U+2638 om/ankh/cross/wheel)",
     "religious-symbols", "Religious Symbols: Copy & Paste ☥ ☩ ☪ ✡ ☸ Faith Signs",
     18, 12, "IMPROVE. om/ankh 12-14k; add per-faith sections."),
    ("chess symbols", "copy paste", "find-and-copy", "weak", 720, "medium", "chess",
     "Miscellaneous Symbols (U+2654..U+265F)", "chess-symbols",
     "Chess Symbols: Copy & Paste ♔ ♞ Chess Piece Characters", 18, 9,
     "IMPROVE. chess 720; existing page - refresh white/black sets."),
    ("card suit symbols", "copy paste", "find-and-copy", "medium", 2900, "medium",
     "cards", "Miscellaneous Symbols (U+2660..U+2667)", "card-suit-symbols",
     "Card Suit Symbols: Copy & Paste ♠ ♥ ♦ ♣ Playing Cards", 19, 8,
     "IMPROVE. spade/club/diamond; existing page - add filled/outline."),
    ("hand symbols", "copy paste", "find-and-copy", "medium", 1900, "medium", "hands",
     "Dingbats (U+261A..U+261F) | Misc Symbols pointing hands", "hand-symbols",
     "Hand Symbols: Copy & Paste ☚ ☛ ☝ Pointing Hand Characters", 18, 10,
     "IMPROVE. pointing-hand; thumbs/ok emoji belong on hand page section."),
    ("number symbols", "copy paste", "find-and-copy", "medium", 5400, "medium",
     "numbers", "Number Forms (U+2150..U+218F) | Enclosed Alphanumerics", "number-symbols",
     "Number Symbols: Copy & Paste ① ② ⑩ Circled & Fancy Numbers", 18, 12,
     "IMPROVE. number 5.4k; add circled/roman/superscript sections (fractions shipped separately as OPP-0005 on main)."),
    ("special characters", "copy paste", "find-and-copy", "strong", 22200, "high",
     "special", "General Punctuation | Letterlike | Misc Technical", "special-characters",
     "Special Characters: Copy & Paste Symbols & Glyphs", 18, 13,
     "IMPROVE. ampersand/at/section/paragraph; hub page - add per-mark sections."),
    ("at symbol", "copy paste", "find-and-copy", "medium", 22200, "high", "special",
     "Commercial At (U+0040) | Small Forms", "special-characters",
     "At Symbol @ Copy Paste", 16, 4,
     "FOLD into special-characters (or email-symbols); @ 22k as a section."),
    ("ampersand symbol", "copy paste", "find-and-copy", "medium", 9900, "high",
     "special", "Latin-1 (U+0026) | fancy ampersand variants", "special-characters",
     "Ampersand Symbol & Copy Paste", 16, 5,
     "FOLD into special-characters; ampersand 9.9k section with calligraphic variants."),
    ("section paragraph symbols", "copy paste", "find-and-copy", "medium", 27100, "high",
     "editing", "Latin-1 (U+00A7 section,U+00B6 pilcrow)", "special-characters",
     "Section § & Paragraph ¶ Symbols Copy Paste", 17, 6,
     "FOLD into special-characters editing-marks section; section 27k/paragraph 22k."),
    ("bow ribbon symbols", "coquette copy paste", "decorate-profile", "medium", 6600,
     "high", "bows", "Dingbats / Misc Symbols bow + emoji ribbon", "bow-ribbon-symbols",
     "Bow & Ribbon Symbols: Copy & Paste 🎀 ⊰ Coquette Characters", 19, 9,
     "IMPROVE. bow 6.6k coquette demand; add ribbon-divider section."),
    ("bullet point symbols", "copy paste", "find-and-copy", "medium", 12100, "high",
     "bullets", "General Punctuation (U+2022..U+2043) | Geometric dots",
     "bullet-point-symbols", "Bullet Point Symbols: Copy & Paste • ◦ ▪ List Bullets",
     19, 10, "IMPROVE. bullet/dot 12k; add list-style + nested-bullet sections."),
    ("dash hyphen symbols", "copy paste", "find-and-copy", "strong", 22200, "high",
     "dashes", "General Punctuation (U+2010..U+2015) | minus", "dash-hyphen-symbols",
     "Dash & Hyphen Symbols: Copy & Paste – — ‐ Em & En Dashes", 18, 9,
     "IMPROVE. dash 22k; add em-dash vs en-dash vs minus sections."),
    ("norse viking runes", "copy paste", "find-and-copy", "medium", 3600, "high",
     "runes", "Runic (U+16A0..U+16FF)", "norse-viking-runes",
     "Norse Viking Runes: Copy & Paste ᚠ ᚢ ᚦ Elder Futhark", 18, 12,
     "IMPROVE. rune/valknut 3.6k; full Runic block - add Elder/Younger Futhark."),
    ("egyptian hieroglyphs", "copy paste", "find-and-copy", "weak", 1300, "medium",
     "hieroglyphs", "Egyptian Hieroglyphs (U+13000..U+1342F)", "egyptian-hieroglyphs",
     "Egyptian Hieroglyphs: Copy & Paste 𓂀 𓆣 Ancient Symbols", 16, 12,
     "IMPROVE. hieroglyph 1.3k (note 𓆉 6.6k copy-paste query); refresh categories."),
    ("witchy occult symbols", "aesthetic copy paste", "decorate-profile", "medium",
     3600, "high", "occult", "Misc Symbols (pentagram U+26E4..) | alchemical",
     "witchy-occult-symbols", "Witchy & Occult Symbols ☽ ⛤ Copy Paste", 18, 12,
     "IMPROVE. pentagram/triquetra 3.6k; add alchemical + sigil sections."),
    ("aesthetic symbols", "copy paste", "decorate-profile", "strong", 22200, "high",
     "aesthetic", "Misc Symbols | Dingbats | Braille patterns", "aesthetic-symbols",
     "Aesthetic Symbols: Copy & Paste ✧ ⋆ ˚ Cute Text Decor", 20, 13,
     "IMPROVE. aesthetic 22k; central hub - add per-vibe sections."),
    ("line divider symbols", "aesthetic bio copy paste", "decorate-profile", "medium",
     390, "medium", "dividers", "Box Drawing | Dingbats | Geometric", "line-divider-symbols",
     "Line & Divider Symbols: Copy & Paste ── ⋆⁺₊ Bio Separators", 19, 10,
     "IMPROVE. divider 390 but high decorate intent; add bio-divider presets."),
    ("aesthetic borders frames", "copy paste", "decorate-profile", "medium", 1900,
     "medium", "borders", "Box Drawing (U+2500..U+257F)", "aesthetic-borders-frames",
     "Aesthetic Borders & Frames: Copy & Paste ╭╮ Text Boxes", 18, 11,
     "IMPROVE. border/frame 1.9k; add corner + box-drawing presets."),
    ("text faces kaomoji", "copy paste", "find-and-copy", "strong", 18100, "high",
     "kaomoji", "Combining + CJK + Katakana (kaomoji building blocks)", "text-faces-kaomoji",
     "Text Faces & Kaomoji: Copy & Paste ¯\\_(ツ)_/¯ Japanese Emoticons", 20, 13,
     "IMPROVE. shrug 18k/japanese emoticons 9.9k/kaomoji; add shrug+lenny+table-flip."),
    ("animal emojis", "copy paste", "find-and-copy", "medium", 9900, "high", "animals",
     "Misc Symbols and Pictographs (animals)", "animal-emojis",
     "Animal Emojis: Copy & Paste 🐱 🐶 🐰 Cute Animal Faces", 17, 12,
     "IMPROVE. cat/dog/bunny emoticon demand 9.9k; add cat-emoticon section."),
    ("discord symbols", "username copy paste", "decorate-username", "medium", 1300,
     "high", "platform", "Misc Symbols | Dingbats | Braille", "discord-symbols",
     "Discord Symbols: Copy & Paste Aesthetic Name Characters", 18, 11,
     "IMPROVE. discord name demand; add separator + status-decor sections."),
    ("instagram symbols", "bio copy paste", "decorate-profile", "medium", 1900, "high",
     "platform", "Misc Symbols | Dingbats", "instagram-symbols",
     "Instagram Symbols: Copy & Paste Bio & Caption Characters", 18, 11,
     "IMPROVE. IG bio demand; add bio-divider + aesthetic sections."),
    ("tiktok symbols", "bio copy paste", "decorate-profile", "weak", 880, "medium",
     "platform", "Misc Symbols | Dingbats", "tiktok-symbols",
     "TikTok Symbols: Copy & Paste Bio & Username Characters", 17, 10,
     "IMPROVE. tiktok bio; refresh aesthetic section."),
    ("crying laughing emoticon", "copy paste", "find-and-copy", "strong", 9900, "high",
     "kaomoji", "Combining + CJK kaomoji", "text-faces-kaomoji",
     "Crying Laughing Text Emoticons Copy Paste", 17, 6,
     "FOLD into text-faces-kaomoji; crying-laughter 9.9k as a section."),
    ("shrug emoticon", "copy paste", "find-and-copy", "strong", 18100, "high", "kaomoji",
     "Katakana (ツ) + combining", "text-faces-kaomoji",
     "Shrug Emoticon Copy Paste ¯\\_(ツ)_/¯", 18, 5,
     "FOLD into text-faces-kaomoji; shrug 18k is the top kaomoji section."),
]
for (p, m, it, ev, vol, conf, cat, blocks, slug, title, copy_s, depth_s, note) in improve:
    action = "improve_existing"
    dedupe = (f"fold-into:{slug}" if note.startswith("FOLD")
              else f"improve-existing:{slug}")
    ded_s = 5 if note.startswith("FOLD") else 8
    cp = "collection" if "collection" in blocks else "single"
    add(p, m, it, ev, vol, conf, cat, blocks, "single", slug, title, action,
        dedupe, copy_s, ded_s, depth_s, note, batch="batch-04")

# ===========================================================================
# C. SKIP — duplicates with nothing to add, wrong vertical, or disallowed.
# ===========================================================================
skips = [
    ("cute symbols", "kawaii copy paste", "decorate-profile", "strong", 49500, "high",
     "kawaii", "Misc Symbols", "kawaii-cute-symbols",
     "Cute Symbols Copy Paste", "SKIP. Duplicate of kawaii-cute-symbols (folds into that page)."),
    ("aesthetic symbols copy and paste", "", "decorate-profile", "strong", 4400, "high",
     "aesthetic", "Misc Symbols", "aesthetic-symbols",
     "Aesthetic Symbols Copy And Paste", "SKIP. Exact intent dup of aesthetic-symbols."),
    ("heart symbol copy paste", "", "find-and-copy", "strong", 22200, "high", "hearts",
     "Misc Symbols (U+2764)", "heart-symbols", "Heart Symbol Copy Paste",
     "SKIP. Pure dup of heart-symbols; the heart-symbols improve_existing row owns it."),
    ("copy and paste symbols", "", "find-and-copy", "strong", 110000, "high", "generic",
     "all blocks", "special-characters", "Copy And Paste Symbols",
     "SKIP as standalone. Generic head term already served by special-characters/library hub."),
    ("symbols", "", "find-and-copy", "strong", 110000, "high", "generic", "all blocks",
     "special-characters", "Symbols", "SKIP. Too generic; maps to library hub, no new page."),
    ("symbol copy and paste", "", "find-and-copy", "strong", 22200, "high", "generic",
     "all blocks", "special-characters", "Symbol Copy And Paste",
     "SKIP. Generic variant of copy-paste-symbols hub."),
    ("nazi symbol", "", "meaning", "none", 27100, "low", "hate", "n/a",
     "n/a", "Nazi Symbol", "SKIP (policy). Hate symbol; will not build a copy page."),
    ("swastika symbol", "", "meaning", "none", 22200, "low", "hate", "n/a", "n/a",
     "Swastika Symbol", "SKIP (policy). Disallowed; no copy/decoration page."),
    ("penis emoticon", "", "find-and-copy", "weak", 1300, "low", "adult", "n/a", "n/a",
     "Penis Emoticon", "SKIP (policy). Adult/NSFW; out of scope."),
    ("dirty emoticon symbols", "copy and paste", "find-and-copy", "weak", 20, "low",
     "adult", "n/a", "n/a", "Dirty Emoticon Symbols", "SKIP. NSFW + negligible volume."),
    ("sex emoticon", "copy and paste", "find-and-copy", "none", 20, "low", "adult",
     "n/a", "n/a", "Sex Emoticon", "SKIP (policy). Adult; out of scope."),
    ("stock symbol ctl", "", "meaning", "none", 27100, "low", "finance", "n/a", "n/a",
     "Stock Symbol CTL", "SKIP. Finance ticker, not a Unicode symbol page."),
    ("stock symbol aal", "", "meaning", "none", 27100, "low", "finance", "n/a", "n/a",
     "Stock Symbol AAL", "SKIP. Finance ticker; irrelevant to library."),
    ("symbolism", "", "meaning", "none", 60500, "low", "literary", "n/a", "n/a",
     "Symbolism", "SKIP. Literary concept, not symbol-copy intent."),
    ("symbolism definition", "", "meaning", "none", 18100, "low", "literary", "n/a",
     "n/a", "Symbolism Definition", "SKIP. Dictionary intent; not a library page."),
    ("symbolic interactionism", "", "meaning", "none", 22200, "low", "academic", "n/a",
     "n/a", "Symbolic Interactionism", "SKIP. Sociology term; irrelevant."),
    ("emoticon meaning", "", "meaning", "weak", 1900, "low", "meaning", "n/a",
     "emoji-meanings-guide", "Emoticon Meaning",
     "SKIP. Meaning intent -> emoji-meanings-guide, not a copy library."),
    ("emoticon definition", "", "meaning", "none", 1600, "low", "meaning", "n/a",
     "emoji-meanings-guide", "Emoticon Definition", "SKIP. Dictionary/guide intent."),
    ("what do the emoticons on snapchat mean", "", "meaning", "weak", 2400, "low",
     "meaning", "n/a", "emoji-meanings-guide", "Snapchat Emoticon Meanings",
     "SKIP. Guide/meaning intent, platform-specific; belongs in /guide/."),
    ("yellow heart emoticon meaning", "", "meaning", "weak", 2900, "low", "meaning",
     "n/a", "emoji-meanings-guide", "Yellow Heart Emoticon Meaning",
     "SKIP. Meaning intent -> emoji-meanings-guide section."),
    ("symbols and emoticons facebook", "", "find-and-copy", "none", 320, "low",
     "legacy", "n/a", "n/a", "Facebook Symbols And Emoticons",
     "SKIP. Legacy FB-chat intent, dead demand, zero-trend tail."),
    ("smiley face emoticon", "", "find-and-copy", "weak", 1300, "low", "smiley", "n/a",
     "smiley-face-guide", "Smiley Face Emoticon",
     "SKIP. Covered by smiley-face-guide; nothing to add."),
    ("emoticons using text", "", "find-and-copy", "medium", 1900, "medium", "kaomoji",
     "n/a", "text-faces-kaomoji", "Emoticons Using Text",
     "SKIP. Dup of text-faces-kaomoji intent."),
    ("texting emoticons", "", "find-and-copy", "weak", 1300, "low", "kaomoji", "n/a",
     "text-faces-kaomoji", "Texting Emoticons", "SKIP. Dup of text-faces-kaomoji."),
    ("twitch emoticons", "", "platform-specific", "weak", 1300, "low", "platform",
     "n/a", "n/a", "Twitch Emoticons",
     "SKIP. Twitch emotes are proprietary images, not Unicode; out of scope."),
    ("facial emoticons", "", "find-and-copy", "weak", 1300, "low", "smiley", "n/a",
     "smiley-face-guide", "Facial Emoticons", "SKIP. Overlaps smiley-face-guide."),
    ("emoticons explanation", "", "meaning", "none", 1300, "low", "meaning", "n/a",
     "emoji-meanings-guide", "Emoticons Explanation", "SKIP. Meaning/guide intent."),
    ("emoji symbols copy paste", "", "find-and-copy", "medium", 1900, "medium", "emoji",
     "n/a", "special-characters", "Emoji Symbols Copy Paste",
     "SKIP. Vague emoji+symbol blend; served by existing hubs."),
    ("cool symbols copy and paste", "", "find-and-copy", "strong", 4400, "high", "cool",
     "Misc Symbols", "aesthetic-symbols", "Cool Symbols Copy And Paste",
     "SKIP. 'cool' is a modifier of aesthetic-symbols; fold, don't create."),
    ("pretty symbols copy paste", "", "decorate-profile", "medium", 4400, "high",
     "aesthetic", "Misc Symbols", "aesthetic-symbols", "Pretty Symbols Copy Paste",
     "SKIP. Modifier of aesthetic-symbols; nothing distinct to add."),
    ("text symbols copy and paste", "", "find-and-copy", "medium", 3600, "high", "text",
     "Misc Symbols", "special-characters", "Text Symbols Copy And Paste",
     "SKIP. Generic; overlaps special-characters hub."),
    ("greek symbols copy and paste", "", "find-and-copy", "medium", 2400, "high",
     "greek", "Greek and Coptic", "greek-letter-symbols",
     "Greek Symbols Copy And Paste", "SKIP-as-dup of new greek-letter-symbols CREATE row."),
]
for (p, m, it, ev, vol, conf, cat, blocks, slug, title, note) in skips:
    add(p, m, it, ev, vol, conf, cat, blocks, "single", slug, title, "skip",
        "skip", 5, 0, 3, note, batch="batch-05")

# ===========================================================================
# D. NEEDS REVIEW — overlap or thin evidence; decide create vs improve later.
# ===========================================================================
review = [
    ("roman numeral symbols", "copy paste", "find-and-copy", "weak", 480, "low",
     "numbers", "Number Forms (U+2160..U+2188)", "number-symbols",
     "Roman Numeral Symbols Copy Paste Ⅰ Ⅴ Ⅹ",
     "REVIEW. Low vol; likely fold into number-symbols vs standalone roman-numeral page."),
    ("percent permille symbols", "copy paste", "find-and-copy", "weak", 3600, "low",
     "math", "Latin-1 (U+0025) | General Punctuation (U+2030,U+2031)", "math-symbols",
     "Percent, Per Mille & Per Myriad % ‰ ‱",
     "REVIEW. Fold into math-symbols vs special-characters; confirm best home."),
    ("prime symbols", "copy paste", "find-and-copy", "weak", 1300, "low", "math",
     "General Punctuation (U+2032..U+2037)", "math-symbols",
     "Prime, Double Prime & Triple Prime ′ ″ ‴",
     "REVIEW. Feet/inch/minute-second use; fold into math or units?"),
    ("ellipsis symbol", "copy paste", "find-and-copy", "weak", 1900, "low", "punct",
     "General Punctuation (U+2026)", "punctuation-symbols", "Ellipsis Symbol … Copy Paste",
     "REVIEW. Single glyph; fold into new punctuation-symbols CREATE row."),
    ("quotation mark symbols", "copy paste", "find-and-copy", "weak", 1900, "low",
     "punct", "General Punctuation (U+2018..U+201F)", "punctuation-symbols",
     "Quotation Mark Symbols “ ” ‘ ’ « »",
     "REVIEW. Curly/guillemet quotes; fold into punctuation-symbols."),
    ("apostrophe symbol", "copy paste", "find-and-copy", "weak", 1600, "low", "punct",
     "General Punctuation (U+2019) | Latin-1", "punctuation-symbols",
     "Apostrophe Symbol ' ’ Copy Paste",
     "REVIEW. Straight vs curly; fold into punctuation-symbols."),
    ("caret tilde symbols", "copy paste", "find-and-copy", "weak", 6600, "low", "punct",
     "Basic Latin (U+005E,U+007E) | combining", "punctuation-symbols",
     "Caret ^ & Tilde ~ Symbols Copy Paste",
     "REVIEW. Keyboard punctuation; fold into punctuation-symbols vs keyboard-symbols."),
    ("dot symbols", "copy paste", "find-and-copy", "medium", 12100, "medium", "dots",
     "General Punctuation (U+2022) | Geometric (U+25CF..U+25CB)", "bullet-point-symbols",
     "Dot Symbols • ● ∙ ⋅ Copy Paste",
     "REVIEW. 12k 'dot' overlaps bullet-point + geometric; pick canonical home."),
    ("angle symbols", "copy paste", "find-and-copy", "weak", 6600, "low", "math",
     "Mathematical Operators (U+2220..U+2222)", "math-symbols",
     "Angle Symbols ∠ ∡ ∢ Copy Paste",
     "REVIEW. Geometry angles; fold into math-symbols geometry section?"),
    ("fire symbol", "copy paste", "find-and-copy", "weak", 5400, "low", "elements",
     "Misc Symbols | emoji fire", "weather-symbols", "Fire Symbol Copy Paste",
     "REVIEW. Mostly emoji 🔥; weak text-symbol coverage. Improve weather/elements?"),
    ("wave symbol", "copy paste", "find-and-copy", "weak", 8100, "low", "misc",
     "Misc Math (U+223F) | Dingbats | emoji wave", "geometric-symbols",
     "Wave Symbol ∿ 〜 Copy Paste",
     "REVIEW. Ambiguous (sine wave vs ocean vs hand-wave); split intents before deciding."),
    ("skull symbol", "copy paste", "decorate-profile", "weak", 2400, "low", "goth",
     "Misc Symbols (U+2620) | emoji skull", "goth-grunge-symbols",
     "Skull Symbol ☠ Copy Paste",
     "REVIEW. ☠ fold into goth-grunge-symbols vs hazard; confirm."),
    ("scissors symbol", "copy paste", "find-and-copy", "weak", 320, "low", "dingbats",
     "Dingbats (U+2701..U+2702)", "special-characters", "Scissors Symbol ✂ Copy Paste",
     "REVIEW. Dingbat; thin vol. Fold into special-characters dingbat section."),
    ("phone symbol", "copy paste", "find-and-copy", "weak", 6600, "low", "contact",
     "Misc Symbols (U+260E,U+2706) | emoji phone", "email-symbols",
     "Phone Symbol ☎ ✆ Copy Paste",
     "REVIEW. Contact glyphs; fold into email-symbols (contact-icons) vs new page."),
    ("email symbol", "copy paste", "find-and-copy", "weak", 2400, "low", "contact",
     "Misc Symbols (U+2709) | emoji envelope", "email-symbols",
     "Email & Envelope Symbol ✉ @ Copy Paste",
     "REVIEW. /library/email-symbols/ exists; verify @-and-envelope coverage before improve."),
    ("triangle symbols", "copy paste", "find-and-copy", "weak", 6600, "low", "geometric",
     "Geometric Shapes (U+25B2..U+25BF)", "geometric-symbols",
     "Triangle Symbols ▲ △ ▼ Copy Paste",
     "REVIEW. Fold into geometric-symbols vs standalone; depends on depth."),
    ("circle symbols", "copy paste", "find-and-copy", "weak", 3600, "low", "geometric",
     "Geometric Shapes (U+25CB..U+25CF) | enclosed", "geometric-symbols",
     "Circle Symbols ● ○ ◌ Copy Paste",
     "REVIEW. Fold into geometric-symbols; large circle/enclosed set could justify own page."),
    ("square symbols", "copy paste", "find-and-copy", "medium", 60500, "medium",
     "geometric", "Geometric Shapes (U+25A0..U+25A1)", "geometric-symbols",
     "Square Symbols ■ □ ▢ Copy Paste",
     "REVIEW. 60k but 'square' is highly ambiguous (squared math, shape, sq root). Split intent."),
    ("atom symbol", "copy paste", "find-and-copy", "weak", 6600, "low", "science",
     "Misc Symbols and Pictographs (U+269B)", "religious-symbols",
     "Atom Symbol ⚛ Copy Paste",
     "REVIEW. ⚛ used as science + atheism; fold into religious vs new science page."),
    ("om symbol", "copy paste", "find-and-copy", "medium", 12100, "medium", "religious",
     "Devanagari (U+0950) | Misc Symbols (U+1F549)", "religious-symbols",
     "Om Symbol ॐ Copy Paste",
     "REVIEW. om 12k; fold into religious-symbols Hindu section (already partially covered)."),
    ("ankh symbol", "copy paste", "find-and-copy", "medium", 14800, "medium", "religious",
     "Coptic / Misc Symbols (U+2625)", "religious-symbols", "Ankh Symbol ☥ Copy Paste",
     "REVIEW. ankh 14.8k; fold into religious-symbols vs egyptian; pick home."),
    ("lightning symbol", "copy paste", "find-and-copy", "weak", 1900, "low", "weather",
     "Misc Technical (U+26A1) | Dingbats", "weather-symbols",
     "Lightning Bolt Symbol ⚡ Copy Paste",
     "REVIEW. ⚡ fold into weather-symbols vs power/tech; confirm."),
    ("paw print symbol", "copy paste", "decorate-profile", "weak", 3600, "low", "animals",
     "Dingbats | emoji paw", "animal-emojis", "Paw Print Symbol 🐾 Copy Paste",
     "REVIEW. paw 3.6k mostly emoji; fold into animal-emojis section."),
    ("snowflake symbol", "copy paste", "decorate-profile", "weak", 1000, "low", "weather",
     "Misc Symbols (U+2744..U+2746)", "weather-symbols", "Snowflake Symbol ❄ ❅ ❆ Copy Paste",
     "REVIEW. Dingbat snowflakes; fold into weather-symbols winter section."),
    ("middle finger symbol", "copy paste", "find-and-copy", "weak", 480, "low", "hands",
     "Misc Symbols and Pictographs (U+1F595) | text", "hand-symbols",
     "Middle Finger Symbol Copy Paste",
     "REVIEW. Borderline; fold into hand-symbols, flag for tone review."),
    ("interrobang symbol", "copy paste", "find-and-copy", "weak", 390, "low", "punct",
     "General Punctuation (U+203D)", "punctuation-symbols", "Interrobang ‽ Copy Paste",
     "REVIEW. Niche; fold into punctuation-symbols."),
    ("numero symbol", "copy paste", "find-and-copy", "weak", 590, "low", "letterlike",
     "Letterlike Symbols (U+2116)", "special-characters", "Numero Sign № Copy Paste",
     "REVIEW. № fold into special-characters letterlike section."),
    ("estimated symbol", "copy paste", "find-and-copy", "weak", 720, "low", "letterlike",
     "Letterlike (U+212E)", "special-characters", "Estimated Sign ℮ Copy Paste",
     "REVIEW. Packaging glyph; fold into special-characters or units."),
    ("triquetra valknut symbols", "norse copy paste", "find-and-copy", "weak", 1300,
     "low", "norse", "Misc Symbols (U+2629) | runic-adjacent", "norse-viking-runes",
     "Triquetra & Valknut Symbols ⚕ Copy Paste",
     "REVIEW. Fold into norse-viking-runes vs witchy-occult; pick home."),
    ("pentagram symbol", "copy paste", "decorate-profile", "weak", 3600, "low", "occult",
     "Misc Symbols (U+26E4..U+26E7)", "witchy-occult-symbols",
     "Pentagram Symbol ⛤ ⛥ Copy Paste",
     "REVIEW. pentagram 3.6k; fold into witchy-occult-symbols section."),
    ("crescent moon symbol", "copy paste", "decorate-profile", "weak", 1300, "low",
     "celestial", "Misc Symbols (U+263D,U+263E)", "moon-celestial-symbols",
     "Crescent Moon Symbol ☽ ☾ Copy Paste",
     "REVIEW. Fold into moon-celestial-symbols (likely already covered)."),
    ("sun symbol", "copy paste", "decorate-profile", "weak", 5400, "low", "celestial",
     "Misc Symbols (U+2600,U+2609)", "moon-celestial-symbols", "Sun Symbol ☀ ☉ Copy Paste",
     "REVIEW. sun 5.4k; fold into moon-celestial-symbols vs weather; pick canonical."),
]
for (p, m, it, ev, vol, conf, cat, blocks, slug, title, note) in review:
    add(p, m, it, ev, vol, conf, cat, blocks, "single", slug, title, "needs_review",
        "review-overlap", 12, 4, 8, note, batch="batch-06")

# ===========================================================================
# E. SUPPLEMENTAL — cover remaining published pages + long-tail families.
# ===========================================================================
# E1. Improve rows for existing pages not yet represented.
improve2 = [
    ("kawaii cute symbols", "copy paste", "decorate-profile", "strong", 5400, "high",
     "kawaii", "Misc Symbols | Katakana | Dingbats", "kawaii-cute-symbols",
     "Kawaii Cute Symbols: Copy & Paste ♡ ⊹ Aesthetic Characters", 20, 12,
     "IMPROVE. kawaii emoticons 5.4k; add kaomoji-decor + pastel sections (cute-symbols demand folds here)."),
    ("coquette symbols", "aesthetic copy paste", "decorate-profile", "medium", 1900,
     "high", "coquette", "Dingbats | Misc Symbols bow/heart", "coquette-symbols",
     "Coquette Symbols: Copy & Paste ⊹ ♡ ๋ Soft Aesthetic", 19, 11,
     "IMPROVE. coquette aesthetic; add bow + ribbon + lace sections."),
    ("cottagecore symbols", "aesthetic copy paste", "decorate-profile", "weak", 880,
     "medium", "cottagecore", "Dingbats flowers | Misc Symbols", "cottagecore-symbols",
     "Cottagecore Symbols: Copy & Paste ❀ ✿ ☘ Nature Aesthetic", 18, 10,
     "IMPROVE. cottagecore niche; add mushroom + botanical sections."),
    ("goth grunge symbols", "aesthetic copy paste", "decorate-profile", "weak", 2400,
     "medium", "goth", "Misc Symbols (skull/cross) | Dingbats", "goth-grunge-symbols",
     "Goth & Grunge Symbols: Copy & Paste ☠ † ✟ Dark Aesthetic", 18, 11,
     "IMPROVE. skull 2.4k goth intent; add cross + spider + chain sections."),
    ("y2k symbols", "aesthetic copy paste", "decorate-profile", "weak", 1300, "medium",
     "y2k", "Dingbats | Misc Symbols | Geometric", "y2k-symbols",
     "Y2K Symbols: Copy & Paste ✰ ⋆ ☆ 2000s Aesthetic", 18, 10,
     "IMPROVE. y2k aesthetic; add butterfly + star + sparkle sections."),
    ("accent marks diacritics", "copy paste", "find-and-copy", "medium", 2900, "medium",
     "accents", "Combining Diacritical Marks (U+0300..U+036F)", "accent-marks-diacritics",
     "Accent Marks & Diacritics: Copy & Paste á é ñ ü Accented Letters", 17, 12,
     "IMPROVE. accents/diacritics; add per-language + combining sections."),
    ("achievement symbols", "copy paste", "find-and-copy", "weak", 880, "low", "award",
     "Misc Symbols (trophy/medal) | Dingbats stars", "achievement-symbols",
     "Achievement Symbols: Copy & Paste 🏆 ★ Trophy & Medal Characters", 16, 9,
     "IMPROVE. award/trophy; refresh medal + ranking sections."),
    ("awareness ribbons", "copy paste", "find-and-copy", "weak", 1900, "medium",
     "ribbons", "Misc Symbols and Pictographs (U+1F397) | emoji ribbon",
     "awareness-ribbons", "Awareness Ribbon Symbols: Copy & Paste 🎗 Cause Ribbons",
     17, 9, "IMPROVE. awareness ribbon; add per-cause colour sections."),
    ("body language emojis", "copy paste", "find-and-copy", "weak", 1300, "low", "emoji",
     "Misc Symbols and Pictographs (people/gestures)", "body-language-emojis",
     "Body Language Emojis: Copy & Paste 🙆 🤷 Gesture Characters", 16, 10,
     "IMPROVE. gesture emojis; add shrug + facepalm sections (shrug 18k folds via kaomoji too)."),
    ("face emojis", "copy paste", "find-and-copy", "medium", 3600, "medium", "emoji",
     "Emoticons (U+1F600..U+1F64F)", "face-emojis",
     "Face Emojis: Copy & Paste 😀 😢 😡 Emoji Faces", 17, 12,
     "IMPROVE. emoticon faces 3.6k; add mood-grouped sections."),
    ("food drink emojis", "copy paste", "find-and-copy", "weak", 1300, "low", "emoji",
     "Food and Drink (U+1F32D..U+1F37F)", "food-drink-emojis",
     "Food & Drink Emojis: Copy & Paste 🍕 🍔 🍰 Tasty Characters", 16, 12,
     "IMPROVE. food emoji; refresh meal + dessert sections."),
    ("sports emojis", "copy paste", "find-and-copy", "weak", 1000, "low", "emoji",
     "Misc Symbols and Pictographs (sports)", "sports-emojis",
     "Sports Emojis: Copy & Paste ⚽ 🏀 🎾 Game Characters", 16, 11,
     "IMPROVE. sports emoji; add team + equipment sections."),
    ("transport symbols", "copy paste", "find-and-copy", "weak", 1300, "low", "transport",
     "Transport and Map Symbols (U+1F680..U+1F6FF)", "transport-symbols",
     "Transport Symbols: Copy & Paste 🚗 ✈ 🚆 Vehicle Characters", 16, 11,
     "IMPROVE. transport; add land/air/sea sections."),
    ("traffic road sign symbols", "copy paste", "find-and-copy", "weak", 3600, "low",
     "signs", "Misc Symbols and Arrows | Transport and Map", "traffic-road-sign-symbols",
     "Traffic & Road Sign Symbols: Copy & Paste 🚸 ⛔ Warning Signs", 16, 11,
     "IMPROVE. warning/road 3.6k; add prohibition + caution sections (hazard CREATE stays separate)."),
    ("people profession emojis", "copy paste", "find-and-copy", "weak", 880, "low",
     "emoji", "Supplemental Symbols and Pictographs (people)", "people-profession-emojis",
     "People & Profession Emojis: Copy & Paste 👩‍⚕️ 👨‍🍳 Job Characters", 15, 11,
     "IMPROVE. profession emoji; add ZWJ-profession sections."),
    ("roblox symbols", "username copy paste", "decorate-username", "medium", 1300, "high",
     "platform", "Misc Symbols | Dingbats | Braille", "roblox-symbols",
     "Roblox Symbols: Copy & Paste Username & Display Name Characters", 18, 10,
     "IMPROVE. roblox name demand; add display-name + tag sections."),
    ("x twitter symbols", "copy paste", "decorate-profile", "weak", 1300, "medium",
     "platform", "Misc Symbols | Dingbats", "x-twitter-symbols",
     "X (Twitter) Symbols: Copy & Paste Bio & Tweet Characters", 17, 10,
     "IMPROVE. X/Twitter bio; refresh tweet-decor section."),
    ("slash backslash symbols", "copy paste", "find-and-copy", "weak", 1300, "low",
     "punct", "Basic Latin (U+002F,U+005C) | Misc Math slashes", "slash-backslash-symbols",
     "Slash & Backslash Symbols: Copy & Paste / \\ ⁄ ∖ Characters", 16, 9,
     "IMPROVE. slash/backslash; add division-slash + fraction-slash sections."),
    ("whisper subliminal symbols", "copy paste", "decorate-profile", "weak", 480, "low",
     "spiritual", "Misc Symbols | Dingbats", "whisper-subliminal-symbols",
     "Whisper & Subliminal Symbols: Copy & Paste ✧ Manifestation Characters", 16, 9,
     "IMPROVE. subliminal/manifest niche; refresh affirmation-divider section."),
    ("linkedin symbol library", "copy paste", "decorate-profile", "medium", 1900, "high",
     "platform", "Misc Symbols | Dingbats | bold Unicode", "linkedin-symbol-library",
     "LinkedIn Symbols: Copy & Paste Bullet & Bold Post Characters", 18, 11,
     "IMPROVE. LinkedIn post styling; add bullet + checkmark + arrow sections."),
    ("emoji flags", "copy paste", "find-and-copy", "weak", 2400, "medium", "flags",
     "Regional Indicator Symbols (U+1F1E6..U+1F1FF)", "emoji-flags",
     "Flag Emojis: Copy & Paste 🇺🇸 🇬🇧 Country Flag Characters", 16, 12,
     "IMPROVE. country flags; refresh continent-grouped sections."),
]
for (p, m, it, ev, vol, conf, cat, blocks, slug, title, copy_s, depth_s, note) in improve2:
    dedupe = (f"fold-into:{slug}" if note.startswith("FOLD")
              else f"improve-existing:{slug}")
    ded_s = 5 if note.startswith("FOLD") else 8
    add(p, m, it, ev, vol, conf, cat, blocks, "single", slug, title,
        "improve_existing", dedupe, copy_s, ded_s, depth_s, note, batch="batch-07")

# E2. Additional long-tail CREATE / SKIP / REVIEW candidates from keyword tail.
add("dice domino symbols", "copy paste", "find-and-copy", "weak", 1000, "medium",
    "games", "Dice (U+2680..U+2685) | Domino Tiles (U+1F030..) | Mahjong (U+1F000..)",
    "single", "dice-domino-symbols",
    "Dice, Domino & Mahjong Symbols: Copy & Paste ⚀ ⚁ 🀄 Game Tiles",
    "create", "unique", 19, 18, 12,
    "CREATE. dice/domino/mahjong blocks fully uncovered; set-oriented game tiles.",
    batch="batch-07")
add("box drawing symbols", "copy paste", "find-and-copy", "medium", 2900, "medium",
    "boxes", "Box Drawing (U+2500..U+257F) | Block Elements (U+2580..U+259F)",
    "single", "box-drawing-symbols",
    "Box Drawing & Block Symbols: Copy & Paste ─ │ ┌ █ ▓ ASCII Boxes",
    "create", "unique", 18, 18, 13,
    "CREATE. box-drawing/block-elements uncovered; ASCII-frame + shading demand.",
    batch="batch-07")
add("braille pattern symbols", "copy paste", "find-and-copy", "weak", 1900, "medium",
    "braille", "Braille Patterns (U+2800..U+28FF)", "single", "braille-pattern-symbols",
    "Braille Pattern Symbols: Copy & Paste ⠿ ⣿ Blank & Dot Characters",
    "create", "unique", 17, 18, 13,
    "CREATE. full Braille block uncovered; blank-char + spacer demand on Discord/IG.",
    batch="batch-07")

review2 = [
    ("cat emoticon", "copy paste", "find-and-copy", "medium", 5400, "medium", "kaomoji",
     "Katakana / kaomoji building blocks", "text-faces-kaomoji", "Cat Emoticon Copy Paste",
     "REVIEW. cat emoticon 5.4k; fold into text-faces-kaomoji vs animal-emojis - pick home."),
    ("table flip emoticon", "copy paste", "find-and-copy", "medium", 1900, "medium",
     "kaomoji", "kaomoji building blocks", "text-faces-kaomoji",
     "Table Flip Emoticon (╯°□°)╯︵ ┻━┻ Copy Paste",
     "REVIEW. table-flip 1.9k; fold into text-faces-kaomoji as a section."),
    ("idk emoticon", "copy paste", "find-and-copy", "medium", 3600, "medium", "kaomoji",
     "kaomoji building blocks", "text-faces-kaomoji", "IDK Emoticon ¯\\_(ツ)_/¯ Copy Paste",
     "REVIEW. idk 3.6k overlaps shrug; consolidate under text-faces-kaomoji."),
    ("glitter emoticon", "copy paste", "decorate-profile", "weak", 1600, "low", "sparkle",
     "Dingbats sparkle | Misc Symbols", "sparkle-symbols", "Glitter Emoticon ✧ Copy Paste",
     "REVIEW. glitter 1.6k; fold into sparkle-symbols decorate section."),
    ("bunny emoticon", "copy paste", "decorate-profile", "weak", 1900, "low", "kaomoji",
     "kaomoji (´• ω •`) | Misc Symbols", "text-faces-kaomoji", "Bunny Emoticon Copy Paste",
     "REVIEW. bunny 1.9k kaomoji; fold into text-faces-kaomoji cute section."),
    ("cross emoticon", "copy paste", "find-and-copy", "medium", 1900, "medium", "cross",
     "Dingbats (U+271D) | Misc Symbols", "cross-x-symbols", "Cross Emoticon ✝ Copy Paste",
     "REVIEW. cross emoticon 1.9k; fold into cross-x-symbols (dup of improve row?)."),
    ("bow emoticon", "copy paste", "decorate-profile", "weak", 1900, "low", "bows",
     "Dingbats | emoji bow", "bow-ribbon-symbols", "Bow Emoticon Copy Paste",
     "REVIEW. bow emoticon 1.9k; fold into bow-ribbon-symbols (overlaps improve row)."),
    ("japanese emoticons", "copy paste", "find-and-copy", "strong", 9900, "high",
     "kaomoji", "Katakana + CJK + combining", "text-faces-kaomoji",
     "Japanese Emoticons (Kaomoji) Copy Paste",
     "REVIEW. japanese emoticons 9.9k = core of text-faces-kaomoji; confirm improve vs the kaomoji improve row (dedupe)."),
    ("uwu emoticon", "copy paste", "decorate-profile", "weak", 480, "low", "kaomoji",
     "kaomoji UwU", "text-faces-kaomoji", "UwU Emoticon Copy Paste",
     "REVIEW. uwu niche; fold into text-faces-kaomoji."),
    ("heart emoticon", "copy paste", "find-and-copy", "strong", 22200, "high", "hearts",
     "Misc Symbols (U+2665,U+2764) | Dingbats", "heart-symbols", "Heart Emoticon Copy Paste",
     "REVIEW. heart emoticon 22k overlaps heart-symbols and emoji; confirm single owner."),
    ("flower emoticon", "copy paste", "decorate-profile", "weak", 2400, "low", "flowers",
     "Dingbats florets | Misc Symbols", "flower-symbols", "Flower Emoticon ❀ Copy Paste",
     "REVIEW. flower emoticon 2.4k; fold into flower-symbols (overlaps improve row)."),
    ("sparkle emoticon", "copy paste", "decorate-profile", "medium", 1900, "medium",
     "sparkle", "Dingbats (U+2728) | Misc Symbols", "sparkle-symbols",
     "Sparkle Emoticon ✨ Copy Paste",
     "REVIEW. sparkle emoticon 1.9k; fold into sparkle-symbols (overlaps improve row)."),
]
for (p, m, it, ev, vol, conf, cat, blocks, slug, title, note) in review2:
    add(p, m, it, ev, vol, conf, cat, blocks, "single", slug, title, "needs_review",
        "review-overlap", 12, 4, 8, note, batch="batch-07")

skips2 = [
    ("emoticones", "", "find-and-copy", "weak", 1900, "low", "generic", "n/a",
     "text-faces-kaomoji", "Emoticones",
     "SKIP. Spanish spelling variant of emoticons; canonical page already exists."),
    ("emoticon emoticon", "", "find-and-copy", "none", 18100, "low", "generic", "n/a",
     "text-faces-kaomoji", "Emoticon",
     "SKIP. Junk/duplicated head term; no distinct page."),
    ("emoticon and", "", "find-and-copy", "none", 33100, "low", "generic", "n/a", "n/a",
     "Emoticon And", "SKIP. Truncated broad-match artifact, no real intent."),
    ("green heart emoticon meaning", "", "meaning", "weak", 1900, "low", "meaning", "n/a",
     "emoji-meanings-guide", "Green Heart Emoticon Meaning",
     "SKIP. Meaning intent -> emoji-meanings-guide."),
    ("black heart emoticon", "", "find-and-copy", "weak", 1600, "low", "hearts", "n/a",
     "heart-symbols", "Black Heart Emoticon",
     "SKIP. Colour-variant of heart-symbols; fold, no standalone page."),
    ("meaning of red heart emoticon", "", "meaning", "weak", 2400, "low", "meaning",
     "n/a", "emoji-meanings-guide", "Red Heart Emoticon Meaning",
     "SKIP. Meaning intent -> emoji-meanings-guide."),
    ("among us emoticon", "copy and paste", "find-and-copy", "weak", 30, "low", "fandom",
     "n/a", "n/a", "Among Us Emoticon",
     "SKIP. Fad/fandom, negligible volume, mostly image emotes."),
    ("weed emoticons", "copy and paste", "find-and-copy", "weak", 20, "low", "misc",
     "n/a", "n/a", "Weed Emoticons", "SKIP. Low vol + content-tone risk; out of scope."),
]
for (p, m, it, ev, vol, conf, cat, blocks, slug, title, note) in skips2:
    add(p, m, it, ev, vol, conf, cat, blocks, "single", slug, title, "skip",
        "skip", 5, 0, 3, note, batch="batch-07")


# --- Emit: keep the existing seed rows (main's batch-01-pilot) verbatim. ----
# The seed is whatever is currently committed at data/library_opportunities.csv
# (after the merge with main this is OPP-0001..0005). We re-emit those rows
# untouched, deriving the `action` column from their dedupe_status, then append
# the expanded candidate rows.
SEED = OUT.read_text(encoding="utf-8").splitlines()
seed_reader = list(csv.DictReader(SEED))


def action_from_dedupe(dedupe, approval):
    d = (dedupe or "").strip().lower()
    if d.startswith("improve-existing") or d.startswith("fold-into"):
        return "improve_existing"
    if d == "skip":
        return "skip"
    if d in ("review-overlap", "needs-review"):
        return "needs_review"
    # 'unique' / 'clear' or an approved standalone -> a create row.
    return "create"


seed_actions = {}
with OUT.open("w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=FIELDS)
    w.writeheader()
    for r in seed_reader:
        r = dict(r)
        act = action_from_dedupe(r.get("dedupe_status"), r.get("approval_status"))
        seed_actions[r["id"]] = act
        r["action"] = r.get("action") or act
        r["page_type"] = r.get("page_type") or "library"
        w.writerow({k: r.get(k, "") for k in FIELDS})
    for r in rows:
        r.setdefault("page_type", "library")
        w.writerow(r)

print(f"Wrote {len(seed_reader) + len(rows)} opportunity rows "
      f"({len(seed_reader)} seed + {len(rows)} new) to {OUT.relative_to(REPO)}")
# Quick action tally
from collections import Counter
tally = Counter([seed_actions[r['id']] for r in seed_reader] +
                [r['action'] for r in rows])
print("Action tally:", dict(tally))
