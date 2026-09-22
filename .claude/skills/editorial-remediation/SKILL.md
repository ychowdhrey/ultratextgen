---
name: editorial-remediation
description: >-
  Run an editorial remediation pass on UltraTextGen copy — removing em dashes,
  lowering an Editorial Footprint Risk score, bringing a page to the tone standard,
  or fixing what `check:editorial-footprint`, `check:efr` or
  `check:spec-sentence-reuse` reported. Use this whenever the task is "clean up the
  em dashes", "this guide is failing EFR", "rewrite this page's copy", or a user-
  directed removal pass. Done naively this becomes a synonym-swap purge that Google
  names as scaled content abuse and that deletes facts; this skill is the method
  that does not.
---

# Editorial remediation

Invariants: `.claude/rules/editorial-copy.md`,
`.claude/rules/editorial-footprint.md`. The standard, the corpus measurements and the
record of past passes: `docs/architecture/editorial-standard.md`,
`docs/em-dash-policy.md`, `docs/editorial-footprint-risk.md`,
`docs/efr-quality-gate.md`.

## 0. Two things this pass must never become

- **A synonym swap.** Google's spam policy names *"automated transformations like
  synonymizing"* as scaled content abuse, so trading words to lower a score moves
  toward the policy, not away from it.
- **A deletion.** Never lower a score by cutting explanation, evidence, examples,
  methodology, caveats, tables, instructions, source context, a codepoint, an internal
  link or a search-protected term. The gate reports that as IMPROVED BY REMOVAL and
  the SEO Preservation Gate blocks it.

The transformation asked for is: generic claim → concrete information; abstract
benefit → observable behaviour; filler introduction → direct answer; template
sentence → topic-specific knowledge. **Never "humanise"** with randomness, slang or
deliberate imperfections.

## 1. Establish the scope before touching anything

```bash
npm run audit:em-dash                    # per-locale, against the ledger
npm run audit:editorial-footprint        # whole-site EFR + the ledger CSV
npm run audit:efr                        # PASS/REVIEW/FAIL per section
npm run audit:spec-sentence-reuse        # the whole-corpus spec picture
```

- Read the **`lever`** column. `facts` means add the numbers, names, versions and
  constraints the page is about — **a phrasing rewrite will not move it.**
- **Rank and threshold on `locale_percentile`, never on a raw cross-locale score**, and
  read an unmeasured dimension as `null`, never `0`.

## 2. Rank by leverage — the site's em dashes are not one decision each

Group em-dash-bearing strings by **how many pages share them verbatim**. The top of
that list is a handful of template strings: one CTA line accounted for ~1,800 pages
across 17 languages and one tile-label format for 2,915 more, so **10,010 page
instances came out of ~1,320 authored decisions.**

- **variety ≈ 0** → one shared string. **Fix the template.**
- **variety ≈ 1** → the same idea written many times. **Fix the writing.**

Asking 220 pages to each hand-edit one shared string is the failure this exists to
prevent.

## 3. Fix the source, not the rendered page

**Thousands of em dashes are hardcoded in spec files and generator scripts**, so a
page edit is undone by the next run. The gate names the upstream file when it can find
it. There are **two** spec sets:

```
data/library_page_specs/*.json          # ~628 EN
data/library_page_specs/<lang>/*.json   # ~885 more — a *.json glob misses these
```

Use a recursive count, and if it disagrees with a glob count, **chase the discrepancy
rather than assuming corruption** — that is what caught this the last time.

Generated inventory (`[data-static-directory]`) is not the hub's copy: a hand edit
there is overwritten by the next build. Go through the data and rebuild.

## 4. Replace structurally

Use one of the phrase bank's own listed remedies: a full stop where the second half is
a separate thought, a comma where a verdict meets its qualifier, a colon where what
follows explains what precedes, or a paired parenthesis. **Every word survives; only
the joint moves.**

Read each locale's policy in `data/em_dash_locale_policy.json` first: `ru es pt fr pl
ro` are native and are never touched; `zh-tw` and `ja` keep the paired `——`; nine
locales warn pending a native reader. Some locales had already written a string as one
flowing sentence — **those are the model, not an omission.**

## 5. Clean on touch, and plan the sibling pass first

A page whose own copy you edit leaves with **zero** em dashes in every measured slot,
cards included, under its own locale's policy. An **English** copy edit obliges its
locale siblings too — editing one currency symbol page pulls 18 siblings carrying 159
em dashes. **Plan that before opening the PR, not after the gate names them.**

## 6. Expect three things this class of pass surfaces, none of them its own bug

- **A stale-schema split** — anchoring a rewrite on `>` or `"` reaches the JSON-LD copy
  of a FAQ answer and not the visible one. Widen the anchor past the newline and run
  `npm run check:faq-schema`.
- **Pre-existing mesh defects on pages you merely touched.** Repair with
  `npm run sync:locale-mesh -- --fix --files <those files>` — **never site-wide.**
- **False "introduced English" reports** — see
  `docs/architecture/translation-parity.md` §6.

## 7. Verify

```bash
npm run check:editorial-footprint
npm run check:efr
npm run check:spec-sentence-reuse
npm run check:ci-gates
```

Commit **before** running the diff-scoped gates locally: several diff `merge-base..HEAD`
and read uncommitted work as absent, which is a false green.

If a page genuinely needs its footprint, that is a `data/efr_exceptions.json` entry —
a discussed decision with a score, reason, owner and date, **never a move to make a PR
pass** (`.claude/rules/ledgers.md`).
