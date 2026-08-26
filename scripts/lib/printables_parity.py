#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
printables_parity.py

A refuse-to-overwrite guard for the printables generators.

WHY THIS EXISTS
---------------
The four printables generators (bubble letters, bubble numbers, alphabet
coloring pages, dot-to-dot alphabet) are FULL regenerators: whatever they do not
emit is silently deleted from every page they rewrite. They were written before
five later site-wide passes, and none of them learned about any of it. Running
them unmodified against the tree on 2026-08-26 changed 90 files, and the entire
diff was other people's repairs being undone:

  1. The Funding Choices ad-blocking-recovery tag  -> check-funding-choices.js
     (GATING) fails.
  2. The baked static footer                       -> check-static-footer fails.
  3. The FAQ moved back inside <footer>            -> re-creates the exact defect
     fix-footer-nested-content.py repaired on 727 pages; readability-style
     extractors discard footer content as boilerplate.
  4. hreflang alternates                           -> 28 issues; the Spanish
     siblings (es/imprimibles/...) are orphaned. GATING.
  5. og:image / twitter:image / og:image:alt       -> the page's social art.

Plus hand edits that never went back into the spec, such as meta descriptions
mentioning "save it as a PDF".

Items 1-3 have since been fixed in the generators themselves. Items 4 and 5 have
NOT: the generators have no model of the hreflang mesh or the art pipeline, and
teaching them is a real project, not a copy fix.

So this guard exists to make the remaining gap LOUD instead of silent. A
generator that quietly deletes a shipped repair is the same failure this
repository has recorded twice in CI: a check that reports nothing is
indistinguishable from a check that passes. The equivalent here is a generator
whose damage is invisible until a gate fails on a later PR.

USAGE
-----
    from lib.printables_parity import assert_no_regression

    assert_no_regression(targets, force=args.force_stale)

`targets` is a list of (Path, html_string). Each existing page is compared with
what the generator is about to write; anything the live page carries and the new
page does not is a regression, and the run aborts with a report naming the file,
the missing element, and the pass that owns it.

`--force-stale` overrides, because a deliberate one-off after a parity fix is
legitimate. It prints what it is overriding rather than passing quietly.
"""

import re
import sys

# Each check: (label, owning pass, extractor). The extractor returns a SET of
# strings found in a page; a live page having members the generated page lacks
# is a regression. Sets, not counts, so a reordering is never reported.
CHECKS = [
    (
        "hreflang alternates",
        "npm run sync:locale-mesh -- --fix",
        lambda h: set(re.findall(r'<link rel="alternate" hreflang="([^"]+)"[^>]*>', h)),
    ),
    (
        "social image tags",
        "scripts/generate-site-art.py --only <slug> + scripts/wire-site-art.py",
        lambda h: set(
            re.findall(r'<meta (?:property|name)="((?:og|twitter):image(?::alt)?)"', h)
        ),
    ),
    (
        "Funding Choices tag",
        "node scripts/inject-funding-choices-tag.js",
        lambda h: {"funding-choices"} if "fundingchoicesmessages.google.com" in h else set(),
    ),
    (
        "static footer markup",
        "npm run build:static-footer",
        lambda h: {"static-footer"} if "BEGIN static footer" in h else set(),
    ),
    (
        "canonical",
        "(hand-set in the generator template)",
        lambda h: set(re.findall(r'<link rel="canonical" href="([^"]+)"', h)),
    ),
]


def _faq_outside_main(html_str):
    """True when a .faq-answer sits inside <footer> — the 727-page defect."""
    m = re.search(r"<footer\b.*?</footer>", html_str, re.S | re.I)
    return bool(m and "faq-answer" in m.group(0))


def find_regressions(targets):
    """[(path, label, missing, owner)] for everything a write would destroy."""
    out = []
    for path, new_html in targets:
        if not path.exists():
            continue  # a brand-new page cannot regress anything
        try:
            live = path.read_text(encoding="utf-8")
        except OSError:
            continue
        for label, owner, extract in CHECKS:
            missing = extract(live) - extract(new_html)
            if missing:
                out.append((path, label, sorted(missing), owner))
        if _faq_outside_main(new_html) and not _faq_outside_main(live):
            out.append(
                (
                    path,
                    "FAQ nested inside <footer>",
                    ["faq-answer"],
                    "scripts/fix-footer-nested-content.py --write",
                )
            )
    return out


def assert_no_regression(targets, force=False, stream=sys.stderr):
    """Abort the run if writing `targets` would delete a shipped repair.

    Returns the regression list (empty when clean). Raises SystemExit(4) unless
    `force` is set.
    """
    regressions = find_regressions(targets)
    if not regressions:
        return regressions

    by_label = {}
    for path, label, missing, owner in regressions:
        by_label.setdefault((label, owner), []).append((path, missing))

    verb = "OVERRIDING" if force else "REFUSING TO WRITE"
    stream.write(
        f"\n[{verb}] this generator is STALE against the live pages.\n"
        "It would delete content that later site-wide passes added:\n\n"
    )
    for (label, owner), rows in sorted(by_label.items()):
        stream.write(f"  {label} — {len(rows)} page(s) would lose it\n")
        stream.write(f"    owner: {owner}\n")
        for path, missing in rows[:3]:
            stream.write(f"    · {path}: {', '.join(missing[:6])}\n")
        if len(rows) > 3:
            stream.write(f"    … and {len(rows) - 3} more page(s)\n")
        stream.write("\n")

    if force:
        stream.write(
            "--force-stale was passed, so the write proceeds. Re-run every owning\n"
            "pass listed above afterwards, then check the gated validators.\n\n"
        )
        return regressions

    stream.write(
        "Nothing was written. Two ways forward:\n"
        "  · Teach this generator to emit what it is missing (the durable fix), or\n"
        "  · Re-run the owning passes above immediately after generating, and pass\n"
        "    --force-stale to acknowledge you are doing that.\n"
        "\n"
        "Background: docs/editorial-footprint-upstream-findings-2026-08-26.md §1a.\n"
    )
    raise SystemExit(4)
