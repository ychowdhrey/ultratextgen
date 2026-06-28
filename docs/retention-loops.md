# Retention & Engagement — Map & Audit (read before adding return-driving surfaces)

> **This is a living document.** It maps how UltraTextGen earns the *return
> visit* — the step its sibling [`distribution-loops.md`](./distribution-loops.md)
> deliberately leaves out ("re-engagement … is not itself a loop"). Distribution
> brings a new person; retention decides whether that person is a one-shot copy
> or a recurring user. It is an **operational track** (see
> [`README.md`](./README.md#operational-tracks-cross-cutting)), audited **per
> batch + monthly**, with a **monthly metric refresh** because retention moves on
> a shorter clock than distribution surfaces do.

The framing follows Reforge's engagement/retention model
(<https://www.conordewey.com/blog/reforge-engagement-retention>,
<https://www.reforge.com/blog>). Two ideas from it govern this doc:

1. **Natural frequency sets the ceiling.** Retention = `Frequency × Core
   behavior × Who`. You cannot retain a user more often than they *naturally
   have the problem*. UltraTextGen's core job — "make my bio/handle/post look
   different" — is **episodic**, not daily: people restyle a profile every few
   weeks, not every morning. So the realistic target is **medium-frequency
   return** (the user comes back the *next time they post*), not DAU-style
   stickiness. Design for that, and do **not** chase fake daily engagement.
2. **Returning users re-enter via a trigger, not willpower.** Reforge splits the
   return into **manufactured triggers** (ones our product/marketing create) and
   **environment triggers** (ones we place where the problem reoccurs), both
   running `Trigger → Action → Reward`. UltraTextGen has almost **no manufactured
   triggers** (no login, no email, no push) — so retention depends on (a) the
   *device-local* return mechanics below and (b) re-interception by the SEO loop.
   That's the structural gap this doc tracks.

The file/line references below were captured in the 2026-06-28 audit; re-verify
them when you touch the surface (see [Audit](#the-audit)).

---

## What "returning user" means here (read first)

The retention data is **GA device-based**, not cohort-based, and there is **no
account system**: a "returning user" is a device GA recognizes from a prior
visit. Consequences for how we read it:

- We can measure **returning-user share** (returning ÷ active per day) but **not
  a true cohort retention curve** (we can't follow a specific signup forward).
- Anything that clears cookies — private mode, a new device, a different
  browser, consent rejection — reads as a *new* user even when the human
  returned. So **measured retention is a floor, not the truth.**
- The only first-party return signal we own is **`localStorage`** (saved styles,
  dark-mode pref). That is the lever we actually control — everything else is GA
  observing, not us acting.

---

## The retention mechanics we have

### Mechanic 1 — Saved styles (primary return-driver; built, under-leveraged)

```
user stars a style → it persists to localStorage on this device
   → next visit, a "★ Your saved styles" section greets them up top
   → faster re-style → reason to come back to THIS tool, not a competitor
```

- **Status:** built and instrumented, but it is a **passive** trigger — it only
  fires if the user independently chooses to return. There is no manufactured
  trigger (email/push/notification) to *pull* them back, because there's no
  account. This is the single biggest retention gap.
- **Reward is real and immediate:** the saved section renders **above** the
  results grid, so a returning user's payoff (their curated set, ready) is the
  first thing they see — a clean `Trigger → Action → Reward`, just missing the
  trigger half.
- **Instrumented:** `save_style` / `unsave_style` push to `dataLayer`
  (`script.js` ~L283–287) — so save-rate and (via GA) save→return is
  *measurable today* without new code.
- **Code:** key `utg_saved_styles` `script.js` ~L225; load ~L250–258; persist
  ~L260–266; `toggleSaved` ~L272–291; section + "waiting here when you come
  back" copy ~L635–660 (`saved-hint` ~L645).

### Mechanic 2 — Persisted preferences (built; reduces re-entry friction)

- Dark-mode choice persists across visits (`header.js`), so a returning user
  lands in *their* environment, not a reset default. Small, but it's a real
  "this tool remembers me" signal — a micro-reward that supports return.
- **Status:** built. Low leverage on its own; counts as supporting, not a loop.

### Mechanic 3 — Shareable input state `?q=` (built; serves re-entry)

- `?q=` restores typed input from the URL, so a bookmarked/returned link drops
  the user back into their work-in-progress. Today it encodes **input text
  only** (not the chosen style/decoration) — see distribution-loops Opp #1; the
  same fix that helps sharing also helps *self-return* via bookmark.
- **Code:** `?q=` restore `script.js` ~L932–937 (re-verify; shared with the
  distribution doc).

### Supporting: the SEO loop *is* our resurrection channel

With no email/push, the way a dormant user actually comes back is by **hitting
the same search again** and re-landing on us (the Content/SEO loop, distribution
doc Loop 2). That means **SEO breadth doubles as retention infrastructure** for
this product — a user who forgot the URL still finds us. Worth stating because it
reframes "rank for more queries" as *also* a re-acquisition play, not only new
acquisition.

---

## Open opportunities (ranked by leverage)

| # | Opportunity | What it fixes | What's there today | Effort | Notes |
|---|---|---|---|---|---|
| 1 | **A manufactured return trigger that needs no account** | Mechanic 1's missing trigger half | Saved styles are passive; nothing pulls the user back | M | Highest leverage. Account-free options only: an **optional** "add to home screen"/PWA install (an icon *is* an environment trigger), or a one-tap "copy a reminder link to my saved set." No email capture unless a real account lands. |
| 2 | **Surface saved styles harder + measure save→return** | Mechanic 1 adoption | Section renders only when ≥1 saved; save-rate not yet reported | S | The `dataLayer` events already exist — build a GA view for save-rate and 7/28-day return-of-savers **before** building more. Measure first; the instrumentation is free. |
| 3 | **Encode style+decoration in `?q=` (shared with dist. Opp #1)** | Mechanic 3 self-return | `?q=` carries input text only | M–L | A returning bookmark restores the *whole result*, not just raw text. One build serves both sharing and self-return. |
| 4 | **Onboard toward the "aha" faster (Reforge setup→aha→habit)** | Frequency × who | First-visit user sees a wall of styles; no guided first win | S–M | Use the **empty state** to push one fast styled result + a nudge to ★-save it — a saved style on visit 1 is the strongest predictor we can create of a visit 2. |
| 5 | **Geo-aware expectations, not geo-blind targets** | "Who" in the formula | One global returning-% number hides that surge markets retain ~½ the rate of established ones | S | Don't average a high-intent US user with a one-off surge visitor. Segment retention by market in the monthly refresh; judge acquisition channels on the retention they bring, not just volume. |

**Sequencing:** #2 is free instrumentation — do it first so #1 and #4 are
measured, not guessed. #1 is the real unlock but is **product-shaped** (needs a
PWA/install or account decision); scope it deliberately. #3 piggybacks on the
distribution doc's Opp #1.

**Deliberately *not* doing:** email-harvesting popups, forced sign-up walls,
notification nags, or any dark-pattern "engagement" that fights the tool's
fast/clean promise. We raise retention by being **worth returning to** and by
**remembering the user on their device** — never by trapping them. Same hard line
as the no-watermark promise in the distribution doc.

---

## The audit

**Cadence: per batch + monthly metric refresh.** Retention mechanics change
rarely, but the *numbers* move monthly, so unlike distribution-loops this track
has a recurring **metric** step. Run the audit when:

- you add/alter any **save, preference, `?q=`, onboarding, or empty-state**
  surface (does it strengthen a return trigger, or just sit?),
- you ship an **acquisition** push big enough to move the mix (judge it on the
  retention it brings, per Opp #5),
- a **month** has passed since the last metric refresh (recurring).

### Checklist

1. **Re-verify the references.** The `file:line` anchors above drift — confirm
   each mechanic's code still exists where stated; fix the line refs in the same
   PR.
2. **Refresh the metric.** Pull active + returning users for the period. Report
   **returning-user share** (returning ÷ active) overall **and split by market**
   — never just the global average (Opp #5). Note the natural-frequency ceiling:
   a flat low share is expected for an episodic tool; the question is *trend and
   mix*, not absolute height.
3. **Watch the last day.** GA's returning-user attribution lags, so the most
   recent date is **always understated** — exclude or flag it, don't read a cliff
   into it.
4. **Save funnel intact?** Spot-check ★-save persists across reload; the saved
   section renders above results on return; `save_style` fires to `dataLayer`.
5. **Opportunities table current?** Tick off shipped items, re-rank the rest, add
   any newly-found gap. Keep it ranked by leverage.
6. **Promise intact?** Confirm nothing slipped a sign-up wall, email-gate, or
   notification nag into the return path. Hard line.
7. **Record it.** Add the date + the metric snapshot + findings to the log below.
   Small, additive diffs only.

---

## Audit log

| Date | By | Findings |
|---|---|---|
| 2026-06-28 | initial | Mapped Mechanics 1–3 + SEO-as-resurrection; 5 ranked opportunities (#1 account-free return trigger = highest leverage; #2 measure-first is free). **Metric snapshot (GA, 2026-05-31→06-27, all countries):** 14,285 active / 1,794 returning = **12.6% returning share**. Trend: returning **count** rose with traffic (~24/day → ~100/day), but returning **share fell** — first half 16.4% → second half 11.3% — driven by a mid-June acquisition surge (Indonesia spike Jun 13–19) that retains at ~7–9% vs ~15–20% for US/UK. So: *absolute returning users are increasing; retention rate is diluting.* Last day (06-27, 3.6%) excluded as GA-lagged/incomplete. No regressions; no-nag promise intact. |
