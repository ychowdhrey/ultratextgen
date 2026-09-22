# The Unicode style registry

Invariants: `.claude/rules/unicode-style-registry.md`. Procedure:
the `add-unicode-style` skill.

## Shape

`window.textStyles` in `styles.js`. A `map` style:

```js
{
  // POSITIONAL STRING, not an object keyed by letter. Index 0 = A, 25 = Z.
  upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
  lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
  nums:  '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
  type: 'map',
  category: 'bold',
  familySlug: 'bold-fonts',   // string OR array of strings
  groupSlug: 'bold',
  slug: 'bold',
  platforms: [ … ]
}
```

`upper`/`lower`/`nums` may **also** be a real JS **array**, and one style requires
it: `Ultra Regional Indicator`, whose "letters" are two codepoints each (regional
indicator + U+2060 word joiner) and would be torn apart by the positional string
reader. `mapToArray()` in `renderer.js` accepts either form — `Array.isArray` →
returned as-is; string → parsed positionally, with special-case parsers for wrapped
forms like `⦅❨A❩⦆` and `→A←`.

Non-`map` types carry different fields instead of `upper`/`lower`/`nums`:
`procedureId` (procedure), `decoratorId` (decorator), `transform` (function),
`redactChar`/`redactMode` (redact); plus optional `note` and `accentSafe`.

## Dispatch

`renderAny(text, style)` takes **two** arguments and the second is the resolved
**style object**, not a key, and is not followed by an options bag. Every call site
passes `styles[styleKey]`.

`function` is checked **before** the switch (`style.type === 'function' &&
style.transform`); everything else falls through a `switch` whose `default` is
`renderMap`. The five values in live use, with counts as of 2026-08-11 and
**re-verified 2026-09-22** at 114 styles total:

| `type` | count | meaning |
|---|---|---|
| `map` | 50 | positional Unicode substitution via `renderMap` |
| `procedure` | 30 | named algorithm by `procedureId` — where zalgo, gal-moji, cuping and similar transforms live |
| `decorator` | 15 | named decorator by `decoratorId` |
| `function` | 11 | `transform` fn; today the upside-down family |
| `redact` | 8 | `redactChar`/`redactMode` |

`renderer.js` also has a `case 'pattern'` calling `renderPattern`, but **no style
currently uses it** — supported, unused. Do not assume it is dead without checking;
do not assume it is reachable either.

## The 2026-08-11 correction

The predecessor document described `upper` as an object map (`{ A: '𝗔', … }`) and
`type` as `'map' | 'zalgo' | 'upside-down' | 'transform'`. **Neither matched the
code**, and the drift was live long enough to mislead: a pass reading it wrote
`style.upper['A']` against a string, silently got `undefined` for all 26 letters, and
fell back to plain ASCII with no error.

Zero styles have ever used a type named `zalgo`, `upside-down` or `transform` —
`transform` is a *field*, not a type.

## Why the length check goes through `renderAny`

`renderMap` validates 26/26/10 but only warns behind `window.UTG_DEBUG`, so a bad map
is **silent in production**. Several styles store wrapped forms (`⦅❨A❩⦆`, `→A←`,
`[A]`, `‹A›`, `‖A‖`, `|A|`) that `mapToArray()` parses with dedicated regexes, so a
naive `Array.from(...).length` reports **8 well-formed styles as broken**.

`mapToArray` is not exported, which is exactly why the check drives through
`renderAny` instead of reimplementing the parsing — a second copy of that logic would
drift from the first, the failure this whole page documents. The command is in the
`add-unicode-style` skill. Verified 2026-08-11 and again 2026-09-22: all 50 `map`
styles pass.
