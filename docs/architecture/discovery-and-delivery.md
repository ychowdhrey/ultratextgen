# Discovery and delivery — surfaces, routing, and the delivery incidents

Invariants: `.claude/rules/discovery-and-routing.md`. `llms.txt` in full:
`docs/llms-txt.md`. Engine registrations: `docs/webmaster-tools-registrations-2026-08-20.md`.
Pre-rendering: `docs/collection-grid-prerender.md`.

## The discovery model

UltraTextGen does not optimize for a single discovery algorithm. Pages, tools,
images, printables, embeds and data files are built to be useful on their own terms
and discoverable through many independent systems: Google, Bing, Naver, Yandex and
other engines; AI assistants, answer engines and their crawlers; image search; social
sharing; embeds on other sites; citations; and direct return visits. **Google matters
and is served well — it is one distribution surface, not the operating system the
site is designed around.**

Sitemap and structured-data changes serve every registered engine, so weigh a
Google-motivated change against its effect on the others.

**None of this loosens the content rules.** Hub-vs-spoke, English-Parent, parity,
ledger discipline and any active publishing restrictions apply unchanged —
multi-surface discovery is about distributing and exposing well-built assets, never
about generating more pages.

## `_redirects` — two buckets, and eight 301s that served 404 for a month

Every rule in the file was correct. 170 of the 182 redirect sources returned a 301 on
production. The other **eight served a hard 404 for a month** —
`/library/heart-emoji/`, `/es/library/emoji-corazon/`, `/pt/letras-para-copiar/` and
`/es/conversor-de-letras/`, each in its `/` and `/index.html` form — and nothing on
the site, in CI, or in any log a person reads said so.

Cloudflare Pages compiles the file into **STATIC** (exact paths, cap 2,000) and
**DYNAMIC** (anything with a `*` or `:placeholder`, cap 100). **A rule is dynamic if
it contains a splat OR IF ANY RULE ABOVE IT DOES** — precedence has to be preserved,
so nothing under a splat can live in the fast static map. `/cdn-cgi/*` sat at line
151. From there down the whole file was dynamic, and the four retirements added
between 2026-08-11 and 08-13 landed at dynamic rules 101–108, **past the cap, dropped
in silence.**

Three things follow, and the second is the one worth remembering:

- **The documented limits do not describe the failure.** The docs say 2,000 static and
  100 dynamic; the file had 184 static-looking rules and 3 splats, so by the docs it
  was nowhere near a limit. **The ordering rule is what bites, and it is not in the
  docs.**
- **The failure is positional, not chronological, which inverts the obvious
  diagnosis.** A rule added 2026-09-03 at line 319 worked; rules added three weeks
  earlier at line 372 did not. Every instinct says "stale deploy" — and three separate
  freshness probes (live `header.js`/`style.css` byte-matching `main`, the live
  `sitemap.xml` matching the copy `main` committed that morning) said the deployment
  was current. **It was.**
- **Cloudflare's own parser will tell you, and nothing else will.**
  `npx wrangler pages dev . --port 8788` printed `Parsed 172 valid redirect rules` and
  `Maximum number of dynamic rules supported is 100. Skipping remaining 30 lines of
  file.` That is the whole diagnosis, in a command this repo already had precedent for
  using. (Install it outside the repo — no dependency was added.)

### What else the cap was hiding

The skipped region was never parsed, so three defects sat inside it unreported, and
two more were visible only once the file parsed to its end:

| rule | what it actually did |
|---|---|
| `/*  /404.html  404` | **never valid** — Pages permits 200/301/302/303/307/308 and rejects 404. Removed; verified that with the rule ignored an unmatched path already returns 404 carrying this site's own `404.html`, which is identical to its absence |
| `https://www.…/*  …  301!` | **never in effect** — "Only relative URLs are allowed". www→apex is done at the zone level (verified live), not here |
| `/  /index.html  200` | **rejected as an infinite loop** — serving `/index.html` normalises back to `/`. It was documented in three places as the fallback layer keeping `/` English if Functions went inert. **That fallback never existed**; all three records now carry a dated correction |
| 3 duplicate sources | ignored by the parser, but **they still spend their dynamic slot** — those three are exactly what moved the cap from line 389 to line 372 |

`scripts/lib/redirects-parse.js` models Cloudflare's compiler, and **the model is
calibrated against the real parser, not against the docs**: on the broken file it
reports 172 live rules and the cap hit at line 372, matching wrangler exactly; on the
repaired file, 181 and zero invalid. Getting there required one non-obvious rule — a
duplicate is dropped but still spends its slot — **derived from the three-rule
discrepancy, not guessed.**

The gate is **whole-file, not diff-scoped** — the one place that choice is obviously
right, since the damage a splat does is to rules *elsewhere in the file* that the PR
adding it never touches. Verified against five broken inputs plus a control. **The
repo's own workflow lint caught the wiring mistake**, which is worth recording as
evidence it works: adding the step without echoing its outcome into the job summary
failed `check:workflows` with *"can fail the job but is never printed to the job
summary — a red build with a green summary."*

### The query-string trap

`/?lang=fr  /fr/  301` shipped in PR #566 and sat live from 2026-07-15 to 2026-07-26.
Pages matches the **path only** and silently drops the query, so it was read as
`/  /fr/  301` and **301'd the English homepage to French for every visitor and
crawler.** During that window `functions/_middleware.js` — which exists specifically
to keep `/` English — was not executing, so nothing intercepted the bad rule.

Note the ordering: when Functions **are** active on a route, the Function runs
*before* `_redirects`, verified on production 2026-08-10.

## `_routes.json` — the invocation budget

Every included route bills one Workers-quota invocation per request. With **no**
`_routes.json`, Cloudflare auto-generates one that routes **every** request — CSS, JS,
images, all pages — through the root middleware just to call `context.next()`. That
was live until 2026-08-10 and burned **~100k invocations/day — the entire Workers free
daily quota — at ~36k pageviews/day.**

Static asset requests are free and unlimited **only when they do not invoke a
Function.** Only `/` needs the Function (English homepage + legacy `?lang=` 301s);
everything else must stay excluded. An `_`-prefixed file under `functions/` stays an
unrouted code module rather than a new billed route.

## `sitemap.xml` and what `<lastmod>` means

`<lastmod>` means **"what a reader sees changed"**.
`scripts/lib/content-significance.js` hashes each page and
`data/sitemap-lastmod-cache.json` holds `{hash, lastmod}` per URL; a date advances only
when the hash moves. When it does advance it is the date of the newest commit that
changed the **hash**, found by walking the file's recent commits — not the mesh or
template pass that happened to touch the file last.

Three classes never move it, **each learned from a real mass-bump**:

| class | the bump it prevents |
|---|---|
| aria-labels and head metadata | 2,533 pages on 2026-08-15/16 |
| the generated static footer block | all 4,576 URLs would have advanced on 2026-08-20 |
| punctuation or case alone | ~2,800 pages after the 2026-09-02 template-tier em-dash pass |

Symbols and copy payloads are hashed **verbatim**, because on this site a currency
sign or a kaomoji *is* the content.

**If you change what the hash covers, re-baseline the cache in the same PR** — the
stored hashes were made by the old function, and without it the next run reads every
URL as changed. `npm run test:content-significance` gates the rules and encodes each
mass-bump as a non-catch.

### The cron history

The daily 00:00 UTC run was **paused 2026-08-20** (tied to the 2026-08-16
organic-search incident, not a tooling question) and **resumed 2026-09-05** by
explicit user direction. The workflow file carries the three conditions that were met
and keeps the pause history in its own comments. Practical consequence: a page whose
visible content changes gets its `<lastmod>` advanced on the next run and nobody needs
to run the workflow by hand.

## `llms.txt`

Full design, sizes table, the ten broken-input probes and what was deliberately left
undone: `docs/llms-txt.md`. Four points that decide the shape:

- **The spec's own sentence decides it, and it is not the obvious one.** "A file
  covers the URLs under its path." So a section index may only be published at a
  **real directory** holding the pages it lists. `/es/symbols/llms.txt` would be a lie
  (the pages are under `/es/symbol/`) and `/es/printables/llms.txt` a bigger one
  (Spanish printables are under `/es/imprimibles/`, one of seven printables directory
  names). None is hardcoded: a locale page inherits its section from the English
  parent it declares in its own `hreflang="en"`.
- **There is deliberately no `/en/llms.txt`.** English is served from the root, so `/`
  *is* its path. `_redirects` carries a static 301 from `/en/llms.txt`, above the splat
  block.
- **A section earns its own file per DIRECTORY at 10 pages**, and the "per directory"
  half was measured: a first draft required a section's pages to share one directory,
  and a handful of library-ish pages at the Spanish locale root blocked the 254 pages
  in `es/library/` from getting an index at all — the same shape hid the `ja`, `th`,
  `de`, `fr` and `ko` library indexes.
- **Nothing is authored.** Link text is each page's own `<h1>` (never its `<title>`,
  which carries the brand suffix); the note is the first sentence of its
  `.hero-tagline`, else its meta description — measured, 4,599 taglines plus 93 meta
  descriptions covers all 4,692, and `validate()` **fails rather than inventing** if
  that changes.

### Three description rules, each from a wrong result

- **A period after a digit is not a sentence boundary** unless it closes a four-digit
  year — without it the index published *"Unicode 18.0 erscheint am 16."*
- **A clause cut must leave something worth reading.** `first_sentence()` cuts an
  over-long string at its last em dash, which inverts when the first clause is a
  label: every `symbol/` page opens `💢 U+1F4A2 — the four-pointed cross that…`, so
  the cut keeps `💢 U+1F4A2.` **This is live on the site in 48 compare-cards**
  (`💢 U+1F4A2.` ×24, `🛑 U+1F6D1.` ×21, `⚸ U+26B8.` ×3). Fixing it there regenerates
  card text across hub and locale pages, so it belongs to a deliberate content pass.
- **A description is never the title restated** — a tool page with no tagline opens its
  meta description with its own name, which is how `category/old-english-fonts` was
  described as *"Old English font generator."*

The **one hand-maintained table is 27 lines** (`ROOT_PAGE_SECTION`), for the English
pages at the site root, because the site has no machine-readable statement of which is
a platform hub and which a standalone tool: all 38 ship the same JSON-LD `@type` set
and the same `Home > <own title>` breadcrumb, and `styles.js` names six platforms
against thirteen platform pages. The closest registry agrees on 36 of 38 and is a
3,500-line Python literal. `collectPages()` **throws** on an unclassified English root
page rather than defaulting — that is the "new generator family added but not
represented" drift case.

It **does not replace `sitemap.xml`** and changes no indexing behaviour. Both scan the
same filesystem and skip the same `noindex` pages, so they cannot disagree about what
exists; the sitemap stays the complete, authoritative URL list. `robots.txt` gains a
`#` comment and **no directive** — the proposal defines none and RFC 9309 has no field
for one. `_routes.json` is untouched, so each file stays a free static asset.

**No ranking or inclusion claim is made anywhere**, in any rule, doc or generated
output.
