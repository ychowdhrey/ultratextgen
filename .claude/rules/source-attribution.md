---
paths:
  - "{updates,guide,answers}/**"
  - "*/{updates,guide,answers}/**"
  - "data/source_*.json"
  - "scripts/**/*source-attribution*"
---

# Source attribution

The full standard, the CSS design, the RTL/print behaviour and the probes:
`docs/source-attribution.md`.

## A citation is evidence; a resource link is a destination

They are identical in HTML and are not the same thing. *"commissioned from **Grilli
Type**"* backs a claim and belongs in the Sources block; *"**Install Poppins** for
free"* sends the reader somewhere and belongs inline in the sentence that sends
them. The same domain is a citation on one page and a destination on another, which
is why `data/source_resource_links.json` is keyed by **route and domain**, never by
domain alone.

## The rules

A page asserting a sourced fact carries **one** `.source-note` Sources block,
labelled in that locale's own word, immediately before the FAQ, holding **every**
citation on the page. It is **prose, not a bibliography** — a list says a source
exists, a sentence says which claim it backs.

Each citation's `rel` comes from the cited domain's tier in
`data/source_authority.json`:

- **primary** — a standards body, the central bank that designed the symbol, the
  platform's own changelog, the issue tracker the request lives in → `rel="noopener"`,
  i.e. **followed**. Google reserves `nofollow` for paid and untrusted links.
- **secondary** — press, third-party reference works, user-generated threads →
  `rel="nofollow"`. A forum post is user-generated whatever the domain, including a
  platform-operated forum.
- **An unlisted domain is treated as secondary and reported**, so an unclassified
  source fails safe.

The block's citations are projected into the page's JSON-LD as schema.org
`citation`, **generated from the block** so the two cannot drift — never hand-write
that array and never hand-edit a Sources block's JSON-LD.

`npm run check:source-attribution` gates every page a PR touches;
`npm run fix:source-attribution -- --write` fixes the mechanical half (panel class,
`rel`/`target`, legacy label, JSON-LD projection). **The fixer will not create a
block on a page that lacks one**, and that refusal is the point: the block's content
is a sentence about what each source establishes, in the page's own language.
Generating `Sources: <list of links>` would satisfy the gate and defeat the standard.

## Link rot is a separate instrument and never gates

**A failed fetch is not a dead link.** A live primary source behind bot protection
and a host that does not exist look identical in a single request — one central
bank's own page answers 503 to an unauthenticated bot, and a platform help article
returned 404 once and 403 three times on the same day. `npm run audit:link-rot`
classifies by cause, never counts `blocked`, and reports rot only after **3
consecutive** failing runs. **Do not add a `check-link-rot` gate** — it depends on
the public internet and on hosts that rate-limit, so it would be red for reasons no
PR author can fix.

**Do not hand-edit `data/source_link_health.json`** — a hand-set `lastGood` is a
claim nobody checked.

The `updates/` verification pill asks a different question (is the *fact* still
true?) from link rot (does the *URL* still load?). See `.claude/rules/html-pages.md`.
