# Hub-and-Spoke Discovery — 2026-04-28

Read-only structural audit of UltraTextGen pages. Identifies generic / head-term pages that could be promoted to topical hubs and maps the named-variant siblings that would be their spokes. Ranking is by structural signal only (no keyword-volume data).

## Summary

- **Pages scanned**: 95 HTML index pages across `/library/` (61), `/category/` (12), `/guide/` (9), `/usecase/` (10), plus the four top-level directory landing pages (`library/`, `category/`, `guide/`, `usecase/`).
- **Topical clusters identified**: 7 (3 with strong existing hubs, 4 with hub opportunities).
- **Hub candidates by tier**:
  - **High**: 2
  - **Medium**: 2
  - **Low**: 0
- Pages already operating as functional hubs and excluded from the candidate list: `/library/aesthetic-symbols/` (links 6 named aesthetic variants), `/library/index.html` (programmatic card grid of all library pages), `/guide/index.html`, `/usecase/index.html`, `/category/index.html`.

---

## Candidates (highest opportunity first)

### 1. `/library/emoji-meanings-guide/` — *High*

- *Current state*: Article-style page with five themed `<h2>` sections (Smiley, Hand, Heart, Animal, Double-Meaning emojis). Section bodies are explanatory prose with no outbound links to the deeper sibling pages that cover each theme. Only 4 internal `/library/*` links exist on the entire page, and they are buried in body copy or a single "related" mention.
- *Head term it targets*: "Emoji meanings" — a generic, encyclopedic head term covering the entire emoji surface.
- *Identified spokes*:

  | URL | Variant | Linked from hub? |
  | --- | --- | --- |
  | `/library/face-emojis/` | Face / smiley emojis | Yes (in-body, single mention) |
  | `/library/hand-symbols/` | Hand & gesture emojis | Yes (in-body, single mention) |
  | `/library/heart-symbols/` | Heart emojis | Yes (in-body, single mention) |
  | `/library/smiley-face-guide/` | Smiley face guide | Yes (in-body, single mention) |
  | `/library/animal-emojis/` | Animal emojis | **No** |
  | `/library/food-drink-emojis/` | Food & drink emojis | **No** |
  | `/library/sports-emojis/` | Sports emojis | **No** |
  | `/library/body-language-emojis/` | Body-language emojis | **No** |
  | `/library/people-profession-emojis/` | People & profession emojis | **No** |
  | `/library/emoji-flags/` | Flag emojis | **No** |

- *Why this tier*: 6 unlinked spokes (plus 4 weakly-linked spokes), all in the same parent directory, all matching variants of the head term the page already targets. The page even has an `<h2>Animal Emoji Symbolism</h2>` section but does not link `/library/animal-emojis/` — a clean, almost mechanical hub conversion.
- *Notes*: The four weakly-linked spokes appear once in body prose with no structured "explore more" treatment. Promoting them into a structured spoke index alongside the six unlinked ones is a single-page edit with no new content required.

---

### 2. `/library/linkedin-symbol-library/` — *High*

- *Current state*: Long flat reference page (1,217 lines) organized into themed `<h2>` blocks — *Directional Arrows*, *Bullets & List Markers*, *Checkmarks, Crosses & Validation*, *Progression Numbers* — each followed by inline copy-paste glyph grids. Only 4 internal links exit the page, all to LinkedIn-adjacent guides/usecases. Zero links to the dedicated library pages whose topics the on-page sections mirror exactly.
- *Head term it targets*: "LinkedIn symbols" — a platform-scoped head term that aggregates several symbol families.
- *Identified spokes*:

  | URL | Variant | Linked from hub? |
  | --- | --- | --- |
  | `/library/arrow-symbols/` | Arrow symbols | **No** |
  | `/library/bullet-point-symbols/` | Bullet-point symbols | **No** |
  | `/library/checkmark-symbols/` | Checkmark symbols | **No** |
  | `/library/cross-x-symbols/` | Cross / X symbols | **No** |
  | `/library/number-symbols/` | Number symbols | **No** |
  | `/library/linkedin-comment-styling/` | LinkedIn comment styling | Yes (structured CTA) |

- *Why this tier*: 5 unlinked spokes that map 1-to-1 to the page's own `<h2>` sections, plus one already-linked sibling. Each section is a natural "see the full library" handoff that is currently missing.
- *Notes*: The page is partially structured (it already has thematic sections), but the structure points inward only — the head-term page absorbs all the long-tail traffic with no outbound flow to the named-variant pages. Adding a "Full library →" link at the end of each section is the canonical fix.

---

### 3. `/category/bold-fonts/` — *Medium*

- *Current state*: Generator landing page with the standard live preview UI plus three FAQ accordions (*Bold Text Language Support*, *…Platform Compatibility*, *…Usage and Safety*). The only outbound internal links are `/` and `/category/` (parent breadcrumb). No links to the page's own three sub-variants.
- *Head term it targets*: "Bold fonts generator" — broad family head term.
- *Identified spokes*:

  | URL | Variant | Linked from hub? |
  | --- | --- | --- |
  | `/category/bold-fonts/bold/` | Plain bold | **No** |
  | `/category/bold-fonts/bold-italic/` | Bold italic | **No** |
  | `/category/bold-fonts/alternating/` | Alternating bold | **No** |

- *Why this tier*: Three unlinked spokes living literally inside the candidate's own directory tree. Tier is Medium rather than High only because the spoke count is exactly 3 (rubric reserves High for 4+).
- *Notes*: This is the only `/category/` family page with multiple sub-variants. The same structural pattern (parent generator with no link to sub-variants) repeats on `/category/cursive-fonts/`, `/category/gothic-fonts/`, and `/category/bubble-fonts/`, but each of those has only **1** sub-variant page (`script/`, `fraktur/`, `circle/` respectively), so they fail the 2-spoke acceptance bar and are excluded from this list. They are worth tracking — if a second variant is ever added under any of those families, they immediately become candidates.

---

### 4. `/library/special-characters/` — *Medium*

- *Current state*: Generic "special characters" reference page with six themed `<h2>` sections (Infinity & Eternity, Peace & Harmony, Science & Knowledge, Legal & Office, Aesthetic Standalone, Rare Unicode Curiosity). Has 4 outbound internal `/library/*` links, all in a "related" footer block.
- *Head term it targets*: "Special characters" — one of the broadest possible head terms in the symbol space.
- *Identified spokes*:

  | URL | Variant | Linked from hub? |
  | --- | --- | --- |
  | `/library/geometric-symbols/` | Geometric | Yes (related block) |
  | `/library/religious-symbols/` | Religious | Yes (related block) |
  | `/library/sparkle-symbols/` | Sparkle | Yes (related block) |
  | `/library/zodiac-symbols/` | Zodiac | Yes (related block) |
  | `/library/math-symbols/` | Math | **No** |
  | `/library/currency-symbols/` | Currency | **No** |
  | `/library/accent-marks-diacritics/` | Accents & diacritics | **No** |
  | `/library/bracket-symbols/` | Brackets | **No** |
  | `/library/dash-hyphen-symbols/` | Dashes & hyphens | **No** |
  | `/library/slash-backslash-symbols/` | Slashes | **No** |

- *Why this tier*: 6 unlinked spokes that are clearly within the "special characters" head-term umbrella (math, currency, punctuation are textbook examples of "special characters"). Tier is Medium not High because the page already exposes a 4-spoke related block, so it is *partially structured* — the rubric reserves High for purely flat candidates.
- *Notes*: The page's own section themes (Science & Knowledge, Legal & Office) don't perfectly match the unlinked spokes (math, currency), so promoting the unlinked siblings will require either renaming a section or adding a new one. Lower confidence than candidates 1–3.

---

## Clusters with no clear hub

Topical groups where multiple variant pages exist but no page is positioned to be the head-term hub. These may need a **new** hub page rather than a refactor.

### A. Platform-symbol pages — no `/library/platform-symbols/` parent

Variants present:
- `/library/discord-symbols/`
- `/library/instagram-symbols/`
- `/library/tiktok-symbols/`
- `/library/x-twitter-symbols/`
- `/library/roblox-symbols/`
- `/library/linkedin-symbol-library/` (the lone "library"-suffixed one — currently the only one with structured sections; could potentially be generalized, but its name and content are LinkedIn-specific)

Each variant page cross-links a small set of generic symbol pages (heart, sparkle, star, etc.) but none links to its platform siblings. There is no `/library/social-media-symbols/` or `/library/platform-symbols/` page acting as a parent. Six near-identical structural siblings is a strong signal that a "Symbols by platform" hub would be net-additive.

### B. Spiritual / esoteric symbol pages — no generic parent

Variants present:
- `/library/religious-symbols/`
- `/library/witchy-occult-symbols/`
- `/library/zodiac-symbols/`
- `/library/moon-celestial-symbols/`
- `/library/norse-viking-runes/`
- `/library/egyptian-hieroglyphs/`

`/library/religious-symbols/` is the most generic name in the cluster but its content is scoped to mainstream world religions and it links only to `awareness-ribbons`, `heart-symbols`, `linkedin-symbol-library`, `zodiac-symbols`. No page positions itself as a "Spiritual & esoteric symbols" umbrella across all six. A new hub (or a deliberate widening of `religious-symbols`) is a credible opportunity.

### C. Punctuation / typographic-mark pages — no generic parent

Variants present:
- `/library/bracket-symbols/`
- `/library/dash-hyphen-symbols/`
- `/library/slash-backslash-symbols/`
- `/library/accent-marks-diacritics/`
- `/library/bullet-point-symbols/`
- `/library/line-divider-symbols/`

`/library/special-characters/` partially absorbs this cluster but, as noted in Candidate 4, its themed sections lean toward decorative/aesthetic and science/legal rather than punctuation. There is no `/library/punctuation-symbols/` or `/library/typographic-marks/` hub. A new hub here would directly serve the cluster's structural pattern.

---

## Orphan variant pages

Pages that read like spokes (named-variant slug, focused topic) but lack siblings or a parent positioned to host them today. Tracking only — not actionable until a cluster forms.

| URL | Looks like a variant of… | Why it's orphan today |
| --- | --- | --- |
| `/library/whisper-subliminal-symbols/` | Aesthetic / niche-aesthetic family | Would naturally sit under `/library/aesthetic-symbols/`; that hub does not currently link it. Promoting it into the existing aesthetic hub is a one-line fix and arguably belongs in a follow-up audit rather than as a new cluster. |
| `/library/smiley-face-guide/` | Face emojis | Conceptually a sub-page of `/library/face-emojis/` (or of the emoji-meanings hub in Candidate 1), but lives as a peer in `/library/`. No structural parent currently claims it. |
| `/library/awareness-ribbons/` | Cause / ribbon symbols | No sibling pages on the same theme. Single-instance variant; not a cluster yet. |
| `/library/text-faces-kaomoji/` | Kaomoji / ASCII faces | No sibling kaomoji-family pages. Single-instance variant; not a cluster yet. |

---

## Methodology notes

- Inventory built from a filesystem walk of `/library/`, `/category/`, `/guide/`, `/usecase/`. Utility/legal pages (`/about/`, `/contact/`, `/privacy/`, `/terms/`, `/embed/`, language-mirror directories `/de/`, `/es/`, `/fr/`, etc.) excluded.
- Linking checks performed by grepping each candidate page's HTML for `href="/library/…"`, `href="/category/…"`, etc., and de-duplicating. "Linked from hub?" answers reflect that parse.
- "Flat vs. already a hub" determined by counting in-body `<h2>` sections and the volume / placement of internal sibling links. `/library/aesthetic-symbols/` was excluded from candidacy because it already links 6 named aesthetic variants in structured fashion.
- No page count ever approached the 20-candidate cap, so no truncation was applied.
