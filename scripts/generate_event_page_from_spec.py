#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_event_page_from_spec.py

Render a single /events/<slug>/ page from a JSON spec living in
data/event_page_specs/. Mirrors generate_library_page_from_spec.py's
validate-then-render structure (required-field checks, refuse-to-overwrite
without --force, --dry-run support) but is tailored to event pages:

  - Emits the mode-takeover boilerplate (`window.UTG_EVENT_MODE = true`)
    plus an inline `window.UTG_EVENT_DATA = {...}` block built from the
    spec, in the script order js/events/eventPageController.js expects:
    UTG_EVENT_MODE/UTG_EVENT_DATA (inline) -> styles.js -> renderer.js ->
    script.js (defer) -> js/events/eventPageController.js (defer) ->
    symbol-explorer.js (defer) -> footer.js.
  - JSON-LD stack is FAQPage + BreadcrumbList (Home > Events > <event_name>)
    + WebApplication — deliberately NO Article (an /events/ hub page is a
    live tool, not an editorial piece).
  - The FAQ is synthesized from the spec's own fields (event_name,
    date_window, companion_answer_slug, ...) rather than hand-authored, so
    a minimal spec still produces a valid, accurate FAQPage.

Usage
-----
  python3 scripts/generate_event_page_from_spec.py SPEC.json
  python3 scripts/generate_event_page_from_spec.py data/event_page_specs/chinese-new-year.json
  python3 scripts/generate_event_page_from_spec.py SPEC.json --dry-run

The script refuses to overwrite an existing page unless --force is given.
"""

import argparse
import html
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
EVENTS_DIR = REPO / "events"
SPECS_DIR = REPO / "data" / "event_page_specs"

SITE = "https://ultratextgen.com"

REQUIRED_TOP = [
    "slug",
    "event_name",
    "title",
    "meta_description",
    "hero_h1",
    "hero_tagline",
    "intro",
    "date_window",
    "fonts",
    "emoji_symbol_collections",
    "kaomoji",
    "ascii_art",
    "phrase_bank",
    "related",
]

VALID_PRESENTATION_CLASSES = ("symbol", "emoji", "emoticon", "kaomoji")
VALID_COPY_PATTERNS = ("single", "combo", "collection", "section", "transform")


class SpecError(Exception):
    """Raised when a spec fails validation."""


def esc(text):
    """HTML-escape text content."""
    return html.escape(str(text), quote=False)


def esc_attr(text):
    """HTML-escape for use inside a double-quoted attribute."""
    return html.escape(str(text), quote=True)


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------
def validate_spec(spec):
    missing = [k for k in REQUIRED_TOP if k not in spec or spec[k] in (None, "")]
    if missing:
        raise SpecError(f"missing required field(s): {', '.join(missing)}")

    fonts = spec["fonts"]
    if not isinstance(fonts, dict):
        raise SpecError("fonts must be an object with a 'curated_keys' list")
    keys = fonts.get("curated_keys")
    if not isinstance(keys, list) or not keys or not all(isinstance(k, str) and k for k in keys):
        raise SpecError("fonts.curated_keys must be a non-empty list of non-empty strings")

    collections = spec["emoji_symbol_collections"]
    if not isinstance(collections, list) or not collections:
        raise SpecError("emoji_symbol_collections must be a non-empty list")
    for i, col in enumerate(collections):
        for key in ("name", "presentation_class", "copy_pattern", "flags"):
            if key not in col or col[key] in (None, ""):
                raise SpecError(f"emoji_symbol_collections[{i}] missing '{key}'")
        if col["presentation_class"] not in VALID_PRESENTATION_CLASSES:
            raise SpecError(
                f"emoji_symbol_collections[{i}].presentation_class must be one of "
                f"{VALID_PRESENTATION_CLASSES}, got {col['presentation_class']!r}"
            )
        if col["copy_pattern"] not in VALID_COPY_PATTERNS:
            raise SpecError(
                f"emoji_symbol_collections[{i}].copy_pattern must be one of "
                f"{VALID_COPY_PATTERNS}, got {col['copy_pattern']!r}"
            )
        if not isinstance(col["flags"], list) or not col["flags"]:
            raise SpecError(f"emoji_symbol_collections[{i}].flags must be a non-empty list")

    kaomoji = spec["kaomoji"]
    if not isinstance(kaomoji, list) or not kaomoji:
        raise SpecError("kaomoji must be a non-empty list")
    for i, k in enumerate(kaomoji):
        for key in ("text", "label"):
            if key not in k or not k[key]:
                raise SpecError(f"kaomoji[{i}] missing '{key}'")

    ascii_art = spec["ascii_art"]
    if not isinstance(ascii_art, dict):
        raise SpecError("ascii_art must be an object with an 'items' list")
    items = ascii_art.get("items")
    if not isinstance(items, list) or not items:
        raise SpecError("ascii_art.items must be a non-empty list")
    for i, a in enumerate(items):
        for key in ("art", "label"):
            if key not in a or not a[key]:
                raise SpecError(f"ascii_art.items[{i}] missing '{key}'")

    phrase_bank = spec["phrase_bank"]
    if not isinstance(phrase_bank, list) or not phrase_bank:
        raise SpecError("phrase_bank must be a non-empty list")
    for i, p in enumerate(phrase_bank):
        for key in ("text", "native_script", "romanization", "translation"):
            if key not in p or not p[key]:
                raise SpecError(f"phrase_bank[{i}] missing '{key}'")

    related = spec["related"]
    if not isinstance(related, list) or not related:
        raise SpecError("related must be a non-empty list")
    for i, rel in enumerate(related):
        for key in ("href", "title", "desc"):
            if key not in rel or not rel[key]:
                raise SpecError(f"related[{i}] missing '{key}'")

    aliases = spec.get("aliases", [])
    if aliases is not None and not isinstance(aliases, list):
        raise SpecError("aliases, if present, must be a list of strings")


# --------------------------------------------------------------------------
# Rendering helpers
# --------------------------------------------------------------------------
def render_event_data(spec):
    """Build the inline window.UTG_EVENT_DATA object the controller reads."""
    collections = [
        {
            "name": c["name"],
            "flags": c["flags"],
            "defaultFormat": c.get("defaultFormat", "inline"),
        }
        for c in spec["emoji_symbol_collections"]
    ]
    event_data = {
        "slug": spec["slug"],
        "eventName": spec["event_name"],
        "aliases": spec.get("aliases", []),
        "samplePhrase": spec.get("sample_phrase", spec["event_name"]),
        "fonts": {"curatedKeys": spec["fonts"]["curated_keys"]},
        "emojiCollections": {
            "containerId": "eventEmojiGrids",
            "groups": collections,
        },
        "kaomoji": [
            {"text": k["text"], "label": k["label"]} for k in spec["kaomoji"]
        ],
        "asciiArt": [
            {"art": a["art"], "label": a["label"]} for a in spec["ascii_art"]["items"]
        ],
        "phraseBank": [
            {
                "text": p["text"],
                "nativeScript": p["native_script"],
                "romanization": p["romanization"],
                "translation": p["translation"],
            }
            for p in spec["phrase_bank"]
        ],
    }
    return json.dumps(event_data, indent=2, ensure_ascii=False)


def synthesize_faq(spec):
    """Build FAQ Q&A from the spec's own fields — no separate 'faq' field
    needs to be authored; every event page gets a valid, accurate FAQPage."""
    event_name = spec["event_name"]
    faqs = [
        {
            "q": f"What is the {event_name} text and symbol generator?",
            "a": html.unescape(spec["intro"]),
        },
        {
            "q": f"When is {event_name}?",
            "a": f"{event_name} falls {spec['date_window']}. Check a current calendar for "
                 f"the exact date, then come back and style your greeting for it.",
        },
        {
            "q": f"How do I use the {event_name} generator?",
            "a": f"Type a name, wish, or greeting into the box at the top. Every "
                 f"{event_name} font style updates live underneath it — tap Copy on any "
                 f"card. Below that, tap any emoji, symbol, kaomoji, or ASCII art piece to "
                 f"copy it on its own, or tap a phrase-bank card to drop a ready-made "
                 f"greeting into the box and see it restyled instantly.",
        },
    ]
    if spec.get("companion_answer_slug"):
        faqs.append({
            "q": f"Where can I find more {event_name} phrases and what to write?",
            "a": f"See "
                 f"<a href=\"{SITE}/answers/{esc_attr(spec['companion_answer_slug'])}/\">"
                 f"our full answer</a> for more greetings, translations, and message ideas.",
        })
    return faqs


def render_ld_json(spec, faqs):
    slug = spec["slug"]
    event_name = spec["event_name"]
    canonical = spec.get("canonical") or f"{SITE}/events/{slug}/"
    aliases = spec.get("aliases") or []

    alt_names = []
    for name in list(aliases) + [
        f"{event_name} Fonts",
        f"{event_name} Symbols",
        f"{event_name} Text Generator",
    ]:
        if name and name not in alt_names:
            alt_names.append(name)
    alt_names = alt_names[:8]

    ld_webapp = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": f"{event_name} Text & Symbol Generator",
        "alternateName": alt_names,
        "url": canonical,
        "inLanguage": "en",
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Any",
        "description": html.unescape(spec["hero_tagline"]),
        "featureList": [
            f"Live {event_name} font styles for any text you type",
            f"Curated {event_name} emoji & symbol collection",
            f"{event_name} kaomoji",
            f"Curated {event_name} ASCII art",
            f"Click-to-style {event_name} phrase bank (native script, romanization, translation)",
        ],
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
    }

    ld_faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "inLanguage": "en",
        "mainEntity": [
            {
                "@type": "Question",
                "name": html.unescape(f["q"]),
                "acceptedAnswer": {"@type": "Answer", "text": f["a"]},
            }
            for f in faqs
        ],
    }

    ld_breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "Events", "item": f"{SITE}/events/"},
            {"@type": "ListItem", "position": 3, "name": html.unescape(event_name), "item": canonical},
        ],
    }

    dump = lambda obj: json.dumps(obj, indent=2, ensure_ascii=False)
    return dump(ld_webapp), dump(ld_faq), dump(ld_breadcrumb)


def render_faq_html(faqs):
    items = []
    for f in faqs:
        items.append(
            '    <div class="faq-item">\n'
            '      <button class="faq-question" type="button">'
            f'{esc(f["q"])}'
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" '
            'stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" '
            'stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>\n'
            f'      <div class="faq-answer">{f["a"]}</div>\n'
            "    </div>"
        )
    return "\n".join(items)


def render_related(related, companion_answer_slug):
    cards = []
    for rel in related:
        cards.append(
            f'    <a href="{esc_attr(rel["href"])}" '
            'class="compare-card variant-muted u-no-underline">\n'
            f'      <h4>{esc(rel["title"])}</h4>\n'
            f'      <p>{esc(rel["desc"])}</p>\n'
            "    </a>"
        )
    if companion_answer_slug:
        cards.append(
            f'    <a href="/answers/{esc_attr(companion_answer_slug)}/" '
            'class="compare-card variant-muted u-no-underline">\n'
            "      <h4>Is styled text safe to use?</h4>\n"
            "      <p>The honest answer on reach, search visibility, and accessibility.</p>\n"
            "    </a>"
        )
    return "\n".join(cards)


def render_page(spec):
    slug = spec["slug"]
    event_name = spec["event_name"]
    title = spec["title"]
    meta = spec["meta_description"]
    canonical = spec.get("canonical") or f"{SITE}/events/{slug}/"
    aliases = spec.get("aliases") or []
    companion_answer_slug = spec.get("companion_answer_slug")

    faqs = synthesize_faq(spec)
    ld_webapp, ld_faq, ld_breadcrumb = render_ld_json(spec, faqs)
    event_data_json = render_event_data(spec)
    faq_html = render_faq_html(faqs)
    related_html = render_related(spec["related"], companion_answer_slug)

    aka_html = ""
    if aliases:
        aka_html = (
            '<p class="u-secondary-tight">Also known as: '
            + ", ".join(esc(a) for a in aliases)
            + "</p>\n      "
        )

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':
  new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  }})(window,document,'script','dataLayer','GTM-P55HXK8Q');</script>
  <!-- End Google Tag Manager -->
  <script data-grow-initializer="">!(function(){{window.growMe||((window.growMe=function(e){{window.growMe._.push(e);}}),(window.growMe._=[]));var e=document.createElement("script");(e.type="text/javascript"),(e.src="https://faves.grow.me/main.js"),(e.defer=!0),e.setAttribute("data-grow-faves-site-id","U2l0ZTplMzgxNTIwYS1jYTIzLTQ4Y2EtYTA2Ni04M2M0MjBkZGRkZWE=");var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t);}})();</script>
  <script type="text/javascript" async="async" data-noptimize="1" data-cfasync="false" src="//scripts.scriptwrapper.com/tags/e381520a-ca23-48ca-a066-83c420ddddea.js"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>{esc(title)}</title>
  <meta name="description" content="{esc_attr(meta)}">
  <link rel="canonical" href="{esc_attr(canonical)}">
  <meta property="og:title" content="{esc_attr(title)}">
  <meta property="og:description" content="{esc_attr(meta)}">
  <meta property="og:url" content="{esc_attr(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{SITE}/assets/og/category.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc_attr(title)}">
  <meta name="twitter:description" content="{esc_attr(meta)}">
  <meta name="twitter:image" content="{SITE}/assets/og/category.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/symbol-explorer.css">

<script type="application/ld+json">
{ld_webapp}
</script>

<script type="application/ld+json">
{ld_faq}
</script>

<script type="application/ld+json">
{ld_breadcrumb}
</script>
</head>
<body>
  <script>try{{if(localStorage.getItem("darkMode")==="true")document.body.classList.add("dark-mode")}}catch(e){{}}</script>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P55HXK8Q"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
  <div id="shared-header"></div>
<script src="/header.js" defer></script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  <a href="/">Home</a>
  <span class="breadcrumb-separator">›</span>
  <a href="/events/">Events</a>
  <span class="breadcrumb-separator">›</span>
  <span class="breadcrumb-current">{esc(event_name)}</span>
</nav>

<section class="hero">
  <div class="hero-inner">
    <div class="hero-card">
      <h1 class="hero-headline">{esc(spec["hero_h1"])}</h1>
      <p class="hero-tagline">{esc(spec["hero_tagline"])}</p>
      {aka_html}<div class="input-wrapper" id="eventTextWrap">
        <textarea class="main-input" id="mainInput" placeholder="Type a name, wish, or greeting..." maxlength="500" autofocus></textarea>
        <span class="char-count"><span id="charCount">0</span>/500</span>
      </div>
    </div>
  </div>
</section>

<main class="container">
  <section class="editorial-section">
    <div class="editorial-block">
      <p>{esc(spec["intro"])}</p>
    </div>
    <div class="block-example">
      <strong>{esc(event_name)}:</strong> {esc(spec["date_window"])}
    </div>
  </section>

  <div class="section-divider"></div>

  <section class="editorial-section" id="eventFontsSection">
    <span class="article-section-label">Fonts</span>
    <h2>{esc(event_name)} Fonts</h2>
    <p class="editorial-intro">Type your text above and every style below updates live. Tap Copy on the one you like.</p>
    <div class="results-grid" id="eventFontsGrid"></div>
  </section>

  <div class="section-divider"></div>

  <section class="editorial-section" id="eventEmojiSection">
    <span class="article-section-label">Emoji &amp; Symbols</span>
    <h2>{esc(event_name)} Emoji &amp; Symbols</h2>
    <p class="editorial-intro">Tap any character to copy it, or copy a whole set at once in your preferred format.</p>
    <div id="eventEmojiGrids"></div>
  </section>

  <div class="section-divider"></div>

  <section class="editorial-section" id="eventKaomojiSection">
    <span class="article-section-label">Kaomoji</span>
    <h2>{esc(event_name)} Kaomoji</h2>
    <p class="editorial-intro">Each tile is a whole kaomoji — tap to copy the full string in one click.</p>
    <div class="glyph-grid" id="eventKaomojiGrid"></div>
  </section>

  <div class="section-divider"></div>

  <section class="editorial-section" id="eventAsciiSection">
    <span class="article-section-label">ASCII Art</span>
    <h2>{esc(event_name)} ASCII Art</h2>
    <p class="editorial-intro">Curated multi-line pieces — tap Copy to grab one with its line breaks and spacing intact.</p>
    <div class="art-piece-grid" id="eventAsciiGrid"></div>
    <p class="u-secondary-tight u-mt-15">Want to type your own name or message into a live block-letter banner instead? Try the <a href="/ascii-art-generator/">ASCII Art Generator</a>.</p>
  </section>

  <div class="section-divider"></div>

  <section class="editorial-section" id="eventPhraseSection">
    <span class="article-section-label">Phrase Bank</span>
    <h2>{esc(event_name)} Phrase Bank</h2>
    <p class="editorial-intro">Tap a phrase to drop it into the box up top and see every font style above restyle it instantly.</p>
    <div class="compare-grid" id="eventPhraseGrid"></div>
  </section>

  <div class="section-divider"></div>

  <div class="cta-card">
    <h3>Transform text with Unicode fonts</h3>
    <p>Use UltraTextGen to convert plain text into bold, italic, cursive, and 100+ other Unicode font styles — free and instant.</p>
    <a href="{SITE}/" class="cta-btn">Open UltraTextGen →</a>
  </div>

  <section class="editorial-section">
    <span class="article-section-label">Related Resources</span>
    <div class="compare-grid">
{related_html}
    </div>
  </section>
</main>

<footer class="footer">
  <div class="footer-inner">
    <h2 class="faq-category">{esc(event_name)} questions</h2>
{faq_html}
  </div>
</footer>

<!-- TOAST -->
<div class="copy-toast" id="copyToast">Copied!</div>
<div class="symbol-toast" id="symbolToast" aria-live="polite"></div>

<script>window.UTG_EVENT_MODE = true;</script>
<script>window.UTG_EVENT_DATA = {event_data_json};</script>
<script src="/styles.js" defer></script>
<script src="/renderer.js" defer></script>
<script src="/script.js" defer></script>
<script src="/js/events/eventPageController.js" defer></script>
<script src="/symbol-explorer.js" defer></script>
<script src="/footer.js"></script>
</body>
</html>
"""
    return page


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def resolve_spec_path(arg):
    p = Path(arg)
    if p.exists():
        return p
    candidate = SPECS_DIR / arg
    if candidate.exists():
        return candidate
    candidate = SPECS_DIR / f"{arg}.json"
    if candidate.exists():
        return candidate
    raise SpecError(f"spec file not found: {arg}")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("spec", help="path to a JSON spec (or a slug under data/event_page_specs/)")
    parser.add_argument("--dry-run", action="store_true",
                        help="validate and print target path without writing")
    parser.add_argument("--force", action="store_true",
                        help="overwrite an existing page")
    args = parser.parse_args(argv)

    try:
        spec_path = resolve_spec_path(args.spec)
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
        validate_spec(spec)
    except SpecError as exc:
        sys.stderr.write(f"[error] {exc}\n")
        return 2
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"[error] invalid JSON in spec: {exc}\n")
        return 2

    slug = spec["slug"]
    out_dir = EVENTS_DIR / slug
    out_path = out_dir / "index.html"

    if out_path.exists() and not args.force and not args.dry_run:
        sys.stderr.write(
            f"[error] {out_path.relative_to(REPO)} already exists; "
            "pass --force to overwrite\n"
        )
        return 3

    page = render_page(spec)

    if args.dry_run:
        print(f"[dry-run] spec OK -> would write {out_path.relative_to(REPO)} "
              f"({len(page)} bytes, fonts={len(spec['fonts']['curated_keys'])}, "
              f"emoji_collections={len(spec['emoji_symbol_collections'])}, "
              f"kaomoji={len(spec['kaomoji'])}, "
              f"ascii_art={len(spec['ascii_art']['items'])}, "
              f"phrases={len(spec['phrase_bank'])})")
        return 0

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(page, encoding="utf-8")
    print(f"Wrote {out_path.relative_to(REPO)} "
          f"(fonts={len(spec['fonts']['curated_keys'])}, "
          f"emoji_collections={len(spec['emoji_symbol_collections'])}, "
          f"kaomoji={len(spec['kaomoji'])}, "
          f"ascii_art={len(spec['ascii_art']['items'])}, "
          f"phrases={len(spec['phrase_bank'])})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
