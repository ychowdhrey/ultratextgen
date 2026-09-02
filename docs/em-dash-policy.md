# Em dash policy — banned forward-only in English copy (decided 2026-09-02)

The decision of record for the em dash on this site, the scope it applies to,
what replaces it, what the change does and does not do in search, and the
per-language table that keeps the ban English-only.

## 1. The decision

**No new em dash (`—`) and no spaced hyphen used as a dash (`word - word`) in
English editorial copy.** Enforced forward-only by `npm run check:editorial-footprint`,
which exits 1 whenever a branch *introduces* one on an English page, in every
mode it runs in. Existing em dashes are reported and never counted: the check
bills only the excess over what the page carried at the merge base, so a page
with 30 em dashes that is edited without adding one passes, and a page
regenerated with the same count passes.

| scope | rule |
|---|---|
| English pages, slots `prose`, `faqAnswers`, `faqQuestions`, `cta`, `headings`, `title`, `metaDescription`, `h1` | em dash (`EFR-F-001`) banned, forward-only |
| English pages, slots `prose`, `faqAnswers`, `faqQuestions`, `cta`, `headings` | spaced hyphen (`EFR-F-006`) banned, forward-only |
| English `title`, `metaDescription`, `h1` | spaced hyphen **not** flagged: a conventional title separator on the web (this site uses ` \| ` on 430 titles and `: ` on 370, and ` - ` on none) |
| the four subject pages (`symbol/em-dash`, `symbol/en-dash`, `library/dash-hyphen-symbols`, `library/punctuation-symbols`) and anything in `<q>`/`<blockquote>`/`<cite>` | exempt; the character is the subject or someone else's words |
| copy tiles, `data-symbol` payloads, code, data tables | never read by the rule; the em dash is a product here |
| every other locale | **no ban** — see §4 |

Why forward-only, in numbers measured on 2026-09-02:

| English inventory | |
|---|---:|
| indexable pages | 911 |
| em dashes in editorial slots | 9,682 |
| pages carrying at least one | 889 |
| pages with none | 18 |
| in `<title>` | 381 pages |
| in meta description | 721 |
| in the shared CTA card (one template string) | 1,239 |
| upstream: spec files / generator scripts carrying one | 1,400+ / 140 |

A purge would mean hand-rewriting 9,682 sentences, retitling 381 pages, and
fixing every generator first so the next run does not put them back. CLAUDE.md
already records the two reasons not to: Google's guidance warns against removing
a page element because you heard it was bad, and against changing content that
already performs. The ban stops the number growing; the backlog drains page by
page through the ratchet rule that a count may never rise.

## 2. What replaces it

The phrase bank's own guidance for `EFR-F-001`, unchanged:

| the em dash was doing | write instead |
|---|---|
| explaining what precedes it | a colon |
| a separate thought | a full stop |
| a genuine aside | a comma pair |
| a true parenthetical | parentheses |
| a range (2019—2024) | an en dash (2019–2024), which is not banned |
| two jobs in one sentence | two sentences |

Never a spaced hyphen: it is the substitute a ban invites and it is worse
typography than the thing it replaces, which is why `EFR-F-006` exists.
Hyphens inside compounds (`copy-paste`, `zero-width`) are not this pattern and
are never flagged.

## 3. Titles and meta descriptions: `:` and `|` in search

**Separator choice is not a ranking signal.** Google's documentation on title
links lists ` - `, ` | ` and `:` as ordinary separators, and Google rewrites
title links from page content regardless. The site already uses ` | ` as its
trailing brand separator (430 English titles) and `:` as the head-term/answer
separator the tone standard prescribes (370). Replacing ` — ` with either is
consistent with what 800 titles already do.

What actually carries risk is **churn, not punctuation**:

* A changed `<title>` re-enters Google's title-link selection and the snippet
  can change with it. Retitle in batches by family, and read GSC for that batch
  afterwards rather than site-wide, or the effect cannot be attributed.
* Pages that rank or draw traffic (the `protected` class when a
  ranking-sensitivity overlay is supplied; see `docs/editorial-footprint-risk.md`)
  should not be retitled for punctuation alone. Retitle them when they are
  retitled for their own reasons, as the tone standard already does.
* `title-changed` and `h1-changed` are errors in the SEO Preservation Gate.
  A retitling pass is a deliberate, documented change, not a gate failure to
  route around.
* The title is mirrored in JSON-LD (`headline`/`name`), `og:title` and
  `twitter:title`, and drawn into the hero/OG art. Move them together and
  regenerate the art with `generate-site-art.py --only <slug>`.

Which mark: **`:`** when the second half answers or explains the first
(`Middle East Currency Symbols: 5 Have Their Own, 10 Don't`). **` | `** only as
the trailing brand separator; it is not punctuation and reads wrong mid-title.
A title that already has a colon and an em dash needs restructuring (a comma, a
full stop, or a shorter title), not a second colon. Meta descriptions are not a
ranking factor and can change freely, but 721 of them changing at once moves
700 snippets in one week; change them with the page's next edit.

## 4. Which languages use the em dash natively

The ban is English-only because the em dash is required punctuation in some of
this site's locales and the native mark is a *different* dash in most others.
Every locale below sits near 100% of pages carrying an em dash, at rates close to
English, because translations inherited the English punctuation; the corpus rate
therefore measures the import, not the language.

Native-form column: reference orthographies (Duden, RAE, the Russian rules,
PUEBI, the Croatian and Czech orthographies, and so on) as this author knows
them, **not** corpus evidence. Per the research memo, a locale rule needs its
own corpus evidence and a native reader before it becomes a bank entry, so the
"candidate" column is a review list, not a rule.

| locale | native dash for an aside | is `—` native prose punctuation? | our corpus: median em dashes per 1,000 words (pages with ≥1) | reading | candidate policy |
|---|---|---|---:|---|---|
| en | `—` unspaced (US) or ` – ` (UK) | yes, but the density is the pattern | 19.2 (98%) | house style | **banned forward-only** (this doc) |
| ru | ` — ` spaced (тире) | **required**: replaces the copula, opens dialogue | 28.9 (99%) | native | no rule |
| es | `—` raya for dialogue and incisos | yes; expository web prose leans on commas and parentheses | 10.9 (94%) | native | no rule; density review only |
| pt | `—` travessão | yes | 16.0 (100%) | native | no rule |
| fr | ` — ` or ` – ` tiret for incises and dialogue | yes | 16.0 (100%) | native | no rule |
| pl | `—` or ` – ` myślnik; dashes are frequent | yes (either form) | 23.1 (100%) | native | no rule |
| ro | `—` / ` – ` linia de pauză | yes | 23.6 (100%) | native | no rule |
| id, ms | `—` tanda pisah (PUEBI) for insertions and ranges | yes, but rare in web prose | 20.9 (100%) | native, over-used | density review |
| tl | follows English conventions | acceptable | 19.9 (100%) | mirrors English | review with English |
| de | ` – ` Gedankenstrich (en dash, Duden) | no | 19.7 (99%) | imported | convert to ` – ` on next edit, native review first |
| nl | ` – ` gedachtestreepje | rarely | 19.9 (99%) | imported | as de |
| da, no, sv | ` – ` tankestreg / tankestrek / tankstreck | no | 23.0 / 24.1 / 15.1 | imported | as de |
| fi | ` – ` ajatusviiva | no | 24.4 (100%) | imported | as de |
| cs, sk | ` – ` pomlčka | no | 25.1 / 26.3 | imported | as de |
| hu | ` – ` gondolatjel | no | 23.3 (100%) | imported | as de |
| hr, sr, bs | ` – ` crta | no | 25.4 / 26.7 / 26.8 | imported | as de |
| it | ` – ` lineetta | rarely (`—` is the lineato, uncommon) | 14.2 (99%) | imported | as de |
| tr | `—` uzun çizgi exists for dialogue; asides take commas or parentheses | marginal | 20.2 (99%) | imported at this rate | reduce on next edit, native review |
| ar | none; Arabic punctuation is `،` `؛` `؟`, a spaced hyphen at most | no | 19.5 (99%) | imported | rewrite with native punctuation on next edit, native review |
| hi | none in Devanagari prose (`।` ends a sentence; hyphen for compounds) | no | 13.5 (100%) | imported | as ar |
| th | none; Thai separates phrases with spaces | no | 3.5 (98%) | imported (lowest rate) | as ar |
| ja | literary double dash `――`; web prose uses `、` `。` `「」` `～` | no (single `—` is not the form) | 7.5 (97%) | imported | as ar |
| ko | none; `~` for ranges | no | 16.7 (99%) | imported | as ar |
| zh-tw | `——` 破折號, always two cells | **no: a single `—` is a typographic error in Chinese** | 13.6 (100%) | imported, wrong form | convert to `——` where a dash is meant, otherwise remove; native review |
| vi | ` – ` or ` - ` at dialogue start; asides take commas | rarely | 15.4 (99%) | imported | native review |

Three things the table says that the ban must respect:

1. **Russian cannot have the rule.** A ban there would delete required grammar.
2. **For thirteen locales the fix is a different character, not deletion.**
   The en dash is their native mark, so the eventual rule is "convert", and a
   detector that only counts `—` would read a correct German page as clean and a
   correct Russian page as dirty. Any locale rule starts from a native reader.
3. **Chinese is the one locale where the em dash is wrong by form, not by
   density.** A single `—` should become `——` or go.

## 5. How it is enforced and verified

* `data/editorial_phrase_bank.json`: `EFR-F-001` (em dash, unchanged) and the
  new `EFR-F-006` (spaced hyphen, English, prose slots only, measured base rate
  3 occurrences on 3 pages).
* `scripts/check-editorial-footprint.js`: `BANNED` names the two rules and the
  locales they apply to (`en`). An introduced finding on a banned rule and
  locale exits 1 in every mode; everything else keeps the documented
  shadow/enforce behaviour. The step is in `validate.yml`'s gating list.
* `npm run test:editorial-footprint`: assertions for the spaced hyphen (caught
  in prose and FAQ; not a compound, not a negative number, not a title
  separator, not German, not on the hyphen's own page) and for the ban's scope.
* Probed on a throwaway branch before wiring: an em dash added to
  `guide/why-fonts-show-as-boxes` and a spaced hyphen added to
  `answers/is-linkedin-bold-text-safe` each reported as `BANNED` and the run
  exited 1 in shadow mode, while a plain sentence added to
  `guide/vertical-text-guide` and an em dash added to a German page produced
  no ban and exit 0.

## 6. What this does to EFR

Almost nothing, and that is expected. The score's punctuation term is relative
to the page's cohort median, so a whole section moving to zero moves the median
with it. The ban is a tone and typography decision that the EFR gate does not
need to express; the EFR gate's `contributors` line still prints the count so a
reviewer sees it.

## Change log

| date | change |
|---|---|
| 2026-09-02 | Policy created. Em dash and spaced hyphen banned forward-only on English copy; `EFR-F-006` added; `check:editorial-footprint` exits 1 on an introduced banned pattern and joins the gating list. Locale table recorded; no locale rule created. |
