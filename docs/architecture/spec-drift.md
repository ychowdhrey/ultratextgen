# Library specs and their pages — spec drift

*Added 2026-11-18. Owner rule of the same date.* Rule: `.claude/rules/localization.md` §4a.
Definition: `scripts/lib/spec_drift.py`. Gates: `check:spec-drift`, `check:locale-spec`.
Dashboard: `npm run audit:spec-drift`.

## Why it matters

A file in `data/library_page_specs/` is two things at once: the source
`generate_library_page_from_spec.py` renders a page from, and the source every locale
of that page is translated from. When a page is repaired or extended by hand and the
spec is not, both uses break, and neither break is visible:

- **Regenerating deletes the hand work.** The generator's overwrite guard
  (`scripts/lib/generator_parity.py`) refused to drop the footer, hreflang, social art
  or a moved FAQ, but not copy tiles, so a regenerate removed tiles without a word.
- **A locale translated from the spec ships short.** `es/library/emojis-graciosos`
  shipped 35 of its English parent's 75 tiles and `es/library/emojis-de-estaciones` 40
  of 72. The English specs carried the combos in a per-section `combos` field the
  generator never read; the English pages had been hand-written with them.

## The rule

1. A page that is **not localized** (its intent's origin or reference page) has no
   reason to differ from its spec. It must match, and no exception is accepted for it.
2. A **localized** page may differ from its spec only when it was further localized for
   its language. That decision is recorded in `data/spec_drift_exceptions.json`: the
   exact tiles it excuses, the reason, who decided and when. The file ships empty.
3. **A page needs a spec before it is localized.** The reference page of every locale
   spec must itself be generated from a spec, so a localization request starts by
   checking that spec, and building it first when there is none.

## What is compared

Copy tiles: every `.symbol-tile` button's `data-symbol` (what the reader copies) and its
visible `flag-label`, against the spec's `sections[].combos` and `sections[].symbols`.
Characters are compared as a multiset (order is presentation); labels per character.
Excluded, because another generator owns them: the pre-rendered collection and flag
grids (`BEGIN/END prerendered` blocks) and the symbol-page hero tile.

## Measured 2026-11-18

Before the repair, 146 of 1,616 specs disagreed with their page on characters:

| Cause | Specs | Which side was right |
|---|---|---|
| page has tiles the spec lacks | 64 | the page |
| spec lists a tile twice; the page was de-duplicated | 43 | the page (2 exceptions, below) |
| spec holds the NFC form of a character the page copies (Kelvin sign K → K, Ohm sign Ω → Ω, no-break space → space) | 17 | the page |
| both ways (translated checkmark payloads still English in 6 specs, shirt numbers, curly quotes, a swapped tile) | 18 | the page, except `degree-symbol` |
| spec holds an entity code where the page copies the character (`&amp;` vs `&`, de/ja/ru) | 3 | the page |
| a rune punctuation trio listed in two sections | 1 | the page |

Labels were measured too: 83 specs carried a visible label the page no longer shows.

**Repaired.** The generator renders a section's `combos` (shipped in parallel by
ychowdhrey/ultratextgen#1233, with its `mix_intro` hand-off line and its own gating test;
this change adds combos-only sections, which `emoji-combos` needs). The two Spanish
pages gained their 72 combos in that same PR. `emoji-combos` gained the 25 combo sections
(200 tiles) its page had grown; `unit-measurement-symbols` its Angles section; 76 specs
were written back from their page, NFC-fragile characters stored as `\u` escapes so an
editor's normalization cannot undo them again.

**The two de-duplications that were wrong.** `fr` and `es` LinkedIn pages had removed ☑
and ☒ from the Boxes group because the same characters also appear under Checks and
Crosses. On the English page that repeat is deliberate (☐ ☑ ☒ is the Boxes trio), so the
locale pages were the degraded side: their specs were left as they were and the two
tiles restored on both pages. `check_locale_spec.py --base` caught this on its first run.
Not every hand edit is a correction; compare with the reference before trusting one.

**Second pass, same day (owner: "go ahead" on the backlog).** All of it was closed:

- **121 specs written back from their pages**: 56 whose page had more tiles (missing
  sections appended in page order) and 65 whose labels had moved on. Each was checked
  against its reference page first: none moved a locale spec away from its reference's
  tile count, and the one page label that was untranslated English (tr party emojis,
  "Cupcake") was corrected on the page instead. Labels are no longer compared on tiles
  that show none (bare symbol grids).
- **`degree-symbol` takes the union** (owner: the spec is more complete). The English page
  gains the spec's four tile sections, the spec the page's three look-alikes: 28 tiles,
  as the es sibling already had. Its 18 siblings were brought to the same set (13
  hand-built pages gained the sections, labels taken from each locale's own pages where
  the site already names the character; de, pl and zh-tw spec and page together). The
  tile labelled "Kelvin Sign" copied a plain K on five of them; it now copies U+212A.
- **91 English pages had no spec**, including the reference page of all 298 locale specs
  whose reference had none. Each now has one, built from the live page (tile and art
  sections, combo rows, combo sets read from the page's own `buildGrids` call, editorial
  sections, FAQ, related cards, hreflang), validated by the generator and reproducing
  the page's tiles and labels exactly. They carry `hand_built_page: true`: the generator
  refuses to render such a spec over its page (exit 5), because the spec does not describe
  the page's editorial layout. The generator's three-heading minimum now counts the
  editorial and FAQ headings a page renders.
- **`check:spec-sentence-reuse`** treats a sentence in a new `hand_built_page` spec as
  pre-existing when its page already carried it at the merge base (visible text or meta
  description): a backfill records copy, it does not publish it. A sentence the backfill
  adds that the page never had still fails.

**Still open:** the three footballer combo specs (`di-maria`, `nkunku`, `rodrygo`), held by
the open keep-or-fold decision on those pages; 1,641 locale library/symbol pages have no
spec. The owner rule needs a spec on every page a locale is translated from, which now
holds; a spec for each localized page would add about 20 MB of JSON and is not done.

## Why the gates are deltas

Reading every locale spec has a backlog: 559 errors once `--all-locale` stopped skipping
the per-locale subfolders, where it had read 318 of 1,222 locale specs and reported 0
errors over 302. `check:locale-spec --base <ref>` reruns the same check against the merge
base's tree, read straight from git (`scripts/lib/git_tree.py`, no 840 MB worktree), and
fails only on errors whose text, digits aside, is not already there. A pre-existing count
error that gets worse in a PR therefore still passes: only a new kind of error on a
spec fails. `check:spec-drift` compares each pair a PR touches at the merge base and at
HEAD, so a repair that moves one side toward the other adds nothing and passes.

Probes run 2026-11-18, each on files outside the branch's changed set: a tile added to a
not-localized page (1), a locale tile changed (1), the same excused by a ledger entry
(0), an exception on a not-localized spec (1), a heading edit (0), a page label edited
(1), a partial repair of pre-existing drift (0), a new locale page without a spec (1), a
new locale spec whose reference has none (1), an unreadable base and ledger (2, 2). The
locale check: the Spanish combos dropped again, a clean `de` spec losing a tile, the
English reference gaining a tile (1 each against a base without the defect), a bad base
(2), a clean tree (0). Replayed against `origin/main`, the first and third read as known,
because `main` still carried the defect: a delta gate is right to pass there.
