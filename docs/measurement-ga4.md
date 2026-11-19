# Measurement — GA4 evidence

> **Why this exists.** Every other lane here produces evidence in a file. GA4
> was the exception: its numbers reached the repo only by someone reading the
> property by hand and writing prose about it. That work is good — the
> page-view analysis in
> [`architecture/copy-share-save.md`](./architecture/copy-share-save.md) is a
> model of it — but a figure written into prose cannot be refreshed, cannot be
> joined to a slug, and cannot be re-checked next week without repeating the
> whole exercise. There was no tracked GA4 dataset and no ingestion.
>
> This track fixes the *plumbing*, not the judgment. It records what GA4 said,
> on a cadence, in files the other lanes can read and the next session can trust.

An **operational track** (see
[`README.md`](./README.md#operational-tracks-cross-cutting)). Cadence: **weekly**
(automated), read whenever a lane needs measured demand.

---

## The two halves

The same split the weekly infrastructure review uses — the deterministic half
gathers, the judgment half interprets.

| Half | What runs | What it does |
|---|---|---|
| **Gather** (automated) | [`ga4-weekly-snapshot.yml`](../.github/workflows/ga4-weekly-snapshot.yml) → `fetch_ga4_reports.py` → `ga4_snapshot.py` → `ga4_weekly_report.py` | Mondays 07:00 UTC: pull the last complete Mon–Sun week, write `data/ga4/`, build the report, commit `[skip ci]`. |
| **Interpret** (judgment) | whoever is asking a question | Read `data/ga4/`. This track never edits a page, a score or a backlog row. |

`fetch_ga4_reports.py` is the only part that touches the network.
`ga4_snapshot.py` and `ga4_weekly_report.py` are pure and unit-tested
(`scripts/test_ga4_snapshot.py` + `scripts/test_ga4_weekly_report.py`, 54 cases
in stdlib `unittest` — no test framework added, per `CLAUDE.md`), so the
normalization and reporting logic can be changed and verified **without GA4
credentials**.

**Read-only by construction:** the fetcher calls `runReport` and nothing else.
The service account needs **Viewer**; it cannot modify the property.

**If the credential is missing the workflow fails loudly rather than skipping.**
A weekly ingestion that quietly does nothing looks exactly like one that works
(`.claude/rules/tooling-and-gates.md`). Set the secret or disable the schedule.

---

## Files this track owns (`data/ga4/`)

| File | Shape | Notes |
|---|---|---|
| `snapshots/<until>.json` | one window | **Append-only.** The normalizer refuses to overwrite a recorded window without `--force`. |
| `latest.json` / `latest.md` | newest window | Stable paths. |
| `<until>.md` | newest window | Human summary. |
| `weekly_totals.csv` | **full history** from the property's first week | Restated in full every run, so it self-heals. |
| `monthly_retention.csv` | **full history**, new/returning + share | |
| `monthly_events.csv` | **full history**, the copy/save/share action set | |
| `page_performance.csv` | one window, every page with traffic | Keyed for joining — below. |
| `locale_performance.csv` | one window, aggregated by URL locale | |
| `daily_totals.csv` | **full history**, one row per day | Sessions, views, users, engagement, **ad revenue** and publisher ad impressions. |
| `daily/<YYYY-MM>-landing-pages.csv` | one row per day per landing page | Carries `locale`, `page_type`, `slug`, `intent_id`, `intent_mapped`. |
| `daily/<YYYY-MM>-country.csv` | one row per day per country | |
| `daily/<YYYY-MM>-source-medium.csv` | one row per day per source/medium | |
| `daily/<YYYY-MM>-events.csv` | one row per day per event | Every event, not just the action set. |
| `reports/<until>.md` | one window | The weekly report — see below. |

**Why the daily files are partitioned by month.** They are restated on every
run. A single 78k-row landing-page file would rewrite ~6MB of history every
week; a month partition only churns the month in progress, so a closed month's
file stops changing and the history stays auditable.

### Joining measured traffic to a page

`page_performance.csv` is keyed `locale` + `page_type` + `slug`, so it joins by
slug onto `data/library_page_specs/*.json` and onto a scored opportunity row by
the keys the library lane already uses:

```python
import csv
from collections import defaultdict
views = defaultdict(int)
with open('data/ga4/page_performance.csv', encoding='utf-8') as fh:
    for row in csv.DictReader(fh):
        views[row['slug']] += int(row['screen_page_views'])
# views[spec['slug']] is measured demand, beside the volume it was scored on.
```

That join is the point of this track: a lane can finally ask whether a shipped
page earned anything, instead of trusting the volume it was scored on.

### The weekly report

`scripts/ga4_weekly_report.py` reads the files above and writes
`data/ga4/reports/<until>.md`, answering four questions:

1. **Newly discovered page families** — a `(locale, page_type)` pair taking
   traffic that the previous snapshot had not seen. The snapshot records its
   families for exactly this comparison, so "new" means something. The first
   run says *baseline* rather than pretending 189 families are new.
2. **Cross-locale performance** — per-locale totals, and which slugs are served
   in several locales with how the views split.
3. **Unserved demand** — paths taking sessions with no page file in the
   checkout. Reported as "explain each of these", not "fix each of these",
   because `_redirects` and the `functions/` middleware can still resolve a
   path with no file.
4. **Candidates for validation** — below.

**The report never promotes anything.** It writes no register and no ledger, and
it does not read a traffic increase as permission to build. `CLAUDE.md` is
explicit that volume alone is never justification and that one query gets one
page, so a candidate is an argument to go *look*. Acting on one still needs the
lane's own gate.

### Cross-locale candidates are intent-based, not slug-based

The first version of section 4 guessed a translated path — it proposed
`/ko/library/simbol-love/` for an Indonesian slug, and `/en/…` for English
pages that live at the root — then asked whether a file existed there. That is
meaningless: the slug would itself be translated, and a page maps to a
canonical **intent** that may originate in any language.

So a gap is only reported where `data/canonical_intents.json` can describe one:
a registered intent with measured views in some locales and no page in a top
locale. The register is partial by design (it records clusters no English page
can name), covering 2.55% of landing-page rows, so the report's honest second
half names **the high-traffic pages the register cannot speak for** — the
cross-locale question simply cannot be asked for those until someone registers
an intent, which is a human decision.

Unmapped paths are always **kept with `intent_mapped: no`**, never dropped:
76,355 of 78,349 landing-page rows are unmapped, and they are where most of the
traffic is.

### `page_type` is discovered, not hardcoded

`split_path()` treats the first segment of a nested path as its page type
whatever it is called, and matches locales by *shape*
(`^[a-z]{2}(-[a-z]{2,4})?$`). A lane or locale that ships before this doc
catches up still appears under its real name instead of a silent "other"
bucket — the same "unclassified is a signal" idea the PR digest uses. All 32
locale buckets and every lane below were classified with no code change.

---

## Comparability — read this before trending anything

Two recorded definition changes mean counts either side are **not** comparable.
They are encoded in `METRIC_BOUNDARIES` in the normalizer, emitted into each
snapshot, and stamped onto every row of `weekly_totals.csv`:

| Date | Affects | Why |
|---|---|---|
| **2026-11-08** | `screenPageViews`, pages/session | Typed text left the address bar, so GA4 stopped counting history-rewrite page views ([`architecture/copy-share-save.md`](./architecture/copy-share-save.md)). |
| **2026-09-13** | `share_text` | Began firing on success instead of intent ([`.claude/rules/copy-share-analytics.md`](../.claude/rules/copy-share-analytics.md)). |

`weekly_totals.csv` carries `pageview_definition` per row
(`pre-` / `spans-` / `post-2026-11-08`). A week containing the deploy day is
labelled `spans`, never `post`, because that day itself recorded a
mid-transition value.

**Why this matters, concretely:** week 202645 → 202646 shows 36,123 → 21,980
page views, a 39% "collapse". Over the same two weeks **sessions rose**,
15,977 → 17,360. The drop is the definition change. Without the label this
track would have manufactured a crisis in its first week.

`weekly_totals.csv` also carries `week_complete`. GA4 opens a week bucket as
soon as one day lands in it, so the newest row is usually a part-week — 2,724
views for a one-day week reads as a collapse if nobody says it is unfinished.

GA4 weeks run **Sunday→Saturday**; the snapshot window is **Mon–Sun**. The two
grains differ on purpose and are labelled rather than silently aligned.

---

## Running it by hand

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json   # never in the repo
export GA4_PROPERTY_ID=<property id>

python3 scripts/fetch_ga4_reports.py --page-limit 5000 \
  | python3 scripts/ga4_snapshot.py --out-dir data/ga4

# any past window
python3 scripts/fetch_ga4_reports.py --since 2026-09-06 --until 2026-09-12 \
  --page-limit 5000 | python3 scripts/ga4_snapshot.py --out-dir data/ga4
```

`--page-limit` caps the page tail. When GA4 reports more rows than were kept,
the snapshot sets `pages_truncated` and the summary says "capped", so a bounded
snapshot never reads as full coverage.

### What the property can and cannot give

| | |
|---|---|
| Property | `522553010`, created **2026-02-02**, Standard tier (not 360) |
| Earliest data | **2026-02-03** — the maximum backfill, verified by query, not assumed |
| Daily grain | available for the whole period at landing-page, country, source/medium and event level (78,349 landing-page rows; fetched complete, unsampled) |
| Revenue | **available** — AdSense is linked, so `totalAdRevenue` and `publisherAdImpressions` come back per day (≈$5/day in November). February returns 0 because ads had not started, not because the metric is missing |
| Sampling | none observed on any report (`sampled: false` throughout) |
| Row limits | the fetcher pages at 100k rows and stops only when GA4's own `row_count` is reached, so a large backfill is never silently truncated |

Standard-tier retention settings govern *user- and event-scoped* exploration
queries, not the aggregated `runReport` surface this track uses, which is why
daily detail back to February is still available. That is an observation from
this property, not a guarantee: if an early month ever starts returning empty,
the already-committed partitions remain the record of what it said.

### Backfilling

The three history CSVs are **already complete from the property's first week**
(2026-02) and are restated in full on every run, so there is no history to
backfill for them. Only page- and locale-level detail is per-window; GA4 still
holds it, so any past week can be materialized with `--since/--until` above. A
recorded window is never rewritten.

---

## Checklist when consuming this

1. **Quote the window.** Every figure is scoped to `window.since..until`.
2. **Check the comparability boundary** before trending, and `week_complete`
   before reading the newest week.
3. **Check `missing_product_events`.** An event the repo believes it fires that
   GA4 never received is a finding, not a zero.
4. **Check `pages_truncated`** before claiming catalog-wide coverage.
5. **Segment locales.** A single global average hides that the top locales
   behave nothing like each other.

---

## Findings (2026-11-19)

First snapshot: window **2026-11-09 → 2026-11-15**, 20,306 page views across
2,726 pages with traffic, plus the full history series.

1. **`unsave_style` reaches the page but never reaches GA4.**
   `js/saved/saved-items.js` pushes it and `js/saved/savedItems.test.js`
   asserts it fires, so the client side is working and tested. GA4 has
   nonetheless recorded **zero `unsave_style` events in the property's entire
   life**, against **2,808 `save_style` events since 2026-08**. Thousands of
   saves and not one un-save is not plausible user behaviour, so the event is
   being dropped between `dataLayer` and GA4 — almost certainly no GTM tag
   forwards it. **This is a GTM container fix, not a code fix**, and until it
   lands, save→return cannot be measured as a round trip.
2. **The save/share action set has no GA4 history before 2026-08.**
   `save_style` and `share_text` first appear in **2026-08**. Any question
   about saving or sharing before that date has no data, regardless of what the
   code did at the time.
3. **Save rate is 2.34% of copies** (259 saves / 11,077 `copy_text`) in the
   window — a usable baseline for the save surface, recorded rather than
   estimated.
4. **Returning-user share is flat at 8.5–10.5% every month since 2026-02**
   (November: 10.4%). Whatever has changed on the site, this has not moved —
   which is the expected shape for an episodic copy-paste tool, and worth
   knowing before anyone treats a monthly wobble as a trend.
5. **Measured locale ranking:** `id` 6,390 → `en` 3,850 → **`ko` 2,754** →
   `es` 1,923 → **`ru` 1,064** → `fr` 813 views in the window, across **32
   locale buckets with traffic**. Korean is the site's #3 locale and Russian #5.
6. **The library/symbol lane's best pages are Korean and Russian.** Joining the
   window to the 836 tracked specs: the top shipped pages are
   `serdechko-iz-simvolov` (ru, 137), `roblox-symbols` (128), `aipon-imoji`
   (ko, 97), with `maljurimpyo-giho`, `christmas-giho`, `dal-giho` and
   `nickname-giho` (all ko) in the top ten. The localization work is where this
   lane's measured return is.
7. **293 of 836 shipped specs (35%) took zero views in the window**, and all
   spec-generated pages together account for **3,141 of 20,306 views (15.5%)**
   of the site. The lane is a long tail with a short head.

**How much weight finding 7 carries:** one week, on a catalog that is long-tail
by design, and a page can legitimately take zero views in a week and still be
worth having. The *distribution* is the signal, not any single zero. The honest
move is to re-run the join after 4+ weekly snapshots — which is now a query
rather than a research project.

**Not changed by this work:** no page, score, spec, backlog row or historical
figure was edited. Findings are recorded here and in
[`README.md` → Known gaps](./README.md#known-gaps) for a human to act on.
