export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Only intercept the homepage — let all other paths pass through
  if (url.pathname === "/") {
    // Serve /index.html directly, bypassing Cloudflare's i18n auto-redirect
    return context.env.ASSETS.fetch(
      new Request(new URL("/index.html", url.origin), context.request)
    );
  }

  // All other routes proceed normally
  return context.next();
}
