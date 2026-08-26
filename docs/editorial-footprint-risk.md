# Editorial Footprint Risk — how the system works

The operational document: what is measured, what blocks, what only reports, and
how a rule earns promotion. Evidence and citations live in
`docs/editorial-footprint-research-2026-08-26.md`; read that before changing a
weight or adding a phrase-bank entry.

---

## What this is, and the one thing it is not

EFR measures **observable editorial characteristics** of this site's own visible
prose — formulaic phrasing, repeated syntax, promotional vagueness, low
information density, and sameness across our own pages — on a 0–100 scale where
higher means "reads more like a filled-in template than like something written
about this subject."

**It is not an AI detector.** It emits no probability of machine authorship, it
consumes no commercial detector score, and no output of it supports a claim that
any page was machine-written. The reasons are in the research memo §2, and they
are not modesty: detectors lose 5–30 AUROC points out of domain, they
misclassify 61.3% of non-native English writing as machine-generated, and the
population studies behind every marker list state that they cannot identify
individual documents. `npm run test:editorial-footprint` asserts that no
phrase-bank entry makes an authorship claim, so this cannot drift.

---

## Files

| file | role |
|---|---|
| `scripts/lib/editorial-corpus.js` | slot-aware extraction of the prose a reader sees |
| `scripts/lib/editorial-footprint.js` | phrase bank, nine dimensions, similarity index |
| `scripts/lib/seo-snapshot.js` | the SEO Preservation Gate |
| `scripts/lib/editorial-footprint.test.js` | the tests (`npm run test:editorial-footprint`) |
| `scripts/mine-editorial-phrases.js` | corpus mining (`npm run mine:editorial-phrases`) |
| `scripts/audit-editorial-footprint.js` | whole-site audit (`npm run audit:editorial-footprint`) |
| `scripts/check-editorial-footprint.js` | per-PR gate (`npm run check:editorial-footprint`) |
| `data/editorial_phrase_bank.json` | the phrase bank |
| `data/editorial_footprint_ledger.csv` | per-page audit ledger |
| `data/editorial_footprint_baseline.json` | per-page baseline for regression |

---

## Extraction — slots, not one bag of text

Grepping a page and calling the result "content" is wrong here in both
directions. `library/currency-symbols` renders ~30 glyph tiles, each carrying its
name twice (`aria-label` plus a visible `.flag-label`) and a `data-symbol`
clipboard payload; counted as prose, tile names dominate every n-gram list. And
the strings most worth checking are not all in `<p>` — the shared CTA card, the
compare-card blurbs and the hero tagline are template copy repeated across
hundreds of pages.

| slot | what it holds | scored for phrasing? |
|---|---|---|
| `title`, `metaDescription`, `h1`, `headings` | page copy | yes |
| `prose`, `faqQuestions`, `faqAnswers`, `cta` | editorial voice | yes |
| `ui` | tile labels, clipboard payloads, buttons | **no** — visible, but never inflates a phrase count |
| `technical` | `<code>`, `<kbd>`, data-table cells | **no** for phrasing, **yes** for specificity |
| `quoted` | `<q>`, `<blockquote>`, `<cite>` | exemption source |

Excluded entirely: `<script>` (except tile registries), `<style>`, comments,
JSON-LD, `<head>` beyond title and description, the site header, the static
footer, breadcrumbs and the language switcher. The footer alone is ~27 links of
identical wording on all 4,578 pages; leaving it in makes every page resemble
every other, which is the same lesson the site-wide similarity work had to learn.

---

## The nine dimensions

| dimension | weight | measures |
|---|---:|---|
| formulaicPhraseDensity | 12 | strongly-discouraged bank hits per 1,000 words |
| formulaicSyntax | 12 | negative parallelism, three-item excess, rhetorical-question share |
| genericIntroductions | 8 | sentence-initial audience/filler openers |
| promotionalVagueness | 8 | density-limited vocabulary against its own caps |
| specificityDeficit | 20 | shortfall in distinct concrete facts vs the page's cohort |
| crossPageSameness | 15 | nearest same-locale neighbour's shingle Jaccard |
| structuralTemplate | 12 | how many same-locale, same-family pages share this page shape |
| punctuationFingerprint | 8 | em dash excess over cohort, plus ellipsis rate |
| rhythmRepetition | 5 | repeated sentence openings, uniform sentence length |

**A weight is protective capacity, not observed contribution.** Four dimensions
currently read ~0 on 97–100% of pages because this site genuinely does not use
those constructions. Cutting their weight for that reason would remove the guard
that keeps it true.

**Deliberately not implemented:** per-page lexical diversity (MTLD/MATTR/TTR) and
perplexity. The first is contradicted by an ACL 2025 result finding
homogenization "does not show clearly" in exactly those measures; what replicates
is *collective* diversity across a set, which is why `crossPageSameness` carries
15 points and per-page richness carries none. The second is a detector-family
signal and §2 of the memo applies.

---

## Comparative, not absolute — and why the raw score is not the headline

Human raters judging one text alone score at ~55–57%, barely above chance, but
reach ~78% judging texts **side by side**. So every threshold here is a
percentile **within the page's own locale**, and the comparative dimensions score
against the page's own locale+family cohort median rather than a fixed ceiling.

**Raw scores are not comparable across locales**, for a structural reason: a
locale page has no English phrase rules, so those dimensions leave its
denominator — and since they score ~0 for everybody, the exclusion *raises* its
normalised score. Measured, that put `fr/library/emojis-argent` at 41.1 and its
English parent `library/money-emojis` at 20.1 on near-identical inputs. Neither
number is wrong; comparing them is. Every consumer therefore ranks and thresholds
on `locale_percentile`, and the ledger's `efr_score` is the explainable breakdown
behind it.

An unmeasured dimension is reported as `null`, never as `0`, and the score is
renormalised over the measured weight. Zero and unmeasured are opposite claims.

---

## Locale isolation

1. **Comparison sets are language-scoped.** Similarity, cohort medians and
   percentile thresholds never cross a locale boundary. Translations are supposed
   to say the same thing; scoring them as duplicates would mark every correct
   translation as a defect.
2. **A locale phrase bank needs its own corpus evidence.** No entry may be created
   by translating an English one. Locales below **40 pages** get no phrase rules
   at all — structural dimensions only, and the audit says so per locale.
3. **A detector with no locale implementation is unmeasured, not zero.** The
   three-item detector exists for 27 locales and is deliberately absent for CJK
   and Thai, which list with an ideographic comma and no spacing.
4. **Nothing here overrides locally-native vocabulary work.** Where a phrase is
   recorded as the locally natural form, its frequency is evidence of fit. EFR
   must never be the reason such a phrase is removed.
5. **A false positive on a locale page is a rule bug, not a page defect.**

---

## The SEO Preservation Gate

A **separate** check, never averaged into the editorial score. A lower EFR score
bought by dropping the page's primary query language is a loss, and a blended
number would hide the trade.

**Protected — never changed to lower a style score:** URL, canonical, robots,
title, H1, hreflang, primary query terms, entity and platform names, Unicode
terminology, concrete examples, internal links and anchor text, FAQ questions,
structured data, factual depth.

**Negotiable:** introductions, transitions, benefit claims, CTA phrasing, closing
paragraphs. These carry the footprint and almost none of the relevance.

Blocking findings: `canonical-changed`, `title-changed`, `h1-changed`,
`robots-changed`, `deindexed`, `hreflang-lost`, `protected-term-lost`,
`concrete-fact-lost`, `internal-link-lost`.
Warnings: `anchor-text-changed`, `faq-question-changed`, `example-removed`,
`heading-changed`, `depth-reduced`.

### Ranking sensitivity

| class | meaning | what is allowed |
|---|---|---|
| **protected** | real ranking or traffic | recommendations only; no broad rewriting |
| **observed** | some performance evidence | conservative changes only |
| **unknown** | no reliable performance data | conservative; **not** a claim the page is worthless |
| **candidate** | editorial risk **and** evidence improvement is justified | broader work may be proposed |

**Performance data is never fabricated and does not live in this repository.**
Search Console data is first-party competitive information, and this repo is
public — the same reasoning that removed the Local Language Intelligence
snapshot from it. The audit therefore treats sensitivity as an **optional
overlay** supplied at run time by an attached sibling workspace
(`--sensitivity <file>`), exactly as `scripts/plan-library-locale-batch.py`
treats the locale lexicon. With no overlay every page is `unknown`, which is both
the honest classification and the conservative one, so the protection works
without the data.

---

## CI architecture

| check | scope | role |
|---|---|---|
| `npm run audit:editorial-footprint` | whole site | **informational**, never gating |
| `npm run check:editorial-footprint` | diff-scoped | **shadow mode** — reports, exits 0 |
| `npm run test:editorial-footprint` | fixtures | **gating** — no backlog to be red against |

**The gate measures the delta, not the state.** A finding counts against a branch
only if it exists now and did not exist at the merge base; pre-existing findings
are reported, never silenced. Same reasoning as `check-locale-translation.js` and
`check-faq-schema.js`, for a bigger backlog than either.

**The delta is measured by count per (rule, slot), not by surrounding text.**
Keying on the context excerpt looks more precise and is wrong: the excerpt is a
±45-character window, so inserting a sentence near an existing hit shifts the
window and re-keys an untouched em dash as newly introduced. Found by probe.

**The gate names the upstream source.** 6,918 em dashes are hardcoded across 572
spec files and 116 generator scripts, so a newly generated page's em dash was
almost certainly written into a spec, not the HTML. Telling an author to edit the
HTML sends them to a file the next generator run overwrites.

### Regression rules

* **New page** — flagged at or above **p95 within its own locale**.
* **Existing page** — flagged when its within-locale percentile worsens by **10
  points or more** against `data/editorial_footprint_baseline.json`. A PR that
  improves or holds a page's state passes.
* Regenerate the baseline deliberately, in its own commit, when rules change:
  `npm run audit:editorial-footprint -- --baseline data/editorial_footprint_baseline.json`.

---

## Rules currently blocking, and rules currently informational

**Blocking under `--enforce` (verified against deliberately broken inputs):**

| rule | why it qualifies |
|---|---|
| `model-leakage` | deterministic, unambiguous, zero legitimate occurrences (`EFR-F-002/003/004`) |
| `seo-preservation` (error severity) | deterministic diff of identity fields, protected terms, facts and links |

**Informational — reports only:**

| rule | why it is not blocking |
|---|---|
| `em-dash` | total backlog; the fix is usually upstream; needs shadow exposure first |
| `formulaic-phrase` | editorial judgment, not a defect |
| `density-limited` | a rate, and legitimate below its cap |
| `new-page-threshold` | a percentile, not a defect |
| `score-regression` | needs a stable baseline across several real PRs first |
| `seo-preservation` (warning severity) | rewording is legitimate work |

**Permanently non-blocking, by policy:** anything needing a model call, a paid
API or a network fetch; any single word or phrase on its own; any per-page
lexical-diversity or perplexity measure; any subjective register judgment; any
English-derived rule applied to a non-English page.

---

## Rollout

| stage | state | contents |
|---|---|---|
| **1. Measure** | **done** | research, corpus extraction, phrase mining, phrase bank, scoring, calibration, site-wide audit and ledger. No content changed. |
| **2. Shadow** | **now** | the gate runs on every PR, annotates the diff, exits 0. Collect what it would have failed. |
| **3. Review** | next | review shadow findings for false positives and false negatives; adjust exemptions and thresholds; record every change here. |
| **4. Enforce the deterministic rules** | after stage 3 | switch `model-leakage` and `seo-preservation` errors to gating by adding `--enforce` to the workflow step and moving it into the gating list. |
| **5. Ratchet** | later | promote `em-dash` for **new prose** once the upstream sources in `docs/editorial-footprint-upstream-findings-2026-08-26.md` are fixed; tighten the new-page percentile as the backlog falls. |

**Every threshold change is recorded here, with its date and its reason.** A rule
may become blocking only when it is deterministic, documented, has zero
unresolved false positives in the review sample, and has been observed failing on
a deliberately broken input.

### Change log

| date | change | reason |
|---|---|---|
| 2026-08-26 | System created. Stage 2 (shadow) entered. `model-leakage` and `seo-preservation` verified blocking under `--enforce` against seven probes. | initial build |
| 2026-08-26 | First remediation applied (Batch A): the four printables generators de-templated. Print-guidance answers went from 2 distinct across 26 bubble-letter pages to 26; the 184-page shared trust line and the 88-page "Yes — every letter…" opener are gone from generator output. **No live page changed**, and 0 title/H1/canonical/meta lines moved — the SEO Preservation Gate constrains its own author, since these titles carry em dashes and the rule is forward-only. | approved cleanup |
| 2026-08-26 | `npm run test:printables-parity` added as a **gating** check (14 assertions, no backlog). Acting on Batch A found the four generators would delete five shipped site-wide repairs from 90 live pages; `scripts/lib/printables_parity.py` now refuses such a write. Full record: `docs/editorial-footprint-upstream-findings-2026-08-26.md` §1a. | safety finding |

---

## Remediation principle

The transformation asked for is **never** word substitution:

| from | to |
|---|---|
| generic claim | concrete information |
| abstract benefit | observable behaviour |
| filler introduction | direct answer |
| rhetorical flourish | useful explanation |
| template sentence | topic-specific knowledge |
| repeated generic paragraph | unique page value |

Google's spam policy names *"automated transformations like synonymizing"* as
scaled content abuse, so swapping flagged words for synonyms moves the site
toward the policy it is meant to move away from. And **do not "humanise" by
introducing randomness, slang or deliberate imperfections** — that lowers a
metric and lowers the page.

## Known limitations

* **A thin cohort hides a thin locale.** Comparative dimensions need a cohort
  median; where a whole locale sits below the reference floor the dimension is
  reported unmeasured rather than scored, so a uniformly low-information locale
  will not surface page-by-page. The audit's per-locale table is where that shows.
* **Specificity is detected mostly by language-independent markers** (codepoints,
  versions, limits, platform names). English-only lexical markers exist but are
  a minority, so a page can be genuinely informative in prose the detector cannot
  read. This biases toward *under*-flagging, which is the safer direction.
* **Similarity measures text, not intent.** Two pages can share vocabulary and
  serve genuinely different queries.
* **Nothing here measures whether a page is true.** Factual correctness is a
  different job.
