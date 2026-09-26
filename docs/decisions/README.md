# Recorded decisions

Decisions a later session would otherwise re-litigate: owner calls, ratified
exceptions, and positions that look like defects to a well-meaning audit.

| File | Holds |
|---|---|
| [`content-lanes.md`](./content-lanes.md) | content and product decisions: the `updates/` scope, titles that outlive a status, heading skips, printables CTAs, the image-generation boundary, flair scope, the zalgo comparison table, `answers/` homepage links |
| [`local-only-locale-exceptions.md`](./local-only-locale-exceptions.md) | every page ratified as needing no English parent, with its evidence, plus several superseded entries (marked in place, not moved to one section) and one counter-example |
| [`printables-scope.md`](./printables-scope.md) | the typography-native boundary and the word-search decision |

A decision recorded here is not a decision executed. Where a decision required a
change, link the commit or PR that made it, or mark it as not yet executed.

**Where a decision belongs**

- An invariant it produces → `.claude/rules/`, stated as current truth.
- Machine-readable state a gate reads → the matching `data/*.json` ledger
  (`.claude/rules/ledgers.md`), never in prose alone.
- A future-dated evaluation → the operating review register, with its baseline,
  measurement method, decision rule and a scheduled reminder. Nothing deferred to
  "check later" may live only in chat.
- The reasoning and evidence → here.

**Mark revisions; never silently rewrite a verdict.** When later evidence reverses an
earlier decision, add a dated "Superseded by …" note in place rather than editing the
history away. A future session must be able to tell a deliberate reversal from an
oversight.
