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

---

## 4. Separating intent vs CTR vs ranking (added 2026-06-29)

A 0% / low-CTR page can mean three different things, each with a different fix. Diagnose with **two layers**:

**Layer 1 — Query-text intent (free; from this GSC export's Query column).** Classify each impression-weighted query by its words: copy-paste/tool words (`copy paste`, `symbol`, `text`, `unicode`, `emoji`, `aesthetic`, `bio`) vs other-intent words (`meaning`, `definition`, `logo`, `supported`, `what is`). This catches outright mismatches.

**Layer 2 — SERP composition (the decider; your "who ranks page 1" idea).** For the head queries driving impressions, look at the *type* of domains on page 1. This both confirms intent and reveals the competitive bar. Three patterns:

- **A · Tool sites dominate** → copy-paste intent confirmed *and* competitors are beatable → it's a **ranking gap** → WORK ON IT (depth, on-page SEO, internal links).
- **B · Authority/reference sites dominate** (dev-docs, Wikipedia, Emojipedia) → intent may match but the bar is an **authority wall** → low ROI unless we have a real differentiation angle.
- **C · Mixed / definition sites present** → the head term is partly **not** copy-paste intent → only the copy-paste sub-queries are addressable; expect a lower CTR ceiling.

### Layer 1 result — query-intent fingerprint (pages ≥70 impr)

`copy%` = share of impressions from copy-paste-intent queries; `other%` = meaning/logo/etc.

| Page | Impr | Clicks | copy% | other% | Layer-1 read |
|---|---:|---:|---:|---:|---|
| `emoji-combos` | 5948 | 44 | 100% | 0% | Matched intent, converting → CTR tune |
| `y2k-symbols` | 2755 | 57 | 100% | 0% | Matched intent, converting → CTR tune |
| `roblox-symbols` | 2731 | 135 | 98% | 1% | Matched intent, converting → CTR tune |
| `discord-symbols` | 2215 | 50 | 100% | 0% | Matched intent, converting → CTR tune |
| `neymar-emoji-combos` | 1355 | 7 | 100% | 0% | Matched intent, converting → CTR tune |
| `slash-backslash-symbols` | 414 | 0 | 99% | 1% | Matched intent, 0 clicks → rank/CTR (needs Layer 2) |
| `html-entities` | 326 | 0 | 100% | 0% | Matched intent, 0 clicks → rank/CTR (needs Layer 2) |
| `sad-emoji` | 188 | 0 | 100% | 0% | Matched intent, 0 clicks → rank/CTR (needs Layer 2) |
| `greek-letter-symbols` | 166 | 0 | 98% | 2% | Matched intent, 0 clicks → rank/CTR (needs Layer 2) |
| `flower-symbols` | 159 | 0 | 100% | 0% | Matched intent, 0 clicks → rank/CTR (needs Layer 2) |
| `emoji-flags` | 157 | 0 | 100% | 0% | Matched intent, 0 clicks → rank/CTR (needs Layer 2) |
| `instagram-symbols` | 146 | 3 | 90% | 5% | Matched intent, converting → CTR tune |
| `email-symbols` | 143 | 2 | 99% | 0% | Matched intent, converting → CTR tune |
| `cross-x-symbols` | 142 | 0 | 100% | 0% | Matched intent, 0 clicks → rank/CTR (needs Layer 2) |
| `x-twitter-symbols` | 138 | 0 | 83% | 15% | Partly mismatched — inspect tail |
| `coquette-symbols` | 135 | 0 | 100% | 0% | Matched intent, 0 clicks → rank/CTR (needs Layer 2) |
| `ronaldo-emoji-combos` | 118 | 2 | 100% | 0% | Matched intent, converting → CTR tune |
| `chess-symbols` | 93 | 1 | 100% | 0% | Matched intent, converting → CTR tune |
| `ascii-table` | 87 | 0 | 100% | 0% | Matched intent, 0 clicks → rank/CTR (needs Layer 2) |
| `fortnite-symbols` | 85 | 4 | 100% | 0% | Matched intent, converting → CTR tune |
| `dash-hyphen-symbols` | 74 | 0 | 99% | 1% | Matched intent, 0 clicks → rank/CTR (needs Layer 2) |
| `bow-ribbon-symbols` | 72 | 0 | 100% | 0% | Matched intent, 0 clicks → rank/CTR (needs Layer 2) |

> Layer 1 alone can't split **ranking** from **CTR** — that needs each query's *average position*, which this export lacks. Re-export the same GSC report with the **Average Position** column to bucket mechanically: pos 1–8 + low CTR = snippet/title problem; pos 9–30 = ranking problem (then Layer 2 says if it's winnable).

### Layer 2 result — SERP samples (Jun 2026)

Four pages that look identical in GSC (~135–414 impr, 0% CTR) split cleanly once you read the SERP:

| Query | Page-1 domain mix | Pattern | Verdict |
|---|---|---|---|
| `coquette symbols` | emojicombos, emojidb, aestheticcombos, symbolcombos, Pinterest | A · tool sites | **Winnable ranking fix — work on it** |
| `flag emoji` | Emojipedia, EmojiTerra, Flagpedia, iEmoji | B · emoji authorities | Copy-paste intent, but authority wall — medium-hard |
| `html entities` | W3Schools, MDN, GeeksforGeeks, php.net, Codecademy | B · dev-doc authorities | Developer intent + authority wall — **deprioritize** |
| `slash symbol` | Wikipedia, byjus, testbook, WMU + emojicombos, symbolsdb | C · mixed/definition | Head term half grammar-definition — target copy-paste sub-queries only, low ceiling |

**Takeaway for the top-20:** most of the 0%-CTR cluster is matched copy-paste intent (Layer 1 ≥98% copy), so the problem is overwhelmingly **ranking**, not intent. Prioritise the Pattern-A pages (tool-site SERPs we can beat — e.g. `coquette-symbols`, `bow-ribbon-symbols`, `flower-symbols`); treat dev/reference-authority pages (`html-entities`, `ascii-table`, `alt-codes`) as low-ROI; and for mixed-intent head terms (`slash symbol`, `greek letters`) write for the copy-paste sub-queries rather than the ambiguous head.

---

## 5. Position-resolved diagnosis (added 2026-06-29, *supersedes the §2 ranking*)

With the **Average Position** column added (`Query___Position___29th_June.csv`), ranking and CTR separate mechanically. This **overturns part of §2**: several pages I'd flagged as low-CTR are actually on page 1 and just under-clicking (snippet fixes), while others are page 3–6 where 0% CTR is *expected* and no title tweak helps until they rank.

**Rule:** impression-weighted avg position per page → `copy% < 60` = **INTENT**; else `pos > 10.5` (page 2+) = **RANKING**; else on page 1 but actual clicks < 50% of position-expected = **CTR/SNIPPET**; else OK. (`gsc_avg_position` is now a column in `data/library_opportunities.csv`.)

Bucket counts (pages ≥20 impr): **38 RANKING · 8 CTR/SNIPPET · 8 OK · 1 INTENT.** Ranking is the most common issue, but the snippet pages hold the biggest *absolute* click upside because they already sit on page 1.

### Tier 1 — CTR / snippet quick wins (already on page 1, under-clicking)

Fix = rewrite `<title>` + meta description (and add/repair rich-result markup). High confidence, immediate, no ranking work needed. `+clk*` = extra clicks/3mo if CTR reached position-normal.

| Page | Impr | Clicks | CTR | Avg pos | +clk* (3mo) | In backlog? |
|---|---:|---:|---:|---:|---:|---|
| `emoji-combos` | 5,948 | 44 | 0.7% | 7.7 | **+157** | no — add row |
| `y2k-symbols` | 2,755 | 57 | 2.1% | 6.3 | +65 | yes (OPP-0137) |
| `discord-symbols` | 2,215 | 50 | 2.3% | 6.5 | +59 | yes (OPP-0064) |
| `neymar-emoji-combos` | 1,355 | 7 | 0.5% | 7.6 | +43 | no — add row |
| `coquette-symbols` | 135 | 0 | 0.0% | 7.3 | +5 | yes (OPP-0134/0240) |
| `arrow-symbols` | 55 | 0 | 0.0% | 6.9 | +4 | yes (OPP-0023/0024) |
| `ronaldo-emoji-combos` | 118 | 2 | 1.7% | 6.9 | +3 | no — add row |
| `argentina-emoji-combos` | 41 | 0 | 0.0% | 7.6 | +1 | no — add row |

> **Highest-ROI action on the whole property:** rewrite the title/meta on `emoji-combos` and its family (`neymar`/`ronaldo`/`argentina-emoji-combos`) — page-1 positions, ~200 missed clicks/quarter combined, and none of them are in the improve-existing backlog yet.

### Tier 2 — Ranking builds (page 2+; need depth / internal links / authority)

0% CTR here is structural (you can't be clicked from page 3). Fix = content depth + internal links; then re-check. Apply the §4 Layer-2 SERP test to sort *winnable* from *authority walls* before investing.

| Page | Impr | Clicks | Avg pos | SERP read (where sampled) |
|---|---:|---:|---:|---|
| `slash-backslash-symbols` | 414 | 0 | 32.8 | §4-C mixed (Wikipedia+grammar) — target copy-paste sub-queries |
| `html-entities` | 326 | 0 | 57.4 | §4-B dev-doc wall (W3Schools/MDN) — **deprioritize** |
| `sad-emoji` | 188 | 0 | 14.6 | closest to page 1 — combos/kaomoji family; sample SERP |
| `greek-letter-symbols` | 166 | 0 | 50.9 | heavy competition (Wikipedia/RapidTables); sample |
| `flower-symbols` | 159 | 0 | 43.9 | likely tool-site SERP (winnable); sample |
| `emoji-flags` | 157 | 0 | 58.1 | §4-B Emojipedia wall — low ROI |
| `cross-x-symbols` | 142 | 0 | 11.7 | just off page 1 — nearest ranking win |
| `email-symbols` | 143 | 2 | 25.0 | needs_review row; sample SERP |
| `ascii-table` | 87 | 0 | 66.6 | reference-authority wall — low ROI |
| `fortnite-symbols` | 85 | 4 | 13.4 | page-2 top, gaming intent — winnable |

**Net recommendation:** do all of Tier 1 first (fast title/meta rewrites, biggest absolute gain), starting with the `emoji-combos` family; in parallel add backlog rows for the four combos pages that are missing them. Then attack Tier 2 in two passes — first the near-page-1 pages (`cross-x-symbols` pos 11.7, `fortnite` 13.4, `sad-emoji` 14.6), then SERP-test the deeper ones and skip the authority walls (`html-entities`, `emoji-flags`, `ascii-table`).
