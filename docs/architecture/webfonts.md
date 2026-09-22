# Webfonts — why they are self-hosted

Invariants: `.claude/rules/fonts.md`. Inventory, provenance and per-file SHA-256:
`assets/fonts/README.md` and `assets/fonts/manifest.json`.

## 17 of 24 families were not being served

Every printables and category page declares the face its letters are set in —
`Playwrite US Trad` for English cursive, `UnifrakturMaguntia` for calligraphy,
`Fredoka` for bubble letters, `Archivo Black` for block, the five-face graffiti set —
and requested them from `fonts.googleapis.com`. **17 of the 24 families the site asks
for were not being served at all.**

## The mechanism, measured on production rather than assumed

The Cloudflare zone has **Cloudflare Fonts** enabled. It rewrites a Google Fonts
`<link>` into inline `@font-face` rules pointing at Cloudflare's own bundle
(`/cf-fonts/v/<family>/<version>/...`) — and **a family absent from that bundle is
dropped, not left on the original link.** So the page ends up declaring a family that
nothing ever loads. `/printables/cursive-alphabet/` set its letters in Playwrite US
Trad with no Playwrite font loaded; `/printables/graffiti-letters/` asked for five
display faces and got none.

## Four things about how this was found

- **It is invisible to every gate here, and to this repo's own verification habit.**
  The `pages.dev` preview serves the Google link untouched and the fonts load
  correctly, so the original change was verified in a real browser, on a real page,
  and passed — on the one surface where the bug does not exist. **A branch-preview
  check is not a production check for anything the zone rewrites.**
- **Three plausible causes were wrong before the right one.** Not positional (one
  page carries three families and all three are served); not a per-family support
  list (`Playwrite ID` is served and `Playwrite US Trad` is not); not a cold-cache
  effect (stable across five runs of each URL). The answer came from **reading the
  inlined `src:` URL**, which names the bundle.
- **`curl` on `www.` returns a 301 stub**, and grepping that stub for a font name
  finds nothing — which reads exactly like the defect. Follow redirects to the apex,
  or the diagnosis is a measurement of the redirect.
- **The fix is immune to the cause.** Cloudflare Fonts only rewrites Google Fonts
  links, so a same-origin `@font-face` is untouched by it, by a change to its bundle,
  or by the setting being toggled.

## What is and is not self-hosted

21 letterform families, 65 files, 1.6 MB, in `assets/fonts/` with their licences and
a manifest recording each file's source URL and SHA-256.

`Plus Jakarta Sans` and `Space Mono` keep their Google link — body and mono chrome,
both in Cloudflare's bundle, both serving. `Noto Sans Symbols 2` likewise: it is
already served, and the `symbols` subset its two chess pages would need is 373 KB on
its own.

**Repo size is not what a visitor downloads.** Every generated `@font-face` carries
the `unicode-range` Google served it with, so an English page fetches one `latin`
file of one weight — typically 20–43 KB, the same as before.

## Subsets earn their bytes by MIXING, not by a locale existing

`latin`, `latin-ext` and `vietnamese`. That last one is a measured choice rather than
completeness: Vietnamese words are mostly Latin with a few characters *outside*
latin-ext, so without it a name renders half in the webfont and half in the fallback —
`Nguyễn` as **Nguy** + a fallback **ễ** + **n**, one letter in a different typeface
mid-name, on a tracing sheet.

Cyrillic, Hebrew and Devanagari share no characters with latin, so they fall back
whole and consistently — **the reason they are left out is that shape, not their
size**, though devanagari alone would also cost 562 KB against `hi`'s nine-page
corpus.

## This amends two recorded rules rather than stepping over them

Both carry a dated note in place: the "no bundled font binaries" rule (written for
the build-time rasteriser, which still keeps its TTF cache outside the repo) and
`.gitignore`'s `*.woff2` sweep from the same commit. `.ttf` and `.otf` stay ignored
everywhere, `assets/fonts/*.woff2` is unignored, and nothing about the
client-side-only rendering rule changes.

## The practice sheet was never asking for the face either

Separately from Cloudflare: `.cursive-print-model` and `.cursive-print-trace`
declared **no `font-family` at all**, so the 26-row cursive practice sheet printed in
the body sans — measured on production, both computed to
`"Plus Jakarta Sans", -apple-system, sans-serif` while `.pt-glyph-figure` on the same
page correctly computed to Playwrite. An earlier change published
`--pt-glyph-family` and wired the two glyph surfaces; the practice sheet is a **third**
and was missed. Both rules now read that property, with `inherit` leaving every
outline-mode page untouched.

Two more defects were fixed with it, both visible in a rendered sheet and in neither
the markup nor any gate: the trace column was **1.4rem against the model's 1.6rem**,
so a child was not tracing the letter the sheet showed, and it carried a synthetic
`italic` that obliques an already-slanted joined hand.

## Tooling

- `python3 scripts/fetch-self-hosted-fonts.py --family "<Name>" [--axes …]` — fetches
  the woff2 (**a Chrome UA is what makes the API serve woff2 rather than ttf**), the
  family's licence, and its manifest rows. `--verify` re-hashes every file.
- `python3 scripts/build-font-face-css.py` — regenerates the `@font-face` block in
  `style.css` from the manifest. No flag reports staleness and exits 1; `--write`
  applies. Idempotent.
