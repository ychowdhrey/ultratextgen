---
paths:
  - "*.js"
  - "js/**/*.js"
  - "*/**/*.js"
---

# Frontend JavaScript conventions

Module map and runtime architecture: `docs/architecture/frontend-runtime.md`.

**`functions/` is exempt from all of it.** Those are Cloudflare Pages Functions, which
run on the server and **do** use real ES modules (`export async function onRequest`).
The conventions below are for code that ships to the browser. See
`.claude/rules/discovery-and-routing.md` for what governs `functions/` instead.

## Hard conventions

- **IIFE module pattern**: `(function () { "use strict"; … })();`. Do not bypass it
  for new files.
- **No ES modules** — no `import`/`export` in frontend scripts. Scripts communicate
  through the global scope intentionally.
- **No `var`** — `const`/`let` only.
- **No external libraries and no npm packages that run in the browser.** Use native
  Web APIs (Clipboard, fetch, localStorage, `Intl`, `Intl.Segmenter`).
- **No framework, no bundler.** Not React, Vue, Angular, Webpack, Vite or Rollup.
- Intentional globals are `window.textStyles` and `window.UltraTextGenRender`; DOM
  access goes through `$()`/`$$()` from `script.js`.
- camelCase for variables and functions, SCREAMING_SNAKE_CASE for constants.

## Client-side only is a hard line

Visual and printable output is **native SVG/Canvas in the browser → SVG/PNG**.
Never a server-side renderer, never an image-processing library, and never a
`.ttf`/`.otf` binary bundled to feed a renderer. A `.woff2` the browser downloads
to *set text in* is webfont delivery, not image generation, and is allowed — see
`.claude/rules/fonts.md`.

## Two `defer` traps that shipped, and both were silent

Both were found by driving a real browser. Neither is visible to node, a syntax
check, or any CI gate.

- **Module order.** Deferred scripts run in document order and all of them run
  before `DOMContentLoaded`. A module placed after its consumer is not a module
  that works.
- **`document.readyState === "loading"` is already false inside a deferred
  script.** Keying an init on it makes init run during its own execution, before
  the modules that follow it in document order — so every attach silently no-ops.
  Zero buttons, no error. Key on `"complete"` instead, which makes the wiring
  independent of tag order.

`DOMContentLoaded` **listener registration order** is a third variant: listeners
fire in registration order, so a non-`defer` module tag placed *before* a page's
inline builder attaches to elements that do not exist yet. Prefer pre-rendering the
markup over racing it.

## Do not destroy what you did not create

A generator that rebuilds a list on input must not clear its container with
`innerHTML = ""` — AdSense Auto Ads places units inside those containers. Clear
through `clearGridKeepingAds()` / `appendAroundAds()` in `script.js`. Why, and the
measurement: `.claude/rules/ads-and-monetization.md`.

## Opt-in surfaces

Some surfaces in `script.js` are opt-in per page via a `window.UTG_*` flag
(`UTG_FORMAT_MARKS`, `UTG_SHOW_PLATFORMS`, `UTG_PRINTABLE`, `UTG_DECORATIONS`,
`UTG_LIBRARY_HUB`, `data-cascade`, `data-extreme`). **Check the opt-in before
concluding a string in a shared module is live on a page** — the count that matters
is the number of pages that declare the flag, not the number that load the module.

## Sliced engines: one owner, never a second copy

Several build-time and test tools **slice a block out of the shipped widget and
evaluate it** rather than reimplementing it (`scripts/lib/zalgo-engine.js`,
`scripts/lib/collection-grid-engine.js`, `scripts/lib/inline-script-capture.js`,
`i18n.test.js`, `header.test.js`). The loader **throws** when a marker is missing
rather than falling back to a local copy. If you move such code, move its markers;
never duplicate the logic.

## Tests

There is no test framework and no runner — each test is a plain file you `node` or
open in a browser. Adding another zero-dependency `.test.js` / `.test.html` in that
idiom is not "adding a framework" and needs no permission; **adding a framework
does** and must be requested.

A surface that **asserts facts** — limits, counts, encodings, decodes — deserves
tests; a surface that merely renders copy does not. The character counter has them
because it shipped a wrong number that no visual check could catch. See
`.claude/rules/tooling-and-gates.md`.

## Never hand-edit or NFC-normalise a zalgo string

The unzalgo widget on `usecase/zalgo-text` (and its eleven locale siblings) strips
combining marks **by codepoint range** — it does not decompose. So a card only works
while its marks are stored as *base + combining mark*, which makes **every zalgo
string on this site NFC-fragile by construction**: normalise the file and `A`+U+0328
becomes the single codepoint `Ą`, which no range-strip can undo. That shipped, and
twelve cards decoded to `ZĄLGO`, `hellō`, `çiao` directly above the box claiming to
reverse them.

**The inversion worth remembering: the strings that work are NFC-*unstable*, and
being NFC-stable is the symptom.** Generate a card with the page's own
`generateZalgo()`, sliced out of the live widget rather than reimplemented; never
type or edit one by hand. `npm run check:zalgo-decodes` gates it whole-site.

The same slicing rule protects the engine itself: the block between
`/* @zalgo-engine:begin */` and `/* @zalgo-engine:end */` is evaluated by
`scripts/lib/zalgo-engine.js`, so **move the markers if you move the code**. Full
record, including the two-stage Thai cascade decoder:
`docs/architecture/check-surfaces.md`.
