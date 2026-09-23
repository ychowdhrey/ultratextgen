# llms.txt — the machine-navigation layer

**Added 2026-09-20.** 85 generated files, 4,692 pages, 31 languages. Built by
`scripts/build-llms-index.js` from `scripts/lib/llms-index.js`; gated by
`npm run check:llms`; measured by `npm run audit:llms`.

---

## 1. What the specification actually says, and what is only common practice

Verified against [llmstxt.org](https://llmstxt.org/) on 2026-09-20 rather than
from memory, because the convention is young and moving.

**Formally proposed** (quoting the spec's own wording):

| element | status |
|---|---|
| an H1 with the project name | "This is the only required section" |
| a blockquote summary | "A blockquote with a short summary of the project, containing key information necessary for understanding the rest of the file" |
| free text sections before the lists | "Zero or more markdown sections … of any type except headings" |
| H2-delimited file lists | "Zero or more markdown sections delimited by H2 headers" |
| each list item | "a required markdown hyperlink `[name](url)`, then optionally a `:` and notes about the file" |
| where the file lives | `/llms.txt`, **or** "at any subpath (e.g. `/docs/llms.txt`). A file covers the URLs under its path." |
| `## Optional` | "the 'Optional' section is used for secondary information: links an agent can skip when a shorter context is needed" |

**Common practice, not in the spec:** `llms-full.txt` (the spec does not
mention it); the claim that the file must be at the root and nowhere else —
several 2026 guides say this, and it contradicts the spec's own subpath
sentence; and any suggestion that publishing one affects ranking. The spec
does recommend serving clean markdown at the same URL with `.md` appended,
which this site does **not** do (see §8).

**UltraTextGen-specific choices** are §2, §3 and §4 below, each with the
measurement behind it.

**No ranking claim is made anywhere in this system.** Publishing `llms.txt`
does not improve rankings and does not guarantee inclusion in any assistant's
answers. What it does is make the site's own structure legible to a client
that fetches text and does not execute JavaScript — which is the same reason
the static footer and the pre-rendered library hubs exist (see CLAUDE.md,
"Discovery Model").

---

## 2. Where each file sits, and why it is not the obvious shape

The spec's sentence *"A file covers the URLs under its path"* is the whole
constraint. A section index may only be published at a **real directory that
actually holds the pages it lists**:

```
/llms.txt                      site index AND the English index
/<locale>/llms.txt             one per locale — 30 files
/<dir>/llms.txt                an English section, at its own directory
/<locale>/<dir>/llms.txt       the same, in that locale's own directory slug
```

So the shape is driven by the site's real URLs, not by a tidy taxonomy:

* `/es/symbols/llms.txt` would be **wrong** — the Spanish symbol pages are
  under `/es/symbol/`.
* `/es/printables/llms.txt` would be **more wrong** — Spanish printables are
  under `/es/imprimibles/`, and the seven printables directory names across
  the site are `printables`, `imprimibles`, `imprimables`, `zum-ausdrucken`,
  `do-druku`, `da-stampare`, `imprimiveis`, `om-uit-te-printen`. None of those
  is hardcoded: a locale page inherits its section from the English parent it
  declares in its own `hreflang="en"`, the same join
  `scripts/lib/translation-clusters.js` uses.

### There is no `/en/llms.txt` file

English pages are served from the site root, so `/` *is* English's path and
`/llms.txt` is already its index. A file under `/en/` would claim a path where
nothing is served. `_redirects` carries a static `301` from `/en/llms.txt` to
`/llms.txt` so an agent that guesses the symmetric URL still lands right; the
rule sits above the splat block, per that file's own header.

### A section earns its own file per DIRECTORY, at 10 pages

Two thresholds, both measured rather than picked:

* **Per directory, not per section.** The first draft required every page in a
  section to share one directory. That measured badly: Spanish has 254 pages in
  `es/library/` plus a handful of library-ish pages at the locale root
  (`es/simbolos-de-corazon/`, whose English parent is
  `library/heart-symbols/`). Those few blocked the 254 from getting an index at
  all and pushed `es/llms.txt` to 305 links. The same shape hid the Japanese,
  Thai, German, French and Korean library indexes. Pages of the same section
  that sit outside the directory are listed inline in the locale index, which
  covers them.
* **Ten pages.** Below it the pages are listed inline. This avoids the
  two-entry section file (fragmentation) and the locale index whose only
  content is links to near-empty files.

The directory test still bites where it should: German font-style pages are
`de/fette-schrift/`, `de/kursive-schrift/` and eleven more sitting at the
locale root. They inherit the `fonts` section from `category/bold-fonts/` and
friends, but no `de/category/` directory holds them, so no
`/de/category/llms.txt` is published and the thirteen are listed in
`/de/llms.txt`, where their URLs actually live.

---

## 3. The taxonomy is the repository's, not an invention

16 sections. Three classification rules answer every one of the 4,692 pages:

| rule | pages | source |
|---|---|---|
| the directory the page sits in | 4,243 | `library`, `symbol`, `usecase`, `category`, `guide`, `learn`, `answers`, `updates`, `events`, `embed`, `printables` |
| the section of the English parent it declares | 423 | the page's own `hreflang="en"` |
| a table of English root pages | 26 | `ROOT_PAGE_SECTION` in `scripts/lib/llms-index.js` |

A locale root page with **no** English parent is `language-specific`: 22 pages,
every one of them a ratified no-English-parent page from CLAUDE.md's
"Localization Workflow" section (`ja/gal-moji`, `id/tulisan-cuping`, the `fr`
and `it` clusters …), 17 of which are ledgered in
`data/english_parent_exceptions.json`. That is a fact about the hreflang graph,
not a guess about the page.

### The one hand-maintained table, and why it is not automatable

`ROOT_PAGE_SECTION` is 27 lines against 4,692 pages. It exists because the site
has no machine-readable statement of which root page is a platform hub and
which is a standalone tool — measured:

* every root page ships the same JSON-LD `@type` set (`WebApplication`,
  `FAQPage`, `BreadcrumbList`, `Offer`, `Question`, `Answer`, `ListItem`);
* every one breadcrumbs as `Home > <its own title>`;
* `styles.js`'s `platforms` vocabulary names **six** platforms against
  **thirteen** platform pages.

The closest thing is the kicker in `scripts/generate-site-art.py`'s `PAGES`
literal, which agrees with this table on **36 of the 38** root pages (it files
`kaomoji-generator` and `kaomoji-dictionary` under the generic site kicker) —
but it is a 3,500-line Python literal with multi-line entries, so reading it
from Node would be fragile *and* still incomplete.

`collectPages()` **throws** on an English root page missing from the table
rather than defaulting, so a new one cannot be silently misfiled. That is the
"new generator family added but not represented" drift case, and it is
verified in §7.

### Sub-groups inside a section

Only two sections carry sub-headings, and both taxonomies already exist:

* **`library`** groups by `data-filter="type"` on `library/index.html`'s own
  rendered entries — the hub's live filter vocabulary, which
  `scripts/lib/library-hub-data.js` already reads. 338 of 338 English library
  pages carry one, and `data/library_hub_i18n.json` ships the localized label
  for 19 locales, so a German index reads `## Symbols (Symbole)`.
* **`printables`** groups by `data-pt-job` on `printables/index.html`'s own
  cards, the attribute that places each card in one of the hub's six job
  sections (since 2026-09-22; before that it drove a facet filter). 31 of 31
  families carry one. Only
  the human-readable English label for each job value is added here, because
  the attribute ships no visible label anywhere on the site.

Every other section is one flat, URL-sorted list. A grouping nobody already
maintains is a grouping that goes stale.

---

## 4. Nothing here is authored

Every title and description is read off the page it describes, in that page's
own language — the same discipline `sync_symbol_spoke_links.py` uses for card
copy ("card copy is read from the target locale page's own `<h1>` and hero
tagline") and `library-hub-data.js` for a locale hub ("every field is read from
a page that already exists, never invented and never translated here").

| slot | source | measured coverage |
|---|---|---|
| link text | the page's own `<h1>` — never its `<title>`, which carries the brand suffix and keyword tail | 4,692 / 4,692 |
| one-line note | first sentence of `.hero-tagline`, else `<meta name="description">`, else `og:description` | 4,599 taglines + 93 meta = 4,692 |
| blockquote | the hub page's `<meta name="description">`, else its tagline | 85 / 85 |

`validate()` fails rather than inventing if a page ever has none.

**Headings are English on every locale file, on purpose.** They are
machine-facing scaffolding — an agent comparing `/de/llms.txt` with
`/ko/llms.txt` should see the same section names — and translating them here
would be exactly the invention the rule above forbids. Where the site itself
already states a localized label (the BreadcrumbList level-2 name, or the
library hub's own facet vocabulary) it is appended in parentheses:
`## Symbol & emoji library (Bibliothek)`. A label is only used when **three or
more** pages agree on it at 60% majority — below that the "majority" is one
page's own title, which is how German `Text tools` was briefly captioned
"(Wörter & Zeichen zählen)", the counter's own breadcrumb.

**Language names are not printed.** `Intl.DisplayNames` would supply them, but
its output tracks the host's ICU version and this tree has to regenerate
byte-identically in CI. BCP-47 codes are the machine-readable identifier
anyway, and each locale link carries that locale's own homepage description,
written in the language.

### Three description rules, each derived from a wrong result

1. **A period after a digit is not a sentence boundary** — unless it closes a
   four-digit year. German, Czech, Polish and Turkish write an ordinal date as
   `16. September 2026`; without the guard the index published *"Unicode 18.0
   erscheint am 16."* and *"Beim UTC-Meeting #188 am 30."*. With the year
   exception, *"…standarden den 16 september 2026. Din telefon…"* still splits
   correctly.
2. **A clause cut must leave something worth reading.** The Python original
   cuts an over-long string at its last em dash so it still reads as a complete
   thought. That inverts when the first clause is a label: every `symbol/` page
   opens `💢 U+1F4A2 — the four-pointed cross that…`, so the cut kept
   `💢 U+1F4A2.` and threw the description away. It collapsed 41 descriptions
   onto 104 pages, 13 of them onto one string. The clause cut now requires the
   remainder to be at least half the cap.
3. **A description is never the page's title restated.** A tool page with no
   hero tagline opens its meta description with its own name — *"Free ASCII art
   generator. Type a word or name and…"* — and taking the first sentence
   published the title twice. `category/old-english-fonts` was described as
   *"Old English font generator."* The leading sentence is skipped when it is
   short (≤ 8 words) and adds at most one word the title does not carry.

**Rule 2 is live on the site, in its original form, and is reported rather than
fixed here.** `sync_symbol_spoke_links.py`'s `first_sentence()` produces the
same cut for the compare-cards it injects: **48 cards** across the tree render
a blurb that is nothing but a glyph and a codepoint — `💢 U+1F4A2.` ×24,
`🛑 U+1F6D1.` ×21, `⚸ U+26B8.` ×3, visible today on `library/emoji-combos`.
Fixing it there regenerates card text across hub and locale pages, which is a
content change with its own parity, em-dash and locale-translation
consequences, so it belongs to a deliberate pass rather than to this one.

---

## 5. Relationship with `sitemap.xml` — they answer different questions

| | `sitemap.xml` | the `llms.txt` tree |
|---|---|---|
| question | *which canonical URLs exist, and when did each last change* | *what is here, how is it grouped, and which page does a given job* |
| audience | crawlers doing discovery and scheduling | agents and people orienting before they fetch |
| shape | a flat list of 4,692 `<loc>` + `<lastmod>` + image entries | a three-level index: root → language → section |
| completeness | **complete and authoritative** | complete in coverage, but links a narrower index instead of repeating leaves |
| content | URLs, dates, image URLs | a title and a description per page, in the page's own language |
| generated by | `scripts/update-sitemap.js` | `scripts/build-llms-index.js` |

**The sitemap is not replaced and its behaviour is not changed.** Both scan the
same filesystem for `index.html` and both skip the same `meta robots noindex`
pages, so they cannot disagree about what exists; nothing about indexing was
altered to make this generation easier. `llms.txt` files are not pages, carry
no `index.html`, and therefore never enter `sitemap.xml` — correctly, since an
index of the site is not a page of the site.

### robots.txt

Unchanged as a directive surface. A `#` comment now points at `/llms.txt`.
The llms.txt proposal defines no robots.txt directive and RFC 9309 defines no
field for one, so inventing `Llms:` would emit an unrecognised line every other
crawler must skip. Nothing in the file disallows `.txt`, and `_routes.json` is
untouched, so each file is served as a free static asset with no Functions
invocation (see CLAUDE.md's invocation-budget note).

---

## 6. Sizes, and what would make one too large

`npm run audit:llms` prints every file. As of 2026-09-20: 85 files, 4,776 links
(4,692 pages + 84 index links), **1,063 KB total**, median 9.8 KB, max 59.7 KB.

| file | links | size |
|---|---|---|
| `/library/llms.txt` | 339 | 59.7 KB |
| `/es/library/llms.txt` | 254 | 51.2 KB |
| `/th/symbol/llms.txt` | 107 | 42.6 KB |
| `/printables/llms.txt` | 212 | 38.6 KB |
| `/ja/symbol/llms.txt` | 107 | 33.5 KB |
| `/llms.txt` (root) | 80 | 14.7 KB |

Two of the five largest are `symbol/` indexes in a non-Latin script: Thai and
Japanese descriptions cost roughly three bytes a character in UTF-8, so those
files are ~2x their Latin siblings at the same 107 links. That is encoding, not
a content problem, and it is why the flag is on bytes rather than on link count.

The audit flags anything over **64 KB** for a human to look at. Nothing reaches
it. The two largest are genuinely one directory each, so splitting them would
put an index at a path that does not cover what it lists — the `##` sub-groups
inside them are the semantic split instead. If a directory ever does outgrow
one file, split it by an existing facet the repo already maintains, never by an
arbitrary page count.

The 186 per-letter printables sheets are 88% of `/printables/llms.txt` and sit
**last**, one `##` per family, so an agent reading top-down meets the
generators first and can stop before the alphabet.

---

## 7. Verified against deliberately broken inputs

Per CLAUDE.md's rule that adding a validator is not the same as gating on it.
Ten probes, each a different shape so the gate could not be tuned to one, plus
two controls:

| probe | result |
|---|---|
| clean tree (control) | **exit 0** |
| a new `symbol/` page added, index not rebuilt | **exit 1**, names `/symbol/llms.txt` and `/llms.txt` |
| a route deleted | **exit 1**, names `/answers/llms.txt` |
| a listed page flipped to `noindex` | **exit 1**, names `/guide/llms.txt` |
| a route family appearing in a locale that had none | **exit 1**, names `/bs/llms.txt` |
| a copied page whose canonical still points elsewhere | **exit 1**, `is not its own canonical` |
| a page stripped of tagline, meta and og description | **exit 1**, `has no description` |
| a generated index hand-edited | **exit 1**, `tree is stale` |
| a new English root page with no `ROOT_PAGE_SECTION` entry | **exit 1**, naming the table |
| tree restored (control) | **exit 0** |

And verified that CI *gates* on it rather than merely running it:
`python3 scripts/run-ci-gates.py --only llms_index` returns **1** on a broken
tree and **0** on a clean one; `--only llms_index_tests` returns **1** with a
validation rule disabled and **0** restored.

`npm run test:llms` is 58 assertions over the rules above, including a
determinism check: the same corpus in reverse discovery order renders
byte-identically.

---

## 8. Deliberately not done

* **No `llms-full.txt`.** It is not in the spec, and the full text of 4,692
  pages is not a file anyone should fetch. The sitemap plus these indexes reach
  every page.
* **No `.md` mirrors.** The spec recommends serving clean markdown at
  `<url>.md`. That is 4,692 new URLs on a static host, each needing its own
  generation, canonical decision and sitemap posture — a separate, larger
  change with real SEO consequences (duplicate-content and crawl-budget
  questions this repo has not researched). Worth proposing on its own evidence;
  not smuggled in here.
* **No ranking or inclusion claim**, in this document or in any generated file.
* **No change to indexing behaviour** to make generation easier, per the brief.
* **The 48 truncated compare-cards** described in §4 are reported, not fixed —
  the root cause is in `sync_symbol_spoke_links.py`, and repairing it is a
  content pass with its own gate interactions.

---

## 9. Working with it

```bash
npm run build:llms        # regenerate and write (the fix for any stale check)
npm run check:llms        # CI gate — regenerate and compare, exit 1 on drift
npm run audit:llms        # sizes, coverage matrix, duplicate descriptions
npm run test:llms         # 58 assertions
node scripts/build-llms-index.js --list        # paths, link counts, bytes
node scripts/audit-llms-index.js --locale ko   # one language
```

**Never hand-edit a generated `llms.txt`** — `check:llms` regenerates and
compares, so a hand edit fails the build and is overwritten by the next run.
Change `scripts/lib/llms-index.js` and rebuild.

A PR that adds, removes, renames or de-indexes any page must run
`npm run build:llms -- --write` and commit the result in the same change. The
gate is whole-tree rather than diff-scoped on purpose: the bytes that move
belong to files the PR never touched.
