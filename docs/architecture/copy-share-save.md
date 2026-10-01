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
| `symbol-explorer.js` | a Save star per tile, Share + "Select and share image" per section (see *Image content comes from deliberate selection* below; until 2026-10-01 this was a whole-section image button), the saved-symbols strip, the incoming `?symbol=` deep link — attached **at runtime** to markup the generators already emit. |

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

## Image content comes from deliberate selection (2026-10-01)

**The principle: on library and symbol pages, an image holds what the visitor
chose, never what happens to share a section with the button they pressed.** Keep
this true in any future change to the image path here.

Until 2026-10-01 each tile section carried a Share-as-image button that drew
**every symbol in that section** onto the card, captioned with the section heading.
Someone who wanted one heart got forty under "iPhone Heart Emoji". The named sets
(ASEAN, the EU, an emoji combo; `.flag-grid-section`, rendered by `buildGrids`) had
no share at all. Both were verified against the branch before the change.

| piece | owns |
|---|---|
| `symbol-explorer.js` | after each tile section: **Share** (unchanged action: native sheet with the section link, else copy the link; only its icon became a link) and **Select and share image**. The same entry sits under a collection container when at least one set in it is a member list. While a selection is open, a tile press is routed to the selection instead of copying. `buildGrids` registers its sets in `collectionGroups()`. |
| `js/share/image-selection.js` | the selection itself, loaded on the first press (not on page load): one page-wide, temporary, ordered list; the sticky tray; the preview dialog; "Add all n" inside a member-list set; the share/download outcomes. |
| `js/share/share-core.js` | `layoutSelection` (pure, tested) and `renderSelectionImage` (the 1080px PNG), and two opt-ins on the existing `shareImageBlob`: `mode: "download"`, `downloadOnError: false`, `noTitle`. No second share implementation. |

Rules that came out of building and auditing it, each with a test:

- **One selection per page.** Every entry button opens or shows the same one and
  then reads "View selection (n)"; pressing any of them never resets it. Cancel
  clears it and puts copying back.
- **Identity is the exact string.** The same emoji in two sections is one item and
  lights in both; pressing either removes it. A skin-tone variant is its own item.
  Pages do repeat items (the flag list shows popular countries twice: 203 tiles for
  195 countries), so this is not hypothetical.
- **A set is added only by its own button**, never by the entry under it. "Add all"
  is offered only for a **member list**: two or more single graphemes, none repeated
  (`isMemberList`). Measured 2026-10-01 across the tree: 3,479 set sections are
  member lists; about 2,170 are trails with repeats (`♪ ˚ ♫ ˚ ♪`), kaomoji sets or
  text art, where splitting into removable members changes what the thing is. Those
  are **not offered** until the owner decides the unit.
- **Nothing is silently dropped.** 50 items is the limit; a 51st press, or a set that
  would pass it, is refused with a message and adds nothing (never half a set). An
  arrangement that would draw glyphs under 44px disables Share and says so.
- **Each item is drawn with its own `fillText`**, so nothing fuses across a boundary
  (two lone regional-indicator letters would otherwise become a flag). The layout
  never splits an item, so ZWJ, skin-tone and flag sequences stay whole. Rows read
  right to left on an RTL page.
- **The preview is the export**: one render per selection state feeds the tray
  thumbnail, the preview and the shared file (byte-identical in the browser test).
- **No caption is invented.** No section heading, page title or SEO title is drawn,
  and the native share sends the file alone (`noTitle`), so nothing arrives in a chat
  as if the visitor had typed it. The only other mark is `ultratextgen.com`, small
  and grey.
- **The artwork matches what was tapped.** The renderer uses the tiles' own emoji
  font stack, so an Android phone draws Noto and an iPhone draws Apple's; nothing
  promises Apple artwork. A page that shows its emoji as Twemoji pictures (the flags
  pages) gets those pictures on the card and in the tray, loaded with CORS so the
  canvas stays exportable; any that fail fall back to the device glyph. Without this,
  Windows (no colour flag glyphs) exported "SG MY ID" for flags the page showed as
  flags. On a page without Twemoji, Windows shows the letters on the page too.
- **Glyphs are never upscaled past their bitmap.** Colour emoji fonts store bitmaps
  (Apple's largest is 160px, Noto's 136px); drawn larger they blur. The card is laid
  out at a 1080px reference width and, when it holds colour-emoji text, the canvas is
  scaled so no glyph exceeds 160px: one emoji ships as a crisp 480px card. Vector
  text (kaomoji, symbols) and Twemoji SVGs scale cleanly and keep full size.
- **Artwork never holds the image up.** Each Twemoji picture races a 1.5s timeout
  and falls back to the device glyph, so a stalled CDN or blocker cannot leave Share
  stuck on "Making image…".
- **Expressions get room.** When an item is wider than a glyph (a kaomoji, a combo)
  the gap between items is a full em, wider than any gap inside one.
- **The card is as tall as its content**, between 1.91:1 and square, so a row of
  three emoji is not a square that is three-quarters blank. Row choice prefers the
  fewest rows within a size-graded share of the largest possible glyph (60% up to
  four items, 65% up to twelve, 90% beyond): a short expression stays one phrase,
  ASEAN sits 5 + 5, fifty flags fill a near-square block.
- **Blank glyphs are not drawable.** Whitespace, default-ignorables, U+2800 (braille
  blank) and the Hangul fillers are disabled while selecting and renamed from
  "Copy …" to their own name; the audit exported a blank card from a braille-blank
  tile before this.
- **A set that cannot join yet says so.** While selecting, each structured set shows
  "This set can't be added to an image yet." instead of silently doing nothing.
- **Saved items stay separate.** The star is a lasting store; the selection lives
  only as long as the page and never reads or writes it. The saved strip keeps its
  own Share pair.

### Analytics for the selection

`share_text` is still written only by `pushShare`. A completed share is
`share_method: image`, a download `image_download`, both with
`share_surface: library_selection` and `share_item_type: selection`, so the new path
is separable from the old `library_section` image rows (which stop on the ship date:
read any `library_section` image series across that date as a definition change).
A cancelled sheet records no share and triggers no download.

The path to a share is a separate event, `image_selection`, with
`selection_action` in `start | reopen | preview | add_collection |
remove_collection | limit | cancel | share_cancelled | share_failed | render_failed`,
`selection_count` and `locale`, every key on every row. **None of these is a share**,
and none carries the chosen items. Like every new dataLayer event here, it reaches
GA4 only once GTM has a tag for it; until then it is visible in the dataLayer only.

### Evidence

Screenshots and real exports (downloaded from headless Chromium at 390px, 2x) are in
`docs/architecture/evidence/image-selection/`: the resting state, selection mode, the
preview, ASEAN after "Add all", Arabic RTL, kaomoji text cards, and exports for one
emoji, a combination across sections, the ASEAN set, the same set on the Twemoji page,
and the 50-item limit.

A second review pass confirmed the fixes and found three more: a stalled Twemoji
request could hang the image, Cancel during a render left an error behind, and the
half-size floor still blurred one emoji. Those are fixed and retested too.

An independent review after the first build found seven medium issues: the empty
card space, blurred single emoji, the page jumping on Cancel, focus lost when the
last chip was removed, blank braille tiles exporting blank cards, structured sets
skipped silently, and Twemoji artwork mismatch. All seven were fixed and retested
before review.

### Tests

`npm run test:image-selection` (CI-gated): order, toggling, repeats, sets, the
limit, and every locale string with its placeholders. `npm run test:share-core`
adds the layout and the three `shareImageBlob` opt-ins.
`js/share/imageSelection.test.html` drives the DOM in a browser with the Web Share
API **mocked** (success, cancel, error; `?noshare` for a browser without file
sharing). Mocked checks prove what the page does with each answer, not that any
real share sheet or app received the file.

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
