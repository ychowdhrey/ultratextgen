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

`scripts/lib/generator_parity.py` makes the remaining gap loud. Before writing,
each generator diffs its output against the live page and **refuses to overwrite**
(exit 4) if the live page carries anything the new page lacks, naming the file,
the missing element, and the pass that owns it. `--force-stale` overrides and
prints what it is overriding. Verified by probe: a real run now exits 4 with
nothing written; `npm run test:generator-parity` holds it there with 14
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

## 2a. Acting on §2: the CTA card, routed and instrumented (2026-08-26)

### The framing in §2 above is half wrong, and the correction changes the fix

§2 counts the shared CTA card as template debt on 421 English pages. Re-measured
site-wide it is bigger than that — **3,951 pages carry a CTA button, and 2,758
(69.8%) point at a bare homepage**:

| pages | family |
|---:|---|
| 1,340 | `library/` |
| 1,153 | `symbol/` |
| 100 | `usecase/` |
| 44 | `guide/` |
| 34 | `answers/` |
| 19 | `events/` |

But **the homepage is not a dead end.** `/` and `/<locale>/` *are* the font
generator, so "Open UltraTextGen →" pointing there is a real tool, not a shrug.
The 69.8% is "points at the generator", not "points nowhere", and any plan built
on the second reading would have churned 2,758 pages to fix a problem that size
does not exist.

The defect is narrower: **pages whose reader has a different next job are sent to
the generator anyway.** A reader who has just copied `€` off `symbol/euro-sign`
does not need to restyle text; they need to know whether it fits in the field
they are pasting into.

### Two blockers found before touching anything

**1. `generate_library_page_from_spec.py` is stale — worse than the printables
four, not better.** §1a told the next session to run one command and read `git
status`. Run against a 40-spec sample, **40 of 40 pages regressed**:

| lost | pages |
|---|---:|
| static footer markup | 40 |
| hreflang alternates | 35 |
| social image tags | 21 |

It had been read as "probably fine" because it emits the Funding Choices tag and
calls the mesh sync. **The mesh hook does not save it**: that hook runs only when
`lang != "en"` and only *after* the write, so an English library or symbol page,
which carries live hreflang alternates pointing at every locale sibling, loses
them outright.

Fixed by wiring the same guard in, and renaming it: `scripts/lib/printables_parity.py`
→ **`scripts/lib/generator_parity.py`**, since nothing in it was ever
printables-specific except the name and it now has five callers. Verified with
four probes — a real regeneration exits 4 having written nothing, `--force-stale`
writes and reports what it overrode, `--dry-run` is unaffected, and a brand-new
page is not blocked.

*(Method note, since it bit twice in this session and CLAUDE.md documents it
twice already: the first reading of that probe reported `EXIT=0` because the run
was piped through `head`. `$?` is then head's status. Read the exit code without
a pipe.)*

**2. The card was not instrumented at all.** No `dataLayer` push, no `gtag` call,
no click listener on `.cta-btn` or `.cta-card` anywhere in `script.js` or `js/`,
and no entry in the analytics event registry. There was no way to answer *"what
does this card convert at"*, and therefore no way to know whether changing it
helped.

`cta_click` now fires from **`header.js`**, not `script.js` — of the 3,955 pages
carrying a CTA button, **3,955 load `header.js` and only 148 load `script.js`**;
instrumenting from `script.js` would have measured 3.7% of the surface and looked
finished. Payload carries `cta_href`, `cta_destination_type`, `cta_text`,
`cta_source_family`, `cta_source_locale` and `cta_source_path`. It is
**dataLayer-only** until a GTM trigger and GA4 tag are created by hand, the same
manual step `save_style` needed; an empty GA4 report is not evidence of no
clicks.

Locale detection reads the site's own `NAV` table rather than a `/^[a-z]{2}/`
regex, because **`/js/` is a real two-letter top-level directory here and is not
a locale**. Asserted in `header.test.js`.

### What was routed, and what deliberately was not

`scripts/lib/cta_routing.py` is the single owner of the decision and its copy.
The table is small on purpose — a page moves only where the site has a tool that
does a job the generator does not:

| source | pages | destination | the reader's next job |
|---|---:|---|---|
| `symbol/*` | 88 | `/character-counter/` | just copied one character; will it fit |
| `library/*kaomoji*`, `*emoticon*` | 30 | `/kaomoji-generator/` | build a face that is not on the page |
| `library/*combos*` | 96 | `/usecase/bio-font/` | the combo is going in a bio, which has a limit |
| everything else | — | unchanged | the generator is already the best destination |

**214 pages.** The other 26 EN pages in scope were skipped because someone had
already pointed their card somewhere specific; those are never reclaimed.

**No locale page routes, and that is not a translation problem — the
destinations do not exist.** There is no `/fr/character-counter/`, no
`/es/kaomoji-generator/`, no locale build of any of them (the only match is
`embed/character-counter`, an embed). Sending a French reader to an English tool
is exactly what CLAUDE.md's locale-native internal linking rule forbids, and the
locale homepage already *is* that locale's generator. So 2,285 locale pages keep
their card, correctly. `route()` returns `None` for every `<lang>/` path, and a
test asserts it.

### Two design constraints that shaped the implementation

**The copy could not go in the specs — this repo's own gate would have failed
the PR.** Writing three cards into 214 spec files pastes one sentence into 96
specs at a time, which is precisely what `check-spec-sentence-reuse.py` (shipped
hours earlier) exists to fail. That gate's own failure message names the fix:
*"If a sentence genuinely must be shared, it belongs in the generator default,
not copied into N specs."* So `cta_routing.py` is that owner, read by **both**
the generator and the in-place pass, which is why a regenerated page and a live
page cannot disagree about the card.

**A copied-in default is not an override.** 55 specs "override" `cta` with the
shared default sentence byte for byte. Honouring that literally produced a routed
card with a matched heading and button above a paragraph about something else —
seen on `library/cat-kaomoji`. Routing therefore wins over a value equal to the
known default, and loses to genuinely page-specific copy.

### The copy states facts, checked against the destination

Per the remediation principle (generic claim → concrete information, never a
synonym swap), every number is read out of the destination itself, and a test
reads the limits back out of `js/counter/counterRules.js` so the card cannot
drift from the tool it describes:

> **Check it against the field you are pasting into.** A Discord nickname stops
> at 32 characters, an Instagram bio at 150, a TikTok bio at 80, and X weights
> some characters as two. The counter reads all of them at once.

No em dash appears in any of the new copy; the em dash rule is forward-only.

### What this does and does not claim

**It does not lower the Editorial Footprint Risk score**, and should not be sold
as doing so. A shared card replaced by three shared cards is still a template —
`variety` stays near zero. What changed is that the card is now *useful* and
*measurable*. Saying otherwise would be scoring the metric rather than the site.

**And there is no before/after.** The routing shipped in the same pass as the
instrumentation, at the user's explicit direction after this was raised, so no
baseline window exists. What the payload does support is a **cross-sectional**
read from day one: homepage-pointing buttons still exist in quantity (all 2,285
locale pages plus every unrouted EN family), so `cta_destination_type` can be
compared across concurrent traffic. That is weaker than a pre/post and should be
reported as such.

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
