# Coloring / Printable Sheet Generator — Strategy & Build Spec

_Owner brief. Written alongside the first build increment on
`claude/coloring-sheet-generator-nc7rmu`. Demand figures are Semrush,
`us` database, pulled 2026-07-09._

---

## 1. Thesis

PR #423 gave us **coloring pages** (pick a letter → print an outline). The next
job is a **coloring-sheet _generator_**: a tool where a parent or teacher
_designs_ a finished sheet — a name, a heading, a decoration, a fill — and never
needs to open Canva or a photo editor.

The good news, established by auditing the engine: **we are ~80% of the way there
already.** The shared `printablesEngine.js` can render an arbitrary typed word as
a big colorable outline, it already stamps a heading onto every print, it exports
PNG, and it has the ruled/trace-row machinery from the name-tracing ("dotted
line") work. The gap to a real generator is **UI surface + a few native-SVG
render options** — not a new engine, and with **zero** breach of the client-side
hard line (no server render, no image library, no font binaries).

The money is in the **"maker / generator" search intent** and **personalization
(name/word)** — both low-competition, and UTG had **no page for either** until now.

---

## 2. The question the owner asked — "why would someone go to Canva instead of us?"

Every reason someone opens Canva/an editor for a letter-coloring job, and whether
we can serve it natively:

| Reason to leave for Canva | Can we serve it client-side? | Status |
|---|---|---|
| Put a **name / word** on the sheet, not just one letter | Yes — engine already builds a whole-word outline (`wordOutlineSVG`) | **Shipped** |
| Add a **heading / title** ("Emma's Coloring Page", "Letter of the Week") | Yes — `printWrap` already prints a title; expose it as a field | **Shipped** |
| Add a **signature / footer** ("Name ___ / Date ___", "Colored by") | Yes — print-surface furniture (SVG text + rule lines) | **Shipped** |
| Make it **cute / attractive** (stars, hearts, flowers, borders) | Yes — decorative symbol border, reusing our symbol sets | **Shipped** |
| **Multi-color / fine-line** letters (color many small regions inside a letter) | Yes — SVG `<pattern>` fill (dots / stripes / hearts / stars) painted into the glyph | **Shipped** |
| A **reference** ("color it like this" / example word) | Yes — solid mini-render + the A–Z example-word data we already have | Phase 2 |
| **Connect-the-dots / dot-to-dot** version of a letter/name | Yes — sample points along the glyph outline, number them | Phase 2 |
| **Numbers**, not just letters | Yes — engine supports `charset:"alnum"` | **Shipped** (maker is alnum) |
| **Occasion themes** (birthday, holidays, welcome-back) | Yes — heading + border + fill presets | Phase 2 |
| Turn **my photo** into a coloring page | **No** — needs server/AI raster tracing → violates the hard line | **Won't build** (see §5) |

The only common Canva/AI job we deliberately **cannot** serve is photo→coloring.
That is a feature boundary, not a failure — and it sharpens what we _are_: the
**typography-native** coloring generator.

---

## 3. Demand — is this real, and where's the volume?

### 3a. The "maker / generator" intent — real, and low-competition
The exact thing the owner intuited (a *generator*, not just static pages) is a
distinct, ownable search intent that we had no page for.

| Keyword | Volume /mo | Competition |
|---|---:|---:|
| coloring page maker | 1,300 | 0.26 |
| coloring page generator | 1,300 | 0.10 |
| coloring page creator | 1,000 | 0.26 |
| create your own coloring page | 590 | 0.32 |
| make your own coloring page | 390 | 0.27 |
| coloring sheet maker | 140 | 0.10 |
| **maker/generator cluster (approx.)** | **~4,700** | **low (0.10–0.32)** |

Competition on these is **0.10–0.32** — very reachable for a small site.

### 3b. Personalization (name / word) — high intent, low competition
| Keyword | Volume /mo | Competition |
|---|---:|---:|
| name coloring pages | 1,300 | 0.16 |
| custom coloring pages | 880 | 0.82 |
| word coloring pages | 480 | 0.12 |
| personalized coloring pages | 390 | 0.96 |
| custom name coloring pages | 170 | 0.55 |
| birthday coloring pages (occasion personalization) | 4,400 | 0.35 |

`name coloring pages` (1,300 @ **0.16**) and `word coloring pages` (480 @ **0.12**)
are the standout low-competition personalization targets — served perfectly by a
type-a-word generator.

### 3c. Cheap adjacencies the same engine unlocks
| Keyword | Volume /mo | Competition | Engine fit |
|---|---:|---:|---|
| number coloring pages | 4,400 | 0.25 | `charset:"alnum"` — already on |
| number tracing worksheets | 4,400 | 0.56 | trace rows exist |
| handwriting worksheet generator | 1,600 | 0.01 | name-worksheet path |
| printable name tracing | 1,600 | 0.23 | name-tracing page exists |
| monogram maker | 8,100 | 0.31 | letter-based; new spoke |
| dot to dot generator | 480 | ~0 | new render mode |
| connect the dots maker | 320 | 0.33 | new render mode |
| stencil maker | 8,100 | 0.88 | block-letters exists |

### 3d. The multi-color / "color-by-number letters" idea
Direct search is **negligible** (`color by number letters` ≈ 20, `…alphabet` ≈ 10).
**Conclusion: treat interior pattern-fills as an engagement/quality differentiator,
not an SEO target.** It is what makes a sheet nicer than a plain outline and what
brings a teacher back weekly — exactly the owner's "get users who design sheets
regularly" goal. (The success of the color-by-number app "happy color" — 18,100/mo
— confirms appetite for structured multi-region coloring even if the *maker* query
is thin.)

### 3e. Feasibility check (our authority)
ultratextgen.com: ~**1,200** organic visits/mo, **606** ranking keywords, currently
strongest on Discord/vertical-text/emoji. The printables cluster is brand-new (no
rankings yet). Implication: **chase the low-competition long tail** (most targets
above sit at 0.01–0.35) and lean on engine reuse to keep build cost low. That's the
whole point of doing this in-engine rather than as a heavy new app.

---

## 4. Engine capability audit (what we're building on)

`js/printables/printablesEngine.js` is one config-driven controller; a page opts
into sections by including mount points. It already provides:

- **Character picker** (A–Z, optional 0–9) + **detail panel** (big glyph, print,
  PNG, copy-paste variants, how-to).
- **`outlineSVG(ch)`** — white-fill + rounded dark-stroke glyph (colorable/traceable).
- **`wordOutlineSVG(word)`** — an entire typed word as one colorable outline. _This
  is the key primitive the coloring page never exposed._
- **Printable alphabet grid** + **ruled practice sheet** (model / trace / blank rows).
- **`printWrap(title, body)`** — isolated print surface that already renders a heading.
- **Canvas PNG export** (single char + word), using the page-loaded font via
  `document.fonts.load`.

Two render modes: **outline** (bubble/block/coloring) and **glyph** (cursive/
calligraphy Unicode). Sections are mount-gated, so new capability is purely additive.

---

## 5. Guardrails (philosophy compliance)

- **Client-side only.** All generation is native SVG/Canvas in the browser. No
  server renderer, no image-processing lib, no bundled `.ttf`/`.otf`.
- **We do not chase photo→coloring / AI-trace demand** (`ai coloring page
  generator`, `convert picture to colouring page`, ~2,400/mo each). It requires
  raster tracing we can't do within the hard line. Naming it here so we don't drift.
- **Copy-paste stays the front door.** The maker is the higher-intent *paper*
  follow-up, gated on the real demand documented above — not a default answer to a
  query that Unicode already serves.

---

## 6. What shipped in this increment (Phase 1)

**New page:** `/printables/coloring-page-maker/` — targets the maker/generator/
creator + name/word coloring keywords (none of which we ranked a page at before).

**Engine additions** (additive, gated on `#pt-design-*` mounts; the 6 existing
printables pages are untouched):

- **Type a name / word → big colorable outline sheet** (portrait, print-ready).
- **Editable heading** (optional) rendered on the sheet.
- **Signature/date footer** toggle ("Name: ___  Date: ___").
- **Decorative symbol border** — none / stars / hearts / dots / flowers / party mix.
- **Interior fill for multi-color / fine-line practice** — plain, polka dots,
  stripes, hearts, stars. Implemented as an SVG `<pattern>` painted as the glyph's
  own fill (reliable across renderers; avoids the text-as-clipPath trap).
- **Print** (full richness incl. patterns) and **Download PNG** (clean outline).
- Reuses the picker + panel + alphabet grid, with **numbers on** (`charset:"alnum"`)
  → also covers "number coloring pages".

Registered in `PRINTABLE_PAGES`, linked from the printables hub and the
alphabet-coloring hub, with `WebApplication` + `FAQPage` + `BreadcrumbList` JSON-LD.

Verified in headless Chromium across all fills/borders/footer/heading and
short/long words (see the build session screenshots).

---

## 7. Roadmap (next, in priority order)

1. **Reference / example-word chip.** Small full-color mini-render + the A–Z
   example word we already store (`data/printables_alphabet_coloring.json`) —
   "color it like this." Cheap; raises finish quality.
2. **Occasion presets.** One click sets heading + border + fill (Birthday, Welcome
   Back, Valentine, Halloween). Targets `birthday coloring pages` (4,400) etc. and
   makes the tool feel "designed for me."
3. **Monogram maker spoke** (`monogram maker` 8,100). 1–3 letters, decorative frames
   — pure letter art, squarely on-brand.
4. **Dot-to-dot / connect-the-dots mode** (`dot to dot generator` 480, `connect the
   dots maker` 320). Sample points along the glyph path, number them — a net-new
   generator type and keyword set, still native SVG.
5. **Number & word tracing parity** inside the maker (dashed "trace" fill), folding
   in `number tracing` (4,400) and `handwriting worksheet generator` (1,600 @ 0.01).
6. **Multi-line phrases** (2–3 short lines) for signs/welcome sheets.

Each is additive to the same engine, keeps the client-side line, and maps to a
documented, low-competition demand pocket.
