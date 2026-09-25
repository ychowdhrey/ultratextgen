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

## Sheet options are standard, and the English-only labels are translated (owner decision, 2026-09-25)

An audit of every printables page found the same option built differently or not
at all from sheet to sheet: a class list behind a visible switch on one tool and a
collapsed box on nine, a title field on four, a name-and-date line forced on some
and absent from the rest. The owner's direction: **an option follows the job, not
the page**, and it looks and behaves the same wherever it appears.

| Option | Decision |
|---|---|
| Class set | The "Who is this for? One sheet / Whole class" switch wherever a typed **name** makes the sheet. A word list (spelling list, sight words) is not a class and keeps its own box. |
| Name and date line | One checkbox on every sheet. **On** by default for sheets a child hands back (tracing, name sheets, word puzzles), **off** for display sheets (letters, designers, banner). This supersedes the 2026-09-16 "always on, no toggle" choice for the worksheets: the line is still printed by default, and now it can be switched off. |
| Sheet title | One field in the same "More" section on every sheet. Empty keeps the sheet's own title, and a sheet that printed no title still prints none. `{name}` puts each child's name into a class set's titles. |
| Print size | On every letter page. The cursive, calligraphy and dot-to-dot alphabets, which printed single letters only, gained the whole-alphabet book and grid it acts on. |
| Letter style | **No change.** Each page keeps its one style; a picker of every style on every page would make each page do its siblings' job. |

**The defaults are what each sheet already printed**, so no existing PDF changes
until a visitor asks for something different.

**Translations.** The class-set switch (fr, es, pt, id), left-handed mode, letter
spacing, bridged stencils, high contrast and the "More" section had been held back
because this site's own pages did not attest a word for them. The owner asked for
them in every language. Each label was translated and checked against native
worksheet, teaching and software pages, and the site's own wording was preferred
wherever it already existed (for example the French and Spanish tracing pages
already said "une fiche par enfant" and "una ficha por niño", and the German,
Italian and Polish coloring pages already carried the title and name-line labels).
A few short labels ("Who is this for?", "Whole class") are plain phrases with no
UI page to cite; they use the site's existing words.

**Follow-up the same day (owner):**

- **The monogram and cross-stitch tools get the same "More" section.** Their
  drawing stays their own; the shared module adds the title and the name line
  around the finished canvas, and leaves a sheet nobody changed byte-for-byte as
  it was.
- **Dutch.** The engine had no Dutch at all, so its one printables page ran every
  control in English. A full Dutch set now exists, checked against the site's own
  Dutch pages first ("vel", "printen", "blokletter") and native teacher,
  worksheet and software pages for the domain terms.
- **A class list wherever a typed name makes the sheet**, including the 28 locale
  letter pages whose name section never had one. A fixed-phrase page opts out
  (`roster: false`), as the Indonesian birthday-phrase page does.

**Status (2026-09-25):** the options, print size and translations shipped in
PR #937 (merged, `ed12d4949`). The follow-up (monogram and cross-stitch, Dutch,
class list on every name tool) is PR #941, not yet merged.

## The `/learn/` pillar sits close to this boundary

`/learn/` carries handwriting/pre-writing/tracing *articles* — content *about*
handwriting rather than a printable itself. It is close enough to this boundary
(shape-only and pre-writing content being out of scope for printables) to be worth an
explicit look; it is currently undocumented as a lane. See `docs/README.md`'s Known
gaps.
