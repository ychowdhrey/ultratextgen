---
paths:
  - "{_redirects,_routes.json,robots.txt,sitemap.xml,llms.txt}"
  - "**/llms.txt"
  - "functions/**"
  - "scripts/{update-sitemap,build-llms-index,audit-llms-index,check-redirects,build-static-footer}.js"
  - "scripts/lib/{content-significance,redirects-parse,llms-index}.js"
  - "data/sitemap-lastmod-cache.json"
  - ".github/workflows/update-sitemap.yml"
  - "_headers"
---

# Discovery, routing and delivery

Deeper reference: `docs/architecture/discovery-and-delivery.md`,
`docs/llms-txt.md`, `docs/webmaster-tools-registrations-2026-08-20.md`,
and `_redirects`'s own header.

## Discovery is multi-surface

The site is not optimized for a single algorithm. Google matters and is served
well — it is **one distribution surface, not the operating system**. A page or asset
needs a defensible reason to exist even if Google never sends it a visitor: real
utility, a share/print/embed path, or reference value a person or an AI would cite.
"A keyword exists" is not that reason.

**Machine legibility is a distribution feature, not hygiene.** Several search and AI
crawlers execute no JavaScript, so content and links that matter for discovery must
be present in static HTML where feasible — that is why the static footer and the
pre-rendered hubs and grids exist. `robots.txt` deliberately welcomes AI crawlers.
Weigh a Google-motivated change against its effect on the other registered engines.

## `_redirects`: two buckets, and one splat drops you into the small one

Cloudflare Pages compiles this file into **STATIC** (exact paths, cap 2,000) and
**DYNAMIC** (anything with a `*` or `:placeholder`, cap 100). A rule is dynamic if
it contains a splat **or if any rule above it does** — precedence has to be
preserved. Everything past the dynamic cap is dropped **in silence**.

- **Every splat/placeholder rule lives at the BOTTOM of the file.** Ordering costs
  nothing (Cloudflare matches static rules first wherever they sit), so a splat
  above a static rule is pure loss.
- **No duplicate sources.** A duplicate is ignored by the parser and **still spends
  its dynamic slot**.
- **Never put a query string in a source path.** This is Pages, not Netlify: it
  matches the **path only** and silently drops the query, so `/?lang=fr /fr/ 301`
  is read as `/ /fr/ 301` and sends the English homepage to French for every
  visitor and crawler. Query matching belongs in `functions/_middleware.js`
  (`LANG_REDIRECTS`), which can read `url.searchParams`.
- Permitted statuses are 200/301/302/303/307/308. A `404` status is rejected, and
  an absolute `from` is rejected ("Only relative URLs are allowed").
- When Functions are active on a route, the Function runs **before** `_redirects`.

`npm run check:redirects` gates all of this whole-file (deliberately not
diff-scoped — the damage a splat does is to rules *elsewhere* that the PR never
touches). Cloudflare's own parser is the ground truth for any change:
`npx wrangler pages dev . --port 8788` prints the live rule count and names the
line where a cap is hit.

## `_routes.json`: every included route costs an invocation

**Do not widen the `include` list, add files under `functions/`, or delete
`_routes.json`** without checking the Functions invocation budget. Each included
route bills one Workers-quota invocation per request, and with **no**
`_routes.json` Cloudflare auto-generates one that routes *every* request — CSS, JS,
images, all pages — through the root middleware just to call `context.next()`. That
state burned the entire Workers free daily quota. Only `/` needs the Function;
static asset requests are free and unlimited **only** when they do not invoke one.
An `_`-prefixed file under `functions/` stays an unrouted code module.

## `sitemap.xml` is generated

**Never edit it directly.** `<lastmod>` means *"what a reader sees changed"*:
`scripts/lib/content-significance.js` hashes each page and a date advances only
when the hash moves. Three classes never move it — aria-labels and head metadata,
the generated static footer block, and punctuation or case alone. Symbols and copy
payloads are hashed verbatim, because on this site a currency sign or a kaomoji
**is** the content.

**If you change what the hash covers, re-baseline the cache in the same PR:**
`npm run rebaseline:sitemap-cache -- <commit of the last sitemap run>`. The stored
hashes were made by the old function; without this the next run reads every URL as
changed. `npm run test:content-significance` gates the rules and encodes each past
mass-bump as a non-catch.

## `llms.txt` is generated, whole-tree

- **Never hand-edit a generated `llms.txt`**, and run `npm run build:llms -- --write`
  in the same change as any page added, removed, renamed or flipped to `noindex`.
  `npm run check:llms` regenerates the whole tree and compares, so a hand edit fails
  the build and is overwritten by the next run. It is whole-tree rather than
  diff-scoped because the bytes that move belong to files the PR never touched.
- **Never publish one at a path that does not hold the pages it lists.** The spec
  scopes a file to its own path, so a section index may only sit at a real directory
  — and there is **no `/en/llms.txt`**, because English is served from the root.
  Do not "finish" the hierarchy by adding one.
- **Never write a description, a section heading or a language name into one.**
  Every string is read off the page it describes, in that page's own language.
  Headings are English scaffolding with the site's own breadcrumb label in
  parentheses. `Intl.DisplayNames` is deliberately unused — its output tracks the
  host's ICU version and the tree must regenerate byte-identically in CI.
- **Never describe it as a ranking factor** or as a guarantee of inclusion in any
  assistant's answers, and do not add an `Llms:` directive to `robots.txt` — the
  proposal defines none and RFC 9309 has no field for one.

It does not replace `sitemap.xml`: the sitemap stays the complete, authoritative
URL list, and `llms.txt` files carry no `index.html` so they never enter it.

## Share and embed surfaces are part of discovery

Per-result share links (`?q=&style=`) with their OG preview Function, the `/embed/`
widgets and their UTM conventions, and the printables' credit line are distribution
surfaces. Keep them working and extend them through their existing conventions
rather than ad hoc.
