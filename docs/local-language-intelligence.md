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

## Where the data lives

- **Public, approved-only snapshot (this repo):** `data/local-language/<locale>.json`,
  one file per covered locale, plus `data/local-language/index.json`. This is
  the only local-language dictionary data tracked in this repository, and it
  is **generated** — do not hand-edit it. It was produced by an internal
  research process and synced in as plain data; the process that generated
  it is not part of this repository and this repo carries no other reference
  to it.
- Only phrases with status `approved` or `limited_use` appear here. Weaker
  research candidates, rejected phrases, and the full evidence trail (source
  URLs, native quotes, dates) are intentionally **not** included in this
  public snapshot — this file is scoped to what's safe and ready to use in
  copy, not a research archive.

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
matrix) are not yet covered by this library — treat absence from
`data/local-language/` as "not yet researched," not as "no local vocabulary
exists."

## Snapshot record shape

Each entry in `data/local-language/<locale>.json` → `phrases[]`:

| Field | Meaning |
|---|---|
| `phrase_id` | Stable ID, e.g. `TR-014`. |
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
| `status` | `approved` or `limited_use` (the only two statuses that reach this public snapshot — see below). |
| `last_verified` | Date of the most recent evidence-gathering pass. |

`limited_use` means the phrase is real and verified but register/context-restricted
(gaming-only, FAQ-only, dated/ironic) — usable per its `avoid_when` guidance,
but not as a primary title/H1 term. `approved` is unrestricted subject to the
core rule below.

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

1. Check `data/local-language/<locale>.json` for the locale you're editing.
   If it has regional markets, filter to the `country_or_market` that
   matches your target audience.
2. Ask: does one of these phrases fit the *exact* meaning, platform, game,
   audience, and register of the sentence you're about to write? If yes,
   and its `content_surface` matches where you'd use it, use it. If no,
   write the natural/standard phrasing you'd otherwise use — most sentences
   on this site should NOT contain a dictionary phrase, and that's expected.
3. Keep the page's existing single primary query target. A local phrase
   supports that target; it never gets stacked alongside it or used to
   justify restructuring the page. Follow this repo's Hub vs Spoke,
   cannibalization, and English-Parent rules first.
4. If you discover a **new** locally meaningful word/phrase/abbreviation/
   platform term while doing this work — one that isn't in the snapshot —
   do not add it to production copy directly. Flag it (in the PR
   description or an issue) as a candidate for the next research pass. It
   needs evidence and review before it can become `approved`/`limited_use`
   and reach this snapshot.
5. If the same phrase already exists in the snapshot under a different
   record, don't create a mental duplicate — reuse the existing guidance.

## Regenerating this snapshot

`data/local-language/*.json` is generated output. If it looks stale or a
correction is needed, that happens upstream (the internal research process
that produces it) — do not hand-edit these files directly in a page-content
PR. A hand-edit here will be overwritten by the next regeneration and won't
be reflected in the underlying research record.

## What this library is not

- Not proof a phrase will rank — it's a fit signal for copy quality, not an
  SEO growth lever on its own.
- Not a mandate — most locale pages should read naturally without forcing
  in a dictionary term at all.
- Not a substitute for this file's other localization rules (English-Parent
  Rule, Translation Parity, locale-native internal linking, Hub vs Spoke) —
  see `CLAUDE.md`. A local phrase never overrides those.
