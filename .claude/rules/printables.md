---
paths:
  - "printables/**"
  - "{de/zum-ausdrucken,es/imprimibles,fr/imprimables,id/printables,it/da-stampare,nl/om-uit-te-printen,pl/do-druku,pt/imprimiveis}/**"
  - "js/printables/**"
  - "data/printables_*.json"
  - "data/printable_tool_duplication_exclusions.json"
  - "scripts/**/*printable*"
---

# Printables

Deeper reference: `docs/printables/` (the render defect registry, print-settings
measurements, quality audits) and `docs/decisions/printables-scope.md`.

**To add or change a printable surface, use the `printables-surface` skill.**

## Scope: the test governs, the examples illustrate it

A printable belongs in this repo only if the thing being rendered is **text** — a
letter, word, name or phrase. **The test: could a visitor type a word or name into
the feature and see *that word* rendered?** If no, it is not a printable for this
repo.

In scope: bubble/cursive/block letters, coloring pages, tracing sheets, a
dot-to-dot of a *name*, name puzzles, banners spelling a word, and word searches,
crosswords and word scrambles **built from typed words** (owner decision,
2026-09-16 — the test wins over the older exclusion list).

Out of scope: mazes, shape-only tracing, pre-writing motor strokes, math
worksheets — nothing the visitor types appears in them. That demand is real and
belongs to a possible future separate property; do not build it under this brand.

Nothing here bypasses the rest of the rules: a new URL still goes through
`.claude/rules/content-architecture.md` (Hub-vs-Spoke, "check who already owns it")
and, for a locale page, `.claude/rules/localization.md`.

Word-search entry is the **long tail and the anti-copying batch feature**, never
the head terms — `word search maker` is KD 72 and `crossword puzzle maker` KD 56.

## A visual asset is the follow-up, never the default

Copy-paste Unicode is the front door and satisfies the job fastest. Never make a
printable the *default* answer for a query plain characters already serve.

## A surface the engine reads must be a surface it routes

`buildPrintOptions()` mounts the print-settings panel, the share row, the saved
strip and the recent strip — **all four, from one anchor**, and it returns early
when that anchor is null. So an action surface added to the `el` map but not to
`firstActionSurface()` costs a page every one of them, silently: the mount is
written at runtime, so there is nothing in the HTML for a static page check to
miss. That shipped on the three puzzle makers for three days.

The same shape applies to `pngExportTarget()`, which gates whether the page
offers **Share as image** at all.

`npm run check:printables-surface-wiring` compares the engine against itself and
gates on it. It exits **2** rather than 0 when it cannot locate `el`,
`firstActionSurface()` or `pngExportTarget()` — a rename fails closed instead of
reporting a comforting clean. If you rename or restructure one of the three,
update the check in the same change.

## Two pages must not own the same tool

The engine mounts a surface from an element id, so this is a one-line mistake. See
`.claude/rules/content-architecture.md` → "Two pages must not offer the same tool".

## The print settings own the sheet

- **Never hardcode a printed figure's height in inches**, and never estimate the
  height of a title or footer to work one out. `applySheetMetrics()` publishes
  `--pt-page-h` (exact: paper minus chosen margins minus the print root's padding)
  and `--pt-body-h` (a deliberately **generous** estimate, only for the
  `min-height` layouts that cannot self-size). The single-character and book prints
  are **flex columns** so the title and credit claim their natural space and the
  figure absorbs the rest — nothing has to know how tall a heading is. A fixed
  8.4in figure is how one letter printed across three sheets on every landscape
  setting.
- The error directions are not symmetric: a `min-height` that overshoots spills
  onto a second page; one that undershoots merely stops short of the bottom.
- **Never add a control to the Print settings panel without a visible consequence
  in the preview.** The panel spent its first three days wired only to the `@page`
  rule, which is indistinguishable from a panel that does nothing. Every handler
  calls `paintPaperPreview()`. The preview card **is** the chosen paper — its
  aspect, margin and ink-saver state — and is capped by **height**, not width.
- Every sheet action writes a **PDF**; the print dialog is the fallback only. There
  is no row that offers a print button.

## The export is a CLONE, and it drops what it is not told to carry

`printablePdf.js` writes the PDF and the PNG by cloning the print surface, inlining a **named
list** of computed properties onto the clone, and painting that through an
`<svg><foreignObject>`. `width` and `height` are on the list, so **a property that produced the
layout and is not on the list is dropped while the box it produced stays behind** — the children
reflow inside a box that still reports the old size and paint over whatever follows.

That is not hypothetical. `.pt-search-words` is `columns: 3 8rem`; neither `column-count` nor
`column-width` was carried, so the word search's clue list exported as one column, ran across the
Name/Date row and the credit QR, and lost three of its ten words off the page — **at default
settings**, for as long as the tool has existed. The crossword's word bank reuses the class and
did the same to its clue columns.

**Nothing in the DOM shows this.** The page, the preview and every geometry assertion over the
print surface are correct; the defect exists only in the clone.

* **Adding a CSS property to a print-surface rule means adding it to `PROPS`.**
  `npm run check:print-export-properties` compares the two and fails the build otherwise. A
  shorthand whose computed value round-trips (`overflow`, `border-radius`, `columns`) carries its
  longhands; a property that genuinely cannot affect a static raster goes in that script's `INERT`
  list **with its reason**, never silently.
* **`::before` / `::after` do not survive the clone at all** — `cloneNode()` does not reproduce
  pseudo-elements. The check reports them as a note. Do not style a printed sheet with one.
* The geometry a sheet must satisfy — no two sibling regions sharing space, no child escaping a
  box that does not clip it, nothing past the paper's width, no page rescued by shrinking it — is
  `js/printables/renderInvariants.js`, gated by `npm run test:render-invariants` against recorded
  before/after geometry of that word-search export.

## Attribution

**Never hand-author a QR code, a second QR encoder, or a credit block.** The
encoder is `js/printables/qr.js` (`npm run test:qr` gates it) and the footer is
`creditNode()`/`attachCredit()`.

- The footer goes **inside each page unit**, not on the wrap: the PDF writer
  rasterises explicit `.pt-*-page` elements and **drops everything outside them**,
  so a footer on the wrap prints from the browser dialog and vanishes from the PDF.
- Link rects are measured **inside** the rendering state — the print surface is
  `display: none` the moment the rendering class comes off and every rectangle then
  reads zero. The annotation rectangle derives from the **image placement**, not the
  page box.
- **A QR has a minimum physical size and it is not a style choice.** A credit URL
  encodes as a version-5 symbol; at 0.42in that is 0.24mm per module against the
  ~0.5mm a phone camera needs. 0.95in decodes. Check it by **decoding a render of
  the print surface at print resolution**, never by looking at it — a QR that is too
  small looks exactly like a QR.
- The QR encodes **the page**, not a preset URL: a preset carrying a class roster
  runs past 200 characters, and the resulting version-9 symbol is unreadable at this
  size. The Share row is where the preset link lives.

## Letterforms: measure before hollowing

- **Never give a page a hollow outline without measuring the face's stem width
  first.** The default stroke of 9 closes UnifrakturMaguntia's hairline connectors
  to solid black (stem 6 at the 5th percentile). Set `CFG.strokeWidth` from the
  measurement.
- **Never ask a single-weight font file for weight 700.** Synthetic bold is
  non-deterministic across engines and additive to the stroke drawn over it. Set
  `CFG.fontWeight` to a weight the family actually ships — check
  `assets/fonts/manifest.json`. A synthetic-bold question needs **two** browser
  engines to be measured, not one.
- `CFG.traceable` (hollow letters) and `CFG.ruledRows` (handwriting guidelines) are
  **separate, opt-in flags**. A ruled row is right for a child practising a name and
  wrong for graffiti name art. **Never turn guidelines on globally.**
- `addRuling()` is the one owner of a ruling — a surface needing it in its own
  coordinates passes geometry to it rather than drawing its own lines. A
  fixed-fraction national ruling (Seyès, Lineatur) takes the **trace surface's
  band-to-type ratio**; only `standard` reads the face.
