# Image Backlink Strategy — UltraTextGen

**Date:** 2026-06-27
**Status:** Design / decision doc (no code written yet)
**Scope:** Whether and how UltraTextGen should turn its images into a
backlink-earning channel, given the site's zero-backend constraint.

This is a **decision doc**, not an implementation pass. It exists so we choose
the approach deliberately before touching pages or adding infrastructure.

---

## 1. The question

> "I've created a lot of images — can any of them serve as backlinks?"

The honest answer is: **not as they stand.** Almost every image in the repo is
an *indexable* image, not an *embeddable* one. Those are different jobs, and
only one of them earns links. This doc draws the line, then weighs the options
for adding a true embeddable-image capability.

---

## 2. Indexable vs. embeddable — the distinction that matters

| | **Indexable image** | **Embeddable image** |
|---|---|---|
| What it is | A static PNG on our domain | A single image URL other sites place on *their* pages |
| Its job | Be found and ranked (Google Images, social cards) | Travel — every embed hotlinks back to us |
| Examples in repo | `/assets/og/*.png`, `/assets/hero/*.svg`, library charts, Pinterest pins | None today |
| Earns backlinks? | No (lives only on our domain) | Yes (the `<img>`/anchor sits on the linking site) |

What we have today is **all left column.** The 2026-06-13 image-SEO pass
(`docs/image-seo-fixes.md`) deliberately made this so: the Open Graph card is
the single canonical indexable image per page, and the hero illustrations were
made decorative (`aria-hidden`, empty `alt`). That work is correct for its
goal — it is just orthogonal to link-building.

### Why a static chart + "please credit us" box is *not* an embeddable image

A tempting middle path is to put a library chart (e.g.
`library-heart-symbols.png`) next to a copy box containing a credit link. That
is **not** an embeddable image — it is an indexable image with an honor-system
attribution snippet. The image itself never travels; the link only appears if a
human chooses to paste the credit. Low yield, and easy to mistake for the real
thing. We are not pursuing this as the primary play.

### What makes an image worth embedding: personalization

People embed an image when it is *theirs*. The unlock is a dynamic,
personalized image:

```
https://ultratextgen.com/img?text=Sarah&style=bold-cursive   →   returns a PNG
```

Embedded elsewhere as:

```html
<a href="https://ultratextgen.com/?utm_source=embed">
  <img src="https://ultratextgen.com/img?text=Sarah&style=bold-cursive"
       alt="Sarah in bold cursive — UltraTextGen">
</a>
```

Wherever that lives, the `<img>` hotlinks to our domain and the wrapping `<a>`
is a followed backlink. *That* is an embeddable image.

---

## 3. The constraint that gates everything

A query-driven image (`/img?text=…&style=…`) must be **rendered on request**.
That requires a server. UltraTextGen's defining constraint
(`CLAUDE.md`) is **no backend, no build step, no runtime dependencies** — a pure
static site on Netlify.

So the real decision is not "which image" — it is **"are we willing to add a
single server-rendered endpoint to an otherwise static site?"** Every option
below is a different answer to that one question.

---

## 4. Options compared

### Option A — Serverless image function (the only true backlink path)

A Netlify Function / edge function renders `text + style → PNG/SVG` on request
(e.g. `satori` + `resvg`, or `@vercel/og`). Front-end stays static; we add one
function.

- **Backlink value:** ✅ Real. Hotlinked image + followed anchor on third-party
  pages.
- **Aligns with hosting:** Netlify Functions are first-class; no new host.
- **Cost:** Function invocations + bandwidth on every render and every page-view
  that embeds it. Needs caching (CDN cache headers, deterministic URLs) or it
  gets expensive at scale. Hotlink bandwidth is borne by us, not the embedder.
- **Maintenance:** New surface area — font bundling for the renderer, input
  sanitisation (the `text` param is user-controlled and lands in an image →
  abuse/content risk), cache strategy, an `/embed/` builder UI.
- **Philosophy cost:** This is the meaningful departure — it ends "zero
  backend." Worth naming explicitly to the maintainer before building.

### Option B — Client-side canvas + download (static-safe, but not a backlink)

The existing client renderer draws a styled name to `<canvas>`; the user
downloads the PNG.

- **Backlink value:** ❌ None. A downloaded file re-uploaded elsewhere is a
  *copy* on someone else's host — the link is severed. Good for social sharing
  and virality, useless for link equity.
- **Aligns with hosting:** ✅ Fully static, zero new infra.
- **Cost / maintenance:** Negligible.
- **Use it for:** shareability and brand, not link-building. Could ship
  alongside A.

### Option C — Third-party image transform (Cloudinary / imgix)

Offload rendering to a text-transform CDN.

- **Backlink value:** ⚠️ Misdirected. The image URL lives on *their* domain, so
  any equity and brand impression credits the vendor, not us. Rejected for the
  stated goal.
- **Cost:** Vendor pricing tiers.
- **Verdict:** Only sensible if we ever want rendering without running our own
  function *and* we proxy it under our domain — at which point we're most of the
  way to Option A anyway.

### Option D — Widget embed (what we already have — adjacent, not image-based)

`/embed/linkedin-headline-generator/` hands out a copy-paste `<iframe>` that
points at our domain. This is already a working backlink mechanism — the link is
*inside* the embed code, not dependent on goodwill — it just isn't an *image*.

- **Backlink value:** ✅ Real and already proven in-repo.
- **Cost / maintenance:** Static iframe page; cheap. We have exactly one.
- **Relationship to this doc:** The fastest backlink win on the board is
  cloning this pattern for top generators (zalgo, bold, vertical text, emoji
  combos) — independent of whether we ever build Option A.

---

## 5. SEO nuance (applies to A and D)

An embedded `<img>` alone is an **image hotlink** — referral traffic + brand +
image-search signal, but a weaker link signal than an anchor. Always ship the
embed snippet with the image wrapped in an `<a>` (see §2) so we get both the
hotlink *and* a followed backlink. Add `utm_*` params so the referral channel is
measurable in analytics.

---

## 6. Recommendation

Two tracks, sequenced by effort-to-value:

1. **Now, static-safe:** Clone the **Option D** widget pattern for the top 3–4
   generators. Real backlinks, no backend, reuses a proven in-repo pattern.
2. **Deliberate decision:** Treat **Option A** as the only path to a true
   *embeddable image*, and gate it on an explicit maintainer decision to add one
   serverless function. If yes, the build order is: image function → caching →
   input sanitisation → `/embed/` builder UI → wrapped-anchor snippet. Option B
   (canvas download) can ride along purely for shareability.

**Do not** pursue the static-chart + manual-credit box as a primary tactic
(§2) — it reads like an embeddable image but yields almost no links.

---

## 7. Open decisions for the maintainer

- [ ] Are we willing to end "zero backend" for one serverless image endpoint
      (Option A)? This is the gating call.
- [ ] If yes: invocation/bandwidth budget and cache strategy for hotlinked
      images at scale.
- [ ] Content-safety policy for the user-controlled `text` param rendered into
      an image.
- [ ] Greenlight the Option D widget clones (top generators) — these can proceed
      regardless of the Option A decision.
