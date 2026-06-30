# Page vs. Section — the Companion-Content Decision Gate

When a topic has already cleared demand (see
[`unicode-library-workflow.md`](./unicode-library-workflow.md)), a second
question follows: a related **format or subdivision** of that topic — e.g.
*text faces / kaomoji* alongside *emoji*, or *cat* within *animals* — should it
get its **own page** (a spoke) or fold in as a **section** on the parent
(the hub)?

This doc is the standing answer, so we decide it the same way every time. It
implements the JTBD principles in
[`jtbd-principles.md`](./jtbd-principles.md) — in particular *one primary
intent per page* and *declare canonical ownership* — and concrete applications
appear in [`jtbd-build-spec.md`](./jtbd-build-spec.md).

> **One-line rule:** A new **page** needs *both* demand (someone searches the
> exact query) *and* supply (enough distinct, quality items to not be thin). A
> **section** needs neither — it's enrichment of a page that already exists.

This is the same decision as "secondary content earns its own H1/title vs.
stays a section" (JTBD §2): a spoke that clears the gate becomes a page with its
own primary intent; everything else stays a section under the hub's intent.

---

## 1. It's a 2-factor gate, not a count threshold

The common mistake is treating "how many items do we have" (**supply**) as the
only axis. Supply tells you whether a page *can* be good (not thin); **demand**
tells you whether the page *should* exist at all. You need both.

- **Supply** = count of distinct, copy-worthy items for the subdivision.
- **Demand** = monthly search volume for the exact query, plus forum evidence
  (same signals as `demand_confidence` in the library workflow).

---

## 2. The gate

| Supply (distinct items) | Decision |
|---|---|
| **< ~12** | **Always a section** on the parent (hub) page. Too thin to rank or be indexed as its own page — Google treats a ~9-item page as a doorway/thin page. |
| **~12–29** (the in-between) | **Demand decides.** Real volume for the exact query (≈ **50+/mo**, or `medium`+ `demand_confidence`) → build the page **and backfill depth** (intro, usage, categories, FAQ) so a 15-tile page isn't thin. Otherwise → section. |
| **30+** | **Page** is justified on supply alone — but still only build it if there's *some* demand or internal-link value. Supply without demand is not a reason to ship. |

So 9, 10, 11 → section. 12–29 → look at the search volume. 30+ → page (if any
demand). That is the entire rule.

---

## 3. The teaser cap is about structure, not count

A separate question is *how many* items to show in a section. The **6–8 cap is
not about the item count — it's about whether a spoke page exists:**

- **A spoke page exists** → the parent shows a **capped teaser** (6–8 best
  items) **+ a "see all N →" link** to the spoke. Don't dump the full set on
  both.
- **No spoke page exists** → the section **is** the canonical home, so **show
  everything you have** (11 cat faces → show all 11; never cap at 8 and orphan
  the other 3).

---

## 4. Hub-and-spoke wiring

- The **subject** page is the hub (e.g. `/library/animal-emojis/`).
- A qualifying **subdivision/format** is a spoke (e.g. a `cat-kaomoji` page).
- The spoke must live in the **namespace for its page type** (JTBD §4) — a
  reference spoke under `/library/`, an answer under `/answers/`, etc.
- Link **both ways**: hub → spoke teaser ("see all →"), spoke → hub.
- **Declare canonical ownership.** Add the spoke to the build spec's ownership
  table and never let hub and spoke target the same search intent — that's
  self-cannibalization (JTBD §7).

---

## 5. Guardrails

- **Thin content:** a page under ~12 items with no backfill copy will likely be
  left unindexed. Don't ship it; fold it. A real page must also clear the
  **ad-network content-length threshold** (JTBD §8) — anything thinner is a
  section by definition.
- **Cannibalization:** if a proposed spoke overlaps the hub's intent, fold it
  in instead (mirrors the auditor's `review-overlap` → `fold-into:<slug>`
  verdict in the library workflow).
- **Combinatorics:** do **not** mechanically generate `subject × format ×
  emotion`. Build only the intersections that pass the gate (JTBD §3).

---

## 6. Worked example — kaomoji / text faces (US data, 2026-06)

Demand for `[subject] kaomoji` (broad-match, US — the market analysed here;
any "Yakuza 0" rows are the video game and person-name rows are noise).

> **Correction (2026-06):** an earlier draft of this section read "MX is
> near-zero." That was true only for the *modifier* broad-match it sampled.
> The **head term is huge outside the US** — `kaomoji` is ~165K/mo in MX and
> ~1.4M globally (ID 201K · MX 165K · PH 135K · US 90.5K). "kaomoji" is a
> script-identical loanword, so the English page competes in every market
> (emojicombos' English page ranks #1 for "kaomoji" in Brazil). The lever is
> owning the **loanword**, not translating it — native-language terms
> (`caritas japonesas` ~1.1K, `carinhas` low thousands) are a rounding error
> by comparison. See §7.

**Emotion / aesthetic cluster (real demand):**
`heart 480 · cute 390 · sad 260 · happy 170 · star 90 · shrug 70 · flower 50 · angel 40`

**Animals:** `cat 170` — and `bear / bunny / dog / bird / fox / fish / pig /
puppy` all **0**.

Applying the gate:

| Candidate | Demand | Verdict |
|---|---|---|
| `/animal-kaomoji` page | only cat has any | **No page.** No "animal kaomoji" cluster exists — it's one animal. |
| Cat text faces | cat 170 | **Section** on the cat/animal hub (satisfy it inline). |
| Bear / bunny / dog text faces | 0 | **Teaser enrichment only**, never pages. |
| `cute` / `heart` / `sad` / `happy` kaomoji | 40–480 | **Spoke pages** — but they belong on the **face / emotion** hubs, not animal. |

**Takeaway:** the demand for text faces is in *emotions*, not *animals*. The
hub-and-spoke instinct was right; the data just points the spokes at emotion
pages. This is JTBD in action — people express *feelings* in text faces far
more than *animals*.

---

## Quick reference

```
deserve its own page?
   ├─ supply < 12 ............................ SECTION (show all)
   ├─ supply 12–29 ........................... DEMAND DECIDES
   │      ├─ ≥ ~50/mo (or medium+ confidence)  PAGE (backfill depth)
   │      └─ else .......................... SECTION (show all)
   └─ supply 30+ ............................. PAGE if any demand, else SECTION

showing in a section:
   ├─ spoke page exists ..................... teaser 6–8 + "see all →"
   └─ no spoke page ........................ show everything
```

---

## 7. Built — kaomoji emotion-modifier spokes (2026-06)

Re-scoped against keyword-level demand (deduped exact `[mood] kaomoji/kamoji`,
not the inflated topic buckets) × the international multiplier (the loanword
and its modifiers are script-identical, so each spoke also captures
MX/BR/ID/PH). Supply was checked per mood — every shipped spoke carries
16–23 distinct faces, clearing the thin-content gate.

### Canonical ownership table

| Page | Owns the intent | Status |
|---|---|---|
| `/library/text-faces-kaomoji/` (hub) | the **head term** — `kaomoji` / `kamoji` / `text faces` | live |
| `/library/love-kaomoji/` | `heart / love / kiss / hug kaomoji` (~6,080 US) | **built** |
| `/library/happy-kaomoji/` | `happy / smiling kaomoji` (~4,430 US) | **built** |
| `/library/cat-kaomoji/` | `cat kaomoji` (~3,700 US) | **built** |
| `/library/crying-kaomoji/` | `crying / sad kaomoji` (~2,660 US) | **built** |
| `/library/cute-kaomoji/` | `cute kaomoji` | **built** |
| `/library/sparkle-kaomoji/` | `sparkle / star kaomoji` (~1,690 US) | **built** |

Hub keeps each mood as a **teaser section + "see all →"** linking its spoke;
each spoke links back to the hub. Hub owns the head term, spokes own
`[mood] kaomoji` — different queries, no self-cannibalization.

**Tier 2 (not yet built):** `angry-kaomoji` (~1,040) and `shocked-kaomoji`
(nervous/surprised, ~1,210).

**Stays a section/teaser, not a page:** dog + other animals (demand exists at
`dog kaomoji` 590 but supply fails the gate — dog kaomoji are sparse and read
as generic animal); shrug, lenny, hug, sleepy, table-flip (thin exact demand).

### Note on `cute` — why it's a page despite thin US exact volume

`cute kamoji` is only ~390 US exact, which would normally fail the gate. It
ships as a page because the demand is **international**: `cute kaomoji` is
~2,900 in Brazil alone, and the script-identical loanword means the English
page serves those markets. This is the one spoke justified by global rather
than US-only demand — flagged so it doesn't read as a gate violation.

### Superseded

§6's row "`cute / heart / sad / happy` kaomoji … belong on the **face /
emotion** hubs, not animal" is now realised as dedicated kaomoji spokes under
`/library/` (the kaomoji hub IS the emotion hub for text faces). Cat earned a
page after all — re-checked, it clears **both** demand (×international) and
supply, where §6 only had the thin US-exact 170.
