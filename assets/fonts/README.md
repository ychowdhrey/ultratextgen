# Self-hosted webfonts

These are the display/letterform faces the printables and category pages set
their letters in. They are served from this repo at `/assets/fonts/`, declared
as `@font-face` in `style.css` between the `self-hosted fonts` markers, and are
**not** requested from `fonts.googleapis.com`.

## Why they are here rather than on Google Fonts (2026-09-19)

The Cloudflare zone in front of this site has **Cloudflare Fonts** enabled. It
rewrites a `fonts.googleapis.com` stylesheet link into inline `@font-face` rules
pointing at Cloudflare's own bundle (`/cf-fonts/v/<family>/<version>/...`) — and
**a family missing from that bundle is dropped rather than left on the original
link**. Measured on production 2026-09-19 across one page per family: **17 of the
24 families this site requests were not being served at all.**

That is not a theory about what might happen. `/printables/cursive-alphabet/`
declared `font-family: 'Playwrite US Trad'` and no Playwrite font was ever
loaded; `/printables/graffiti-letters/` asked for five display faces and got
none. Those pages fell back to whatever the visitor's device happened to have,
which is the exact defect the pages exist to avoid.

Self-hosting removes the dependency: Cloudflare Fonts only rewrites Google Fonts
links, so a same-origin `@font-face` is untouched by it, by a change to its
bundle, or by the setting being toggled.

Two families are deliberately **not** here:

* **Plus Jakarta Sans** and **Space Mono** — body and mono chrome, both present
  in Cloudflare's bundle and both serving correctly. They keep their Google link.
* **Noto Sans Symbols 2** — a symbol font rather than a letterform, already
  served, and the `symbols` subset its two chess pages would need is 373 KB.

## Which subsets, and why vietnamese is in and the others are not

Each family carries `latin`, `latin-ext` and `vietnamese` (whichever of those
Google serves for it), plus the unsplit `fallback` block the Playwrite families
ship instead of subsets.

**`vietnamese` is here for a measured reason, not for completeness.** Vietnamese
words are mostly Latin with a few characters *outside* latin-ext, so without that
subset a name renders half in the webfont and half in the system fallback:
`Nguyễn` came out as **Nguy** + a fallback **ễ** + **n**, one letter in a
different typeface mid-name, on a tracing sheet. `vi` is a live locale here.

**Cyrillic, Hebrew and Devanagari are deliberately absent.** They share no
characters with latin, so text in them falls back whole and consistently — which
looks correct, just not in the display face. Adding them would cost 562 KB
(devanagari), 196 KB (cyrillic) and 61 KB (hebrew) to fix a problem that does not
have the mixed-rendering shape. Revisit if one of those locales grows printables
pages.

## Inventory

| Family | Weights | Subsets | Files | Size | Licence |
|---|---|---|---|---|---|
| Archivo Black | 400 | latin, latin-ext | 2 | 32 KB | OFL-1.1 |
| Baloo 2 | 400, 500, 600, 700, 800 | latin, latin-ext, vietnamese | 15 | 344 KB | OFL-1.1 |
| Comic Neue | 700 | latin | 1 | 19 KB | OFL-1.1 |
| Fredoka | 400, 500, 600, 700 | latin, latin-ext | 8 | 134 KB | OFL-1.1 |
| Permanent Marker | 400 | latin | 1 | 29 KB | Apache-2.0 |
| Playfair Display | 500, 600, 700, 900 | latin, latin-ext, vietnamese | 12 | 268 KB | OFL-1.1 |
| Playwrite DE Grund | 400 | fallback | 1 | 20 KB | OFL-1.1 |
| Playwrite DE SAS | 400 | fallback | 1 | 40 KB | OFL-1.1 |
| Playwrite DE VA | 400 | fallback | 1 | 37 KB | OFL-1.1 |
| Playwrite ES | 400 | fallback | 1 | 33 KB | OFL-1.1 |
| Playwrite FR Trad | 400 | fallback | 1 | 42 KB | OFL-1.1 |
| Playwrite ID | 400 | fallback | 1 | 41 KB | OFL-1.1 |
| Playwrite IT Trad | 400 | fallback | 1 | 40 KB | OFL-1.1 |
| Playwrite PL | 400 | fallback | 1 | 37 KB | OFL-1.1 |
| Playwrite PT | 400 | fallback | 1 | 41 KB | OFL-1.1 |
| Playwrite US Trad | 400 | fallback | 1 | 42 KB | OFL-1.1 |
| Quicksand | 500, 600, 700 | latin, latin-ext, vietnamese | 9 | 187 KB | OFL-1.1 |
| Rubik Spray Paint | 400 | latin, latin-ext | 2 | 178 KB | OFL-1.1 |
| Sedgwick Ave Display | 400 | latin, latin-ext, vietnamese | 3 | 67 KB | OFL-1.1 |
| UnifrakturCook | 700 | latin | 1 | 17 KB | OFL-1.1 |
| UnifrakturMaguntia | 400 | latin | 1 | 26 KB | OFL-1.1 |

**Total: 65 files, 1675 KB.** A visitor downloads far less than that —
every `@font-face` carries the `unicode-range` Google served it with, so an
English page fetches one `latin` file of one weight.

## Provenance

Every file was downloaded from `fonts.gstatic.com` on 2026-09-19 via the
`fonts.googleapis.com/css2` API with a current Chrome user agent (which is what
selects `woff2`), unmodified. `manifest.json` records each file's family,
weight, style, `unicode-range`, byte count, SHA-256 and its exact source URL.

Nothing here is subsetted, re-encoded or renamed beyond the filename: the bytes
are Google's own, so the rendered letterform is identical to what the pages used
to request.

## Licences

`licenses/` carries each family's own licence, fetched from the `google/fonts`
repository. 20 families are SIL Open Font License 1.1; **Permanent Marker** is
Apache 2.0. Both permit redistribution of the unmodified binary provided the
licence travels with it, which is what this directory does.

`UnifrakturMaguntia` and `UnifrakturCook` carry Reserved Font Names. They are
redistributed unmodified under their original names, which the OFL permits; do
not modify a file here and keep its name.

## Adding or updating a family

Re-run `python3 scripts/fetch-self-hosted-fonts.py --family "<Family Name>"`,
which writes the woff2, the licence and the manifest row, then
`python3 scripts/build-font-face-css.py --write` to regenerate the `@font-face`
block in `style.css`. Do not hand-write an `@font-face` rule: the block is
generated from `manifest.json` so the CSS and the files on disk cannot drift.
