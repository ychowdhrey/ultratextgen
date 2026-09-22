# Translation parity, the hreflang mesh, and the axes each gate measures

Invariants: `.claude/rules/localization.md`. Registries and flowchart:
`docs/locale-parent-governance.md`. Batch procedure:
`docs/library-locale-translation-workflow.md`. Ratified exceptions:
`docs/decisions/local-only-locale-exceptions.md`.

Every gate in this area measures one axis, and the site has shipped a defect through
each of the others in turn. The table is the map:

| Gate | Measures | Blind to |
|---|---|---|
| `check:translation-parity` | internal links, `<h2>`/FAQ/tile/table counts | language, values |
| `check:locale-translation` | English strings surviving on a locale page | structure, values |
| `check:faq-schema` | a page against **itself** | siblings |
| `check:numeric-parity` | a number **replaced** in the same slot while a sibling keeps the old one | wording |
| `check:locale-mesh` / `check:hreflang*` | hreflang edges and locale-native links | content |
| `check:accessibility` | rendered markup | anything not rendered |
| `audit:locale-attestation` | whether every word appears on the site in that language | inflection, register |

## 1. Why parity exists at all

The English-Parent Rule governs *creation*. It says nothing about what happens when
one side of a cluster is edited later and its sibling is not. A batch of Gulf
currency `symbol/` pages (`dirham-sign`, `omani-rial-sign`, `saudi-riyal-sign`) was
added to `library/currency-symbols/` across two PRs on 2026-07-22 with **zero of its
9 locale siblings touched** — including `ar`, arguably the highest-value locale for
Gulf currencies. Nobody was watching for it because nothing was.

`scripts/lib/translation-clusters.js` (cluster discovery) and
`scripts/lib/content-fingerprint.js` (the fingerprint and its diff) are shared by
the audit and the gate, so the two can never define "changed" or "cluster"
differently.

## 2. EN is the source locale — two structural carve-outs

The rule was first written as if EN and a locale page were peers drifting apart.
They are not: **EN is where pages are born.** A new EN page is linked from existing
EN pages immediately and translated later or never. Without allowing for that the
gate fires on essentially every new EN page, and a gate that fires on everything
trains people to ignore it.

**Catalogue indexes do not diff their inventory links.** A pillar index lists the
pages that exist *in its own locale*. EN `library/index.html` carries ~306 content
links; its locale siblings carry 7–50, and every locale `category/index.html`
carries **0**. That gap is correct — a Danish catalogue must not link an English-only
page. For the pillar indexes in `data/parity_catalogue_pages.json` the internal-link
set is dropped from the fingerprint, while **`<h2>`, FAQ and tile counts are still
compared**, so adding a real section still fires. A hub that merely links many
spokes (`library/currency-symbols`) is *not* a catalogue — its links are editorial.

**Adding a link to a page that does not exist in the sibling's locale does not
require that sibling to be touched.** When the only structural change is added
outbound links, each new target is resolved against the sibling's language; if none
has a translation there, the pair is skipped, because linking the English page from
a locale page is precisely what the locale-native rule forbids. The moment a
translation of the target exists, the pair is flagged again — the right trigger,
since the sibling can now link its native equivalent.

Deliberately still flagged in both carve-outs: a **removed** link, a changed
`<h2>`/FAQ/tile count, and a new link to a page that **does** have a sibling in that
locale. `linksUnreachableFor()` is conservative by construction: an unresolvable
target counts as reachable, so an unknown link can never silently suppress a flag.

## 3. Repairing drift is not creating it — the convergence carve-out

The gate infers drift from *"one side moved, the other didn't"*. **That proxy
inverts on a backfill.** A pass that adds content the sibling already has
necessarily touches one side only, so the gate reads the repair exactly like the
damage. Not hypothetical: the locale peer-link sync tripped it **353 times**, in
both directions, with every pair ending up measurably *closer* to its sibling.

`convergedTowards()` scores pairwise divergence before vs. after against the
untouched sibling as a fixed reference, using the same shared fingerprint and score
the audit uses. A **strict** decrease means the page moved toward its sibling and
there is nothing to sync. Applied per-sibling on the EN branch, since one EN edit
can converge toward some siblings while diverging from others. Converged pairs are
**reported** with their before→after scores, never silenced.

Strict `<`, not `<=`, on purpose: trading one divergence for another nets to zero
and is precisely the drift this check exists for.

## 4. The fingerprint must measure content, not metadata

Two defects made the gate report **repairs as drift** — 24 pairs in one PR, none of
which had diverged. Both are third and fourth instances of the same
proxy-inversion pattern.

**`faqCount` counted JSON-LD questions, which is metadata, not content.** The two
routinely disagree — the stale-schema case is the more common FAQ failure mode, and
the site once carried 214 pages of it at once. Backfilling
`category/underline-text`'s JSON-LD from 10 questions to **the 24 its page had been
rendering all along** changed no page copy whatsoever, yet moved `faqCount` by 14
and flagged all 10 of its locale siblings, whose real gap had not moved by one item.

Worse, it set two gates against each other: `check-faq-schema` *requires* the
JSON-LD to match the visible FAQ, and paying that debt cost you a red parity check.
The incentive pointed at leaving the schema stale.

It now counts rendered `.faq-item` elements, covering both house variants. **No-op
for 2,813 of the 2,871 FAQ-bearing pages** — the 58 that differ are precisely the
stale ones. A page shipping orphan schema now counts 0 here; that defect belongs to
`check-faq-schema.js`. Verified the division holds: a JSON-LD-only question added to
`symbol/euro-sign` is **ignored by parity** and **caught by `check-faq-schema`**
(exit 1) in the same run.

**`score()` treated its three count axes as booleans**, so a page 20 sections short
of its sibling scored the same `1` as a page short by one. That silently broke the
convergence carve-out on those axes: a page catching up could only register as
converged by landing **exactly** equal, so every partial step read as no movement.
Both genuine cases in that PR were exactly this — `tr/symbol/dolar-isareti` porting
in a section its EN parent already had (h2 gap 3→2, tiles 5→4) and
`ru/library/html-spetssimvoly` deleting an empty section its parent never had (h2
gap 2→1). Both moved toward their sibling; both were reported as moving away.
Magnitudes fix it.

Verified against four probes, each on a page **outside the branch's changed set** —
and that scoping matters: the first attempt probed pages the branch had already
touched, where a touched sibling legitimately counts as the sync, and all three came
back exit 0, reading as a false green.

## 5. A table was invisible to every axis

`<h2>` came closest and missed the case exactly: a table under a heading that stays
can be deleted outright with links, h2, FAQ, tiles and combo-sets all reading zero.
A PR removed a whole 7-row table from an `updates/` scorecard and its eight
siblings; had it touched EN alone, the gate would have reported nothing.

`tableCount` closes it. **The selector is `table`, not `.data-table`** — the house
class covers 2,353 of the site's 2,470 tables, and `comparison-table` (114) plus
`ig-matrix` (2) carry the rest. Enumerating classes would recreate a known
link-type bug verbatim: a class added later becomes a table nothing covers,
silently. The element cannot go stale.

**Rows are reported, never scored.** They differ legitimately by locale —
`fr/symbol/symbole-paix` carries an extra platform row and an extra input-method row
against its parent, and a longer alphabet always will. Of 3,693 pairs, 64 match on
table count and differ on rows, a set mixing genuine half-ported tables with
differences no edit can converge.

Blast radius measured before landing: **656 of 3,693 pairs (17.8%) already differ on
table count.** The gate is diff-scoped so that backlog cannot make it red, and a
constant pre-existing offset cancels out of the convergence carve-out.

Verified against four probes outside the changed set: deleting a 6-row table from
`symbol/peace-sign` exits 1 **with every pre-existing axis reading 0** — which is
the whole finding; a row added to an existing table exits 0; a meta-description
tweak exits 0; adding a `comparison-table` to `de/symbol/friedenszeichen` exits 1,
which also proves the selector choice, since `.data-table` would have missed it.

## 6. Structure is not language — the three classes

Everything above compares structure. A locale page 90% translated has the same
structure as one 100% translated, so it passes. Every other gate is blind to
language too. **Nothing was checking whether a locale page is actually in its own
language.**

Three classes shipped through all five gates during the 2026-08-15 library
expansion, **each found only after the previous one was fixed**:

1. **Body prose.** Seven pages went live with an English intro paragraph, combo
   blurb and CTA card. Verification had looked at aria-labels, headings and links —
   all genuinely complete — and nothing looked at prose.
2. **Visible tile labels.** Every symbol tile carries its name twice, in
   `aria-label="Copy X"` and in `<span class="flag-label">X</span>`. Only the
   aria-label was translated, so **24 already-pushed pages showed English labels
   under localised buttons**.
3. **Clipboard payloads.** `data-symbol="☑ Done"` pastes English *from a locale
   page* — the one-click copy that is the page's whole point.

**The pattern is the lesson**: each fix caught the surface it was written for and
missed the next one. So the check is not pattern-based. It extracts every
translatable string from the page's **own English parent** (via that page's
`hreflang="en"`) and asserts that none survives verbatim.

The first whole-site run found **2,256 of 3,580 locale pages** carrying at least one
English source string — led by the shared CTA paragraph on **406** pages and
`aria-label="Breadcrumb"` on **527**. That backlog is real and is not the gate's job
to clear, which is why the gate measures the **delta**, compared against the base's
*own* EN parent so an English page growing a new string cannot silently indict every
translation that has not caught up.

**Two comparison rules that are not optional.** Compare extracted string *sets*,
never substrings — a naive `enString in localeHtml` test reports "Dove" as
untranslated on an Italian page, because *dove* is an ordinary Italian word. And a
candidate needs a run of four Latin letters, which keeps glyph tiles (♠ ☮ ✓) and
CJK/Arabic/Cyrillic strings out of the set entirely.

**Punctuation is not English.** The delta rule compares string *sets*, so changing an
existing untranslated string's punctuation makes the same debt, on the same page, in
the same words, a string the base set does not contain — and the gate reads the edit
as an introduction. Third instance of the same inversion. `wordKey()` compares the
words when deciding whether a survivor is the *same* debt as one at the base, and
never when deciding whether a string is English in the first place. Scoped per page,
so a survivor on one page can never excuse a new string on another.

Found by an em-dash pass that rewrote 2,915 tile labels and turned 9 byte-identical
pre-existing survivors into 9 reported introductions. Verified against three probes;
the first attempt at the first probe was a **false green** because it injected a
different string on each side, so there was nothing to survive. **Build the probe as
a real pair.**

**A formal identifier is not English (decided 2026-08-15).** A Unicode block or
character name, a CSS/LaTeX literal, a keyboard shortcut, an HTML entity and a
country name are proper names or code, and the other Latin-script languages cite
them by that same name inside otherwise translated prose — Spanish "en el bloque
Latin-1 Supplement", French "du bloc « Latin-1 Supplement »", German "im Block
Currency Symbols von Unicode". Several locales set them in citation quotes, which is
the tell.

**The exemption is scoped by slot, not by string, and that distinction is
load-bearing.** Both cases exist on this site at once: `Currency Symbols` is a cited
Unicode block name in a `<td>` on `symbol/bitcoin-symbol` **and** a related-card
`<h4>` on 14 other pages. A string-level exemption would silently clear those 14
real defects; verify any change to this rule against exactly that pair.

Both lists are **harvested from the site's own English pages** — block names from
`<td>Unicode block</td>` property rows, country names from `library/emoji-flags`'s
own registry — never hardcoded, for the same reason the art generator reads a page's
own tiles: the site is the authority on what it cites, and the list maintains itself.

**Do not widen this into "descriptive" names.** Title-case renderings of character
names (`Heavy Check Mark`, `Downwards Arrow From Bar`) are **not** exempt — this
site translates them everywhere else, so they are ordinary debt. Only the ALL-CAPS
formal form (`DIVISION SIGN`) is an identifier.

`data/translation_identical_strings.json` holds strings whose *correct* translation
is byte-identical — "Cupcake" in Dutch, "Joystick" in German, Jupiter/Mars/Pluto in
Dutch. **A ledger entry's text can go stale under it**: nine entries stopped matching
when the labels they name were re-punctuated. Re-pointing an existing entry at the
same string is maintenance of a decision already taken.

Verified by injecting one defect per class into a finished Japanese page; the gate
exited 1 naming all three.

## 7. Numeric parity — the axis every other gate is blind to

On 2026-09-01 a commit rewriting **every English** `/updates/` entry to the tone
standard corrected Unicode 18.0 from 13,047 characters to 13,007, and four scripts
to three. It touched 11 English files and zero locale files. **Seven translations
(`ar de es it ko nl tr`) went on asserting 13,047** in their `<title>`, meta
description, OG/Twitter cards, JSON-LD, hero, pill, `<h2>` and FAQ — as current
fact, for a month — while every PR in that window passed the full suite.

Each existing gate was **right** to pass it: 13,047 → 13,007 moves no structural
element; `13.047 neue Zeichen` is perfectly German; and both halves of the FAQ said
13,047, in agreement.

It does not measure "do EN and its translations carry the same numbers" — they
legitimately do not; the whole-site audit reports **671 pages across 24 locales**
diverging today, which is why a state check here would be permanently red. It
measures a **substitution**: a page dropped one number and added another **in the
same slot** while a sibling still carries the dropped one.

Four design choices, each measured rather than guessed:

- **A substitution, never a bare deletion.** Prose gets reworded and numbers dropped
  for innocent reasons constantly; a number replaced *by another number in the same
  slot* is a fact changing.
- **Scoped by slot type**, so EN's `<h2>` losing 13047 is checked against the
  sibling's `<h2>`, never a stray match elsewhere. Page-wide matching drowns in date
  and count noise.
- **Separators normalised.** German writes 13.047 where English writes 13,047, and
  Arabic-Indic digits map to ASCII. Without this the check would report every
  European locale as divergent and nothing else.
- **Three-digit floor, plus the catalogue-page exclusion.** Replayed over the last 52
  commits touching HTML, a two-digit floor fired four times: twice on
  `library/index.html` (per-locale item counts differ **by design**) and twice on bare
  date/version fragments. With both, the replay fires **exactly once — on the real
  incident.** Zero false positives. The cost is stated rather than hidden: a one- or
  two-digit fact that changes ("12 to 15 characters") does not trip this.

**Years are excluded.** `2026` is a date component, not a measured fact, and a
reordered date must never read as a changed value.

Verified by replaying the real incident rather than a synthetic probe: it names all
**7 of 7** siblings and the values `13047` and `172848`. End-to-end, changing
`13,007` → `13,999` on the EN page fails **64** sibling pages. A first draft of the
tokeniser read "May 26, 2026" as the single number `262026`; that bug was found by
reading the replay output, and is fixed by anchoring each group to exactly three
digits.

## 8. The hreflang mesh — four distinct failure modes

**Self-reference** is the most-repeated bug on this site: fixed on 26 `symbol/`
pages, then 356 EN pages site-wide, then 12 more, plus a fourth variant where the
self-reference existed but pointed at a subtly wrong URL. Check self-reference and
`x-default` direction explicitly, not just cross-links between siblings.

**Mutual omission** is invisible to a reciprocity walk, which can only inspect edges
that exist. Found 2026-07-26 by a spot-check: 5 of 8 members of
`library/cross-x-symbols/` each missing 1–2 sibling entries, every gap mutual.
`audit-hreflang-completeness.js` reconstructs true cluster membership from each
page's own `hreflang="en"` — independent of the edges being checked — then requires
every member to link every other. A first site-wide run queued 8,414 links across
1,702 pages; by the time it landed the site had grown, and a fresh run against
current main found **1,980 pages across 277 clusters missing 13,495 sibling
entries**, fixed in one pass.

That run also caught a defect the auto-fixer correctly **refused** to touch:
`fi/kaunokirjoitus/index.html` declared `hreflang="no"` pointing at its own URL — a
mislabeled entry, not a real Norwegian sibling — flagged as a conflict and left for
manual resolution rather than silently overwritten. The fixer also refuses to insert
an entry for a code the file already declares with a different href.

**Cross-cluster edges** (added 2026-08-08) are the third mode and can be **perfectly
reciprocal and still wrong**. Real case: every member of `library/aesthetic-symbols/`
correctly listed `it/library/simboli/` as its Italian page, while
`nl/library/speciale-tekens/` — a member of `library/special-characters/` — listed
that same Italian page as *its* Italian version, and `simboli` listed
`speciale-tekens` back as its Dutch version. Two EN parents claiming one
translation, in both directions, invisible to both existing audits. Never
auto-fixed, because which side is wrong is a content call. Driven to zero in the
same change that added the check, so it **fails the build**.

**A missing `x-default`** (fixed 2026-08-30) was invisible to the direction pass for
the third recorded instance of the same shape: the first line of that pass was
`const xd = …find(x-default); if (!xd) continue;`, so a page that never declared the
tag was skipped in silence, and the audit printed **`x-default not pointing at EN:
0`** while 30 live pages carried none — 25 shipped two days earlier in one Korean
batch. Absence and correctness are separate questions and each needs its own pass.
`--fix` inserts the tag after the block's last alternate, matching that line's
indentation and pointing at the EN member the page itself declares; the insertion is
**additive**, so it cannot disturb a cluster it did not repair, and a page with no
`en` alternate is left alone.

**The upstream cause was a spec, not the page.** Twenty locale spec files with no
`x-default` entry produced twenty pages with none. Fix the spec as well as the page,
or the next generator run puts it back — and note that `check_locale_spec.py` **did**
error on all 20 and the batch merged anyway, which is a branch-protection question,
not a tooling one.

**Placeholder EN-homepage claims** classify separately (2026-08-06): a *subpage*
naming the bare homepage as its `hreflang="en"` is the documented shape of a
ratified local-only page, and the fixer has always refused to repair it — writing it
back would make the homepage link one arbitrary subpage. The audit nonetheless
counted those pairs as blocking, demanding a repair its own fixer declines to make,
which would have turned every PR red the moment the workflow started gating. They
are now reported in their own informational section, annotated against the
exceptions ledger so an *unratified* claim is still visible, and excluded from the
exit code. Homepage-to-homepage claims are a real cluster and are still checked.

A related, structurally-hidden variant is a page that **never declares
`hreflang="en"` at all** — invisible to cluster-membership detection, which requires
that declaration. `audit-hreflang.js` reports these as "Headless targets", so an
occasional manual spot-check remains worthwhile.

**Mesh scoping (fixed 2026-07-26, the same day the caveat was written).**
`sync-locale-mesh.js --files` now scopes **both** passes; the hreflang `--fix` is
forwarded as `--scope-files`, which still scans the whole tree (reciprocity cannot be
judged from a subset) but only writes to the named files plus members of their own
clusters. Before that fix a scoped run stamped a duplicate `zh-TW` alternate onto
two ratified local-only pages in a completely unrelated cluster.

**Duplicate-page clusters** — two members declaring the same locale for one EN
parent — are a content bug, not a completeness gap. Surfaced but never auto-fixed;
resolve by keeping the more-integrated page, 301ing the other, and repointing every
reference.

## 9. Locale-native internal linking — the systemic find

PR #586 fixed 3 instances in the `fr/`, `id/` and `it/` homepages, framed as
isolated bugs found via one-off GSC analysis. A same-day follow-up audit of all 27
locale homepages found the identical pattern in **21 more locales** —
`de/index.html` alone had **13 locale-native pages with zero inbound links from its
own homepage**, including a whole "Discord-Schriftart" section linking to the English
`/discord/` instead of the existing `/de/discord-schriftart/`.

This should have been caught the first time by treating it as a systemic linking
check rather than a one-off bug. **Do not treat a discovered instance as isolated.**

## 10. Locale string attestation

`locales/ms.json` shipped 2026-09-05 with its own `_readme` recording that it had
not been read by a Malay speaker, and nothing could say how much that mattered. The
site's own pages in that language are the next-best evidence: 490 `ms/` pages
already say `Salin`, `ms/library/ruang-kosong` already calls a space `Ruang`, the
`ms/` footer already calls vertical text `Teks Menegak`.

**It measures corpus support, not correctness.** A fully attested string can carry
the wrong inflection — the Swedish `kontrollerat` vs. guessed `kontrollerad` case
above, where both stems are attested and only one agrees — the wrong collocation, or
the wrong register. `attested` means *no word here is invented*, which is a real and
checkable claim, and nothing more. It tells you which strings still need a human; it
never says one does not.

Three matching rules, each from a wrong result rather than reasoned up front:

- **Stem-prefix or substring**, because Korean writes `스타일을` for the bare
  `스타일` and Finnish `kokoelmaan` for `kokoelma`, and a false "unattested" sends a
  reviewer chasing nothing.
- **A script-aware minimum word length**, because a Hangul syllable carries far more
  than a Latin letter and a flat minimum of three discarded Korean 공유 and 없음 as
  `no-evidence-needed`, which reads as *fine* when it means *not checked* (`ko` went
  33 → 52 of 75 on that one fix).
- **Spaceless scripts match whole segments verbatim**, which reads low by
  construction — `ja`, `th` and `zh-tw` numbers are **not comparable** to the Latin
  locales, and the report says so per row rather than averaging it away.

First run: `ms` 64 of 75 attested against a 23-page corpus, with the eleven outliers
named word by word. Of 240 strings added for the `script.js` UI keys the same day,
**202 were fully attested**, and every one of the 17 unattested sits in a
spaceless-script locale or in `hi`, whose corpus is 9 pages.

### Six grid labels were byte-identical to English

`Vertical` in `pt es fr ro`, `Inline` in `de`, `Bullet` in `tl`. The fix was **that
locale's own attested word**, harvested from its own pages — `Na vertical` (31 uses),
`En vertical` (14), `Verticale` (136), `Pe verticală` (4), `Nebeneinander` (16),
`Listahan` (1) — never a ledger entry. The ledger is for a translation that is
*correctly* identical; a cognate nobody chose is not that.

### `fi` and `ms` had no UI strings at all

`UI_STRINGS` in `symbol-explorer.js` is keyed by the two-letter prefix of
`<html lang>` and falls back to `en`. It covered 29 locales and not those two, so 5
pages rendered English buttons under localised headings — invisible while the grids
were JavaScript-only, and about to become static English. Fixed at the root, with
every word attested on this site's own pages in that language, and the two compounds
of attested stems (`Format Salinan`, `Kopiointimuoto`) **flagged as such** rather
than presented as harvested.

## 11. Locale↔locale parity has no mechanism, and that is an open gap

`check-translation-parity.js` diffs EN↔locale pairs only. When
`fr/changeur-de-police/` picked up new content on 2026-07-26, its live IT siblings
(`it/font-copia-e-incolla/`, `it/caratteri-speciali/`) were **not** updated, and
nothing enforced a sync because this is an IT-FR-only cluster with no EN member.
`data/translation_parity_exceptions.json` requires an `enUrl`, so it does not fit
this pair as-is. Needs a decision — port the content, or record the divergence
deliberately — not left to drift by default.
