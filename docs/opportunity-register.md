<!--
Related docs:
  - jtbd-principles.md ............ the "why" + rules (esp. §6 demand gate, §7 canonical ownership, §9 differentiator discovery)
  - jtbd-build-spec*.md ........... dated specs hold the DETAIL; this register is the scannable INDEX/backlog
  - page-vs-section-decisions.md .. page vs. section gate
This file is the STANDING, evergreen backlog. Build specs are dated and frozen;
this register is updated continuously — append rows as opportunities are found,
flip Status as they ship. One line per opportunity; link to the spec for detail.
-->

# Opportunity Register — what we've found but not (fully) shipped

The single place to answer *"what haven't we capitalized on yet?"* — across
clusters **and markets**. Every JTBD/forum/Semrush pass should leave its
un-built findings here, not only inside a dated spec.

**Status legend:** `identified` (found, not yet specced) · `specced` (in an
approved build spec, not built) · `building` · `shipped` · `parked` (decided
not-now, with trigger to revisit).

**How to use:** when a research pass surfaces an opportunity we won't build
immediately, add a row. When you build one, flip Status and link the PR. Keep
the i18n section growing per market — that's the part most easily lost.

---

## 1. Global / English opportunities

| Opportunity | Type | Job / query | ~US vol | Status | Detail |
|---|---|---|---|---|---|
| `/category/superscript/` | page | superscript generator (exponents, ™, whisper/RP) | 9,900 | specced | small-text spec §JTBD4 |
| `/category/subscript/` | page | subscript generator (formulas, footnotes) | 9,900 | specced | small-text spec §JTBD4 |
| `/answers/how-to-make-text-small-on-discord/` | page | how to make text small on discord (`-#` router) | ~20,000 | specced | small-text spec §JTBD1 |
| Bio small-caps mood tab + interpunct presets | section | bio small caps / editorial bio | ~4,500 | specced | small-text spec §JTBD3 (`/usecase/bio-font/`) |
| Nickname/clan-tag superscript suffix + rejection honesty | section | gamertag flair `name+ᵀᵀⱽ` | — | specced | small-text spec §JTBD5 |
| `/category/tiny-text/` split | page | tiny text/font/letter generator | ~32,000 | parked | **Trigger:** GSC shows hub winning "small…" but losing "tiny…". Else cannibalization (shared supply). |
| **F1** per-character coverage indicator | feature | missing-letter honesty (no `q` in superscript) | moat | specced | small-text spec §Features |
| **F2** per-platform safe-mode | feature | tofu-box / rejection warnings | moat | specced | small-text spec §Features |
| **F3** native-vs-Unicode router | feature | Discord `-#`, Reddit `^()`, AO3 `<small>` | moat | specced | small-text spec §Features |
| **F4** mixed big/small composer | feature | shrink a *selection* (whisper, suffix) | moat | specced | small-text spec §Features |
| **F5** small-text-tuned decorations | feature | interpunct chains, emoji headers, tiny kaomoji | — | specced | small-text spec §Features |
| **F6** honesty / a11y notes | feature | "visual only" + screen-reader caveat | trust | specced | small-text spec §Features |

---

## 2. i18n / per-market opportunities

> Append a subsection per market as exports come in. **Always note the
> noise-strip** (§9): raw Semrush totals overcount — record *addressable* demand.

### 🇮🇩 Indonesia (`id`) — analyzed 2026-06-27

Raw 112.6K export was ~69% noise (Excel case-conversion, school typography,
handwriting). **Addressable ≈ 15–18K.** Intent differs from US: **superscript-
for-nicknames on Free Fire, shared via WhatsApp.**

| Opportunity | Type | Job / query (id) | ~Vol | Status | Detail |
|---|---|---|---|---|---|
| `Generator Huruf Kecil Diatas (untuk Nickname)` — localized page | localization page | huruf kecil diatas untuk nickname; tulisan kecil diatas | ~7,700 (+1,300 nickname) | identified | small-text spec §i18n-ID. Superscript-first, FF+WA framing, nickname suffix builder. NOT a translation of EN hub. |
| FF / WhatsApp safe-mode | feature (F2 applied) | which superscript chars render in FF nicknames / WA | — | identified | The #1 silent failure for ID nickname use; no competitor checks. |
| Localized "tulisan kecil" styling head/section | localization | tulisan kecil (+ font/generator/keren) | ~7,000 | identified | ID equivalent of "small text generator." |
| ID subscript/superscript technical | section | subskrip / superskrip / kecil dibawah | ~500 | parked | thin; fold into the localized superscript page. |

### 🌐 Pending exports (awaiting data)

| Market | db | Status |
|---|---|---|
| Spain / LATAM | es / mx | awaiting export (keyword scaffold sent 2026-06-27) |
| Brazil | br | awaiting export |
| Germany | de | awaiting export |
| France | fr | awaiting export |
| Russia | ru | awaiting export |
| Italy / Turkey / Japan / Korea / Poland | it / tr / jp / kr / pl | scaffold sent; lower priority |

---

## Maintenance rule

A research pass isn't finished until its un-built findings are rows here. If an
opportunity ships, flip Status to `shipped` and link the PR — don't delete it
(the history of what we chose and why is the value).
