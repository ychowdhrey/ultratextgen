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

## Other existing registrations (found already live in `index.html`, no
prior record of when/how — recorded here so they're not lost twice)

- **Yandex:** `<meta name="yandex-verification" content="aa326290e0338f4f">`
  — present since at least PR #740 (2026-08-xx baseline); no dedicated doc
  or PR could be found that introduced it. No sitemap-submission status
  known.
- **Pinterest domain verification:**
  `<meta name="p:domain_verify" content="b2362cbc0f13ddea34e632da9bc7df05"/>`
  — same as above, present since at least PR #740, origin undocumented.
  (Distinct from the Pinterest pin-upload pipeline in
  `docs/pinterest-pin-generation.md` / `docs/pinterest-r2-migration.md`,
  which is about pin content, not domain ownership.)
