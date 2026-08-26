#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
printables_parity.test.py

Run: python3 scripts/lib/printables_parity.test.py   (npm run test:printables-parity)

Zero dependencies, no framework — the same idiom as
scripts/lib/editorial-footprint.test.js and js/counter/counterRules.test.js.

Every case below is a regression this guard actually caught on the live tree:
running the four printables generators unmodified changed 90 files, and the
whole diff was five later site-wide passes being undone. The deliberate
NON-catches matter as much as the catches — a guard that fires on a brand-new
page, or on reordered tags, is a guard people learn to pass --force-stale to.
"""

import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from lib.printables_parity import find_regressions, assert_no_regression  # noqa: E402

PASS, FAIL, LINES = 0, 0, []


def t(name, fn):
    global PASS, FAIL
    try:
        fn()
        PASS += 1
        LINES.append(f"  ok   {name}")
    except AssertionError as exc:
        FAIL += 1
        LINES.append(f"  FAIL {name}\n         {exc}")


LIVE = """<!DOCTYPE html><html lang="en"><head>
<script async src="https://fundingchoicesmessages.google.com/i/pub-1"></script>
<link rel="canonical" href="https://ultratextgen.com/printables/x/letter-a/">
<link rel="alternate" hreflang="en" href="https://ultratextgen.com/printables/x/letter-a/">
<link rel="alternate" hreflang="es" href="https://ultratextgen.com/es/imprimibles/x/letra-a/">
<meta property="og:image" content="https://ultratextgen.com/assets/og/x.png">
<meta property="og:image:alt" content="Letter A">
</head><body>
<main><div class="faq-item"><div class="faq-answer">Answer.</div></div></main>
<footer class="footer"><div class="footer-inner">
<!-- BEGIN static footer --><a href="/guide/">Guides</a><!-- END static footer -->
</div></footer>
</body></html>"""


def _tmp(html_str):
    d = pathlib.Path(tempfile.mkdtemp())
    p = d / "index.html"
    p.write_text(html_str, encoding="utf-8")
    return p


def labels(regs):
    return {r[1] for r in regs}


# ── catches ────────────────────────────────────────────────────────────────

def _catch(mutate, label):
    p = _tmp(LIVE)
    regs = find_regressions([(p, mutate(LIVE))])
    assert label in labels(regs), f"expected {label!r}, got {labels(regs) or 'nothing'}"


t("catches a dropped hreflang alternate",
  lambda: _catch(lambda h: h.replace(
      '<link rel="alternate" hreflang="es" href="https://ultratextgen.com/es/imprimibles/x/letra-a/">\n', ''),
      "hreflang alternates"))

t("catches dropped social image tags",
  lambda: _catch(lambda h: h.replace('<meta property="og:image:alt" content="Letter A">\n', ''),
                 "social image tags"))

t("catches a dropped Funding Choices tag",
  lambda: _catch(lambda h: h.replace('fundingchoicesmessages.google.com', 'example.invalid'),
                 "Funding Choices tag"))

t("catches a dropped static footer",
  lambda: _catch(lambda h: h.replace('<!-- BEGIN static footer -->', '<!-- gone -->'),
                 "static footer markup"))

t("catches a changed canonical",
  lambda: _catch(lambda h: h.replace('/printables/x/letter-a/">\n<link rel="alternate"',
                                     '/printables/x/letter-b/">\n<link rel="alternate"'),
                 "canonical"))


def _faq_moved():
    moved = LIVE.replace('<main><div class="faq-item"><div class="faq-answer">Answer.</div></div></main>',
                         '<main></main>')
    moved = moved.replace('<!-- BEGIN static footer -->',
                          '<div class="faq-item"><div class="faq-answer">Answer.</div></div><!-- BEGIN static footer -->')
    _catch(lambda _h: moved, "FAQ nested inside <footer>")


t("catches the FAQ being moved back inside <footer>", _faq_moved)

# ── deliberate NON-catches ─────────────────────────────────────────────────

def _no_catch(new_html, why):
    p = _tmp(LIVE)
    regs = find_regressions([(p, new_html)])
    assert not regs, f"{why}: unexpectedly flagged {labels(regs)}"


t("NON-CATCH: an identical page is clean",
  lambda: _no_catch(LIVE, "identical page"))

t("NON-CATCH: prose edits alone are clean",
  lambda: _no_catch(LIVE.replace("Answer.", "A longer, more specific answer with U+2014 in it."),
                    "a copy-only change"))

t("NON-CATCH: reordering tags is not a loss",
  lambda: _no_catch(
      LIVE.replace('<meta property="og:image" content="https://ultratextgen.com/assets/og/x.png">\n'
                   '<meta property="og:image:alt" content="Letter A">',
                   '<meta property="og:image:alt" content="Letter A">\n'
                   '<meta property="og:image" content="https://ultratextgen.com/assets/og/x.png">'),
      "reordered tags"))


def _new_page():
    d = pathlib.Path(tempfile.mkdtemp())
    regs = find_regressions([(d / "does-not-exist.html", "<html></html>")])
    assert not regs, f"a brand-new page cannot regress anything, got {labels(regs)}"


t("NON-CATCH: a brand-new page cannot regress anything", _new_page)

t("NON-CATCH: adding a tag the live page lacks is fine",
  lambda: _no_catch(LIVE.replace('</head>', '<meta name="robots" content="index">\n</head>'),
                    "an added tag"))

# ── exit behaviour ─────────────────────────────────────────────────────────

def _aborts():
    p = _tmp(LIVE)
    bad = LIVE.replace('<meta property="og:image:alt" content="Letter A">\n', '')
    try:
        assert_no_regression([(p, bad)], force=False, stream=open("/dev/null", "w"))
    except SystemExit as exc:
        assert exc.code == 4, f"expected exit 4, got {exc.code}"
        return
    raise AssertionError("assert_no_regression did not abort on a regression")


t("assert_no_regression aborts with exit 4", _aborts)


def _force():
    p = _tmp(LIVE)
    bad = LIVE.replace('<meta property="og:image:alt" content="Letter A">\n', '')
    regs = assert_no_regression([(p, bad)], force=True, stream=open("/dev/null", "w"))
    assert regs, "--force-stale must still REPORT what it is overriding"


t("--force-stale overrides but still reports", _force)


def _clean_returns_empty():
    p = _tmp(LIVE)
    assert assert_no_regression([(p, LIVE)], stream=open("/dev/null", "w")) == []


t("a clean run returns an empty list and does not exit", _clean_returns_empty)

print("Printables generator parity guard — tests\n")
for line in LINES:
    print(line)
print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
