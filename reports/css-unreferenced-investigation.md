# UltraTextGen — Unreferenced CSS Investigation

_Companion to `reports/css-audit-report.md` (§7). Produced as part of PR 5
of the CSS audit cleanup._

This document drills into the "Possible Unused CSS" list from the audit,
verifies each entry by hand against HTML, standalone JS, and inline
`<script>` blocks, and recommends an action. **No CSS was removed in
this PR** — these findings are the basis for a future targeted deletion
PR.

---

## Audit script enhancement (this PR)

The audit previously scanned only standalone `.js` files for class
references, which missed classes manipulated by inline `<script>` blocks
inside HTML. The scanner was extended in this PR to:

1. **Scan `<script>` blocks inside HTML files** (`<script>` without
   `src=`), feeding them through the same class-reference detector used
   for `.js` files.
2. **Scan loose-token quoted strings line-by-line** rather than across
   the whole file, so an unbalanced apostrophe in a long inline script
   can't desync the rest of the regex.

The net effect on the unreferenced list:

| Before enhancement | After enhancement | Change |
|---|---|---|
| 31 unreferenced selectors | 27 | −4 |

Selectors that **flipped from unreferenced → referenced** thanks to the
enhancement (now correctly attributed to JS):

- `.helper-chip` (and `.helper-chip:hover`) — `className = 'helper-chip'` in `usecase/linkedin-headline/embed/index.html` inline script
- `.variation-char-count` — `className = 'variation-char-count' + …` in `usecase/linkedin-headline/{,embed/}index.html` inline scripts
- `.char-warning` — `classList.add('char-warning')` / `.remove(...)` in the same two pages

---

## Remaining unreferenced selectors (27)

Per-class findings after grepping HTML, JS, and inline-script bodies for
every occurrence. The recommendation column suggests what to do in a
future deletion PR — none are removed in this PR.

### `maybe-js` — flagged by the loose scanner (3)

These appear as quoted-string tokens somewhere in JavaScript but were
not seen in a strict class-manipulation context. Verify by hand.

| Selector | Finding | Recommendation |
|---|---|---|
| `.variation-char-over` | Used by `className = 'variation-char-count' + (isOver ? ' variation-char-over' : '')` in the LinkedIn-headline pages. Concatenated into a className string, so it didn't match the strict regex but is genuinely used. | **Keep.** Real CSS, JS-driven state. |
| `.chip` | The only `chip` substrings in JS belong to `vertical-chip`, `vertical-mode-chip`, `vertical-divider-chip`. Bare `chip` does not appear in any class attribute or class-manipulation expression. | **Safe to remove** after one more eyeball pass. |
| `.chip:hover` | Same as `.chip`. | **Safe to remove** with `.chip`. |

### `no-reference-found` — genuinely stale (24)

For each of these, both `grep -roE 'class="[^"]*\b<name>\b'` over all
HTML and `grep -roE` over all JS quoted strings return zero hits. They
appear to be leftovers from previous layouts.

| Selector(s) | Likely origin | Recommendation |
|---|---|---|
| `.footer-links`, `.footer-nav-links` | Previous footer markup. Current footer is injected by `footer.js` and uses different class names (`footer`, `footer-inner`, `footer-link` — note singular). | **Safe to remove.** Verify nothing else references plural form first. |
| `.header-breadcrumb`, `.header-breadcrumb a` | Previous header markup. The current breadcrumb component uses `.breadcrumbs` / `.breadcrumb-separator` (both fully referenced). | **Safe to remove.** |
| `.how-to-use`, `.why-section`, `.tips-section`, `.why-content p`, plus the `h2` variants of the first three (duplicated at lines 1013 and 1177 in style.css) | Earlier homepage layout's section names. Current homepage uses `editorial-section`, `editorial-block`, `mood-explainer`, etc. | **Safe to remove** the whole block. The duplicate `h2` rules at 1013/1177 are also worth deduping. |
| `.btn-primary`, `.btn-primary:disabled`, `.btn-primary:not(:disabled):hover` | Previous primary-button style. Replaced by `.cta-btn` (77 pages, fully referenced). | **Safe to remove.** |
| `.char-count-small`, `.text-warning` | Sibling utility classes from the character-counter family. The actual JS uses `variation-char-count`, `variation-char-over`, `char-warning` — not these two. | **Safe to remove.** |
| `.jump-links`, `.jump-links a`, `.jump-links a:hover` | "Jump to section" anchors from an earlier guide-page design. No guide page currently has `class="jump-links"`. | **Safe to remove.** |
| `.section-head`, `.lede` | Generic editorial typography from a previous article layout. (Italian text contains the substring `lede` inside words like "maledette" — those are coincidental, not class usage.) | **Safe to remove.** |

---

## Summary & recommendation

- **Selectors confirmed safe to keep:** 1 (`.variation-char-over`).
- **Selectors confirmed safe to remove:** 26 (all `no-reference-found`
  plus `.chip` / `.chip:hover`).
- All 26 should be removed in a single follow-up PR, with a screenshot
  pass on the homepage, a guide page, a usecase page, the LinkedIn-headline
  page, and the LinkedIn-headline embed — i.e. the touchpoints for the
  former layouts these styles came from.
- The audit script's blind-spot fix (inline-script scanning) is the
  durable win from this PR: it will prevent recurrence of the same class
  of false positive as new pages are added.
