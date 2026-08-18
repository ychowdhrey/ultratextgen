# Google Search Traffic Incident — Crawl Evidence

**Date recorded:** 2026-08-18  
**Incident window:** approximately 2026-08-14 to 2026-08-18  
**Source:** Google Search Console Crawl Stats exports reviewed on 2026-08-18

## Why this note exists

UltraTextGen experienced a sudden major decline in Google Search traffic. This note records the crawl evidence so future diagnosis does not repeatedly reopen infrastructure hypotheses that the current data makes unlikely.

The crawl evidence does **not** show Googlebot losing access to UltraTextGen. Google continues to crawl the site heavily and receives successful responses almost all of the time.

## Crawl volume

Latest daily crawl requests available in the export:

| Date | Crawl requests |
|---|---:|
| 2026-08-12 | 1,672 |
| 2026-08-13 | 2,055 |
| 2026-08-14 | 1,742 |
| 2026-08-15 | 1,530 |

The report exported on August 18 currently contains crawl data only through August 15, so August 16–18 cannot yet be evaluated from this dataset.

Historical crawl intensity increased substantially before the incident:

| Period | Approx. average crawls/day |
|---|---:|
| 2026-05-19 to 2026-06-15 | ~60 |
| 2026-06-16 to 2026-07-15 | ~410 |
| 2026-07-16 to 2026-08-15 | ~1,481 |

Google was therefore crawling UltraTextGen far more heavily in the month leading into the traffic decline than during May and June.

## Response health

Approximate response distribution from the GSC crawl export:

| Response | Share |
|---|---:|
| HTTP 200 | 98.77% |
| HTTP 404 | 0.72% |
| HTTP 301 | 0.50% |
| HTTP 5XX | ~0% |
| Host/page unreachable | ~0% |

GSC also reports no host availability problem.

### Interpretation

There is currently no evidence of a site-wide server failure, Cloudflare block, hosting outage, or Googlebot reachability failure sufficient to explain an approximately 80–90% search traffic decline.

This does not prove every URL is technically correct. It does substantially reduce the probability that the incident was caused by Google being unable to crawl the site.

## Crawl purpose

Overall crawl purpose:

| Purpose | Share |
|---|---:|
| Refresh | 83.96% |
| Discovery | 16.04% |

Daily examples:

| Date | Refresh | Discovery |
|---|---:|---:|
| 2026-08-13 | ~1,640 | ~415 |
| 2026-08-14 | 1,612 | 130 |
| 2026-08-15 | 1,427 | 103 |

August 13 showed a temporary discovery spike before returning closer to ~100 discovery requests/day.

### Interpretation

Google is continuing to revisit known UltraTextGen URLs at substantial scale. Discovery is noisier and lower than refresh, but the current figures are not evidence that Google abandoned crawling or discovery altogether.

## Incident diagnosis impact

The evidence currently supports the following diagnostic update:

> Google can access UltraTextGen, is actively crawling it, and receives overwhelmingly successful responses, while Google Search traffic has fallen sharply.

This shifts the investigation away from basic crawl availability and toward the next stages of the search pipeline:

**Crawling → Indexing → Ranking/Serving → Traffic**

Crawling presently appears healthy. The failure is more likely to exist downstream.

### Hypotheses reduced by this evidence

1. Cloudflare broadly blocking Googlebot
2. Origin/hosting outage preventing crawling
3. Site-wide 5XX regression
4. robots or infrastructure condition causing Googlebot to lose access to most of the site
5. GitHub availability alone causing the search collapse

These are not mathematically impossible, but the current crawl evidence makes them poor primary explanations.

### Hypotheses that remain open

1. **Ranking suppression / ranking reassessment** — URLs remain crawlable but Google substantially reduces their rankings.
2. **Indexing or serving-index change** — URLs remain known and crawlable but are removed from, or less frequently selected by, the serving index.
3. **Algorithmic / site-quality reassessment** — Google reevaluates the domain, templates, scaled content, duplication, intent satisfaction, or other quality signals.
4. **Canonicalization or hreflang issue** — crawling succeeds while Google consolidates or interprets URLs differently.
5. **Deployment regression downstream of crawling** — metadata, canonical, rendering, internal-link, sitemap, or indexability changes that do not cause crawl failure.
6. **Template-, locale-, or query-class-specific suppression** rather than a pure site-wide technical outage.

## Important observation around the incident

Crawling did not collapse immediately before the traffic decline:

* Aug 12: 1,672 requests
* Aug 13: 2,055 requests
* Aug 14: 1,742 requests
* Aug 15: 1,530 requests

Google was therefore crawling aggressively around the same period in which search visibility deteriorated.

This pattern is **consistent with**, but does not prove, a large-scale reassessment. Crawl intensity by itself must not be treated as evidence of an algorithmic penalty.

## Next diagnostic branch

The highest-value next evidence is the **GSC Page Indexing** report.

The next audit should determine whether the traffic collapse represents:

1. Pages remaining indexed but losing rankings
2. Large-scale deindexing
3. Google selecting different canonicals
4. A rise in `Crawled - currently not indexed`
5. A rise in `Discovered - currently not indexed`
6. Locale/hreflang clustering changes
7. A serving/ranking change despite stable indexation

The audit should compare affected and surviving pages rather than relying only on domain-level totals.

## Working conclusion as of 2026-08-18

**Crawl access: healthy based on available evidence.**  
**Infrastructure outage as primary cause: low probability.**  
**Primary investigation focus: indexing, canonicalization, serving/ranking, and algorithmic/site-quality reassessment.**

Do not make broad infrastructure changes merely to restore Googlebot access unless new evidence contradicts the crawl data above.
