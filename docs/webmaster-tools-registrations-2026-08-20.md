# Webmaster tools registrations

Record of search-engine webmaster-tools accounts registered for
`ultratextgen.com`, how ownership was verified, and what's been submitted
to each. Kept so a future session doesn't have to reverse-engineer why a
verification tag or root-level file exists, or re-discover whether a
sitemap has already been submitted somewhere.

## Naver Search Advisor (added 2026-08-20)

- **Registered:** https://searchadvisor.naver.com, site `https://ultratextgen.com`.
- **Ownership verification method:** HTML file upload (Naver's recommended
  method — the alternative HTML-tag method was offered but not used).
- **Verification file:** `/naverfc08aab480545cfd1d61489b3536a5e6.html`
  (repo root, static asset — shipped in
  [PR #793](https://github.com/ychowdhrey/ultratextgen/pull/793)).
  Not intercepted by `functions/_middleware.js` (scoped to `/` only via
  `_routes.json`) or by the `_redirects` catch-all, since Cloudflare Pages
  resolves an exact static-file match before either.
- **Verified:** 2026-08-20, confirmed live via Naver's "Verify Ownership"
  check after the PR merged and Cloudflare's deploy caught up.
- **Sitemap submitted:** `sitemap.xml` (full URL
  `https://ultratextgen.com/sitemap.xml`), via Search Advisor's
  Request → Submit sitemap tool. Registration timestamp shown in Naver's
  own UI: `26.08.20 23:05:00`. This is the same auto-generated sitemap
  `update-sitemap.yml` regenerates daily — no separate Naver-specific
  sitemap was created.
- **Not yet done:** no per-URL "Web page collection" (crawl) requests have
  been submitted — that's Naver's per-URL immediate-crawl tool, separate
  from sitemap submission, and wasn't part of this pass.
- **Scope note:** Naver's crawler has no `hreflang` handling of its own;
  submitting the sitemap does not selectively promote `ko/` (or any other
  locale) content — it's the same flat multi-locale sitemap every other
  registered search engine gets.

## Google Search Console (confirmed live 2026-08-20)

- **Status:** confirmed registered and actively collecting data — user
  screenshot of the Performance report shows real query/click data (73
  clicks, Jul 18–Aug 20 window; top queries include several Russian-language
  Discord-symbol terms).
- **Verification method: unknown.** No `google-site-verification` meta tag
  exists anywhere in this repo's HTML, so verification is not via the
  HTML-tag method — most likely a DNS TXT record, or ownership inherited
  through a linked Google Analytics/Tag Manager property (GTM-P55HXK8Q is
  already wired site-wide per this file's own SEO section). Either method
  leaves no trace in the codebase, which is why this wasn't already
  documented. Not something to "fix" — just noting why no matching tag will
  ever be found here.
- **Sitemap-submission status: not confirmed.** Worth checking directly in
  GSC's Sitemaps report next time someone's in there, same as the
  outstanding Yandex question below.

## Bing Webmaster Tools (confirmed live 2026-08-20)

- **Status:** confirmed registered and collecting data — user-provided
  query-performance export (`Query` + 7 daily columns, Aug 12–18 2026, 79
  tracked queries) shows real but thin volume: 9 total impressions/clicks
  across the week, concentrated on the branded query `ultratextgen`
  (1/3/1/1 across four of the seven days) plus long-tail informational
  queries (`redacted text`, `unicode font generator`, etc.) at zero.
- **Verification method: unknown**, same situation as Google Search
  Console — no `msvalidate.01` meta tag exists anywhere in the repo's
  HTML. Most likely explanation: Bing Webmaster Tools' one-click "import
  sites from Google Search Console" OAuth flow, which needs no HTML/DNS
  trace and would explain both GSC and Bing being live with nothing to
  find in the codebase.
- **Read on the thin volume:** not a red flag by itself — Bing typically
  trails Google's crawl depth/speed for a site this size, and this may be
  a recently-completed verification still catching up. Worth checking
  directly in Bing Webmaster Tools whether `sitemap.xml` has actually been
  submitted there (the GSC-import flow does not automatically submit a
  sitemap) and whether URL Submission / IndexNow is enabled — Cloudflare
  and Bing both support IndexNow, which would meaningfully speed up
  crawling if it isn't already wired up.

## Other search engines considered, not pursued (2026-08-20)

Evaluated against this site's actual 30-locale footprint (`ar bs cs da de
es fi fr hi hr hu id it ja ko ms nl no pl pt ro ru sk sr sv th tl tr vi
zh-tw`, per `data/locale_qualification_tiers.json`) rather than a generic
"other search engines" list, so this doesn't get re-litigated from
scratch next time it comes up:

- **Yahoo Japan — skip, would be redundant.** Yahoo Japan has run on
  Google's search backend since 2010; as of mid-2026 Google's *effective*
  reach in Japan (direct + via Yahoo Japan) is ~97% of mobile search.
  There is no separate organic-indexing webmaster console to register
  with — ranking in Google Search Console already covers it. (Yahoo Japan
  does have its own tools, but they're for its ad platform, not organic
  search.) [Silkdrive: Search Engines in Japan
  2026](https://www.silkdrive.com/insights/search-engines-in-japan) |
  [switchitmaker2: Google vs Yahoo Japan search
  behavior](https://www.switchitmaker2.com/en/seo/japan-search-behavior/)
  — **Notable finding surfaced while checking this:** Bing has surged to
  **32.07% of Japan's search market as of July 2026** (up from under 8%
  in early 2025). That's a real, recent shift, not a rounding error —
  makes the Bing registration above meaningfully more valuable for the
  `ja/` locale than "Bing is a small player" would suggest.
- **Thailand — skip, no independent engine exists to register with.**
  Google holds ~99.56% of Thai search (StatCounter, Feb 2026); Bing sits
  at 0.35%. There is no Thai-market search engine with its own webmaster
  console the way Naver (Korea) or Yandex (Russia) have one — "search
  engine in Thailand" and "Google in Thailand" are effectively synonyms.
  [Statcounter: Thailand search engine market
  share](https://gs.statcounter.com/search-engine-market-share/all/thailand)
- **Seznam.cz (Czech Republic) — real option, deliberately not pursued
  yet.** Seznam is a genuinely independent Czech search engine (~11–16%
  local market share) with its own Seznam Webmaster Tools (sitemap
  submission, indexing/crawl-issue reports)
  — [Page One Formula: Understanding
  Seznam](https://pageoneformula.com/understanding-seznam-seo-in-the-czech-republic/).
  Not registering now because `cs` is Tier 3 (`hold-stub`) in
  `data/locale_qualification_tiers.json` with **zero keyword volume ever
  pulled** for the locale — registering a webmaster tool for a locale
  whose own content investment hasn't been decided would be getting ahead
  of the site's own governance. Revisit alongside any future `cs`
  promotion decision, not before it.
- **Cốc Cốc (Vietnam) — low confidence, not recommended.** Cốc Cốc is a
  real Vietnamese browser+search product, but its own search relevance
  has declined sharply from a 2017 peak (~32.5% desktop share) to a small
  single-digit share by 2024, increasingly eclipsed by Chrome/Google — see
  [Marketing Vietnam: Cốc Cốc vs Google in
  Vietnam](https://www.marketingvietnam.net/coc-coc-vs-google-in-vietnam-a-comprehensive-comparison-of-market-share-use-cases-and-audiences/).
  Unlike Seznam, no independent webmaster-tools portal for it could be
  confirmed via search. `vi` is a live, actively-invested Tier 2 locale
  here (recovered to 109,278 impressions/3,436 clicks per an earlier
  internal analysis) — so this is worth a direct manual check on
  Cốc Cốc's own site if/when someone's looking at Vietnam specifically,
  but not a confident recommendation the way Seznam is.
- **Everything else people commonly ask about (DuckDuckGo, Ecosia,
  Qwant, Brave Search, Startpage, Sogou/360)** either has no
  separate-from-Bing/Google index worth targeting, or (Sogou/360, same as
  Baidu above) requires Simplified Chinese content this site doesn't
  have. None have a distinct webmaster/verification console that would
  change anything already covered by Google + Bing + Yandex + Naver.

## Other existing registrations (found already live in `index.html`, no
prior record of when/how — recorded here so they're not lost twice)

- **Yandex:** `<meta name="yandex-verification" content="aa326290e0338f4f">`
  — present since at least PR #740 (2026-08-xx baseline); no dedicated doc
  or PR could be found that introduced it.
  **Confirmed live and actively indexing (2026-08-20)**, via two
  user-provided Yandex Webmaster "Search query statistics" exports:
  - A monthly top-query export, **Feb 2025 – Jul 2026 (18 months)** — proof
    Yandex has been crawling and serving this site's `/ru/` pages for well
    over a year, not just since this doc's original writing.
  - A full daily query export, **Aug 5–18 2026, 4,792 distinct queries** —
    matches the Webmaster UI's own summary for the same window (20,669
    impressions / 732 clicks / 3.54% CTR / avg. position 8.14).
  - Traffic is overwhelmingly `/ru/library/*` and `/ru/symbol/*` (e.g.
    `символы для дискорда` → `/ru/library/simvoly-discord/`, `нижнее
    подчеркивание` → `/ru/symbol/nizhnee-podcherkivanie/`), plus a few EN
    pages (`/library/text-art/`, `/library/aesthetic-symbols/`,
    `/library/coquette-symbols/`) also pulling Russian-language query
    volume.
  - **Sitemap-submission status still not directly confirmed** — these are
    query-performance exports, not the Sitemaps report; the sustained
    18-month crawl history makes it very likely indexing is healthy either
    way, but the Sitemaps page itself hasn't been checked.
- **Pinterest domain verification:**
  `<meta name="p:domain_verify" content="b2362cbc0f13ddea34e632da9bc7df05"/>`
  — same as above, present since at least PR #740, origin undocumented.
  (Distinct from the Pinterest pin-upload pipeline in
  `docs/pinterest-pin-generation.md` / `docs/pinterest-r2-migration.md`,
  which is about pin content, not domain ownership.)
