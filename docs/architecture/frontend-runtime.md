# Frontend runtime — modules, load order, and the surfaces inside them

Invariants: `.claude/rules/frontend-javascript.md`,
`.claude/rules/html-pages.md`. Style registry:
`docs/architecture/unicode-style-registry.md`. Share/save:
`docs/architecture/copy-share-save.md`.

Line counts and file sizes are deliberately **not** recorded here — they were wrong
in the predecessor document by up to 16×, and the files are readable.

## Load order, and why it is load-bearing

```html
<script src="/js/share/share-core.js" defer></script>
<script src="/js/saved/saved-items.js" defer></script>
<script src="/header.js"></script>
<script src="/styles.js"></script>
<script src="/renderer.js"></script>
<script src="/script.js" defer></script>
```

Every one of the deferred scripts runs in **document order**, and all of them run
before `DOMContentLoaded`. `script.js`'s init calls `UTG.sharedStyleId()`; place the
share/save modules after it and the generator throws and renders **zero cards**.
`npm run inject:share-save-tags` positions them and `npm run check:share-save-tags`
gates presence **and order**.

## Module map

| Module | Owns |
|---|---|
| `header.js` | the shared nav header (injected into `#shared-header` or after the GTM noscript), dark-mode toggle + `localStorage`, the ≥1600px ad rail, `--utg-anchor-h`, and the `cta_click` event |
| `styles.js` | `window.textStyles`, the Unicode font registry, plus `CATEGORY_PAGES` and `SITE_PAGES` routing objects |
| `renderer.js` | `window.UltraTextGenRender.renderAny(text, style)` and the dispatch on `style.type` |
| `script.js` | UI state and events, `$()`/`$$()`, the output grid, copy-to-clipboard + toast, live rendering, client-side style filtering, `?q=` , and the **flair layer** |
| `js/share/share-core.js` | the site's only Share / Share-as-image implementation |
| `js/saved/saved-items.js` | the typed per-device saved store |
| `js/flair/flair-engine.js` | shared decoration **data**: `PACKS`, `compose()`, `pickRandom()` |
| `js/gamename/game-rules.js` | per-game nickname `RULES`, `analyze()`, `initChecker()` |
| `js/vertical/` | vertical text (`verticalPageController`, `verticalLayouts`, `verticalDecorators`, `verticalDecoratorData`) with its own manual test page |
| `js/printables/` | the printables engine, the PDF writer, the QR encoder, the puzzle builders |
| `symbol-explorer.js` | single-item search, per-tile Save, per-section Share, the saved strip, `?symbol=`, the collection-grid and country-flag renderers, and its own 31-locale `UI_STRINGS` table |

`script.js` **no longer owns Share or the saved store** (2026-09-05). It calls into
both and must load after them.

### The flair layer

`applyDecoration(text)` applies the selected decoration: `mode: "wrap"` (default
`prefix+text+suffix`), `"space"` (fill spaces with `fill`), `"interleave"` (`sep`
between graphemes, via `Intl.Segmenter`). It exposes
`UltraTextGen.flairedMainInput()` and fires `utg:flairchange` so `game-rules.js` can
count the **decorated** name — a frame that pushes a "fits" name over the limit now
shows up before a rename card is spent.

Decoration tabs read `decorations[key]` from static `data-deco-tab` buttons.
`window.UTG_DECORATIONS` is **merged over** the defaults with `Object.assign`, so a
page adds one tab without redeclaring the rest. Load `flair-engine.js`
**non-deferred, before** the inline `window.UTG_DECORATIONS = …compose(…)` config,
which must itself run before the deferred `script.js`.

## Opt-in surfaces, and why the count matters

Several surfaces in `script.js` exist only on pages that declare a flag:
`ensureFormatControl()` requires `window.UTG_FORMAT_MARKS` — declared by exactly
**one** page — and `platformChipsHtml()` requires `window.UTG_SHOW_PLATFORMS`,
declared by **44** pages of which 42 are locale pages (measured 2026-09-10).

**Check the opt-in before concluding a string in a shared module is live on a page.**
The count that matters is the number of pages that declare the flag, not the number
that load the module.

## The platform-preview modal was restored, not built

`script.js` carried `openPreview()`, `buildMockup()`, `updatePreview()`, a delegated
click handler and `.preview-btn` CSS from 2026-07-02, with **nothing in the tree
rendering a `.preview-btn` to open it.** It was recorded as unreachable and left as
an open product decision.

**It was not unbuilt. It was deleted by a merge.** Commit `635379371` (2026-07-02)
shipped it working, with the button in the card template — its own message describes
"a Preview button on each card". The next day a merge resolved that region in favour
of main's copy: parent 1 carried the button, parent 2 did not, and the merge result
did not. The ~130 lines of modal code below it survived, as did the other four
features from the same commit — including `UTG_PREVIEW_PLATFORM`, this modal's own
config hook. A partial conflict resolution, not a decision to drop the feature.

**Two costs worth remembering.** Nothing compares "a handler exists" against "a
trigger exists", so the loss was silent for ten weeks. And tracing it needs real
history: sessions here work a **shallow clone**, so `git log -S` bottoms out at
whatever merge sits on the shallow boundary and confidently names the wrong commit —
measured, the boundary was 2026-07-24 and the answer it gave was an unrelated
generator PR three weeks after the real one. Run `git fetch --deepen=<n>` first.

Restored with **zero new strings**: the button reads `stylePreview.title` and
`stylePreview.dialogAriaLabel`, which all 30 locale files already carry. Driven in a
browser on EN, `de` and `ja`: the modal opens, renders the styled text inside all six
mockups, labels itself in the page's language, locks body scroll and closes cleanly.

### The mockup chrome was English on 29 locales, and is now language-neutral

`buildMockup()` hardcoded ~14 strings (`posts`, `followers`, `Edit profile`,
`Marketing Lead · 1st`, `👍 Like`, `💬 Comment`, `↗ Share`, `Today at 9:41 AM`,
`2h ago · Reply`). A locale reader saw a German modal around an English Instagram
mockup, and it is invisible to the locale gate because the markup is built at
runtime.

**Translating it was measured and rejected, which is the useful part.** This chrome
depicts a **third-party product's interface**, so the correct German for Instagram's
"followers" is whatever Instagram says — a fact about Instagram, not a translation
this repo may author. Both harvest sources fail, and fail *partially*, which is worse
than failing outright:

| source | result (measured 2026-09-10) |
|---|---|
| the site's own corpus | `Follower` on **0** of 267 `de/` pages (case-insensitively, and `Abonnenten` too), フォロワー on **0** of 202 `ja/` — while `Kommentar` (57), `Antworten` (259), `Beiträge` (28) and `Profil` (47) are well attested |
| `locales/*.json` | a display-name word exists in **15 of 31** files; `Share` exists as `ui.shareResult.label`; the other nine concepts in none |

Either harvest ships a mockup that is **half English on every locale** — the
"each fix caught the surface it was written for and missed the next one" failure
again.

**So the labels were dropped, not guessed.** Every one is now an icon, a number, or a
neutral placeholder bar (`.pv-ph`, `currentColor` so one rule serves six palettes).
This is not a new convention: **X and WhatsApp were already built this way**
(`💬 12`, `🔁 34`, `9:41 ✓✓`), so it applies the mockups' own existing grammar to the
other four. The styled text is the content; the chrome's only job is to make the
frame recognisable, which layout, colour and the avatar do wordlessly.

**Two things only a rendered screenshot caught**, after a text-extraction sweep had
already reported the chrome clean on five locales:

- **`🖼` (U+1F5BC) drew tofu.** Swapped for `📷` (U+1F4F7), one of the oldest and most
  widely supported emoji. **Prefer an old, common codepoint over a semantically
  perfect rare one.**
- **A whole surface was missing from the enumeration.** `.preview-note` — *"Simulated
  look — fonts can differ slightly per device and app version."* — sat outside
  `buildMockup()`. It was **removed rather than translated, because its content
  already ships translated**: `safetyPillHtml()` renders a per-style
  device-variation badge (`ui.safetyBadges.*`, all 30 locale files) on the very card
  whose Preview button opens the modal, and the modal's title is already the word
  "preview" in the reader's language, which is what carried "simulated". Its
  now-dead CSS rule went with it.

Platform names on the tabs stay English — Instagram, LinkedIn, Discord, X, WhatsApp,
TikTok are proper nouns, exempt under the formal-identifier rule.

## Pre-rendering: the payload must survive without JavaScript

`docs/collection-grid-prerender.md` is the full record for both the collection grids
(898 pages) and the country-flag tiles (17 pages, §7). Three durable points:

- **`gridSectionsHTML()` and `countryFlagRowsHTML` in `symbol-explorer.js` are the
  single owners of that markup.** The build-time generator calls the **shipped
  renderer** through `scripts/lib/collection-grid-engine.js`, which slices marked
  regions out of the module and evaluates them, and **throws** when a marker is
  missing rather than falling back to a local copy.
- **`GROUPS` and the flag arguments are executed, never parsed.** 18 flag pages build
  their groups by mapping ISO codes through `isoToFlag()`, so the generator runs each
  page's own inline script against a capturing stub and renders what the function was
  actually called with. A stub cannot smuggle in a call the browser would not make:
  every captured container id is checked against the real HTML, and the splice
  asserts the child count grew by exactly the number of groups.
- **The guard predicate is load-bearing, and getting it wrong caused a published
  miscount twice.** "Container has children" answered a different question than the
  one being asked: two collection pages carry static `.flag-row` tiles in the same
  container, so the count published as "896 of 898" was really **898 of 898**. The
  same mis-predicate would have read EN's 8 hand-written flag tiles as "already
  done" and skipped 195. The flag guard is `.flag-row[data-region]` — generated rows
  carry that attribute and the hand-written ones do not. **Counting the right thing
  needs the right predicate, not a bigger sample.**

### The flag pre-render fixed a latent bug nobody had reported

Comparing the rendered DOM against a worktree of the base commit surfaced something
the change was not aiming at: on **9 of the 17 pages the Save/Share buttons never
attached to a flag tile at all** — 0 of 195, against 195 of 195 on the other eight.

The cause is `DOMContentLoaded` **listener registration order**. `initSaveShare` is
registered when `symbol-explorer.js` executes; the tile builder is registered when
the page's own inline script executes; listeners fire in registration order. So a
page whose `symbol-explorer.js` tag is **non-`defer` and sits before the inline
script** attached save stars to tiles that did not exist yet. Neither half predicts
it alone — `de` is non-`defer` and fine because its tag sits *after* the inline
script. Pre-rendering removes the race outright.

Verified by enumerating all 17 rather than sampling: the rule predicts the observed
result on **17 of 17, with zero mispredictions**.

**The root cause is reported, not fixed.** Twelve of the 17 load
`symbol-explorer.js` without `defer`; adding it would change when that whole module
runs on those pages, a wider blast radius than that change earned. **Any other
JS-built content on those pages is still exposed to the same race.**

### The measured cost

Pre-rendering the flag tiles adds **+41.6 KB uncompressed per page on average**
(+724 KB across the seventeen), which is **+3.6 to +5.2 KB gzipped** — the figure
that crosses the wire. That buys the page's entire payload becoming visible to a
client that runs no JavaScript, on pages where 195 of 195 tiles previously were not.

`<lastmod>` legitimately advances once for a pre-render: the grids are new visible
content and new copy payloads. Nothing about *what* the significance hash covers
changed, so **no cache re-baseline is required.**
