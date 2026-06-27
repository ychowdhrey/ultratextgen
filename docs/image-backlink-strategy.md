# Image Backlink Strategy — UltraTextGen

**Date:** 2026-06-27
**Status:** Design / decision doc (no code written yet)
**Scope:** Whether and how UltraTextGen should turn its images into a
backlink-earning channel.

**Decision recorded (2026-06-27):**
- **Track 1 (static iframe widgets)** — proceed when ready; runs on the
  current free Cloudflare plan, $0/mo.
- **Track 2 (embeddable image endpoint)** — **parked as a scaling
  opportunity**, gated on monetization (see §6.1). It requires Cloudflare
  Workers Paid (~$5/mo) and is not built until revenue covers it.

**Platform note:** the site runs on **Cloudflare Pages** and already ships a
Pages Function (`functions/_middleware.js`, using `HTMLRewriter` + the `ASSETS`
binding) with edge cache control in `_headers`. So edge compute is already in
use — Track 2 is the *same primitive*, not a new architecture, and the
Cloudflare-native renderer is [`workers-og`](https://github.com/kvnang/workers-og)
(satori + resvg-wasm), the equivalent of `@vercel/og`.

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
That requires edge compute. The site already has it: it runs on **Cloudflare
Pages** with a Pages Function (`functions/_middleware.js`) and edge caching
(`_headers`). So the blocker is *not* architecture — it's the **CPU cost of
rendering**: image generation (satori + resvg-wasm) exceeds Cloudflare's free
plan 10 ms CPU cap per invocation, so Track 2 requires **Workers Paid
(~$5/mo)**.

So the real decision is not "which image" and not "are we willing to add a
backend" (we already run one) — it is **"is there enough revenue to justify
$5/mo of edge compute?"** That makes Track 2 a *monetization-gated scaling
opportunity*, not an architectural one. Every option below is read against that
gate.

---

## 4. Options compared

### Option A — Cloudflare Worker image endpoint (the only true backlink path) — PARKED, see §6.1

A Pages Function / Worker renders `text + style → PNG/SVG` on request using
[`workers-og`](https://github.com/kvnang/workers-og) (satori + resvg-wasm, the
Cloudflare-native `@vercel/og`). Same runtime as the existing
`functions/_middleware.js`; front-end stays static.

- **Backlink value:** ✅ Real. Hotlinked image + followed anchor on third-party
  pages.
- **Aligns with hosting:** ✅ Native — we already run a Pages Function. No new
  host, no migration.
- **Cost:** **~$5/mo flat** (Workers Paid — required because render CPU exceeds
  the free plan's 10 ms cap). **Egress is free on Cloudflare**, so the hotlinked
  image bandwidth that would be metered/billed on Netlify costs us nothing here.
  With deterministic URLs + immutable cache headers, CPU is billed per *unique*
  (text,style), not per view.
- **Maintenance:** New surface area — font bundling for the renderer, input
  sanitisation (the `text` param is user-controlled and lands in an image →
  abuse/content risk), cache strategy, an `/embed/` builder UI.
- **Gate:** Not an architecture decision (we already run edge compute) — a
  **spend** decision. Parked until monetization covers the $5/mo (§6.1).
- **Platform footnote:** moving to **Netlify would be strictly worse** for this
  — it meters egress, so every embedder's page-view bills us for bandwidth, plus
  a migration cost to port the i18n middleware/redirects/headers. No upside.

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

Two tracks, split cleanly along the free/paid line:

1. **Now, free:** Clone the **Option D** widget pattern for the top 3–4
   generators. Real backlinks, runs on the current free Cloudflare plan ($0/mo),
   reuses a proven in-repo pattern. This also *tests the adoption assumption*
   that gates Track 2's entire payoff — if nobody embeds a free widget, nobody
   will embed an image either.
2. **Later, when monetized:** Treat **Option A** as a parked scaling opportunity
   (§6.1). It's the only path to a true *embeddable image*, but it needs ~$5/mo
   of Workers Paid, so it waits for revenue.

**Do not** pursue the static-chart + manual-credit box as a primary tactic
(§2) — it reads like an embeddable image but yields almost no links.

### 6.1 Track 2 — parked scaling opportunity (decided 2026-06-27)

Status: **parked.** Not built today — the site is on the free Cloudflare plan
and image rendering needs Workers Paid (~$5/mo). This is deliberate, not a gap.

**Unlock when *either* trigger fires:**
- **Monetization** lands and covers the $5/mo flat compute (the primary gate), **or**
- **Track 1 widgets show real embed adoption** — i.e. proof that people will
  embed our assets, which de-risks the bigger build.

**Build order once unlocked:** enable Workers Paid → image Worker (`workers-og`)
→ deterministic URLs + immutable edge cache → input sanitisation → `/embed/`
builder UI → wrapped-anchor snippet. Option B (canvas download) can ride along
purely for shareability.

---

## 7. Open decisions for the maintainer

- [x] ~~Architecture: are we willing to run edge compute?~~ Already do
      (`functions/_middleware.js`) — resolved, not a blocker.
- [ ] **Monetization** that covers ~$5/mo Workers Paid — the trigger that
      unparks Track 2 (§6.1).
- [ ] When Track 2 is built: content-safety policy for the user-controlled
      `text` param rendered into an image.
- [ ] Greenlight the Option D widget clones (top generators) — these run free
      and proceed independently of the Track 2 gate.
