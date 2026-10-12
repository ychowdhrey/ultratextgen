# One Spanish for every market — neutral first, Latin American where it must choose

**Owner decision, 2026-10-09.** `/es/` serves every Spanish-speaking market as one
site, the way the English site serves every English market. There is no `es-ES`,
`es-MX` or `es-419` split, and none is planned.

## The rule

1. **Neutral Spanish first.** Where a word works in every market, use it:
   "teléfono" rather than either "móvil" or "celular".
2. **Where no neutral word exists, use the Latin American form**: "computadora",
   "lentes", "pastel", "curita", "jugo", "auto", "ustedes".
3. **Words that are standard everywhere stay**, including ones that look Spanish
   from Spain: "versión móvil" and "dispositivos móviles" (adjective), "piso",
   "vale la pena".
4. **A search target follows combined demand, not the prose rule alone.** Where a
   page targets a term the markets split on, lead with the majority form and keep
   the other as an alias in the title or description, so neither market's search
   misses the page.
5. **"coger" is never used for "take" or "pick up".** It is vulgar in Mexico and
   Argentina, the two largest Latin American readerships. Use "tomar" or another
   verb that fits.

## Why

Before this decision the copy defaulted to Spain's form every time: "móvil" 144
times against "celular" 23, "ordenador" 58 against "computadora" 16, "gafas" 128
against "lentes" 69, with `og:locale` set to `es_ES`.

The readers are mostly elsewhere. In September 2026, `/es/` pages had 5,491 GA4
users. 26.9% were in Mexico and about 70% in Latin America, while Spain was 5.8%.
The United States, whose Spanish-speaking readers mostly use Latin American forms,
produced the largest share of `/es/` ad revenue ($2.73 of $7.21).

Search demand points the same way:

| term | Mexico | United States | Spain |
|---|---|---|---|
| emoji con lentes / con gafas | 1,900 / 50 | 170 / 20 | 20 / 390 |
| emoji lentes de sol / gafas de sol | 140 / 20 | 20 / 20 | — / 480 |
| emoji pastel / tarta | 880 / 20 | 140 / 20 | 170 / 260 |

Monthly searches, October 2026.

A reader in Spain understands "computadora" or "pastel" without effort. A reader
in Mexico who meets "ordenador", "tirita" or "coger" reads a page written for
somebody else, and in the last case reads an obscenity.

## What this changes elsewhere

- `.claude/rules/localization.md` §9 told sessions not to put Mexican Spanish into
  `es_ES`-targeted copy. `/es/` is no longer `es_ES`-targeted; the rule carries a
  dated note pointing here.
- `og:locale` stays `es_ES` for now. Open Graph has no neutral Spanish value, and
  `hreflang="es"` (no region) is what search engines use to place these pages.

**Executed in:** the neutral-first copy pass on `/es/` pages and specs,
ychowdhrey/ultratextgen#1047.
