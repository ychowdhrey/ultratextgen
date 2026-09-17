# Printables Render Test Fixtures

The exact glyphs, words, options, paper sizes and generator states to preserve as reference
fixtures. Chosen because each one **exposed a real defect** during the 2026-09-17 audit, or
because it is the control that proves a check is not tuned to a single bug.

Every fixture below carries the defect it exercises, so a future pass can tell a regression from a
noisy diff.

---

## Glyph classes

Test one representative from each class, not the whole alphabet. These are the classes that broke.

| class | glyphs | why this class | exposes |
|---|---|---|---|
| Straight | `E H I L` | `E` has the largest side-bearing asymmetry measured (ink centre 3.5–4.5 units right of tile centre on three tools) | R-005 |
| Round | `C O S` | overshoot above cap and below baseline; `O` is the two-contour case for dot-to-dot | R-005, R-012 |
| Diagonal | `A M N V W` | widest advance; `W`/`M` are what break the character-count width estimate | R-006 |
| Counters | `A B D O P R` | counter preservation under pattern fill and in dot-to-dot sampling | R-004, R-012 |
| Ascenders | `b d f h k l` | measured 10.3 units short of the top rule | R-002 |
| Descenders | `g j p q y` | reach y=239.7 in a 240-unit tile, 0.3 units of clearance | R-005 |
| Narrow | `i l I` | single-glyph centring; `I` is the extreme preview-vs-PNG aspect case (1.000 vs 3.077) | R-009 |
| Wide | `M W m w` | clipping; `m` is the stem-count case for the dotted scanline test | R-001, R-006 |
| Complex | `a e g s` | `a` collapses to 6 points and loses its counter in dot-to-dot word mode | R-012 |
| Tail | `Q` | tail extends past the advance; measured 6.7 units right of centre | R-005 |

---

## Fixture strings

`SNAPSHOT` marks the six that also carry a committed pixel reference.

| string | why it exists | exposes | snapshot |
|---|---|---|---|
| `A` | the control. Single cap, no descender, symmetric. If this fails, the harness is wrong, not the page | R-005 | SNAPSHOT |
| `I` | narrowest input. Preview viewBox is square (200×200), PNG is 1600×520 | R-009, R-013 | SNAPSHOT |
| `Emma` | the site's own default. Mixed case, doubled letter, ends in a round | R-002, R-010, R-012 | SNAPSHOT |
| `minimum` | 15 stems in a row. The scanline fixture that proves dots land on stem edges rather than centres | **R-001** | SNAPSHOT |
| `mom` | shortest string containing a closed counter and two stems. The two-concentric-rings case | **R-001** | SNAPSHOT |
| `WMWMWM` | widest possible run. Overflows the viewBox by 43 units both sides on block-letters | **R-006** | SNAPSHOT |
| `iiii` | narrowest run. The over-reserved-width control for R-006 — must **not** clip | R-006 control | |
| `gjpqy` | all five descenders. Bottom ink at 184.3, tile edge at 240 | R-005 | |
| `bdfhklt` | all ascenders plus `t`. Measured 10.3 short of the top rule | R-002 | |
| `AEHMW` | all caps. Measured 15.0–15.5 short of the top rule | R-002 | |
| `oxsce` | pure x-height. Measured 17–18 units over the midline | **R-002** | |
| `Christopher` | 11 chars. Falls off the font-size cliff (280 → 110), prints 1.4in tall | R-013 | |
| `ABCDEFGHIJKLMNOPQRSTUVWXYZ` | 26 chars. **Renders as `ABCDEFGHIJKLMN`** — 12 dropped silently | **R-003** | |
| `Wolfeschlegelsteinhausenbergerdorff` | beyond the field cap. 15 dropped | R-003 | |
| `A` / `AA` / `AAA` / `AAAA` | the pattern-phase series. Tile phase 4.6 / 33.2 / 13.8 / 0.2 for the identical letter | **R-004** | |
| `Ñandú` | accented Latin + a glyph outside the base set. Glyph-coverage and fallback behaviour | R-011 class | |
| `ABC` / `WWW` / `III` / `MIM` / `OQO` | monogram set. `WWW` overflows by 19.2 left and 18.5 right; all five sit 11.2 units high | **R-006**, R-005 | |
| `abcdefg` | overlay fixture. 7 of 13 start dots miss the letter body | **R-010** | |
| `PARTY TIME` | banner fixture. 9 flags, exercises per-flag letter placement and cut geometry | R-015 class | |

---

## Generator states

### Handwriting worksheet generator
| control | fixture values | why |
|---|---|---|
| level | Solid model, **Bold dotted**, **Fine dotted**, Dashed, Faded ghost, Faint guide, Blank | the two dotted levels are R-001; Solid is the reference row every dot assertion compares against |
| rows | 1, 3, 8 | pagination and the 7-level ladder export |
| case | as-typed, title, upper, lower | lowercase is where the midline overshoot (R-002) is visible |
| stroke direction | **on** and off | on is R-010; off must be byte-identical to the pre-overlay render |
| lefty | on, off | untested this pass; include so it is not forgotten |

### Coloring page maker
| control | fixture values | why |
|---|---|---|
| letter fill | plain, **dots**, **stripes**, **hearts**, **stars** | all four patterns share the R-004 origin bug; `plain` is the control and also the only one carrying `paint-order="stroke"` |
| border | none, stars, hearts, dots, flowers, party | untested this pass |
| heading | empty, `Emma's Coloring Page` | affects vertical composition |
| footer | on, off | credit-block duplication (R-015) |

### Print settings — the matrix that must stay
| paper | orientation | margin | ink | why |
|---|---|---|---|---|
| Letter | portrait | normal | normal | baseline. Page box 8.5×11, coverage 30.5%, top 4.35in vs bottom 0.59in |
| A4 | portrait | normal | normal | page box 8.27×11.69. Regional default path |
| Legal | portrait | normal | normal | page box 8.5×14 |
| Letter | **landscape** | normal | normal | page box 11×8.5, coverage **17.1%** — R-007 |
| Letter | portrait | **narrow** | normal | bottom margin drops to 0.34in, near the home-printer unprintable band |
| Letter | portrait | normal | **saver** | PDF darkest 28 → 90, preview unchanged — R-014 |

### Multi-page exports
| export | expected | why |
|---|---|---|
| `dot-to-dot-alphabet` A–Z book | **36 pages**, one size, no blanks, no duplicates | the completeness control: 26 letters + 10 digits |
| `handwriting` all 7 levels | **7 pages** | ladder pagination |
| `alphabet-coloring-pages` A–Z sheet | 2 pages | tiled mode |
| `bubble-letters` A–Z sheet | 3 pages | tiled mode, different face |
| `cursive-alphabet` practice | 2 pages | R-011 surface |

### Viewports
| viewport | why |
|---|---|
| 1400 × 1000 | desktop. Preview scale 0.530 |
| 820 × 1180 | tablet. Preview scale 0.478 |
| 390 × 844 | mobile. Preview scale **0.196** — a 39px-tall preview of `Christopher` (R-016) |

---

## Environment the fixtures assume

Getting any of these wrong makes the whole fixture set measure something else.

* **The real webfonts must load.** `Quicksand` (tracing), `Fredoka` (bubble, coloring),
  `Archivo Black` (block, banner), `Baloo 2` (coloring sheet, puzzle), `Playfair Display`
  (monogram), and the graffiti faces. A run without them measures system-fallback metrics and
  every number in this document is wrong. Assert `document.fonts.check()` per face before
  measuring, and fail the run rather than reporting.
* **Render standalone at an integer scale, not from the page.** The on-page preview is height
  capped (`.pt-paper .pt-gen-row .pt-trace-svg { max-height: 92px }`), so the rendered box is not
  a scale model of the sheet and `preserveAspectRatio` letterboxes the content. Lift the generated
  markup and re-render it; this is R-017 and it silently corrupts any measurement taken from the
  live element.
* **Measure ink, not `getBBox()`.** On a `<text>` node `getBBox()` returns the font em box: `A` and
  `a` both report `y=25, height=168` at font-size 132. Every centring and registration number in
  this audit comes from scanning the raster.
* **Strip the ruled lines before scanning per-glyph ink.** They span the full row width, so a
  per-glyph x-range scan otherwise measures the rules and reports every letter as identical. This
  produced a wrong table during the audit before it was caught.
* **Test overlay dots against a solid-filled copy of the letter.** Against the hollow outline a
  correctly placed dot lands in white space and the check reports 12 of 12 failures on good output.
* **Never read a probe's exit status through a pipe.** `$?` becomes the pager's status. This has
  produced false passes in this repository twice and once during this audit.

---

## Reproduction

The audit harness is not committed (it installs Playwright outside the repo, in the precedent of
using `wrangler` for `_redirects` verification). The measurements above are reproducible with:

| measurement | method |
|---|---|
| glyph ink vs ruled lines | lift the row's SVG, strip `<line>`, render at scale 4, scan per-glyph x-ranges from `getExtentOfChar` |
| dot sampling (R-001) | render solid and dotted rows at identical geometry, count ink runs on one scanline, compare to stem count |
| pattern phase (R-004) | read `getExtentOfChar(0).x` per input length, take modulo the pattern tile width |
| tile centring (R-005) | render the tile standalone at scale 3, scan ink bounds, compare centre to viewBox centre |
| viewBox overflow (R-006) | union of `getExtentOfChar` extents against viewBox width |
| export parity (R-008/009) | download through the browser's real download path, read PNG dimensions and luminance histogram |
| print geometry (R-007/013) | rasterise the PDF with PyMuPDF at 100dpi, scan ink bounds, convert to inches against the page box |
| overlay alignment (R-010) | map dot centres to user space via `getScreenCTM().inverse()`, test against a solid-filled render |
| cursive face mixing (R-011) | measure per-glyph rendered height across the script alphabet; differing heights mean differing faces |
