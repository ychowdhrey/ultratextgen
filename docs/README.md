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
| Distribution loops (share/embed/OG, viral & SEO loops) | `script.js` (share/`?q=`/copy), `tweet_queue.py`, `generate-*-pins.py`, embed widgets | ❌ none | per batch + quarterly |
| Retention & engagement (saved styles, prefs, return triggers) | `script.js` (`utg_saved_styles`/`save_style`/`?q=`), `header.js` (dark-mode pref) | ❌ none | per batch + monthly metric |
| Image SEO (hero art, OG cards) | `make-hero-decorative.py`, `add-og-dimensions.py`, `build-image-seo-status.py` | [`image-seo-fixes.md`](./image-seo-fixes.md) | per batch |
| Pinterest pins (+ new boards) | `generate-pinterest.py`, `generate-id-pins.py`, `generate-vertical-text-pins.py` (skin: `generate-site-art.py`); CSV: `pinterest_csv.py` + `build_pinterest_upload.py` | [`pinterest-pin-generation.md`](./pinterest-pin-generation.md) (board conventions) + [`pinterest-csv-format.md`](./pinterest-csv-format.md) | per batch |
| Schema / alternateName SEO | `validate-alternatenames.py`, `inject-faq-jsonld.js`, `alternatename-seo-report.md` | ⚠️ none | per batch |
| Image backlinks (embeddable images / widgets) | `/embed/` widget pages (no generator yet) | ❌ none | ad hoc |
| **Visual & printable assets** (in-browser SVG/PNG output mode) | `js/curved/curvedText.js` + `curvedTextController.js` (curved/arc tool → `/curved-text/`); `js/bubble/bubbleExplorer.js` (printable bubble letters, per-letter + A–Z); `js/cursive/cursivePageController.js` + `cursiveData.js` (cursive practice sheets) | [`jtbd-principles.md`](./jtbd-principles.md) §10 (output modes) + `CLAUDE.md` scope note | per feature (demand-gated) |
| Collection-copy audit | `the internal opportunity-audit tool` (+ explorer, see workflow §5) | ⚠️ workflow §5; [`emoji-combination-taxonomy.md`](./emoji-combination-taxonomy.md) for combo taxonomy | per batch |
| i18n / localization | `prerender-i18n.js` (+ 30 live locale directories, `locales/`, `README.*.md`) — the classifier that tracks these (`scripts/weekly_pr_digest.py`) matched them one-by-one until 2026-08-01; see Known gaps #4 | ❌ none | as needed |
| Ads / monetization (Google AdSense) | `scripts/check-ads.js` (CI: `ads-check.yml`, enforces the AdSense loader site-wide + guards `ads.txt` against leftover Journey manager/seller lines), AdSense loader injected site-wide via `header.js` | ❌ none | as needed |
| ↳ Printables × i18n (not yet wired together) | n/a — `/printables/` pages have no `data-i18n` attributes / locale-JSON keys yet | the internal opportunity backlog `OPP-0803` (scoping note: German/Spanish/French native-query volume for alphabet printables outweighs the English long-tail) | needs scoping pass |
| Consent management (Google Funding Choices) | `check-funding-choices.js`, `inject-funding-choices-tag.js` — tag deployed to every HTML page (PR #660, 2026-07-25) | ❌ none | ❌ no CI workflow wires the checker in yet (unlike `check-gtm.js` below) — see Known gaps #9 |
| CSS audit | `audit-css.js` | ❌ none (CI-only) | CI (`css-audit.yml`) |
| GTM check | `check-gtm.js` | ❌ none (CI-only) | CI (`gtm-check.yml`) |
| Image asset check | `check-image-assets.py` (whole-site, informational) + `check-new-page-image-assets.py` (diff-scoped, gating) | ❌ none (CI-only) | CI (`validate.yml`, folded in from the retired `image-assets-check.yml`) |
| hreflang reciprocity audit | `audit-hreflang.js` (`npm run check:hreflang`) | ❌ none (CI-only) | CI (`validate.yml`) |
| Library/Symbol structural lint | `validate_library_pages.py` | [`unicode-library-workflow.md`](./unicode-library-workflow.md) | CI (`validate.yml`) |
| Translation parity (EN ↔ locale sync-after-creation) | `audit-translation-parity.js` (whole-site, informational) + `check-translation-parity.js` (diff-scoped, gating) | `CLAUDE.md` "Translation Parity" section (no dedicated `docs/` file) | CI (`validate.yml`, gating) + ad hoc audit |
| Locale mesh (hreflang reciprocity + locale-native link rewrites) | `sync-locale-mesh.js` (`--fix`) + `check-locale-mesh.js` (diff-scoped, gating) | `CLAUDE.md` "Locale Parent Governance" section + [`locale-parent-governance.md`](./locale-parent-governance.md) | CI (`validate.yml`, gating) + per-batch `--fix` |
| Locale parent governance (Core Parent Set + Locale Tier registries — which parents mirror into which locales by default) | `check-locale-parent-tier.js` (pre-build lookup) + `audit-locale-parent-gap.js` (whole-site, informational) + `check-locale-parent-gap.js` (diff-scoped, gating) | `CLAUDE.md` "Locale Parent Governance" section + [`locale-parent-governance.md`](./locale-parent-governance.md) | CI (`validate.yml`, gating on new locale pages) + run before starting new locale work |
| FAQ schema visibility (FAQPage/QAPage JSON-LD must mirror the visible page) | `audit-faq-schema.js` (whole-site, informational) + `check-faq-schema.js` (diff-scoped, gating) + `fix-faq-schema-visibility.js` (repair pass) | `CLAUDE.md` "FAQ schema must mirror visible page content" section | CI (`validate.yml`, gating) + per-batch audit/fix |
| Local Language Intelligence (evidence-backed locally-native vocabulary per market) | ❌ none (data-only; private research repo is the source of record, synced into `data/local-language/*.json`) | `CLAUDE.md` "Local Language Intelligence" section + [`local-language-intelligence.md`](./local-language-intelligence.md) | as needed, continuous capture |

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
| `ads-check.yml` | on `pull_request` (HTML/`header.js`/`package.json`/`ads.txt`/`scripts/check-ads.js`) | `check-ads.js` (AdSense loader deployed site-wide; also guards `ads.txt` against Journey lines reappearing) |
| `validate.yml` | on `pull_request` (+ manual) | **required, blocking gates**: `audit-hreflang.js`, `validate_library_pages.py`, `check-new-page-image-assets.py`, `check-translation-parity.js`, `check-locale-mesh.js`, `check-faq-schema.js`, `check-locale-parent-gap.js`. Plus two whole-site audits that run every PR but are **informational only** (`continue-on-error`, never fail the job) because they carry a large, deliberately-paced backlog that would otherwise be permanently red: `check-image-assets.py` (Pinterest pins) and `audit-locale-parent-gap.js` (locale translation coverage). Supersedes the old path-filtered `image-assets-check.yml` (retired). This row was stale from 2026-07-23 through 2026-07-31 — five gating checks (`check-new-page-image-assets.py`, `check-translation-parity.js`, `check-locale-mesh.js`, `check-locale-parent-gap.js`, `check-faq-schema.js`) landed in the workflow file with no corresponding row here; see Operational tracks above for what each one governs. |

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
6. **Pinterest off-system patterns (two).** (a) The Spanish `/es/` board lives
   in `pinterest-kit/` (own generator, bundled fonts, hand-named CSV) instead
   of the `assets/pinterest/<board>/` + `data/*_upload.csv` pipeline. (b) ~334
   pins for category, answers, and library pages are stored flat in
   `assets/pinterest/` root rather than a named board subdirectory — these
   should be moved to `assets/pinterest/<board>/` and wired into the upload
   pipeline. Migrate both per `docs/pinterest-pin-generation.md`.
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
    undecided and now the more pressing half of this gap.
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
