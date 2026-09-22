---
paths:
  - "{ar,bs,cs,da,de,es,fi,fr,hi,hr,hu,id,it,ja,ko,ms,nl,no,pl,pt,ro,ru,sk,sr,sv,th,tl,tr,vi,zh-tw}/**"
  - "locales/**"
  - "i18n.js"
  - "data/{core_parent_set,locale_qualification_tiers,locale_parent_gap_audit,english_parent_exceptions,parity_catalogue_pages,translation_parity_exceptions,translation_identical_strings,numeric_parity_exceptions,locale_glossary,library_hub_i18n,em_dash_locale_policy}.json"
  - "data/library_page_specs/*/**"
  - "scripts/**/*{locale,translation,hreflang,parity}*"
---

# Localization invariants

Deeper reference: `docs/locale-parent-governance.md` (registries, flowchart,
tooling), `docs/library-locale-translation-workflow.md` (the batch procedure),
`docs/local-language-intelligence.md` (vocabulary library),
`docs/architecture/translation-parity.md` (why each parity axis exists).
Ratified local-only exceptions and their reasoning: `docs/decisions/local-only-locale-exceptions.md`.

**For a translation batch, use the `locale-batch` skill.** This file is the set of
things that must remain true; the skill is how to achieve them in order.

## 1. The English-Parent Rule

Every non-English page needs a **live English parent** — the same feature,
category, symbol or library page already shipped at its canonical non-locale URL.

- **Yes, a parent exists** → proceed as a translation: reuse the EN page's
  structure and JS wiring, translate the copy, wire full reciprocal `hreflang`.
- **No parent** → do not build the localized page. Build the English version
  first, then translate. A genuinely local-only concept is a **discussed, explicit
  exception**, never a default, and it is recorded in
  `data/english_parent_exceptions.json` — the ledger `check-locale-parent-gap.js`
  reads. Prose is the reasoning of record; the ledger is the state.
- **When EN demand appears later for a page holding an exception**, do not build
  the parent directly. Run "check who already owns it" against the **English**
  SERP first. Two outcomes only: **build** (EN SERP distinct, no existing owner) or
  **veto** (EN SERP consolidates the term onto a page we already own) recorded as a
  dated `verdict`. Demand never auto-triggers the build.

## 2. hreflang reciprocity includes the page itself

Every page's hreflang block carries a **self-referencing entry for its own URL**,
and `x-default` points at the EN canonical — never at the page itself on a non-EN
page. The missing self-reference is this site's single most-repeated mesh bug.
Absence and correctness are separate questions: a page with no `x-default` at all
is a different defect from one pointing the wrong way.

Four distinct mesh failure modes exist, and each needs its own pass: pairwise
non-reciprocity, **mutual** omission (no edge in either direction, so nothing for a
reciprocity walk to catch), a **cross-cluster** edge (perfectly reciprocal and
still wrong — two EN parents claiming one translation), and a missing `x-default`.

**Never hand-edit hreflang tags or a locale page's internal links** to route around
a gap. Run `npm run sync:locale-mesh -- --fix`, scoped with `--files` to the pages
you touched — a site-wide `--fix` is intentionally unscoped and must have its diff
reviewed before committing. Ratified local-only pages deliberately do **not** form
a full sibling mesh: a tool-made hreflang change to one is a bug to revert.

## 3. Locale-native internal linking

Whenever you create or edit a locale page's prose, FAQ or outbound links — the
locale **homepage** most of all — every sub-topic link must point at that locale's
own page when one exists, never at the English `/category/`, `/library/`,
`/usecase/`, `/guide/` or a platform root.

Two failure modes, both real: **miswired** (a link exists but points at English)
and **missing** (a rich single-topic section links nowhere at all). Both let the
existing hub cannibalize its own spoke. Before shipping: list that locale's pages,
check every in-depth prose section against them, and verify — do not assume — that
the target file exists on disk.

**Do not add a link a deliberate decision withholds.** `answers/` is intentionally
unlinked from every locale homepage and `symbol/` intentionally has no nav entry —
see `.claude/rules/content-architecture.md` and `docs/decisions/content-lanes.md`.
This rule pushes toward adding missing locale-native links; those two are not missing.

## 4. Translation parity — after both pages exist

When you edit a page in an hreflang cluster, ask whether the edit is **structural**
(a new internal link, FAQ item, section, symbol tile, table) rather than wording.
If it is, update the sibling(s) in the same change **or** record why they diverge in
`data/translation_parity_exceptions.json`. This runs in **both** directions.

Divergence must be an explicit, agreed decision — never silence. Do not add a
parity exception unilaterally.

**Repairing drift is not creating it.** A backfill necessarily touches one side
only; the gate measures convergence toward the untouched sibling and reports such
pairs rather than failing them. When the gate flags a pair, sync it — do not reach
for the ledger.

## 5. Structure is not language

A page can pass every structural, schema, asset and mesh gate and still be in the
wrong language. A locale page must not carry English verbatim from its own EN
parent in **any** slot:

- body prose and CTA cards,
- **visible** tile labels — a tile carries its name twice (`aria-label="Copy X"`
  *and* `<span class="flag-label">X</span>`); translating only the aria-label
  leaves the visible one English,
- `data-symbol` **clipboard payloads** — the one-click copy is the page's whole
  point, and an English payload pasted from a locale page is the defect.

`npm run audit:locale-translation`, `npm run audit:translation-parity`,
`npm run audit:numeric-parity` and `npm run audit:locale-parent-gap` are the
whole-site dashboards behind the gates named here.

A byte-identical *correct* translation goes in
`data/translation_identical_strings.json` with its reason. **Never use that ledger
to silence a string you have not translated.** A cognate nobody chose is not a
correct identical translation: check that locale's own pages for a word it already
uses first (`npm run audit:locale-attestation -- --locale <code> --strings "…"`).

A **formal identifier is not English** — a Unicode block or character name, a
CSS/LaTeX literal, a keyboard shortcut, an HTML entity, a country name, a platform
proper noun. The exemption is **scoped by slot, not by string**: exempt where it is
*cited* (prose, a table cell, a tile label), still a defect in a heading, card
title, section label or `aria-label`, because those are page copy. Title-case
renderings of character names are **not** exempt; only the ALL-CAPS formal form is.

## 6. Numbers are their own axis

**Do not correct a number on one page of a cluster without correcting its siblings
in the same PR.** Structure, language and schema gates all pass a wrong number.
Separators are locale-specific (13.047 / 13,047 / Arabic-Indic digits) and a
reordered date is not a changed value. A deliberate divergence goes in
`data/numeric_parity_exceptions.json`.

## 7. Locale strings: attested ≠ correct

`npm run audit:locale-attestation` measures only that **no word is invented** —
that every word appears on this site's own pages in that language. Inflection,
collocation and register are exactly what it cannot see, and a spaceless-script
locale's score is not comparable to a Latin one. Read a `partial` verdict as a
question for a human reviewer, never as a defect, and an `attested` verdict never
as "this is correct".

**Never machine-translate a slug or invent a native term for one.** Divergent locale
slugs for one English parent are this repo's signature parallel-session collision —
two paths that merge clean and coexist as duplicates. Read the existing string off
the site before adding one. Wording is each locale's
own, harvested from what already shipped — never translated fresh here.

## 8. Governance

- Run `node scripts/check-locale-parent-tier.js <path> <locale>` **before** starting
  new locale-page work. It is advisory and always exits 0; it tells you whether the
  registry's default is mirror, gate, or skip.
- A **gated-tail** parent, a **Tier-3/held** locale, or a script-incompatible parent
  needs a recorded, passing entry in `data/locale_parent_gap_audit.json`.
- **"Sibling precedent" is never a gate pass.** "Other locales already have this
  cluster" is not demand evidence for *this* locale.
- **Instruments unavailable → hold, don't improvise.** Never fabricate a gap-audit
  entry and never downgrade to a weaker proxy without saying so.
- A locale hold is a default the user can override **explicitly, per batch**, with
  the override recorded in the ledger as a dated, attributed decision; the registry
  keeps stating the standing default. Presenting the hold reasoning *before* the
  user decides is part of the override being legitimate.
- An all-instruments-`null` authorization is a **bridge, not a pass**: it names a
  re-check date and is complete only when real numbers or a dated veto land.
- **Governance arriving mid-flight binds unshipped work.** When merging main brings
  in a new gate or registry, it applies to everything the branch has built but not
  yet merged. Re-run the gates after every merge of main.

## 9. Local vocabulary

The researched lexicon of locally-native vocabulary **does not live in this repo
and never should**; work that needs it attaches the workspace holding it as a
sibling checkout and reads the canonical CSV filtered to `status` in
`{approved, limited_use}`. See `docs/local-language-intelligence.md`.

**Do not mix vocabulary from neighbouring countries or markets without evidence** —
Mexican Spanish into `es_ES`-targeted copy, Portugal Portuguese into `pt_BR`, Gulf
Arabic into pan-Arabic MSA. Each record's `country_or_market` field says which market
it is evidenced for, and its `avoid_when` field says where to skip it. Respect
`content_surface` and `register` too: a phrase flagged for FAQ or example use is not
promoted into a title or H1, and community or gaming jargon does not belong in legal,
accessibility or technical copy.

Use a local phrase only when it naturally fits the exact meaning, platform,
audience and register of the sentence. It supports the page's one primary query
target; it never competes with it, never justifies a new page, and a phrase
discovered in research is never inserted into production copy the same pass.

## 10. Discover locales from the registry, never from a filesystem glob

`zh-tw` is five characters, so `glob("??")` silently skipped 73 of its pages for as
long as that line existed. Read the canonical list from
`data/locale_qualification_tiers.json` (Python) or `scripts/lib/locale-parent-registry.js`'s
`LOCALES` (Node).
