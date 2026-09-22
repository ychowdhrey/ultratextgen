---
paths:
  - "{guide,updates,answers}/**"
  - "*/{guide,updates,answers}/**"
  - "data/{editorial_footprint_baseline,efr_exceptions}.json"
  - "data/editorial_footprint_ledger.csv"
  - "scripts/**/*{editorial,efr}*"
---

# Editorial Footprint Risk and the quality gate

Read `docs/editorial-footprint-risk.md` before changing a rule and
`docs/editorial-footprint-research-2026-08-26.md` before changing a weight.
Thresholds, levers and the exception process: `docs/efr-quality-gate.md`.

## It is not an AI detector, and must never be described as one

It emits no probability of machine authorship, consumes no commercial detector
score, and **no output of it supports a claim that any page was machine-written.**
That line is correctness, not modesty: detectors lose 5–30 AUROC points out of
domain and misclassify **61.3%** of non-native English writing as
machine-generated, which would systematically indict this site's 30 locales.
`npm run test:editorial-footprint` asserts that no phrase-bank entry makes an
authorship claim.

Never phrase a finding as a claim about who or what wrote a page, and never add a
commercial detector score as an input.

## The gate is a ratchet on two sections

`/updates/` PASSes at ≤ 5.0 and `/guide/` at ≤ 7.0. A new page must meet PASS; a
PASS page may not be pushed above it; a page already above PASS may not get
materially worse (+0.5). An improvement that is still above target holds the ratchet
at the new score and is **not** a regression.

**EFR is a diagnostic and publishing quality-control metric, not an SEO ranking
factor**, and it is not minimised indefinitely: the target is the *minimum editorial
footprint required to completely satisfy the query*.

**Never lower a score by cutting explanation, evidence, examples, methodology,
caveats, tables, instructions or source context.** A drop that coincides with a lost
fact or internal link is reported as IMPROVED BY REMOVAL and blocked. A page that
genuinely needs its footprint goes in `data/efr_exceptions.json` with the score it
was agreed at, a reason, an owner and a date — never to make a PR pass.

Read the **`lever`** column before acting: `facts` means add the numbers, names,
versions and constraints the page is about, and a phrasing rewrite will not move it.

## Two things that are easy to get wrong

- **Raw scores are not comparable across locales.** A locale page has no English
  phrase rules, so those dimensions leave its denominator and — since they score ~0
  for everybody — the exclusion *raises* its normalised score. Always rank and
  threshold on the ledger's `locale_percentile`. Locale `/updates/` and `/guide/`
  pages are scored, reported as `UNCALIBRATED`, and ratcheted only against their own
  previous version.
- **An unmeasured dimension is `null`, never `0`.** Zero and unmeasured are opposite
  claims, and printing one as the other is what makes an unmeasured locale look
  clean.

## Widening the fact vocabulary is a re-baseline event

The vocabulary is widened as gaps are found, never per page, and game names are
**harvested** from the site's own rule engine. A widening moves the cohort median,
so untouched pages move too — regenerate `data/editorial_footprint_baseline.json` in
the same change and re-read the thresholds.

## The SEO Preservation Gate stays separate

It never averages into the editorial score, because a lower score bought by dropping
the page's primary query language is a loss and a blended number would hide the
trade. Blocking: canonical, title, H1, `robots`, hreflang, search-protected terms,
codepoints/limits/versions, internal links. Warning: anchor text, FAQ questions,
examples, headings, a >25% depth drop.

Ranking sensitivity is `unknown` unless a performance overlay is supplied at run
time, and **`unknown` is the conservative posture, never a licence**. Search Console
data is first-party competitive information and does not live in this repo.
