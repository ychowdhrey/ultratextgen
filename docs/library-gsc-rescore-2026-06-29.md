# Library GSC Re-score & Improve-Existing Plan — 2026-06-29

Source: Google Search Console export `Library_Data_29th_June.csv` (2026-04-03 → 2026-06-26, ~3 months). 151 library URLs, 19,502 impressions, 323 clicks (1.66% sitewide CTR).

## 1. What changed in `data/library_opportunities.csv`

**Re-score rule — "validate, don't reject"** (chosen 2026-06-29):
- Added three evidence columns from real GSC data, keyed on each row's target `slug`: `gsc_impressions`, `gsc_clicks`, `gsc_ctr` (3-month totals).
- Any non-rejected row whose target page has **≥ 50 impressions** (validated real search demand) was promoted to `approval_status=approved`.
- **No auto-rejections and no demotions** — the window is only 3 months and some pages are newly published, so low/zero traffic is treated as "unproven," not "dead." Existing `rejected` (policy/duplicate skips) left untouched.

| approval_status | Before | After |
|---|---|---|
| approved | 300 | 335 |
| pending | 448 | 413 |
| rejected | 45 | 45 |

35 rows (17 distinct pages) promoted pending → approved on validated demand: `emoji-combos`, `y2k-symbols`, `roblox-symbols`, `discord-symbols`, `slash-backslash-symbols`, `greek-letter-symbols`, `flower-symbols`, `emoji-flags`, `instagram-symbols`, `email-symbols`, `cross-x-symbols`, `x-twitter-symbols`, `coquette-symbols`, `chess-symbols`, `dash-hyphen-symbols`, `bow-ribbon-symbols`, `arrow-symbols`.

## 2. Top 20 improve-existing pages to work on first

Ranked by **demand × weak CTR** = `impressions × max(0, 5% − actual CTR)` = estimated extra clicks/3mo if the page reached a healthy 5% CTR. These pages already rank and collect impressions; the content/title/meta simply isn't converting the visibility into clicks.

| # | Page (`/library/<slug>/`) | Impr. | Clicks | CTR | Missed clicks | Opp rows |
|---|---|---:|---:|---:|---:|---|
| 1 | `y2k-symbols` | 2,755 | 57 | 2.1% | 81 | OPP-0137 |
| 2 | `discord-symbols` | 2,215 | 50 | 2.3% | 61 | OPP-0064 |
| 3 | `slash-backslash-symbols` | 414 | 0 | 0.0% | 21 | OPP-0150 |
| 4 | `greek-letter-symbols` | 166 | 0 | 0.0% | 8 | OPP-0503, OPP-0504 |
| 5 | `flower-symbols` | 159 | 0 | 0.0% | 8 | OPP-0037, OPP-0357, OPP-0441 |
| 6 | `emoji-flags` | 157 | 0 | 0.0% | 8 | OPP-0153, OPP-0358, OPP-0359, OPP-0485 |
| 7 | `cross-x-symbols` | 142 | 0 | 0.0% | 7 | OPP-0041, OPP-0405 |
| 8 | `x-twitter-symbols` | 138 | 0 | 0.0% | 7 | OPP-0149 |
| 9 | `coquette-symbols` | 135 | 0 | 0.0% | 7 | OPP-0134, OPP-0240 |
| 10 | `instagram-symbols` | 146 | 3 | 2.1% | 4 | OPP-0065 |
| 11 | `dash-hyphen-symbols` | 74 | 0 | 0.0% | 4 | OPP-0055 |
| 12 | `chess-symbols` | 93 | 1 | 1.1% | 4 | OPP-0045 |
| 13 | `bow-ribbon-symbols` | 72 | 0 | 0.0% | 4 | OPP-0053 |
| 14 | `arrow-symbols` | 55 | 0 | 0.0% | 3 | OPP-0023, OPP-0024 |
| 15 | `medical-symbols` | 46 | 0 | 0.0% | 2 | OPP-0325, OPP-0470 |
| 16 | `animal-emojis` | 31 | 0 | 0.0% | 2 | OPP-0063, OPP-0207, OPP-0279, OPP-0298, OPP-0299, OPP-0300, OPP-0301, OPP-0302, OPP-0303, OPP-0304, OPP-0305, OPP-0306, OPP-0307, OPP-0308, OPP-0309, OPP-0310, OPP-0311, OPP-0312, OPP-0313, OPP-0314, OPP-0315, OPP-0316, OPP-0317, OPP-0465, OPP-0466, OPP-0512 |
| 17 | `roblox-symbols` | 2,731 | 135 | 4.9% | 2 | OPP-0148 |
| 18 | `hazard-warning-symbols` | 49 | 1 | 2.0% | 1 | OPP-0455 |
| 19 | `fraction-symbols` | 26 | 0 | 0.0% | 1 | OPP-0494 |
| 20 | `smiley-face-guide` | 23 | 0 | 0.0% | 1 | OPP-0222 |

**Reading the table:** the two big pages (`y2k-symbols`, `discord-symbols`) top the list on sheer volume despite ~2% CTR. The cluster beneath them — `slash-backslash-symbols` (414 impr, **0% CTR**), `greek-letter-symbols`, `flower-symbols`, `emoji-flags`, `cross-x-symbols`, `x-twitter-symbols`, `coquette-symbols` — are pages pulling real impressions with **literally zero clicks**, the clearest title/snippet/intent-match problems to fix.

## 3. Data-revealed gaps — high-traffic pages NOT in the improve-existing backlog

These published pages pull ≥100 impressions but have no `improve_existing` opportunity row yet. Worth adding to the backlog (most are bigger than items in the top-20 above):

| Page | Impr. | Clicks | CTR |
|---|---:|---:|---:|
| `emoji-combos` | 5,948 | 44 | 0.7% |
| `neymar-emoji-combos` | 1,355 | 7 | 0.5% |
| `html-entities` | 326 | 0 | 0.0% |
| `sad-emoji` | 188 | 0 | 0.0% |
| `email-symbols` | 143 | 2 | 1.4% |
| `ronaldo-emoji-combos` | 118 | 2 | 1.7% |

> `emoji-combos` alone (5,948 impr, 0.7% CTR) is the single largest improvement opportunity on the whole property and currently sits outside the backlog.
