# How Claude's context is organised in this repository

`CLAUDE.md` reached **5,581 lines** by 2026-09-21. It had become the repository's
history book: global instructions, path-specific conventions, ordered procedures,
subsystem encyclopaedia, incident narratives, measurements, and owner decisions, all
in one file loaded in full at the start of every session — a documentation-only
change and a locale batch received identical context, and neither received it in a
form that made the relevant part findable.

None of that material was wrong. It was in the wrong **primitive**.

## The four layers

| Layer | Contains | When Claude receives it |
|---|---|---|
| **`CLAUDE.md`** (root) | only what is true for almost every session: identity, the hard lines, the canonical commands, the git contract, and how to find the rest | every session, in full |
| **`.claude/rules/*.md`** | invariants scoped to a domain or path set — *what must remain true here* | on demand, when Claude reads a file matching the rule's `paths` |
| **`.claude/skills/*/SKILL.md`** | ordered procedures — *how to do this job correctly* | when invoked, or when the model judges the skill relevant |
| **`docs/`** | evidence: mechanism reference, measurements, incidents, and recorded decisions — *why this rule exists and what happened* | only when read |

The mechanism for layer 2 is Claude Code's `.claude/rules/` directory with a
`paths:` glob list in YAML frontmatter. Two properties of it decide the design:

- **A rule file with no `paths` field loads at launch**, with the same priority as
  `CLAUDE.md`. So a rule without `paths` is not a scoped rule — it is more root
  context wearing a different filename. **Every rule in this directory must carry a
  `paths` list.**
- **A path-scoped rule triggers when Claude reads a matching file**, not on every
  tool use. Scope therefore has a real cost and a real benefit, and the benefit is
  only collected if the scope is honest.

## Where a new piece of knowledge goes

Ask the questions in this order and stop at the first yes.

1. **Would a session doing unrelated work still need this?**
   → root `CLAUDE.md`. The bar is deliberately high: "useful" is not "universal".
   Claude can read the repository; root context is for what it cannot derive.
2. **Is it a multi-step procedure — an order of operations, a command sequence, a
   checklist?**
   → a skill. Extend an existing one before adding a new one.
3. **Does it state something that must remain true, but only for some files?**
   → a rule under `.claude/rules/`, with the **narrowest** `paths` that still
   catches every file it governs. State the current invariant; put the history in
   `docs/`.
4. **Is its purpose to explain why, what was measured, what failed, or what was
   decided?**
   → `docs/`. Link it from the rule that depends on it.
5. **Does something else already own this fact?**
   → point at that owner. Do not maintain a second copy. The strongest owners here
   are the generated gate inventory in `docs/README.md`, `package.json`'s scripts,
   the `data/*.json` ledgers, `assets/fonts/manifest.json`, `_redirects`'s own
   header, and `.gitignore`'s own notes.

## How this file's predecessor grew, so it is not repeated

The growth mechanism was visible in the git log: nearly every substantial change
shipped a `docs: record …` commit appending a new narrative section to `CLAUDE.md`.
Each was a good instinct — write down what was learned — aimed at the wrong file.

Three habits keep it from returning:

- **Record the invariant in the rule and the evidence in the doc, in the same
  change.** A rule that grows a case study is a rule drifting back into a history
  book. Dates, incident names and "this was broken for a month" belong in `docs/`
  unless the history itself changes how Claude must act.
- **Root `CLAUDE.md` has a size budget of roughly 250 lines.** Crossing it is a
  signal that something in it belongs one layer down, not that the budget is wrong.
  `npm run audit:claude-context` reports the budget and checks that every rule
  carries a `paths` list. It is informational by design — see
  `docs/architecture/validation-system.md` on why a check with a real backlog
  informs rather than gates.
- **A correction edits the claim, it does not append to it.** The predecessor
  carried several sections whose opening paragraph was superseded by a correction
  three paragraphs later, which is only safe for a reader who reads to the end.
  Rules state current truth; superseded readings live in `docs/` under a dated
  heading that says so.

## Reading order for a new contributor

`CLAUDE.md` → `docs/README.md` (the lane and ownership map) →
`docs/architecture/README.md` (what each reference doc covers) → the rule for the
area you are touching. The rules are also self-describing: each opens with the
reference docs behind it.
