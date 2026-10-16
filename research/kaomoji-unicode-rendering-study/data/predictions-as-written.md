# What we predicted before measuring: font and copy-and-paste tests

Written 2026-10-13, before any font or copy-and-paste measurement was run. The study page cannot prove the timing to a reader; the text below is unchanged from what we wrote, apart from the edits listed at the end of this file.
Faces: the 1,597 unique faces on our list at the time (later widened to 1,616, see the study page), Unicode 18.0.0 data. Environment: Chromium 141.0.7390.37 (Playwright 1.56.1) on Linux in a container, headless. **No claim below extends to Windows, macOS, iOS, Android, any messaging app, or any human's perception.** Outcome (c), perceived recognizability, was not measured.

## Environments (font conditions; one at a time)
* E1_full: all container fonts (includes Unifont, a near-universal fallback, and Noto Color Emoji). Expected to MASK tofu.
* E2_minimal: DejaVu Sans, DejaVu Sans Mono, Liberation Sans, Liberation Mono only (via a restricted fontconfig file).
* E3_cjk: E2 plus IPAGothic, IPAPGothic and WenQuanYi Zen Hei (no Unifont, no FreeSans/FreeSerif/Loma, no emoji font).

## Controls
* Negative control: `(^_^)` and `abc` must show no missing glyph in every environment.
* Positive control: U+0378 (unassigned) must be flagged missing in every environment; if not, the detector is invalid and results are void.

## Outcome (a): exact round trip
Contexts: `<input>` value, `<textarea>` value, `contenteditable` textContent and innerText, `navigator.clipboard` write/read, JSON.stringify/parse, encodeURIComponent/decodeURIComponent, `localStorage` (own origin). Metric: share of faces whose scalar sequence is byte-identical after the trip; incidence of NFC and NFKC change introduced by the trip (not by the corpus string).
* H2.1 (predicted): 100% survival in input, textarea, clipboard, JSON, URI, localStorage. contenteditable innerText may change whitespace only (collapse/nbsp). Any other change is reported as a failure.

## Outcome (b): glyph and spacing fidelity
Detector 1 (canvas notdef bitmap match, per scalar) and Detector 2 (CDP `CSS.getPlatformFontsForNode`, per face, flags a face when a used font is absent for a scalar or the notdef bitmap matches). Report agreement.
* H2.2: In E2, the share of faces with >=1 missing glyph is higher for faces containing >=1 scalar whose Script is outside {Common, Inherited, Latin, Greek, Cyrillic} than for faces without. Test: Fisher exact test, odds ratio with 95% CI (Woolf), plus logistic regression on non_core_script_count. Direction predicted; null reported if not supported.
* H2.3: In E1, <1% of faces have a missing glyph (Unifont masks). If false, report.
* H2.4: Detector 1 and Detector 2 agree on face-level missing status for >=98% of faces.
* H2.5: Faces containing East Asian Width=Ambiguous scalars change rendered width by >=10% between `DejaVu Sans Mono` and `WenQuanYi Zen Hei Mono` more often than faces without (Fisher exact). Width = getBoundingClientRect of an inline-block at 24 px, white-space:pre, in each font alone (fallback allowed).
* Overflow incidence: share of faces whose single-line `white-space:pre` width exceeds 12 em in a proportional stack (reported by grapheme-count tertile, descriptive).

## Multiplicity and reporting
Five confirmatory hypotheses; Holm correction across the p-values; unadjusted and adjusted both reported. Effect sizes with intervals. Descriptive stratified tables are labelled descriptive. Raw JSON, run manifest (OS, kernel, Chromium, fontconfig file, font list), checksums and scripts are committed. Failures and nulls are retained.

## What this cannot show
Real devices use other fonts and shaping stacks; headless Linux says nothing about iOS/Android keyboards, messengers, or Markdown engines; a face that renders without a missing glyph can still be misread; width ratios are not meaning judgments.

## Edits to this text for publication
Only the title, the sentence about timing, the description of the face list, the sentence about outcome (c) and the labels of the environments' own names were reworded to remove references to our internal files. The hypotheses, thresholds, detectors and fonts are as written. The hypotheses were numbered H2.1 to H2.5 in the original; the study page calls them P1 to P5 in the same order.

## Deviations from what we wrote, in order of discovery
1. **Second detector (P4).** We named Chromium's per-node font query. It cannot flag a missing glyph (Chromium attributes the missing character to a font anyway), so we read the fonts' character tables instead. P4 is therefore the agreement of the drawing check with that substitute.
2. **The all-fonts set (P3).** Both missing-character checks failed the positive control there, so under the rule above its results are void and P3 could not be tested.
3. **The basic font set.** We wrote "DejaVu Sans, DejaVu Sans Mono, Liberation Sans, Liberation Mono only". The restricted font configuration loads the whole DejaVu and Liberation folders, which also include DejaVu Serif and Liberation Serif. The tests used those six fonts.
4. **Multiple testing.** We wrote "five confirmatory hypotheses, Holm correction across the p-values". Only P2 and P5 produce p-values for the study's conclusions (P1 and P4 are thresholds, P3 is void), so Holm was applied to those two. The odds ratios use a half added to every cell, intervals by the Woolf method.
5. **Width test environment (P5).** We did not say which font set the width test would use. The page reports the basic-plus-Japanese-and-Chinese set first, because anyone can rebuild it, and the all-fonts container second.
6. **No prediction was written for the Markdown test, the character counts, the normalization counts or the width explanation.** They are descriptive, and the explanation we offer for P5 is a guess.
