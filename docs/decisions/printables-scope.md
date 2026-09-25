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

## Printing a set of letters: which letters, then print size, then one button (owner decision, 2026-09-25)

The block under every letter page that prints more than one letter asked three
questions for one answer. Print size (Full page / Medium / Small), a row of
unlabelled 1 / 2 / 4 chips and a separate "Save as a book" button each decided how
many letters share a page, and the button you pressed silently ignored some of them.
Rendered on `/printables/alphabet-coloring-pages/` in headless Chromium:

| You picked | What printed |
|---|---|
| AEIOU, 4, Medium, then Download PDF | all 36 characters on 9 pages |
| Medium, AEIOU, 4, then Save as a book (letter A page) | all 26 letters on 7 pages |
| Full page, then Download PDF | 16 small letters per page, not "one big letter per sheet" |
| 2 per page | the same 2.0in letters as 4 per page, on 18 pages instead of 9 |
| Medium (~4 in) / Small (~2 in) | 2.3in / 1.1in capitals |

Of 15 control-and-button pairs, 8 ignored or misused the choice, and underneath there
were only three kinds of printed page. The owner's direction was to redesign it:

- **Which letters?** comes first: the whole set, A–Z, 0–9, the page language's
  vowels, or "Pick letters" (a typed run such as `A-E` or `B D P Q`). The chips are
  built from what the page prints, so a letters-only page never offers numbers and a
  Polish page's vowels are A Ą E Ę I O Ó U Y.
- **Print size** second, as three pictured choices that are counts: Full page is one
  letter per page, Medium a 2×2 grid, Small 4×4 (3×2 and 6×3 in landscape). Outline
  pages also show the letter height, computed from the paper and the face and rounded
  to the nearest ¼in (0.5cm outside English), always read as "about". Measured at print
  resolution it lands within 0.1in of the printed capitals on the coloring, bubble,
  tracing and Spanish-chart faces; the graffiti face runs 0.2–0.4in high. Script, dot
  and Unicode-glyph pages show the count alone, because the same formula said 4.5in for
  a cursive A that printed 3.1in.
- **One button** at the end, labelled with the pages it will use ("Download PDF ·
  3 pages"). The "Save as a book" button, the 1 / 2 / 4 row and the "A–E" chip are
  gone. PNG is offered only when the result is one page, not as one image of every
  page stacked (a 1440 × 17,172px file at Medium).
- **2 per page is dropped**: portrait 2-up printed the same letter size as 4-up on
  twice the paper.
- **Typed letters print in the page's alphabet order, once each** ("MIA" prints A, I,
  M), and the block says so. Owner decision: spelling a name in order is the Coloring
  Page Maker's job. Nothing matched now disables the button with a message, where it
  used to print the whole set in silence.
- **Defaults are what each page printed before**: Small on the hubs whose main button
  printed the compact sheet (16 per page on Letter), Full page on book pages and the
  per-letter pages. Dot-to-dot pages have no Small: its numbers print at 2.7pt.
- `/printables/block-letters/` keeps the old control, byte for byte, until its
  size-control readout lands (the freeze recorded 2026-09-22). Its locale siblings are
  separate `printable_page` values and take the new control.

**Open (owner):** a "Large" size, two letters side by side on a sheet turned
sideways. Rendered with the engine: 3.3in capitals and A–Z on 13 sheets, between Full
page (4.6in, 26 sheets) and Medium (2.3in, 7 sheets). Not built.

**Follow-up:** the FAQ on the seven Spanish-alphabet-chart pages and the dot-to-dot
alphabet pages still names the old "Save as a book" button. Rewriting it touches
pages whose titles and headings carry em dashes, so it is a separate copy pass.

**Status (2026-09-25):** not yet merged.

## The `/learn/` pillar sits close to this boundary

`/learn/` carries handwriting/pre-writing/tracing *articles* — content *about*
handwriting rather than a printable itself. It is close enough to this boundary
(shape-only and pre-writing content being out of scope for printables) to be worth an
explicit look; it is currently undocumented as a lane. See `docs/README.md`'s Known
gaps.
