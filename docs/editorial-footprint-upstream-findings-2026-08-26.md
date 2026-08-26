# Editorial footprint — upstream sources (2026-08-26)

Where this site's repeated editorial language actually comes from, and the
cheapest correct place to fix each cluster.

**Read this before acting on any row of `data/editorial_footprint_ledger.csv`.**
Nearly every large repetition on this site has a single source. Asking hundreds
of pages to each hand-edit one shared string is the failure mode the whole
`variety` measurement exists to prevent.

---

## The measurement that separates a template from a habit

Every pattern the miner reports carries **pages** and **variety** (distinct
containing sentences ÷ pages):

| variety | what it means | where the fix is |
|---|---|---|
| ~0 | one string, replicated | the generator, the spec, or the shared partial |
| ~1+ | the same idea written many times | the writing |

Page frequency alone cannot tell these apart, and they need opposite work.

---

## 1. The em dash backlog is a build artifact, not a writing habit

This is the largest and most actionable finding in the whole pass.

| | |
|---|---:|
| em dashes in live HTML | **52,766** |
| pages carrying at least one | **4,528 of 4,578 (98.9%)** |
| em dashes hardcoded in `scripts/` and `data/` | **6,918** |
| `data/library_page_specs/*.json` files carrying them | **572 of 573** |
| generator scripts carrying them | **116** |

The live-HTML number is large because generation multiplies the source number
across locales and pages. **The editable surface is 6,918 strings in 713 files,
not 52,766 in 4,528 pages** — and roughly two thirds of it sits in spec JSON,
which is content, not code.

Heaviest single sources:

| occurrences | file |
|---:|---|
| 284 | `scripts/build_category_locale_pages.py` |
| 198 | `scripts/answer-pages-content.js` |
| 146 | `scripts/generate-site-art.py` |
| 75 | `data/library_page_specs/ru-html-entities.json` |
| 68 | `data/library_page_specs/de-html-entities.json` |
| 66 | `data/library_page_specs/alt-codes.json` |

**Consequence for the gate, and it is not optional.** When a newly generated
page carries an em dash, the string was almost certainly written into a spec or
a generator, not into the HTML. A gate that says "remove the em dash from
`fr/library/x/index.html`" sends the author to a file that will be overwritten
on the next generator run. `scripts/check-editorial-footprint.js` therefore
attributes each hit to its upstream source where it can find one, and names that
file in the failure message.

**This does not license a purge.** The rule is forward-only (see the phrase
bank's `EFR-F-001` note and the research memo's section 5.1): Google's own
guidance warns against removing a page element because you heard it was bad, and
against changing content that already performs. Fixing a spec changes the next
page generated from it; it does not rewrite 4,528 live pages, and it must not.

---

## 2. The shared CTA card — 421 English pages (46.6%)

> "Transform text with Unicode fonts — Use UltraTextGen to convert plain text
> into bold, italic, cursive, and 100+ other Unicode font styles…"

**Source:** the generator default at
`scripts/generate_library_page_from_spec.py:471`
(`spec.get("cta_h3", ui.get("cta_h3", "Transform text with Unicode fonts"))`),
mirrored at `scripts/generate_event_page_from_spec.py:158`. **56** spec files
also carry the identical English `cta` body verbatim; 23 carry the Indonesian
version and 10 the Turkish.

**Why it matters beyond repetition:** this one card is the entire reason the word
*transform* scores 911 occurrences across 443 English pages. Any marker-word
approach would have flagged "transform" as vocabulary. It is a template string,
and the phrase bank records it under `sharedTemplateStrings` rather than as an
entry, specifically so that mistake cannot be made from the data.

**Fix:** one generator default plus the 89 specs that hardcode it. Vary the card
by page family, or give the spec a required field with no default so a
page-specific line has to be written.

---

## 3. "Click any symbol to copy it instantly" — 220 English pages

**Source:** not a generator default. It is written into **182 of 573**
`data/library_page_specs/*.json` files by hand, one at a time.

That distinction changes the fix. A generator default is one edit; 182
copy-pasted spec fields are a content-authoring habit, and the durable fix is a
spec-level check that rejects a new spec reusing an existing spec's `lead`
verbatim. `scripts/check_locale_spec.py` is the natural home for that rule.

---

## 4. Printables trust line — 184 pages

> "Everything runs in your browser — no app or sign-up."

**Source:** hardcoded in four generators: `generate_bubble_letters_pages.py`,
`generate_bubble_numbers_pages.py`, `generate_alphabet_coloring_pages.py`,
`generate_dot_to_dot_alphabet.py`.

**Four edits clear 184 pages**, and because the string carries an em dash it is
simultaneously the largest single block of `EFR-F-001` backlog reachable in one
change. Highest leverage per keystroke on the site.

Related strings from the same four generators, each on 36 pages:
"Print this outline to color it in, or download it as a PNG.",
"Choosing 'Save as PDF' in the same dialog gives you a PDF instead of paper.",
"Printing onto cardstock instead of plain paper makes the stencil stiff enough
to reuse.", "Yes — every letter A–Z has its own bubble page."

---

## 5. The rest of the repetition, ranked

| string (truncated) | pages | variety | source |
|---|---:|---:|---|
| "Free, no sign-up." | 233 | 0.27 | printables + usecase generators |
| "Head back to …" | 186 | 0.05 | hub back-link partial |
| "Copy a full combo in one click and paste it into a bio, caption, or username." | 91 | 0.00 | emoji-combo spec template |
| "Copy a single emoji below, or grab a full combo set with one click." | 86 | — | emoji-combo spec template |
| "Prefer to copy and paste instead of print?" | 62 | — | printables cross-link partial |
| "The flag, the ball, and the national colours." | 54 | — | country emoji-combo spec template |

---

## 6. What is genuinely editorial, and therefore not on this list

Three patterns have **variety ≈ 1**, meaning they were written afresh each time.
These are the only ones a per-page warning is the right instrument for:

| pattern | occurrences | pages | variety |
|---|---:|---:|---:|
| `great for` / `perfect for` / `ideal for` | 218 | 154 | ~1.0 |
| `whether you…` / `looking for…` (sentence-initial) | 80 | 73 | 1.00 |
| `stand out` | 125 | 66 | 1.76 |

Everything else above is a build-system change.

---

## 7. Ranked recommendation

1. **Four printables generators** — 184 pages, four edits, clears em dash and
   template debt at once. Zero risk: no live HTML changes until the next
   generation run.
2. **The CTA default + 89 specs** — 421 English pages plus their translations.
3. **A spec-level duplicate-`lead` check** — stops item 3 recurring. Prevention,
   not repair.
4. **`scripts/build_category_locale_pages.py` (284 em dashes) and
   `scripts/answer-pages-content.js` (198)** — the two densest code sources.

**None of this is approved work.** This document is a findings ledger. Promotion
into production goes through the normal process, and while the publishing freeze
is in force a generator edit that changes no live page is the only part of it
that is even eligible.
