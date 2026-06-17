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
| **Library** (symbol/emoji reference) | `/library/` | `Article` + `BreadcrumbList` | [`unicode-library-workflow.md`](./unicode-library-workflow.md) (+ [`unicode-forum-research-skill.md`](./unicode-forum-research-skill.md)) | `data/library_opportunities.csv` | `generate_library_page_from_spec.py` + `validate_library_pages.py` | ✅ fully systematized |
| **Category** (style generators) | `/category/` | `WebApplication` | [`jtbd-build-spec.md`](./jtbd-build-spec.md) (strategy) | `library_opportunities.csv` (`page_type=category`) | ❌ none | ⚠️ backlog + strategy, no generator |
| **Answers** (Q&A) | `/answers/` | `QAPage` / `FAQPage` | [`jtbd-build-spec.md`](./jtbd-build-spec.md) (strategy) | `library_opportunities.csv` (`page_type=answers`) | ❌ none | ⚠️ backlog + strategy, no generator |
| **Usecase** | `/usecase/` | `WebApplication` | ❌ undocumented | ❌ none | ❌ none | ❌ undocumented |
| **Guide** (articles) | `/guide/` | `Article` | ❌ undocumented | ❌ none | ❌ none | ❌ undocumented |
| **Platform** (social-network generators) | `/discord/`, `/instagram/`, `/x/`, … | `WebApplication` | ❌ undocumented | ❌ none | ❌ none | ❌ undocumented |

**Only the Library lane is structurally complete** (discovery → scouting →
research → volume → score → dedupe → spec → generate → validate → PR). The
other lanes have principles and, for category/answers, a strategy spec — but no
demand backlog or generator. See [Known gaps](#known-gaps).

---

## Operational tracks (cross-cutting)

These run across page types rather than producing a type.

| Track | Scripts | Doc | Cadence |
|---|---|---|---|
| Image SEO (hero art, OG cards) | `make-hero-decorative.py`, `add-og-dimensions.py`, `build-image-seo-status.py` | [`image-seo-fixes.md`](./image-seo-fixes.md) | per batch |
| Pinterest pins | `generate-pinterest.py` | [`pinterest-pin-generation.md`](./pinterest-pin-generation.md) | per batch |
| Schema / alternateName SEO | `validate-alternatenames.py`, `inject-faq-jsonld.js`, `alternatename-seo-report.md` | ⚠️ none | per batch |
| Collection-copy audit | `audit_library_opportunities.py` (+ explorer, see workflow §5) | ⚠️ workflow §5; [`emoji-combination-taxonomy.md`](./emoji-combination-taxonomy.md) for combo taxonomy | per batch |
| i18n / localization | `prerender-i18n.js` (+ `es/`, `locales/`, `README.*.md`) | ❌ none | as needed |
| CSS audit | `audit-css.js` | ❌ none (CI-only) | CI (`css-audit.yml`) |
| GTM check | `check-gtm.js` | ❌ none (CI-only) | CI (`gtm-check.yml`) |

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

---

## Known gaps

The structure is emergent; these are the open infrastructure debts, tracked
here so they aren't lost. Update as they're closed or new ones appear.

1. ~~**Demand backlog is library-only.**~~ **Closed** — the opportunity CSV now
   carries a `page_type` column (default `library`) and the auditor dedupes
   per-lane, so scouting, the `stage` lifecycle, and the demand gate reach
   `/category/` and `/answers/`. (Still no generator for those lanes — see #2.)
2. **No production pipeline for category/answers.** Strategy exists
   (`jtbd-build-spec.md`); there is no generator/validator equivalent of the
   library lane. These pages are hand-built.
3. **Usecase and guide lanes are undocumented** — no workflow, no backlog.
4. **Operational tracks without docs:** schema/alternateName SEO, i18n, CSS/GTM
   CI checks. Scripts exist; the process is tribal knowledge.
5. **Platform pages lane is undocumented** — the eleven social-network generator
   pages (`/discord/`, `/instagram/`, `/x/`, …) receive SEO and FAQ updates but
   have no governing workflow, backlog, or generator. The classifier also has no
   rules for them, so PRs that touch those paths are flagged Unclassified.

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
5. Open a small, additive PR with the updated map.

**Output:** an up-to-date map + a current [Known gaps](#known-gaps) list. The
goal is not to design the whole system now — it's to make sure every new piece
of work is *placed*, so the structure reveals itself over time.
