# A Unicode character name cited as the identifier stays as written; everything around it is translated

**Owner decision, 2026-11-08**, confirming the owner's execution brief of 2026-10-28 for the
invisible-character family: *"Distinguish technical identifiers from user-facing
descriptions. Do not translate standardized identifiers or alter copied characters."*
Not yet executed as a page change; this records the rule and reconciles
`.claude/rules/localization.md` §5 with it. The invisible-character family (29
control-character names across about 17 locales) already follows it and stays as it is.

## The rule

1. **A character name cited as the character's identifier stays as written, in every
   locale.** That covers the formal Unicode name (`ZERO WIDTH JOINER`) and the
   title-case rendering a page cites with the code point (`Zero Width Space: U+200B`,
   `Hangul Filler (U+3164)`). It is how a reader finds the same character in Unicode
   charts, developer documentation and font tools, so translating it breaks the job it
   does.
2. **It must read as the identifier**: paired with its code point, labelled as the
   Unicode name in the page's language, or set in `<code>` or `lang="en"`. A bare English
   phrase with nothing marking it is untranslated copy, not an identifier.
3. **Everything around it is translated**: the explanation, the section heading, the card
   title, the verb in an `aria-label` ("Kopieer …", "Salin …") and any human-facing
   description of what the character does. Neither may be mistaken for the other.
4. **The same name used as ordinary prose or as a human label**, not cited as the
   identifier, is page copy and is translated. Use the word the locale's own pages already
   use for the character where one exists.

## Earlier rule

Until this decision the localization rule exempted only the ALL-CAPS form, called
title-case renderings never exempt, and treated a name in a heading or `aria-label` as a
defect regardless. The owner's 2026-10-28 brief and this decision overrule that for a name
cited as the identifier; the rest of the rule (translate the surrounding copy, never ledger
an untranslated string as identical) is unchanged.
