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
| `npm run check:editorial-footprint` | diff-scoped | **shadow mode** — reports, exits 0; `--enforce <rule,rule>` promotes per rule |
| `npm run test:editorial-footprint` | fixtures | **gating** — no backlog to be red against |
| `npm run check:spec-sentence-reuse` | diff-scoped | **gating** — a spec may not paste a sentence 3+ other specs already carry |
| `npm run audit:spec-sentence-reuse` | whole corpus | **informational** — the 416-spec backlog |
| `npm run test:spec-sentence-reuse` | fixtures | **gating** — 19 assertions, no backlog to be red against |
| `npm run route:cta-cards` | whole site | in-place pass; report-only without `--write`, idempotent |
| `npm run test:cta-routing` | fixtures | **gating** — 19 assertions |
| `npm run test:cta-tracking` | fixtures | **gating** — 24 assertions |
| `npm run test:generator-parity` | fixtures | **gating** — 14 assertions (renamed from `test:printables-parity`) |

**The gate measures the delta, not the state — for pages a branch leaves alone.**
A finding counts against a branch only if it exists now and did not exist at the
merge base; pre-existing findings are reported, never silenced. Same reasoning as
`check-locale-translation.js` and `check-faq-schema.js`, for a bigger backlog than
either.

**Clean on touch (2026-09-02, user direction).** For a page whose own copy the
branch edits, the em-dash rule is not delta-scoped: the page must leave with
**zero** em dashes in every measured slot, cards included, not merely no new ones.
The inherited ones are reported as `em-dash-touched`, with the same upstream
attribution as `em-dash`. "Copy" means the page's title, meta description, H1,
headings, prose or FAQ text differs between the merge base and HEAD
(`TOUCH_SLOTS`). A card added by the peer-link sync, a regenerated footer or
hreflang block, a rebuilt library directory or an asset swap changes none of those
and is **not** a touch — a mesh pass that rewrites 1,009 pages must not demand
1,009 rewrites. Once a page is touched, its cards count too.

**A template-level change is not a touch (user decision, 2026-09-02).** #840's
template-tier em-dash pass read as 499 copy-touched pages owing 7,983 inherited
em dashes, though nobody had written on any of them. `classifyTouches()` now
classifies the whole diff at once: a string added or removed verbatim on
`TEMPLATE_SHARE_MIN` (3) or more changed pages is a template, and a string whose
punctuation or case alone moved is cosmetic; a page is touched only if some
element of its delta is neither. A page with a template change and a sentence of
its own is touched; a new page always is. Verified against six fixture shapes
(three pages sharing one reword, two pages sharing one, punctuation-only,
case-only, template plus own sentence, a new page) and by replaying #840.

**An English touch pulls the locale siblings along (`em-dash-sibling`).** Each
sibling in the touched page's hreflang cluster that the branch does not itself
copy-edit must already be clean, or it is reported naming the parent that pulled
it in. The rule is anchored on English on purpose: English is where pages are born
and where the tone standard is applied first, so a translator's one-line fix never
obliges an English rewrite, and a new locale batch never obliges the cleanup of
every parent it translates. The cost is real and was chosen with the number in
view: copy-editing `symbol/euro-sign` pulls 18 siblings carrying 159 em dashes.

**Two extractor changes the rule needed.** `.related-card` was in no slot at all,
so the updates hub's eleven dated card labels — every one carrying an em dash —
and the "Keep reading" grids on 193 pages were invisible to every rule, including
this one; a single `CARD_SELECTORS` constant now covers every card class. And the
pre-rendered library directory (`[data-static-directory]`) is dropped: it is
inventory rendered from other pages by the hub builders, a hand edit to it is
overwritten by the next build, and `es/library/index.html` carried 144 of its 157
em dashes inside it. On the EN hub the source is the page's own `LIBRARY` array —
a script block, outside every slot — so its 25 inventory em dashes are a bounded
backlog in one file, cleared through the array and a rebuild.

Verified per CLAUDE.md's own rule against seven differently-shaped probes: a
prose edit on the updates hub reports 18 inherited em dashes across meta
description, prose and cards; an href-only edit on the same page reports 0 and
lists them as pre-existing; an EN `symbol/euro-sign` edit reports its own 8 and
pulls 18 siblings; a French-only edit reports 9 and pulls nobody; an edit inside
the pre-rendered directory reports 0; EN and French edited together lists French
under `em-dash-touched`, not `em-dash-sibling`; and `--enforce em-dash-touched`
exits 1 where `--enforce seo-preservation` on the same diff exits 0. Replayed over
the last ten merged PRs, `em-dash-touched` fired on four, every finding a real em
dash on a copy-edited page (the currency scorecard's surviving card label among
them), and `em-dash-sibling` fired once — 745 hits across 40 untouched siblings of
eleven copy-edited English pages — which is the rule's intended cost, not a false
positive.

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

**Banned outright, forward-only, in every mode (decided by the user 2026-09-02):**

| rule | scope | why |
|---|---|---|
| `em-dash` (`EFR-F-001`) | per locale, from `data/em_dash_locale_policy.json`: **ban** on English and the thirteen locales whose native dash is the en dash; **double-dash** on zh-tw and ja (a lone `—` fails, `——` does not); **native** on ru/es/pt/fr/pl/ro (never a finding); **review** elsewhere (warning) | house style and each language's own orthography; existing em dashes are reported and never billed — only one a branch *introduces* fails, and the block names the locale's replacement |
| `spaced-hyphen` (`EFR-F-006`) | English pages, prose/FAQ/CTA/headings | the substitute the ban invites; not flagged in titles or meta descriptions, where a spaced hyphen is a conventional separator |

Full scope, the replacement guidance and the per-language table: `docs/em-dash-policy.md`.

**Blocking under `--enforce` (verified against deliberately broken inputs):**

| rule | why it qualifies |
|---|---|
| `model-leakage` | deterministic, unambiguous, zero legitimate occurrences (`EFR-F-002/003/004`) |
| `seo-preservation` (error severity) | deterministic diff of identity fields, protected terms, facts and links |
| `em-dash` | an em dash the branch wrote; deterministic. On a `ban` or `double-dash` locale it is **banned** (fails in every mode — see the table above); on a `review` locale it is a warning |
| `em-dash-touched` | an inherited em dash on a page whose copy the branch edited, measured under the page's locale policy (never on a native-dash locale; lone dashes only on zh-tw/ja; a warning on a review locale); deterministic; verified against seven probes |
| `em-dash-sibling` | an em dash on an untouched locale sibling of a copy-edited English page, measured under the sibling's own locale policy (a Russian sibling is never pulled in); deterministic |

The three em-dash rules are blocking-*eligible*, not yet blocking: the workflow
step has not been given `--enforce`, so they print "would block" and exit 0
until the shadow sample is reviewed (see Rollout, stage 5). `--enforce` takes a
per-rule list precisely so they can be promoted without `seo-preservation`,
which has its own open prerequisite — a deliberate retitle has nowhere to record
its intent — and must not ride along.

**Informational — reports only:**

| rule | why it is not blocking |
|---|---|
| `em-dash` on a `review` locale (id, ms, tl, tr, vi, ar, hi, th, ko) | each language's rules define a dash mark that is rarely used; which form is the import needs a native reader before a rule exists — see `docs/em-dash-policy.md` §4 and §7 |
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
| **5. Ratchet** | **partly done 2026-09-02; review scheduled 2026-09-16** | Done: an em dash a branch *introduces* fails in every mode on a `ban` or `double-dash` locale (user decision; `data/em_dash_locale_policy.json`), and the step is in the gating list — affordable because the delta rule bills only introduced em dashes, so generated pages regenerating with the same count still pass; new spec-generated pages fail until their generators stop emitting em dashes, which is the intended pressure. Still shadow: the clean-on-touch and sibling obligations (`em-dash-touched`, `em-dash-sibling`) print "would block" until the shadow findings since 2026-09-02 are classified, then are promoted per rule with `--enforce em-dash-touched,em-dash-sibling` on the workflow step. Still open: the upstream sources in `docs/editorial-footprint-upstream-findings-2026-08-26.md`; tightening the new-page percentile as the backlog falls. |

**Every threshold change is recorded here, with its date and its reason.** A rule
may become blocking only when it is deterministic, documented, has zero
unresolved false positives in the review sample, and has been observed failing on
a deliberately broken input.

### Change log

| date | change | reason |
|---|---|---|
| 2026-08-26 | System created. Stage 2 (shadow) entered. `model-leakage` and `seo-preservation` verified blocking under `--enforce` against seven probes. | initial build |
| 2026-08-26 | First remediation applied (Batch A): the four printables generators de-templated. Print-guidance answers went from 2 distinct across 26 bubble-letter pages to 26; the 184-page shared trust line and the 88-page "Yes — every letter…" opener are gone from generator output. **No live page changed**, and 0 title/H1/canonical/meta lines moved — the SEO Preservation Gate constrains its own author, since these titles carry em dashes and the rule is forward-only. | approved cleanup |
| 2026-08-26 | `npm run test:generator-parity` added as a **gating** check (14 assertions, no backlog). Acting on Batch A found the four generators would delete five shipped site-wide repairs from 90 live pages; `scripts/lib/generator_parity.py` now refuses such a write. Full record: `docs/editorial-footprint-upstream-findings-2026-08-26.md` §1a. | safety finding |
| 2026-08-26 | `npm run check:spec-sentence-reuse` added as a **gating**, diff-scoped check, with `npm run test:spec-sentence-reuse` (19 assertions) gating alongside it. It stops a new or edited spec pasting a sentence 3+ other specs already carry. **The design it replaces was wrong**: field-level comparison of `hero_tagline`/`meta_description`/`title`/`intro` finds **zero** duplicates in the corpus and would have shipped a gate that could never fire — the reuse is a *sentence inside* an otherwise page-specific field (171 taglines, 148 meta descriptions, one line). Backlog measured and **left untouched**: 45 sentences across 416 of 591 specs. Full record: `docs/editorial-footprint-upstream-findings-2026-08-26.md` §3. | prevention (Batch C) |
| 2026-08-26 | CTA card routed on **214 English pages** to the tool that does the reader's next job (`symbol/*` → character counter, kaomoji/emoticon → kaomoji generator, `*combos*` → bio font generator). Owner: `scripts/lib/cta_routing.py`, read by both the generator and `scripts/route-cta-cards.py`. **No locale page routes** — no locale build of any destination exists, and the locale homepage already is that locale's generator. `cta_click` instrumentation added to `header.js` in the same pass. **This does not lower the EFR score and is not claimed to**: one shared card replaced by three shared cards is still a template. What changed is that the card is useful and measurable. | usefulness, not score |
| 2026-08-26 | **The SEO Preservation Gate blocked its own author, correctly.** The first draft of the routed card dropped `ultratextgen` from the editorial text of all 214 pages — the old card was its only occurrence outside URLs and JSON-LD — and the gate reported `protected-term-lost` on every one. Fixed by putting the product name back where each sentence already named the tool, **not** by exempting the rule; `test:cta-routing` now asserts it. This is the second time in this system's short life that the gate has constrained a change its own author wanted: the first was Batch A leaving 0 title/H1 lines touched. | gate working as designed |
| 2026-08-26 | `scripts/lib/printables_parity.py` renamed to **`scripts/lib/generator_parity.py`** and wired into `generate_library_page_from_spec.py`, its fifth caller. That generator had been read as "probably fine"; measured across a 40-spec sample, **40 of 40 pages regressed** (static footer 40, hreflang 35, social image tags 21). Its mesh hook does not save it — that runs only for `lang != "en"` and only after the write. | safety finding |
| 2026-09-01 | **`specificityDeficit`: six console and storefront names added to the `platform` rule** — `Xbox`, `PlayStation`, `PSN`, `Steam`, `Valorant`, `Garena`. The list already carried Roblox, Fortnite, PUBG and Minecraft, so it was never social-only, and there is no principled reason "Roblox" reads as a concrete fact while "Xbox" does not. The omission systematically under-scored every page whose subject is game identity: measured on `/updates/`, it inflated `specificityDeficit` on `forza-horizon-6-gamertag-rules` from 4.18 to 10.51 and on `lienquan-mobile-name-penalty-update` from 7.34 to 9.15, with no page changing by one word. **Site-wide effect measured before landing: 152 pages improve, 4,032 unchanged, 444 worsen by at most 5.1 points, site median unchanged at 9.9.** The 444 are pages naming no platform at all; they did not get worse, their cohort median got more accurate, which is the dimension working as designed. 34 of them cross the 10-point percentile regression rule, which is why the baseline is regenerated in the commit that follows this one. `Steam` is the only token colliding with a common English word, so the rule stays case-sensitive — all 85 pages carrying capitalised "Steam" mean Valve's, checked 2026-09-01. Two assertions added to `npm run test:editorial-footprint` (now 57) and verified against a deliberately broken input: reverting the six names fails the first and leaves the case-sensitivity one green. | rule bug |
| 2026-09-02 | **Forward-only became clean-on-touch, siblings included** (user direction). A copy-edited page must leave with zero em dashes in every measured slot (`em-dash-touched`); a copy-edited English page pulls its locale siblings (`em-dash-sibling`); untouched pages stay forward-only. `.related-card` joined the card slot (193 pages, the updates hub's 11 dated labels among them) and `[data-static-directory]` left measurement (inventory rendered from other pages). `--enforce` gained a per-rule list. All three em-dash rules entered `BLOCKING`; the workflow step stays in shadow. Verified against seven probes and replayed over the last ten merged PRs (four true-positive `em-dash-touched` PRs, one `em-dash-sibling` PR at 745 hits, zero false positives). Ledger and baseline regenerated in their own commit. Tests 52 → 63. | policy change + extractor fix |
| 2026-09-02 | **Em dash and spaced hyphen banned forward-only on English copy** (`docs/em-dash-policy.md`). `EFR-F-006` added to the bank (spaced hyphen as a dash, English, prose slots, measured base rate 3 occurrences on 3 pages). `check-editorial-footprint.js` gains `BANNED` — an introduced finding on a banned rule and locale exits 1 in every mode, all other rules keep shadow — and its step joins `validate.yml`'s gating list. Locale scope is deliberate: the em dash is required in Russian and native in five more locales, and the en dash is the native mark in thirteen; no locale rule was created. Verified on a throwaway branch (English em dash and spaced hyphen: `BANNED`, exit 1; German em dash and a plain English sentence: exit 0). Four assertions added to `npm run test:editorial-footprint` (now 61). | user decision |
| 2026-09-02 | **The em dash ban became per-locale policy** (`data/em_dash_locale_policy.json`, read through `scripts/lib/em-dash-policy.js`): ban on en and thirteen en-dash locales with the native replacement named in the block, double-dash on zh-tw and ja, native on six locales, review on nine. `matchBank()` hits now carry `index` so the pair detector can read the neighbouring character. `npm run audit:em-dash` re-measures every locale against the ledger. Verified on a throwaway branch per the table in `docs/em-dash-policy.md` §5. Five assertions added to `npm run test:editorial-footprint`. | user decision |
| 2026-09-02 | **A template-level change is not a touch** (user decision, ahead of the 09-16 review). `classifyTouches()` carves out strings shared verbatim on 3+ changed pages in one diff and punctuation/case-only rewrites; only a change of the page's own makes it copy-touched. Replayed on #840, which had read as 499 copy-touched pages. Test blocks 71 → 72. | rule refinement |

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
