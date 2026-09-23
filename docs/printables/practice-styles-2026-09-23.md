# Practice styles — one row composition primitive

**Status:** shipped 2026-09-23. **Scope:** the 20 pages whose name sheet rules its
rows. **Supersedes:** RF-015's FIX-1 in
[`render-fidelity-audit-2026-09-22.md`](render-fidelity-audit-2026-09-22.md).

## What a practice style is

How the **model** and the **independent writing space** are arranged across one
ruled handwriting row. It is a property of the row, not of short names: the same
composition runs for a letter, a short word and a name, and the same function runs
for the preview, the print surface, the PNG and the PDF, so those four cannot
disagree about it.

| key | UI name | what the learner does |
|---|---|---|
| `repeat` *(default)* | Repeat tracing | traces the model across the whole line |
| `trace_write` | Trace then write | one model, then the rest of the line is theirs |
| `trace_write_check` | Trace, write, check | model → their own attempt → a second model to compare against |
| `write_check` | Write then check | writes from memory, then meets the model at the end |

`repeat` is the default because it is the strongest scaffold and because it is the
one that degrades to the existing sheet: where only one copy fits, it composes one
model at the writing margin, which is what a long name got before.

## The primitive

```
practiceCompose(style, boxW, modelW, fontSize) -> [x, x, …]
```

One function, in the row SVG's own units, returning the x of each model's **ink**.
It reads no DOM, knows nothing about locale or page markup, and never asks how many
characters the word has — `WWW` and `iii` are three characters and two different
lines. Adding a fifth style is a case in that function; it is not a second renderer.

Published as `window.UltraTextGen.practiceRow` so the geometry can be exercised
without a worksheet. It lives in `printablesEngine.js` rather than in a module of
its own for one reason: a module needs a `<script>` tag, and that is a hand edit to
20 pages in 7 languages — the localization cost the whole feature is built to
avoid.

**Rules the composition obeys**, each gated by `npm run test:practice-row`:

* whole copies only — a half-drawn name is the one thing a tracing sheet must never
  show, so the repeat count comes from the measured model width;
* no model starts before the writing margin, and none ends past the far one, unless
  the word is wider than the line — then the box widens rather than clipping;
* models never overlap and always keep the minimum gap;
* every mode that starts with a model starts it at the **same** margin, so the rows
  of a sheet line up;
* `trace_write_check` composes two models only when there is room to write between
  them, and one honestly when there is not;
* the blank area is unused ruled space. **No underscore glyph is ever drawn.**

## The geometry it sits on

The row's box comes from the page: `layoutPracticeRow()` gives the row SVG the
aspect of the row's measured box, and the row's height is CSS — a flex share of
`.pt-sheet-page.is-fitted` on a sheet, a fixed band in the preview. That is RF-015's
fix, and it is what makes composition possible at all: a row that collapses around
its content has no space to compose into.

It is re-composed **inside** each state that measures it — the PDF path, the PNG
path and `beforeprint` — because the print surface is `display: none` outside them
and a row measured on screen is not the row on the paper.

## The control

One selector, **Practice style**, mounted by the engine next to the name field on
the 20 ruled pages, with its strings in the engine's `I18N` for all eight languages.
Four cards, each carrying the name of the activity, a miniature of the row it
produces and one line about what the learner does. The miniature is drawn by
`practiceCompose` itself, so it cannot drift from the sheet; it uses a fixed
one-letter sample because a name that fills the line makes all four pictures
identical, which would teach the opposite of the truth.

**It is shown only where the four styles actually produce different rows**, decided
by composing all four and comparing — and it asks that question of the **sheet**,
not of the preview card, because the card is 810px on a laptop and 330px on a phone
while the paper is 720px either way.

## Measured

47 pages that mount the name sheet, 7 name lengths each, US Letter portrait, through
the PDF path; plus 400 configurations across the 20 ruled routes × 4 styles × 5
inputs, and the four papers on three routes.

| | before | after |
|---|---|---|
| `fit` on the 20 ruled routes | 0.176 – 0.917, varying with the name | **1.000, every route, every name** |
| distinct row viewBoxes per route | 6 – 7 (one per name) | **1** |
| the 27 unruled routes | 0.978 flat | **0.978 flat — 0 of 189 measurements changed** |
| clipping, overlap, baseline drift, multi-page | — | **0 in 400 configurations** |

`WWW` composes 2 copies and `iii` composes 6 on the same page at the same size,
which is the ink-width rule doing its job.
