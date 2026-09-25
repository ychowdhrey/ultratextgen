---
name: printables-surface
description: >-
  Add or change a printable surface in UltraTextGen — a coloring, tracing, bubble,
  block, cursive, banner, dot-to-dot, name-puzzle, word-search or crossword sheet,
  its print settings, its preview, or its PDF/PNG export. Use this whenever the task
  touches `printables/`, a locale printables directory or `js/printables/`, including
  "add a printable for X", "the sheet prints on three pages", "make these letters
  traceable" or a scope question about whether a worksheet belongs here at all. The
  engine mounts a surface from an element id, so the most common failures are a
  duplicated tool and a sheet that only looks right on screen.
---

# Printables surface

Invariants: `.claude/rules/printables.md`, `.claude/rules/fonts.md`. Scope decision:
`docs/decisions/printables-scope.md`. Print settings, letterform measurements and the
open findings: `docs/printables/print-settings-and-letterforms.md` and the rest of
`docs/printables/`.

## 1. Scope test

**Could a visitor type a word or name into the feature and see *that word*
rendered?** If no, it is not a printable for this repo — and that is the test, not the
example lists. Mazes, shape-only tracing, pre-writing strokes and math worksheets are
out; word searches, crosswords and word scrambles built from typed words are in.

A visual asset is the higher-intent **follow-up**, never the default answer for a
query copy-paste Unicode already serves.

## 2. If it is a new URL, it is a new page first

Run the `ship-page` skill: demand evidence, "check who already owns it", the
Hub-vs-Spoke spoke test, and — for a locale page — the English-Parent Rule via
`locale-batch`. A printable does not bypass any of it.

## 3. Check nothing already owns this tool

```bash
npm run audit:tool-duplication        # whole-site picture
npm run check:tool-duplication        # the gate: pairs this branch introduces
```

The signature is `(locale, noun, render, font)`. `noun` is what the sheet *is*, in the
page's own words — `coloring page`, `dot-to-dot`, `puzzle piece` — and the engine
already uses it in aria-labels and filenames. Three pages render a typed word in the
same face and are correctly **not** collisions, because their nouns differ.

**The fix for a real collision is Hub-vs-Spoke Rule 3** — whichever page owns the
query keeps the tool, the other keeps a one-line pointer — **never deleting the older
page.**

## 4. Pick a face the manifest actually ships

```bash
python3 -c "import json;print(json.load(open('assets/fonts/manifest.json')).keys())"
```

- **Never ask a single-weight file for weight 700.** Set `CFG.fontWeight` to a weight
  the family ships; synthetic bold is non-deterministic across engines and additive to
  any stroke drawn over it. There is a standing backlog of surfaces that get this
  wrong — do not add to it.
- **Never add a family to a Google Fonts link and assume it is served.** Self-host it:
  `python3 scripts/fetch-self-hosted-fonts.py --family "<Name>"` then
  `python3 scripts/build-font-face-css.py --write`.

## 5. If the letters are hollow, measure the stem first

At `outlineSVG`'s own font-size of 210, over the narrowest 10% of ink runs, a centred
stroke of N leaves a white channel of roughly `stem − N`. Quicksand at stroke 4
(channel 19) is the working reference. The default stroke of **9 closes
UnifrakturMaguntia's hairline connectors to solid black** — both script pages ship
`strokeWidth: 4`. The table is in the printables doc.

`CFG.traceable` and `CFG.ruledRows` are **separate opt-in flags**: a ruled row is
right for a child practising a name and wrong for graffiti name art. Never turn
guidelines on globally, and pass geometry to `addRuling()` rather than drawing your
own lines — a fixed-fraction national ruling takes the **trace surface's
band-to-type ratio**, only `standard` reads the face.

## 6. The sheet must measure itself

- **Never hardcode a printed figure's height in inches** and never estimate the height
  of a title or footer. Use `--pt-page-h` in a **flex column** so the figure absorbs
  what is left; `--pt-body-h` is only for the `min-height` layouts that cannot
  self-size, and it is deliberately generous because overshoot spills onto a second
  page while undershoot merely stops short.
- **Every print-settings handler calls `paintPaperPreview()`.** A control with no
  visible consequence is indistinguishable from a control that does nothing.
- A percentage-height figure needs a **definite** containing height: absolutely
  position it inside a `position: relative` parent (see `.claude/rules/css.md`).

## 7. Credit and export

Use `creditNode()`/`attachCredit()` and `js/printables/qr.js` — **never a second QR
encoder or a hand-built credit block.** The footer goes **inside each `.pt-*-page`
unit** (the PDF writer drops anything outside them), link rects are measured **inside**
the rendering state, and the annotation rectangle derives from the **image placement**,
not the page box. The QR encodes the **page**, not a preset URL.

Every sheet action writes a PDF; the print dialog is the fallback only.

## 8. Verify by rendering, against the base

Screen markup is not the deliverable. Serve a git worktree of the base commit
alongside the working tree and drive both in headless Chromium:

- count `/Type /Page` in the PDF for **every** paper × orientation × margin
  combination — the landscape/portrait split is how a one-letter sheet printed on
  three pages;
- **decode** the QR from a render of the print surface at print resolution, never look
  at it — and run this step on the change that has "nothing to do with the credit",
  because RF-016 was a row-geometry change that cut the credit out of 20 routes;
- **measure the page unit's descendants against its box**, not just the unit against
  the page. `fit = pageHeight / unitHeight` is 1.0000 by construction on a unit with a
  fixed height (`is-fitted`, `is-nup`) and cannot see content cut inside it;
- for a letterform change, compare **two engines** — Chromium and Firefox disagreed by
  23% on a lowercase counter from the same font file;
- diff the panel markup, name preview and figure markup of the page types you did
  **not** intend to change, and expect them identical with 0 page errors.

Then `npm run check:ci-gates`.

## 9. Report a print defect as a picture, not a paragraph

A `fit` of 0.21 is a number; the page bitmap is the argument. Prose also hides the
case where your own description of the defect is wrong — a sheet described as
"overlapping" turned out to be correctly laid out and merely printed small.

Two figures, both cheap once the harness is up:

- **The same sheet under several inputs, side by side, from the real page canvases.**
  Not a screenshot of the preview and not the print surface — the bitmap the PDF
  embeds. Intercept it by defining an accessor for `UltraTextGen.pdf` **before** the
  page scripts run, wrap `renderPages()`, and `toDataURL()` what it returns. Caption
  each panel with the measured number and what it means on paper ("prints at 21% ·
  1.8in of 8.5in"), so the picture and the metric are read together.
- **The mechanism drawn to scale, carrying the measured numbers.** Boxes whose
  proportions are the real proportions, one stage per causal step. Do not illustrate
  a mechanism you have not measured; every figure on it should be traceable to a
  value the harness printed.

Compose the figure as an HTML page and screenshot the element in the same headless
browser — no image library needed, and the layout is reviewable as source.

