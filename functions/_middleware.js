export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Only intercept the homepage — let all other paths pass through
  if (url.pathname === "/") {
    // Cloudflare Pages' automatic i18n routing uses Accept-Language (and
    // potentially CF-IPCountry) to serve a localized version of the page
    // or redirect / → /fr/ (or another locale).
    //
    // Simply deleting Accept-Language is not enough — Cloudflare may fall
    // back to other signals (geo-IP, default locale order).  Setting it to
    // "en" explicitly tells the ASSETS binding to prefer English.  Because
    // there is no /en/ subdirectory, the binding falls back to the root
    // /index.html — which is the English page.
    const headers = new Headers(context.request.headers);
    headers.set("Accept-Language", "en");
    headers.delete("CF-IPCountry");

    const assetResponse = await context.env.ASSETS.fetch(
      new Request(new URL("/index.html", url.origin), {
        method: context.request.method,
        headers,
        redirect: "manual",
      })
    );

    // If the ASSETS binding still returned a redirect (e.g. 301 to /fr/),
    // follow it internally so the client never sees the redirect.
    if (assetResponse.status >= 300 && assetResponse.status < 400) {
      const location = assetResponse.headers.get("Location");
      if (location) {
        const target = new URL(location, url.origin);
        // Use clean headers so the followed request cannot itself trigger
        // another i18n redirect (no Accept-Language, no CF-IPCountry).
        const followedResponse = await context.env.ASSETS.fetch(
          new Request(target, { method: "GET", headers: new Headers() })
        );
        const response = new Response(followedResponse.body, followedResponse);
        response.headers.delete("Location");
        response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
        response.headers.set("Content-Type", "text/html; charset=utf-8");
        return response;
      }
    }

    // Successful 200 — add cache headers to prevent stale 301s from
    // being cached by browsers or the Cloudflare CDN.
    const response = new Response(assetResponse.body, assetResponse);
    response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    return response;
  }

  // All other routes proceed normally
  return context.next();
}
