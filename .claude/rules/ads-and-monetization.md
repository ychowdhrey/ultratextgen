---
paths:
  - "{header,script,symbol-explorer}.js"
  - "{404,index,_root}.html"
  - "*/embed/index.html"
  - "embed/**"
  - "functions/**"
  - "scripts/{check-ads,check-funding-choices}.js"
  - "scripts/lib/page-infra-targets.js"
---

# Ads and monetization

Ads are the site's only revenue. Measurements, the traffic-coverage analysis and the
incident history: `docs/architecture/monetization.md`.

## The stack is Auto Ads

- Every page loads the AdSense loader in `<head>`, plus the Funding Choices tag.
  `npm run check:ads` and `npm run check:funding-choices` gate both.
- **There is not one manual `<ins class="adsbygoogle">` element in any HTML file in
  this repository.** Grep before assuming otherwise. Placement is delegated
  entirely to Auto Ads (Anchor, In-page, Vignette, In-article, Side rail), which
  decides per pageview.
- The **only** hand-placed unit is a 300×600 right rail injected by `header.js` and
  gated to `min-width: 1600px`, in both the request and the CSS.

So several plausible-sounding tasks ("move the ad away from the copy button", "make
the ad lazy-load", "swap the unit size") have no manual unit to edit. The
equivalent levers are AdSense-side: the Auto Ads format toggles and the ad-load
setting, neither of which lives in this repository.

Adding a manual unit **is** a real option — Auto Ads fills around one rather than
being blocked by it — and it is the only way to control where an ad sits relative
to the copy and download buttons.

## Two hard prohibitions

- **Never hand-edit an ad tag into a page's HTML.** The loader comes from the page
  templates and the rail from `header.js`; a one-off `<ins>` is invisible to both
  and to the gates, and is lost the next time the page is regenerated. If a lane
  needs units, put them in the generator or in `header.js` behind an explicit
  condition, the way the rail already is.
- **Never add the loader to `404.html` or to an iframe source
  (`<tool>/embed/index.html`).** Google's placement policy disallows ads on screens
  without publisher content, and an ad request from inside a cross-domain iframe
  carries the host page's URL, which is not in the Sites list and can never fill.
  `isAdFreePage()` in `scripts/lib/page-infra-targets.js` names both classes. GTM
  and the Funding Choices tag stay on them — the Funding Choices message is also
  the consent signal GA4 runs under. The `/embed/…` *documentation* pages are
  ordinary indexable pages and keep their loader.

## Do not destroy a placed unit

On generator pages the first in-page units land **inside `#resultsGrid`**, so a
`grid.innerHTML = ""` on every input event destroyed them on every visit while Auto
Ads never re-placed them. Clear through `clearGridKeepingAds()` /
`appendAroundAds()` in `script.js`, which keep each `div.google-auto-placed` (or
bare `ins.adsbygoogle`) where it is and **never detach it** — moving an iframe
reloads it, which would blank a filled ad.

Other controllers (`js/repeat`, `js/tattoo`, `js/decorator`, `js/events`) still
rebuild grids with `innerHTML = ""`. Smaller surfaces, not measured — apply the same
rule when you touch one.

## A fixed bottom element must clear the anchor

`header.js` publishes the displayed anchor's height as `--utg-anchor-h` on `<html>`
(0px with no anchor, at the top, or once dismissed). Any fixed bottom element adds
it to its own offset, or it sits behind the anchor — which is what hid the copy
toast on mobile.

## Shipping a monetization change

Ship it with a **written hypothesis, a baseline, an observation window and a
rollback rule**, and scope the first one to a single lane rather than site-wide.
Manual `<ins>` markup is additive and Auto Ads toggles revert with no deploy, so
both are same-day reversible — which is what makes a scoped trial reasonable. A
change that cannot be reverted the same day does not belong in a first trial. The
precedent is the 2026-07-27 top-banner removal: made on a measurement, not a hunch.

## Analytics

`ad_impression` and `ad_click` reach GA4 through the **AdSense↔GA4 link, not the
dataLayer**. They are unaffected by GTM tag/trigger coverage, so a gap in GTM
routing never explains a gap in ad events. Do not debug one by changing the other.

Ad blockers block GTM too, so GA4 cannot see them at all — a "coverage gap"
computed against all pageviews is mostly automated traffic plus blockers. See the
reference doc before treating one as a template defect.
