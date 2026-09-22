---
paths:
  - "styles.js"
  - "renderer.js"
  - "fonts.json"
---

# The Unicode style registry

Full shape, the five live `type` values with counts, and the 2026-08-11 correction
that this document once described the registry wrongly:
`docs/architecture/unicode-style-registry.md`.

**To add a style, use the `add-unicode-style` skill** — it carries the ordered
procedure and the verification command.

## The invariants

- `upper`/`lower`/`nums` are read **positionally**, not looked up by letter.
  `upperArr[0]` is `A`. They are a **positional string** or a real JS **array** —
  never an object keyed by letter.
- Supply **exactly** 26 uppercase, 26 lowercase and 10 digits, **in order**.
- **A letter with no Unicode equivalent still occupies its slot** — repeat the
  plain character. Omitting one shifts every later letter by a position, so a style
  missing `I` silently renders `J` for `I` all the way to `Z`. Only a *trailing*
  omission is harmless.
- Use an **array** when a single "letter" is more than one codepoint. A positional
  string would split it mid-glyph.
- `renderMap` validates 26/26/10 but only warns behind `window.UTG_DEBUG`, so a bad
  map is **silent in production**. Never count characters by hand: several styles
  store wrapped forms (`⦅❨A❩⦆`, `→A←`, `[A]`, `‹A›`, `‖A‖`, `|A|`) that
  `mapToArray()` parses with dedicated regexes, so a naive `Array.from(...).length`
  reports well-formed styles as broken. Drive the check through `renderAny` — the
  skill has the command.
- `window.UltraTextGenRender.renderAny(text, style)` takes **two** arguments and the
  second is the resolved **style object**, not a key, and is not followed by an
  options bag.
- Dispatch is on `style.type`. `function` is checked before the switch; everything
  else falls through a switch whose `default` is `renderMap`. `transform` is a
  *field*, not a type.
- `renderer.js` has a `case 'pattern'` that **no style currently uses** — supported,
  unused. Do not assume it is dead without checking; do not assume it is reachable.
