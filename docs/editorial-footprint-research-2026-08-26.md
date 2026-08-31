# Editorial Footprint Risk — research memo (2026-08-26)

Why every rule in the Editorial Footprint Risk (EFR) system exists, what the
evidence for it actually is, and — more often — what the evidence does **not**
support. Read this before changing a weight, adding a phrase to the bank, or
promoting a rule from informational to blocking.

**All external sources were accessed 2026-08-26.** Model vocabulary shifts over
time (see §4.4), so a marker list is a dated observation, never a constant.

---

## 0. What this system is, in one paragraph

EFR measures **observable editorial characteristics** of this site's own visible
prose — formulaic phrasing, repeated syntax, promotional vagueness, low
information density, and sameness *across our own pages*. It produces a 0–100
risk score where higher means "this page reads more like filled-in template than
like something written about this subject." It is a house style and knowledge
density instrument.

**It is not an AI detector, and it must never be described as one.** It does not
estimate the probability that a page was machine-written, it does not consume
commercial detector scores, and no output of it licenses the claim that any page
was written by a model. §2 explains why that line is not modesty but correctness.

---

## 1. What materially changed after the research

Five things, each of which changed a design decision that had already been
sketched the other way.

**1.1 Comparative judgment beats absolute judgment, by a wide margin.** Human
raters distinguishing machine-written from human-written text score at or barely
above chance when judging one text alone (≈55–57%, and near chance even when
raters report high confidence), but reach ≈78% when the same texts are shown
**side by side**.[^humans][^humans2] The original sketch of this system was an
absolute per-page threshold. That is the weaker instrument. EFR is therefore
built comparatively: a page is scored against **its own page family and locale**,
and against **its own prior state**, not against a universal constant. The
cross-page sameness dimension is not a nice-to-have; it is the axis the evidence
says is most legible.

**1.2 Per-page lexical-diversity metrics are a dead end.** The intuitive move —
score each page on type-token ratio / MTLD / MATTR — is not supported. An ACL
2025 study comparing English news corpora from 2018 and 2024 found *"homogenization
effects do not show clearly in the measurements"* on exactly those
metrics.[^acl-homog] Meanwhile the effect that **does** replicate is collective:
across 2,200 essays, human writing raised the *collective semantic diversity* of a
set roughly 2–8x more than GPT-4 writing did, and the homogenizing effect survived
prompt and temperature changes.[^homog-essays] Diversity is a property of the
**set**, not of the document. So EFR spends its budget on cross-page measures and
gives per-page lexical richness no weight at all.

**1.3 The base rate makes any single marker nearly worthless as evidence.** Pew
Research Center's Data Labs analysed ~490,000 English pages from Common Crawl
(Jan 2021 – Jul 2026) and found **over a third** of English pages published after
ChatGPT's release carry markers of AI authorship, against ~1 in 10 across the full
historical sample.[^pew] When a third of the web carries a marker, the marker's
presence on one page is close to uninformative about that page. This is the
single strongest argument for the "no phrase is proof" rule in §2, and for
weighting *density and co-occurrence* rather than *presence*.

**1.4 Google names synonymising as an abuse pattern — so the obvious cleanup is
the dangerous one.** Google's spam policy lists, under scaled content abuse,
*"automated transformations like synonymizing, translating, or other obfuscation
techniques, where little value is provided to users."*[^spam] A cleanup pass that
swaps flagged words for synonyms is therefore not merely useless, it is a
described abuse pattern. Combined with Google's explicit *"Avoid doing 'quick fix'
changes (like removing some page element because you heard it was bad for
SEO)"*[^core], the remediation principle in §7 stops being an editorial preference
and becomes a risk control.

**1.5 The em dash claim is real at population level and worthless at page level,
and both halves matter.** Em dash frequency on the web roughly doubled after
2023; Oxford comma use rose 63%; favoured vocabulary more than doubled; negative
parallelism constructions nearly tripled.[^pew] One measurement puts GPT-4.1 at
≈3.3x a human em-dash baseline.[^emdash] But the same reporting is blunt that
spotting machine text this way is *"still more art than science"*,[^emdash-news]
and the Pew analysis itself warns that individual pages may be misclassified in
either direction. So the em dash is adopted here as a **house style rule for new
prose**, deterministic and cheap, and explicitly **not** as evidence about any
page. See §5.1.

---

## 2. Why this is not an AI detector

Three independent lines of evidence, any one of which would be sufficient.

**2.1 Detectors do not generalise.** Across detector families, AUROC drops 5–30
points when a detector trained on one dataset is tested on another; content-domain
shift is a stronger failure mode than generator-family shift, and detectors assign
high-confidence machine labels to human text from unseen domains.[^gen] Several
analyses conclude detectors learn *what the AI text in their training set looked
like*, not what machine language is — so benchmark accuracy overstates real
capability.[^xai] A site of Unicode reference pages, symbol tables and per-locale
generator copy is about as far out of any detector's training distribution as
English text gets.

**2.2 Detectors are biased against non-native English writers — which is most of
this site.** Seven widely used detectors misclassified **61.3% of TOEFL essays by
non-native writers as AI-generated** (one detector flagged 97.8%), while
classifying US eighth-grade essays correctly. The stated mechanism is low text
perplexity from a narrower range of expression.[^toefl] This site publishes in 29
non-English locales; a detector-shaped instrument would systematically indict its
translations. §6 turns this into a hard architectural rule.

**2.3 The population-level studies disclaim per-document use themselves.** The
excess-vocabulary study that produced the canonical marker list states plainly
that its *"analysis is performed on the corpus level and cannot identify
individual abstracts that may have been processed by an LLM,"* and that its 13.5%
figure is a lower bound over abstracts containing at least one style
word.[^excess] The strongest evidence in this field is explicit that it does not
transfer to one document.

**Consequences, binding:**

* EFR emits no probability of machine authorship and no "AI-likelihood" field.
* No commercial detector score is an input, and none may become a gating signal.
* No finding may be phrased as a claim about who or what wrote a page. Findings
  are phrased about the **text** ("this construction repeats on 340 pages"),
  never about its origin.
* A single vocabulary item never triggers a failure. Only density, co-occurrence,
  and cross-page repetition do.

---

## 3. Signal strength ledger

Every signal EFR touches, graded by what actually backs it. This table is the
memo's operative output: **only rows marked "deterministic + high confidence" are
eligible to block a pull request.**

| Signal | Evidence class | Strength | CI role |
|---|---|---|---|
| Model/tooling leakage (placeholder text, citation artifacts, "As an AI…") | Direct observation; unambiguous defect | **Strong** | **Blocking** |
| Em dash in newly written editorial prose | Population-level frequency shift[^pew][^emdash]; adopted as house style | Moderate as signal, **total as a style rule** | **Blocking, new prose only** |
| Cross-page near-duplication (shingle Jaccard) | Deterministic measurement of our own corpus | **Strong** | **Blocking above a high bar; informational below** |
| Loss of primary query / entity language | Deterministic diff; direct SEO risk[^core] | **Strong** | **Blocking** |
| Formulaic phrase density (bank-driven, corpus-mined) | Corpus evidence from this site | Moderate | Warning; blocking only on severe new-page regression |
| Negative parallelism ("not just X but Y") | Population-level: construction nearly tripled[^pew] | Moderate | Warning |
| Excess-vocabulary words (delve, underscore, showcase, elevate, pivotal…) | Population-level, with explicit per-document disclaimer[^excess] | **Weak per page**, moderate in density | Warning at density only |
| Promotional vagueness (unsupported adjectives, abstract benefit claims) | Editorial judgment, aligned with Google's own quality questions[^helpful] | Moderate | Warning |
| Specificity deficit (few codepoints, limits, platform facts) | Editorial; aligned with rater-guideline language on effort/originality/added value[^genai] | Moderate | Warning |
| Structural template dependence | Deterministic, but templates are legitimate here | Weak alone | Informational |
| Punctuation/formatting fingerprint beyond em dash | Population-level, small effects | **Weak** | Informational |
| Rhythm / repeated sentence openings | Editorial observation | **Weak** | Informational |
| Per-page lexical diversity (MTLD/MATTR/TTR) | **Contradicted** by ACL 2025 results[^acl-homog] | **Rejected** | **Not implemented** |
| Perplexity / burstiness | Detector-family signal; §2 applies | **Rejected** | **Not implemented** |
| Any commercial AI-detection score | §2 applies | **Rejected** | **Prohibited as input** |

### 3.1 Signals that must never become blocking rules

* Anything requiring a model call, a paid API, or a network fetch. CI must stay
  deterministic and offline (§8).
* Any single word or phrase, on its own, at any severity above warning.
* Any per-page lexical-diversity or perplexity measure (§3, rejected rows).
* Subjective register judgments ("this sounds corporate") that cannot be
  reproduced byte-for-byte by a second run.
* Anything applied to a non-English page using English-derived rules (§6).

---

## 4. What the research says about vocabulary markers specifically

### 4.1 The list is empirical, not folkloric
The canonical marker set comes from an analysis of >15 million PubMed abstracts
(2010–2024) that adapted excess-mortality methods to measure excess word use
after ChatGPT's release. It found the 2023–2024 excess was **not content nouns
but style-affecting verbs and adjectives** — 379 excess style words in 2024,
verbs making up ~66% and adjectives ~14%.[^excess] Named examples include *delve,
delves, delving, underscore, underscores, showcase, showcasing, elevate,
emphasize, elucidate, facilitate, harness, illuminate, leverage, meticulous,
pivot, streamline, unveil*, and adjectives *intricate, crucial, pivotal,
comprehensive, notable, remarkable, innovative, foundational, exceptional*.

The overlap with the seed list this system was commissioned with is substantial
but **not complete**, and the differences are the point: seed items with no
research backing were not promoted on reputation, and research items absent from
the seed list were added.

### 4.2 A marker in another domain is a hypothesis here, not a finding
The excess-vocabulary work is on biomedical abstracts. Its list transfers to this
site only as a **hypothesis to test against our own corpus**, which is what the
phrase-mining stage does. A word that is rare in our corpus is not worth a rule;
a word that is frequent may be frequent for a legitimate product reason (§5.2).

### 4.3 Population signal is not per-page evidence
Restating §2.3 because it is the most-violated rule in this area: the studies that
establish these markers disclaim per-document inference explicitly. In EFR the
markers therefore feed a **density-limited** class — flagged when concentration is
unusual for the page's own family and locale — never a presence test.

### 4.4 Markers drift, so the bank must be re-derived, not maintained by hand
Em dash frequency in one vendor's model was publicly adjusted in response to user
preference; measured em-dash rates across models range from roughly 0 to 10+ per
1,000 words depending on the model, and suppression instructions do not remove
them uniformly.[^emdash] A marker list is therefore a **dated observation about a
model population that is actively changing**. Two consequences, both wired into
the design: every phrase-bank entry carries `first_added` and `last_reviewed`
dates, and the bank's corpus-frequency fields are regenerated from our own pages
rather than curated by memory.

---

## 5. SEO risks — where cleanup could do real damage

Ordered by how likely the mistake is.

### 5.1 Retroactive purges are themselves a risk
Google: *"Avoid doing 'quick fix' changes (like removing some page element because
you heard it was bad for SEO)"*, and *"we recommend avoiding making changes to
content that's already performing well."*[^core][^drops] A site-wide em-dash purge
across 4,589 pages is precisely the shape of change both sentences warn against.
The em dash rule is therefore **forward-only**: it governs prose this repository
newly writes, and existing pages are reported, never auto-edited.

### 5.2 Synonym swapping is a named abuse pattern
See §1.4. *"Automated transformations like synonymizing"* appears verbatim in the
scaled-content-abuse policy.[^spam] Any remediation that lowers an EFR score by
substituting words while leaving information content unchanged is moving the site
**toward** the policy it is meant to move away from. §7 is the enforced
alternative.

### 5.3 Removing query language costs relevance — but the risk is narrower than instinct suggests
Google states its systems *"can understand synonyms and general meanings of what
someone is seeking, in order to connect them with content that might not use the
same precise words"* and that relevance is understood *"even when there is no
exact match between the query and the page's primary content."*[^aio] Read
carefully, that lowers the risk of rewording **incidental** prose and leaves the
risk on **primary content** intact. The operative split EFR uses:

* **Protected** — title, H1, canonical, primary query target, entity names,
  platform names, Unicode terminology, concrete examples, internal links and
  their anchor text. Never touched to lower a score.
* **Negotiable** — introductions, transitions, benefit claims, CTA phrasing,
  closing paragraphs. These carry the footprint and almost none of the relevance.

The SEO Preservation Gate enforces exactly this split, and it is a **separate**
check from the score, never blended into it.

### 5.4 Repetition is not automatically bad
A symbol reference site says "copy and paste", "Unicode", "text generator" and
platform names often because that is what the pages are about and what users
search. Keyword stuffing is defined by Google as *"filling a web page with
keywords or numbers in an attempt to manipulate rankings"* — unnatural
repetition, not topical repetition.[^spam] The phrase bank therefore carries an
explicit **search-protected** class whose members are exempt from density scoring
entirely, and adding a term to it is a decision, not a convenience.

### 5.5 The inverse risk: over-correction into stuffing
A page rewritten to demonstrate specificity can accumulate keyword-dense
technical filler. The specificity dimension rewards *distinct* concrete facts, not
occurrences, so restating the same codepoint eight times scores once.

---

## 6. Localization risks

**The rule: never apply an English phrase bank to another language.** §2.2 is the
evidence — 61.3% false-positive rate against non-native English writing, driven by
narrower expression rather than by authorship.[^toefl] A system that scored a
Turkish or Indonesian page with English-derived rules would reproduce that bias
inside our own CI, against exactly the pages this site has invested most in
translating.

Binding consequences:

1. **Comparison sets are language-scoped.** A page is only ever compared against
   pages in its own language for sameness and for family norms. The one
   deliberate exception is *translated English boilerplate* — English strings
   surviving on a locale page — and that is already owned by
   `check-locale-translation.js`; EFR does not duplicate it.
2. **A locale phrase bank requires its own corpus evidence.** No entry may be
   created by translating an English entry. Locales below a corpus-size floor get
   **no** phrase rules at all — structural dimensions only.
3. **Thresholds are per-locale percentiles, not shared constants.** A construction
   that reads as formulaic in English may be ordinary or grammatically required
   elsewhere.
4. **Nothing here overrides locally-native vocabulary work.** Where a phrase is
   recorded as the locally natural form, its frequency is evidence of fit, not of
   templating. Locale vocabulary decisions live outside this repository (see
   `docs/local-language-intelligence.md` for how that boundary works); EFR must
   never be the reason such a phrase is removed.
5. **A false positive on a locale page is a rule bug, not a page defect.** It
   gets fixed in the rules.

---

## 7. The remediation principle, and why it is a risk control

The transformation EFR asks for is **never** word substitution:

| From | To |
|---|---|
| generic claim | concrete information |
| abstract benefit | observable behaviour |
| filler introduction | direct answer |
| rhetorical flourish | useful explanation |
| template sentence | topic-specific knowledge |
| repeated generic paragraph | unique page value |

This is not a style preference. Google's guidance asks whether content
*"provide[s] original information, reporting, research, or analysis"* and
*"insightful analysis or interesting information that is beyond the obvious"*, and
whether it *"avoid[s] simply copying or rewriting those sources, and instead
provide[s] substantial additional value"*.[^helpful] Its generative-AI guidance
points at rater-guideline language on content with *"little to no effort, little
to no originality, and little to no added value"*.[^genai] Every row above moves a
page toward those criteria; a synonym swap moves it nowhere and, per §5.2, moves
it toward a described abuse pattern.

**Explicitly rejected as remediation:** injecting randomness, slang, typos or
manufactured casualness. "Humanising" by degrading the text lowers a metric and
lowers the page. Higher knowledge density is the goal; the score is only a proxy
for it.

---

## 8. Tooling decision — Vale vs. a corpus-aware validator

Vale is the standard prose linter for repositories, offers 11 check types
(existence, substitution, occurrence, repetition, consistency, conditional,
capitalization, metric, spelling, sequence, script), three severities
(suggestion/warning/error), and integrates with GitHub annotations via
reviewdog.[^vale] Its `existence` and `occurrence` checks map cleanly onto the
forbidden-character and density-limited rules.

**It is not adopted here.** Four reasons, in order of weight:

1. **Vale is single-document by construction.** Six of the nine EFR dimensions —
   cross-page sameness, structural template dependence, corpus-derived phrase
   frequency, page-frequency weighting, per-family norms, baseline regression —
   need the whole corpus in memory. No Vale check can express "this sentence
   appears on 340 other pages."
2. **The delta rule cannot be expressed in Vale.** This repository's gates
   deliberately measure *what a branch introduced*, comparing against the merge
   base, because a check that is red regardless of the change is one people learn
   to ignore. That is settled practice for prose linting generally — reviewdog's
   own default is to report only on the diff[^reviewdog] — but it lives in the
   runner, not in the rule file, and here it needs base-vs-head content
   comparison, not line filtering.
3. **Slot semantics.** Visible prose on this site must be separated from symbol
   tiles, `data-symbol` clipboard payloads, JSON-LD, code samples and Unicode
   examples. `scripts/lib/locale-translation-audit.js` already encodes that
   distinction, correctly and with hard-won exceptions. Re-encoding it in Vale
   scopes would create a second definition that drifts from the first — the exact
   failure this repository has documented repeatedly.
4. **Dependency cost.** Vale is a Go binary plus a style package; this repository
   runs on two npm packages and stdlib Python, with a standing rule against
   dependencies that are not justified.

**What is adopted instead:** the same architecture every other gate here uses — a
shared library, a whole-site audit, and a diff-scoped gate, so "editorial
footprint" can never mean two different things in the two places it is measured.
The Vale-shaped rules (forbidden character, forbidden phrase, occurrence limit)
are ~60 lines of that library rather than a second toolchain.

**Revisit if:** the repository ever adds Markdown documentation for humans at
scale. Vale is a good fit for that and a poor fit for 4,589 generated HTML pages.

---

## 9. Recommended architecture

```
scripts/lib/editorial-corpus.js       slot-aware visible-prose extraction
scripts/lib/editorial-footprint.js    phrase bank, 9 dimensions, scoring, similarity
scripts/lib/seo-snapshot.js           the SEO Preservation Gate's own comparison
scripts/mine-editorial-phrases.js     corpus mining -> phrase-bank evidence
scripts/audit-editorial-footprint.js  whole-site ledger              (informational)
scripts/check-editorial-footprint.js  diff-scoped gate               (shadow first)
data/editorial_phrase_bank.json       the bank
data/editorial_footprint_baseline.json per-page baseline for regression
```

Four properties are non-negotiable:

* **Deterministic.** Same input, same output, no network, no model, no clock.
  (Note for implementers: Python's `hash()` and any seed derived from it are
  randomised per process and must not be used for shingle signatures.)
* **Delta-scoped.** The gate measures what a branch introduced.
* **Split.** Editorial score and SEO preservation are separate checks that never
  average into one number.
* **Comparative.** Per family, per locale, per page's own history — §1.1.

---

## 10. Rollout

Shadow first. The rollout stages, what blocks and what informs, and the standard
for promoting a rule are in `docs/editorial-footprint-risk.md` §Rollout — kept
there so the operational document and this evidence document do not drift.

The promotion standard, stated here because it is a research conclusion: a rule
may become blocking only when it is **deterministic**, **documented**, has
**zero unresolved false positives** in the review sample, and has run in shadow
long enough to have been exercised. This repository has learned twice that a
check reporting nothing is indistinguishable from a check that passes — so before
any rule is trusted, it must be run against a deliberately broken input and
observed to fail.

---

## Sources

[^helpful]: Google Search Central, *Creating helpful, reliable, people-first content*. https://developers.google.com/search/docs/fundamentals/creating-helpful-content — accessed 2026-08-26.
[^spam]: Google Search Central, *Spam policies for Google web search* (scaled content abuse; keyword stuffing). https://developers.google.com/search/docs/essentials/spam-policies — accessed 2026-08-26.
[^genai]: Google Search Central, *Using generative AI content*. https://developers.google.com/search/docs/fundamentals/using-gen-ai-content — accessed 2026-08-26.
[^aio]: Google Search Central, *Optimizing your website for generative AI features on Google Search*. https://developers.google.com/search/docs/fundamentals/ai-optimization-guide — accessed 2026-08-26.
[^core]: Google Search Central, *Google Search's core updates and your website*. https://developers.google.com/search/docs/appearance/core-updates — accessed 2026-08-26.
[^drops]: Google Search Central, *Debugging drops in Google Search traffic*. https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops — accessed 2026-08-26.
[^excess]: Kobak, González-Márquez, Horvát, Lause, *Delving into LLM-assisted writing in biomedical publications through excess vocabulary*. Science Advances (2025); arXiv:2406.07016. https://arxiv.org/abs/2406.07016 — accessed 2026-08-26.
[^toefl]: Liang, Yuksekgonul, Mao, Wu, Zou, *GPT detectors are biased against non-native English writers*. Patterns 4(7), 2023; arXiv:2304.02819. https://arxiv.org/abs/2304.02819 — accessed 2026-08-26.
[^gen]: *Rethinking AI-Generated Text Detection: A Strong Baseline and the Distribution-Shift Problem That Remains*. arXiv:2607.03680. https://arxiv.org/html/2607.03680v1 — accessed 2026-08-26.
[^xai]: *Why AI-Generated Text Detection Fails: Evidence from Explainable AI Beyond Benchmark Accuracy*. arXiv:2603.23146. https://arxiv.org/html/2603.23146 — accessed 2026-08-26.
[^acl-homog]: *Testing English News Articles for Lexical Homogenization Due to Widespread Use of Large Language Models*. ACL 2025 Student Research Workshop. https://aclanthology.org/2025.acl-srw.95/ — accessed 2026-08-26.
[^homog-essays]: *Homogenizing effect of large language models (LLMs) on creative diversity: an empirical comparison of human and ChatGPT writing*. https://www.sciencedirect.com/science/article/pii/S294988212500091X — accessed 2026-08-26.
[^humans]: *Do humans identify AI-generated text better than machines? Evidence based on excerpts from German theses*. https://www.sciencedirect.com/science/article/pii/S1477388025000131 — accessed 2026-08-26.
[^humans2]: *Human intelligence can safeguard against artificial intelligence: individual differences in the discernment of human from AI texts*. Scientific Reports (2024). https://www.nature.com/articles/s41598-024-76218-y — accessed 2026-08-26.
[^pew]: Pew Research Center Data Labs analysis of ~490,000 English Common Crawl pages, Jan 2021 – Jul 2026, as reported 2026-07. https://www.metatalks.ai/more-than-a-third-of-pages-published-since-chatgpt-show-signs-of-ai-writing-pew-research-center/ — accessed 2026-08-26.
[^emdash]: *The Last Fingerprint: How Markdown Training Shapes LLM Prose*. arXiv:2603.27006. https://arxiv.org/html/2603.27006v1 — accessed 2026-08-26.
[^emdash-news]: *Too many em dashes? Spotting text written by chatbots is still more art than science*. Indiana Capital Chronicle, 2025-08-05. https://indianacapitalchronicle.com/2025/08/05/too-many-em-dashes-spotting-text-written-by-chatgpt-is-still-more-art-than-science/ — accessed 2026-08-26.
[^vale]: Vale documentation, *Styles* (extension points, severities). https://docs.vale.sh/topics/styles — accessed 2026-08-26.
[^reviewdog]: reviewdog filter modes (`added`, `diff_context`, `file`, `nofilter`); default reports only on the pull request's changes. https://github.com/reviewdog/reviewdog — accessed 2026-08-26.
