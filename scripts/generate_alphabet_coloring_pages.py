#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_alphabet_coloring_pages.py

Render the "alphabet coloring pages" hub-and-spoke cluster under /printables/
from a single data spec (data/printables_alphabet_coloring.json):

  hub    /printables/alphabet-coloring-pages/            (browse-everything)
  spoke  /printables/alphabet-coloring-pages/letter-a/   ... letter-z/  (×26)

Every page is a static, self-contained document following the repo's printables
conventions: GTM + ad snippets, canonical/OG/Twitter meta, BreadcrumbList +
FAQPage JSON-LD, shared header/footer injectors, and the shared
printablesEngine.js driven by a per-page window.UTG_PRINTABLE config.

Client-side only: the colorable letter outlines are rendered by the engine as
native SVG/Canvas at runtime — no server-side image rendering, no bundled font
binaries (Baloo 2 loads from Google Fonts like the other printables pages).

This mirrors the intent of scripts/generate_library_page_from_spec.py but is
wired to /printables/ + printablesEngine.js rather than /library/ +
symbol-explorer.js, so it is a sibling generator, not a reuse of that script.

Usage
-----
  python3 scripts/generate_alphabet_coloring_pages.py            # write all pages
  python3 scripts/generate_alphabet_coloring_pages.py --dry-run  # validate only
  python3 scripts/generate_alphabet_coloring_pages.py --force    # (default) overwrite

Pages are always regenerated from the spec; there is no hand-editing step.
"""

import argparse
import html
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from lib.printables_parity import assert_no_regression  # noqa: E402
REPO = SCRIPT_DIR.parent
SPEC_PATH = REPO / "data" / "printables_alphabet_coloring.json"
PRINTABLES_DIR = REPO / "printables"

SITE = "https://ultratextgen.com"
ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


class SpecError(Exception):
    """Raised when the data spec fails validation."""


# --------------------------------------------------------------------------
# Shipped-page parity: two things a generated page MUST carry
# --------------------------------------------------------------------------
# These generators are full regenerators, so anything they omit is silently
# DELETED from every page they rewrite. Both omissions below were live: running
# these four scripts unmodified against the tree changed 90 files, and the whole
# diff was site-wide repairs the generators had never learned about.
#
#   1. The Funding Choices (ad-blocking recovery) tag. Absent here, a
#      regeneration strips it and scripts/check-funding-choices.js - a GATING
#      check - fails. Read from the same single source of truth the injector
#      uses so the two can never emit different snippets.
#
#   2. The FAQ has to sit inside <main>. These templates emitted it inside
#      <footer class="footer">, which is exactly the defect
#      scripts/fix-footer-nested-content.py repaired across 727 pages -
#      readability-style extractors discard footer content as boilerplate. All
#      210 live printables pages currently have it in <main>; regenerating would
#      have put 88 of them back.
#
# After running any of these generators, run `npm run build:static-footer` to
# bake the footer markup back in. The generator leaves the footer shell empty on
# purpose: build-static-footer.js is its owner, and a second copy here would
# drift from footer.js the first time footer.js changed.
FUNDING_TAG_PATH = SCRIPT_DIR / "data" / "funding-choices-tag.html"


def funding_choices_tag():
    """The Funding Choices tag, from the source scripts/inject-funding-choices-tag.js shares."""
    try:
        return FUNDING_TAG_PATH.read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise SystemExit(
            f"[error] cannot read the Funding Choices tag at {FUNDING_TAG_PATH}: {exc}. "
            "Generated pages would fail scripts/check-funding-choices.js."
        )


def esc(text):
    """HTML-escape text content."""
    return html.escape(str(text), quote=False)


def esc_attr(text):
    """HTML-escape for use inside a double-quoted attribute."""
    return html.escape(str(text), quote=True)


# --------------------------------------------------------------------------
# Shared fragments
# --------------------------------------------------------------------------
GTM_HEAD = """  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-P55HXK8Q');</script>
  <!-- End Google Tag Manager -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8242324164413945"
       crossorigin="anonymous"></script>"""

GTM_NOSCRIPT = """  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P55HXK8Q"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->"""

FAQ_CHEVRON = (
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" '
    'stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" '
    'stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'
)

FAQ_TOGGLE_SCRIPT = """  <!-- FAQ toggle -->
  <script>
    document.querySelectorAll('.faq-question').forEach(function(btn) {
      btn.addEventListener('click', function() { this.closest('.faq-item').classList.toggle('open'); });
    });
  </script>"""


def font_head(cfg):
    return (
        '  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;family='
        + cfg["font_query"]
        + '&amp;display=swap" rel="stylesheet">\n'
        '  <link rel="stylesheet" href="/style.css">'
    )


def ldjson(obj):
    return (
        '<script type="application/ld+json">\n'
        + json.dumps(obj, indent=2, ensure_ascii=False)
        + "\n</script>"
    )


def breadcrumb_ld(items):
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i + 1,
                "name": name,
                "item": url,
            }
            for i, (name, url) in enumerate(items)
        ],
    }


def faqpage_ld(faqs):
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a_text},
            }
            for (q, _a_html, a_text) in faqs
        ],
    }


def faq_accordion(faqs):
    """Visible <details>-style accordion matching the existing printables pages."""
    items = []
    for (q, a_html, _a_text) in faqs:
        items.append(
            '      <div class="faq-item">\n'
            '        <button class="faq-question" type="button">\n'
            f"          {esc(q)}\n"
            f"          {FAQ_CHEVRON}\n"
            "        </button>\n"
            f'        <div class="faq-answer">\n          {a_html}\n        </div>\n'
            "      </div>"
        )
    return "\n\n".join(items)


def config_script(cfg, extra_lines=None):
    lines = [
        f'      key: "{cfg["slug"]}",',
        '      render: "outline",',
        f'      noun: "{cfg["noun"]}",',
        f'      pngPrefix: "{cfg["png_prefix"]}",',
        f'      font: "{cfg["font_css"]}",',
        f'      strokeWidth: {cfg["stroke_width"]},',
    ]
    if extra_lines:
        lines.extend(extra_lines)
    body = "\n".join(lines)
    return (
        "  <script>\n"
        "    window.UTG_PRINTABLE = {\n"
        f"{body}\n"
        "    };\n"
        "  </script>"
    )


ENGINE_SCRIPTS = (
    '  <script src="/styles.js" defer></script>\n'
    '  <script src="/renderer.js" defer></script>\n'
    '  <script src="/js/printables/printablesEngine.js" defer></script>'
)


# --------------------------------------------------------------------------
# Hub page
# --------------------------------------------------------------------------
def render_hub(spec):
    cfg = spec["cluster"]
    letters = spec["letters"]
    slug = cfg["slug"]
    canonical = f"{SITE}/printables/{slug}/"

    # Real, crawlable links to all 26 spokes.
    link_items = []
    for e in letters:
        L = e["letter"]
        link_items.append(
            f'        <a class="pt-az-link" href="/printables/{slug}/letter-{L.lower()}/">\n'
            f'          <span class="pt-az-link-letter">{esc(L)}{esc(L.lower())}</span>\n'
            f'          <span class="pt-az-link-word">Letter {esc(L)} · {esc(e["word"])}</span>\n'
            "        </a>"
        )
    az_links = "\n".join(link_items)

    faqs = [
        (
            "Are these alphabet coloring pages free to print?",
            "Yes, every alphabet coloring page here is completely free, with no sign-up, "
            "watermark, or limit. Pick a letter for a big single-line outline, then use "
            "<strong>Print this letter</strong> to send it to your printer or "
            "<strong>Download PNG</strong> to save a high-resolution image.",
            "Yes. Every alphabet coloring page here is completely free, with no sign-up, "
            "watermark, or limit. Pick a letter for a big single-line outline, then use "
            "Print this letter to send it to your printer or Download PNG to save a "
            "high-resolution image.",
        ),
        (
            "How do I print the whole ABC alphabet at once?",
            "Scroll to the <strong>Printable alphabet</strong> section and press "
            "<strong>Print the alphabet</strong> to send all 26 letter outlines to your "
            "printer on one sheet — handy for a classroom set or a rainy-day activity.",
            "Scroll to the Printable alphabet section and press Print the alphabet to send "
            "all 26 letter outlines to your printer on one sheet — handy for a classroom "
            "set or a rainy-day activity.",
        ),
        (
            "Can I get a coloring page for just one letter?",
            "Yes. Every letter A–Z has its own page with a big outline, an example word, "
            "and Print and Download buttons. Open any letter from the "
            "<strong>A–Z letters</strong> list, or tap it in the picker to preview it here first.",
            "Yes. Every letter A to Z has its own page with a big outline, an example word, "
            "and Print and Download buttons. Open any letter from the A–Z letters list, or "
            "tap it in the picker to preview it here first.",
        ),
        (
            "How are these different from the bubble and block letter pages?",
            "These coloring pages use thin, clean single-line outlines that are easy to color "
            "inside. <a href=\"/printables/bubble-letters/\">Bubble letters</a> are rounded and "
            "puffy, and <a href=\"/printables/block-letters/\">block letters</a> are bold "
            "stencils to cut out. All three are free printable outlines — pick the look you want.",
            "These coloring pages use thin, clean single-line outlines that are easy to color "
            "inside. Bubble letters are rounded and puffy, and block letters are bold stencils "
            "to cut out. All three are free printable outlines — pick the look you want.",
        ),
    ]

    collection_ld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": html.unescape("Alphabet Coloring Pages A–Z"),
        "url": canonical,
        "description": html.unescape(cfg["hub_meta"]),
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": i + 1,
                    "name": f"Letter {e['letter']} Coloring Page",
                    "url": f"{SITE}/printables/{slug}/letter-{e['letter'].lower()}/",
                }
                for i, e in enumerate(letters)
            ],
        },
    }
    breadcrumb = breadcrumb_ld(
        [
            ("Home", f"{SITE}/"),
            ("Printables", f"{SITE}/printables/"),
            ("Alphabet Coloring Pages", canonical),
        ]
    )

    ld = "\n\n".join(
        [ldjson(breadcrumb), ldjson(collection_ld), ldjson(faqpage_ld(faqs))]
    )

    config = config_script(cfg)

    return f"""<!DOCTYPE html><html lang="en"><head>
{funding_choices_tag()}
{GTM_HEAD}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(cfg["hub_title"])}</title>
  <meta name="description" content="{esc_attr(cfg["hub_meta"])}">
  <link rel="canonical" href="{esc_attr(canonical)}">
  <meta property="og:title" content="Alphabet Coloring Pages A–Z | UltraTextGen">
  <meta property="og:description" content="{esc_attr(cfg["hub_og_desc"])}">
  <meta property="og:url" content="{esc_attr(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{esc_attr(cfg["og_image"])}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Alphabet Coloring Pages A–Z | UltraTextGen">
  <meta name="twitter:description" content="{esc_attr(cfg["hub_og_desc"])}">
  <meta name="twitter:image" content="{esc_attr(cfg["og_image"])}">
{font_head(cfg)}

{ld}
</head>
<body>
  <script>try{{if(localStorage.getItem("darkMode")==="true")document.body.classList.add("dark-mode")}}catch(e){{}}</script>
{GTM_NOSCRIPT}
  <div id="shared-header"></div>
<script src="/header.js" defer></script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  <a href="/">Home</a>
  <span class="breadcrumb-separator">›</span>
  <a href="/printables/">Printables</a>
  <span class="breadcrumb-separator">›</span>
  <span class="breadcrumb-current">Alphabet Coloring Pages</span>
</nav>

  <section class="hero">
    <div class="hero-inner" style="max-width:820px;">
      <h1 class="hero-headline">{esc(cfg["hub_h1"])}</h1>
      <p class="hero-tagline">
        {esc(cfg["hub_tagline"])}
      </p>
    </div>
  </section>

  <main class="container">

    <!-- Picker + selected-letter detail -->
    <section class="bubble-az" aria-labelledby="ptPickHeading">
      <h2 class="bubble-az-heading" id="ptPickHeading">Pick a letter to color</h2>
      <p class="bubble-az-intro">Tap any letter A–Z to see its big coloring outline, print it, or download a PNG. Want the letter's own page with an example word? Open it from the A–Z list below.</p>
      <div class="bubble-strip" id="pt-strip" role="tablist" aria-label="Choose a letter to color"></div>
      <div class="bubble-letter-panel" id="pt-panel" aria-live="polite"></div>
    </section>

    <!-- Full printable alphabet -->
    <section class="bubble-alphabet" aria-labelledby="ptAlphaHeading">
      <div class="bubble-alphabet-head">
        <h2 id="ptAlphaHeading">Printable alphabet</h2>
        <button class="bubble-btn bubble-btn-primary" type="button" id="pt-alphabet-print">Print the alphabet</button>
      </div>
      <p class="bubble-az-intro">The full A–Z alphabet as clean coloring outlines. Print the whole sheet to color, or tap any letter to open its print and download options.</p>
      <div class="bubble-alphabet-grid" id="pt-alphabet-grid"></div>
    </section>

    <!-- Real, crawlable per-letter links -->
    <section class="editorial-section" aria-labelledby="ptListHeading">
      <h2 id="ptListHeading">A–Z letter coloring pages</h2>
      <p class="bubble-az-intro">Every letter has its own coloring page with a big outline and an example word — great when you searched for one exact letter.</p>
      <div class="pt-az-links">
{az_links}
      </div>
    </section>

    <!-- Editorial -->
    <section class="editorial-section">
      <h2>Ways to use alphabet coloring pages</h2>
      <ul class="compat-list">
        <li><span class="ts-pill-safe">Learn</span> Say the letter and its example word aloud while coloring — a simple way to link letters to sounds.</li>
        <li><span class="ts-pill-safe">Color</span> The thin outlines leave lots of room for crayons, markers, and colored pencils.</li>
        <li><span class="ts-pill-safe">Classroom</span> Print the whole alphabet for a center activity, or one letter for the letter of the week.</li>
      </ul>
      <h3>Prefer copy-paste letters instead of a coloring page?</h3>
      <p>These outlines are for paper. If you want stylish letters you can paste into a bio or caption, use the
        <a href="/category/">font generators</a>. For other printable looks, try
        <a href="/printables/bubble-letters/">bubble letters</a> or
        <a href="/printables/block-letters/">block letter stencils</a>.</p>
    </section>

    <div class="cta-card">
      <h3>Want a name or word coloring page?</h3>
      <p>Type any name or word and make your own coloring page — with a heading, a name-and-date line, cute borders, and dotted or starry fills to color.</p>
      <a class="cta-btn" href="/printables/coloring-page-maker/">Open the coloring page maker →</a>
    </div>

    <div class="cta-card">
      <h3>Want a puzzle before the coloring?</h3>
      <p>Every letter also has a numbered dot-to-dot version — connect the dots in order to reveal the letter, then color it in.</p>
      <a class="cta-btn" href="/printables/dot-to-dot-alphabet/">Open dot-to-dot alphabet →</a>
    </div>

    <div class="cta-card">
      <h3>Looking for handwriting practice instead?</h3>
      <p>Type any name and print a tracing worksheet with model and trace rows — perfect for preschool and kindergarten.</p>
      <a class="cta-btn" href="/printables/name-tracing/">Open name tracing worksheets →</a>
    </div>

      <h2 class="faq-category">Alphabet Coloring Pages — FAQ</h2>

{faq_accordion(faqs)}


  </main>

  <footer class="footer">
    <div class="footer-inner">
    </div>
  </footer>

  <!-- Print surface (hidden on screen, isolated when printing) -->
  <div id="pt-print-root" aria-hidden="true"></div>

{config}
{ENGINE_SCRIPTS}

{FAQ_TOGGLE_SCRIPT}
<script src="/footer.js" defer></script>
</body></html>
"""


# --------------------------------------------------------------------------
# Spoke page
# --------------------------------------------------------------------------
def render_spoke(spec, index):
    cfg = spec["cluster"]
    letters = spec["letters"]
    e = letters[index]
    slug = cfg["slug"]
    L = e["letter"]
    low = L.lower()
    word = e["word"]
    article = e.get("article", "a")
    canonical = f"{SITE}/printables/{slug}/letter-{low}/"

    prev_e = letters[index - 1] if index > 0 else None
    next_e = letters[index + 1] if index < len(letters) - 1 else None

    # Compact linked A–Z strip.
    strip_links = []
    for o in letters:
        oL = o["letter"]
        cls = ' class="is-current"' if oL == L else ""
        aria = ' aria-current="page"' if oL == L else ""
        strip_links.append(
            f'<a href="/printables/{slug}/letter-{oL.lower()}/"{cls}{aria}>{esc(oL)}</a>'
        )
    az_strip = "\n        ".join(strip_links)

    # Prev / next.
    nav_bits = []
    if prev_e:
        nav_bits.append(
            f'<a href="/printables/{slug}/letter-{prev_e["letter"].lower()}/" rel="prev">'
            f'← Letter {esc(prev_e["letter"])}</a>'
        )
    else:
        nav_bits.append('<span class="pt-nav-spacer"></span>')
    nav_bits.append('<span class="pt-nav-spacer"></span>')
    if next_e:
        nav_bits.append(
            f'<a href="/printables/{slug}/letter-{next_e["letter"].lower()}/" rel="next">'
            f'Letter {esc(next_e["letter"])} →</a>'
        )
    letter_nav = "\n      ".join(nav_bits)

    words_list = ", ".join(e["words"])

    faqs = [
        (
            f"What is on the letter {L} coloring page?",
            f"A big capital {esc(L)} and lowercase {esc(low)} drawn as one clean, single-line "
            f"outline you can print and color. {esc(e['fact'])}",
            f"A big capital {L} and lowercase {low} drawn as one clean, single-line outline "
            f"you can print and color. {e['fact']}",
        ),
        (
            f"What words start with the letter {L}?",
            f"Fun {esc(L)} words to say while you color include {esc(words_list)}. This coloring "
            f"page uses <strong>{esc(L)} is for {esc(word)}</strong>.",
            f"Fun {L} words to say while you color include {words_list}. This coloring page "
            f"uses {L} is for {word}.",
        ),
        (
            f"How do I print or download the letter {L} coloring page?",
            f"Use <strong>Print this letter</strong> to send just the {esc(L)} sheet to your "
            "printer, or <strong>Download PNG</strong> to save a high-resolution image. The "
            "outline is drawn in the page as vector artwork, so raising the scale in the "
            "print dialog keeps its edges clean instead of pixelating them, and choosing "
            "\u201cSave as PDF\u201d as the destination gives you a file instead of paper.",
            f"Use Print this letter to send just the {L} sheet to your printer, or Download "
            "PNG to save a high-resolution image. The outline is drawn in the page as vector "
            "artwork, so raising the scale in the print dialog keeps its edges clean instead "
            "of pixelating them, and choosing \u201cSave as PDF\u201d as the destination gives you a "
            "file instead of paper.",
        ),
        (
            "Do you have coloring pages for the other letters?",
            'All 26 letters have their own sheet, each with its own example word. Head back to '
            f'<a href="/printables/{slug}/">Alphabet Coloring Pages</a> to color the whole A–Z, '
            "or jump straight to a letter with the strip above.",
            "All 26 letters have their own sheet, each with its own example word. Head back "
            "to Alphabet Coloring Pages to color the whole A–Z, or jump straight to a letter "
            "with the strip above.",
        ),
    ]

    title = f"Letter {L} Coloring Page — {L} is for {word} (Free Printable) | UltraTextGen"
    meta = (
        f"Free printable letter {L} coloring page — a big {L}/{low} outline to color. "
        f"{L} is for {word}. Print it or download a PNG, no sign-up. Part of our A–Z "
        "alphabet coloring pages."
    )
    og_desc = (
        f"Free printable letter {L} coloring page. Color a big {L}/{low} outline — "
        f"{L} is for {word}. Print or download as PNG."
    )

    breadcrumb = breadcrumb_ld(
        [
            ("Home", f"{SITE}/"),
            ("Printables", f"{SITE}/printables/"),
            ("Alphabet Coloring Pages", f"{SITE}/printables/{slug}/"),
            (f"Letter {L}", canonical),
        ]
    )
    ld = "\n\n".join([ldjson(breadcrumb), ldjson(faqpage_ld(faqs))])

    config = config_script(cfg, extra_lines=[f'      initialChar: "{L}"'])

    return f"""<!DOCTYPE html><html lang="en"><head>
{funding_choices_tag()}
{GTM_HEAD}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc_attr(meta)}">
  <link rel="canonical" href="{esc_attr(canonical)}">
  <meta property="og:title" content="Letter {esc(L)} Coloring Page — {esc(L)} is for {esc(word)} | UltraTextGen">
  <meta property="og:description" content="{esc_attr(og_desc)}">
  <meta property="og:url" content="{esc_attr(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{esc_attr(cfg["og_image"])}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Letter {esc(L)} Coloring Page — {esc(L)} is for {esc(word)}">
  <meta name="twitter:description" content="{esc_attr(og_desc)}">
  <meta name="twitter:image" content="{esc_attr(cfg["og_image"])}">
{font_head(cfg)}

{ld}
</head>
<body>
  <script>try{{if(localStorage.getItem("darkMode")==="true")document.body.classList.add("dark-mode")}}catch(e){{}}</script>
{GTM_NOSCRIPT}
  <div id="shared-header"></div>
<script src="/header.js" defer></script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  <a href="/">Home</a>
  <span class="breadcrumb-separator">›</span>
  <a href="/printables/">Printables</a>
  <span class="breadcrumb-separator">›</span>
  <a href="/printables/{slug}/">Alphabet Coloring Pages</a>
  <span class="breadcrumb-separator">›</span>
  <span class="breadcrumb-current">Letter {esc(L)}</span>
</nav>

  <section class="hero">
    <div class="hero-inner" style="max-width:820px;">
      <h1 class="hero-headline">Letter {esc(L)} Coloring Page</h1>
      <p class="hero-tagline">
        {esc(L)} is for {esc(word)}. A big, clean {esc(L)}/{esc(low)} outline to print and color —
        free, no sign-up.
      </p>
      <p class="pt-letter-figures" aria-hidden="true">{esc(L)}{esc(low)}</p>
    </div>
  </section>

  <main class="container">

    <!-- Selected-letter detail (locked to this letter) -->
    <section class="bubble-az" aria-labelledby="ptLetterHeading">
      <h2 class="bubble-az-heading" id="ptLetterHeading">Color the letter {esc(L)}</h2>
      <p class="bubble-az-intro">Print this outline to color it in, or download it as a PNG. {esc(L)} is for {esc(word)}.</p>
      <div class="bubble-letter-panel" id="pt-panel" aria-live="polite"></div>
    </section>

    <!-- Unique letter content -->
    <section class="editorial-section">
      <h2>{esc(L)} is for {esc(word)}</h2>
      <p>{esc(e["fact"])}</p>
      <p>Say the letter name and sound out loud while you color — it helps little learners connect the
        shape of the letter {esc(L)} to the words it begins. Other fun {esc(L)} words to try:
        {esc(words_list)}.</p>
    </section>

    <!-- Sibling letters -->
    <section class="editorial-section" aria-labelledby="ptStripHeading">
      <h2 id="ptStripHeading">Jump to another letter</h2>
      <nav class="pt-az-strip" aria-label="All letters A to Z">
        {az_strip}
      </nav>
      <nav class="pt-letter-nav" aria-label="Previous and next letter">
      {letter_nav}
      </nav>
    </section>

    <!-- Cross-links to the other printable looks of this letter -->
    <section class="related-pages">
      <h2>More printable letter {esc(L)} styles</h2>
      <div class="related-pages-grid">
        <a href="/printables/{slug}/" class="related-page-card">
          <span class="related-page-label">Hub</span>
          <h4>All alphabet coloring pages</h4>
        </a>
        <a href="/printables/dot-to-dot-alphabet/letter-{low}/" class="related-page-card">
          <span class="related-page-label">Puzzle</span>
          <h4>Letter {esc(L)} dot-to-dot</h4>
        </a>
        <a href="/printables/bubble-letters/#letter-{low}" class="related-page-card">
          <span class="related-page-label">Bubble</span>
          <h4>Bubble letter {esc(L)}</h4>
        </a>
        <a href="/printables/block-letters/#letter-{low}" class="related-page-card">
          <span class="related-page-label">Stencil</span>
          <h4>Block letter {esc(L)}</h4>
        </a>
      </div>
    </section>


      <h2 class="faq-category">Letter {esc(L)} Coloring Page — FAQ</h2>

{faq_accordion(faqs)}


  </main>

  <footer class="footer">
    <div class="footer-inner">
    </div>
  </footer>

  <!-- Print surface (hidden on screen, isolated when printing) -->
  <div id="pt-print-root" aria-hidden="true"></div>

{config}
{ENGINE_SCRIPTS}

{FAQ_TOGGLE_SCRIPT}
<script src="/footer.js" defer></script>
</body></html>
"""


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------
def validate_spec(spec):
    if "cluster" not in spec or "letters" not in spec:
        raise SpecError("spec must have 'cluster' and 'letters'")
    cfg = spec["cluster"]
    for key in (
        "slug",
        "hub_title",
        "hub_h1",
        "hub_tagline",
        "hub_meta",
        "hub_og_desc",
        "font_css",
        "font_query",
        "stroke_width",
        "noun",
        "png_prefix",
        "og_image",
    ):
        if key not in cfg or cfg[key] in (None, ""):
            raise SpecError(f"cluster missing '{key}'")

    letters = spec["letters"]
    seen = [e.get("letter") for e in letters]
    if seen != list(ALPHABET):
        raise SpecError(
            "letters must be exactly A–Z in order; got: " + "".join(str(s) for s in seen)
        )
    for i, e in enumerate(letters):
        for key in ("letter", "word", "words", "fact"):
            if key not in e or e[key] in (None, "", []):
                raise SpecError(f"letters[{i}] ({e.get('letter')}) missing '{key}'")
        if not isinstance(e["words"], list) or len(e["words"]) < 2:
            raise SpecError(f"letters[{i}].words must be a list of >= 2 words")


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="validate and report without writing"
    )
    parser.add_argument(
        "--force-stale",
        action="store_true",
        help="write even though this generator would delete shipped repairs "
             "(hreflang, social art, ...). Re-run the owning passes afterwards.",
    )
    parser.add_argument(
        "--no-force",
        action="store_true",
        help="refuse to overwrite existing pages (default overwrites)",
    )
    args = parser.parse_args(argv)

    try:
        spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
        validate_spec(spec)
    except SpecError as exc:
        sys.stderr.write(f"[error] {exc}\n")
        return 2
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"[error] invalid JSON in spec: {exc}\n")
        return 2

    slug = spec["cluster"]["slug"]
    hub_dir = PRINTABLES_DIR / slug

    targets = [(hub_dir / "index.html", render_hub(spec))]
    for i, e in enumerate(spec["letters"]):
        out = hub_dir / f"letter-{e['letter'].lower()}" / "index.html"
        targets.append((out, render_spoke(spec, i)))

    if args.dry_run:
        for path, html_str in targets:
            print(
                f"[dry-run] would write {path.relative_to(REPO)} ({len(html_str)} bytes)"
            )
        print(f"[dry-run] {len(targets)} pages OK")
        return 0

    if args.no_force:
        existing = [p for p, _ in targets if p.exists()]
        if existing:
            sys.stderr.write(
                "[error] pages already exist (drop --no-force to overwrite):\n  "
                + "\n  ".join(str(p.relative_to(REPO)) for p in existing)
                + "\n"
            )
            return 3

    assert_no_regression(targets, force=args.force_stale)


    for path, html_str in targets:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html_str, encoding="utf-8")

    print(f"Wrote {len(targets)} pages under printables/{slug}/ (1 hub + 26 spokes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
