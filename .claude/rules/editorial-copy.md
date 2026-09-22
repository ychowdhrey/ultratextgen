---
paths:
  - "**/*.html"
  - "data/library_page_specs/**"
  - "data/{em_dash_locale_policy,editorial_phrase_bank}.json"
---

# Editorial copy — what must be true of any copy you write or edit

Full standard and evidence: `docs/em-dash-policy.md`,
`docs/editorial-footprint-risk.md`, `docs/architecture/editorial-standard.md`.
For a deliberate remediation pass, use the `editorial-remediation` skill.

## Em dashes

**Forward-only for pages you leave alone; clean-on-touch for pages you edit.**

- **Never introduce an em dash** in new or changed copy on a locale whose policy in
  `data/em_dash_locale_policy.json` is `ban` (English and the thirteen en-dash
  locales) or `double-dash` (`zh-tw`, `ja`, where only the paired `——` is native).
  Never add a spaced hyphen standing in for one on an English page. `ru`, `es`,
  `pt`, `fr`, `pl`, `ro` are native and are never flagged; nine locales warn
  pending a native reader. The gate exits 1 on an introduced one **in shadow mode
  too**, and names the locale's replacement.
- **A page whose own copy a PR edits leaves with zero em dashes in every measured
  slot, cards included**, read through that page's own locale policy. "Touched"
  means the page's own copy moved — title, meta description, H1, headings, prose or
  FAQ text. A card injected by a link sync, a regenerated footer or hreflang block,
  a rebuilt directory or an asset swap is **not** a touch. Neither is a string
  added or removed verbatim on three or more changed pages (that is a template — fix
  the template) or a string whose punctuation or case alone moved.
- **An English copy edit pulls the locale siblings along.** Every sibling the PR
  does not itself copy-edit must already be clean under **its own** locale policy.
  Plan the sibling pass before opening the PR: editing one currency symbol page
  pulls 18 siblings.
- **Never "fix" an em dash by editing generated HTML.** Thousands are hardcoded in
  spec files and generator scripts, so the edit is undone by the next run. The gate
  names the upstream file when it can find it — and note there are **two** spec sets:
  `data/library_page_specs/*.json` and `data/library_page_specs/<lang>/*.json`. A
  `*.json` glob sees only the first.
- **Generated inventory is not the hub's copy.** A pre-rendered directory
  (`[data-static-directory]`) is rendered from other pages and is dropped from
  measurement; a hand edit there is overwritten by the next build.
- **Do not run a site-wide purge.** For pages you leave alone the rule is
  forward-only. A user-directed removal pass has its own method (rank by
  shared-page count, fix the template, never the prose) — see the skill.

## Replacements are structural, never synonymous

Every change is one of the listed remedies: a full stop where the second half is a
separate thought, a comma where a verdict meets its qualifier, a colon where what
follows explains what precedes. **Every word survives; only the joint moves.**

**Never swap a flagged word for a synonym.** Google's spam policy names *"automated
transformations like synonymizing"* as scaled content abuse, so trading words to
lower a score moves toward the policy, not away from it. The transformation asked
for is: generic claim → concrete information; abstract benefit → observable
behaviour; filler introduction → direct answer; template sentence →
topic-specific knowledge. **Never "humanise"** by adding randomness, slang or
deliberate imperfections — that lowers a metric and lowers the page.

**Never remove a search-protected term, a codepoint, an example or an internal link
to lower a score.** The SEO Preservation Gate blocks exactly that, and it has
blocked its own author here.

## Do not paste a sentence between page specs

Page copy is hand-written once per spec. `npm run check:spec-sentence-reuse` fails
any spec a PR adds or changes that copies a sentence three or more other specs
already carry. It keys on the **sentence**, never on `(field, sentence)` — a tagline
pasted into `intro` is the same reused line. The fix is a sentence about *this* page
— what the symbol is for, where it breaks, what it is confused with. A line that
genuinely must be shared belongs in the generator default, where it is one string
with one owner.

## CTA cards are routed by a generator, not by hand

**Never hand-edit a CTA card to change where it points.** Change
`scripts/lib/cta_routing.py` and run `npm run route:cta-cards -- --write` — the page
generator reads the same table, so a hand edit drifts the moment the page is
regenerated.

**Never route a locale page's CTA card to an English tool, and do not "finish" the
routing by extending it to `<lang>/` pages.** No locale build of any destination
tool exists, and the locale homepage already *is* that locale's generator. `route()`
returns `None` for every locale path on purpose and a test asserts it.

Note `/` and `/<locale>/` **are** the font generator, so a card pointing there is a
real tool, not a dead end. The defect is narrower: a page whose reader has a
*different* next job being sent to the generator anyway.

## Phrase bank

**Never add an entry to `data/editorial_phrase_bank.json` unilaterally**, and never
to make a page pass. Every entry carries its measured corpus frequency; an entry
with no corpus evidence is a forward-looking guard and must say so.
