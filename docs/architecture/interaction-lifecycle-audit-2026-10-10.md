# Interaction lifecycle audit, 2026-10-10

**Production state:** `ychowdhrey/ultratextgen` @ `864b0bd4`

Trigger: a suspected failure of Select / Unselect when the user reverses the action.
Question asked: is that an isolated bug, or evidence of a general class of interactive
JavaScript that works once and then goes stale, duplicates or drifts?

## Executive summary

**The Select / Unselect concern is not confirmed as stated.** The one site-wide
selection (`js/share/image-selection.js`, "Select and share image", 3,700+ library and
symbol pages) holds up under every round trip we could drive: 10 consecutive cycles on
one tile, `Add all` / `Remove all` 0 → ALL → 0 → ALL four times, partial-then-all,
tray removal then re-choose, cancel then reopen, keyboard Enter and Space. It keeps one
source of truth (`sel`), repaints every tile from it after each change, and routes
presses through one delegated listener. Verified on English, `ja`, `ko`, `ar` (RTL),
`de`, `fr`; two sections, with and without named sets.

**It was not an isolated bug, though: the same class was real elsewhere, in a different
shape.** The class that exists in this repo is not "listener lost after `innerHTML`"
(the audit looked for it in about 90 modules and the dominant idiom, build the nodes and
their listeners together, is safe). It is **a control wired twice**, so one press makes
two transitions, which a first-press test can never see:

| # | Defect (all reproduced in Chromium) | Effect of one press |
|---|---|---|
| 1 | Tile `keydown` handler beside the native button click, no `repeat` guard | A held Enter toggled a selection on every auto-repeat (1,0,1,0,1,0) and copied several times |
| 2 | Tag-studio rare chips: direct listener plus the delegated `.symbol-tile` handler | 2 clipboard writes, 2 `copy_text` rows |
| 3 | Events ASCII-art Copy: direct listener plus the delegated `.art-piece-copy` handler | 2 writes, 2 rows (`symbol_tile` and `ascii_art`) |
| 4 | FAQ toggle bound inline **and** by `script.js` on `de/nickname-generator`, `it/font-discord`, `pl/czcionka-pisana` | Net zero: the FAQ could never open |
| 5 | ✕ clear button set `.value` without an `input` event | Accent notice stayed on screen above an empty box |
| 6 | Saving a style rebuilt both grids | Focus fell to `<body>` after every keyboard Save |

Two further defects were found by the audit that are not toggle bugs but are worse:

* **Reflected DOM XSS** on 18 bio-font pages: `?q=<img src=x onerror=…>` ran script,
  because the "All categories at a glance" grid interpolated the input into `innerHTML`.
* **Name-labels print fallback** (`js/printables/labelEngine.js`) called `hideForPrint()`
  with no `keep` node and never `restorePrint()`, so the fallback printed a blank page
  and left the whole site `display:none` until reload.

## Root causes

1. **Two owners for one event.** A module added a delegated handler at the document
   (`symbol-explorer.js`: `.symbol-tile`, `.art-piece-copy`, `.symbol-save-btn`) and a
   page controller later wired its own direct handler on the same element, because it
   was written before, or without knowing about, the delegate. Nothing compares "an
   element has two handlers". Both fire; the result is right only on an even count.
2. **Key handling on top of a native button.** Every one of the 107,000+
   `.symbol-tile` elements is a `<button>`, so Enter and Space already produce a click,
   and Chromium repeats that click for a held Enter. The handler had no `repeat` guard,
   and a first fix that merely deferred to the click was caught by its own test for
   exactly this reason (an odd number of repeats hid it by parity).
3. **Programmatic changes that fire no event.** `el.value = ""` notifies nobody.
4. **Rebuild-the-world renders** drop focus because the focused node is replaced.
5. **A template copied across pages** carried an inline handler that a later shared
   script duplicated (the FAQ), and an inline `innerHTML` template (bio-font) that
   predates the escaping convention.

## Blast radius (measured)

| Family | Pages | Defect |
|---|---|---|
| Library, symbol, locale library/symbol | 3,713 load `symbol-explorer.js` | #1 (keyboard auto-repeat) |
| Tag studio (clan / guild / nickname) | 14 | #2 |
| Events | 20 | #3 |
| FAQ | 3 pages (4 reported; `usecase/zalgo-text` toggles correctly) | #4 |
| Homepage + 30 locale homepages, generator pages | all `script.js` generator pages | #5, #6 |
| Bio-font | 18 | XSS |
| Name labels | 2 | blank fallback print |

## Pattern table

| Pattern | Occurrences found | Severity | Shared utility? |
|---|---|---|---|
| A. Direct listener lost after `innerHTML` | 0 confirmed (listeners are built with their nodes) | n/a | no |
| B. State and DOM diverge | kaomoji freeform clears `.is-selected` but not `aria-pressed`; tattoo restored fields; vertical divider chips (all L) | L-M | no |
| C. Duplicate listeners / a control wired twice | 4 reproduced (#1 to #4); 4 latent (re-callable `buildGrids`, `buildMemoryStrips`, `initChecker`, `cursiveDemo.mount`) | M | convention below |
| D. Init that cannot retry | cursive, vertical, curved, kaomoji return if `textStyles` is missing at init | L | no |
| E. UI text used as logic | `printPrefs.findPdfControl`, `puzzleLevelLabel`; the "Copied" label captured as the next restore value in 7 copy buttons | L-M | no |
| F. NodeList held across a rerender | 0 | n/a | n/a |
| G. Content used as an identity key / selector | `seen[rendered]` objects keyed by styled text; selection `removeMany` keyed an object by glyph (fixed); no selector is built from user text (monogram and cross-stitch whitelist theirs) | L | no |
| H. Truthiness / index bugs | 0 (`indexOf` is compared to `-1`/`> 0` everywhere) | n/a | n/a |
| I. Locale-forked JS | counter De/Es/Fr/Pl/Vi are **orphans** (no page loads them); `asciiConverterControllerEs.js` is live and string-only | L | no |
| J. Analytics duplicated or on intent | #2, #3 above; `trackPrintable("print")` fires before the dialog; collection copy records on intent | M | no |

## Safe components (checked, structurally sound)

Image selection (state, repaint, collection buttons, tray, dialog); Save star, saved
strip and saved store (all derived from the store on `utg:savedchange`); library hub
filters; header site search attach; collection-grid tabs; generator format, safe-mode
and scope chips; decoration chips; preview modal open/close/open; kana chart; kaomoji
generator; ASCII banner; instagram surface tabs; printables audience switch, name-case
chips and swatch groups; `labelEngine` choice groups; `printPrefs` ink-saver pair.

## Select All semantics (Phase 12 / 13)

* There is no page-wide "Select all". `Add all n` exists only inside a named set that is
  a member list, and is a **toggle whose state is derived**: `Remove all n` shows
  exactly when every member is selected (`sel.has` over the set). It never reads its own
  text. From a partial selection it completes the set; it never replaces the selection
  and ignores what is filtered, because the selection has no filter.
* No filter or search on a selectable page rebuilds tiles while a selection is open
  (the library hub's filter is on a different page). If one were added, only
  `paintAllTiles()` would be needed; clicks already survive because the tile handler is
  delegated.
* Functional logic never compares translated text (`textContent` is only ever written).

## What was changed

| Fix | File |
|---|---|
| Tile keydown: always cancel the native click (Chromium re-clicks a held Enter), act once on the first keydown only, and cancel Space keyup (Firefox clicks there) | `symbol-explorer.js` |
| Remove the duplicate direct listener | `js/tag-studio.js`, `js/events/eventPageController.js` |
| Remove the duplicate inline FAQ toggle | 3 pages |
| ✕ clear dispatches a real `input` event | `script.js` |
| Save restores focus to the replacement button | `script.js` |
| Escape the typed name in the glance grid | 18 pages |
| Print fallback keeps its root, restores the page on `afterprint` | `js/printables/labelEngine.js` |
| `removeMany` uses a `Set` | `js/share/image-selection.js` |

## Deliberately not changed

* `decorateSections` skips later `.flag-rows` that share a parent with an earlier one
  (9 sections on 4 pages): fixing it adds a second Share row, which is a product call.
* Tag-studio copies go through the catalogue `symbol_tile` method, so typed text reaches
  `copy_item`; that predates this audit and needs a method decision (see
  `.claude/rules/copy-share-analytics.md`). Removing the duplicate does not change it.
* Latent re-init hazards (C, D) with no page that triggers them.
* `Copied!` label capture (E) in seven copy buttons, and the huruf copy feedback written
  to a node it then detaches.
* Class-only active state (no `aria-pressed` / `aria-selected`) on scope chips, category
  tabs, decoration tabs, preview tabs, repeat chips; `role=radio` groups without arrow
  keys (`printPrefs`, audience switch); no focus trap in the preview modal.
* Four Auto-Ads-destroying `innerHTML = ""` rebuilds already named in
  `.claude/rules/ads-and-monetization.md`.
* Cursive name-example cards swallow Enter on their nested Copy button.
* Firefox: the Space-key double-fire could not be run (only Chromium is installed here).
  The handler change removes the dependency rather than relying on a browser quirk.

## Recommended convention

An interactive control has **one** owner of its event:

1. If a document-level delegate already handles a class (`.symbol-tile`, `.copy-btn`,
   `.art-piece-copy`, `.save-btn`), a page controller adds no listener to it. Give the
   element the class.
2. A key handler on a native `<button>` cancels the default and ignores `event.repeat`, so a press is exactly one action; test with an even number of repeats.
3. State lives in one variable or store; the DOM (class, `aria-pressed`, label) is
   repainted from it after every change, never toggled independently.
4. Never read a label to learn state. Programmatic value changes dispatch `input`.
5. A render that replaces a focused control puts focus on its replacement.
6. Anything interpolated into `innerHTML` is escaped or set with `textContent`.

## CI protection

`scripts/lib/interaction-round-trips.js`, run from `npm run check:runtime-smoke`
(already a gate): `roundTrip()` drives any toggle through A→B→A→B for N cycles and reads
the state after **every** press, so a double-firing handler cannot land on the right
state by luck. It covers tile selection by click, Enter and Space (20 presses each), a
held Enter, `Add all` 0→ALL→0→ALL, partial-then-all, tray removal, reopen, one-click-
one-copy on the tag and events surfaces, the ✕ clear, keyboard Save focus, the FAQ on
the three pages, and the bio-font injection. Run against the pre-fix tree (`HEAD` at the pin above) these cases go
red in 12 places; on the fixed tree none do.

## Regression matrix

| Interaction | Toggle ×2 | ×10 | Add-all cycle | After rerender | Keyboard | Held key | Locales | Pass |
|---|---|---|---|---|---|---|---|---|
| Select tile | ✓ | ✓ | n/a | ✓ (saved strip) | ✓ Enter, Space | ✓ | en ja ko ar de fr | ✓ |
| Add all / Remove all | ✓ | ✓ ×4 | ✓ | ✓ | n/a | n/a | en fr | ✓ |
| Tray chip remove then re-choose | ✓ | n/a | n/a | ✓ | n/a | n/a | en | ✓ |
| Cancel then reopen | ✓ | n/a | n/a | n/a | n/a | n/a | en | ✓ |
| Rare tag chip copy | one write | n/a | n/a | n/a | n/a | n/a | es | ✓ |
| ASCII art copy | one write | n/a | n/a | n/a | n/a | n/a | en | ✓ |
| Save style by keyboard | ✓ | ✓ ×3 | n/a | ✓ focus kept | ✓ | n/a | en | ✓ |
| ✕ clear | ✓ | n/a | n/a | n/a | n/a | n/a | en | ✓ |
| FAQ open/close | ✓ | ✓ | n/a | n/a | n/a | n/a | de it pl | ✓ |

Mobile widths (320 to 768px) were not exercised beyond the existing 390px smoke; the
selection is a delegated document listener with no hover or width dependency, and tiles
are the same buttons at every width.

## Remaining risks

Firefox/Safari behaviour is unverified here; the other latent items above remain open.
