// English metadata constants used by HTMLRewriter to enforce English head
// tags on the root path, regardless of what ASSETS returns.
const EN_TITLE =
  "Stylish Text Generator — Copy & Paste Fancy Unicode Fonts";
const EN_DESC =
  "Turn plain text into stylish Unicode fonts you can copy and paste. " +
  "Choose bold, cursive, gothic, and decorative styles for bios, " +
  "usernames, comments, and posts.";
const EN_URL = "https://ultratextgen.com/";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Only intercept the root homepage — let all other paths pass through.
  if (url.pathname !== "/") {
    return context.next();
  }

  // ── Fetch the root /index.html from ASSETS ──────────────────────────
  // Set Accept-Language to "en" (not just delete it) so Cloudflare's i18n
  // routing picks English even if it falls back from Accept-Language to
  // geo-IP.  Also strip CF-IPCountry to remove the geo hint entirely.
  const headers = new Headers(context.request.headers);
  headers.set("Accept-Language", "en");
  headers.delete("CF-IPCountry");

  let response = await context.env.ASSETS.fetch(
    new Request(new URL("/index.html", url.origin), {
      method: context.request.method,
      headers,
    })
  );

  // If ASSETS returned a locale redirect (3xx), discard it and retry
  // with a minimal GET so we always get actual HTML back.
  if (response.status >= 300 && response.status < 400) {
    response = await context.env.ASSETS.fetch(
      new Request(new URL("/index.html", url.origin), {
        method: "GET",
        headers: new Headers({ "Accept-Language": "en" }),
      })
    );
  }

  // If still not OK, pass through as-is.
  if (!response.ok) {
    return response;
  }

  // ── HTMLRewriter: guarantee English head metadata ───────────────────
  // Even a 200 response from ASSETS can contain localized content (e.g.
  // fr/index.html served transparently).  HTMLRewriter rewrites the
  // relevant tags so the root page is always English-canonical.
  const rewritten = new HTMLRewriter()
    .on("html", {
      element(el) {
        el.setAttribute("lang", "en");
      },
    })
    .on("title", {
      element(el) {
        el.setInnerContent(EN_TITLE);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute("content", EN_DESC);
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute("href", EN_URL);
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute("content", EN_TITLE);
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        el.setAttribute("content", EN_DESC);
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        el.setAttribute("content", EN_URL);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(el) {
        el.setAttribute("content", EN_TITLE);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(el) {
        el.setAttribute("content", EN_DESC);
      },
    })
    .transform(response);

  // ── Build the final response with anti-cache headers ────────────────
  // Prevent browsers / edge from caching a stale 301 → /fr/ redirect.
  const outHeaders = new Headers(rewritten.headers);
  outHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");
  outHeaders.delete("Location");

  return new Response(rewritten.body, {
    status: 200,
    headers: outHeaders,
  });
}
