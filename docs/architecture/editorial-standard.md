# The editorial standard — what was measured, and the passes that applied it

Invariants: `.claude/rules/editorial-copy.md`, `.claude/rules/editorial-footprint.md`.
Scoring, weights and thresholds: `docs/editorial-footprint-risk.md`,
`docs/editorial-footprint-research-2026-08-26.md`, `docs/efr-quality-gate.md`.
Em-dash policy of record and the per-locale table: `docs/em-dash-policy.md`.
Corpus evidence: `docs/editorial-phrase-frequency-2026-08-26.md`,
`docs/editorial-footprint-upstream-findings-2026-08-26.md`.

## The finding that shaped everything else

**The widely-cited marker list does not describe this site.** Across 904 indexable
English pages, `delve`, `showcase`, `tapestry`, `in today's`, `at its core`, `when it
comes to`, `it is worth noting`, `robust`, `vibrant`, `pivotal` and `comprehensive`
occur **zero times**.

Two of its apparent hits are worse than misses:

- **`transform`** — 911 occurrences on 443 pages — is the shared CTA card ("Transform
  text with Unicode fonts"). **One template string, not vocabulary.**
- **`underscore`** — 169 occurrences on 65 pages — is the **character `_`**, in factual
  platform username rules. **Banning it would delete facts.**

What the site actually carries is **52,766 em dashes on 98.9% of pages** and one CTA
card on 46.6% of English pages — and **6,918 of those em dashes are hardcoded in 572
spec files and 116 generator scripts.** The footprint here is a build artifact far more
than a writing habit.

Which is why every pattern is measured with a `variety` figure (distinct containing
sentences ÷ pages):

- **variety ≈ 0** — one shared string. **Fix the template.**
- **variety ≈ 1** — the same idea written many times. **Fix the writing.**

Asking 220 pages to each hand-edit one shared string is the failure that distinction
exists to prevent.

## Removing em dashes: by leverage, at the source (user-directed, 2026-09-02)

The forward-only default was **overridden by the user**, who asked for as many em
dashes removed as possible. How that was executed matters, because the *how* is what
keeps it from becoming the purge the rule warns against.

**Rank before editing.** The site's 118,000 em dashes are not 118,000 decisions.
Grouping em-dash-bearing strings by how many pages share them verbatim turns the top of
that list into a handful of template strings. One CTA line accounted for ~1,800 pages
across 17 languages; one tile-label format accounted for 2,915 more. **10,010 page
instances came out of ~1,320 authored decisions**, and nothing below the template tier
was touched.

**Every change is one of the phrase bank's own listed remedies** — never a synonym swap
and never a deletion: a full stop where the second half is a separate thought (the
CTA's "…and 100+ other Unicode font styles. Free and instant."), a comma where a
verdict meets its qualifier ("No, only letters and numbers"), a colon where what
follows explains what precedes (`Name (U+XXXX): gloss`). **Every word survives in every
string; only the joint moves.** `ko` and `tr` had already written the CTA as one flowing
sentence and were left alone — they were the model, not an omission.

**Fix the spec, not only the page — and remember the locale spec directories.**
`data/library_page_specs/` has 628 EN specs *and 885 more under
`data/library_page_specs/<lang>/`*. A count taken with `*.json` sees only the first
set. That was nearly this pass's mistake, caught only because a recursive count came
back higher than the glob count **and the discrepancy was chased rather than assumed to
be corruption.**

**Three things this class of pass will surface, none of them its own bug:**

- **A stale-schema split.** Anchoring a rewrite on `>` or `"` reaches the JSON-LD copy
  of a FAQ answer and not the visible one, because the visible half starts on its own
  line after the wrapper tag. Widen the anchor to allow the newline, and check
  `check-faq-schema` before committing.
- **Pre-existing mesh defects on pages the pass merely touched.** Bringing 2,013 locale
  pages into diff scope surfaced six German pages linking English hubs that have German
  equivalents. Repair with `sync-locale-mesh --fix` **scoped to those files**, never
  site-wide.
- **False "introduced English" reports.** See
  `docs/architecture/translation-parity.md` §6 — that gate needed fixing, not the
  content.

**Do not extend this to prose.** 83,730 em dashes remain in locale pages and 17,160 in
English, and each of those is a sentence with its own decision.

## Clean on touch (user direction, 2026-09-02)

The two halves of the policy were written the same day by two sessions and reconciled
on merge: **source fixes ranked by leverage, and clean-on-touch for the prose.**

Three definitions carry the rule, each chosen against a real case:

- **"Touched" means the page's own copy moved** — title, meta description, H1, headings,
  prose or FAQ text differs from the merge base. A card injected by the peer-link sync,
  a regenerated footer or hreflang block, a rebuilt library directory, an asset swap:
  none of those is a touch, because **a mesh pass that rewrites 1,009 pages must not
  demand 1,009 rewrites.** Once a page *is* touched, its cards count too.
- **A template-level change is not a touch (user decision).** The first large diff the
  rule met was the template-tier pass itself: **499 pages read as copy-touched and were
  billed 7,983 inherited em dashes**, though nobody had written on any of them. So a
  page is touched only by a change of its own. Two shapes are carved out: a string
  added or removed verbatim on **three or more** changed pages in the same PR (one
  string on many pages is a template by the `variety` definition), and a string whose
  **punctuation or case alone** moved — the same rule the sitemap's significance hash
  applies, so the two systems cannot disagree. A page carrying a template change *and*
  a sentence of its own is still touched; a new page always is. Replayed, the rule
  stopped reading that pass as 499 copy edits.
- **An English touch pulls the locale siblings along.** Anchored on English on purpose —
  it is where pages are born and where the standard is applied first — so a
  translator's one-line fix never obliges an English rewrite, and a new locale batch
  never obliges the cleanup of every parent it translates. **The cost was chosen with
  the number in view:** editing `symbol/euro-sign` pulls 18 siblings carrying 159 em
  dashes.
- **Generated inventory is not the hub's copy.** `[data-static-directory]` is rendered
  from other pages by the hub builders and is dropped from measurement — a hand edit
  there is overwritten by the next build, and `es/library/index.html` carried 144 of its
  157 em dashes inside it. The EN hub's own `LIBRARY` array is the one exception: 25 em
  dashes in a script block nothing measures, cleared through the array and a rebuild.

Two things this surfaced. `.related-card` had never been in the card slot, so the
updates hub's eleven dated labels ("Aug 12, 2026 — Telegram …") and the "Keep reading"
grids on 193 pages were invisible to every rule — one page shipped its tone rewrite with
one em dash left in exactly that slot. And when the gate names a spec or generator, the
fix goes there.

**Shadow mode.** The three em-dash rules print "would block" rather than failing, except
that an em dash a branch *introduces* exits 1 in every mode. Promotion is one workflow
line per rule. **Do not turn `--enforce` on bare:** `seo-preservation` would ride along,
and a deliberate retitle (which the tone standard requires) still has nowhere to record
its intent.

## The specs were repeating themselves

Page copy is hand-written once per spec and **nothing compared the specs to each
other**: **45 sentences repeat across more than one spec and 416 of 591 carry at least
one**, led by a `hero_tagline` on 171 and the same line as a `meta_description` on 148 —
which makes it an SEO defect as much as an editorial one.

It keys on the **sentence**, never on `(field, sentence)`: a tagline pasted into `intro`
is the same reused line. **Field-level comparison — the obvious design — finds zero
duplicates in the whole corpus** and would have shipped a gate that could never fire.

## Routing the CTA card (2026-08-26)

The shared CTA card sits on **3,951 pages, 2,758 of them (69.8%) pointing at a bare
homepage.** The obvious reading of that number is wrong and worth stating before anyone
acts on it again: **`/` and `/<locale>/` ARE the font generator**, so "Open UltraTextGen
→" pointing there is a real tool, not a dead end. The defect is narrower — pages whose
reader has a *different* next job being sent to the generator anyway.

So the routing table is deliberately small: **214 English pages**, moved only where the
site has a tool the generator is not.

**No locale page routes, and that is not a translation gap — the destinations do not
exist.** There is no `/fr/character-counter/`, no `/es/kaomoji-generator/`, no locale
build of any of them. Linking an English tool from a locale page is what the
locale-native rule forbids, and the locale homepage already *is* that locale's
generator. `route()` returns `None` for every locale path and a test asserts it. **Do
not "finish the job" by routing them.**

**It does not lower the EFR score and must not be described as doing so.** One shared
card replaced by three shared cards is still a template; `variety` stays near zero. What
changed is that the card is useful and, for the first time, measurable — see the
`cta_click` event, which fires from `header.js` rather than `script.js` because **3,955
of 3,955 CTA pages load `header.js` and only 148 load `script.js`.**

**The SEO Preservation Gate blocked its own author here, and was right.** The first
draft of the new copy dropped `ultratextgen` from the editorial text of all 214 pages —
the old card was its only occurrence outside URLs and JSON-LD — and the gate reported
`protected-term-lost` on every one. The fix was to **put the product name back where
each sentence already named the tool**, never to exempt the rule.

## The EFR gate had to be taught about Sources blocks, and the fix is not the obvious one

Adding a Sources block to a short page is a blocking EFR regression: the block one
locale `updates/` entry was missing moved it 10.8 → 12.1 on `specificityDeficit` **for
the act of citing the publisher's own patch notes**, and cutting it to the bare citation
still landed on +0.5, the material threshold exactly.

A Sources block is **apparatus** — deliberately formulaic across pages, and its "facts"
are publisher names and URLs rather than codepoints or limits — so
`scripts/lib/editorial-corpus.js` drops Sources sections before scoring, the same call
as `[data-static-directory]`.

**It matches the section by its LABEL, via the one registry in
`source-attribution.js`, never by `.source-note`:** keying on the class drops the block
on one side of a diff and not the other for any branch that introduces the class, which
turned one blocked page into **37 regressions** on the first attempt. **What a section
*is* does not change when its markup does.** The baseline was regenerated in the same
change per the re-baseline rule (336 entries moved; 49 carry a Sources block, 287 were
pre-existing drift).

`.flag-grid-section` joins the same drop list: the group names are already captured as
`ui` from the script, and billing 898 pages under clean-on-touch for markup a hand edit
cannot change is exactly what that selector exists to prevent.

## Reading a high score

`docs/efr-quality-gate.md` §9 before calling one a defect: `specificityDeficit` reads a
fixed fact vocabulary, so a 2,983-word guide built on fourteen worked archetypes scores
17.5 for naming five recognised facts. **That is what the exception ledger is for.**

Widening the vocabulary is a **re-baseline event**. On 2026-09-02 a widening moved the
cohort median and **three guides crossed into FAIL without a word changing**, because
the bar their cohort demonstrates rose. The ratchet itself is unaffected, since it
scores both sides of a diff in one corpus.
