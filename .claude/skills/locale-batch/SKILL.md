---
name: locale-batch
description: >-
  Run a locale translation batch for UltraTextGen library/symbol pages. Use this
  whenever the task is translating, mirroring, or backfilling pages into a locale
  — "translate N pages into th", "close the fr symbol gap", "build the next ko
  batch", "mirror these library pages into de" — even for a single locale page,
  and even when the request doesn't say "batch". This is the most collision-prone
  recurring work in the repo (parallel sessions, duplicate claimants, stale
  plans), and this skill enforces the step ordering that prevents every recorded
  failure mode.
---

# Locale Batch

**The canonical procedure is `docs/library-locale-translation-workflow.md`.
Read it in full before the first page of any batch** — this skill enforces its
ordering and adds the guard rails around it; it does not replace it. The
`steward` skill's rules apply throughout.

## Scope check before anything else

This workflow is for `library/*` (and by extension `symbol/*`) pages —
`tier: core` in `data/core_parent_set.json`, mirror-by-default. **Do not use it
to bulk-translate `answers/*`, `guide/*`, or `usecase/*`** — those are gated
and each page needs a cleared demand check recorded in
`data/locale_parent_gap_audit.json` first (a discussed decision, never a
unilateral entry).

## The ordering is the product

Every step below exists because skipping it shipped a real defect. Run them in
order; the doc has the full detail per step.

### 0. Once per locale: tier check

```bash
node scripts/check-locale-parent-tier.js library/heart-symbols <locale>
```

Tier 3 or `hold: true` → **stop and raise it**. A hold silently ignored is a
violation; a hold knowingly overridden by the user is a ledgered decision.

### 1. Sync and sweep before planning

Fetch and merge `main` first — a parallel session may have shipped pages your
plan assumes are missing (recorded case: an NL plan went stale mid-analysis,
39→57 pages). Then list what the locale already has (`ls <locale>/`).

### 2. Plan with demand, not structure

```bash
python3 scripts/plan-library-locale-batch.py --locale <lc> --size 10 \
    --gsc <landing-page-export.csv> --market <Country> --json /tmp/batch.json
```

**Always `--gsc`, always `--market` with it** — `--gsc` alone ranks by English
demand mix and has put Free Fire first for a market that sends it 11
impressions. No export available → the structural fallback is a proxy; say so
in the batch's record rather than presenting it as demand. The planner needs
the vocabulary workspace attached as a sibling checkout and fails loudly if it
isn't — that failure means *attach it*, not *proceed without vocabulary*.
Batch size 8–12.

### 3. Resolve the native head term — never invent it

`native [ID … TITLE-SAFE]: <phrase>` → use it (read `avoid_when` first; some
phrases are body-only). `NONE ON RECORD` → **do not machine-translate the EN
slug**; resolve via the market's live SERP and competitors, prefer the term
with real search behaviour (`blackletter`→`altdeutsche-schrift`,
`cursief`→`sierletters` are the paid-for lessons), and record what you found
per the doc's Step 8.

### 4. Check who already owns it in that locale — per page

```bash
grep -rl 'hreflang="en" href=".*library/<slug>/"' <locale>/
```

A conflict **redirects the work, never cancels it** — the doc's Step 3 table:
existing page owns the job → build *into* it; related-but-different job →
build new *and* de-target the existing page (Hub-vs-Spoke Rule 3) in the same
change; nothing exists → build. The `tr/library/semboller/` worked example is
the template.

### 5. Spec, then generate

Copy `data/library_page_specs/_TEMPLATE.example.json` to `<locale-slug>.json`:
`lang`, the **native** slug, canonical, **full hreflang including the page's
own self-reference and `x-default` → EN** (a ko batch shipped 25 pages with no
`x-default` because the specs lacked it — fix specs, not just pages), and
`page_type` inherited from the EN source, never re-decided. Translate the
copy; don't transliterate it. Then:

```bash
python3 scripts/generate_library_page_from_spec.py data/library_page_specs/<spec>.json
```

The generator wires the mesh itself (`sync-locale-mesh --fix --files`).

### 6. Art last, and re-wire after any regenerate

Register slugs in `generate-site-art.py`'s `PAGES`, run
`python3 scripts/generate-site-art.py --only <locale>-library-<native-slug>`
(exact slugs — `--only` matches by *prefix* and will pull in siblings), then
`wire-site-art.py`. **A `--force` regenerate of the page discards the wired
art silently** — art wiring is always the last step after the final generator
run, and `wire-site-art.py` runs unscoped, so revert every file outside your
batch before committing. Same commit as the pages, never a follow-up.

### 7. Register in the hub, then commit, then gate

Locale hubs are generated: run `node scripts/build-library-hub.js` and commit
the regenerated hub(s) — never hand-edit an entry list.
Then **commit first** (diff-scoped gates see only committed work) and run
`npm run check:ci-gates` — never a hand-assembled gate list — plus
`python3 scripts/validate_library_pages.py` (lane mismatch, orphan spokes)
and `node scripts/audit-hreflang-completeness.js`.

If `check:translation-parity` fires on siblings you didn't touch, that is the
gate working: sync them or raise it — never add a
`data/translation_parity_exceptions.json` entry to pass.

### 8. After merging main, re-sweep for duplicate claimants

No two pages in one locale may declare the same `hreflang="en"` parent. Git
merges those cleanly (26 pairs once survived a merge); this grep, not path
conflicts, is the collision detector. Found one → keep the more-integrated
page, 301 the other, repoint references.

### 9. Feed back what the batch learned

Native terms resolved, topics deliberately skipped and why — recorded per the
doc's Step 8 so the next batch's planner prints answers instead of
`NONE ON RECORD`. A confirmed "don't build this here" is as valuable as a
shipped page.

## Never

- Never machine-translate a slug or invent a native term.
- Never ship a locale page that still carries EN verbatim from its parent —
  prose, visible `flag-label`s, or `data-symbol` clipboard payloads
  (`npm run check:locale-translation` gates all three).
- Never edit a `data/*` registry (exceptions, tiers, gap audit, identical
  strings) to make the batch pass.
- Never leave art, hub registration, or mesh for a "later pass".
