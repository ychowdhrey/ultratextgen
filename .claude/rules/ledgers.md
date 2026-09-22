---
paths:
  - "data/**/*.json"
  - "data/**/*.csv"
---

# `data/` ledgers are machine-read state, and every entry is a discussed decision

These files are not notes. CI gates read them, and a row is the difference between a
PR passing and failing.

## The standing bar

**Never add or edit an entry unilaterally, and never to make a PR pass.** Every
entry represents a decision discussed with the user. If a gate flags something,
either fix the thing or raise the divergence — editing the ledger to make a page you
want to ship pass is the one move all of these files exist to prevent.

Re-pointing an existing entry at the same string whose punctuation changed is
maintenance of a decision already taken; that is not the same act as adding one, and
the bar still forbids the latter.

Each entry carries its reason and its date. Several carry a `nextRecheck` /
`nextReview`: an exception is a standing claim, and claims get re-verified, not
grandfathered.

## What each one is for

| Ledger | Holds | Read by |
|---|---|---|
| `english_parent_exceptions.json` | a locale page ratified as needing **no** EN parent | `check-locale-parent-gap.js` |
| `translation_parity_exceptions.json` | one discussed EN↔locale pair allowed to diverge | `check-translation-parity.js` |
| `translation_identical_strings.json` | a string whose **correct** translation is byte-identical to English | `check-locale-translation.js` |
| `numeric_parity_exceptions.json` | one discussed `(page, slot, value)` divergence | `check-numeric-parity.js` |
| `core_parent_set.json` | which page patterns are mirror-by-default / gated / never | `locale-parent-registry.js` |
| `locale_qualification_tiers.json` | each locale's tier, holds, **and the canonical locale list** | `locale-parent-registry.js` |
| `locale_parent_gap_audit.json` | a cleared (or user-authorized) pre-build demand check | `check-locale-parent-gap.js` |
| `parity_catalogue_pages.json` | page *types* whose link list is an inventory, not editorial | `content-fingerprint.js` |
| `library_hub_exclusions.json` | a page that deliberately does not belong in its hub | `check-library-hub-coverage.js` |
| `printable_tool_duplication_exclusions.json` | one discussed same-tool pair | `check-printable-tool-duplication.js` |
| `efr_exceptions.json` | one page agreed at a named EFR, with owner and date | `check-efr.js` |
| `em_dash_locale_policy.json` | each locale's em-dash policy of record | `check-editorial-footprint.js` |
| `editorial_phrase_bank.json` | measured phrase patterns and their remedies | the EFR scorer |
| `source_authority.json` | the cited domain → tier map that sets `rel` | `check-source-attribution.js` |
| `source_resource_links.json` | a link that is a destination, not evidence, by **route and domain** | `check-source-attribution.js` |
| `source_link_health.json` | per-URL fetch history; **never hand-edited** | `audit-link-rot.js` |
| `sitemap-lastmod-cache.json` | per-URL content hash + lastmod; re-baselined, not edited | `update-sitemap.js` |
| `stranded_work_exclusions.json` | a branch knowingly left untracked | `check-stranded-work.py` |

Policy and registry files (`core_parent_set`, `locale_qualification_tiers`,
`em_dash_locale_policy`, `parity_catalogue_pages`, `source_authority`) are
**structural claims** about the site, not per-page permissions, and must never be
used as one.

A locale's em-dash policy changes only in the ledger, with a native reader or corpus
evidence — never by hand on a page and never by translating the English rule.

## Generated data files are not ledgers

`sitemap-lastmod-cache.json`, `generated_page_art.json`, `og_style_registry.json`,
`locale_glossary.json`, `editorial_footprint_baseline.json` and the
`printables_*.json` payloads are produced by a script. Find the generator rather
than editing them — see `.claude/rules/generated-artifacts.md`.
