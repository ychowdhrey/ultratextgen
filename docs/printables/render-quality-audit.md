# Printables Render Quality Audit

**Question asked:** when UltraTextGen promises a particular printable, does the generated artifact
actually render correctly, look intentional, print correctly, and match what a user would
reasonably expect?

**Run** 2026-09-17 against `main` (`3d7ef668b`). 24 live tools discovered from
`/printables/`, 211 pages on disk. Every tool was driven in a browser before any code was read.
Normalized defects live in [`render-defect-registry.md`](render-defect-registry.md); shared causes
in [`render-systemic-findings.md`](render-systemic-findings.md).

**Short answer.** The printables render. Several of them do not render the thing the page
promises. Two defects rise to R1: the dotted tracing levels trace the *outline* of the letter
rather than the stroke a pencil follows, and the coloring sheet silently discards every character
past the fourteenth. A third, the ruled-line registration, is R1 for the same reason a wrong
number on a Check surface is: a handwriting worksheet whose guide lines do not correspond to any
letter class teaches the child the wrong relationship.

Most of the rest traces to three shared mechanisms rather than to individual pages, which is the
more useful finding and is the subject of the systemic document.

---

## How this was measured

Every geometric claim comes from pixels or from the DOM, not from looking at a screenshot.

* **Browser** headless Chromium 1194 with the real webfonts each page requests, fetched through
  the agent proxy and served back to the page. `Quicksand`, `Fredoka`, `Baloo 2`, `Archivo Black`,
  `Playfair Display` and the graffiti faces all load; a run without them measures fallback metrics
  and is worthless.
* **Geometry** the generated SVG markup is lifted from the live page and re-rendered standalone at
  an exact integer scale, because the on-page preview is height-capped (R-017) and its rendered
  box is not a scale model of the sheet. Ink bounds are then read from the raster, so "visible
  ink" is measured rather than `getBBox()`, which on a `<text>` node returns the font's em box and
  not the ink.
* **Print** exports are downloaded as real files through the browser's download path, then
  rasterised with PyMuPDF and measured in inches against the page box.
* **Distinctions kept separate** throughout: DOM box centring, SVG viewBox centring, font-metric
  centring, visible-ink centring. R-005 exists precisely because three of those agree and the
  fourth does not.

Reproduction scripts are listed in [`render-test-fixtures.md`](render-test-fixtures.md).

---

## Defect matrix

`Screen` = live preview · `Print` = PDF/print path · `PNG` = downloaded raster.

| ID | Printable | Input / state | Screen | Print | PNG | Problem | Expected | Actual | Sev | Root cause | Reusable fix |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R-001 | handwriting-worksheet-generator, letter-tracing, sight-word-tracing | `minimum`, Bold/Fine dotted | FAIL | FAIL | FAIL | Dots sample the glyph contour | One dot path down each stroke centre | Dots on both stem edges; `o` is two concentric rings; 0–2 dot columns per stem at one height | R1 | PATH_GENERATION | `TracePath` + `DotSampler` on a skeleton, not `stroke-dasharray` on an outline |
| R-002 | same three | any, ruled rows | FAIL | FAIL | FAIL | Guides do not match any letter class | Caps/ascenders touch top line, x-height touches midline | Caps 15.0–15.5 short, ascenders 10.3 short, x-height 17–18 over, only baseline correct | R1 | FONT_METRICS | `RuledLineSystem` solving size from the band via real font metrics |
| R-003 | coloring-page-maker | `ABCDEFGHIJKLMNOPQRSTUVWXYZ` | FAIL | FAIL | FAIL | Silent truncation at 14 chars | All accepted input rendered, or a visible limit | 12 of 26 characters dropped, no cue | R1 | TEXT_WRAP | Fit-to-width in `PrintableCanvas`; cap the field to what renders |
| R-004 | coloring-page-maker | fills: dots/stripes/hearts/stars | FAIL | FAIL | FAIL | Pattern tile anchored to page origin | Decoration placed relative to the glyph | Same `A` gets tile phase 4.6 / 33.2 / 13.8 / 0.2 as the word lengthens | R2 | PATTERN_ORIGIN | `PatternFill` taking the glyph's ink box as its origin |
| R-005 | all single-letter tiles + monogram | `A O E I W g p x Q` | FAIL | FAIL | FAIL | `dominant-baseline="central"` centres the em box | Ink optically centred in the tile | Caps sit 13.0–15.3 low; top gap ≈2× bottom; `g p Q` reach y=239.7 of 240 | R2 | FONT_METRICS | `VisibleBoundsCalculator` + `OpticalCenter` |
| R-006 | bubble, block, name-tracing, alphabet-coloring, graffiti, monogram | `WMWMWM`, `WWW` | FAIL | FAIL | PASS | viewBox width is `chars × 118 + 80` | Box measured from the text | block-letters ink spans −43…831 in a 788 box | R2 | BOUNDING_BOX | Measure advance width, then size the box |
| R-007 | coloring-page-maker, dot-to-dot-name, name-puzzle-maker | Letter landscape | PASS | FAIL | N/A | Portrait sheet letterboxed onto landscape | Layout uses the wider page | L=3.74in R=3.72in, coverage 17.1% vs 30.5% portrait | R2 | PAPER_SIZE | `PaperLayout` that composes per orientation |
| R-008 | bubble, block, name-tracing, alphabet-coloring | `Emma` | FAIL | n/a | PASS | Preview grey, export black | Same colour in both | preview `#8b93a7` (lum 147) vs PNG lum 27 | R2 | EXPORT_PIPELINE | One renderer feeding both paths |
| R-009 | bubble, block, name-tracing, graffiti | `I` … `Christopher` | PASS | n/a | FAIL | Fixed 1600×520 canvas | Canvas follows the composition | preview aspect 1.000→6.890, PNG fixed 3.077 | R2 | CANVAS_SCALING | Derive canvas from the same layout object |
| R-010 | name-tracing, handwriting, letter-tracing | stroke direction on, `Emma` | FAIL | FAIL | N/A | Overlay calibrated to a font that is not used | Start dot on the letter, arrow inside it | 7/12 and 7/13 dots off the body, worst 24.8 units | R2 | FONT_METRICS | `StrokeDirectionOverlay` placed from measured metrics |
| R-011 | 8 cursive/calligraphy pages | any | FAIL | FAIL | FAIL | Maths codepoints, no cursive font requested | A cursive face with joins | U+1D49C in a Plus Jakarta Sans stack; 10 of 11 Letterlike glyphs resolve to a second face | R2 | ASSET | Ship a real joined cursive face, or withdraw the claim |
| R-012 | dot-to-dot-name | `Emma` | FAIL | FAIL | FAIL | Point density does not scale with letter size | Enough points to read as the letter | `a` = 6 points, one polygon, counter dropped; gap ratio 16.4 | R2 | PATH_GENERATION | Sample by arc length, not by a fixed budget |
| R-013 | coloring-page-maker, dot-to-dot-name, name-puzzle-maker, handwriting | `I`, `Christopher` | FAIL | FAIL | FAIL | 3-step font size, no fit | Artwork sized to the sheet | `I` = 4.4% of page area; 4.35in blank above vs 0.59in below | R3 | CSS_LAYOUT | Fit-to-box in `PrintableCanvas` |
| R-014 | coloring-page-maker | ink saver on | FAIL | PASS | N/A | Setting invisible until export | Preview shows it | PDF darkest 28→90, preview unchanged | R3 | PRINT_CSS | Drive preview from the same prefs |
| R-015 | name-puzzle-maker; all PNG | `Emma` | N/A | FAIL | FAIL | Credit duplicated / misaligned | One credit block, internally aligned | URL printed twice on the puzzle PDF; URL centred and QR hard-right on different baselines in PNG | R3 | EXPORT_PIPELINE | One `attachCredit` owner |
| R-016 | all word-outline tools | 390px viewport | FAIL | N/A | N/A | Preview too small to judge | Legible preview on a phone | 39px-tall preview of `Christopher`, scale 0.196 | R3 | RESPONSIVE_SCALING | Min preview height, or a zoom affordance |
| R-017 | handwriting, letter-tracing, sight-word-tracing | any | FAIL | PASS | PASS | Preview height-capped, aspect not preserved | Preview is a scale model | 584×210 viewBox shown in a 1752×93 box | R4 | CSS_LAYOUT | Cap by aspect, not by height |

---

## Per-printable scorecard

`PASS` · `ISSUES` (works, has a defect) · `FAIL` (does not deliver the promised artifact) · `N/A`.

| Printable | Geometry | Typography | Patterns | Paths | Print | Export | Pagination | Paper sizes | Stress inputs | Cross-browser |
|---|---|---|---|---|---|---|---|---|---|---|
| handwriting-worksheet-generator | ISSUES | **FAIL** | N/A | **FAIL** | ISSUES | PASS | PASS | PASS | ISSUES | NOT TESTED |
| letter-tracing | ISSUES | **FAIL** | N/A | **FAIL** | ISSUES | PASS | PASS | PASS | ISSUES | NOT TESTED |
| sight-word-tracing | ISSUES | **FAIL** | N/A | **FAIL** | ISSUES | PASS | PASS | PASS | ISSUES | NOT TESTED |
| name-tracing | ISSUES | ISSUES | N/A | ISSUES | PASS | **FAIL** | PASS | PASS | **FAIL** | NOT TESTED |
| coloring-page-maker | ISSUES | ISSUES | **FAIL** | PASS | ISSUES | ISSUES | PASS | ISSUES | **FAIL** | NOT TESTED |
| alphabet-coloring-pages | ISSUES | ISSUES | N/A | PASS | PASS | ISSUES | PASS | PASS | PASS | NOT TESTED |
| bubble-letters | ISSUES | ISSUES | N/A | PASS | PASS | **FAIL** | PASS | PASS | **FAIL** | NOT TESTED |
| block-letters | ISSUES | ISSUES | N/A | PASS | PASS | **FAIL** | PASS | PASS | **FAIL** | NOT TESTED |
| graffiti-letters | ISSUES | ISSUES | N/A | PASS | PASS | ISSUES | PASS | PASS | PASS | NOT TESTED |
| cursive-alphabet | ISSUES | **FAIL** | N/A | **FAIL** | PASS | PASS | PASS | PASS | NOT TESTED | NOT TESTED |
| calligraphy-alphabet | ISSUES | **FAIL** | N/A | **FAIL** | PASS | PASS | PASS | PASS | NOT TESTED | NOT TESTED |
| 6 × `*-in-cursive` pages | ISSUES | **FAIL** | N/A | **FAIL** | PASS | PASS | PASS | PASS | N/A | NOT TESTED |
| dot-to-dot-alphabet | PASS | PASS | N/A | PASS | PASS | PASS | PASS | PASS | PASS | NOT TESTED |
| dot-to-dot-name | ISSUES | ISSUES | N/A | **FAIL** | ISSUES | ISSUES | PASS | ISSUES | ISSUES | NOT TESTED |
| name-puzzle-maker | PASS | ISSUES | N/A | PASS | ISSUES | NOT TESTED | PASS | ISSUES | NOT TESTED | NOT TESTED |
| banner-maker | ISSUES | ISSUES | N/A | PASS | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| monogram-maker | ISSUES | ISSUES | N/A | PASS | PASS | PASS | PASS | PASS | **FAIL** | NOT TESTED |
| cross-stitch-letters | PASS | PASS | N/A | PASS | NOT TESTED | NOT TESTED | PASS | NOT TESTED | NOT TESTED | NOT TESTED |
| spanish-alphabet-chart | ISSUES | ISSUES | N/A | PASS | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |

`dot-to-dot-alphabet` is the only tool with no defect found. It is worth studying for that reason:
it is the same engine, solving the same problem, at a size where the shared mechanisms happen not
to break.

---

## Notes per family

### Tracing family (handwriting, letter-tracing, sight-word-tracing, name-tracing)

This is the family with the most serious problems, and they compound. The sheet draws three ruled
lines that no letter class registers to (R-002), then fills them with a dotted "letter" that is
actually the letter's outline (R-001), and optionally annotates it with stroke arrows calibrated
to a different font (R-010). Each of the three is independently wrong; together the sheet teaches
a child to trace around the edge of a shape that is the wrong size for the lines it sits between.

The print path is otherwise sound. Pagination across the seven-level ladder is clean, the ruled
block is genuinely centred on the page, and the credit and Name/Date furniture land correctly.
The practice rules using 3.61in of a 7.5in printable width (R-013) is the one print-side defect.

### Coloring and pattern family (coloring-page-maker, alphabet-coloring-pages, bubble, block, graffiti)

`alphabet-coloring-pages` at single-letter size is the strongest artifact on the site: a bold
near-black outline filling its tile, counters intact, printing cleanly. Everything that goes wrong
here goes wrong at word size or under a pattern fill.

The five pattern fills are all built the same way and all land wrong (R-004), for a reason that is
one attribute wide. Word mode adds the width-estimate clipping (R-006) and the grey-preview /
black-export split (R-008).

Worth stating plainly because the code makes it easy to miss: **bubble letters, block letters and
graffiti letters are the same mechanism.** Each is a single `<text>` node with a different
`font-family` and stroke; there are no bubble outlines, no stencil bridges, and no graffiti
layering (no shadow, no offset, no second outline pass). Whether that satisfies the promise is a
product question, not a render defect, so it is not in the registry, but it is the reason
"graffiti" renders as a graffiti-flavoured font rather than as graffiti.

### Cursive family (8 pages)

The most clear-cut mismatch between promise and artifact on the site (R-011). These sheets print
Unicode mathematical script characters in a font stack that contains none of them, so the
letterform is whatever maths font the reader's device supplies, the letters do not join, and the
alphabet is set in two different faces because the script range spans two Unicode blocks. A
cursive practice sheet where the letterform is unspecified and unjoined is not a cursive practice
sheet.

### Geometry family (dot-to-dot, puzzle, banner, monogram, cross-stitch)

The healthiest family. `dot-to-dot-alphabet` and `cross-stitch-letters` are clean;
`name-puzzle-maker`'s letter centring is accurate to 0.05in; the banner's cut lines and punch holes
are properly marked.

Two real defects: `dot-to-dot-name` degrades letters in word mode (R-012), and `monogram-maker`
clips `WWW` (R-006) and sits 11.2 units high on every three-letter combination (R-005).

### Print and export paths

Paper size handling is correct and should be recorded as such: the chosen paper reaches the PDF
page box exactly, including A4 and Legal and landscape. Pagination is clean across every
multi-page export tested, including the 36-page A–Z book.

The defects are in composition rather than plumbing: landscape letterboxes (R-007), portrait
leaves 4.35in of blank paper above the artwork (R-013), ink saver is invisible until export
(R-014), and the three render paths disagree on stroke colour (R-008) and canvas shape (R-009).

---

## What was not covered

Stated so the scorecard's `NOT TESTED` cells are not mistaken for passes.

* **Firefox and WebKit.** Chromium only. R-005 and R-002 are font-metric defects and will differ
  in magnitude across engines; R-001, R-004 and R-006 are geometric and will not.
* **`banner-maker` and `spanish-alphabet-chart` print and export paths.**
* **Cut-safety on the banner at ink level.** The letter's em box comes within 0.5 units of the
  diagonal cut, but the em box is wider than the ink. Needs an ink measurement on the `W` and `M`
  flags before it can be called a defect.
* **Cross-stitch grid weight on a basic printer.** The grid is CSS-styled at luminance 214 with no
  SVG stroke attribute; it survives the PNG path, but its printed weight was not measured.
* **`preview-vs-PNG` aspect for cross-stitch and name-puzzle.** The first run used a selector that
  matched a nav icon. Void, not re-run.
