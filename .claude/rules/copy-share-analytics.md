---
paths:
  - "js/{share,saved}/**"
  - "{script,header,symbol-explorer}.js"
  - "locales/**"
  - "scripts/{check-share-save-tags,inject-share-save-tags,sync-explorer-strings}.js"
  - "scripts/lib/share-save-tags.js"
---

# Copy, Save, Share, Share-image — one action set

Architecture, the store's data model, and the incident history:
`docs/architecture/copy-share-save.md`.

## One implementation each, site-wide

- `js/share/share-core.js` is the site's **only** Share / Share-as-image
  implementation. `js/saved/saved-items.js` is the **only** saved store — typed
  `{type, value, label, href, t}` with identity on `(type, value)`.
- A page that offers **Copy** loads both. `npm run check:share-save-tags` gates it
  site-wide (presence **and** position); `npm run inject:share-save-tags` closes any
  gap in one idempotent run.
- Never add a second implementation of either.

## `share_text` has exactly one writer

`pushShare()` in `share-core.js` is the only writer of a `share_text` row, and
`npm run test:share-core` asserts that **no other file in the tree contains the
string `share_text`**. A page pushing its own literal is invisible in review and
forks the vocabulary.

- **A row fires on success, never on intent.** A cancelled native share and a
  refused clipboard write record nothing. (Counts before and after 2026-09-13 are
  not comparable — that was a definition change, not a traffic change.)
- **`share_method` is HOW the text left; `share_destination` is WHERE it went.** The
  two are only *accidentally* one-to-one today, so the call site **states** the
  destination rather than having it inferred. `SHARE_DESTINATIONS` reserves
  `whatsapp`, `facebook`, `telegram`, `x`, `reddit`, `email` so the first explicit
  platform button takes the spelling the vocabulary already has.
- **`native_share` is deliberately opaque and must stay that way.** The Web Share
  API never tells the page which app the user picked. A guessed destination is a
  fabricated dimension, and a fabricated one is worse than an honest unknown
  because it reads as measured.
- **Pinterest is the one destination recorded on intent**, because the pin is
  composed off-site and nothing returns. It is the exception, not a precedent.
- Event **names** are unchanged on purpose so existing GA4 history stays
  continuous. `item_type`, `share_surface`, `share_item_type` and `locale` are the
  dimensions that make a rollout readable.

## Strings are harvested, never authored

`symbol-explorer.js` keeps its own locale table because loading `i18n.js` would cost
a ~30KB locale fetch on the site's highest-traffic lane to read five short strings.
**Never hand-author a string for it** — `npm run sync:explorer-strings` copies from
`locales/*.json` and `npm run check:explorer-strings` fails when the two drift. Do
not "fix" an English button on a locale page by adding `i18n.js` to it.

`share-core.js` accepts a host-supplied `label`/`imageTitle` for the same reason —
without it a Korean library page renders Korean prose with an English **Share**
button.

## Progressive enhancement, not markup edits

The per-tile Save star and per-section Share buttons are attached **at runtime** to
markup the generators already emit. Adding buttons to the markup would be a
thousands-of-pages content diff against the parity, locale-translation and copy
gates, for a feature attachment delivers for free.

## Coverage

The library/symbol lane is wired. The other ~34 clipboard-writing modules (emoji,
huruf, vertical, ASCII, counters, name generators) still have Copy alone — about 6%
of ungated copy volume between them, left for scope reasons, not because they should
stay that way. Each is a few lines: build the buttons, stamp `surface`, pass a
localized `label`.
