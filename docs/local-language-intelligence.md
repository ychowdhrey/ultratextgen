# Local Language Intelligence

The Local Language Intelligence Library is a researched, evidence-backed
dictionary of locally-native vocabulary for this site's highest-opportunity
locales. It is **not a translation memory and not a keyword-insertion
engine** — it exists to help copy sound locally native and match real user
vocabulary, applied only where it actually fits.

For every concept (e.g. "fancy/stylish text", "invisible/blank name",
"boxes/question-mark rendering"), per market, a record distinguishes:

1. The literal/dictionary translation
2. The grammatically correct translation
3. The phrase people in that locale naturally *say*
4. The phrase people actually *type* into search engines, forums, gaming
   communities, and social platforms
5. The situations where that phrase is appropriate — and where it isn't

## Where the data lives (changed 2026-08-19 — read this before looking for a local file)

**None of this data lives in this repo, and it never leaves the private
`ychowdhrey/ultratextgen-lab-` repo.** There used to be a generated,
approved-only public snapshot at `data/local-language/<locale>.json` in
*this* repo — it was removed 2026-08-19.

Why: nothing at runtime ever read it (no page JS, no HTML, no Cloudflare
Function — grep confirmed this before removal). Its only consumer was
`scripts/plan-library-locale-batch.py`'s locale-page-planning check. And the
fields it published went well beyond "here's a word we used" — `usage_guidance`,
`avoid_when`, `confidence`, `register` are the actual research reasoning
(what markets are prioritized, what mistakes have already been found and
avoided, why a phrase fits one context and not another), not just its output.
Publishing that into a **public** GitHub repo (confirmed public via the
GitHub API, not assumed) handed a competitor the localization research
playbook for free, for a mechanism that had no live-site reason to exist
outside this one authoring-time script.

**The fix is not "publish less" — it's "don't publish at all."** Any
session/script that needs this data now attaches the private
`ychowdhrey/ultratextgen-lab-` repo as a sibling checkout and reads its
canonical CSV directly:

```
../ultratextgen-lab-/forum-intelligence/language-dictionaries/local-language-lexicon.csv
```

filtered to `status` in `{approved, limited_use}` and the target `locale`.
`scripts/plan-library-locale-batch.py`'s `native_phrases()` is the reference
implementation — copy its approach rather than reinventing the filter.
If that repo isn't attached, the check **fails loudly** (exits non-zero
with an explicit message), not silently — treating "the check didn't run"
identically to "the check ran and found nothing" is exactly the failure
this whole mechanism exists to prevent (see `native: NONE ON RECORD` in
`docs/library-locale-translation-workflow.md`).

This means: **locale-page planning is cross-repo work by default now.**
Attach both repos to the session before running `plan-library-locale-batch.py`
or writing new locale copy that needs a vetted native term. This isn't a new
pattern — it's the same "attach both repos to a single session's scope"
model the lab repo's own `CLAUDE.md` already describes for any work that
needs both strategic research and shippable code.

## Covered locales (confirmed 2026-07-25, extended 2026-07-25)

**Batch 1 (ranks 1–10):** `tr` (Turkish) · `ar` (Arabic — MSA/pan-Arabic
primary, with Gulf/Levant/Egypt/Maghreb noted inside individual records
where evidence supports it) · `es` (Spanish — es_ES/es_MX/es_LATAM split
preserved per record) · `pt` (Portuguese — pt_BR primary, pt_PT differences
recorded where found) · `id` (Indonesian) · `de` (German) · `hu` (Hungarian)
· `ja` (Japanese) · `it` (Italian) · `fr` (French)

**Batch 2 (ranks 11–20):** `th` (Thai) · `pl` (Polish) · `sr` (Serbian —
Latin script; the site currently carries no Cyrillic, recorded as a
negative finding, not assumed) · `ru` (Russian) · `nl` (Dutch — NL primary)
· `cs` (Czech) · `hr` (Croatian) · `ko` (Korean — a "shadow locale," in the
site's `detectLang()` allow-list with 48 live pages but no `locales/
ko.json` shared-chrome file yet; researched the same as any other locale
here) · `tl` (Tagalog/Filipino — Taglish code-switching recorded as
legitimate native usage) · `no` (Norwegian)

This is the top 20 of this site's supported locales ranked by forum-derived
growth opportunity (evidence & demand, coverage gap, competitive weakness,
strategic reuse) as of 2026-07-25. Other supported locales (da, sv, ro, sk,
bs, and vi — the latter deliberately excluded from the ranked build order
for authority/indexing reasons unrelated to content, see the priority
matrix) are not yet covered by this library — treat absence as "not yet
researched," not as "no local vocabulary exists." (`bs` has picked up one
cross-referenced record since as a byproduct of an unrelated content audit
— see the lab repo's own research log; still not a researched locale in
its own right.)

## Record shape (in the lab repo's `local-language-lexicon.csv`)

| Field | Meaning |
|---|---|
| `phrase_id` | Stable ID, e.g. `TR-014` or the newer `TR-20260819-5net7` dated-slug form. |
| `native_phrase` | The phrase exactly as natively written (original script/diacritics preserved). |
| `transliteration` | Latin transliteration, kept separate — never use this in place of `native_phrase`. |
| `english_concept` | Short label for the job the phrase does. |
| `country_or_market` | The specific market this record is evidenced for (e.g. `es_MX`, `pt_BR`, `Gulf`, `DE`). |
| `register` | e.g. neutral, informal, youth/gaming, formal/editorial. |
| `phrase_type` | One of: standard_everyday_term, colloquial_term, community_jargon, platform_shorthand, gaming_terminology, cultural_phrase, borrowed_english_term, search_formulation, problem_description, action_phrase, style_description, relationship_or_identity_phrase. |
| `content_surface` | Where it's appropriate: title, meta_description, h1, h2_h3, intro_copy, faq, button_label, generator_instruction, ready_made_example, internal_link_anchor, pinterest_copy, or none_recommended. |
| `usage_guidance` | When to actually use it. |
| `good_example` | A short example of correct in-context usage. |
| `avoid_when` | Concrete conditions under which it should **not** be used. |
| `confidence` | high / medium / low. |
| `status` | `candidate` / `verified` / `approved` / `limited_use` / `rejected` / `deprecated`. Only `approved` and `limited_use` are safe for production copy — see the core rule below. |
| `last_verified` | Date of the most recent evidence-gathering pass. |

`limited_use` means the phrase is real and verified but register/context-restricted
(gaming-only, FAQ-only, dated/ironic) — usable per its `avoid_when` guidance,
but not as a primary title/H1 term. `approved` is unrestricted subject to the
core rule below. The full schema (including evidence-trail fields not
listed here) is `forum-intelligence/language-dictionaries/schema.json` in
the lab repo.

## The core rule

**Use locally natural vocabulary when it fits the user's exact intent,
platform, audience, and register. Do not insert a phrase merely because it
exists in the dictionary.**

Never:
1. Force every approved phrase onto a page
2. Stack synonym variants inside a title or heading
3. Replace clear standard language with slang unnecessarily
4. Mix vocabulary from different countries/markets without evidence
5. Use gaming language on a general typography page unless that section is
   actually about gaming
6. Use youth/community language in legal, technical, or accessibility copy
   where it would read as inappropriate
7. Repeat a phrase to hit a density target
8. Create a new page only because a new phrase was discovered
9. Change URLs, canonicals, or hreflang solely because a phrase exists
10. Claim a phrase guarantees ranking

## Workflow: writing or editing localized copy

1. **Attach the lab repo** (`ychowdhrey/ultratextgen-lab-`) to the session if
   it isn't already — see "Where the data lives" above.
2. Check `local-language-lexicon.csv` (filtered to `status` in
   `{approved, limited_use}`) for the locale you're editing. If it has
   regional markets, filter to the `country_or_market` that matches your
   target audience.
3. Ask: does one of these phrases fit the *exact* meaning, platform, game,
   audience, and register of the sentence you're about to write? If yes,
   and its `content_surface` matches where you'd use it, use it. If no,
   write the natural/standard phrasing you'd otherwise use — most sentences
   on this site should NOT contain a dictionary phrase, and that's expected.
4. Keep the page's existing single primary query target. A local phrase
   supports that target; it never gets stacked alongside it or used to
   justify restructuring the page. Follow this repo's Hub vs Spoke,
   cannibalization, and English-Parent rules first.
5. If you discover a **new** locally meaningful word/phrase/abbreviation/
   platform term while doing this work — one that isn't in the lexicon —
   do not add it to production copy directly. Capture it in the lab repo
   per its own Continuous Capture Rule (mint a `phrase_id`/`evidence_id`,
   record it as `candidate`). It needs evidence and review before it can
   become `approved`/`limited_use`.
6. If the same phrase already exists under a different record, don't create
   a mental duplicate — reuse the existing guidance, or add corroborating
   evidence to that record instead of a near-duplicate.

## What this library is not

- Not proof a phrase will rank — it's a fit signal for copy quality, not an
  SEO growth lever on its own.
- Not a mandate — most locale pages should read naturally without forcing
  in a dictionary term at all.
- Not a substitute for this file's other localization rules (English-Parent
  Rule, Translation Parity, locale-native internal linking, Hub vs Spoke) —
  see `CLAUDE.md`. A local phrase never overrides those.
- Not something this repo stores, generates, or has any tooling for beyond
  the one read-only planning-script consumer described above. If you find
  yourself about to write a new file under `data/local-language/` in this
  repo, stop — that's the exact thing that was removed.
