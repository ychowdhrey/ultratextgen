# Check surfaces — pages that assert facts

Invariants: `.claude/rules/frontend-javascript.md` → "Tests". Why the counter has
tests: `docs/architecture/validation-system.md`.

A **Check surface** is a page whose value is a claim that can be wrong: a limit, a
count, an encoding, a decode, a capability comparison. Those get tests and a dated
re-verification. A page that merely renders copy does not.

There is no test framework and no runner — every test is a plain file you `node` or
open in a browser:

| Test | Covers |
|---|---|
| `js/counter/counterRules.test.js` | counting modes, per-language GSM-7 encoding flips, every reducer, `trimToFit` boundaries, `LIMITS` table integrity |
| `js/counter/counter.test.html` | the DOM half: two-tier picker, live count, inspect line, fix bar, undo, trim, fit-grid ordering, SMS segments, soft-limit warning, clear |
| `usecase/zalgo-text/zalgo-text.test.js` | the zalgo engine's pure half (below) |
| `js/saved/savedItems.test.js` | 44 assertions over the saved store |
| `js/share/shareCore.test.js` | 148 assertions, including the single-writer invariant |
| `js/share/shareSave.test.html` | the DOM half, against a copy of the real tile markup |
| `js/printables/{qr,stencil,wordSearch,wordPuzzles}.test.js` | the printables engines |
| `js/vertical/verticalLayouts.test.html` | vertical layout |
| `js/skintone/skinTone.test.js` | the skin-tone picker's rule (sliced from `symbol-explorer.js`) against the toned sequences Unicode's emoji-test.txt lists for every tile in an opted-in section (`js/skintone/skinToneExpected.json`, regenerated with `npm run build:skin-tone-fixture` after any new opt-in); families, combos and toned tiles are never touched; every opted-in locale carries the picker strings |
| `js/gamename/gameRules.test.js` | the game-name checker (`npm run test:game-rules`, gating): the in-game outcome reporter; Xbox's two length tiers; Discord's display name versus its username; the games whose verdicts must not move; which failures get an English reason; the couple generator's empty state; and every ready-made name on a page whose game has a published rule, judged by that rule (below) |
| `scripts/test-unicode-reference-sets.py` | the complete Unicode sets on the braille, box-drawing, playing-card, dice/domino and number library pages and their locale siblings: every code point, keycap form (base + U+FE0F + U+20E3), order and label re-derived from the code point (dot bits, UCD names), label-in-name aria, locale wording, and the sets excluded because Android's system symbol font has no glyph for them (tarot trumps U+1F0E0..U+1F0F5, red joker U+1F0BF); `--self-test` mutates pages and fails unless each mutation is caught by its own check |

`counter.test.html` runs against a deliberately **non-English** I18N block, so it also
asserts that a translated page renders translated fix-bar buttons instead of falling
back to English — a regression that would otherwise only ever be noticed by a reader
of that language.

`shareSave.test.html`'s 37th assertion found a third runtime bug on its first run:
`clear()` emptied the strip and left every tile star still lit, because only the
strip's own Clear button repainted them and any other path into `clear()` skipped it.

## Zalgo cards must decode back to their own label

`usecase/zalgo-text` and its eleven locale siblings each show six copy-paste example
cards, with the page's own **unzalgo** widget directly below them. That widget strips
combining marks **by codepoint range** — it does not decompose. So a card only works
while its marks are stored as *base + combining mark*.

**Every zalgo string on this site is therefore NFC-fragile, by construction.** Run any
tool that NFC-normalises these files and 69 of them compose into different letters at
once — `A`+U+0328 becomes the single codepoint `Ą`, and no range-strip can ever undo
it. That already happened to EN and IT: twelve cards decoded to `ZĄLGO`, `hellō`,
`çiao`, `incȕbó`, each sitting immediately above the box that claimed to reverse it.
Nothing caught it — the markup was valid, the strings looked like zalgo, and no check
compared a card to its own label.

**The inversion worth remembering:** the pages that **work** are NFC-*unstable*, and
the pages that were **broken** were NFC-*stable*. Being NFC-stable is the symptom. A
generation pass that "helpfully" requires NFC-stable output will reject every correct
string — verified, it rejected all 4,000 candidates on the first attempt.

**Never hand-type or hand-edit a zalgo string.** Generate it with the page's own
`generateZalgo()`, sliced out of the live `zalgo-text.js` rather than reimplemented,
and accept a candidate only if stripping the decoder's own ranges returns the label
*and* every codepoint is either one of the generator's marks or the next base
character in order. Match the card's existing mark density — the six cards are a
deliberate light-to-heavy gradient (≈1.8 marks/char up to 17), not uniform.

`npm run check:zalgo-decodes` **gates** rather than informs, because it has no backlog
to be red against: a card either decodes or it does not, and all of them do. It fails
on two shapes: a card decoding to anything other than its label, and a card carrying
**no combining marks at all** (a plain word passes a decode test trivially — that gap
was found by probing the check itself, not by reasoning). Verified against two
differently-shaped inputs: NFC-normalising one EN card exits 1 naming it, and
replacing a `ru` card with the plain word exits 1 as unmarked.

## The Thai cascade, and why the decoder is a function

Issue #864 added a second engine: **Thai Cascade**, the viral "side spike". It is not
classic zalgo at higher amplitude. Classic zalgo scatters many *different*
U+0300-block marks around *every* letter; the cascade repeats *one* Thai tone mark
(U+0E48..U+0E4B, Mai Tho by default) 10 to 150 times on *one* carrier (KO KAI,
U+0E01, or the text's own first or last letter), and the renderer's attempt to place
every repeat against the same base is what draws the tall, often diagonal, trail.

- **The Thai marks live in their own pool and never reach `pickUnique()`.** They are
  Thai orthography, not noise. `generateCascade()` is deterministic, which is what
  makes a cascade a shareable URL and a decodable card.
- **The decoder is a two-stage function, `decodeZalgo()`, no longer one regex.**
  Stage one strips the classic ranges; stage two strips a *repeated* Thai tone mark
  (the same mark two or more times in a row) and the tool's own carrier when it
  stands apart from the text. **A single mark is never touched**: Thai writes at most
  one tone mark per consonant, so "น้ำ" pasted into the box comes back as "น้ำ".
- **The engine is sliced out of the shipped widget, never copied.** The block between
  `/* @zalgo-engine:begin */` and `/* @zalgo-engine:end */` is evaluated by
  `scripts/lib/zalgo-engine.js`, and both the test and the gate call the functions
  users run. The gate used to lift the decoder's regex with a matcher; a function with
  two stages cannot be lifted that way, and reimplementing it in the gate is drift.
  **Move the markers if you move the code**; the loader throws rather than falling
  back.

The gate **requires** a cascade card on the EN page: the decoder's second stage is
exercised only by a card carrying a repeated Thai mark, and a check that finds none
cannot tell "the cascade decodes" from "nothing tested it". Verified: with the card
removed the gate exits 1 naming the page.

**The mode is opt-in per page** (`data-cascade` on `#zalgoControlPanel`). A page
without the attribute renders no cascade controls, ignores `?cascade=1`, and still
decodes cascade text — so nothing can show in English on a translated page whose
`zalgoI18n` block lacks the strings. All twelve pages opted in on 2026-09-05 with
their own strings, at the register each page already used (`fr` stays *vous*, `ru`
stays *вы*, the rest informal). The embed widget carries a ported prefix-only
`generateCascade()` beside its ported classic engine.

**Extreme is the same rule applied the other way.** The issue said not to widen the
amplitude slider to 150, and the user then asked for an "Extreme Zalgo" that is
classic marks with a far larger budget. It is a *mode*, not a wider default: the
`Extreme` preset (opt-in via `data-extreme`) lifts the slider's range to
`AMPLITUDE_EXTREME` (1..100, default 50); every other preset returns it to
`AMPLITUDE_CLASSIC` (1..20), and `clampAmplitude()` reads the mode, so an old
`?amp=500` link now yields 20 marks per letter, not 500. Same pools, same
`pickUnique()`, same decoder: at 100 a letter carries 55 above, 2 through and 35
below, and the test asserts exactly that. Measured in headless Chromium: 500
characters at amplitude 100 (37,484 code units) generate and render in under a second.

Every preset click pushes a `zalgo_preset` dataLayer event (`zalgo_mode`: classic,
extreme or cascade) so the modes have an adoption number to read at their 30-day
review instead of an impression.

## The comparison table

See `docs/decisions/content-lanes.md` → "The zalgo comparison table is a Check
surface". Two competitors blocked the fetch and are **named as unscored rather than
guessed**.

## Game-name rules: only what the platform publishes (2026-11-17)

`js/gamename/game-rules.js` tells a player whether a name will be accepted before
they spend a rename. A verdict is only as good as its source, so a repair changes a
rule only where the platform's own page says so, and leaves alone every rule nobody
has published.

Changed on 2026-11-17, each against the platform's page read that day:

| Field | Was | Now | Source |
|---|---|---|---|
| Xbox gamertag | every name over 12 failed | up to 12 fits; 13 to 15 in Latin letters, digits and spaces warns that the name must be unique; 13 or more with any non-Latin letter fails against the 12 that applies to it | support.xbox.com, "How to change your Xbox gamertag" and the gamertag FAQ |
| Discord display name | Hangul, Han, Devanagari and Latin-1 accents warned "may show boxes" | any letter, mark or digit of any script passes; unknown symbols still warn | Discord Help, "New Usernames & Display Names" |
| Discord username | not modelled (the display-name rule was the only Discord row) | its own rule: 2 to 32, a-z, 0-9, underscore and period, no two periods in a row | same article |

What deliberately did not change: Free Fire, PUBG Mobile, Mobile Legends and the
other games whose name rules are not published. Their native-letter warnings and
their no-space failures stay as they were, and no new sentence states those rules
as fact. Free Fire's counting is waiting on an in-game test.

Two smaller repairs ship with it. A failure on an English page now says why when the
page carries no text for that code (username fields only, for the same reason), and
a page in another language is left exactly as it was rather than shown an English
sentence. And the couple generator no longer rates an empty name, which was the
frame alone (`꧁꧂`) scoring "safe".

**Proof that nothing else moved.** Against the previous engine, over 1,296 strings
(every ready-made name on the 75 checker pages plus native-script samples) and all
20 games: 18 games return byte-identical reports, `classifyChar` (which `script.js`
also reads) is identical for every code point from U+0000 to U+1FFFF, and
`analyzeTag` and `outcomeSymbols` are unchanged. In Chromium, the checker and couple
panels render identically at page load on all 75 pages: the change appears only
after a player types.

**Ready-made names.** The test reads every page that lists names under a game with a
published rule and fails on any listed name that the rule refuses. 33 did on
2026-11-17 (31 Stumble Guys names over its 4 to 12 characters or under 4, and 2
Roblox display names under 3). Seven were fixed by removing decoration or, for one
word too long on its own, keeping its head word. The other 26 sit on pages whose
HTML is held unchanged while a search-engine indexing measurement runs; they are
listed in the test as `HELD`, each must still fail, and a fixed one must leave the
list. Free Fire's 253 failing names are not judged by this test at all: its limit
is the open question.

