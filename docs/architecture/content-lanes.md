# Content lanes — mechanics, linking, and the cannibalization record

Invariants: `.claude/rules/content-architecture.md`. Recorded owner decisions:
`docs/decisions/content-lanes.md`. Lane → generator → validator ownership and
maturity: `docs/README.md`. Page-level principles: `docs/jtbd-principles.md`,
`docs/page-vs-section-decisions.md`.

## 1. Guide vs Answer

| | `answers/` | `guide/` |
|---|---|---|
| **Intent** | informational, **zero-click**, confusion-clearer | educational / **authority**; explore-and-learn |
| **Typical query** | "is X safe", "how to do X", "what font does X use", "can you X" | "X explained", "the complete guide to X", branding/strategy |
| **Slug** | the **question** — `is-linkedin-bold-text-safe` | the **topic** — `discord-text-formatting-explained` |
| **Primary schema** | `QAPage` and/or `FAQPage` + `BreadcrumbList`. **No** `Article` | `Article` + `FAQPage` + `BreadcrumbList` |
| **Breadcrumb** | `Answers` | `Guides` |
| **Template** | leads with a **"Short answer"** block; no Key Takeaways / related-guides | `guide-meta` pills, **Key Takeaways**, **related-guides** |

A guide may bundle many sub-questions; an answer stays tightly scoped to one.

### `answers/` is deliberately not linked from any homepage

The EN homepage links `/library/`, `/guide/`, `/usecase/` and `/category/` but
**not** `/answers/`, and no locale homepage links its own `<lang>/answers/` hub.
**This is intentional and must not be "fixed".**

The pillar exists for answer-engine optimization: it is built to be landed on
directly, resolve one question, and stop. Funnelling homepage visitors into a
65-page Q&A index works against that — someone who arrived to use the generator
does not need it. Its discovery is search-driven by design, the same standing
decision `symbol/` carries. The difference is that `answers/` keeps its `header.js`
nav entry; what it does not get is homepage body links.

A homepage→pillar link audit will flag this every time, because it is structurally
identical to the real bug (a pillar with no inbound homepage link). It was flagged
and "corrected" on exactly that basis on 2026-07-31, during the pass that added 13
genuinely missing homepage→`library/` links. `library/` needed those — it is the
only route into each locale's `symbol/` cluster. `answers/` does not.

## 2. Library vs Symbol

The split is **collection vs. single item**, not "symbols vs. emoji" (clarified
2026-07-16). The world does not meaningfully distinguish the two; a single-emoji
identity page and a single-glyph identity page are the same shape of content.

| | `library/` | `symbol/` |
|---|---|---|
| **Job** | **browse** a category — a hub of related items | **identify** one item in full: codepoint, meaning, history, alt-input, confusables, FAQ |
| **Scope** | `collection` — many peer items | always `single` — one canonical glyph *or* emoji |
| **Discovery** | **primary nav** + on-page search/filter | **no nav entry** — landed on via search/pins |
| **Breadcrumb** | `Library` | `Symbols` |

`symbol/index.html` runs its **own single-item search** — a distinct job from
library's browse/filter (finding one already-known item vs. exploring a category).
This reversed an earlier rule against any search UI there, written when `symbol/`
had none. **Do not add a `symbol/` entry to `header.js`'s main nav**: nav real
estate tracks browse-intent volume, not content-type existence.

**Grandfathered exception.** The ~60 single-emoji pages already under `library/`
(`moai-emoji`, `clown-emoji`, `sad-emoji`, …) are **not** retroactively migrated in
bulk — a mechanical rename risks live rankings for a lane cleanup with no
user-facing upside. Fold a cluster into a `library/` collection once its pages have
a genuine peer relationship, which may already exist among the current 60 (e.g.
`crying-emoji` + `sad-emoji`), and 301 the old singles into it. Auditing the 60 and
executing the folds is its own scheduled pass, not a side effect of unrelated work.

**Kaomoji are out of scope for that rule.** They are text-built emoticons, not
glyph/emoji codepoints, and single-kaomoji pages stay under `library/` until this is
explicitly revisited.

### Creating a `symbol/` page

Write a spec in `data/library_page_specs/` with `"page_type": "symbol"` and run
`scripts/generate_library_page_from_spec.py` — it routes output to `/symbol/<slug>/`
and defaults the breadcrumb. Make sure the spoke's `related` block names its
`library/` hub(s), then run `npm run sync:symbol-peer-links`. Add one entry on
`symbol/index.html` by hand. `scripts/validate_library_pages.py` fails on **orphan
spokes** and on **lane mismatch** (a page's own directory vs. its `hreflang="en"`
counterpart's directory).

## 3. Hub↔spoke and peer↔peer linking is generated

A page's compare-grid is static HTML written once at creation time, so a peer added
weeks later is never woven back into older siblings' grids unless something does it
explicitly. Real case: `symbol/euro-sign/`, `pound-sign/`, `yen-sign/` and
`rupee-sign/` (shipped 2026-07-11/12) cross-linked each other, but `ruble-sign/`
(07-18), `dirham-sign/` and `saudi-riyal-sign/` (both 07-22) — which claimed those
older pages as peers — were never added back, leaving three real pages with 1–2
inbound editorial links each.

`sync_symbol_spoke_links.py --write --reciprocal` fixes both directions. Read-only
mode is the whole-site audit; a spoke with **zero** declared peers is not an error
(not every symbol has a natural sibling), only a **one-directional** declared
relation is. `check-new-symbol-peer-links.py` is the diff-scoped PR gate.

### Locale propagation, and the gap that sat inside it

The script used to walk EN `symbol/*` only, which made `--write --reciprocal` a
trap: it repaired EN and left the same relation missing on all 1,645 locale pages.
Its first full mirroring run cleared a **2,537-link backlog across 1,009 pages in 19
languages**.

Three rules the mirroring follows, and they are not optional:

- cluster membership comes from each page's own `hreflang="en"`, **never** from
  guessing a locale slug;
- a peer with no sibling in language L is **skipped**, never linked in English;
- card copy is read from the **target locale page's own** `<h1>` and hero tagline —
  nothing is translated here.

**Only the peer graph was mirrored for months, and nothing could see the
difference.** The hub→spoke pass still walked EN only, and the diff-scoped gate was
EN-only *and* checked peers rather than hubs. A whole-site run reported
`0 error(s), 2 warning(s)` while `<lang>/library/currency-symbols` was missing **117
links** to its own locale's currency spokes across 16 locales (`ar` linked 3 of 13,
`es` 3 of 14, `ko` 3 of 13, `nl` 3 of 13, against EN's 15 of 15). Verified as
invisible rather than assumed: deleting one injected card left the site-wide check,
the diff-scoped gate and the hub-coverage check all at exit 0.

Closed generally on 2026-09-02. The whole-site number was **1,032 missing links
across 16 languages and 250 hub pages** — 61% of the 1,686 relations where both ends
exist — led by `math-symbols` (207), `zodiac-symbols` (130),
`greek-letter-symbols` (124), `religious-symbols` (122) and `special-characters`
(111). Grid sizes stayed in proportion: median 6 cards per affected grid, worst 28
against EN's own 21 on the same hub, and 175 of 250 pages needed 3 or fewer.

The gate gained the matching rule, scoped to pages a branch **adds** rather than
modifies — that is the regression which produced the 1,032, and it keeps the gate
off the pre-existing backlog. The fix imported the generator's own loaders rather
than reimplementing them: a second copy of that logic would drift from the first,
which is the failure the peer-mirroring history already documents.

The first draft of that gate defined its new function inside `main()`, so `main()`
fell off the end and **the whole gate exited 0 in silence**. `ast.parse` was happy.
Confirm structure, not syntax. It was verified against three differently-shaped
probes: a new locale page no hub links **exits 1** naming the exact hub; the same
page once linked **exits 0**; a one-directional EN peer relation still **exits 1**,
proving the original rule was not broken by the addition.

## 4. Library hub coverage — the five mechanisms

A 2026-08-26 audit found **374 pages** live, indexable, self-canonical, in
`sitemap.xml`, meshed correctly, and reachable from their own locale's library hub
by no route at all. 210 were `es`, which has the deepest localized library on the
site (253 pages) and had **42% hub coverage**.

The `symbol` lane is the control group and it is the whole argument: 17 of 19 locale
symbol hubs card 100% of their spokes, because a generator writes those links and a
gate fails a PR that skips it. `library` had neither and drifted to 86%. Same site,
same week — the difference is whether a machine was doing the remembering.

There is no shared registry and no route manifest. Each hub carries its own
inventory, and **which form is a property of the hub, not of the locale**:

| Mechanism | Markup | Visible without JS |
|---|---|---|
| `libraryArray` | `var/const LIBRARY = [{ slug, … }]` | **no** |
| `libEntry` | `<article class="lib-entry">` in `#libDirectory` | yes |
| `azIndex` | `<ul class="lib-index-list">` | yes |
| `compareCard` | `<a class="compare-card">` | yes |
| `tipCard` | `<a class="tip-card">` inside `.tips-grid` | yes |

So `registered` means "listed in any of the five" and `crawlable` means "listed in
one of the four that survive without JavaScript". They are reported separately
because they answer different questions.

**A checker that knew only `compare-card` would report `da`, `no` and `sv` as broken
and `es` as fine.** The audit's first pass did exactly that, calling those three
locales 3, 11 and 10 pages short when all three are complete. **Do not narrow the
mechanism set** without re-checking those locales.

Ownership drifted here too, and the correction is instructive: as of 2026-09-01 all
19 locale hubs have migrated to `window.UTG_LIBRARY_HUB` and **EN is the only page
in the repo carrying a `LIBRARY` array** — measured, not recalled. A session acting
on the older ownership table hand-edited an `items` array that nothing reads, and
had to revert it.

### Errors and warnings are deliberately different strengths

**Error** — a page the PR adds that no mechanism lists; a hub entry pointing at
nothing with no `_redirects` rule (a hard 404 straight off the hub).
**Warning** — a hub entry resolving through a 301 (the visitor lands correctly after
one hop, so it is lost link equity, not breakage); a page added to a directory hub's
JS array but not its crawlable index.

Conflating them would either downgrade a real 404 or turn a lane migration into a
merge blocker. All five orphans the audit found were the redirect kind — four from
the `library`→`symbol` lane migration and one from a `heart-emoji` → `heart-symbols`
fold where `library/index.html` was the only file in the repo still pointing at the
old URL. All five are cleared, so a new one is a real regression.

Verified against five differently-shaped probes: an unlisted new page → **exit 1**;
the same page registered → **exit 0**; a hub entry whose page was deleted with no
redirect → **exit 1**, named a hard 404; the same orphan with a `_redirects` rule →
**warning, exit 0**; the unregistered page with a ledger entry → **1 → 0**.

### `validate_library_pages.py` discovers locales from the canonical list

It used `REPO.glob("??")` — two characters — so **`zh-tw` was silently never
scanned**: 41 locale lanes existed, 39 were scanned, and the two skipped were
`zh-tw/library` and `zh-tw/symbol`, 73 pages, invisible to every check in that file
including its orphan-spoke pass. (It also matched `js/`, which is not a locale.) The
fix immediately surfaced a real defect the glob had been hiding —
`zh-tw/library/happy-kaomoji` storing `data-symbol="ヽ(>∀<☆)ノ"` with the angle
brackets unescaped, where its own English parent escapes them.

## 5. The `updates/` pillar

`updates/` answers *"what changed, and does it affect a Check I already trust?"*

**Why it exists:** the site has "Check" surfaces whose correctness depends on
external facts going stale — the per-game `RULES` limits in
`js/gamename/game-rules.js`, and the `answers/` pages that assert whether Unicode
text works on a given platform. An entry is the dated audit trail for *why* one of
those numbers or verdicts changed, sourced from a real external event. This is not
manufactured content; it is the maintenance those surfaces already require, made
visible. An entry with no downstream link is just a blog post.

Template: `NewsArticle` + `BreadcrumbList` + `FAQPage`, decorative
`page-hero-figure` (like `answers/`), not the visible `guide-hero-figure`. Entries
register in `scripts/generate-site-art.py`'s `PAGES` dict with a `K_UPDATE` kicker.

### One verification date per entry — and the near-miss worth keeping

The pillar's value is *"this number was true, and here is when we last confirmed
it"*, so the verification date is its load-bearing claim. It was being made twice,
in two slots, with two wordings: `Last checked <date>` sat in body prose on all 11
entries from a tone-of-voice pass, and a later change added a
`Published <date> · Verified <date>` pill to one of them. Nothing reconciled them,
and that entry shipped asserting **September 1 in its body and September 2 in its
pill** — both sentences read fine, the markup was valid, and no check compared them.

**The near-miss is the lesson.** The first sweep for this grepped `Checked`
**case-sensitively** and concluded "no other entry carries an inline stamp". Every
one of the 11 does; they all say `Last checked`. A pattern-matched audit found the
surface it was written for and missed the next one. **Enumerate the class, do not
sample a pattern you guessed.**

A stamp in a `<meta name="description">` is allowed — snippet copy is its own slot
and audience — but the gate warns if it disagrees with the pill.

`npm run check:updates-verification` is **whole-pillar, not diff-scoped**, on
purpose: the shape it catches is an older page drifting out of agreement with a
convention set later, which a diff-scoped check cannot see. Verified against five
broken inputs: the real regression re-injected into body prose, a deleted pill, a
pill contradicting `datePublished`, a `Verified` date predating `Published` (each
exit 1), and a meta description contradicting the pill (warns, exit 0).

### Locale entries

The 56 locale entries carry **one** localized verification pill and no `Published`
half. The asymmetry is deliberate: for an English entry the publication date is a
real claim — where the fact was first reported — while for a translation the only
claim worth publishing is when the facts were last checked, and that check happens
once, upstream, in English.

Wording is each locale's own, **taken from the site rather than invented**. Eight
locales already carried a stamp (`Zuletzt geprüft am`, `Son kontrol:`,
`Última comprobación:`, `2026년 9월 1일 최종 확인`, …) and keep their exact phrasing.
Read the existing string before adding one: Swedish here is **`kontrollerat`**
(neuter, agreeing with *innehållet*), and a first draft of the registry guessed
`kontrollerad` and was wrong.

Labels are matched from a registry, never generated, and dates compare as
**integers** — the pill must contain the parent's year and day, plus its month
wherever the locale writes months as digits (`ja ko vi zh-tw`). That keeps the check
from becoming the authority on month names in seventeen languages.

Removing a body-prose stamp must match a *dated* stamp and never the bare word:
German `wurde geprüft und mit der Bitte`, Dutch `een gecontroleerd experiment`,
Turkish `kontrollü bir deneye` and Thai `ตรวจสอบมากขึ้น` are ordinary prose a
word-level sweep would have deleted.

## 6. The cannibalization record

**`vi/chu-kieu/` (2026-07-06)** — created in a batch of 5 VN pages, justified purely
by volume ("chữ kiểu / tạo chữ kiểu / chữ kiểu đẹp, 90.5k/mo"). The `/vi/` homepage
had been deepened around that exact term 9 days earlier and was already ranking for
it — the same commit even cited "ranking pos 4-8 on the chữ kiểu cluster" as its own
rationale, without checking which asset was doing the serving. The page shipped as a
strictly thinner duplicate of the homepage's own section and earned **~1 click
across a full month** while the homepage absorbed **840+**. Confirmed via the
query×landing-page cross-tab, not assumed.

**`/discord/` (2026-07-18)** — a query×page pull showed the hub taking effectively
all of the cluster's clicks while `/answers/discord-allowed-characters/`,
`/answers/do-you-need-nitro-for-discord-fonts/` and
`/guide/discord-text-formatting-explained/` each drew **zero clicks despite real
impressions at first-page positions**. `answers/how-to-make-bold-text-in-discord`
drew essentially no impressions because the hub intercepts "how to bold" and then
ranks ~80 for it. Five purpose-built pages, near-zero traffic, because Rule 3 was
never applied to the hub. **The fix is de-targeting the hub, not another page.**

**`tiktok/` + `youtube/` "what font does X use" (2026-07-21)** — built as full
answer-shaped pages directly under the platform directories, with no discussion or
documented exception. Both pairs cannibalized: `answers/what-font-does-tiktok-use/`
outperformed its `tiktok/` twin 4 clicks to 1 on similar impressions, and neither
`youtube/` page converted at all (0 clicks on both). Retired with 301s to the
`answers/` canonical, **first porting the content unique to each** (free
lookalike-font names) into the surviving page, and repointing every internal link.

**Emoji aesthetics (baddie, emo, scene, weirdcore, …)** → **hub sections, not
spokes.** "baddie emoji combos" has the *same* SERP intent as "emoji combos" →
fails the spoke test on (a). Building 11 spokes would create 11 cannibals against
the hub already ranking page-2 for the head term.

**`nl/` (2026-07-26)** — a 452-page `symbol/*` translation batch produced four
`nl/symbol/*` spokes overlapping two existing NL hubs, on pages too new to have any
GSC signal. `nl/library/vraagteken/` carried FAQ content its EN parent never had — a
real Rule 3 violation — while `nl/library/kruis-symbool/` already matched its parent
and only needed its Rule 4 links. Both fixed by **mirroring the EN parent's shape**,
per explicit user direction, because no NL demand data existed to support anything
else.

### Diagnosing an existing cannibalization

Pull GSC query×page. The signature is a spoke at **position 5–8 with thousands of
impressions and ~zero clicks** (the hub on the same SERP takes the click), or a
spoke with **~zero impressions** for its target query while the hub ranks that query
poorly (the hub is intercepting it). Both mean Rule 3 was never applied.

## 7. Two pages, one tool

On 2026-09-13 a one-line change gave `/printables/alphabet-coloring-pages/` a
type-a-name coloring tool because the block-letters page had one. But
`/printables/coloring-page-maker/` already owned that job by its own title. Two of
our own URLs targeting one query — Rule 3 cannibalization arriving through a
mechanism nothing was watching.

**Every gate was right to pass it**: parity reads links and section counts, the
locale gate reads strings, the image gates read assets, the accessibility gate reads
markup that rendered. A duplicated tool moves none of those.

The signature is `(locale, noun, render, font)`. `noun` is what the sheet *is*, in
the page's own words, and the engine already uses it in aria-labels and PNG
filenames (`coloring page`, `dot-to-dot`, `puzzle piece`). It is localized per page
(`Ausmalbild`, `kolorowanka`), so grouping by locale plus noun works across all
seven printables languages with nothing translated in the checker.

Against the tree as it stood this reports **5 collisions and zero false
positives** — `coloring-page-maker`, `dot-to-dot-name` and `name-puzzle-maker` all
render a typed word in Baloo 2 outline and are **not** flagged, because their nouns
differ. Same typeface, three different products. Two coarser signatures were tried
against the same corpus and rejected: **mount id alone misses the real defect** (the
pair mounts `name` on one page and `design` on the other), and `(render, font)`
flags the Baloo 2 trio — 3 false positives.

The A–Z character picker (`#pt-strip`) is deliberately **not** a surface here: every
alphabet page has one, they are not competing for one query, and including it would
flag 54 pages that work as intended.

The gate measures the **delta**: a collision *pair* counts only if it did not exist
at the merge base, because the site carries real standing collisions by design (the
seven "in cursive" one-word spokes share one surface; the tracing family shares
another). Verified against six inputs including a **German** page colliding with two
existing German pages, so the rule is not EN-only.
