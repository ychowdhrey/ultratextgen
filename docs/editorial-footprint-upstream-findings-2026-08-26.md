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

## 1a. The four printables generators are STALE, and running them destroys shipped repairs (found 2026-08-26, acting on Batch A)

This is the most important thing this pass found, and it inverts the
recommendation that produced it. Batch A was proposed as "four generator edits,
no live page changes until regeneration". The generator edits are done. **The
regeneration half is not safe and must not be run.**

Running the four generators unmodified against the live tree changes **90 files**,
and the entire diff is five later site-wide passes being silently undone:

| what a run deletes | pages | owning pass | gated? |
|---|---:|---|---|
| Funding Choices ad-blocking-recovery tag | 90 | `inject-funding-choices-tag.js` | **yes** |
| Baked static footer markup | 90 | `build-static-footer.js` | **yes** |
| The FAQ's position inside `<main>` | 88 | `fix-footer-nested-content.py` | no, but it re-creates the 727-page defect that pass repaired |
| hreflang alternates (orphans the `es/imprimibles/…` siblings) | 27 | `sync-locale-mesh.js` | **yes** — 28 issues |
| `og:image` / `twitter:image` / `og:image:alt` | 53 | `generate-site-art.py` + `wire-site-art.py` | **yes** for new/changed pages |

Plus hand edits that never went back into the spec — several meta descriptions
now mention "save it as a PDF", which the generators do not produce.

**Three of these are now fixed in the generators** (Funding Choices tag, the
footer-nesting, and the copy). **Two are not**: the generators have no model of
the hreflang mesh or the art pipeline, and giving them one is a real project, not
a copy fix.

### The guard

`scripts/lib/printables_parity.py` makes the remaining gap loud. Before writing,
each generator diffs its output against the live page and **refuses to overwrite**
(exit 4) if the live page carries anything the new page lacks, naming the file,
the missing element, and the pass that owns it. `--force-stale` overrides and
prints what it is overriding. Verified by probe: a real run now exits 4 with
nothing written; `npm run test:printables-parity` holds it there with 14
assertions, including the deliberate non-catches (a new page, reordered tags, a
copy-only edit).

**Why a guard rather than a full parity fix.** A generator that silently deletes
a shipped repair is the same failure this repository has recorded twice in CI: a
check that reports nothing is indistinguishable from a check that passes. The
damage here would not surface until a gate went red on someone else's later PR.
Making it loud is cheap and immediate; teaching four generators the hreflang mesh
and the art pipeline is a scoped project that needs its own decision.

### What this means for the copy fix

The improved copy is committed and correct, and it will land the next time these
pages are legitimately regenerated. Until then the live pages are unchanged —
which is also what the publishing freeze wants. The measured improvement, taken
from a generated-vs-generated comparison (so the staleness above cannot
contaminate it):

| | before | after |
|---|---:|---:|
| distinct print-guidance answers across the 26 bubble-letter pages | **2** | **26** |
| pages carrying "Everything runs in your browser — no app or sign-up." | 98 | 10 |
| pages opening a FAQ answer with "Yes — every letter A–Z has its own…" | 88 | 0 |
| em dashes across the three regenerated clusters | 1,743 | 1,319 |
| title / H1 / canonical / meta-description lines changed | — | **0** |

That last row is the SEO Preservation Gate doing its job on its own author: the
titles of these pages carry em dashes, and changing a title to remove one is a
blocking `title-changed` finding. The em dash rule is forward-only for exactly
this reason.

The 10 remaining pages are `printables/alphabet-coloring-pages/number-*`, which
**no generator owns** — they are hand-maintained. Editing 10 live pages by hand
during a publishing freeze is not what Batch A approved, so they are left, and
recorded here instead.

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

**Source:** not a generator default. It is written into
`data/library_page_specs/*.json` files by hand, one at a time.

That distinction changes the fix. A generator default is one edit; a couple of
hundred copy-pasted spec fields are a content-authoring habit, and the durable
fix is a spec-level check.

### Correction (2026-08-26, same day, acting on Batch C)

**The fix proposed above was specified at the wrong granularity and would have
shipped a gate that could never fire.** It read: *"a spec-level check that
rejects a new spec reusing an existing spec's `lead` verbatim."* Run that design
and it finds **nothing** — the corpus contains **zero** exact duplicate
`hero_tagline`, `meta_description`, `title` or `intro` values. Every one of
those taglines is unique *overall*; what repeats is a **sentence inside** an
otherwise page-specific field:

> "Ancient Greek letters for maths and fraternities. Click any symbol to copy it
> instantly."

Field equality says that spec is clean. It is not. Re-measured at sentence
level across **591 specs**:

| specs | field | sentence |
|---:|---|---|
| 171 | `hero_tagline` | "Click any symbol to copy it instantly." |
| 148 | `meta_description` | "Click any symbol to copy it instantly." |
| 91 | `meta_description` | "Click any emoji or combo to copy it instantly." |
| 86 | `intro` | "Copy a single emoji below, or grab a full combo set with one click." |
| 55 | `cta` | "Use UltraTextGen to convert plain text into bold, italic, …" |
| 21 | `meta_description` | "Click any to copy it instantly." — and that one is ungrammatical |

**45 sentences repeat across more than one spec; 416 of 591 specs carry at least
one.** The `meta_description` rows are the sharper half: a meta description
duplicated across 148 pages is a plain SEO defect, not only an editorial one.

The last row is the tell that this is paste, not authorship. "Click any to copy
it instantly" is missing its noun — someone deleted "symbol" out of the copied
line and never replaced it, and it shipped to 21 pages.

### The gate

**`npm run check:spec-sentence-reuse`** (`scripts/check-spec-sentence-reuse.py`),
wired into `.github/workflows/validate.yml` as a **gating** step, with
**`npm run test:spec-sentence-reuse`** (19 assertions) gating alongside it.

- It keys on the **sentence**, never on `(field, sentence)` — a tagline pasted
  into `intro` is the same reused line, and a field-scoped key would let it hide
  by moving. The 171 and the 148 above are therefore one index entry covering
  181 specs; the per-field split is what tells you where to fix it.
- **Delta-scoped**, the same design as `check-locale-translation.js` and
  `check-faq-schema.js` and for the same measured reason: 416 of 591 specs are
  already in the backlog, and a state check red on every PR regardless of what it
  touched is a check people learn to ignore. A sentence counts against a branch
  only when the branch puts it into a spec that did not carry it at the merge
  base. Pre-existing reuse is **reported, never silenced**.
- **Threshold:** a sentence already in **3 or more other** specs. Two specs
  sharing a line is a coincidence; four is a template forming.
- **Floor:** sentences under 25 characters are ignored. "Free, no sign-up." is a
  fragment where reuse is not meaningfully avoidable.
- **Scope:** `hero_tagline`, `meta_description`, `intro`, `cta`, `title` only.
  Scanning every string field would pull in slugs, hrefs and symbol labels, where
  reuse is correct.
- `--audit` prints the whole-corpus picture (`npm run audit:spec-sentence-reuse`).

Verified per CLAUDE.md's own rule before being trusted ("Adding a validator
script is not the same as gating on it"), against real inputs on the live tree:

- **Catch** — pasting the 181-spec tagline sentence into
  `data/library_page_specs/algeria-emoji-combos.json` reports `reuse introduced:
  1`, `pre-existing: 2`, **exit 1**.
- **Non-catch** — replacing it with page-specific copy ("Green, white and the
  crescent star of the Algerian flag…") reports `reuse introduced: 0`, **exit 0**.
- The unit tests were themselves probed against three deliberately broken
  variants of the script — dropping the self-subtraction so a spec is counted
  against itself, treating pre-existing reuse as introduced, and reverting to
  field-level keys — and each one turns the suite red.

**Note the direction of the fix.** The failure message does not ask for a synonym
swap; Google's spam policy names *"automated transformations like synonymizing"*
as scaled content abuse, so trading words to pass would move toward the policy.
It asks for a sentence about *this* page — what the symbol is for, where it
breaks, what it is confused with — or, when a line genuinely must be shared, for
it to live in the generator default where it is one string with one owner.

**Not started: the 416-spec backlog.** This gate is forward-only by design. The
existing reuse is a separate, explicitly-approved remediation pass, and
CLAUDE.md's standing rule applies — do not begin a bulk cleanup unless it is part
of an approved task.

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

1. ~~**Four printables generators** — 184 pages, four edits, clears em dash and
   template debt at once. Zero risk: no live HTML changes until the next
   generation run.~~ **DONE 2026-08-26, and the "zero risk" clause was wrong** —
   see §1a. The copy is fixed in the generators; the regeneration that would
   apply it is blocked because these generators would delete five shipped
   repairs, and a guard now enforces that. Live pages are unchanged.
2. **The CTA default + 89 specs** — 421 English pages plus their translations.
3. ~~**A spec-level duplicate-`lead` check** — stops item 3 recurring.
   Prevention, not repair.~~ **DONE 2026-08-26, at a different granularity** —
   `lead`-level comparison finds zero duplicates in the whole corpus and would
   have shipped a permanently-green gate. `npm run check:spec-sentence-reuse`
   compares **sentences inside** the copy fields instead; see §3's correction.
   Prevention only — the 416-spec backlog it measures is untouched.
4. **`scripts/build_category_locale_pages.py` (284 em dashes) and
   `scripts/answer-pages-content.js` (198)** — the two densest code sources.

**None of this is approved work.** This document is a findings ledger. Promotion
into production goes through the normal process, and while the publishing freeze
is in force a generator edit that changes no live page is the only part of it
that is even eligible.
