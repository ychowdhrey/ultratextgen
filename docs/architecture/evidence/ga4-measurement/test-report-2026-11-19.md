# GA4 measurement track — test report (2026-11-19)

**Production state:** `main` @ `e73013192b` (the base this branch diffs against)
**Branch under test:** `claude/ga4-evidence-ingestion` (commit `c8b3a14503`)
**Track:** [`../../../measurement-ga4.md`](../../../measurement-ga4.md)
**Environment:** Windows 11, Python 3.14.4, Node v24.18.0. The GA4 client
(`google-analytics-data`) and PyYAML were supplied per-run via `uv`; CI installs
its own.

Credentials were supplied from outside the working tree through
`GOOGLE_APPLICATION_CREDENTIALS` for the live runs below. No key, key path or
project id is written into any tracked file; `ga4-bundle.local.json` (the raw
fetch artifact) is gitignored.

---

## 1. Access validation

| Check | Result |
|---|---|
| Property identified | `properties/522553010` ("ultratextgen"), the only property on the account |
| Permission level | `can_edit: false` — read-only |
| API surface used | `runReport` only; no write method is called anywhere in the fetcher |
| Reporting access | every report returned data, unsampled (`sampled: false` throughout) |
| Property created | **2026-02-02**; service level `GOOGLE_ANALYTICS_STANDARD` |
| Earliest data | **2026-02-03** — the maximum backfill, established by query |
| Daily grain | available for the whole period at landing-page, country, source/medium and event level |
| Revenue | **available** — AdSense is linked: `totalAdRevenue` ≈ $5/day and `publisherAdImpressions` ≈ 5,000/day in November. February returns 0 because ads had not started, not because the metric is absent |
| Key events | only the default `purchase` is configured, and it is unused |

---

## 2. Unit tests (`scripts/test_ga4_snapshot.py`)

`python3 -m unittest discover -s scripts -p 'test_ga4*.py'` → **54 tests, OK,
exit 0**. Network-free: the suite runs with no GA4 credentials present.

| Group | Asserts |
|---|---|
| `SplitPathTests` (9) | locale prefix, hyphenated locale (`zh-tw`), a locale absent from `locales/*.json` (`ko`), `/x/` not read as a locale, unprefixed page, home, locale home, root-level slug, and an undocumented namespace (`/symbol/`) keeping its real `page_type` and slug |
| `Ga4WeekTests` (5) | `yearWeek` → date range pinned to values read off the live property; weeks start Sunday; unparseable week reads `unknown` rather than guessing; the three boundary labels; a week containing the deploy day is never labelled clean |
| `ReturningShareTests` (2) | share arithmetic; no divide-by-zero on an empty window |
| `SnapshotTests` (8) | totals sum the page rows, returning share, missing-event detection, save rate, locale aggregation + ordering, average-engagement divide-by-zero, truncation flagged and not flagged |
| `ComparabilityTests` (2) | both boundaries reach the snapshot and the rendered summary |
| `WriteTests` (6) | every expected file written, join keys present in `page_performance.csv`, weekly history sorted ascending with its date/label/completeness columns, the partial trailing week flagged `no`, an existing dated snapshot refused then accepted under `--force`, non-bundle JSON rejected |


`scripts/test_ga4_weekly_report.py` adds 22 cases over a throwaway
`data/ga4` tree and a throwaway repo tree:

| Group | Asserts |
|---|---|
| `RegistryTests` (4) | locale read off each page URL rather than a field, entry without an id skipped, a missing register is empty rather than fatal, every named path collected |
| `PathHelperTests` (4) | root path is `en`, two-letter and hyphenated locales, a foreign URL is not ours, trailing slash and query normalised |
| `PageExistsTests` (4) | directory index with and without trailing slash, root, bare `.html`, absent |
| `ClassifyTests` (3) | malformed URL, scanner probe, ordinary removed page |
| `ReportTests` (7) | the window filter excludes an out-of-window day, first run labelled *baseline*, a new family detected against a seeded earlier snapshot, unserved demand lists only paths with no file, **candidates never invent a translated path**, unregistered high-traffic pages named, and the report states it is not authorization |

---

## 3. Probe: does the suite actually go red?

Per `.claude/rules/tooling-and-gates.md` — "adding a validator is not the same
as gating on it" — each defect below was injected into a **copy** of the
normalizer and the suite re-run. Exit status was read directly, never through a
pipe.

| Probe | Defect injected | Result |
|---|---|---|
| baseline | none | exit 0, 62 tests OK |
| 1 | boundary label forced to `post` (would hide the definition change) | **exit 1**, 3 caught it |
| 2 | locale detection disabled | **exit 1**, 8 caught it |
| 3 | overwrite protection removed (would destroy recorded history) | **exit 1**, 1 caught it |
| 4 | missing-event detection disabled | **exit 1**, 1 caught it |
| 5 | partial-week flag forced to `yes` | **exit 1**, 1 caught it |
| 6 | page-truncation flag suppressed | **exit 1**, 1 caught it |
| 7 | unmapped landing paths given a bogus intent id | **exit 1**, 2 caught it |
| 8 | report invents a translated path for a cross-locale gap | **exit 1**, 1 caught it |
| 9 | window filter removed from the daily read | **exit 1**, 1 caught it |
| 10 | unmapped landing rows dropped instead of kept | **exit 1**, 1 caught it |
| 11 | revenue column zeroed | **exit 1**, 1 caught it |

Probes 7 and 10 exist because the **first** run of probe 7 came back green: at
that point nothing asserted that a path the intent register does not name is
kept and marked `intent_mapped: no`. That is the requirement most of the
evidence depends on (76,355 of 78,349 landing-page rows are unmapped), and it
was untested until the probe said so. `DailyPartitionTests` was added, and the
probe now goes red.

A first run of this probe reported all six as `OK` — the harness was writing the
patched file to an MSYS `/tmp` path the Windows interpreter could not see, so
every probe ran against the *unmodified* copy. That is the "a check that reports
nothing is indistinguishable from a check that passes" failure, reproduced
accidentally while testing for it. The table above is the re-run on a
repo-relative path, where the patch step prints confirmation and aborts if its
anchor is missing.

---

## 4. Repo gates

| Gate | Command | Result |
|---|---|---|
| Workflow lint | `scripts/check-workflows.py` | 15 workflows, **0 errors, 0 warnings**, exit 0 |
| External references | `scripts/check-external-refs.js` | 0 references outside the repo, exit 0 — re-run **after** committing, since the gate scopes to tracked files |
| Full CI gate set | `scripts/run-ci-gates.py --base origin/main` | see §6 |

The first `check-workflows.py` run printed "PyYAML is required" and the shell
reported `EXIT=0`, because the status had been read through a pipe. Re-run
directly with PyYAML available, it reports the result above.

---

## 5. Live end-to-end run

Window **2026-11-09 → 2026-11-15** (last complete Mon–Sun week),
`--page-limit 5000`:

| Report | Rows | Note |
|---|---|---|
| `pages` | 2,726 of 2,726 | complete; `pages_truncated: false` |
| `weekly_totals` | 42 | full history |
| `monthly_retention` | 20 | full history |
| `monthly_events` | 18 | full history, action set only |
| `countries` | 50 of 142 | capped by design |
| `events` | 12 | all events in the window |
| `retention` | 2 | new / returning |

Output: 20,306 page views, 14,927 active users, 11.0% returning share.
Re-running the same window exits 1 and refuses to overwrite
`snapshots/2026-11-15.json`; `--force` restates it.

### Full daily backfill (`--daily-since 2026-02-02`)

| Report | Rows fetched | Complete? |
|---|---|---|
| `daily_totals` | 287 | yes — one row per day with data |
| `daily_landing_pages` | **78,349 of 78,349** | yes, via the paging loop |
| `daily_country` | 20,085 | yes |
| `daily_source_medium` | 6,985 | yes |
| `daily_events` | 2,568 | yes |

Normalized to **108,274 rows across 41 files** (40 month partitions + 
`daily_totals.csv`), 6.8MB total. Verified with a real CSV parser, not `awk`:
1,994 landing-page rows carry an intent id (34 of the register's 35 intents
appear in traffic) and **76,355 unmapped rows are preserved** with
`intent_mapped: no`.

An earlier `awk`-based count of the same files reported a 36th "intent" and a
stray `"` value. That was the counting tool, not the data: three real landing
paths contain a comma or a quote (`/kaomoji-generator/,/`,
`/library/tiktok-symbols, symbolselect.com/tiktok-symbols/`), which the CSV
writer quotes correctly and naive comma-splitting does not.

### Weekly report

`scripts/ga4_weekly_report.py` → `data/ga4/reports/2026-11-15.md`, exit 0.
Section 1 correctly reports *baseline* (no earlier snapshot to diff), section 3
finds 7 paths with sessions and no page file — led by `(not set)` at 822
sessions, a GA4 artifact rather than a page — and section 4 lists 6 registered
intents with a top-locale gap plus the 16 high-traffic pages the register
cannot speak for.

### The comparability label, demonstrated

| Week | Dates | Views | Sessions | Label |
|---|---|---|---|---|
| 202645 | 2026-11-01..07 | 36,123 | 15,977 | `pre-2026-11-08` |
| 202646 | 2026-11-08..14 | 21,980 | 17,360 | `spans-2026-11-08` |
| 202647 | 2026-11-15..21 | 2,724 | 2,188 | `post-2026-11-08`, `week_complete: no` |

Views fall 39% while sessions rise — the page-view definition change of
2026-11-08, not traffic. Week 202647 is a one-day bucket. Both are labelled, so
neither can be read as a collapse.

---

## 6. Findings this produced

Recorded in [`measurement-ga4.md`](../../../measurement-ga4.md#findings-2026-11-19)
and as gaps 31–33 in [`../../../README.md`](../../../README.md#known-gaps). The
one needing action outside this repo:

**`unsave_style` never reaches GA4.** `js/saved/saved-items.js` pushes it and
`js/saved/savedItems.test.js` asserts it fires, so the page side is correct and
tested. GA4 has **zero** `unsave_style` events across the property's life,
against **2,808 `save_style`** since 2026-08. Thousands of saves with no
un-saves is not plausible user behaviour, so the event is dropped between
`dataLayer` and GA4 — almost certainly no forwarding tag in the container. The
GTM container is a settings surface, not a tracked file, so **this cannot be
closed from the repo** and is logged as gap 31 instead.

---

## 7. What this run did not change

No page, style, score, spec, backlog row or historical figure was edited. The
branch adds three scripts, one workflow, one doc, this report, `data/ga4/`, and
two gitignore lines; it edits `docs/README.md` additively (two table rows, three
gaps). Revenue-bearing surfaces (ad slots, GTM snippets, `_headers`,
`_redirects`, consent) were not touched.

---

## 8. Requirement coverage and blockers

| # | Requirement | State |
|---|---|---|
| 1 | Workflow authenticates via Actions secrets, no committed credentials | **Designed and lint-clean, not yet executed on GitHub.** The key is written to `mktemp` outside the working tree, exported as `GOOGLE_APPLICATION_CREDENTIALS`, and removed by a `trap` on every exit path. `data/ga4/` is the only committed output; the raw bundle is gitignored. No key, key path or project id appears in any tracked file (verified by scanning every file this branch adds for the credential filename, the project id, `PRIVATE KEY`, `service_account` and `client_secret` — the only hits are the secret's *name* in the workflow). |
| 2 | Verify property, permissions, API access, workflow execution | Property, permissions and API access **verified live** (§1). **Workflow execution is blocked** — see below. |
| 3 | Backfill maximum available period | **Done.** 2026-02-02 → 2026-11-18, the property's whole life; 78,349 landing-page rows fetched complete. Aggregate weekly/monthly series were already whole-history. |
| 4 | Preserve daily landing-page, country, source/medium, event, engagement, revenue | **Done** — five daily reports, engagement as `userEngagementDuration` (and a derived average), revenue as `totalAdRevenue` + `publisherAdImpressions`. Fetched as separate reports rather than one cross-product, which would have multiplied ~80k rows into millions for no extra information. |
| 5 | Join to page, locale, intent and opportunity registers without losing unmapped paths | **Done** for page/locale/intent; **partly** for opportunity. `locale`, `page_type`, `slug` are derived on every row and `intent_id` joins `data/canonical_intents.json`. Unmapped paths are kept and marked (tested; probes 7 and 10). The opportunity backlog is **not a tracked file in this repo** — `docs/README.md` names the source of record as the internal backlog — so the join is provided by key (`locale`+`page_type`+`slug`, the keys the library lane uses) and demonstrated against the 836 tracked specs in `data/library_page_specs/`, rather than by reaching for a file this repo does not carry. |
| 6 | Feed the opportunity activation pipeline; never read traffic as build authorization | **Done, deliberately as evidence only.** The report produces a *candidate shortlist* and states on its face that it is not authorization. It writes no register and no ledger. This is also the repo's own rule: `CLAUDE.md` hard lines forbid editing a `data/` ledger unilaterally and state that volume alone is never justification and one query gets one page. Promoting a candidate stays a human decision. |
| 7 | Weekly report: new page families, cross-locale performance, unserved demand, newly eligible opportunities | **Done** — the four sections in §5. |
| 8 | Tests, real ingestion, actual results, Actions run URL | Tests and real ingestion **done** (62 tests; live backfill above). **No Actions run URL** — see below. |

### Blockers

1. **No GitHub Actions run URL, and none is obtainable from here.** The
   workflow cannot run until two repository settings exist, and both are
   settings surfaces rather than tracked files:
   - `secrets.GA4_SERVICE_ACCOUNT_JSON` — a service-account key with Viewer on
     property `522553010`
   - `vars.GA4_PROPERTY_ID` — `522553010`

   The credential used for the live runs in this report is a **local** one,
   outside the repo. Copying it into repository secrets is an owner action: it
   grants the Action standing read access to the analytics property, and
   nothing in this session should do it silently. Once set, the workflow can be
   started from the Actions tab (`workflow_dispatch`, with
   `daily_since = 2026-02-02` for a fresh full backfill) and it will produce
   the run URL. **Until that happens the integration is implemented and
   verified locally, but not verified in CI** — and the workflow is written to
   fail loudly rather than pretend otherwise.

2. **`run-ci-gates.py` could not be completed in this environment.** The full
   gate runner crashed decoding a subprocess's output under the Windows
   cp1252 default (`UnicodeDecodeError: 'charmap' codec can't decode byte
   0x9d`), and a re-run with `PYTHONUTF8=1` had not finished when this report
   was written; the suite also includes a Playwright/Chromium smoke stage. The
   two gates that bear on this branch were run individually and pass:
   `check-workflows.py` (15 workflows, 0 errors) and `check-external-refs.js`
   (0 outside references, re-run after committing so the files were in scope).
   CI remains the authority on the rest.

3. **`unsave_style` cannot be fixed from this repo** (§6). The forwarding tag
   lives in the GTM container.
