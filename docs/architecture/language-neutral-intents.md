# Language-neutral canonical intents

**Adopted 2026-11-14 (owner-directed).** English is no longer the mandatory parent
language of a page. Every published page maps to a **canonical intent**; an intent may
originate in any qualified language, and its first page may be Korean, Japanese,
French, English or any other qualified locale. Demand decides which other languages
get a page. This is not permission for uncontrolled page creation or bulk migration:
the quality, duplication, revenue-protection and locale-qualification gates are
unchanged, and a page that originates in a locale clears the same gate a translation
clears.

Supersedes: the English-Parent Rule as it stood in `.claude/rules/localization.md` §1
and root `CLAUDE.md` hard line 6 until 2026-11-14, and `data/english_parent_exceptions.json`
as an approval mechanism (retired, preserved; see "Migration").

Test evidence: [`evidence/language-neutral-intents-test-report-2026-11-14.md`](./evidence/language-neutral-intents-test-report-2026-11-14.md).

---

## 1. The model

| Concept | What it is | Where it lives |
|---|---|---|
| **Canonical intent** | One user need + expected output, independent of language. Stable id. | `data/canonical_intents.json` (explicit) or implicit (below) |
| **Cluster** | The pages that are language versions of one intent: the hreflang mesh | the pages' own `<link rel="alternate">` tags |
| **Origin locale** | The language the intent was first published in. History; never changes | `originLocale` on the record (`en` for an implicit id) |
| **Primary page** | The page a tool uses when it needs one representative URL | `primaryLocale` if set, else the origin-locale page |
| **Published locales / URLs** | Which languages have a live page | **derived** from the mesh, never stored |
| **Scope** | `cross-language`, `locale-specific` or `pending-review` | `scope` + `scopeBasis` on the record |

One implementation: `scripts/lib/intent-clusters.js` (Node). `scripts/lib/canonical_intents.py`
is the read side for Python tools that only need "which record pins this URL and what is
its reference page". Nothing else defines a cluster.

### 1.1 Membership

A page that declares a real English alternate joins that English page's cluster, exactly
as before, so every English-first cluster resolves as it did. A page with no real English
alternate joins the pages its own alternates name (a union over those edges). Two guards:

- A subpage naming the bare homepage as its "English version" (the old local-only
  placeholder) is not a sibling claim and never makes an edge.
- An English-less page naming pages from two different English clusters is **not** allowed
  to merge them; it is reported (`bridges-english-clusters`).

### 1.2 Identity: the id never moves

- A cluster any of whose members is pinned by a record in `data/canonical_intents.json`
  has that record's `id`.
- Otherwise a cluster with an English member has the implicit id `legacy:<english path>`.
  Under the pre-2026-11-14 rule the English page was always the origin and its URL is
  preserved, so this id is stable. No mass registration was needed.
- A cluster with neither is **unregistered**. `check:canonical-intents` fails on any such
  cluster that holds a locale page, and `check:locale-parent-gap` fails a new page in one.

Why a non-English-origin cluster must be registered when an English-first one need not:
an implicit id has to be derived from some member, and the only member whose path stays
the same as languages are added is the origin. For the 721 pre-existing English-first
clusters that is the English page. For a Korean-first cluster, deriving from "the English
member if any, else the Korean page" would change the id the day English is added. The
record pins the id at publication instead. It is an ordinary intent registration, not an
exception, and it implies no English page.

Ids: lowercase ASCII, `<job>` or `<job>/<object>` (`find-and-copy-a-symbol/reference-mark`).
They name the need, never a URL or a keyword in one language.

### 1.3 Representative page

Where a tool needs one URL (the reference a locale spec is compared against, a parity
sibling), it is the record's `primaryLocale` member, else its `originLocale` member, else
the English member, else the first member. Never "the English page" by assumption. For
every English-first cluster that is still the English page.

### 1.4 x-default

x-default serves a visitor whose language no member matches. Resolution:

1. The record's declared `xDefault`: a member URL, `"site-root"` (the site root, which
   carries the language switcher), or `"none"`.
2. Otherwise the registry `policy.xDefaultFallbackOrder` (currently `["en"]`): the first
   member in a listed language. English is listed because it is the broadest fallback for
   an unmatched visitor, not because it owns the intent.
3. Otherwise **no x-default**.

It never defaults to the origin page: a Korean-first page is not shown to every
international visitor. Consequences: an English-first cluster keeps x-default = English
(unchanged); a Korean-only page has no x-default; when English joins a Korean-first
cluster, x-default becomes the English page by policy unless the record says otherwise.
`audit-hreflang.js` enforces this and its `--fix` now removes an x-default the policy says
should not exist, instead of pointing it at the page itself.

### 1.5 Scope

| Scope | Means | Never because of |
|---|---|---|
| `cross-language` | the need could meaningfully exist in more than one language. Not a plan to build them | — |
| `locale-specific` | its meaning or function cannot be the same intent in another language, with evidence (a script, orthography or register that exists in one language only) | unmeasured demand, zero volume, missing competitor data, an unfamiliar translation, English not being a priority market |
| `pending-review` | the semantic question is open and written down in `openQuestions` | — |

`inapplicableLocales` records languages a cross-language intent cannot exist in, with
the reason (Ñ is not an English letter). `localeOwners` records pages **outside** the
cluster that already serve the intent in a language (the English homepage serves the
font-changer job): a new page in that language for that intent fails as a duplicate.

## 2. Registry fields

```json
{
  "id": "find-and-copy-a-symbol/reference-mark",
  "originLocale": "ko",
  "primaryLocale": null,
  "pages": ["https://ultratextgen.com/ko/library/chamgo-pyo/"],
  "scope": "cross-language",
  "scopeBasis": "why, with evidence",
  "inapplicableLocales": {},
  "localeOwners": {},
  "localeOwnerBasis": {},
  "xDefault": null,
  "openQuestions": [],
  "registered": "2026-11-14",
  "provenance": { "source": "...", "agreed": "...", "note": "..." }
}
```

`pages` pins the record to its cluster: the origin page at least. Every other language is
read from the mesh. `legacyXDefault: true` and `legacyHreflangEnPlaceholder: true` mark
shapes recorded as they were on 2026-11-14 rather than rewritten in the migration (§5).

## 3. What a session does

**Publish a page that originates in a locale.**

1. Resolve the job and check nothing already serves it in that language (one query, one
   page; the `ship-page` skill's ownership test applies unchanged).
2. `node scripts/check-locale-parent-tier.js <locale>/<lane>/<slug> <locale>`: the same
   mirror / gate / skip advice a translation gets, classified by the page's own lane.
3. Add the record to `data/canonical_intents.json` with its scope and evidence.
4. Build the page with the normal generator. hreflang: the self-reference, plus x-default
   only if the record declares one.
5. `npm run check:ci-gates`.

**Add a language to an existing intent** (translation or expansion, any direction): build
the page, wire full reciprocal hreflang (`npm run sync:locale-mesh -- --fix --files …`),
leave the record and the original URLs alone. The id, the origin and every existing URL
stay as they are.

**When English demand appears for an English-less intent:** the ownership test against
the English SERP first, exactly as before. Build only if no existing page owns the term;
otherwise record the owner in `localeOwners.en`. Demand never auto-triggers a build.

## 4. Dependency map (2026-11-14)

What assumed English was the parent, and what each now does. "KO" = a Korean-only page.

| System | Assumption before | Now |
|---|---|---|
| `scripts/lib/translation-clusters.js` | cluster = its English member; English-less pages in no cluster | unchanged (legacy map); `scripts/lib/intent-clusters.js` adds the language-neutral model on top |
| `check-locale-parent-gap.js` (gate) | new locale page needs an English alternate or an exceptions-ledger entry | needs a canonical intent, no duplicate in its language, and the same tier gate (own lane when no English member) |
| `check_locale_spec.py` (gate) | spec must have an `en` entry; compared against the English page | without `en`: must map to a record; compared against the record's reference page; the origin page compares against nothing |
| `sync_symbol_collection_link.py` (gate) | KO symbol page = UNKNOWN, exit 2 | registered origin page takes the locale's own library hub |
| `check-updates-verification.js` (gate) | locale entry must match its English parent's date | a registered origin entry carries its own single verification pill |
| `audit-hreflang.js` (gate + fixer) | x-default must equal the English member; `--fix` fell back to the page's own URL | x-default from the registry policy (§1.4); `--fix` removes a forbidden x-default instead of self-pointing |
| `audit-hreflang-completeness.js` (gate) | N-way coverage only for English-anchored clusters | English-less clusters checked too; cross-cluster edges compared by intent |
| `check-locale-mesh.js` (gate) | a KO page's "cluster" was itself | its English-less cluster |
| `check-translation-parity.js` (gate), `audit-translation-parity.js` | English↔locale pairs only | English-less clusters paired against their reference page |
| `lib/content-fingerprint.js` | a link to a KO page became an invented English path | resolves to the intent's identity when the caller passes `neutralIdentity` |
| `check-locale-parent-tier.js` (advisory) | took an English path | also takes a locale-origin path |
| `data/english_parent_exceptions.json` | approval mechanism | retired; read by no script; history kept |
| sitemap, search index, library hubs | — | never required English (file walk / directory listing) |
| `lib/llms-index.js` | a locale root page with no English parent goes to "Language-specific pages" | unchanged; see §6 |

## 5. Migration of the exceptions ledger

All 26 entries of `data/english_parent_exceptions.json` were read and mapped into 23
records; 12 more English-less clusters that had never been ledgered (they predate the
gate) were found by the whole-tree sweep and registered, so every published page maps to
an intent (35 records, 0 unregistered). Each ledger entry keeps its original text and
gains `migratedTo`. Classification used the page's own job, and where a decision already
existed, that decision:

| Scope | Records | Examples |
|---|---|---|
| locale-specific | 3 | `write-in-gal-moji` (Japanese kana cipher), `cute-lisping-text-transform` (Indonesian phonemes), `browse-printables/japanese-school` (owner ruling) |
| cross-language | 29 | font-changer, typeface and accent-safe pages (the homepage job; `localeOwners.en` where a 2026-08-11 consolidation veto exists), game-name family members, hiragana/katakana/kanji practice, Ñ colouring (`inapplicableLocales.en`) |
| pending-review | 3 | `style-text-to-stand-out/special-writing` (fold candidate), `romanize-a-name-from-native-script/korean`, `practise-school-handwriting-model/romaji`, each with its question in `openQuestions` |

Several entries that were ratified as "no English demand by construction" are classified
`cross-language`: under the new rule, missing English demand is a demand fact, not a
semantic one. That changes nothing on the site; it only means the monthly reconciliation
may surface English (or other) demand evidence for them later.

**HTML was not rewritten.** The 35 pages keep their exact hreflang heads. Shapes recorded as
they are: x-default pointing at the site root (`xDefault: "site-root"`), five Indonesian
game-name pages whose x-default names an English page outside their cluster
(`legacyXDefault: true`, reported as warnings), and `letra-enye`'s `hreflang="en"` pointing
at the homepage (`legacyHreflangEnPlaceholder: true`). Cleaning them is a page edit with
its own review, not part of this change.

## 6. Remaining English-specific assumptions (known, not gates)

- **Implicit legacy ids** derive from the English path. Deliberate (§1.2).
- **`policy.xDefaultFallbackOrder: ["en"]`**. Deliberate (§1.4), editable data.
- **`lib/llms-index.js`** files a locale **root** page with no English parent under
  "Language-specific pages". A Korean-first page inside a lane directory (`ko/library/…`)
  is filed under its lane. Renaming the bucket regenerates every locale `llms.txt`; left
  for a separate change.
- **Translation generators** that build a locale page *from* an English page
  (`build_category_locale_pages.py`, `plan-library-locale-batch.py`) still take English as
  their source. They are translation tools for English-first families; an origin page is
  authored as a spec of its own language and built by the normal generator.
- **Hub facets** (`lib/library-hub-data.js`) are inherited from an English slug; a KO-only
  library page is listed with no facets. **Off-lane hub coverage** (`findOffLanePages`)
  finds a locale root page only through an English library parent.
- **`data/locale_parent_gap_audit.json`** and `data/core_parent_set.json` key on English
  lane patterns. An origin page is classified through the lane map learned from the site
  (`ja/purinto` → `printables`), so the same entries apply to it.
- **`data/translation_parity_exceptions.json`** keys on `(enUrl, localeUrl)`. For an
  English-less cluster the first URL is the reference page.
