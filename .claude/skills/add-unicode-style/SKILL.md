---
name: add-unicode-style
description: >-
  Add, edit or verify a Unicode text style in UltraTextGen's `styles.js` registry.
  Use this whenever the task is "add a <name> font style", "the X style renders
  wrong", "add these characters as a style", or any change to `window.textStyles`
  or `renderer.js`'s dispatch. The registry is read POSITIONALLY, validation only
  warns behind a debug flag, and eight styles store wrapped forms that a naive
  character count reports as broken — so a hand-checked style ships silently
  wrong. This skill is the ordered procedure and the verification command.
---

# Add a Unicode style

Invariants: `.claude/rules/unicode-style-registry.md`. Shape reference and the
2026-08-11 correction: `docs/architecture/unicode-style-registry.md`.

## 1. Decide whether it is a `map` at all

Five `type` values are in live use. Only `map` is a character substitution:

- **`map`** — positional Unicode substitution. Everything below applies.
- **`procedure`** — a named algorithm by `procedureId` (zalgo, gal-moji, cuping).
- **`decorator`** — a named decorator by `decoratorId`.
- **`function`** — a `transform` fn (today, the upside-down family).
- **`redact`** — `redactChar`/`redactMode`.

`transform` is a **field**, not a type. There is no `zalgo` or `upside-down` type.

## 2. Write the entry

```js
{
  upper: '𝗔𝗕𝗖…𝗭',   // positional string OR array — index 0 is A
  lower: '𝗮𝗯𝗰…𝘇',
  nums:  '𝟬𝟭𝟮…𝟵',
  type: 'map',
  category: 'bold',
  familySlug: 'bold-fonts',   // string OR array of strings
  groupSlug: 'bold',
  slug: 'bold',
  platforms: [ … ]
}
```

- **Exactly 26 / 26 / 10, in order.**
- **A letter with no Unicode equivalent still occupies its slot** — repeat the plain
  character (`…HIJ` with a plain `I`). Omitting one shifts every later letter, so a
  style missing `I` renders `J` for `I` all the way to `Z`. Only a *trailing*
  omission is harmless, because `mapChar` falls back to the original character when
  the index is absent.
- **Use an array when one "letter" is more than one codepoint.** That is why
  `Ultra Regional Indicator` is an array: its letters are a regional indicator plus
  U+2060, and a positional string would split them mid-glyph.
- `category`, `familySlug` and `groupSlug` must match existing category pages.

## 3. Verify with the renderer, never by counting characters

`renderMap` validates 26/26/10 but only warns behind `window.UTG_DEBUG`, so a bad map
is **silent in production**. And several styles store wrapped forms (`⦅❨A❩⦆`, `→A←`,
`[A]`, `‹A›`, `‖A‖`, `|A|`) that `mapToArray()` parses with dedicated regexes, so a
naive `Array.from(...).length` reports **8 well-formed styles as broken**.

`mapToArray` is not exported. Drive the check through `renderAny` — a second copy of
that parsing logic would drift from the first:

```bash
node -e "
global.window={UTG_DEBUG:true};require('./styles.js');require('./renderer.js');
const bad=[],w=console.warn;
console.warn=(m,slug,lens)=>{if(String(m).includes('Bad map lengths'))bad.push([slug,JSON.stringify(lens)])};
for(const s of Object.values(window.textStyles)){if(s.type!=='map')continue;
  window.UltraTextGenRender.renderAny('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',s);}
console.warn=w;bad.forEach(b=>console.log('BAD',b[0],b[1]));
console.log(bad.length?bad.length+' malformed':'all map styles well-formed');"
```

Expect `all map styles well-formed`. **Do not read this through a pipe** — see
`.claude/rules/tooling-and-gates.md`.

## 4. Wire the style up

- A new category page needs `CATEGORY_PAGES` in `styles.js` updated and matching
  `familySlug` values on the styles; a new platform page needs `SITE_PAGES`.
- If the style gets its own page, that is the `ship-page` skill, not this one.
- Check whether the style needs `accentSafe` or a `note`.

## 5. Run the gates

`npm run check:ci-gates`. A style change can move `check:counter-claims` and any page
that renders the style; art and sitemap follow from the page, not the style.
