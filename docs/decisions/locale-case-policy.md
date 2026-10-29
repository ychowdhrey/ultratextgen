# Locale case policy — Title Case follows the page's language

**Owner decision, 2026-10-28.** The case converter's Title, Capitalized and
Sentence case follow the casing rules of the page's language, on every
case-converter page cleared for it, and every future one by default. Revenue
pages and pages under a running measurement are not changed by this.

Status: implemented in the renderer, the gate and the generator (this PR);
page rollout in a separate PR. Not yet merged when this was written. Link the
merge commits here when they land.

## The problem

Title Case had one rule set, written for English: a list of English small words
(`a, an, and, the, of, in, …`), English surname fixes (McDavid, O'Brien) and the
pronoun "I". Every locale page ran it. On the German page
"der hund und die katze" became "Der Hund Und Die Katze"; on the Turkish page
"suç ve ceza" became "Suç Ve Ceza"; on the Polish page "kot i pies" became
"Kot I Pies". The German and French pages answered this with a sentence telling
the reader the list is English. That is a disclaimer, not a fix
([`limitations-become-features.md`](./limitations-become-features.md)).

## The mechanism

`renderer.js`, block **LOCALE CASE POLICY**.

1. **Opt-in per page.** A page runs the policy only when its `<html>` carries
   `data-case-policy="locale"`. Without it, every case procedure runs the old
   code unchanged. `renderer.js` is shared by every generator page, so leaving a
   protected page's HTML alone is not enough on its own; the opt-in is what makes
   the shared file safe to change. `scripts/lib/case-policy.test.js` proves it:
   for every page language in the tree, a page without the attribute renders the
   same digests as the pre-policy renderer over the test corpus, and the opt-in
   changes no other style.
2. **One table of languages.** Each entry is a language's minor words, the
   words Title Case keeps lowercase unless they open the text, with the rule they
   come from:

   | Language | Rule | Last word |
   |---|---|---|
   | en | the existing list, unchanged | capitalised |
   | tr | TDK / Dil Derneği: "ve, de, ile, ki, ya, ya da" and "mi" lowercase in titles | lowercase |
   | id | PUEBI: every word capitalised "kecuali kata tugas, seperti di, ke, dari, dan, yang, dan untuk" (only the six named) | lowercase |
   | es | RAE 2010: periodical and collection names capitalise nouns and adjectives ("El Barco de Vapor") | capitalised |
   | pt | Acordo 1990, Base XIX: later words of a title may take capitals; function words stay lowercase | capitalised |
   | pl | PWN: institution names capitalise every word except conjunctions and prepositions | capitalised |
   | de, fr, it, nl | no native title-case convention; Title Case keeps the meaning the pages give it ("articles, conjunctions and short prepositions stay lowercase") for that language's own articles, conjunctions and prepositions | capitalised |
   | ja, ko, zh | uncased scripts; nothing is converted; Latin text is read as English | — |

   **Not covered, kept on the old behaviour:** Vietnamese (no attested rule for
   function words in a capitalised title) and Malay (the DBP title rule could not
   be confirmed from a primary source). Every other language too, until someone
   adds it with its source.
3. **The page language is a guess about the text.** People paste English into a
   German page; the pages' own examples are English. So Title Case counts the
   minor words that belong to only one of the two lists, and uses English rules
   when English has more, the page language's when it has more, and both lists on
   a tie. "i" is not counted (it is English, Polish and Italian).
4. **Unicode fixes, policy pages only:** a letter outside the BMP is capitalised
   as one character; Latin digraph letters take their titlecase form (ǆ → ǅ);
   Dutch IJ is one letter (ijs → IJs); French and Italian elided articles are
   split so the word after them is capitalised ("La Communauté de l'Anneau").
5. **English-only fixes stay English.** McDavid/O'Brien and the pronoun "I" run
   only when the text reads as English.

## Future pages

- `scripts/build_category_locale_pages.py` writes `data-case-policy="locale"`
  on every case-converter page it builds.
- `npm run check:case-policy` (gating) fails a case-converter page added on a
  branch without the attribute, a page opting in for a language the table does
  not have, and a new page declaring `legacy` in a language that has a policy.
  `legacy` is for a language with no verified rule and is a decision to record.
- `scripts/lib/case-policy-newpage.test.js` builds a new Dutch page through the
  generator and proves it inherits the rules.
- `npm run test:case-policy-browser` compares every case-converter page's copy
  buttons in Chromium with the Node result.

## What was left alone

- **SEO titles, headings and metadata.** This is about the text a visitor
  converts, not about how pages are titled.
- **Sentence case in German** still lowercases nouns; the German page says so.
  A tool cannot tell a German noun from any other word.
- **ß in UPPERCASE** still becomes SS (Unicode's default). Offering ẞ is a
  separate owner call.
