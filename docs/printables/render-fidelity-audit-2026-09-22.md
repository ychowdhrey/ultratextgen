# Printables Rendering Fidelity and Visual QA Audit — 2026-09-22

A systematic pass over **every printable generator on the site**, driven rather than read: each
surface was mounted in headless Chromium against a local server, configured through its own
controls, and measured at the exact moment the PDF exporter rasterises it. Numbers below are
measurements. Where an instrument turned out to be unreliable, that is said in place rather than
the number being quoted.

**Baseline** `main` @ `11d281455`, served from a worktree of that commit alongside the working
tree so before/after are the same harness against two trees.
**Predecessor** the 2026-09-17 audit ([`render-quality-audit.md`](render-quality-audit.md),
[`render-defect-registry.md`](render-defect-registry.md),
[`render-systemic-findings.md`](render-systemic-findings.md)) asked whether a sheet renders the
thing its page promises, and answered it at the letterform. **This pass asks a different
question: what happens when the settings change** — paper, orientation, margins, content length,
roster, answer key, viewport — and where does the artifact stop agreeing with the preview.

---

## 1. Executive summary

| | | |
|---|---|---|
| Generators audited | **96** | 27 English routes (25 on `printablesEngine.js`, plus `monogram-maker` and `cross-stitch-letters` on their own engines) + 69 locale mirrors across 8 languages |
| Distinct print surfaces | **14** | `name`, `gen`, `design`, `banner`, `puzzle`, `search`, `cw`, `sc`, `alphabet`, `practice`, `book`, `char`, `mono`, `xstitch` |
| Settings inventoried | **1,013** | interactive controls across the 27 EN routes, enumerated from the live DOM |
| Configurations driven | **1,670** | 670 PDF-path on the English routes (content × paper × orientation × margin × roster × answer key), 857 on the locale mirrors, 135 responsive (27 routes × 5 viewports), 8 browser-print renders — each measured three ways |
| Defects | **14** | a fifteenth register entry, RF-014, records an instrument error rather than a defect |
| P0 | **2** | RF-001 (fixed), RF-015 |
| P1 | **3** | RF-002 (partly fixed), RF-003 (fixed), RF-004 |
| P2 | **6** | RF-005, RF-006, RF-007, RF-008, RF-010, RF-013 |
| P3 | **3** | RF-009, RF-011 (fixed), RF-012 |
| Systemic root causes | **5** | SRC-1 … SRC-5 in §5 |

**The two P0s.** A **short name** — one to three characters, the most ordinary input a tracing
page takes — prints its sheet at **27%** of size (19.7% at worst), as a narrow strip down the
middle of the paper, on 15 of the 27 generators. And the word-search maker's **default** sheet —
ten words, one grid, nothing configured — shipped a PDF in which the clue list rendered as a single column, ran across the
Name/Date row and the credit QR, and lost three of its ten words off the bottom of the page. The
crossword's word bank did the same thing to its ACROSS/DOWN clues. **Nothing in the DOM showed
it.** The page, the preview and every geometry assertion over the print surface are correct; the
defect is created by the exporter's own clone, which pins `width`/`height` from the original
layout and drops any property outside a 96-entry allow-list. `columns` was not on the list.

**The broadest.** No sheet re-lays-out for the paper it is printed on. Paper, orientation and
margins reach the *page box*; the sheet adapts by being **scaled down as a picture** — 576 of 670
configurations, 22 of the 27 generators. Two proximate causes feed it: three `min-height: 9.2in`
declarations that mean "US Letter portrait, roughly" on every paper (now replaced with the
measured page box), and RF-015's row height, which is derived from the word rather than from the
page. The second is the larger and is the top item of the fix plan.

**The reported regression is explained and closed.** "Word search · large word list · the final
word collides with the Name/Date section" is not a footer-position problem and moving the Name
field down would not have touched it. It is the collapsed clue list above, and it happens at
default settings too.

**What this pass fixed** (all verified by re-measuring with the same instrument):

* the export now carries the properties the print surfaces use — `columns` and 24 others — and a
  CI gate compares the two lists so the next one cannot be dropped in silence;
* the PDF page box is published and used, so a portrait or Legal sheet is no longer shrunk to fit
  a box it already fitted — on the name puzzle, `fit` 0.961 → **1.000** on US Letter portrait and
  0.72 → **1.000** on Letter landscape, 9 of its 15 configurations improved and none regressed;
* a clue list that does not fit under its grid now breaks **between words** instead of jumping to
  the next sheet whole (browser-print page-one ink 9.74% → **13.08%**).

---

## 2. Generator coverage table

`Settings` counts every interactive control the page mounts, read from the live DOM (the
print-settings panel is built at runtime, so a static read of the HTML under-reports it).
`Configs` is PDF-path configurations. Every route was driven at 5 viewports for the preview pass,
and every configuration measured the DOM print surface, the browser-print state and the
exporter's clone. `Issues` counts measured invariant violations at the baseline commit.

| Generator | Route | Surfaces | Settings | Configs | Preview | PDF | Print | Issues |
|---|---|---|---|---|---|---|---|---|
| alphabet-coloring-pages | `/printables/alphabet-coloring-pages/` | alphabet, char | 61 | 30 | ✓ | ✓ | ✓ | 0 |
| banner-maker | `/printables/banner-maker/` | banner | 11 | 15 | ✓ | ✓ | ✓ | 31 |
| best-friend-in-cursive | `/printables/best-friend-in-cursive/` | name | 13 | 15 | ✓ | ✓ | ✓ | 14 |
| block-letters | `/printables/block-letters/` | name, alphabet, char | 67 | 45 | ✓ | ✓ | ✓ | 13 |
| bubble-letters | `/printables/bubble-letters/` | name, alphabet, char | 66 | 45 | ✓ | ✓ | ✓ | 13 |
| calligraphy-alphabet | `/printables/calligraphy-alphabet/` | name, practice, char | 43 | 45 | ✓ | ✓ | ✓ | 12 |
| coloring-page-maker | `/printables/coloring-page-maker/` | design | 29 | 15 | ✓ | ✓ | ✓ | 16 |
| cross-stitch-letters | `/printables/cross-stitch-letters/` | xstitch | 18 | 15 | ✓ | ✓ | ✓ | 0 |
| crossword-maker | `/printables/crossword-maker/` | cw | 16 | 11 | ✓ | ✓ | ✓ | 426 |
| cursive-alphabet | `/printables/cursive-alphabet/` | name, practice, char | 43 | 45 | ✓ | ✓ | ✓ | 14 |
| dad-in-cursive | `/printables/dad-in-cursive/` | name | 13 | 15 | ✓ | ✓ | ✓ | 14 |
| dot-to-dot-alphabet | `/printables/dot-to-dot-alphabet/` | book, char | 62 | 30 | ✓ | ✓ | ✓ | 0 |
| dot-to-dot-name | `/printables/dot-to-dot-name/` | design | 35 | 15 | ✓ | ✓ | ✓ | 42 |
| family-in-cursive | `/printables/family-in-cursive/` | name | 13 | 15 | ✓ | ✓ | ✓ | 14 |
| graffiti-letters | `/printables/graffiti-letters/` | name, alphabet, char | 91 | 45 | ✓ | ✓ | ✓ | 13 |
| handwriting-worksheet-generator | `/printables/handwriting-worksheet-generator/` | gen | 34 | 15 | ✓ | ✓ | ✓ | 31 |
| happy-birthday-in-cursive | `/printables/happy-birthday-in-cursive/` | name | 13 | 15 | ✓ | ✓ | ✓ | 14 |
| letter-tracing | `/printables/letter-tracing/` | gen, alphabet, practice, char | 89 | 60 | ✓ | ✓ | ✓ | 31 |
| love-in-cursive | `/printables/love-in-cursive/` | name | 13 | 15 | ✓ | ✓ | ✓ | 14 |
| mom-in-cursive | `/printables/mom-in-cursive/` | name | 13 | 15 | ✓ | ✓ | ✓ | 14 |
| monogram-maker | `/printables/monogram-maker/` | mono | 18 | 7 | ✓ | ✓ | ✓ | 0 |
| name-puzzle-maker | `/printables/name-puzzle-maker/` | puzzle | 22 | 15 | ✓ | ✓ | ✓ | 29 |
| name-tracing | `/printables/name-tracing/` | name, alphabet, practice, char | 77 | 60 | ✓ | ✓ | ✓ | 42 |
| sight-word-tracing | `/printables/sight-word-tracing/` | gen | 36 | 15 | ✓ | ✓ | ✓ | 31 |
| spanish-alphabet-chart | `/printables/spanish-alphabet-chart/` | alphabet, char | 78 | 30 | ✓ | ✓ | ✓ | 0 |
| word-scramble-maker | `/printables/word-scramble-maker/` | sc | 20 | 11 | ✓ | ✓ | ✓ | 71 |
| word-search-maker | `/printables/word-search-maker/` | search | 19 | 11 | ✓ | ✓ | ✓ | 86 |
| **8 locale families** | `de/zum-ausdrucken/` … `pt/imprimiveis/` (69 routes) | mirrors of the above | — | see §9 | ✓ | ✓ | — | see §9 |

A zero in `Issues` means no invariant this pass asserts was violated in the configurations driven.
It does not mean the generator is defect-free: the letterform questions this pass deliberately did
not re-open are in the 2026-09-17 registry.

---

## 3. Defect register

Severity: **P0** the printable is unusable or content is missing · **P1** major overlap,
clipping, wrong output, or a setting the visitor chose is not respected · **P2** a noticeable
alignment, spacing, typography or fidelity defect · **P3** polish.

Each entry names the exact input and settings that reproduce it, what was expected, what was
measured, and which shared component owns it.

---

### RF-001 · Multi-column clue list collapses in the exported PDF and PNG — P0 · **FIXED**

**Generators** `word-search-maker` (clue list), `crossword-maker` (word bank)
**Route** `/printables/word-search-maker/`, `/printables/crossword-maker/`
**Settings to reproduce** none. The page's **default** state.
**Input** the built-in demo list (10 words) — and every larger list
**Locale** all · **Viewport** any · **Paper** all · **Surface** PDF and PNG, not preview
**Category** B overflow · C clipping · A collision · L cross-renderer inconsistency

**Expected** the exported file matches the sheet it was made from.
**Actual** `.pt-search-words` is `columns: 3 8rem`. The exporter's clone carried neither
`column-count` nor `column-width`, so the list rendered as **one** column while keeping the
height the three-column layout had produced. Measured on the default sheet at the moment of
rasterisation: the `<ul>` is 110px tall at y 726.95, and its last item ends at y **1001.95** —
**165px past the bottom of its own box**, across the Name/Date row, across the credit QR, and off
the page. Three of ten words were absent from the downloaded PDF. With a 40-word list the overrun
was **476px** and roughly twenty words were lost. (Those two trees — the clean live surface and
the spilling clone, from the same instant — are the committed fixture in
`js/printables/renderInvariants.fixtures.json`.)

**Root cause** SRC-1 — the export clone's property allow-list.
**Affected shared component** `js/printables/printablePdf.js` → `PROPS` / `inlineStyles()`.
**Fix shipped** `columns` and 24 other properties added to `PROPS`, with the reasoning recorded
at the list; `npm run check:print-export-properties` now fails CI when the print surface declares
a property the export does not carry. Re-measured with the same instrument: 0 geometry drift, 0
spill, all ten words present, Name/Date and credit clear.
**Evidence** `evidence/RF-001-wordsearch-export-before.png` (delivered PDF, before) and
`evidence/RF-001-wordsearch-export-after.png` (after).

---

### RF-015 · A short name prints a tracing sheet at a quarter of its size, as a strip down the middle of the page — P0 · **OPEN**

**Generators** every `name` surface (12 routes) and every `gen` surface (3 routes) — 15 of 27
**Route** e.g. `/printables/mom-in-cursive/`, `/printables/name-tracing/`,
`/printables/letter-tracing/`
**Settings to reproduce** default. **Input** a short name — one to three characters
**Locale** all · **Paper** all · **Surface** PDF, PNG and print
**Category** G scale failure · H pagination · B overflow · P out-of-bounds

**Expected** a one-letter tracing sheet is a one-letter tracing sheet, full size.
**Actual** the practice row is an SVG whose viewBox is sized to the WORD
(`chars.length × 118 + 80` wide, 200 tall) and which is laid out `width: 100%; height: auto`,
with `max-height: none` once ruled guides are on. So the row's rendered height is inversely
proportional to the word's length, and the whole sheet with it:

| input | row viewBox | rendered row | sheet height | `fit` applied |
|---|---|---|---|---|
| `I` | 237 × 200 | 698 × **589px** | 3,793px (39.5in) | **0.27** |
| `iiiiii` | — | — | 2,475px | 0.41 |
| `Mom` (default) | 528 × 200 | 720 × 273px | 1,895px | 0.51 |
| `Christopher` | 1028 × 200 | 960 × 187px | 1,380px | 0.52 |
| `Wolfeschlegelsteinhausenberger` | 2625 × 200 | 1074 × 82px | 1,053px | 0.71 |

`renderPages()` then scales the page uniformly — **both axes** — so a sheet 4× too tall comes out
a quarter of the width as well. Rendered: a one-letter cursive sheet is a narrow column of rules
about a fifth of the paper wide, with an unreadable title and a Name/Date line a few millimetres
long. Worst measured on `name-tracing`: **`fit` 0.197**, a sheet printed at 19.7%.

This is the audit's most severe finding and it needs no unusual setting: a parent typing a child's
initial gets it.

**Root cause** SRC-2, in its strongest form — **the ruled band and the word share one SVG whose
viewBox is sized to the word**, so the ruling cannot be page-width and the row cannot be
page-height. `.pt-name-row.has-guides .pt-word-outline { max-height: none }` is where the cap was
removed; capping it again is not the fix, because the ruling would shrink with it.
**Affected shared component** `nameSheetNode()` / `genSheetNode()` / `addRuling()` in
`js/printables/printablesEngine.js`; `.pt-name-row` / `.pt-word-outline` in `style.css`.
**Recommended fix** FIX-1 — separate the two coordinate systems. The ruled band spans the sheet
and takes its height from the page (`--pt-pdf-body-h` divided by the rows the sheet actually
built, which the engine knows and CSS does not — publish it as a custom property rather than
estimating it); the word is placed inside that band at the band's scale. `.claude/rules/printables.md`
already names `addRuling()` as "the one owner of a ruling", which is where the band belongs.
**Do not** fix this by capping `max-height` alone, and **do not** fix it by letting
`renderPages()` keep scaling — that is the mechanism, not the remedy.
**Evidence** `evidence/RF-015-cursive-single-char.png` (a one-letter sheet as delivered).

---

### RF-002 · Every sheet is laid out for US Letter portrait and adapts to other paper only by scaling the raster — P1 · **PARTLY FIXED**

**Generators** 22 of 27 · **Route** all printable routes
**Settings to reproduce** Paper / Orientation / Margins — any value other than US Letter portrait
**Input** any · **Locale** all · **Paper** A4, Legal, and above all **landscape**
**Category** G scale failure · H pagination · L cross-renderer inconsistency

**Expected** choosing landscape gives a sheet laid out for a 10in × 7.5in page.
**Actual** the sheet's DOM height was identical on every paper — measured on the word search:
999px (default) and 1242px (40 words) on Letter portrait, A4 portrait, Legal narrow, Letter
landscape and A4 landscape narrow alike. Only the page box changed, so `renderPages()` scaled the
whole page down to fit. Measured shrink at the baseline, by surface:

| surface | configurations shrunk | worst | where |
|---|---|---|---|
| `name` (name-tracing) | 41 | **80.5%** (printed at 19.5% of design size) | widest run · A4 landscape narrow |
| `name` (7 cursive pages) | 14 each | 73.0% | longest name · landscape |
| `sc` word scramble | 66 | 50.7% | max list · landscape |
| `cw` crossword | 66 | 49.9% | max list · landscape |
| `search` word search | 66 | 43.3% | max list · landscape |
| `gen` (3 tracing generators) | 30 each | 38.7% | longest + landscape |
| `banner` | 16 | 32.6% | long banner · landscape |
| `name` (4 letterform pages) | 12 each | 31.6% | longest name · landscape |
| `puzzle` | 28 | 27.9% | longest name · landscape |
| `design` (2) | 15/42 | 10.3% | roster · Legal narrow |

576 of 670 configurations were shrunk at all; **421 of those 576 were landscape**.

**Root cause** SRC-2 — three `min-height: 9.2in` declarations, and the fixed `max-width: 6.4in` /
`34rem` content caps that make a sheet's height independent of its page.
**Affected shared component** `style.css` print block; `applySheetMetrics()` in
`js/printables/printablesEngine.js`.
**Fix shipped** `applySheetMetrics()` now publishes `--pt-pdf-page-h` and `--pt-pdf-body-h` — the
real PDF page box (paper − margins, with the print root's padding correctly excluded in PDF mode)
and that box minus the already-measured 1.2in credit band — and the three constants are replaced
by `min(9.2in, var(--pt-pdf-body-h))`. Re-measured on the name puzzle, where the minimum is the
binding constraint, across all 15 of its configurations: **9 improved, 0 regressed**, Letter
landscape `fit` 0.72 → **1.000**, A4 landscape narrow 0.75 → **1.000**, Letter portrait
0.961 → **1.000**. On the cursive pages: 4 improved, 0 regressed, worst case 0.68 → 0.89.

**The `min()` is there because of a measurement.** `--pt-pdf-body-h` alone is 12.3in on Legal
narrow, and a sheet stretched to that overran its page — 20 Legal configurations that used to fit
started being scaled down. Taking the smaller of the physical limit and the old design limit keeps
the landscape repair and cannot make any paper worse than it was.

**Open residue** every sheet whose CONTENT is taller than the page, where a minimum height was
never the constraint: the word search at 40 words is 1,242px against a 720px landscape box, and
`fit` is 0.58 before and after. **A sheet that fits a landscape page needs a landscape layout, not
a smaller picture** — see FIX-1 and FIX-2.
**Evidence** `evidence/RF-002-nametracing-landscape.png`.

---

### RF-003 · The browser-print fallback detaches the clue list from its grid — P1 · **FIXED**

**Generators** `word-search-maker` · **Route** `/printables/word-search-maker/`
**Settings to reproduce** a word list that does not fit under the grid (≈20 words upward)
**Surface** print dialog only (the PDF writer paginates separately)
**Category** F reflow failure · H pagination

**Expected** the grid and the words a child has to find are on the same sheet.
**Actual** `.pt-search-words` carried `page-break-inside: avoid`, so a list that did not fit moved
to the next sheet **whole**. Measured with 40 words at Letter portrait: page 1 ended at
"Find all 38 words:" with roughly four blank inches under it (9.74% ink), and page 2 carried the
entire list plus the Name/Date row (5.89% ink).

**Root cause** SRC-3 — the print path and the PDF path paginate by different rules.
**Affected shared component** `style.css` `@media print` block.
**Fix shipped** the break-avoidance moved from the list to `.pt-search-words li`, so the list
breaks between words. Re-measured, same input: page-one ink 9.74% → **13.08%**, the grid and most
of the list now on one sheet.
**Evidence** `evidence/RF-003-print-list-detached.png`.

---

### RF-004 · A single over-long word overflows the scramble row and its answer line is cut off — P1 · **OPEN**

**Generators** `word-scramble-maker` · **Route** `/printables/word-scramble-maker/`
**Settings** default · **Input** any word longer than ~30 characters
(`Wolfeschlegelsteinhausenbergerdorff`) · **Paper** all · **Surface** PDF, PNG and print
**Category** B overflow · C clipping · P out-of-bounds

**Expected** a long word wraps, or the row scales, or the entry is reported as too long the way
the word search reports an unplaced word.
**Actual** the scrambled letters and the ruled answer line run past the page's content box:
measured at Letter portrait, `.pt-sc-scrambled` ends at x 779 and `.pt-sc-line` at x **891**
against a 720px box — **171px** past the edge. The exporter paints the clone into a
`foreignObject` of exactly the content width with `overflow: hidden`, so in the delivered file the
answer line is not merely off to the side, it is **gone**: the first row of the sheet has no line
to write on.

**Root cause** SRC-4 — a row whose width is content-driven with no wrap and no scale.
**Affected shared component** `.pt-sc-item` / `.pt-sc-scrambled` / `.pt-sc-line` in `style.css`;
`scSheetNode()` in `printablesEngine.js`.
**Recommended fix** give the letters `overflow-wrap: anywhere` and let the row wrap, and cap the
answer line at the remaining width — **not** a smaller font, which would shrink every row to suit
the worst one. `wordPuzzles.js` already has the right precedent in the word search's `unplaced`
reporting: say the word is too long rather than silently truncating the sheet.
**Evidence** `evidence/RF-004-scramble-longword.png`.

---

### RF-005 · Crossword answer key: the cell number sits on top of the answer letter — P2 · **OPEN**

**Generators** `crossword-maker` · **Route** `/printables/crossword-maker/`
**Settings** Answer key on · **Input** enough words to push the grid past ~16 columns
**Paper** all; worst on landscape, where the whole sheet is also scaled down
**Category** A collision · E misalignment

**Expected** the clue number sits in the cell's corner, clear of the letter.
**Actual** `.pt-cw-num` is absolutely positioned and `.pt-cw-letter` fills the cell; as the column
count rises both shrink but the number's inset does not, so they intersect. **338 measured
collisions** across 5 of the 11 crossword configurations, overlap area up to 31.5px² per cell, on
a letter of 13.6 × 17.5px. At 24 columns every numbered cell on the answer key is affected.

**Root cause** SRC-5 — a cell's furniture is positioned in absolute units while the cell is sized
in fractions of the grid.
**Affected shared component** `.pt-cw-cell` / `.pt-cw-num` / `.pt-cw-letter` in `style.css`.
**Recommended fix** derive the number's size and inset from the same `--pt-cw-cols` division the
letter already uses, so the two scale together. Bottom-aligning the letter was tried during this
pass and measured: it reduced the worst overlap from 85.1px² to 73.7px² and closed none of the
490 collisions, so it was reverted rather than shipped as a partial.
**Evidence** `evidence/RF-005-crossword-number-over-letter.png` (a 24-column answer key at 300
DPI: the digits are drawn through the letters).

---

### RF-006 · Banner pages carry the credit twice — P2 · **OPEN**

**Generators** `banner-maker` · **Route** `/printables/banner-maker/`
**Settings** default · **Input** any phrase · **Surface** PDF, PNG and print
**Category** A collision-adjacent · D crowding

**Expected** one credit block per printed page — the rule `attachCredit()` exists to enforce.
**Actual** `bannerPages()` appends its own `.pt-banner-page-foot` carrying `siteCredit()`, and
`attachCredit()` then appends the standard `.pt-credit` (URL + QR) to the same
`.pt-banner-page`. Every banner page prints the URL twice, once inside the flag grid's last row.

**Root cause** SRC-5 (a surface carrying page furniture the shared owner already provides).
**Affected shared component** `attachCredit()` / `creditNode()` in `printablesEngine.js`.
**Recommended fix** delete `pt-banner-page-foot`; the rule in `.claude/rules/printables.md`
("never hand-author a credit block") already names this as the owner.
**Evidence** `evidence/RF-006-banner-double-credit.png`.

---

### RF-007 · The live preview is a 66vh scroller, so the sheet the visitor checks is cut off — P2 · **OPEN**

**Generators** 7 · **Routes** `banner-maker`, `crossword-maker`, `word-search-maker`,
`word-scramble-maker`, `handwriting-worksheet-generator`, `letter-tracing`, `sight-word-tracing`
**Settings** default · **Viewport** laptop (1280×800) and desktop (1600×1000); **not** mobile,
where `@media (max-width: 900px)` already removes the cap
**Category** O responsive · C clipping

**Expected** a "Live preview · Print ready" panel shows the page that will print.
**Actual** `.pt-paper { max-height: 66vh; overflow: auto; }`. Measured content running past the
visible box:

| route | laptop | desktop |
|---|---|---|
| banner-maker | 1391.7px | 1259.7px |
| crossword-maker | 454.2px | 322.2px |
| word-search-maker | 347.1px | 215.1px |
| word-scramble-maker | 147.4px | 15.4px |
| the three tracing generators | 131.7px | — |

On the word search this puts the **Name/Date row below the fold at default settings** — which is
exactly what "the last word collides with the Name/Date section" looks like from the visitor's
side, and is why that report needed measuring rather than patching.

**Root cause** SRC-3 — preview and paper are different renderings of the same sheet, and only one
of them is bounded by the page.
**Affected shared component** `.pt-paper` in `style.css`.
**Recommended fix** scale the sheet to the panel (`transform: scale()` on a fixed-aspect page
frame) rather than clipping it, so the preview is a *page* at a smaller size instead of a window
onto part of one.

---

### RF-008 · The word-search grid stops being square on a phone — P2 · **OPEN**

**Generators** `word-search-maker` · **Route** `/printables/word-search-maker/`
**Settings** default level · **Input** enough words to reach a 22×22 grid
**Viewport** ≤ 414px · **Surface** preview only (the printed sheet is unaffected)
**Category** Q graphic rendering · E misalignment

**Expected** `.pt-search-grid` has `aspect-ratio: 1`; the grid is square.
**Actual** measured 280.8 × 321.9 at 320px (**12.8%** out of square) and 292 × 321.9 at 390px
(9.3%). The cell type size is `calc(19rem / var(--pt-search-cols))`, which does not shrink with
the container, so at 22 columns the rows' minimum content height beats the aspect ratio and the
cells stop being square — letters sit off-centre in their cells in the preview.

**Root cause** SRC-2 — a figure sized in absolute units inside a box sized in relative ones.
**Recommended fix** make the cell type a container query unit of the grid
(`container-type: size` on the grid, `font-size: calc(90cqmin / var(--pt-search-cols))`), the
pattern `.pt-paper-inner` already uses in this stylesheet.

---

### RF-009 · Horizontal page scroll at 320px on the three tracing generators — P3 · **OPEN**

**Generators** `handwriting-worksheet-generator`, `letter-tracing`, `sight-word-tracing`
**Viewport** 320 × 720 only · **Category** O responsive

`#pt-gen-png` ("Download PNG") is 106.6px wide in a row that puts it 12.5px past the viewport,
giving the page 13px of horizontal scroll. Measured at 320px; clean at 390px and above.

---

### RF-010 · A default word search prints a second page carrying only the credit — P2 · **OPEN**

**Generators** `word-search-maker`, and the same shape on `crossword-maker` and
`word-scramble-maker` · **Surface** print dialog only
**Category** H pagination

The PDF writer already refuses this: `foldTrailingCredit()` folds a trailing credit-only page
back, after one was measured at 0.59% ink against 3.31% on page one. The print dialog has no
equivalent and cannot be given one by a break rule — measured, the sheet is genuinely about 0.4in
taller than the print box (grid 6.4in + heading + note + list + footer + 1.2in credit against a
9.32in usable height), so page 2 carries the credit at **0.97% ink**.

`break-before: avoid` on `.pt-credit` was tried and **rejected**: it does not reduce the page
count and it pushed the Name/Date row off page one. Recorded here rather than shipped, because a
rule that moves the defect around is worse than one that is not there. The real fix is FIX-1.

---

### RF-011 · The 4-up page used the print dialog's page box in PDF mode — P3 · **FIXED**

`.pt-sheet-page.is-nup` took `height: var(--pt-page-h)`, which subtracts `PRINT_PADDING_IN`
(0.34in) — correct for the print dialog, where `#pt-print-root` has 1rem of padding, and 0.34in
short in PDF mode, where the same rule sets `padding: 0`. Every 4-up PDF was a third of an inch
short of its page. Fixed by the same `--pt-pdf-page-h` that closes RF-002.

---

### RF-012 · Pseudo-elements on a print-surface class would vanish from the PDF and PNG — P3 · **PREVENTIVE**

`cloneNode()` does not reproduce `::before`/`::after`, and `inlineStyles()` walks real elements
only, so a decorative pseudo-element on a sheet paints on screen and in the print dialog and is
absent from every exported file. **No print-surface rule uses one today** — this is recorded
because the new gate reports them, which is the moment to notice rather than after a sheet ships
missing its bullet glyphs.

---

### RF-013 · Sheet content is capped in inches, not in fractions of the page — P2 · **OPEN**

`max-width: 6.4in` (search grid, crossword grid, clue columns, word bank, scramble list) and
`max-width: 34rem` (the on-screen equivalents) are absolute caps. On Letter portrait the content
box is 7.5in, so 1.1in of every sheet is unused; on Legal narrow it is 7.5in against a 13in page;
on landscape it is 6.4in of a 10in page while the same sheet is simultaneously being scaled down
for being too tall. This is the width half of RF-002 and is fixed by the same change.

---

### RF-014 · Instrument finding, not a defect: ink measured outside a viewBox — **NOT REPORTED**

A fourth instrument in this pass measured each sheet SVG's text ink (via the repo's own
`glyphMetrics.ink`, positioned analytically from `x`/`y`/`text-anchor`/`dominant-baseline` and the
element's CTM) against its declared `viewBox`, and reported 1,264 overruns across 11 surfaces.
**It is not reported as defects**, because a hand check disagreed with it: on
`/printables/dot-to-dot-alphabet/`, the instrument put the leftmost label 54.7 units left of a
0–800 viewBox while `getBBox()` puts that label's whole em box at x 33.7, and the rendered PDF
shows the label complete. One checked case being wrong is enough to withdraw the number.

The question it was asked is still a real one and the existing tooling already answers it
correctly for letterforms: `js/printables/strokeRoute.test.html` measures against a **raster** of
the glyph rather than against computed metrics. Extending that approach to whole-sheet ink is
listed in §7.

---

## 4. Settings interaction failures

Combinations that are each individually valid and fail together. Counts are measured invariant
violations in that one configuration, across the generators of that surface kind. The
`INK-OUTSIDE-VIEWBOX` metric is excluded throughout, for the reason in RF-014.

| Surface kind | Content | Paper | Orientation · margins | Violations | What fails |
|---|---|---|---|---|---|
| list (search, crossword, scramble) | 40 long words (the cap) | Letter | landscape · normal | **197** | clue numbers over answers, clue list out of its box, sheet at 58% |
| list | 40 long words + answer key | A4 | landscape · narrow + ink saver | **197** | as above, on both the puzzle and its key |
| list | roster of 10 (a class set) | Letter | landscape · normal | **126** | every child's sheet, same failure |
| list | 40 long words + answer key | A4 | landscape · narrow | 21 | as above |
| list | `Wolfeschlegelsteinhausenbergerdorff` (one word) | Letter | portrait · normal | 4 | the answer line runs 171px off the page and is cut from the file |
| gen (3 tracing generators) | longest name | Letter | landscape · normal | 30 | sheet at 61% |
| gen | widest run `WMWMWM` | A4 | landscape · narrow | 30 | sheet at 61% |
| name (12 routes) | **single character** | A4 | portrait · normal | 12 | **sheet at 27%** — RF-015 |
| name | longest name | Letter | landscape · normal | 21 | sheet at 27–73% |
| name | widest run | A4 | landscape · narrow | 21 | worst measured: **19.7%** |
| name | roster of 10 | Legal | portrait · narrow | 17 | sheet scaled on a page with 3in to spare |
| design (2 routes) | roster of 10 | Legal | portrait · narrow | 11 | sheet scaled on a 13in page |
| puzzle | any name | Letter | landscape · normal | 28 | sheet at 72% before this pass, 100% after |
| crossword | 12+ words, answer key on | any | any | 338 | numbers over letters; worsens as the grid grows |

Three readings worth keeping:

1. **Landscape is the single strongest interaction.** 421 of the 576 measured scale failures are
   landscape configurations. Nothing about landscape is wrong in the print settings — the page box
   is correct — but no sheet's layout changes shape for it.
2. **The extremes of input length fail at BOTH ends,** and the short end fails harder. A 30-letter
   name is handled better (71%) than a one-letter name (27%).
3. **A roster multiplies whatever the single-sheet case does.** "Whole class" turns one defective
   sheet into thirty.

---

## 5. Systemic root causes

Ranked by breadth of impact, measured — not by how serious they feel.

### SRC-1 — The export clone carries an allow-list of CSS properties and pins the boxes the missing ones produced

**Affected generators** 2 directly (word-search, crossword), **all 27 potentially**
**Affected settings** every setting, on every sheet, because the mechanism is not
setting-specific
**Failure mechanism** `printablePdf.js` exports by cloning the print surface and calling
`inlineStyles()`, which copied 96 named computed properties onto the clone (121 now). `width` and `height`
are among them. Any property that produced the layout and is *not* among them is dropped — so the
clone keeps the box and loses the rule that filled it, the children reflow inside a box that still
reports the old size, and they paint over whatever follows. `column-count` and `column-width` were
the two that mattered; the same hole was open for `word-break`, `hyphens`, `overflow-wrap`,
`aspect-ratio`, `fill-rule`, `clip-path` and 18 others.
**Why nothing caught it** the DOM is correct. Preview is correct. Every geometry assertion over
the print surface passes. The defect exists only in the clone, which lives for one animation frame
inside the exporter.
**Architectural correction (shipped)** carry the properties the print surfaces actually declare,
and **gate the two lists against each other**: `npm run check:print-export-properties` parses
`PROPS` out of `printablePdf.js`, parses the properties declared by print-surface rules out of
`style.css`, and fails when the second is not covered by the first plus a documented list of
properties that cannot affect a static raster. It exits 2 rather than 0 when it cannot find either
side. Negative-tested: removing `columns` from `PROPS` turns it red and names the rule.

### SRC-2 — A figure's printed size is derived from its content, not from its page

**Affected generators** 22 of 27 · **Affected settings** paper, orientation, margins, and the
length of whatever the visitor types
**Failure mechanism** three separate expressions of one idea:

* a row SVG whose viewBox is `chars.length × 118 + 80` wide and 200 tall, laid out `width: 100%;
  height: auto` — so a short word makes a **tall** row (RF-015);
* `min-height: 9.2in` on three sheets, which is US Letter portrait's content height written as a
  constant (RF-002);
* `max-width: 6.4in` / `34rem` caps on every grid and list, which are absolute where the page is
  variable (RF-013), and `font-size: calc(19rem / cols)` on a grid cell whose box is a fraction of
  its container (RF-008).

In every case the sheet's geometry is fixed and `renderPages()`'s `fit` is what varies — and
because `fit` scales both axes, a sheet that is 4× too tall also comes out ¼ as wide.
**Architectural correction** the sheet must take its height from the page and give the figure what
is left, rather than the page taking its scale from the sheet. `.pt-sheet-page.is-nup` and
`.pt-design-print-holder .pt-design-sheet-svg` already do this with `--pt-page-h`; the pattern
exists and stops at the surfaces that need it most. Partly shipped: `--pt-pdf-page-h` and
`--pt-pdf-body-h` are published and the three hardcoded heights are gone. FIX-1 is the rest.

### SRC-3 — Three renderers paginate and bound the same sheet by three different rules

**Affected generators** every tool with a download button · **Affected settings** paper, content
length
**Failure mechanism** the preview is bounded by `max-height: 66vh; overflow: auto`, the PDF by
`renderPages()`'s page cuts and `SINGLE_PAGE_TOLERANCE` and `foldTrailingCredit()`, and the print
dialog by `@media print` break rules. The three disagree: a sheet the PDF folds onto one page
prints as two (RF-010); a list the PDF keeps with its grid the print dialog moves to the next sheet
(RF-003); a page the visitor approves in the preview is one they have only seen the top two-thirds
of (RF-007).
**This is the 2026-09-17 audit's S-2 finding, one layer up.** That entry is about the three
renderers drawing different *marks*; this is about them choosing different *page boundaries*.
**Architectural correction** one pagination owner. `renderPages()` already computes cut points
that respect atoms; the print CSS should be generated from the same description rather than
hand-kept beside it, exactly as `gridSectionsHTML()` is sliced out and executed by the build-time
generator so static and runtime markup cannot drift.

### SRC-4 — A row's width is content-driven, with no wrap and no report

**Affected generators** 1 measured (word-scramble), the pattern is general
**Failure mechanism** `.pt-sc-item` lays out letters and a ruled line in one row with no wrapping
rule, so a long enough word pushes the line off the page; the exporter's `foreignObject` has
`overflow: hidden`, so what is off the page is absent from the file rather than merely misplaced.
**Architectural correction** the word search already has the right answer for the same problem —
`unplaced` reports the word that did not fit rather than truncating the sheet. Wrapping plus an
explicit "too long" report, not a smaller font.

### SRC-5 — A surface carries page furniture the shared owner already provides, or positions it in units the cell does not use

**Affected generators** 2 measured (banner, crossword)
**Failure mechanism** `bannerPages()` appends its own credit line beside the one `attachCredit()`
adds (RF-006); `.pt-cw-num` is inset in absolute pixels inside a cell whose size is a fraction of
`--pt-cw-cols` (RF-005), so the two scale apart and collide.
**Architectural correction** the rule already exists for the credit
(`.claude/rules/printables.md`: "never hand-author a credit block") and the same discipline gives
the crossword number its size *and its inset* from `--pt-cw-cols`.

---

## 6. Visual invariants

Discovered during the audit, stated so they can be asserted. The first four are implemented in
`js/printables/renderInvariants.js` and gated by `npm run test:render-invariants`.

| # | Invariant | Implemented | Why it exists |
|---|---|---|---|
| I-1 | **Two sibling regions of a sheet never share space.** | `overlaps()` | siblings in flow overlap only when something was positioned or sized by a number |
| I-2 | **A box's children stay inside it unless it clips them.** | `spills()` | the only rule that catches a defect the DOM cannot show (RF-001) |
| I-3 | **Nothing extends past the printable width.** | `outOfBounds()` | the exporter's `foreignObject` has `overflow: hidden`, so past the edge means absent (RF-004) |
| I-4 | **A page is not made to fit by shrinking it.** | `fitScale()` | `fit` is a last resort, and at 0.27 it is a defect (RF-015) |
| I-5 | Preview and exported file preserve the same geometry for every element. | harness (`cloneDiff`) | RF-001 was found by this and by nothing else |
| I-6 | The credit block is never the only content on a printed page. | — | RF-010; the PDF writer enforces it, the print path does not |
| I-7 | A page unit is never taller than its page box by more than the single-page tolerance. | — | the honest version of I-4 for multi-page jobs |
| I-8 | A box declaring `aspect-ratio: 1` measures square at every viewport. | harness (responsive pass) | RF-008 |
| I-9 | No printable page scrolls horizontally at 320px. | harness (responsive pass) | RF-009 |
| I-10 | Every visible setting changes the exported file, not only the page box. | harness (matrix) | the whole of §4 |
| I-11 | A sheet's printed size does not depend on the length of what the visitor typed. | — | RF-015; the sharpest statement of SRC-2 |

**I-11 is the one to add next.** It is a single assertion — render the same sheet with a
one-character and a thirty-character input and require the page unit's height to differ by less
than a row — and it fails today on 15 of 27 generators.

---

## 7. Automation opportunities

What each defect class could be prevented by, and what now exists.

| Defect class | Prevented by | Status |
|---|---|---|
| RF-001 · a property dropped from the export | **static CI gate** comparing the exporter's allow-list against the print CSS | **shipped** — `npm run check:print-export-properties`, wired into `validate.yml`, negative-tested |
| RF-001, RF-004 · geometry the DOM cannot show | **DOM bounds assertions over the exporter's own clone** | module **shipped** (`js/printables/renderInvariants.js`); the clone capture lives in the audit harness and needs a browser, so it is not in CI |
| I-1 … I-4 regressions | **pure-geometry node test with recorded fixtures** | **shipped** — `npm run test:render-invariants`, 21 assertions, including the RF-001 geometry measured before and after the fix |
| RF-002, RF-015 · scale failures | **a `fit` budget per surface**: render each sheet at each paper × orientation and fail when `fit` drops below a floor | designed, not built — needs the browser harness; the numbers in §4 are what it would assert |
| RF-003, RF-010 · print pagination | **`/Type /Page` count per paper × orientation**, which `.claude/skills/printables-surface` already asks for by hand | the harness does it; worth a scripted run per release |
| RF-007, RF-008, RF-009 · responsive preview | **viewport sweep asserting no horizontal scroll, no content past a scroll box, and square boxes square** | harness pass exists (27 routes × 5 viewports) |
| RF-014 · ink outside a viewBox | **raster-based ink measurement**, the method `strokeRoute.test.html` already uses for glyph routes, applied to whole sheets | not built — and the analytic shortcut was tried in this pass and withdrawn |
| font substitution between preview and PDF | **font-loading assertion** in the exporter: fail the export when a face the sheet needs was not embedded | not built |
| pixel regressions | **screenshot comparison on a small fixture set, informational only** | deliberately not built — `render-regression-plan.md` already records why pixel diffs on printables train people to ignore them, and this pass found nothing that geometry could not describe |

**On visual regression specifically.** The question the brief asks — can existing Playwright or
screenshot infrastructure support this — has a clear answer: there is none in the repository, by
choice, and the choice is right for pixels. What this audit needed and built instead is a
**geometry** harness: a static server, headless Chromium, and a wrapper around the PDF module that
measures the print surface, the exporter's clone and the browser-print state at the moment of
export. Every number in this document came from it, it is deterministic (two independent runs of
670 configurations produced byte-identical output), and the part of it that needs no browser is
what has been committed.

---

## 8. Fix plan

Grouped by root cause, ordered by blast radius and dependency. **Prefer one systemic fix over
twenty page-specific patches** — and in three places below, a CSS offset or a hardcoded margin
would only move the defect, which is called out where it applies.

### Shipped in this pass

| # | Fixes | Root cause | Change |
|---|---|---|---|
| S-1 | RF-001 (P0) | SRC-1 | `columns` + 24 properties added to `PROPS`; `check:print-export-properties` gate wired into CI and negative-tested |
| S-2 | RF-002 (part), RF-011 | SRC-2 | `--pt-pdf-page-h` / `--pt-pdf-body-h` published by `applySheetMetrics()`; three `min-height: 9.2in` replaced; 4-up page height corrected |
| S-3 | RF-003 | SRC-3 | print-CSS break avoidance moved from `.pt-search-words` to its `li` |
| S-4 | prevention | SRC-1, I-1…I-4 | `renderInvariants.js` + `renderInvariants.test.js` (21 assertions, recorded fixtures), gated in CI |

### Verification of what shipped

The whole 670-configuration matrix was re-run against the repaired tree with the same harness,
and compared row for row with the baseline. Invariant violations, `INK-OUTSIDE-VIEWBOX` excluded
per RF-014:

| invariant | baseline `11d281455` | shipped | |
|---|---|---|---|
| `EXPORT-SPILL` — a child escaping its box in the exported clone | 19 | **1** | the one left is RF-004, a different cause |
| `EXPORT-GEOMETRY-DRIFT` — an element in a different place in the file than on the page | 43 | **17** | the rest is the banner's own `dy -14.4` offset, RF-006's page |
| `FIT-SHRINK` — a page the rasteriser had to scale | 576 | **542** | RF-015 and RF-002's residue |
| `COLLIDE` — two sibling regions sharing space | 338 | **338** | RF-005, untouched and unamplified |
| `EXPORT-COLLIDE` | 5 | **5** | RF-005 in the clone |
| `OOB-WIDTH` | 4 | **4** | RF-004 |
| **total** | **985** | **907** | |

Nothing regressed. `COLLIDE` staying flat is the number that mattered most to check: a first
attempt at S-2 pushed it to 490 by shrinking the crossword's cells, which is how that attempt was
caught and reverted.

---

### FIX-1 — the ruled band takes its height from the page, the word from its band · closes RF-015 (P0), most of RF-002, and RF-013

The largest single change and the one everything else waits on. Today a practice row is **one SVG
holding both the ruling and the word**, with a viewBox sized to the word — so the ruling cannot
span the page and the row cannot take the page's height.

1. `nameSheetNode()` / `genSheetNode()` publish the row count they actually built as a custom
   property on the sheet (the engine knows it; CSS does not, and **estimating it is the failure
   mode this repo has already paid for twice**).
2. The row becomes a band whose height is `--pt-pdf-body-h` divided by that count. `addRuling()`
   draws into the band's own coordinates — it is already documented as "the one owner of a
   ruling".
3. The word is placed inside the band at the band's scale, in its own box, centred.
4. `fit` stops being the adaptation mechanism: assert `fit ≥ 0.95` for every name and gen surface
   at every paper × orientation as the acceptance test.

**Not this:** capping `max-height` on the row. It makes the sheet the right height and shrinks the
ruling with the word, which is the same defect wearing a smaller number.

### FIX-2 — a landscape sheet gets a landscape layout · closes the RF-002 residue

With FIX-1 in, the puzzle sheets are the remaining `fit < 1` cases, because a square grid plus a
clue list below it is a portrait shape. On a landscape page the grid and the list should sit side
by side. The engine already knows the orientation; the sheet needs a class and the two-column
rule. Acceptance: `fit = 1.0` for every puzzle surface on both landscape papers.

**Not this:** shrinking the grid to make the portrait stack fit. Measured during this pass — a
first attempt at S-2 used `flex: 1 1 auto` and the figure absorbed the compression, taking the
crossword grid from 614px to 488px. It was reverted, and the reasoning is recorded in the
stylesheet so the next attempt does not repeat it.

### FIX-3 — one pagination owner · closes RF-010, prevents the RF-003 class

Generate the print CSS's break rules from the same description `renderPages()` cuts by, rather
than maintaining them alongside. Until then the print path will keep disagreeing with the file.

### FIX-4 — the preview is a page, not a window · closes RF-007

Scale the sheet into the preview panel with `transform: scale()` on a fixed-aspect page frame,
instead of `max-height: 66vh; overflow: auto`. The visitor then sees the whole page at a smaller
size, which is what "Print ready" claims.

**Not this:** raising the `max-height`. It moves the fold rather than removing it, and at some
content length the Name/Date row goes back under it.

### FIX-5 — small, independent, one file each

| Fix | Closes | Change |
|---|---|---|
| a | RF-004 | `overflow-wrap: anywhere` on the scramble letters, the answer line capped to the remaining width, and an explicit "too long" report in the sheet meta |
| b | RF-005 | `.pt-cw-num`'s size **and inset** both derived from `--pt-cw-cols` |
| c | RF-006 | delete `pt-banner-page-foot`; `attachCredit()` already owns the credit |
| d | RF-008 | `container-type: size` on `.pt-search-grid`, cell type in `cqmin` |
| e | RF-009 | let the PNG button wrap at 320px |

Dependencies: FIX-2 depends on FIX-1 (there is no point re-flowing a sheet whose rows still size
themselves from the word). FIX-5b should land with S-2, because a sheet that fills its page
correctly makes the crossword collision more visible, not less. Everything else is independent.

---

## 9. Localization

The 69 locale printable routes are mirrors of the English ones and share every mechanism above, so
they inherit every defect above. **857 configurations across 61 of them** were driven through the
same harness at a reduced set (default, longest input, widest input, accented input × the paper
rotation), against the repaired tree. The residue is the English residue, in the same proportions:

| | violations | routes | worst |
|---|---|---|---|
| de | 41 | 7 | sheet at 20% |
| es | 49 | 8 | sheet at 20% |
| fr | 37 | 6 | sheet at 20% |
| pl | 44 | 6 | sheet at 20% |
| pt | 31 | 5 | sheet at 20% |
| it | 30 | 5 | sheet at 43% |
| id | 23 | 4 | sheet at 61% |
| nl | 6 | 1 | sheet at 78% |

251 of the 261 are `FIT-SHRINK` — RF-002 and RF-015 arriving on the mirrors, with `nome-para-tracar`
(pt) at **0.639 on US Letter portrait at its own default**. The other 10 are the banner export drift
that RF-006's page also shows in English. **No locale produced a defect class the English route did
not**, which is the useful finding: fixing the shared mechanism fixes 96 routes, not 27.

Two questions are specific to the mirrors:

* **Do longer UI strings change the sheet's geometry?** The sheets' own strings (`Name:`, `Date:`,
  "Find all N words") are the only translated text on a printed sheet, and they sit in a centred
  flex row that wraps. No locale-specific geometry violation was measured that the English route
  did not also produce.
* **Do accented and extended characters change what the export draws?** A separate check of the
  exporter's clone reported drift on accented input across seven routes; it was traced to the
  measuring harness's own font subsetting rather than to the exporter (`fontCssFor()` filters the
  embedded faces by `unicode-range` against the sheet's real text, which is correct), and a
  rendered PDF of `Ñandú Őzike` shows both diacritics intact in the right face. Recorded here
  rather than reported as a defect, because the first reading was wrong and the wrong reading is
  the one a future audit will repeat.

One locale-specific product note, not a defect: the print-settings panel's **High contrast (for
photocopying)** control is English-only by an owner decision of 2026-09-17, recorded in
`printPrefs.js`. Seven locales therefore have a four-control panel where English has five. That is
a decision, and it is where a future pass should look before "adding a missing control".

---

## 10. What the harness is, and how to re-run it

The harness is not in the repository: it needs a browser and a font, the same reason
`js/counter/counter.test.html` and `js/printables/strokeRoute.test.html` are not in CI. What is in
the repository is the part that does not — `js/printables/renderInvariants.js` and its test, which
hold the rules the harness asserts.

Its shape, for whoever rebuilds it:

1. a static file server over the repo, plus a cached copy of the one Google Fonts stylesheet the
   pages request, so the run is offline and deterministic;
2. headless Chromium, with an init script that defines `window.UltraTextGen.pdf` as an accessor —
   so when `printablePdf.js` assigns itself, the harness wraps `renderPages()` and measures at the
   exact moment the exporter has the print surface laid out at the chosen paper's width;
3. inside that wrapper: the DOM print surface, the exporter's **clone** rebuilt with the same
   allow-list and laid out in an iframe carrying the same faces, and the same wrap measured again
   in the browser-print state;
4. `window.print` stubbed, so the print surface survives for a `page.pdf()` capture of the real
   print output;
5. the matrix: every surface × content case × paper/orientation/margin rotation, plus explicit
   stress combinations.

**Determinism was verified**, because an instrument that drifts is worse than none: two
independent 670-configuration runs against the same tree produced byte-identical result files.

**Three instrument errors were found and corrected during the run**, each of which would have
produced confident false findings. They are recorded because the next pass will hit them too:

* the clone was first measured in a **fresh** iframe per configuration, whose webfonts started
  cold — every text box measured as drifting;
* the harness measured each job **twice** (once for the PDF state, once for the print state) and
  the second pass overwrote the first, capturing a print surface that is `display: none` on
  screen, i.e. a tree of 0×0 boxes;
* the SVG ink check measured `<text>` with `getBBox()`, which returns the font's **em box** — the
  exact mistake the 2026-09-17 audit documents — and its analytic replacement disagreed with a
  hand check, so its output was withdrawn rather than reported (RF-014).

---

## 11. The final question

> **What are the smallest number of shared rendering or layout changes that would eliminate the
> largest number of visual defects across UTG printables?**

**Three.**

1. **Give the sheet its height from the page and the figure what is left** (FIX-1, and S-2 which
   is already in). One change to how a practice row is built closes the audit's worst defect
   (RF-015, 15 generators, sheets printed at 19.7–27%), most of the broadest one (RF-002, 22
   generators, 576 configurations), and the width half of it (RF-013). It also removes the
   *mechanism* behind every remaining scale failure, because it stops `renderPages()`'s `fit` from
   being how a sheet meets its paper.

2. **Make the exporter's clone a checked artifact rather than a hopeful one** (S-1, shipped). One
   gate closes the audit's other P0 and, more importantly, closes the whole class: a property the
   print surface starts using and the export does not carry is now a red CI step instead of a
   sheet that silently loses its content. This is the cheapest change in the plan and the one with
   the longest tail.

3. **One pagination owner across preview, PDF and print** (FIX-3, FIX-4). The three renderers
   disagreeing about where a page ends is what produces the credit-only sheet, the detached clue
   list, and a preview that shows two-thirds of what will print. It is one description consumed
   three times instead of three descriptions kept in step by hand — the pattern this repo already
   uses for `gridSectionsHTML()` and for `printPrefs.js`.

Everything else in the register is a one-file fix that can land in any order.

### Implementation sequence

| Step | Work | Depends on | Blast radius |
|---|---|---|---|
| 1 | **S-1, S-2, S-3, S-4** — shipped in this pass | — | the export path and three print rules; verified by re-measuring 670 configurations |
| 2 | **FIX-5b** (crossword number inset) | ships beside S-2, which makes the collision more visible | one selector |
| 3 | **FIX-1** — row band takes the page's height | step 1 (needs `--pt-pdf-body-h`) | 15 generators, every name and gen sheet; the highest-value and highest-risk change in the plan, and the reason it is not in this PR |
| 4 | **FIX-2** — landscape layout for the puzzle sheets | FIX-1 | 3 generators; visual redesign, owner decision |
| 5 | **FIX-3** — one pagination owner | FIX-1 (pagination of a correctly-sized sheet is a different problem) | every tool with a download button |
| 6 | **FIX-4** — the preview is a page | independent | 7 previews |
| 7 | **FIX-5 a, c, d, e** | independent | one file each |

Steps 1 and 2 are safe now. Step 3 is the one that needs an owner in the room, because it changes
what every tracing sheet on the site looks like — and because getting it wrong by estimating a
footer's height is the specific failure `--pt-body-h` exists to prevent.
