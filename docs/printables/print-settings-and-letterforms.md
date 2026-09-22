# Print settings, the preview, and letterform rendering

Invariants: `.claude/rules/printables.md`, `.claude/rules/fonts.md`. Procedure: the
`printables-surface` skill. Defect registry and render audits:
`docs/printables/render-defect-registry.md`,
`docs/printables/render-quality-audit.md`,
`docs/printables/render-systemic-findings.md`.

## The panel had no visible consequence, and almost no correct one

The Print settings panel (paper, orientation, margins, ink saver) shipped 2026-09-10
wired to exactly one thing: the `@page` rule. Nothing else in the engine read
`printPrefs`.

**Two reports, one root cause.** *"The print settings don't change the display — how
would the user know it will print differently?"* and *"Print this letter is rendering 3
pages for 1 letter"* are the same defect seen from two ends:
`.bubble-print-single .bubble-outline` was `height: 8.4in` and
`.bubble-print-book-page .bubble-outline` was `8.2in`, **regardless of what the visitor
had chosen.** Landscape asks for a page 8.5in tall; an 8.4in figure plus a title does
not fit on it.

Measured across all eight paper/orientation/margin combinations before the fix, by
driving headless Chromium and counting `/Type /Page`:

| orientation | pages for one letter |
|---|---|
| every portrait combination | **1** |
| every landscape combination | **3** |

`printAlphabetTiled` had always derived its grid from `printArea()`. **The two layouts
that had not were the two that broke.**

## The layouts measure themselves; only one number is estimated

`applySheetMetrics()` publishes the paper as custom properties on `#pt-print-root` at
print time:

- **`--pt-page-h`** — the real printable height, with no guessing: paper, minus the
  chosen margins, minus the print root's own padding. The single-character and book
  prints are **flex columns** of that height, so the title and the credit footer claim
  their natural space and the figure absorbs the rest. **Nothing has to know how tall a
  heading is.**
- **`--pt-body-h`** — for the layouts that set a `min-height` instead (the name and
  puzzle sheets), which cannot self-size. It subtracts a deliberately **generous**
  1.9in chrome allowance against a measured 1.6in (a 0.4in title, a 0.95in credit band
  whose height the QR sets, and its 0.25in margin), because **the error directions are
  not symmetric**: a `min-height` that overshoots spills onto a second page, one that
  undershoots merely stops short of the bottom.

**The first attempt did the arithmetic everywhere and was wrong by 0.11in**, which
printed one letter on 2 pages instead of 1. Measured after the change, the flex wrap
lands on exactly `--pt-page-h` (9.66in on Letter portrait) with the figure absorbing
8.14in of it — which is the point: nothing had to know that the title is 0.4in tall.
**Measure, or let the layout measure itself, and estimate only where neither is
possible.**

`PRINT_CHROME_IN` is 1.9 and not 1.4 because a working scan code is worth a 7% smaller
letter and a decorative one is worth nothing — see the QR section below.

## A percentage height needs a definite containing height

This change hit that twice, in two different ways, and both times the CSS was valid and
the output silently wrong:

- a flex item sized `flex: 1 1 auto` does not provide one, so the print figure fell
  back to its intrinsic aspect at full width and rendered **15.6in tall inside a 10in
  page**;
- an `aspect-ratio` box does not provide one either, which is the less obvious half —
  the preview sheet has a ratio and a width, so its height *looks* definite, but a
  percentage child cannot resolve against it (the child's own height would feed back
  into the box). The figure took its intrinsic aspect and pushed a landscape sheet to
  **893px where the ratio called for 461.**

Both are fixed the same way: the figure is **absolutely positioned inside a
`position: relative` parent**, which makes the height definite *and* takes the figure
out of the flow so it cannot push its own container around. Reach for that pairing
whenever a figure has to fill a box whose height is computed rather than stated.

## The preview is a sheet of the paper that was chosen

Before: the card rendered the same 518×622 figure whatever the settings said —
verified byte-identical before and after switching to Legal / Landscape / Narrow. Now
the card **is** the page: `--pt-paper-aspect` gives it the chosen paper's shape,
`is-narrow` its margin, `is-ink-saver` its lighter lines, and the letter fills it the
way it fills the sheet. **Landscape is short and wide on screen because it is short and
wide on paper.**

The caption under it names the same settings in words and **introduces no new
strings** — it is composed from `PO.letter` / `PO.portrait` / `PO.narrow` /
`PO.inkSaver`, which the panel already ships translated in eight languages.

**The sheet is capped by HEIGHT, not width** (`min(100%, 72vh * aspect)`). That is the
answer to *"the image still is not occupying the larger space"*: the old
`.bubble-stage.is-solo` cap was a flat 560px, so a sheet sat in an 852px column with
292px of nothing beside it, and a landscape page would have been held to a portrait
page's width. A height cap keeps a portrait page inside the viewport and lets a
landscape one use the panel.

## Attribution: a QR on both exports, and a real link in the PDF

`js/printables/qr.js` is a dependency-free ISO/IEC 18004 encoder (byte mode, ECC M,
versions 1–10). `js/printables/qr.test.js` has the verification and the one deliberate
divergence from the reference encoder.

- **Every printed sheet and PDF page** now carries a `.pt-credit` footer: the page path
  as text, and the same URL as a QR. Before this, **only the tiled alphabet print
  carried any credit at all** — the single-letter and book prints named nothing, so a
  printed coloring page had no route back to the site.
- **PNG exports** get the QR drawn into the corner by `drawCredit()`. A PNG cannot carry
  a link; that is the whole reason the QR exists rather than only an annotation.
- **PDFs from the native writer** get a real `/Link` annotation over the credit block.
  `renderPages` records how each canvas was placed and `rectOnCanvas()` maps a DOM
  rectangle onto it, so the engine never reimplements that module's page-cut logic.

**Three placement rules, each from a wrong result:**

- **The footer goes inside each page unit, not on the wrap.** `renderPages` rasterises
  explicit `.pt-*-page` elements one canvas each and **drops everything outside them**,
  so a footer on the wrap prints from the browser dialog and vanishes from the PDF.
- **Link rects are measured inside the rendering state.** The print surface is
  `display: none` the moment `pt-pdf-rendering` comes off, and every rectangle then
  reads zero.
- **The annotation rectangle derives from the image placement, not the page box.** On a
  short last page the image does not fill the sheet, and a page-box rectangle sits
  adrift of the text it covers.

**The QR encodes the page, not `presetUrl()`**, even though a scan that reopened the
exact sheet would be the better trick. A preset carrying a class roster runs past 200
characters, which is a version-9 symbol: 53 modules plus its quiet zone across the same
0.95in is 0.39mm per module, under what a phone can read. **A code that works every
time beats one that works until someone types a long name.** The Share row is where the
preset link lives.

**A QR has a minimum physical size, and it is not a style choice.** The printed symbol
shipped at 0.42in in the first draft. It rendered perfectly, and **no reader could
decode it**: a credit URL encodes as a version-5 symbol, 37 modules plus an 8-module
quiet zone, so 0.42in is 0.24mm per module against the ~0.5mm a phone camera needs.
0.95in gives 0.53mm and decodes. **Check it by decoding a render of the print surface
at print resolution, never by looking at it — a QR that is too small looks exactly like
a QR.**

`qr.js` is loaded by the engine, not tagged on 293 pages — the same ownership
`loadPdfModule()` already uses, but at init rather than on demand, because the QR is
built synchronously by every print and every PNG. If it has not arrived, the sheet
degrades to the text credit and **says so in the console**; a sheet that quietly loses
its QR looks exactly like one that never had it.

## Traceable letters and ruled rows

The webfonts fix made `/printables/cursive-alphabet/` set its letters in Playwrite. It
did not make them **traceable**: `RENDER === "glyph"` drew solid ink, which is a chart.
You can read a chart; you cannot trace or colour one, and "trace or colour one" is the
job of a page called *Cursive Letter A printable*.

**The name surface was the sharper case, because the page says what it is.**
`nameRow()` took a `RENDER === "glyph"` branch that produced
`<span class="pt-name-word is-trace">` — grey solid text, nothing to write inside — and
the very next line read `if (leftHanded && kind === "trace" && RENDER !== "glyph")`, so
**the left-handed model silently did nothing on all 15 of those pages.**

### The stroke is a measurement, not a taste

The caveat this started from was *"hollowing a thin monoline hand gives two
hairlines"*, and measuring **inverted it**. At `outlineSVG`'s own font-size of 210, over
the narrowest 10% of ink runs (the stems a centred stroke has to fit inside), with the
white channel a stroke of N leaves:

| face | ships | stem p05 | stem p10 | channel @4 | channel @9 |
|---|---|---|---|---|---|
| Archivo Black | 400 | 39 | 41 | 37 | 32 |
| Fredoka | 700 | 28 | 35 | 31 | 26 |
| Baloo 2 | 700 | 25 | 29 | 25 | 20 |
| Quicksand | 700 | 21 | 23 | **19** | 14 |
| **Playwrite US Trad** | **400** | 17 | 18 | 14 | 9 |
| **UnifrakturMaguntia** | **400** | **6** | **8** | 4 | **-1** |

Quicksand at stroke 4 is the working reference — `/printables/letter-tracing/` ships it,
channel 19 — and Playwrite at 14 is comfortably inside that. **The face that actually
breaks is the blackletter**, whose hairline connectors between fat stems are 6 units at
the 5th percentile: the default stroke of **9 closes them to solid black**, and the
letter stops being an outline exactly where blackletter is most recognisable. Both
script pages ship `strokeWidth: 4`.

### Synthetic bold

Both faces ship weight 400 only, so `outlineSVG`'s hardcoded `font-weight: 700` was
asking for **synthetic bold** — the browser smearing a 400 outline,
**non-deterministic across engines** and additive to the stroke drawn over it.
`CFG.fontWeight` replaces that literal at the three SVG sites and the twelve `ctx.font`
ones, defaulting to 700 so no existing page moves, and the `glyphMetrics` probes were
moved onto it in the same pass: **measuring one weight and drawing another misplaces
the ink box**, which is the whole reason those probes exist.

`Archivo Black` ships 400 only too, and `/printables/block-letters/` plus
`/printables/spanish-alphabet-chart/` were fixed on 2026-09-20. Two things from that fix
are worth keeping, because neither is visible in the one-line diff:

- **A second engine is what proved it.** Chromium and Firefox drew the *same* page, from
  the *same* font file, differently: stem p10 50 against 47, and the counter in a
  lowercase `e` 334 against 436 — **a 23% divergence in the hole a child colours in.**
  After the fix both engines report p10 42 and counters within 3px of 2,000. **A
  synthetic-bold question needs two engines or it is not measured.**
- **The repo had already decided this once, on the other renderer.**
  `scripts/generate-printables-previews.py` requests Archivo Black at 400 with the
  comment *"a single-weight family is requested at 400 so fontconfig never synthesises a
  bold that would double the outline's stroke"*. So the build-time preview and the
  runtime sheet had been drawing different letterforms. **When a second renderer exists,
  check what it already does before treating a question as open.**

### 77 printable surfaces still ask for a weight that is not shipped

Measured by loading all 303 pages carrying `window.UTG_PRINTABLE` and reading the config
**executed rather than parsed**, so faces nested in `nameStyles` and `scriptOptions` are
counted, then comparing each primary family against `assets/fonts/manifest.json`. A
family this site does not self-host is reported as **unknown** rather than missing, so
nothing here is inferred from a font we do not ship.

| family | ships | surfaces | where |
|---|---|---|---|
| Archivo Black | 400 | **58** | the 36 `block-letters` letter/number spokes, `banner-maker`, 16 locale pages, plus 5 graffiti pages carrying it as the `block` style option |
| Sedgwick Ave Display | 400 | 5 | `graffiti-letters` + its de/es/fr/id twins, `nameStyles.0` |
| Permanent Marker | 400 | 5 | the same five, `nameStyles.1` |
| Rubik Spray Paint | 400 | 5 | the same five, `nameStyles.3` |
| Playwrite DE Grund | 400 | 2 | `de/zum-ausdrucken/schreibschrift`, root and `scriptOptions.0` |
| Playwrite DE SAS | 400 | 1 | the same page, `scriptOptions.1` |
| Playwrite DE VA | 400 | 1 | the same page, `scriptOptions.2` |

Two rows deserve a decision rather than a sweep. The **36 block-letter spokes** are the
same cluster as the hub that was fixed, so **a spoke and its own hub now render the same
letter differently** — the strongest candidate for the next pass. And
**`de/zum-ausdrucken/schreibschrift`** is a German cursive page the traceable work never
reached, because it sets its letters in the `Playwrite DE *` family rather than
`Playwrite US Trad`, so the sweep that caught the English cursive pages passed over it.

**The table is a measurement, not an inventory that maintains itself, and it moved twice
while it was being written.** The sequence is the point: **75** before the hub fix, **73**
after it, and **77** once a locale batch merged four hours later, because that batch
added block-letter pages for `it`, `nl`, `pl` and `pt` setting Archivo Black with
`fontWeight` unset. Nobody did anything wrong; a locale batch has no reason to know about
a font-weight audit. Taken against `b7ee00f77` — re-measure with the method above rather
than trusting this table's age.

**There is no gate for this, and adding one is not obviously right.** A check would be
red on 77 surfaces from the day it shipped. What the locale-batch case argues for instead
is the cheaper habit: **when a new printables page picks a face, check the manifest for
the weights that face actually ships.**

### Two flags, because hollow and ruled are different jobs

`CFG.traceable` sends a script page's letters through `wordOutlineSVG` hollow. It goes
through the **word** surface rather than `outlineSVG` because `outlineSVG` draws ONE
character in a 200×240 tile, and losing the lowercase is not a trade worth making on a
cursive page — **joined lowercase script is the thing people practise.** The page keeps
its Unicode variant chips, its A–Z strip and its upper/lower pair.

`CFG.ruledRows` puts handwriting guidelines behind the name and letter rows. **It is
deliberately separate and opt-in**: a ruled row is right for a child practising a name
and wrong for the teenager making graffiti name art, which is a framing mistake worth
not repeating. Today: cursive (40) and the name-tracing cluster (7) are ruled;
calligraphy (29) is hollow and unruled.

### The Seyès ruling existed for months and nothing drew it

`addRuling()` was called from exactly one place, `traceWordSVG()`, which only the
`#pt-gen-*` surface mounts — **3 English pages, 2 German, 1 Indonesian, and no French
page at all.** So `rulingKey()` had answered `seyes` for `lang === "fr"` since it was
written **and the lines were never drawn.** German reached `lineatur` only because two
German pages happen to mount that surface.

The fix is not a new French page. `addRuling` now takes optional geometry, the name/word
surface passes its own, and the existing French pages whose job this is —
`fr/imprimables/prenom-a-tracer/` and `fr/imprimables/alphabet-cursif/` — render Seyès.
Measured in the browser: **fr 5 horizontals + 4 verticals, de 4 horizontals + the shaded
Mittelband, en 3.**

**A fixed-fraction ruling takes the TRACE surface's band-to-type ratio, never the face's
ascender**, and that distinction is load-bearing. `standard` *is* the face —
`rulingGuides` reads the baseline, x-height and ascender off it, and on the English sheet
cap top 62 lands against an ascender line at 57 and x-height top 87 against a midline at
87, exactly. Seyès and Lineatur are national standards whose zones are fixed fractions
*because the exercise book says so*; deriving their band from the face put the German
Mittelband at 112.5 while the x-height sat at 87, **shading the bottom half of the
lowercase letters.** They now reproduce the trace surface's proportions, so one Lineatur
is drawn on both surfaces rather than two that disagree.

### `wordBaselineY`

The word surface anchors at `WORD_OUTLINE_ANCHOR_Y` with `dominant-baseline="central"`,
which aligns the **font's em box**, so the baseline is not that number: it sits half the
ascent/descent difference below the box centre. `glyphMetrics.ink()` exposes
`emAscent`/`emDescent` for exactly this caller and says so in its own comment. Guessing
0.3em instead is only ever the degraded fallback for a browser with no
`actualBoundingBox` support.

## Verification

Nine page types the traceable change did **not** target — bubble, block, graffiti,
alphabet-coloring, letter-tracing, the handwriting generator, dot-to-dot,
coloring-page-maker and the German generator — were driven in headless Chromium against
a git worktree of `origin/main` served alongside the working tree. Panel markup, name
preview and figure markup are **identical on all nine, 0 page errors on both sides.**
That is what makes the twelve `ctx.font` edits safe to believe: they are no-ops at the
default weight, **and the run proves it rather than asserting it.**

## Closed, and kept as the record

- ~~`printAlphabetTiled` writes `"page N of M"` as hardcoded English on every
  locale.~~ **Fixed 2026-09-16** (`ba287b686`): the tiled title reads `T.pageCount.one`
  and `T.ofWord`, which all eight locales ship.
- ~~The per-character row and the book row differ: one offers a PDF button and the other
  does not.~~ **Fixed 2026-09-15** (`231712e55`) when every sheet action became a PDF
  write. Measured on both families rather than read: the per-character row is
  `Save as PDF` + `Download PNG`, the book row's own button is converted in place, and
  no button on either page still says Print in any of the eight languages.
