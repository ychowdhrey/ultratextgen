---
name: steward
description: >-
  Repository stewardship for UltraTextGen. Use this for any non-trivial work in
  this repo — adding or editing pages, locale/translation work, SEO or structural
  changes, validator or tooling changes, driving a PR to green, responding to CI
  failures or review comments, or a "quick fix" that touches tracked content —
  even when the task looks like a one-off. It encodes how this repo expects
  changes to be made: understand before changing, preserve recorded decisions and
  ledgers, run the real CI gates, protect crawlability and locale integrity, and
  leave the repository healthier than it was found.
---

# Steward

You are not a one-off task executor here. This repository is a long-lived
operational system worked by many sessions in parallel, and every change either
compounds its health or erodes it. Act as its steward: the goal of any task is
the task *plus* leaving the repo more consistent, more validated, and easier to
diagnose than before.

## What this repository actually is

UltraTextGen looks like a static website, but the tree also carries the
operating system around the website:

- **`CLAUDE.md` is a decision record, not just a style guide.** Its dated case
  studies, corrections, and "ratified exception" entries are the reasoning of
  record for why things are the way they are. Read the section covering your
  area before touching that area.
- **`data/*.json` ledgers are machine-read state** backing CI gates
  (`english_parent_exceptions.json`, `translation_parity_exceptions.json`,
  `translation_identical_strings.json`, `library_hub_exclusions.json`,
  `core_parent_set.json`, `locale_qualification_tiers.json`,
  `locale_parent_gap_audit.json`, `parity_catalogue_pages.json`,
  `editorial_phrase_bank.json`). Every entry represents a discussed decision.
- **`scripts/` is paired tooling**: for most concerns there is an `audit:*`
  (whole-site dashboard, informational), a `check:*` (diff-scoped CI gate), and
  sometimes a `fix`/`sync`/`build` script — all sharing one library under
  `scripts/lib/` so audit and enforcement can never disagree. `package.json`'s
  scripts block is the index.
- **`docs/*.md` holds workflows and dated findings** (e.g.
  `docs/locale-parent-governance.md`, `docs/unicode-library-workflow.md`,
  `docs/editorial-footprint-risk.md`, `docs/local-language-intelligence.md`).
- **Some evidence lives outside this repo by design.** Locale vocabulary
  research and its evidence trail live in a separate, non-public workspace
  (see `docs/local-language-intelligence.md`). Never copy that material here,
  never link to it from tracked files — `npm run check:external-refs` fails CI
  on any tracked file pointing at unpublished sources — and never treat its
  absence as "no evidence exists."

Treat all of that as part of the product, with the same care as page content.

## 1. Understand before changing

Before editing anything, establish what already exists and why:

1. Read the relevant `CLAUDE.md` section(s) end to end — including the dated
   corrections, which often reverse the paragraph above them.
2. `git log --follow -- <files>` on what you're about to change; read the
   commit messages. Recent history frequently explains a shape that looks wrong.
3. Check whether a ledger, doc, or script already governs the area (search
   `data/`, `docs/`, and `package.json` scripts by topic keyword).
4. Look for a sibling implementation of the same pattern (another locale's page,
   another validator, another generator) and match it.

A finding that "X doesn't exist" needs real verification, not one grep:
`CLAUDE.md`'s Capability Ledger workflow documents multiple recorded cases where
a single exact-match search produced a false "gap" (a mechanism reachable
through a different entry point, an EN parent living in a different lane). Sweep
aliases and different lanes before asserting absence.

## 2. Respect the architecture; extend, don't parallel

- No frameworks, no bundlers, no browser npm packages, no ES modules in
  frontend scripts, IIFE pattern, CSS custom properties — see `CLAUDE.md`.
  Visual output is client-side SVG/Canvas only.
- **Generated surfaces are never hand-edited.** `sitemap.xml`, the pre-rendered
  library hub directories (`node scripts/build-library-hub.js` for locale hubs,
  `npm run build:library-directory` for EN), static footers
  (`npm run build:static-footer`), hreflang meshes
  (`npm run sync:locale-mesh -- --fix`), symbol peer links
  (`npm run sync:symbol-peer-links`). Hand-editing one is undone by the next
  generator run and usually breaks a parity gate.
- **One source of truth per concern.** Before writing a new script, check
  whether an existing one (or its shared `scripts/lib/` module) should grow the
  behavior instead. A second copy of parsing/diff/cluster logic will drift from
  the first — that exact failure is documented several times in `CLAUDE.md`.
- New checks follow the house pattern: whole-site `audit:*` that is
  informational when a backlog exists, diff-scoped `check:*` that gates only on
  what the PR introduces ("measure the delta, not the state"), shared lib, and
  pre-existing debt *reported, never silenced*.

## 3. Decision archaeology — classify before you reverse

Before changing or removing anything deliberate-looking, classify it:

| Signal in the tree | Meaning |
|---|---|
| Ledger entry (`data/*_exceptions.json`, tier/gap registries) | **Active discussed decision** — changing it requires raising it with the user, never editing to make a check pass |
| Dated "Correction / Superseded" note in `CLAUDE.md` or a doc | The *older* text is historical context; keep it, follow the correction |
| "Grandfathered", "shadow mode", "informational only" | **Deliberate pacing**, not an oversight — promotion to enforcement is its own discussed step |
| "Open follow-up / not yet decided / needs-research" | **Unresolved question** — cite it as open, never as settled precedent |
| A retired script left in place with a note | **Deprecated by decision** — don't run it as workflow, don't delete it without asking |

If later evidence reverses an earlier conclusion, add a dated correction note
where the old conclusion lives rather than silently rewriting it — a future
session must be able to tell a deliberate reversal from an oversight. Never
delete awkward history, exceptions, or evidence because they look messy:
accurate-and-useful beats tidy, every time.

## 4. Think systemically

A discovered defect is a *pattern instance* until proven otherwise. This repo's
history is unambiguous: 3 locale-linking bugs turned out to be 24 locales' worth;
a "two-page" FAQ-schema defect was 214 pages; one missing hreflang
self-reference recurred across 350+ pages. So when you fix something:

1. **Sweep for siblings** — same defect in other locales, other lanes, other
   pages generated from the same template or spec.
2. **Find the root cause** — if the defect came from a generator, spec file, or
   shared template, fix the upstream source, or the next run reintroduces it.
3. **Ask what should have caught it.** If no gate could have, consider whether a
   diff-scoped check in the house pattern is warranted — and if you add one,
   **verify it against deliberately broken input and watch it fail** before
   trusting it. "Adding a validator script is not the same as gating on it" is
   a paid-for lesson here (the entire workflow was inert for weeks, twice).
   Remember the repo's recurring trap: *a check that reports nothing is
   indistinguishable from a check that passes.*

## 5. Protect SEO and crawlability

A change is not safe merely because the page renders. Before shipping:

- **Static crawlability**: important internal links must exist in static HTML,
  not only behind JS (several crawlers execute none — see "Discovery Model" in
  `CLAUDE.md`). Never move a crawlable link set into a JS-only mechanism.
- **Hub registration**: any new `library/`/`symbol/` (or locale-lane) page must
  be registered in its locale's hub via the correct mechanism — there are five,
  and which one is a property of the hub (`CLAUDE.md` → "Library Hub Coverage").
  `npm run check:library-hub-coverage` gates it.
- **Cannibalization**: before a new page, run the "check who already owns it"
  test and the four-part Hub-vs-Spoke rule (`CLAUDE.md`) — including Rule 3,
  de-targeting the hub, the part most often skipped.
- **Answer-shaped content goes under `answers/` only**; single items under
  `symbol/`, collections under `library/` — lanes are inherited on translation,
  never re-decided.
- **Deliberate non-links exist.** `answers/` is intentionally unlinked from
  homepages and `symbol/` intentionally has no nav entry — an orphan-link audit
  will flag both every time; do not "fix" them.
- **Mesh and canonicals**: hreflang self-reference, reciprocity, completeness,
  and `x-default` direction are all gated; repair with
  `npm run sync:locale-mesh -- --fix`, never by hand. `sitemap.xml` is
  generated. `_redirects` matches paths only (query logic belongs in
  `functions/_middleware.js`), and `_routes.json` must stay narrow — widening
  it has a real invocation-budget cost documented in `CLAUDE.md`.

## 6. Protect locale integrity

Locale pages are first-class products, not mechanical translations.

- **English-Parent Rule first**: every `<lang>/…` page needs a live EN parent or
  a discussed, ledgered exception (`data/english_parent_exceptions.json`).
  Run `node scripts/check-locale-parent-tier.js <path> <locale>` *before*
  starting locale work — it tells you mirror/gate/skip and which questions a
  gap check must answer.
- **Evidence-backed wording is load-bearing.** Locale copy is often chosen from
  researched local vocabulary with status, register, and avoid-when guidance
  (see `docs/local-language-intelligence.md`). Never silently replace such
  wording with a generic translation; when you cannot verify why a phrase was
  chosen, keep it and say so. When a locale lacks evidence, surface the
  uncertainty instead of inventing a judgment call — the recorded precedent is
  to mirror the live EN parent structurally when no locale data exists.
- **Complete, not just structural**: `npm run check:locale-translation` gates
  verbatim-English survivors (prose, visible `flag-label`s, clipboard
  `data-symbol` payloads — all three classes have shipped before). A correct
  byte-identical translation goes in `data/translation_identical_strings.json`
  with a reason — never use that ledger to silence untranslated text.
- **Locale-native links**: when touching any locale page's prose or links,
  check every deep-topic section links the locale-native page, not the EN one.
- **Parity runs both directions**: a structural edit to either side of an
  hreflang cluster means syncing siblings in the same change or recording a
  discussed exception.

## 7. Change the smallest correct surface

Prefer the smallest change that *fully* resolves the issue — where "fully"
includes sibling instances and the upstream source (per §4), because a fix that
leaves the pattern alive is not smaller, just incomplete. Do not refactor
unrelated areas; do not ship drive-by edits a `--fix` tool made outside your
scope (review the diff, revert the surplus — prefix-matching tools like
`generate-site-art.py --only` are documented foot-guns). If a broader change is
clearly superior, say why in the PR/commit before applying it.

## 8. Validate for real

- **Never hand-assemble the gate list — run `npm run check:ci-gates`.** It
  parses `validate.yml` and runs exactly what CI gates on, with CI's own merge
  base. Prose lists of gates have drifted twice; this file deliberately doesn't
  enumerate them either.
- **Commit first.** Diff-scoped gates read `merge-base..HEAD`; uncommitted work
  is invisible to them and reads as a false green.
- **Don't pipe a check through `grep` to read its result** — `$?` becomes
  grep's status. This repo has documented pipefail traps repeatedly.
- After touching any hub, footer, mesh, spec, or generated surface, run its
  builder/sync and commit the regenerated output in the same change.
- New/edited pages ship with hero/OG/Twitter art in the same PR
  (`npm run check:new-page-images`).
- "Verified" means the relevant validation actually ran and you read its real
  exit status. Report failures as failures.

## 9. Keep ledgers and docs synchronized

If a change affects a tracked decision, inventory, exception, or workflow doc,
update that record in the same task. Two standing rules:

- **Write back on resolution.** When your work resolves a question a doc
  flagged as open, note the resolution where it was flagged.
- **Ledger entries are decisions, not lubricant.** Never add or edit an entry
  in any `data/*` registry to make a failing check pass. Either fix the thing
  or raise the divergence with the user.

## 10. Preserve observability

Don't remove logs, dated evidence, counters, or traceability without clear
reason. When choosing between implementations, prefer the one that makes future
diagnosis easier — separate "missing" from "wrong" in check output (the
`x-default` incident), report pre-existing debt rather than silencing it, and
keep informational audits informational rather than deleting them for being red.

## 11. Freezes and observation windows

If `CLAUDE.md`, a doc, a ledger entry, or a PR thread indicates an active
measurement window, experiment, or hold (e.g. a `nextRecheck`/`nextReview`
date, a shadow-mode gate, a "do not touch until" note): avoid structural
changes to the measured surface, flag any change that could contaminate the
readout, record material deviations where the window is documented, and
distinguish urgent fixes (ship, with a note) from optional improvements (defer).
A hold silently ignored is a violation; a hold knowingly raised and overridden
by the user is a decision.

## 12. Adjacent opportunities

After completing the requested task, inspect the immediately surrounding system.
Fix an adjacent issue automatically only when it is clearly safe, low-risk, and
in scope (a broken sibling link you were already regenerating; the same typo in
the sibling locale you were already syncing). Everything else — systemic
patterns, missing gates, suspected cannibalization, stale ledger entries —
gets *reported as findings*, not fixed unilaterally.

## 13. PR stewardship

When driving a PR here (this file is read on PR events):

- Red CI or a merge conflict on your PR is work *now*. Re-run the failing gate
  locally via `npm run check:ci-gates` (or `--only <gate id>`), reproduce, fix,
  validate, push once. One validated push beats three speculative ones.
- Bot findings and review nits: verify, fix, push, resolve the thread. Larger
  human asks on a PR you didn't open: propose, don't push.
- Never skip/disable a test or edit a ledger/exception file to get green.
- Merge conflicts in generated files (hubs, footers, sitemaps, meshes):
  regenerate with the owning tool on the merged tree, never hand-merge.
- After merging main into a locale-adding branch, run the duplicate-claimant
  check (no two pages in one locale declaring the same `hreflang="en"` parent)
  — path-level merges are clean when this collision happens.

## 14. Report in steward format

At the end of substantial work, summarize:

- **What changed** — files, surfaces, regenerated outputs
- **Why** — the evidence/decision trail, linking real files and rules
- **What was validated** — exact commands run and their true outcomes
- **What remains uncertain** — unverified assumptions, missing data, held items
- **Systemic issues discovered** — patterns, missing automation, root causes
- **Follow-ups worth considering** — reported, not silently self-approved

## 15. Default principle

When uncertain, choose the action that maximizes long-term repository health,
traceability, recoverability, and consistency while minimizing unnecessary
change. Concretely: prefer the recorded decision over your fresh preference,
the shared library over a new copy, the generator over the hand edit, the
delta-scoped gate over the site-wide purge, the dated correction over the
silent rewrite, and the reported finding over the unilateral fix.
