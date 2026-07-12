#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_bubble_numbers_pages.py

Render the 10 per-digit SPOKE pages for the printable "bubble letters" cluster
from a single data spec (data/printables_bubble_numbers.json):

  spoke  /printables/bubble-letters/number-0/  ...  number-9/   (×10)

Sibling script to generate_bubble_letters_pages.py — same cluster, same hub,
same printablesEngine.js, same craft-framed (not phonics/maths-worksheet)
content policy, just keyed by digit instead of letter. The hub
(/printables/bubble-letters/) is HAND-WRITTEN and hand-maintained, so this
script is SPOKE-ONLY and never touches the hub index.html.

Each spoke locks the shared printablesEngine.js panel to one digit via
initialChar (charSlug() in the engine already maps a digit to "number-{d}",
which is also the URL slug used here and the #hash the engine reads to
preselect a character on pages like /printables/block-letters/). Content is
craft-framed (birthday milestones, house numbers, jerseys/lockers,
bullet-journal trackers, countdown signs) — never a counting/maths lesson,
per the repo's printables scope boundary. Each page also shows 2-3 real
copy-paste Unicode bubble digit variants, pulled straight from styles.js.

Usage
-----
  python3 scripts/generate_bubble_numbers_pages.py            # write all spokes
  python3 scripts/generate_bubble_numbers_pages.py --dry-run  # validate only
  python3 scripts/generate_bubble_numbers_pages.py --no-force # refuse overwrite
"""

import argparse
import html
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
SPEC_PATH = REPO / "data" / "printables_bubble_numbers.json"
STYLES_PATH = REPO / "styles.js"
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


def to_text(a_html):
    """Strip tags/entities from an answer's HTML to get its plain-text form."""
    return html.unescape(re.sub(r"<[^>]+>", "", a_html)).strip()


# --------------------------------------------------------------------------
# Real per-digit Unicode bubble glyphs, read straight from styles.js so they
# are never hand-transcribed. We index the canonical 0-9 strings by position.
# --------------------------------------------------------------------------
def extract_nums(style_name):
    js = STYLES_PATH.read_text(encoding="utf-8")
    idx = js.find("'%s':" % style_name)
    if idx == -1:
        raise SpecError("style %r not found in styles.js" % style_name)
    seg = js[idx: idx + 900]
    m = re.search(r"nums:\s*'([^']*)'", seg)
    if not m:
        raise SpecError("field 'nums' not found for style %r" % style_name)
    s = m.group(1)
    if len(s) != 10:
        raise SpecError("%s.nums has %d glyphs, expected 10" % (style_name, len(s)))
    return s


FILLED_NUMS = extract_nums("Ultra Bubble Filled")  # ⓿❶❷❸… (the puffiest)
CIRCLED_NUMS = extract_nums("Ultra Bubble")        # ⓪①②③…
LIGHT_NUMS = extract_nums("Ultra Bubble Light")     # ⑴⑵⑶⑷…


# --------------------------------------------------------------------------
# Shared fragments (mirrors scripts/generate_bubble_letters_pages.py)
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

# The window.UTG_PRINTABLE config matches the hand-written hub verbatim (so the
# locked single-digit panel renders identically), with initialChar appended.
# __D__ is substituted per page; {ch} is a literal placeholder the engine
# itself expands at runtime, so it is left untouched here.
CONFIG_TEMPLATE = """  <script>
    window.UTG_PRINTABLE = {
      key: "bubble-letters",
      render: "outline",
      noun: "bubble",
      pngPrefix: "bubble",
      font: "Fredoka, 'Plus Jakarta Sans', sans-serif",
      strokeWidth: 9,
      letterSpacing: 0.1,
      charset: "alnum",
      variantFamily: "bubble",
      glyphStyle: "Ultra Bubble",
      nameDemo: "Mia",
      howto: {
        title: "How to draw a bubble {ch}",
        steps: [
          "Lightly pencil the plain {ch} as a thin skeleton.",
          "Draw a rounded, puffy outline about a finger-width around every stroke.",
          "Round off the corners, erase the skeleton, then ink and color it in."
        ],
        tip: "Tip: print the outline above and trace it a few times until the shape feels natural."
      },
      initialChar: "__D__"
    };
  </script>"""

ENGINE_SCRIPTS = (
    '  <script src="/styles.js" defer></script>\n'
    '  <script src="/renderer.js" defer></script>\n'
    '  <script src="/js/printables/printablesEngine.js" defer></script>'
)


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
            {"@type": "ListItem", "position": i + 1, "name": name, "item": url}
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
    """Visible accordion matching the existing printables pages."""
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


# --------------------------------------------------------------------------
# Spoke page
# --------------------------------------------------------------------------
def render_spoke(spec, index):
    cfg = spec["cluster"]
    numbers = spec["numbers"]
    e = numbers[index]
    slug = cfg["slug"]
    D = e["digit"]
    i = int(D)
    craft = e["craft"]
    intro = e["intro"]
    draw = e["draw"]
    canonical = f"{SITE}/printables/{slug}/number-{D}/"

    filled, circled, light = FILLED_NUMS[i], CIRCLED_NUMS[i], LIGHT_NUMS[i]

    prev_e = numbers[index - 1] if index > 0 else None
    next_e = numbers[index + 1] if index < len(numbers) - 1 else None

    # Compact linked 0-9 strip.
    strip_links = []
    for o in numbers:
        oD = o["digit"]
        cls = ' class="is-current"' if oD == D else ""
        aria = ' aria-current="page"' if oD == D else ""
        strip_links.append(
            f'<a href="/printables/{slug}/number-{oD}/"{cls}{aria}>{esc(oD)}</a>'
        )
    digit_strip = "\n        ".join(strip_links)

    # Prev / next.
    nav_bits = []
    if prev_e:
        nav_bits.append(
            f'<a href="/printables/{slug}/number-{prev_e["digit"]}/" rel="prev">'
            f'← Bubble number {esc(prev_e["digit"])}</a>'
        )
    else:
        nav_bits.append('<span class="pt-nav-spacer"></span>')
    nav_bits.append('<span class="pt-nav-spacer"></span>')
    if next_e:
        nav_bits.append(
            f'<a href="/printables/{slug}/number-{next_e["digit"]}/" rel="next">'
            f'Bubble number {esc(next_e["digit"])} →</a>'
        )
    digit_nav = "\n      ".join(nav_bits)

    faqs = [
        (
            f"What is on the bubble number {D} page?",
            f"A large {esc(D)} shown as a rounded, puffy bubble outline. Use "
            f"<strong>Print this number</strong> to print it for tracing or colouring, "
            f"or <strong>Download PNG</strong> to save it — great for {esc(craft)}.",
            None,
        ),
        (
            f"How do I print or download bubble number {D}?",
            "Use <strong>Print this number</strong> to send just this outline to your printer, "
            "or <strong>Download PNG</strong> to save a high-resolution image you can print or "
            "reuse. Everything runs in your browser — no app or sign-up.",
            None,
        ),
        (
            f"How do I draw a bubble number {D} by hand?",
            f"{esc(draw)} Then erase the guide lines, ink the outline, and colour it in. "
            "Printing the outline above and tracing over it a few times is the quickest way to "
            "learn the shape.",
            None,
        ),
        (
            "Do you have the letters in bubble writing too?",
            'Yes — every letter A–Z has its own bubble page. Head back to '
            f'<a href="/printables/{slug}/">Printable Bubble Letters</a> for the whole alphabet '
            f'and number set, or start at <a href="/printables/{slug}/letter-a/">bubble letter A</a>.',
            None,
        ),
    ]
    faqs = [(q, a_html, to_text(a_html)) for (q, a_html, _t) in faqs]

    title = (
        f"Bubble Number {D} — Free Printable Trace, Color & Print Outline | UltraTextGen"
    )
    meta = (
        f"Free printable bubble number {D} — a big, puffy {D} outline to trace, "
        f"color, print, or download as a PNG. No sign-up. Part of our A–Z and 0–9 "
        "printable bubble letters."
    )
    og_desc = (
        f"Free printable bubble number {D}. Trace, color, print, or download a big puffy "
        f"{D} outline — no sign-up."
    )

    breadcrumb = breadcrumb_ld(
        [
            ("Home", f"{SITE}/"),
            ("Printables", f"{SITE}/printables/"),
            ("Bubble Letters", f"{SITE}/printables/{slug}/"),
            (f"Bubble Number {D}", canonical),
        ]
    )
    ld = "\n\n".join([ldjson(breadcrumb), ldjson(faqpage_ld(faqs))])

    config = CONFIG_TEMPLATE.replace("__D__", D)

    return f"""<!DOCTYPE html><html lang="en"><head>
{GTM_HEAD}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc_attr(meta)}">
  <link rel="canonical" href="{esc_attr(canonical)}">
  <meta property="og:title" content="Bubble Number {esc(D)} — Free Printable Outline | UltraTextGen">
  <meta property="og:description" content="{esc_attr(og_desc)}">
  <meta property="og:url" content="{esc_attr(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{esc_attr(cfg["og_image"])}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Bubble Number {esc(D)} — Free Printable Outline">
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
  <a href="/printables/{slug}/">Bubble Letters</a>
  <span class="breadcrumb-separator">›</span>
  <span class="breadcrumb-current">Bubble Number {esc(D)}</span>
</nav>

  <section class="hero">
    <div class="hero-inner" style="max-width:820px;">
      <h1 class="hero-headline">Bubble Number {esc(D)}</h1>
      <p class="hero-tagline">
        A big, puffy bubble number {esc(D)} to trace, color, print, or download as a PNG —
        great for {esc(craft)}. Free, no sign-up.
      </p>
      <p class="pt-letter-figures" aria-hidden="true">{esc(D)}</p>
    </div>
  </section>

  <main class="container">

    <!-- Selected-digit detail (locked to this digit) -->
    <section class="bubble-az" aria-labelledby="ptLetterHeading">
      <h2 class="bubble-az-heading" id="ptLetterHeading">Trace and color bubble number {esc(D)}</h2>
      <p class="bubble-az-intro">Print this puffy outline to trace or color it in, or download it as a PNG.</p>
      <div class="bubble-letter-panel" id="pt-panel" aria-live="polite"></div>
    </section>

    <!-- Unique digit content (craft-framed, not a counting lesson) -->
    <section class="editorial-section">
      <h2>Bubble number {esc(D)} for {esc(craft)}</h2>
      <p>{esc(intro)}</p>
      <p class="bubble-az-intro">Prefer to copy and paste instead of print? Here is bubble number
        {esc(D)}: <strong>{filled} {circled} {light}</strong>. For a whole word or name in
        copy-paste bubble text, use the <a href="/category/bubble-fonts/">bubble fonts generator</a>.</p>
    </section>

    <!-- Sibling numbers -->
    <section class="editorial-section" aria-labelledby="ptStripHeading">
      <h2 id="ptStripHeading">Jump to another bubble number</h2>
      <nav class="pt-az-strip" aria-label="All bubble numbers 0 to 9">
        {digit_strip}
      </nav>
      <nav class="pt-letter-nav" aria-label="Previous and next number">
      {digit_nav}
      </nav>
    </section>

    <!-- Cross-links to the other printable looks of this digit -->
    <section class="related-pages">
      <h2>More printable bubble number {esc(D)} styles</h2>
      <div class="related-pages-grid">
        <a href="/printables/{slug}/" class="related-page-card">
          <span class="related-page-label">Hub</span>
          <h4>All bubble letters &amp; numbers</h4>
        </a>
        <a href="/printables/block-letters/#number-{D}" class="related-page-card">
          <span class="related-page-label">Stencil</span>
          <h4>Block number {esc(D)}</h4>
        </a>
        <a href="/printables/{slug}/letter-a/" class="related-page-card">
          <span class="related-page-label">Letters</span>
          <h4>Bubble letters A–Z</h4>
        </a>
      </div>
    </section>

    <div class="cta-card">
      <h3>Want bubble number {esc(D)} for a bio or caption?</h3>
      <p>These outlines are for paper. For copy-paste Unicode bubble text that pastes anywhere — no image needed — use the bubble fonts generator.</p>
      <a class="cta-btn" href="/category/bubble-fonts/">Open the bubble fonts generator →</a>
    </div>

  </main>

  <footer class="footer">
    <div class="footer-inner">
      <h2 class="faq-category">Bubble Number {esc(D)} — FAQ</h2>

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
    for key in ("slug", "font_query", "og_image"):
        if key not in cfg or cfg[key] in (None, ""):
            raise SpecError(f"cluster missing '{key}'")

    numbers = spec["numbers"]
    seen = [e.get("digit") for e in numbers]
    if seen != list(DIGITS):
        raise SpecError(
            "numbers must be exactly 0-9 in order; got: "
            + "".join(str(s) for s in seen)
        )
    for i, e in enumerate(numbers):
        for key in ("digit", "usecase", "craft", "intro", "draw"):
            if key not in e or e[key] in (None, "", []):
                raise SpecError(f"numbers[{i}] ({e.get('digit')}) missing '{key}'")


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

    targets = []
    for i, e in enumerate(spec["numbers"]):
        out = hub_dir / f"number-{e['digit']}" / "index.html"
        targets.append((out, render_spoke(spec, i)))

    if args.dry_run:
        for path, html_str in targets:
            print(
                f"[dry-run] would write {path.relative_to(REPO)} ({len(html_str)} bytes)"
            )
        print(f"[dry-run] {len(targets)} spoke pages OK (hub left untouched)")
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

    print(f"Wrote {len(targets)} spoke pages under printables/{slug}/number-*/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
