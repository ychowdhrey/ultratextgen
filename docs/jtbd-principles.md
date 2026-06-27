# Jobs-To-Be-Done (JTBD) — Product Principles

This is the **why** behind UltraTextGen's content and information architecture,
plus the reusable **global rules** every page decision follows. It is the
evergreen reference; the concrete, dated applications of these rules live in
build specs such as [`jtbd-build-spec.md`](./jtbd-build-spec.md). The
mechanical companion — *does this become a page or a section?* — is
[`page-vs-section-decisions.md`](./page-vs-section-decisions.md), and the
production pipeline that enforces demand gating is
[`unicode-library-workflow.md`](./unicode-library-workflow.md).

> **The job:** *"Help me express this feeling / thing / identity in text —
> easily, and more expressively than plain words."* People hire UltraTextGen
> to make their writing more expressive and effortless. Everything below
> follows from that one sentence.

---

## 1. Users come for the *subject*, not the *format*

Someone wants to say **cat**, **sad**, or **love**. They do **not** wake up
wanting "a kaomoji" vs. "an emoji" vs. "ASCII art" — **format is a taxonomy
detail they don't care about, and often can't even name.** Most users who want
`=^_^=` have never heard the word *kaomoji*; they search "cat text face" or
just land on the cat emoji page.

**Implication:** organize primarily by **subject / intent**, and surface the
multiple formats that serve that intent **together**, on the same page, in
intent order (the most-wanted format first).

---

## 2. One primary intent per page

Each page has exactly **one** primary target query. Everything else is
secondary, served as a **section** — never as a competing H1/title. This is the
unit of the whole system: a page = a job. (How much secondary content earns its
own page vs. stays a section is the
[page-vs-section gate](./page-vs-section-decisions.md).)

---

## 3. Title/H1 must match the searcher's verb

The page must read, in the SERP, as *the thing being searched for*. An **answer
query** ("do you need nitro for discord fonts?") needs a title that answers it —
a generator/tool title does not win a question query, and vice-versa. Match the
searcher's verb and intent, or the page loses the click even when it ranks.

---

## 4. Namespace = page type

URL namespace encodes page type so intent and template stay aligned:

| Page type | Namespace | Schema |
|---|---|---|
| Answer / Q&A | `/answers/` | `QAPage` / `FAQPage` |
| Style generator | `/category/` | `WebApplication` |
| Symbol/character reference | `/library/` | `Article` + `BreadcrumbList` |

Don't mix types within a namespace, and match the structured-data type to the
page type.

---

## 5. Serve the primary intent first, then enable discovery

A user who came for the cat **emoji** 🐱 should get that immediately — then be
*delighted* to discover cat **text faces** they didn't know existed.

- **Primary format up top** satisfies the job fast.
- **Companion formats below** ("came for emoji, found text art") create
  discovery and time-on-page without making anyone hunt.

This is why the default pattern is **hub-and-spoke**: every new page links
**up** to its hub once; tools/generators get a **downstream CTA**; reference
pages cross-link both ways. Mechanics in
[`page-vs-section-decisions.md`](./page-vs-section-decisions.md).

---

## 6. Demand decides — never the cross-product

The tempting failure mode is **combinatorial generation**: mint a page for
every `subject × format × emotion` intersection. The top competitor
(emojicombos.com) does exactly this — ~880 internal tag pages, every combo
multi-tagged. It ranks **only** because of domain authority and sheer volume;
each page is thin and the UX is a wall of combos.

**We do the opposite.** We build a page **only** where a real person searches
for it *and* we can make it genuinely deep and useful. Coverage comes from
**demand**, not from the cross-product.

> **Rule:** Let demand, not combinatorics, decide what exists. Over-
> categorization is a cost (cannibalization, thin content, split authority),
> not a free win.

Operationalized by the demand gate in the library workflow (`forum_evidence` +
`search_volume` → `demand_confidence`) and the page-vs-section gate.

---

## 7. Declare canonical ownership — pages must not compete

Every distinct query family has exactly **one** declared canonical owner; all
related pages **link** to it instead of re-hosting the content. Maintain an
explicit **canonical-ownership table** in each build spec (see the example in
[`jtbd-build-spec.md`](./jtbd-build-spec.md)) so no two pages target the same
primary query. This concentrates link equity and prevents self-cannibalization.

**Corollary — additive only:** new pages must target *different* SERPs than the
ones existing pages already win. Never remove or relocate content that holds a
ranking to chase an adjacent query; add a new owner for the new intent and
cross-link.

---

## 8. Useful > Impressive (and ad-eligible)

Consistent with the repo's core philosophy (*Fast > Fancy, Clean > Clever,
Useful > Impressive*): a page earns its place by **doing the job better** —
faster copy, the right characters, clear intent — not by existing to capture a
long-tail string we can't actually satisfy. Practically, a real page is also
**content-bearing and above the ad-network length threshold**; anything thinner
belongs as a section, not a page.

---

## 9. Differentiator discovery — mine frustrations into *features*, not just pages

Demand (§6) tells you **what to build**. It does **not** tell you **how to win**
the SERP once you're on it. The KD-39, $0.01-CPC, DR-15-ranks-#3 reality of this
niche means pages are won on **doing the job better**, not on links — so every
build must also answer *what would make this the best `<thing>` generator?*

The repeatable method that produced the small-text differentiator list
(2026-06), to run **every** time we scope a cluster:

1. **Read the same forum signal twice.** The forum sweep
   ([`unicode-forum-research-skill.md`](./unicode-forum-research-skill.md))
   surfaces both *intents* (→ JTBD/pages) and *frustrations* (→ features).
   Don't stop at intent. Harvest the complaints: "missing letters," "shows as
   boxes on Android," "Hypixel says invalid characters," "Reddit stopped
   rendering `^()`." Grade them the same way (cross-community consistency, not
   single-thread volume).
2. **Keep only frustrations no current ranker solves.** A frustration the
   top-5 already fix is table stakes, not an edge. The winners are the
   recurring pains every competitor *ignores*. That gap **is** the moat.
3. **Convert each surviving frustration into a concrete capability** the
   renderer/UI can own — not a paragraph of copy. Examples from small-text:
   per-character coverage indicator (missing-letter honesty), per-platform
   "safe mode" (tofu boxes), native-vs-Unicode router (use Discord `-#` /
   Reddit `^()` when better), mixed big/small composer (shrink a *selection*),
   honest "visual only — char count unchanged" note.
4. **Prefer capabilities the architecture is already half-way to.** The
   renderer's existing fallback system is most of a coverage indicator and a
   safe-mode; lean on what exists before inventing.
5. **Honesty is a differentiator here.** Competitors mislead ("saves 40%
   space," silent letter drops). Correcting them earns trust with the exact
   communities (HN, Tumblr, accessibility-aware users) that amplify tools.

> **Rule:** Every cluster scope ships two lists — *pages* (from demand) **and**
> *differentiating features* (from unsolved frustrations). A scope with only
> pages is half-done.

**Where un-built findings go.** Demand and frustrations we surface but don't
build immediately must land in the standing
[`opportunity-register.md`](./opportunity-register.md) — the scannable backlog,
indexed by cluster **and by market/language**. A dated build spec freezes a
decision; the register is the evergreen "what haven't we capitalized on yet?"
ledger, and the **per-language** rows are the part most easily lost. A research
pass isn't finished until its un-built findings are rows there.

This is additive to §6/§7, not a replacement: features live on the canonical
owner page for the job; they never spawn a thin page of their own.

---

## Decision checklist (apply before creating or expanding content)

1. **What job is the user hiring this page for?** State it in their words, as
   one primary intent.
2. **What's the primary format/answer for that job?** Put it first; phrase the
   title/H1 to match the searcher's verb.
3. **Correct namespace + schema for the page type?** (§4)
4. **What companion formats serve the same job?** Surface them below
   (hub-and-spoke).
5. **Is there real demand** (forum evidence + search volume)? If not, don't
   build it — at most fold it into an existing home.
6. **Page or section?** Apply
   [`page-vs-section-decisions.md`](./page-vs-section-decisions.md).
7. **Who is the canonical owner of this query?** If one exists, link — don't
   duplicate. If new, add it to the ownership table and keep it additive.
8. **What would make this the best `<thing>` generator?** Run the
   differentiator-discovery pass (§9): list the unsolved frustrations and the
   capabilities that answer them. Ship that list alongside the pages.
