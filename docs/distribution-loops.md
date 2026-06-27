# Distribution Loops — Map & Audit (read before adding share/embed/OG surfaces)

> **This is a living document.** It maps how UltraTextGen acquires and re-acquires
> users through *loops* (self-reinforcing cycles), not funnels — and tracks the
> open opportunities to strengthen them. It is an **operational track** (see
> [`README.md`](./README.md#operational-tracks-cross-cutting)), audited **per
> batch + quarterly**, not on a weekly cron.

A **growth loop** is `action → output → the output reaches a new person → they
take the action`. Loops compound where funnels leak: a funnel spends an input to
get one output; a loop's output *becomes* the next input. The job of this doc is
to keep every share/embed/SEO surface pointed back into a loop, and to make the
broken or missing steps visible.

The framing follows Reforge's growth-loops model (<https://www.reforge.com/blog>).
The file/line references below were captured in the 2026-06-27 audit; re-verify
them when you touch the surface (see [Audit](#the-audit)).

---

## The loops we have

### Loop 1 — UGC viral loop (primary; the *share* step is broken)

```
user styles text → pastes into LinkedIn / IG bio / Discord / etc.
   → other people see the unusual font
   → "how did they do that?" → search
   → land on the site → style their own text → (repeat)
```

- **Status:** the *output* travels (styled text spreads across social), but the
  loop's re-entry step depends **entirely on SEO interception** of "how to make
  fancy text"-type searches.
- **Why:** copied text carries **no attribution by design** — clean Unicode, no
  watermark, no back-link, no zero-width tracking. This is a **stated product
  promise** (`index.html` FAQ ~L491, ~L746; `locales/en.json` ~L81) and a real
  UX win. Do **not** "fix" the loop by watermarking the text.
- **The leverage instead:** make the **link** shareable and the **preview**
  show the result — see Opportunities #1 and #2. That repairs re-entry without
  touching the copied text.
- **Code:** copy handler `script.js` ~L851–882; `?q=` input restore
  `script.js` ~L932–937; URL sync `pushUrlState()` ~L787–795.

### Loop 2 — Content / SEO loop (strongest; fully built)

```
category / usecase / guide / library pages → rank in search
   → traffic → a fraction copy & spread (feeds Loop 1) / link to us
   → we ship more pages → sitemap + tweet-queue distribute → (repeat)
```

- **Status:** healthy and systematized for the Library lane; partial for others
  (see `README.md` page-type maturity).
- **Code/infra:** auto-sitemap `.github/workflows/update-sitemap.yml` (daily);
  tweet-queue `scripts/tweet_queue.py` + `.github/workflows/tweet-queue.yml`
  (daily, confidence ≥ 0.72); JSON-LD on every page; Pinterest pin pipeline
  (`scripts/generate-*-pins.py`).

### Loop 3 — Embed loop (built, but a single instance)

```
we ship an embeddable widget → a site embeds it
   → their visitors use it + see the UTM back-link
   → some click through → land on the site → (repeat / they embed too)
```

- **Status:** **one** instance — the LinkedIn headline generator.
- **Code:** `/embed/linkedin-headline-generator/index.html`;
  `usecase/linkedin-headline/embed/index.html` ~L185–189 (footer back-links carry
  `utm_source=embed&utm_medium=widget&utm_campaign=linkedin_headline`);
  widget is `noindex`.

### Supporting: re-engagement (built)

Saved styles persist to `localStorage` (`utg_saved_styles`) and surface a "Saved
on this device — waiting here when you come back" section. Code:
`script.js` ~L225–291, UI ~L627–660. This covers the *return-visit* step; it is
not itself a loop (no new user), so it's listed as support, not a loop.

---

## Open opportunities (ranked by leverage)

| # | Opportunity | Loop it fixes | What's there today | Effort | Notes |
|---|---|---|---|---|---|
| 1 | **Per-result shareable link + dynamic OG image** | Loop 1 (re-entry) | `?q=` encodes **input text only**; no style/decoration in URL; sharing a link shows the **generic homepage** OG preview (`index.html` ~L37–50) | M–L | Highest leverage. Encode style + decoration in the URL, render a result-specific OG card. Repairs Loop 1 **without** watermarking copied text. |
| 2 | **Web Share API (`navigator.share`)** | Loop 1 (share friction) | **Absent** — no `navigator.share` anywhere | S | One-tap native share sheet on mobile. Pairs with #1 (share the link, not the raw glyphs). |
| 3 | **Expand embeds beyond LinkedIn** | Loop 3 (instances) | One widget only (LinkedIn) | M each | Replicate the existing pattern for IG bio, Discord, etc. Each embed = a permanent back-link + a new entry point. Reuse the UTM convention. |
| 4 | **Pinterest pins → deep links (not homepage)** | Loop 2/visual | Pins generated as images; verify each `Link` (with UTM) targets its **specific** page | S | Pins are inherently shareable images that *do* carry to the site — make sure they land on the matching page, per `pinterest-csv-format.md`. |
| 5 | **Social share intents (X / WhatsApp pre-filled)** | Loop 1 (share) | Absent | S | Cheap complement to #2; pre-fill text + the per-result link from #1. |

**Sequencing:** #1 unlocks the value of #2 and #5 (they all share the same
result-specific link), so do #1 first. #3 and #4 are independent and can run in
parallel as page batches ship.

**Deliberately *not* doing:** watermarking copied text, zero-width tracking
chars, or any attribution injected into the Unicode output — it breaks the
no-watermark promise (Loop 1 note above). Loops are repaired at the **link/
preview** layer, never the copied-glyph layer.

---

## The audit

**Cadence: per batch + quarterly fallback.** Distribution surfaces change on the
order of months, so there is **no weekly cron** for this track. Run the audit
when:

- you ship a new **platform** or **usecase** page (does it feed a loop, or just sit?),
- you add/alter a **share, embed, OG, or copy** surface,
- you ship a batch of **Pinterest** pins,
- a **quarter** has passed since the last run (fallback).

The existing [Weekly infrastructure review](./README.md#weekly-infrastructure-review)
already flags unclassified work; if a PR touches a distribution surface, that's
the signal to run this checklist — it does not need its own schedule.

### Checklist

1. **Re-verify the references.** The `file:line` anchors above drift — confirm
   each loop's code still exists where stated; fix the line refs in the same PR.
2. **New pages: which loop?** For every page shipped since the last audit, name
   the loop it feeds (1, 2, or 3) or mark it loop-orphaned. Orphaned ≠ bad, but
   it should be a deliberate choice, not an oversight.
3. **Share step intact?** Spot-check that the share/copy/OG surfaces still behave
   (copied text is clean; `?q=` restores; embed back-links carry UTMs; OG renders).
4. **Opportunities table current?** Tick off shipped items, re-rank the rest,
   add any newly-found gap. Keep it ranked by leverage.
5. **Promise intact?** Confirm nothing slipped attribution/watermark/tracking
   into the copied Unicode output. This is a hard line.
6. **Record it.** Note the date + findings at the bottom of this doc (or open an
   issue for anything that needs work). Small, additive diffs only.

---

## Audit log

| Date | By | Findings |
|---|---|---|
| 2026-06-27 | initial | Mapped Loops 1–3 + re-engagement; identified 5 ranked opportunities (#1 per-result link + dynamic OG = highest leverage). No regressions found; no-watermark promise intact. |
