# Printables Render: Systemic Findings

Shared causes across printable families. These matter more than the individual defects in
[`render-defect-registry.md`](render-defect-registry.md): seventeen registry entries reduce to
**six mechanisms**, and four of the six are one decision each.

Run 2026-09-17 against `main` (`3d7ef668b`).

---

## S-1 — Every letter is a `<text>` node, so the font's em box is the only geometry available

**Causes** R-002, R-005, R-006, R-010 · **11 of 24 tools** · the largest single cause on the site

Nothing in the printables engine works with glyph outlines. Every letter on every sheet is an SVG
`<text>` node, measured with:

* `getBBox()` — which on a `<text>` node returns the **font's em box**, not the ink. Both `A` and
  `a` at font-size 132 report `y=25, height=168`, the same box, because that is the font's
  ascent-to-descent span and has nothing to do with either letter.
* `dominant-baseline="central"` — which centres that same em box.
* `text-anchor="middle"` — which centres the **advance** width, including side bearings.

All three are correct implementations of the wrong measurement. The engine has no way to ask
"where is the ink", so four separate defects follow from one missing capability:

| defect | what the em box does to it |
|---|---|
| R-005 | descender space in the box pushes every capital 13–15 units low; top gap ≈ 2× bottom gap |
| R-005 (horizontal) | side bearings put `E` 3.5–4.5 units right of centre, `Q` 6.7 |
| R-002 | ruled lines are placed by a fixed 2:1 fraction because the real cap and x-height ratios are not available to place them by |
| R-006 | viewBox width is `chars.length × 118 + 80` — a per-character constant standing in for a measurement |
| R-010 | stroke overlay coordinates are hand-calibrated to an assumed baseline at y 198–200 that no shipped font actually hits (Quicksand ~205, Fredoka ~211) |

**The measurement already exists in the codebase and is used elsewhere.** `addWordStrokeOverlay`
places its per-letter groups using "Canvas-measured advance widths (the same *measure with a hidden
canvas* technique already used elsewhere in this file, e.g. `wordPNG`)". So the engine knows how to
measure text; it does it in two places for two narrow purposes and nowhere in the layout path.

**Fix shape:** one `VisibleBoundsCalculator` returning the ink box for a string in a face at a
size, plus an `OpticalCenter` that positions from it. Four registry defects close on it. This is
the highest-leverage change in the audit.

---

## S-2 — Three render paths, independently implemented

**Causes** R-008, R-009, R-014, R-015 · **every tool with a download button**

A sheet is drawn three times, by three different bodies of code, from three different
descriptions of the layout:

| path | how it draws | who owns it |
|---|---|---|
| **Preview** | SVG `<text>` + `<line>` + `<pattern>` in the DOM | `printablesEngine.js` builders |
| **PNG** | Canvas 2D, re-implementing the layout | `letterPNG`, `wordPNG`, `genWordPNG`, `designPNG`, `bannerPNG`, `puzzlePNG` — **six** separate functions |
| **PDF** | rasterise the print surface, then a native PDF writer | `printablePdf.js` + the print CSS |

Nothing reconciles them, so they have drifted in exactly the ways duplicated layout code drifts:

* **Stroke colour** (R-008). Preview draws a word outline at `#8b93a7` (luminance 147); the Canvas
  path draws it near-black (27). Same control state, two products.
* **Canvas shape** (R-009). The preview viewBox grows with the word, aspect 1.000 → 6.890. The
  Canvas is 1600 × 520 for every input. A single `I` is a square on screen and a wide banner in
  the file.
* **Ink saver** (R-014). Lives in print CSS scoped to `body.is-printing` and
  `body.pt-pdf-rendering`, so the preview cannot show it. The engine's own comments record fixing
  exactly this for paper, orientation and margin; ink saver was not brought along.
* **Credit block** (R-015). Drawn separately per path, duplicated on the puzzle PDF, and
  internally misaligned in the PNG (URL centred, QR hard right, different baselines).

The engine has already solved this problem once, in a neighbouring system, and the comment says
so: `gridSectionsHTML()` in `symbol-explorer.js` is sliced out and executed by the build-time
generator so "static and runtime markup cannot drift", and `printPrefs.js` exists because "the two
standalone tools had no panel at all... so all three engines read one copy". That principle stops
at the layout itself.

**Fix shape:** one layout object per sheet, consumed by all three renderers. Not a rewrite of the
renderers, a single source for *what goes where*. The precedent is in the repo.

---

## S-3 — Decoration is applied to the page, not to the shape it decorates

**Causes** R-004 · **1 tool, 5 fills, and the pattern for anything added later**

```html
<pattern patternUnits="userSpaceOnUse" width="48" height="48"> … </pattern>
```

`userSpaceOnUse` with no `patternTransform` ties the tile lattice to (0,0) of the 1000 × 1400
sheet. The fill is then sampled through the glyph as a window onto a page-wide wallpaper, so the
decoration a letter receives is decided by where the letter lands, and the identical letter `A`
takes tile phase 4.6 / 33.2 / 13.8 / 0.2 as the word grows from one `A` to four.

This is the distinction the audit brief draws between preference and defect. "Bigger hearts" is a
preference. "Two identical letters in one word are decorated differently, and neither is aligned
to the letter" is a defect, and it is one attribute wide.

Note what is *not* wrong, because it constrains the fix: counters are correctly preserved, the
fill rule is right, and the pattern geometry itself is clean. Only the origin is wrong.

**Fix shape:** a `PatternFill` that takes the glyph's ink box (from S-1) and emits a
`patternTransform` translating the lattice to that box's centre. Optionally scale the tile to the
glyph so a narrow stem gets a proportionate motif.

---

## S-4 — Tracing paths are stroked outlines, not skeletons

**Causes** R-001, R-012 · **4 tools** · the defect the audit was commissioned to look for

Two different tools try to express "the route a pencil takes" and both do it by decorating the
letter's **contour**:

* **Dotted tracing** (R-001) sets `stroke-dasharray="0.1 11"` with `fill="none"` on the text. The
  dash walks the outline, so a bold stem gets a dot column on each edge and none down the middle,
  and a closed letter becomes two concentric rings.
* **Dot-to-dot** (R-012) samples vertices from the same contour with a budget that does not scale
  with the rendered size, so in word mode `a` collapses to six points and loses its counter
  polygon entirely.

Both are the same missing idea: there is no representation of a letter's **stroke skeleton** —
the centreline a hand follows — anywhere in the system, so both features approximate it with the
one geometry the engine has, which is the outline.

The outline is not a degraded version of the skeleton. It is a different object, and for a
handwriting product it is the wrong one: tracing an outline is a drawing exercise, tracing a
skeleton is a writing exercise.

This also explains R-010's shape. The stroke-direction data is hand-authored precisely *because*
no skeleton exists to derive arrows from; the file says so ("there is no vector path data to
reverse-engineer"). Given a skeleton, the arrows are derivable rather than hand-calibrated, and
R-010 stops being a maintenance problem.

**Fix shape:** per-letter skeleton data, authored once per face at the three faces that matter
(Quicksand, Fredoka, Archivo Black), consumed by the dotted levels, the dot-to-dot sampler and the
stroke overlay. This is the largest piece of work in the backlog and the only one that needs new
data rather than new code.

---

## S-5 — Sheet composition is a set of constants, not a fit

**Causes** R-003, R-006, R-013 · **most tools**

Nothing in the engine asks "how big should this be to fill the page". Sizes are chosen in advance
and the artwork lands wherever it lands:

* Font size on the design sheet is a three-step ladder — 360, 280, 110 — with nothing between 280
  and 110, so `Emma` prints at 280 and `Christopher` at 110, a 2.5× cliff.
* Word viewBox width is `chars × 118 + 80`, a constant per character (S-1).
* Beyond the ladder's last step the text is simply **truncated at 14 characters** with no cue
  (R-003) — the failure mode that appears when a fixed-size system runs out of fixed sizes.
* The results: `I` covers 4.4% of the sheet; `Christopher` prints 1.4in tall on an 11in page;
  portrait sheets leave 4.35in of blank paper above the artwork against 0.59in below; the printed
  handwriting rules use 3.61in of a 7.5in printable width.

**Fix shape:** one `PrintableCanvas` that takes a content box and fits the composition to it, and
whose overflow behaviour is "shrink, then wrap, then report" rather than "truncate silently".

---

## S-6 — The page box is honoured; the composition inside it is not

**Causes** R-007 · **3 tools**

Worth separating from S-5 because the plumbing here is *correct* and should not be touched.
`printPrefs.js` resolves paper properly, including the regional Letter/A4 default, and the chosen
size reaches the PDF page box exactly: Letter 8.5 × 11, A4 8.27 × 11.69, Legal 8.5 × 14, landscape
11 × 8.5. Pagination is clean across every multi-page export tested.

What does not follow through is the layout inside that box. The sheet is authored at a fixed
portrait aspect and fitted to the page, so selecting landscape produces a *smaller* artifact:
3.74in wasted on each side of an 11in page, 17.1% ink coverage against 30.5% for portrait.

**Fix shape:** `PaperLayout` composing per orientation, downstream of the correct page box that
already exists. This is a layout fix, not a print fix.

---

## Duplication inventory

Measured, for sizing the consolidation work.

| thing | copies | where |
|---|---|---|
| PNG export layout | **6** | `letterPNG`, `wordPNG`, `genWordPNG`, `designPNG`, `bannerPNG`, `puzzlePNG` |
| Single-letter tile builder | **2** | `printablesEngine.js:754` and `:5450`, both emitting `class="bubble-outline"` |
| Render paths per sheet | **3** | SVG preview, Canvas PNG, print-CSS + PDF rasteriser |
| Engine size | 6,782 lines | `printablesEngine.js`, plus 744 (cross-stitch), 717 (monogram), 512 (PDF), 313 (prefs) |
| `dominant-baseline="central"` | 9+ call sites | used as a substitute for an optical-centre primitive |

---

## What the systemic view changes about priority

Ranked by defects closed per unit of work, not by severity:

1. **S-1** closes R-002, R-005, R-006 and most of R-010 — four registry entries, eleven tools, one
   new measurement primitive. Nothing else in this audit has that ratio.
2. **S-3** closes R-004 with an attribute and a transform.
3. **S-6** closes R-007 with a per-orientation composition step on top of correct plumbing.
4. **S-2** closes R-008, R-009, R-014, R-015 but is a consolidation, so it is larger and lower
   risk-adjusted value than 1–3.
5. **S-5** closes R-003 and R-013, and depends on S-1 for the measurement it needs to fit against.
6. **S-4** closes R-001 and R-012 and improves R-010, and is the only item requiring new authored
   data. It is the most important defect on the site and the most expensive fix, which is why it
   is sequenced last despite R-001 being the headline finding — see
   [`render-regression-plan.md`](render-regression-plan.md) for the interim mitigation.

---

## One thing the architecture gets right, and why it matters here

`printPrefs.js` was extracted for exactly the reason this document keeps arriving at, and its
header says so: two standalone tools "had no panel at all and wrote a hardcoded 8.5x11in page
forever. Six live pages, no way to ask for A4." The fix was one owner for sheet setup, and the
result is the cleanest subsystem in the printables stack — paper handling is the thing this audit
could not break.

The same move has not been made for *layout*. S-1 through S-6 are all the same argument applied to
glyph measurement, decoration placement, composition and the three render paths. The precedent for
how to do it is already in the repository, twice more besides: `gridSectionsHTML()` sliced into the
build-time generator so static and runtime markup cannot drift, and `cta_routing.py` owning both
the routing table and its copy so a regenerated page and a live page cannot disagree.
