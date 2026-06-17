# Jobs-To-Be-Done (JTBD) — Product Principles

This is the **why** behind UltraTextGen's content and information architecture.
It is the reference for product/IA decisions; the mechanical companion —
*does this become a page or a section?* — lives in
[`page-vs-section-decisions.md`](./page-vs-section-decisions.md), and the
production pipeline that enforces demand gating lives in
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

## 2. Serve the primary intent first, then enable discovery

A user who came for the cat **emoji** 🐱 should get that immediately — then be
*delighted* to discover cat **text faces** they didn't know existed.

- **Primary format up top** satisfies the job fast.
- **Companion formats below** ("came for emoji, found text art") create
  discovery and time-on-page without making anyone hunt.

This is why the default pattern is **hub-and-spoke**, not isolated silos —
see [`page-vs-section-decisions.md`](./page-vs-section-decisions.md).

---

## 3. Demand decides — never the cross-product

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

This principle is operationalized by the demand gate in the library workflow
(`forum_evidence` + `search_volume` → `demand_confidence`) and by the
page-vs-section gate.

---

## 4. One canonical home per intent

Every distinct job should have exactly **one** page that owns it. Related
pages **link** to that home rather than re-hosting the same content. This keeps
link equity concentrated and stops our own pages from competing with each
other for the same query (keyword cannibalization).

---

## 5. Useful > Impressive

Consistent with the repo's core philosophy (*Fast > Fancy, Clean > Clever,
Useful > Impressive*): a page earns its place by **doing the job better** —
faster copy, the right characters, clear intent — not by existing to capture a
long-tail string we can't actually satisfy.

---

## Decision checklist (apply before creating or expanding content)

1. **What job is the user hiring this page for?** State it in their words.
2. **What's the primary format for that job?** Put it first.
3. **What companion formats serve the same job?** Surface them below.
4. **Is there real demand** (forum evidence + search volume)? If not, don't
   build it — at most fold it into an existing home.
5. **Does it deserve its own page or a section?** Apply
   [`page-vs-section-decisions.md`](./page-vs-section-decisions.md).
6. **Is there already a canonical home?** If yes, link — don't duplicate.
