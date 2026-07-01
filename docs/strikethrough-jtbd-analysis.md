# Strikethrough Text — Jobs-To-Be-Done (JTBD) Analysis

_Analysis date: 2026-07-01. Page under review:
<https://ultratextgen.com/category/strikethrough-text/>_

This document maps what people are actually trying to accomplish with strikethrough
text, where the demand is, where UltraTextGen under-serves it, and a concrete
build/content roadmap to make this the best strikethrough generator on the web.

Inputs used:

1. **Forum signal** (`.claude/skills/forum-signal` method) — Reddit was unreachable
   in this environment, but verbatim primary sources were pulled from Apple
   Community, Grammarly, Quora snippets, and accessibility research.
2. **SEMrush keyword volume** — two exports: a "strikethrough/underline" keyword-magic
   set (~7.7k keywords) and a competitor organic-positions set (~3.6k keywords).
3. **Google Search Console** — last 3 months, filtered to the strikethrough page.

---

## 1. Executive summary

- Strikethrough is **not one job — it's six**. The overlay glyph is the same; the
  intent behind it splits into decoration, marking-done, irony/"unsay," correction,
  price/discount, and censorship/redaction. The page today speaks to almost none of
  them by name.
- **Two non-overlapping demand pools exist.** (A) "How do I strikethrough _inside_
  Word / Docs / Excel / Discord / WhatsApp" — huge volume, but **not our product**.
  (B) "Give me copy-paste strikethrough for a field with no button" (Instagram,
  Twitter/X, LinkedIn, TikTok bios) — **this is our lane** and it's driven by the
  phrase _"Unicode is the only way to cross out text here."_
- **We are under-built on style variety.** MiniWebTool ships "12+ strike styles,"
  PiliApp ships 6. We shipped 4. This directly costs us the `double strikethrough`,
  `crossed font`, `font with a line through it`, and `strike font generator` queries
  we already rank on page 1 for but don't fully satisfy.
- **We don't own the wording "cross out / crossed out"** — a ~45k/mo pool that
  competitors (saijogeorge, capitalizemytitle) target hard and we barely mention.
- **Underline should stay a separate ranking page** (its own 4k/mo head term) **but
  the two belong to one JTBD cluster** ("line decorations"). Users expect them
  side-by-side. The fix is cross-surfacing + a Strike+Underline combo, not a merge.

---

## 2. Where we stand today (Google Search Console, last 3 months)

| Signal | Value |
|---|---|
| Clicks / Impressions | 19 / 412 (CTR 4.61%) |
| Avg position | **9.93** (mobile 7.1, desktop 35.4) |
| Trend | Impressions climbing 2 → 46/day across June (page is warming up) |
| Head term `strikethrough text` (12,100/mo) | **Not ranking** — we get 0 of it |

**Queries we already surface for but under-serve** (position, impressions):

| Query | Pos | Note |
|---|---|---|
| double strikethrough text generator | 7.7 | We have the style, but no dedicated slug/labeling |
| strikethrough font / fonts | 15–36 | Weak — page reads generic |
| crossed font / crossed font generator | 7.7–10 | **"crossed" wording we don't target in copy** |
| font with a line through it / font with strikethrough | 7–93 | Long-tail we should own outright |
| strike font generator / strip font generator | 9–18 | "strike font" variant |
| strikethrough word generator | 8 | "word" not "text" |
| bold strikethrough text | 9 | Combo intent |
| strike through font for mobile legend | 13 | Gaming-name intent |
| strikethrough in chinese | 2 | CJK caveat is a real query |

Takeaway: the page is **one strong revision away** from converting a lot of page-1
impressions into clicks. It ranks; it just doesn't _read_ like the sharpest answer.

---

## 3. The demand pools (SEMrush volume)

### 3.1 By head-noun cluster (monthly US volume, deduped)

| Cluster | ≈ Volume | We target it? |
|---|---|---|
| `strikethrough` (solid) | **81,000** | Partially |
| `cross out / crossed out / crossout` | **45,000** | **Barely — big gap** |
| `strike font / strikeout / striked / strike text` | 16,000 | No |
| `line through text / put a line through` | 15,000 | No |
| `underline` (sibling family) | 42,000 | Separate page |

The single biggest wording gap is **"cross out / crossed out."** Users say
_"cross out text,"_ _"crossed out font,"_ _"cross out letters generator,"_
_"how to cross out text."_ Competitors saijogeorge and capitalizemytitle rank
top-3 on these precisely because their titles say **"Cross Out Text Generator."**
Our `<title>` says only "Strikethrough Font Generator."

### 3.2 By intent (strikethrough keyword universe, ~46k vol in the seed set)

| Intent bucket | Vol | Ours? | Action |
|---|---|---|---|
| **Generator / copy-paste / maker / online** | 4,780 | ✅ | Our core — win harder |
| Shortcut / hotkey / keyboard | 2,740 | ❌ | Content (answer page), not tool |
| **Software how-to** (Docs/Excel/Word/Outlook…) | 9,360 | ❌ | Not our market — link out, don't chase |
| Generic "how to strikethrough" | 2,300 | ⚠️ | Capture the copy-paste slice |
| Code/dev (CSS/HTML/Markdown/LaTeX) | 1,290 | ❌ | Optional dev guide |
| **Platform: Discord** | 2,760 | ⚠️ | High intent — dedicated section/answer |
| Device: iPhone / Android | 1,190 | ⚠️ | "no strikethrough button on iPhone" is real pain |
| Platform: Instagram | 970 | ⚠️ | Bio decoration — our sweet spot |
| Platform: Twitter/X | 820 | ⚠️ | Char-count caveat matters here |
| Platform: Reddit | 540 | ❌ | Native `~~` — content, not tool |
| Platform: Facebook | 540 | ⚠️ | Copy-paste lane |
| Platform: WhatsApp | 500 | ⚠️ | Native `~` — content |
| **Style variants** (double/bold/diagonal/one-line) | ~170 | ⚠️ | Low volume but conversion-critical |

The style-variant _volume_ is small, but variety is what makes a generator feel
"complete" and wins the on-page comparison against a 12-style competitor.

---

## 4. The six real Jobs-To-Be-Done

Backed by verbatim forum quotes where obtainable.

**JTBD 1 — "Mark it done without deleting it" (to-do / shopping / packing).**
The most emotionally charged job in the primary sources.
> _"folks may just open the Notes app… being able to strikethrough items that
> you've already purchased/tossed in your cart is essentially the most important
> feature"_ — Apple Community
> _"I would like to be able to cross out items as I put them in the car"_ — Apple Community

**JTBD 2 — "Say it without saying it" (irony / sarcasm / plausible deniability).**
The dominant _semantic_ job — high emotional resonance, heavily written-about.
> _"Strikethrough is a way of saying something without really saying it… the written
> equivalent of coughing and saying something at the same time"_ — Grammarly
> _"something you might not want to say out loud, but also wouldn't mind for people
> to hear"_ — Grammarly

**JTBD 3 — "Correct / retract while keeping the original visible."**
> _"words in a document that were deleted in the revision process and replaced by
> other words"_ — Quora
> _"information that was corrected after the original text was posted online"_ — Grammarly

**JTBD 4 — "Old price vs new price" (sale / discount contrast).**
> _"price reductions, revised offers… contrast between old and new"_ — Quora
> _"Show original prices with strikethrough next to sale prices"_ — DevPik

**JTBD 5 — "Decorate a bio / username where there's no format button."**
Our commercial lane.
> _"Unicode combining strikethrough (like t̶h̶i̶s̶) is the only way to cross out text on
> Instagram — works in bios, captions, comments, and story text overlays."_
> Gaming-name intent shows up in GSC too (`strike through font for mobile legend`).

**JTBD 6 — "Censorship / redaction / deprecated look."**
> _"Strikethrough implies 'removed,' 'deprecated,' 'invalid,' or 'no longer
> applicable'"_ — Quora. Maps to redaction aesthetics and dead-link/UI states.

---

## 5. Unmet needs & pain points (what a great tool should solve)

From forum signal — every current method fails at least one of these:

1. **Portability** — Markdown `~~`/`~` only renders on Discord/Reddit/WhatsApp; pasted
   elsewhere it shows literal tildes. Unicode overlay is the portable answer, and we
   should say so explicitly.
2. **Tilde-count confusion** — Discord/Reddit need `~~`, WhatsApp needs `~`; wrong
   count "does nothing." A short "which platform needs what" table converts this pain
   into trust.
3. **iPhone/Android parity** — _"I only see Bold, Italic, and Underline… is strike
   through not an option on the iPhone?"_ (Apple Community). "No button on your phone?
   Paste this" is a direct hook.
4. **Character-count cost** — each struck char is 2 code points; matters for Twitter/X
   bio limits. Worth a one-line honest caveat.
5. **Rendering / tofu** — overlays can show as boxes where the font lacks the glyph.
   A live preview + "copy & paste to check" note (we already use this) builds trust.
6. **Accessibility** — Unicode styled text is _"completely unintelligible to screen
   readers."_ We already handle this well in the FAQ; keep it and make it visible.
7. **Undo** — _"How do you remove the strikethrough?"_ went unanswered on Apple's
   forum. A "clear / plain text" affordance is a small, real win.

**The unmet need no one owns:** pairing the _meaning_ of strikethrough (irony /
done / old-price / "unsay") with the _tool_ that generates it. Competitors are pure
utilities. We can be the utility **and** the authority.

---

## 6. Style completeness — us vs the field

| Style | Unicode | MiniWebTool | PiliApp | UltraTextGen (before) | UltraTextGen (now) |
|---|---|---|---|---|---|
| Classic strike | U+0336 | ✅ | ✅ | ✅ Ultra Strike | ✅ |
| Thin / short strike | U+0335 | ✅ | — | ❌ | ✅ **Ultra Thin Strike** |
| Double strike | 0336+0335 | ✅ | — | ✅ Ultra Double Strike | ✅ |
| Heavy / thick strike | 0336×2 | ✅(triple) | — | ❌ | ✅ **Ultra Heavy Strike** |
| Slash / diagonal | U+0338 | ✅ | ✅ | ✅ Ultra Slash | ✅ |
| Light / short slash | U+0337 | ✅ | — | ❌ | ✅ **Ultra Light Slash** |
| Wavy _through_ | U+0334 | ✅ | ✅ | ❌ (our "Wavy" is U+0303 _above_) | ✅ **Ultra Wavy Strike** |
| Crossed-out (X overlay) | 0336+0338 | — | — | ✅ Ultra Crossed-Out | ✅ |
| Strike + underline | 0336+0332 | ✅ | — | ❌ | ✅ **Ultra Strike + Underline** |
| Underline | U+0332 | ✅ | ✅ | ✅ (underline page) | ✅ |
| Double underline | U+0333 | ✅ | ✅ | ❌ | _underline page — see §8_ |
| Overline | U+0305 | ✅ | — | ❌ | _candidate — see §8_ |

**Shipped in this change:** strikethrough family **4 → 9 styles** (Thin, Heavy,
Wavy-through, Light Slash, Strike+Underline added). This matches PiliApp and closes
most of the gap to MiniWebTool while keeping every output reliable (verified
distinct, valid combining sequences). Two low-reliability novelties (triple stack,
quad "full overlay") were deliberately skipped — they render inconsistently and
would hurt the "it just works" promise.

---

## 7. Answering the specific questions asked

**"What are people trying to do?"** — Six jobs (§4). Commercially, the money job is
JTBD 5 (decorate a bio/username with no format button). Content-wise, JTBD 2 (irony)
and JTBD 1 (mark-done) have the most emotional pull and shareability.

**"Any types of strikethrough underserved?"** — Yes: **thin (U+0335)**, **wavy-through
(U+0334)**, **short slash (U+0337)**, and **strike+underline** were missing. All added.
The biggest _wording_ gap is **"cross out / crossed out"** (~45k/mo) — a copy/title
problem, not a code problem.

**"More strikethrough-type fonts to add?"** — Added 5 (§6). Remaining candidates:
double-underline and overline (better homed on the underline page), and a "cross /
X" pattern variant. Beyond that, returns diminish and reliability drops.

**"What will make it complete?"** — Three things, in priority order:
1. **Copy/title expansion** to own "cross out / crossed out / line through / strike
   font" wording (title, H1, intro, FAQ). Highest ROI, zero risk.
2. **Style variety** (done — 9 styles) so the on-page comparison beats competitors.
3. **JTBD-labeled preset chips** — replace the generic homepage tabs (Cool / Fancy /
   Cursive / Bold / Gothic / Bubble) that currently render on this page and match
   _no_ strikethrough style, with strikethrough-relevant labels (Single / Thin /
   Double / Slash / Wavy / Crossed / Strike+Underline). This is why the page "feels
   like a replica of the home page." (UX follow-up — see §9.)

**"Is any combination better suited?"** — Yes: **Strike + Underline** (0336+0332)
directly serves users who expect the two together, and **bold + strike** serves the
`bold strikethrough text` query (pre-bold the text, then overlay). Crossed-Out
(0336+0338) is a differentiator competitors don't list.

**"What are people trying to achieve?"** — Visible cancellation. Across every source
the through-line is: _the struck text is still meant to be read._ That's what
separates strikethrough from deletion, and it's the emotional core to lead with.

**"Anything to make this the best strikethrough generator?"** — Own the wording,
ship the variety (done), add the platform "which tildes?" trust table, add a
one-click "no button on your phone? paste this" hook, and pair meaning + tool so we
rank for both the utility and the "what does strikethrough mean" informational
queries no competitor bothers with.

**"Should underline live under it?"** — **No — keep `/category/underline-text/` as its
own ranking page** (own head term, 42k/mo cluster). **But** treat strikethrough +
underline as one JTBD family: surface a **Strike+Underline** combo on the
strikethrough tool (done), cross-link the two pages, and consider a shared
"line & overlay styles" nav grouping. Forum signal shows users expect them
side-by-side (they notice when strikethrough is the "odd one missing" from a
Bold/Italic/Underline menu) — but they never confuse the _meanings_ (underline =
emphasis/link, strikethrough = cancellation), so the pages stay semantically
distinct.

---

## 8. Recommended roadmap (priority order)

**P0 — Copy & metadata (no code risk, highest ROI)**
- Retitle to fold in the winning wording, e.g.
  `Strikethrough Text Generator — Cross Out & Line-Through Text | UltraTextGen`.
- Work "cross out," "crossed out," "line through," "strike font" naturally into the
  H1/intro/FAQ so we stop leaking the 45k/mo "cross out" pool.
- Add a short **platform tilde table** (Discord `~~`, WhatsApp `~`, Instagram → paste
  Unicode) — converts the #1 recurring pain into trust.

**P1 — Style variety (shipped in this change)**
- +5 reliable styles → 9 total. Give the high-value ones their own `slug` so they can
  win long-tails (`double strikethrough text generator`, `diagonal/slash strike`).

**P2 — UX: make the page purpose-built, not homepage-shaped**
- Replace the generic category tabs with strikethrough sub-type chips (they currently
  match no style on this page). This is the "replica of the home page" complaint.

**P3 — Content authority (owns queries competitors ignore)**
- An `/answers/` page for "what does strikethrough text mean" (JTBD 2/6 — irony,
  deprecated, redaction).
- Platform mini-answers: Discord, Instagram, WhatsApp, iPhone ("no strikethrough
  button") — each a tight zero-click answer that funnels to the tool.

**Explicitly NOT worth chasing:** the software how-to pool (Google Docs/Excel/Word —
9.4k/mo). Different intent, different product. Link out; don't build for it.

---

## 9. What shipped with this analysis

- `renderer.js` — 5 new decorators: `shortStrike` (U+0335), `heavyStrike` (0336×2),
  `wavyStrike` (U+0334, true wavy-through), `shortSlash` (U+0337),
  `strikeUnderline` (0336+0332).
- `styles.js` — 5 new strikethrough-family styles: **Ultra Thin Strike**, **Ultra
  Heavy Strike**, **Ultra Wavy Strike**, **Ultra Light Slash**, **Ultra Strike +
  Underline**. Family count 4 → 9.

Remaining P0/P2/P3 items above are copy/UX/content follow-ups, intentionally left for
a focused review pass rather than bundled into this registry change.
