#!/usr/bin/env python3
"""
fix-footer-nested-content.py

Move page content that is mistakenly nested inside <footer class="footer">
back into the document body, where it belongs.

WHY THIS EXISTS
---------------
Every page ships an empty footer shell:

    <footer class="footer">
      <div class="footer-inner"></div>
    </footer>

…which footer.js fills in at runtime with the nav/tool/category/company link
columns. On 727 pages, however, real page content — whole FAQ sections, with
their <h2> headings and .faq-item blocks — had been written *into* that shell,
after </main>:

    </main>
    <footer class="footer">
      <div class="footer-inner">
        <h2 class="faq-category">Bold Text Language Support</h2>
        <div class="faq-item">…</div>          <-- page content, in the footer
        …
      </div>
    </footer>

That is a real SEO/answer-surface defect, not just untidy markup. Content
extractors — including the readability-style parsers that non-rendering
crawlers use — routinely discard <footer> as boilerplate. On
category/bold-fonts/index.html all NINE of the page's FAQPage JSON-LD
questions rendered inside <footer>, so the visible content backing its rich
result sat in the one region most likely to be thrown away.

It passed scripts/check-faq-schema.js because that check asks whether the
schema's questions are present on the page — and they are. It never asked
*where*.

WHAT IT DOES
------------
For every page whose footer shell contains element content:

  1. Extracts everything inside <div class="footer-inner">.
  2. Refuses to touch the file unless that content is <div>-balanced, so a
     malformed page is reported rather than mangled.
  3. Re-inserts it before </main> — or, on the handful of pages that have no
     <main> element at all, immediately before <footer class="footer">.
  4. Leaves the footer shell empty, exactly as footer.js expects to find it.

Whitespace and indentation of the moved block are preserved verbatim so the
diff shows a move, not a reformat.

Regression is prevented by scripts/check-static-footer.js, which requires a
page's footer to match the generated footer markup exactly — stray content
inside it fails that check automatically.

Usage:
    python3 scripts/fix-footer-nested-content.py            # dry run (default)
    python3 scripts/fix-footer-nested-content.py --write    # apply
    python3 scripts/fix-footer-nested-content.py --write path/to/index.html
"""

import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FOOTER_RE = re.compile(r'(<footer class="footer"[^>]*>)(.*?)(</footer>)', re.S)
INNER_OPEN = '<div class="footer-inner">'

# Content that means "this is a page section, not footer chrome".
CONTENT_MARKERS = ("faq-item", "<h2", "<h3", "<section", "<article")


def find_pages(explicit):
    if explicit:
        return [os.path.relpath(os.path.abspath(p), ROOT) for p in explicit]
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # Skip dot-directories wholesale — .git, and .claude/worktrees, which
        # holds isolated agent checkouts of this same repo and would otherwise
        # be scanned (and rewritten) as if it were site content.
        dirnames[:] = [
            d for d in dirnames
            if not d.startswith(".") and d not in ("node_modules", "assets", "scripts")
        ]
        for name in filenames:
            if name == "index.html":
                out.append(os.path.relpath(os.path.join(dirpath, name), ROOT))
    return sorted(out)


def extract(html):
    """Return (match, content, prefix, suffix) for the footer-inner payload.

    `content` is the raw text between <div class="footer-inner"> and the
    </div> that closes it. Returns None when there is nothing to move.
    """
    m = FOOTER_RE.search(html)
    if not m:
        return None
    inner = m.group(2)
    i = inner.find(INNER_OPEN)
    if i == -1:
        return None
    after = inner[i + len(INNER_OPEN):]
    j = after.rstrip().rfind("</div>")
    if j == -1:
        return None
    content = after[:j]
    if not content.strip():
        return None
    if not any(marker in content for marker in CONTENT_MARKERS):
        return None
    return m, content


def balanced(content):
    return len(re.findall(r"<div\b", content)) == len(re.findall(r"</div>", content))


def apply_fix(html):
    """Return (new_html, moved_chars) or (None, reason) on refusal."""
    found = extract(html)
    if not found:
        return None, "nothing-to-move"
    m, content = found

    if not balanced(content):
        return None, "unbalanced-divs"

    # Rebuild the footer with an empty shell, preserving the original tags.
    empty_footer = m.group(1) + "\n    " + INNER_OPEN + "</div>\n  " + m.group(3)
    without = html[: m.start()] + empty_footer + html[m.end():]

    # strip("\n") alone leaves the indent that used to sit before the closing
    # </div>, which shows up as a whitespace-only line in every diff.
    block = content.strip("\n").rstrip()

    # Layout fidelity: the block currently sits in .footer-inner, which is
    # `max-width:900px; margin:0 auto`. Re-home it somewhere with the same
    # constraint or it reflows to full width.
    #   · <main class="container"> is `max-width:900px; margin:0 auto` too,
    #     so the block keeps its exact width there and needs no wrapper.
    #   · <main class="app"> has no rule in style.css, and the pages with no
    #     <main> at all drop the block at body level — both are unconstrained,
    #     so wrap those in .faq-inner, which style.css already defines with
    #     rules identical to .footer-inner and which 47 pages already use.
    main_match = re.search(r"<main\b([^>]*)>", without)
    main_is_container = bool(main_match) and "container" in (main_match.group(1) or "")

    def wrap(b):
        return b if main_is_container else (
            '<div class="faq-inner">\n' + b + "\n</div>"
        )

    idx = without.rfind("</main>")
    if idx != -1:
        new = without[:idx] + wrap(block) + "\n" + without[idx:]
        return new, len(block)

    idx = without.find('<footer class="footer"')
    if idx == -1:
        return None, "no-insertion-point"
    # No <main> on these pages, so the block is never inside a container.
    new = without[:idx] + '<div class="faq-inner">\n' + block + "\n</div>\n\n  " + without[idx:]
    return new, len(block)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", help="specific files (default: whole site)")
    ap.add_argument("--write", action="store_true", help="apply changes (default: dry run)")
    args = ap.parse_args()

    pages = find_pages(args.files)
    fixed, refused, skipped = [], [], 0

    for rel in pages:
        path = os.path.join(ROOT, rel)
        try:
            html = open(path, encoding="utf-8").read()
        except (OSError, UnicodeDecodeError):
            continue

        if not extract(html):
            skipped += 1
            continue

        new, info = apply_fix(html)
        if new is None:
            refused.append((rel, info))
            continue

        fixed.append((rel, info))
        if args.write:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(new)

    mode = "moved" if args.write else "would move"
    print(f"Footer-nested content — {len(pages)} page(s) scanned")
    print(f"  {mode} content out of <footer> on {len(fixed)} page(s)")
    if refused:
        print(f"  REFUSED {len(refused)} page(s) (left untouched, need a human):")
        for rel, why in refused:
            print(f"    ✗ {rel}  [{why}]")
    if fixed:
        for rel, size in fixed[:10]:
            print(f"    · {rel}  ({size:,} chars)")
        if len(fixed) > 10:
            print(f"    … and {len(fixed) - 10} more")
    if not args.write and fixed:
        print("\nRe-run with --write to apply.")

    return 1 if refused else 0


if __name__ == "__main__":
    sys.exit(main())
