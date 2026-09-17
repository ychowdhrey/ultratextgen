# Printables Render Defect Registry

One normalized defect per entry, with the measurement that establishes it. Audit run
2026-09-17 against `main` (`3d7ef668b`), served locally, driven in headless Chromium 1194
with the real Google webfonts each page requests.

Severity: **R1** artifact unusable or teaches the wrong thing · **R2** obvious render defect
that significantly hurts usefulness · **R3** visible, should be corrected · **R4** optical polish.

Every number below was measured, not estimated. Where a first reading was wrong it is
recorded as a correction rather than removed, because the wrong reading is the one a future
audit will repeat.

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

---

## R-015 — Attribution block is duplicated and internally misaligned

**Severity** R3 · **Root cause** EXPORT_PIPELINE · **Screen** N/A · **Print** FAIL · **PNG** FAIL
**Affects** `name-puzzle-maker` (duplication), all PNG exports (alignment)

The name-puzzle PDF prints `ultratextgen.com/printables/name-puzzle-maker` **twice**: once under
the cut instruction and again beside the QR at the foot of the page.

In the PNG exports the credit URL is centre-aligned on the canvas while the QR sits hard right, on
a different baseline, with no alignment relationship between them. On a short input the two are
the only marks in the lower half of the file and read as two unrelated stamps.

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

---

## R-017 — Preview is height-capped, so on-screen proportions are not the sheet's

**Severity** R4 · **Root cause** CSS_LAYOUT · **Screen** FAIL · **Print** PASS · **PNG** PASS
**Affects** `handwriting-worksheet-generator`, `letter-tracing`, `sight-word-tracing`

`.pt-paper .pt-gen-row .pt-trace-svg { max-height: 92px; }` caps the row while width stays 100%,
so a 584 × 210 viewBox is presented in a 1752 × 93 box. `preserveAspectRatio` then letterboxes the
content and the on-screen row is not a scale model of the printed one. Noted during measurement,
which had to render the markup standalone to get true geometry.

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
