# Direction Audit — PRs vs. Results (2026-06-27)

Audits whether shipped effort (PRs/commits) has been pointed at where the
results actually are. Each work-stream is graded:

- **(a) Match** — the PR direction matches where results are coming from.
- **(b) Mismatch direction** — effort was spent, but not where the results are.
- **(c) Mismatch effort** — this should have been the focus, but little/no effort went in.

**Data sources**
- Google Search Console, 2026-03-27 → 2026-06-25 (Chart, Queries, Pages, Countries, Devices).
- GA4 Pages & screens, 2026-05-30 → 2026-06-26.
- `git log` (merged PRs / feature commits), 2026-05-01 → 2026-06-27.

---

## TL;DR verdict

The site has **one engine and three solid cylinders**, and most recent build
effort went somewhere else entirely.

- **The engine is Indonesian "tulisan/huruf aesthetic"** (`/id/`). It is the
  #1 page on every metric: 4,595 GSC clicks / 92,521 impressions, 24,414 GA4
  views. Indonesia is the #1 country (4,737 clicks).
- **The cylinders** are `/discord/`, `/usecase/vertical-text/`, and the
  Snapchat / comment-font / roblox-symbols cluster.
- **The biggest single effort sink — ~244 FIFA/football/soccer library
  pages (now 107 of 249 library pages, 43% of the catalog) — returns under
  1% of clicks.** This is the headline mismatch.
- **The biggest neglected opportunity is Discord informational demand**:
  88,111 impressions at 2.82% CTR, plus a wall of high-impression /
  zero-click "discord nitro / unicode / allowed characters" queries that no
  current page is converting.

Net: traffic grew ~10× in this window (June inflection: impressions went from
~400/day to 2,000–3,500/day), but that growth is riding the Indonesian +
Discord + vertical-text demand that was *already* there — not the football /
Pinterest work that consumed most PRs.

---

## Where the results actually are

### Top pages (GSC clicks)
| Page | Clicks | Impr | CTR | Pos |
|---|---|---|---|---|
| `/id/` | 4,595 | 92,521 | 4.97% | 5.25 |
| `/discord/` | 2,484 | 88,111 | 2.82% | 6.97 |
| `/usecase/vertical-text/` | 1,129 | 20,490 | 5.51% | 6.0 |
| `/` (home) | 646 | 10,308 | 6.27% | 5.66 |
| `/snapchat/` | 499 | 9,037 | 5.52% | 6.31 |
| `/usecase/comment-font/` | 385 | 5,136 | **7.50%** | 5.84 |
| `/library/roblox-symbols/` | 284 | 5,894 | 4.82% | 7.07 |
| `/tiktok/` | 270 | 8,117 | 3.33% | 6.92 |
| `/es/` | 254 | 3,513 | 7.23% | 5.83 |

### Top query clusters
- **Indonesian aesthetic** is the whole top of the table: `tulisan aesthetic`
  (1,389 clicks), `huruf aesthetic` (832), `tulisan estetik` (345),
  `tulisan keren aesthetic`, `huruf estetik`, `font aesthetic huruf`… This one
  cluster dwarfs everything else.
- **Vertical / stacked text**: `vertical font generator`, `stacked text
  generator`, `stacked text`.
- **Comment styling**: `comment text style`, `comment font style` — tiny
  volume, exceptional CTR (24–32%).
- **Discord**: a split personality — converting tool queries (`discord display
  name styles`, `how to change discord name font`) **plus** a giant bank of
  **zero-click informational** queries (see §(c)).
- **Snapchat**: `snapchat text generator`, `snapchat font`, `snapchat sans`.

### Geography / device
- **Indonesia #1** (4,737 clicks), then US, India, Philippines, UK. Localized
  pages that exist already pull real clicks: `/es/` 254, `/pl/` 101, `/fr/` 89,
  `/it/` 79, `/pt/` 53, `/vi/` 47, `/de/` 26.
- **Mobile is the business**: 9,379 clicks @ 5.18% CTR vs desktop 2,370 @ 1.85%.

---

## Where the effort actually went (May–Jun PRs)

Ranked roughly by volume of commits/PRs:

1. **FIFA World Cup / football / soccer library** — ~244 pages (batch-17
   Phases 1–7: player emoji-combos, 30 nation combos, football fonts). The
   single largest build.
2. **Pinterest pin infrastructure** — ~15 PRs: Spanish/vertical/ID/Discord/
   Roblox/gaming-names boards, World Cup pins, CSV pipeline + conventions.
3. **Library SEO sections + dedup + presentation_class audits** — batches 1–5,
   reconciliation across 248 pages.
4. **Strategy / infra docs** — distribution-loops, image-backlink, JTBD specs,
   taxonomy, weekly infra reviews, opportunity backlogs.
5. **Indonesian `/id/` expansion** — simbol, A–Z huruf, tulisan-estetik
   cluster, angka 0–9, tulisan-keren section (~4 commits).
6. **Gaming-name / nickname JTBD pages** — FF guild, ML squad, clan-tag,
   nickname generators (recent).
7. **Spanish `/es/` expansion** — abecedario A–Z + símbolos (~1 page commit).

The ordering is almost the inverse of the results table.

---

## Classification

### (a) MATCH — keep doing this
| Work-stream | Why it matches |
|---|---|
| **`/id/` Indonesian expansion** | Directly feeds the #1 engine (4,595 clicks). Every section added here is aimed at the largest, fastest-growing demand. **Correct — but under-weighted** relative to football (see below). |
| **`/es/` page expansion** | `/es/` = 254 clicks @ 7.23% CTR and rising; `letras bonitas y símbolos` etc. are real. Small effort, real return — the localization playbook works. |
| **Vertical-text feature (earlier)** | `/usecase/vertical-text/` is the #3 page (1,129 clicks). The feature investment is paying off; worth continued depth. |

### (b) MISMATCH DIRECTION — effort spent, results didn't follow
| Work-stream | Result | Read |
|---|---|---|
| **244 FIFA/football/soccer library pages** | Best page (`neymar-emoji-combos`) = 33 clicks; the vast majority sit at 0–2 clicks. The whole cohort (107 pages, **43% of the library**) is **<1% of total clicks.** | The largest build of the period produced almost no organic return. Search volume/intent was assumed, not demonstrated. **Stop expanding; prune the thinnest; do not replicate this pattern.** |
| **Pinterest pin pipeline (massive)** | `/pinterest/` page: 0 clicks / 13 impressions. No visible Pinterest-driven lift in this GSC/GA4 window. | Off-platform channel, so partly invisible to GSC — but ~15 PRs of pipeline/board/CSV churn with **no measurable traffic return in the data we have.** Treat as unproven; gate further pin work behind a demonstrated referral number, not pin count. |
| **Gaming-name generators (FF guild / ML squad / clan-tag / nickname)** | `/roblox/name-generator/` 4 clicks; new `/id/usecase/nama-*` pages in low single digits of GA4 views. | Too new to fully judge, but currently negligible. Don't scale the pattern until one of these proves intent. |

### (c) MISMATCH EFFORT — should have been the focus, but wasn't
| Missed focus | Evidence | Opportunity |
|---|---|---|
| **Discord informational content + CTR** | `/discord/` = 88,111 impr @ only **2.82%** CTR (vs 5%+ on peers). Plus a zero-click query wall: `/answers/discord-allowed-characters/` **2,568 impr / 0 clicks**, `/answers/do-you-need-nitro-for-discord-fonts/` **1,108 impr / 0 clicks**, and dozens of "discord nitro required for unicode…" queries at position 3–6 with 0 clicks. | This is the **second-biggest demand pool on the site and the most under-converted.** Rewriting Discord titles/meta for CTR and building genuinely answer-shaped content for the nitro/unicode/allowed-character questions is the highest-ROI work available — and it got almost no recent PRs. |
| **CTR rescue on high-impression winners** | `bio-font` 6,538 impr @ 2.10%, `linkedin` 6,015 @ 2.04%, `library/emoji-combos` 6,245 @ **0.77%**, `usecase/zalgo-text` 4,066 @ 0.93%. | These already rank (pos 6–8) and already get impressions. Title/snippet rewrites convert existing impressions to clicks with near-zero build cost. No effort went here. |
| **Replicating localization to proven languages** | Existing localized pages already convert: `/pl/` 101, `/fr/` 89, `/it/` 79, `/pt/` 53, `/vi/` 47. India is the #3 country (757 clicks) with **no Hindi page.** Brazil/Poland/Germany/Italy all show 4-figure impressions. | The `/id/`→`/es/` playbook is the only thing with a proven multiplier. Pointing the football-page energy at deepening `/id/` and standing up the next localized pages (Hindi, deeper pt/pl/fr/it) is the obvious reallocation. |
| **Snapchat depth** | `/snapchat/` 499 clicks @ 5.52% CTR, strong query set (`snapchat sans`, `snapchat text generator`), but little recent investment. | A working cylinder left idle. |

---

## Recommended reallocation (next batch)

1. **Freeze new football/soccer pages.** Prune the thinnest into hubs;
   reclaim the build budget.
2. **Make Discord the focus.** (a) CTR-rewrite `/discord/` title+meta; (b)
   build real answer pages for the nitro / unicode / allowed-characters query
   bank that currently earns thousands of zero-click impressions.
3. **CTR sweep** on `bio-font`, `linkedin`, `emoji-combos`, `zalgo-text` —
   snippet/title rewrites only, no new pages.
4. **Double down on `/id/`** and ship the next localized page (**Hindi** —
   India is the #3 country with no page), reusing the `/es/` template.
5. **Gate Pinterest** behind a real referral metric before any further pin
   batches.

**One-line summary:** the data says *localize + convert Discord*; the recent
PRs said *build 244 football pages + Pinterest pins*. Repoint the effort at
the engine.
