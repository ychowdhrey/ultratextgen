#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_number_coloring_pages.py

Render the "number coloring pages" hub-and-spoke cluster under /printables/
from a single data spec (data/printables_number_coloring.json):

  hub    /printables/number-coloring-pages/            (browse-everything)
  spoke  /printables/number-coloring-pages/number-0/   ... number-9/  (×10)

This is the numbers (0–9) sibling of scripts/generate_alphabet_coloring_pages.py
and follows the exact same conventions: GTM + ad snippets, canonical/OG/Twitter
meta, BreadcrumbList + FAQPage JSON-LD, shared header/footer injectors, and the
shared printablesEngine.js driven by a per-page window.UTG_PRINTABLE config.

Client-side only: the colorable number outlines are rendered by the engine as
native SVG/Canvas at runtime — no server-side image rendering, no bundled font
binaries (Baloo 2 loads from Google Fonts like the other printables pages).

The engine is locked to a single digit per spoke via CFG.initialChar and drawn
in digits-only mode via CFG.charset === "digits". Both are backward-compatible
config options; no per-page render code lives here.

Usage
-----
  python3 scripts/generate_number_coloring_pages.py            # write all pages
  python3 scripts/generate_number_coloring_pages.py --dry-run  # validate only
  python3 scripts/generate_number_coloring_pages.py --no-force # refuse overwrite

Pages are always regenerated from the spec; there is no hand-editing step.
"""

import argparse
import html
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
SPEC_PATH = REPO / "data" / "printables_number_coloring.json"
PRINTABLES_DIR = REPO / "printables"

SITE = "https://ultratextgen.com"
DIGITS = "0123456789"


class SpecError(Exception):
    """Raised when the data spec fails validation."""


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
  <script data-grow-initializer="">!(function(){window.growMe||((window.growMe=function(e){window.growMe._.push(e);}),(window.growMe._=[]));var e=document.createElement("script");(e.type="text/javascript"),(e.src="https://faves.grow.me/main.js"),(e.defer=!0),e.setAttribute("data-grow-faves-site-id","U2l0ZTplMzgxNTIwYS1jYTIzLTQ4Y2EtYTA2Ni04M2M0MjBkZGRkZWE=");var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t);})();</script>
  <script type="text/javascript" async="async" data-noptimize="1" data-cfasync="false" src="//scripts.scriptwrapper.com/tags/e381520a-ca23-48ca-a066-83c420ddddea.js"></script>"""

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
        '      charset: "digits",',
        f'      noun: "{cfg["noun"]}",',
        f'      gridNoun: "{cfg["grid_noun"]}",',
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
    numbers = spec["numbers"]
    slug = cfg["slug"]
    canonical = f"{SITE}/printables/{slug}/"

    # Real, crawlable links to all 10 spokes.
    link_items = []
    for e in numbers:
        n = e["number"]
        link_items.append(
            f'        <a class="pt-az-link" href="/printables/{slug}/number-{n}/">\n'
            f'          <span class="pt-az-link-letter">{esc(n)}</span>\n'
            f'          <span class="pt-az-link-word">Number {esc(n)} · {esc(e["name"])}</span>\n'
            "        </a>"
        )
    az_links = "\n".join(link_items)

    faqs = [
        (
            "Are these number coloring pages free to print?",
            "Yes — every number coloring page here is completely free, with no sign-up, "
            "watermark, or limit. Pick a number for a big single-line outline, then use "
            "<strong>Print this number</strong> to send it to your printer or "
            "<strong>Download PNG</strong> to save a high-resolution image.",
            "Yes. Every number coloring page here is completely free, with no sign-up, "
            "watermark, or limit. Pick a number for a big single-line outline, then use "
            "Print this number to send it to your printer or Download PNG to save a "
            "high-resolution image.",
        ),
        (
            "How do I print all the numbers 0–9 at once?",
            "Scroll to the <strong>Printable numbers</strong> section and press "
            "<strong>Print the numbers</strong> to send all ten number outlines to your "
            "printer on one sheet — handy for a classroom counting activity or a quiet-time "
            "worksheet.",
            "Scroll to the Printable numbers section and press Print the numbers to send all "
            "ten number outlines to your printer on one sheet — handy for a classroom "
            "counting activity or a quiet-time worksheet.",
        ),
        (
            "Can I get a coloring page for just one number?",
            "Yes. Every number 0–9 has its own page with a big outline, things to count, and "
            "Print and Download buttons. Open any number from the "
            "<strong>0–9 numbers</strong> list, or tap it in the picker to preview it here first.",
            "Yes. Every number 0 to 9 has its own page with a big outline, things to count, and "
            "Print and Download buttons. Open any number from the 0–9 numbers list, or tap it "
            "in the picker to preview it here first.",
        ),
        (
            "Do you have coloring pages for the letters too?",
            "Yes — head to <a href=\"/printables/alphabet-coloring-pages/\">alphabet coloring "
            "pages</a> for the full A–Z. For other printable number looks, try the "
            "<a href=\"/printables/bubble-letters/\">bubble numbers</a> or the bold "
            "<a href=\"/printables/block-letters/\">block number stencils</a>.",
            "Yes — head to alphabet coloring pages for the full A–Z. For other printable "
            "number looks, try the bubble numbers or the bold block number stencils.",
        ),
    ]

    collection_ld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": html.unescape("Number Coloring Pages 0–9"),
        "url": canonical,
        "description": html.unescape(cfg["hub_meta"]),
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": i + 1,
                    "name": f"Number {e['number']} Coloring Page",
                    "url": f"{SITE}/printables/{slug}/number-{e['number']}/",
                }
                for i, e in enumerate(numbers)
            ],
        },
    }
    breadcrumb = breadcrumb_ld(
        [
            ("Home", f"{SITE}/"),
            ("Printables", f"{SITE}/printables/"),
            ("Number Coloring Pages", canonical),
        ]
    )

    ld = "\n\n".join(
        [ldjson(breadcrumb), ldjson(collection_ld), ldjson(faqpage_ld(faqs))]
    )

    config = config_script(cfg)

    return f"""<!DOCTYPE html><html lang="en"><head>
{GTM_HEAD}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(cfg["hub_title"])}</title>
  <meta name="description" content="{esc_attr(cfg["hub_meta"])}">
  <link rel="canonical" href="{esc_attr(canonical)}">
  <meta property="og:title" content="Number Coloring Pages 0–9 | UltraTextGen">
  <meta property="og:description" content="{esc_attr(cfg["hub_og_desc"])}">
  <meta property="og:url" content="{esc_attr(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{esc_attr(cfg["og_image"])}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Number Coloring Pages 0–9 | UltraTextGen">
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
  <span class="breadcrumb-current">Number Coloring Pages</span>
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

    <!-- Picker + selected-number detail -->
    <section class="bubble-az" aria-labelledby="ptPickHeading">
      <h2 class="bubble-az-heading" id="ptPickHeading">Pick a number to color</h2>
      <p class="bubble-az-intro">Tap any number 0–9 to see its big coloring outline, print it, or download a PNG. Want the number's own page with things to count? Open it from the 0–9 list below.</p>
      <div class="bubble-strip" id="pt-strip" role="tablist" aria-label="Choose a number to color"></div>
      <div class="bubble-letter-panel" id="pt-panel" aria-live="polite"></div>
    </section>

    <!-- Full printable number set -->
    <section class="bubble-alphabet" aria-labelledby="ptAlphaHeading">
      <div class="bubble-alphabet-head">
        <h2 id="ptAlphaHeading">Printable numbers</h2>
        <button class="bubble-btn bubble-btn-primary" type="button" id="pt-alphabet-print">Print the numbers</button>
      </div>
      <p class="bubble-az-intro">The full set of numbers 0–9 as clean coloring outlines. Print the whole sheet to color, or tap any number to open its print and download options.</p>
      <div class="bubble-alphabet-grid" id="pt-alphabet-grid"></div>
    </section>

    <!-- Real, crawlable per-number links -->
    <section class="editorial-section" aria-labelledby="ptListHeading">
      <h2 id="ptListHeading">0–9 number coloring pages</h2>
      <p class="bubble-az-intro">Every number has its own coloring page with a big outline and things to count — great when you searched for one exact number.</p>
      <div class="pt-az-links">
{az_links}
      </div>
    </section>

    <!-- Editorial -->
    <section class="editorial-section">
      <h2>Ways to use number coloring pages</h2>
      <ul class="compat-list">
        <li><span class="ts-pill-safe">Count</span> Say the number out loud and count that many things while coloring — a simple way to link numbers to amounts.</li>
        <li><span class="ts-pill-safe">Color</span> The thin outlines leave lots of room for crayons, markers, and colored pencils.</li>
        <li><span class="ts-pill-safe">Classroom</span> Print the whole set 0–9 for a counting center, or one number for the number of the week.</li>
      </ul>
      <h3>Prefer copy-paste numbers or letters instead of a coloring page?</h3>
      <p>These outlines are for paper. If you want stylish numbers you can paste into a bio or caption, use the
        <a href="/category/">font generators</a>. Want letters instead? Try our
        <a href="/printables/alphabet-coloring-pages/">alphabet coloring pages</a>, or for other printable
        number looks, <a href="/printables/bubble-letters/">bubble numbers</a> and
        <a href="/printables/block-letters/">block number stencils</a>.</p>
    </section>

    <div class="cta-card">
      <h3>Looking for handwriting practice instead?</h3>
      <p>Type any name and print a tracing worksheet with model and trace rows — perfect for preschool and kindergarten.</p>
      <a class="cta-btn" href="/printables/name-tracing/">Open name tracing worksheets →</a>
    </div>
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <h2 class="faq-category">Number Coloring Pages — FAQ</h2>

{faq_accordion(faqs)}

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
    numbers = spec["numbers"]
    e = numbers[index]
    slug = cfg["slug"]
    n = e["number"]
    name = e["name"]
    canonical = f"{SITE}/printables/{slug}/number-{n}/"

    prev_e = numbers[index - 1] if index > 0 else None
    next_e = numbers[index + 1] if index < len(numbers) - 1 else None

    # Compact linked 0–9 strip.
    strip_links = []
    for o in numbers:
        on = o["number"]
        cls = ' class="is-current"' if on == n else ""
        aria = ' aria-current="page"' if on == n else ""
        strip_links.append(
            f'<a href="/printables/{slug}/number-{on}/"{cls}{aria}>{esc(on)}</a>'
        )
    az_strip = "\n        ".join(strip_links)

    # Prev / next.
    nav_bits = []
    if prev_e:
        nav_bits.append(
            f'<a href="/printables/{slug}/number-{prev_e["number"]}/" rel="prev">'
            f'← Number {esc(prev_e["number"])}</a>'
        )
    else:
        nav_bits.append('<span class="pt-nav-spacer"></span>')
    nav_bits.append('<span class="pt-nav-spacer"></span>')
    if next_e:
        nav_bits.append(
            f'<a href="/printables/{slug}/number-{next_e["number"]}/" rel="next">'
            f'Number {esc(next_e["number"])} →</a>'
        )
    number_nav = "\n      ".join(nav_bits)

    things_list = ", ".join(e["things"])
    first_thing = e["things"][0]

    faqs = [
        (
            f"What is on the number {n} coloring page?",
            f"A big number {esc(n)} drawn as one clean, single-line outline you can print and "
            f"color. {esc(e['fact'])}",
            f"A big number {n} drawn as one clean, single-line outline you can print and color. "
            f"{e['fact']}",
        ),
        (
            f"What can I count to practice the number {n}?",
            f"Fun things to count while you color the number {esc(n)} include {esc(things_list)}. "
            f"Say <strong>{esc(n)} is {esc(name.lower())}</strong> out loud as you point to each one.",
            f"Fun things to count while you color the number {n} include {things_list}. Say "
            f"{n} is {name.lower()} out loud as you point to each one.",
        ),
        (
            f"How do I print or download the number {n} coloring page?",
            "Use <strong>Print this number</strong> to send just this outline to your printer, "
            "or <strong>Download PNG</strong> to save a high-resolution image you can print or "
            "reuse. Everything runs in your browser — no app or sign-up.",
            "Use Print this number to send just this outline to your printer, or Download PNG "
            "to save a high-resolution image you can print or reuse. Everything runs in your "
            "browser — no app or sign-up.",
        ),
        (
            "Do you have coloring pages for the other numbers?",
            'Yes — every number 0–9 has one. Head back to '
            f'<a href="/printables/{slug}/">Number Coloring Pages</a> to color the whole set, '
            "or jump straight to a number with the strip above.",
            "Yes — every number 0–9 has one. Head back to Number Coloring Pages to color the "
            "whole set, or jump straight to a number with the strip above.",
        ),
    ]

    title = f"Number {n} Coloring Page — Color the Number {name} (Free Printable) | UltraTextGen"
    meta = (
        f"Free printable number {n} coloring page — a big number {n} outline to color. "
        f"Count {first_thing}. Print it or download a PNG, no sign-up. Part of our 0–9 "
        "number coloring pages."
    )
    og_desc = (
        f"Free printable number {n} coloring page. Color a big number {n} outline — "
        f"count to {name.lower()}. Print or download as PNG."
    )

    breadcrumb = breadcrumb_ld(
        [
            ("Home", f"{SITE}/"),
            ("Printables", f"{SITE}/printables/"),
            ("Number Coloring Pages", f"{SITE}/printables/{slug}/"),
            (f"Number {n}", canonical),
        ]
    )
    ld = "\n\n".join([ldjson(breadcrumb), ldjson(faqpage_ld(faqs))])

    config = config_script(cfg, extra_lines=[f'      initialChar: "{n}"'])

    return f"""<!DOCTYPE html><html lang="en"><head>
{GTM_HEAD}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc_attr(meta)}">
  <link rel="canonical" href="{esc_attr(canonical)}">
  <meta property="og:title" content="Number {esc(n)} Coloring Page — Color the Number {esc(name)} | UltraTextGen">
  <meta property="og:description" content="{esc_attr(og_desc)}">
  <meta property="og:url" content="{esc_attr(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{esc_attr(cfg["og_image"])}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Number {esc(n)} Coloring Page — Color the Number {esc(name)}">
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
  <a href="/printables/{slug}/">Number Coloring Pages</a>
  <span class="breadcrumb-separator">›</span>
  <span class="breadcrumb-current">Number {esc(n)}</span>
</nav>

  <section class="hero">
    <div class="hero-inner" style="max-width:820px;">
      <h1 class="hero-headline">Number {esc(n)} Coloring Page</h1>
      <p class="hero-tagline">
        A big, clean number {esc(n)} outline to print and color — count to {esc(name.lower())} as you go.
        Free, no sign-up.
      </p>
      <p class="pt-letter-figures" aria-hidden="true">{esc(n)}</p>
    </div>
  </section>

  <main class="container">

    <!-- Selected-number detail (locked to this number) -->
    <section class="bubble-az" aria-labelledby="ptLetterHeading">
      <h2 class="bubble-az-heading" id="ptLetterHeading">Color the number {esc(n)}</h2>
      <p class="bubble-az-intro">Print this outline to color it in, or download it as a PNG. {esc(n)} is {esc(name.lower())}.</p>
      <div class="bubble-letter-panel" id="pt-panel" aria-live="polite"></div>
    </section>

    <!-- Unique number content -->
    <section class="editorial-section">
      <h2>The number {esc(n)} is {esc(name.lower())}</h2>
      <p>{esc(e["fact"])}</p>
      <p>Say the number name out loud and count that many things while you color — it helps little learners
        connect the shape of the number {esc(n)} to the amount it stands for. Things to count to {esc(name.lower())}:
        {esc(things_list)}.</p>
    </section>

    <!-- Sibling numbers -->
    <section class="editorial-section" aria-labelledby="ptStripHeading">
      <h2 id="ptStripHeading">Jump to another number</h2>
      <nav class="pt-az-strip" aria-label="All numbers 0 to 9">
        {az_strip}
      </nav>
      <nav class="pt-letter-nav" aria-label="Previous and next number">
      {number_nav}
      </nav>
    </section>

    <!-- Cross-links to the other printable looks of this number -->
    <section class="related-pages">
      <h2>More printable number {esc(n)} styles</h2>
      <div class="related-pages-grid">
        <a href="/printables/{slug}/" class="related-page-card">
          <span class="related-page-label">Hub</span>
          <h4>All number coloring pages</h4>
        </a>
        <a href="/printables/bubble-letters/#number-{n}" class="related-page-card">
          <span class="related-page-label">Bubble</span>
          <h4>Bubble number {esc(n)}</h4>
        </a>
        <a href="/printables/block-letters/#number-{n}" class="related-page-card">
          <span class="related-page-label">Stencil</span>
          <h4>Block number {esc(n)}</h4>
        </a>
      </div>
    </section>

  </main>

  <footer class="footer">
    <div class="footer-inner">
      <h2 class="faq-category">Number {esc(n)} Coloring Page — FAQ</h2>

{faq_accordion(faqs)}

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
    if "cluster" not in spec or "numbers" not in spec:
        raise SpecError("spec must have 'cluster' and 'numbers'")
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
        "grid_noun",
        "png_prefix",
        "og_image",
    ):
        if key not in cfg or cfg[key] in (None, ""):
            raise SpecError(f"cluster missing '{key}'")

    numbers = spec["numbers"]
    seen = [e.get("number") for e in numbers]
    if seen != list(DIGITS):
        raise SpecError(
            "numbers must be exactly 0–9 in order; got: " + "".join(str(s) for s in seen)
        )
    for i, e in enumerate(numbers):
        for key in ("number", "name", "count_word", "things", "fact"):
            if key not in e or e[key] in (None, "", []):
                raise SpecError(f"numbers[{i}] ({e.get('number')}) missing '{key}'")
        if not isinstance(e["things"], list) or len(e["things"]) < 2:
            raise SpecError(f"numbers[{i}].things must be a list of >= 2 items")


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="validate and report without writing"
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
    for i, e in enumerate(spec["numbers"]):
        out = hub_dir / f"number-{e['number']}" / "index.html"
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

    for path, html_str in targets:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html_str, encoding="utf-8")

    print(f"Wrote {len(targets)} pages under printables/{slug}/ (1 hub + 10 spokes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
