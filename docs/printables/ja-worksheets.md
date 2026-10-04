# Japanese worksheets (`/ja/purinto/`): architecture

Written 2026-10-04 with the first ten pages. Rules that depend on this:
`.claude/rules/printables.md`. Decisions: `docs/decisions/printables-scope.md`
(運筆 exception), `docs/decisions/local-only-locale-exceptions.md` (why the
pages have no English parent).

## Why these pages are not translations

A Japanese parent printing a worksheet is doing a Japanese job: kana in square
cells, kanji by school grade, English on the Japanese four-line ruling, romaji
by the current cabinet notice, pre-writing lines. The script being practised is
a separate dimension from the language of the page. So the hub is organised by
job, and no page is paired with an English page through hreflang:

| Job group (hub section) | Page | What it prints |
|---|---|---|
| 日本語を書く | `hiragana-renshu/` | hiragana in masu: model → なぞり → blank |
| | `katakana-renshu/` | katakana incl. ー, 外来語 sounds, look-alike pairs |
| | `kanji-renshu/` | kanji in masu, MEXT grade presets or typed kanji |
| 書く準備 | `unpitsu/` | 運筆 paths: 12 patterns × 4 levels |
| 名前を書く | `namae-nazorigaki/` | a name: kana/kanji in masu, romaji on four lines; class sets |
| 英語を書く | `alphabet-renshu/` | A–Z on the Japanese four-line ruling |
| | `eigo-4sen/` | blank four-line paper at exercise-book heights |
| | `romaji-renshu/` | kana → romaji (2025 notice, or 訓令式) on four lines |
| 楽しく学ぶ | `hiragana-nurie/` | hollow textbook-face kana to colour |

**Modes, not URLs.** A character, a kana row, a grade, a pattern and a script
choice are generator options. No page exists per character or per kanji, and
none should be added without independent search intent for that exact unit.

## Three modules

| File | Role | Runs in |
|---|---|---|
| `js/printables/jaSheetData.js` | kana sets, romanisation, normalisation, grapheme split, vertical placement offsets | browser and Node |
| `js/printables/jaSheetsCore.js` | every sheet as an SVG string in **millimetres** | browser and Node |
| `js/printables/jaSheets.js` | reads the page's controls, previews, prints, exports | browser |
| `js/printables/jaKanjiGrades.js` | grade presets (generated) | browser |

The core has five primitives, and every page is a configuration of them:

- **masu**: square cells with the dotted 十字リーダー, 縦書き (columns right to
  left) or 横書き; one practice line per character: model, then なぞり (two,
  or the whole line, optionally fading), then blank cells.
- **four-line**: the Japanese English ruling. Two forms: ノート式 (equal bands,
  red baseline, dashed second line; the exercise-book form) and 教科書式
  (widened middle band, blue baseline; the form the elementary textbooks use;
  its exact ratio is not published, so 5:9:5 stands for it). Letters are
  drawn from the shared stroke skeletons in `strokeDirectionData.js`, remapped
  piecewise so a capital spans line 1 to the baseline, the x-height fills the
  middle band and descenders reach line 4. No font can do this: a font's
  x-height to cap-height ratio is about 0.67, the ruling's is 0.5.
- **unpitsu**: a pattern is a function of t sampled to a polyline, drawn as a
  guide (levels 1–2, dotted) or as a road between two offset polylines
  (levels 3–4, 10mm and 6mm wide), with a start dot and two small pictures.
- **nurie**: a hollow kana built from the textbook face itself (the glyph
  stroked in the outline colour, then narrower in white), so the outline keeps
  とめ・はね・はらい and the separate strokes of き and さ.
- **frame**: title (shrinks to fit), なまえ line, and the credit: the page URL
  as text and as a 24.13mm QR from `js/printables/qr.js`, the one encoder.

### Physical size is the product

The SVG's user unit is the millimetre (`viewBox="0 0 184.6 271.6"` on portrait
A4 inside 12.7mm margins). Cell sizes and ruling heights are fixed in mm; what
changes with the paper is how many cells fit, never how big they are. The PDF
places each page at 1:1 inside the margins; `check:ja-printables` measures the
placement matrix and fails beyond 0.2%.

### Export rasterises the SVG, not the DOM

`printablePdf.renderPages()` clones HTML and copies a fixed list of computed
properties. These sheets would lose anything off that list (text orientation,
font features) and gain nothing from the clone, so `jaSheets.js` draws the
exact SVG string the preview shows into a canvas, with the Klee One chunks its
text needs inlined as data URLs, and hands the canvases to the shared PDF
writer (`fromCanvases`). The preview and the PDF are the same input by
construction. The print path puts the same SVGs in `#pt-print-root` with an
`@page` rule for the chosen paper and orientation.

Vertical writing is done with transforms, not font features: small kana and
、。 move up and right by the offset between the face's horizontal glyph and its
`vert` alternate (measured from the font file), and ー, brackets and ～ turn a
quarter. A transform is an attribute and survives any rasteriser.

## The face

Klee One SemiBold (Fontworks, OFL-1.1), a 硬筆 (pencil) style close to
教科書体, used because the alternatives are either gothic (wrong for き, さ,
そ) or not redistributable (UD Digi Kyokasho ships with Windows but carries no
web licence). Competitors' PDFs embed HG教科書体 or UDデジタル教科書体. Klee
One is not a certified 教科書体: its forms have not been checked against the
学習指導要領 reference forms by a native educator, which is recorded as a
known limitation.

It ships as 15 unicode-range chunks (`scripts/build-ja-print-fonts.py`) in a
stylesheet only these pages link (`assets/fonts/ja-print.css`): kana 118 KB;
grade 1 kanji 15 KB; grades 2–6 42–64 KB each; the rest of 常用 355 KB; 人名用
291 KB; six chunks for the other 3,945 kanji the face carries. A character the
face lacks (for example 𩸽) is drawn in the device's font, and the page says
which ones under the preview.

## Input

`normalize()`: half-width katakana to full-width, spacing voicing marks
composed, NFC run by run **except** CJK compatibility ideographs (NFC would
replace most of them with a different-looking unified twin, which matters in a
name), full-width ASCII to ASCII only on Latin sheets. `graphemes()` keeps a
character with its combining marks and variation selectors, so nothing splits
across two cells. A small kana takes its own cell, as on 原稿用紙.

## Privacy

Typed text (a child's name above all) never leaves the browser: analytics get
option keys only (`printable_engage` with `printable_value: "typed"` for a text
box), the URL never carries input, and the PDF title and file name are the
tool's. `check:ja-printables` types a name and fails if it reaches
`window.dataLayer`, the URL or the title.

## Tests

- `npm run test:ja-sheets` (Node): sets and grade counts, the normalisation
  torture corpus, graphemes, romaji in both systems, masu pitch in mm,
  four-line placement of A/o/g/t/b, unpitsu road width, nurie layering.
- `npm run check:ja-printables` (Chromium): per page, the real PDF button
  (page count, A4, orientation, 1:1 placement), the print path (same page
  count, no site chrome), the torture corpus in the live face, the fallback
  report, the name-privacy check, and mobile layout at 390px.

## Adding a Japanese printable

1. Decide whether it is a new job or a mode of an existing page (a new kana
   set is a mode; a new output such as 原稿用紙 may be a page).
2. If the output is new, add a primitive to `jaSheetsCore.js` that returns SVG
   strings in mm, with a Node test asserting its dimensions.
3. Add a `BUILD` case in `jaSheets.js` and author the controls as static HTML
   with `data-ja-opt` attributes; a control the module does not read does not
   belong on the page.
4. Add the page to `PAGES` in `scripts/check-ja-printables.js`.
5. Japanese labels come from the terminology decisions already on these pages;
   reuse them before writing a new one.

## Known limitations (2026-10-04)

- No stroke-order numbers or arrows (書き順). The candidate datasets are
  share-alike (KanjiVG, CC BY-SA 3.0) or LGPL/Arphic (animCJK); adopting one is
  an owner licence decision.
- No kanji readings (音訓) on the kanji sheet.
- Klee One's forms are close to, not certified as, 教科書体.
- Alphabet stroke order is not shown; Japan has no single standard for it.
- 教科書式 four-line ratio (5:9:5) is a stand-in for an unpublished value.
- The romaji converter writes kana-spelled long vowels as spelled (toukyou),
  which the 2025 notice allows; it cannot know whether おう is one long vowel.
