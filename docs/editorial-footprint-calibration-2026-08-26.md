# Editorial Footprint Risk — calibration and false-positive review (2026-08-26)

How every threshold in this system was derived, what the first version got
wrong, and what a human reading the pages concluded about the scores.

**Nothing here was invented before seeing the corpus.** The initial weights in
the brief were a starting hypothesis; six of the nine moved, and three
dimensions were rebuilt from a fixed ceiling to a cohort comparison, because the
measured distribution said the fixed version did not work.

---

## 1. The corpus

| | |
|---|---:|
| pages parsed | 4,578 |
| `noindex`, excluded | 7 |
| scored | 4,565 |
| below the 120-word prose floor | 6 |
| editorial words | 2,822,612 |
| median page | 519 words |
| locales | 31 (901 EN) |

Locales below the 40-page mining floor — `bs cs da fi hi hr hu ms no ro sk sr sv tl` —
get **structural dimensions only**. They are named in the audit output so a low
score there is never mistaken for a clean bill.

---

## 2. The headline finding: the famous marker list does not describe this site

Run against 904 indexable English pages, the widely-cited list scores close to
zero:

| pattern | occurrences | pages |
|---|---:|---:|
| `delve`, `showcase`, `tapestry`, `in today's`, `at its core`, `when it comes to`, `it is worth noting`, `robust`, `vibrant`, `pivotal`, `comprehensive` | **0** | **0** |
| `crucial`, `powerful`, `effortlessly`, `easy to use`, `make it easy` | 1 each | 1 each |
| `elevate` | 3 | 1 |
| negative parallelism (all forms) | 5 | 5 |

**A system built on that list would have found nothing and reported success.**

Two of its apparent hits are worse than misses:

* **`transform` — 911 occurrences on 443 pages.** It is the shared CTA card
  ("Transform text with Unicode fonts"), one template string. Flagging the word
  would have been a pure false positive.
* **`underscore` — 169 occurrences on 65 pages.** It is the **character `_`**, in
  factual platform username rules ("lowercase a–z, 0–9, underscores and periods
  only"). Banning it would have deleted facts from every username-rules page.

What the site's own corpus *does* carry:

| pattern | occurrences | pages | variety | reading |
|---|---:|---:|---:|---|
| em dash | 52,766 | 4,528 (98.9%) | — | dominant, and mostly generated |
| shared CTA card | 421 pages | 46.6% of EN | 0.00 | one template string |
| "Click any symbol to copy it instantly." | 220 | 24% of EN | 0.06 | 182 spec files |
| "Free, no sign-up." | 233 | 26% of EN | 0.27 | generator |
| `great for` / `perfect for` / `ideal for` | 218 | 154 | **~1.0** | a real editorial habit |
| `stand out` | 125 | 66 | **1.76** | a real editorial habit |
| `copy and paste` | 1,181 | 602 | **1.34** | search-protected product language |

**Variety is what separates them.** Near 0 means one string replicated — fix the
template. Near 1 means the same idea written many times — fix the writing.

---

## 3. What moved, and why

| dimension | brief | final | reason |
|---|---:|---:|---|
| formulaicPhraseDensity | 15 | **12** | measured near-zero here; kept high as protective capacity, not observed contribution |
| formulaicSyntax | 15 | **12** | its strongest term (three-item lists) is only measurable in 27 of 31 locales |
| genericIntroductions | 10 | **8** | 99% zero even in EN |
| promotionalVagueness | 10 | **8** | 91% zero |
| specificityDeficit | 15 | **20** | the strongest real discriminator (sd 0.39), and the axis tied to Google's own "little to no added value" criterion |
| crossPageSameness | 15 | **15** | unchanged — the literature's most-replicated effect, and the guard against new duplicates |
| structuralTemplate | 10 | **12** | discriminates well here (24% of ceiling on average, 40% zero) |
| punctuationFingerprint | 5 | **8** | the dominant fingerprint on this site by an enormous margin |
| rhythmRepetition | 5 | **5** | unchanged |

### Three ceilings replaced by cohort comparison

The first implementation used fixed ceilings. Measured against 4,565 pages, that
failed:

* **specificityDeficit** at a ceiling of 25 distinct facts per 1,000 words gave
  the median page (5.7) a score of 0.80 and contributed **69% of its ceiling to
  every page**. A constant tax is not a measurement. It also ignored that a
  `symbol/` page (cohort median 15.6 facts/1k) and a `library/` collection page
  (2.6) have legitimately different fact densities.
* **punctuationFingerprint** as a raw em dash rate is near-constant when 98.9% of
  pages carry one.
* **formulaicSyntax** as a raw three-item rate penalised English, where the
  detector works, and forgave everything else.

All three now score against the page's **own locale+family cohort median**.

---

## 4. Four false positives the first version produced

Each was found by reading output, not by reasoning, and each is now a test.

### 4.1 The tokenizer put every CJK page at the top of the ledger

Em dash density read **68.8 per 1,000 words for `ja`** and **67.3 for `zh-tw`**
against **18.5 for `en`** — a 3.7x gap. The cause was `\p{L}+`, which treats an
unspaced Japanese clause as **one token**, so the denominator collapsed. After
script-aware tokenisation (per-character for Han/Kana/Thai/Lao/Khmer/Myanmar,
whitespace-delimited elsewhere), `ja` reads **7.8** — second *lowest*.

An 8.8x measurement error, landing entirely on the locales this site has invested
most in translating. This is the research memo's §6 bias arriving through the
tokenizer rather than through the phrase bank.

### 4.2 Every leakage pattern fired only on pages about that character

A scan for model/tooling leakage across all 4,578 pages returned hits that were
**100% false positives**, and the pattern is exact:

| pattern | fired on | why it is correct content |
|---|---|---|
| `as an AI` | `symbol/em-dash` | titled *Em Dash (—): Copy & Paste + Why It Became the "AI Writing" Tell* |
| `【 】` | `library/bracket-symbols`, `ar/library/*` | CJK corner brackets are the page's subject |
| `**bold**` | `answers/how-to-make-bold-text-in-discord` | Discord Markdown is the subject |
| `## heading` | `answers/how-to-make-big-text-in-discord` | Discord heading syntax is the subject |
| curly-vs-straight quotes | `de/symbol/anfuehrungszeichen`, quotation-mark pages | the subject |

Fixed with a `subject` exemption matched against the page's slug, title and H1.
`symbol/em-dash` carries 27 em dashes and must; a rule that flags the site's own
em-dash page has failed.

### 4.3 A near-zero cohort median maxed the dimension

`nl|library` has a three-item median of **0** across 58 pages, so the excess
function degenerated to a boolean and **one** three-item list maxed the dimension
at 12/12 — while `en|library`, at a median of 15.5/1k, needed 62/1k to score the
same. Exactly backwards. Two more instances: six em dashes on a 1,156-word Thai
page maxed punctuation (`th|library` median 1.49/1k), and a Dutch page one fact
short of its cohort scored a full specificity deficit (median 2.9/1k).

**Nine genuinely good pages sat at the top of the first ledger because of this** —
including `nl/library/seahorse-emoji` (a well-researched page about the
Mandela-effect seahorse emoji) at 55.5 and `pt/symbol/emoji-de-calendario`
(citing U+1F4C5 and Apple's frozen July 17 date) at 47.0.

Two different fixes, because these are two different failures:

* **A scale problem** — a real but tiny median. Tempered by dividing by
  `max(median, scale)`, so the penalty is proportional to how much information
  the cohort has demonstrated is achievable.
* **A measurement gap** — a median of exactly zero across 198 Dutch pages means
  the detector does not fire in Dutch. No arithmetic repairs that, so it is
  declared **not measured**. Reporting "no instrument" as "worst possible" is how
  a measurement becomes an accusation.

### 4.4 The specificity detector was reading the wrong text

The Discord formatting guide — one of the most fact-dense pages on the site —
read as fact-poor, because `<code>` and data-table cells are stripped before
scoring and that is where this site keeps its codepoints and alt codes. Fixed by
adding a `technical` slot that specificity reads and phrasing rules never do.

A related non-bug worth recording: Spanish showed a locale-median specificity of
**2.1 facts/1k** against Italian's 10.5, which looked like detector failure on
Spanish. It is not — `es/symbol/asterisco` scores 12 distinct facts. It is a
**family-mix artifact**: `es` is 254 `library` pages to 110 `symbol`, `it` is 110
`symbol` to 57 `library`, and `library` pages are less fact-dense in every
language. Cohort scoring is per locale **and family**, so it is handled; the
locale-level number is the misleading one.

### 4.5 The delta key re-flagged untouched text

The gate keyed a finding on `(rule, slot, ±45-character context)`. Inserting one
sentence near an existing em dash shifted the window and reported the untouched
em dash as newly introduced. Found by probe. Now keyed on **count per (rule,
slot)**, which is shift-proof.

### 4.6 Two more found by the tests themselves

* **CJK sentence splitting** required whitespace after a terminator. Full-width
  `。` is not followed by a space, so every Japanese and Chinese page collapsed
  into a single "sentence" — which then read as perfectly uniform rhythm.
* **`\bunderscore\b` does not match "underscores"**, the form the username-rules
  pages actually use. The search protection missed the exact case it was written
  for. Every term in that entry now carries its plural.

---

## 5. Human review of the score distribution

A stratified read of the top, middle and bottom of the ranked ledger.

**Top of cohort (p99+).** Consistently short (280–390 word) locale
emoji-collection pages: zero detected concrete facts, high em dash density, a
page shape shared with many siblings, and impressionistic prose over a tile grid
("the internet's elbow nudge", "sets the tone of the whole message"). One EN
page, `library/anime-symbols`, contains textbook negative parallelism — *"less
about a single alphabet and more about a look"* — which the phrase bank caught.
**Agreement: yes.** These are thin, atmospheric collection pages.

**Middle (p50).** `tr/symbol/hilal-ve-yildiz-sembolu` (U+262A, plus the fact the
symbol appears nowhere in the Quran) and `tr/symbol/rufiya-isareti` (11 distinct
facts, the Thaana letter it derives from, Unicode-accepted-but-unpublished).
**Agreement: yes.** These are informative pages and score mid-band.

**Bottom (score 0).** Spanish and Japanese `library` collection pages, several
scoring 0 on a measured weight of 47/100. **Partial agreement, and it is a
limitation, not a success**: with three English phrase dimensions absent and the
cohort medians below the reference floor, less than half the model applies. A 0
there means "little measurable", not "verified clean". Recorded in the operational
doc's Known Limitations.

**Family ordering matches editorial judgment.** EN medians: `library` 13.6 and
`printables` 12.1 at the top; `answers` 5.9 and `guide` 4.5 at the bottom. The
hand-authored long-form pillars score lowest and the template-generated
collections score highest, which is the result a reader would predict.

---

## 6. Final distribution

| | p10 | p25 | p50 | p75 | p90 | p95 | p99 |
|---|---:|---:|---:|---:|---:|---:|---:|
| all scored pages | 2.4 | 4.8 | 10.2 | 18.3 | 25.4 | 29.8 | 37.6 |

Per-locale medians run **5.0 (`no`) to 18.9 (`nl`)**, with EN at **10.8** —
mid-pack. Before the tokenizer and cohort fixes, EN sat at 29.8 against `ko` at
16.1, i.e. the instrument was measuring its own English bias. The remaining
spread is not a ranking of locales: raw scores are not comparable across
locales, which is why every threshold uses `locale_percentile`.

Cross-page similarity: **878 within-locale pairs at Jaccard ≥ 0.50** across 4,565
pages. Near-duplication is not a broad property of this inventory.

---

## 7. Thresholds, and where each number comes from

| threshold | value | derivation |
|---|---:|---|
| prose floor | 120 words | below it, one em dash on a 17-word embed stub read 58.8/1k — the worst score on the site, for a `noindex` fragment |
| locale mining floor | 40 pages | below it a locale cannot support phrase rules or stable percentiles |
| cohort minimum | 8 pages | below it a family median is noise; falls back to the locale |
| three-item reference floor | 2.0/1k | a median below this means the detector does not fire in that language |
| specificity scale | 6.0/1k | ≈ 3 facts on a median-length page; stops a one-fact cohort awarding a full deficit |
| new-page flag | p95 within locale | corpus percentile, not an invented score |
| regression tolerance | 10 percentile points | roughly one quartile-step; smaller moves are noise between runs |
| similarity report floor | Jaccard 0.50 | matches the site's prior near-duplicate measurement |
| consolidation review | Jaccard 0.80 | above it, pages are substantially the same text |

---

## 8. What was deliberately not done

* **No content was rewritten.** Not one page. The brief's stage 1 is measurement.
* **No em dash was removed.** 52,766 of them, on 98.9% of pages. Google's guidance
  warns against removing a page element because you heard it was bad and against
  changing content that already performs; the rule is forward-only.
* **No upstream template was edited.** `docs/editorial-footprint-upstream-findings-2026-08-26.md`
  ranks them; none is approved work, and the publishing freeze is in force.
* **No page was consolidated or de-indexed.**
* **No phrase-bank entry was added to make anything pass.**
* **No performance data was fabricated, and none was copied into this repository.**
* **No rule was switched to blocking without watching it fail on purpose first.**
