#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_bubble_letters_pages.py

Render the 26 per-letter SPOKE pages for the printable "bubble letters" cluster
from a single data spec (data/printables_bubble_letters.json):

  spoke  /printables/bubble-letters/letter-a/  ...  letter-z/   (×26)

The hub (/printables/bubble-letters/) is HAND-WRITTEN and hand-maintained — it
has bespoke sections (a name -> sheet tool) that a generator should not clobber —
so this script is deliberately SPOKE-ONLY and never touches the hub index.html.

Each spoke is a static, self-contained document following the repo's printables
conventions: GTM + ad snippets, canonical/OG/Twitter meta, BreadcrumbList +
FAQPage JSON-LD, shared header/footer injectors, and the shared
printablesEngine.js driven by a per-page window.UTG_PRINTABLE config whose
`initialChar` locks the engine to a single letter on load.

Content is craft-framed (banner / poster / bullet-journal / monogram / classroom
/ name-tag / scrapbook / gift-tag), NOT phonics — a bubble letter is a
decoration/identity job, not a "letter of the week" lesson. Each page also shows
2-3 real copy-paste Unicode bubble variants for its letter as plain static text,
pulled straight from styles.js so the glyphs are always correct.

Client-side only: the puffy letter outline is rendered by the engine as native
SVG/Canvas at runtime — no server-side image rendering, no bundled font binaries
(Fredoka loads from Google Fonts like the other printables pages).

Usage
-----
  python3 scripts/generate_bubble_letters_pages.py            # write all spokes
  python3 scripts/generate_bubble_letters_pages.py --dry-run  # validate only
  python3 scripts/generate_bubble_letters_pages.py --no-force # refuse overwrite
"""

import argparse
import html
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from lib.generator_parity import assert_no_regression  # noqa: E402
REPO = SCRIPT_DIR.parent
SPEC_PATH = REPO / "data" / "printables_bubble_letters.json"
STYLES_PATH = REPO / "styles.js"
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


def to_text(a_html):
    """Strip tags/entities from an answer's HTML to get its plain-text form."""
    return html.unescape(re.sub(r"<[^>]+>", "", a_html)).strip()


# --------------------------------------------------------------------------
# Real per-letter Unicode bubble glyphs, read straight from styles.js so they
# are never hand-transcribed. We index the canonical A-Z strings by position.
# --------------------------------------------------------------------------
def extract_glyphs(style_name, field):
    js = STYLES_PATH.read_text(encoding="utf-8")
    idx = js.find("'%s':" % style_name)
    if idx == -1:
        raise SpecError("style %r not found in styles.js" % style_name)
    seg = js[idx: idx + 900]
    m = re.search(field + r":\s*'([^']*)'", seg)
    if not m:
        raise SpecError("field %r not found for style %r" % (field, style_name))
    s = m.group(1)
    if len(s) != 26:
        raise SpecError(
            "%s.%s has %d glyphs, expected 26" % (style_name, field, len(s))
        )
    return s


FILLED_UPPER = extract_glyphs("Ultra Bubble Filled", "upper")  # 🅐 (the puffiest)
CIRCLED_UPPER = extract_glyphs("Ultra Bubble", "upper")        # Ⓐ
LIGHT_LOWER = extract_glyphs("Ultra Bubble Light", "lower")    # ⒜


# --------------------------------------------------------------------------
# Shared fragments (mirrors scripts/generate_alphabet_coloring_pages.py)
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
# locked single-letter panel renders identically), with initialChar appended.
# __L__ is substituted per page; {ch} is a literal placeholder the engine itself
# expands at runtime, so it is left untouched here.
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
      initialChar: "__L__"
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
# Per-page print guidance
# --------------------------------------------------------------------------
# The shared line these replace ("Everything runs in your browser - no app or
# sign-up.") was one string on 184 generated pages. It also asserted a benefit
# instead of describing behaviour, which is the shape the editorial phrase bank
# calls a generic claim.
#
# Each entry below states something true and USEFUL about printing this
# particular kind of sheet, keyed on the page's own `usecase`. That is the
# transformation docs/editorial-footprint-risk.md asks for - generic claim to
# concrete information - and it is deliberately NOT a synonym rotation: Google's
# spam policy names "automated transformations like synonymizing" as scaled
# content abuse, so trading words while keeping the same empty sentence would
# move the wrong way.
#
# Keep these accurate. A print-dialog behaviour stated here has to be one the
# reader will actually find in Chrome, Edge, Safari or Firefox.
PRINT_NOTES = {
    "monogram": (
        "At 100% scale the outline fills a folded A6 card front; raise the scale in "
        "the print dialog for a framed print."
    ),
    "poster": (
        "The outline is vector, so raising the scale in the print dialog keeps the "
        "edges crisp instead of pixelating them."
    ),
    "banner": (
        "Print one character per sheet at full scale, then trim the margins and tape "
        "the sheets edge to edge."
    ),
    "classroom": (
        "The PNG is high-resolution enough to survive a photocopier, so one print can "
        "become a class set."
    ),
    "bujo": (
        "Drop the scale to around 40% in the print dialog to fit several on one page "
        "for cutting out."
    ),
    "scrapbook": (
        "The PNG has a transparent background, so it drops straight into a photo-book "
        "layout without a white box around it."
    ),
    "gifttag": (
        "Reduce the scale and print several per sheet, then cut them apart and punch a "
        "corner for ribbon."
    ),
    "nametag": (
        "Print at a reduced scale for a badge, or full scale for a door or locker sign."
    ),
    "milestone": (
        "Choose \u201cSave as PDF\u201d as the print destination if you are sending it to a "
        "print shop rather than a home printer."
    ),
    "birthday": (
        "Print one digit per sheet and tape them together for a bunting-style number."
    ),
    "houseNumber": (
        "Raise the scale in the print dialog until the digit measures what you need, "
        "then trace it onto card or vinyl."
    ),
    "jersey": (
        "Print at full scale and use the outline as a cutting template for iron-on vinyl."
    ),
    "countdown": (
        "Print the digits you need in one run, then flip a sheet each day."
    ),
}
DEFAULT_PRINT_NOTE = (
    "Both buttons act on this page only, so nothing else in the set is sent to the "
    "printer."
)


def print_note(usecase):
    """Concrete, page-appropriate printing guidance. Never a generic benefit line."""
    return PRINT_NOTES.get(usecase, DEFAULT_PRINT_NOTE)


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
    i = ord(L) - ord("A")
    craft = e["craft"]
    usecase = e.get("usecase", "")
    intro = e["intro"]
    draw = e["draw"]
    canonical = f"{SITE}/printables/{slug}/letter-{low}/"

    filled, circled, light = FILLED_UPPER[i], CIRCLED_UPPER[i], LIGHT_LOWER[i]

    prev_e = letters[index - 1] if index > 0 else None
    next_e = letters[index + 1] if index < len(letters) - 1 else None

    # Compact linked A-Z strip.
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
            f'← Bubble letter {esc(prev_e["letter"])}</a>'
        )
    else:
        nav_bits.append('<span class="pt-nav-spacer"></span>')
    nav_bits.append('<span class="pt-nav-spacer"></span>')
    if next_e:
        nav_bits.append(
            f'<a href="/printables/{slug}/letter-{next_e["letter"].lower()}/" rel="next">'
            f'Bubble letter {esc(next_e["letter"])} →</a>'
        )
    letter_nav = "\n      ".join(nav_bits)

    faqs = [
        (
            f"What is on the bubble letter {L} page?",
            f"A large capital {esc(L)} and lowercase {esc(low)} shown as a rounded, puffy "
            f"bubble outline. Use <strong>Print this letter</strong> to print it for tracing "
            f"or colouring, or <strong>Download PNG</strong> to save it. The shape suits "
            f"{esc(craft)}.",
            None,
        ),
        (
            f"How do I print or download bubble letter {L}?",
            f"Use <strong>Print this letter</strong> to send just the {esc(L)} outline to your "
            "printer, or <strong>Download PNG</strong> to save a high-resolution image. The "
            "sheet is drawn in the page itself, so nothing is uploaded and no account is "
            f"needed. {esc(print_note(usecase))}",
            None,
        ),
        (
            f"How do I draw a bubble letter {L} by hand?",
            f"{esc(draw)} Then erase the guide lines, ink the outline, and colour it in. "
            "Printing the outline above and tracing over it a few times is the quickest way to "
            "learn the shape.",
            None,
        ),
        (
            "Do you have the other letters in bubble writing?",
            'All 26 letters have their own page, and so do the digits 0 to 9. Head back to '
            f'<a href="/printables/{slug}/">Printable Bubble Letters</a> for the whole set, '
            "or jump to another letter with the strip above.",
            None,
        ),
    ]
    faqs = [(q, a_html, to_text(a_html)) for (q, a_html, _t) in faqs]

    title = (
        f"Bubble Letter {L} — Free Printable Trace, Color & Print Outline | UltraTextGen"
    )
    meta = (
        f"Free printable bubble letter {L} — a big, puffy {L}/{low} outline to trace, "
        f"color, print, or download as a PNG. No sign-up. Part of our A–Z printable "
        "bubble letters."
    )
    og_desc = (
        f"Free printable bubble letter {L}. Trace, color, print, or download a big puffy "
        f"{L}/{low} outline — no sign-up."
    )

    breadcrumb = breadcrumb_ld(
        [
            ("Home", f"{SITE}/"),
            ("Printables", f"{SITE}/printables/"),
            ("Bubble Letters", f"{SITE}/printables/{slug}/"),
            (f"Bubble Letter {L}", canonical),
        ]
    )
    ld = "\n\n".join([ldjson(breadcrumb), ldjson(faqpage_ld(faqs))])

    config = CONFIG_TEMPLATE.replace("__L__", L)

    return f"""<!DOCTYPE html><html lang="en"><head>
{funding_choices_tag()}
{GTM_HEAD}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc_attr(meta)}">
  <link rel="canonical" href="{esc_attr(canonical)}">
  <meta property="og:title" content="Bubble Letter {esc(L)} — Free Printable Outline | UltraTextGen">
  <meta property="og:description" content="{esc_attr(og_desc)}">
  <meta property="og:url" content="{esc_attr(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{esc_attr(cfg["og_image"])}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Bubble Letter {esc(L)} — Free Printable Outline">
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
  <span class="breadcrumb-current">Bubble Letter {esc(L)}</span>
</nav>

  <section class="hero">
    <div class="hero-inner" style="max-width:820px;">
      <h1 class="hero-headline">Bubble Letter {esc(L)}</h1>
      <p class="hero-tagline">
        A big, puffy bubble letter {esc(L)} to trace, color, print, or download as a PNG —
        great for {esc(craft)}. Free, no sign-up.
      </p>
      <p class="pt-letter-figures" aria-hidden="true">{esc(L)}{esc(low)}</p>
    </div>
  </section>

  <main class="container">

    <!-- Selected-letter detail (locked to this letter) -->
    <section class="bubble-az" aria-labelledby="ptLetterHeading">
      <h2 class="bubble-az-heading" id="ptLetterHeading">Trace and color bubble letter {esc(L)}</h2>
      <p class="bubble-az-intro">Print this puffy outline to trace or color it in, or download it as a PNG.</p>
      <div class="bubble-letter-panel" id="pt-panel" aria-live="polite"></div>
    </section>

    <!-- Unique letter content (craft-framed, not phonics) -->
    <section class="editorial-section">
      <h2>Bubble letter {esc(L)} for {esc(craft)}</h2>
      <p>{esc(intro)}</p>
      <p class="bubble-az-intro">Prefer to copy and paste instead of print? Here is bubble letter
        {esc(L)}: <strong>{filled} {circled} {light}</strong>. For a whole word or name in
        copy-paste bubble text, use the <a href="/category/bubble-fonts/">bubble fonts generator</a>.</p>
    </section>

    <!-- Sibling letters -->
    <section class="editorial-section" aria-labelledby="ptStripHeading">
      <h2 id="ptStripHeading">Jump to another bubble letter</h2>
      <nav class="pt-az-strip" aria-label="All bubble letters A to Z">
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
          <h4>All bubble letters A–Z</h4>
        </a>
        <a href="/printables/alphabet-coloring-pages/letter-{low}/" class="related-page-card">
          <span class="related-page-label">Coloring</span>
          <h4>Letter {esc(L)} coloring page</h4>
        </a>
        <a href="/printables/dot-to-dot-alphabet/letter-{low}/" class="related-page-card">
          <span class="related-page-label">Puzzle</span>
          <h4>Letter {esc(L)} dot-to-dot</h4>
        </a>
        <a href="/printables/block-letters/#letter-{low}" class="related-page-card">
          <span class="related-page-label">Stencil</span>
          <h4>Block letter {esc(L)}</h4>
        </a>
      </div>
    </section>

    <div class="cta-card">
      <h3>Want bubble letter {esc(L)} for a bio or caption?</h3>
      <p>These outlines are for paper. For copy-paste Unicode bubble text that pastes anywhere — no image needed — use the bubble fonts generator.</p>
      <a class="cta-btn" href="/category/bubble-fonts/">Open the bubble fonts generator →</a>
    </div>


      <h2 class="faq-category">Bubble Letter {esc(L)} — FAQ</h2>

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
    for key in ("slug", "font_query", "og_image"):
        if key not in cfg or cfg[key] in (None, ""):
            raise SpecError(f"cluster missing '{key}'")

    letters = spec["letters"]
    seen = [e.get("letter") for e in letters]
    if seen != list(ALPHABET):
        raise SpecError(
            "letters must be exactly A–Z in order; got: "
            + "".join(str(s) for s in seen)
        )
    for i, e in enumerate(letters):
        for key in ("letter", "usecase", "craft", "intro", "draw"):
            if key not in e or e[key] in (None, "", []):
                raise SpecError(f"letters[{i}] ({e.get('letter')}) missing '{key}'")


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

    targets = []
    for i, e in enumerate(spec["letters"]):
        out = hub_dir / f"letter-{e['letter'].lower()}" / "index.html"
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

    assert_no_regression(targets, force=args.force_stale)


    for path, html_str in targets:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html_str, encoding="utf-8")

    print(f"Wrote {len(targets)} spoke pages under printables/{slug}/letter-*/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
