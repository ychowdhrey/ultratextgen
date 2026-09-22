# Printables scope — the boundary and how it was decided

Current invariant: `.claude/rules/printables.md`.

## The boundary is typography-native (added 2026-07-10)

"Visual asset" does not mean "any kids' worksheet". A printable belongs in this repo
only if the thing being rendered is **text** — a letter, a word, a name, a phrase.

Generic worksheet/activity content that is not fundamentally text — shape-only
tracing, pre-writing motor strokes, mazes, math worksheets — is out of scope here,
**even though `printablesEngine.js` could technically render it**. That demand is
real but belongs to a possible future, separate property once this site is more
established. Do not build it under this brand.

## The test governs, and `word searches` left the exclusion list (owner decision, 2026-09-16)

The rule stated the boundary two ways in one paragraph and they disagreed. A
2026-09-12 opportunity analysis measured the contradiction: a word search built from
a teacher's own spelling list **passes the test cleanly** — the user types words and
sees *those words* rendered, hidden in a grid — and was simultaneously **named in the
exclusion list**. That was the largest demand in the document (~81,200/mo across the
head terms) sitting on both sides of one sentence.

**The test wins.** Where the two disagree, ask whether the visitor's own typed text
is what gets rendered; the examples are illustrations of that test, never a second
rule. So a word search, a crossword and a word scramble built from typed words are
**in scope**; a maze, a shape-tracing sheet and a math worksheet are still out,
because nothing the visitor types appears in them.

### Two constraints came with the decision and are part of it

- **Enter on the long tail and the anti-copying batch feature, never the head
  terms.** `word search maker` is 27,100/mo at KD 72 and `crossword puzzle maker`
  22,200 at KD 56, which are not winnable from here. The realistic entry is
  `super teacher worksheets word search generator` (1,600, KD 29).
- **The differentiator is generating N different versions of one list** so
  neighbours cannot copy — the one thing this lane has that tracing sheets cannot,
  because a tracing sheet has no order to vary.

Nothing here bypasses the rest of the rules: a new URL still goes through the
Hub-vs-Spoke test, "check who already owns it", the English-Parent Rule and the
standing kill list.

**Status (2026-09-22):** `printables/word-search-maker/`,
`printables/crossword-maker/` and `printables/word-scramble-maker/` have shipped,
with `test:word-search` and `test:word-puzzles` gating them.

## The `/learn/` pillar sits close to this boundary

`/learn/` carries handwriting/pre-writing/tracing *articles* — content *about*
handwriting rather than a printable itself. It is close enough to this boundary
(shape-only and pre-writing content being out of scope for printables) to be worth an
explicit look; it is currently undocumented as a lane. See `docs/README.md`'s Known
gaps.
