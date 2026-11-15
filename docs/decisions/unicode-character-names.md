# Official Unicode character names stay verbatim; the label around them is translated

**Owner decision, 2026-11-08.** Not yet executed on any page: this records the rule
and reconciles `.claude/rules/localization.md` §5 with it. Page edits follow in their
own PRs.

## The rule

1. **An official Unicode character name is an identifier, not English.** Where a page
   presents it *as* the identifier, it keeps the formal ALL-CAPS form exactly as the
   Unicode Standard writes it (`ZERO WIDTH JOINER`, `HANGUL FILLER`, `WORD JOINER`),
   in every locale and in any slot, a tile label included.
2. **It must read as the identifier.** It sits beside the reader's own label and is
   marked as the official name: a "Unicode name" label in the page's language, a
   `<code>` element, or `lang="en"` on the element that carries it. A bare English
   string with nothing marking it is still untranslated copy.
3. **The human label is translated.** The heading, card title, section label or
   `aria-label` that names the thing for the reader is page copy and is written in the
   page's language, with `ZERO WIDTH JOINER` beside it as its official name. Use the
   word the locale's own pages already use for the character where one exists.
4. **A title-case rendering is a label, not the identifier.** `Zero Width Joiner` is
   English prose, so a locale page translates it. Only the formal form in rule 1 is
   exempt.

## Why

The invisible-character family carries 29 control-character names. Localising the
identifier breaks the one thing a reader uses it for (finding the same character in
Unicode charts, `unicode.org` lookups, developer docs and font tools), while leaving the
human label in English leaves a locale page half in English. Keeping both, and saying
which is which, serves both readers.

## Earlier rule

Until this decision the localization rule exempted the ALL-CAPS name only where it was
*cited* (prose, a table cell, a tile label) and called it a defect in a heading, card
title, section label or `aria-label`. That is unchanged for an unmarked name; what
changed is that a marked official name beside a translated label is correct in any
slot.
