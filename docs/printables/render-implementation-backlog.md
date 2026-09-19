# Printables Render: Implementation Backlog

Grouped by **root cause**, not by page, because seventeen registry defects reduce to six
mechanisms and fixing them page by page would mean fixing the same thing eleven times.

Ordered by dependency and by defects closed per unit of work. Severity alone does not set the
order: R-001 is the most serious defect on the site and is sequenced last, because it is the only
item needing new authored data and it should not block the four cheap fixes above it. An interim
mitigation for R-001 is proposed at the top instead.

Sources: [`render-defect-registry.md`](render-defect-registry.md),
[`render-systemic-findings.md`](render-systemic-findings.md).

---

## Status, 2026-09-19

| item | state |
|---|---|
| Item 0 — decide on the dotted levels | **moot.** Item 6 was built, so there is nothing to decide in the meantime. None of the three options was taken. |
| Item 1 — VisibleBounds + OpticalCenter | **shipped** as `js/printables/glyphMetrics.js`. Closes R-002, R-005, R-006, R-010. |
| Item 2 — PatternFill | **shipped.** Closes R-004. |
| Item 3 — PaperLayout | **shipped** as `sheetGeom()`. Closes R-007. |
| Item 4 — one layout object | not started. R-008, R-009, R-014, R-015 remain open. |
| Item 5 — PrintableCanvas fit | **shipped** for the measured-type half. Closes R-003, most of R-013. |
| Item 6 — stroke skeletons | **shipped**, and far cheaper than this document estimated. Closes R-001 and the rest of R-010. |

**Item 6's estimate was wrong and the correction is the useful part.** This document scoped it as
"52 letters x 3 faces, plus digits… the expensive item", on the premise that no centreline
representation existed. One did: `js/printables/strokeDirectionData.js` has held a hand-authored
skeleton for all 52 letters since the stroke-direction overlay shipped, and this document cites
that file three paragraphs earlier without noticing that what it holds *is* the missing object.

What the work actually took was a **fit** — the skeleton is authored against a generic sans and
no shipped face lands on its numbers — plus corrections to 16 letters, each driven by a measured
miss rather than by eye. And the "x 3 faces" multiplier does not exist: all three tools that load
the data use Quicksand. Measured against the others for the record — Fredoka 98.5%, Archivo Black
98.9%, Plus Jakarta Sans 97.0% mean route coverage, with `y` the one genuine letterform fork
(Quicksand draws it as a u with a descender, the others as a v with a tail). A face-specific
variant becomes necessary the day a non-Quicksand page loads the file, and not before.

**The estimate was not idle.** It is why Item 0 existed at all — a product decision about
shipping a known-wrong surface, justified by "the proper fix is weeks of work". Check whether the
object you need already exists under another name before pricing the work that would create it.

---

## Item 0 — Decide what to do about the dotted tracing levels, now

**Blocks nothing. Should happen before the next printables push.** Not an engineering task.

R-001 means three live tools ship a tracing sheet that teaches a child to trace the *perimeter* of
a letter rather than the stroke a pencil follows, and on closed letters gives them two concentric
rings with no way to tell which to follow. The proper fix is Item 6 and is weeks of work.

The owner decision is whether to keep shipping the two dotted levels in the meantime. Options, from
[`render-regression-plan.md`](render-regression-plan.md):

1. keep them as they are while Item 6 is built;
2. approximate a centreline from the face's stem width — correct on stems, still wrong on curves;
3. demote the dotted levels and make the dashed level the default, which follows the same contour
   but reads honestly as an outline to trace around.

This is flagged rather than decided here because it is a product call about a live surface, not a
render defect with a correct answer.

---

## Item 1 — `VisibleBoundsCalculator` and `OpticalCenter`

**Root cause** FONT_METRICS, BOUNDING_BOX · **Closes** R-002, R-005, R-006, most of R-010
**Tools affected** 11 · **Dependency** none · **This is the highest-leverage item in the audit**

Nothing in the engine can answer "where is the ink". Every letter is a `<text>` node measured with
`getBBox()` (returns the em box), `dominant-baseline="central"` (centres the em box) and
`text-anchor="middle"` (centres the advance). Four defects follow from that one gap.

**Build**

* `VisibleBoundsCalculator(text, face, size) -> {x, y, w, h, capTop, xTop, baseline, descBottom}`,
  measured with the hidden-canvas technique the engine **already uses** in `addWordStrokeOverlay`
  and `wordPNG`. This is not a new capability, it is an existing one promoted into the layout path.
* `OpticalCenter(bounds, box)` returning the offset that centres ink rather than the em box.

**Apply**

| to | replaces | closes |
|---|---|---|
| single-letter tiles (both builders, `printablesEngine.js:754` and `:5450`) | `dominant-baseline="central"` + `y=128` | R-005 |
| word outline viewBox | `w = chars.length * 118 + 80` | R-006 |
| ruled-line placement | fixed `y = 50 / 104 / 158` against fixed `font-size=132` | R-002 |
| monogram slot layout | fixed per-slot x positions | R-005, R-006 |
| stroke-overlay placement | hand-calibrated "baseline ~ y 198-200" | most of R-010 |

**Note on R-002 specifically.** The fix is to stop fixing both numbers. Solve the size from the
band (x-height band 54 ÷ Quicksand's 0.544em = font-size 99.3), then place the cap line from the
result (158 − 0.699 × 99.3 = y 88.6). Today the lines and the type are chosen independently and
only the baseline happens to agree.

**Watch for:** the fix changes the rendered size of letters on ruled sheets, which changes every
committed preview image and every Pinterest pin for those pages. Sequence the art regeneration
into the same change, and use `generate-site-art.py --only <slug>` rather than a bare run — a full
run on a machine with a different font build rewrites hundreds of visually identical files.

---

## Item 2 — `PatternFill` anchored to the glyph

**Root cause** PATTERN_ORIGIN · **Closes** R-004 · **Tools affected** 1 (5 fills)
**Dependency** Item 1, for the ink box · **Smallest fix in the backlog**

```html
<!-- now: lattice tied to (0,0) of the 1000x1400 sheet -->
<pattern patternUnits="userSpaceOnUse" width="48" height="48">
```

Emit a `patternTransform` translating the lattice to the centre of the glyph's ink box. Optionally
scale the tile to the glyph so a narrow stem gets a proportionate motif rather than a slice of a
48-unit heart.

Guard rails, because three things here are currently **correct** and easy to break:

* counters are preserved and must stay so;
* the fill rule is right;
* the pattern geometry itself is clean — only the origin is wrong.

Add the `paint-order="stroke"` that `plain` carries and the four pattern fills do not, so the
outline weight stops changing when a fill is selected.

---

## Item 3 — `PaperLayout` composing per orientation

**Root cause** PAPER_SIZE · **Closes** R-007 · **Tools affected** 3 · **Dependency** none

The page box is already correct and should not be touched: `printPrefs.js` resolves Letter, A4,
Legal and landscape exactly, and the chosen size reaches the PDF `MediaBox` verbatim. Pagination is
clean. What is missing is a composition step downstream of that.

The sheet is authored at a fixed portrait aspect and fitted to the page, so landscape produces a
*smaller* artifact: 3.74in wasted on each side of an 11in page, 17.1% ink coverage against 30.5%
portrait. Choosing a wider page should not shrink the artwork.

Assertion G-64 in the regression plan states the whole requirement: landscape coverage ≥ portrait
coverage for the same input.

---

## Item 4 — One layout object, three renderers

**Root cause** EXPORT_PIPELINE, CANVAS_SCALING, PRINT_CSS · **Closes** R-008, R-009, R-014, R-015
**Tools affected** every tool with a download button · **Dependency** Item 1 · **Largest consolidation**

A sheet is currently drawn three times by three bodies of code from three descriptions of the
layout: the SVG preview, **six** separate Canvas exporters (`letterPNG`, `wordPNG`, `genWordPNG`,
`designPNG`, `bannerPNG`, `puzzlePNG`), and the print-CSS plus PDF rasteriser. They have drifted:

| symptom | measurement |
|---|---|
| stroke colour | preview `#8b93a7` (lum 147) vs PNG lum 27 |
| canvas shape | preview aspect 1.000–6.890 vs PNG fixed 3.077 |
| ink saver | PDF 28 → 90, preview unchanged |
| credit block | duplicated on the puzzle PDF; URL centred and QR hard-right in PNG |

**Do not rewrite the renderers.** Build one layout description per sheet — boxes, sizes, colours,
credit placement — and have all three consume it. The repository has done exactly this three times
already and the precedents are worth following rather than reinventing: `printPrefs.js` ("all three
engines read one copy"), `gridSectionsHTML()` sliced into the build-time generator so "static and
runtime markup cannot drift", and `cta_routing.py` owning the routing table and its copy together.

Fold in while here: collapse the two `bubble-outline` builders into one, and normalise the
single-letter stroke weight, which is currently 9 / 7 / 5 / 4 / 4 across five sibling tools at the
same font-size.

---

## Item 5 — `PrintableCanvas` fit-to-box

**Root cause** CSS_LAYOUT, TEXT_WRAP · **Closes** R-003, R-013 · **Dependency** Item 1

Sizes are constants, not fits: a three-step font ladder (360 / 280 / 110) with nothing between 280
and 110, and **silent truncation at 14 characters** past the last step. `I` covers 4.4% of the
sheet; `Christopher` prints 1.4in tall on an 11in page; portrait leaves 4.35in of blank paper above
the artwork against 0.59in below.

Build one `PrintableCanvas` taking a content box and fitting the composition to it, with overflow
behaviour **shrink, then wrap, then report** — never truncate silently. R-003 is R1 severity for a
one-line reason: the field accepts 29 characters and the renderer keeps 14, and nothing tells the
visitor.

Also here: the printed handwriting practice rules span 3.61in of a 7.5in printable width on five of
seven pages. On a sheet whose purpose is writing space, under half of it is used.

---

## Item 6 — Stroke skeletons

**Root cause** PATH_GENERATION · **Closes** R-001, R-012, finishes R-010
**Dependency** none technically, but sequenced last · **Only item needing new authored data**

There is no representation of a letter's **centreline** anywhere in the system, so every feature
that needs one approximates it with the outline:

* dotted tracing strokes the contour with `stroke-dasharray="0.1 11"`, putting dots on both stem
  edges and turning `o` into two concentric rings;
* dot-to-dot samples contour vertices on a budget that does not scale with size, so `a` collapses
  to six points and loses its counter;
* the stroke-direction overlay is hand-authored precisely because, as `strokeDirectionData.js`
  says, "there is no vector path data to reverse-engineer".

An outline is not a degraded skeleton, it is a different object. For a handwriting product it is
the wrong one: tracing an outline is a drawing exercise, tracing a skeleton is a writing exercise.

**Build:** per-letter skeleton paths for the three faces that carry tracing surfaces (Quicksand,
Fredoka, Archivo Black), in the same 200 × 240 coordinate space `strokeDirectionData.js` already
uses. Consumed by the dotted levels, the dot-to-dot sampler and the overlay — at which point the
overlay arrows are derived rather than calibrated, and R-010 cannot drift again when a face
changes.

Scope honestly: 52 letters × 3 faces, plus digits. This is the expensive item. It is also the one
that makes the tracing tools actually be tracing tools.

---

## Sequencing

```
Item 0  decide on dotted levels        ── product call, no dependency
Item 1  VisibleBounds + OpticalCenter  ── unblocks 2, 4, 5
   ├── Item 2  PatternFill
   ├── Item 4  one layout object       ── unblocks nothing, largest
   └── Item 5  PrintableCanvas fit
Item 3  PaperLayout                    ── independent, can land any time
Item 6  Stroke skeletons               ── independent, most expensive
```

Items 1 and 3 can start in parallel. Item 6 can start in parallel with everything, since the
authoring work does not touch the layout path until it lands.

## Defects closed per item

| item | registry entries closed | tools affected | new data needed |
|---|---|---|---|
| 1 | R-002, R-005, R-006, most of R-010 | 11 | no |
| 2 | R-004 | 1 | no |
| 3 | R-007 | 3 | no |
| 4 | R-008, R-009, R-014, R-015 | all exporting tools | no |
| 5 | R-003, R-013 | 4 | no |
| 6 | R-001, R-012, rest of R-010 | 4 | **yes** |

Unassigned: R-011 (cursive sheets are Unicode maths characters with no cursive font requested) and
R-016/R-017 (preview fidelity). R-011 is not a render bug to fix but a product decision — ship a
real joined cursive face, or stop describing these pages as cursive practice. It should be raised
with the owner alongside Item 0.

## Regression cover

Land the assertions in [`render-regression-plan.md`](render-regression-plan.md) **before** the
fixes, red, and promote each group to gating as its fix lands. A check written after the fix has
never been observed to fail, which is the condition this repository has twice found its gates in.
