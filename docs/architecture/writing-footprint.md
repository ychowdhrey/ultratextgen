# Writing footprint checker: how it works and what it may claim

The page `/ai-writing-footprint-checker/` reads a pasted English text and reports
**observable wording patterns** that readers associate with AI-sounding prose. It runs
entirely in the browser with deterministic JavaScript: no model, no network call, no
account, no server component.

## The claim it makes, and the claims it never makes

It reports patterns in wording, where they are, why a reader might notice them and how
to rewrite them. It **never** reports a probability or score of AI authorship, and no
field in the engine's output carries one. `engine.test.js` asserts that no key matches
`score`, `probab`, `likelihood` or `authorship`.

Each pattern carries one of three evidence tiers, and they are different claims:

| Tier | Meaning | What it does not show |
|---|---|---|
| `population` | A published study measured the word or construction becoming more frequent in text after 2022 | Anything about one document. The best-known study (Kobak et al., 2025) states its figures are for collections of abstracts |
| `reader` | Readers and editors commonly name it as a tell | That it predicts who wrote a text |
| `house` | An editorial judgement (rhythm, specificity, repetition) | Any authorship claim at all |

No tier is "predicts authorship". Nothing here has been validated as a predictor, and the
UI never says so. A false positive on formal, plain or second-language prose is a rule
bug, and the evidence on detector bias against non-native writers (Liang et al., 2023) is
why the tool shows patterns instead of guessing.

## Files

| File | Role |
|---|---|
| `js/writing-footprint/patterns.js` | Pattern library and thresholds. Data only. Add, re-tier or remove a pattern here without touching arithmetic |
| `js/writing-footprint/engine.js` | Pure analysis: segmentation, protected spans, detectors, aggregation, edits, before/after. No DOM, no clock |
| `js/writing-footprint/controller.js` | DOM wiring, highlighting, suggestions, undo, analytics. Writes user text only through `textContent` |
| `js/writing-footprint/test-corpus.js` | Regression corpus. Authored or public-domain samples, labelled as such |
| `js/writing-footprint/engine.test.js` | Zero-dependency node test, CI gating |

## Rules the engine keeps

- **One occurrence is never a verdict.** An exact stock phrase is reported at any length
  as an observation. Density rules need a minimum count (a single em dash is never a
  signal) and about 150 words. Under 40 words there is no summary of patterns at all.
- **Levels are a maximum, never a sum.** A category's level is the highest level reached
  by its own rules, so correlated signals are not double counted. There is no composite
  score. A span matched by two patterns is counted once, under the more prominent.
- **Protected spans are skipped.** Quoted text, block quotes, code, links, e-mail
  addresses and citations are left alone by detection and by edits.
- **Semicolons, colons, ellipses and brackets are context only.** No evidence ties them to
  AI-sounding writing, so they never raise a category above "observed". Measured on
  public-domain prose they were the largest source of false positives.
- **English only.** A text whose Latin-letter share or English function-word share is too
  low is declined with an explanation, because applying English phrase lists to another
  language flags ordinary writing. A locale needs its own rules written from its own
  evidence; never translate the English list.
- **Thresholds are provisional.** They were tuned on public-domain books so ordinary human
  prose is not flagged by default. They have not been validated on a large modern sample.
  Change one only with a run against the corpus, and record why.

## Edits

A replacement rewrites only the matched span, so numbers, names, links and citations
outside it cannot change. Each carries a safety class: `safe_to_propose`,
`requires_context` or `explanation_only`. Most patterns are explanation only because the
fix depends on what the writer meant. Edits are `{start, end, replacement}` against the
**original** string, never stacked, so Undo and Reset restore the original byte for byte.
Overlapping edits are skipped, not merged. The engine never invents an example, number
or anecdote.

## Analytics

Six action events and one feedback event, with banded counts only: `writing_analysis_started`,
`writing_analysis_completed`, `writing_pattern_expanded`, `writing_suggestion_applied`,
`writing_suggestion_undone`, `writing_result_copied`, `writing_analysis_reset` and
`writing_flag_feedback` (library pattern id plus useful or not useful). The pasted text, a
matched phrase, a name or a URL never reaches the data layer. Typing, selecting and
toggling fire nothing. `engine.test.js` checks the parameter allowlist statically, and the
browser case in `scripts/smoke-runtime.js` checks the events and the network requests of a
real session. GTM must forward these events and the custom dimensions before GA4 sees them.

## Performance

The engine is synchronous. Median analysis time in Chromium on the build machine was about
5 ms for 500 words, 15 ms for 2,500, 71 ms for 10,000 and 174 ms for 20,000 (the input
limit). That is below the point where a Web Worker would pay for itself, so there is none.
Re-measure on a low-end phone before raising the limit.
