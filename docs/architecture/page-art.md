# Page art — the hero/OG pipeline and its traps

Invariants: `.claude/rules/html-pages.md` → "Art ships in the same change",
`.claude/rules/generated-artifacts.md`, `.claude/rules/fonts.md`. Procedure: the
`page-art` skill. Past backfills: `docs/image-seo-fixes.md`.

## Why art ships in the same change

Google crawls new pages within hours of the sitemap picking them up. If the art is not
there yet, **Googlebot's first fetch of that image 404s, and that broken first
impression is recorded before any later fix lands.**

This has been a real, recurring pattern — see `docs/image-seo-fixes.md` and the several
past "GSC 404 cleanup" commits that backfilled hero/OG art for pages already shipped,
most recently diagnosed from live GSC crawl-stats data in an internal review
(2026-07-24).

## Two image-asset scripts, not one, and the split is the point

- **`check-image-assets.py`** (`npm run check:images`) — whole-site audit. Requires
  every indexable page to have `og:image`, `twitter:image`, a real hero file (if
  declared) **and a Pinterest pin**. The site carries a large, deliberately-paced
  Pinterest-pin backlog, so this script is close to always reporting failures
  site-wide. Useful as a dashboard; it could never function as a per-PR merge gate
  without being permanently red. **Its CI step is intentionally informational.**
- **`check-new-page-image-assets.py`** (`npm run check:new-page-images`) — the actual
  **gate**. Diffs the PR against its base and checks **only** the HTML this branch
  adds or changes, for `og:image`/`twitter:image`/hero — **not** Pinterest pins,
  intentionally out of scope. Because it is diff-scoped, pre-existing backlog can
  never make it fail.

## Scoping: a bare run is refused

`generate-site-art.py` **exits 2 on a bare run.** Use `--only <slug>` (repeatable;
slug = the page path with `/` replaced by `-`, so `tr/gotik-yazi/index.html` is
`tr-gotik-yazi`), or `--all` for a genuine full regeneration. `--dry-run` lists what a
run would write, and an `--only` prefix matching no registered page is an **error**
rather than a silent no-op.

**`--only` matches by prefix, not exact slug** — `--only answers` regenerates all 86
`answers-*` pages, and `--only category` all of `category-*`. When you mean an exact
set, check `git status` against the set you intended and revert the surplus; a slug
that is a prefix of its siblings will quietly pull them in (a 555-page run wrote 701
pairs this way).

**A run skips any page whose hero+OG already exist** — "already there" means "done", so
a run only ever fills gaps and costs nothing for finished pages. `--force` re-renders
anyway (needed when the brand skin itself changes). A full `--all` run on an unchanged
tree now writes **0** files instead of 119.

The default was flipped because a full run rasterises ~1,200 pages, and **on a machine
whose font build differs from the one that produced the committed PNGs that rewrites
hundreds of visually identical but byte-different files** — churn that then has to be
spotted and reverted by hand. That happened on three consecutive locale batches on
2026-08-11 (119 files the first time) and was caught each time only by reading
`git status`. A capable filter already existed as an undocumented positional argument;
nobody used it because nothing said it was there **and the dangerous path was the
default one.**

## Card titles: a too-long title was silently truncated

`og_png_svg` wrapped the title and kept `[:3]`, discarding the rest with nothing in the
output to say so. The tone standard makes titles *longer* — they carry the answer, not
the filing system — and the first pass that applied it to nine pages truncated **seven**
of them mid-phrase: `Middle East Currency Symbols: 5 Have Their Own,` with the answer
cut off. **It was caught by reading a rendered PNG, which is the only place it was
visible.**

Two things changed, and the split matters:

- **The cap was one line too tight.** Four lines fit and five do not, and that is
  geometry rather than taste: the block is centred on y=250 and grows upward by 33 per
  line, so at four the first line's ascender sits at y=106 and clears the kicker
  baseline at y=96, and at five it sits at y=73 and collides. `OG_TITLE_MAX_LINES` is
  4. That alone repaired **17 of the 24** titles already overflowing.
- **What still cannot fit is reported, never dropped.** `_fit_title` collects every
  overflow with the words it lost and the run prints them at the end.
  `--strict-titles` makes it exit 1. Reported by default because 24 titles were already
  in that state.

`--dry-run` measures titles without rasterising anything — over the pages already
holding art too, since whether a title fits is a property of the registry rather than
of what is on disk. So **`--dry-run --all --strict-titles` is a cheap whole-site title
check.**

**The fix for an overflow is never to shorten the answer away.** Put the head term in
the card title and the answer in the **sub** line, which does not wrap. Seven titles
remain over the cap, all `unicode-18` emoji-vote and beta-review pages in `ar`, `de`,
`ko`, `pl`, `ru`, `th`; shortening those is a content decision per page.

## Page-derived motifs

The registry in `PAGES` pairs each page with a motif function. **718 of 1,209 pages
were registered against a motif that takes no per-page argument**, so every page
sharing it got a byte-identical drawing: 66 country emoji-combo pages all showed the
same anonymous flag, and `library/moai-emoji` and `library/clown-emoji` shared one
generic smiley. Meanwhile `scatter_glyphs`, which *does* take the glyphs as an
argument, was already producing 190 distinct images across 239 `symbol/` pages. **The
mechanism worked; it just was not applied.**

`motif_from_page(slug, motif)` closes that by reading the page's **own** copy tiles
(`data-symbol` / `data-text` / `data-copy` / `data-char`) — authoritative,
zero-maintenance, and self-correcting when a page's symbols change. It is deliberately
conservative: a motif already carrying per-page arguments is returned untouched, and a
page with nothing to read keeps its hand-chosen motif, so `answers/*` prose pages still
get the Q&A card that suits them. Result: **488 → 884 distinct drawings across 1,209
pages.** `--no-page-motifs` restores the registry's literal motif.

Three routing rules, each learned from a wrong result rather than reasoned up front —
**do not "simplify" them without re-rendering the named pages:**

- **Emoji tiles win outright.** `library/moai-emoji` leads with the moai it is about
  and carries unrelated kaomoji further down; preferring runs drew a face on the moai
  page.
- **Otherwise runs beat single glyphs.** Every free-fire page opens with the same
  ornament tray (`꧁ ༒ ࿐ …`), so drawing those gives all of them one picture, while
  their sample names are genuinely their own.
- **For emoji, take the page's leading grid, not a spread.** Sampling across everything
  a page mentions put a bank and a bicep on the moai card.

## Four font rules the motifs depend on

cairosvg has **no per-glyph fallback** — it takes the first matched family and draws
tofu for anything that family lacks — so motif text goes through the existing
`spanned()`/`_resolve_family()` resolver, the same one Arabic and Devanagari titles
already use. Beyond that:

- **Emoji resolve to Noto Color Emoji ahead of Noto Sans Symbols2**, which carries
  monochrome outlines for part of the emoji range and would otherwise leave a set half
  in colour and half in black. The priority is gated on **`Emoji_Presentation`, not on
  a codepoint range**: `⚽` and `✅` are pictures, while `♥ ★ ♛ ⚜ ⚔` a few codepoints
  away are typographic ornaments, and routing those to a colour font puts a glossy red
  heart inside an ASCII kaomoji.
- **`_resolve_family` takes the base font it is resolving *against*.** Titles are set
  in `SANS` (Liberation), motifs in `SYM` (DejaVu). Testing a motif glyph against
  Liberation reports `₿` as already covered and leaves it unwrapped — which draws tofu,
  because DejaVu Sans has no such glyph.
- **`spanned()` takes the enclosing element's family** so a run resolving to that same
  family is emitted as plain text. Without it every decorative glyph in
  DejaVu-but-not-Liberation picks up a wrapper that restates the font it is already in:
  ~1,100 files of diff noise on art that did not change.
- **Never select a tile no installed font can draw.** `spanned()` drops uncovered
  characters, so an undrawable tile fails silently as an *empty* card rather than as
  tofu. `library/egyptian-hieroglyphs` is the real case — U+13000.. is in no font here,
  and selecting it produced a brand chip with nothing on it. `_drawable()` filters
  those out, and a page whose tiles are all undrawable keeps its registered motif.

**Before regenerating art, check your fonts.** `_FALLBACK_FONTS` and
`_NATIVE_FONT_FILE` name specific files; a character no installed font covers is
**dropped, not drawn as tofu**. On a container missing `fonts-noto-core` /
`fonts-noto-cjk` / `fonts-wqy-zenhei` that silently deletes glyphs from regenerated
cards. Install them first and confirm every path in those two tables exists.
