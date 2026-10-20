---
paths:
  - "symbol/*/index.html"
  - "*/symbol/*/index.html"
  - "scripts/lib/symbol_pages.py"
  - "scripts/fix-symbol-codes-table.py"
  - "scripts/fix-faq-above-footer.py"
  - "data/unicode_assigned_ranges.json"
---

# Symbol pages: what must stay true

Gate: `npm run check:symbol-pages` (diff-scoped, state). Dashboard: `npm run audit:symbol-pages`.
Definitions live once, in `scripts/lib/symbol_pages.py`; the gate, the dashboard and the fixers all read it.

- **The FAQ sits above the footer.** Keyed on the first `.faq-item` or `<details>`, never on `id="faq"`
  (a selector keyed on the id found 79 below-footer FAQs; the real number was 263). Repair:
  `python3 scripts/fix-faq-above-footer.py`.
- **Never copy a code point the pinned Unicode table does not assign.** `data/unicode_assigned_ranges.json` is generated
  from `DerivedAge` by `scripts/build-unicode-assigned.py`; Python's `unicodedata` lags the standard and must not be
  used for this. A provisionally assigned character needs `data-provisional` on its tile **and** copy on the page that
  says so.
- **No double-escaped entity** (`&amp;amp;le;`) outside a deliberate demonstration of `&amp;`.
- **Typing and code claims are verified or absent.** Publish a key sequence only for a named OS and layout that a primary
  source or a decode confirms. Alt codes: CP1252 when written with a leading zero, CP437 otherwise, and only print the
  OEM form when CP437 and CP850 agree. An unverified method is omitted, not hedged; the limit is stated once and the
  page offers the copy button and a "if it does not work" line.
- **The codes table is generated.** `scripts/fix-symbol-codes-table.py` derives every row from the code point; labels
  come from `scripts/lib/symbol_code_labels.json`, which a native reviewer owns per locale. Do not hand-write the rows.
- **Not gated, reported:** `tile-glyph-mismatch`, `alt-code-mismatch` (both have legitimate mentions of other characters),
  `title-promise`. Promote one to the gate only after its backlog is zero.
