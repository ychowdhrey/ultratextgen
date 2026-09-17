# Printables Render Regression Plan

A practical automated visual QA system, so the defects in
[`render-defect-registry.md`](render-defect-registry.md) do not have to be rediscovered by hand
after every PR.

Written to this repository's existing testing conventions: no framework, no runner, plain files
you `node` or open, in the idiom of `js/counter/counterRules.test.js` (pure logic) and
`js/counter/counter.test.html` (DOM, driven headlessly, read from `window.__UTG_TEST`).

---

## The design decision that matters

**Geometry assertions first, pixel snapshots second.** Not both equally.

Pixel diffing a printable is noisy in exactly the way that trains people to ignore a check: font
rasterisation differs between machines, webfont delivery varies, antialiasing shifts on a
container with different fonts installed. The repository already records this failure — a full art
regeneration on a machine with a different font build rewrote hundreds of "visually identical but
byte-different" files, and it had to be caught by reading `git status`.

Geometry assertions do not have that problem. `inkCentreY is 13.0 units below tileCentreY` is the
same number on every machine that can render the face at all, and it is the actual defect rather
than a proxy for it.

So the split is:

* **Geometry assertions — gating.** They encode the defect, they are stable, and once the defects
  are fixed there is no backlog for them to be permanently red against. This is the same call the
  repo already makes for `check:zalgo-decodes` and `check:share-save-tags`.
* **Pixel snapshots — informational, on a small fixture set.** They catch the things geometry
  cannot describe: a pattern that stopped rendering, a stroke that vanished, an overlay drawn
  twice. Never gating.

---

## Verified: the assertions catch the real defects

Demonstrated before being proposed, per this repository's own rule that adding a validator is not
the same as gating on it. Run against `letter-tracing`'s live tile, 200 × 240, tolerance 2 units:

```
 letter "A"
   A1 inkCentreY within tol of tileCentreY : dY=13.0   -> FAIL
   A2 inkCentreX within tol of tileCentreX : dX=-0.2   -> PASS
   A3 ink inside safe area (>=4 units)     : clear=30.7 -> PASS
 letter "g"
   A1 inkCentreY within tol of tileCentreY : dY=44.8   -> FAIL
   A2 inkCentreX within tol of tileCentreX : dX=-2.8   -> FAIL
   A3 ink inside safe area (>=4 units)     : clear=0.3  -> FAIL
```

A1 and A3 fail on exactly R-005. A2 passes on `A` and fails on `g`, which is correct.

**`g` also shows the trap to design around.** A descender *should* sit lower than a capital, so a
naive "ink centre equals tile centre" assertion would demand the wrong thing for a third of the
alphabet. The assertions below are therefore **letter-class aware**: they assert against the
class's reference line (cap top, x-height top, baseline, descender bottom) rather than against a
single centre for every glyph. Getting this wrong produces a check that is red for correct output,
which is worse than no check.

---

## Layer 1 — Geometry assertions (gating)

`js/printables/renderGeometry.test.js`, run with `node`, driving headless Chromium.

The engine's builders are already callable functions that return SVG nodes, so the test can build
a tile directly rather than scraping a page. Where a surface is only assembled at export time (the
puzzle strip), the test drives the real export.

### Tile assertions — one per letter class

| id | assertion | catches |
|---|---|---|
| G-01 | cap-height letters: ink top within tol of the tile's cap reference | R-005 |
| G-02 | x-height letters: ink top within tol of the x-height reference | R-002, R-005 |
| G-03 | all letters: ink bottom within tol of the baseline reference (descenders excepted) | R-002 |
| G-04 | descender letters: ink bottom within tol of the descender reference, **and** ≥ 4 units clear of the tile edge | R-005 |
| G-05 | ink centre X within tol of tile centre X, measured on ink not advance | R-005 |
| G-06 | no ink outside the viewBox on any fixture string | R-006 |

### Ruled-sheet assertions

| id | assertion | catches |
|---|---|---|
| G-10 | capitals and ascenders touch the top rule (±tol) | R-002 |
| G-11 | x-height letters touch the midline (±tol) | R-002 |
| G-12 | baselines sit on the baseline rule (±tol) | R-002 |
| G-13 | ruled block is horizontally centred on the page (±0.05in) | regression guard on a current pass |

### Trace-path assertions

| id | assertion | catches |
|---|---|---|
| G-20 | on a horizontal scanline through the x-height, dot-cluster count equals stem count (not 2×) | **R-001** |
| G-21 | every stem crossed by that scanline contains ≥1 dot cluster (no gaps) | R-001 |
| G-22 | dot clusters fall within the middle third of each stem's width | R-001 |
| G-23 | dot-to-dot point count per letter ≥ a per-letter minimum; counter polygon present where the letter has one | **R-012** |
| G-24 | consecutive-dot gap ratio (max/min) below a threshold | R-012 |

G-20 is the assertion that would have caught the headline defect. It is cheap: render the solid
row and the dotted row at the same geometry, scan one line, compare run counts.

### Pattern assertions

| id | assertion | catches |
|---|---|---|
| G-30 | pattern tile phase at the glyph's ink origin is invariant across input length | **R-004** |
| G-31 | pattern coverage ratio inside the glyph stays within a band | guards over/under-decoration |

### Overlay assertions

| id | assertion | catches |
|---|---|---|
| G-40 | every stroke-direction start dot lies on the solid-filled letter body | **R-010** |
| G-41 | every arrow path endpoint lies within the letter's ink box | R-010 |

G-40 must test against a **solid-filled copy** of the letter, not the hollow outline. Testing
against the outline reports 12 of 12 dots as "off the glyph" on a correct sheet, because a dot
correctly placed on a stroke centre lands in the hollow interior. That false reading was produced
during this audit and is the single easiest way to build a check that lies.

### Export parity assertions

| id | assertion | catches |
|---|---|---|
| G-50 | PNG canvas aspect within tol of preview viewBox aspect | **R-009** |
| G-51 | preview stroke colour equals exported stroke colour | **R-008** |
| G-52 | exported PNG dimensions are deterministic for a given input | R-009 |
| G-53 | ink saver changes preview luminance as well as export luminance | R-014 |
| G-54 | exactly one credit block per exported artifact | R-015 |

### Print assertions

| id | assertion | catches |
|---|---|---|
| G-60 | PDF page box equals the selected paper, per orientation | regression guard on a current pass |
| G-61 | page count deterministic per input; no blank page; no two identical pages | regression guard on a current pass |
| G-62 | all ink ≥ 0.25in from every page edge (home-printer safe area) | R-013 and print safety |
| G-63 | top and bottom margins within a ratio band of each other | **R-013** (currently 7.4 : 1) |
| G-64 | ink coverage in landscape ≥ coverage in portrait for the same input | **R-007** |

G-64 is a good example of an assertion that is trivial to compute and states the defect exactly:
choosing a bigger page should not produce a smaller artifact.

---

## Layer 2 — Pixel snapshots (informational)

`js/printables/renderSnapshot.test.js`, Playwright screenshots compared with `pixelmatch`.

Scoped deliberately small: **one fixture per renderer**, not per page. The fixture set is in
[`render-test-fixtures.md`](render-test-fixtures.md); the snapshot subset is the six marked
`SNAPSHOT`.

* Threshold 0.1, ignore antialiasing, fail on > 0.5% differing pixels.
* References committed as PNGs under `docs/printables/evidence/refs/`.
* **Never gating**, for the reason in the design decision above. It reports, a human looks.
* Regenerate deliberately with an explicit flag, never as a side effect of another run — the
  repo's art-regeneration churn incident is the precedent.

---

## Layer 3 — The manual sheet that stays manual

A browser page in the `js/counter/counter.test.html` idiom:
`js/printables/printables.test.html`. It renders the full fixture matrix at print scale on one
page, for a human to look at once per release.

This exists because three findings in this audit were **only** visible to a person looking at a
rendered artifact, and no assertion proposed above would have found them:

* the `o` in dotted mode reads as two concentric rings and a child cannot tell which to follow —
  G-20 catches the geometry, but "a child cannot tell" is a judgement;
* the cursive sheet's letterforms are maths script rather than handwriting models;
* the graffiti tool produces a graffiti-flavoured font rather than graffiti (no layering, no
  offset, no shadow).

Automation can assert that a thing is where it should be. It cannot assert that the thing is the
right thing.

---

## Wiring

Per this repository's rules, the gate list is not written out anywhere by hand — it is read from
`validate.yml` by `npm run check:ci-gates`. Adding these means adding steps to the workflow and
referencing their outcomes in the final summary step, at which point they appear in the local
sweep for free.

```
npm run test:printable-geometry     # Layer 1, gating
npm run test:printable-snapshots    # Layer 2, informational
npm run audit:printable-render      # whole-site dashboard, informational
```

Two rules carried over from the repo's existing practice, both of which it learned the hard way:

* **Do not read a probe's result through `| head` or `| grep`.** `$?` is then the pager's status.
  That produced a false `EXIT=0` twice in this repository's history and once during this audit.
* **A step that pipes needs `shell: bash`** for pipefail, and a `continue-on-error` step needs an
  `id` that something reads. `npm run check:workflows` already enforces both.

---

## Sequencing against the fixes

The assertions should land **before** the fixes they describe, red, and go green as each fix lands.
That is what makes them trustworthy: a check written after the fix has never been observed to fail.

| order | land | state |
|---|---|---|
| 1 | G-01…G-06, G-40, G-50…G-52, G-60…G-64 | red on current `main`, documented as expected-red |
| 2 | S-1 `VisibleBoundsCalculator` fix | G-01…G-06, G-40 go green |
| 3 | S-3 pattern origin fix | G-30 goes green |
| 4 | S-6 landscape layout fix | G-64 goes green |
| 5 | S-2 render-path consolidation | G-50…G-54 go green |
| 6 | S-5 fit-to-box | G-62, G-63 go green |
| 7 | S-4 skeleton data | G-20…G-24 go green |

Only at step 7 does the gate list become fully green, so the workflow steps should be added
informational and promoted to gating per assertion group as each fix lands — the same per-rule
promotion the editorial-footprint gate already uses (`--enforce <rule>,<rule>`) rather than a
single flag flip.

---

## Interim mitigation for R-001

The skeleton work (S-4) is the largest item in the backlog and R-001 is the most serious defect, so
they should not be coupled. Two options that do not need skeleton data:

1. **Reduce the dotted levels to one dot path by stroking a centreline approximation** derived from
   the face's stem width — correct for stems, still wrong on curves. Partial.
2. **Withdraw the "dotted" levels and ship the dashed level as the default trace**, which follows
   the same contour but reads as an outline to trace *around* rather than a stroke to trace
   *along*, and is therefore honest about what it is.

Option 2 is not a fix; it is a way of not shipping a sheet that teaches the wrong motor path while
the fix is built. The decision belongs to the owner, and it is worth taking before the next
printables push rather than after.
