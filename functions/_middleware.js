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
  // Build a completely clean request with NO headers from the original
  // request.  Copying the original headers forwards geo-IP signals
  // (CF-Connecting-IP, X-Forwarded-For, etc.) that Cloudflare's i18n
  // routing can use to serve a localized page even when Accept-Language
  // is explicitly set to "en".
  let response = await context.env.ASSETS.fetch(
    new Request(new URL("/index.html", url.origin), {
      method: "GET",
      headers: new Headers({ "Accept-Language": "en" }),
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
  //
  // When a non-English page is served, we also inject a <style> that
  // hides body content until i18n.js has restored English translations,
  // preventing a visible flash of foreign-language text.
  let servedNonEnglish = false;
  const rewritten = new HTMLRewriter()
    .on("html", {
      element(el) {
        // If ASSETS served a localized page (e.g. fr/index.html), the
        // original lang attribute will be non-"en".  Preserve it as a
        // data attribute so client-side i18n.js can detect that body
        // content needs English restoration.
        const servedLang = el.getAttribute("lang");
        if (servedLang && servedLang !== "en") {
          el.setAttribute("data-served-locale", servedLang);
          servedNonEnglish = true;
        }
        el.setAttribute("lang", "en");
      },
    })
    .on("head", {
      element(el) {
        if (servedNonEnglish) {
          // Hide body until i18n.js applies English translations and
          // removes the data-served-locale attribute.
          el.append(
            '<style id="locale-cloak">html[data-served-locale] body { visibility: hidden; }</style>',
            { html: true }
          );
        }
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
  // "no-store" prevents browsers from keeping ANY cached copy of this
  // response, which is critical because a previously cached 301 → /fr/
  // redirect would persist indefinitely (301 = permanent).  "Vary:
  // Accept-Language" tells CDN edge nodes and downstream proxies that
  // the response varies by language preference, preventing a locale-
  // specific cached response from being served to all users.
  const outHeaders = new Headers(rewritten.headers);
  outHeaders.set("Cache-Control", "no-store");
  outHeaders.set("Vary", "Accept-Language");
  outHeaders.delete("Location");

  return new Response(rewritten.body, {
    status: 200,
    headers: outHeaders,
  });
}
