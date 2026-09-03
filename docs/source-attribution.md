# Source attribution — how a page shows its evidence

**Status:** standard of record, 2026-09-03 (user-directed). Governs every
page in this repo that states a fact it did not originate.

Before this document there was no standard. Sources had no CSS class of their
own, no markup convention, no rule in `CLAUDE.md`, no mention in the
tone-of-voice standard, and no check. What existed was a habit that had held
up remarkably well on one pillar and nowhere else.

---

## 1. What was actually there

Measured 2026-09-03, before any change:

| | |
|---|---|
| Pages carrying a genuine external citation | 100 |
| ...presenting it in a Sources block | **67** — every `/updates/` entry but one |
| ...with no attribution surface at all | **33** |
| Citations inside those 67 blocks | 207 of 207 — **100%** |
| Distinct markup shapes across the 67 | 1 |
| CSS rules targeting a Sources block | 0 |

The convention was real and unwritten: one `<section class="editorial-section">`,
an `article-section-label` reading Sources, one prose paragraph, positioned
immediately before the FAQ, every link `rel="nofollow noopener" target="_blank"`.
It survived 68 entries in 18 languages because each pass copied the last one.

It did not survive contact with any other pillar. `guide/unicode-symbol-approval-process`
is an article about the Unicode process citing `unicode.org` twice with nothing
that says so; `symbol/calendar-emoji` rests its whole story on an Apple press
release linked once, mid-sentence. **An undocumented convention has no failure
mode, only a drift** — nothing was watching because nothing could.

Three defects it had already produced:

* `vi/updates/lien-quan-khoa-doi-ten` had no Sources block while its EN parent
  cited Garena's patch notes — the omission landing on the one locale whose
  readers play the game.
* `ja` labelled the section 情報源 on one entry and 出典 on another; `th` split
  แหล่งข้อมูล / แหล่งอ้างอิง. Two words for one section, in two locales, with
  nothing comparing them. Same shape as the Swedish `kontrollerat` /
  `kontrollerad` near-miss `CLAUDE.md` records.
* Every citation was `nofollow`, which told search engines the Unicode
  Consortium's own pipeline page was as trustworthy as a forum post.

---

## 2. The distinction the whole standard turns on

**A citation is evidence. A resource link is a destination.** They look
identical in HTML and they are not the same thing:

| | Citation | Resource link |
|---|---|---|
| What it does | Backs a fact the page asserts and did not originate | Sends the reader somewhere to act |
| Example | "commissioned from **Grilli Type**" | "**Install Poppins** for free" |
| Belongs | In the Sources block | Inline, in the sentence that sends them |
| Ledger | — | `data/source_resource_links.json` |

Getting this wrong is not academic. The first pass at this standard counted
every external link as a citation and concluded that 33 pages were citing
without a block. Six of them were not citing at all: `answers/what-font-does-snapchat-use`
links Google Fonts three times, every one of them "here is the free substitute,
go install it." Forcing those into a Sources block would have moved a useful
link away from the sentence that needed it and called the result rigour.

The same domain can be either, depending on the page — `xbox.com` is a
destination on `answers/how-to-change-minecraft-username` ("go to xbox.com and
sign in") and would be a citation on a page asserting a gamertag rule. That is
why the ledger is keyed by **route and domain**, never by domain alone.

---

## 3. The rules

1. **A page that asserts a sourced fact carries a Sources block, and every
   citation on the page appears in it.** Not a new demand: all 207 citations on
   `/updates/` already satisfied it.
2. **The block is a `.source-note` panel**, labelled with that locale's own
   word from the registry in `scripts/lib/source-attribution.js`, positioned
   immediately before the FAQ.
3. **It is prose, not a bibliography.** A list says a source exists; a sentence
   says *which claim it backs*. "Release date and repertoire stability come from
   Unicode 18.0.0" is the part a reader and an answer engine can use — and it
   is the site's existing strength, not something this standard invented.
4. **`rel` follows the cited domain's authority tier**, from
   `data/source_authority.json` — never a per-page choice.
5. **The block's citations are projected into the page's JSON-LD** as
   schema.org `citation`, generated from the block, never authored twice.
6. **A resource link stays inline** and is ledgered per route.

### 3.1 Why primary sources are followed

Google reserves `nofollow` for paid and untrusted links. A followed link to the
body that owns the fact is the case the attribute explicitly is *not* for, and
citing an authority is a positive E-E-A-T signal, not a leak.

* **`primary`** — the organisation that owns the fact: a standards body, the
  central bank that designed the symbol, the platform's own changelog, the
  issue tracker the request lives in. → `rel="noopener"`.
* **`secondary`** — press, third-party reference works, and user-generated
  community threads. → `rel="nofollow noopener"`.

`devforum.roblox.com` is Roblox-operated and still **secondary**: forum posts
are user-generated, whatever the domain. `emojipedia.org` is authoritative in
practice and still secondary, because Unicode is the source of the facts it
reports. **An unlisted domain is treated as secondary and reported** — a source
nobody has classified fails safe rather than silently earning a followed link.

### 3.2 Why prose, and why that is not laziness

A structured list was considered and rejected. It scans faster and it throws
away the mapping between claim and source, which is the only part that is hard
to reconstruct. The prose form also degrades gracefully: eight citations in one
paragraph (the Omani rial entry) is the current worst case and still reads.
If a page ever needs materially more, revisit this rather than letting a
paragraph become a wall.

---

## 4. The design

The block was rendering through `.editorial-block` — **the same shell as every
content section on the page**, so a paragraph of pure apparatus carried exactly
the weight of the answer the reader came for.

`.source-note` (in `style.css`, at the end, under its own banner) makes it
recessive without making it hard to find:

* a 3px `--accent-purple` rule on the reading edge, picking up the identity the
  section label already carries;
* `--bg-white` panel (`--bg-base` in dark mode) with a hairline border, so it
  reads as a distinct object rather than more page;
* 0.875rem in `--text-secondary`, one step down from body copy;
* an outbound `↗` on every external link, so the reader knows the click leaves
  the site.

Three details that are load-bearing:

* **The arrow is a CSS pseudo-element, never markup.** The locale-translation
  and em-dash gates read strings extracted from the HTML; a glyph in the markup
  would show up in both as content nobody wrote.
* **RTL flips the rule and the arrow.** On `ar` the accent belongs on the
  reading edge and the arrow has to point away from the text (`↖`), not into it.
* **Print reveals the URL.** `content: " (" attr(href) ")"` — on paper a
  citation whose target you cannot see is not a citation.

---

## 5. Tooling

| Command | Role |
|---|---|
| `npm run audit:source-attribution` | Whole-site dashboard. **Informational, never gating.** |
| `npm run check:source-attribution` | **Diff-scoped gate**, wired into `validate.yml`. |
| `npm run fix:source-attribution` | The repair pass. `--write` applies; idempotent. |

All three share `scripts/lib/source-attribution.js`, so the audit, the gate and
the fixer can never disagree about what a Sources block is.

**The fixer will not create a block on a page that lacks one.** The block's
content is a sentence about what each source establishes, and that has to be
written, in the page's own language, by someone who knows what the page claims.
Generating `Sources: <list of links>` would satisfy the gate and defeat the
standard, so the gate names such a page and stops.

### Errors vs warnings

**Error** — a citation with no block; a citation stranded outside it; a wrong
`rel`; a block that is not a `.source-note`; JSON-LD citations that disagree
with the block. Each is a defect a reader or a crawler can observe.

**Warning** — a legacy-but-recognised locale label; an unclassified domain.
Neither is wrong on the page; both are decisions somebody still owes. Failing a
PR for them would push the author to edit a ledger to go green, which is the
one thing every ledger in this repo forbids.

---

## 6. Ledgers

* **`data/source_authority.json`** — domain → tier. Adding a domain as
  `primary` is a claim that it *owns the fact being cited*, not that it is
  reputable.
* **`data/source_resource_links.json`** — route → domains that are destinations
  on that page.

Same bar as `data/translation_parity_exceptions.json` and every other ledger
here: entries are discussed decisions with a reason and a date, **never added to
make a page pass**. If a link is really backing a claim, the fix is to write the
Sources block.

---

## 7. Verified against deliberately broken inputs

Per `CLAUDE.md`'s own rule — *adding a validator script is not the same as
gating on it* — the gate was run against five differently-shaped defects plus
a control, so it could not be tuned to one bug. Each probe was committed
(the gate diffs `merge-base..HEAD`, so **uncommitted work is invisible to it**)
and reverted after:

| # | Probe | Result |
|---|---|---|
| 1 | A citation added to a page with no Sources block | **exit 1** — "cites 1 external source(s) but has no Sources block" |
| 2 | A cited URL present on the page but absent from the block | **exit 1** — names the URL |
| 3 | `rel="nofollow"` restored on a `unicode.org` citation | **exit 1** — "should carry rel=\"noopener\" (primary source)" |
| 4 | `.source-note` reverted to `.editorial-block` | **exit 1** — "not marked up as a .source-note panel" |
| 5 | One JSON-LD `citation` entry deleted, block unchanged | **exit 1** — "does not match the Sources block (7 vs 8)" |
| 6 | An **unclassified** domain cited inside the block | **exit 0 with a warning** — the error/warning split holds |

**Two things this exercise caught that reasoning had not.**

*The negative control found a design bug, before any probe ran.* The first
draft required every citation **tag** to sit inside the block. Run against the
26 backfilled pages it failed all of them, because those pages name the source
inside the very sentence it backs — "Per the official Roblox Developer Forum,
those icons live in..." — which is good writing and what §2.7 of the
tone-of-voice standard asks for elsewhere. Satisfying that draft would have
meant stripping a useful inline link from 26 pages. The rule is now the one
this document always stated: every cited URL **appears in** the block, which is
the complete account, not the exclusive home.

*A probe that edits nothing reports success.* Probe 3's first run used a
malformed `sed`, changed no bytes, committed nothing, and the gate duly exited
0 — a **false green** that looked exactly like a pass. Worse, the cleanup
`git reset --hard HEAD~1` then ran anyway and rolled back a real commit, so the
two probes after it silently tested an older version of the checker. The runner
now aborts unless `git diff` shows the probe actually changed something, and
resets to a captured SHA rather than to `HEAD~1`. If you repeat these, keep
both guards: *a check that reports nothing is indistinguishable from a check
that passes* applies to the probes as much as to the gates.

---

## 8. What this does not cover

* **Internal links.** Tone-of-voice §2.7 owns those: every named thing with a
  page on this site gets linked at first mention, most specific target first.
  The Sources block is for external evidence only.
* **Whether a claim needs a source at all.** That is editorial judgment and
  stays with the tone-of-voice standard's certainty rules (§2.1, §3). This
  standard governs how a source is *presented* once a page relies on one.
* **Link rot.** Nothing here re-checks that a cited URL still resolves. The
  `updates/` verification pill covers whether the *fact* was re-checked; a
  dead-link sweep is a separate instrument that does not exist yet.
