// ⚠️  THIS MIDDLEWARE DOES NOT CURRENTLY RUN.
//
// Pages Functions are not executing on this project. Verified on the
// PR #674 preview deploy (2026-07-26): with every _redirects rule that
// matched `/` removed, `/?lang=de` still returned 200 instead of the
// 301 the LANG_REDIRECTS branch below issues before touching anything
// else. `/` is served by the `/  /index.html  200` rule in _redirects,
// and the `_root.html` copy this file fetches is unused.
//
// The code below is correct and will take effect if Functions are ever
// enabled (check the Pages project's build config in the Cloudflare
// dashboard) — but do not rely on it for anything today, and do not
// delete a _redirects rule on the assumption that it covers you.
//
// Legacy ?lang= query-param URLs → path-based locale homepages.
//
// This lives here, not in _redirects, because Cloudflare Pages matches
// _redirects sources on the path only and silently drops the query
// string — `/?lang=fr  /fr/  301` becomes `/  /fr/  301` and 301s the
// English homepage to French for everyone. See the note in _redirects.
const LANG_REDIRECTS = {
  fr: "/fr/",
  de: "/de/",
  pt: "/pt/",
  es: "/es/",
  en: "/",
  id: "/id/",
  it: "/it/",
  nl: "/nl/",
  tr: "/tr/",
  pl: "/pl/",
  vi: "/vi/",
  tl: "/tl/",
  sv: "/sv/",
  no: "/no/",
};

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Only intercept the root homepage — let all other paths pass through.
  if (url.pathname !== "/") {
    return context.next();
  }

  // ── Legacy ?lang=<locale> → /<locale>/ ──────────────────────────────
  // Only fires when the param is actually present and maps to a known
  // locale. `?lang=en` maps to "/" and is skipped so it cannot loop.
  const langParam = url.searchParams.get("lang");
  const langTarget = langParam ? LANG_REDIRECTS[langParam.toLowerCase()] : null;
  if (langTarget && langTarget !== "/") {
    const target = new URL(langTarget, url.origin);
    // Carry every other param across (notably ?q=, the shareable-text
    // param) but drop lang= itself, so the destination cannot bounce.
    url.searchParams.forEach((value, key) => {
      if (key !== "lang") target.searchParams.append(key, value);
    });
    return Response.redirect(target.toString(), 301);
  }

  // ── Fetch the English root page from ASSETS ─────────────────────────
  // Cloudflare Pages' ASSETS binding performs implicit i18n content
  // negotiation when locale subdirectories (fr/, de/, …) contain a file
  // with the same name as the requested file.  Requesting /index.html
  // can therefore return fr/index.html transparently.
  //
  // FIX: request _root instead — a build-generated copy of the English
  // index.html that has NO locale variants (no fr/_root.html,
  // de/_root.html, etc.), so i18n content negotiation cannot activate.
  //
  // Request it WITHOUT the .html extension: Pages' asset server strips
  // .html and answers /_root.html with a 308 to /_root, which is not
  // `ok`, so asking for the extension sent us straight into the fallback
  // path below on every request.
  let response = await context.env.ASSETS.fetch(
    new Request(new URL("/_root", url.origin), {
      method: "GET",
    })
  );

  // If _root does not exist (e.g. build step was skipped), fall back to
  // /index.html with Accept-Language: en as a best effort.
  if (!response.ok) {
    response = await context.env.ASSETS.fetch(
      new Request(new URL("/index.html", url.origin), {
        method: "GET",
        headers: new Headers({ "Accept-Language": "en" }),
      })
    );
  }

  // Never hand a redirect back to the client from here: /index.html also
  // 308s to /, which would bounce the browser straight back into this
  // middleware. Let Pages serve the request normally instead.
  if (!response.ok) {
    return context.next();
  }

  // ── Build the final response with anti-cache headers ────────────────
  // _root.html is a build-time copy of index.html, so its own title/meta/
  // canonical/OG/Twitter tags are already correct — no rewriting needed.
  const outHeaders = new Headers(response.headers);
  outHeaders.set("Cache-Control", "no-store");
  outHeaders.set("Vary", "Accept-Language");
  outHeaders.delete("Location");

  return new Response(response.body, {
    status: 200,
    headers: outHeaders,
  });
}
