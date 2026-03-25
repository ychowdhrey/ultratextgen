export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Only intercept the homepage — let all other paths pass through
  if (url.pathname === "/") {
    // Build a clean request for /index.html WITHOUT the Accept-Language
    // header.  Cloudflare Pages' automatic i18n routing uses that header
    // to redirect / → /fr/ (or another locale).  Stripping it forces the
    // ASSETS binding to return the root /index.html content directly.
    const headers = new Headers(context.request.headers);
    headers.delete("Accept-Language");

    return context.env.ASSETS.fetch(
      new Request(new URL("/index.html", url.origin), {
        method: context.request.method,
        headers,
      })
    );
  }

  // All other routes proceed normally
  return context.next();
}
