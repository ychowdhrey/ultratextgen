# UltraTextGen — Docs & Infrastructure Map

> **This is a living document.** UltraTextGen's structure is developed
> *emergently* — lanes are added as the need becomes clear, not designed all at
> once. This map is the single place that says, for any piece of work, *which
> lane it belongs to and which doc governs it.* It is kept current by the
> [Weekly infrastructure review](#weekly-infrastructure-review) at the bottom.

Start here. If you're about to build or change something, find its **page
type** or **operational track** below and follow the linked governing doc.

---

## Shared principles (apply everywhere)

| Doc | What it governs |
|---|---|
| [`jtbd-principles.md`](./jtbd-principles.md) | The *why* + global rules: one primary intent per page, namespace = page type, title-matches-the-verb, declared canonical ownership, demand over combinatorics. |
| [`page-vs-section-decisions.md`](./page-vs-section-decisions.md) | The page-vs-section gate (supply × demand) for any companion/subdivision content. |

These are page-type-agnostic. Everything below is an *application* of them.

---

## Page types (content lanes)

Each content page lives in a namespace that encodes its type, schema, and the
workflow that produces it.

| Type | Namespace | Schema | Governing workflow | Source of record | Generator + validator | Maturity |
|---|---|---|---|---|---|---|
| **Library** (symbol/emoji reference) | `/library/` | `Article` + `BreadcrumbList` | [`unicode-library-workflow.md`](./unicode-library-workflow.md) (forum research is maintained internally) | `the internal opportunity backlog` | `generate_library_page_from_spec.py` + `validate_library_pages.py` | ✅ fully systematized |
| **Symbol** (single glyph/emoji identity) | `/symbol/` | `Article` + `BreadcrumbList` | [`unicode-library-workflow.md`](./unicode-library-workflow.md) — shares the Library workflow; a spec sets `"page_type": "symbol"` | `the internal opportunity backlog` (backlog rows stay `page_type=library`; the library/symbol split happens per-spec in `data/library_page_specs/`, not in the backlog CSV) | `generate_library_page_from_spec.py` + `validate_library_pages.py` (shared with Library) + `sync_symbol_spoke_links.py` (hub↔spoke linking) | ✅ fully systematized (shares the Library pipeline end-to-end) |
| **Category** (style generators) | `/category/` | `WebApplication` | ❌ none | the internal opportunity backlog (`page_type=category`) | ❌ none | ⚠️ backlog, no generator |
| **Answers** (Q&A) | `/answers/` | `QAPage` / `FAQPage` | ❌ none | the internal opportunity backlog (`page_type=answers`) | ❌ none | ⚠️ backlog, no generator |
| **Usecase** | `/usecase/` | `WebApplication` | ❌ undocumented | ❌ none | ❌ none | ❌ undocumented |
| **Guide** (articles) | `/guide/` | `Article` | [`guide-content-workflow.md`](./guide-content-workflow.md) | `the internal opportunity backlog` (`page_type=guide`) | ❌ none (hand-built) | ⚠️ workflow + backlog, no generator |
| **Learn** (education pillar — handwriting/pre-writing/tracing articles) | `/learn/` | `Article` + `BreadcrumbList` + `FAQPage` | ❌ undocumented | ❌ none | ❌ none (hand-built) | ❌ undocumented — new this review (PRs #625, #650: handwriting hub + 9 articles, `dot-to-dots`, `coloring-and-fine-motor`). Content is *about* handwriting/tracing/coloring rather than a printable itself, but sits close enough to the Printables scope boundary in `CLAUDE.md` (shape-only/pre-writing content is out of scope there) to be worth an explicit look |
| **Events** (seasonal/holiday pages) | `/events/` (+ locale variants, e.g. `/es/events/`) | `WebApplication` + `FAQPage` | ❌ undocumented | `data/event_page_specs/*.json` (no CSV backlog row) | `generate_event_page_from_spec.py` (mirrors `generate_library_page_from_spec.py`; validation is built into the generator, no separate validator script) | ⚠️ generator exists, no backlog/governing doc — new this review (PR #457 + Spanish `es/events/` pages) |
| **Updates** (dated Unicode/platform/game rule-change log) | `/updates/` | `NewsArticle` + `BreadcrumbList` + `FAQPage` | `CLAUDE.md` "Content Type: Updates" section (documented there in depth; no dedicated file under `docs/`) | ❌ none (entries register directly in `scripts/generate-site-art.py`'s `PAGES` dict; no CSV backlog row) | ❌ none (hand-built) | ⚠️ actively shipping — 10 PRs this week alone (#607, #608, #610, #615, #616, #619, #620, #628, #634, #646) — but this map and the digest classifier had no row/rule for it until now |
| **Printables** (bubble/cursive/block/tracing/coloring sheets) | `/printables/` | `WebApplication` (+ `CollectionPage` hub) | `CLAUDE.md` scope note | the internal opportunity backlog (`page_type=printables`, added 2026-07-09 — other-language/other-script backlog) | ❌ none (hand-built, on `js/printables/printablesEngine.js`) | ⚠️ backlog, no generator |
| **Platform** (social-network generators) | `/discord/`, `/instagram/`, `/x/`, `/threads/`, … | `WebApplication` | ❌ undocumented | ❌ none | ❌ none | ❌ undocumented |
| **Root pages** (homepage, 404, legal) | `index.html`, `_root.html`, `404.html`, `about/`, `contact/`, `privacy/`, `terms/`, site icons | `WebSite` (homepage) | ❌ undocumented | ❌ none | ❌ none (hand-built) | ❌ undocumented |

**Only the Library and Symbol lanes are structurally complete** (discovery →
scouting → research → volume → score → dedupe → spec → generate → validate →
PR) — Symbol shares Library's pipeline end-to-end, split only by the
per-spec `page_type` field. The other lanes have principles and, for
category/answers, a strategy spec — but no demand backlog or generator. See
[Known gaps](#known-gaps).

---

## Operational tracks (cross-cutting)

These run across page types rather than producing a type.

| Track | Scripts | Doc | Cadence |
|---|---|---|---|
| Distribution loops (share/embed/OG, viral & SEO loops) | `script.js` (share/`?q=`/copy), `tweet_queue.py`, `generate-*-pins.py`, embed widgets. **Grew this week (PRs #801/#803/#813):** result-level Share (a per-style, per-result shareable `?q=`/`?style=` URL, its own action button distinct from Copy) across the main generator plus the vertical/repeat/scroll/tattoo/decorator/cursive/events controllers; server-side link previews via a new Cloudflare Function (`functions/_og-preview.js` + `_og-style-data.js`, imported by `_middleware.js` — both `_`-prefixed so they stay unrouted code modules, not new billed routes; `_routes.json`'s `include` is still just `["/"]`) that serves result-specific OG/Twitter meta when a shared link is crawled; and 114 pre-rendered per-style OG PNG cards (`assets/og/style/*.png`, `data/og_style_registry.json`, `scripts/generate-style-og-cards.py`) so each style's share preview shows that style's own art instead of the generic card | ❌ none | per batch + quarterly |
| Retention & engagement (saved styles, prefs, return triggers) | `script.js` (`utg_saved_styles`/`save_style`/`?q=`), `header.js` (dark-mode pref) | ❌ none | per batch + monthly metric |
| Image SEO (hero art, OG cards) | `make-hero-decorative.py`, `add-og-dimensions.py`, `build-image-seo-status.py` | [`image-seo-fixes.md`](./image-seo-fixes.md) | per batch |
| Pinterest pins (+ new boards) | `generate-pinterest.py`, `generate-id-pins.py`, `generate-vertical-text-pins.py` (skin: `generate-site-art.py`); CSV: `pinterest_csv.py` + `build_pinterest_upload.py` | [`pinterest-pin-generation.md`](./pinterest-pin-generation.md) (board conventions) + [`pinterest-csv-format.md`](./pinterest-csv-format.md) | per batch |
| ↳ Pinterest API publishing + insights (new this week) | `scripts/lib/pinterest_api.py`, `scripts/publish-pinterest-pin.py` (v5 publish pipeline, PRs #780–#782), `scripts/pinterest-insights.py` (read-only account/pin analytics, PRs #783/#785); workflows `pinterest-publish-test.yml` (manual, single-pin proof of concept only — no `schedule:` trigger yet) + `pinterest-insights.yml` (manual, read-only) | [`pinterest-api-publishing.md`](./pinterest-api-publishing.md) | manual (`workflow_dispatch`) — phase-3 proof of concept, not yet the queued/scheduled publisher the doc describes as the target |
| Schema / alternateName SEO | `validate-alternatenames.py`, `inject-faq-jsonld.js`, `alternatename-seo-report.md` | ⚠️ none | per batch |
| Image backlinks (embeddable images / widgets) | `/embed/` widget pages (no generator yet) | ❌ none | ad hoc |
| **Visual & printable assets** (in-browser SVG/PNG output mode) | `js/curved/curvedText.js` + `curvedTextController.js` (curved/arc tool → `/curved-text/`); `js/bubble/bubbleExplorer.js` (printable bubble letters, per-letter + A–Z); `js/cursive/cursivePageController.js` + `cursiveData.js` (cursive practice sheets) | [`jtbd-principles.md`](./jtbd-principles.md) §10 (output modes) + `CLAUDE.md` scope note | per feature (demand-gated) |
| Collection-copy audit | `the internal opportunity-audit tool` (+ explorer, see workflow §5) | ⚠️ workflow §5; [`emoji-combination-taxonomy.md`](./emoji-combination-taxonomy.md) for combo taxonomy | per batch |
| i18n / localization | `prerender-i18n.js` (+ 30 live locale directories, `locales/`, `README.*.md`) — the classifier that tracks these (`scripts/weekly_pr_digest.py`) matched them one-by-one until 2026-08-01; see Known gaps #4 | ❌ none | as needed |
| Ads / monetization (Google AdSense) | `scripts/check-ads.js` (CI: `ads-check.yml`, enforces the AdSense loader site-wide + guards `ads.txt` against leftover Journey manager/seller lines), AdSense loader injected site-wide via `header.js` | ❌ none | as needed |
| ↳ Printables × i18n (not yet wired together) | n/a — `/printables/` pages have no `data-i18n` attributes / locale-JSON keys yet | the internal opportunity backlog `OPP-0803` (scoping note: German/Spanish/French native-query volume for alphabet printables outweighs the English long-tail) | needs scoping pass |
| Consent management (Google Funding Choices) | `check-funding-choices.js`, `inject-funding-choices-tag.js` — tag deployed to every HTML page (PR #660, 2026-07-25) | ❌ none | CI (`validate.yml`, gating — wired 2026-08-06). Unlike the other whole-site checks it has no backlog to be permanently red against (the tag either is or isn't in a page's `<head>`), so it gates rather than informs. Was unwired for over a week first, which is how 37 pages across three unrelated PRs shipped without it before anyone noticed — see Known gaps #9 and #16 |
| Search-engine webmaster verification (site-ownership files/tags, sitemap submission tracking per engine) | none — root-level verification stub per engine (e.g. `naverfc08aab480545cfd1d61489b3536a5e6.html`, PR #793); `check-ads.js`/`check-funding-choices.js` both skip these by content signature (`VERIFICATION_STUB_RE`) so page-infra tags can never be injected into them | [`webmaster-tools-registrations-2026-08-20.md`](./webmaster-tools-registrations-2026-08-20.md) | ad hoc, per engine — new this week (Naver Search Advisor registered + verified; Google Search Console and Bing Webmaster Tools confirmed live retroactively; Yahoo Japan/Thailand skipped, Seznam/Cốc Cốc considered and deferred — all recorded in the doc) |
| CSS audit | `audit-css.js` | ❌ none (CI-only) | CI (`css-audit.yml`); its `reports/` artifact output is also sometimes committed directly by PRs — `LANE_RULES` learned this path 2026-08-08 (see Known gaps #16) |
| GTM check | `check-gtm.js` | ❌ none (CI-only) | CI (`gtm-check.yml`) |
| Image asset check | `check-image-assets.py` (whole-site, informational) + `check-new-page-image-assets.py` (diff-scoped, gating) | ❌ none (CI-only) | CI (`validate.yml`, folded in from the retired `image-assets-check.yml`) |
| hreflang reciprocity audit | `audit-hreflang.js` (`npm run check:hreflang`) | ❌ none (CI-only) | CI (`validate.yml`, gating) |
| hreflang cluster completeness (every cluster member links every other member — catches *mutual* omissions pairwise reciprocity can't see) | `audit-hreflang-completeness.js` (`npm run check:hreflang-completeness`) | `CLAUDE.md` "Locale Parent Governance" tooling section (no dedicated `docs/` file) | CI (`validate.yml`, gating, whole-site) |
| Library/Symbol structural lint | `validate_library_pages.py` | [`unicode-library-workflow.md`](./unicode-library-workflow.md) | CI (`validate.yml`, gating) |
| Translation parity (EN ↔ locale sync-after-creation) | `audit-translation-parity.js` (whole-site, informational) + `check-translation-parity.js` (diff-scoped, gating) | `CLAUDE.md` "Translation Parity" section (no dedicated `docs/` file) | CI (`validate.yml`, gating) + ad hoc audit |
| Locale mesh (hreflang reciprocity + locale-native link rewrites) | `sync-locale-mesh.js` (`--fix`) + `check-locale-mesh.js` (diff-scoped, gating) | `CLAUDE.md` "Locale Parent Governance" section + [`locale-parent-governance.md`](./locale-parent-governance.md) | CI (`validate.yml`, gating) + per-batch `--fix` |
| Locale parent governance (Core Parent Set + Locale Tier registries — which parents mirror into which locales by default) | `check-locale-parent-tier.js` (pre-build lookup) + `audit-locale-parent-gap.js` (whole-site, informational) + `check-locale-parent-gap.js` (diff-scoped, gating) | `CLAUDE.md` "Locale Parent Governance" section + [`locale-parent-governance.md`](./locale-parent-governance.md) | CI (`validate.yml`, gating on new locale pages) + run before starting new locale work |
| FAQ schema visibility (FAQPage/QAPage JSON-LD must mirror the visible page) | `audit-faq-schema.js` (whole-site, informational) + `check-faq-schema.js` (diff-scoped, gating) + `fix-faq-schema-visibility.js` (repair pass) | `CLAUDE.md` "FAQ schema must mirror visible page content" section | CI (`validate.yml`, gating) + per-batch audit/fix |
| Local Language Intelligence (evidence-backed locally-native vocabulary per market) | ❌ none (data lives only in a separate workspace kept outside this repo — **not** synced into this repo as of 2026-08-19; `scripts/plan-library-locale-batch.py` reads that workspace's canonical CSV directly as a sibling checkout and fails loudly if it isn't attached) | `CLAUDE.md` "Local Language Intelligence" section + [`local-language-intelligence.md`](./local-language-intelligence.md) | as needed, continuous capture |
| External reference check (no tracked file may point readers at a repo, doc, or tool that isn't published here — comments, docstrings, ledger evidence text) | `check-external-refs.js` | ❌ none (script's own header doc) | CI (`validate.yml`, gating, whole-site) — new this week (found + cleared ~35 hits across 28 files, 2026-08-06) |
| Counter claim-consistency (a number written in prose/`<meta>` must match the code that produces it — structural validators can't see a figure inside a `<td>` or a description tag) | `check-counter-claims.js` | ❌ none (script's own header doc); see also Testing section for the counter's manual test suites | CI (`validate.yml`, gating) — new this week, born from the character-counter rebuild (PRs #719/#724 et al.) after two stale-number regressions shipped green |
| Document head structure (fails when markup lands above `<!DOCTYPE html>` or outside `<head>` — a bug a text-level grep audit cannot see, since it counts the tag whether or not a browser or crawler ever would) | `check-document-head.py` | ❌ none (script's own header doc) | CI (`validate.yml`, gating, whole-site) — new this week (PR #747, 2026-08-13), born from `es/decorador-de-texto` and `es/simbolos-para-free-fire` shipping a single-quoted `hreflang` link spliced above the doctype; gates because the backlog was zero the day it shipped |
| Tile codepoint check (a copy tile must contain the exact codepoint its own label names — catches NFC silently normalizing U+2126/U+212A and NBSP-family spaces down to lookalikes) | `check-tile-codepoints.py` | ❌ none (script's own header doc) | CI (`validate.yml`, gating, whole-site) — new this week (PR #747, 2026-08-13), born from a sweep that found 172 mismatched tiles across 89 pages; gates for the same zero-backlog reason as the row above |
| Locale spec check (validates a locale spec against its live EN parent *before* any HTML is generated — tile-count parity, hreflang self-reference, related-link targets resolving on disk, duplicate claimants) | `check_locale_spec.py` | ❌ none (script's own header doc) | CI (`validate.yml`, gating, whole-set — small enough not to carry a backlog) — added 2026-08-08 (PR #731) |
| Locale translation completeness (structure ≠ language — a locale page can pass every structural gate above and still carry untranslated English prose, tile labels, or clipboard payloads) | `audit-locale-translation.js` (whole-site, informational) + `check-locale-translation.js` (diff-scoped, gating) + shared `scripts/lib/locale-translation-audit.js`; ledger: `data/translation_identical_strings.json` | `CLAUDE.md` "Structure is not language" section (no dedicated `docs/` file) | CI (`validate.yml`, gating) + per-batch audit — **missing from this map until now**; gate wired 2026-08-15 (PR #767, same week as the last review but after it was authored — see Known gaps #16) |
| Crawler visibility for non-rendering bots (`robots.txt` invites GPTBot/ClaudeBot/Amazonbot/Google-Extended/meta-externalagent, which fetch plain HTML and run no JS — content that only ever existed as JS-rendered output was invisible to them) | `build-static-footer.js` (bakes `footer.js`'s own output into every page's HTML; `--write` to build, no flag to check) + `fix-footer-nested-content.py` (moved 727 pages' FAQ sections out of `<footer>`, where content-extractors discard them as boilerplate) + `build-library-directory.js` (pre-renders the library hub's 336 spoke links as static HTML, `--check` to check) | ❌ none (PR bodies only — #789, #790) | CI (`validate.yml`, gating, whole-site, zero backlog) — new this week |
| Library hub coverage & template parity (does every `<lang>/library/index.html` link every page that exists in its own `<lang>/library/` directory, and does every one of the 19 locale hubs carry the same browse UI — search/filter, pre-rendered `#libDirectory` — instead of a plain stub) | `check-library-hub-coverage.js` (diff-scoped, gating) + `audit-library-hub-coverage.js` (whole-site, informational) + `scripts/lib/library-hub-registry.js`, covering coverage; `check-library-hub-parity.js` (diff-scoped, gating; found 12/19 locale hubs shipped as plain stubs across several 2026-07-14/2026-08-10 batches, nobody having chosen that) + `build-library-hub.js` + `js/library/library-hub.js` (one shared browse module now migrated onto all 19 locale hubs) + `build-locale-library-directory.js` (`--check` gate: pre-renders each locale hub's static directory so it can't go stale against its own `LIBRARY` array), covering parity | `CLAUDE.md` "Library Hub Coverage" section (no dedicated `docs/` file) | CI (`validate.yml`, gating) + per-batch audit — new this week (PRs #789/#812/#814/#815) |
| Editorial Footprint Risk (measures how templated the site's own prose reads — formulaic phrasing, repeated syntax, promotional vagueness, sameness across pages — as a 0–100 score; explicitly not an AI-detection signal) | `audit-editorial-footprint.js` (whole-site, informational) + `check-editorial-footprint.js` (diff-scoped, shadow-mode for every rule but the forward-only per-locale em-dash ban and the English spaced-hyphen ban, which exit 1 and gate since 2026-09-02 — policy in `data/em_dash_locale_policy.json`, measured by `audit-em-dash.js`, see [`em-dash-policy.md`](./em-dash-policy.md)) + `mine-editorial-phrases.js` (regenerates `data/editorial_phrase_bank.json` from the site's own corpus) + `scripts/lib/editorial-corpus.js`/`editorial-footprint.js`/`seo-snapshot.js` (the separate, always-blocking SEO Preservation Gate) | [`editorial-footprint-risk.md`](./editorial-footprint-risk.md) | CI (`validate.yml`; shadow-mode check + gating unit tests, `test:editorial-footprint`) — new this week (PR #810) |
| EFR Quality Gate (PASS / REVIEW / FAIL thresholds on the Editorial Footprint Risk score for `/updates/` (≤ 5.0) and `/guide/` (≤ 7.0), applied as a per-PR **ratchet** — new pages must meet PASS, existing pages may not get materially worse, improvements bought by deleting facts or links are not credited; a diagnostic and publishing quality-control metric, not an SEO ranking factor) | `check-efr.js` (diff-scoped, gating) + `audit-efr.js` (whole-site, informational; `report:efr` writes `docs/efr-quality-report.md`) + shared `scripts/lib/efr-gate.js`; ledger: `data/efr_exceptions.json` | [`efr-quality-gate.md`](./efr-quality-gate.md) | CI (`validate.yml`; gating check + gating unit tests, `test:efr`) — added 2026-09-02 |
| Spec sentence-reuse gate (a `data/library_page_specs/*.json` spec pasting a sentence 3+ other specs already carry — a hand-written-once-per-spec surface nothing was comparing across specs) | `check-spec-sentence-reuse.py` (diff-scoped, gating) + `audit-spec-sentence-reuse.py` (whole-corpus, informational — `--audit` flag on the same script) | ❌ none (script's own header doc; cross-referenced from `CLAUDE.md`) | CI (`validate.yml`, gating) — new this week (PR #811), found 45 sentences repeated across 416 of 591 specs |
| Zalgo example-card decode check (each of the six copy-paste zalgo cards on `usecase/zalgo-text` and its 11 locale siblings must decode back to its own plain-text label through the page's own codepoint-range unzalgo widget — an NFC-normalizing tool silently composes a card into different letters, which already happened to EN and IT) | `check-zalgo-decodes.js` | `CLAUDE.md` "Zalgo example cards must decode back to their own label" section | CI (`validate.yml`, gating, whole-site — no backlog, a card either decodes or it doesn't) — shipped 2026-08-22 but missed the review that same day; this is its first appearance on this map |
| Generator parity tests (a refuse-to-overwrite guard: a full-page generator must not silently delete another repair pass's work — the Funding Choices tag, the static footer, hreflang alternates, OG art — from a page it regenerates) | `scripts/lib/generator_parity.py` + `generator_parity.test.py` (`test:generator-parity`) | ❌ none (script's own header doc) | CI (`validate.yml`, gating) — shipped as `printables_parity.py`/`test:printables-parity` (PR #811, 2026-08-26, "Batch A" of the printables de-templating, 4 callers); renamed PR #849 (2026-09-02) after picking up a fifth caller, `generate_library_page_from_spec.py` — see Known gaps #8. The shared SVG/PNG export helper this lane's Known gap #8 has asked for since 2026-07-11 is still open |
| Source Attribution (a page citing a fact it didn't originate carries one `.source-note` Sources block, in that locale's own word, with every citation's `rel` set by the cited domain's tier — a standards body or platform changelog is followed, press/reference works/forum threads are `nofollow`; projected into JSON-LD `citation` so the two can't drift) | `check-source-attribution.js` (diff-scoped, gating) + `audit-source-attribution.js` (whole-site, informational) + `fix-source-attribution.js -- --write` (repair pass) + shared `scripts/lib/source-attribution.js`; ledgers `data/source_authority.json` (domain tiers) + `data/source_resource_links.json` (destination links that aren't citations) | `CLAUDE.md` "Source Attribution" section (no dedicated `docs/` file) | CI (`validate.yml`, gating) — new this week (PR #861, 2026-09-03) |
| Numeric Parity (correcting a number on one page of an hreflang cluster — a Unicode character count, a codepoint, a rule change date — without correcting its siblings in the same PR; structure/language/schema gates all pass a wrong number) | `check-numeric-parity.js` (diff-scoped, gating) + `audit-numeric-parity.js` (whole-site, informational) + shared `scripts/lib/numeric-parity.js`; ledger `data/numeric_parity_exceptions.json` | `CLAUDE.md` "Numeric Parity" section (no dedicated `docs/` file) | CI (`validate.yml`, gating) — new this week (PR #844, 2026-09-02), born from seven translations asserting a superseded Unicode 18.0 character count for a month while every other gate passed |
| Locale combo-set (collection) parity (a `copy_pattern: "collection"` section renders at runtime through `UltraTextGen.buildGrids()` and leaves no static markup, so every structural/schema gate is blind to a locale page missing it) | `check-locale-collection-parity.py` (diff-scoped, gating) | ❌ none (script's own header doc) | CI (`validate.yml`, gating) — new this week (PR #822, 2026-09-01); found 61 locale pages missing the section outright and 32 more short some groups, a blind spot `check_locale_spec.py` alone couldn't see because 471 of 798 combo-set pages were hand-built with no spec |
| Updates verification-date discipline (exactly one verification date per `/updates/` entry, as the last `guide-pill`, agreeing with `datePublished`; no stamp in body prose; a "no rollout date announced" qualifier stays inline, dated, as a different kind of statement) | `check-updates-verification.js` (gating) + `audit-updates-verification.js` (whole-pillar, informational) + shared `scripts/lib/updates-verification.js` | `CLAUDE.md` "One verification date per entry, in the pill" section | CI (`validate.yml`, gating) — new this week (PR #839, 2026-09-01/02; locale-pill rules for the 56 `<lang>/updates/` pages added same window, PR #846) |
| CTA card routing (route each page's shared "Open UltraTextGen" CTA card to the tool that actually serves the reader's next job, not the homepage default — 214 English pages moved; no locale page routes, because no locale build of any destination tool exists yet) | `scripts/lib/cta_routing.py` (single owner of the routing table + card copy, read by the page generator too) + `route-cta-cards.py` (`npm run route:cta-cards -- --write`) + a `cta_click` tracking event fired from `header.js` + `test:cta-routing`/`test:cta-tracking` (gating unit tests) | `CLAUDE.md` "Routing the CTA card" section (no dedicated `docs/` file) | CI (`validate.yml`, gating unit tests) + per-batch `--write` — shipped 2026-08-26 but missing from this map until now; rebuilt and re-instrumented PR #849 (2026-09-02), the same PR that renamed the generator-parity guard above |
| Accent notice consolidation (one sentence per locale, baked from `data/accent_notice_copy.json` into every generator page with a `#mainInput` whose locale has copy for it — replacing 47 hand-pasted, unevenly-placed copies across 8 locales) | `build-accent-notice.js` (`--write` to bake, `--check` gating in CI) | ❌ none (script's own header doc) | CI (`validate.yml`, gating) — new this week (PR #824, 2026-09-01) |

---

## Automated workflows (`.github/workflows/`)

| Workflow | Trigger | Action |
|---|---|---|
| `update-sitemap.yml` | daily 00:00 UTC | regenerate `sitemap.xml` (`[skip ci]`) |
| `update_readme.yml` | weekly (Mon 03:00 UTC) | sync README from sitemap (`sync-readme.js`) |
| `weekly-pr-digest.yml` | weekly (Mon 06:00 UTC) | classify merged PRs by lane → `docs/infra-review/<date>.md` + `latest.md` |
| `tweet-queue.yml` | daily 09:00 UTC (+ manual) | post qualifying commits (`tweet_queue.py`) |
| `css-audit.yml` | on `pull_request` | `audit-css.js` |
| `gtm-check.yml` | on `pull_request` | `check-gtm.js` (GTM snippet present) |
| `schedule-cache-removal.yml` | annual (Apr 10) + manual | cache maintenance |
| `pinterest-publish-test.yml` | manual (`workflow_dispatch`) | `scripts/publish-pinterest-pin.py` — single-pin Pinterest API v5 publish, deliberately a phase-3 proof of concept (no `schedule:` trigger, no looping over rows yet) |
| `pinterest-insights.yml` | manual (`workflow_dispatch`) | `scripts/pinterest-insights.py` — read-only account/per-pin analytics from the real Pinterest account; never writes |
| `ads-check.yml` | on `pull_request` (HTML/`header.js`/`package.json`/`ads.txt`/`scripts/check-ads.js`) | `check-ads.js` (AdSense loader deployed site-wide; also guards `ads.txt` against Journey lines reappearing) |
| `workflow-lint.yml` | on `pull_request` + `push` (master/main) + manual, no path filter | `check-workflows.py` (gating, no `continue-on-error`) — lints every `.github/workflows/*.yml` for the shape Actions needs (trigger, `jobs`, `runs-on`, steps with `uses`/`run`), plus the two failure modes that hid past incidents: a step that pipes into `tee`/similar with no `pipefail` in effect, and a `continue-on-error: true` step whose `outcome` nobody reads. Added 2026-08-08 (PR #731) as a **second, deliberately separate** lint surface from `validate.yml`'s own copy of the same check — a step inside `validate.yml` can't catch `validate.yml` itself failing to parse (exactly what happened 2026-08-07), so this file exists to survive when the big one breaks; do not consolidate them. Was itself missing from this table with zero footprint until now, the same blind spot Known gaps #16 already tracks for the `validate.yml` row below. |
| `validate.yml` | on `pull_request` (+ manual) | Its own copy of `check-workflows.py` runs first and is also gating. **Required, blocking gates (37):** `audit-hreflang.js`, `audit-hreflang-completeness.js`, `validate_library_pages.py`, `check-funding-choices.js`, `check-counter-claims.js`, `check-new-page-image-assets.py`, `check-new-symbol-peer-links.py`, `check-translation-parity.js`, `check-locale-mesh.js`, `check-source-attribution.js`, `check-locale-translation.js`, `check-locale-parent-gap.js`, `check_locale_spec.py`, `check-locale-collection-parity.py`, `check-faq-schema.js`, `check-zalgo-decodes.js`, `check-numeric-parity.js`, `check-updates-verification.js`, `check-external-refs.js`, `check-document-head.py`, `check-tile-codepoints.py`, `build-static-footer.js` (`check:static-footer`), `build-accent-notice.js` (`check:accent-notice`), `build-library-directory.js` (`check:library-directory`), `build-locale-library-directory.js` (`check:locale-library-directory`), `check-library-hub-coverage.js`, `check-editorial-footprint.js` (partially — see below), `check-efr.js` (`check:efr`), `check-spec-sentence-reuse.py`, `check-library-hub-parity.js`, plus seven gating **unit-test** steps with no backlog to be red against: `test:editorial-footprint`, `test:efr`, `test:content-significance`, `test:generator-parity`, `test:spec-sentence-reuse`, `test:cta-tracking`, `test:cta-routing`. Plus four whole-site audits that run every PR but are **informational only** (`continue-on-error`, never fail the job) because they carry a large, deliberately-paced backlog that would otherwise be permanently red: `check-image-assets.py` (Pinterest pins), `sync_symbol_spoke_links.py --check` (symbol peer-link dashboard), `audit-locale-parent-gap.js` (locale translation coverage), and `audit-library-hub-coverage.js` (library hub coverage). **`check-editorial-footprint.js` is no longer purely informational** — since 2026-09-02 its step outcome is in the blocking `if:` list too, because the forward-only per-locale em-dash/spaced-hyphen rules now exit 1 (every other rule still reports and exits 0; see the Editorial Footprint Risk operational-tracks row and `CLAUDE.md`). Supersedes the old path-filtered `image-assets-check.yml` (retired). **Historical caveat (found + fixed 2026-08-05/06, PRs #714/#715):** every step here pipes into `tee`, and a pipeline's exit status is its *last* command's — `tee` always succeeds, so `steps.<id>.outcome` was `'success'` regardless of the validator's own exit code until `defaults.run.shell: bash` (which enables `pipefail`) was added at the job level. Every gate listed above was **silently non-blocking from 2026-07-22 (when this workflow was written) until 2026-08-06** — **a green "Validate Site" check on any PR merged before that date carries no information; do not cite one as evidence a page passed anything.** Full writeup in the workflow file's own header comment and in `CLAUDE.md`. This row itself has now gone stale and been hand-corrected on **seven** consecutive review cycles (2026-07-31, 2026-08-01, 2026-08-08, 2026-08-15, 2026-08-22, 2026-08-29, and this one — eleven more gates found missing this time, all landed 2026-09-01/03 via PR #822 [`check-locale-collection-parity.py`], #824 [`build-accent-notice.js`], #839/#846 [`check-updates-verification.js`], #841/#857 [`check-efr.js`, `test:efr`], #844 [`check-numeric-parity.js`], #849 [`test:cta-tracking`, `test:cta-routing`, and the rename of `test:printables-parity` → `test:generator-parity` — same script, `scripts/lib/generator_parity.py`, now guarding a fifth caller, `generate_library_page_from_spec.py`, not just the four printables generators; see Known gaps #8], the pre-existing but previously unlisted `test:content-significance` (script shipped 2026-08-18, CI step added 2026-09-02 alongside the `test:efr` PR), and #861 [`check-source-attribution.js`]) as gates were added without a matching edit here — see Known gaps #16, whose own text already said the *next* recurrence should be a generator, not another hand-edit; still hand-edited here because this review's mandate is a small, additive diff to this file only; flagging the escalation, now a seventh consecutive time, rather than unilaterally taking on a new tooling build. |

### Scheduled routines (Claude Code on the web)

Not GitHub Actions — these are [routines](https://code.claude.com/docs/en/routines)
configured in the web UI ([claude.ai/code/routines](https://claude.ai/code/routines)),
not files in this repo. They run as full Claude sessions and open PRs for review.

| Routine | Trigger | Action |
|---|---|---|
| Weekly infrastructure review | weekly schedule | run the [Weekly infrastructure review](#weekly-infrastructure-review); open a PR updating this map (no auto-merge) |

---

## Known gaps

The structure is emergent; these are the open infrastructure debts, tracked
here so they aren't lost. Update as they're closed or new ones appear.

1. ~~**Demand backlog is library-only.**~~ **Closed** — the opportunity CSV now
   carries a `page_type` column (default `library`) and the auditor dedupes
   per-lane, so scouting, the `stage` lifecycle, and the demand gate reach
   `/category/` and `/answers/`. (Still no generator for those lanes — see #2.)
2. **No production pipeline for category/answers.** Build specs are agreed
   ad hoc, not published in this repo; there is no generator/validator
   equivalent of the library lane. These pages are hand-built.
3. **Usecase and guide lanes are undocumented** — no workflow, no backlog.
   **Newly active (2026-06-27):** PR #312 added 4 new usecase pages hand-built
   across two namespaces: `/usecase/nickname-generator/` (EN) and
   `/id/usecase/nama-ff-keren/`, `/id/usecase/nama-guild-ff-keren/`,
   `/id/usecase/nama-ml-keren/` (localized). The `/id/usecase/` sub-namespace
   is new — a localized usecase path not currently reflected in the page-type
   table. Documenting this lane (and the localized variant) is now urgent.
4. **Operational tracks without docs:** schema/alternateName SEO, i18n, CSS/GTM
   CI checks. Scripts exist; the process is tribal knowledge. The
   alternateName SEO track is now **actively in use** — PR #277 added
   `alternateName` to 30+ category/library/platform pages and PR #291 updated
   `validate-alternatenames.py` — making the missing governing doc the most
   pressing gap here. The **i18n track** is also multi-week active: `/id/`
   received content expansions in PRs #302, #310, and #312, and PR #312
   introduced a localized usecase sub-namespace (`/id/usecase/`) with no
   governing workflow — the i18n governing doc and namespace definition are
   overdue. **Update (2026-07-10):** two more locales shipped this week —
   Swedish `/sv/` (PR #396) and Norwegian `/no/` (PR #397) — and neither
   prefix was in `LANE_RULES`, so both PRs surfaced as unclassified; both
   prefixes are now added. The locale count (12+ and growing weekly) makes
   the missing i18n governing doc the most pressing item in this gap.
   **Update (2026-07-11):** the pace accelerated sharply — twelve more locales
   landed in a single week (Arabic `/ar/`, Bosnian `/bs/`, Czech `/cs/`, Hindi
   `/hi/`, Croatian `/hr/`, Japanese `/ja/`, Korean `/ko/`, Romanian `/ro/`,
   Russian `/ru/`, Slovak `/sk/`, Serbian `/sr/`, Thai `/th/` — PRs #414, #415,
   #422, #431, #432, #435, #436, #448, #450, #451, #454, #466, #467), none of
   which were in `LANE_RULES`, so every file under them surfaced as
   "Unclassified." All twelve are now added. With ~26 locale prefixes now
   hardcoded one-by-one in `LANE_RULES`, the classifier itself is becoming the
   symptom: a governing i18n doc that defines the locale-directory convention
   (so the classifier can match a pattern instead of an enumerated list) is
   now the single most pressing gap in this file. **Update (2026-07-18):**
   three more locales landed this week — Danish `/da/` (PR #559), Traditional
   Chinese `/zh-tw/` (PR #497), and Hungarian `/hu/` (PR #588) — none in
   `LANE_RULES`, all now added, bringing the hardcoded list to ~29 prefixes.
   This is the fourth consecutive review with the same finding (2026-07-10,
   -11, -18); the enumerated-list classifier is the recurring 3+ week manual
   fix this doc's own review checklist (§4) says to systematize — a pattern
   rule (any two-letter, or `zh-xx`-shaped, top-level directory → i18n) would
   close this permanently instead of one PR-by-PR patch per new locale.
   Separately, `scripts/audit-hreflang.js` (wired to `npm run check:hreflang`)
   is real hreflang-mesh tooling with nowhere to be documented until the i18n
   governing doc exists. **Update (2026-07-22):** the "no CI workflow yet"
   half of this is now closed — `.github/workflows/validate.yml` runs
   `audit-hreflang.js` (plus `validate_library_pages.py` and
   `check-image-assets.py`) as a required, blocking check on every PR, and
   the old path-filtered `image-assets-check.yml` was retired in favor of it.
   The documentation-home half (an i18n governing doc to hang this on) is
   still open. **Update (2026-07-25):** a new locale launched again this
   week — Malay `/ms/` (PR #635, commit message: "launch ms/ locale") —
   again absent from `LANE_RULES`, again patched one-by-one (now ~30
   prefixes). This is the **fifth** consecutive review flagging the exact
   same recurring cost; the pattern-rule fix this entry has recommended
   since 2026-07-11 still hasn't been picked up. Flagging again rather than
   unilaterally implementing it here — the classifier logic is out of scope
   for this review's additive-map-update mandate — but the fix itself
   (`^[a-z]{2}(-[a-z]{2})?/` → i18n, checked before the more specific rules)
   is small and has been fully specified for three weeks running.
   **Update (2026-08-01):** another new locale launched this week — Finnish
   `/fi/` (PR #669, "feat(fi): complete Finnish locale launch", 11 pages) —
   again absent from `LANE_RULES`, again surfacing as Unclassified signal
   (PRs #669, #672, #680). This is the **sixth** consecutive review flagging
   the identical recurring cost (2026-07-10, -11, -18, -22, -25, -08-01), so
   this review finally implements the pattern-rule fix that's been specified
   since 2026-07-11: `scripts/weekly_pr_digest.py` now falls back to
   `^[a-z]{2}(-[a-z]{2})?/` → i18n whenever no more-specific rule matches,
   replacing the ~30 hand-enumerated locale prefixes. Verified safe against
   the one non-locale two-letter top-level directory in the repo (`js/`,
   already claimed by an earlier, more specific "Core JS" rule, so the
   fallback never reaches it) and re-run against this week's 34 PRs, which
   now classify with **zero** Unclassified signal. This closes the
   classifier half of this gap permanently — a future locale launch needs no
   `LANE_RULES` patch at all. The documentation-home half (a dedicated i18n
   governing doc) is still open, and is now the only thing left in this gap.
5. **Platform pages lane is undocumented** — the twelve social-network generator
   pages (`/discord/`, `/instagram/`, `/x/`, `/threads/`, …) receive active SEO
   updates (`alternateName`: PR #277; FAQ structured data: PR #290) but have no
   governing workflow, backlog, or generator. **Update (2026-07-25):** Threads
   joined the lane this week (PR #622, `threads/index.html`) but `threads/`
   was missing from `LANE_RULES`'s explicit platform-directory list, so the
   PR surfaced as partially Unclassified — added now. The classifier
   otherwise correctly routes established platform directories to "Platform
   pages" via path rules in `LANE_RULES`.
6. ~~**Pinterest off-system patterns (two).**~~ **Closed (2026-08-22)** — both
   halves are superseded, not migrated in place: PR #648 ("generate 12,429
   opportunity-weighted Pinterest pin variants," merged 2026-08-18 after
   sitting since before the R2 migration) landed carrying the
   Cloudflare R2 migration itself in the same branch. Resolving that
   branch's conflicts against `main` **deleted** the 2,942 committed PNGs
   the old branch had staged, rather than reintroducing them — confirmed via
   `git diff-tree --diff-filter=D` on the merge commit. `assets/pinterest/`
   and `assets/collection-pins/` are both empty and gitignored on `main` now
   (0 tracked files under either, verified via `git ls-tree`), and the
   migration's own validation report
   (`docs/pinterest-r2-migration-validation.md`) confirms all 15,376
   pre-existing images (base/variants/boards/collection) landed byte-identical
   on R2. (b)'s "~334 flat root pins" were the `base` category (2,411 files,
   `scripts/generate-pinterest.py`) and now live at `pinterest/base/<slug>.png`
   object keys instead of a bare `assets/pinterest/` root. (a)'s `pinterest-kit/`
   directory does not exist anywhere in the current tree, and the Spanish
   board already runs through the standard per-board generator pattern
   (`scripts/generate-es-pins.py`, one of the ~15 dedicated board generators
   PR #648 updated to the R2 client) — no evidence a bespoke off-pipeline
   Spanish generator survived to be migrated; if one existed it was already
   gone before this window. See `docs/pinterest-r2-migration.md`.
7. ~~**Homepage (`index.html`, `_root.html`) has no lane or owner.**~~ **Closed
   (2026-07-10)** — given its own row in the page-type table ("Root pages":
   `index.html`, `_root.html`, `404.html`, `about/`, `contact/`, `privacy/`,
   `terms/`, site icons) and matching `LANE_RULES` entries, resolving repeated
   unclassified signal across PRs #365, #367, #369, #372, #384, #389, #396,
   #397. It's still hand-built with no generator or governing doc — that
   remains open, tracked the same as the other undocumented lanes above.
8. **Visual/printable output mode has principles but no pipeline.** The second
   output mode ([`jtbd-principles.md`](./jtbd-principles.md) §10) is live across
   three surfaces — the curved/arc tool (`/curved-text/`), printable bubble
   letters (`/category/bubble-fonts/`), and cursive practice sheets
   (`/category/cursive-fonts/`) — but each was hand-built with its own module.
   There is **no shared SVG/PNG export helper, no generator/validator, and no
   dedicated governing doc** (it's governed only by §10 + the `CLAUDE.md` scope
   note). PRs touching it now classify — `scripts/weekly_pr_digest.py` has
   `LANE_RULES` entries for `curved-text/` and `js/curved|bubble|cursive/` → the
   "Visual & printable assets" lane — but the `/curved-text/` top-level namespace
   is still absent from the page-type table. Decide: promote to a full lane
   (shared export util + a governing doc) or keep it a principle-governed
   cross-cutting track. **Update (2026-07-11):** the *other* half of this gap
   just surfaced hard — the `/printables/` page-type namespace (already a row
   in the table above) had **no** `LANE_RULES` entry at all, so every
   printables PR this week classified as "Unclassified" (15 of ~73 merged
   PRs: #420, #423–#426, #428, #429, #440–#445, #447, #468 — coloring pages,
   dot-to-dot, tracing, banner/name-puzzle makers, bubble letters, all A–Z
   variants). Added `("printables/", "Printables")` to `LANE_RULES` to close
   the classifier gap; the underlying gap (no shared export helper, no
   generator/validator, no governing doc, still fully hand-built) remains
   open and is now the highest-volume hand-built lane in the repo.
   **Update (2026-08-29):** the "no generator/validator" half has real
   first movement — PR #811 de-templated four of the printables generators
   (alphabet coloring, bubble letters, bubble numbers, dot-to-dot — labeled
   "Batch A," implying more to come) onto a shared template and added
   `scripts/lib/printables_parity.py` + a gating parity test
   (`test:printables-parity`) so re-running a generator can no longer
   silently delete a page's own hand-shipped repair. This is scoped to
   four of the printables page types, not the whole lane — there's still
   no shared SVG/PNG *export* helper, and no governing doc or backlog
   integration. Worth tracking future batches here as they land.
   **Update (2026-09-05):** PR #849 renamed the guard to
   `scripts/lib/generator_parity.py`/`generator_parity.test.py`
   (`npm run test:generator-parity`, replacing `test:printables-parity`
   everywhere including `validate.yml`'s step id) because, per the file's
   own header, "nothing in it was ever printables-specific; the name was" —
   it picked up a fifth caller, `generate_library_page_from_spec.py`, so the
   guard now also protects the site's highest-volume generator, not just the
   four printables ones. Still scoped to refuse-to-overwrite regression
   checks, not a shared export helper — that half of this gap is unchanged
   and still open.
9. **Ads / monetization track has no governing doc — and has now fully
   reversed once.** PRs #366–#368 stood up Journey ads (replacing AdSense);
   PR #508 (2026-07-12) switched back to Google AdSense; PR #544
   (2026-07-13) found the leftover daily `update-ads-txt.yml` cron was still
   pulling Journey's `ads.txt` and force-committing it over the AdSense
   version every night, undoing the migration silently (`ads.txt` sat
   Unauthorized). That PR removed the dead Journey cron/script and taught
   `check-ads.js` to guard `ads.txt` itself against Journey lines
   reappearing. Two full monetization-provider switches inside two weeks,
   one of which shipped a live silent-regression bug, is exactly the kind of
   churn a decision doc (why AdSense over Journey, revenue-share terms, page
   exclusions) would have made safer to reason about — still doesn't exist.
   The operational-tracks table row above reflects the current AdSense state.
   **Update (2026-08-01):** a related but distinct gap appeared this week —
   PR #660 deployed a Google Funding Choices consent/ad-blocking-recovery
   tag site-wide (every HTML page), with a checker script
   (`check-funding-choices.js`) committed alongside it, but unlike
   `check-gtm.js` that checker was never wired into a CI workflow — nothing
   currently stops a new page from shipping without the tag. Added its own
   Operational tracks row above rather than folding it into this gap (it's a
   site-wide script deployment, not a revenue/provider decision), but the
   still-missing governing doc and the missing CI wiring are both open.
   **Update (2026-08-08):** the missing-CI-wiring half is now closed —
   `check-funding-choices.js` became a gating step in `validate.yml`
   2026-08-06, in the same pass that fixed the pipefail bug in Known gaps
   #16. The delay had a real cost: 37 pages across three unrelated PRs
   shipped without the tag before the gap was noticed, because nothing
   enforced it in the meantime. The governing-doc half (why AdSense over
   Journey, revenue-share terms, page exclusions) is still open.
10. **New this week: Events (seasonal/holiday pages) is a genuinely new lane,
    not just an unclassified PR.** PR #457 added ten English `/events/<slug>/`
    pages (Christmas, Halloween, Diwali, Eid Mubarak, Lunar New Year, etc.)
    plus a hub, and companion Spanish pages already exist at `/es/events/`
    with three matching `/es/answers/` spokes. It runs on real infrastructure
    — `scripts/generate_event_page_from_spec.py` (mirrors the library
    generator, validation built in) reading `data/event_page_specs/*.json`,
    and a dedicated `js/events/eventPageController.js` — but has no page-type
    row, no governing doc, and no demand-backlog entry (no `page_type=events`
    rows exist in the internal opportunity backlog). Added a row to the page-type
    table above and a `LANE_RULES` entry (`events/` → "Events"); the
    governing doc and backlog integration are still open.
11. **Root-level standalone tool pages, no naming convention — still
    appearing.** `/ascii-art-generator/`, `/ascii-converter/` (PRs #453,
    #455) and `/kaomoji-dictionary/`, `/kaomoji-generator/` (PR #438) were
    four `WebApplication` tool pages hand-built at the repo root instead of
    under `/category/` — the same JTBD as a Category page, different URL
    shape. **Update (2026-07-18):** three more landed this week —
    `/character-counter/` (PR #479, later extended to 26 platforms in #541),
    `/hiragana-chart/` and `/katakana-chart/` (both touched in PR #483; the
    charts page itself first shipped as PR #434 the *prior* week, already
    flagged unclassified then too — this is its second consecutive
    appearance). Added all three directory names to `LANE_RULES` as "Category
    pages" (same case-by-case pattern used for `roblox/` under Platform
    pages), bringing the total to seven root-level tool pages. The classifier
    gap is patched each time; the actual question — fold these under
    `/category/`, or treat "shorter root slug" as an intentional, now
    seven-times-repeated pattern that deserves its own naming rule — is still
    undecided and now the more pressing half of this gap. **Update
    (2026-08-15):** two more landed this week — `/calligraphy/` and
    `/fancy-letters/` (both `WebApplication` schema, both PR #739, "Add
    Calligraphy Font Generator & Fancy Letters pages"), both surfacing as
    Unclassified in this week's digest. Added both directory names to
    `LANE_RULES` as "Category pages," bringing the total to **nine**
    root-level tool pages across five weekly reviews now (2026-07-18 and
    2026-08-15 both added new ones). The naming-convention question this gap
    has flagged since 2026-07-18 is unchanged and, at nine unplanned
    instances, is now itself the recurring-3+-weeks candidate the review's
    own step 4 says to systematize.
12. ~~**`/symbol/` lane missing from the map and the classifier.**~~ **Closed
    (2026-07-18)** — `/symbol/` has been documented at length in `CLAUDE.md`
    (its own "Library vs Symbol" section, own generator routing via
    `page_type: "symbol"`, own `sync_symbol_spoke_links.py`, own validator
    coverage) since before this review's window, but never got a page-type
    table row here, nor a `LANE_RULES` entry in `scripts/weekly_pr_digest.py`.
    It was the single largest source of this week's classifier noise: 542
    file touches across 31 of the week's 42 unclassified PRs (symbol pages
    now exist for 79 English slugs, with heavy localization traffic this
    week — e.g. PR #582 "close IT and PT /symbol/ pillar gaps to 77/77",
    PR #576 "Add 60+ German symbol pages", PR #562 "Fix remaining
    library/symbol lane mismatches"). Added a **Symbol** row to the
    page-type table above and
    `("symbol/", "Symbol pages")` to `LANE_RULES`.
13. ~~**`/updates/` lane missing from the map and the classifier.**~~ **Closed
    (2026-07-25)** — same shape of gap as #12: `updates/` (the dated
    Unicode/platform/game rule-change log) is already documented at length
    in `CLAUDE.md`'s "Content Type: Updates" section — including a same-day
    schema revision (`Article` → `NewsArticle`) — but never got a page-type
    table row here, nor a `LANE_RULES` entry. It was this week's single
    largest source of classifier noise: 10 of the week's 59 merged PRs
    (#607, #608, #610, #615, #616, #619, #620, #628, #634, #646) touch
    `updates/`. Added an **Updates** row to the page-type table above and
    `("updates/", "Updates")` to `LANE_RULES`. The governing-doc gap is only
    half-closed — the content-type rules live in `CLAUDE.md`, not in a
    `docs/` file this map can link to; consider porting/cross-linking it.
14. **New this week: `/learn/` is a genuinely new, wholly undocumented
    lane.** PRs #625 and #650 shipped a "Learn" education pillar —
    `learn/index.html` hub, `learn/handwriting/` sub-hub + 9 articles,
    `learn/dot-to-dots/`, `learn/coloring-and-fine-motor/` — on `Article` +
    `BreadcrumbList` + `FAQPage` schema, hand-built with its own hero/OG
    assets but no generator, no backlog row, and no mention anywhere in
    `CLAUDE.md` or this map. Added a **Learn** row to the page-type table
    above and `("learn/", "Learn")` to `LANE_RULES` to close the classifier
    gap; the governing-doc and backlog-integration halves are still open,
    same as the `Events` gap was the week it launched. Also worth an
    explicit look (not resolved here): the content is *about*
    handwriting/tracing/pre-writing/coloring rather than a printable
    itself, which sits close to — arguably on the wrong side of — the
    "Printables scope boundary" in `CLAUDE.md` (shape-only tracing,
    pre-writing motor-skill strokes, and coloring pages with no letterform
    are explicitly called out there as out of scope for this repo). Whether
    `/learn/` content stays within the typography-native line the
    boundary draws is an editorial call for a human, not something this
    review resolves.
15. **This map had drifted from the CI it's supposed to describe.** Five
    operational tracks were fully built, fully documented in `CLAUDE.md`,
    and (in four of five cases) already wired into `validate.yml` as
    required gates — **Translation Parity** (2026-07-23), **Locale mesh**
    and **Locale Parent Governance** (2026-07-24), **FAQ schema visibility**
    (2026-07-26), and **Local Language Intelligence** (2026-07-25, data-only,
    no CI gate) — with zero footprint in this file until now. None of this
    was "new this week" in the usual sense (three of the five predate this
    review's 7-day window); it went unnoticed because past reviews checked
    PR file paths against `LANE_RULES`, which correctly classified all of
    it as `Scripts / tooling` / `Data / backlog` / `Docs` and surfaced no
    Unclassified signal — a page-type/lane classifier has no way to notice
    that a *cross-cutting* track is missing a map row. Added all five to the
    Operational tracks table above, and corrected the `validate.yml` row in
    Automated workflows (below) to list its actual current gate set instead
    of the three it shipped with. No systematic fix for the underlying blind
    spot (classifier-driven review can't catch operational-track drift) is
    proposed here — noting it so a future review doesn't have to rediscover
    it from scratch.
16. **Two silent-guard blind spots this week, one shared shape: a check
    that looks like it covers a case has a hole, and nothing detects the
    hole itself.**
    - **`validate.yml`'s gating never actually gated.** Every validator
      step is `<validator> | tee <name>.log`; a pipeline's exit status is
      its *last* command's, and `tee` always succeeds, so
      `steps.<id>.outcome` was `'success'` regardless of what the
      validator itself exited with. GitHub's default `run:` shell
      (`bash -e {0}`) has no `pipefail`; naming the shell explicitly
      (`defaults.run.shell: bash`) does. That means every "required,
      blocking gate" this map has ever described — hreflang, translation
      parity, locale mesh, FAQ schema, new-page images, locale-parent-gap,
      and everything added since — was silently non-blocking from
      2026-07-22 (when the workflow was written) until PRs #714/#715
      (2026-08-05/06) found and fixed it. **A green "Validate Site" check
      on any PR merged before 2026-08-06 carries no information** — do not
      cite one as evidence a page passed anything. (This same warning now
      also lives in `CLAUDE.md` and in the workflow file's own header —
      recorded here too so this map doesn't contradict them.)
    - **`wire-site-art.py`'s hero-figure guard had a matching hole.** It
      only treated a page as a wiring candidate if it still referenced the
      generic `/logo.png` placeholder or already carried a `data-uthero`
      figure — true when the only way to lack a figure was to still be on
      the generic card, false the moment a page got its OG art some other
      way (a spec generator, a hand fix) without a figure ever being
      inserted. A page in that state matched neither arm, so re-running the
      script could never surface it: 37 cs/hr/pt/ro pages accumulated
      silently before PR #713 (2026-08-06) found and wired them, and added
      an explicit `--files` opt-out so naming a page is itself the decision
      that it needs wiring.
    - **The recurring cost worth systematizing (review step 4):** this
      map's own `validate.yml` row (Automated workflows, above) has now
      gone stale and been hand-corrected on **four** separate review cycles —
      2026-07-31 (row didn't exist yet for 5 shipped gates), 2026-08-01
      (gap #15, row rebuilt), 2026-08-08 (`audit-hreflang-completeness.js`,
      `check-funding-choices.js`, `check-counter-claims.js`, and
      `check-external-refs.js` had all shipped as live gates with zero
      footprint here), and this review (2026-08-15: three more —
      `check-document-head.py`, `check-tile-codepoints.py`,
      `check_locale_spec.py` — plus the entire `workflow-lint.yml` workflow
      discovered with **no row at all**, not just a stale one, the same
      blind spot one level up). Each fix so far has been a manual read of
      the workflow files. A script that diffs each workflow's own step
      `id`s (and the set of workflow files itself) against this table — or
      generates the rows directly — would close this permanently instead of
      relying on a reviewer to notice drift again next month. Four
      consecutive weekly recurrences is well past this review's own "3+
      weeks" threshold for flagging systematization; repeating the
      recommendation a fifth time without escalating it is no longer
      pulling its weight — the next review that finds this row stale again
      should treat building the generator as the fix, not another hand-edit.
    - **The digest-staleness gap this review flagged last week recurred,
      unchanged, exactly as predicted.** `infra-review/latest.md` covered
      2026-08-03 → 2026-08-10 (the last automated Monday run) when this
      review fired 2026-08-15, five days later — the identical five-day gap
      the 2026-08-08 review found and warned would recur if the routine's
      cadence wasn't checked against `weekly-pr-digest.yml`'s Monday 06:00
      UTC run. It wasn't checked: this review's own trigger date (2026-08-08)
      and this one (2026-08-15) are both **Saturdays**, five full days after
      each Monday digest, so every future firing on this cadence will open
      the exact same gap. Rather than review a stale window, this pass again
      reconstructed the actual last-7-days PR set (2026-08-08 → 2026-08-15,
      32 PRs) directly from `git` and regenerated `infra-review/2026-08-15.md`
      + `latest.md` from it. This is now confirmed as recurring, not
      hypothetical — moving the routine's weekly trigger to Monday
      (shortly after 06:00 UTC, matching `weekly-review-prompt.md`'s own
      stated intent) at `claude.ai/code/routines` would close it; that
      change lives outside this repo, so it isn't made here, but it no
      longer needs "checking" — it needs doing.
    - **Both blind spots recurred again this review (2026-08-22), a fifth
      and third consecutive occurrence respectively.** The `validate.yml`
      row was found stale again — three gates short this time
      (`check-locale-translation.js`, `build-static-footer.js`,
      `build-library-directory.js`) — and hand-corrected again in the
      Automated workflows table above, even though this entry already said
      the next occurrence should be a generator instead: this review's own
      mandate was scoped to a small, additive diff to this file, so the
      generator wasn't built here, but the recommendation is now
      unambiguously overdue rather than newly discovered. Separately,
      `infra-review/latest.md` was still 2026-08-10 → 2026-08-17 (the last
      Monday digest) when this review fired 2026-08-22, five days stale —
      the identical gap flagged 2026-08-08 and confirmed recurring
      2026-08-15. This review again reconstructed the true last-7-days PR
      set directly from `git` rather than reviewing a stale window (see the
      commit message for the reconstruction method: `git log --first-parent
      --merges` since the prior review's merge commit, cross-checked against
      `git diff-tree` file lists and `weekly_pr_digest.py`'s own classifier).
      The fix (move the routine's trigger to Monday, after the digest's
      06:00 UTC run) lives outside this repo and still hasn't been made,
      three occurrences in.
    - **Both patterns recurred a fourth time this review (2026-08-29).** The
      `validate.yml` row was found stale again — eight gates short this
      time (see the Automated workflows row above for the full list);
      seven of the eight landed this week (2026-08-26/27); the eighth,
      `check-zalgo-decodes.js`, shipped 2026-08-22 — the same day as the
      *previous* review — and was missed by it. Separately,
      `infra-review/latest.md` was still 2026-08-17 → 2026-08-24 (the last
      Monday digest) when this review fired 2026-08-29 — five days stale
      yet again, the same gap flagged 2026-08-08, -15, and -22. This review
      again reconstructed the true last-7-days PR set directly from `git`
      (`git log --merges --grep` per PR number, file lists via
      `git diff --name-only <merge>^1...<merge>^2` — the triple-dot,
      merge-base form; a first pass using the two-dot direct-parents form
      produced a false `.tweet-queue-state.json` "Unclassified" signal on
      four PRs, an artifact of this repo's frequent "merge origin/main into
      branch" reconciliation commits, not a real classifier gap — worth
      remembering the next time this reconstruction is done by hand) rather
      than reviewing the stale window; it classified cleanly with zero
      Unclassified PRs. The routine-cadence fix (move the trigger to
      Monday, after the digest's 06:00 UTC run) still lives outside this
      repo and still hasn't been made, four occurrences in — at this point
      it is the single most-repeated unresolved recommendation in this
      entire file and warrants doing rather than flagging a fifth time.
    - **Both patterns recurred a fifth time this review (2026-09-05).** The
      `validate.yml` row was found stale again — eleven gates short this
      time, all landed 2026-09-01 through 2026-09-03 (see the Automated
      workflows row above for the corrected list and per-gate PR
      attribution) — so the entire gap accumulated inside one review
      window rather than being missed across several. Separately,
      `infra-review/latest.md` was still 2026-08-24 → 2026-08-31 (the last
      Monday digest) when this review fired 2026-09-05 — five days stale
      yet again, the same gap flagged on every review since 2026-08-08.
      This review again reconstructed the true last-7-days PR set directly
      from `git` (`git log --first-parent --merges` since the prior
      review's merge commits, #816/#817; file lists per PR via
      `git diff --name-only <parent1>...<parent2>` on each merge commit —
      the triple-dot, merge-base form the fourth occurrence's note above
      says to use) rather than reviewing the stale window: 44 merges
      (#818–#862, plus two older branches merged out of order, #775 and
      #819), 6 of them carrying a genuine Unclassified signal — a sharper
      jump than the zero the fourth occurrence found, see Known gaps #17
      and #18 below. The routine-cadence fix still lives outside this repo
      and still hasn't been made — five occurrences in, and the prior
      review already judged a sixth flagging not worth its weight, so this
      one stays terse rather than repeating the case again.
17. **New this week: `.claude/skills/` is a genuinely new, wholly undocumented
    lane — and it's process infrastructure, not a page type.** PR #834 (two
    commits: `feat: add a repo-level steward skill encoding the repository's
    own operating rules`, then `feat: add locale-batch and ship-page workflow
    skills alongside steward`) added `.claude/skills/steward/SKILL.md`,
    `.claude/skills/locale-batch/SKILL.md`, and
    `.claude/skills/ship-page/SKILL.md` — repo-scoped Claude Code skills
    that encode this repo's own operating rules (steward) and two of its
    recurring workflows (locale-batch, ship-page) directly into files a
    Claude session loads before acting, rather than relying on a session
    having read `CLAUDE.md` in full. This is exactly the kind of thing this
    map exists to place: it surfaced as **Unclassified** on PR #834 (all 3
    files), because `scripts/weekly_pr_digest.py`'s `LANE_RULES` has no rule
    for `.claude/` at all. Not added to `LANE_RULES` in this pass — this
    review's mandate is a small, additive diff to this file only — but the
    fix is a one-line addition, `(".claude/skills/", "Repo-scoped Claude
    skills")`, ordered before the `docs/` catch-all has any chance to
    matter (it wouldn't match anyway, `.claude/` and `docs/` don't
    overlap). Open question for a human: does this deserve its own
    Operational tracks row (governing doc: the skill files themselves,
    cross-referenced from CLAUDE.md's GitHub-integration section, which
    already tells a PR-babysitting session to read `steward/SKILL.md` and
    `babysit/SKILL.md` if either exists) — this map doesn't decide that
    unilaterally, only places the signal.
18. **New this week: two root-level test files unclassified — the counter
    test convention extending beyond `js/`, and the classifier not learning
    it.** PR #824 added `accent-notice.test.html` (repo root, alongside
    `accent-notice.js`) and PR #849 added `header.test.js` (repo root,
    alongside `header.js`) — both following the exact zero-dependency
    `.test.js`/`.test.html` convention the Testing section already
    documents for `js/counter/` and `js/vertical/`, just for two Core JS
    modules that live at the repo root rather than under `js/`. Both
    surfaced as **Unclassified** because `LANE_RULES` matches `accent-
    notice.js` and `header.js` by prefix, and neither `accent-
    notice.test.html` nor `header.test.js` starts with those strings.
    Not fixed here for the same reason as #17 above (two explicit entries,
    `("accent-notice.test.html", "Core JS")` and `("header.test.js", "Core
    JS")`, would close it) — but worth naming the general shape rather than
    only the two instances: this is the same "classifier hasn't learned a
    path convention yet" gap `LOCALE_DIR_RE` was built to close for locale
    directories (Known gaps #4) and `ROOT_VERIFICATION_RE` was built to
    close for search-engine verification stubs — a pattern rule (any
    `<name>.test.js`/`<name>.test.html` at the repo root inherits `<name>.js`'s
    own lane, checked after the exact-match rules) would close this
    permanently instead of one entry per new root-level test file. Not
    urgent at two instances; worth it if a third shows up.
19. **Self-corrected this week, worth a line so it isn't rediscovered from
    scratch: a `node_modules` symlink was briefly committed to `main`, and
    two parallel sessions fixed it independently.** PR #849's branch tip
    (commit `8380aa483`) committed `node_modules` as a symlink pointing at a
    sandbox container path (`/home/user/ultratextgen/node_modules`) —
    almost certainly an `npm install` artifact swept up by a broad
    `git add`. On any other checkout that path is self-referencing, so
    `require(...)` fails with `MODULE_NOT_FOUND` for every npm-based CI gate
    until `npm install` overwrites the tracked link. Caught and fixed the
    same day (2026-09-02), by two different branches that had each pulled
    the bad commit in independently: PR #856 landed the real fix (`994b8d693`
    untracks the symlink, `495ede641` hardens `.gitignore` with a bare
    `node_modules` line, since a symlink of that name isn't matched by the
    conventional `node_modules/`-with-slash pattern, which only matches a
    directory) and PR #857 landed a second, redundant untrack of the same
    file (`5c7b7ee35`) — a no-op by the time it merged, but the same shape
    as "Parallel sessions build the same thing under different names"
    (`CLAUDE.md`), just for a one-line repo-hygiene fix instead of a page.
    Confirmed not tracked on `main` as of this review. The only remaining
    artifact is cosmetic: a few other PRs merged in the same window (#848,
    #856, #857) show a spurious create/delete of `node_modules` in their own
    `git diff <parent1>...<parent2>` file lists — the same "merge
    origin/main into branch" reconciliation-commit artifact the fourth
    occurrence's note under #16 already warns about, not a real regression.
    No action needed; recorded for the next person who sees `node_modules`
    in a diff and wonders if it shipped again.

---

## Weekly infrastructure review

The routine that keeps this map honest and lets structure emerge from real work
instead of up-front design. It runs in **two parts** ("digest feeds AI"), wired
up under [`infra-review/`](./infra-review/):

- **Digest (automated).** The
  [`weekly-pr-digest.yml`](../.github/workflows/weekly-pr-digest.yml) Action
  runs every Monday, classifies the past 7 days of merged PRs by lane (via
  [`scripts/weekly_pr_digest.py`](../scripts/weekly_pr_digest.py)), and writes
  `infra-review/<date>.md` + `infra-review/latest.md`. PRs that don't match a
  known lane are flagged as a **signal**.
- **Review (judgment).** A scheduled Claude session consumes `latest.md` via
  [`infra-review/weekly-review-prompt.md`](./infra-review/weekly-review-prompt.md),
  updates this map, and opens a PR.

**Cadence:** weekly.

**Input:** `infra-review/latest.md` — all PRs merged to `main` in the last 7
days, pre-classified by lane.

**Steps (the review session):**

1. Read the digest's lane classification of the week's merged PRs.
2. For any PR flagged **Unclassified**, that's a **signal**: either a new lane is
   emerging (add a row to the tables above) or the classifier should learn the
   path (add a rule to `LANE_RULES` in `scripts/weekly_pr_digest.py`).
3. If a PR closed a gap, tick it off / update the maturity column.
4. Note recurring manual work — anything done by hand 3+ weeks running is a
   candidate to systematize (script, backlog column, or doc).
6. Open a PR with the updated map on a `claude/infra-review-<date>` branch — a
   small, additive diff. **Do not merge** (golden rule: a human reviews and
   merges). If the past 7 days produced no changes worth recording, say so and
   open nothing.

**Output:** a PR updating this map + a current [Known gaps](#known-gaps) list,
or an explicit "no changes" note. The goal is not to design the whole system
now — it's to make sure every new piece of work is *placed*, so the structure
reveals itself over time.

### Running it as a scheduled routine

This review runs as a **[routine](https://code.claude.com/docs/en/routines)**
(weekly schedule trigger), not a GitHub Action — creating/editing it lives in
the Claude Code web UI at [claude.ai/code/routines](https://claude.ai/code/routines),
not in this repo. The routine's prompt is intentionally thin and points back
here so the *process* stays version-controlled in this file. Paste this as the
routine prompt:

> Run the UltraTextGen **Weekly infrastructure review** exactly as documented in
> `docs/README.md` (the "Weekly infrastructure review" section). Input: all PRs
> merged to `main` in the last 7 days. Follow steps 1–6 there. Open a PR on a
> `claude/infra-review-<date>` branch with a small, additive diff to
> `docs/README.md`; **do not merge** — a human reviews it. If nothing this week
> warrants a map change, open no PR and end with a one-line "no changes" summary.
