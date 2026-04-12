#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate 8 new library pages for UltraTextGen."""

import os

BASE = "/home/runner/work/ultratextgen/ultratextgen/library"

def flag_row(char, label):
    safe_char = char.replace('"', '&quot;').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return f'''    <div class="flag-row">
      <button class="flag-emoji symbol-tile" data-symbol="{char}" aria-label="Copy {label}">{char}</button>
      <span class="flag-label">{label}</span>
    </div>'''

def section(id_, label, h2, p_text, chars):
    rows = "\n".join(flag_row(c, n) for c, n in chars)
    return f'''<section class="mood-explainers" id="{id_}">
  <span class="article-section-label">{label}</span>
  <h2>{h2}</h2>
  <p>{p_text}</p>
  <div class="flag-rows">
{rows}
  </div>
</section>

<div class="section-divider"></div>'''

def page_template(title, meta_desc, canonical, breadcrumb3, hero_h1, hero_tagline, intro_p,
                  sections_html, cta_p, related, date_published="2026-04-12"):
    slug = canonical.rstrip('/').split('/')[-1]
    related_cards = "\n".join(
        f'''    <a href="{href}" class="compare-card variant-muted" style="text-decoration:none;color:inherit">
      <h4>{rtitle}</h4>
      <p>{rdesc}</p>
    </a>''' for href, rtitle, rdesc in related
    )
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>{title}</title>
<meta name="description" content="{meta_desc}">

<link rel="canonical" href="{canonical}">
<meta property="og:image" content="https://ultratextgen.com/logo.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{meta_desc}">
<meta name="twitter:image" content="https://ultratextgen.com/logo.png">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta_desc}">
<meta property="og:type" content="article">
<meta property="og:url" content="{canonical}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Space+Mono&display=swap" rel="stylesheet">

<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/symbol-explorer.css">

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{title}",
  "description": "{meta_desc}",
  "author": {{
    "@type": "Organization",
    "name": "UltraTextGen",
    "url": "https://ultratextgen.com/"
  }},
  "publisher": {{
    "@type": "Organization",
    "name": "UltraTextGen",
    "url": "https://ultratextgen.com/"
  }},
  "mainEntityOfPage": "{canonical}",
  "datePublished": "{date_published}",
  "dateModified": "{date_published}"
}}
</script>

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {{
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://ultratextgen.com/"
    }},
    {{
      "@type": "ListItem",
      "position": 2,
      "name": "Library",
      "item": "https://ultratextgen.com/library/"
    }},
    {{
      "@type": "ListItem",
      "position": 3,
      "name": "{breadcrumb3}",
      "item": "{canonical}"
    }}
  ]
}}
</script>
</head>
<body>
<script src="/header.js"></script>

<!-- HERO -->
<section class="hero">
  <div class="hero-inner">
    <h1 class="hero-headline">{hero_h1}</h1>
    <p class="hero-tagline">{hero_tagline}</p>
  </div>
</section>

<!-- INTRO -->
<section class="editorial-section">
  <div class="editorial-block">
    <p>{intro_p}</p>
  </div>
</section>

<div class="section-divider"></div>

{sections_html}
<!-- CTA -->
<div class="cta-card">
  <h3>Transform text with Unicode fonts</h3>
  <p>{cta_p}</p>
  <a href="https://ultratextgen.com/" class="cta-btn">Open UltraTextGen →</a>
</div>

<!-- RELATED -->
<section class="editorial-section">
  <span class="article-section-label">Related Resources</span>
  <div class="compare-grid">
{related_cards}
  </div>
</section>

<!-- FOOTER -->
<footer class="footer">
  <div class="footer-inner">
  </div>
</footer>

<!-- TOAST -->
<div class="symbol-toast" id="symbolToast" aria-live="polite"></div>

<script src="/symbol-explorer.js"></script>
<script src="/footer.js"></script>
</body>
</html>'''


# ──────────────────────────────────────────────────────────────────────────
# PAGE 1: Dash & Hyphen Symbols
# ──────────────────────────────────────────────────────────────────────────

p1_sections = "\n\n".join([
    section("hyphens", "Hyphens", "Hyphen Characters",
            "The hyphen family — used for word division and compound words.",
            [("-", "Hyphen-Minus"), ("\u2010", "Hyphen"), ("\u2011", "Non-Breaking Hyphen"),
             ("\u2027", "Hyphenation Point"), ("\ufe63", "Small Hyphen-Minus")]),

    section("en-em-dashes", "En &amp; Em Dashes", "En and Em Dashes",
            "En dashes are used for ranges (2013\u20132015), em dashes for interruption \u2014 like this \u2014 and parenthetical asides.",
            [("\u2012", "Figure Dash"), ("\u2013", "En Dash"), ("\u2014", "Em Dash"),
             ("\u2015", "Horizontal Bar"), ("\ufe58", "Small Em Dash"), ("\uff0d", "Fullwidth Hyphen-Minus")]),

    section("minus-variants", "Minus Variants", "Minus Sign Variants",
            "Distinct minus characters for mathematical, superscript, and fullwidth contexts.",
            [("\u2212", "Minus Sign"), ("\u207b", "Superscript Minus"), ("\u208b", "Subscript Minus"),
             ("\u2796", "Heavy Minus Sign"), ("\u02d7", "Modifier Letter Minus Sign")]),

    section("decorative-dashes", "Decorative Dashes", "Decorative Dash Characters",
            "Box-drawing and decorative horizontal line characters useful for dividers and formatting.",
            [("\u2500", "Light Horizontal"), ("\u2501", "Heavy Horizontal"), ("\u2504", "Light Triple Dash"),
             ("\u2505", "Heavy Triple Dash"), ("\u2508", "Light Quadruple Dash"), ("\u2509", "Heavy Quadruple Dash"),
             ("\u254c", "Light Double Dash"), ("\u254d", "Heavy Double Dash"), ("\u3030", "Wavy Dash"),
             ("\ufe4d", "Dashed Low Line")]),

    section("vertical-wavy", "Vertical &amp; Wavy", "Vertical &amp; Wavy Lines",
            "Vertical bars and wavy characters related to dashes and separators.",
            [("|", "Vertical Line"), ("\u2502", "Light Vertical"), ("\u2503", "Heavy Vertical"),
             ("~", "Tilde"), ("\u223c", "Tilde Operator"), ("\uff5e", "Fullwidth Tilde")]),
])

p1_usage = '''<section class="editorial-section">
  <span class="article-section-label">Usage Guide</span>
  <h2>When to Use Which Dash</h2>
  <div class="editorial-block">
    <p><strong>Hyphen (-)</strong>: Joins compound words (well-known, mother-in-law) and splits words at line breaks. Use the plain hyphen-minus (U+002F) in most situations.</p>
    <p><strong>En dash (&ndash;)</strong>: Indicates ranges (pages 10&ndash;20, 2019&ndash;2023) and connects related concepts. Slightly wider than a hyphen.</p>
    <p><strong>Em dash (&mdash;)</strong>: Marks interruptions, parenthetical remarks&mdash;like this&mdash;and strong breaks in thought. Wider than an en dash. No spaces needed around it in American style.</p>
    <p><strong>Minus sign (&minus;)</strong>: The mathematical minus at U+2212. Visually distinct from a hyphen &mdash; it aligns with the plus sign and is the correct character in equations.</p>
    <p><strong>Horizontal bar (&horbar;)</strong>: Used in dialogue formatting in some languages (French, Greek) to indicate speech attribution.</p>
  </div>
</section>

<div class="section-divider"></div>

'''

p1_html = p1_sections + "\n\n" + p1_usage

p1 = page_template(
    title="Dash &amp; Hyphen Symbols: Copy &amp; Paste All Dash Characters",
    meta_desc="Browse and copy every dash and hyphen character — hyphens, en dashes, em dashes, minus signs, and decorative dashes. Click any symbol to copy it instantly.",
    canonical="https://ultratextgen.com/library/dash-hyphen-symbols/",
    breadcrumb3="Dash &amp; Hyphen Symbols",
    hero_h1="Dash &amp; Hyphen Symbols",
    hero_tagline="A complete reference of dash and hyphen characters — from the humble hyphen-minus to the long em dash. Click any symbol to copy it instantly.",
    intro_p="This library covers every dash and hyphen character in Unicode, organized by type and purpose. Whether you need an en dash for number ranges, an em dash for emphasis, or a minus sign for math, you\u2019ll find it here.",
    sections_html=p1_html,
    cta_p="Use UltraTextGen to convert plain text into bold, italic, cursive, and 100+ other Unicode font styles \u2014 free and instant.",
    related=[
        ("/library/line-divider-symbols/", "Line Divider Symbols", "Horizontal dividers and separators for structured content and posts."),
        ("/library/bullet-point-symbols/", "Bullet Point Symbols", "Unicode bullets and markers for lists and structured content."),
        ("/library/bracket-symbols/", "Bracket Symbols", "All types of brackets, parentheses, and enclosure marks."),
        ("/library/math-symbols/", "Math Symbols", "Mathematical operators, Greek letters, and scientific notation."),
    ]
)

with open(f"{BASE}/dash-hyphen-symbols/index.html", "w", encoding="utf-8") as f:
    f.write(p1)
print("Page 1 done: dash-hyphen-symbols")

# ──────────────────────────────────────────────────────────────────────────
# PAGE 2: Slash & Backslash Symbols
# ──────────────────────────────────────────────────────────────────────────

p2_sections = "\n\n".join([
    section("forward-slashes", "Forward Slashes", "Forward Slash Variants",
            "The solidus (/) and its typographic and mathematical variants.",
            [("/", "Solidus (Forward Slash)"), ("\u2044", "Fraction Slash"), ("\u2215", "Division Slash"),
             ("\u29f8", "Big Solidus"), ("\uff0f", "Fullwidth Solidus"), ("\u2571", "Box Drawing Diagonal"),
             ("\u27cb", "Mathematical Rising Diagonal")]),

    section("backslashes", "Backslashes", "Backslash Variants",
            "The reverse solidus and its Unicode variants.",
            [("\\", "Reverse Solidus (Backslash)"), ("\u2216", "Set Minus"), ("\u29f5", "Reverse Solidus Operator"),
             ("\uff3c", "Fullwidth Reverse Solidus"), ("\u2572", "Box Drawing Reverse Diagonal"),
             ("\u27cd", "Mathematical Falling Diagonal"), ("\ufe68", "Small Reverse Solidus")]),

    section("division-math-slashes", "Division &amp; Math", "Division &amp; Math Slashes",
            "Mathematical symbols that use slash notation or division concepts.",
            [("\u00f7", "Division Sign"), ("\u2236", "Ratio"), ("\u2237", "Proportion"),
             ("\u29f6", "Solidus With Overbar"), ("\u2afd", "Double Solidus Operator"),
             ("\u29f7", "Reverse Solidus With Stroke"), ("\u29f9", "Big Reverse Solidus")]),

    section("decorative-slashes", "Decorative Slashes", "Decorative &amp; Special Slashes",
            "Special slash characters for formatting, notation, and decorative use.",
            [("\u2573", "Light Diagonal Cross"), ("\u2225", "Parallel To"), ("\u2af4", "Triple Vertical Bar"),
             ("\u2afe", "White Vertical Bar"), ("|", "Vertical Line"), ("\u2016", "Double Vertical Line")]),
])

p2_usage = '''<section class="editorial-section">
  <span class="article-section-label">Usage Guide</span>
  <h2>Slash vs Backslash vs Division Slash</h2>
  <div class="editorial-block">
    <p><strong>Forward slash (/)</strong>: Used in URLs, file paths (Unix/Mac), fractions (3/4), and dates (12/25). The standard solidus U+002F.</p>
    <p><strong>Fraction slash (&frasl;)</strong>: U+2044 &mdash; typographically distinct from the solidus, used to build proper fractions like &frac34; when combined with numerators/denominators.</p>
    <p><strong>Division slash (&divide;)</strong>: U+2215 &mdash; the mathematical division operator, visually similar to / but semantically distinct for math contexts.</p>
    <p><strong>Backslash (\\)</strong>: Used in Windows file paths and as an escape character in programming. The reverse solidus U+005C. Not interchangeable with forward slash.</p>
    <p><strong>URL note</strong>: URLs always use forward slash (/). Using a backslash in a URL is incorrect, though some browsers auto-correct it.</p>
  </div>
</section>

<div class="section-divider"></div>

'''

p2_html = p2_sections + "\n\n" + p2_usage

p2 = page_template(
    title="Slash &amp; Backslash Symbols: Copy &amp; Paste All Slash Characters",
    meta_desc="Browse and copy every slash and backslash character — forward slashes, backslash variants, fraction slashes, and division symbols. Click any to copy.",
    canonical="https://ultratextgen.com/library/slash-backslash-symbols/",
    breadcrumb3="Slash &amp; Backslash Symbols",
    hero_h1="Slash &amp; Backslash Symbols",
    hero_tagline="Every slash and backslash Unicode character — from the standard solidus to fraction slashes, division symbols, and decorative variants. Click any symbol to copy it instantly.",
    intro_p="This library covers forward slashes, backslashes, and related separator characters in Unicode. The humble slash has more variants than most people realize \u2014 from math-specific division slashes to typographic fraction slashes and fullwidth forms.",
    sections_html=p2_html,
    cta_p="Use UltraTextGen to convert plain text into bold, italic, cursive, and 100+ other Unicode font styles \u2014 free and instant.",
    related=[
        ("/library/math-symbols/", "Math Symbols", "Mathematical operators and symbols for equations and scientific notation."),
        ("/library/bracket-symbols/", "Bracket Symbols", "All bracket, parenthesis, and enclosure characters."),
        ("/library/line-divider-symbols/", "Line Divider Symbols", "Horizontal dividers and separators for posts and formatting."),
        ("/library/special-characters/", "Special Characters", "Unique Unicode symbols with individual meaning and standalone appeal."),
    ]
)

with open(f"{BASE}/slash-backslash-symbols/index.html", "w", encoding="utf-8") as f:
    f.write(p2)
print("Page 2 done: slash-backslash-symbols")

# ──────────────────────────────────────────────────────────────────────────
# PAGE 3: Accent Marks & Diacritics
# ──────────────────────────────────────────────────────────────────────────

combining_above = [
    ("\u0300", "Combining Grave"), ("\u0301", "Combining Acute"), ("\u0302", "Combining Circumflex"),
    ("\u0303", "Combining Tilde"), ("\u0304", "Combining Macron"), ("\u0305", "Combining Overline"),
    ("\u0306", "Combining Breve"), ("\u0307", "Combining Dot Above"), ("\u0308", "Combining Diaeresis"),
    ("\u0309", "Combining Hook Above"), ("\u030a", "Combining Ring Above"), ("\u030b", "Combining Double Acute"),
    ("\u030c", "Combining Caron"), ("\u030d", "Combining Vertical Line Above"), ("\u030e", "Combining Double Vertical Line"),
    ("\u030f", "Combining Double Grave"), ("\u0310", "Combining Candrabindu"), ("\u0311", "Combining Inverted Breve"),
    ("\u0312", "Combining Turned Comma"), ("\u0313", "Combining Comma Above"), ("\u0314", "Combining Reversed Comma"),
]

combining_below = [
    ("\u0316", "Combining Grave Below"), ("\u0317", "Combining Acute Below"), ("\u0318", "Combining Left Tack Below"),
    ("\u0319", "Combining Right Tack Below"), ("\u031a", "Combining Left Angle Above"), ("\u031b", "Combining Horn"),
    ("\u031c", "Combining Left Half Ring"), ("\u031d", "Combining Up Tack Below"), ("\u031e", "Combining Down Tack Below"),
    ("\u031f", "Combining Plus Below"), ("\u0320", "Combining Minus Below"), ("\u0321", "Combining I Below"),
    ("\u0322", "Combining U Below"), ("\u0323", "Combining Dot Below"), ("\u0324", "Combining Diaeresis Below"),
    ("\u0325", "Combining Ring Below"), ("\u0326", "Combining Comma Below"), ("\u0327", "Combining Cedilla"),
    ("\u0328", "Combining Ogonek"), ("\u0329", "Combining Vertical Line Below"), ("\u032a", "Combining Bridge Below"),
]

hooks_horns = [
    ("\u032b", "Combining Inverted Double Arch"), ("\u032c", "Combining Caron Below"), ("\u032d", "Combining Circumflex Below"),
    ("\u032e", "Combining Breve Below"), ("\u032f", "Combining Inverted Breve Below"), ("\u0330", "Combining Tilde Below"),
    ("\u0331", "Combining Macron Below"), ("\u0332", "Combining Low Line"), ("\u0333", "Combining Double Low Line"),
    ("\u0334", "Combining Tilde Overlay"), ("\u0335", "Combining Short Stroke"), ("\u0336", "Combining Long Stroke"),
    ("\u0337", "Combining Short Solidus"), ("\u0338", "Combining Long Solidus"), ("\u0339", "Combining Right Half Ring"),
    ("\u033a", "Combining Inverted Bridge"), ("\u033b", "Combining Square Below"), ("\u033c", "Combining Seagull Below"),
    ("\u033d", "Combining X Above"), ("\u033e", "Combining Vertical Tilde"), ("\u033f", "Combining Double Overline"),
]

spacing_forms = [
    ("`", "Grave Accent"), ("\u00b4", "Acute Accent"), ("^", "Circumflex Accent"), ("~", "Tilde"),
    ("\u00af", "Macron"), ("\u02d8", "Breve"), ("\u02d9", "Dot Above"), ("\u00a8", "Diaeresis"),
    ("\u02da", "Ring Above"), ("\u02dd", "Double Acute Accent"), ("\u02c7", "Caron"),
    ("\u00b8", "Cedilla"), ("\u02db", "Ogonek"), ("\u02dc", "Small Tilde"), ("\u02c6", "Modifier Letter Circumflex"),
]

p3_sections = "\n\n".join([
    section("accents-above", "Accents Above", "Combining Marks Above",
            "Combining diacritical marks that appear above a base character. Add these after any letter to accent it.",
            combining_above),
    section("marks-below", "Marks Below", "Combining Marks Below",
            "Combining diacritical marks that appear below a base character.",
            combining_below),
    section("hooks-horns", "Hooks &amp; Horns", "Hooks, Horns &amp; Special Marks",
            "Combining characters for specialized phonetic and linguistic notation.",
            hooks_horns),
    section("spacing-forms", "Spacing Forms", "Standalone Spacing Forms",
            "These spacing accent characters have their own visual presence and can be typed alone or used decoratively. Unlike combining marks, they don\u2019t attach to a preceding letter.",
            spacing_forms),
])

p3_usage = '''<section class="editorial-section">
  <span class="article-section-label">Usage Guide</span>
  <h2>How to Use Combining Diacritics</h2>
  <div class="editorial-block">
    <p>Combining diacritical marks (U+0300&ndash;U+036F) attach to the character that precedes them in the text stream. To create an accented letter, type the base letter first, then the combining mark. For example: <strong>a + &#x0301; = &aacute;</strong>, <strong>n + &#x0303; = &ntilde;</strong>, <strong>u + &#x0308; = &uuml;</strong>.</p>
    <p>On most systems, combining marks display correctly in plain text, but some fonts may render them poorly. The spacing forms (Section 4) are standalone characters that can be used decoratively without attaching to a base letter.</p>
    <p><strong>Quick copies:</strong> For common accented letters, it is faster to copy the pre-composed character (&eacute;, &agrave;, &uuml;, &ntilde;, &ccedil;) from the character map or keyboard shortcut, rather than combining a base letter with a combining mark.</p>
  </div>
</section>

<div class="section-divider"></div>

'''

p3_html = p3_sections + "\n\n" + p3_usage

p3 = page_template(
    title="Accent Marks &amp; Diacritics: Copy &amp; Paste Combining Characters",
    meta_desc="Browse and copy accent marks and diacritical characters — combining marks, spacing forms, and accented letter quick-copies. Click any symbol to copy it instantly.",
    canonical="https://ultratextgen.com/library/accent-marks-diacritics/",
    breadcrumb3="Accent Marks &amp; Diacritics",
    hero_h1="Accent Marks &amp; Diacritics",
    hero_tagline="Every combining diacritic and accent mark character in Unicode — from acute and grave accents to tildes, cedillas, and beyond. Click any symbol to copy it instantly.",
    intro_p="Diacritical marks are characters that combine with a preceding letter to modify its sound or meaning. They form the basis of accented letters like \u00e9, \u00f1, \u00fc, and \u00e7. This library includes both combining forms (which attach to the previous character) and standalone spacing forms.",
    sections_html=p3_html,
    cta_p="Use UltraTextGen to convert plain text into bold, italic, cursive, and 100+ other Unicode font styles \u2014 free and instant.",
    related=[
        ("/library/special-characters/", "Special Characters", "Unique Unicode symbols with individual meaning and standalone appeal."),
        ("/library/math-symbols/", "Math Symbols", "Mathematical operators including Greek letters with diacritics."),
        ("/library/aesthetic-symbols/", "Aesthetic Symbols", "Decorative Unicode symbols including combining marks for aesthetic bios."),
        ("/library/star-symbols/", "Star Symbol Collection", "Stars, asterisks, and star variants in Unicode."),
    ]
)

with open(f"{BASE}/accent-marks-diacritics/index.html", "w", encoding="utf-8") as f:
    f.write(p3)
print("Page 3 done: accent-marks-diacritics")

# ──────────────────────────────────────────────────────────────────────────
# PAGE 4: Cross & X Symbols
# ──────────────────────────────────────────────────────────────────────────

p4_sections = "\n\n".join([
    section("math-x", "Multiplication &amp; Math X", "Multiplication &amp; Math X",
            "Cross-shaped symbols used in mathematical and scientific notation.",
            [("\u00d7", "Multiplication Sign"), ("\u2715", "Multiplication X"), ("\u2716", "Heavy Multiplication X"),
             ("\u2a2f", "Vector or Cross Product"), ("\u22c7", "Division Times"), ("\u2a30", "Multiplication Sign With Dot Above")]),

    section("ballot-x", "Ballot &amp; Mark X", "Ballot &amp; Mark X Characters",
            "X marks used in forms, checklists, and UI \u2014 indicating cancellation, deletion, or \u2018no\u2019.",
            [("\u2717", "Ballot X"), ("\u2718", "Heavy Ballot X"), ("\u274c", "Cross Mark Emoji"),
             ("\u274e", "Cross Mark Button Emoji"), ("\u2613", "Saltire"), ("\U00010102", "Aegean Check Mark")]),

    section("religious-crosses", "Religious Crosses", "Religious Cross Characters",
            "Cross symbols used in religious and spiritual contexts. For full faith-organized collections, see the Religious &amp; Spiritual Symbols library page.",
            [("\u271d", "Latin Cross"), ("\u271e", "Shadowed White Latin Cross"), ("\u271f", "Outlined Latin Cross"),
             ("\u2720", "Maltese Cross"), ("\u2626", "Orthodox Cross"), ("\u2627", "Chi Rho"), ("\u2628", "Cross of Lorraine")]),

    section("decorative-crosses", "Decorative &amp; Heavy Crosses", "Decorative &amp; Heavy Cross Characters",
            "Bold, decorative, and stylized cross shapes for emphasis and visual design.",
            [("\u2719", "Outlined Greek Cross"), ("\u271a", "Heavy Greek Cross"), ("\u271b", "Open Centre Cross"),
             ("\u271c", "Heavy Open Centre Cross"), ("\u2721", "Star of David"), ("\u2722", "Four Teardrop-Spoked Asterisk"),
             ("\u2723", "Four Balloon-Spoked Asterisk"), ("\u2724", "Heavy Four Balloon-Spoked Asterisk"), ("\u2725", "Four Club-Spoked Asterisk")]),

    section("daggers", "Daggers", "Dagger Characters",
            "Typographic dagger symbols used for footnotes, death records, and special emphasis.",
            [("\u2020", "Dagger"), ("\u2021", "Double Dagger"), ("\u2e35", "Turned Dagger"),
             ("\u2e38", "Raised Interpolation Marker"), ("\U0001f5e1", "Dagger Emoji"), ("\u2694", "Crossed Swords")]),

    section("special-cross", "Special", "Special Cross Characters",
            "Other notable cross-related characters from various Unicode blocks.",
            [("\u2573", "Box Drawing Diagonal Cross"), ("\u2a09", "N-Ary Times Operator"),
             ("\u29bb", "Circle With Superimposed X"), ("\u2297", "Circled Times")]),
])

p4 = page_template(
    title="Cross &amp; X Symbols: Copy &amp; Paste All Cross Characters",
    meta_desc="Browse and copy every cross and X symbol — multiplication signs, ballot marks, religious crosses, decorative dagger symbols, and more. Click any symbol to copy it instantly.",
    canonical="https://ultratextgen.com/library/cross-x-symbols/",
    breadcrumb3="Cross &amp; X Symbols",
    hero_h1="Cross &amp; X Symbols",
    hero_tagline="Every cross shape in Unicode \u2014 multiplication marks, ballot X marks, religious crosses, decorative heavy crosses, and dagger symbols. Click any symbol to copy it instantly.",
    intro_p="This library covers all cross-shaped symbols across Unicode blocks \u2014 from the mathematical multiplication sign to Latin crosses, dagger characters, and decorative cross marks. Note: this page focuses on cross shapes and forms; for faith-specific context, see the Religious &amp; Spiritual Symbols library page.",
    sections_html=p4_sections + "\n",
    cta_p="Use UltraTextGen to convert plain text into bold, italic, cursive, and 100+ other Unicode font styles \u2014 free and instant.",
    related=[
        ("/library/religious-symbols/", "Religious &amp; Spiritual Symbols", "Faith symbols from every major world religion."),
        ("/library/checkmark-symbols/", "Checkmark Symbols", "Check marks, X marks, and completion symbols for lists and posts."),
        ("/library/star-symbols/", "Star Symbol Collection", "Stars, asterisks, and star variants in Unicode."),
        ("/library/geometric-symbols/", "Geometric Symbols", "Circles, squares, triangles, and geometric shapes."),
    ]
)

with open(f"{BASE}/cross-x-symbols/index.html", "w", encoding="utf-8") as f:
    f.write(p4)
print("Page 4 done: cross-x-symbols")

# ──────────────────────────────────────────────────────────────────────────
# PAGE 5: Norse / Viking Runes
# ──────────────────────────────────────────────────────────────────────────

elder_futhark = [
    ("\u16a0", "Fehu (Wealth)"), ("\u16a2", "Uruz (Strength)"), ("\u16a6", "Thurisaz (Giant)"),
    ("\u16a8", "Ansuz (God)"), ("\u16b1", "Raidho (Ride)"), ("\u16b2", "Kenaz (Torch)"),
    ("\u16b7", "Gebo (Gift)"), ("\u16b9", "Wunjo (Joy)"), ("\u16ba", "Hagalaz (Hail)"),
    ("\u16be", "Nauthiz (Need)"), ("\u16c1", "Isa (Ice)"), ("\u16c3", "Jera (Year)"),
    ("\u16c7", "Eihwaz (Yew)"), ("\u16c8", "Perthro (Dice Cup)"), ("\u16c9", "Algiz (Elk)"),
    ("\u16ca", "Sowilo (Sun)"), ("\u16cf", "Tiwaz (God Tyr)"), ("\u16d2", "Berkano (Birch)"),
    ("\u16d6", "Ehwaz (Horse)"), ("\u16d7", "Mannaz (Man)"), ("\u16da", "Laguz (Water)"),
    ("\u16dc", "Ingwaz (Fertility)"), ("\u16de", "Dagaz (Day)"), ("\u16df", "Othala (Ancestral Land)"),
]

younger_futhark = [
    ("\u16a0", "Fe"), ("\u16a2", "Ur"), ("\u16a6", "Thurs"), ("\u16ac", "Oss"),
    ("\u16b1", "Reid"), ("\u16b4", "Kaun"), ("\u16bc", "Hagall"), ("\u16be", "Naud"),
    ("\u16c1", "Is"), ("\u16c5", "Ar"), ("\u16cb", "Sol"), ("\u16cf", "Tyr"),
    ("\u16d2", "Bjarkan"), ("\u16d8", "Madr"), ("\u16da", "Logr"), ("\u16e6", "Yr"),
]

anglo_saxon = [
    ("\u16aa", "Ac (Oak)"), ("\u16ab", "Aesc"), ("\u16a3", "Yr (Anglo-Saxon)"),
    ("\u16e0", "Ear"), ("\u16e1", "Ior"), ("\u16e2", "Cweorth"), ("\u16e3", "Calc"),
    ("\u16e4", "Cealc"), ("\u16e5", "Stan"), ("\u16a9", "Os (Anglo-Saxon)"), ("\u16b8", "Gar"), ("\u16d2", "Beorc"),
]

medieval = [
    ("\u16e7", "Short-Twig Yr"), ("\u16e8", "Icelandic-Yr"), ("\u16e9", "Q"), ("\u16ea", "X"),
    ("\u16eb", "Runic Single Punctuation"), ("\u16ec", "Runic Multiple Punctuation"), ("\u16ed", "Runic Cross Punctuation"),
    ("\u16ee", "Arlaug Symbol"), ("\u16ef", "Tvimadur Symbol"), ("\u16f0", "Belgthor Symbol"),
]

runic_punct = [
    ("\u16eb", "Single Punctuation"), ("\u16ec", "Multiple Punctuation"), ("\u16ed", "Cross Punctuation"),
    ("\u16f1", "Runic Letter K"), ("\u16f2", "Runic Letter Sh"), ("\u16f3", "Runic Letter Oo"),
    ("\u16f4", "Runic Letter Franks Casket Os"), ("\u16f5", "Runic Letter Franks Casket Is"),
    ("\u16f6", "Runic Letter Franks Casket Eh"), ("\u16f7", "Runic Letter Franks Casket Ac"),
    ("\u16f8", "Runic Letter Franks Casket Aesc"),
]

p5_sections = "\n\n".join([
    section("elder-futhark", "Elder Futhark", "Elder Futhark (24 Runes)",
            "The oldest form of the runic alphabet, used from roughly 150\u2013800 CE. The 24 runes of Elder Futhark are listed below with their traditional name and primary meaning.",
            elder_futhark),
    section("younger-futhark", "Younger Futhark", "Younger Futhark",
            "The simplified 16-rune alphabet that replaced Elder Futhark in Viking Age Scandinavia (800\u20131200 CE).",
            younger_futhark),
    section("anglo-saxon", "Anglo-Saxon Futhorc", "Anglo-Saxon Futhorc",
            "The runic alphabet used in Anglo-Saxon England, expanded from Elder Futhark to 28\u201333 runes.",
            anglo_saxon),
    section("medieval-specialized", "Medieval &amp; Specialized", "Medieval &amp; Specialized Runes",
            "Additional runic characters used in medieval manuscripts and specialized inscriptions.",
            medieval),
    section("runic-punctuation", "Punctuation", "Runic Punctuation &amp; Numerals",
            "Runic punctuation marks and the later addition of Runic numerals (U+16F1\u2013U+16F8).",
            runic_punct),
])

p5 = page_template(
    title="Norse &amp; Viking Runes: Copy &amp; Paste All Runic Characters",
    meta_desc="Browse and copy all runic characters — Elder Futhark, Younger Futhark, Anglo-Saxon Futhorc, and medieval runes. Click any rune to copy it instantly.",
    canonical="https://ultratextgen.com/library/norse-viking-runes/",
    breadcrumb3="Norse / Viking Runes",
    hero_h1="Norse &amp; Viking Runes",
    hero_tagline="The complete Unicode runic character set \u2014 all 89 characters from the Runic block (U+16A0\u2013U+16FF), organized by alphabet system. Click any rune to copy it instantly.",
    intro_p="The Runic Unicode block (U+16A0\u2013U+16FF) contains characters from multiple historical runic writing systems used across Scandinavia, Britain, and other Germanic regions from roughly the 2nd century CE onwards. This library organizes the complete block by alphabet system.",
    sections_html=p5_sections + "\n",
    cta_p="Use UltraTextGen to convert plain text into bold, italic, cursive, and 100+ other Unicode font styles \u2014 free and instant.",
    related=[
        ("/library/religious-symbols/", "Religious &amp; Spiritual Symbols", "Faith symbols from every major world religion."),
        ("/library/witchy-occult-symbols/", "Witchy &amp; Occult Symbols", "Occult and esoteric symbols including pentagrams, moon phases, and alchemical signs."),
        ("/library/special-characters/", "Special Characters", "Unique Unicode symbols with individual meaning and standalone appeal."),
        ("/library/aesthetic-symbols/", "Aesthetic Symbols", "Decorative Unicode symbols for bios and captions."),
    ]
)

with open(f"{BASE}/norse-viking-runes/index.html", "w", encoding="utf-8") as f:
    f.write(p5)
print("Page 5 done: norse-viking-runes")

# ──────────────────────────────────────────────────────────────────────────
# PAGE 6: Egyptian Hieroglyphs (generated programmatically)
# ──────────────────────────────────────────────────────────────────────────

HIERO_SECTIONS = [
    ("gardiner-a-b", "Man &amp; Occupations (A\u2013B)", "Gardiner A\u2013B: Man and Occupations",
     "Signs depicting men and women in various occupations and postures.", 0x13000, 0x13050),
    ("gardiner-c-d", "Gods &amp; Body Parts (C\u2013D)", "Gardiner C\u2013D: Gods and Body Parts",
     "Anthropomorphic deities and human body part signs.", 0x13050, 0x130A0),
    ("gardiner-e-f", "Mammals (E\u2013F)", "Gardiner E\u2013F: Mammals",
     "Signs depicting mammals and parts of mammals.", 0x130A0, 0x130F0),
    ("gardiner-g-h", "Birds (G\u2013H)", "Gardiner G\u2013H: Birds",
     "Signs depicting birds and parts of birds.", 0x130F0, 0x13140),
    ("gardiner-i-l", "Reptiles &amp; Fish (I\u2013L)", "Gardiner I\u2013L: Reptiles and Fish",
     "Signs depicting reptiles, amphibians, fish, and insects.", 0x13140, 0x13190),
    ("gardiner-m-n", "Plants &amp; Earth (M\u2013N)", "Gardiner M\u2013N: Plants and Earth",
     "Signs depicting plants, sky, earth, and water.", 0x13190, 0x131E0),
    ("gardiner-o-q", "Buildings &amp; Vessels (O\u2013Q)", "Gardiner O\u2013Q: Buildings and Vessels",
     "Signs depicting buildings, furniture, and vessels.", 0x131E0, 0x13230),
    ("gardiner-r-s", "Bread &amp; Furniture (R\u2013S)", "Gardiner R\u2013S: Bread and Furniture",
     "Signs depicting loaves of bread, vessels, and furniture.", 0x13230, 0x13280),
    ("gardiner-t-u", "Vessels &amp; Weapons (T\u2013U)", "Gardiner T\u2013U: Vessels and Weapons",
     "Signs depicting vessels and weapons.", 0x13280, 0x132D0),
    ("gardiner-v-w", "Rope &amp; Baskets (V\u2013W)", "Gardiner V\u2013W: Rope and Baskets",
     "Signs depicting rope, baskets, and woven goods.", 0x132D0, 0x13320),
    ("gardiner-x-y", "Vessels &amp; Bread (X\u2013Y)", "Gardiner X\u2013Y: Loaves and Vessels",
     "Signs depicting additional loaves and vessels.", 0x13320, 0x13370),
    ("gardiner-z-aa", "Strokes &amp; Geometric (Z\u2013Aa)", "Gardiner Z\u2013Aa: Strokes and Geometric",
     "Geometric and stroke signs used as determinatives.", 0x13370, 0x133C0),
    ("gardiner-numerals", "Numerals &amp; Signs", "Numerals &amp; Late Signs",
     "Numeral signs and later additions to the hieroglyphic repertoire.", 0x133C0, 0x13430),
]

def hiero_section_html(sec_id, label, h2, p_text, start, end):
    rows = []
    for cp in range(start, end):
        char = chr(cp)
        hex_label = f"{cp:05X}"
        rows.append(flag_row(char, f"U+{hex_label}"))
    rows_html = "\n".join(rows)
    return f'''<section class="mood-explainers" id="{sec_id}">
  <span class="article-section-label">{label}</span>
  <h2>{h2}</h2>
  <p>{p_text}</p>
  <div class="flag-rows">
{rows_html}
  </div>
</section>

<div class="section-divider"></div>'''

hiero_sections_html = "\n\n".join(
    hiero_section_html(sid, lbl, h2, p, s, e)
    for sid, lbl, h2, p, s, e in HIERO_SECTIONS
)

p6 = page_template(
    title="Egyptian Hieroglyphs: Copy &amp; Paste Unicode Hieroglyph Characters",
    meta_desc="Browse and copy all 1,072 Unicode Egyptian Hieroglyph characters (U+13000\u2013U+1342F), organized by Gardiner category. Click any symbol to copy it instantly.",
    canonical="https://ultratextgen.com/library/egyptian-hieroglyphs/",
    breadcrumb3="Egyptian Hieroglyphs",
    hero_h1="Egyptian Hieroglyphs",
    hero_tagline="All 1,072 Unicode Egyptian Hieroglyph characters from U+13000 to U+1342F \u2014 organized by Gardiner sign list category. Click any hieroglyph to copy it instantly.",
    intro_p="The Egyptian Hieroglyphs Unicode block (U+13000\u2013U+1342F) contains 1,072 hieroglyphic characters from the complete Gardiner Sign List. These characters require a hieroglyph-capable font such as Noto Sans Egyptian Hieroglyphs to render correctly \u2014 without such a font, your browser will display boxes. The characters are fully standard Unicode and can be copied and pasted into any Unicode-aware application.",
    sections_html=hiero_sections_html + "\n",
    cta_p="Use UltraTextGen to convert plain text into bold, italic, cursive, and 100+ other Unicode font styles \u2014 free and instant.",
    related=[
        ("/library/special-characters/", "Special Characters", "Unique Unicode symbols with individual meaning and standalone appeal."),
        ("/library/norse-viking-runes/", "Norse &amp; Viking Runes", "The complete Unicode runic character set organized by alphabet system."),
        ("/library/religious-symbols/", "Religious &amp; Spiritual Symbols", "Faith symbols from every major world religion."),
        ("/library/aesthetic-symbols/", "Aesthetic Symbols", "Decorative Unicode symbols for bios and captions."),
    ]
)

with open(f"{BASE}/egyptian-hieroglyphs/index.html", "w", encoding="utf-8") as f:
    f.write(p6)
print("Page 6 done: egyptian-hieroglyphs")

# ──────────────────────────────────────────────────────────────────────────
# PAGE 7: Witchy / Occult Symbols
# ──────────────────────────────────────────────────────────────────────────

alchemical = [(chr(cp), f"Alchemical Symbol {cp - 0x1F700 + 1}") for cp in range(0x1F700, 0x1F740)]

p7_sections = "\n\n".join([
    section("pentagrams-stars", "Pentagrams &amp; Stars", "Pentagrams &amp; Five-Pointed Stars",
            "Star and pentagram shapes associated with esoteric and occult traditions.",
            [("\u2605", "Black Star"), ("\u2606", "White Star"), ("\u26b9", "Sextile"),
             ("\u2721", "Star of David"), ("\u269c", "Fleur-de-Lis"), ("\u26e4", "Pentagram"),
             ("\u26e5", "Right-Pointing Pentagram"), ("\u26e6", "Left-Pointing Pentagram"),
             ("\u26e7", "Inverted Pentagram"), ("\u2734", "Eight Pointed Star"),
             ("\u272a", "Circled White Star"), ("\u2736", "Six Pointed Star")]),

    section("moon-phases", "Moon Phases", "Moon Phase Symbols",
            "Unicode moon phase symbols representing the lunar cycle.",
            [("\U0001f311", "New Moon"), ("\U0001f312", "Waxing Crescent Moon"), ("\U0001f313", "First Quarter Moon"),
             ("\U0001f314", "Waxing Gibbous Moon"), ("\U0001f315", "Full Moon"), ("\U0001f316", "Waning Gibbous Moon"),
             ("\U0001f317", "Last Quarter Moon"), ("\U0001f318", "Waning Crescent Moon"),
             ("\u263d", "First Quarter Moon Sign"), ("\u263e", "Last Quarter Moon Sign"),
             ("\u25cf", "Black Circle (Dark Moon)"), ("\u25cb", "White Circle (Light Moon)")]),

    section("planetary-zodiac", "Planetary &amp; Zodiac-Adjacent", "Planetary &amp; Astrological Symbols",
            "Classic planetary symbols and astrological glyphs with occult associations.",
            [("\u2609", "Sun"), ("\u263d", "Moon"), ("\u263f", "Mercury"), ("\u2640", "Venus"),
             ("\u2641", "Earth"), ("\u2642", "Mars"), ("\u2643", "Jupiter"), ("\u2644", "Saturn"),
             ("\u2645", "Uranus"), ("\u2646", "Neptune"), ("\u2647", "Pluto"),
             ("\u26b8", "Black Moon Lilith"), ("\u26b3", "Ceres"), ("\u26b4", "Pallas"),
             ("\u26b5", "Juno"), ("\u26b6", "Vesta")]),

    section("alchemical", "Alchemical", "Alchemical Symbols (U+1F700\u2013U+1F73F)",
            "The Unicode Alchemical Symbols block, containing signs for elements, processes, and substances used in historical alchemy.",
            alchemical),

    section("esoteric", "Other Esoteric", "Other Esoteric Symbols",
            "Additional symbols associated with magical and esoteric traditions.",
            [("\u2625", "Ankh"), ("\u262f", "Yin Yang"), ("\u2618", "Shamrock"), ("\u26b7", "Chiron"),
             ("\u26b0", "Coffin"), ("\u26b1", "Funeral Urn"), ("\u2697", "Alembic"), ("\u2764", "Heart"),
             ("\u269b", "Atom Symbol"), ("\u26a1", "Lightning Bolt"), ("\u2672", "Recycling"),
             ("\u263c", "White Sun with Rays"), ("\u2626", "Orthodox Cross"), ("\u2622", "Radioactive"), ("\u2623", "Biohazard")]),
])

p7 = page_template(
    title="Witchy &amp; Occult Symbols: Copy &amp; Paste All Occult Characters",
    meta_desc="Browse and copy witchy and occult symbols — pentagrams, moon phases, planetary signs, alchemical symbols, and other esoteric characters. Click any to copy.",
    canonical="https://ultratextgen.com/library/witchy-occult-symbols/",
    breadcrumb3="Witchy &amp; Occult Symbols",
    hero_h1="Witchy &amp; Occult Symbols",
    hero_tagline="A curated collection of pentagrams, moon phases, planetary symbols, alchemical signs, and other esoteric Unicode characters. Click any symbol to copy it instantly.",
    intro_p="This library collects Unicode symbols associated with witchcraft, occultism, alchemy, and esoteric traditions. All are standard Unicode characters \u2014 usable in text, bios, and creative writing. The alchemical symbols section covers the dedicated Alchemical Symbols Unicode block (U+1F700\u2013U+1F73F).",
    sections_html=p7_sections + "\n",
    cta_p="Use UltraTextGen to convert plain text into bold, italic, cursive, and 100+ other Unicode font styles \u2014 free and instant.",
    related=[
        ("/library/religious-symbols/", "Religious &amp; Spiritual Symbols", "Faith symbols from every major world religion."),
        ("/library/zodiac-symbols/", "Zodiac Symbols", "All 12 Western zodiac signs plus planets and Chinese zodiac."),
        ("/library/star-symbols/", "Star Symbol Collection", "Stars, asterisks, and star variants in Unicode."),
        ("/library/norse-viking-runes/", "Norse &amp; Viking Runes", "The complete Unicode runic character set organized by alphabet system."),
    ]
)

with open(f"{BASE}/witchy-occult-symbols/index.html", "w", encoding="utf-8") as f:
    f.write(p7)
print("Page 7 done: witchy-occult-symbols")

# ──────────────────────────────────────────────────────────────────────────
# PAGE 8: Traffic & Road Sign Symbols
# ──────────────────────────────────────────────────────────────────────────

p8_sections = "\n\n".join([
    section("traffic-signals", "Traffic Signals", "Traffic Signal Symbols",
            "Traffic light and signal-related symbols.",
            [("\U0001f6a6", "Vertical Traffic Light"), ("\U0001f6a5", "Horizontal Traffic Light"),
             ("\U0001f7e2", "Green Circle"), ("\U0001f7e1", "Yellow Circle"), ("\U0001f534", "Red Circle"),
             ("\u26a0", "Warning Sign"), ("\u26d4", "No Entry")]),

    section("prohibition-signs", "Prohibition Signs", "Prohibition &amp; Restriction Signs",
            "Unicode symbols indicating prohibitions, restrictions, and no-entry situations.",
            [("\U0001f6ab", "Prohibited"), ("\U0001f6b3", "No Bicycles"), ("\U0001f6ad", "No Smoking"),
             ("\U0001f6af", "No Littering"), ("\U0001f6b1", "Non-Potable Water"), ("\U0001f6b7", "No Pedestrians")]),

    section("pedestrian-vehicle", "Pedestrian &amp; Vehicle", "Pedestrian &amp; Vehicle Symbols",
            "Symbols representing pedestrians, cyclists, and vehicles on roads.",
            [("\U0001f6b6", "Person Walking"), ("\U0001f3c3", "Person Running"), ("\U0001f6b4", "Person Biking"),
             ("\U0001f6b5", "Person Mountain Biking"), ("\U0001f697", "Automobile"), ("\U0001f695", "Taxi"),
             ("\U0001f68c", "Bus"), ("\U0001f69a", "Delivery Truck"), ("\U0001f691", "Ambulance"), ("\U0001f692", "Fire Engine")]),

    section("facilities-services", "Facilities &amp; Services", "Road Facility &amp; Service Symbols",
            "Symbols for parking, fuel, and road facilities.",
            [("\U0001f17f", "Parking Button"), ("\u26fd", "Fuel Pump"), ("\U0001f6a7", "Construction Sign"),
             ("\U0001f6a8", "Police Car Light"), ("\U0001f6a9", "Flag in Hole"), ("\U0001f6aa", "Door"), ("\U0001f3c1", "Chequered Flag")]),

    section("warnings", "Warnings", "Warning &amp; Hazard Symbols",
            "Warning triangles, hazard signs, and caution symbols.",
            [("\u26a0", "Warning"), ("\u2620", "Skull and Crossbones"), ("\u2622", "Radioactive"),
             ("\u2623", "Biohazard"), ("\U0001f4a3", "Bomb"), ("\u26a1", "High Voltage"), ("\U0001f525", "Fire")]),
])

p8 = page_template(
    title="Traffic &amp; Road Sign Symbols: Copy &amp; Paste Traffic Sign Emojis",
    meta_desc="Browse and copy traffic and road sign symbols — traffic lights, prohibition signs, pedestrian icons, and road facility emojis. Click any symbol to copy it instantly.",
    canonical="https://ultratextgen.com/library/traffic-road-sign-symbols/",
    breadcrumb3="Traffic &amp; Road Sign Symbols",
    hero_h1="Traffic &amp; Road Sign Symbols",
    hero_tagline="Unicode symbols and emojis related to traffic, road signs, and transportation infrastructure. Click any symbol to copy it instantly.",
    intro_p="Actual road signs are images, not Unicode characters. However, Unicode and emoji include a collection of traffic-related symbols that convey similar meaning \u2014 traffic lights, prohibition circles, pedestrian symbols, and more. This library collects the best available traffic and road-sign-adjacent characters.",
    sections_html=p8_sections + "\n",
    cta_p="Use UltraTextGen to convert plain text into bold, italic, cursive, and 100+ other Unicode font styles \u2014 free and instant.",
    related=[
        ("/library/transport-symbols/", "Transport &amp; Map Symbols", "Road, rail, air, and water transport icons plus map symbols."),
        ("/library/arrow-symbols/", "Arrow Symbols", "Directional arrows for formatting and navigation."),
        ("/library/geometric-symbols/", "Geometric Symbols", "Circles, squares, and triangles including sign shapes."),
        ("/library/emoji-flags/", "Emoji Flag Explorer", "All 195 country flag emojis organized by region."),
    ]
)

with open(f"{BASE}/traffic-road-sign-symbols/index.html", "w", encoding="utf-8") as f:
    f.write(p8)
print("Page 8 done: traffic-road-sign-symbols")

print("\nAll 8 pages generated successfully!")
