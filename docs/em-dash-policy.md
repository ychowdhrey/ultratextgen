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
| every other locale | **per-locale policy** — `data/em_dash_locale_policy.json`, see §4 |

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

(Re-measured after `main`'s extractor change of the same day — card labels
counted, the pre-rendered directory dropped — the English total is 9,688; the
policy and the argument do not move.)

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

## 4. Which languages use the em dash natively — the policy of record

**Adopted 2026-09-02 (user decision), to be revised as more pages are crawled.**
The state is `data/em_dash_locale_policy.json`; the check reads it on every run,
and `npm run audit:em-dash` re-measures every locale against it (§7). The ban is
not English-only because English is special; it is per locale because the em
dash is required punctuation in some of this site's languages and the native
mark is a *different* dash in most of the others.

Four policies:

| policy | what the check does | locales |
|---|---|---|
| **ban** | a new em dash fails, in every mode; the block names the locale's replacement | en; and the thirteen locales whose native dash is the spaced en dash: de, nl, da, no, sv, fi, cs, sk, hu, hr, sr, bs, it |
| **native** | never a finding | ru, es, pt, fr, pl, ro |
| **double-dash** | a new lone `—` fails; a new `——` does not | zh-tw, ja |
| **review** | a new em dash is a warning only, pending a native reader or corpus evidence | id, ms, tl, tr, vi, ar, hi, th, ko |

Every locale sits near 100% of pages carrying an em dash, at rates close to
English, because the translations inherited English punctuation. The corpus
rate therefore measures the import, not the language, which is why the
native-form column comes from reference orthographies (Duden, RAE, the Russian
rules, PUEBI, the Croatian and Czech orthographies, 教育部《重訂標點符號手冊》,
文化庁『くぎり符号の使ひ方』, and so on) and not from our pages. The ledger
carries the reference per row.

| locale | native dash for an aside | is a lone `—` native prose punctuation? | our corpus: median per 1,000 words (pages with ≥1) | policy |
|---|---|---|---:|---|
| en | `—` unspaced (US) or ` – ` (UK) | yes, but the density is the pattern | 19.2 (98%) | **ban** |
| ru | ` — ` тире | **required**: replaces the copula, opens dialogue | 28.9 (99%) | native |
| es | `—` raya for dialogue and incisos | yes; web prose leans on commas and parentheses | 10.9 (94%) | native |
| pt | `—` travessão | yes | 16.0 (100%) | native |
| fr | ` — ` or ` – ` tiret | yes | 16.0 (100%) | native |
| pl | `—` or ` – ` myślnik | yes, either form | 23.1 (100%) | native |
| ro | `—` / ` – ` linia de pauză | yes | 23.6 (100%) | native |
| de | ` – ` Gedankenstrich | no | 19.7 (99%) | **ban** → ` – ` |
| nl | ` – ` gedachtestreepje | rarely | 19.9 (99%) | **ban** → ` – ` |
| da, no, sv | ` – ` tankestreg / tankestrek / tankstreck | no | 23.0 / 24.1 / 15.1 | **ban** → ` – ` |
| fi | ` – ` ajatusviiva | no | 24.4 (100%) | **ban** → ` – ` |
| cs, sk | ` – ` pomlčka | no | 25.1 / 26.3 | **ban** → ` – ` |
| hu | ` – ` gondolatjel | no | 23.3 (100%) | **ban** → ` – ` |
| hr, sr, bs | ` – ` crta | no | 25.4 / 26.7 / 26.8 | **ban** → ` – ` |
| it | ` – ` lineetta | rarely (the lineato `—` is uncommon) | 14.2 (99%) | **ban** → ` – ` |
| zh-tw | `——` 破折號, always two cells | **no: a lone `—` is a form error**; 1,036 of our 1,121 are already paired | 13.6 (100%) | double-dash |
| ja | `――` / `——` ダッシュ, paired; web prose uses `、` `。` `「」` `～` | no; **1,810 of our 2,565 are already paired** | 7.5 (97%) | double-dash |
| id, ms | `—` tanda pisah (PUEBI) for insertions and ranges | yes, but rare in web prose | 20.9 (100%) | review (density) |
| tl | follows English | acceptable | 19.9 (100%) | review, with English |
| tr | `—` uzun çizgi for dialogue; asides take commas | marginal | 20.2 (99%) | review |
| vi | ` – ` or ` - ` at dialogue start; asides take commas (52 spaced hyphens on 3 pages are native dialogue marks) | rarely | 15.4 (99%) | review |
| ar | الشرطة, a short dash (` - ` or ` – `) for a parenthetical clause | not the form | 19.5 (99%) | review |
| hi | निर्देशक चिह्न (dash), usually ` – ` or `—`; योजक for compounds | defined, rare | 13.5 (100%) | review |
| th | ยัติภาค `—` is in the official list but rare; phrases are separated by spaces | defined, rare (lowest rate on the site) | 3.5 (98%) | review |
| ko | 줄표 `—` is defined for explanations; `~` for ranges; rare in web prose | defined, rare | 16.7 (99%) | review |

Three things the table settles:

1. **Russian cannot have the rule.** A ban there would delete required grammar.
2. **For thirteen locales the fix is a different character, not deletion.** The
   gate says so in the block: `write instead: the spaced en dash ( – )`, which
   is never flagged. A detector that only counted `—` would read a correct
   German page as clean and a correct Russian page as dirty; the ledger is what
   stops that.
3. **Chinese and Japanese are wrong by form, not by density.** The pair is
   correct and the corpus already mostly uses it; the ban is on the lone mark.

**The corpus corrected the table before it was adopted.** The draft put Japanese
under "no dash tradition"; measuring showed 1,810 of its 2,565 em dashes in the
paired form, so it joined Chinese under double-dash. Arabic, Hindi, Thai and
Korean were drafted as bans and moved to review, because each language's rules
do define a dash mark, rarely used, and a ban needs a native reader to confirm
which form is the import. That is the loop §7 makes routine.

## 5. How it is enforced and verified

* `data/em_dash_locale_policy.json`: one row per locale — `policy`,
  `nativeMark`, `replacement` (what the gate tells the author to write), `basis`
  (the orthographic or corpus reason), `adopted`, `nextReview`. A malformed
  ledger is refused (exit 2); a locale with no row is `review` and reported as
  missing, never silently banned or exempt.
* `scripts/lib/em-dash-policy.js`: loads and validates the ledger, resolves a
  locale to its policy, and tells a lone `—` from half of a `——`. Shared by the
  check, the audit and the tests.
* `data/editorial_phrase_bank.json`: `EFR-F-001` (em dash, unchanged) and
  `EFR-F-006` (spaced hyphen, English, prose slots only, measured base rate 3
  occurrences on 3 pages; the only locale where ` - ` is common is Vietnamese,
  where it is a native dialogue mark, so the guard stays English-only).
* `scripts/check-editorial-footprint.js`: applies the locale's policy to both
  sides of every diff before the delta, so a native locale has no em dash
  findings at all and a double-dash locale counts only lone ones; an introduced
  finding on a `ban` or `double-dash` locale exits 1 in every mode, and the
  block names that locale's replacement. Every other rule keeps the documented
  shadow/enforce behaviour. The step is in `validate.yml`'s gating list.
* `npm run test:editorial-footprint`: assertions for the spaced hyphen, the
  ledger (valid, complete, refuses a ban with no replacement), the pair
  detector (both halves of `——`, including a hit whose excerpt was cut), and
  `isBanned` per locale.
* Probed on a throwaway branch before wiring, with `--no-score`: an English em
  dash and an English spaced hyphen reported `BANNED`, exit 1; a German em dash
  `BANNED` naming the en dash, exit 1; a German en dash, a Russian em dash, a
  Chinese `——` and a plain English sentence, exit 0; a Chinese lone `—` and an
  Indonesian em dash as documented (`BANNED` and warning respectively).

## 6. What this does to EFR

Almost nothing, and that is expected. The score's punctuation term is relative
to the page's cohort median, so a whole section moving to zero moves the median
with it. The ban is a tone and typography decision that the EFR gate does not
need to express; the EFR gate's `contributors` line still prints the count so a
reviewer sees it.

## 7. Keeping the table honest as more pages are crawled

The table was adopted from orthographies, and the corpus has already corrected
it once. The loop that keeps it honest:

1. **`npm run audit:em-dash`** re-measures every locale: policy beside pages,
   em dashes, median per 1,000 words, share of pages, paired versus lone,
   spaced hyphens in prose, and each row's `nextReview`, flagged when due. For
   every double-dash and review locale it lists the pages with the most lone
   em dashes, which is the reading list for a native reader. `--report <path>`
   writes it as Markdown; `--locale <code>` scopes it.
2. **Every row has a `nextReview` date.** All rows are dated 2026-09-26 for the
   first pass; after that, quarterly, or immediately when a locale gains a
   batch of new pages (a translation batch is the moment an imported pattern
   arrives).
3. **A row changes only in the ledger**, with a dated edit, a native reader's
   confirmation or corpus evidence in `basis`, and a line in the change log
   below. Never on a page by hand, and never by translating an English rule.
4. **What moves a row:**
   * `review` → `native` when a native reader confirms the em dash is the
     language's own mark at the rate seen;
   * `review` → `ban` when the reader confirms it is an import and names the
     native replacement;
   * `ban` → `native` if a reader shows the em dash is in fact acceptable there
     (the thirteen en-dash rows are the ones most worth checking, since some
     style guides in those languages tolerate the em dash);
   * a `double-dash` row is healthy while paired far exceeds lone; a rising lone
     count after a translation batch means the batch imported the English form.
5. **What to watch besides the em dash:** spaced hyphens creeping into the
   en-dash locales as a substitute (the guard is English-only today; measured
   base rate elsewhere is 0 to 4 per locale, except Vietnamese where it is
   native), and the blocked-per-locale count from CI, which the shadow-mode
   readout reviews for false positives on quoted or subject text.

## Change log

| date | change |
|---|---|
| 2026-09-02 | Policy created. Em dash and spaced hyphen banned forward-only on English copy; `EFR-F-006` added; `check:editorial-footprint` exits 1 on an introduced banned pattern and joins the gating list. Locale table recorded as candidates. |
| 2026-09-02 | **Locale table adopted as policy of record** (user decision) in `data/em_dash_locale_policy.json`: ban on en and the thirteen en-dash locales (replacement named per row), native on ru/es/pt/fr/pl/ro, double-dash on zh-tw and ja, review elsewhere. Corrections made by the corpus before adoption: ja moved from "no dash tradition" to double-dash (1,810 of 2,565 paired); ar, hi, th, ko moved from ban to review. `scripts/lib/em-dash-policy.js` and `npm run audit:em-dash` added; every row carries `nextReview` 2026-09-26. |
