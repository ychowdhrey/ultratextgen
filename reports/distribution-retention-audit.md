# UltraTextGen — Distribution & Retention Audit

_Generated: 2026-06-28. Advisory only — this audit changes no product code._

> **Distribution** = how the site gets discovered, shared, and pulls in new traffic.
> **Retention** = what brings users back and keeps them engaged once they arrive.
>
> Live traffic/keyword data (Semrush) was unavailable at audit time (API units
> exhausted), so all findings below are derived from the codebase as of
> 2026-06-28. Numbers like "expected lift" are directional, not measured.

---

## 1. Executive Summary

UltraTextGen is **strong on top-of-funnel distribution** (SEO scaffolding,
~360 indexed pages, 11 languages, sitemap automation, Pinterest/tweet pipelines)
but **thin on the two ends that compound growth**: viral/share loops at the
moment of value, and retention infrastructure that earns a second visit.

| Area | Maturity | One-line verdict |
|---|---|---|
| On-page SEO (meta, canonical, OG/Twitter) | ★★★★★ | Comprehensive and consistent |
| Structured data (JSON-LD) | ★★★★☆ | Robust; coverage gaps on library pages |
| Sitemap / robots / redirects | ★★★★★ | Automated, well-configured |
| i18n / hreflang | ★★★★☆ | 11 langs wired; translation completeness unverified |
| Internal linking | ★★★☆☆ | Good footer/header; weak inline contextual links |
| Share / viral loops | ★☆☆☆☆ | No share buttons; only manual `?q=` URL |
| Saved styles (favorites) | ★★★☆☆ | Exists, but it's the *only* return hook |
| PWA / installability | ☆☆☆☆☆ | None |
| Email / push / off-site re-engagement | ☆☆☆☆☆ | None |
| Return-visit / fresh-content hooks | ★☆☆☆☆ | None user-facing |
| Analytics depth | ★★☆☆☆ | GTM + ~7 copy/save events; funnel blind spots |

**The single biggest leverage point:** the moment a user copies styled text is
the moment of peak intent — and right now nothing captures it for distribution
(no share CTA) or retention (no install/save prompt, no re-engagement). Both
audits converge on this.

---

## 2. Current State — Distribution

**What's working (don't touch):**
- Canonical URLs, titles, meta descriptions, OpenGraph + Twitter cards on all sampled pages (`index.html:17–50`, `discord/index.html:16–30`).
- JSON-LD: WebSite+SearchAction, Organization, WebApplication, FAQPage, Article, BreadcrumbList (`index.html:56–115`, `guide/vertical-text-guide/index.html:39–86`).
- Auto-generated sitemap with priority/changefreq logic (`scripts/update-sitemap.js:49–69`), daily at 00:00 UTC.
- `robots.txt` allows AI crawlers (GPTBot, ClaudeBot, Google-Extended) and declares the sitemap.
- Mature redirect strategy: www→apex, trailing-slash, legacy 301s, `?lang=` → locale path (`_redirects`).
- hreflang for 11 locales + x-default on every page (`index.html:22–33`, `fr/index.html:21–32`).
- Commit→social pipeline (`scripts/tweet_queue.py`, confidence ≥0.72) and multi-board Pinterest generation.
- ~360 `index.html` pages: 15 platform, 20 category, 13 usecase, 9 guide, 249 library, 12 answers, 10 locale homepages, 1 embed.

**Gaps:**
- **No social share buttons** anywhere. Sharing requires manually copying the URL. The `?q=` param exists (`script.js:932–938`) but nothing surfaces it.
- **Weak inline/contextual internal linking** — cross-linking lives almost entirely in the footer; guide/answer body copy doesn't link to related styles or tools.
- **JSON-LD coverage unverified on 249 library pages** — the largest page class.
- **Tweet pipeline is half-automated** — it posts to a GitHub Issue; a human still has to tweet.
- **i18n translation completeness unverified** across all page types (risk of thin/duplicate localized pages, which can hurt rather than help).
- Only Google AdSense in `ads.txt`.

---

## 3. Current State — Retention

**What's working:**
- **Saved styles** (`script.js:224–291`, key `utg_saved_styles`) — star to save, persisted per device, shown in a "Your saved styles" section. This is the primary (and nearly only) return hook.
- **Dark mode** persisted (`header.js:126–137`, key `darkMode`), applied pre-paint (no flash).
- **Vertical module** has its own recents + layout memory (`js/vertical/verticalPageController.js:17–67`).
- **Copy feedback** toast + button state cycling (`script.js:843–921`); real-time debounced render (400ms); client-side style search/filter.
- GTM (`GTM-P55HXK8Q`) with custom events: `save_style`, `unsave_style`, `copy_text` (3 variants), `comment_copy`.

**Gaps:**
- **No PWA** — no `manifest.json`, no service worker, no offline, no add-to-home-screen.
- **No off-site re-engagement** — no email capture, no push, no notifications.
- **No fresh-content hooks** — no "style of the day", "new fonts", or any reason the page looks different on a return visit.
- **No "recently used" on the homepage** (the vertical module has it; the main generator doesn't).
- **No onboarding** — no first-run hint that text is copy-paste-ready, or that styles can be saved.
- **Analytics funnel blind spots** — no events for search, filter, category-tab clicks, scroll depth, or input-without-copy (the key drop-off).

---

## 4. Opportunities — Distribution

Ordered by leverage. Effort: **S** ≈ hours, **M** ≈ a few days, **L** ≈ a week+.

### D1. Add share buttons at the point of copy — **S/M, highest ROI**
When a user copies, surface "Share this style" → prebuilt links to X/WhatsApp/Reddit/Facebook that open `ultratextgen.com/?q=<their text>`. The `?q=` plumbing already exists; this turns every copy into a potential backlink + referral. Add a "Copy link" button too.

### D2. "Copy as link" / shareable permalink in the UI — **S**
Expose the `?q=` feature explicitly (e.g. a 🔗 next to each output card). Pre-fills another person's generator with the exact styled text — a natural viral loop for a copy-paste tool.

### D3. Inline contextual internal links in guide/answer/category body copy — **M**
Currently cross-linking is footer-only. Add a small, hand-curated "Related" block and in-prose links (e.g. a bold-fonts guide linking to `/category/bold-fonts/` and `/linkedin/`). Improves crawl depth, dwell time, and topical authority.

### D4. Verify + backfill JSON-LD on the 249 library pages — **M**
The library is the biggest page class. Confirm each has appropriate schema (e.g. `CollectionPage`/`ItemList`/`FAQPage`); rich results on reference pages punch above their weight for long-tail symbol/emoji queries.

### D5. Embeddable widget program — **M/L**
Only one embed page exists (`/embed/linkedin-headline-generator/`). Productize it: a documented `<iframe>`/script snippet for bloggers, with a "Powered by UltraTextGen" backlink. Embeds are evergreen backlinks + referral traffic.

### D6. Fully automate the tweet pipeline — **S/M**
`tweet_queue.py` stops at a GitHub Issue. Wire the qualifying queue to the X API (or Buffer/Typefully) so distribution runs without a manual step. Add Bluesky/Threads/Mastodon fan-out while you're there.

### D7. i18n translation QA pass — **M**
Verify locale pages are genuinely translated (not English duplicates) across all page types, and that each locale's hreflang set is reciprocal. Thin/duplicate localized pages can trigger soft-duplicate penalties — confirm before scaling more locales.

### D8. Programmatic long-tail expansion — **L**
You already template platform × style. Extend to high-intent combos ("bold font for instagram bio", "cursive text for discord") as dedicated pages, each with its own canonical, FAQ schema, and prefilled generator. This is the proven growth engine for this category — but gate it on D7 (quality > quantity).

### D9. Open Graph image QA — **S**
Render-test OG/Twitter cards across X, LinkedIn, Discord, WhatsApp, Facebook. A broken/oversized preview silently kills the CTR on every share you do land.

---

## 5. Opportunities — Retention

### R1. Make it a PWA (manifest + service worker) — **M, highest retention ROI**
Add `manifest.json` + a small offline service worker. Benefits: installable to home screen (a literal return shortcut), instant repeat loads, offline use of a tool that's pure client-side JS anyway. Lowest-effort, highest-fit retention move for this product.

### R2. "Recently used" styles on the homepage — **S**
Mirror the vertical module's recents (`utg_vertical_recent_decos`) on the main generator. Returning users instantly see their last styles — turns a stateless tool into a personal one. Pairs with the existing saved-styles section.

### R3. First-run nudge to save / install — **S**
After the first copy, a one-time toast: "★ Save this style" / "Add UltraTextGen to your home screen". Convert peak-intent moments into retention actions. Gate with a localStorage seen-flag so it never nags.

### R4. Fresh-content hook: "Style of the day" / "New this week" — **S/M**
A deterministic daily-rotating featured style (seed off the date — no backend needed) plus a "New" badge on recently added fonts. Gives the page a reason to look different on every visit. Feeds R5.

### R5. Optional email capture tied to value, not a popup — **M**
Skip the intrusive modal. Offer a contextual opt-in: "Get 3 new fonts + a formatting tip weekly." The only off-site channel to pull users back. Static-site friendly via a form provider (Buttondown/ConvertKit embed) — no backend required.

### R6. Web Push for "new fonts" — **M** (do after R1)
Once the service worker exists, opt-in web push is a low-cost re-engagement channel that respects the zero-backend constraint (or a thin function).

### R7. Close the analytics funnel — **S**
Add `dataLayer` events for: text typed (engaged, pre-copy), search performed, filter/category clicked, share clicked, save vs unsave ratio, and **input-without-copy** (the silent drop-off). Today you can't see *why* a session doesn't convert. This is the prerequisite for measuring every other item here.

### R8. Lightweight onboarding affordance — **S**
A single dismissible hint near the input ("Type, pick a style, tap to copy — works on Instagram, Discord, LinkedIn…") removes the "is this copy-paste-ready?" hesitation that bounces first-timers.

### R9. Personal style collections / naming — **M**
Let users group saved styles (e.g. "Instagram bio", "Discord"). Deepens the saved-styles hook from a flat list into a reason to maintain an account-less profile on the device.

---

## 6. Recommended Sequencing

**Phase 1 — Quick wins (days, no architecture change):**
R7 (analytics funnel) → D1/D2 (share + copy-link) → R2 (recently used) → R3 (first-run nudge) → D9 (OG QA).
*Rationale: instrument first so the rest is measurable, then ship the highest-ROI share + retention micro-features.*

**Phase 2 — Structural (1–2 weeks):**
R1 (PWA) → D3 (inline internal links) → D4 (library JSON-LD) → D7 (i18n QA) → R4 (fresh content).

**Phase 3 — Compounding bets:**
D5 (embeds), D6 (tweet automation), R5/R6 (email + push), D8 (programmatic long-tail), R9 (collections).

---

## 7. Constraints Honored

Every opportunity above fits the project's stated rules (`CLAUDE.md`): no frontend
framework or bundler, IIFE modules, no `var`, CSS custom properties only, GTM +
JSON-LD preserved on new pages. PWA, share buttons, recents, and analytics events
are all achievable in vanilla JS + native Web APIs. Email/push are the only items
that touch an external service (form provider / push endpoint), not a backend.
