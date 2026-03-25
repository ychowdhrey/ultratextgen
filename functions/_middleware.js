export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Only intercept the homepage — let all other paths pass through
  if (url.pathname === "/") {
    // Cloudflare Pages' automatic i18n routing uses Accept-Language (and
    // potentially CF-IPCountry) to serve a localized version of the page
    // or redirect / → /fr/ (or another locale).
    //
    // Setting Accept-Language to "en" and removing CF-IPCountry prevents
    // most locale signals.  Because there is no /en/ subdirectory, the
    // ASSETS binding should fall back to the root /index.html.
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

    // If the ASSETS binding returned a redirect (e.g. 301 to /fr/),
    // follow it internally so the client never sees the redirect.
    let sourceResponse = assetResponse;
    if (assetResponse.status >= 300 && assetResponse.status < 400) {
      const location = assetResponse.headers.get("Location");
      if (location) {
        const target = new URL(location, url.origin);
        // Use clean headers so the followed request cannot itself trigger
        // another i18n redirect (no Accept-Language, no CF-IPCountry).
        sourceResponse = await context.env.ASSETS.fetch(
          new Request(target, { method: "GET", headers: new Headers() })
        );
      }
    }

    // Cloudflare may perform transparent content negotiation — returning a
    // 200 whose body is /fr/index.html (or another locale) rather than the
    // root English page.  Use HTMLRewriter to guarantee the head metadata
    // matches the English homepage regardless of which file ASSETS served.
    // This is idempotent: if the response is already English the values
    // are set to the same strings.
    const cleanResponse = new Response(sourceResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });

    return new HTMLRewriter()
      .on("html", {
        element(el) {
          el.setAttribute("lang", "en");
        },
      })
      .on("title[data-i18n]", {
        element(el) {
          el.setInnerContent(
            "Stylish Text Generator \u2014 Copy & Paste Fancy Unicode Fonts"
          );
        },
      })
      .on('meta[name="description"]', {
        element(el) {
          el.setAttribute(
            "content",
            "Turn plain text into stylish Unicode fonts you can copy and paste. Choose bold, cursive, gothic, and decorative styles for bios, usernames, comments, and posts."
          );
        },
      })
      .on('link[rel="canonical"]', {
        element(el) {
          el.setAttribute("href", "https://ultratextgen.com/");
        },
      })
      .on('meta[property="og:title"]', {
        element(el) {
          el.setAttribute(
            "content",
            "Stylish Text Generator \u2014 Copy & Paste Fancy Unicode Fonts"
          );
        },
      })
      .on('meta[property="og:description"]', {
        element(el) {
          el.setAttribute(
            "content",
            "Turn plain text into stylish Unicode fonts you can copy and paste. Choose bold, cursive, gothic, and decorative styles for bios, usernames, comments, and posts."
          );
        },
      })
      .on('meta[property="og:url"]', {
        element(el) {
          el.setAttribute("content", "https://ultratextgen.com/");
        },
      })
      .on('meta[name="twitter:title"]', {
        element(el) {
          el.setAttribute(
            "content",
            "Stylish Text Generator \u2014 Copy & Paste Fancy Unicode Fonts"
          );
        },
      })
      .on('meta[name="twitter:description"]', {
        element(el) {
          el.setAttribute(
            "content",
            "Turn plain text into stylish Unicode fonts you can copy and paste. Choose bold, cursive, gothic, and decorative styles for bios, usernames, comments, and posts."
          );
        },
      })
      .transform(cleanResponse);
  }

  // All other routes proceed normally
  return context.next();
}
