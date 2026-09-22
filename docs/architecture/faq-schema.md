# FAQ schema — the drift record

Invariant: `.claude/rules/html-pages.md` → "Structured data must mirror what the
reader sees".

## Why the rule is strict

Google's structured-data policy is explicit that FAQ markup has to mirror on-page
content. A page shipping a `FAQPage` block describing Q&A it never renders is
invisible-content markup: it forfeits the rich result and is spammy-structured-markup
territory for a manual action. Content inside an accordion or disclosure widget **is**
visible for this purpose; content that exists only in the JSON-LD is not.

## The count was the count someone happened to open

A 2026-07-12 structural audit found two pages (`usecase/stylish-name`,
`usecase/zalgo-text`) shipping FAQ schema with no visible FAQ and recorded it as a
two-page defect.

A site-wide scan found the real number was **214 pages** — 155 with FAQ schema and no
FAQ section at all, plus 59 whose visible FAQ had drifted out of sync with its own
JSON-LD (**212 orphan questions**). Nothing had been watching for it because nothing
could: the audit was a manual read.

Fixed in one pass. `scripts/fix-faq-schema-visibility.js` is kept because the same two
repairs apply every time this recurs — it renders the schema's own Q&A into a
house-style section when the page has no FAQ, and prunes-then-backfills the JSON-LD
against the visible FAQ when the page does. **It never invents copy**: rendered text
is the schema's own, backfilled text is the page's own.

The audit, the gate and the fixer share `scripts/lib/faq-schema-audit.js` so they can
never disagree about what counts as "visible".

## The gate only ever checked half the rule (fixed 2026-08-21)

The rule has two halves — questions must be visible, and an answer must not claim
content the page never renders — and **only the first was enforced**. The shared
library *did* compute an answer comparison, but `check-faq-schema.js` never read it,
so the answer half was **present, documented, and dead**. Same shape as the two
workflow incidents: *a check that reports nothing is indistinguishable from a check
that passes.*

It was found the way it had to be found — by shipping the defect. A correction pass on
`updates/unicode-18-most-anticipated-emoji` appended one sentence to a JSON-LD answer
("See our Unicode 18.0 Release Date Confirmed update…") that the visible answer never
got. The gate reported `mismatched: 0`; a review agent caught it by reading the page.

### It measures the delta, not the state

A state check is not viable: the site carries **923 drifted answer pairs across 336
files** (measured 2026-08-21; ≥5 tokens still leaves 310, ≥12 leaves 38). Almost all
of it is benign rewording where a translator tightened a sentence. A gate red on 336
files regardless of the PR is a gate people learn to ignore.

So a pair counts against a branch only if its divergence **grew by `DRIFT_TOLERANCE`
(4) content tokens or more** since the merge base — roughly a clause; the real
regression added 5. Pre-existing drift is **reported, never silenced**: the clean run
on the branch that added this printed 0 introduced and 21 pre-existing, exit 0.

**The measurement is direction-neutral, which matters**, because the *stale-schema*
half — visible FAQ rewritten, JSON-LD left alone — is the more common failure. Both
edits produce the same observable: schema tokens with no home in the visible answer.
The failure message says so rather than assuming the JSON-LD is what moved.

### `visibleAnswers()` reads "the item's text minus its question"

It deliberately does **not** select `.faq-answer`. Selecting the class reports **97
answers across 21 pages as blank**, because those pages carry invalid nested markup —
`<p class="faq-answer"><p>…</p></p>`, which every parser auto-closes, leaving the
element genuinely empty. **That markup bug is real and still outstanding**; it is not
this gate's job, and the gate must not be fooled by it.

Verified against **two differently-shaped** broken inputs so the check could not be
tuned to one bug: the real regression re-injected (JSON-LD grew a sentence), and a
visible answer trimmed on `category/underline-text` with its JSON-LD left stale
(0 → 16 tokens). Both exit 1.

## The schema a gate reads is not always the schema Google renders (2026-09-05)

Everything above compares a page's **static** JSON-LD against its **static** visible
FAQ. `i18n.js` rewrites the JSON-LD **in the browser**, from the locale JSON it
fetches — so a page can pass the gate on disk and still serve Google a different FAQ
entirely. Fourth instance of the same shape, from a fourth cause: **the gate was
looking at the right file at the wrong moment.**

**The FAQ in a locale JSON is the HOMEPAGE's FAQ.** Verified: of the 26 pages in the
tree that bind `data-i18n="faq.*"`, **all 26 are a homepage**. `updateFAQSchema()`
nonetheless ran on every page that loaded `i18n.js` and carried a `FAQPage` block —
replacing that page's own questions with the homepage's, which the page never
renders. Invisible-content FAQ markup by this page's own definition.

**It was live on 11 pages.** Every locale build of `usecase/zalgo-text` loads
`i18n.js`, ships its own 6-question FAQ, and had it swapped at runtime for the
homepage's 21. On `fr/usecase/zalgo-text` the overlap between the two sets was **0 of
6** — so nothing visible changed and only the structured data moved, which is exactly
why nobody saw it.

**The fix is a guard, not a comment:** `updateFAQSchema()` returns early unless the
page actually renders this FAQ (`[data-i18n^="faq."]`). The blast radius was about to
grow 35×, not shrink — a proposal to add `i18n.js` to the ~390 locale pages that lack
it covers **393 pages carrying a `FAQPage` block**. Fix this first; it is a
prerequisite, not a side quest.

`npm run test:i18n-faq-schema` gates it by slicing `updateFAQSchema()` out of the live
`i18n.js` and driving it against a DOM stub. Its last case asserts the **site-level
invariant the guard rests on** — that no non-homepage binds `faq.*`. If one ever does,
the guard's premise has changed and the test says so by name rather than letting the
page silently take the homepage's schema.

Verified against four differently-shaped broken inputs: the guard deleted (the real
regression), the guard widened to a selector that always matches, the guard inverted,
and the slice markers renamed — each exits 1. And verified that CI *gates* on it
rather than merely runs it.

## A note for anyone repeating these probes

**Do not pipe the run through `grep` to read the result** — `$?` is then grep's
status, which is the exact pipefail trap recorded elsewhere in these docs, and it
reported a false EXIT=0 on the first attempt here.
