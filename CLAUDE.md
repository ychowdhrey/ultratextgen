# CLAUDE.md — UltraTextGen Codebase Guide

This file provides context for AI assistants working in this repository. Read it before making changes.

---

## Project Overview

**UltraTextGen** is a fast, zero-framework text-expression tool. Its core is a Unicode text generator that converts plain text into stylized fonts that work across social platforms (LinkedIn, Instagram, Discord, etc.). It has since grown a **second output mode: in-browser visual & printable asset generation** — printable bubble-letter and cursive practice/coloring sheets (per-letter and full A–Z), and the curved/arc text tool (`/curved-text/`) — rendered client-side as **SVG/PNG** that users copy, download, or print.

Copy-paste Unicode is still the front door and satisfies the job fastest. Visual assets are the on-brand, higher-intent **follow-up** for jobs plain characters can't do (trace, color, print, logo/sticker art) — added where real demand exists, never as a default.

**Scope note (updated):** the earlier "text-only, no image generator" boundary has been intentionally lifted. UltraTextGen now *does* generate images — but only **client-side, on demand, as SVG/PNG built with native Canvas/SVG**. This is not a reversal of the philosophy; it's the same philosophy applied to a new job.

**Printables scope boundary (added 2026-07-10):** "visual asset" does not mean "any kids' worksheet." The line is **typography-native**: a printable belongs in this repo only if the thing being rendered is text — a letter, a word, a name, a phrase (bubble/cursive/block letters, coloring pages, tracing sheets, a dot-to-dot of a *name*, name puzzles, banners spelling a word). Generic worksheet/activity content that isn't fundamentally text — shape-only tracing (circle/square/triangle with no letters), pre-writing motor-skill strokes, mazes, word searches, math worksheets — is **out of scope here**, even though `printablesEngine.js` could technically render it. That demand is real but belongs to a possible future, separate property once this site is more established — do not build it under the UltraTextGen brand. Quick test: could a user type a word/name into the feature and see *that word* rendered? If no, it's not a printable for this repo.

**Core philosophy**: Fast > Fancy, Clean > Clever, Useful > Impressive. **Client-side only is a hard line:** visual generation must use native SVG/Canvas in the browser — never a server-side renderer, an image-processing library, or bundled font binaries.

**Flair note (updated):** "Fast > Fancy" governs *complexity*, not *ambition*. On a plain text page (e.g. bold), a random name generator or heavy per-character transform would be scope creep. But on a **game/platform name page, matching that game's aesthetic *is* the copy-paste job, done end to end** — a decorated Free Fire name framed in ꧁༒…꧂, a name that fits the field's limit, a name generated to a theme. There, richer and even **generative flair is in-scope and on-brand** (the hand-authored "Ready-Made Names" lists are proof of the demand; a generator just does it dynamically). What stays a hard line is the *output*, never the ambition: flair is **paste-safe Unicode composed from building blocks client-side via native APIs** (`Intl.Segmenter`, etc.) — never an image, a bundled font, or a dependency, and only the *selection* may be random. The flair layer is a real engine (`js/flair/flair-engine.js` + `applyDecoration`/`window.UTG_DECORATIONS`), meant to expand: packs, modes (`wrap`/`space`/`interleave`), and a checker that counts what the player will actually paste.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Pure HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Build tools | Node.js (sitemap gen only), Python (tweet queue only) |
| CI/CD | GitHub Actions |
| Hosting | Cloudflare Pages (static assets + `functions/` middleware) |
| Analytics | Google Tag Manager (GTM-P55HXK8Q) |

**There are no frontend frameworks** (no React, Vue, Angular, etc.) and no bundlers (no Webpack, Vite, Rollup). Do not introduce them.

---

## Repository Structure

```
ultratextgen/
├── index.html              # Main homepage (733 lines)
├── style.css               # Global stylesheet (1980 lines)
├── script.js               # UI/DOM logic, main IIFE — owns decorations/flair
├── styles.js               # Unicode font registry (836 lines)
├── renderer.js             # Text rendering engine (459 lines)
├── header.js               # Shared header injector (67 lines)
├── js/flair/flair-engine.js# Flair packs + compose() (shared decoration data)
├── js/gamename/game-rules.js# Per-game nickname rule engine + name checker
├── symbol-explorer.js      # Symbol lookup utility
├── symbol-explorer.css     # Symbol explorer styles
├── package.json            # npm metadata + build scripts
├── fonts.json              # Font category mappings
├── robots.txt              # Search engine directives
├── sitemap.xml              # Auto-generated (do not edit manually)
├── _redirects              # Cloudflare Pages redirect rules — PATH ONLY,
│                           #   query strings are silently ignored (see below)
├── _headers                # Cloudflare Pages response headers
├── _routes.json            # Pages Functions routing: ONLY `/` invokes the
│                           #   Function — keeps every other request a free
│                           #   static asset (see What NOT to Do)
├── functions/_middleware.js# Pages Function: owns `/` (English homepage + ?lang=)
│
├── .github/workflows/
│   ├── tweet-queue.yml     # Daily social queue (09:00 UTC)
│   └── update-sitemap.yml  # Daily sitemap regen (00:00 UTC)
│
├── scripts/
│   ├── update-sitemap.js   # Sitemap generator (Node.js)
│   ├── inject-faq-jsonld.js# FAQ structured data injector
│   ├── tweet_queue.py      # Git-to-tweet automation (Python)
│   ├── generate-site-art.py# SINGLE source of truth for the brand pin/art skin
│   ├── generate-pinterest.py     # Per-page pin generator (imports generate-site-art)
│   ├── generate-id-pins.py       # /id/ board generator (mirror this for new boards)
│   ├── generate-vertical-text-pins.py # vertical-text board generator
│   ├── pinterest_csv.py    # SINGLE source of truth for the Pinterest upload schema
│   ├── build_pinterest_upload.py # inventory CSV -> *_upload.csv (importer-ready)
│   ├── lib/r2_pinterest.py # SINGLE source of truth for the R2 client + object keys
│   ├── migrate_pinterest_to_r2.py   # one-time backfill of pre-R2 committed pins
│   └── validate_pinterest_r2_migration.py # the 10-check pre-deletion validation pass
│
├── (Pinterest pin images live on Cloudflare R2, not in git — generators
│    render in memory and upload directly. See docs/pinterest-r2-migration.md.
│    assets/pinterest/ and assets/collection-pins/ are gitignored.)
├── data/*_pinterest_pins.csv      # internal inventory CSVs (never uploaded; image-path
│                                  #   columns hold R2 object keys, e.g. pinterest/base/x.png)
├── data/*_pinterest_pins_upload.csv # importer-ready CSVs (upload these only; Media URL
│                                    #   points at https://media.ultratextgen.com/...)
│
├── category/               # Category landing pages (bold, cursive, etc.)
├── usecase/                # Use case pages (bio, comment, etc.)
├── guide/                  # Educational / authority articles — explore-and-learn intent
├── answers/                # Single-question, zero-click answer pages (see "Guide vs Answer")
├── library/                # Symbol/emoji/emoticon/kaomoji COLLECTION pages — BROWSE pillar
│                           #   (classify each page by presentation_class +
│                           #    copy_patterns — see docs/emoji-combination-taxonomy.md)
├── symbol/                 # Single-item identity spokes (glyph OR emoji) — SEARCH-ONLY
│                           #   discovery, own on-page single-item search (see "Library vs Symbol")
├── updates/                # Dated Unicode/platform/game rule-change log (see "Content Type: Updates")
├── js/vertical/            # Vertical text feature module
├── js/tattoo/              # Tattoo lettering studio module (names, dates→roman, initials, symbols)
│
└── Platform pages:
    discord/ facebook/ instagram/ linkedin/ pinterest/
    snapchat/ telegram/ tiktok/ whatsapp/ x/ youtube/
```

---

## Content Types: Guide vs Answer

`guide/` and `answers/` look similar (both reuse the `editorial-section` template) but
serve **different search intents**. Pick by the dominant query before creating a page —
misfiling weakens both the page and the cluster.

| | `answers/` | `guide/` |
|---|---|---|
| **Intent** | Informational, **zero-click**, confusion-clearer. A sharp question with a direct answer. | Educational / thought-leadership / **authority**. Explore-and-learn; a topic explored in depth. |
| **Typical query** | "is X safe", "how to do X", "what font does X use", "can you X" | "X explained", "the complete guide to X", branding/strategy topics |
| **Slug** | the **question** — `is-linkedin-bold-text-safe`, `how-to-uncover-redacted-text` | the **topic** — `discord-text-formatting-explained` |
| **Primary schema** | `QAPage` and/or `FAQPage` + `BreadcrumbList`. **No** `Article`. | `Article` (author, publisher, datePublished) + `FAQPage` + `BreadcrumbList` |
| **Breadcrumb** | `Answers` | `Guides` |
| **Template** | leads with a **"Short answer"** block; no Key Takeaways / related-guides | `guide-meta` pills, **Key Takeaways**, **related-guides** |

Rule of thumb: if the value is "resolve one question in seconds," it's an **answer**.
If the value is "understand a topic / build authority," it's a **guide**. A guide may
bundle many sub-questions; an answer stays tightly scoped to one.

### Answer pages live under `answers/` only

If a page's content is answer-shaped (per the table above — a sharp question with a
direct, zero-click resolution), it goes under `/answers/`. Do not build the same
answer-shaped content again under a platform directory (`/discord/`, `/tiktok/`,
`/youtube/`, etc.) or any other section, even when the query is platform-specific
("what font does TikTok use"). One query, one page, in the section that owns that
content type — this is the same Rule 1 as the Hub vs Spoke section above, applied to
content-type placement instead of hub/spoke placement.

This is a **default, not an absolute** — a platform hub page is allowed to *discuss*
a topic its own answer page covers, as long as it stays a one-line pointer per Hub
vs Spoke Rule 3 ("to format messages, see the guide"), and a genuinely different
platform-specific angle (not just the same Q&A restated) can justify its own page.
Any exception must be **explicit and discussed** — argued and agreed before the page
ships, the same bar the Localization Workflow's English-Parent Rule sets for locale
pages — not decided unilaterally because a page "already lives here."

**Case study (2026-07-21):** `tiktok/what-font-does-tiktok-use/` and
`youtube/what-font-does-youtube-use/` were built as full answer-shaped pages
(same "what font does X use" question, `QAPage`-style structure, near-identical
title/meta to their `answers/` counterparts) directly under the platform
directories, with no discussion or documented exception. Both pairs cannibalized:
GSC (last 3 months) showed `answers/what-font-does-tiktok-use/` outperforming its
`tiktok/` twin on the metric that matters (4 clicks vs. 1, on similar impressions),
while neither `youtube/what-font-does-youtube-use/` page converted at all (0 clicks
on both). Fix: retired both platform-namespaced pages with a 301 to their
`answers/` canonical (`_redirects`), first porting the one piece of content unique
to each (free lookalike-font names — Montserrat/Poppins for TikTok, Inter/Manrope/
Montserrat for YouTube) into the surviving `answers/` page so it wasn't lost, and
repointed every internal link (`tiktok/index.html`, `tiktok/name-generator/`,
`youtube/index.html`, `youtube/name-generator/`) straight at the `answers/` URL
instead of the now-retired one.

### `answers/` is deliberately not linked from any homepage (recorded 2026-07-31)

The EN homepage links `/library/`, `/guide/`, `/usecase/` and `/category/`
but **not** `/answers/`, and no locale homepage links its own
`<lang>/answers/` hub either. **This is intentional, not the "missing link"
bug described under "Locale-native internal linking" below.**

The `answers/` pillar exists for **AEO** — it is built to be landed on
directly from a search engine or an AI answer surface, resolve one question,
and stop. Funnelling homepage visitors into it works against that: someone
who arrived to use the generator does not need a 59-page Q&A index, and
sending them there loses them.

So the pillar's discovery is search-driven by design, the same standing
decision `symbol/` carries (see "Content Types: Library vs Symbol" —
"**No nav entry** — landed on via search engines/pins"). The difference is
that `answers/` *does* keep its `header.js` nav entry; what it does not get
is homepage body links.

**Do not "fix" this.** A homepage→pillar link audit will flag it every time,
because it is structurally identical to the real bug — a pillar with no
inbound homepage link. It was flagged and corrected on exactly that basis on
2026-07-31, during the pass that added the 13 missing homepage→`library/`
links. `library/` genuinely needed those (it is the only route into each
locale's `symbol/` cluster); `answers/` does not, and should be left alone
unless this decision is explicitly revisited.

---

## Content Types: Library vs Symbol

`library/` and `symbol/` both hold Unicode reference content, but they own different
jobs and different discovery paths. Don't conflate them when deciding where a new
page belongs.

**The split is collection vs. single item — not "symbols vs. emoji" (updated
2026-07-16).** The world doesn't meaningfully distinguish "symbol" from "emoji";
a single-emoji identity page and a single-glyph identity page (khanda, diameter
sign) are the same shape of content and belong in the same lane.

| | `library/` | `symbol/` |
|---|---|---|
| **Job** | **Browse** a category — a hub of related items (math symbols, currency symbols, zodiac signs, emoji combo sets) | **Identify** one specific item in full — codepoint/meaning, history, alt-input, confusable neighbors, FAQ. Applies equally to a punctuation mark and a single emoji |
| **Scope** | `collection` — many peer items | Always `single` — one canonical glyph *or* emoji |
| **Discovery** | **Primary nav** (`header.js` "Library" button) + on-page search/filter UI | **No nav entry** — landed on via search engines/pins, same footing as `guide/`; nav real estate tracks browse-intent volume, not content-type existence. Once there, `symbol/index.html` runs its **own single-item search** — a distinct job from library's browse/filter (searching for one already-known item vs. exploring a category), not a duplicate of it |
| **Breadcrumb** | `Library` | `Symbols` |
| **Cross-linking** | Links out to relevant `symbol/` spokes from its hub pages; its own index (`library/index.html`) points to `/symbol/` for single-item lookups, phrased as "see the symbol pages," never "browse" | Every spoke links back to the `library/` hub(s) it relates to; its index (`symbol/index.html`) explicitly routes "want a whole category?" traffic back to `/library/` |

**The decision, and why:** `library/` stays the sole "browse and find" surface — that's
where the on-page filter UI and primary nav entry live. `symbol/` is the single-item
lane — one canonical glyph *or* emoji, page built to be *landed on* via search, not
*browsed to*. Do not add a `symbol/` entry to `header.js`'s main nav — discovery there
stays search/pin-driven by design, even though the page itself now hosts a
single-item search tool once someone's arrived (this reverses the prior rule against
any search UI on `symbol/index.html`; that rule was written when `symbol/` had no
search of its own — it now intentionally does, scoped to single-item lookup, not
category browsing).

**New single-item pages (rule as of 2026-07-16):** any new single-emoji or
single-glyph page — including "weird emoji fact" campaign pages — goes into
`symbol/`, not `library/`. `library/` is reserved for collections going forward.

**Grandfathered exception:** the ~60 single-emoji pages already living in
`library/` (`moai-emoji`, `clown-emoji`, `sad-emoji`, etc. — one emoji per page)
are **not** retroactively migrated in bulk. A mechanical rename risks live
rankings on pages that already have real search traffic, for a lane cleanup
with no user-facing upside. Convert a cluster into a `library/` collection
once its pages have a genuine peer relationship — that peer relationship can
already exist **today** among the current 60 (e.g. `crying-emoji` +
`sad-emoji` may already be close enough), not only once some brand-new page
is added later. Fold matched clusters into one collection page and
301-redirect the old singles into it, rather than leaving parallel singles
competing with each other. Auditing the 60 for existing clusters and
executing the folds is its own deliberate, scheduled pass — not something to
do opportunistically as a side effect of unrelated work.

**Kaomoji are out of scope for this rule.** Kaomoji are text-built emoticons,
not glyph/emoji codepoints — single kaomoji pages (`heart-kaomoji`,
`hug-kaomoji`, etc.) keep following the old scope (single item that's still
primarily a copy target, filed under `library/`) until/unless this is
explicitly revisited.

**Adding a `symbol/` page:** write a spec in `data/library_page_specs/` with
`"page_type": "symbol"` (everything else matches a normal `library/` spec —
including single-emoji specs) and run
`scripts/generate_library_page_from_spec.py` — it routes output to `/symbol/<slug>/`
and defaults the breadcrumb to "Symbols" automatically. Hub→spoke linking is
automated: make sure the spoke's `related` block links its `library/` hub(s), then
run `scripts/sync_symbol_spoke_links.py --write` (add `--reciprocal` to card every
claimed hub) — it injects the `compare-card`(s) on the hub side in house style and
is idempotent. Still add one entry back on `symbol/index.html` by hand.
`scripts/validate_library_pages.py` scans `symbol/*` by default alongside
`library/*` and **fails on orphan spokes** (a spoke no `library/` hub links to),
so a forgotten sync run is caught before the PR.

**Peer linking between `symbol/` spokes (the page's own "Related Symbols"
section) is automated too, separately from hub↔spoke linking above.** When a
spoke's `related` block names another `/symbol/` page (not a `/library/`
hub), that's a declared peer relation, and it should be reciprocal — the
named peer's own Related Symbols grid should link back. This doesn't happen
by default: a page's compare-grid is static HTML written once at creation
time, so a peer added weeks or months later never gets woven back into
older, already-shipped siblings' grids unless something does it explicitly.
Real case: `symbol/euro-sign/`, `symbol/pound-sign/`, `symbol/yen-sign/`,
and `symbol/rupee-sign/` (all shipped 2026-07-11/12) cross-linked each
other, but `symbol/ruble-sign/` (07-18), `symbol/dirham-sign/`, and
`symbol/saudi-riyal-sign/` (both 07-22) — which claimed those older pages as
peers — were never added back in, leaving three real pages with only 1–2
inbound editorial links each. Root-cause analysis: an internal audit
(2026-07-24).

`scripts/sync_symbol_spoke_links.py --write --reciprocal` fixes both
directions in one pass — hub reciprocity (as before) and peer reciprocity
(new): for every spoke, it now also checks whether its declared `/symbol/`
peers link back, and injects a `compare-card` into the peer's own grid if
not (`npm run sync:symbol-peer-links`). Read-only mode
(`npm run check:symbol-peer-links`, i.e. the script with no `--write`) is
the whole-site audit — unlike hub-orphans, a spoke with **zero** declared
peers is not an error (not every symbol has a natural sibling); only a
**one-directional** declared relation is flagged.
`scripts/check-new-symbol-peer-links.py` (`npm run
check:new-symbol-peer-links`) is the diff-scoped PR gate, wired into
`.github/workflows/validate.yml`: for every `/symbol/` page a PR adds or
changes, its declared peers must currently link back, or the PR fails with
the exact pair and the fix (run the generator, commit the result).

**Locale propagation (added 2026-08-06).** `sync_symbol_spoke_links.py` used
to walk EN `symbol/*` only, which made `--write --reciprocal` a trap: it
repaired the EN side and left the same relation missing on all 1,645
`<lang>/symbol/*` pages, whose compare-grids are static HTML written once at
creation time exactly like EN's. Running it produced 113 EN fixes and **493
translation-parity pairs**. It now mirrors the peer graph into every language:
for each EN relation A↔B and each language L where **both** ends have a live
sibling, L's copy of A gets a card pointing at L's copy of B. Cluster
membership comes from each locale page's own `hreflang="en"` link (the same
source `scripts/lib/translation-clusters.js` uses), never from guessing a
locale slug. Card copy is read from the **target locale page's own** `<h1>`
and hero tagline — nothing is translated here, and a peer with no sibling in
L is skipped rather than linked in English. `--no-locales` restores EN-only
behaviour. The first full run cleared a 2,537-link backlog across 1,009 pages
in 19 languages. `check-new-symbol-peer-links.py` (the PR gate) is still
EN-only and diff-scoped.

**Only the PEER graph is mirrored, never hub→spoke — and nothing checks the
difference (added 2026-09-01).** The paragraph above reads as if locale
propagation is solved. It is solved for peer↔peer (`symbol/A` ↔ `symbol/B`).
The hub→spoke pass in the same script still walks EN only, so
`<lang>/library/<hub>` is **never required to link `<lang>/symbol/<spoke>`**,
and `check-new-symbol-peer-links.py` cannot see it either — it is EN-only and
checks *peers*, not hubs.

The result is the failure mode this file names three times over: **a check that
reports nothing is indistinguishable from a check that passes.** A whole-site
`sync_symbol_spoke_links.py` run reports `0 error(s), 2 warning(s)` — neither in
the currency lane — while `<lang>/library/currency-symbols` was missing **117
links to its own locale's currency spokes** across 16 locales: `ar` linked 3 of
13, `es` 3 of 14, `ko` 3 of 13, `nl` 3 of 13, against EN's 15 of 15. Verified as
invisible rather than assumed: deleting one injected locale card and re-running
leaves the site-wide check, the diff-scoped peer gate and
`check-library-hub-coverage` all at exit 0.

Fixed for the currency lane only (2026-09-01) by importing this script's own
`load_locale_siblings()`, `page_title_and_desc()` and `inject_card()` rather
than reimplementing them — a second copy of that logic would drift from the
first, which is the failure the peer-mirroring paragraph above already
documents.

**Closed generally 2026-09-02 — the hub→spoke pass now mirrors like the peer
pass.** The whole-site number was **1,032 missing links across 16 languages and
250 hub pages**, 61% of the 1,686 relations where both ends actually exist, led
by `math-symbols` (207), `zodiac-symbols` (130), `greek-letter-symbols` (124),
`religious-symbols` (122) and `special-characters` (111). `load_locale_hubs()`
plus a second loop inside the existing locale-propagation block closes it, under
the same three rules the peer loop already follows: cluster membership from each
page's own `hreflang="en"` and never a guessed slug; a spoke with no sibling in
L skipped rather than linked in English; card copy read from the target locale
page's own `<h1>` and hero tagline, so nothing is translated or invented. Behind
`--reciprocal`, off under `--no-locales`. A full run now reports **0 errors, 0
warnings**.

**The gate gained the matching rule**, so it cannot silently regrow:
`check-new-symbol-peer-links.py` now also requires every `<lang>/symbol/` page a
branch **adds** to be linked from that locale's copy of each hub its EN parent
claims. Scoped to added pages, not modified ones — that is the regression which
produced the 1,032, and it keeps the gate off the pre-existing backlog rather
than permanently red. It imports the generator's own loaders for the same
no-second-copy reason as above.

**Grid sizes stay in proportion**, which is the objection worth checking before
a backfill of this size: median 6 cards per affected grid, worst 28 against EN's
own 21 on the same hub, and 175 of the 250 pages needed 3 cards or fewer.

Verified per this file's own rule against three differently-shaped probes: a new
`de/symbol/` page no hub links **exits 1** naming the exact hub; the same page
once linked **exits 0**; and a one-directional EN peer relation still **exits 1**,
proving the original rule was not broken by the addition. That verification was
not ceremonial — the first draft of this change defined the new function inside
`main()`, so `main()` fell off the end and the whole gate **exited 0 in silence**.
`ast.parse` was happy; the check was inert. Confirm structure, not syntax.

**Translating a `library/`/`symbol/` page:** the lane is inherited from the
English source's `page_type` — it is never re-decided per language. A
translation of a `symbol/<slug>/` page ships to `<lang>/symbol/<slug>/`, even
if that language has no `symbol/` pillar yet and every prior translation for
it landed in `<lang>/library/`. `scripts/validate_library_pages.py` scans
every `<lang>/library/*` and `<lang>/symbol/*` by default and fails on **lane
mismatch** (a page's own directory vs. its `hreflang="en"` counterpart's
directory) — run it over your translated batch before opening the PR. Full
rationale and the recurring failure mode: `docs/unicode-library-workflow.md`
§7.

---

## Content Type: Updates

`updates/` is a dated log, distinct from every other content type above — it
exists to answer *"what changed, and does it affect a Check I already trust?"*,
not to explore a topic (`guide/`) or resolve a question (`answers/`).

**Scope — three event types only:** new Unicode Consortium versions/emoji, platform
formatting/character-support rule changes (Discord, Instagram, LinkedIn, TikTok,
WhatsApp, …), and per-game nickname rule changes (the `RULES` table in
`js/gamename/game-rules.js`). Do not use `updates/` for product/feature launches on
this site — that's a different, not-yet-built content type; see the case study
below for why it was rejected as the seed for this section.

**Why it exists:** the site already has "Check" surfaces whose correctness depends
on external facts going stale — the per-game `RULES` limits, and the `answers/`
pages that assert whether Unicode text works on a given platform ("is-linkedin-
bold-text-safe", "do-you-need-nitro-for-discord-fonts"). An `updates/` entry is the
dated audit trail for *why* one of those numbers or verdicts changed, sourced from
a real external event (a Consortium release, a platform changelog, a game patch).
This is not manufactured content — it's the maintenance work those Check surfaces
already require, made visible.

**Template:** `NewsArticle` (author, publisher, `datePublished`/`dateModified`) +
`BreadcrumbList` + `FAQPage` — schema.org markup only (Google treats `Article`,
`NewsArticle`, and `BlogPosting` identically for Article rich-result and
Discover/Top Stories eligibility). This is **not** formal Google News Publisher
Center enrollment — see the case study below for why that specific step stays
off the table. Hero: decorative `page-hero-figure` (like `answers/`), not the
visible `guide-hero-figure` guides use. Every entry should link to the specific
Check surface it affects (the relevant `answers/` page, or a mention of the
`RULES` table) — an update with no downstream link is just a blog post, not
evidence of active maintenance.

**Asset pipeline:** entries register in `scripts/generate-site-art.py`'s `PAGES`
dict like an `answers/` page (title, sub, motif, `K_UPDATE` kicker) to get hero SVG
+ OG PNG via the standard pipeline. Individual dated entries are **excluded from
the Pinterest pin requirement** (`generate-pinterest.py:classify()` and
`check-image-assets.py:pin_eligible()` both special-case `ptype == "updates"`) —
a dated status/verification log isn't visual pin material. The `updates/index.html`
hub is *not* excluded (it classifies as `platform` like other top-level hubs) and
does get a pin, consistent with `guide/`/`library/`/`answers/` hubs staying
pin-eligible.

**Case study (2026-07-20):** the section was proposed as a way to get "one more
SEO feature" activated by posting the site's own feature launches (curved-text,
tattoo studio, vertical text, printables, etc.) as if they were news. That framing
was rejected — a font-generator tool site has no content that meets Google News'
actual bar (timely coverage of external events, not evergreen tool pages or
self-promotional launch posts), and pursuing formal News/Publisher Center
inclusion on that basis risked a rejection tied to the domain. The section only
became legitimate once re-scoped around genuine external events that this site's
own Check tools already have to track to stay accurate — which is the scope
above, and the only scope this section should carry.

**Schema refinement (2026-07-20):** the template originally specified `Article`
to keep clear distance from anything "News"-flavored. Revisited the same day,
once the section's scope was already locked to genuine external events (see the
case study immediately above): switched the JSON-LD `@type` to `NewsArticle`.
This is schema.org markup only — Google's structured-data guidance treats
`Article`, `NewsArticle`, and `BlogPosting` the same way for the Article rich
result and for Discover/Top Stories eligibility, and a `NewsArticle` type does
not enroll a site in Google News. Formal Google News Publisher Center
submission remains explicitly out of scope, for the same domain-risk reasoning
as the case study above — this refinement does not reopen that question.

### One verification date per entry, in the pill (added 2026-09-02)

The pillar's value is *"this number was true, and here is when we last
confirmed it"* — so the verification date is its load-bearing claim. It was
being made twice, in two slots, with two wordings.

`Last checked <date>` sat in body prose on all 11 entries, from the
tone-of-voice pass. A later change added a `Published <date> · Verified <date>`
`guide-pill` to one of them. Nothing reconciled the two, and that entry shipped
asserting **September 1 in its body and September 2 in its pill** — both
sentences read fine, the markup was valid, and no check compared them.

**The near-miss is the part worth carrying forward.** The first sweep for this
grepped `Checked` **case-sensitively** and concluded "no other entry carries an
inline stamp." Every one of the 11 does; they all say `Last checked`. A
pattern-matched audit found the surface it was written for and missed the next
one — the same failure "Structure is not language" documents above. Enumerate
the class, do not sample a pattern you guessed.

**The rule:** exactly one verification date per entry, as the last
`guide-pill`, agreeing with the page's own `datePublished`. No verification
stamp in body prose.

**Three kinds of date live on these pages and only one is a stamp.** Conflating
them would flag the 19 real event dates on `uae-dirham-symbol-unicode-18`:

| kind | example | where it belongs |
|---|---|---|
| **stamp** | "Last checked September 1, 2026" | the pill, page-level |
| **scoped** | "As of September 2, 2026 no date has been announced" | **stays inline** |
| **factual** | "Unicode 18.0 publishes on September 16, 2026" | ordinary content |

A scoped qualifier is not a stamp: *"no rollout date has been announced"* is
only true at a point in time and must carry its own date wherever it sits,
because a reader cannot infer it from a header pill.

**`dateModified` is not a verification date and must not be used as one.** All
11 entries carry `2026-09-01` from a single tone-of-voice rewrite — it means
"when the prose was last edited", which is a different claim. The visible
verified date is deliberately independent of it.

A stamp in a `<meta name="description">` is allowed — snippet copy is its own
slot and audience — but the gate **warns** if it disagrees with the pill.

#### Tooling

- **`npm run audit:updates-verification`** — whole-pillar dashboard, oldest
  check first, i.e. the order a re-verification pass should work in.
- **`npm run check:updates-verification`** — the enforcing half, wired into
  `.github/workflows/validate.yml`. It **gates rather than informs** (same call
  as `check:zalgo-decodes`): there is no backlog to be permanently red against.
  It is **whole-pillar, not diff-scoped**, on purpose — the shape it catches is
  an older page drifting out of agreement with a convention set later, which a
  diff-scoped check cannot see.
- Both share **`scripts/lib/updates-verification.js`**, so the audit and the
  gate can never disagree about what a stamp is.

Verified per this file's own rule before being trusted, against five
differently-shaped broken inputs so the check could not be tuned to one: the
real regression re-injected into body prose, a deleted pill, a pill contradicting
`datePublished`, a `Verified` date predating `Published` — each exits 1 — and a
meta description contradicting the pill, which warns and exits 0.

#### Locale entries (added 2026-09-02)

The 56 `<lang>/updates/` pages carry **one** localized verification pill and no
`Published` half. The asymmetry is deliberate: for an English entry the
publication date is a real claim — it is where the fact was first reported —
while for a translation the only claim worth publishing is when the facts were
last checked, and that check happens once, upstream, in English. A locale
pill's date must therefore equal its EN parent's `Verified` date, resolved
through the page's own `hreflang="en"`.

**Wording is each locale's own, taken from the site rather than invented.**
Eight locales already carried a stamp (`Zuletzt geprüft am`, `Son kontrol:`,
`Última comprobación:`, `2026년 9월 1일 최종 확인`, …) so those keep their exact
phrasing; the other nine were authored to match. Read the existing string
before adding one — Swedish here is **`kontrollerat`** (neuter, agreeing with
*innehållet*), and a first draft of the registry guessed `kontrollerad` and was
wrong.

**Labels are matched from a registry, never generated, and dates compare as
integers** — the pill must contain the parent's year and day, plus its month
wherever the locale writes months as digits (`ja ko vi zh-tw`). That keeps this
check from becoming the authority on month names in seventeen languages, which
is not a thing a CI script should own.

**Stamps in body prose are removed here as in English**, but the removal must
match a *dated* stamp and never the bare word: German `wurde geprüft und mit
der Bitte`, Dutch `een gecontroleerd experiment`, Turkish `kontrollü bir
deneye` and Thai `ตรวจสอบมากขึ้น` are ordinary prose that a word-level sweep
would have deleted.

Verified against three probes: bumping an EN `Verified` date fails all of that
page's locale siblings by name, a deleted locale pill exits 1, and a localized
stamp re-injected into body prose exits 1.

---

## Hub vs Spoke: preventing self-cannibalization

A **hub** owns a broad head term and a *browse-or-tool* intent (`/discord/` = the
"discord fonts" generator; `/library/emoji-combos/` = the "emoji combos" browse
grid). A **spoke** is a page that owns ONE narrower query with a *different* SERP
intent (a how-to, an answer, a single item, a single aesthetic). Hubs and spokes
are how the site scales coverage — but when a hub and its own spoke both try to
rank for the *same* query, they **cannibalize**: Google ranks only one of your
URLs well, picks the higher-authority hub (often the *worse* answer, so it ranks
badly), and starves the spoke that would have ranked. This is the same failure as
"check who already owns it" below, turned inward — the hub eating its own spokes.

**This is distinct from, and stricter than, "check who already owns it."** That
rule guards a *new* page against an *existing* page. This one governs the standing
relationship between a hub and the spokes beneath it, in *both* directions.

The rule has four parts. Apply all four — the Discord case below failed only on
Rule 3, and that was enough to strand five real pages.

1. **One query, one target.** Every query cluster has exactly ONE page designated
   to rank for it. Name that exact query *before* building anything. Before adding
   a hub section, confirm no spoke owns the query. Before creating a spoke, confirm
   the hub is not already page-1 for it.

2. **The spoke test — when to split out vs. keep as a hub section.** Make it a
   spoke only if **all three** hold:
   - **(a) Distinct SERP intent** — the query's SERP is a *different type* than the
     hub's (how-to article + PAA + forums, vs. a tool/collection). If the two SERPs
     look the same, it is **not** a spoke.
   - **(b) Self-contained** — fully answerable on its own page, without the hub's
     tool/collection as the payload.
   - **(c) Standalone demand** — real independent volume (GSC impressions or
     Semrush), not a fragment of the hub's head term.

   If **any** fail → it is a **section on the hub**, not a spoke.

3. **De-confliction (the part most often skipped, and the one that bites).** The
   moment a spoke exists, the hub must **de-target** that query: strip the competing
   prose down to a one-line pointer link ("to format messages, see the guide"). The
   hub keeps its head term; the spoke gets a clean run at its query. Symmetric — a
   spoke must not chase the hub's head term (don't stuff "discord fonts" into a
   formatting guide). A spoke that exists while the hub still targets its query is a
   cannibal, not coverage.

4. **Link direction.** Hub → spoke (a contextual link inside the relevant hub
   section) and spoke → hub (breadcrumb + one back-link). No orphan spokes (no hub
   links in), no un-pointed hub sections (a section whose spoke it never links to).

**Diagnosing an existing cannibalization:** pull GSC query×page. The signature is a
spoke sitting at **position 5–8 with thousands of impressions and ~zero clicks**
(the hub on the same SERP takes the click), or a spoke with **~zero impressions**
for its target query while the hub ranks that query poorly (the hub is intercepting
it). Both mean Rule 3 was never applied — fix the hub, don't rebuild the spoke.

**Worked application:**
- *Emoji aesthetics (baddie, emo, scene, weirdcore, …)* → **hub sections**, not
  spokes. "baddie emoji combos" has the **same** SERP intent as "emoji combos"
  (copy-paste collection lists) → fails the spoke test on (a). Building 11 spokes
  would create 11 cannibals against the hub that already ranks page-2 for the head
  term. Promotion path: if one aesthetic later shows large standalone volume **and**
  a distinct SERP, promote it to a spoke **and** de-target it from the hub (Rule 3).
- *Discord native formatting (bold, underline, big text, color)* → correctly
  **spokes** (distinct how-to/PAA/forum SERP), which already exist as
  `guide/discord-text-formatting-explained`, `guide/discord-colored-text-guide`,
  `answers/how-to-make-bold-text-in-discord`, etc. — but Rule 3 was never applied,
  so the `/discord/` generator hub still carries the formatting how-to prose and
  intercepts every "how to X in discord" query. Fix is de-targeting the hub, **not**
  another page.

**Case study (2026-07-18):** a GSC query×page pull (last 3 months, queries
containing "discord") showed `/discord/` taking effectively all of the cluster's
clicks, while `/answers/discord-allowed-characters/`,
`/answers/do-you-need-nitro-for-discord-fonts/` and
`/guide/discord-text-formatting-explained/` each drew **zero clicks despite real
impressions at first-page positions** — all indexed, all on-SERP, all starved by
the hub above them.
`answers/how-to-make-bold-text-in-discord` drew essentially no impressions because
the hub intercepts "how to bold" and then ranks ~80 for it. Five purpose-built
pages, near-zero traffic, because Rule 3 was never applied to the hub.

**These four rules apply within each locale independently (clarified
2026-07-26).** A translated spoke batch can collide with that locale's own
existing hubs even when the EN side is clean — the batch mirrors EN's
hub/spoke split, but the locale's hubs may have grown their own extra prose
in the meantime. When the collision surfaces on pages too new to have any
GSC signal (zero impressions, nothing to adjudicate a demand-based split
with), do not invent a locale-specific judgment call: resolve structurally
by mirroring what the live EN parent hub already does — same de-targeting,
same reciprocal `compare-card` links, no more and no less. **Case study
(2026-07-26):** a 452-page `symbol/*` translation batch produced four
`nl/symbol/*` spokes overlapping two existing NL library hubs;
`nl/library/vraagteken/` carried FAQ content its EN parent
(`library/punctuation-symbols`) never had — a real Rule 3 violation — while
`nl/library/kruis-symbool/` already matched its parent and only needed its
Rule 4 links. Both fixed by mirroring the EN parent's shape (`1c6e9bbb`),
per explicit user direction, because no NL demand data existed to support
anything else.

---

## Core JavaScript Architecture

Scripts are loaded in a strict order in every HTML page:

```html
<script src="/header.js"></script>      <!-- 1. Inject shared nav -->
<script src="/styles.js"></script>      <!-- 2. Register font styles -->
<script src="/renderer.js"></script>    <!-- 3. Rendering engine -->
<script src="/script.js" defer></script><!-- 4. UI logic -->
```

### Module Descriptions

#### `header.js`
- IIFE that creates and injects the shared navigation header
- Looks for `#shared-header` element or inserts after GTM noscript
- Manages dark mode toggle + localStorage persistence

#### `styles.js`
- Defines `window.textStyles` — the global Unicode font registry
- Each style maps A–Z, a–z, 0–9 to Unicode equivalents
- Defines `CATEGORY_PAGES` and `SITE_PAGES` routing objects
- Style object shape (verified against the live registry 2026-08-11 — see the
  correction note below):
  ```js
  {
    // POSITIONAL STRING, not an object keyed by letter. Index 0 = A, 25 = Z.
    upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
    lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
    nums:  '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
    type: 'map',           // see the five real values below
    category: 'bold',
    familySlug: 'bold-fonts',   // string OR array of strings
    groupSlug: 'bold',
    slug: 'bold',
    platforms: [ … ]
  }
  ```
  `upper`/`lower`/`nums` may **also** be a real JS **array**, and one style
  requires it: `Ultra Regional Indicator`, whose "letters" are two codepoints
  each (regional indicator + U+2060 word joiner) and would be torn apart by
  the positional string reader. `mapToArray()` in `renderer.js` accepts either
  form (`Array.isArray` → returned as-is; string → parsed positionally, with
  special-case parsers for wrapped forms like `⦅❨A❩⦆` and `→A←`).

  Non-`map` types carry different fields instead of `upper`/`lower`/`nums`:
  `procedureId` (procedure), `decoratorId` (decorator), `transform`
  (function), `redactChar`/`redactMode` (redact); plus optional `note` and
  `accentSafe`.

  **Correction (2026-08-11).** This block previously documented `upper` as an
  object map (`{ A: '𝗔', … }`) and `type` as `'map' | 'zalgo' | 'upside-down'
  | 'transform'`. Neither matched the code, and the drift was live long enough
  to mislead: a pass reading this file wrote `style.upper['A']` against a
  string and silently got `undefined` for all 26 letters, falling back to
  plain ASCII with no error. Zero styles have ever used a type named `zalgo`,
  `upside-down` or `transform` — `transform` is a *field*, not a type.

#### `renderer.js`
- Exports `window.UltraTextGenRender` with its single method
  `renderAny(text, style)` — **two** arguments, and the second is the resolved
  **style object**, not a key and not followed by an options bag. Every call
  site passes `styles[styleKey]` (see `gothic-tools.js`). *(Corrected
  2026-08-11; previously documented as `renderAny(text, styleKey, options)`.)*
- Dispatch is on `style.type`. `function` is checked **before** the switch
  (`style.type === 'function' && style.transform`); everything else falls
  through a `switch`, whose `default` is `renderMap`. The five values in live
  use, with their counts as of 2026-08-11 (114 styles total):
  - **`map`** (50) — positional Unicode substitution via `renderMap`
  - **`procedure`** (30) — named algorithm by `procedureId` (this is where
    zalgo, gal-moji, cuping and similar transforms actually live)
  - **`decorator`** (15) — named decorator by `decoratorId`
  - **`function`** (11) — `transform` fn; today this is the upside-down family
  - **`redact`** (8) — `redactChar`/`redactMode`
- `renderer.js` also has a `case 'pattern'` calling `renderPattern`, but
  **no style currently uses it** — supported, unused. Don't assume it's dead
  without checking; don't assume it's reachable either.

#### `script.js`
- Main IIFE wrapping all UI state and event logic
- Utility helpers: `$()` (querySelector) and `$$()` (querySelectorAll)
- Manages: input textarea, output grid, decorations (symbols, frames, dividers)
- Copy to clipboard via Clipboard API with visual toast feedback
- Real-time rendering as user types
- Style filtering/search (client-side)
- localStorage for recent selections and dark mode preference
- Query param `?q=text` for shareable URLs
- **Owns the flair layer.** `applyDecoration(text)` applies the selected
  decoration: `mode: "wrap"` (default `prefix+text+suffix`), `"space"` (fill
  spaces with `fill`), `"interleave"` (`sep` between graphemes, via
  `Intl.Segmenter`). Exposes `UltraTextGen.flairedMainInput()` and fires
  `utg:flairchange` so `game-rules.js` can count the *decorated* name.
- **Decoration tabs**: static `data-deco-tab` buttons read `decorations[key]`.
  `window.UTG_DECORATIONS` is **merged over** the defaults (`Object.assign`), so
  a page adds one tab without redeclaring the rest.

#### `js/flair/flair-engine.js`
- Shared, reusable decoration **data** (the transform lives in `script.js`).
- `UltraTextGen.flair.PACKS` — named packs (`gameFrames`, `crowns`, `warrior`,
  `hearts`, `brackets`, `spacing`).
- `compose({ tabKey: ["packName", …] })` → a `window.UTG_DECORATIONS` map, so
  pages compose tabs by name instead of copy-pasting arrays. `pickRandom()` is
  the seed for generative "surprise" flair.
- Load it **non-deferred, before** the inline `window.UTG_DECORATIONS = …compose(…)`
  config (which must run before the deferred `script.js`).

#### `js/gamename/game-rules.js`
- Per-game nickname **rule engine** + inline "name check" widget.
- `RULES` (per-game limits/weighting/charset), `analyze(str, gameId)`, and
  `initChecker(cfg)` (mounts a live checker that mirrors the generator input).
- With the flair bridge, the checker counts the *flaired* name — a frame that
  pushes a "fits" name over the limit now shows up before a rename card is spent.

#### `js/vertical/`
- Self-contained module for vertical text generation
- Files: `verticalPageController.js`, `verticalLayouts.js`, `verticalDecorators.js`, `verticalDecoratorData.js`
- Has its own manual test page: `verticalLayouts.test.html`

---

## HTML Page Conventions

All pages follow this structure and must maintain:

1. **Google Tag Manager** snippet in `<head>` and `<body>`
2. **Canonical URL** meta tag
3. **OpenGraph + Twitter Card** meta tags
4. **JSON-LD structured data** (FAQPage, WebSite, Organization, BreadcrumbList)
5. **Script load order**: header → styles → renderer → script (with `defer` on script.js)
6. **Dark mode support** via class on `<html>` element

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GTM, canonical, OG/Twitter meta -->
  <!-- JSON-LD structured data -->
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <!-- GTM noscript -->
  <div id="shared-header"></div>
  <!-- Page content -->
  <script src="/header.js"></script>
  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>
  <script src="/script.js" defer></script>
</body>
</html>
```

---

## CSS Conventions

- **Custom properties (CSS variables)** for all colors/theme tokens — required for dark mode
- **CSS Grid + Flexbox** for layout
- **Mobile-first** responsive design
- **Class naming**: hyphen-separated (e.g., `hero-headline`, `decoration-section`, `style-card`)
- **Dark mode**: toggled by adding `dark` class to `<html>`, not via `prefers-color-scheme` media query
- Do not use inline styles or `!important` unless absolutely necessary

---

## JavaScript Conventions

- **All modules use IIFE pattern**: `(function () { "use strict"; ... })();`
- **Globals**: Only `window.textStyles` and `window.UltraTextGenRender` are intentional globals
- **DOM helpers**: Use `$()` and `$$()` wrappers defined in `script.js`
- **Naming**: camelCase for variables/functions, SCREAMING_SNAKE_CASE for constants
- **No `var`**: Use `const` and `let` only
- **No external libraries** in frontend code — use native Web APIs (Clipboard API, fetch, localStorage, Intl)
- **No ES modules** (`import`/`export`) — scripts use global scope communication intentionally

---

## Adding New Unicode Styles

To add a new text style, edit `styles.js`:

1. Add an entry to `window.textStyles` with the shape shown above
2. Supply **exactly** 26 uppercase, 26 lowercase and 10 digits, **in order** —
   `upper`/`lower`/`nums` are read **positionally** (`upperArr[0]` is `A`), not
   looked up by letter
3. Set `type: 'map'` for standard character substitution
4. Assign `category`, `familySlug`, and `groupSlug` that match existing category pages
5. **A letter with no Unicode equivalent must still occupy its slot** — repeat
   the plain character (`…HIJ` with a plain `I`) rather than leaving it out.
   Omitting one shifts every later letter by a position, so a style missing `I`
   silently renders `J` for `I`, `K` for `J`, and so on to `Z`. Only a
   *trailing* omission is harmless, because `mapChar` falls back to the
   original character when the index is absent (`upperArr[u] || ch`).
6. Use an **array** instead of a string when a single "letter" is more than one
   codepoint — that is why `Ultra Regional Indicator` is an array. A positional
   string would split it mid-glyph.
7. Check the lengths before shipping: `renderMap` validates 26/26/10, but only
   warns behind `window.UTG_DEBUG`, so a bad map is **silent in production**.
   Run the renderer's own check rather than counting characters yourself —
   several styles store wrapped forms (`⦅❨A❩⦆`, `→A←`, `[A]`, `‹A›`, `‖A‖`,
   `|A|`) that `mapToArray()` parses with dedicated regexes, so a naive
   `Array.from(...).length` reports 8 well-formed styles as broken:
   ```bash
   node -e "
   global.window={UTG_DEBUG:true};require('./styles.js');require('./renderer.js');
   const bad=[],w=console.warn;
   console.warn=(m,slug,lens)=>{if(String(m).includes('Bad map lengths'))bad.push([slug,JSON.stringify(lens)])};
   for(const s of Object.values(window.textStyles)){if(s.type!=='map')continue;
     window.UltraTextGenRender.renderAny('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',s);}
   console.warn=w;bad.forEach(b=>console.log('BAD',b[0],b[1]));
   console.log(bad.length?bad.length+' malformed':'all map styles well-formed');"
   ```
   Verified 2026-08-11: all 50 `map` styles pass. `mapToArray` is not exported,
   which is exactly why this drives the check through `renderAny` instead of
   reimplementing the parsing — a second copy of that logic would drift from
   the first, the failure this whole section documents.

---

## Adding New Pages

### Platform page (e.g., a new social network)
1. Create `/<platform>/index.html` following the existing platform page structure
2. Update `SITE_PAGES` in `styles.js`
3. Add to the sitemap (auto-generated on next workflow run)
4. Add redirect if needed in `_redirects`

### Category page
1. Create `/category/<slug>/index.html`
2. Update `CATEGORY_PAGES` in `styles.js`
3. Assign matching `familySlug` values in relevant styles

### Before building a page for a keyword: check who already owns it

High search volume alone is not sufficient justification for a new page. Before
creating a page/spoke targeting a specific keyword or query cluster, check
whether an existing page in the same locale — including that locale's own
hub/homepage — already targets and ranks for the same term (search its title,
H1, and meta for the exact phrase and close variants). If a hub page already
owns the term, a new spoke competes with it instead of adding coverage, and
search engines will consolidate onto whichever page has more authority
(usually the hub) — leaving the new page with near-zero traffic no matter how
deep its content is.

**Case study (2026-07-06):** `vi/chu-kieu/` was created in a batch of 5 new VN
pages, justified in the commit message purely by keyword volume — "chữ kiểu /
tạo chữ kiểu / chữ kiểu đẹp (90.5k/mo)." But the `/vi/` homepage had already
been deepened around this exact term 9 days earlier (2026-06-27) and was
already ranking for it — the same commit even cited "ranking pos 4-8 on the
chữ kiểu cluster" as part of its own rationale, evidence the term was already
being served, without checking that the homepage was the asset doing the
serving. The result: `vi/chu-kieu/` shipped as a strictly thinner duplicate of
the homepage's own "chữ kiểu" section (same H1 pattern, same how-to/A-Z-table/
diacritic-FAQ structure, none of the homepage's use-case/guide/expanded-FAQ
depth) and earned ~1 click across a full month of GSC data, while the
homepage absorbed effectively all of the term's traffic (840+ clicks in the
same window). Confirmed via the query×landing-page GSC cross-tab, not
assumed.

Deepen the existing page instead of building a new one, unless the new page
serves a genuinely different search intent (e.g. an informational/explainer
job, not another transactional/tool page on the same term).

---

## Localization Workflow — the English-Parent Rule

Every non-English page on this site should have a live English parent — the
same feature, category, symbol, or library page, already shipped at its
canonical `/…/` (non-locale-prefixed) URL, that the translation is *of*.
This is not a style preference; it's a structural invariant the rest of the
site leans on: `hreflang` clusters are built around one `x-default` (always
the EN URL), the `Translating a library/symbol page` rule above inherits the
translation's `page_type` from the EN source, and every cross-language demand
doc in this repo's history (`bio-font i18n`, `alt-codes translation demand`,
`library translation demand`, etc.) is written as "translate this EN page,"
never "invent this local page."

**Before creating any `<lang>/…` page (or a locale build of a feature that
doesn't yet exist in English), stop and check:** does a live English parent
already exist at the equivalent `/category/`, `/library/`, `/symbol/`,
`/usecase/`, `/guide/`, or `/answers/` URL?

- **Yes** → proceed as a translation: reuse the EN page's structure/JS
  wiring, translate the copy, and wire full reciprocal `hreflang` (every
  locale variant links every other variant, `x-default` points at the EN
  canonical). Missing reciprocity is a real, recurring bug on this site, not
  a hypothetical — see the case study below. **"Reciprocal" includes the
  page itself (clarified 2026-07-26):** every page's hreflang block must
  contain a self-referencing entry for its own URL, and `x-default` must
  never point at the page itself on a non-EN page. The missing
  self-reference has been the single most-repeated mesh bug on this site —
  fixed on 26 `symbol/` pages (`43690ed8`), then 356 EN pages site-wide
  (`c3ead3d8`), then 12 more (`f749fe3c`), plus a third variant where
  the self-reference existed but pointed at a subtly wrong URL. When adding
  or auditing a cluster, check self-reference and `x-default` direction
  explicitly, not just cross-links between siblings.
- **No** → do not build the localized page directly. Build the English
  version first (it usually also captures a bigger, unvalidated EN/global
  search pool the localized-only page would leave on the table), *then*
  translate. If the underlying thing is genuinely local-only — no English
  speaker would ever search for it — that's a legitimate exception, but it
  is a **discussed, explicit exception**, not a default. Raise it and agree
  on it before writing the page; don't decide unilaterally that "this one's
  different."

**Case study (2026-07-14):** the Polish quotation-mark page
(`pl/library/cudzyslow-polski/`) shipped natively, framed in its own research
doc as "no EN equivalent exists yet, so this is new content rather than
translation" — before `symbol/quotation-mark/` existed. The EN page was built
shortly after and both got cross-linked, but for a window the PL page had no
English parent and, separately, the eventual EN/ES/PL/TR cluster still
weren't fully reciprocal with each other or with a later-added Indonesian
translation (`id/library/simbol-kutip/`) — a live hreflang mesh gap on
exactly this page family, fixed 2026-07-14. Two failure modes from one
example: sequencing (locale-first, no parent) and reciprocity (parent exists,
mesh incomplete). Check both.

**When scoping a translation, also check for cannibalization**, not just
existence — if a broader page already covers the term, a narrow new page
can compete with it instead of adding coverage. (E.g.: don't split a
dedicated German small-caps page off from `de/kleine-schrift/`, which
already ranks for "Kapitälchen," without checking whether the split adds
net-new coverage or just fragments an existing ranking.)

**Ratified local-only exceptions (2026-07-25):** a site-wide hreflang-mesh
audit surfaced `ja/gal-moji/` (a Japanese hiragana/katakana lookalike-glyph
cipher, registered in `styles.js` as a Japanese-script-only `procedureId`)
and the `ko/font-byeonhwan/` + `zh-tw/yingwen-ziti/` pair (a CJK-script-user
tool for decorating Latin/English text, distinct in H1/framing from each
locale's own homepage) as pages with no live English parent. Both were
discussed and explicitly ratified as genuinely local-only — no English
speaker would search "gal moji converter" or "English font generator" as
a distinct query from the plain homepage generator. `x-default` on all
three falls back to the bare EN homepage as a generic default only, per
CLAUDE.md's own distinction — this is *not* a translation-equivalence claim,
so it does not need to be (and should not be) auto-propagated as a real
sibling relationship. A same-day sibling, `ja/font-henkan/`, was reviewed
in the same pass and found to be a different case — cannibalization, not a
legitimate local-only exception (identical title/H1 to `ja/index.html`,
thinner content, zero cross-links) — and was 301-redirected to `ja/index.html`
instead of ratified.

**Ratified local-only exception (2026-07-26): `id/tulisan-cuping/`.** "Cuping"
(cute typing) is an Indonesian RP/Telegram trend that respells *Indonesian*
words phonetically to sound cuter (r→l, s→c, drop final h — `sering`→`celing`,
`jangan`→`janan`), with a few community-fixed forms the general rule doesn't
derive (`marah`→`mayah`). The transform operates on Indonesian phonemes, so an
English parent would not be a translation of this feature — English cute-speak
/uwu-typing is a different algorithm on different phonetics — and would sit at
zero demand by construction, since "cuping" isn't a term English speakers
search. Same shape of argument as `ja/gal-moji/` above, and it takes the same
structural form: no hreflang cluster at all, `id/`-only marketing page, with
the transform itself living in the shared global `renderer.js`/`styles.js`
registry like every other style (the *code* is never locale-partitioned; only
the page presenting it is). Demand evidence: "font cuping"/"cuping font"
substantial combined ID-market demand at low difficulty with weak incumbents.

Note this is a **precedent, not a template** — it does not license
speculatively building other locales' internet-slang transforms. Each future
case needs its own demand evidence and its own discussion, exactly as this one
did.

**Ratified exceptions, `id/usecase/nama-discord-keren/` and
`nl/sierlijke-letters/` (2026-08-03).** Both surfaced from a site-wide
duplicate-claimant scan (see "Parallel sessions build the same thing under
different names" below): each was a second page in its locale declaring an EN
parent another page already claimed. In both cases the pages are **not**
duplicates of each other — they serve different queries — so the fix was to
drop the wrong parent claim, not to merge. Both now carry a locale-only
hreflang block with `x-default` on the bare EN homepage as a generic default,
and their visible language switchers were trimmed to match (a switcher that
still lists a cluster the page has left is the same bug in the visible layer).

- **`id/usecase/nama-discord-keren/`** claimed `usecase/nickname-generator/`,
  which `id/usecase/nama-panggilan/` already owns. GSC (Jul 2–28) shows no
  query overlap at all: nama-discord-keren draws 118 impressions led by "nama
  discord keren" (63) and "nama role discord keren" (13), while nama-panggilan
  draws 28 led by "buat nama panggilan keren" (5). It is a Discord-name page,
  and **this site has no EN Discord-name parent** — `/discord/` is the
  generator hub and `usecase/nickname-generator/` is the general nickname
  page. Ratified as local-only rather than force-fitted to either.
- **`nl/sierlijke-letters/`** claimed `category/cursive-fonts/`, which
  `nl/cursieve-letters/` already owns — and in Dutch those are two different
  concepts: *cursief* is italic/slanted (what the Word button does), while
  *sierletters* are ornamental/calligraphic. GSC confirms the split, decisively
  and in the surprising direction: sierlijke-letters draws **1,768 imp / 45
  clicks** ("sierletters" alone 795/29) against cursieve-letters' 200 imp / 1
  click, despite being the smaller, less-linked page. Merging would have 301'd
  away the best-performing NL asset on the site. No EN "sierletters" parent
  exists; ratified as local-only. Rule 3 was applied in the same change —
  `nl/cursieve-letters/` had "sierlijke letters A–Z" in its own `<title>` and
  meta description, i.e. the hub was targeting the spoke's head term; that is
  now "cursief schrift A–Z".

**Ratified exception, `fr/calligraphie/`, `fr/changeur-de-police/`,
`fr/police-d-ecriture/` (2026-07-26):** these three are three of the six
`fr/` near-duplicate pages `ENGLISH-PARENT-RULE-AUDIT-2026-07-25.md` §2c
flagged as no-EN-parent with no discussed exception. A query-level GSC pull
(France, 26 days) settled the other three (`fr/ecriture-style/`,
`fr/generateur-de-texte/` retired via 301 to `fr/`; `fr/ecriture-speciale/`
left as-is, negligible volume either way — see commit for the full
per-page breakdown) but confirmed these three pass the site's own
Hub-vs-Spoke spoke test on the *French* evidence: `changeur-de-police`
(100% of impressions on queries `fr/index.html` never ranks for at all —
"change police"/"changeur de police"), `calligraphie` (76%, "calligraphie
copier coller"), and `police-d-ecriture` (54%, largest and still-growing
volume of the six — "police d'écriture"/"police ecriture", where the
homepage barely shows while this page holds a strong first-page position on
the exact same query).

**Important distinction from the `ja`/`ko`/`zh-tw` trio above: this is
*not* a "no English speaker would search this" claim** — "font" and
"calligraphy" are high-volume English concepts too. The actual reason no
EN parent exists is a **market-specific SERP-consolidation difference**:
the already-resolved "font converter" EN-parent question (`AUDIT-ACTIONS.md`
row 17, closed by `GOLD-ANALYSIS-2026-07-25.md`/`LOCALE-OPPORTUNITY-HUNT-
2026-07-25.md` §1c) found English/Spanish/Italian SERPs for that concept
pull the *same* competitor set as "font generator" — Google treats them as
synonyms there, so a standalone EN page would cannibalize the EN homepage.
The French GSC data above shows the opposite holds in the French market:
`fr/index.html` doesn't compete on these queries at all. This EN-side
synonym-consolidation read is inferred from the row-17 close-out, not
independently verified against EN GSC for "font"/"calligraphy" specifically
— worth a direct check before treating it as settled, but it's the reason
these three stay unbuilt in EN rather than a claim that the underlying
concept lacks English demand. `x-default` on all three (plus the live
non-English sibling `it/font-copia-e-incolla/` on the `changeur-de-police`
cluster) falls back to the bare EN homepage as a generic default only, same
as the trio above — not a translation-equivalence claim. *(Correction
2026-08-02: `it/caratteri-speciali/` was previously also listed on this
cluster, making two `it` claimants on one hreflang cluster — invalid, and
flagged by `audit-hreflang.js` as a stacked-cluster conflict.
`it/font-copia-e-incolla/` keeps the slot as the concept-equivalent of
"changeur de police"; `it/caratteri-speciali/` now stands alone with only a
self-reference + homepage `x-default`, same ratified no-EN-parent shape.)*

**Open follow-up, not yet decided (2026-07-26):** `fr/changeur-de-police/`
picked up new content the same day (a "changer un texte déjà écrit" FAQ, a
changeur-vs-générateur distinction FAQ, a before/after example) matched to
its GSC query cluster. Its live IT siblings, `it/font-copia-e-incolla/` and
`it/caratteri-speciali/`, were **not** updated — `check-translation-parity.js`
confirmed this is outside its own scope (it diffs EN↔locale pairs only; this
is an IT-FR-only cluster with no EN member), so nothing enforced a sync, and
none was done. This is a real gap: the site's tooling has no mechanism for
locale↔locale parity when neither side is EN. Needs a decision — port the
same content to the two IT pages, or record the divergence deliberately
(and if the latter, decide where: `data/translation_parity_exceptions.json`
requires an `enUrl`, so it doesn't fit this pair as-is) — not left to drift
by default.

**Ratified local-only exception pair, `vi/usecase/ten-lien-quan-dep/` +
`zh-tw/usecase/chuanshuo-duijue-mingzi-fuhao/` (2026-08-03):** both are
nickname/special-character generators for the *same* specific game — Liên
Quân Mobile in Vietnam, 傳說對決 (Arena of Valor) in Taiwan — Tencent's MOBA
with no meaningful English-market presence and no EN name-generator page for
it anywhere in `usecase/` (checked: no `arena-of-valor-name-generator`
exists). Discovered as a byproduct of an unrelated hreflang audit: both pages
were mis-parented onto the generic `usecase/nickname-generator/` hub, which
only has room for one `vi` and one `zh-TW` claimant — but `nickname-
generator` is genuinely generic (any game/platform), while these two are
narrowly game-specific, so neither was a good match for that hub's `x-default`
identity in the first place. Resolved by pairing them into their own isolated
2-locale cluster, exactly mirroring the existing `ko/font-byeonhwan/` +
`zh-tw/yingwen-ziti/` precedent above: `en`/`x-default` both fall back to the
bare homepage as a placeholder, not a translation-equivalence claim (per this
section's own established distinction). `usecase/nickname-generator/`'s `vi`
slot was reassigned to `vi/usecase/ten-game-hay/` (generic "cool game name,"
not tied to one game), which is the page that actually matches that hub's
intent. No Semrush/GSC demand check was run for this pair specifically —
Semrush was out of API units at the time — so unlike the `id/tulisan-cuping/`
or `fr/calligraphie` precedents, this exception rests on the structural/
linguistic argument (specific regional game, no EN equivalent exists to
translate) rather than confirmed search volume. Revisit with real numbers
if either page's ranking ever becomes a live question.

**Ratified exception, `tr/sekilli-yazi/` (2026-08-02):** an **EN-SERP-
consolidation** case, the same shape as the `fr/calligraphie` trio and
explicitly *not* a "no English speaker would search this" claim. The page
targets `süslü yazı` / `süslü harf` (fancy writing / fancy letters), which
obviously has English demand — but **the EN homepage already *is* that page**:
its H1 is literally "Fancy Text Generator", it uses "fancy text" 14 times, and
no standalone EN fancy-text page exists anywhere in the repo (only `answers/*`
spokes *about* fancy text, a different content type). Building an EN parent
would cannibalise the site's own homepage.

On the Turkish side the two do not compete, which is what makes the page worth
keeping: first-party GSC (27 days to 2026-08-02) shows it drawing **the
overwhelming majority of its impressions on `süslü` queries**, at first-page
positions, while sitting far down the SERP on the `şekilli yaz*` family that
`/tr/` owns. The page was retargeted
onto `süslü` on 2026-08-01 for exactly that reason.

**What is not verified:** the cannibalisation premise rests on this repo's own
structure, not on an EN SERP or EN GSC pull — Semrush has been out of API units
since 2026-07-30. The first reverse-demand sweep must check it, same caveat the
`fr/calligraphie` entry carries.

**Ratified exceptions are ledgered state, not just prose (2026-08-01):**
every ratified local-only exception above is also recorded in
**`data/english_parent_exceptions.json`** — the machine-readable ledger
`scripts/check-locale-parent-gap.js` consults, so a listed page passes the
gate's `no-en-parent` check and an unlisted one fails it. The prose above
stays the reasoning of record; the ledger is the state. Same bar as every
other ledger in this repo: entries are discussed decisions, never added
unilaterally to make a page pass. Each entry carries a `nextRecheck` date —
exceptions are standing claims about EN demand, and claims get re-verified,
not grandfathered.

**When EN demand appears later — ownership check before build (2026-08-01):**
if EN-side demand evidence surfaces for a page holding a local-only
exception, do **not** build the EN parent directly. Run the "check who
already owns it" test (see "Before building a page for a keyword" above) on
the **English** SERP/GSC first. Two outcomes only:

- **Build** — the EN SERP for the concept is distinct and no existing EN
  page owns it → build the EN parent, wire the hreflang cluster, and remove
  the page's `data/english_parent_exceptions.json` entry (it's now a normal
  translation).
- **Veto** — the EN SERP consolidates the term onto an existing page (the
  `fr/calligraphie` trio's situation: real EN "font"/"calligraphy" volume,
  but building a parent would cannibalize the EN homepage) → record a dated
  `veto` in the entry's `verdict` and push out `nextRecheck`.

Demand alone never auto-triggers the build — that shortcut is how the
`vi/chu-kieu/` class of cannibalization happens on the EN side.

### Locale-native internal linking — check every time you touch a locale page

Whenever you create, edit, or otherwise touch a locale page's prose/FAQ
content or outbound links — the locale **homepage** most of all, since it's
the highest-authority page in each locale and every rich section on it is a
candidate to compete with its own spokes — check whether the specific
sub-topic being discussed or linked already has a **locale-native page**
(an existing `<lang>/...` page). If it does, the link must point there, not
to the English `/category/`, `/library/`, `/usecase/`, `/guide/`, or a
platform root like `/discord/`.

Two failure modes, both real, both need checking before shipping any change
to a locale page's outbound links:
1. **Miswired** — a link exists but points to the English page even though a
   locale-native equivalent already exists (e.g. an Instagram-bio card
   linking to `/instagram/` while `/ru/shrift-dlya-instagram/` already
   existed).
2. **Missing link** — a rich, single-topic prose section or FAQ answer has
   no outbound link at all to a deeper page, even though a locale-native
   page on that exact topic already exists (e.g. a full A–Z Gothic/Cursive
   alphabet table on a homepage never linking to the dedicated
   `/<lang>/gothic-style-page/`).

Both cause the same GSC failure mode as the "check who already owns it"
case study above, just in the other direction: instead of a new page
cannibalizing an existing one, the **existing hub cannibalizes its own
spoke** because the internal link that should point search engines (and
users) onward either doesn't exist or points to the wrong page.

**Before shipping any change that touches a locale page's prose/FAQ content
or its outbound links:**
1. List every locale-native sub-page that exists for that locale (`ls
   <lang>/`, or glob `<lang>/**/index.html`).
2. For every prose section / FAQ answer that discusses one specific
   style/topic/platform in depth, check whether a locale-native page already
   covers that exact topic.
3. If yes, verify — don't assume — that the section/answer links to it, not
   to the English equivalent or nowhere. Confirm the target file actually
   exists on disk before citing or linking it.
4. If it doesn't, fix the link (or add one) as part of the same change —
   don't defer it to a later cleanup pass.

**Case study (2026-07-17):** PR #586 fixed 3 instances of this in `fr/`,
`id/`, `it/` homepages, framed as isolated fixes found via one-off GSC
analysis. A same-day follow-up audit of all 27 locale homepages found the
identical pattern in 21 more locales — `de/index.html` alone had 13
locale-native pages with zero inbound links from its own homepage, including
a whole "Discord-Schriftart" section linking to the English `/discord/`
instead of the existing `/de/discord-schriftart/`. This should have been
caught the first time by treating it as a systemic linking check rather than
a one-off bug — hence this standing rule. Do not treat a discovered instance
of this pattern as isolated; check the rest of that locale's homepage (and
other locale homepages) for the same failure mode while you're in there.

---

## Translation Parity — keeping EN and locale pages in sync after creation

The English-Parent Rule above governs *creation*: does a live EN parent exist
before a locale page gets built. It says nothing about what happens *after*
both exist — when the EN page (or a locale page) gets edited later and its
sibling doesn't. That gap is real and has already shipped drift: a batch of
Gulf currency `symbol/` pages (`dirham-sign`, `omani-rial-sign`,
`saudi-riyal-sign`) was added to `library/currency-symbols/` across two PRs
(2026-07-22) with zero of its 9 locale siblings (including `ar/` — arguably
the highest-value locale for Gulf currencies) touched in either PR. Nobody
was watching for it because nothing was watching for it.

**The rule:** when you edit a page that has an hreflang cluster (an EN page
with locale translations, or a locale page with an EN parent), check whether
the edit is structural — a new internal link, a new FAQ item, a new section,
a new symbol tile — not just wording. If it is, either update the sibling(s)
in the same change, or record why they're allowed to diverge. This runs
**both directions** — EN changed without the locale catching up, or a locale
changed without EN (or its other locale siblings) catching up — the tooling
below does not care which side moved first.

**EN and a locale page are allowed to differ** — translators make real
editorial calls (a different related-links set, a regionally relevant FAQ)
and not every EN addition needs a translation the day it ships. But per the
user's standing requirement, that divergence must be an **explicit, agreed
decision**, not silence. Record it in
`data/translation_parity_exceptions.json` (reason + date) rather than just
leaving the sibling stale — see that file's own `_readme` field for the
entry shape.

### Tooling

- **`node scripts/audit-translation-parity.js`** (`npm run
  audit:translation-parity`) — point-in-time sweep of every hreflang cluster
  site-wide. Diffs a language-independent "structural fingerprint" (internal
  content links — resolved through the hreflang map so a locale-native link
  and its EN equivalent count as a match, not a diff — plus FAQ/`<h2>`/
  `.symbol-tile` counts) between EN and each locale sibling. Default output
  leads with the highest-signal view: recent EN `feat:` commits whose locale
  siblings weren't touched afterward — the shape of the currency-symbols
  case above. Pass `--full` for the complete per-pair dump, `--json <path>`
  for raw data, `--report <path>.md` to save a snapshot. This is a discovery
  tool for triage, not a blocking check — the existing site has a real
  backlog of drift and this will not (and should not) go to zero in one
  pass.
- **`node scripts/check-translation-parity.js`** (`npm run
  check:translation-parity`) — the enforcing half, wired into
  `.github/workflows/validate.yml` as a required CI check on every PR (same
  continue-on-error-then-fail pattern as the hreflang/library/image
  validators). Diffs the PR branch against its base, and for every changed
  HTML page whose structural fingerprint actually moved, requires at least
  one sibling in its hreflang cluster to have been touched in the same PR —
  unless the pair is listed in `data/translation_parity_exceptions.json`.
  Fails the PR otherwise, with the exact EN/locale file pair and the fix (sync
  the sibling, or add a ledger entry). Byte-level edits that don't change
  the fingerprint (typos, meta-description tweaks) never trigger it.
- Both scripts share `scripts/lib/translation-clusters.js` (hreflang cluster
  discovery) and `scripts/lib/content-fingerprint.js` (the fingerprint/diff
  logic) — the audit and the enforcement gate must never define "changed" or
  "cluster" differently, so that shared logic lives in one place.

### Structure is not language — the completeness gate (added 2026-08-15)

Everything above compares **structure**: link sets, `<h2>`/FAQ/tile counts. A
locale page that is 90% translated has exactly the same structure as one that is
100% translated, so it passes. Every other gate is blind to language too — the
mesh gate reads hrefs, the image gate reads asset paths, the FAQ gate compares a
page against *itself*. **Nothing was checking whether a locale page is actually
in its own language.**

Three classes shipped through all five gates during the 2026-08-15 library
expansion, each found only after the previous one was fixed:

1. **Body prose.** Seven pages went live with an English intro paragraph, an
   English combo blurb and the English "Transform text with Unicode fonts" CTA
   card. Verification had looked at aria-labels, headings and links — all
   genuinely complete — and nothing looked at prose.
2. **Visible tile labels.** Every symbol tile carries its name **twice**: once in
   `aria-label="Copy X"` and again as visible text in
   `<span class="flag-label">X</span>`. Only the aria-label was being translated,
   so **24 already-pushed pages showed English labels under localised buttons**.
3. **Clipboard payloads.** `data-symbol="☑ Done"` pastes English *from a locale
   page* — the one-click copy that is the page's whole point.

The pattern is the lesson: each fix caught the surface it was written for and
missed the next one. So the check is not pattern-based. It extracts every
translatable string from the page's **own English parent** (via that page's
`hreflang="en"`) and asserts that none survives verbatim.

#### Tooling

- **`npm run audit:locale-translation`** (`scripts/audit-locale-translation.js`)
  — whole-site dashboard, per-locale counts, `--full` for every string,
  `--locale <code>` to scope, `--json`/`--report` to save. Discovery tool, not in
  CI. The first run found **2,256 of 3,580 locale pages** carrying at least one
  English source string — led by the shared CTA paragraph on **406** pages and
  `aria-label="Breadcrumb"` on **527**. That backlog is real and is not this
  gate's job to clear.
- **`npm run check:locale-translation`** (`scripts/check-locale-translation.js`)
  — the enforcing half, wired into `.github/workflows/validate.yml` as a gating
  step. Diff-scoped like `check-faq-schema.js`.
- Both share **`scripts/lib/locale-translation-audit.js`**, so "untranslated"
  can never mean two different things.

**It measures the delta, not the state** — the same reasoning as the parity
gate's convergence carve-out, and for the same reason. Mesh, hreflang and asset
passes legitimately touch hundreds of pages without changing a word of their
copy; failing a PR for English it did not introduce is how a gate gets ignored.
A string counts against a branch only if it survives **now** and did not survive
at the merge base (compared against the base's *own* EN parent, so an English
page growing a new string cannot silently indict every translation that hasn't
caught up). Pre-existing survivors are **reported, never silenced** — verified
on the branch that added this: 0 introduced, 73 pre-existing surfaced, exit 0.

**Two comparison rules that are not optional.** Compare extracted string *sets*,
never substrings — a naive `enString in localeHtml` test reports "Dove" as
untranslated on an Italian page, because *dove* is an ordinary Italian word. And
a candidate needs a run of four Latin letters, which is what keeps glyph tiles
(♠ ☮ ✓) and CJK/Arabic/Cyrillic strings out of the set entirely.

**`data/translation_identical_strings.json`** holds strings whose *correct*
translation is byte-identical to the English — "Cupcake" in Dutch, "Joystick" in
German, Jupiter/Mars/Pluto in Dutch. Each entry carries a reason and the page
that surfaced it. It is a ledger, not a suppression list: **never add an entry to
silence a string you have not translated** — same bar as every other ledger here.

**A formal identifier is not English (decided 2026-08-15).** A Unicode block
name, a Unicode character name, a CSS/LaTeX literal, a keyboard shortcut, an
HTML entity and a country name are all *proper names or code*, and the other
Latin-script languages here cite them by that same name inside otherwise
translated prose — Spanish "en el bloque Latin-1 Supplement", French "du bloc
« Latin-1 Supplement »", German "im Block Currency Symbols von Unicode". Several
locales set them in citation quotes, which is the tell. They never count as debt,
and the rules live in `scripts/lib/locale-translation-audit.js` rather than in an
analyst's script, so the number does not have to be re-derived each time.

**The exemption is scoped by slot, not by string, and that distinction is
load-bearing.** A proper name is exempt where it is *cited* — prose, a table
cell, a tile label — but stays a defect in a heading, card title, section label
or `aria-label`, because those are page copy. Both cases exist on this site at
once: `Currency Symbols` is a cited Unicode block name in a `<td>` on
`symbol/bitcoin-symbol` **and** a related-card `<h4>` on 14 other pages. A
string-level exemption would silently clear those 14 real defects; verify any
change to this rule against exactly that pair.

Both lists are **harvested from the site's own English pages** — block names from
`<td>Unicode block</td>` property rows, country names from
`library/emoji-flags`'s own registry — never hardcoded, for the same reason
`generate-site-art.py` reads a page's own tiles: the site is the authority on
what it cites, and the list maintains itself.

**Do not widen this into "descriptive" names.** Title-case renderings of Unicode
character names (`Heavy Check Mark`, `Downwards Arrow From Bar`) are **not**
exempt — this site translates them everywhere else, so they are ordinary debt.
Only the ALL-CAPS formal form (`DIVISION SIGN`) is an identifier.

Verified per this file's own rule before being trusted (see "Adding a validator
script is not the same as gating on it"): three defects were injected into a
finished Japanese page — one per class above — and the gate exited 1 naming all
three. Do not trust a future edit to it without repeating that.

**Punctuation is not English (added 2026-09-02).** The delta rule compares string
*sets*, so changing an existing untranslated string's punctuation makes the same
debt, on the same page, in the same words, a string the base set does not
contain — and the gate reads the edit as an introduction. This is the third
instance of the inversion `check-locale-translation.js` already documents for
reverts, and it is measured the same way: `wordKey()` compares the words when
deciding whether a survivor is the *same* debt as one at the base, and never
when deciding whether a string is English in the first place. Scoped per page,
so a survivor on one page can never excuse a new string on another.

Found by the em-dash pass below, which rewrote 2,915 tile labels and turned 9
byte-identical pre-existing survivors into 9 reported introductions. Verified
against three probes — a genuinely new English string on both sides of a pair
(exit 1), an existing survivor with words added (exit 1), and one re-punctuated
only (exit 0). The first attempt at the first probe was a **false green**: it
injected a different string on each side, so there was nothing to survive. Build
the probe as a real pair.

**A ledger entry's text can go stale under it.** Nine
`data/translation_identical_strings.json` entries stopped matching when the
labels they name were re-punctuated. Re-pointing an existing entry at the same
string is maintenance of a decision already taken; it is not the same act as
adding one, and the standing bar still forbids the latter.

### EN is the source locale — two structural carve-outs (added 2026-08-02)

The rule above was written as if EN and a locale page were peers that drift
apart. They aren't: **EN is where pages are born.** A new EN page gets linked
from existing EN pages immediately, and translated later or never. Without
allowing for that, the gate fires on essentially *every* new EN page, and a
gate that fires on everything trains people to ignore it. Two carve-outs, both
in the shared fingerprint logic so the audit and the gate can't disagree:

**1. Catalogue indexes don't diff their inventory links.** A pillar index lists
the pages that exist *in its own locale*. EN `library/index.html` carries ~306
content links; its locale siblings carry 7–50, and every locale
`category/index.html` carries **0**. That gap is correct — a Danish catalogue
must not link an English-only page (see "Locale-native internal linking"). So
for the eight pillar indexes in **`data/parity_catalogue_pages.json`** (and
their locale equivalents), the internal-link set is dropped from the
fingerprint. **`<h2>` count, FAQ-schema question count and `.symbol-tile` count
are still compared**, so adding a real section or FAQ to an index still fires.
A hub that merely links many spokes (`library/currency-symbols`) is *not* a
catalogue — its links are editorial and keep full coverage.

**2. Adding a link to a page that doesn't exist in the sibling's locale
doesn't require that sibling to be touched.** When the *only* structural change
to a page is added outbound links, the gate now resolves each new target
against the sibling's language: if none of them has a translation in that
language, the pair is skipped, because linking the English page from a locale
page is precisely what the locale-native rule forbids. The moment a translation
of the target exists, the pair is flagged again — which is the right trigger,
since the sibling can now link its native equivalent.

Deliberately still flagged, in both carve-outs: a **removed** link, a changed
`<h2>`/FAQ/tile count, and a new link to a page that **does** have a sibling in
that locale (verified: adding a `/library/currency-symbols/` link to
`/discord/` flags exactly `fr` and `id` — the two of its eleven siblings that
have that translation). `linksUnreachableFor()` is conservative by
construction: an unresolvable link target counts as reachable, so an unknown
link can never silently suppress a flag.

### Repairing drift is not creating it — the convergence carve-out (added 2026-08-06)

The gate infers drift from *"one side of a cluster moved, the other didn't."*
That proxy **inverts on a backfill**. A pass that adds content the sibling
already has — the locale half of a peer-link sync, a missing FAQ ported over,
an EN page catching up to links its translations already carry — necessarily
touches one side only, so the gate reads the repair exactly like the damage.
Not hypothetical: the locale peer-link sync above tripped it **353 times**,
in both directions, with every single pair ending up measurably *closer* to
its sibling than it started.

So `check-translation-parity.js` now measures the thing the rule is about
instead of inferring it. `convergedTowards()` scores pairwise divergence
before vs after against the untouched sibling as a fixed reference (same
shared fingerprint/diff/score the audit uses); a **strict** decrease means the
page moved toward its sibling and there is nothing to sync. Applied on both
branches — per-sibling on the EN branch, since one EN edit can converge toward
some siblings while diverging from others. Converged pairs are **reported**
with their before→after scores, never silenced.

Strict `<`, not `<=`, on purpose: trading one divergence for another nets to
zero and is precisely the drift this check exists for. New pages are
unaffected (no prior state to have converged from). Verified still catching
real drift: an added `/library/currency-symbols/` link on `/discord/` flags 7
pairs, and deleting one peer card from a locale symbol page flags that pair.

*(Note: the carve-out section above records that probe as flagging "exactly
`fr` and `id`". It flags **7** locales as of 2026-08-06 — five more have since
gained a currency-symbols translation. The probe still works; the expected
count moves as the site grows.)*

### The fingerprint must measure content, not metadata (added 2026-08-21)

Two defects in `scripts/lib/content-fingerprint.js` made the parity gate report
**repairs as drift**. Together they flagged 24 pairs in one PR, none of which had
actually diverged. Both are the same failure as the two carve-outs above — the
proxy inverting on a legitimate repair — so read them as a third instance of that
pattern, not a new one.

**1. `faqCount` counted JSON-LD questions, which is metadata, not content.** The
two routinely disagree: this file names the stale-schema case (visible FAQ edited,
JSON-LD left behind) as the more common FAQ failure mode, and the site once
carried 214 pages of it at once. So backfilling `category/underline-text`'s
JSON-LD from 10 questions to the **24 its page had been rendering all along**
changed no page copy whatsoever, yet moved `faqCount` by 14 and flagged all 10 of
its locale siblings — whose real gap against it had not moved by one item.

Worse, it set two gates in this repo against each other: `check-faq-schema`
*requires* the JSON-LD to match the visible FAQ, and paying that debt cost you a
red parity check. The incentive pointed at leaving the schema stale.

It now counts rendered `.faq-item` elements, which covers both house variants (the
JS-bound `div` accordion and the JS-free `details` disclosure). **No-op for 2,813
of the 2,871 FAQ-bearing pages** — the 58 that differ are precisely the stale ones.
A page shipping orphan schema now counts 0 here; that defect belongs to
`check-faq-schema.js`, which owns and gates on it. Verified the division holds:
a JSON-LD-only question added to `symbol/euro-sign` is **ignored by parity** (no
content moved) and **caught by `check-faq-schema`** (exit 1) in the same run.

**2. `score()` treated its three count axes as booleans**, so a page 20 sections
short of its sibling scored the same `1` as a page short by one. That silently
broke the convergence carve-out above on those axes: a page catching up could only
register as converged by landing **exactly** equal, so every partial step read as
no movement at all. Both genuine cases in that PR were exactly this —
`tr/symbol/dolar-isareti` porting in the "why $ shows up outside pricing" section
its EN parent already had (h2 gap 3→2, tiles 5→4), and
`ru/library/html-spetssimvoly` deleting an empty section its EN parent never had
(h2 gap 2→1). Both moved toward their sibling; both were reported as moving away.
Magnitudes fix it; convergence still requires a strict decrease, so trading one
divergence for another still nets non-negative.

Verified per this file's own rule ("Adding a validator script is not the same as
gating on it") against four probes, each on a page **outside the branch's changed
set** — that scoping matters, and getting it wrong reads as a false green: the
first attempt probed pages the branch had already touched, where a touched sibling
legitimately counts as the sync, and all three came back exit 0. On clean pages:
adding a `/library/currency-symbols/` link to `/discord/` flags 7; removing a peer
card from `fr/symbol/symbole-euro` flags 1; adding an h2 section EN lacks flags 1;
adding a **visible** FAQ item to `symbol/euro-sign` flags 16.

### A table was invisible to every axis (added 2026-09-02)

`<h2>` came closest to seeing a table and missed the case exactly: a table under
a heading that stays can be deleted outright with links, h2, FAQ, tiles and
combo-sets all reading zero. PR #836 removed a whole 7-row table from
`updates/middle-east-currency-symbols-scorecard` and its eight siblings; had it
touched EN alone, the gate would have reported nothing. Same shape as the
`events` link-type gap and the runtime combo-set gap above, from a fourth cause.

`tableCount` closes it. **The selector is `table`, not `.data-table`** — the
house class covers 2,353 of the site's 2,470 tables, and `comparison-table`
(114) plus `ig-matrix` (2, on `instagram/` and its live `sv` sibling) carry the
rest. Enumerating classes would recreate `CONTENT_LINK_RE`'s `events` bug
verbatim: a class added later becomes a table nothing covers, silently. The
element cannot go stale.

**Rows are reported, never scored.** They are content inside a section and
differ legitimately by locale: `fr/symbol/symbole-paix` carries an extra
platform row and an extra input-method row against `symbol/peace-sign`, and a
longer alphabet always will. Of 3,693 EN/locale pairs, 64 match on table count
and differ on rows — a set mixing genuine half-ported tables with differences no
edit can converge. Scoring it would flag pairs with nothing to fix, which is the
call `pairCollections()` already makes for a renamed container id.

Blast radius measured before landing: 656 of 3,693 pairs (17.8%) already differ
on table count. The gate is diff-scoped so that backlog cannot make it red, and
a constant pre-existing offset cancels out of the convergence carve-out, which
compares one pair against itself.

Verified against four probes on pages **outside the branch's changed set**:
deleting a 6-row table from `symbol/peace-sign` exits 1 **with every pre-existing
axis reading 0**, which is the whole finding; a row added to an existing table
exits 0; a meta-description tweak exits 0; adding a `comparison-table` to
`de/symbol/friedenszeichen` exits 1, which is also what proves the selector
choice — `.data-table` would have missed it.

**This is not an exceptions ledger.** `data/translation_parity_exceptions.json`
exempts one discussed EN/locale *pair*; `data/parity_catalogue_pages.json`
classifies a *page type* whose link list is an inventory. Adding a pattern to
it is a structural claim about the template and should be raised like any other
registry change — but it is not a per-page permission and must never be used as
one.

**Watch out when running the gate locally:** it diffs `merge-base..HEAD`, so
**uncommitted work is invisible to it**. Running it with changes still in the
working tree reports on an unrelated delta and can read as a false green —
commit first, then run.

**Do not add an entry to `data/translation_parity_exceptions.json`
unilaterally.** Every entry there is supposed to represent a real,
discussed decision between you and the user — the same bar the English-
Parent Rule sets for locale-first exceptions above. If `check-translation-
parity.js` flags a pair, either sync it or raise the divergence with the
user before recording it as intentional.

---

## Local Language Intelligence

There is a researched, evidence-backed dictionary of locally-native
vocabulary for this site's top-opportunity locales, distinct from a plain
translation memory. It captures, per concept per market: the literal/
dictionary translation, the grammatically correct translation, the phrase
locals actually say, the phrase locals actually type into search engines/
forums/games, and when that phrase is and isn't appropriate.

**None of this data lives in this repo (changed 2026-08-19), and it is not
meant to.** It lives exclusively in a separate, non-public workspace's own
`forum-intelligence/language-dictionaries/local-language-lexicon.csv`. A
generated, approved-only public snapshot used to be synced into
`data/local-language/<locale>.json` here; it was removed because nothing on
the live site ever read it (confirmed: no page JS, no HTML, no Cloudflare
Function consumed it) and it was publishing real research judgment
(`usage_guidance`, `avoid_when`, `confidence` — not just the phrase itself)
into a **public** GitHub repo for no operational reason. Any work needing
this data now attaches that workspace as a sibling checkout and reads the
canonical CSV directly, filtered to `status` in `{approved, limited_use}` —
`scripts/plan-library-locale-batch.py`'s `native_phrases()` is the reference
implementation (it discovers the file by that path shape under any sibling
directory rather than a hardcoded name), and it fails loudly (non-zero exit,
explicit message) if no such workspace is attached, rather than silently
treating an unchecked locale as if it had no vocabulary on record. Full
methodology, schema, and every locale's write-up:
`docs/local-language-intelligence.md`.

**The core rule: use locally natural vocabulary when it fits the user's
exact intent, platform, audience, and register — never insert a phrase
merely because it's in the dictionary.** This is a decision aid, not a
keyword-insertion engine.

1. Before writing or materially editing localized copy for one of the
   covered locales, attach the workspace that holds the library (if not
   already attached) and check its `local-language-lexicon.csv` for that
   locale, filtered to `status` in `{approved, limited_use}` (and its
   `country_or_market` field if the locale has regional splits — see below).
2. Use a local phrase only when it naturally fits the exact meaning,
   platform, game, audience, and register of the sentence you're writing.
   Do not try to use every available phrase, do not set a keyword-density
   target, and do not stuff several near-synonym variants into the same
   title or heading.
3. Every page keeps **one primary query target** — a local phrase never
   overrides that. It supports the existing title/H1, it doesn't compete
   with it. Follow this file's existing Hub vs Spoke, cannibalization, and
   English-Parent rules first; the local-language dictionary is an input to
   *how* you word a page, never a reason to restructure or duplicate one.
4. **A local phrase discovered in research does not, by itself, justify a
   new page.** "This phrase exists" is not a build brief.
5. Do not mix vocabulary from neighboring countries/markets without
   evidence — e.g. Mexican Spanish into an `es_ES`-targeted section,
   Portugal-Portuguese into `pt_BR` copy, Gulf Arabic into pan-Arabic MSA
   copy. Each lexicon record's `country_or_market` field tells you which
   market it's evidenced for; a record's `avoid_when` field tells you the
   specific situations to skip it in.
6. Respect `content_surface` and `register` on each record — a phrase
   flagged for FAQ/generator-example use only should not be promoted into a
   title or H1, and community/gaming jargon does not belong in legal,
   accessibility, or technical explanatory copy just because it tested well
   elsewhere.
7. **Continuous capture rule:** whenever research (forum reading,
   competitor research, GSC query analysis, keyword research, social/game/
   platform research, user feedback, a content audit, an issue/PR
   discussion, or native-speaker review) surfaces a locally meaningful word,
   phrase, abbreviation, cultural expression, platform term, gaming term,
   problem description, or search formulation relevant to UltraTextGen —
   record it in the internal Local Language Intelligence
   Library as a new `candidate` record (or add evidence to an existing
   `phrase_id` if the same phrase already exists — search for a match
   before creating a new record). Do this even if you don't end up using
   the phrase on any page this session.
8. **A newly discovered phrase must never be inserted directly into
   production copy the same pass it's discovered.** It goes into the
   library's own research workspace as `candidate` first. Only `approved` or
   `limited_use` phrases are meant for production copy, and even then only
   per rule 2 above.
9. **This repo carries no copy of the lexicon and never should** — see
   "Where the data lives" in `docs/local-language-intelligence.md` for why
   the old public snapshot was removed 2026-08-19. If a phrase needs a
   status change or correction, that happens directly in the workspace that
   holds the library (never here) — see that workspace's own capture/
   promotion workflow documentation.
10. A local phrase, however well-evidenced, never guarantees ranking — it's
    a fit signal, not a growth lever on its own.

---

## Locale Parent Governance — Core Parent Set, Locale Qualification Tiers, and the pre-build gap check

The English-Parent Rule (above) governs *does a parent exist*. Translation
Parity (above) governs *do EN and a locale sibling stay in sync after both
exist*. Neither one answers *should this parent even be mirrored into this
locale by default*, and the site went a long time answering that question
by "wait for a forum thread to surface it" — a mechanism with a proven,
expensive blind spot: EN `/symbol/` had 77 pages, FR `/symbol/` had 6, and
nothing flagged it until a one-off manual Semrush pull (2026-07-14) found
**~49,960 searches/month** of directly-evidenced French demand (euro-sign,
micro-sign, not-equal-sign, delta-symbol, +11 more slugs) sitting there undetected the whole time the
English parents were live.

**The rule:** two data-driven registries replace tribal knowledge about
which parents/locales get mirrored, and the default only flips to "mirror"
at their intersection:

- **`data/core_parent_set.json`** — tiers page-pattern prefixes (`symbol/*`,
  `library/*`, `category/*`, specific `usecase/` carve-outs, pillar hub-index
  overrides, …) as `core` (mirror by default — burden of proof is on NOT
  translating), `gated` (translate only on a cleared demand check — burden
  of proof is on translating), or `never`. Most-specific-pattern wins when
  more than one entry matches a path.
- **`data/locale_qualification_tiers.json`** — tiers every one of the 29
  canonical locale codes as Tier 1 (deepen + mirror Core now), Tier 2
  (qualify via the existing 7-point gate, then mirror Core), or Tier 3
  (hold/stub, no spec mirroring). A locale can additionally carry
  `hold: true` within Tier 2 for a non-content reason (authority/indexing
  gap rather than a content gap) — no locale currently does. `vi` carried
  this from 2026-07-24 to 2026-08-06 (lifted per user decision — see
  "What passes a gate" §3 below for the override history, and
  `docs/locale-parent-governance.md` §2 for the full record); it's plain
  Tier 2 now, same as its qualify-then-mirror-Core siblings.

`scripts/lib/locale-parent-registry.js`'s `decide(relPath, localeCode)` walks
the full 5-step flowchart (Tier-3/held locale → skip; script-incompatible
Core parent → skip this parent here; Core parent → mirror by default; gated
tail → gate by default; on ship, mesh is generated automatically) and
returns a decision object, not a bare string. Run
`node scripts/check-locale-parent-tier.js <path> <locale>` before starting
any new locale-page work to see exactly what it returns. Full schema, the
complete flowchart, and every script's flags/exit codes:
**`docs/locale-parent-governance.md`**.

### Tooling

- **`node scripts/sync-locale-mesh.js`** (`npm run sync:locale-mesh`) —
  generates the reciprocal hreflang set (by delegating to the existing
  `scripts/audit-hreflang.js --fix`, gated on this script's own `--fix` flag)
  and locale-native internal-link rewrites (via the new
  `scripts/lib/locale-link-rewrite.js`), scoped to `--files <path...>` or the
  whole tree by default. Report mode (no `--fix`) is safe/read-only; `--fix`
  mutates in place. This is the Phase-0 "generated, not audited" mesh
  automation — `scripts/generate_library_page_from_spec.py` calls it
  automatically (best-effort, `--fix --files <new page>`) right after writing
  any non-English page; other generators should get the same hook the next
  time they're touched. **Scoping (fixed 2026-07-26, same day the caveat
  was written):** `--files` now scopes BOTH passes — the hreflang `--fix`
  is forwarded as `--scope-files`, which still scans the whole tree
  (reciprocity can't be judged from a subset) but only writes to the named
  files plus members of their own hreflang clusters. Before this fix the
  hreflang pass was unscoped and could mutate files far outside the paths
  you named (case: `148fcd59`, where a scoped run stamped a duplicate
  `zh-TW` alternate onto `ja/font-henkan` and `ko/font-byeonhwan` — two
  ratified local-only exception pages in a completely unrelated cluster).
  The fixer also now refuses to insert an entry for an hreflang code the
  file already declares with a different href — that's a conflict flagged
  for manual review, never auto-stacked. A site-wide (no `--files`) `--fix`
  run remains intentionally unscoped: still review its diff before
  committing, and revert out-of-scope edits rather than shipping them as
  drive-by fixes. Related hazard: the ratified local-only pages (see
  "Ratified local-only exceptions" above) intentionally do NOT form a full
  translation-sibling mesh — automated mesh tooling doesn't know that, so
  treat any tool-made hreflang change to those pages as a bug to revert,
  not a fix.
- **`node scripts/check-locale-mesh.js`** (`npm run check:locale-mesh`) —
  the enforcing, diff-scoped PR gate, wired into `.github/workflows/validate.yml`.
  For every changed locale page: fails if its hreflang cluster has a
  non-reciprocal or headless member, or if it links an English hub/spoke
  where a locale-native equivalent already exists and wasn't rewritten. Fix
  is always `npm run sync:locale-mesh -- --fix`.
- **`node scripts/audit-hreflang-completeness.js`** (`npm run
  check:hreflang-completeness`) — whole-site, blocking (like
  `audit-hreflang.js`), wired into `.github/workflows/validate.yml`. Checks a
  DIFFERENT failure mode than `audit-hreflang.js`/`check-locale-mesh.js`:
  those two check pairwise reciprocity (if A links B, does B link back to
  A), which can only inspect edges that actually exist. If two cluster
  members BOTH omit each other — no edge in either direction — there is
  nothing for a reciprocity walk to catch. This script instead reconstructs
  true cluster membership independent of the edges being checked (a page's
  cluster is whichever EN URL its own `hreflang="en"` entry points at, same
  as `scripts/lib/translation-clusters.js` uses for translation-parity), then
  requires every member to link every other member. `--fix` inserts the
  missing entries; run unscoped, review the diff, commit. It also detects
  (but never auto-fixes) **duplicate-page clusters** — two members that
  declare the *same* locale for one EN parent, a content bug not a
  completeness gap (see "Parallel sessions build the same thing under
  different names" above) — surfaced in its output for manual resolution,
  which does not block the exit code.
  **Case study (2026-08-05):** the mutual-omission gap was first discovered
  2026-07-26 by a routine reciprocity spot-check that found 5 of 8 members
  of `library/cross-x-symbols/` (es, ko, pt, ar, id) each missing 1-2
  sibling entries, invisible to `audit-hreflang.js` because every gap was a
  mutual omission. This script was built the same day and a first site-wide
  `--fix` run (PR #702) queued a backfill of 8,414 links across 1,702 pages
  — but by the time that PR was actually landed the site had grown
  substantially further (new locale pages, new clusters), so the branch was
  regenerated from a fresh run against current `main` instead of merging the
  stale diff (and regenerated a second time after `main` moved again mid-work
  — see the PR's own thread for the exact commit this run landed against).
  The fresh run found a larger gap, consistent with that growth: 1,980 pages
  across 277 clusters missing 13,495 sibling entries in total, auto-fixed in
  one pass. It surfaced zero duplicate-page clusters this
  time, but did catch one different kind of pre-existing bug the auto-fixer
  correctly refused to touch: `fi/kaunokirjoitus/index.html` already
  declared `hreflang="no"` pointing at its own URL (a mislabeled entry, not
  a real Norwegian sibling link) instead of `no/kursiv-tekst/` — flagged as
  a conflict and left for manual resolution rather than silently
  overwritten. **Placeholder EN-homepage claims (2026-08-06):** a *subpage*
  naming the bare homepage as its `hreflang="en"` is the documented shape of
  a ratified local-only page, and `audit-hreflang.js --fix` has always refused
  to repair it (writing it back would make the homepage link one arbitrary
  subpage). The audit nonetheless counted those pairs as blocking
  non-reciprocal issues — demanding a repair its own fixer declines to make,
  which would have turned every PR red the moment the workflow started
  gating. They now classify separately: reported in their own informational
  section, annotated against `data/english_parent_exceptions.json` so an
  *unratified* claim is still visible, and excluded from the exit code.
  Homepage-to-homepage claims (locale homepages listing each other) are a real
  cluster and are still checked and fixed. Also watch for genuine
  **duplicate-page clusters** as a
  byproduct of any run — two members that declare the same locale for one
  EN parent (a content bug, not a completeness gap) — which this script
  surfaces but never auto-fixes; resolve those by hand per the "Parallel
  sessions" protocol (keep the more-integrated page, 301 the other, repoint
  references). A related, structurally-hidden variant is a page that never
  declares `hreflang="en"` at all — invisible to this script's own
  cluster-membership detection, which requires that declaration — so an
  occasional manual spot-check for headless pages (`audit-hreflang.js`
  already reports these as "Headless targets") remains worthwhile alongside
  this tool.
  **Cross-cluster edges (added 2026-08-08) — a third failure mode, blocking.**
  Page A names B as its sibling for locale L, but B's own `hreflang="en"`
  claims a *different* EN parent, so the two sit in different clusters and A
  is advertising another cluster's page as its translation. Neither prior
  check can see it: completeness reconstructs membership from each page's own
  `hreflang="en"`, so B is simply not a member of A's cluster and the stray
  edge is never examined; reciprocity only asks whether an edge points both
  ways, and a cross-cluster edge can be **perfectly reciprocal and still
  wrong**. Real case, the one that prompted the check: every member of
  `library/aesthetic-symbols/` correctly listed `it/library/simboli/` as its
  Italian page, while `nl/library/speciale-tekens/` — a member of
  `library/special-characters/` — listed that same Italian page as *its*
  Italian version, and `simboli` listed `speciale-tekens` back as its Dutch
  version. Two EN parents claiming one translation, in both directions,
  invisible to both existing audits. Never auto-fixed (which side is wrong is
  a content call: drop the stray entry, or repoint it at that locale's real
  page in this cluster). Unlike duplicate-page clusters — a pre-existing
  backlog this script only surfaces — this class was driven to zero in the
  same change that added the check, so it **fails the build**; there is no
  legitimate case for two EN parents sharing a translation.

  **A missing `x-default` was invisible to the direction pass (fixed
  2026-08-30) — the same shape as both incidents above.** `audit-hreflang.js`
  has always asserted that `x-default` points at the cluster's EN member, and
  the first line of that pass is `const xd = …find(x-default); if (!xd)
  continue;`. So a page that never declares the tag was skipped in silence,
  and the audit printed **`x-default not pointing at EN: 0`** while 30 live
  pages carried no `x-default` at all — 25 of them shipped two days earlier in
  one Korean batch. *A check that reports nothing is indistinguishable from a
  check that passes*, for the third recorded time.

  **Absence and correctness are separate questions and each needs its own
  pass**, so the audit now counts them separately (`x-default missing
  entirely`) and `--fix` inserts the tag after the block's last alternate,
  matching that line's indentation and pointing at the EN member the page
  itself declares. The insertion is additive — it never edits or moves an
  existing tag — so it cannot disturb a cluster it did not repair, and a page
  with no `en` alternate is left alone (nothing to point at; `Headless
  targets` already owns that class).

  **The upstream cause was a spec, not the page.**
  `generate_library_page_from_spec.py` writes a spec's `hreflang` array
  verbatim, so 20 `data/library_page_specs/ko-*.json` files with no
  `x-default` entry produced 20 pages with no `x-default` tag. Fix the spec as
  well as the page, or the next generator run puts it back — and note that
  `check_locale_spec.py` **did** error on all 20 and the batch merged anyway,
  which is a branch-protection question, not a tooling one.

  Verified per this file's own rule against three differently-shaped probes:
  deleting an `x-default` exits 1 naming the page and `--fix` restores the
  file byte-identically; removing a block's `en` entry is **not** flagged (no
  false positive); and repointing an `x-default` at a Spanish URL still fires
  the original direction class, not the new one.
- **`node scripts/check-locale-parent-tier.js <path> <locale>`** (`npm run
  check:locale-parent-tier`) — advisory (always exits 0). Prints the
  registry's decision for a candidate (parent, locale) pair and, if a
  pre-build gap check is required, the exact instrument questions to answer.
  Run this before starting new locale-page work, not after.
- **`node scripts/audit-locale-parent-gap.js`** (`npm run
  audit:locale-parent-gap`) — whole-site discovery pass, the systematic
  version of the FR `/symbol/` find: for every Core parent x qualified
  locale, flags a cell as an unaudited gap when translation coverage is
  near-zero and no `data/locale_parent_gap_audit.json` entry exists.
  Informational only (like `check-image-assets.py`) — the site carries a
  real, deliberately-paced translation backlog this will not zero out in one
  pass.
- **`node scripts/check-locale-parent-gap.js`** (`npm run
  check:locale-parent-gap`) — the enforcing, diff-scoped PR gate, wired into
  `.github/workflows/validate.yml`. For every newly-added locale page,
  requires a passing `data/locale_parent_gap_audit.json` entry whenever the
  registry's decision needed one (a gated-tail build, a Tier-3/held-locale
  exception, or a script-incompatible-parent exception) — i.e. the page was
  built against the registry's default recommendation without a recorded
  reason.

**Do not add or edit an entry in `data/locale_parent_gap_audit.json`,
`data/core_parent_set.json`, `data/locale_qualification_tiers.json`, or
`data/english_parent_exceptions.json` unilaterally.** Every entry in all three reflects a discussed decision
between you and the user — the same bar CLAUDE.md's English-Parent Rule sets
for locale-first exceptions, and the same bar `data/translation_parity_exceptions.json`
sets for parity divergences. If one of the gap-check scripts flags a
missing entry, either raise the divergence with the user or run the actual
instrument check and record it — don't edit the registry to make a page you
want to ship pass.

### What passes a gate — and what doesn't (clarified 2026-07-26)

Three recurring points of confusion, each resolved by a real case:

1. **"Sibling precedent" is never a gate pass.** "Other locales already have
   this cluster" is not demand evidence for *this* locale — it's exactly the
   heuristic the governance registries replaced. **Case:** the Wave-1
   `answers/*` cluster (44 pages, 11 locales) was built under sibling
   precedent before the gate existed; when merging main brought the gate in,
   the pages were pulled back out of the branch (`4eeb80a2`) rather than
   grandfathered, because no per-locale demand check had ever been run.
2. **Instruments unavailable → hold, don't improvise.** If Semrush is out of
   API units (or GSC has no data for pages too new to index), the demand
   check cannot be run — so the build waits, or the user explicitly
   authorizes. Never fabricate a gap-audit entry, and never downgrade to a
   weaker proxy without saying so. Same case as above: the revert was chosen
   specifically over "force an undocumented pass."
3. **A locale hold is a default the user can override — explicitly,
   per-batch, without flipping the flag.** `vi` is Tier 2 `hold: true`
   ("needs backlinks, not translations"). The user, told this directly,
   still chose to include vi in a `symbol/*` build; the authorization was
   recorded as a `data/locale_parent_gap_audit.json` entry with `null`
   instruments and evidence text naming it a user authorization
   (`f09d35b5`) — vi's hold flag and tier were left untouched at the time.
   That's the template for a per-batch override: the override lives in the
   ledger as a dated, attributed decision; the registry keeps stating the
   standing default. Presenting the hold reasoning to the user *before* they
   decide is part of the override being legitimate — a hold silently
   ignored is a violation, a hold knowingly overridden is a decision.
   (Superseded 2026-08-06: this per-batch-override pattern is now historical
   for `vi` specifically — the user lifted the hold flag itself rather than
   overriding it batch-by-batch. The pattern above still applies to any
   future locale that picks up a hold.)
4. **An all-instruments-null authorization is a bridge, not a pass
   (2026-08-01).** A `data/locale_parent_gap_audit.json` entry recorded with
   every instrument `null` (a user authorization in lieu of a real pull) must
   name a scheduled re-check date in the ops review register, and the entry
   is complete only when its instruments are backfilled with real numbers or
   a dated veto is recorded. If a later backfill contradicts the recorded
   verdict, do not silently flip it — the pages are live by then, so the
   call (fold/de-index/keep) is a discussion with the user, flagged with the
   data.

### Governance arrives mid-flight: merged-in rules bind unshipped work

When merging main into a long-running branch brings in a new gate, registry,
or rule, that rule applies to everything the branch has built but not yet
merged — "it was allowed when I built it" holds only for work already on
main. Re-run all four PR gates (`check-translation-parity`,
`check-locale-mesh`, `check-locale-parent-gap`,
`check-new-page-image-assets`) after every merge of main, and re-validate
in-flight pages against any governance the merge introduced (the `4eeb80a2`
revert above is this rule applied honestly).

---

## New pages must ship with their hero/OG/Twitter art in the same change

A new or edited page's `og:image`, `twitter:image`, and (if it declares one)
hero figure must point at files that exist on disk **in the same commit/PR**
that ships the page — never a follow-up "generate the missing art" pass.
Google crawls new pages within hours of the sitemap picking them up (see
`generate-site-art.py --only <slug>` / `wire-site-art.py`'s standard pipeline —
a bare `generate-site-art.py` run is refused, see "Scoping" below); if the art
isn't there yet, Googlebot's first fetch of that image 404s, and that broken
first impression is recorded before any later fix lands. This has been a
real, recurring pattern in this repo's own history (see
`docs/image-seo-fixes.md` and the several past "GSC 404 cleanup" commits
that backfilled hero/OG art for pages already shipped) — most recently
diagnosed from live GSC crawl-stats data in an internal audit (2026-07-24).

### Tooling — why there are two image-asset scripts, not one

**Scoping (added 2026-08-11).** `generate-site-art.py` **refuses a bare run**
and exits 2. Use `--only <slug>` (repeatable; slug = the page path with `/`
replaced by `-`, so `tr/gotik-yazi/index.html` is `tr-gotik-yazi`), or `--all`
for a genuine full regeneration. `--dry-run` lists what a run would write
without writing it, and an `--only` prefix matching no registered page is an
error rather than a silent no-op. **`--only` matches by prefix, not exact
slug** — `--only answers` regenerates all 86 `answers-*` pages, and `--only
category` all of `category-*`. When you mean an exact set, check `git status`
against the set you intended and revert the surplus; a slug that is a prefix of
its siblings will quietly pull them in (a 555-page run wrote 701 pairs this
way).

**A run also now skips any page whose hero+OG already exist** — "already there"
means "done", so a run only ever fills gaps and costs nothing for pages that are
finished. `--force` re-renders anyway (needed when the brand skin itself
changes). This removes the churn at the root rather than only behind a flag: a
full `--all` run on an unchanged tree now writes **0** files instead of 119.

The default was flipped because a full run rasterises ~1,200 pages, and on a
machine whose font build differs from the one that produced the committed PNGs
that rewrites hundreds of **visually identical but byte-different** files —
churn that then has to be spotted and reverted by hand before committing. That
happened on three consecutive locale batches on 2026-08-11 (119 files the first
time) and was caught each time only by reading `git status`. A capable filter
already existed as an undocumented positional argument; nobody used it because
nothing said it was there and the dangerous path was the default one. The
positional still works, hidden, for backwards compatibility.

**A card title longer than the layout was silently truncated (fixed 2026-09-01).**
`og_png_svg` wrapped the title and kept `[:3]`, discarding the rest with nothing in
the output to say so. The tone-of-voice standard makes titles *longer* — they now
carry the answer, not the filing system — and the first pass that applied it to nine
pages truncated **seven** of them mid-phrase: `Middle East Currency Symbols: 5 Have
Their Own,` with the answer cut off. It was caught by reading a rendered PNG, which
is the only place it was visible.

Two things changed, and the split matters:

* **The cap was one line too tight.** Four lines fit and five do not, and that is
  geometry rather than taste: the block is centred on y=250 and grows upward by 33
  per line, so at four the first line's ascender sits at y=106 and clears the kicker
  baseline at y=96, and at five it sits at y=73 and collides. `OG_TITLE_MAX_LINES`
  is 4. That alone repaired **17 of the 24** titles already overflowing.
* **What still cannot fit is reported, never dropped.** `_fit_title` collects every
  overflow with the words it lost, and the run prints them at the end.
  `--strict-titles` makes it exit 1. Reported by default because 24 titles were
  already in that state — the same call as `check-image-assets.py` informing while
  `check-new-page-image-assets.py` gates, and for the same reason.

`--dry-run` measures titles without rasterising anything (over the pages already
holding art too, not just the ones missing it — whether a title fits is a property
of the registry, not of what is on disk), so **`--dry-run --all --strict-titles` is
a cheap whole-site title check**.

**The fix for an overflow is never to shorten the answer away.** Put the head term
in the card title and the answer in the **sub** line, which does not wrap. Seven
titles remain over the cap, all `unicode-18` emoji-vote and beta-review pages in
`ar`, `de`, `ko`, `pl`, `ru`, `th`; shortening those is a content decision per page,
not a mechanical one.

**Page-derived motifs (added 2026-08-11).** The registry in `PAGES` pairs each
page with a motif function. 718 of 1,209 pages were registered against a motif
that takes **no per-page argument**, so every page sharing it got a
byte-identical drawing: 66 country emoji-combo pages all showed the same
anonymous flag, and `library/moai-emoji` and `library/clown-emoji` shared one
generic smiley. Meanwhile `scatter_glyphs`, which *does* take the glyphs as an
argument, was already producing 190 distinct images across 239 `symbol/` pages.
The mechanism worked; it just was not applied.

`motif_from_page(slug, motif)` closes that by reading the page's **own** copy
tiles (`data-symbol` / `data-text` / `data-copy` / `data-char`) — authoritative,
zero-maintenance, and self-correcting when a page's symbols change. It is
deliberately conservative: a motif already carrying per-page arguments is
returned untouched, and a page with nothing to read keeps its hand-chosen
motif, so `answers/*` prose pages still get the Q&A card that actually suits
them. Result: **488 → 884 distinct drawings across 1,209 pages**. `--no-page-motifs`
restores the registry's literal motif.

Three routing rules, each learned from a wrong result rather than reasoned up
front — do not "simplify" them without re-rendering the named pages:

- **Emoji tiles win outright.** `library/moai-emoji` leads with the moai it is
  about and carries unrelated kaomoji further down; preferring runs drew a face
  on the moai page.
- **Otherwise runs beat single glyphs.** Every free-fire page opens with the
  same ornament tray (`꧁ ༒ ࿐ …`), so drawing those gives all of them one
  picture, while their sample names are genuinely their own.
- **For emoji, take the page's leading grid, not a spread.** Sampling across
  everything a page mentions put a bank and a bicep on the moai card.

**Four font rules the motifs depend on.** cairosvg has no per-glyph fallback —
it takes the first matched family and draws tofu for anything that family lacks
— so motif text goes through the existing `spanned()`/`_resolve_family()`
resolver, the same one Arabic and Devanagari titles already use. Beyond that:

- **Emoji resolve to Noto Color Emoji ahead of Noto Sans Symbols2**, which
  carries monochrome outlines for part of the emoji range and would otherwise
  leave a set half in colour and half in black. The priority is gated on
  `Emoji_Presentation`, not on a codepoint range: `⚽` and `✅` are pictures,
  while `♥ ★ ♛ ⚜ ⚔` a few codepoints away are typographic ornaments, and
  routing those to a colour font puts a glossy red heart inside an ASCII
  kaomoji.
- **`_resolve_family` takes the base font it is resolving *against*.** Titles
  are set in `SANS` (Liberation), motifs in `SYM` (DejaVu). Testing a motif
  glyph against Liberation reports `₿` as already covered and leaves it
  unwrapped — which draws tofu, because DejaVu Sans has no such glyph.
- **`spanned()` takes the enclosing element's family** so a run resolving to
  that same family is emitted as plain text. Without it every decorative glyph
  in DejaVu-but-not-Liberation picks up a wrapper that restates the font it is
  already in: ~1,100 files of diff noise on art that did not change.
- **Never select a tile no installed font can draw.** `spanned()` drops
  uncovered characters, so an undrawable tile fails silently as an *empty*
  card rather than as tofu. `library/egyptian-hieroglyphs` is the real case —
  U+13000.. is in no font here, and selecting it produced a brand chip with
  nothing on it. `_drawable()` filters those out, and a page whose tiles are
  all undrawable keeps its registered motif.

**Before regenerating art, check your fonts.** `_FALLBACK_FONTS` and
`_NATIVE_FONT_FILE` name specific files; a character no installed font covers is
**dropped**, not drawn as tofu. On a container missing `fonts-noto-core` /
`fonts-noto-cjk` / `fonts-wqy-zenhei` that silently deletes glyphs from
regenerated cards. Install them first (`apt-get install -y fonts-noto-core
fonts-noto-cjk fonts-wqy-zenhei`) and confirm every path in those two tables
exists.

- **`scripts/check-image-assets.py`** (`npm run check:images`) — whole-site
  audit. Requires every indexable page to have `og:image`, `twitter:image`,
  a real hero file (if declared), **and** a Pinterest pin. The site carries a
  large, deliberately-paced Pinterest-pin backlog (see
  `docs/pinterest-pin-generation.md`), so this script is close to always
  reporting failures site-wide — useful as a dashboard/audit, but it can
  never function as a per-PR merge gate without being permanently red
  regardless of what any given PR touches. Its CI step is intentionally
  informational only (see `.github/workflows/validate.yml`'s comments).
- **`scripts/check-new-page-image-assets.py`** (`npm run
  check:new-page-images`) — the actual gate, same architecture as
  `check-translation-parity.js`: diffs the PR against its base and checks
  **only** the HTML files this branch actually adds or changes, for
  `og:image`/`twitter:image`/hero (not Pinterest pins — intentionally out of
  scope here, see above). Because it's diff-scoped, pre-existing site-wide
  backlog can never make it fail — only a genuinely new problem this PR
  introduces can. This is wired into `.github/workflows/validate.yml` as a
  gating step.

**If this keeps recurring anyway, the gap is branch-protection configuration,
not the script.** `validate.yml`'s job reports a status per PR, but whether
GitHub actually blocks merging on it depends on whether "Validate Site" (or
its individual checks) is configured as a **required status check** under
Settings → Branches for the target branch — that's a repository setting, not
something in this repo's tracked files, and it was not verified as part of
adding this tooling. If new pages are still shipping without their art after
this, check that setting before assuming the scripts are wrong.

**Root cause found, and it was neither (2026-08-06): the whole workflow was
inert.** Every validator step in `validate.yml` is `<validator> | tee X.log`.
A pipeline exits with its **last** command's status, `tee` always succeeds,
and GitHub's default `run:` shell is `bash -e {0}` — `-e` but **no
pipefail**. So every step recorded `outcome == 'success'` no matter what the
validator exited with, and the final "Fail the job if any gating validator
reported problems" step, which keys off exactly those outcomes, could never
fire. Fixed by declaring `defaults.run.shell: bash` on the job, which is
`bash --noprofile --norc -eo pipefail {0}`.

Two consequences worth carrying forward:
- **A green "Validate Site" on any PR before 2026-08-06 carries no
  information.** Do not cite one as evidence a page passed anything.
- **Adding a validator script is not the same as gating on it.** Before
  trusting a new check, confirm it actually fails a PR — run it against a
  deliberately broken input and watch the job go red. Every gate in this file
  had been reasoned about, documented, and wired, and none of them worked.
- **Never assemble the gate list by hand — run
  `npm run check:ci-gates`** (`scripts/run-ci-gates.py`). It parses
  `validate.yml`, reads the step ids named in the final "Fail the job if any
  gating validator reported problems" `if:` expression, and runs exactly those,
  substituting CI's own `--base origin/<base ref>` so the diff-scoped checks
  resolve the merge base CI resolves. Add a gate to the workflow and it appears
  here for free; make one informational and it disappears. **A list written out
  in this file is not a substitute and will drift** — it drifted, twice:
  `check:locale-spec` was missing from the local list on 2026-08-13, and on
  2026-08-31 a session ran a 26-check sweep straight from this document, got a
  clean pass, and was still red in CI on **`check:static-footer`** — a gate this
  file has never named. Two new pages had shipped with an empty
  `<div class="footer-inner">`, i.e. no crawlable footer link block at all. The
  sweep was thorough and it was reconstructed from prose, which is the whole
  failure. This bullet deliberately does not enumerate the gates.

Also wired the same day: `npm run check:funding-choices`, which existed but
was never added to the workflow — which is how 37 pages shipped without the
ad-blocking-recovery tag. Unlike the other whole-site checks it gates rather
than informs, because it has no backlog to be permanently red against (the
tag is either in `<head>` or not, and
`scripts/inject-funding-choices-tag.js` closes any gap in one idempotent run).

**It happened again on 2026-08-07, a different way: the workflow stopped
parsing.** An `if:` written at column 0 and a `run: |` folded onto the line
above left `validate.yml` invalid YAML. It sat broken for a day, and every PR
merged in that window was unchecked, including a 22-page locale batch.

**Where an unparseable workflow does and doesn't show up** — verified against
the real runs on 2026-08-08, because the intuitive answer is wrong in both
directions:

- On **`push`**, GitHub *does* create a failed run. It is named after the file
  path (`.github/workflows/validate.yml`) rather than its `name:`, because the
  `name:` is inside the file it could not parse. Nine of these accumulated
  across 08-07.
- On **`pull_request`**, it creates **nothing**. GitHub cannot know the file
  wanted to run on `pull_request` — that trigger is also inside the unparsed
  file. So the entry simply disappears from the PR's checks list. For commits
  `09e0935f6`, `76237e264` and `d85029f66` the PR checks were CSS Audit, GTM
  Check, Ads Check, and nothing else.

That asymmetry is the whole trap: the failure was loud in the Actions tab,
where nobody looks, and absent from the PR checks list, which is what merges
gate on. **A vanished check reads exactly like a check that was never
required.**

The two incidents share a shape worth naming: **a check that reports nothing
is indistinguishable from a check that passes.** Both times the evidence of
health was the absence of a complaint.

**`npm run check:workflows`** (`scripts/check-workflows.py`) closes it. It
parses every `.github/workflows/*.yml`, requires the shape Actions actually
needs (a trigger, `jobs`, per job a `runs-on` and steps that have `uses` or
`run`), and encodes both incidents as rules:

- **pipefail** — a step that pipes (`| tee`) with no `shell: bash` in effect
  is an error, because GitHub's default `bash -e` has no pipefail. `||` is
  explicitly not a pipe; flagging the repo's own `git diff --quiet || git
  commit` idiom would train people to ignore the check.
- **swallowed failures** — a `continue-on-error: true` step must have an `id`,
  and `steps.<id>.` must be referenced somewhere in the file. A step allowed
  to fail whose outcome nobody reads is a check that does nothing.

**It runs from two places on purpose, and both are needed.** A step inside
`validate.yml` cannot catch `validate.yml` failing to parse, so the lint also
runs from its own small workflow, `.github/workflows/workflow-lint.yml` —
whichever of the two still parses reports on the one that doesn't. Do not
consolidate them.

Verified per this section's own rule before being trusted: run against four
deliberately broken inputs — the real 2026-08-07 parse break, the real
2026-08-06 missing `defaults.run.shell`, a `continue-on-error` step with no
`id`, and a step with neither `uses` nor `run` — each exits non-zero. Its
first real run also found the pipefail bug live in a *second* workflow,
`css-audit.yml`, which had been reporting success regardless of what
`audit-css.js` found; fixed in the same change.

**A third rule, added 2026-08-22 after shipping the bug it catches.** In a
double-quoted bash string a backtick is **command substitution**. A step-summary
line written as ``echo "### Check — `${{ steps.x.outcome }}`"`` makes bash try to
*run* the expanded value: the log records `success: command not found` and the
summary renders an empty value where the outcome should be. That shipped on the
`zalgo-decodes` summary line — every neighbouring line escaped its backticks as
`` \` `` and only the new one did not, so the job stayed green while its own
summary under-reported. Same family as the two incidents above: the failure was
in the reporting layer, where nothing was watching.

The rule is scoped to a backtick touching a `${{ }}` expression, because you can
never usefully command-substitute one — so there are no legitimate hits, and
ordinary command substitution elsewhere is left alone. Verified by re-injecting
the exact line that shipped: exit 1, naming the file, job, step and line.

---

## Numeric Parity — the axis every other gate is blind to (added 2026-09-02)

Every gate above measures **structure** (parity), **language** (locale
translation), **schema** (FAQ), or **assets** (images). None of them measures
**values**. A number is the one thing that can be well-structured, correctly
translated, internally consistent — and false.

**The case.** On 2026-09-01, `63d04e71b` ("rewrite **every English**
`/updates/` entry to the Tone of Voice standard") corrected Unicode 18.0 from
13,047 characters to 13,007, and four scripts to three. It touched 11 English
files and zero locale files. Seven translations (`ar de es it ko nl tr`) went
on asserting 13,047 in their `<title>`, meta description, OG/Twitter cards,
JSON-LD, hero, pill, `<h2>` and FAQ — as current fact, for a month — while
every PR in that window passed the full suite.

Each existing gate was **right** to pass it:

| gate | measures | why it was blind |
|---|---|---|
| `check-translation-parity` | links, `<h2>`/FAQ/tile counts | 13,047 → 13,007 moves no structural element |
| `check-locale-translation` | English strings surviving on a locale page | `13.047 neue Zeichen` is perfectly German |
| `check-faq-schema` | a page against itself | both halves said 13,047, in agreement |

**What the check measures.** Not "do EN and its translations carry the same
numbers" — they legitimately do not. `npm run audit:numeric-parity` reports
**671 pages across 24 locales** diverging today, which is why a state check
here would be permanently red and therefore ignored. It measures a delta with
a specific shape: a page **replaced** a number — dropped one and added another
**in the same slot** — while a sibling in its hreflang cluster still carries
the dropped one.

Four design choices, each measured rather than guessed:

* **A substitution, never a bare deletion.** Prose gets reworded and numbers
  dropped for innocent reasons constantly; a number replaced *by another
  number in the same slot* is a fact changing.
* **Scoped by slot type**, so EN's `<h2>` losing 13047 is checked against the
  sibling's `<h2>`, never a stray match elsewhere. Page-wide matching drowns
  in date and count noise.
* **Separators normalised.** German writes 13.047 where English writes 13,047,
  and Arabic-Indic digits map to ASCII. Without this the check would report
  every European locale as divergent and nothing else.
* **Three-digit floor, plus the `data/parity_catalogue_pages.json` exclusion.**
  Replayed over the last 52 commits that touched HTML, a two-digit floor fired
  four times: twice on `library/index.html` (catalogue pages, whose per-locale
  item counts differ **by design**) and twice on bare date/version fragments.
  With both, the replay fires **exactly once — on `63d04e71b` itself.** Zero
  false positives. The cost is stated rather than hidden: a one- or two-digit
  fact that changes ("12 to 15 characters") does not trip this. Every value
  that has mattered here is larger.

**Years are excluded.** `2026` is a date component, not a measured fact, and
every locale formats dates its own way — a reordered date must never read as a
changed value.

#### Tooling

- **`npm run audit:numeric-parity`** — whole-site triage, `--full` for detail,
  `--locale <code>` to scope. **Informational, never gating** (671-page
  standing backlog, most of it legitimate).
- **`npm run check:numeric-parity`** — the diff-scoped gate, wired into
  `.github/workflows/validate.yml`.
- **`data/numeric_parity_exceptions.json`** — one discussed divergence per
  `(page, slot, value)`. Same bar as every other ledger here: never added
  unilaterally to make a PR pass. Ships empty.
- Both scripts share **`scripts/lib/numeric-parity.js`**, so the audit and the
  gate can never disagree about what a value is.

**Verified by replaying the real incident**, not a synthetic probe: run against
`63d04e71b` it names all **7 of 7** siblings and the values `13047` and
`172848`. End-to-end on a branch, changing `13,007` → `13,999` on the EN page
fails **64** sibling pages and exits 1. A first draft of the tokeniser read
"May 26, 2026" as the single number `262026`; that bug was found by reading the
replay output and is fixed — anchoring each group to exactly three digits.

## Source Attribution — how a page shows its evidence (added 2026-09-03)

Every gate above measures structure, language, schema, values or assets. None
of them asked whether a page that states a fact it did not originate *shows
where the fact came from*, or how.

**There was no standard.** Sources had no CSS class, no markup convention, no
tone-of-voice rule and no check — only a habit, which held on one pillar and
nowhere else. 67 of 68 `/updates/` entries presented citations identically
(one prose paragraph, immediately before the FAQ, all 207 links inside it,
100% consistent), and **33 other pages cited external sources with no
attribution surface at all** — including `guide/unicode-symbol-approval-process`,
an article about the Unicode process citing `unicode.org` twice with nothing
saying so. An undocumented convention has no failure mode, only a drift.

**The distinction the standard turns on: a citation is evidence, a resource
link is a destination.** They are identical in HTML and are not the same
thing. "commissioned from **Grilli Type**" backs a claim and belongs in the
Sources block; "**Install Poppins** for free" sends the reader somewhere and
belongs inline in the sentence that sends them. Getting this wrong is not
academic — the first pass counted every external link as a citation and
reported 33 offenders when 6 of them were not citing at all. The same domain
is a citation on one page and a destination on another (`xbox.com` is a
sign-in link on `answers/how-to-change-minecraft-username`), which is why
`data/source_resource_links.json` is keyed by **route and domain**, never by
domain alone.

**The rules:** a page asserting a sourced fact carries one `.source-note`
Sources block, labelled in that locale's own word, immediately before the FAQ,
holding every citation on the page; it is **prose, not a bibliography**,
because a list says a source exists while a sentence says which claim it backs;
each citation's `rel` comes from the cited domain's tier in
`data/source_authority.json`; and the block's citations are projected into the
page's JSON-LD as schema.org `citation`, generated from the block so the two
cannot drift.

**Primary sources are followed, and that is deliberate.** All 207 citations
were `rel="nofollow"`, which told search engines the Unicode Consortium's own
pipeline page was as trustworthy as a forum post. Google reserves `nofollow`
for paid and untrusted links. A `primary` source — the standards body, the
central bank that designed the symbol, the platform's own changelog, the issue
tracker the request lives in — is `rel="noopener"`; press, third-party
reference works and user-generated threads stay `nofollow`. `devforum.roblox.com`
is Roblox-operated and still secondary: forum posts are user-generated
whatever the domain. **An unlisted domain is treated as secondary and
reported**, so an unclassified source fails safe.

Three defects the missing standard had already produced, all now closed:
`vi/updates/lien-quan-khoa-doi-ten` carried no Sources block while its EN
parent cited Garena's patch notes — the omission landing on the one locale
whose readers play the game; `ja` labelled the section 情報源 on one entry and
出典 on another, `th` split แหล่งข้อมูล / แหล่งอ้างอิง (two words for one
section, with nothing comparing them — the Swedish `kontrollerat` near-miss
again); and nothing anywhere carried schema.org `citation`, so a page's
evidence was legible to a human and invisible to the answer engines the
tone-of-voice standard ranks as reader #2.

### Tooling

- **`npm run audit:source-attribution`** — whole-site dashboard.
  **Informational, never gating**, same call as `check:images`.
- **`npm run check:source-attribution`** — the **diff-scoped gate**, wired into
  `.github/workflows/validate.yml`. It gates rather than informs because for
  the pages a PR touches there is nothing to be permanently red against.
- **`npm run fix:source-attribution`** (`-- --write`) — the repair pass:
  panel class, `rel`/`target`, legacy label, JSON-LD projection. Idempotent.
- All three share **`scripts/lib/source-attribution.js`**, so they can never
  disagree about what a Sources block is.

**The fixer will not create a block on a page that lacks one**, and that
refusal is the point: the block's content is a sentence about what each source
establishes, in the page's own language. Generating `Sources: <list of links>`
would satisfy the gate and defeat the standard.

**The JSON is patched as text, never re-serialised.** 161 of the 281 `ld+json`
blocks on the affected pages do not survive a `JSON.parse` →
`JSON.stringify(null, 2)` round trip byte for byte, so a re-serialising fixer
would rewrite formatting across the site and bury the real change in noise.

**The EFR gate had to be taught about this, and the fix is not the obvious
one.** Adding a Sources block to a short page is a blocking EFR regression:
the block `vi/updates/lien-quan-khoa-doi-ten` was missing moved that entry
10.8 -> 12.1 on `specificityDeficit`, for the act of citing Garena's own patch
notes, and cutting it to the bare citation still landed on +0.5, the material
threshold exactly. A Sources block is apparatus, deliberately formulaic across
pages, and its "facts" are publisher names and URLs rather than codepoints or
limits — so `scripts/lib/editorial-corpus.js` now drops Sources sections
before scoring, the same call as `[data-static-directory]`. **It matches the
section by its LABEL, via the one registry in `source-attribution.js`, never
by `.source-note`:** keying on the class drops the block on one side of a diff
and not the other for any branch that introduces the class, which turned one
blocked page into 37 regressions on the first attempt. What a section *is*
does not change when its markup does.
`data/editorial_footprint_baseline.json` was regenerated in the same change
per the re-baseline rule (336 entries moved; 49 carry a Sources block, 287
were pre-existing drift).

Verified per this file's own rule against five differently-shaped broken
inputs plus a negative control — see `docs/source-attribution.md` §7 for the
probes and the full standard, including the CSS design and its RTL and print
behaviour.

---

## Library Hub Coverage — a page is not shipped until its hub knows about it

Every gate above checks a page against a *standard*: its schema, its art, its
language, its siblings. None of them asked the simpler question — **is this page
linked from the hub that is supposed to be its front door?** A 2026-08-26 audit
found **374 pages** where the answer was no: live, indexable, self-canonical, in
`sitemap.xml`, meshed correctly, and reachable from their own locale's library
hub by no route at all. 210 of those were `es`, which has the deepest localized
library on the site (253 library pages) and had **42% hub coverage**.

The `symbol` lane is the control group and it is the whole argument: 17 of 19
locale symbol hubs card 100% of their spokes, because `sync_symbol_spoke_links.py`
generates those links and `check-new-symbol-peer-links.py` fails a PR that skips
it. `library` had neither and drifted to 86%. Same site, same week — the
difference is whether a machine was doing the remembering.

### Five mechanisms, not one — the part that must not be simplified

There is no shared registry and no route manifest. Each hub carries its own
hand-maintained copy of its inventory, and *which form* is a property of the hub,
not of the locale:

| Mechanism | Markup | Visible without JS | Used by |
|---|---|---|---|
| `libraryArray` | `var/const LIBRARY = [{ slug, … }]` | **no** | **EN only** |
| `libEntry` | `<article class="lib-entry">` in `#libDirectory` | yes | EN + all 19 locale hubs (generated) |
| `azIndex` | `<ul class="lib-index-list">` | yes | the hubs that render an A–Z index |
| `compareCard` | `<a class="compare-card">` | yes | ar, da, de, ja, nl, no, pl, ru, sv, th, vi, zh-tw + every `symbol` hub |
| `tipCard` | `<a class="tip-card">` inside `.tips-grid` | yes | da, no, sv |

**Corrected 2026-09-01.** The "Used by" column above previously read
`EN + es, fr, id, it, ko, pt, tr` for `libraryArray` and "the same eight" twice.
That is no longer true and had not been for some time: **all 19 locale hubs have
migrated to `window.UTG_LIBRARY_HUB`**, driven by `build-library-hub.js`, and
**EN is now the only page in the repo carrying a `LIBRARY` array** (measured, not
recalled: `grep -c 'UTG_LIBRARY_HUB'` is 1 on every `<lang>/library/index.html`
and 0 on `library/index.html`; the `LIBRARY =` count is the exact inverse). The
mechanism *set* is unchanged and still must not be narrowed — that part of this
section holds, and `da`/`no`/`sv` are still the reason. Only the ownership map
had drifted. A session acting on the old table in 2026-08-31 hand-edited an
`items` array that nothing reads, and had to revert it.

So `registered` means "listed in any of the five" and `crawlable` means "listed
in one of the four that survive without JavaScript". They are reported separately
because they answer different questions.

**A checker that knew only `compare-card` would report `da`, `no` and `sv` as
broken and `es` as fine.** That is not hypothetical — the audit's first pass did
exactly that, calling those three locales 3, 11 and 10 pages short when all three
are complete. Do not narrow the mechanism set without re-checking those locales.

### Tooling

- **`npm run audit:library-hub-coverage`** (`scripts/audit-library-hub-coverage.js`)
  — whole-site dashboard: pages, registered, crawlable, missing, orphans,
  unsearchable, duplicates, per locale and lane. `--full` for every route,
  `--locale <code>` to scope, `--json <path>` to save. **Informational, never
  gating**, same call as `check:images` and `audit:locale-parent-gap` and for the
  same reason: the 374-page backlog would make it permanently red.
- **`npm run check:library-hub-coverage`** (`scripts/check-library-hub-coverage.js`)
  — the enforcing half, wired into `.github/workflows/validate.yml` as a gating
  step. **Diff-scoped**: for every lane page the branch *adds or renames*, the
  locale's hub must register it; for every hub file the branch *touches*, every
  entry must resolve. Pre-existing backlog is reported and never counted.
- Both share **`scripts/lib/library-hub-registry.js`**, so the audit and the gate
  can never disagree about what "registered" means.

### Errors and warnings are deliberately different strengths

**Error** — a page the PR adds that no mechanism lists; a hub entry pointing at
nothing with no `_redirects` rule (a hard 404 straight off the hub).
**Warning** — a hub entry resolving through a 301 (the visitor lands correctly
after one hop, so it is lost link equity, not breakage); a page added to a
directory hub's JS array but not its crawlable index.

Conflating those two would either downgrade a real 404 or turn a lane migration
into a merge blocker. All five orphans the audit found were the redirect kind:
four left over from the `<lang>/library/<slug>` → `<lang>/symbol/<slug>` migration
and one from the `heart-emoji` → `heart-symbols` fold, where `library/index.html`
was the *only* file in the repo still pointing at the old URL. All five are now
cleared, so the count is zero and a new one is a real regression.

### `data/library_hub_exclusions.json`

Before this file, the repo had no way to say "this page deliberately does not
belong in the hub", so every absence was indistinguishable from an oversight —
which is why the audit could classify nothing as intentionally excluded and had
to report all 374 as defects. Keyed by route, with a reason and a date.

**Same bar as every other ledger here** (`translation_parity_exceptions.json`,
`english_parent_exceptions.json`): entries are discussed decisions, never added
unilaterally to make a page pass. If the gate flags a page, the default fix is to
register it. The list ships empty on purpose.

### Two builders pre-render the directory hubs, split by lane

**There are three now, and the middle one is dormant (corrected 2026-09-01).**

`build-library-directory.js` owns `library/index.html` and runs that page's own
marker-delimited `directoryHtml()`. **`build-library-hub.js` owns all 19 locale
hubs** and derives each entry from the *page's own markup* rather than from a
hand-maintained array — which is why a locale hub needs no hand-help when a page
is added, and why hand-editing one is the wrong move.
`build-locale-library-directory.js` is the **superseded** builder that lifted a
page's `LIBRARY` array, `escHtml` and group-by-alpha block dynamically; it now
reports `0 file(s) updated, 19 skipped — no LIBRARY array / render block to
drive` on every locale hub, because none of them has one any more. Keep running
it (`check:locale-library-directory` still gates on it) and leave it in place,
but do not reach for it to fix a locale hub.

**So "run both builders after touching any hub array" is now: run
`build-library-hub.js` for the locale hubs and `build-library-directory.js` for
EN.** None of them re-implements the markup, so static and runtime output still
cannot drift.

**Two live defects this correction surfaced, neither gated and neither fixed
here.** `build-library-hub.js` exits non-zero on two hubs —
`ERROR de/library/index.html — no de label for: useCase:Profile, useCase:Care
Labels` and the same for `nl` on `Care Labels` — so those two cannot be
regenerated until the labels exist. And a plain run rewrites `es` and `ko`,
meaning their committed static blocks are stale against their own data. CI is
green on all three (`check:locale-library-directory`, `check:library-hub-parity`
and `check:library-hub-coverage` all pass), so nothing is blocking; that is
precisely why it needs writing down rather than leaving for the next person to
rediscover.

*Resolved 2026-09-01, same day:* both defects were fixed — the missing de/nl
facet labels added and the three stale hubs regenerated (`6b6578afb`), with
the German label corrected to the singular `Profil` matching every sibling
locale (`dc8b02456`). Verified after: `npm run check:library-hub` reports all
19 locale hubs current, de and nl included. The note above stays as the record
of the find; a `build-library-hub.js` label error or a plain run rewriting a
hub is once again a real regression, not known debt.

**Pre-rendering a hub promotes its stale entries from invisible to crawlable.**
The four leftover `<lang>/library/<slug>` entries from the library→symbol lane
migration lived only inside the JS array and cost nothing while the hub rendered
client-side. Pre-rendering turned each into a real `<a href>` to a 301. Clear a
stale array entry *before* regenerating, or the generator ships the link. The
same applied to EN's `heart-emoji`, folded into `heart-symbols` on 2026-08-13,
where `library/index.html` was the only file in the repo still pointing at the
old URL. All five are cleared, so the orphan count is 0 and a new one is a real
regression.

**`validate_library_pages.py` discovers locales from the canonical code list.**
It used `REPO.glob("??")` — two characters — so **`zh-tw` was silently never
scanned**: 41 locale lanes exist, 39 were scanned, and the two skipped were
`zh-tw/library` and `zh-tw/symbol`, 73 pages, invisible to every check in that
file including its orphan-spoke pass. (It also matched `js/`, which is not a
locale.) The fix immediately surfaced a real defect the glob had been hiding —
`zh-tw/library/happy-kaomoji` storing `data-symbol="ヽ(>∀<☆)ノ"` with the angle
brackets unescaped, where its own English parent escapes them.

### Verified against deliberately broken inputs before being trusted

Per this file's own rule ("Adding a validator script is not the same as gating on
it"), five probes, each a different shape so the gate could not be tuned to one:

1. a new `es/library/` page no mechanism lists → **exit 1**;
2. the same page registered in the `LIBRARY` array → **exit 0**;
3. a hub entry whose page was deleted, no redirect → **exit 1**, named a hard 404;
4. the same orphan with a `_redirects` rule added → **warning, exit 0**;
5. the same unregistered page with a ledger entry → **1 → 0**, exclusion honoured.

Do not trust a future edit to any of this without repeating them.

---

## Editorial Footprint Risk — measuring how templated our own prose reads

Every gate above measures structure, language completeness, schema or assets.
None of them looks at whether the prose is any good. This one does: it measures
**observable editorial characteristics** of the site's own visible text —
formulaic phrasing, repeated syntax, promotional vagueness, low information
density, and sameness across our own pages — as a 0–100 Editorial Footprint Risk
score, higher meaning "reads more like a filled-in template than like something
written about this subject."

**It is not an AI detector, and must never be described as one.** It emits no
probability of machine authorship, consumes no commercial detector score, and no
output of it supports a claim that any page was machine-written. That line is
correctness, not modesty: detectors lose 5–30 AUROC points out of domain, they
misclassify **61.3%** of non-native English writing as machine-generated — which
would systematically indict this site's 29 locales — and the population studies
behind every marker list state explicitly that they cannot identify individual
documents. `npm run test:editorial-footprint` asserts that no phrase-bank entry
makes an authorship claim.

**Read `docs/editorial-footprint-risk.md` before changing a rule**, and
`docs/editorial-footprint-research-2026-08-26.md` before changing a weight.

### The finding that shaped everything else

The widely-cited marker list does not describe this site. Across 904 indexable
English pages, `delve`, `showcase`, `tapestry`, `in today's`, `at its core`,
`when it comes to`, `it is worth noting`, `robust`, `vibrant`, `pivotal` and
`comprehensive` occur **zero times**. Two of its apparent hits are worse than
misses:

* **`transform`** — 911 occurrences on 443 pages — is the shared CTA card
  ("Transform text with Unicode fonts"). One template string, not vocabulary.
* **`underscore`** — 169 occurrences on 65 pages — is the **character `_`**, in
  factual platform username rules. Banning it would delete facts.

What the site actually carries is **52,766 em dashes on 98.9% of pages** and one
CTA card on 46.6% of English pages — and **6,918 of those em dashes are hardcoded
in 572 spec files and 116 generator scripts**. The footprint here is a build
artifact far more than a writing habit, which is why every pattern is measured
with a `variety` figure (distinct containing sentences ÷ pages):

* **variety ≈ 0** — one shared string. Fix the **template**.
* **variety ≈ 1** — the same idea written many times. Fix the **writing**.

Asking 220 pages to each hand-edit one shared string is the failure this
distinction exists to prevent. `docs/editorial-footprint-upstream-findings-2026-08-26.md`
ranks the upstream sources.

### Tooling

- **`npm run audit:editorial-footprint`** — whole-site dashboard, writes
  `data/editorial_footprint_ledger.csv` and the report. **Informational, never
  gating**, same reason as `check:images` and `audit:locale-parent-gap`: the
  backlog is total and a permanently-red check is one people learn to ignore.
- **`npm run check:editorial-footprint`** — the diff-scoped per-PR gate, wired
  into `.github/workflows/validate.yml` in **shadow mode** for every rule but
  one: it reports what it would fail on and exits 0. Promotion to blocking is a
  documented step in `docs/editorial-footprint-risk.md`, not a silent flag flip,
  and it happens **per rule**: `--enforce em-dash-touched,em-dash-sibling` makes
  only the named rules bite. Five rules are eligible today (`model-leakage`,
  `seo-preservation` errors, and since 2026-09-02 the three em-dash rules — see
  "Clean on touch" below), each verified against deliberately broken inputs.
  **The exception, decided 2026-09-02: an em dash a branch *introduces* is
  banned, per locale** — it exits 1 in every mode on a `ban` or `double-dash`
  locale, which is why the step is in the gating list. The policy is
  `data/em_dash_locale_policy.json` (English and the thirteen en-dash locales
  ban, with the native replacement named in the block; zh-tw and ja ban only a
  lone `—`; ru/es/pt/fr/pl/ro are native and never flagged; nine locales warn
  pending a native reader), and the spaced hyphen is banned on English. The
  same policy is applied before the clean-on-touch and sibling obligations, so
  a native-dash sibling is never pulled in. Existing em dashes on an untouched
  page (9,682 on 889 English pages when measured) are reported, never billed.
  `npm run audit:em-dash` re-measures every locale against the ledger.
  `docs/em-dash-policy.md` has the scope, the replacement guidance, the
  title-separator note and the table.
- **`npm run mine:editorial-phrases`** — regenerates the corpus evidence behind
  `data/editorial_phrase_bank.json`.
- **`npm run test:editorial-footprint`** — 63 assertions, **gating**, no backlog
  to be red against.
- **`npm run check:spec-sentence-reuse`** — **gating**, diff-scoped. Page copy is
  hand-written once per spec in `data/library_page_specs/` and nothing compared
  those specs to each other: **45 sentences repeat across more than one spec and
  416 of 591 carry at least one**, led by a `hero_tagline` on 171 and the same
  line as a `meta_description` on 148 — which makes it an SEO defect as much as
  an editorial one. It keys on the **sentence**, never on `(field, sentence)`: a
  tagline pasted into `intro` is the same reused line. Field-level comparison —
  the obvious design — finds **zero** duplicates in the whole corpus and would
  have shipped a gate that could never fire. `npm run audit:spec-sentence-reuse`
  is the whole-corpus picture; `npm run test:spec-sentence-reuse` (19 assertions)
  gates alongside it.
- **`npm run route:cta-cards`** — the in-place pass that routes a page's CTA card
  to the tool that does the reader's next job. Report-only by default, `--write`
  applies, **idempotent** (it only ever touches a card still on the shared
  homepage default, and never reclaims one already pointed somewhere specific).
  `scripts/lib/cta_routing.py` is the single owner of the routing table AND its
  copy, read by `scripts/generate_library_page_from_spec.py` too, so a
  regenerated page and a live page cannot disagree about the card. The copy lives
  there rather than in the specs because writing it into 214 spec files would
  paste one sentence into 96 specs, which `check:spec-sentence-reuse` exists to
  fail. `npm run test:cta-routing` (19 assertions) and `npm run test:cta-tracking`
  (24) gate it.
- Shared libraries `scripts/lib/editorial-corpus.js` (slot-aware extraction),
  `scripts/lib/editorial-footprint.js` (bank, dimensions, similarity) and
  `scripts/lib/seo-snapshot.js` (the SEO Preservation Gate), so the audit and the
  gate can never disagree about what any of it means.

### The EFR Quality Gate — PASS / REVIEW / FAIL for `/updates/` and `/guide/` (added 2026-09-02)

The audit above measures; this gate decides. It applies absolute thresholds to
the existing EFR score — **the measurement is unchanged** — on the two
hand-authored entry sections, as a per-PR **ratchet**:

| section | PASS | REVIEW | FAIL |
|---|---|---|---|
| `/updates/<slug>/` | ≤ 5.0 | > 5.0 – 7.0 | > 7.0 |
| `/guide/<slug>/` | ≤ 7.0 | > 7.0 – 8.0 | > 8.0 |

**EFR is a diagnostic and publishing quality-control metric, not an SEO ranking
factor.** And it is not minimised indefinitely: the target is the *minimum
editorial footprint required to completely satisfy the query*, so a lower score
bought by deleting facts, examples, tables, caveats or links is **IMPROVED BY
REMOVAL** — blocked when a concrete fact or internal link went, credit withheld
when depth, an example or a FAQ question went. Read `docs/efr-quality-gate.md`
before changing a threshold, and its §9 before calling a high score a defect:
`specificityDeficit` reads a fixed fact vocabulary, so a 2,983-word guide built
on fourteen worked archetypes scores 17.5 for naming five recognised facts. That
is what the exception ledger is for.
The vocabulary is widened as gaps are found, never per page: game names are
**harvested** from `js/gamename/game-rules.js` (the site's own rule engine),
and dates, durations, separated figures, percentages, engagement counts,
publishers and emoji fonts were added 2026-09-02. **A widening moves the cohort
median, so untouched pages move too** (that day: three guides crossed into FAIL
without a word changing, because the bar their cohort demonstrates rose). It
is a re-baseline event: regenerate `data/editorial_footprint_baseline.json` in
the same change and re-read the thresholds. The ratchet is unaffected, since it
scores both sides of a diff in one corpus.

- **`npm run check:efr`** — diff-scoped, **gating** in `validate.yml`. New page
  must meet PASS; a PASS page may not be pushed above it; a page above PASS may
  not get materially worse (**+0.5**, an allowance for the per-1,000-word
  denominator, not for noise — the score is deterministic, verified across
  4,619 unchanged pages); an improvement that is still above target is reported
  as **IMPROVED BUT STILL FAILING TARGET** and holds the ratchet at the new
  score, never as a regression. Both sides of every diff are scored in **one
  corpus** so the delta is the page's own change.
- **`npm run audit:efr`** / **`npm run report:efr`** — whole-site,
  **informational**: per-section PASS/REVIEW/FAIL counts, mean/median/p90, the
  Top 20 per section as the editorial backlog, written to
  `docs/efr-quality-report.md`.
- **`npm run test:efr`** — 37 assertions over the policy, **gating**.
- **The `lever` column** (report and console, added 2026-09-02) says which kind
  of work a non-PASS page needs: `facts` when `specificityDeficit` carries 70%
  or more of the score (add the numbers, names, versions and constraints the
  page is about; a phrasing rewrite will not move it), `phrasing`, `template`,
  `punctuation`, or `mixed`. Every FAIL on both sections at first measurement
  was facts-led, and an editor could not tell that from "9.3 FAIL".
- **`data/efr_exceptions.json`** — one page per entry (no wildcards, no whole
  sections), with the EFR it was agreed at, a reason, an owner, a date and an
  optional review date. Visible in every report, never silent, and the same bar
  as every other ledger here: discussed, never added to make a PR pass.

Absolute thresholds apply to **English** pages only — raw scores are not
comparable across locales (next section) — so a locale `/updates/` or `/guide/`
page is scored, reported as `UNCALIBRATED`, and ratcheted against its own
previous version only. Hub indexes (`/updates/`, `/guide/`) are unclassified by
policy. Verified against seven deliberately broken inputs and a replay of the
real 2026-09-01 `/updates/` rewrite before it was added to the gating list.

### Two things about it that are easy to get wrong

**Raw scores are not comparable across locales.** A locale page has no English
phrase rules, so those dimensions leave its denominator — and since they score
~0 for everybody, the exclusion *raises* its normalised score. Measured,
`fr/library/emojis-argent` reads 41.1 and its English parent
`library/money-emojis` reads 20.1 on near-identical inputs. Neither number is
wrong; comparing them is. Always rank and threshold on the ledger's
`locale_percentile`.

**An unmeasured dimension is `null`, never `0`.** Zero and unmeasured are
opposite claims, and printing one as the other is what makes an unmeasured
locale look clean. The three-item detector exists for 27 locales and is
deliberately absent for CJK and Thai, which list with an ideographic comma and no
spacing.

### The SEO Preservation Gate is a separate check, and stays separate

It never averages into the editorial score, because a lower score bought by
dropping the page's primary query language is a loss and a blended number would
hide the trade. Blocking on: canonical, title, H1, `robots`, hreflang,
search-protected terms, codepoints/limits/versions, and internal links. Warning
on: anchor text, FAQ questions, examples, headings, a >25% depth drop.

Ranking sensitivity is `unknown` unless a performance overlay is supplied at run
time (`--sensitivity`), and **`unknown` is the conservative posture, never a
licence**. Search Console data is first-party competitive information and does
not live in this repo — same boundary, and same reasoning, as the Local Language
Intelligence lexicon.

### Removing em dashes: by leverage, at the source (added 2026-09-02, user-directed)

The forward-only default above was **overridden by the user**, who asked for as
many em dashes removed as possible. This records how that was executed, because
the *how* is what keeps it from becoming the purge the rule warns against.

**Rank before editing.** The site's 118,000 em dashes are not 118,000 decisions.
Grouping em-dash-bearing strings by how many pages share them verbatim — the
`variety` measure this section already defines — turns the top of that list into
a handful of template strings. One CTA line accounted for ~1,800 pages across 17
languages; one tile-label format accounted for 2,915 more. **10,010 page
instances came out of ~1,320 authored decisions**, and nothing below the
template tier was touched.

**Every change is one of the phrase bank's own listed remedies**, never a synonym
swap and never a deletion: a full stop where the second half is a separate
thought (the CTA's "…and 100+ other Unicode font styles. Free and instant."), a
comma where a verdict meets its qualifier ("No, only letters and numbers"), a
colon where what follows explains what precedes (`Name (U+XXXX): gloss`). Every
word survives in every string; only the joint moves. `ko` and `tr` had already
written the CTA as one flowing sentence and were left alone — they were the
model, not an omission.

**Fix the spec, not only the page — and remember the locale spec directories.**
`data/library_page_specs/` has 628 EN specs *and 885 more under
`data/library_page_specs/<lang>/`*. A count taken with `*.json` sees only the
first set; the locale specs are the upstream for every locale page, so a pass
that edits locale HTML without them is undone by the next generator run. That
was nearly this pass's mistake, caught only because a recursive `grep -r` count
came back higher than the glob count and the discrepancy was chased rather than
assumed to be corruption.

**Three things this class of pass will surface, none of them its own bug:**

* **A stale-schema split.** Anchoring a rewrite on `>` or `"` reaches the
  JSON-LD copy of a FAQ answer and not the visible one, because the visible half
  starts on its own line after the wrapper tag. Widen the anchor to allow the
  newline, and check `check-faq-schema` before committing.
* **Pre-existing mesh defects on pages the pass merely touched.** Bringing 2,013
  locale pages into diff scope surfaced six German pages linking English hubs
  that have German equivalents. Repair with `sync-locale-mesh --fix` **scoped to
  those files**, never site-wide.
* **False "introduced English" reports.** See "Punctuation is not English"
  above; that gate needed fixing, not the content.

**Do not extend this to prose.** 83,730 em dashes remain in locale pages and
17,160 in English, and each of those is a sentence with its own decision. For
pages a branch leaves alone the rule stays forward-only: a branch must not
introduce one, including in its own new copy — this pass removed 23 it had just
written on the pages it was rewriting. For a page whose own copy a branch edits,
the next section applies: it leaves clean. The two sections were written the
same day by two sessions and reconciled on merge; they are the two halves of one
policy — source fixes ranked by leverage, and clean-on-touch for the prose.

### Clean on touch — forward-only is for the pages you leave alone (added 2026-09-02)

The em-dash rule (`EFR-F-001`) was written forward-only: a branch fails only on em
dashes it *introduces*, and the 52,766 already on the site are reported, never
required. That half stands for prose — the template-tier pass above is a source
fix ranked by leverage, not a purge of sentences. But **a page whose own
copy a PR edits leaves with zero em dashes in its measured slots, cards included**,
and its copy is brought to the tone-of-voice standard in the same change. User
direction, 2026-09-02. The gate reports the inherited ones as `em-dash-touched`.
"Zero" is read through the locale policy (`data/em_dash_locale_policy.json`,
adopted the same day): on a native-dash locale an em dash is never a finding,
on zh-tw and ja only a lone `—` counts, and on a review locale the finding is a
warning — see `docs/em-dash-policy.md` §4.

Three definitions carry the rule, and each one was chosen against a real case:

* **"Touched" means the page's own copy moved** — title, meta description, H1,
  headings, prose or FAQ text differs from the merge base. A card injected by the
  peer-link sync, a regenerated footer or hreflang block, a rebuilt library
  directory, an asset swap: none of those is a touch, because a mesh pass that
  rewrites 1,009 pages must not demand 1,009 rewrites. Once a page *is* touched,
  its cards count too.
* **A template-level change is not a touch (user decision, 2026-09-02).** The
  first large diff the rule met was the template-tier em-dash pass in #840: 499
  pages read as copy-touched and were billed 7,983 inherited em dashes, though
  nobody had written on any of them. So a page is touched only by a change of
  its own. Two shapes are carved out, in `classifyTouches()`: a string added or
  removed verbatim on **three or more** changed pages in the same PR (one string
  on many pages is a template by the phrase bank's own `variety` definition, and
  the fix lives in the template), and a string whose **punctuation or case alone**
  moved (the same rule the sitemap's significance hash applies, so the two
  systems cannot disagree). A page carrying a template change *and* a sentence of
  its own is still touched; a new page always is. Replayed on #840 the rule
  stopped reading the pass as 499 copy edits.
* **An English touch pulls the locale siblings along** (`em-dash-sibling`). Every
  sibling in the cluster that the PR does not itself copy-edit must already be
  clean **under its own locale's policy** (`data/em_dash_locale_policy.json`: a
  Russian sibling is never pulled in, a Chinese one only for a lone `—`, a
  review-locale sibling is a warning), or the gate names it and the parent that
  pulled it in. Anchored on
  English on purpose — it is where pages are born and where the standard is
  applied first — so a translator's one-line fix never obliges an English
  rewrite, and a new locale batch never obliges the cleanup of every parent it
  translates. The cost was chosen with the number in view: editing
  `symbol/euro-sign` pulls 18 siblings carrying 159 em dashes. Plan the sibling
  pass before opening the PR, not after the gate names them.
* **Generated inventory is not the hub's copy.** The pre-rendered library
  directory (`[data-static-directory]`) is rendered from other pages by the hub
  builders and is dropped from measurement — a hand edit there is overwritten by
  the next build, and `es/library/index.html` carried 144 of its 157 em dashes
  inside it. The EN hub's own `LIBRARY` array is the one exception: 25 em dashes
  in a script block nothing measures, cleared through the array and a rebuild.

Two things this surfaced. `.related-card` had never been in the card slot, so the
updates hub's eleven dated labels ("Aug 12, 2026 — Telegram …") and the "Keep
reading" grids on 193 pages were invisible to every rule — the currency scorecard
shipped its tone rewrite with one em dash left in exactly that slot. And the
gate's own upstream attribution still applies: when `em-dash-touched` names a spec
or generator, the fix goes there.

The gate stays in **shadow mode** for now — the three em-dash rules are in
`BLOCKING` and print "would block", and promotion is one workflow line per rule,
scheduled for review on 2026-09-16 after the shadow findings since this change are
classified. Do not turn `--enforce` on bare: `seo-preservation` would ride along,
and a deliberate retitle (which the tone standard requires) still has nowhere to
record its intent.

### Routing the CTA card, and the two things that constrained it (2026-08-26)

The shared CTA card sits on **3,951 pages, 2,758 of them (69.8%) pointing at a
bare homepage**. The obvious reading of that number is wrong and worth stating
before anyone acts on it again: **`/` and `/<locale>/` ARE the font generator**,
so "Open UltraTextGen →" pointing there is a real tool, not a dead end. The
defect is narrower — pages whose reader has a *different* next job get sent to
the generator anyway.

So the routing table is deliberately small: **214 English pages**, moved only
where the site has a tool the generator is not. Everything else keeps its card.

**No locale page routes, and that is not a translation gap — the destinations do
not exist.** There is no `/fr/character-counter/`, no `/es/kaomoji-generator/`,
no locale build of any of them. Linking an English tool from a locale page is
what the locale-native internal linking rule above forbids, and the locale
homepage already is that locale's generator. `route()` returns `None` for every
`<lang>/` path and a test asserts it. Do not "finish the job" by routing them.

**It does not lower the Editorial Footprint Risk score, and must not be described
as doing so.** One shared card replaced by three shared cards is still a
template; `variety` stays near zero. What changed is that the card is useful and,
for the first time, measurable — see the `cta_click` event, which fires from
`header.js` rather than `script.js` because **3,955 of 3,955 CTA pages load
`header.js` and only 148 load `script.js`**.

**The SEO Preservation Gate blocked its own author here, and was right.** The
first draft of the new copy dropped `ultratextgen` from the editorial text of all
214 pages — the old card was its only occurrence outside URLs and JSON-LD — and
the gate reported `protected-term-lost` on every one. The fix was to put the
product name back where each sentence already named the tool, never to exempt the
rule.

### The remediation principle

Never a synonym swap. Google's spam policy names *"automated transformations like
synonymizing"* as scaled content abuse, so trading words to lower a score moves
toward the policy, not away from it. The transformation asked for is: generic
claim → concrete information; abstract benefit → observable behaviour; filler
introduction → direct answer; template sentence → topic-specific knowledge. And
never "humanise" by adding randomness, slang or deliberate imperfections — that
lowers a metric and lowers the page.

---

## Build & Development

### Running locally
```bash
# No build step required — open index.html directly in a browser
# OR serve with any static file server:
npx serve .
python3 -m http.server 8080
```

### Sitemap regeneration
```bash
npm run prebuild   # Generates sitemap.xml
npm run build      # Same as prebuild (no other build step)
```

### Dependencies (build-time only)
```bash
npm install        # Installs cheerio (HTML parsing) and glob (file discovery)
```

---

## Automated Workflows

### `update-sitemap.yml`
- **Schedule**: Daily at 00:00 UTC — **paused since 2026-08-20** (the schedule
  lines are commented out in the workflow, with the reason; `workflow_dispatch`
  still works). Resuming is a decision tied to the 2026-08-16 organic-search
  incident, not a tooling question.
- **Action**: Runs `scripts/update-sitemap.js`, auto-commits `sitemap.xml` with `[skip ci]`
- **Do not** edit `sitemap.xml` manually — it will be overwritten

**`<lastmod>` means "what a reader sees changed" (rules as of 2026-09-02).**
`scripts/lib/content-significance.js` hashes each page and
`data/sitemap-lastmod-cache.json` holds `{hash, lastmod}` per URL; a date
advances only when the hash moves. Three classes never move it, each learned
from a real mass-bump: aria-labels and head metadata (2,533 pages on
2026-08-15/16), the generated static footer block (all 4,576 URLs would have
advanced on 2026-08-20 after #790), and punctuation or case alone (~2,800 pages
after the 2026-09-02 template-tier em-dash pass). Symbols and copy payloads are
hashed verbatim, because on this site a currency sign or a kaomoji *is* the
content. When a date does advance it is the date of the newest commit that
changed the hash, found by walking the file's recent commits, not the mesh or
template pass that happened to touch the file last.

**If you change what the hash covers, re-baseline the cache in the same PR:**
`npm run rebaseline:sitemap-cache -- <commit of the last sitemap run>` (that
commit is `git log -1 -- data/sitemap-lastmod-cache.json`). The stored hashes
were made by the old function; without this, the next run reads every URL as
changed. `npm run test:content-significance` gates the rules in CI and encodes
each mass-bump as a non-catch.

### `tweet-queue.yml`
- **Schedule**: Daily at 09:00 UTC (also triggerable manually)
- **Action**: Runs `scripts/tweet_queue.py`, posts qualifying commits as GitHub Issue comments
- Confidence threshold: 0.72 (favors HTML/CSS/guide changes; ignores lock files, lint, tests)

---

## Discovery Model — multi-surface (added 2026-08-29)

UltraTextGen does not optimize for a single discovery algorithm. Pages,
tools, images, printables, embeds, and data files are built to be useful on
their own terms and discoverable through many independent systems: Google,
Bing, Naver, Yandex and other search engines; AI assistants, answer engines
and their crawlers; image search; social sharing; embeds on other sites;
citations; and direct return visits. Google matters and is served well — it
is one distribution surface, not the operating system the site is designed
around.

Practical implications when working in this repo:

- **A page or asset should have a defensible reason to exist even if Google
  never sends it a visitor** — real utility, a share/print/embed path, or
  reference value an AI or a person would cite. "A keyword exists" is not,
  by itself, that reason.
- **Machine legibility is a distribution feature, not hygiene.** Several
  search and AI crawlers do not execute JavaScript; content and links that
  matter for discovery should be present in static HTML where feasible
  (the static footer and pre-rendered library-hub directories exist for
  exactly this reason — see "Library Hub Coverage" above). `robots.txt`
  deliberately welcomes AI crawlers.
- **Engine-specific registrations and their state live in
  `docs/webmaster-tools-registrations-2026-08-20.md`** (Google, Bing, Naver,
  Yandex, Pinterest domain verification). Sitemap and structured-data
  changes serve every registered engine, not just Google — weigh a
  Google-motivated change against its effect on the others.
- **The sharing/embed layer is part of discovery**: per-result share links
  (`?q=&style=`) with their OG preview Function, the `/embed/` widgets and
  their UTM conventions, and the printables' cred-line attribution are
  distribution surfaces. Keep them working, and extend them through their
  existing conventions (UTM naming, the OG style registry, the embed hub)
  rather than ad hoc.
- **None of this loosens the existing content rules.** Hub-vs-spoke,
  English-Parent, parity, ledger discipline, and any active publishing
  restrictions apply unchanged — multi-surface discovery is about
  distributing and exposing well-built assets, never about generating more
  pages.

## SEO & Structured Data

Every page includes JSON-LD for:
- `WebApplication` or `WebSite` (homepage)
- `Organization`
- `BreadcrumbList`
- `FAQPage` (where applicable)

When editing page content, preserve and update the JSON-LD structured data to match. Use schema.org vocabulary.

### FAQ schema must mirror visible page content

`FAQPage`/`QAPage` JSON-LD may only contain questions and answers the reader
can actually see on the page. Google's structured-data policy is explicit
that FAQ markup has to mirror on-page content; a page that ships a
`FAQPage` block describing Q&A it never renders is invisible-content markup
— it forfeits the rich result and is spammy-structured-markup territory for
a manual action. Content inside an accordion/disclosure widget **is**
visible for this purpose; content that exists only in the JSON-LD is not.

The rule cuts both ways, and both halves have failed here before:

- **Never add FAQ schema for Q&A the page doesn't render.** If the copy is
  worth marking up, put it on the page.
- **Never edit or trim a visible FAQ without updating the JSON-LD.** The
  stale-schema half is the more common failure: the visible FAQ gets
  rewritten, the JSON-LD keeps the old wording, and the questions silently
  stop matching. Paraphrase is not a match — Google compares the actual
  strings.

House markup for a rendered FAQ is either the JS-bound accordion
(`<div class="faq-item"><button class="faq-question">` + `.faq-answer`, which
`script.js` wires up) or the JS-free disclosure variant
(`<details class="faq-item"><summary class="faq-question">` + `.faq-answer`).
Prefer the `<details>` variant on any page that does not load `/script.js` —
it needs no binding and cannot double-bind against `script.js`'s own
`.faq-question` handler.

**Case study (2026-07-26):** a 2026-07-12 structural audit found two pages
(`usecase/stylish-name`, `usecase/zalgo-text`) shipping FAQ schema with no
visible FAQ and recorded it as a two-page defect. A site-wide scan found the
real number was **214 pages** — 155 with FAQ schema and no FAQ section at
all, plus 59 whose visible FAQ had drifted out of sync with its own JSON-LD
(212 orphan questions). Nothing had been watching for it because nothing
could: the audit was a manual read, so the count it produced was the count
someone happened to open. Fixed in one pass, and the reason it can't
silently return is the tooling below, not vigilance.

#### Tooling

- **`npm run audit:faq-schema`** (`scripts/audit-faq-schema.js`) — whole-site
  dashboard. Reports per page whether every FAQ-schema question is visible,
  broken down by locale, with `--full` for the individual questions and
  `--json`/`--report` to save a snapshot. Discovery tool; not wired into CI.
- **`npm run check:faq-schema`** (`scripts/check-faq-schema.js`) — the
  enforcing half, wired into `.github/workflows/validate.yml` as a gating
  check. Diff-scoped like `check-translation-parity.js`: it only inspects
  HTML this PR adds or changes, so pre-existing backlog elsewhere can never
  make it permanently red. Fails the PR listing the exact unmatched
  questions **and** the answers that drifted (see below).
- **`node scripts/fix-faq-schema-visibility.js`** — the repair pass, kept
  because the same two repairs apply every time this recurs. `--dry-run`
  reports; `--write` applies; a file list scopes it. It renders the schema's
  own Q&A into a house-style section when the page has no FAQ at all, and
  prunes-then-backfills the JSON-LD against the visible FAQ when the page
  does. It never invents copy: rendered text is the schema's own, backfilled
  text is the page's own.
- All three share `scripts/lib/faq-schema-audit.js`, so the audit, the gate
  and the fixer can never disagree about what counts as "visible."

**The gate only ever checked half the rule (fixed 2026-08-21).** The rule above
has two halves — questions must be visible, and an answer must not claim content
the page never renders — and only the first was enforced. The shared lib did
compute an answer comparison, but `check-faq-schema.js` never read it, so the
answer half was **present, documented, and dead**. That is the same shape as the
two `validate.yml` incidents above: *a check that reports nothing is
indistinguishable from a check that passes.*

It was found the way it had to be found — by shipping the defect. A correction
pass on `updates/unicode-18-most-anticipated-emoji` appended one sentence to a
JSON-LD answer ("See our Unicode 18.0 Release Date Confirmed update…") that the
visible answer never got. The gate reported `mismatched: 0`; a review agent
caught it by reading the page.

**It measures the delta, not the state** — the same design as
`check-locale-translation.js`, and adopted for the same measured reason. A
state check is not viable here: the site carries **923 drifted answer pairs
across 336 files** (measured 2026-08-21; ≥5 tokens still leaves 310, ≥12 leaves
38). Almost all of it is benign rewording where a translator tightened a
sentence. A gate red on 336 files regardless of the PR is a gate people learn to
ignore. So a pair counts against a branch only if its divergence **grew by
`DRIFT_TOLERANCE` (4) content tokens or more** since the merge base — roughly a
clause; the real regression added 5. Pre-existing drift is **reported, never
silenced**: the clean run on the branch that added this printed 0 introduced and
21 pre-existing, exit 0.

**The measurement is direction-neutral, which matters**, because CLAUDE.md names
the *stale-schema* half — visible FAQ rewritten, JSON-LD left alone — as the more
common failure. Both edits produce the same observable: schema tokens with no
home in the visible answer. The failure message says so rather than assuming the
JSON-LD is what moved.

**`visibleAnswers()` deliberately reads "the FAQ item's text minus its question"
rather than selecting `.faq-answer`.** Selecting the class reports **97 answers
across 21 pages as blank**, because those pages carry invalid nested markup —
`<p class="faq-answer"><p>…</p></p>`, which every parser auto-closes, leaving the
`.faq-answer` element genuinely empty. That markup bug is real and still
outstanding; it is not this gate's job, and the gate must not be fooled by it.

Verified per this file's own rule before being trusted (see "Adding a validator
script is not the same as gating on it"), against **two differently-shaped**
broken inputs so the check could not be tuned to one bug: the real regression
re-injected on `updates/unicode-18-most-anticipated-emoji` (JSON-LD grew a
sentence), and a visible answer trimmed on `category/underline-text` with its
JSON-LD left stale (0 → 16 tokens). Both exit 1; `audit-faq-schema.js` and
`fix-faq-schema-visibility.js` are unaffected. Note for anyone repeating this:
**do not pipe the run through `grep` to read the result** — `$?` is then grep's
status, which is the exact pipefail trap this file documents twice, and it
reported a false EXIT=0 on the first attempt here.

---

## Testing

There is no automated test framework, and no runner — every test here is a
plain file you open or a plain file you `node`. Testing is otherwise manual
and browser-based:

- `js/vertical/verticalLayouts.test.html` — manual test page for vertical layout module
- `js/counter/counterRules.test.js` — `node js/counter/counterRules.test.js`.
  Assertions for the pure half of the character counter: counting modes,
  per-language GSM-7 encoding flips, every reducer, `trimToFit` boundaries,
  `LIMITS` table integrity. No DOM, no dependencies.
- `js/counter/counter.test.html` — the DOM half, which needs a browser: the
  two-tier picker, live count, inspect line, fix bar, undo, trim, fit-grid
  ordering, SMS segments, soft-limit warning, clear. Open it and read the
  panel, or drive it headlessly and read `window.__UTG_TEST` (`{ pass, fail,
  lines, summary }`). It runs against a deliberately **non-English** I18N
  block, so it also asserts that a translated page renders translated fix-bar
  buttons instead of falling back to English — a regression that would
  otherwise only ever be noticed by a reader of that language.
- Test changes by opening HTML files in a browser

**Why the counter has tests when nothing else does.** It is the one surface
whose entire value proposition is numerical correctness, and it shipped a
wrong number: Bluesky was billing code points while the page's own reference
table said graphemes, so 👨‍👩‍👧‍👦 cost 7 instead of 1. A visual check
cannot catch that. Any future page that *asserts facts* — limits, counts,
encodings — deserves the same treatment; a page that merely renders copy does
not.

Do not add a test framework unless explicitly requested. Adding another
zero-dependency `.test.js` / `.test.html` in the idiom above is not "adding a
framework" and needs no permission.

### Zalgo example cards must decode back to their own label (added 2026-08-22)

`usecase/zalgo-text` and its eleven locale siblings each show six copy-paste
example cards, with the page's own **unzalgo** widget directly below them. That
widget strips combining marks **by codepoint range** (`zalgo-text.js`) — it does
not decompose. So a card only works while its marks are stored as *base +
combining mark*.

**Every zalgo string on this site is therefore NFC-fragile, by construction.**
Run any tool that NFC-normalises these files and 69 of them compose into
different letters at once — `A`+U+0328 becomes the single codepoint `Ą`, and no
range-strip can ever undo it. That already happened to EN and IT: twelve cards
decoded to `ZĄLGO`, `hellō`, `çiao`, `incȕbó`, each sitting immediately above the
box that claimed to reverse it. Nothing caught it — the markup was valid, the
strings looked like zalgo, and no check compared a card to its own label.

The inversion worth remembering: the pages that **work** are NFC-*unstable*, and
the pages that were **broken** were NFC-*stable*. Being NFC-stable is the symptom.
A generation pass that "helpfully" requires NFC-stable output will reject every
correct string — verified, it rejected all 4,000 candidates on the first attempt.

**`npm run check:zalgo-decodes`** (`scripts/check-zalgo-decodes.js`) is the
tripwire, wired into `.github/workflows/validate.yml` as a **gating** step. It
gates rather than informs — unlike the whole-site image and peer-link audits —
because it has no backlog to be permanently red against: a card either decodes
or it does not, and all 72 do. It fails on two shapes: a card that decodes to
anything other than its label, and a card carrying **no combining marks at all**
(a plain word passes a decode test trivially — that gap was found by probing the
check itself, not by reasoning).

**Never hand-type or hand-edit a zalgo string.** Generate it with the page's own
`generateZalgo()`, sliced out of the live `zalgo-text.js` rather than
reimplemented, and accept a candidate only if stripping the decoder's own ranges
returns the label *and* every codepoint is either one of the generator's marks or
the next base character in order. Match the card's existing mark density —
the six cards are a deliberate light-to-heavy gradient (≈1.8 marks/char up to 17),
not uniform.

Verified per this file's own rule before being trusted, against two
differently-shaped broken inputs: NFC-normalising one EN card (the real
regression) exits 1 naming it, and replacing a `ru` card with the plain word
exits 1 as unmarked.

---

## Git Workflow

- **Commit style**: Conventional commits (`feat:`, `fix:`, `chore:`, `UX:`)
- **PRs**: All changes go through pull requests; direct pushes to `master` are avoided
- **Branch naming**: `claude/<description>-<session-id>` for AI-generated branches
- **CI tags**: Use `[skip ci]` in auto-generated commit messages to prevent circular workflows
- **`sitemap.xml`**: Never manually edit — always auto-generated
- **"Shipped" means merged to master through a PR** — nothing else. A commit
  pushed to a branch is not shipped, and a commit pushed to a branch whose
  PR already merged is invisible (no open PR tracks it; it will never reach
  master). Before recording anything as shipped, confirm the PR shows
  merged, or that `git branch -r --contains <commit>` includes
  `origin/master`.

### Parallel sessions build the same thing under different names

Multiple AI sessions often work this repo concurrently, and translation
work is where they collide: two sessions closing the same locale gap can
pick **different locale slugs for the same EN parent** (e.g.
`id/symbol/yin-yang/` vs `id/symbol/simbol-yin-yang/`). Git's path-based
conflict detection cannot catch this — both directories merge cleanly and
silently coexist as duplicates. **Case (2026-07-25):** 26 such duplicate
pairs survived a merge of main; caught only because
`validate_library_pages.py` flagged one duplicate meta description, then
confirmed by checking every `id/symbol/` page's `hreflang="en"` back-link
for multiple claimants of the same EN parent (`4164fc6f`).

Standing protocol:
1. **Before starting a translation batch**, fetch and merge main, then list
   what already exists for that locale/lane — main may have grown pages your
   branch's plan assumes are missing.
2. **After every merge of main into a branch that adds locale pages**, check
   for duplicate claimants: no two pages in one locale may declare the same
   `hreflang="en"` parent. That check, not path conflicts, is the collision
   detector.
3. **When duplicates are found**, keep the set that's more deeply integrated
   (better meshed, more inbound links — usually main's), remove the other,
   and repoint every reference to the removed slug at the survivor.

---

## What NOT to Do

- Do not build a `<lang>/…` page for a feature/category/symbol/library topic
  that has no live English parent yet, without first raising it as an
  explicit, discussed exception. See "Localization Workflow — the
  English-Parent Rule" above.
- Do not create a new page for a high-volume keyword without first checking
  whether an existing page in that locale (especially its own hub/homepage)
  already targets and ranks for it. See "Before building a page for a
  keyword: check who already owns it" above — the `vi/chu-kieu/` case study
  is exactly this mistake.
- Do not link a locale page's topic section to an English `/category/`,
  `/library/`, `/usecase/`, `/guide/`, or platform page when a locale-native
  equivalent already exists — check before adding or editing any locale
  page's outbound link. See "Locale-native internal linking" above.
- Do not build an answer-shaped page (a sharp question, zero-click resolution)
  under a platform directory or any section other than `answers/` without an
  explicit, discussed exception. See "Answer pages live under `answers/` only"
  above — the `tiktok/`/`youtube/` "what font does X use" case study is exactly
  this mistake, and it cannibalized both pairs.
- Do not edit a page that's part of an hreflang cluster (EN + locale
  translations) without checking whether the edit is structural and, if so,
  syncing the sibling(s) or recording an explicit exception in
  `data/translation_parity_exceptions.json`. See "Translation Parity" above
  — this runs both directions (EN changed without locale catching up, or
  vice versa) and `scripts/check-translation-parity.js` enforces it in CI.
- Do not ship a locale page that still carries English verbatim from its own EN
  parent — not in prose, not in a visible `<span class="flag-label">` (the tile
  name appears twice; translating only the `aria-label` leaves the visible one
  English), and not in a `data-symbol` clipboard payload. See "Structure is not
  language" above. `npm run check:locale-translation` gates this on every page a
  PR touches; `npm run audit:locale-translation` gives the whole-site picture.
  A byte-identical correct translation goes in
  `data/translation_identical_strings.json` with its reason — never use that
  ledger to silence a string you have not translated.
- Do not put a verification stamp ("Last checked <date>", "Checked <date>") in
  an `updates/` entry's body prose, and do not let a second one appear anywhere
  on the page. One verification date per entry, as the last `guide-pill`,
  agreeing with `datePublished`. See "One verification date per entry, in the
  pill" above. An "As of <date>" qualifier on a time-bound claim is a different
  statement and stays inline. `npm run check:updates-verification` gates this;
  `npm run audit:updates-verification` gives the whole-pillar picture.
- Do not correct a number on one page of an hreflang cluster without correcting
  its siblings in the same PR. Structure, language and schema gates all pass a
  wrong number — that is how seven translations asserted a superseded Unicode
  18.0 character count for a month. See "Numeric Parity" above.
  `npm run check:numeric-parity` gates this; `npm run audit:numeric-parity` is
  the whole-site picture. A deliberate divergence goes in
  `data/numeric_parity_exceptions.json` with a reason — never to make a PR pass.
- Do not hand-type, hand-edit, or NFC-normalise a zalgo example string — the
  page's unzalgo widget strips marks by codepoint range and cannot undo a
  precomposed character, so composition silently breaks the card against the
  very widget below it. See "Zalgo example cards must decode back to their own
  label" above. `npm run check:zalgo-decodes` gates this in CI.
- Do not describe the Editorial Footprint Risk score as an AI-detection signal,
  add a commercial detector score as an input to it, or phrase any finding as a
  claim about who or what wrote a page. See "Editorial Footprint Risk" above —
  detectors misclassify 61.3% of non-native English writing, which would indict
  this site's own locales, and `npm run test:editorial-footprint` asserts the
  phrase bank makes no authorship claim.
- Do not lower an editorial score by swapping a flagged word for a synonym,
  removing a search-protected term, deleting a codepoint or example, or dropping
  an internal link. Google's spam policy names "automated transformations like
  synonymizing" as scaled content abuse, and the SEO Preservation Gate blocks the
  rest. Replace a generic claim with the fact behind it instead.
- Do not add an em dash to new or changed copy on a locale whose policy in
  `data/em_dash_locale_policy.json` is `ban` (English and the thirteen en-dash
  locales) or `double-dash` (zh-tw, ja, where only the paired `——` is native),
  and do not add a spaced hyphen standing in for one on an English page —
  `npm run check:editorial-footprint` exits 1 on an introduced one, in shadow
  mode too, since 2026-09-02, and names the locale's replacement (a colon, a
  full stop, a comma pair or parentheses in English; the spaced en dash in the
  en-dash locales). Do not change a locale's policy on a page by hand or by
  translating the English rule: it changes only in the ledger, with a native
  reader or corpus evidence — see `docs/em-dash-policy.md` §4 and §7.
- Do not "fix" an em dash by editing generated HTML. 6,918 of them are hardcoded
  in 572 spec files and 116 generator scripts, so the edit is undone by the next
  generator run — the gate names the upstream file when it can find it, and the
  locale specs under `data/library_page_specs/<lang>/` are a second set a `*.json`
  glob does not see. And do not run a site-wide purge: for pages you leave alone
  the rule is forward-only, and Google's own guidance warns against removing a
  page element because you heard it was bad. A **user-directed** removal pass is
  not a purge and has its own method — rank by shared-page count, fix the
  template, never the prose; see "Removing em dashes: by leverage, at the source"
  above.
- Do not edit a page's copy and leave its em dashes behind, and do not copy-edit
  an English page without bringing its locale siblings along. Since 2026-09-02 a
  page whose title, meta description, H1, headings, prose or FAQ text a PR
  changes must leave with zero em dashes in every measured slot, cards included,
  and its siblings must already be clean or be cleaned in the same PR — see "Clean
  on touch" above. "Clean" is read through each page's own locale policy in
  `data/em_dash_locale_policy.json` (a Russian sibling keeps its dashes; a
  Chinese one keeps `——`). `npm run check:editorial-footprint` reports both as
  `em-dash-touched` / `em-dash-sibling`.
- Do not paste a sentence from one page spec into another. `npm run
  check:spec-sentence-reuse` fails any spec a PR adds or changes that copies a
  sentence 3+ other specs already carry, and the fix is a sentence about *this*
  page — what the symbol is for, where it breaks, what it is confused with — not
  a synonym swap. A line that genuinely must be shared belongs in the generator
  default, where it is one string with one owner.
- Do not route a locale page's CTA card to an English tool, and do not "finish"
  the CTA routing by extending it to `<lang>/` pages. No locale build of any
  destination tool exists; the locale homepage already is that locale's
  generator. See "Routing the CTA card" above — `scripts/lib/cta_routing.py`
  returns `None` for every locale path on purpose and a test asserts it.
- Do not hand-edit a CTA card to change where it points. Change
  `scripts/lib/cta_routing.py` and run `npm run route:cta-cards -- --write`,
  which the page generator reads from too — a hand edit drifts the moment the
  page is regenerated.
- Do not add an entry to `data/editorial_phrase_bank.json` unilaterally, and
  never to make a page pass. Same bar as `data/translation_parity_exceptions.json`
  and `data/english_parent_exceptions.json`. Every entry carries its measured
  corpus frequency; an entry with no corpus evidence is a forward-looking guard
  and must say so.
- Do not compare Editorial Footprint Risk scores across locales, or read an
  unmeasured dimension as a zero. Rank on `locale_percentile`.
- Do not lower an `/updates/` or `/guide/` page's EFR to clear
  `npm run check:efr` by cutting explanation, evidence, examples, methodology,
  caveats, tables, instructions or source context — the target is the minimum
  footprint that still completely satisfies the query, and the gate reports a
  drop that coincides with a lost fact or link as IMPROVED BY REMOVAL. A page
  that genuinely needs its footprint goes in `data/efr_exceptions.json` with a
  reason — never to make a PR pass. See "The EFR Quality Gate" above.
- Do not cite an external source inline with no Sources block, and do not put a
  citation in a Sources block with the wrong `rel`. A page that states a fact it
  did not originate carries one `.source-note` block, in that locale's own word
  for Sources, holding every citation on the page, with `rel` set by the cited
  domain's tier in `data/source_authority.json` — a standards body, central bank
  or platform changelog is followed; press, reference works and forum threads are
  `nofollow`. See "Source Attribution" above. `npm run check:source-attribution`
  gates every page a PR touches; `npm run fix:source-attribution -- --write`
  fixes the mechanical half. A link that is a destination rather than evidence
  ("install this free font", "sign in here") goes in
  `data/source_resource_links.json` with a reason — never to make a PR pass.
- Do not hand-write a schema.org `citation` array, and do not hand-edit a
  Sources block's JSON-LD. It is generated from the block by the fixer precisely
  so the two cannot drift — the same reason the FAQ schema and the visible FAQ
  are compared rather than maintained twice.
- Do not ship a `<lang>/library/` or `<lang>/symbol/` page without registering it
  in that locale's hub — a page no hub links is reachable only from the sitemap.
  See "Library Hub Coverage" above. `npm run check:library-hub-coverage` gates
  every page a PR adds; `npm run audit:library-hub-coverage` is the whole-site
  picture. A page that genuinely belongs outside its hub goes in
  `data/library_hub_exclusions.json` with a reason — never to make a PR pass.
- Do not hand-edit the pre-rendered `#libDirectory` block in any library hub, do
  not hand-edit a hub's entry list, and do not narrow the five inventory
  mechanisms to the one a hub you are looking at happens to use. Run
  `npm run build:library-directory` for English and **`node
  scripts/build-library-hub.js`** for the locale hubs — that one derives entries
  from each page's own markup, so it needs no hand-help (it has no `npm run`
  alias, unlike its two siblings). `npm run build:locale-library-directory` is
  the superseded builder and now skips all 19 locale hubs; it is still gated on,
  but it is not the tool that fixes one. The static markup and the runtime markup
  come from the same code over the same source precisely so they cannot drift.
- Do not discover locales with a filesystem glob. `zh-tw` is five characters, so
  `glob("??")` silently skipped 73 of its pages for as long as that line existed.
  Read the canonical list from `data/locale_qualification_tiers.json` (Python) or
  `scripts/lib/locale-parent-registry.js`'s `LOCALES` (Node).
- Do not add npm packages that run in the browser
- Do not introduce a JavaScript framework or bundler
- Do not generate images server-side or with an image-processing library. Visual/printable
  output (bubble/cursive sheets, curved text, etc.) is **client-side SVG/Canvas → SVG/PNG only**,
  built with native browser APIs, and must not bundle `.ttf`/`.otf` font binaries.
- Do not make a visual/printable feature the *default* answer for a query that copy-paste
  Unicode already serves — visual assets are the higher-intent follow-up, gated on real demand
- Do not build generic (non-text) worksheet/activity content under this brand — shape-only
  tracing, mazes, word searches, math worksheets, pre-writing motor strokes with no letterform.
  See "Printables scope boundary" above. This demand is real but tracked for a possible future,
  separate property — not this repo.
- Do not put a query string in a `_redirects` source path. This is Cloudflare
  Pages, not Netlify: Pages matches the **path only** and silently drops the
  query, so `/?lang=fr  /fr/  301` is read as `/  /fr/  301` and 301s the
  English homepage to French for every visitor and crawler. That shipped in
  PR #566 and sat live from 2026-07-15 to 2026-07-26 — during that window
  `functions/_middleware.js` (which exists specifically to keep `/` English)
  was not executing, so nothing intercepted the bad rule. Note the ordering:
  when Functions ARE active on a route (per `_routes.json`), the Function
  runs *before* `_redirects` — verified on production 2026-08-10, where the
  middleware's `?lang=` 301s fire on `/` even though `_redirects` also has a
  `/` rule. Query matching belongs in `functions/_middleware.js`
  (`LANG_REDIRECTS`), which can actually read `url.searchParams`.
- Do not widen `_routes.json`'s `include` list, add new files under
  `functions/`, or delete `_routes.json`, without checking the Functions
  invocation budget. Every included route bills one Workers-quota invocation
  per request; with no `_routes.json`, Cloudflare auto-generates one that
  routes **every** request (CSS, JS, images, all pages) through the root
  middleware just to run `context.next()`. That was live until 2026-08-10
  and burned ~100k invocations/day — the entire Workers free daily quota —
  at ~36k pageviews/day. Static asset requests are free and unlimited only
  when they do not invoke a Function. Only `/` needs the Function (English
  homepage + legacy `?lang=` 301s); everything else must stay excluded.
- Do not edit `sitemap.xml` directly
- Do not add `var` declarations — use `const`/`let`
- Do not use `import`/`export` ES module syntax in frontend scripts
- Do not bypass the IIFE module pattern for new JavaScript files
- Do not hardcode color values in CSS — use the existing custom property tokens
- Do not add inline `<style>` blocks to HTML pages — add to `style.css`
- Do not skip Google Tag Manager snippets when creating new pages
- Do not skip JSON-LD structured data when creating new pages
- Do not ship `FAQPage`/`QAPage` JSON-LD whose questions aren't rendered on
  the page, and do not edit a visible FAQ without updating its JSON-LD to
  match — see "FAQ schema must mirror visible page content" above.
  `npm run check:faq-schema` enforces this in CI on every page a PR touches;
  `npm run audit:faq-schema` gives the whole-site picture.
- Do not ship a new or edited page's HTML before its hero/OG/Twitter art is
  generated and committed in the same change, and don't rely on a later
  cleanup pass to backfill it — see "New pages must ship with their hero/OG/
  Twitter art in the same change" above. Run `npm run check:new-page-images`
  before opening the PR.
- Do not upload (or hand-author) a pin CSV in any schema other than Pinterest's.
  The internal inventory CSVs (`data/*_pins.csv`) are NOT importable. Only the
  `data/*_upload.csv` files are — generated solely via `scripts/pinterest_csv.py`
  / `scripts/build_pinterest_upload.py`. See `docs/pinterest-csv-format.md`.
- Do not create a new Pinterest board off-system. Read
  `docs/pinterest-pin-generation.md` ("Adding a new pin board") FIRST, every time.
  Specifically: do not put pins in a new top-level folder (e.g. `pinterest-kit/`)
  or under `docs/` — render in memory and upload to R2 at `pinterest/boards/<board>/`
  via `scripts/lib/r2_pinterest.py` (see `docs/pinterest-r2-migration.md`); do not
  write a bespoke generator or visual template — mirror `scripts/generate-id-pins.py`
  and import the brand skin from `scripts/generate-site-art.py`; do not bundle
  `.ttf` font files; do not invent a pin look (no Poppins/pills/saturated
  colors/green CTA — use the off-white panel + dot grid + purple→blue brand skin).
- Do not write a Pinterest pin PNG to `assets/pinterest/` or
  `assets/collection-pins/`, and do not commit one. Since the 2026-08-17 R2
  migration (`docs/pinterest-r2-migration.md`), every generator renders in
  memory and uploads straight to Cloudflare R2 via `scripts/lib/r2_pinterest.py`
  — both directories are gitignored. Never hardcode R2 credentials; read
  `R2_ENDPOINT`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` from the environment
  (GitHub Secrets in CI) only.
- Do not ship a new locale page for a gated-tail parent, or for a Tier-3/held
  locale, without a recorded, passing entry in
  `data/locale_parent_gap_audit.json`. See "Locale Parent Governance" above
  — `scripts/check-locale-parent-gap.js` enforces this in CI, and
  `scripts/check-locale-parent-tier.js <path> <locale>` tells you the answer
  before you start building.
- Do not hand-edit hreflang `<link>` tags or a locale page's internal links
  to route around a missing sibling or a stale English-hub link — run
  `npm run sync:locale-mesh -- --fix` instead. See "Locale Parent Governance"
  above — `scripts/check-locale-mesh.js` enforces the result in CI.
- Do not hand-add a `symbol/` page's "Related Symbols" `compare-card` (or
  edit an existing one) without also running `npm run sync:symbol-peer-links`
  — a peer relation you declare on one page must be reciprocated on the
  named peer's own page, and the generator is what keeps that mechanical
  instead of manual. See "Content Types: Library vs Symbol" above —
  `scripts/check-new-symbol-peer-links.py` enforces this in CI for any
  `symbol/` page a PR touches.
