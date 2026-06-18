# Indonesian "Cara Pakai" Pinterest Board

A single Pinterest board of **how-to / use-case pins, in Indonesian**, all driving
to **https://ultratextgen.com/id/**. Every pin shows a different way to use the
generator to *standout* — the angle the user asked for ("all the ways you can use
the generator to stand out… a HOW TO PIN BOARD in Indonesian").

- **Board name:** `Tulisan Aesthetic, Font & Simbol Keren (Copy Paste)`
- **Destination (all pins):** `https://ultratextgen.com/id/` (the only ID-language
  page — there are already enough use-case permutations on it). All links carry
  `utm_source=pinterest&utm_medium=social&utm_campaign=id_howto_pins`.
- **Generator:** [`scripts/generate-id-pins.py`](../scripts/generate-id-pins.py)
- **Images:** `assets/pinterest/id/<slug>.png` (1000×1500, 2:3)
- **Upload CSV:** [`data/id_pinterest_pins.csv`](../data/id_pinterest_pins.csv)

## Uploading to Pinterest (Bulk create Pins)

The CSV is written in Pinterest's **exact bulk-CSV schema** (saved as UTF-8 with
BOM) — header names must match or the importer rejects it:

`Title, Media URL, Pinterest board, Thumbnail, Description, Link, Publish date, Keywords`

- **Title / Media URL / Pinterest board** are required. **Thumbnail** is video-only
  (blank here). **Publish date** is blank (publish on upload, or schedule in the UI).
- **Media URL must be a publicly reachable link to the PNG itself.** It defaults to
  the live site (`https://ultratextgen.com/assets/pinterest/id/<slug>.png`), which
  resolves once this branch is merged and the static site redeploys.
- **Pinterest board** must match a board that exists in your account — create a
  board named exactly `Tulisan Aesthetic, Font & Simbol Keren (Copy Paste)` first.
- To upload **before** the deploy, regenerate against the public raw-GitHub branch
  URL (Pinterest fetches and stores its own copy at import time):
  ```bash
  PIN_MEDIA_BASE="https://raw.githubusercontent.com/ychowdhrey/ultratextgen/<branch>/assets/pinterest/id/" \
    python3 scripts/generate-id-pins.py
  ```

---

## Why this board (data behind it)

The `/id/` page already earns ~1,750 clicks / ~34K impressions in the last 6
months, **~99% from Indonesia** (Search Console export). The demand is dominated
by a handful of intents that map cleanly onto "how to use the tool":

| Cluster | Evidence (volume / SC clicks) |
|---|---|
| `tulisan aesthetic` (core) | 201K vol; 784 clicks, pos ~4 |
| `huruf aesthetic` / `huruf abjad` | 60.5K vol; 103 clicks |
| `tulisan estetik` (spelling variant, high CTR) | 94 clicks @ 9.6% CTR |
| Bio IG (`tulisan bio ig aesthetic`) | 1.3K vol |
| Nama (`tulisan/font nama aesthetic`) | 1.6K + 590 vol; `font nama aesthetic` 16 clicks |
| Game nicks (`font ff/ml aesthetic`, `bikin nickname`) | `font ff` 15, `font ml` 2, `bikin nickname` 5 clicks |
| WhatsApp (`font wa`, `ubah tulisan wa aesthetic`) | `font wa aesthetic` 15 clicks |
| Happy birthday | `tulisan happy birthday aesthetic` 1.9K vol |
| Symbols (`simbol/symbols aesthetic`) | Semrush "symbols aesthetic" pillar (30 kw) |
| Copy-paste intent (`copy`, `salin`, `copy paste`) | recurring modifier across queries |

Pinterest is a search engine, so each pin is **named after the searched phrase**
(Indonesian), and the hero is the **literal styled Unicode** people are looking
for — not an abstract motif. This matches the existing collection-pin logic in
[`docs/collection-pins-design-logic.md`](./collection-pins-design-logic.md):
the artifact earns the save from the aesthetic itself, then the link sends the
saver to the generator.

## Design

Same brand skin as the OG cards and English pins (imported from
`generate-site-art.py`): soft `#FBFBFE` panel, faint dot grid, purple→blue spine,
`UltraTextGen.com/id` wordmark, plus a localized **`KETUK UNTUK SALIN`** cue.
Anatomy:

```
ULTRATEXTGEN · <CLUSTER>     ← kicker, purple (the keyword zone)
Headline (Indonesian)        ← keyword-led, 1–2 lines
[ soft card ]
  STYLE NAME
   𝓼𝓪𝓶𝓹𝓮𝓵   ← 3–4 literal styled rows = the hero
  STYLE NAME
   𝔰𝔞𝔪𝔭𝔢𝔩
Benefit line (Indonesian)
─── KETUK UNTUK SALIN ───
▣ UltraTextGen.com/id
```

### Rendering note (important for regeneration)

Pins render via **cairosvg**, which has **no per-glyph font fallback** — each text
run is drawn in a single font. So every styled sample must be fully covered by
**Symbola** (the Mathematical-Alphanumeric font). Verified-safe styles: Bold,
Italic, Bold Italic, Script, Bold Script, Fraktur, Double-struck, Monospace,
Circled, Small Caps. **Fullwidth (Ａ-Ｚ) is intentionally excluded** (Symbola has
no glyphs for it → tofu). Decorative symbols are likewise restricted to the
Symbola-covered set (e.g. `♡ ✶ ⋆ ✧ ❀ ✿ ☆ ✰ ◇ ⊱ ⊰ ✦ ≪ ≫`); avoid Tibetan
(`࿐ ࿔`), halfwidth (`｡ ﾟ`), CJK brackets (`【】`) and hiragana/katakana. The
generator runs a build-time check so a bad glyph fails loudly rather than shipping
a box. Requires: `cairosvg`, `fonts-symbola`, `fonts-noto-core`,
`fonts-noto-extra`, `fonts-noto-cjk`.

## Posting cadence

14 pins → ~3–4 weeks at 3–4 fresh pins/week (Pinterest favors steady fresh pins
over bulk dumps). Lead with the two highest-volume how-tos (`cara-membuat-…`,
`huruf-aesthetic-a-z`), then the social/use-case set. Re-pin evergreen winners to
the board every ~2 weeks. The `Title` / `Description` / `Keywords` columns are
ready to use as-is.

## The 14 pins

1. **Cara Membuat Tulisan Aesthetic** — `cara-membuat-tulisan-aesthetic`
   *Cara Membuat Tulisan Aesthetic — Copy Paste Gratis* · kw: cara membuat tulisan aesthetic, tulisan aesthetic, tulisan aesthetic copy paste, font aesthetic, ubah font aesthetic
2. **Bio Instagram Aesthetic** — `bio-instagram-aesthetic`
   *Bio Instagram Aesthetic — Font & Simbol Copy Paste* · kw: tulisan bio ig aesthetic, bio instagram aesthetic, tulisan instagram aesthetic, huruf aesthetic ig, font aesthetic
3. **Nama Aesthetic & Keren** — `nama-aesthetic`
   *Nama Aesthetic & Keren — Font Nama Copy Paste* · kw: tulisan nama aesthetic, font nama aesthetic, nama keren, desain nama keren, huruf aesthetic
4. **Nickname FF & ML Keren** — `nickname-ff-ml-keren`
   *Nickname FF & ML Keren — Font Game Copy Paste* · kw: font ff aesthetic, font ml aesthetic, nickname ml simple, bikin nickname keren, font keren untuk nickname
5. **Tulisan WhatsApp Aesthetic** — `tulisan-whatsapp-aesthetic`
   *Tulisan WhatsApp Aesthetic — Font WA Copy Paste* · kw: font wa aesthetic, cara mengubah tulisan di wa menjadi aesthetic, tulisan aesthetic, font aesthetic wa, tulisan keren
6. **Ucapan Ulang Tahun Aesthetic** — `ucapan-ulang-tahun-aesthetic`
   *Tulisan Happy Birthday Aesthetic — Copy Paste* · kw: tulisan happy birthday aesthetic, tulisan aesthetic happy birthday, tulisan aesthetic, font aesthetic, ucapan aesthetic
7. **Huruf Aesthetic A–Z** — `huruf-aesthetic-a-z`
   *Huruf Aesthetic A–Z — Huruf Abjad Copy Paste* · kw: huruf aesthetic, huruf abjad aesthetic, huruf a aesthetic, font huruf aesthetic, huruf alphabet aesthetic
8. **Tulisan Keren & Unik** — `tulisan-keren-unik`
   *Tulisan Keren & Unik — Font Copy Paste Gratis* · kw: tulisan keren, tulisan unik, font keren aesthetic, tulisan keren aesthetic, huruf unik
9. **Simbol Aesthetic Copy Paste** — `simbol-aesthetic-copy-paste`
   *Simbol Aesthetic Copy Paste — Hiasan Teks Keren* · kw: simbol aesthetic, simbol huruf aesthetic, simbol keren aesthetic, symbols aesthetic, tulisan aesthetic
10. **Font Lucu & Cute** — `font-lucu-cute`
    *Font Lucu & Cute — Tulisan Gemoy Copy Paste* · kw: font lucu aesthetic, tulisan lucu aesthetic, font lucu, tulisan cantik aesthetic, kaomoji
11. **Copy Paste, Tanpa Aplikasi** — `copy-paste-tanpa-aplikasi`
    *Tulisan Aesthetic Copy Paste — Gratis di Browser* · kw: tulisan aesthetic copy, tulisan aesthetic copy paste, salin font aesthetic, huruf aesthetic copy, tulisan keren copy paste
12. **Tulisan Estetik buat Caption** — `tulisan-estetik-caption`
    *Tulisan Estetik buat Caption — Font Copy Paste* · kw: tulisan estetik, teks estetik, huruf estetik, tulisan font aesthetic, tulisan aesthetic
13. **Tulisan Aesthetic buat X** — `tulisan-aesthetic-x-twitter`
    *Tulisan Aesthetic buat X / Twitter — Copy Paste* · kw: tulisan aesthetic twitter, text unik, tulisan unik, font unik, tulisan aesthetic
14. **Tulisan Tumpuk / Vertikal** — `tulisan-tumpuk-vertikal`
    *Tulisan Tumpuk / Vertikal Keren — Copy Paste* · kw: tulisan tumpuk keren, tulisan tumpuk, tulisan unik, tulisan keren, tulisan aesthetic

## Regenerate

```bash
python3 scripts/generate-id-pins.py   # writes assets/pinterest/id/*.png + data/id_pinterest_pins.csv
```

Idempotent. To add/edit a pin, append to `PINS` in the script (keep samples within
the Symbola-safe set above) and re-run.
