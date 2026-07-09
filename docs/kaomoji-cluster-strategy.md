# Kaomoji Cluster — Domination Strategy

**Status:** research complete, roadmap proposed (July 2026)
**Goal:** own the full kaomoji intent space — libraries, generator, meaning/translation, and adjacent memes — the way we own Unicode fonts.

Data sources: Semrush US database (July 2026), live SERP sampling, full repo audit.
Governance: every new page must be classified per `docs/emoji-combination-taxonomy.md`
(`presentation_class=kaomoji`, `copy_patterns=combo` for face pages).

---

## 1. The demand map (real numbers, US monthly volume)

### Head terms

| Keyword | Volume | Notes |
|---|---|---|
| kaomoji | 90,500 | rising trend; the head term |
| emoticons | 60,500 | colloquial synonym territory |
| shrug emoji | 60,500 | single-face intent (¯\\_(ツ)_/¯) |
| uwu | 60,500 | character/meme intent |
| emoji combos | 40,500 | already ours (`library/emoji-combos/`) |
| lenny face | 27,100 | its own micro-ecosystem, weak owners |
| owo | 18,100 | character/meme intent |
| kaomojis | 12,100 | plural variant |
| japanese emoticons | 9,900 | synonym; taxonomy says alternateName, not separate page |
| text faces | 4,400 | hub synonym (already targeted) |
| japanese smiley face | 4,400 | synonym |

### Emotion / animal / theme long-tail (`<X> kaomoji`)

| Keyword | Volume | Keyword | Volume |
|---|---|---|---|
| cute kaomoji | 5,400 | shy kaomoji | 590 |
| happy kaomoji | 4,400 | excited kaomoji | 590 |
| heart kaomoji | 4,400 | dog kaomoji | 590 |
| cat kaomoji | 2,900 | wink kaomoji | 480 |
| kawaii faces | 2,900 | bear kaomoji | 390 |
| sad kaomoji | 2,400 | hug kaomoji | 390 |
| crying kaomoji | 2,400 | kaomoji keyboard | 390 |
| star kaomoji | 2,400 | sleepy kaomoji | 320 |
| table flip emoji | 2,400 | music kaomoji | 320 |
| text emoticons | 1,900 | laughing kaomoji | 320 |
| kaomoji copy paste | 1,600 | scared kaomoji | 260 |
| bunny kaomoji | 1,600 | smug kaomoji | 260 |
| shrug kaomoji | 1,600 | confused kaomoji | 210 |
| kaomoji faces | 1,600 | christmas kaomoji | 210 |
| blush kaomoji | 1,300 | dancing kaomoji | 170 |
| cute text faces | 1,000 | evil kaomoji | 170 |
| sparkle kaomoji | 1,000 | table flip kaomoji | 170 |
| love kaomoji | 880 | gun kaomoji | 140 |
| kawaii text | 880 | kaomoji list | 140 |
| donger(s) | 720+720 | halloween kaomoji | 110 |
| angry kaomoji | 720 | anime text faces | 90 |
| flower kaomoji | 720 | | |

### Meaning / translation intent

| Keyword | Volume | Keyword | Volume |
|---|---|---|---|
| uwu meaning | 18,100 | o7 meaning | 8,100 |
| owo meaning | 12,100 | emoticon meaning | 1,600 |
| what does uwu mean | 12,100 | kaomoji meaning | 210 |
| xd meaning | 12,100 | what is kaomoji | 70 |

### Tool intent (small head terms — the tool is a differentiator, not the traffic play)

| Keyword | Volume |
|---|---|
| emoticon generator | 320 |
| lenny face generator | 320 |
| how to type kaomoji | 90 |
| kaomoji maker | 70 |
| kaomoji generator | 50 |
| text face generator | 40 |

**Read:** traffic lives in (a) the head term + ~50 emotion/animal/theme collection
pages, and (b) per-face meaning queries (~65k/mo combined) that today are answered
by dictionaries and content farms, **not by any kaomoji site**. The generator
niche is tiny in volume but nearly uncontested and is the authority/link magnet.

---

## 2. Where we stand today (repo audit)

**Have (8 English pages):** `library/text-faces-kaomoji/` (hub, ~82 tiles, 15 mood
sections, full JSON-LD/hreflang) + 7 spokes: `cute-`, `cat-`, `crying-`, `happy-`,
`love-`, `sparkle-`, `football-kaomoji`. Plus 11 locale variants and kaomoji blocks
inside the emotion-emoji pages (`angry-emoji/` etc.).

**Broken / gaps found:**

1. **6 spokes are orphaned** — `cat/crying/cute/happy/love/sparkle-kaomoji` are live,
   in sitemap, and interlinked, but **missing from the `LIBRARY` array in
   `library/index.html`** (unreachable via hub search/filter/A–Z) and have **no
   og/hero/pin assets**.
2. **Zero kaomoji editorial** in `guide/` or `answers/` — no "what is kaomoji",
   no "how to type kaomoji", no per-face meaning pages.
3. **No generator** — but `js/tattoo/` (data-IIFE + controller-IIFE + mode flag +
   i18n fallback, reusing `renderer.js`/`symbol-explorer.js`) is a ready template.
4. `data/library_opportunities.csv` still lacks the `presentation_class` column
   (taxonomy §11 open follow-up).
5. Kaomoji pins ride the shared "Text Art, Kaomoji & ASCII Faces" Pinterest board;
   no dedicated kaomoji board.

---

## 3. Competitive landscape (why now)

| Competitor | Position | Weakness |
|---|---|---|
| **emojicombos.com** | Dominant; programmatic UGC tag page for every micro-intent incl. misspellings | Noisy, uncurated, no meanings; its "generator"/"dictionary" pages are fake (tag feeds); ad-heavy |
| **kaomoji.you** (ex-kaomoji.ru) | The classic reference, canonical taxonomy | **Mid domain-migration** (ranking volatility window); no copy buttons; dated single mega-page |
| **kaomojis.jp** | Best modern challenger: real part-builder generator, meanings column, typing guides | .jp domain still building English authority; breadth over curation |
| **japaneseemoticons.me** | Deepest taxonomy (~60 category pages), oldest builder | Aging, weak builder (no live preview), no meanings |
| **kawaiiface.net** | Best curated emotion/action/character/animal taxonomy | No tool, no search, shallow per category |
| **textfac.es** | Still #1 for "text faces" | Abandoned for years; one unlabeled list — beatable on merit |
| **dongerlist.com** | — | **Dead (DNS fails)**; donger demand up for grabs |
| **Lenny micro-sites** | Split across 5+ thin single-topic sites | No strong owner of 27k/mo |

**Open niches nobody occupies:** (1) per-face meaning pages on a kaomoji site,
(2) a reverse-lookup "kaomoji decoder" (paste face → name, meaning, part breakdown),
(3) a generator with semantically-tagged parts, symmetric-pair intelligence, and
edit-an-existing-face flow, (4) platform-compatibility guidance per face.

---

## 4. Opportunity map

### A. Pre-defined libraries (the traffic engine)

**A0 — Fix the orphans (quick win, zero new content):**
- Register the 6 spoke pages in the `LIBRARY` array in `library/index.html`.
- Generate og/hero/pin assets for them (existing pipelines).
- Add them to the "Text Art, Kaomoji & ASCII Faces" pin board via the standard
  CSV → upload flow.

**A1 — Library expansion, wave 1 (highest-volume missing spokes):**
Each is a `library/<slug>/index.html` clone of the existing kaomoji spoke template
(`presentation_class=kaomoji`, `copy_patterns=combo`, hub-and-spoke interlinks,
Article+FAQ+Breadcrumb JSON-LD, alternateName per taxonomy §10):

| Page | Target keyword(s) | Volume |
|---|---|---|
| `heart-kaomoji` | heart kaomoji | 4,400 |
| `sad-kaomoji` | sad kaomoji (split from crying — distinct query) | 2,400 |
| `star-kaomoji` | star kaomoji | 2,400 |
| `shrug-kaomoji` | shrug kaomoji + bridge to shrug-emoji intent | 1,600 (+60,500 adjacent) |
| `bunny-kaomoji` | bunny kaomoji | 1,600 |
| `blushing-kaomoji` | blush kaomoji, shy kaomoji | 1,300 + 590 |
| `lenny-face` | lenny face, lenny face copy paste, generator | 27,100 |
| `dongers` | dongers, donger | 1,440 |
| `angry-kaomoji` | angry kaomoji | 720 |
| `flower-kaomoji` | flower kaomoji | 720 |

**A2 — Wave 2 (fill the taxonomy):** `dog-kaomoji` (590), `excited-kaomoji` (590),
`wink-kaomoji` (480), `bear-kaomoji` (390), `hug-kaomoji` (390), `sleepy-kaomoji`
(320), `laughing-kaomoji` (320), `music-kaomoji` (320), `scared-kaomoji` (260),
`smug-kaomoji` (260), `confused-kaomoji` (210), `table-flip-kaomoji` (170 + 2,400
"table flip emoji"), `dancing-kaomoji` (170), `evil-kaomoji` (170), seasonal
(`christmas-kaomoji` 210, `halloween-kaomoji` 110 — publish before Q4).

**A3 — Synonym capture without new pages (taxonomy §9/§10):** fold
"japanese emoticons" (9,900), "kawaii faces" (2,900), "emoticon faces" (2,900),
"text emoticons" (1,900), "kaomoji faces" (1,600), "kaomoji copy paste" (1,600),
"japanese smiley face" (4,400), "kaomojis" (12,100) into the hub's
`alternateName`/H2s/FAQ rather than creating cannibalizing pages.
Respect the 8-item / 60-char validator (`scripts/validate-alternatenames.py`).

**A4 — Structural spokes emojicombos has proven:** `eyes-kaomoji`, `mouth-kaomoji`,
"small/tiny kaomoji", "aesthetic kaomoji" — cheap pages that double as the
generator's part-bank documentation (see B).

### B. Generator (the differentiator + link magnet)

Build `js/kaomoji/` on the tattoo-studio architecture:

- `js/kaomoji/kaomojiData.js` — IIFE → `window.UTG_KAOMOJI_DATA`: part banks
  (brackets/frames, eyes, mouths, cheeks, arms, decorations), each part tagged
  with **emotion/style metadata** (happy, sad, cute, angry, chaotic…) and
  **symmetric-pair mappings** (left arm ↔ right arm, opening ↔ closing bracket).
- `js/kaomoji/kaomojiPageController.js` — IIFE controller; `UTG_KAOMOJI_MODE`
  suppress flag; `window.kaomojiI18n` fallback; reuses `symbol-explorer.js` copy
  engine and `?q=` share-URL pattern.

**Feature set that beats every incumbent (all client-side, vanilla JS):**
1. Part-by-part builder with **live preview** (japaneseemoticons.me lacks this).
2. **Mood filter/dial** — parts tagged by emotion, so "make it sadder" works
   (nobody has this).
3. **Symmetric-pair auto-matching** — pick a left arm, right arm auto-completes.
4. **"Start from an existing face"** — every library tile gets an "edit in
   generator" affordance (unique cross-sell between library and tool).
5. **Curated random** — random within a style family, so output is coherent.
6. Platform-compatibility hint per character (which glyphs break on Discord/iOS).

**Pages:** one host page (e.g. `usecase/kaomoji-maker/` or `/kaomoji-generator/`)
targeting kaomoji generator/maker/creator + emoticon generator + text face
generator (~500/mo combined, near-zero competition — both dedicated generator
domains were literally down when tested). Optional later: a Lenny-face preset
mode targeting "lenny face generator" (320).

### C. Translation / meaning (the most defensible open niche)

**C1 — `answers/` pages (QAPage schema, "Short answer" template):**

| Page | Target | Volume |
|---|---|---|
| `answers/what-does-uwu-mean/` | uwu meaning, what does uwu mean | 30,200 combined |
| `answers/what-does-owo-mean/` | owo meaning | 12,100 |
| `answers/what-does-xd-mean/` | xd meaning | 12,100 |
| `answers/what-does-o7-mean/` | o7 meaning | 8,100 |
| `answers/what-is-kaomoji/` | what is kaomoji, kaomoji meaning | 280 (authority glue) |
| `answers/how-to-type-kaomoji/` | how to type kaomoji (Win+. / iOS Kana ^_^ / Android) | 90+ |
| Later: T_T, :3, ಠ_ಠ (look of disapproval), ¯\\_(ツ)_/¯, -_-, ;-; | per-face meanings | long tail |

Each meaning page links to the matching library spoke ("copy 20 more like this")
and to the generator ("remix this face") — that's the moat dictionaries and
content farms can't copy.

**C2 — Kaomoji dictionary/decoder tool (nobody has this):** paste any face →
client-side parse against the generator's part banks → name, emotion tags,
construction breakdown ("ಠ = disapproval eyes, ω = cat mouth"), meaning, variants,
copy-ready alternatives. Pure JS string matching over `kaomojiData.js` — the data
investment for the generator is reused for free. Targets "kaomoji meaning /
dictionary / translator" and earns the per-face answer pages' internal-link hub.

**C3 — English→kaomoji "translator" (novelty, low priority):** mood/word → face
picker. Existing ones (LingoJam, AnythingTranslate) are ad-heavy junk. Can be a
thin mode on top of the generator's emotion tags rather than a separate build.

### D. Adjacent / editorial / distribution

- **`guide/emoticon-vs-emoji-vs-kaomoji/`** — Article schema authority piece
  (evergreen query; tofugu-quality bar). Anchors the whole cluster.
- **Dongers & Lenny** — dongerlist is dead and the Lenny niche has no strong
  owner; A1 pages + generator presets capture both.
- **`kaomoji keyboard`** (390) — answer/guide page reviewing OS-native options
  (Win+., iOS Kana, Gboard) with our site as the web alternative.
- **Pinterest:** dedicated kaomoji board once page count justifies it (follow
  `docs/pinterest-pin-generation.md` — mirror `generate-id-pins.py`, brand skin
  from `generate-site-art.py`, pins in `assets/pinterest/<board>/`).
- **i18n:** extend the 11 existing locale kaomoji pages with new spokes as they
  prove out (ja/ru/es first — kaomoji demand skews global).
- **Data hygiene:** add `presentation_class` column to
  `data/library_opportunities.csv`; add all new pages there with volumes.

---

## 5. Prioritized roadmap

| Phase | What | Effort | Expected impact |
|---|---|---|---|
| **P0** | Fix 6 orphaned spokes (hub registration + og/hero/pin assets) | Hours | Unlock pages already built; crawl/UX fix |
| **P1** | Library wave 1 (A1: 10 pages incl. lenny-face, dongers) + synonym capture (A3) | Days | ~45k/mo addressable volume, low competition |
| **P2** | Meaning answers (C1: uwu/owo/xd/o7/what-is/how-to-type) | Days | ~63k/mo addressable; zero kaomoji-site competition |
| **P3** | Generator (B) + "edit in generator" links from every library tile | ~1 week | Differentiator, links, engagement; owns generator/maker terms |
| **P4** | Decoder/dictionary (C2, reuses P3 data) + library wave 2 (A2) + seasonal before Q4 | Days | Unoccupied tool niche + taxonomy completeness |
| **P5** | Guide (D), Pinterest board, i18n rollout, translator novelty (C3) | Ongoing | Authority + distribution |

**Why now:** kaomoji.ru is mid-migration, dongerlist is dead, textfac.es is
abandoned, and the one strong modern player (kaomojis.jp) hasn't consolidated
English authority yet. The head term is 90.5k/mo and trending up.
