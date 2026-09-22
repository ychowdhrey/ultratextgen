# Copy, Save, Share, Share-image

Invariants: `.claude/rules/copy-share-analytics.md`.

## Copy was site-wide; the three actions that follow it were a single-page feature

37 JS modules in this repo write to the clipboard. Exactly one — `script.js` —
offered Save, Share or Share-as-image, and it loads on 540 of 4,639 pages. The 3,605
`library/` and `symbol/` pages, which carry **34% of every copy on the site** and
convert *better* per pageview than the generator (0.34 copies/pageview against
`usecase/`'s 0.30, GA4 2026-08-08 → 09-04), had none of the three.

**It was a data model, not an oversight, and that distinction is the useful part.**
`SAVED_KEY` held a flat array of style *names* and `toggleSaved()` bailed on
`!stylesRegistry[name]`, so a symbol, a kaomoji or a collection **could not be
represented at all.** Meanwhile the share layer had been written to be shared — its
own comment promised *"Exposed on the shared UltraTextGen namespace so specialized
generators can reuse the same mechanism later without rebuilding it"* — and had
**zero callers outside `script.js`** for months, because the only way to take it up
was to load the whole 120KB file headless, which is what `usecase/zalgo-text` and the
other specialized generators actually do.

## The three pieces

| module | owns |
|---|---|
| `js/share/share-core.js` | `buildShareUrl`, `shareCreation`, `shareCreationAsImage`, `renderCreationImage`, the button factories, the `?style=` reader, both delegated click handlers. Lifted **verbatim** out of `script.js`; it is now the only definition. Dependency-free. |
| `js/saved/saved-items.js` | the typed store `{type, value, label, href, t}` with `type` in `style \| symbol \| collection`, identity on `(type, value)` — so one glyph saved under two locale labels is one record. `UltraTextGen.saved.{all,has,count,toggle,clear}`, fires `utg:savedchange`. |
| `symbol-explorer.js` | a Save star per tile, Share + Share-image per section, the saved-symbols strip, the incoming `?symbol=` deep link — attached **at runtime** to markup the generators already emit. |

**Nothing here edits a page's content**, and that was a design constraint rather than
a happy accident: the tiles are static HTML written into 3,605 pages by the
generators, so adding per-tile buttons to the markup would have been a 3,605-page
content diff against the parity, locale-translation and em-dash gates, for a feature
progressive enhancement delivers for free. The only HTML change is two `<script>`
tags per page, which the significance hash strips, so **no `lastmod` moved.**

## Script order got this wrong twice

Both bugs were found by driving a real browser. Neither would have shown up in a
syntax check or a diff review.

1. **`script.js` is `defer`, so it runs before anything injected after it.** The first
   injector put the modules after the host tag; `script.js`'s init then called
   `UTG.sharedStyleId()` before `share-core.js` had defined it, threw, and **the
   generator rendered zero result cards.** The modules are dependency-free, so the
   injector now places them *first*.
   **The same bug came back once more, on 300 pages, from a second cause:** those
   pages load *both* `script.js` and `symbol-explorer.js`, and the injector anchored
   on the explorer when both were present. `script.js` comes first on every one of the
   300, so the modules again landed too late. The anchor is now the *earliest* host
   tag, whichever it is.
2. **`readyState === "loading"` is already false inside a deferred script.**
   `symbol-explorer.js` keyed its init on it, so init ran during its own execution —
   before the modules that follow it in document order — and every attach silently
   no-opped. **Zero Save buttons, no error.** It keys on `"complete"` now, which makes
   the wiring independent of tag order.

The shared shape: *a check that reports nothing is indistinguishable from a check that
passes*, in its runtime form. **A save star that never attaches looks exactly like a
page that has none.**

`npm run check:share-save-tags` is whole-site rather than diff-scoped on purpose — the
shape it catches is a page generator emitting a pre-split template, so a *new* page
arrives untagged from a file the PR may not touch. **It checks position, not just
presence**, and that half was added only after the 300-page bug: the first version
asked "is the tag there", reported all 3,846 pages fine, and 300 of them were throwing
on load. `npm run inject:share-save-tags` strips and reinserts rather than skipping a
page that already has tags, because otherwise it could not repair *order* — only
absence.

## Strings are harvested, never authored

The 112 new locale strings (`save`, `saved`, `share`, `shareImage`, `clearAll`,
`copyLabel` × 28 locales) were **copied out of `locales/*.json`**, where they already
shipped translated for the generator's own Save and Share. Nothing was translated by
hand.

These pages deliberately do not load `i18n.js` — it would cost a ~30KB locale-JSON
fetch on the site's highest-traffic lane to read five short strings. So
`symbol-explorer.js` keeps its own locale table and `scripts/sync-explorer-strings.js`
copies into it (`--write`) and fails when the two drift. `share-core.js` accepts a
host-supplied `label`/`imageTitle` for the same reason — without it a Korean library
page renders Korean prose with an English **Share** button, the exact defect
`i18n.js`'s own comment records for the shadow locales, and which the browser run
caught.

The 10 locale JSONs whose `copyButtons` block existed only inside `script.js`'s
`UI_STRINGS` were backfilled from it in the same change, removing a duplicate source
of truth that `script.js`'s own comment had flagged.

## Migration off `utg_saved_styles`

The old flat array is read and folded in as `type: "style"` records, **and kept in
step on every write**. Keeping it (rather than deleting it after one read) means a
user who lands on a page still serving a cached pre-split `script.js` keeps their
saved styles instead of watching them vanish; the cost is one duplicated key.

## Analytics

`save_style` **kept its name on purpose** so existing GA4 reports and their history
stay continuous. What is new is **`item_type`** on save/unsave and **`share_surface`**
+ **`share_item_type`** on `share_text`. Without those the rollout could not be read:
`share_text` previously recorded only its method, which cannot answer *which surface
did sharing actually work on* — the whole question the change exists to settle.
`style_name` is still set for styles, so nothing downstream breaks.

### `share_destination`, and the rule that a row fires on success

Two changes, made a week apart by two sessions that could not see each other.

**The event used to fire before the share happened (fixed 2026-09-13).** Every push
ran *before* the `await`, and `share_method` came from `navigator.share ? … : …` —
which API existed, not what happened. So a visitor who opened the OS sheet and closed
it again, one who completed the share, and a native share that errored into the
clipboard fallback produced **byte-identical rows.** A cancel now pushes nothing.
**Anyone comparing a `share_text` series across 2026-09-13 must read it as a
definition change, not a traffic change:** counts after that date are strictly lower
for the same behaviour.

**`share_destination` answers what `share_method` cannot (added 2026-09-19).** The
method is HOW the text left the page; the destination is WHERE it went:

| what happened | `share_method` | `share_destination` |
|---|---|---|
| native share completed | `native` | `native_share` |
| **native share cancelled** | — | **no row at all** |
| copy-link path | `link_copy` | `clipboard` |
| image shared through the sheet | `image` | `native_share` |
| image downloaded instead | `image_download` | `download` |
| Pinterest | `pinterest` | `pinterest` |

**The two are only accidentally one-to-one today**, which is why the call site states
the destination rather than having it inferred. The first explicit platform button — a
WhatsApp link, a Reddit submit link — will share a method with the copy-link path and
differ precisely in this field. `DESTINATION_FOR_METHOD` exists only as a floor for
the exported `UTG.pushShare`, which shipped as `(method, creation)` and still accepts
that shape; it is never a substitute for naming the destination.

**`native_share` is deliberately opaque and must stay that way.** The Web Share API
never tells the page which app the user picked — the sheet belongs to the OS — so a
guessed destination is a fabricated dimension, and a fabricated one is worse than an
honest unknown because **it reads as measured.**

**Pinterest is the one destination recorded on intent rather than completion:** the
pin is composed off-site in a new tab and nothing returns to the page. Leaving the
click unrecorded would lose the surface entirely, which is the worse error. It is the
exception, not a precedent.

`SHARE_DESTINATIONS` also reserves `whatsapp`, `facebook`, `telegram`, `x`, `reddit`
and `email`. **No explicit platform share button exists on this site** (audited
2026-09-19: the only platform-named links in the tree are `mailto:` contact
addresses). They are named so the first one built takes the spelling the vocabulary
already has instead of inventing `Twitter`, `tg` or `mail`.

`locale` was added in the same pass, derived the way `script.js` derives it for
`generate_text` (two-letter, so a `zh-TW` page reports `zh`) so the one GA4 `locale`
dimension means one thing across both events. `header.js`'s `cta_source_locale` is a
separate, differently-named field and keeps the full tag.

`npm run test:share-core` gates both halves — 148 headless assertions. Its last case
asserts the **single-writer invariant across the whole tree**: no file but
`share-core.js` contains the string `share_text`. That is what keeps the vocabulary
from forking, because a page pushing its own literal is invisible in review.

### This section exists because the two halves were built twice

The fire-on-success fix and a `share_destination` branch were written on 2026-09-13 by
two sessions, in the same file, on the same day; only one merged, and the other was
still carrying a redundant copy of the refactor six days later. That is "parallel
sessions build the same thing under different names" arriving in a **shared module**
instead of a locale slug — git merged nothing cleanly and nothing flagged it.

**A code comment is not a record**: the 2026-09-13 change documented itself only
inside `share-core.js`, so the second session had no way to find it without reading
the file. See `docs/architecture/parallel-sessions.md`.

## Verification

Verified against seven differently-shaped broken inputs — the push moved back before
`navigator.share`, `share_destination` dropped, `locale` dropped, `native_share`
guessed as an app name, a download recorded as `native_share`, the derived fallback
removed, and a second file pushing its own `share_text` — each exits 1, with a
restored-tree control at 0. The tag gate exits 1 on the pre-injection tree naming all
3,846 pages and 0 after; the store tests exit 1 on a broken identity check (7
failures) and on a dropped legacy migration (5).

Driven in headless Chromium on real pages (English and German library pages, the
generator, printables): 27 assertions, 0 page errors, plus a 39-assertion run covering
a `?symbol=` deep link, a Korean page's labels, and the generator still rendering,
saving and sharing after the extraction.
