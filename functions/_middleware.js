// ── English metadata for protected pages ────────────────────────────────
// Each entry maps a canonical pathname (without trailing slash) to the
// English <title>, <meta name="description">, and canonical URL that
// HTMLRewriter will enforce as a safety net.
//
// To protect a new page, add an entry here and extend the build script in
// package.json to copy its index.html → _root.html sibling.
const PROTECTED_PAGES = new Map([
  [
    "/",
    {
      rootHtml: "/_root.html",
      indexHtml: "/index.html",
      title: "Stylish Text Generator — Copy & Paste Fancy Unicode Fonts",
      desc:
        "Turn plain text into stylish Unicode fonts you can copy and paste. " +
        "Choose bold, cursive, gothic, and decorative styles for bios, " +
        "usernames, comments, and posts.",
      url: "https://ultratextgen.com/",
    },
  ],
  [
    "/usecase/zalgo-text",
    {
      rootHtml: "/usecase/zalgo-text/_root.html",
      indexHtml: "/usecase/zalgo-text/index.html",
      title:
        "Zalgo Text Generator — Creepy Glitch & Cursed Unicode Text | UltraTextGen",
      desc:
        "Generate creepy glitch Zalgo text using Unicode combining marks. " +
        "Full control over characters, position, shape, frequency, and amplitude. " +
        "Copy and paste anywhere.",
      url: "https://ultratextgen.com/usecase/zalgo-text/",
    },
  ],
]);

// Locale prefixes that must never be intercepted — they should pass through
// so the correct localized content is served naturally.
const LOCALE_PREFIXES = [
  "/es/", "/fr/", "/pt/", "/de/", "/id/",
  "/it/", "/nl/", "/tr/", "/pl/", "/vi/",
];

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Normalize pathname: strip trailing slash (except for root "/").
  const rawPath = url.pathname;
  const normalizedPath =
    rawPath !== "/" && rawPath.endsWith("/")
      ? rawPath.slice(0, -1)
      : rawPath;

  // Let locale-prefixed paths pass through untouched so localized content
  // is served naturally (e.g. /fr/usecase/zalgo-text/).
  if (LOCALE_PREFIXES.some((prefix) => rawPath.startsWith(prefix))) {
    return context.next();
  }

  // Only intercept paths that are in our protected-pages map.
  const meta = PROTECTED_PAGES.get(normalizedPath);
  if (!meta) {
    return context.next();
  }

  // ── Fetch the English root page from ASSETS ─────────────────────────
  // Cloudflare Pages' ASSETS binding performs implicit i18n content
  // negotiation when locale subdirectories (fr/, de/, …) contain a file
  // with the same name as the requested file.  Requesting /index.html
  // can therefore return fr/index.html transparently.
  //
  // FIX: request _root.html instead — a build-generated copy of the
  // English index.html that has NO locale variants (no fr/_root.html,
  // de/_root.html, etc.), so i18n content negotiation cannot activate.
  let response = await context.env.ASSETS.fetch(
    new Request(new URL(meta.rootHtml, url.origin), {
      method: "GET",
    })
  );

  // If _root.html does not exist (e.g. build step was skipped), fall
  // back to the real index.html with Accept-Language: en as a best effort.
  if (!response.ok) {
    response = await context.env.ASSETS.fetch(
      new Request(new URL(meta.indexHtml, url.origin), {
        method: "GET",
        headers: new Headers({ "Accept-Language": "en" }),
      })
    );
  }

  // If still not OK, pass through as-is.
  if (!response.ok) {
    return response;
  }

  // ── HTMLRewriter: guarantee English head metadata (safety net) ──────
  // Under normal operation _root.html is already English, so these
  // rewriters are no-ops.  They remain as defense-in-depth in case
  // ASSETS ever returns unexpected content.
  const rewritten = new HTMLRewriter()
    .on("html", {
      element(el) {
        el.setAttribute("lang", "en");
      },
    })
    .on("title", {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute("content", meta.desc);
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute("href", meta.url);
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute("content", meta.title);
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        el.setAttribute("content", meta.desc);
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        el.setAttribute("content", meta.url);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(el) {
        el.setAttribute("content", meta.title);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(el) {
        el.setAttribute("content", meta.desc);
      },
    })
    .transform(response);

  // ── Build the final response with anti-cache headers ────────────────
  const outHeaders = new Headers(rewritten.headers);
  outHeaders.set("Cache-Control", "no-store");
  outHeaders.set("Vary", "Accept-Language");
  outHeaders.delete("Location");

  return new Response(rewritten.body, {
    status: 200,
    headers: outHeaders,
  });
}
