# Monetization — the ad stack, the measurements, and the traffic data

Invariants: `.claude/rules/ads-and-monetization.md`.

Ads are the site's only revenue, and until 2026-09-20 nothing in the tree said how
they are placed.

## Measured state of the stack

Measured on the tree, not recalled:

- **4,695 of 4,711 tracked HTML files load the AdSense loader**
  (`pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=…`), and 4,688 also
  carry the Funding Choices tag. The exceptions are deliberate — see "pages that must
  carry no loader" below.
- **There is not one manual `<ins class="adsbygoogle">` element in any HTML file in
  the repository.** The count is zero. Placement is delegated entirely to **Auto
  Ads**, which decides per pageview where an ad goes and whether one goes at all.
- The only hand-placed unit is a 300×600 right rail injected by `header.js`
  (`.ad-rail-right`, slot `5968968934`), gated twice for the same reason — in the
  request (`matchMedia("(min-width: 1600px)")`) and in the CSS (`display: none`
  below that width). The gate is deliberate and correct on its own terms: it avoids
  burning an impression on a slot nobody can see.

**A top-banner unit sat beside it and was removed 2026-07-27** after a 7-day pull
showed **3 impressions and no earnings** while permanently reserving 100–250px under
the nav on every pageview. `header.js`'s own comment records this. It is the
precedent for the "ship with a measurement" rule: the unit was removed on a
measurement, not a hunch, and the measurement is what made the removal safe.

### A correction, made the same day

An earlier statement here read: *"on a phone, no unit in this repository ever requests
an ad."* That is exact about the *repository's* units and **misleading about the ad
stack**: Auto Ads requested **six in-page units** on the live homepage in a mobile
viewport, plus an anchor and a vignette on two of three probed pages. The lever on a
generator page was not a missing request but the page **destroying two of the placed
units on its first keystroke**.

It also narrows the "add a manual unit" option: a manual `<ins>` placed where it
would be seen, inside `#resultsGrid`, would have been wiped by the same
`innerHTML = ""` until that fix, and outside it duplicates Auto Ads' own placements.

## What Auto Ads does on a generator page

Measured on the live homepage in a mobile viewport (2026-09-20, GA4 blocked): Auto
Ads placed 6 in-page units, and the **2 highest — the only ones inside the region a
visitor actually scrolls — sat between the cards of `#resultsGrid`** at 1,476px and
2,884px.

`renderResults()` ran `grid.innerHTML = ""` on **every input event**, so typing one
character removed both, Auto Ads never re-placed them, and the survivors sat
3,800–9,200px down in the FAQ. Every visitor types — that is the page — so on the
site's generator family the in-page inventory in the interaction zone was spent as ad
requests on units nobody could ever view. The same wipe ran on category-tab clicks
and in `showLoadingState()` and `renderSavedStyles()`.

`clearGridKeepingAds()` / `appendAroundAds()` now keep every `div.google-auto-placed`
(or bare `ins.adsbygoogle`) where it was, **never detaching it** — moving an iframe
reloads it, which would blank a filled ad — and rebuild the cards around it at the
same ordinal position.

Verified against a worktree of the unpatched tree in headless Chromium with two probe
ad nodes at child indices 4 and 10: **unpatched, both gone** after typing and after a
tab click; **patched, both present as the same DOM objects** with 4 and 9 cards before
them, and still present (one now last) after a tab click that cut 11 cards to 7. Zero
page errors on both.

### The trial record

- **Hypothesis:** more viewable In-page impressions on pages that load `script.js`.
- **Baseline:** In-page Active View Viewable 42.67% (AdSense, Jul 2026), and In-page
  impressions per pageview on `/`, `/discord/`, `/fancy-letters/`,
  `/roblox/name-generator/` against a matched window before the merge.
- **Window:** read at 21 days.
- **Rollback:** revert the one `script.js` commit — no data, no ledger and no template
  depends on it.

Other controllers (`js/repeat`, `js/tattoo`, `js/decorator`, `js/events`) still
rebuild grids with `innerHTML = ""`. Smaller surfaces, not measured, recorded here so
the pattern is not rediscovered one controller at a time.

## The mobile anchor covered the copy toast

The anchor is `position: fixed` at the viewport bottom with the maximum z-index; the
toasts sat at `bottom: 24px` with z-index 200–300. In the probe a displayed anchor
spanned the **bottom 424px of an 839px viewport**, so the "Copied!" confirmation for
the site's most frequent action was **invisible on every mobile pageview that carried
one**.

`header.js` now publishes the displayed anchor's height as `--utg-anchor-h` on
`<html>` (0px with no anchor, at the top, or once dismissed), and `.copy-toast`,
`.symbol-toast` and `.pt-toast` add it to their offset. Verified: a 100px probe
anchor moves the toast to 124px; dismissing it returns 24px.

## The right rail is only injected where it is requested

Below 1600px it previously sat in every page's DOM as a `display: none` manual unit
that was never pushed — dead markup Auto Ads can still read as an existing unit when
it plans in-page density on 1200–1599px desktops. **Whether it did is untested** (the
live A/B needed a request interception the sandbox refused); the change has no
downside either way.

## Pages that must carry no loader

`404.html` and the six iframe sources the `/embed/` documentation tells other sites to
embed (`<tool>/embed/index.html`) used to ship the loader.

- Google's placement policy disallows ads on screens without publisher content, with
  **error pages as its standard example**, and `/404` is this site's single
  most-bot-hit URL (GA4 Aug–Sep 2026: datacenter traffic landing there at a 0.03
  ad-impression rate).
- An ad request from inside a cross-domain iframe carries the **host page's** URL,
  which is not in the Sites list, so it can never fill.

`isAdFreePage()` in `scripts/lib/page-infra-targets.js` names both classes and
`check-ads.js` fails if either carries the loader. Verified: re-adding it to
`404.html` and to one iframe source exits 1 naming both; restored, exit 0.

GTM and the Funding Choices tag stay on all of them — **the Funding Choices message is
also the consent signal GA4 runs under.** The `/embed/…` *documentation* pages are
ordinary indexable pages and keep their loader.

## What the traffic data says about "coverage"

Recorded so it is not re-derived. GA4 landing-page × event × country × source,
2026-08-24 → 09-10: the share of landing users who receive **any** ad impression is a
flat **0.73–0.85** across the US, Indonesia, France, Korea, Canada, the UK and every
template — printables 0.81, library 0.76, usecase 0.78 in the US alone.

The segments that read as low are automated or sanctioned traffic: **Singapore 0.09**
and **China 0.01** (both ~94% "direct", landing on `/404` and dated `/updates/`
entries), **Russia 0.00** (ads are not served there). Those three are 9.6% of landing
users and drag the homepage (0.53 → **0.70** without them; **0.81** for US Google
visitors), `guide/` and `answers/` (0.17–0.24 → 0.34–0.37) and `symbol/`
(0.52 → 0.68) into looking like template defects they are not.

**A "coverage gap" computed against all pageviews is mostly that traffic plus ad
blockers**, which GA4 cannot see at all because they block GTM too.

## Analytics routing

`ad_impression` and `ad_click` reach GA4 through the **AdSense↔GA4 link, not the
dataLayer**. They are unaffected by GTM tag/trigger coverage, so a gap in GTM routing
never explains a gap in ad events. **Do not debug one by changing the other.**
