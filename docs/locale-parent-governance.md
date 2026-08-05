# Locale Parent Governance

This document is the deep reference for the Core Parent Set / Locale
Qualification Tier registries, the per-(parent, locale) decision flowchart,
the five scripts that automate and enforce them, and the mesh-automation hook
wired into `scripts/generate_library_page_from_spec.py`. CLAUDE.md's "Locale
Parent Governance" section is the short pointer; this is the operating
manual, in the same spirit as `docs/unicode-library-workflow.md` and
`docs/pinterest-pin-generation.md`.

It extends (does not replace) two rules already in CLAUDE.md:

- **"Localization Workflow — the English-Parent Rule"** — every locale page
  has a live English parent; this doc governs *which* parents get mirrored
  *by default* and *into which locales*, not whether a parent must exist
  first.
- **"Locale-native internal linking"** — a locale page's outbound links to a
  topic that already has a locale-native page must point there, not at the
  English hub. This doc's mesh-automation tooling (§1) generates that
  linking at publish time instead of relying on a later audit pass to catch
  it.

---

## Why this exists

Before this tooling, the site's locale-translation decisions were governed by
two things: an English-Parent Rule (does a parent exist at all) and a
7-point demand gate applied ad hoc, mostly triggered by a forum thread
surfacing. That combination has a proven blind spot: EN `/symbol/` had 77
pages, FR `/symbol/` had 6, and nobody ran a systematic check on that gap —
it sat there until a one-off manual Semrush pull (2026-07-14) found
**~49,960 searches/month** of directly-evidenced French demand (euro-sign,
micro-sign, not-equal-sign, delta-symbol, +11 more slugs) that had simply never been looked for.

The fix isn't "translate everything" (the site's own per-page GSC yield data
argues strongly against a blanket mirror — 30 focused `/id/` pages
out-earn 240 generic `/library/` pages roughly 20x per page) or "keep waiting
for a forum thread" (that's the mechanism that produced the blind spot).
It's a **data-driven default that flips only at a defined intersection**,
plus a **standing, systematic pre-build check** instead of incidental
discovery, plus **mesh generation at publish time** instead of manual
after-the-fact repair. Those are, respectively, items 2, 3, and 1 below.

---

## 1. Mesh automation — hreflang + locale-native links, generated not audited

**The problem this replaces:** `scripts/audit-hreflang.js` and
`scripts/check-translation-parity.js` are both *audit-and-repair* tools —
they find drift after it ships and either report it or require a human to
fix it. CLAUDE.md's "Locale-native internal linking" section documents a
recurring bug of exactly this shape: PR #586 fixed 3 instances of a locale
page linking an English hub instead of its own locale-native sibling; a
same-day follow-up audit found the identical pattern in 21 more locale
homepages.

**The fix:** generate the correct mesh at publish time instead of relying on
a later audit.

### `scripts/lib/locale-link-rewrite.js`

Shared library. Exports `findRewriteCandidates({ byUrl, clusters }, page)`,
where `byUrl`/`clusters` come from `scripts/lib/translation-clusters.js`'s
`discoverClusters()` and `page` is one of its `byUrl` records.

For the given page (using `page.ownLang` to know "this page's own locale"),
it scans every `<a href="...">` and flags a candidate when:

- the link target is an **English (non-locale-prefixed)** URL under one of
  the monitored sections: `category/`, `library/`, `usecase/`, `guide/`,
  `answers/`, `symbol/`, or any of the eleven platform roots (`discord/`,
  `facebook/`, `instagram/`, `linkedin/`, `pinterest/`, `snapchat/`,
  `telegram/`, `tiktok/`, `whatsapp/`, `x/`, `youtube/`);
- a **locale-native equivalent for this page's own locale already exists**
  in that URL's hreflang cluster (i.e. there's actually somewhere better to
  point);
- the link is **not already correct**.

Two guards keep this from producing false positives:

- **Language-switcher exclusion.** Any `<a>` tag carrying its own `hreflang`
  attribute (the footer language-switcher pattern, e.g.
  `<a class="lang-option" href="/discord/" hreflang="en">EN</a>` on a
  translated Discord page) is skipped — that link is *supposed* to point at
  the English version; it is not a content link.
- **Homepage placeholder guard.** `isHomepage()` (copied from
  `scripts/audit-hreflang.js`'s own guard of the same name) excludes a bare
  site root or bare locale homepage — mirroring why `audit-hreflang.js`
  itself never auto-propagates a subpage's placeholder homepage claim as a
  real sibling relationship.

Each candidate is returned as
`{ originalHref, rewrittenHref, matchIndex, context }` — `matchIndex`/
`context` (the exact original `<a ...>` tag text and its string offset) let
a caller rewrite the page by exact position rather than a blind
find-and-replace, so a coincidental identical `href` elsewhere on the same
page that ISN'T a real candidate (e.g. that same language-switcher link) is
never touched.

### `scripts/sync-locale-mesh.js`

CLI. `node scripts/sync-locale-mesh.js [--files <path...>] [--fix]`

1. **Step 1 — hreflang reciprocity.** Delegates entirely to the existing
   `scripts/audit-hreflang.js` (never reimplemented). In `--fix` mode, runs
   `node scripts/audit-hreflang.js --fix` first, site-wide, so link-rewriting
   in step 2 always sees an accurate, reciprocal cluster map. In report mode
   (the default — no `--fix`), it instead runs `audit-hreflang.js` **without**
   `--fix`, purely to surface hreflang health as read-only context.

   **Design note:** the hreflang-repair cascade is gated on *this script's
   own* `--fix` flag, not unconditional. That's a deliberate choice so a bare
   `node scripts/sync-locale-mesh.js` stays a safe, side-effect-free report —
   matching every other `--fix` tool in this repo (`audit-hreflang.js`,
   `check-translation-parity.js`) where report mode never mutates anything.
2. **Step 2 — locale-native link candidates.** Uses `discoverClusters()` +
   `locale-link-rewrite.js`, scoped to `--files` if given (the generator
   hook's use case — rewrite just the page it just wrote) or the whole tree
   by default (the manual/backlog use case). Report mode (default) prints
   each candidate; `--fix` rewrites the `href` in place, at its exact
   recorded position.

This is a **fixer tool, not a gate** — it always exits 0. See
`scripts/check-locale-mesh.js` below for the enforcing PR gate.

### `scripts/check-locale-mesh.js`

Diff-scoped PR gate, built on the same git-diff/merge-base structure as
`scripts/check-translation-parity.js`. `node scripts/check-locale-mesh.js
[--base <ref>]` (default `origin/main`).

For every HTML file **added or changed** in the branch whose path starts
with one of the 29 canonical locale codes and is part of an hreflang
cluster:

- **(a)** fails if that file's cluster has any non-reciprocal or headless
  member (the same broken/headless/non-reciprocal detection
  `audit-hreflang.js` runs site-wide, reimplemented here scoped to just this
  file's own cluster) — message points at `npm run sync:locale-mesh --
  --fix`;
- **(b)** fails if `locale-link-rewrite.js` finds any un-rewritten
  English-hub-link candidate on that file — message quotes the exact `href`
  and the locale-native target it should point to instead, citing CLAUDE.md's
  "Locale-native internal linking" section.

Exit 1 on any violation, 0 otherwise. Wired into `.github/workflows/validate.yml`
as a **gating** step (included in the final failure condition).

### The generation-time hook

`scripts/generate_library_page_from_spec.py` is the primary generator for
`library/`/`symbol/` pages — the flagship Core, script-independent pillar
(literally the FR `/symbol/` lane the whole gap-check system exists to
catch). Right after it writes a new page and prints its success line
(`out_path.write_text(...)` in `main()`), if the spec's `lang` is not `"en"`
it calls a small `_sync_locale_mesh()` helper that shells out to:

```
node scripts/sync-locale-mesh.js --fix --files <path/to/the/new/page/index.html>
```

This is **best-effort by design** — a missing `node` binary, a non-zero exit,
or any other failure is caught, printed as a `[warn]`, and swallowed. Page
generation itself must never break because the mesh-sync hook failed.

This is the **first** generator wired to the hook. Other generators
(`answers/`, `events/`, `printables/`) should get the same hook the next
time they're touched — this pass deliberately doesn't attempt to wire all of
them at once.

---

## 2. The two registries

### `data/core_parent_set.json`

Answers: *which page patterns are Core (mirror by default), gated tail
(translate only on cleared demand), or never-mirror?*

```json
{
  "tiers": { "core": {...}, "gated": {...}, "never": {...} },
  "parents": [
    { "pattern": "symbol/*", "tier": "core", "scriptIndependent": true, "rationale": "..." },
    ...
  ]
}
```

- **`pattern`** — a repo-root-relative prefix. `"symbol/*"` matches
  `symbol/euro-sign/index.html` and everything else under `symbol/`.
  `"category/index.html"` (no `*`) matches only that exact file.
- **`tier`** — `"core"` / `"gated"` / `"never"`.
- **`scriptIndependent`** — `true` for a parent whose content renders
  identically regardless of script (a euro sign is a euro sign in French,
  Japanese, or Arabic); `false` for a Latin-transform-dependent parent
  (bold/cursive/italic math-alphanumeric substitution only makes sense for
  Latin-script text). This drives the script-compatibility overlay in the
  decision flowchart (§3, step 2).
- **`rationale`** — short citation of why.

**Precedence: most-specific pattern wins.** When more than one pattern
matches a path, the entry whose pattern has the longer literal (non-wildcard)
prefix wins. This is how `"usecase/nickname-generator/*"` (a Core carve-out)
overrides the general `"usecase/*"` (gated) default for that one page,
without the registry having to enumerate every non-core `usecase/` page
individually. Implemented in `scripts/lib/locale-parent-registry.js`'s
`classifyParent()`.

Current membership (see the file's own `rationale` fields for the full
reasoning on each):

| Pattern | Tier | Script-independent | Note |
|---|---|---|---|
| `symbol/*` | core | yes | flagship — the FR gap lane |
| `library/*` | core | yes | flagship — same job, one level up |
| `category/*` | core | no | Latin-transform-dependent |
| `usecase/nickname-generator/*` | core | yes | generic name/username generator |
| `usecase/stylish-name/*` | core | yes | generic name/username generator |
| `character-counter/*` | core | yes | invisible-char/blank-text/counter tool (top-level page, not under `usecase/`) |
| `usecase/*` | gated | no | default for the section; the two carve-outs above win via precedence |
| `answers/*` | gated | no | long-tail zero-click spokes |
| `guide/*` | gated | no | long-tail educational spokes |
| `category/index.html` | core | yes | Category pillar hub (override) |
| `usecase/index.html` | core | yes | Use Cases pillar hub (override) |
| `answers/index.html` | core | yes | Answers pillar hub (override) |
| `printables/index.html` | core | yes | Printables pillar hub (override) |
| `events/index.html` | core | yes | Events pillar hub (override) |
| `updates/*` | never | no | dated/volatile log, already Pinterest-pin-excluded |

The five pillar-hub-index overrides exist because most locales don't have
these hub pages built yet — locale nav currently routes those pillars to the
English hub for lack of a locale-native one. They're marked Core so they
mirror once built, without inheriting their section's otherwise-gated
default (the hub itself is a nav/browse page, distinct from its long-tail
spokes).

### `data/locale_qualification_tiers.json`

Answers: *which locales are even eligible for the Core Parent Set's
default-mirror?*

```json
{
  "locales": {
    "fr": { "tier": 1, "action": "deepen-then-mirror-core", "hold": false },
    "vi": { "tier": 2, "action": "qualify-then-mirror-core", "hold": true, "holdReason": "..." },
    ...
  }
}
```

Every one of the 29 canonical locale codes (the same list
`scripts/check-image-assets.py` uses) has an entry, so no locale tool has to
guess a default for a code it doesn't recognize. (`ms` was missing from the
registry until 2026-07-26 — live with 21 pages but silently classified by the
unclassified-locale fallback; its entry now codifies that Tier-3 default
explicitly. The formerly-uniform "shadow/duplicate locales" notes were
replaced the same day with individual, evidence-backed classifications — see
each locale's `notes` field for its specific status and promotion
prerequisites.)

| Tier | Locales | Action |
|---|---|---|
| **1** — deepen + mirror Core now | id, pt, de, fr, tr, it, es | `deepen-then-mirror-core` |
| **2** — qualify via the 7-point gate, then mirror Core | pl, nl, ar, ko, ja, ru, th, **vi** (HOLD) | `qualify-then-mirror-core` |
| **3** — hold/stub, no spec mirroring | hi, tl, hu, bs, cs, da, hr, ms, no, ro, sk, sr, sv, zh-tw | `hold-stub` |

**`vi` is Tier 2 but `hold: true`.** Per the strategy that authorized this
registry: vi's problem is an **authority/indexing gap, not a content gap** —
do not add vi content; it needs backlinks, not translations. `decide()`
(§3) treats a held locale the same as a stub for build purposes (its own
`skip-hold-locale` decision, distinct from `skip-stub-locale` only so the
reason surfaces correctly).

### `scripts/lib/locale-parent-registry.js`

Shared lookup layer both registries above are read through:

- **`classifyParent(relPath)`** — most-specific-pattern-wins lookup against
  `core_parent_set.json`. Returns the matched entry, or an
  `{ tier: "unclassified", ... }` fallback (treated like gated tail) if
  nothing matches.
- **`classifyLocale(code)`** — lookup against `locale_qualification_tiers.json`.
  Returns a `{ tier: 3, action: "hold-stub", ... }` fallback for an unknown
  code.
- **`decide(relPath, localeCode)`** — the flowchart, §3 below. Returns
  `{ decision, reason, requiresLedgerEntry, parentInfo, localeInfo }`, not a
  bare string, so callers can branch on it.
- **`LOCALES`** — the canonical 28-code array, derived from
  `locale_qualification_tiers.json` so every script importing it from here
  automatically agrees.

---

## 3. The decision flowchart

For a candidate pair (parent `P`, locale `L`), walk this in order — first
stop wins. Steps 1-3 are what `decide()` implements; steps 4-5 are
procedural and handled elsewhere (noted below).

1. **Is `L` held or a Tier-3 stub?** → `skip-hold-locale` / `skip-stub-locale`.
   No spec mirroring. (`vi`'s hold is checked first, ahead of the general
   Tier-3 check, so its distinct reason — authority gap, not stub — surfaces
   correctly.)
2. **Is `P` script-incompatible with `L`?** (`P` is Core with
   `scriptIndependent: false`, and `L` is one of the CJK/Arabic/Indic locales
   — `ar, hi, ja, ko, th, zh-tw`) → `skip-script-incompatible`. Substitute
   `L`'s script-appropriate Core subset (symbol/library/name-gen/counter)
   instead of skipping the locale outright.
3. **Is `P` in the Core Parent Set?**
   - **Yes** → `mirror` (default). `requiresLedgerEntry: false` — no ledger
     entry needed to build it; only a *veto* (deciding NOT to build a Core
     parent here) needs one.
   - **No** (gated tail, or tiered `never`) → `gate` (default: do not
     mirror). `requiresLedgerEntry: true` — a build against this default
     needs a recorded pass.
4. **Cannibalization wiring check** (always, both branches, not part of
   `decide()`): before wiring internal links, confirm `L`'s
   homepage/hub doesn't already own the term — the `vi/chu-kieu`
   trap, already documented in CLAUDE.md's "Before building a page for a
   keyword: check who already owns it". This decides *how* to internally
   link, not *whether* to ship, so it stays a human/agent judgment call, not
   an automated classification.
5. **On ship** (always, not part of `decide()`): the mesh gets generated —
   §1's `scripts/sync-locale-mesh.js` / `scripts/check-locale-mesh.js`.

Every decision other than `mirror` sets `requiresLedgerEntry: true` — the
build happened (or is being evaluated) against the registry's default
recommendation, so it needs a recorded reason in
`data/locale_parent_gap_audit.json` (§4) to be considered deliberate rather
than an oversight.

---

## 4. The pre-build gap check

### `data/locale_parent_gap_audit.json`

The ledger — same `_readme` + array shape as
`data/translation_parity_exceptions.json`. Each entry:

```json
{
  "pattern": "symbol/*",
  "locale": "fr",
  "checkedDate": "2026-07-14",
  "instruments": {
    "competitorFootprintInLocale": true,
    "keywordVolumeInLocaleMonthly": 49960,
    "enGscImpressionsFromLocale": null
  },
  "verdict": "mirror",
  "evidence": "euro-sign, micro-sign, ... (figures held internally)",
  "recordedBy": "governance-tooling-audit"
}
```

`verdict` is one of `mirror` (Core parent, demand confirms the default),
`veto` (Core parent, pre-build check showed genuinely negligible demand),
`gate-pass` (gated-tail parent, pre-build check cleared threshold),
`gate-fail` (gated-tail parent, did not clear threshold). `check-locale-parent-gap.js`
treats `mirror` and `gate-pass` as passing verdicts for a newly-shipped page.

The file ships seeded with exactly the one real, instrument-backed data
point already on record — the FR `/symbol/` case above. Every other
(pattern, locale) cell is genuinely unaudited right now; that's the gap this
tooling exists to surface, not paper over. **Do not add an entry
unilaterally** — same bar as `data/translation_parity_exceptions.json`.

### `scripts/audit-locale-parent-gap.js`

Whole-site discovery pass, templated on `scripts/audit-translation-parity.js`'s
CLI shape. `node scripts/audit-locale-parent-gap.js [--full] [--json <path>]
[--report <path>.md]`

For every Core-tier pattern × every qualified locale (Tier 1, or Tier 2 and
not on hold), counts:

- how many EN-canonical pages match that pattern (via `classifyParent()`, so
  a page is only ever counted once, under its single most-specific match);
- how many already have a live translation into that locale (via
  `discoverClusters()`);
- whether a `locale_parent_gap_audit.json` entry already exists for that
  cell.

Flags a cell as an **unaudited gap** when coverage is near-zero (translated
count is 0, or under 10% of the pattern's EN page count) **and** no ledger
entry exists — the systematic version of the FR `/symbol/` discovery. Ranks
output by `scriptIndependent` first (per the strategy behind this doc,
that's where the highest-priority blind spots live), then by missing-page
count descending. Default output is the ranked gap list; `--full` prints
every cell, including already-covered/ledgered ones.

This is a **discovery tool, not a gate** — always exits 0, same as
`audit-translation-parity.js`. Wired into `.github/workflows/validate.yml`
as an **informational** step (continue-on-error, excluded from the final
failure condition) for the same reason `check-image-assets.py` is: the site
carries a real, deliberately-paced translation backlog and this will not (and
should not) go to zero in one pass.

### `scripts/check-locale-parent-gap.js`

Diff-scoped PR gate, same git-diff/merge-base template as
`check-translation-parity.js`. `node scripts/check-locale-parent-gap.js
[--base <ref>]`

For every locale HTML file **newly added** in the branch: resolves its EN
parent via its hreflang cluster, runs `decide(enParentRelPath, localeCode)`.
If the result `requiresLedgerEntry` and no ledger entry exists for that
`(pattern, locale)` pair with a passing verdict (`mirror` or `gate-pass`) →
**fail**, printing the exact pattern/locale, the missing instrument
questions (competitor footprint? keyword volume? EN GSC impressions from
that locale?), and a pointer to record the result or raise it with the user
first. If the Core-parent default-mirror path applies, no ledger entry is
required and the file passes silently.

Exit 1 on any violation, 0 otherwise. Wired into `.github/workflows/validate.yml`
as a **gating** step.

---

## 5. Advisory lookup before you start

### `scripts/check-locale-parent-tier.js`

`node scripts/check-locale-parent-tier.js <relative-path-or-pattern>
<locale-code>` — prints `decide()`'s result in human-readable form: matched
pattern, tier, script-independence, locale tier/hold, the decision, the
reason, and — if a ledger entry is required — the exact instrument questions
to answer and where to record them.

Run this **before** starting any new locale-page work, e.g.:

```
node scripts/check-locale-parent-tier.js symbol/pi-symbol fr
# -> DECISION: mirror (no ledger entry required)

node scripts/check-locale-parent-tier.js category/bold-fonts ja
# -> DECISION: skip-script-incompatible (ledger entry required to override)

node scripts/check-locale-parent-tier.js usecase/free-fire-name-generator vi
# -> DECISION: skip-hold-locale (vi is on hold — do not add vi content)
```

Always exits 0 — it's advisory, not a gate.

---

## npm scripts (all five, plus the two they build on)

| Script | Command | Kind |
|---|---|---|
| `sync-locale-mesh.js` | `npm run sync:locale-mesh [-- --fix] [-- --files <path>]` | fixer, exits 0 |
| `check-locale-mesh.js` | `npm run check:locale-mesh [-- --base <ref>]` | gate, CI-wired |
| `check-locale-parent-tier.js` | `npm run check:locale-parent-tier <path> <locale>` | advisory, exits 0 |
| `audit-locale-parent-gap.js` | `npm run audit:locale-parent-gap [-- --full]` | discovery, CI-wired (informational) |
| `check-locale-parent-gap.js` | `npm run check:locale-parent-gap [-- --base <ref>]` | gate, CI-wired |

---

## What this does NOT do (yet)

- Only `scripts/generate_library_page_from_spec.py` has the mesh-sync hook.
  `answers/`, `events/`, and `printables/` generators should get the same
  hook the next time they're touched.
- `data/locale_parent_gap_audit.json` ships with exactly one real entry. Every
  other Core-parent × qualified-locale cell is unaudited — `npm run
  audit:locale-parent-gap` is how that backlog gets worked, not something
  this tooling fabricates on its own.
- The script-compatibility overlay (step 2 of the flowchart) is a fixed list
  of six locale codes (`ar, hi, ja, ko, th, zh-tw`), not a general Unicode
  script detector. If a new locale is added whose script isn't Latin, add it
  to `NON_LATIN_LOCALES` in `scripts/lib/locale-parent-registry.js`.
