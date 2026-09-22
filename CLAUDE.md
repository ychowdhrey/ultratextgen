# CLAUDE.md — UltraTextGen

Read this file, then find the scoped rules for the area you are touching. This holds
only what is true for almost every session; **the detail is deliberately one layer
down** — see "Where the rest of the knowledge lives".

## What this is

**UltraTextGen** is a fast, zero-framework text-expression tool. Its core converts
plain text into stylized Unicode that works across social platforms (LinkedIn,
Instagram, Discord, …). It has a second output mode: **in-browser visual and
printable asset generation** — printable bubble/cursive/block practice and coloring
sheets, name puzzles, word searches, and the curved/arc text tool — rendered
client-side as SVG/PNG that users copy, download or print.

Copy-paste Unicode is the front door and satisfies the job fastest. Visual assets are
the on-brand, higher-intent **follow-up** for jobs plain characters cannot do (trace,
color, print, logo art) — added where real demand exists, never as a default.

**Core philosophy: Fast > Fancy, Clean > Clever, Useful > Impressive.**

This repository is also a long-lived operational system worked by many sessions in
parallel. `data/*.json` ledgers are machine-read state behind CI gates, `docs/` is the
reasoning of record, and most defects this repo has shipped came from acting on a
stale premise rather than from writing bad code.

---

## Hard lines

These hold everywhere, in every file, for every task.

1. **No frontend framework, no bundler, no browser-runtime npm package.** Vanilla
   HTML/CSS/ES6+ only; native Web APIs only.
2. **Client-side only for visual output.** Visual and printable generation is native
   SVG/Canvas in the browser → SVG/PNG. Never a server-side renderer, never an
   image-processing library, never a `.ttf`/`.otf` binary bundled to feed a renderer.
   *(A `.woff2` the browser downloads to set text in is webfont delivery, not image
   generation, and is allowed — the site self-hosts its letterform families.)*
3. **Never hand-edit a generated file or a generated region.** Find its generator.
   `sitemap.xml`, `llms.txt`, library hub directories, the static footer, hreflang
   blocks, the `@font-face` block, CTA cards, page art and the gate inventory in
   `docs/README.md` are all generated. The map is
   `.claude/rules/generated-artifacts.md`.
4. **Never add or edit a `data/` ledger entry unilaterally, and never to make a gate
   pass.** Every entry is a decision discussed with the user. If a gate flags
   something, fix the thing or raise the divergence.
5. **One query, one page.** Before creating any page, check whether an existing page
   in the same locale — including that locale's hub or homepage — already targets and
   ranks for the term. Volume alone is never justification.
6. **Every non-English page needs a live English parent.** A local-only page is a
   discussed, explicit exception recorded in a ledger, never a default.
7. **Verify absence before asserting it.** "X doesn't exist yet" needs an alias sweep
   and a look in other lanes, never one exact grep. A pass once planned five pieces of
   work and found four had already shipped.
8. **A check that reports nothing is indistinguishable from a check that passes.**
   This is the repo's most-repeated failure, in six recorded forms. Adding a validator
   is not the same as gating on it: run a new check against a deliberately broken
   input and watch it go red. And **never read an exit status through a pipe** —
   `$?` after `| head` or `| grep` is the pager's status.
9. **Nothing in this repository may point at a source outside it.** No other
   repository by name, no unpublished doc path or filename, no unpublished tooling.
   `npm run check:external-refs` gates every tracked file. A public tree carries the
   substance — the figure, the finding, the decision — never a pointer a reader cannot
   follow.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JS (ES6+), IIFE modules, no ES modules |
| Build tools | Node.js and Python — generators and validators only |
| CI/CD | GitHub Actions (`validate.yml` is the gate job) |
| Hosting | Cloudflare Pages — static assets + one `functions/` middleware on `/` |
| Analytics | Google Tag Manager (GTM-P55HXK8Q); ads are AdSense Auto Ads |

---

## Repository orientation

Content lanes are namespaces encoding a page's type, schema and workflow: `library/`
(collections) · `symbol/` (single items) · `category/` (style generators) · `usecase/` ·
`guide/` (articles) · `answers/` (one-question pages) · `updates/` (dated external
changes) · `printables/` · `events/` · `learn/` · platform directories (`discord/`,
`instagram/`, …) · 30 locale directories (`de/`, `ja/`, `zh-tw/`, …).

Front-end runtime is at the root (`script.js`, `styles.js`, `renderer.js`,
`header.js`, `symbol-explorer.js`, `style.css`) plus feature modules under `js/`;
generators and validators in `scripts/` with shared logic in `scripts/lib/`;
machine-read state in `data/`.

**`docs/README.md` is the lane and ownership map** — for any lane it names the
governing workflow, source of record, generator, validator and maturity. Read it
before building in a lane you have not worked in. Do not trust remembered file sizes
or page counts: measure them. This file's predecessor carried line counts that were
wrong by up to 16×.

---

## Build and validation

```bash
npm install          # build-time deps only (cheerio, glob)
npx serve .          # no build step; or open index.html directly
npm run prebuild     # regenerate sitemap.xml
npm run build        # copy index.html -> _root.html (no other build step)
```

**The one command that matters before opening a PR:**

```bash
npm run check:ci-gates       # runs exactly the gates CI gates on
```

It parses `validate.yml` and runs the steps the final "fail the job" expression names,
with CI's own merge base. **Never assemble the gate list by hand** — a list written out
in prose has drifted twice, and one such sweep passed locally while CI was red on a
gate the prose had never named. The generated inventory is in `docs/README.md`.

`npm run check:pr-overlap` names other PRs touching your files;
`npm run audit:claude-context` reports this file's budget and rule scoping.

Two local-run traps: several `check:*` scripts diff `merge-base..HEAD`, so
**uncommitted work is invisible to them** — commit first, or you get a false green. And
sessions work a **shallow clone**, so `git log -S` bottoms out at the graft and names
the wrong commit; `git fetch --deepen=<n>` before trusting any first-add date.

---

## Git and shipping

- **Conventional commits** (`feat:`, `fix:`, `chore:`, `UX:`), `[skip ci]` on
  auto-generated commits.
- **All changes go through a pull request**; direct pushes to `master` are avoided.
- AI branch naming: `claude/<description>-<session-id>`.
- **"Shipped" means merged to `master` through a PR — nothing else.** A commit pushed
  to a branch is not shipped, and a commit pushed to a branch whose PR **already
  merged** is invisible: no open PR tracks it and it will never reach master. Before
  recording anything as shipped, confirm the PR shows merged or that
  `git branch -r --contains <commit>` includes `origin/master`. This repo has lost work
  that way at least five times, for between 4 hours and 2 months.
- **Before a translation batch or a shared-module rewrite, find out who else is in
  there.** Git's conflict detection is textual and per-hunk, so two locale slugs for
  one English parent merge clean, and one module refactored twice on the same day by
  two sessions merges clean too. Both have happened. Run `npm run check:pr-overlap`,
  and after every merge of main check that no two pages in one locale declare the same
  `hreflang="en"` parent. Details: `docs/architecture/parallel-sessions.md`.
- **Governance arriving mid-flight binds unshipped work.** When merging main brings in
  a new gate or registry, it applies to everything the branch has built but not yet
  merged. Re-run the gates after every merge.

---

## Discovery, in one paragraph

The site is not built around one algorithm. Google matters and is served well — it is
**one distribution surface, not the operating system.** A page or asset needs a
defensible reason to exist even if Google never sends it a visitor: real utility, a
share/print/embed path, or reference value a person or an AI would cite. "A keyword
exists" is not that reason. And **machine legibility is a distribution feature, not
hygiene** — several search and AI crawlers execute no JavaScript, so a page's payload
belongs in static HTML.

---

## Where the rest of the knowledge lives

Four layers. Put new knowledge in the one that matches, and **do not grow this file**:
its budget is ~250 lines, and crossing it means something belongs one layer down.

### 1. `.claude/rules/` — invariants, loaded when you touch matching files

Each file carries a `paths:` glob list and states *what must remain true here*. A rule
without `paths` would load every session, so every rule has one.

| Rule | Applies when you touch |
|---|---|
| `content-architecture.md` | any content lane — lane selection, hub-vs-spoke, keyword ownership, hub registration |
| `localization.md` | a locale directory, `locales/`, `i18n.js`, a locale ledger or a locale script |
| `html-pages.md` | any `.html` — required head/script furniture, FAQ schema, art, pre-rendered payloads |
| `accessibility.md` | any `.html` — the eleven blocking classes |
| `editorial-copy.md` | any `.html` or page spec — em dashes, replacement rules, spec sentence reuse, CTA cards |
| `editorial-footprint.md` | `guide/`, `updates/`, `answers/` or an EFR ledger |
| `source-attribution.md` | a page that cites an external source, or a source ledger |
| `css.md` | any `.css` |
| `frontend-javascript.md` | any root or `js/` script |
| `unicode-style-registry.md` | `styles.js` or `renderer.js` |
| `copy-share-analytics.md` | the share/saved modules, `script.js`, `header.js`, `symbol-explorer.js`, `locales/` |
| `printables.md` | `printables/`, a locale printables directory, or `js/printables/` |
| `fonts.md` | `assets/fonts/`, any `.css`, or a font script |
| `ads-and-monetization.md` | `header.js`, `script.js`, `functions/`, `404.html`, an embed source |
| `discovery-and-routing.md` | `_redirects`, `_routes.json`, `robots.txt`, `sitemap.xml`, `llms.txt`, `functions/` |
| `generated-artifacts.md` | a generated file — the file → generator map |
| `ledgers.md` | anything in `data/` |
| `tooling-and-gates.md` | `scripts/`, `.github/workflows/`, any test file |
| `pinterest.md` | a Pinterest script, inventory CSV or asset directory |

### 2. `.claude/skills/` — ordered procedures

`steward` (how this repo expects changes to be made) · `ship-page` · `locale-batch` ·
`add-unicode-style` · `page-art` · `printables-surface` · `editorial-remediation` ·
`build-a-gate`. Invoke the skill rather than reconstructing its order — **most of what
this repo has got wrong was one of these workflows run out of order or with a step
skipped.**

### 3. `docs/` — evidence, and the reasoning of record

- **`docs/README.md`** — the lane and ownership map, the generated gate inventory, the
  weekly infrastructure review.
- **`docs/architecture/`** — mechanism, measurements and incident history per
  subsystem. Its `README.md` maps each rule to the doc behind it. Start at
  `docs/architecture/claude-context-architecture.md` if you are deciding where a new
  piece of knowledge belongs.
- **`docs/decisions/`** — recorded owner decisions and ratified exceptions: the ones
  most likely to be "fixed" by a well-meaning audit.
- The topic docs at `docs/` root remain the deep reference for their subject
  (`source-attribution.md`, `em-dash-policy.md`, `efr-quality-gate.md`,
  `locale-parent-governance.md`, `llms-txt.md`, `unicode-library-workflow.md`, …).

**A decision recorded is not a decision executed** — link the commit or PR, or mark it
as not yet executed. And **mark revisions**: when later evidence reverses an earlier
conclusion, add a dated note in place rather than editing the history away, so a future
session can tell a deliberate reversal from an oversight.

### 4. Hooks and settings

`.claude/settings.json` registers a Stop hook warning when a session ends with commits
nothing tracks. Advisory by design: a coordination reminder that can block a session is
one people disable.

---

## Adding to this system

Ask in order; stop at the first yes.

1. Would a session doing unrelated work need this? → here, and only then.
2. Is it a multi-step procedure? → a skill. Extend one before adding one.
3. Must it stay true, but only for some files? → a rule, with the narrowest honest
   `paths`. State the invariant; leave the history out.
4. Does it explain why, what was measured, what failed, or what was decided? →
   `docs/`, linked from the rule that depends on it.
5. Does something else already own the fact? → point at that owner; do not keep a
   second copy.

Full contract, and how this file's 5,581-line predecessor grew:
`docs/architecture/claude-context-architecture.md`.
