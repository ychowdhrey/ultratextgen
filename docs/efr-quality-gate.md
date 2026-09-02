# EFR Quality Gate — thresholds, ratchet, exceptions, and how to act on a score

The operational document for the EFR Quality Gate: what the score is, what it
is not, the PASS / REVIEW / FAIL thresholds for `/updates/` and `/guide/`, how
the per-PR ratchet decides, how an exception is recorded, how to run it, and
what an editor does with a high number. The measurement itself is documented in
`docs/editorial-footprint-risk.md` (operational) and
`docs/editorial-footprint-research-2026-08-26.md` (evidence); nothing in this
gate changes it.

**EFR is a diagnostic and publishing quality-control metric. It is not an SEO
ranking factor, and it is not an AI detector.**

---

## 1. What EFR measures

EFR is **Editorial Footprint Risk**: the 0–100 score produced by
`scripts/lib/editorial-footprint.js` over the prose a reader actually sees on
a page (title, meta description, H1, headings, paragraphs, FAQ, CTA cards —
never tiles, code, chrome, JSON-LD or the footer). Higher means "reads more
like a filled-in template than like something written about this subject".

It is a weighted sum of nine dimensions, each scored 0–1 and multiplied by its
weight (weights sum to 100):

| dimension | weight | what moves it |
|---|---:|---|
| `formulaicPhraseDensity` | 12 | strongly-discouraged phrase-bank hits per 1,000 words |
| `formulaicSyntax` | 12 | negative parallelism ("not just X — Y"), three-item lists above the cohort median, rhetorical-question share |
| `genericIntroductions` | 8 | sentence-initial audience/filler openers |
| `promotionalVagueness` | 8 | density-limited vocabulary against its caps |
| `specificityDeficit` | 20 | shortfall in **distinct concrete facts per 1,000 words** (codepoints, versions, alt codes, limits, encodings, platform names, environments, constraints, examples, years) against the page's own locale+family cohort median |
| `crossPageSameness` | 15 | nearest same-locale page's 5-word-shingle Jaccard |
| `structuralTemplate` | 12 | how many same-locale, same-family pages share this page's heading/FAQ/paragraph shape |
| `punctuationFingerprint` | 8 | em dashes above the cohort median, plus ellipsis rate |
| `rhythmRepetition` | 5 | repeated sentence openings, uniform sentence length |

Three properties of the score that the gate is built around:

* **Comparative, not absolute.** Five of the nine dimensions score against
  cohort medians (locale + family) or nearest neighbours drawn from the whole
  tree. A page's number depends on the corpus it sits in.
* **Deterministic.** The similarity index seeds its permutations from a fixed
  string, and the corpus is read in sorted order. Re-scoring 4,619 unchanged
  pages against the committed 2026-09-01 baseline reproduced every score to
  the decimal (measured 2026-09-02). There is no run-to-run noise.
* **Not comparable across locales.** A locale page has no English phrase
  rules, so those dimensions leave its denominator and its normalised score
  rises on identical inputs. `docs/editorial-footprint-risk.md` makes this a
  standing rule, and this gate respects it (§3).

The **percentiles** printed next to a score (`p25.3`, `p58.4`) are percentile
ranks **within the page's own locale** across every scored page in that locale
(`locale_percentile`, 908 English pages today), and within its locale+family
(`family_percentile`, only where the family has 8+ pages). They are computed
from the site's own corpus on every run, not from any external benchmark.

## 2. What EFR does not measure

* **Whether a page is true, complete, or useful.** Nothing here checks facts
  or judges depth. A page can be wrong and score 0.
* **Usefulness the fact detector cannot read.** `specificityDeficit` counts a
  fixed vocabulary of concrete markers. A 3,000-word guide whose value is
  fourteen worked archetypes and a comparison table, but which names no
  codepoint, limit or platform, is read as fact-poor. See §9.
* **Who or what wrote a page.** No dimension is an authorship signal, and no
  output supports a claim about origin.
* **Ranking.** No performance data enters the score, and the score does not
  enter any ranking system.

## 3. Content types, from the page path

| path | content type | thresholds |
|---|---|---|
| `/updates/<slug>/` | **updates** | Updates thresholds |
| `/guide/<slug>/` (the repository directory is `guide/`, not `guides/`) | **guide** | Guides thresholds |
| `/<lang>/updates/<slug>/`, `/<lang>/guide/<slug>/` | updates / guide, **UNCALIBRATED** | none — scored, reported, and ratcheted against the page's own previous version only |
| `/updates/`, `/guide/`, `/<lang>/updates/`, `/<lang>/guide/` (hub indexes) | **unclassified** | none — a card listing, not an entry; reported, never gated |
| everything else (`answers/`, `library/`, `symbol/`, `usecase/`, `category/`, platform pages, …) | **unclassified** | none — no threshold is defined; a changed page is counted, never gated |

Locale pages are recognised but not thresholded because raw EFR is not
comparable across locales (§1). The self-comparison rules of the ratchet (§5)
still apply to them, because a page compared with its own previous version
never crosses a locale boundary. Deriving per-locale thresholds is future work
and needs its own calibration, not a copy of the English numbers.

## 4. Thresholds and interpretation

### Updates — target EFR ≤ 5.0

| EFR | status | interpretation |
|---|---|---|
| 0 – 3 | PASS | exceptional |
| > 3 – 5 | PASS | target |
| > 5 – 7 | REVIEW | review |
| > 7 – 10 | FAIL | fail / editorial rewrite required |
| > 10 | FAIL | severe editorial footprint |

### Guides — target EFR ≤ 7.0

| EFR | status | interpretation |
|---|---|---|
| 0 – 4 | PASS | very concise; check that useful teaching depth has not been removed |
| > 4 – 6 | PASS | excellent |
| > 6 – 7 | PASS | target |
| > 7 – 8 | REVIEW | review |
| > 8 – 10 | FAIL | fail / editorial rewrite required |
| > 10 | FAIL | severe editorial footprint |

Boundaries are inclusive on the low side: 5.0 is PASS for an update, 5.1 is
REVIEW; 7.0 is PASS for a guide, 7.1 is REVIEW; 8.0 is REVIEW, 8.1 is FAIL.

The thresholds were set on 2026-09-02 and are **indicative**. On that day the
English inventory measured: Updates — 11 pages, mean 3.76, median 3.4, p90 5.8,
7 PASS / 3 REVIEW / 1 FAIL; Guides — 32 pages, mean 6.72, median 4.5, p90 14.2,
20 PASS / 0 REVIEW / 12 FAIL. The live picture is `docs/efr-quality-report.md`
(`npm run report:efr`).

**Re-measured the same day after merging `main`**, which had changed two things
underneath the score: the extractor now counts "Keep reading" card labels as
card copy and drops the pre-rendered library directory, and the verification
stamp moved out of every update's prose into its meta pill. Updates read
7 PASS / 0 REVIEW / 4 FAIL (mean 4.55); Guides 21 / 0 / 11 (mean 6.75). Three
updates crossed from REVIEW to FAIL (`forza-horizon-6-gamertag-rules` 5.4 → 7.1,
`telegram-premium-message-limit` 5.6 → 7.2, `unicode-18-most-anticipated-emoji`
5.8 → 8.5) without their prose getting worse: the card labels dilute the facts
per 1,000 words, and the moved stamp removed a counted date. That is the
limitation §9.6 describes made visible, and the reason absolute thresholds are
re-read after any extractor or baseline change. The ratchet is unaffected, since
it scores both sides of a diff in one context.

**Re-measured a third time the same day, after the fact vocabulary was
widened** (§9.11): Updates read 8 PASS / 1 REVIEW / 2 FAIL (mean 3.66, median
3.3), Guides 19 / 1 / 12 (mean 6.95, median 5.5). The widening was aimed at
two false positives and hit them: `lienquan-mobile-name-penalty-update` went
10.9 → 3.3 once "Liên Quân Mobile", "1 day to 3 years" and "January 1, 2026"
counted, and `unicode-18-most-anticipated-emoji` 8.5 → 2.2 once "Emoji 16.0"
did. It also moved pages nobody touched, in both directions, because five of
the nine dimensions are cohort-relative and the cohort's bar rose: the English
guide median went from 6.6 to 7.8 recognised facts per 1,000 words, and
`discord-where-fonts-work` (5.6 → 9.5), `instagram-font-ideas` (6.7 → 10.6) and
`bio-formatting-without-spam` (2.6 → 7.1) crossed out of PASS with no word
changed. Site-wide, 423 pages improved, 3,270 held and 936 worsened by 0.5 or
more (the largest by 11.1, a Vietnamese emoji page); the site median moved
9.9 → 10.0. **A widening is a re-baseline event**: the baseline was regenerated
in the same change, and the thresholds were re-read and left where they are.

### The principle behind the numbers

**EFR is not minimised indefinitely.** The target is the *minimum editorial
footprint required to completely satisfy the query*. A low EFR is never
rewarded if achieving it removed necessary explanation, evidence, examples,
methodology, caveats that materially affect the answer, useful tables,
instructions, exceptions, or source context. The Guides band "0–4: very
concise" exists for exactly that reason — a guide that low is a prompt to
check what was cut, not a trophy — and the ratchet's IMPROVED BY REMOVAL rule
(§5) is where the gate enforces it.

## 5. The ratchet — what a pull request may do to a page

`npm run check:efr` looks only at the `/updates/` and `/guide/` pages a branch
**adds or changes**. Every other page on the site, including the ones above
target today, is outside its view. For each page it scores the current version
and the merge-base version **in the same corpus** (today's tree), so cohort
medians and neighbours are identical on both sides and the delta is the page's
own change. It then applies, in order:

| situation | rule | verdict |
|---|---|---|
| new page, EFR ≤ PASS | fine | `NEW PAGE — PASS` |
| new page, EFR > PASS | a new page must meet the PASS threshold, even in the REVIEW band | **BLOCK** `NEW PAGE ABOVE TARGET` |
| existing page was ≤ PASS, now > PASS | a passing page may not be pushed above target, whatever the delta | **BLOCK** `REGRESSION PAST TARGET` |
| existing page above PASS, EFR rose by ≥ 0.5 | a REVIEW or FAIL page may not get materially worse | **BLOCK** `REGRESSION` |
| existing page ≤ PASS, EFR rose by ≥ 0.5 but stayed ≤ PASS | target still met; the rise is reported | WARN `REGRESSION` |
| EFR rose by less than 0.5 | below the material allowance | WARN `MINOR REGRESSION` |
| EFR unchanged | nothing moved; status is restated | OK `UNCHANGED` |
| EFR fell, now ≤ PASS, was above | the backlog got shorter | OK `RESOLVED` |
| EFR fell, still above PASS | an improvement, **not** a regression — the ratchet now holds at the new, lower score | WARN `IMPROVED BUT STILL FAILING TARGET` |
| EFR fell **and** the edit lost a concrete fact or an internal link | a lower score bought by deleting information | **BLOCK** `IMPROVED BY REMOVAL` |
| EFR fell **and** the body shrank > 25%, or an example/payload, a FAQ question or a search-protected term was lost | the improvement is not credited until a human confirms the depth was surplus | WARN `IMPROVED BY REMOVAL (verify depth)` |
| page is a locale updates/guide page | rows 4–11 apply (self-comparison); rows 1–3 do not (no absolute threshold) | as above, labelled `UNCALIBRATED` |
| page is below the 120-word prose floor | rates are not meaningful | OK `NOT SCORED` |
| page is unclassified | reported by count only | OK |

The worked example from the brief, asserted verbatim in `npm run test:efr`:

```
IMPROVED BUT STILL FAILING TARGET — FAIL
  /updates/example-page/
  previous EFR: 11.5   current EFR: 8.2   delta: -3.3   target: <= 5
```

is a warning that holds the ratchet at 8.2, while `11.5 → 12.5` is a block.

### The material allowance (0.5) is not a noise allowance

The score is deterministic (§1), and the gate scores both sides of a diff in
one context, so there is no measurement noise to absorb. What 0.5 absorbs is
the **denominator effect of adding a plain sentence**: every lexical dimension
is a rate per 1,000 words, so a 50-word caveat with no concrete marker nudges
the specificity deficit up by roughly 0.3 on a 1,000-word update (measured:
+500 filler words moved `lienquan-mobile-name-penalty-update` +3.0). One added
formulaic construction is larger: +5 em dashes on a ~1,000-word update
measured +3.3 to +4.0, about 0.7 each, so a single one crosses the allowance.
On a 1,800-word guide one em dash is ~0.2 and two or three are needed to trip
it, which is the intended reading of "materially".

### Depth losses come from the SEO Preservation Gate

The depth counterweight reuses `scripts/lib/seo-snapshot.js`'s `compare()` —
the same comparison `check-editorial-footprint.js` runs — so the two gates
cannot disagree about what was lost. The split was set by replaying the real
2026-09-01 `/updates/` rewrite (57 pages) through the gate:

* `concrete-fact-lost` and `internal-link-lost` **block** an improvement:
  objective, language-neutral, and exactly the "evidence" and "source context"
  the principle names.
* `protected-term-lost` only **warns** here. It fired on nine locale siblings
  for losing the English words "codepoint" and "unicode" when a table with
  English headers became translated prose — a translation, not a loss. The
  SEO Preservation Gate keeps it as an error on its own terms.
* `heading-changed` is **ignored**. It fired 7–8 times on every rewritten page
  because the de-templating renamed every H2 on purpose. A rename is not a
  removal.
* `depth-reduced`, `example-removed`, `faq-question-changed` **withhold
  credit** and ask for review.

The replay also confirmed the direction of the ratchet on real work: all 11
English updates read as improvements (merge-base versions 9.3–20.1, current
0.4–9.4), none as regressions, and it surfaced two genuine locale regressions
from an unrelated sync commit (`ar` +3.4, `es` +5.8, both from a newly shared
page shape).

## 6. Exceptions

`data/efr_exceptions.json` records a page explicitly agreed to sit above its
section's PASS threshold. An entry never hides a result: the page's EFR and
status are still computed and printed, the gate's verdict reads
`EXCEPTION` with the entry's own text under it, and the whole-site report
lists every entry with its state.

```json
{
  "page": "/updates/example-page/",
  "efr": 8.4,
  "reason": "the depth this entry needs is not in the fact detector's vocabulary: …",
  "owner": "Yasir",
  "agreed": "2026-09-02",
  "reviewBy": "2026-12-01"
}
```

| field | meaning |
|---|---|
| `page` | one route, leading and trailing slash. **No wildcards and no whole sections** — the ledger refuses `/updates/` and `/de/guide/`. Directory-level exceptions need compelling evidence and a discussion, and are not expressible here by design. |
| `efr` | the page's EFR when the exception was agreed. The exception covers **that score plus the 0.5 allowance**, never a further regression: a page agreed at 8.4 that reaches 12.0 is `exceeded`, and the normal rules apply. |
| `reason` | why the higher footprint is justified, 20+ characters |
| `owner` | who agreed it, or the source |
| `agreed` | `YYYY-MM-DD` |
| `reviewBy` | optional `YYYY-MM-DD`; after it the entry is reported as `expired` and the normal rules apply until it is re-agreed |

Three states, all printed: `active`, `expired`, `exceeded`. A malformed ledger
is **refused** (exit 2) rather than partially honoured.

**Same bar as every other ledger in this repository**
(`translation_parity_exceptions.json`, `english_parent_exceptions.json`,
`library_hub_exclusions.json`): an entry is a discussed decision, never added
unilaterally, and never to make a pull request pass.

The ledger shipped empty. Its first two entries were agreed on 2026-09-02, and
the order they were agreed in is the rule for the next one: **cleanup first,
exception after.** `guide/linkedin-comments-guide` and
`guide/instagram-fonts-shadowban-myth` are both facts-led (§9.1 and §9.12), and
both were still carrying dozens of em dashes, a title or heading em dash and
rhetorical questions. Those were removed first (18.1 → 11.5 and 14.6 → 14.1),
and only the residue that the fact vocabulary cannot read was recorded, each
with a `reviewBy` of 2026-12-01. An exception is never a way to skip the
editing the page still owes.

## 7. Running it

```bash
npm run check:efr                      # the gate, vs origin/main — what CI runs
npm run check:efr -- --base main       # against another ref
npm run check:efr -- --shadow          # report only, exit 0
npm run check:efr -- --annotations     # GitHub file annotations
npm run check:efr -- --json out.json   # machine-readable rows

npm run audit:efr                      # whole-site summary + Top 20 per section
npm run audit:efr -- --full            # every updates/guide page, every locale
npm run report:efr                     # audit + writes docs/efr-quality-report.md
npm run test:efr                       # 37 assertions over the policy

npm run check:ci-gates                 # every gate CI runs, the way CI runs it
```

Exit codes for `check:efr`: 0 clean or nothing in scope, 1 a ratchet rule
blocked, 2 the diff or the exception ledger could not be resolved.

**It diffs `merge-base..HEAD`, so uncommitted work is invisible to it.** Commit
first, then run — the same caveat as every diff-scoped gate here. A run takes
about 1½ minutes because both sides of every diff are scored inside the whole
corpus (4,600 pages).

Per changed page the gate prints: route, content type and locale, EFR with its
status and band, the section thresholds, percentile within locale (and within
locale+family), previous EFR (merge-base version scored in today's corpus, and
the committed baseline's value when it differs), delta, the major contributing
dimensions with the raw counts behind them, and the verdict with its reasons.
For example:

```
✗ BLOCK  REGRESSION — FAIL
  /updates/example-page/
  content type:   updates (en)
  EFR:            8.4   [FAIL: fail / editorial rewrite required]
  threshold:      Updates PASS <= 5.0, REVIEW <= 7.0, FAIL > 7.0
  percentile:     p45.0 within en (p90.9 within en/updates)
  previous EFR:   6.9 (merge-base version, scored in today's corpus)
  delta:          +1.5  (material: >= 0.5)
  contributors:   specificityDeficit 7.1, structuralTemplate 1.7 · 0 em dashes, 7 distinct facts, 1 three-item list
  · an existing page got materially worse (+1.5 >= 0.5)
```

## 8. CI behaviour

`.github/workflows/validate.yml` runs `check:efr` on every pull request as a
**gating** step (`efr_gate`, in the final "Fail the job" list), alongside
`test:efr` (`efr_tests`, gating, no backlog to be red against). Both appear in
`npm run check:ci-gates` automatically because that script reads the workflow.

It is diff-scoped and ratcheted, so the 13 English pages above target on the
day it was wired never fail a branch that does not touch them, and a branch
that improves one of them is never failed for not reaching target. The
whole-site picture (`audit:efr`) is informational and never fails a build.

This gate runs **blocking from day one**, unlike the broader
`check:editorial-footprint`, which is in shadow mode pending its own documented
review (`docs/editorial-footprint-risk.md`, "Rollout"). The difference is scope:
that check governs every page and every rule; this one governs 43 English entry
pages on a comparison with themselves, was replayed against the real `/updates/`
rewrite before wiring, and was verified against seven deliberately broken inputs
(§10).

## 9. Known limitations and false-positive risks

Measured on 2026-09-02 by scoring synthetic variants of eight real pages in one
fixed corpus context.

1. **The fact detector defines "useful" narrowly.** `specificityDeficit`
   (20 of 100 points) counts codepoints, versions, alt codes, digit-plus-unit
   limits, encodings, typography terms, platform and OS names, constraint
   verbs, example markers and four-digit numbers. Anything else a page teaches
   is invisible to it. `guide/linkedin-comments-guide` (2,983 words, 14 worked
   archetypes, a comparison table) scores 17.5 with 14.8 of that from
   specificity: 5 recognised facts. `updates/lienquan-mobile-name-penalty-update`
   scores 9.4 for the same reason — a game-penalty entry measured against a
   cohort of Unicode-release entries whose median is 12.8 facts per 1,000 words.
   **These are the pages an exception exists for**, not pages to pad with
   codepoints.
2. **Halving prose can lower the score.** Removing every other paragraph
   dropped `the-rhetoric-of-fonts` −5.8 and the currency scorecard −3.9, because
   surviving facts are denser per 1,000 words. Removing a FAQ dropped
   `lienquan` −5.2. This is why the ratchet withholds credit on `depth-reduced`,
   `example-removed` and `faq-question-changed`, and why the Guides 0–4 band
   says "check that depth has not been removed".
3. **Padding can lower the score on a phrase-heavy page.** +500 filler words
   moved `linkedin-comment-styling` −3.3, because its footprint is phrase and
   syntax density and the filler diluted the rates faster than it raised the
   specificity deficit. On fact-dense pages the same filler is penalised
   (+6.8 on the dirham entry, +3.0 on lienquan). The metric is length-neutral
   by construction (rates per 1,000 words), not length-rewarding, but it is
   not filler-proof in every regime.
4. **The 2,000-useful-words test is only partly met.** A 2,000-word page whose
   2,000 words carry recognised markers outperforms a 500-word page with 250
   words of filler (measured: +300 words of distinct facts dropped every probed
   page by 0.4 to 16.1). A 2,000-word page whose usefulness is explanatory
   prose with no markers does not. That is the limitation above, documented
   rather than patched: the measurement semantics are preserved.
5. **Counting is distinct, so stuffing does nothing.** Repeating a page's
   fact table three times changed no score. Adding em dashes (+2.4 to +4.0 per
   five) and three-item lists (+1.4 to +4.6 per six) is penalised on every page.
6. **A cohort of eleven is a thin reference.** `en|updates` clears the 8-page
   cohort minimum with 11 pages, so one unusual entry moves the median. As the
   section grows this stabilises; until then a REVIEW verdict on an update is
   worth a second look before a rewrite.
7. **The hub indexes are excluded by policy, not by measurement.** `guide/`
   scores 12.3 (57 em dashes and 21 three-item lists in card blurbs). If the
   user wants hubs held to the Guides threshold, remove the hub carve-out in
   `classifyContent()` — it is one line, and the report already prints them.
8. **`structuralTemplate` is zeroed by any change to a page's paragraph,
   heading or FAQ count.** The dimension keys on the exact
   `headings:faqQuestions:paragraphs` shape shared with same-family siblings,
   so a page whose shape matched one sibling (4.0 of 12 on a German update in
   a family of five) loses that entire term the moment one paragraph is added
   or removed — measured: +300 filler words on `de/updates/unicode-18-beta-startet`
   moved it **−2.6** (structure −4.0, specificity +1.4). An edit can therefore
   read as an improvement for having broken a template match rather than for
   saying anything. The gate cannot tell those apart; a reviewer reading the
   `contributors` line can — if `structuralTemplate` is the only dimension
   that fell, nothing was written.
9. **A cohort-relative term costs nothing below the median.** Em dashes on a
   page below its cohort's em-dash median are free: five added to the same
   German update (12 → 17 on 938 words, against a German locale median above
   that rate) changed the score by exactly 0. The punctuation dimension is
   built to surface a page *unusually heavy for its cohort*, not to enforce the
   house style — that is the forward-only `em-dash` rule in
   `check:editorial-footprint`, and this gate does not duplicate it.
10. **Which half you cut matters.** Halving the same guide's paragraphs moved
    it −5.8 with one alternation and +0.1 with the other, because its em
    dashes, three-item lists and recognised facts are unevenly distributed.
    A "shorter is better" reading of the score is wrong in both directions.
11. **Widening the fact vocabulary moves pages nobody touched.**
    `specificityDeficit` is a shortfall against the page's cohort median, so
    when the detector learns to read dates, durations, publishers or game
    names, every page that states them gains and the median rises; a page that
    states none of them falls further below it without changing. Measured on
    2026-09-02 (§4): three untouched guides crossed out of PASS, 936 pages
    site-wide worsened by 0.5 or more, 423 improved. A first draft of the
    same widening also counted the site's own units ("3 styles", "12
    symbols", "two lines") and moved the guide median further still; it was
    narrowed to engagement counts before landing. Two rules follow. A
    widening is never done to fix one page, and it is committed with a
    regenerated baseline and a re-read of the thresholds in the same change.
    The ratchet does not see any of this, since it scores both versions of a
    changed page in one corpus.
12. **The lever names the kind of work, not the amount.** The `lever` column
    (`facts`, `phrasing`, `template`, `punctuation`, `mixed`) reports the
    dimension carrying 70% or more of a non-PASS score. Every FAIL on both
    sections at first measurement was facts-led, and the two guides that
    became the first exceptions read `facts (77%)` and `facts (98%)` after
    their em dashes were removed: the cleanup took 6.6 points off one and
    0.5 off the other, which is what a phrasing fix does to a facts-led
    page. It is a routing hint for an editor, and it cannot say whether the
    missing facts exist to be added (§9.1).

## 10. Verified against deliberately broken inputs

Per CLAUDE.md's rule that adding a validator is not the same as gating on it,
the gate was run against two kinds of input before it was added to the gating
list, each recorded here with its actual result.

**A replay of real history.** Run with a merge base from before the 2026-09-01
`/updates/` tone rewrite (57 in-scope pages across 970 changed files):

* all 11 English updates read as improvements — merge-base versions 9.3–20.1,
  current 0.4–9.4 — four as `RESOLVED`, four as `IMPROVED BUT STILL FAILING
  TARGET`, none as a regression;
* `/updates/middle-east-currency-symbols-scorecard/` (8.9 → 4.2) **blocked** as
  `IMPROVED BY REMOVAL`: the same change dropped two version facts
  (`unicode 1.1`, `unicode 6.2`) and the page's only link to the dirham entry;
* two locale pages **blocked** as self-regressions from an unrelated sync
  commit: `ar` +3.4 and `es` +5.8, both from a newly shared page shape;
* the `updates/` and locale hubs and 913 pages in other sections were reported
  by count and not gated.

**Synthetic probes on a throwaway branch**, each a different shape so the gate
could not be tuned to one:

| # | input | result |
|---|---|---|
| 1 | a new `/updates/` page pasted from a FAIL-band guide | **BLOCK** `NEW PAGE ABOVE TARGET`, EFR 47.2 |
| 2 | five em dashes added to a PASS update (4.2) | **BLOCK** `REGRESSION PAST TARGET`, 4.2 → 6.6 |
| 3 | 300 filler words added to a FAIL update | **BLOCK** `REGRESSION`, 8.8 → 10.6 |
| 4 | six rhetorical questions injected into a German update | **BLOCK** `REGRESSION` (self-comparison, UNCALIBRATED), 19.6 → 29.6 |
| 5 | a FAIL guide halved to 63% of its words | WARN `IMPROVED BUT STILL FAILING TARGET (verify depth)`, 13.5 → 7.7, credit withheld, `depth-reduced` and `protected-term-lost` named |
| 6 | a paragraph added to an `answers/` page | counted under "other sections", **not gated** |
| 7 | one plain clarifying sentence added to a PASS guide | `IMPROVED — PASS` (the sentence lowered the em-dash rate), **exit 0** |
| 8 | the tree from probes 1–3 with an exception entry for every blocked page | every block became a visible `EXCEPTION` warning naming its entry; **exit 0** |

The `IMPROVED BY REMOVAL` **block** path (an error-severity loss) is verified by
the scorecard case in the replay; its **warning** path by probe 5; both by the
unit tests. Two probe attempts that did *not* move the score are recorded in
§9 as limitations 8 and 9 rather than dropped. Do not trust a future edit to
this gate without repeating the table.

## 11. How editors should respond to a high EFR

Read the `contributors` line first. It names the dimensions carrying the score
and the raw counts behind them, and the fix is different for each:

| contributor | what it usually is | the fix |
|---|---|---|
| `specificityDeficit` | generic claims where a fact should be | name the codepoint, the limit, the version, the platform, the date, the observed behaviour. Never pad with facts the page does not need — the count is of *distinct* facts, and a reader can tell. If the page's real depth is of a kind the detector cannot read (§9.1), record an exception rather than distort the page. |
| `punctuationFingerprint` | em dashes above the cohort | full stops and commas; one em dash where it earns its place |
| `formulaicSyntax` | "not just X — Y", three-item lists, rhetorical questions | say the thing directly; two items or four are fine, the reflex is three |
| `formulaicPhraseDensity`, `promotionalVagueness`, `genericIntroductions` | "stand out", "perfect for", audience-enumerating openers | replace the claim with the observable behaviour it stands for |
| `structuralTemplate` | the same H2/FAQ/paragraph shape as siblings | sections named for this page's subject, in the order this subject needs |
| `crossPageSameness` | shared sentences with another page | write the sentence about *this* page |
| `rhythmRepetition` | sentences that start the same way and run the same length | vary openings; let a short sentence follow a long one |

Never: swap a flagged word for a synonym (Google's spam policy names
"automated transformations like synonymizing" as scaled content abuse), remove
a search-protected term, a codepoint, an example, a table, a caveat or an
internal link to lower the number, or "humanise" copy with deliberate
imperfection. The gate blocks or withholds credit on most of these; the ones it
cannot see are the editor's responsibility.

A page that genuinely needs its footprint — a methodology section, a caveat
that changes the answer, a table the query demands — gets an exception (§6),
with the reason written down, not a rewrite.

## 12. Files

| file | role |
|---|---|
| `scripts/lib/efr-gate.js` | thresholds, content-type detection, ratchet, exception ledger, statistics — shared by everything below |
| `scripts/check-efr.js` | the per-PR gate (`npm run check:efr`) |
| `scripts/audit-efr.js` | the whole-site report (`npm run audit:efr`, `npm run report:efr`) |
| `scripts/lib/efr-gate.test.js` | 37 assertions over the policy (`npm run test:efr`) |
| `data/efr_exceptions.json` | the exception ledger |
| `data/editorial_footprint_baseline.json` | the committed whole-site baseline the "previous EFR" column reads; regenerate deliberately with `npm run audit:editorial-footprint -- --baseline data/editorial_footprint_baseline.json` |
| `docs/efr-quality-report.md` | the generated whole-site report and editorial backlog |
| `scripts/lib/editorial-footprint.js`, `scripts/lib/editorial-corpus.js`, `scripts/lib/seo-snapshot.js` | the measurement, unchanged by this gate |

## Change log

| date | change | reason |
|---|---|---|
| 2026-09-02 | Gate created. Updates ≤ 5.0 / Guides ≤ 7.0, ratchet with a 0.5 material allowance, exception ledger, whole-site report, 37 tests, wired gating in `validate.yml`. Measurement semantics unchanged. | user request; thresholds indicative |
| 2026-09-02 | **Fact vocabulary widened** (`scripts/lib/editorial-footprint.js`): game names harvested from `js/gamename/game-rules.js` plus `EXTRA_GAMES`; platform list extended (Twitter, Reddit, Twitch, Slack, Bluesky, Mastodon, Messenger, WeChat, KakaoTalk, Zalo, Viber, Tinder, Bumble, iMessage); new kinds `organisation`, `emoji-font`, `emoji-version`, `os-version`, `date`, `duration`, `figure`, `percentage`, `quantity`; `limit` accepts thousands separators. Baseline regenerated; §4 and §9.11 carry the measured shift. 5 assertions added (`test:editorial-footprint` 76). | user decision: keep adding factual phrases; two facts-led false positives |
| 2026-09-02 | **`lever` column** in the report and console (`leverFor`, `leverAdvice` in `efr-gate.js`, `DOMINANT_SHARE` 0.7). 3 assertions added (`test:efr` 40). | user decision; every FAIL was facts-led and the report could not say so |
| 2026-09-02 | **First two exceptions** recorded (`guide/linkedin-comments-guide` 11.5, `guide/instagram-fonts-shadowban-myth` 14.1, review 2026-12-01) after both pages had their em dashes, a title/heading em dash, rhetorical questions and flagged promotional wording removed and their FAQ JSON-LD brought back to mirroring the visible answers. | user decision: cleanup first, exception after |
