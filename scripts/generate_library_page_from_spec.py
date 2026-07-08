#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_library_page_from_spec.py

Render a single Unicode library page from a JSON spec living in
data/library_page_specs/. The generated HTML follows the existing
/library/ page conventions exactly: GTM + ad snippets, canonical/OG/Twitter
meta, Article + BreadcrumbList JSON-LD, shared header/footer injectors,
the symbol-explorer runtime, and a #symbolToast region.

Two copy patterns are supported:

  single      Symbols are rendered as individual `.symbol-tile` buttons
              carrying `data-symbol` + `aria-label`. Clicking copies one
              character. Used for browse-and-copy reference pages.

  collection  In addition to (optional) single sections, the page emits a
              container that is populated at runtime by
              `UltraTextGen.buildGrids(containerId, GROUPS)` so visitors can
              copy a whole set in a chosen format. Used for set-oriented
              pages (zodiac signs, chess sides, etc.).

Usage
-----
  python3 scripts/generate_library_page_from_spec.py SPEC.json
  python3 scripts/generate_library_page_from_spec.py data/library_page_specs/star-symbols.json
  python3 scripts/generate_library_page_from_spec.py SPEC.json --dry-run

The script refuses to overwrite an existing page unless --force is given.
"""

import argparse
import html
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
LIBRARY_DIR = REPO / "library"
SPECS_DIR = REPO / "data" / "library_page_specs"

SITE = "https://ultratextgen.com"

REQUIRED_TOP = [
    "slug",
    "title",
    "meta_description",
    "hero_h1",
    "hero_tagline",
    "intro",
    "copy_pattern",
    "sections",
    "related",
]


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

    pattern = spec["copy_pattern"]
    if pattern not in ("single", "collection"):
        raise SpecError(
            f"copy_pattern must be 'single' or 'collection', got {pattern!r}"
        )

    sections = spec["sections"]
    if not isinstance(sections, list) or len(sections) < 1:
        raise SpecError("sections must be a non-empty list")

    for i, sec in enumerate(sections):
        for key in ("id", "h2", "symbols"):
            if key not in sec:
                raise SpecError(f"sections[{i}] missing '{key}'")
        if not isinstance(sec["symbols"], list) or not sec["symbols"]:
            raise SpecError(f"sections[{i}].symbols must be a non-empty list")
        for j, sym in enumerate(sec["symbols"]):
            if "char" not in sym or sym["char"] in (None, ""):
                raise SpecError(f"sections[{i}].symbols[{j}] missing 'char'")
            if "label" not in sym or sym["label"] in (None, ""):
                raise SpecError(f"sections[{i}].symbols[{j}] missing 'label'")

    # The validator downstream requires at least 3 H2s. Each section is one
    # H2; a collection section adds one more.
    h2_count = len(sections) + (1 if pattern == "collection" else 0)
    if h2_count < 3:
        raise SpecError(
            f"need at least 3 H2 sections (have {h2_count}); add more sections"
        )

    if pattern == "collection":
        collections = spec.get("collections")
        if not isinstance(collections, list) or not collections:
            raise SpecError(
                "copy_pattern 'collection' requires a non-empty 'collections' list"
            )
        for i, col in enumerate(collections):
            if "name" not in col or not col["name"]:
                raise SpecError(f"collections[{i}] missing 'name'")
            flags = col.get("flags")
            if not isinstance(flags, list) or not flags:
                raise SpecError(f"collections[{i}].flags must be a non-empty list")

    related = spec["related"]
    if not isinstance(related, list) or not related:
        raise SpecError("related must be a non-empty list")
    for i, rel in enumerate(related):
        for key in ("href", "title", "desc"):
            if key not in rel or not rel[key]:
                raise SpecError(f"related[{i}] missing '{key}'")


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------
def render_symbol_section(sec):
    rows = []
    for sym in sec["symbols"]:
        ch = sym["char"]
        label = sym["label"]
        rows.append(
            '    <div class="flag-row">\n'
            f'      <button class="flag-emoji symbol-tile" '
            f'data-symbol="{esc_attr(ch)}" '
            f'aria-label="Copy {esc_attr(label)}">{esc(ch)}</button>\n'
            f'      <span class="flag-label">{esc(label)}</span>\n'
            '    </div>'
        )
    label_html = (
        f'  <span class="article-section-label">{esc(sec["label"])}</span>\n'
        if sec.get("label")
        else ""
    )
    intro_html = (
        f'  <p class="u-secondary-tight">{esc(sec["intro"])}</p>\n'
        if sec.get("intro")
        else ""
    )
    return (
        f'<section class="mood-explainers" id="{esc_attr(sec["id"])}">\n'
        f"{label_html}"
        f'  <h2>{esc(sec["h2"])}</h2>\n'
        f"{intro_html}"
        '  <div class="flag-rows">\n'
        + "\n".join(rows)
        + "\n  </div>\n"
        "</section>"
    )


def render_collection_section(spec):
    sec = spec.get("collection_section") or {}
    cid = spec.get("collection_container_id", "collectionsContainer")
    label = sec.get("label", "Collections")
    h2 = sec.get("h2", "Symbol Sets")
    intro = sec.get(
        "intro", "Copy a full set at once in your preferred format."
    )
    return (
        f'<section class="mood-explainers" id="{esc_attr(sec.get("id", "collections"))}">\n'
        f'  <span class="article-section-label">{esc(label)}</span>\n'
        f"  <h2>{esc(h2)}</h2>\n"
        f'  <p class="u-secondary-block">{esc(intro)}</p>\n'
        f'  <div id="{esc_attr(cid)}"></div>\n'
        "</section>"
    )


def render_related(related):
    cards = []
    for rel in related:
        cards.append(
            f'    <a href="{esc_attr(rel["href"])}" '
            'class="compare-card variant-muted u-no-underline">\n'
            f'      <h4>{esc(rel["title"])}</h4>\n'
            f'      <p>{esc(rel["desc"])}</p>\n'
            "    </a>"
        )
    return "\n".join(cards)


def render_buildgrids_script(spec):
    cid = spec.get("collection_container_id", "collectionsContainer")
    groups = []
    for col in spec["collections"]:
        flags = json.dumps(col["flags"], ensure_ascii=False)
        fmt = col.get("defaultFormat", "inline")
        groups.append(
            "    {\n"
            f'      name: {json.dumps(col["name"], ensure_ascii=False)},\n'
            f"      flags: {flags},\n"
            f"      defaultFormat: {json.dumps(fmt)}\n"
            "    }"
        )
    groups_js = ",\n".join(groups)
    return (
        '<script src="/symbol-explorer.js"></script>\n'
        "<script>\n"
        'document.addEventListener("DOMContentLoaded", function () {\n'
        '  "use strict";\n'
        "  var ns = window.UltraTextGen;\n"
        "  if (!ns || !ns.buildGrids) return;\n\n"
        "  var GROUPS = [\n"
        f"{groups_js}\n"
        "  ];\n\n"
        f'  ns.buildGrids("{cid}", GROUPS);\n'
        "  if (ns.parseTwemoji) ns.parseTwemoji(document.body);\n"
        "});\n"
        "</script>"
    )


def render_page(spec):
    slug = spec["slug"]
    title = spec["title"]
    meta = spec["meta_description"]
    canonical = spec.get("canonical") or f"{SITE}/library/{slug}/"
    breadcrumb = spec.get("breadcrumb") or spec["hero_h1"]
    date_pub = spec.get("date_published", "2026-01-01")
    date_mod = spec.get("date_modified", date_pub)
    cta = spec.get(
        "cta",
        "Use UltraTextGen to convert plain text into bold, italic, cursive, "
        "and 100+ other Unicode font styles — free and instant.",
    )

    # JSON-LD must use real (entity-decoded) strings; json.dumps handles escaping.
    ld_article = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": html.unescape(title),
            "description": html.unescape(meta),
            "author": {
                "@type": "Organization",
                "name": "UltraTextGen",
                "url": f"{SITE}/",
            },
            "publisher": {
                "@type": "Organization",
                "name": "UltraTextGen",
                "url": f"{SITE}/",
            },
            "mainEntityOfPage": canonical,
            "datePublished": date_pub,
            "dateModified": date_mod,
        },
        indent=2,
        ensure_ascii=False,
    )
    ld_breadcrumb = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": f"{SITE}/",
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Library",
                    "item": f"{SITE}/library/",
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": html.unescape(breadcrumb),
                    "item": canonical,
                },
            ],
        },
        indent=2,
        ensure_ascii=False,
    )

    # Section bodies
    section_blocks = [render_symbol_section(s) for s in spec["sections"]]
    if spec["copy_pattern"] == "collection":
        section_blocks.append(render_collection_section(spec))
    body_sections = "\n\n<div class=\"section-divider\"></div>\n\n".join(section_blocks)

    related_html = render_related(spec["related"])

    if spec["copy_pattern"] == "collection":
        runtime_scripts = render_buildgrids_script(spec)
    else:
        runtime_scripts = '<script src="/symbol-explorer.js"></script>'

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
<meta property="og:image" content="{SITE}/logo.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc_attr(title)}">
<meta name="twitter:description" content="{esc_attr(meta)}">
<meta name="twitter:image" content="{SITE}/logo.png">
<meta property="og:title" content="{esc_attr(title)}">
<meta property="og:description" content="{esc_attr(meta)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{esc_attr(canonical)}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Space+Mono&display=swap" rel="stylesheet">

<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/symbol-explorer.css">

<script type="application/ld+json">
{ld_article}
</script>

<script type="application/ld+json">
{ld_breadcrumb}
</script>
</head>
<body>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P55HXK8Q"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
<script src="/header.js"></script>

<!-- HERO -->
<section class="hero">
  <div class="hero-inner">
    <h1 class="hero-headline">{esc(spec["hero_h1"])}</h1>
    <p class="hero-tagline">{esc(spec["hero_tagline"])}</p>
  </div>
</section>

<!-- INTRO -->
<section class="editorial-section">
  <div class="editorial-block">
    <p>{esc(spec["intro"])}</p>
  </div>
</section>

<div class="section-divider"></div>

{body_sections}

<!-- CTA -->
<div class="cta-card">
  <h3>Transform text with Unicode fonts</h3>
  <p>{esc(cta)}</p>
  <a href="{SITE}/" class="cta-btn">Open UltraTextGen →</a>
</div>

<!-- RELATED -->
<section class="editorial-section">
  <span class="article-section-label">Related Resources</span>
  <div class="compare-grid">
{related_html}
  </div>
</section>

<!-- FOOTER -->
<footer class="footer">
  <div class="footer-inner">
  </div>
</footer>

<!-- TOAST -->
<div class="symbol-toast" id="symbolToast" aria-live="polite"></div>

{runtime_scripts}
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
    parser.add_argument("spec", help="path to a JSON spec (or a slug under data/library_page_specs/)")
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
    out_dir = LIBRARY_DIR / slug
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
              f"({len(page)} bytes, pattern={spec['copy_pattern']})")
        return 0

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(page, encoding="utf-8")
    print(f"Wrote {out_path.relative_to(REPO)} "
          f"(pattern={spec['copy_pattern']}, "
          f"sections={len(spec['sections'])})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
