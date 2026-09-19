# Printables Render Defect Registry

One normalized defect per entry, with the measurement that establishes it. Audit run
2026-09-17 against `main` (`3d7ef668b`), served locally, driven in headless Chromium 1194
with the real Google webfonts each page requests.

Severity: **R1** artifact unusable or teaches the wrong thing · **R2** obvious render defect
that significantly hurts usefulness · **R3** visible, should be corrected · **R4** optical polish.

Every number below was measured, not estimated. Where a first reading was wrong it is
recorded as a correction rather than removed, because the wrong reading is the one a future
audit will repeat.

**Fix status (2026-09-19).** Twenty entries; **seventeen are closed**, each with the same
instrument re-run against the same input: R-001 through R-011, R-014, R-016, R-017 and
R-018 / R-019 / R-020. Two of those (R-011, R-017) were closed by `main` itself while this audit
was in flight and are marked as such rather than claimed.

Of the remaining three: **R-013** is closed on its tracing half — the part its own "partly fixed"
block had left open — and open on the design sheet's side margins, which is a product decision;
**R-015** is fixed on duplication and reported rather than fixed on alignment; and **R-012 is
measured and deliberately not fixed**, for a reason recorded in its own entry.

Three entries were not found by this audit at all. R-018 was **created** by R-001's fix and is
only visible on a rendered sheet; R-019 and R-020 were reported by the owner against the live
generator. A closed entry is not a closed area, and a fix can be the next entry's cause.

A closed entry keeps its original measurement above a **Fixed** block carrying the after-number —
the before is what a future audit needs in order to recognise the defect returning. Nothing here
is marked fixed on the strength of a code change alone.

Two entries record a correction to this audit's own framing, where the defect turned out to sit on
top of a decision somebody had already taken and written down: see R-012 and R-015. A dated
reasoning comment in the engine is an active decision, and an audit that reverses one without
saying so is not an audit.

---

## R-001 — Dotted tracing samples the glyph OUTLINE, not a writing centreline

**Severity** R1 · **Root cause** PATH_GENERATION · **Screen** FAIL · **Print** FAIL · **PNG** FAIL
**Affects** `handwriting-worksheet-generator`, `letter-tracing`, `sight-word-tracing`

Both dotted levels are produced by stroking the glyph outline with a near-zero dash:

```html
<text fill="none" stroke="#1a1a2e" stroke-width="8"
      stroke-dasharray="0.1 11" stroke-linecap="round">Emma</text>
```

`stroke-dasharray` walks the **contour** of the letter. A bold face has two contour edges per
stem, so every stem receives two parallel columns of dots and none down its middle.

**Expected** one dot path down the centre of each stroke, describing the route a pencil takes.
**Actual** dots on both edges of every stem; closed letters become two concentric dotted rings.

Measured on input `minimum`, horizontal scanline at viewBox y=122 (mid x-height), solid row used
as the reference for true stem positions:

| | result |
|---|---|
| solid row | 15 ink runs (the 15 real stems crossed) |
| bold-dotted row | 22 ink runs |
| stem 1 at x[183–199], width 15.8 | dot clusters at x=**183** and x=**199** — both edges, nothing at 191 |
| stem 2 at x[227–243] | clusters at **227** and **243** |
| stem 11 at x[567–583] | **0 clusters** — a gap in the trace at that height |

Coverage is also erratic because the dash phase restarts on every contour and contours differ in
length: across 15 stems the same scanline crosses 2, 1 or 0 dot columns with no pattern.

A child connecting these dots draws the **perimeter of a hollow bubble letter**, which is the
opposite of the motor path a tracing sheet exists to teach. On `o` the child cannot tell which of
the two rings to follow.

**Evidence** `evidence/R-001-dotted-samples-outline.png` (input `mom`, solid vs bold-dotted vs
fine-dotted at the generator's own geometry).

**Fixed 2026-09-19.** The stroked levels draw the writing centreline instead of the contour,
from the skeleton `js/printables/strokeDirectionData.js` already held for all 52 letters, fitted
per character onto that character's measured ink (`glyphMetrics.fitSkeleton`). Same instrument,
same input `minimum`: every one of the 15 stems now carries a **single** column of dots, centred
at 45-52% of its width, against two edge columns or none before. The PNG export strokes the same
paths through `Path2D`, so the download and the preview cannot disagree.

Fifteen letters needed their data corrected first, each from a measured miss. The route's fit was
verified across all 52 letters against Quicksand: 99.4% of each route lands on the rendered
letter, worst letter 92%. The assertion lives in `js/printables/strokeRoute.test.html`.

A word containing a character with no skeleton (a digit, an accented letter) keeps the old
contour rendering for the whole row rather than mixing the two — and `sight-word-tracing`, which
rendered the levels without loading the stroke data, now loads it like its two siblings.
---

## R-002 — Ruled-line registration is wrong for every letter class except the baseline

**Severity** R1 · **Root cause** FONT_METRICS · **Screen** FAIL · **Print** FAIL · **PNG** FAIL
**Affects** `handwriting-worksheet-generator`, `letter-tracing`, `sight-word-tracing`

The three ruled lines are emitted at fixed y = 50 / 104 / 158 (a 108-unit band split exactly 2:1)
while the type is set at a fixed `font-size="132"`. The two constants are chosen independently of
each other and of the font's real proportions, so only the baseline lands where it should.

Measured, Quicksand 700 at font-size 132, ruled lines stripped so the scan sees glyph ink only:

| letter class | sample | ink top | should touch | error |
|---|---|---|---|---|
| capitals | A E H M W | 65.0–65.5 | top line y=50 | **15.0–15.5 units short** |
| ascenders | b d f h k l | 60.3 | top line y=50 | **10.3 units short** |
| x-height | o x s c e m a | 86.0–87.3 | midline y=104 | **17–18 units OVER** |
| baseline | all | 157.8–159.3 | baseline y=158 | correct (±1.3) |
| descenders | g j p q y | bottom 184.3 | (no descender line drawn) | 26.3 below baseline |

Two separate failures fall out of this:

* **Nothing reaches the top line.** It is drawn on every row and no letter class touches it, so
  the child is given a guide that means nothing.
* **Lowercase overshoots the midline by a third.** The x-height band is 54 units; Quicksand renders
  an x-height of 71.8 units at this size. Lowercase letters are 33% too tall for the space the
  lines mark out, which is the single most visible thing wrong with the printed sheet.

The arithmetic: Quicksand's x-height is 0.544em and its cap height 0.699em. To register, the size
must be solved from the band (54 / 0.544 = font-size 99.3) and the cap line placed from the result
(158 − 0.699 × 99.3 = y 88.6), rather than both numbers being fixed in advance.

**Fixed 2026-09-19.** `traceGuides()` derives the top rule from the face's ascender and the
midline from its x-height (`glyphMetrics.faceMetrics`) rather than splitting a guessed band.
Measured on Quicksand 700 at 132, same probes: ascenders 10.3 units short of the top rule ->
**0.3**; x-height 17-18 over the midline -> **within 1.0**; capitals 15.0-15.5 short -> **5.3**,
which is Quicksand's real cap-versus-ascender difference rather than an error. The canvas
export's own 0.52/0.74 ratios now read the same `faceMetrics`, so the PNG and the preview cannot
rule their lines differently.
---

## R-003 — Silent truncation at 14 characters

**Severity** R1 · **Root cause** TEXT_WRAP · **Screen** FAIL · **Print** FAIL · **PNG** FAIL
**Affects** `coloring-page-maker` (and the `dot-to-dot-name` sheet, which shares the surface)

The input accepts 29 characters. The renderer emits the first 14 and discards the rest with no
ellipsis, no warning and no layout cue.

| input | chars accepted by the field | chars rendered | dropped |
|---|---|---|---|
| `Emma` | 4 | `Emma` | 0 |
| `Christopher` | 11 | `Christopher` | 0 |
| `ABCDEFGHIJKLMNOPQRSTUVWXYZ` | 26 | `ABCDEFGHIJKLMN` | **12** |
| `Wolfeschlegelsteinhausenbergerdorff` | 29 (field cap) | `Wolfeschlegels` | **15** |

A parent typing a long name, or anyone using the page's own suggestion to print an alphabet
strip, gets a sheet missing half the text and nothing tells them.

**Fixed 2026-09-19.** `DESIGN_HARD_MAX` (4x the soft cap) replaces the silent
`.slice(0, DESIGN_MAX)`, and a line too long for its band wraps to the second band rather than
falling off the end of the string. Re-run over the six stress inputs the entry measured:
**0 of 6** lose characters, against 3 of 6 before.
---

## R-004 — Pattern fills are anchored to the page origin, not the glyph

**Severity** R2 · **Root cause** PATTERN_ORIGIN · **Screen** FAIL · **Print** FAIL · **PNG** FAIL
**Affects** `coloring-page-maker` (fills: dots, stripes, hearts, stars)

```html
<pattern id="ptpat6" patternUnits="userSpaceOnUse" width="48" height="48"> … </pattern>
```

`userSpaceOnUse` with no `patternTransform` translation ties the 48×48 tile grid to (0,0) of the
1000×1400 sheet. The decoration a letter receives is therefore a function of where that letter
happens to land on the page, not of the letter.

Measured, hearts fill, first glyph's tile phase as the word grows:

| input | first glyph x | phase (x mod 48) |
|---|---|---|
| `A` | 388.6 | 4.6 |
| `AA` | 273.2 | **33.2** |
| `AAA` | 157.8 | **13.8** |
| `AAAA` | 144.2 | **0.2** |

So the same letter is decorated four different ways purely because the word got longer, and the
two identical `A`s in `AA` carry different interior patterns as each other. Hearts and stars are
cut at arbitrary points by the glyph edge because nothing aligns the tile to the shape it fills.

Vertical phase moves too: `AAAA` drops to font-size 110, changing the glyph's y and with it the
tile's vertical phase (27.7 → 43.9).

**Not in scope of this defect:** counters are correctly preserved (the `A` counter stays white),
and the pattern does respect the glyph's fill rule. The defect is placement, not clipping.

**Fixed 2026-09-19.** The pattern's `patternTransform` is anchored to the artwork's own ink
centre, computed before the pattern is created, and the tile scales with the type
(`k = clamp(fs/280, 0.55, 1.6)`). Re-run over the same four inputs: tile phase at the ink origin
is **0.00** for every one, against 4.6 / 33.2 / 13.8 / 0.2 before, and the motif-centre error is
0.00.
---

## R-005 — `dominant-baseline="central"` centres the em box, so every tile sits low

**Severity** R2 · **Root cause** FONT_METRICS · **Screen** FAIL · **Print** FAIL · **PNG** FAIL
**Affects** every single-letter tile: `letter-tracing`, `alphabet-coloring-pages`,
`spanish-alphabet-chart`, `name-puzzle-maker`, the per-letter pages of `bubble-letters`,
`block-letters`, `graffiti-letters`, and `monogram-maker`

`central` centres the font's ascent/descent box. That box reserves descender space, so a letter
without a descender is pushed down by half of it. The tile is mathematically centred and visibly
is not.

Measured, 200×240 tile, font-size 210, `x=100 y=128`:

| tool | letter | ink centre y | tile centre | error | top gap | bottom gap |
|---|---|---|---|---|---|---|
| letter-tracing | A | 133.0 | 120 | **+13.0** | 56.7 | 30.7 |
| letter-tracing | O | 133.0 | 120 | +13.0 | 55.3 | 29.3 |
| alphabet-coloring-pages | A | 135.2 | 120 | **+15.2** | 55.0 | 24.7 |
| spanish-alphabet-chart | A | 135.3 | 120 | +15.3 | 53.7 | 23.0 |

Top gap is roughly **twice** the bottom gap on every capital, on every tool.

Two consequences ride along:

* **Descenders reach the tile edge.** `g` and `p` bottom out at y=**239.7** in a 240-unit box on
  all three tools, and `Q` at 239.7 on letter-tracing: 0.3 units of clearance. The vertical
  calculation assumes letters fit between baseline and cap height.
* **Horizontal is off too, from the same class of cause.** `text-anchor="middle"` centres the
  *advance* width, which includes side bearings. `E` lands 3.5–4.5 units right of centre on all
  three tools and `Q` 6.7 units right on letter-tracing. On a 200-unit tile whose only content is
  one letter, 4.5 units is visible.

Monogram shows the same signature: every three-letter monogram's ink centre sits **11.2 units**
above the sheet centre of a 400×400 sheet (`ABC`, `III`, `MIM`, `OQO` all −11.2).

**Fixed 2026-09-19.** `outlineSVG()` places the letter by `glyphMetrics.centreOffsets`
— its measured ink — instead of `dominant-baseline="central"` and a nominal anchor. Re-run over
the same ten glyphs: worst vertical error **0.7** units against 15.2 before, and worst edge
clearance **35.7** against 0.3. A tiled A-Z sheet shares one baseline across the set
(`shareBaselineWith`) so the grid does not jitter.

Found while fixing it, and the reason the first numbers were wrong three times: `withFont()`
called `document.fonts.load("700 200px Baloo 2")`, which is invalid CSS because a bare font
family may not start with a digit. It threw, the `.catch` fired immediately, and the callback ran
as though the face had arrived — silently disabling the engine's own font-fallback telemetry on
every Baloo 2 page. Quicksand and Fredoka were unaffected because a single-word family quotes
identically, which is why it survived. The family is quoted now.
---

## R-006 — Word viewBox width is a character-count estimate, so wide letters clip

**Severity** R2 · **Root cause** BOUNDING_BOX · **Screen** FAIL · **Print** FAIL · **PNG** PASS
**Affects** `bubble-letters`, `block-letters`, `name-tracing`, `alphabet-coloring-pages`,
`graffiti-letters`, `monogram-maker`

```js
const w = Math.max(200, chars.length * 118 + 80 + Math.max(0, chars.length - 1) * spacing);
```

118 units are reserved per character whatever the character is. `W` and `M` are wider than that,
so the text runs outside the viewBox, and an SVG root clips by default.

| tool | input | viewBox width | ink span | clipped |
|---|---|---|---|---|
| block-letters | `WMWMWM` | 788 | **−43 … 831** | 43 left, 43 right |
| bubble-letters | `WMWMWM` | 863 | **−16 … 864** | 16 left, 1 right |
| name-tracing | `WMWMWM` | 788 | **−2 … 790** | 2 left, 2 right |
| monogram-maker | `WWW` | 400 | **−19.2 … 418.5** | 19.2 left, 18.5 right |

The same estimate over-reserves for narrow input: `Christopher` on block-letters gets a
1378-unit viewBox for 958 units of ink, so a fifth of the sheet width is padding that the
next name will not have.

`alphabet-coloring-pages` does not clip on `WMWMWM` (25 … 763 in 788) only because its face is
narrower; the mechanism is identical and one face change puts it over.

**Correction to a first reading:** the contact sheet appeared to show `ABC` clipped on
monogram-maker. Measurement shows it fits (42.5 … 355.5 in 400); the apparent clipping was an
artifact of how the capture resized the element. Only `WWW` overflows.

**Fixed 2026-09-19.** The word viewBox is measured (`glyphMetrics.ink` over the whole
string, taking whichever of ink and advance is wider) rather than estimated from a character
count. Re-run over five tools x six inputs: **zero** clipping, and "Christopher" now reserves a
1041-unit box against 1378 before — a fifth of the sheet width that had been padding.
---

## R-007 — Landscape does not re-lay-out the sheet, it letterboxes the portrait one

**Severity** R2 · **Root cause** PAPER_SIZE · **Screen** PASS · **Print** FAIL · **PNG** N/A
**Affects** every sheet built on the 1000×1400 design surface (`coloring-page-maker`,
`dot-to-dot-name`, `name-puzzle-maker`)

The sheet is authored at a fixed portrait aspect and fitted to whatever page box is chosen. On a
landscape page it is fitted by height, so choosing landscape makes the artwork *smaller*.

Measured, `coloring-page-maker`, input `Emma`, ink margins in inches from the rendered PDF:

| setting | page | left | top | right | bottom | ink coverage |
|---|---|---|---|---|---|---|
| Letter portrait | 8.5 × 11 | 1.90 | 4.35 | 1.88 | 0.59 | 30.5% |
| Letter **landscape** | 11 × 8.5 | **3.74** | 3.39 | **3.72** | 0.57 | **17.1%** |
| A4 portrait | 8.27 × 11.69 | 1.63 | 4.62 | 1.60 | 0.59 | 33.7% |
| Legal portrait | 8.5 × 14 | 1.64 | 4.78 | 1.61 | 2.47 | 29.7% |

Landscape wastes 3.7 inches on each side of an 11-inch page and returns roughly half the ink
coverage of portrait. The setting is offered, is honoured by the page box, and makes the output
worse.

The portrait rows also show a **7.4 : 1 top-to-bottom imbalance** (4.35in of blank paper above the
artwork, 0.59in below it), which is R-013.

**Evidence** `evidence/R-007-landscape-letterboxed.png`.

**Fixed 2026-09-19.** `sheetGeom()` derives the sheet from the paper's own printable box,
holding the area at 1000x1400 so a unit stays the same physical size across settings. Same
instrument, same input:

| setting | coverage before | after | side margins before | after |
|---|---|---|---|---|
| Letter portrait | 30.5% | **36.0%** | 1.90 / 1.88 | **1.50 / 1.50** |
| A4 portrait | 33.7% | **36.1%** | 1.63 / 1.60 | **1.45 / 1.44** |
| Legal portrait | 29.7% | **36.2%** | 1.64 / 1.61 | **1.43 / 1.43** |
| Letter landscape | 17.1% | **22.1%** | 3.74 / 3.72 | **3.31 / 3.31** |

Landscape still reads lower than portrait here because "Emma" is a short word on a wide page, not
because the sheet is letterboxed: on `dot-to-dot-name`, where the artwork fills its band, landscape
now reads **43.5%** against portrait's 41.1%.

**Correction to this entry's own Affects line.** `name-puzzle-maker` is not built on the
1000x1400 surface — `puzzleSheetNode()` is a flex column of DOM that already filled the printable
width — so it was never affected and is not changed. The measurement above was taken on
`coloring-page-maker` and the affected list was inferred from it rather than checked, which is the
reading a future audit should not repeat.

**Correction to the 7.4 : 1 imbalance noted at the end of this entry.** That is the ink bounding
box, which spans from the top of the artwork to the footer rules at the bottom of the sheet, not
the artwork's own placement. The artwork is centred in its band. The number is real and its
reading was wrong; it is not evidence for R-013.
---

## R-008 — Preview and PNG export disagree on outline colour

**Severity** R2 · **Root cause** EXPORT_PIPELINE · **Screen** FAIL · **Print** n/a · **PNG** PASS
**Affects** `bubble-letters`, `block-letters`, `name-tracing`, `alphabet-coloring-pages`

The same control state produces a mid-grey outline on screen and a near-black outline in the
downloaded file.

| tool | word preview stroke | luminance | single-letter preview stroke | luminance | PNG darkest |
|---|---|---|---|---|---|
| bubble-letters | `#8b93a7` | 147 | `#1a1a2e` | 28 | 27 |
| block-letters | `#8b93a7` | 147 | `#1a1a2e` | 28 | 27 |
| name-tracing | `#8b93a7` | 147 | `#1a1a2e` | 28 | 27 |
| alphabet-coloring-pages | `#8b93a7` | 147 | `#1a1a2e` | 28 | — |
| graffiti-letters | `#1a1a2e` | 28 | `#1a1a2e` | 28 | 27 |

Two problems in one table. The **word** preview is a 42% grey while its own export is black, so
the visitor cannot judge from the screen what they will get. And within a single page the *same
letters* are near-black as a single tile and mid-grey as a word, which is not a decision anyone
would make deliberately. `graffiti-letters` is the one tool that is internally consistent.

Stroke **weight** is inconsistent across the same family at the same font-size 210:
bubble 9, block 7, graffiti 5, name-tracing 4, alphabet-coloring 4.

**Fixed 2026-09-19.** `wordOutlineGeom()` resolves the fill, the stroke and the stroke width once
and both `wordOutlineSVG()` and `wordPNG()` read the result, so the two cannot disagree by
construction rather than by being kept in step. Same instrument, same inputs, measuring the
downloaded file:

| tool | preview stroke | PNG darkest stroke luminance | before |
|---|---|---|---|
| bubble-letters | `#8b93a7` | **144** | 27 |
| name-tracing | `#8b93a7` | **144** | 27 |
| block-letters | `#8b93a7` | **144** | 27 |

144 against the preview's own 147 is the same grey, off by the antialiasing of a stroked edge.
The word preview and its export now show the same colour on all three tools at `I`, `Emma` and
`Christopher`.

The single-tile-vs-word half of the entry is closed by the same change: both paths take their
paint from `wordOutlineGeom`, so a letter cannot be near-black alone and mid-grey in a word.
Stroke weight per tool is unchanged and is a per-family design value, not a defect.

---

## R-009 — Preview and PNG export disagree on canvas shape

**Severity** R2 · **Root cause** CANVAS_SCALING · **Screen** PASS · **Print** n/a · **PNG** FAIL
**Affects** `bubble-letters`, `block-letters`, `name-tracing`, `graffiti-letters`

The preview viewBox grows with the word. The PNG canvas does not: it is 1600 × 520 for every
input on every one of these tools.

| input | preview viewBox | preview aspect | PNG | PNG aspect | ink as % of PNG width |
|---|---|---|---|---|---|
| `I` | 200 × 200 | **1.000** | 1600 × 520 | 3.077 | 60.6% |
| `Emma` | 552 × 200 | 2.760 | 1600 × 520 | 3.077 | 73.9% |
| `William` | 906 × 200 | 4.530 | 1600 × 520 | 3.077 | 79.4% |
| `Christopher` | 1378 × 200 | **6.890** | 1600 × 520 | 3.077 | 90.5% |

For `I` the screen shows a square tile and the file is a wide banner with the letter adrift in
it. A teacher exporting a set of name cards gets cards whose letters differ in size by a third,
because the ink fills between 60.6% and 90.8% of a fixed canvas.

Aspect deltas measured per tool: name-tracing 11.5%, coloring-page-maker 10.8%, graffiti 8.0%,
bubble-letters 3.1%, monogram-maker 0.0% (the one that matches).

**Correction:** first-pass deltas for `cross-stitch-letters` (58.2%) and `name-puzzle-maker`
(6.5%) are void — the selector matched a 24×24 nav icon rather than the artwork. Those two are
untested on this axis.

**Fixed 2026-09-19.** The PNG canvas is derived from the same measured geometry the preview is:
`wordPNG()` sizes itself `g.w x g.h` at a fixed 2.6x, plus the credit band, instead of fitting the
word into a 1600 x 520 frame. Measured on the downloaded files, credit band excluded:

| input | preview aspect | PNG aspect | PNG size | delta |
|---|---|---|---|---|
| `I` | 1.000 | 1.000 | 520 x 520 | **0.0%** |
| `Emma` | 2.685 | 2.685 | 1396 x 520 | **0.0%** |
| `Christopher` | 4.625 | 4.625 | 2405 x 520 | **0.0%** |

0.0% on all three inputs across bubble-letters, name-tracing and block-letters, against a PNG
that was 1600 x 520 for every one of them before.

The before-deltas in the table at the top of this entry are **not** recomputed against these
numbers and should not be: R-006's fix changed the preview viewBox as well (`Christopher` on
name-tracing is 925 wide now, 1378 before), so the two columns are measured on different
previews. What is comparable is the claim itself, and it is the same claim either way: the canvas
tracked the word or it did not.

The teacher's name-card case is fixed in the direction the entry describes, and the ink heights
say so more precisely than the aspect does. Before, `Christopher` exported with **193px** of ink
against `Emma`'s 203 — *shorter*, though it carries two ascenders and a descender, because the
long word was being squeezed into a fixed canvas. After, it is **374px** against `Emma`'s 285:
taller, which is what those ascenders and that descender should produce. The letters are drawn at
one size and the canvas grows with the word.

---

## R-010 — Stroke-direction overlay does not register to the letters it annotates

**Severity** R2 · **Root cause** FONT_METRICS · **Screen** FAIL · **Print** FAIL · **PNG** N/A
**Affects** `name-tracing`, `handwriting-worksheet-generator`, `letter-tracing`

`strokeDirectionData.js` hand-authors start dots and arrows in the 200×240 / font-size-210 box,
calibrated against a generic sans:

```
cap top ~ y 55   x-height top ~ y 88   baseline ~ y 198-200   descender ~ y 236-238
```

The letters are not drawn in that generic sans. Quicksand renders its baseline at ~205 in that
box and Fredoka at ~211, and neither matches the assumed horizontal stem positions.

Measured by rendering a solid-filled copy of the same word and testing whether each numbered
start dot falls on the letter body:

| surface | input | dots off the letter |
|---|---|---|
| name-tracing | `Emma` | **7 of 12** |
| handwriting-worksheet-generator | `abcdefg` | **7 of 13** |

Worst offsets on `Emma`: letter `a` stroke 2 is **24.8 units** clear of the glyph, letter `E`
stroke 1 is 11.8 units clear.

Visible in the render: on `a` the numbered dot floats in white space outside the letter and its
arrow cuts diagonally across the bowl; on `E` all three arm arrows overshoot past the right edge
of the letter; on `m` the stem arrowheads finish below the baseline.

The code documents this as "intentionally a *schematic* guide". Schematic is a fair goal, but a
start dot that sits 25 units off the glyph and arrows that end outside it are misregistration
rather than abstraction.

**Method note:** the first run of this test reported 12 of 12 dots "off the glyph" because it
tested against the hollow outline, where a dot correctly placed on a stroke centre lands in white
space. The number above is measured against a solid-filled copy, which is the meaningful test.

**Evidence** `evidence/R-010-stroke-overlay-misregistered.png`.

**Fixed 2026-09-19.** The overlay is fitted to the glyph it annotates by the same
`fitSkeleton` the tracing route uses, rather than dropped on unfitted. Same instrument: **12 of 12**
start dots land on the letter body on `name-tracing` (`Emma`) and **7 of 7** on
`handwriting-worksheet-generator` (`mom`), against 7 of 12 off before.

**Reopened and closed again, 2026-09-19 (same day).** Two things that entry did not cover.

*The numerals collided.* A badge is a disc of radius 11, so two are legible only while their
centres are 22 units apart. Measured across all 52 letters fitted to Quicksand 700, **eleven pairs
collide**, and on **A B D P R and p the two strokes start at exactly the same point** — badge 2
covered badge 1 completely, so the sheet showed a "2" and no "1" at all:

| letter | centre distance | overlap |
|---|---|---|
| A B D P R p | **0.0** | 22.0 — the first numeral is invisible |
| a | 14.1 | 7.9 |
| F | 16.3 | 5.7 |
| E | 16.8 | 5.2 |
| M | 21.5 | 0.5 |
| N | 22.0 | 0.0 |

Six of those were caused by the fix above: `B D P R` and `a` carried a lead-in segment whose only
job was to hold the two start dots apart, and removing it (correctly — it drew a spur off the
letter) brought the occlusion back. Moving an authored start point is not available either: it is
the claim the overlay exists to make.

So the **start dot stays on the start point and the numeral moves**, sliding along its own stroke
until nothing overlaps — the one direction that cannot leave the letter, and the one that labels
the stroke it belongs to. After: **0 colliding pairs across all 52 letters**, worst slide 28.5
units of arc (`A`, ~18% of a limb), 41 letters unmoved and rendering exactly as before.

*The arrows.* This entry also says "on `E` all three arm arrows overshoot past the right edge of
the letter", and the fix above never re-measured it. Measured now, with the arrow tip at the path
end plus the marker's 4-unit lead: **3 of 103 strokes** end off the ink (`c`, `e`, `u`), each
within 5–6 units. The fit had already carried it; recorded here so the sentence above is not read
as still-open.

*Method correction.* R-010's instrument was a bare on/off pixel test against a solid raster. Over
all 52 letters that test calls three start points "off the glyph" which are **1.0, 5.5 and 1.0
units** from ink at an em of 210 — an antialiased edge, not a miss. `js/printables/strokeRoute.test.html`
now measures the distance and allows half a stem, which is the inset `fitSkeleton` is already
called with. The defect this has to keep catching was 24.8 units.

**Guarded.** `strokeRoute.test.html` drives the shipped `badgePositions`/`tailPath`, sliced out of
`printablesEngine.js` between its `@stroke-badges` markers, and asserts: no two badges overlap,
every badge stays within the slide cap of its own start, every start dot and badge is on the
letter, every arrow tail ends where its stroke ends. Verified against five differently-shaped
broken inputs (the real regression re-injected; a badge let loose past the cap; a start point in
the counter of `o`, where the fit cannot rescue it; a tail stopping short; the markers renamed) —
each exits 1 — with a restored-tree control at 0. Browser test, not CI-gated, same as its siblings.

---

## R-011 — Cursive and calligraphy sheets are Unicode maths characters in a font stack that has none of them

**Severity** R2 · **Root cause** ASSET · **Screen** FAIL · **Print** FAIL · **PNG** FAIL
**Affects** `cursive-alphabet`, `calligraphy-alphabet`, `mom-in-cursive`, `dad-in-cursive`,
`love-in-cursive`, `family-in-cursive`, `best-friend-in-cursive`, `happy-birthday-in-cursive`

These pages render the letterform as an HTML text node holding Mathematical Alphanumeric
codepoints, with no cursive font requested anywhere on the page:

| page | rendered text | codepoints | font-family in effect |
|---|---|---|---|
| cursive-alphabet | `𝒜 𝒶` | U+1D49C, U+1D4B6 | `"Plus Jakarta Sans", -apple-system, sans-serif` |
| calligraphy-alphabet | `𝕬 𝖆` | U+1D56C, U+1D586 | same |
| mom-in-cursive | `ℳℴ𝓂` | U+2133, U+2134, U+1D4C2 | same |

Every page's `<link>` requests `Plus+Jakarta+Sans` only. None of those faces contains the
Mathematical Alphanumeric block, so the letterform is supplied by whatever maths font the
visitor's OS happens to carry. For a cursive *practice* sheet the letterform is the product.

Three consequences, the third measured:

* **No joins.** These are isolated glyphs. There are no entry strokes, exit strokes or
  connections, so the sheet cannot teach the thing cursive is.
* **Not a handwriting model.** U+1D49C is a formal maths script, not D'Nealian or Zaner-Bloser.
* **Two faces inside one word.** The script alphabet necessarily spans two Unicode blocks, because
  Mathematical Alphanumeric has holes where Letterlike Symbols already defined those letters.
  Measured at 100px: the 11 Letterlike glyphs `ℬℰℱℋℐℒℳℛℯℊℴ` render at line height **128** while the
  41 Math Alphanumeric glyphs render at **129**. Ten of the eleven resolve to a different face
  than their neighbours, so `ℳℴ𝓂` is set in two fonts.

The repository already knows about runtime font substitution generally (`reportFontFallback`,
added 2026-09-13). This is a different problem: not a font that failed to load, but a font that was
never requested.

**Fixed on `main`, not by this audit.** OUT-06 gave these pages `render: "glyph"` with a declared
face, and the 2026-09-19 self-hosting pass put that face in `assets/fonts/` where Cloudflare Fonts
cannot drop it. Re-measured in a browser on 2026-09-19, which is the only place both halves of
this defect are visible at once:

| page | rendered text | codepoints | resolved family | face loaded |
|---|---|---|---|---|
| cursive-alphabet | `A a` | U+41, U+61 | `Playwrite US Trad` | yes |
| calligraphy-alphabet | `A a` | U+41, U+61 | `UnifrakturMaguntia` | yes |
| mom-in-cursive | `Mom` | U+4D, U+6F, U+6D | `Playwrite US Trad` | yes |

No Mathematical Alphanumeric or Letterlike codepoint survives on any of the three, so the
two-faces-in-one-word measurement has nothing left to measure: the letterform is now ordinary
Latin text in a real joined hand, which is what a practice sheet needs it to be.

---

## R-012 — Dot-to-dot word mode reduces letters below recognisability and drops counters

**Severity** R2 · **Root cause** PATH_GENERATION · **Screen** FAIL · **Print** FAIL · **PNG** FAIL
**Affects** `dot-to-dot-name`

Point density does not scale with letter size, so the same letter is described well on the
single-letter sheet and badly in a word.

| input | per-letter polygons |
|---|---|
| `A` (single-letter sheet) | 21 points outer + **7 points counter** |
| `O` (single-letter sheet) | 22 outer + 12 counter |
| `Emma` | `E` 9 pts · `m` 13 · `m` 13 · **`a` 6 pts, one polygon, no counter** |

A closed `a` cannot be described by six points, and the counter polygon is gone entirely, so the
shape a child connects is a zigzag that is not the letter. A capital `E` needs twelve vertices and
is given nine.

The sequence is hard to follow for a second reason: numbering runs continuously across separate
closed shapes with no "lift your pencil" cue, so the jump from the end of one letter to the start
of the next is just the next number.

| metric | `dot-to-dot-name` (`Emma`) | `dot-to-dot-alphabet` (one letter) |
|---|---|---|
| consecutive-dot gap | min 25.1, max **412.3**, ratio **16.4** | min 70.1, max 152.1, ratio **2.2** |
| dot diameter at 7.5in live width | 2.59 mm | 5.24 mm |
| number cap height | **3.20 mm** | 5.00 mm |
| page height used | **12.8%** | 70.5% |

The single-letter sheet is good on all four. The word sheet is worse on all four, and the numbers
are 36% smaller than the same site's own sibling sets them.

**Correction:** an earlier pass reported 6 and 8 "number labels overlapping a dot". That was a
generous proximity threshold, not a collision. Inspection of the render shows labels correctly
placed beside their dots. Withdrawn.

**Evidence** `evidence/R-012-dot-to-dot-word-mode.png`.

**Measured again 2026-09-19 and deliberately NOT fixed.** Re-run unchanged: `Emma` still gives
`[9, 13, 13, 6]` points per letter with a gap ratio of 16.4, and `Christopher` gives
`[7, 9, 7, 5, 8, 6, 5, 5, 8, 10, 6]` at a ratio of 30.6. The dot and number sizes moved a little
with R-013's type fix (2.60mm and 3.29mm on `Emma`, against 2.59 and 3.20) but not materially.

**Correction to this audit's own framing.** The entry reads as an unnoticed defect. It is not: the
per-letter budget it measures is the deliberate output of a decision taken three days earlier and
written down in the engine, at `DOT_LEVELS`. That table was merged on 2026-09-16 out of two PRs
that had each changed it for a different surface, and its comment carries the measurement behind
every number — including why the word path uses a `perLetter` budget at all (a shared whole-word
`total` made the four difficulty levels indistinguishable beyond twenty characters and inverted
their labels) and why `single` is 14 (at 12, sixteen of sixty-two glyphs reproduced worse than 10%
of their height; 15 was tried and rejected for sitting one dot under medium). `easy`'s
`perLetter: 7` is exactly what produces the six-point `a`.

The obvious fix was tried and reverted. Raising the floor so a closed letter keeps its counter
collapsed `Emma`'s easy and medium sheets to the same 46 dots, which is the regression that
comment exists to prevent. Two of the entry's four secondary metrics are also already owned
elsewhere: `DOT_NUM_MIN` sets a printable floor for the number face and reduces the dot count
until the numbers fit rather than shrinking them, and `dotOutlineBudgetFor` floors the outline to
the glyph's own corner count.

What is left is a genuine product trade-off — recognisability per letter against the total dot
count a child will actually finish — and it belongs to whoever owns the difficulty ladder, not to
a render audit. The "lift your pencil" cue between letters is the one part of this entry that is
neither fixed nor decided against, and it is additive rather than a re-tune: it changes no budget.

---

## R-013 — Sheet composition wastes most of the page

**Severity** R3 · **Root cause** CSS_LAYOUT · **Screen** FAIL · **Print** FAIL · **PNG** FAIL
**Affects** `coloring-page-maker`, `dot-to-dot-name`, `name-puzzle-maker`

Font size on the 1000×1400 design sheet is a three-step cliff rather than a fit:

| input | font-size | ink box | % page width | % page height | % page area |
|---|---|---|---|---|---|
| `I` | 360 | 106 × 577 | 10.6 | 41.2 | **4.4** |
| `A` | 360 | 223 × 577 | 22.3 | 41.2 | 9.2 |
| `Emma` | 280 | 770 × 448 | 77.0 | 32.0 | 24.7 |
| `Christopher` | **110** | 591 × 178 | 59.1 | **12.7** | 7.5 |

`Emma` (4 characters) is set at 280 and `Christopher` (11) at 110, a 2.5× cliff with nothing in
between. On an 8.5 × 11in sheet `Christopher` prints about 1.4in tall in the middle of the page.

The printed page confirms it: `coloring-page-maker` Letter portrait leaves **4.35in of blank paper
above** the artwork against 0.59in below it, a 7.4 : 1 imbalance, with 30.5% ink coverage.
`name-puzzle-maker` prints at 1.9% coverage with 3.18in of blank paper above the strip.

Related, on the tracing side: the printed handwriting worksheet's practice rules span only
**3.61in of a 7.5in printable width** on five of its seven pages (page 1 spans 5.13in). Under half
the available writing space is used, on a sheet whose purpose is writing space.

**The tracing half is fixed, 2026-09-19** — it was left open by the partial fix below, which
addressed the design sheet only. Re-measured on the PDF this tool actually writes (`Emma`, level
2, default paper and margins): the practice rules spanned **3.07in of an 8.5in page**, 41% of the
6.13in printable box. They now span **6.13in — the whole of it** (measured off the rasterised PDF
at 110dpi: 674 of 674 px), with the letters unchanged in size and the rows unchanged in height.

The cause was not composition but `preserveAspectRatio`. A trace row is
`<svg viewBox="0 0 w 210">` with `width:100%` and a `max-height`, and `w` is measured from the
**word** — so the row's aspect is the word's, and on any sheet wider than that aspect the height
cap wins and the whole row, rules included, is letterboxed into the middle. A root `<svg>` clips
to its *viewport*, not to its viewBox, so the fix is to draw the rules past the viewBox and let
the element's own edge — which is the paper's writing width — cut them off. A horizontal rule
extended horizontally is still a horizontal rule, so nothing is distorted, and the word does not
move or shrink; choosing a wider viewBox aspect instead would have shrunk it by ~30% in portrait.

It also closes a preview/print disagreement rather than opening one: the rules already spanned
97% of the row in the live preview and 50% of the printable width in print. Both are now full
width. (The word is still drawn proportionally larger in the preview than it prints — that is
R-017's height cap, untouched here.)

Still open, and a product decision rather than a defect: the word is centred on the full-width
rule, so a short name now leaves practice space on both sides of itself rather than continuing
from the left margin.

**Partly fixed 2026-09-19.** The type is measured rather than counted: one probe at font-size
100 through the same hidden-canvas measurer the heading already trusted, scaled linearly. The
three-step cliff is gone — the size is continuous across the entry's own inputs (360 / 360 / 312 /
160 / 104 / 117) and "Christopher" now covers **86%** of the page width against 59.1%. R-007's
fix carries the rest: every paper and orientation now uses its whole printable box.

What is **not** fixed, and is a product decision rather than a render defect: a short word on a
wide sheet still leaves the sides empty, because the size cap is a share of the sheet (26% of its
height, the same proportion in every orientation) rather than a limit the word could grow past.

**Correction.** The 7.4 : 1 top-to-bottom imbalance this entry cites from R-007 is the ink
bounding box — top of the artwork to the footer rules at the bottom of the sheet — not the
artwork's placement. The artwork is centred in its band. It is not evidence for this entry.

---

## R-014 — Ink saver changes the PDF but nothing on screen

**Severity** R3 · **Root cause** PRINT_CSS · **Screen** FAIL · **Print** PASS · **PNG** N/A
**Affects** `coloring-page-maker`

The `.pt-ink-saver` rules are scoped to `body.is-printing` and `body.pt-pdf-rendering`, so they
apply during export only.

| | darkest pixel luminance |
|---|---|
| PDF, ink normal | 28 |
| PDF, ink saver | **90** |
| preview, either setting | unchanged (`stroke="#1a1a2e"`, computed `rgb(26,26,46)`, 5px) |

The setting works. The visitor cannot see that it works, which is the same class of problem the
engine's own comments record fixing for paper, orientation and margin: those three now drive the
preview and ink saver was left behind.

**Fixed 2026-09-19.** `paintPreviewInk()` toggles `is-ink-saver` on every preview container, and
it is called from `paintPaperPreview()` **above** that function's own `if (!node) return` guard —
the guard covers the paper sheet, which not every tool has, and putting the call under it is why
the first attempt worked on one page and silently did nothing on the other three.

Measured in a browser by toggling the real control and reading the computed style:

| tool | preview opacity, normal -> saver | class after |
|---|---|---|
| coloring-page-maker | 1 -> **0.72** | `pt-design-preview is-ink-saver` |
| handwriting-worksheet-generator | 1 -> **0.72** | `pt-paper is-ink-saver` |
| name-tracing | 1 -> **0.72** | `pt-name-preview is-ink-saver` |
| name-puzzle-maker | 1 -> **0.72** | `pt-paper is-ink-saver` |

The CSS keys on the toggled class rather than on a container class, which matters because
`#pt-gen-preview` is itself a `.pt-paper`: a rule written against the container would have matched
the paper sheet on two of these four whether ink saver was on or not.

---

## R-015 — Attribution block is duplicated and internally misaligned

**Severity** R3 · **Root cause** EXPORT_PIPELINE · **Screen** N/A · **Print** FAIL · **PNG** FAIL
**Affects** `name-puzzle-maker` (duplication), all PNG exports (alignment)

The name-puzzle PDF prints `ultratextgen.com/printables/name-puzzle-maker` **twice**: once under
the cut instruction and again beside the QR at the foot of the page.

In the PNG exports the credit URL is centre-aligned on the canvas while the QR sits hard right, on
a different baseline, with no alignment relationship between them. On a short input the two are
the only marks in the lower half of the file and read as two unrelated stamps.

**Duplication fixed 2026-09-19.** `puzzleSheetNode()` no longer appends its own
`.pt-puzzle-credit` line. `attachCredit()` was already putting the real credit block, with its QR,
on every page unit, and the puzzle sheet was signing itself a second time underneath the cut
instruction. Measured on the print surface itself, snapshotted through a `MutationObserver`
because the surface is torn down as soon as the PDF is written:

| | before | after |
|---|---|---|
| page units | 1 | 1 |
| `.pt-puzzle-credit` lines | **1** | **0** |
| `.pt-credit` blocks | 1 | 1 |
| QR inside the credit block | 1 | 1 |
| `ultratextgen.com` on the sheet | **3** | **2** |

The surviving two are the one block's own halves — the QR's encoded URL and the visible path
beside it. The block is the copy that scans, so it is the copy that stays. `puzzlePNG()` draws its
own credit band on its own canvas and is untouched. The on-page preview loses the duplicate too
(1 -> 0), which is correct: the preview is meant to be the sheet.

**Alignment: correction to this audit, and reported rather than fixed.** The centred URL beside a
corner QR is not an oversight. `drawCredit()` carries a dated comment from the 2026-09-10 share
pass stating the choice and its reason: the text *"stays centred on the canvas rather than moving
to make room for the QR — the QR sits in the corner, and re-centring the text on the remaining
width would shift the credit line on every existing export for no gain."* That is an active
decision with a cost attached, and this entry did not check for one before calling it a defect.

It is still worth revisiting, because the reason given is about *not moving* an existing line and
the audit's observation is about the pair reading as two unrelated stamps on a short input — those
are different questions. But it is a decision to reopen with whoever took it, not a render bug to
patch.

---

## R-016 — Mobile preview is too small to judge the artifact

**Severity** R3 · **Root cause** RESPONSIVE_SCALING · **Screen** FAIL · **Print** N/A · **PNG** N/A
**Affects** every word-outline tool

| viewport | preview CSS size | scale against viewBox |
|---|---|---|
| desktop 1400 | 810 × 106 | 0.530 |
| tablet 820 | 730 × 96 | 0.478 |
| mobile 390 | **300 × 39** | **0.196** |

`Christopher` on a 390px viewport renders in a 39px-tall preview. No horizontal overflow and the
geometry is not altered, so this is a preview-fidelity defect rather than a layout break, but a
39px strip cannot show whether the sheet is right, on the device most likely to be used.

**Fixed 2026-09-19.** Below 640px the preview is sized by HEIGHT and scrolls sideways, so the
scale is set by the height rather than by the container's width. Measured on `name-tracing` with
input `Christopher`:

| viewport | element box | effective scale | ink height | scrolls |
|---|---|---|---|---|
| desktop 1400 | 810 x 120 | 0.600 | 113px | no |
| tablet 820 | 730 x 120 | 0.600 | 113px | no |
| mobile 390 | **509 x 110** | **0.550** | **104px** | yes |
| small 360 | 509 x 110 | 0.550 | 104px | yes |

Against **300 x 65 at 0.324** immediately before the fix: the letter is 1.7x larger on a phone,
and desktop and tablet are untouched. `document.scrollWidth` does not exceed the viewport on
either phone width, so the sideways scroll is inside the preview box and the page itself does not
grow one.

That 300 x 65 is not the 300 x 39 in the table above, and both are right. The table is the
original audit reading; R-006's fix changed the word viewBox in between, which changed the height
a 300px-wide box produces. The two are measurements of the same defect at two dates, not a
discrepancy.

Swept across tools rather than measured on one, because the twelve pages that mount
`#pt-name-input` differ in face, stroke and viewBox width: name-tracing 509 x 110, bubble-letters
570 x 110, block-letters 573 x 110, graffiti-letters 464 x 110 — all at an effective 0.55, all
scrolling inside the box, none growing a document-level scrollbar.

**Effective scale, not the element box, is the number that matters here**, and reading the wrong
one cost this fix two attempts. An `<svg>` letterboxes its own content under `preserveAspectRatio`,
so the letter is always drawn uniformly at `min(sx, sy)` however non-square the element is. A
first attempt raised the element to 300 x 110 and reported success; the ink was still 0.324 and
still 65px, in a taller white box. Measure the ink.

Three declarations carry the rule and all three were necessary:

* `width: max-content` — an `<svg>` carrying only a `viewBox` has an intrinsic **ratio** and no
  intrinsic width, so `width: auto` stretches it to the container instead of to its content. Same
  family as the percentage-height trap CLAUDE.md records for the print figure.
* `max-width: none` — the stylesheet's own default clamps it back otherwise.
* `flex: none` — a flex item still **shrinks to fit** after `max-content` has sized it. Without
  this the element measured 300 x 110 again, which is the two-attempt failure above.

`justify-content: safe center` rather than `flex-start`: the left half of a scroll container is
unreachable, so plain centring would put the `C` of `Christopher` permanently off-screen, while
`flex-start` would left-align a short name that fits. Verified both: `Al` measures 119px with
111px of gap on each side and does not scroll; `Christopher` starts 21px from the left edge and
does.

**The glyph-mode pages were a second surface, and they gained something this entry did not set out
to fix.** `cursive-alphabet` and `calligraphy-alphabet` render `render: "glyph"`, so their name
preview is a `<p class="pt-glyph-figure">` of real text rather than an outline SVG: the type is
sized by `font-size`, never by the container, so R-016's scale defect never applied to them. What
did apply was the container's `overflow: hidden`. Measured on both, before and after:

| | overflow-x | overflow | reachable by the reader |
|---|---|---|---|
| before | `hidden` | 77px | no — clipped |
| after | `auto` | 155px | yes |

The overflow doubling is the clearest evidence for `safe center` in this whole entry: before, the
content was centred, so 77px of the 155 hung off **each** side and the left half was unreachable
by construction. Start-aligning it puts the whole 155 on the right, where a scroll can get to it.

**Correction, and the reason it is written down.** The first probe here asked
`scrollWidth > clientWidth` and reported `true` on both sides, which reads as "it already
scrolled, nothing changed". It does not mean that: an `overflow: hidden` box reports the same
overflow and is simply clipped. The predicate that separates clipped from scrollable is whether
`scrollLeft` moves for the reader, i.e. the computed `overflow-x`. Same class of mis-predicate as
the `896 of 898` miscount CLAUDE.md records — a bigger sample would not have helped.

---

## R-017 — Preview is height-capped, so on-screen proportions are not the sheet's

**Severity** R4 · **Root cause** CSS_LAYOUT · **Screen** FAIL · **Print** PASS · **PNG** PASS
**Affects** `handwriting-worksheet-generator`, `letter-tracing`, `sight-word-tracing`

`.pt-paper .pt-gen-row .pt-trace-svg { max-height: 92px; }` caps the row while width stays 100%,
so a 584 × 210 viewBox is presented in a 1752 × 93 box. `preserveAspectRatio` then letterboxes the
content and the on-screen row is not a scale model of the printed one. Noted during measurement,
which had to render the markup standalone to get true geometry.

**Fixed on `main`, not by this audit.** Re-measured 2026-09-19 on all three affected tools, in the
page rather than standalone:

| tool | element box | viewBox | sx | sy | letterboxed |
|---|---|---|---|---|---|
| handwriting-worksheet-generator | 300 x 73 | 864 x 210 | 0.347 | 0.347 | **0%** |
| letter-tracing | 158 x 92 | 360 x 210 | 0.438 | 0.438 | **0%** |
| sight-word-tracing | 285 x 92 | 650 x 210 | 0.438 | 0.438 | **0%** |

`sx === sy` on all three, so each row is a scale model of its printed self. The row layout changed
on `main` while this audit was in flight; nothing in this branch touches it, and it is recorded
here so a future pass does not re-derive the original reading from a stale entry.

---

## R-018 — The stroke overlay erases the letter it annotates on every dotted row

**Severity** R1 · **Root cause** PATH_GENERATION · **Screen** FAIL · **Print** FAIL · **PNG** FAIL
**Affects** `handwriting-worksheet-generator`, `letter-tracing`, `sight-word-tracing`

Introduced by R-001's fix, and only visible because of it. The stroked levels now draw the
writing centreline — `fitSkeleton` over `strokeDirectionData.js` — and the stroke-direction
overlay draws *the same call's output* on top, solid, 6 units wide, at 0.9 opacity, with the
letter's dots underneath at `routeSw` 7 and a `0.1 19` dash.

Before R-001 the two were different geometry (contour vs skeleton) and the overlay read as an
annotation across the letter. After it they are identical, so the overlay does not annotate the
letter, it **replaces** it: at level 3 the fine dots a child is meant to join are completely
covered by a blue line of exactly their own shape. Every trace row on the sheet, not just one.

No gate could see it. The row's markup, strings, schema, assets and structure are all unchanged;
the defect is one path painted over another, and nothing in this repo compares two paths in one
SVG.

**Fixed 2026-09-19.** `traceWordSVG` passes `routeDrawn` when the row has already drawn these
paths, and the overlay then contributes only what the row lacks: the numbered start dot and a
short arrow at the end of each stroke (18 units, or 34% of a short stroke, at stroke-width 4
instead of 6). The full route is still drawn on a solid or ghost row, where the letter is not the
skeleton. Measured on `E`, whose fitted arms are ~55 units: the arrow plus the badge covered 65%
of an arm at the first attempt and 46% at the shipped size.

---

## R-019 — The N-per-sheet chips are an orphan control, wedged into the button row

**Severity** R3 · **Root cause** CSS_LAYOUT · **Screen** FAIL · **Print** N/A · **PNG** N/A
**Affects** `coloring-page-maker`, `dot-to-dot-name`, `handwriting-worksheet-generator`,
`letter-tracing`, `name-puzzle-maker`, `sight-word-tracing`

Reported by the owner as "there is something missing here" on the generator page, which is
exactly what it looks like: two bare digits, **1** and **4**, with no label, sitting *between*
Download PDF and Save all 7 levels in the middle of the primary action row.

Two causes, and the second is the one that makes it unreadable.

`mountSheetCost()` anchors on `btn.closest(".bubble-actions, .pt-actions")`. Six of the seven
roster tools mark that row `.pt-preview-actions`, which is in neither selector, so `closest()`
returned null, the fallback inserted after the *button* rather than after the row, and the chips
`mountNUp()` puts above the cost line landed inside it. `name-tracing` looked right only because
it happens to use `.bubble-actions`.

And the chips carry no visible label by design — the engine's own note says "the chips are
digits, so this adds no string in any language… what explains them is the sheet-cost line
directly beneath". That line is `hidden` until the roster holds two names. `mountNUp()` read
"a roster exists" as "the textarea exists", which is true on load, so the default state of the
page was the chips with their entire explanation hidden.

**Fixed 2026-09-19.** `.pt-preview-actions` added to the anchor list, so the line and the chips
sit under the whole row on all seven tools (verified by reading the DOM order on each). The chips
follow the same rule as the line that explains them: hidden until the roster holds enough names
for N-per-sheet to change anything, `updateSheetCost()` owning both. `.pt-choice` is
`flex: 1 1 auto` for labelled ladders, so the two digits are sized to their content once the row
is on its own line.

**Not fixed, and it needs a decision.** Even with the cost line present the chips are two bare
digits. No existing translated string fits: `T.classSet` is "Class set: one sheet per name",
which contradicts the 4 chip, and `T.sheets`/`T.pageCount` are nouns. A visible label needs a new
string in eight languages, which is a copy decision rather than a render fix.

---

## R-020 — The generator's PNG export carries neither the overlay nor the credit

**Severity** R2 · **Root cause** EXPORT_PIPELINE · **Screen** N/A · **Print** N/A · **PNG** FAIL
**Affects** `handwriting-worksheet-generator`, `letter-tracing`, `sight-word-tracing`

Same family as R-008 and R-009: the preview and the export disagree.

`strokeOverlayImage()` was added so the numbered start dots and arrows would survive into "the one
artifact that leaves the site", and wired into `wordPNG`. `genWordPNG` — the word export of the
*generator*, on the page whose whole subject is stroke order — was not given it, so with **Show
stroke direction** on the preview and the PDF carried the numbering and the PNG did not.

`genWordPNG` also never called `drawCredit`, alone among this engine's PNG paths, so that download
left the site with no URL and no QR on it.

**Fixed 2026-09-19.** Both wired, using the geometry the canvas beside them already draws
(alphabetic baseline, no tracking) and `routeDrawn` set from whether the level drew the route, so
the PNG follows the same rule as the screen. Verified by downloading `handwriting-emma-L3.png`
headlessly and reading it.

---

## Confirmed passes

Recorded so a later pass does not re-derive them, and so any regression is visible.

| area | result |
|---|---|
| Paper size to PDF page box | correct: Letter 8.5×11, A4 8.27×11.69, Legal 8.5×14, landscape 11×8.5 |
| Pagination | no blank pages, no duplicate pages, one page size per document, across 2/3/7/36-page exports |
| A–Z book completeness | `dot-to-dot-alphabet` book is 36 pages (26 letters + 10 digits) |
| Counters in pattern fills | preserved; `A` counter stays unfilled under every fill |
| Counters in single-letter dot-to-dot | preserved as a separate numbered polygon |
| Cross-stitch grid | 23 × 7 cells, gaps uniformly 16 × 16, perfectly square |
| Cross-stitch stitch fit | X paints 13.28 units inside a 16-unit cell, 17% margin, no overflow |
| Name-puzzle letter centring | each letter within 0.05in of its piece centre; centre spacing 1.77/1.80/1.81in |
| Handwriting rule centring | ruled block centred on the page, asymmetry 0.00in |
| Print darkness | coloring sheet's darkest pixel is luminance 28, near-black, prints on a basic printer |
| Banner cut marks | cut line dashed `10 7` in `#1a1a2e`; punch holes marked as dashed circles |

Three of these were corrections to a wrong first reading during this audit: the cross-stitch
stitches looked like they overflowed their cells and do not; the handwriting block looked
off-centre and is not; the cursive practice sheet looked like it left 5.28in blank and does not
(the measurement threshold was excluding the light ruled lines).

---

## Open, not established

| question | why it is open |
|---|---|
| `cross-stitch-letters` and `name-puzzle-maker` preview-vs-PNG aspect | the first measurement used a selector that matched a nav icon; not re-run |
| Banner letter clearance to the diagonal cut | text **em box** corner comes within 0.5 units of the cut line, but the em box is wider than the ink. Needs an ink-level measurement on `W` and `M` flags before it is called a defect |
| Cross-stitch grid on a basic printer | grid is CSS-styled at `rgb(211,215,222)` (luminance 214) with no SVG stroke attribute. It renders in the PNG, but its printed weight was not measured |
| Firefox and WebKit | not tested. Chromium only |
