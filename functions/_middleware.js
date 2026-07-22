export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Only intercept the root homepage — let all other paths pass through.
  if (url.pathname !== "/") {
    return context.next();
  }

  // ── Fetch the English root page from ASSETS ─────────────────────────
  // Cloudflare Pages' ASSETS binding performs implicit i18n content
  // negotiation when locale subdirectories (fr/, de/, …) contain a file
  // with the same name as the requested file.  Requesting /index.html
  // can therefore return fr/index.html transparently.
  //
  // FIX: request /_root.html instead — a build-generated copy of the
  // English index.html that has NO locale variants (no fr/_root.html,
  // de/_root.html, etc.), so i18n content negotiation cannot activate.
  let response = await context.env.ASSETS.fetch(
    new Request(new URL("/_root.html", url.origin), {
      method: "GET",
    })
  );

  // If _root.html does not exist (e.g. build step was skipped), fall
  // back to /index.html with Accept-Language: en as a best effort.
  if (!response.ok) {
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
