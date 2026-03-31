// English metadata constants used by HTMLRewriter as a safety net.
// If _root.html is served correctly these are redundant, but they
// protect against edge cases where ASSETS still returns localized HTML.
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
  const outHeaders = new Headers(rewritten.headers);
  outHeaders.set("Cache-Control", "no-store");
  outHeaders.set("Vary", "Accept-Language");
  outHeaders.delete("Location");

  return new Response(rewritten.body, {
    status: 200,
    headers: outHeaders,
  });
}
