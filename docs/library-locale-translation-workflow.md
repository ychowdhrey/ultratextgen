# Library Locale Translation — Step-by-Step Workflow

How to translate `library/` collection pages into a locale, in batches, so each
batch ships meshed, validated, and native-sounding.

**Scope of the whole job:** 337 EN library pages × 30 canonical locales = **10,110
cells**, of which ~558 are built. This is a program run in batches, not a single
pass. The workflow is resumable by design — every step reads current state from
disk, so stopping and restarting later is free.

**Why `library/` and not everything:** `library/*` is `tier: core` in
`data/core_parent_set.json` — mirror-by-default, no per-page gap check required for
a qualified locale. `answers/*`, `guide/*` and `usecase/*` are `gated` and each
needs a cleared demand check first. Do not use this workflow to bulk-translate
those.

---

## Before the first batch in a new locale

Run once per locale, not per batch.

```bash
node scripts/check-locale-parent-tier.js library/heart-symbols <locale>
```

- **Tier 1 or 2, no hold** → proceed. `library/*` is Core, so no
  `data/locale_parent_gap_audit.json` entry is needed.
- **Tier 3, or `hold: true`** → **stop.** `check-locale-parent-gap.js` will fail the
  PR without a recorded entry, and that entry is a discussed decision, never a
  unilateral edit. Raise it first.

---

## Step 1 — Plan the batch

```bash
python3 scripts/plan-library-locale-batch.py --locale th --size 10 \
        --gsc <search-console-landing-page-export.csv> \
        --market Thailand \
        --json /tmp/batch-th.json
```

**Always pass `--gsc`, and always pass `--market` with it.** The two flags rank
by different things and the difference decides the batch:

- **`--gsc` alone** ranks by the EN page's own clicks — i.e. by **English** demand
  mix. EN is ~78% naming/identity; `ja` is ~0.2%. Ranking a Japanese batch this way
  puts Free Fire first for a market that sends the Free Fire page **11 impressions**.
- **`--gsc --market <Country>`** ranks by impressions from that market landing on
  the **EN** page — people in the target country already finding the English
  version because no local one exists. That is demand for the page you are about
  to build, measured where you are building it.

Without either, the fallback is structural (inbound links, cluster size), which
measures how well-connected a page is, not whether anyone searches for it —
structurally `emoji-flags` outranks `fortnite-symbols`; on demand it is the
reverse by ~13×.

**Caveat on `--market`:** it only sees pages that already rank in that market. A
page with zero market impressions may still have demand nobody can see — that is
the FR `/symbol/` blind spot. Treat the ranking as a floor, not a ceiling.

Batch size: **8–12**. Large enough to amortise the mesh and validation steps,
small enough that one bad decision doesn't contaminate 40 pages.

---

## Step 2 — Resolve the native head term (the step that cannot be automated)

For each page in the batch, the planner prints one of:

- **`native [XX-000 TITLE-SAFE]: <phrase>`** — an approved or limited-use phrase
  from `data/local-language/<locale>.json`. Use it for the slug, title and H1.
  Read its `avoid_when` before doing so; some phrases are body-only or carry a
  register restriction.
- **`native: NONE ON RECORD`** — **do not invent a slug and do not
  machine-translate the English one.** This repo has repeatedly shipped the wrong
  native term that way and had to retarget the page afterwards: German
  `blackletter` → `altdeutsche-schrift`, Taiwanese `yen` → `日幣`, Dutch
  `cursief` → `sierletters` (where the wrong term was already ranking and the
  right one had 8× the volume).

When there is no phrase on record, resolve it before writing: check the live SERP
for the concept in that market, check what competitors in that market call it, and
prefer the term with real search behaviour behind it over the dictionary-correct
translation. Then record what you found — see Step 8.

---

## Step 3 — Check who already owns it in that locale

Non-negotiable, and the most common cause of wasted work.

```bash
ls <locale>/                      # what exists natively already
grep -rl 'hreflang="en" href=".*library/<slug>/"' <locale>/   # duplicate claimant?
```

Three failure modes to rule out:

1. **A locale-native page already covers the topic under a different slug.**
   Translating `library/ml-name-symbols` into `tr` when `tr/usecase/mobile-legends-nick`
   already ranks creates two of your own pages on one query.
2. **A duplicate claimant already exists** — two pages in one locale declaring the
   same `hreflang="en"` parent. Git merges those silently; only this check catches
   them.
3. **The locale hub already targets the term**, in which case the spoke needs
   Hub-vs-Spoke Rule 3 de-targeting applied to the hub in the same change.

If any of these hit, either skip the page or resolve the conflict deliberately —
do not ship alongside it.

---

## Step 4 — Write the spec

Copy `data/library_page_specs/_TEMPLATE.example.json` to
`data/library_page_specs/<locale-slug>.json` and set:

| Field | Value |
|---|---|
| `lang` | the locale code — this is what selects native chrome from `LOCALE_UI_STRINGS` |
| `slug` | the **native** slug from Step 2 |
| `canonical` | `https://ultratextgen.com/<locale>/library/<native-slug>/` |
| `hreflang` | every existing sibling **plus** the new page itself **plus** `x-default` → EN |
| `page_type` | inherit from the EN source. A `symbol` parent stays `symbol`; never re-decide the lane per locale |

Translate the copy — do not transliterate it. Section headings, intro, FAQ and
CTA all get real localised wording. The symbol data itself is language-independent
and carries over unchanged.

---

## Step 5 — Generate

```bash
python3 scripts/generate_library_page_from_spec.py data/library_page_specs/<spec>.json
```

The generator writes the page and then calls
`sync-locale-mesh.js --fix --files <new page>` itself, so hreflang and
locale-native internal links are wired on creation rather than audited later.

---

## Step 6 — Art, in the same commit

```bash
# register the page in scripts/generate-site-art.py PAGES, then:
python3 scripts/generate-site-art.py <locale>-library-<native-slug>
```

A page must never ship before its hero SVG and OG PNG exist. Googlebot fetches
the image within hours of the sitemap picking the page up, and a 404 on that first
fetch is recorded before any later backfill lands.

---

## Step 7 — Validate, then commit

Run in this order. The diff-scoped gates only see **committed** work, so commit
first, then run them:

```bash
git add -A && git commit -m "feat(<locale>): translate N library pages"

npm run check:new-page-images
npm run check:faq-schema
npm run check:translation-parity
npm run check:locale-mesh
npm run check:locale-parent-gap
python3 scripts/validate_library_pages.py
node scripts/audit-hreflang-completeness.js      # whole-site, blocking
```

`validate_library_pages.py` is the one that catches lane mismatch (a page whose
directory disagrees with its `hreflang="en"` counterpart's) and orphan spokes.

**If `check:translation-parity` fires on siblings you did not touch:** that is the
gate working. Either sync them in this batch or raise the divergence — never add
an entry to `data/translation_parity_exceptions.json` to make a batch pass.

---

## Step 8 — Feed back what you learned

Two things every batch produces that the next batch should not have to rediscover:

1. **Native head terms resolved in Step 2** — especially where the planner said
   `NONE ON RECORD`. Record them so the next batch's planner prints them instead.
2. **Topics deliberately skipped in Step 3**, and why. A confirmed "don't translate
   this here, `<locale>/x/` already owns it" is as valuable as a shipped page.

---

## Batch checklist

```
[ ] locale tier checked (once per locale)
[ ] planner run WITH --gsc
[ ] native head term resolved for every page (or page dropped)
[ ] duplicate-claimant / native-owner check run per page
[ ] specs written with lang + native slug + full hreflang + inherited page_type
[ ] generator run
[ ] art registered and generated
[ ] committed, then all gates run
[ ] native terms + skip decisions recorded
```

## Known failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Gates pass but nothing was checked | Gates are diff-scoped; work was uncommitted | Commit, re-run |
| Two pages in one locale claim one EN parent | Parallel sessions chose different slugs | Keep the better-meshed one, 301 the other, repoint references |
| Page ranks for nothing | Slug used the dictionary term, not the searched term | Step 2 |
| Locale page links English hubs | `sync-locale-mesh` not run, or run unscoped | `npm run sync:locale-mesh -- --fix --files <paths>` |
| Hreflang stamped onto unrelated pages | `--fix` run without `--files` | Review the diff; revert out-of-scope edits |
