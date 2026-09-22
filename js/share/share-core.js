/* =====================================================================
   share-core.js — the site's one Share / Share-as-image implementation.

   Lifted verbatim out of script.js (2026-09-05) so that any surface which
   lets a user COPY something can also let them SHARE it, without dragging
   in the 120KB generator UI. script.js kept this code private for months
   while its own comments promised reuse ("Exposed on the shared
   UltraTextGen namespace so specialized generators can reuse the same
   mechanism later without rebuilding it") — the only way a second page
   could take it up was to load script.js headless, which is why 36 of the
   site's 37 clipboard-writing modules never did.

   Load order: anywhere, defer is fine, before or after its callers. The
   delegated document-level handlers below mean a caller only has to put
   the buttons in the DOM; it never wires a click itself.

   Depends on nothing but the DOM. Reads window.UTG_I18N when present (see
   i18n.js) so runtime-injected buttons speak the page's language; falls
   back to English when it is absent, exactly as script.js did.
   ===================================================================== */
(function () {
  "use strict";

  const UTG = (window.UltraTextGen = window.UltraTextGen || {});

  // Defensive: if some page still loads an older script.js that defines the
  // share core itself, let that one win rather than registering a second set
  // of delegated click handlers (which would fire every share twice).
  if (UTG.shareCreation) return;

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);

  // The ?style= param name, shared by buildShareUrl and the incoming-link
  // reader below. Kept here because both halves must agree on it.
  const SHARE_STYLE_PARAM = "style";

  // Read a nested window.UTG_I18N.ui.<dot.path> value, falling back to the
  // English string passed in. i18n.js populates that object asynchronously,
  // so callers that build buttons early re-read on "utg:i18nready".
  function uiText(path, fallback) {
    const i18n = window.UTG_I18N;
    if (!i18n || !i18n.ui) return fallback;
    const val = path.split(".").reduce((acc, key) => (acc != null ? acc[key] : undefined), i18n.ui);
    return val != null ? val : fallback;
  }
  UTG.shareUiText = uiText;

  // The generator's input, when this page has one. Library and symbol pages
  // have no #mainInput at all, so every read is guarded — a share from a page
  // with no text input simply carries no ?q=.
  function mainInputValue() {
    const input = document.getElementById("mainInput");
    return input ? input.value : "";
  }

  // Turn a creation (input + style) into a shareable URL and hand it to the
  // browser's native share sheet, falling back to copying the link. Exposed on
  // the shared UltraTextGen namespace so specialized generators can reuse the
  // same mechanism later without rebuilding it: callers (result cards today)
  // provide the creation state; this owns the act of sharing. Only `q` and
  // `style` go into the URL — the same params init() restores from.
  UTG.buildShareUrl = function (creation) {
    const c = creation || {};
    const params = new URLSearchParams();
    if (c.input) params.set("q", c.input);
    if (c.styleId) params.set(SHARE_STYLE_PARAM, c.styleId);
    // Page-specific state (a layout, a mode, a repeat count) — each generator
    // names its own params; this core stays agnostic about what they mean.
    const extra = c.params && typeof c.params === "object" ? c.params : null;
    if (extra) {
      Object.keys(extra).forEach((key) => {
        const val = extra[key];
        if (val !== null && val !== undefined && val !== "") params.set(key, String(val));
      });
    }
    const qs = params.toString();
    return window.location.origin + window.location.pathname + (qs ? "?" + qs : "");
  };

  /* share_text fires on the OUTCOME, never on the intent (2026-09-13).
     Every push below used to run BEFORE the await, so a visitor who opened
     the native sheet and closed it again was counted as a share, and
     share_method recorded which API existed rather than what happened. That
     made the one metric register #69 exists to read structurally unable to
     answer "did anyone share": the number was "how many people clicked",
     inflated by every cancel.

     A cancel now pushes nothing. share_method is the completed outcome:
     native | link_copy | image | image_download | pinterest.

     Anyone comparing a series across 2026-09-13 must treat it as a
     definition change, not a traffic change -- counts after this date are
     strictly lower for the same behaviour.

     share_destination (2026-09-19) answers the question share_method cannot.
     share_method is HOW the text left the page; the destination is WHERE it
     went, and the two are only accidentally one-to-one today. The moment an
     explicit platform button exists -- a WhatsApp link, a Reddit submit link
     -- it shares a method with the copy-link path and differs precisely in
     the field being added here, which is why the call site states it rather
     than having it inferred from the method.

     locale is derived exactly the way script.js derives it for generate_text
     (two-letter, so a zh-TW page reports zh), so the one GA4 `locale`
     dimension means one thing across both events. header.js's
     cta_source_locale is a separate, differently-named field and keeps the
     full tag. */

  /* native_share is DELIBERATELY OPAQUE and must stay that way. The Web
     Share API never tells the page which app the user picked -- the sheet
     belongs to the OS, not to us -- so a guessed destination would be a
     fabricated dimension, and a fabricated one is worse than an honest
     unknown because it reads as measured. */
  const SHARE_DESTINATIONS = {
    NATIVE: "native_share",
    CLIPBOARD: "clipboard",   // the copy-link path, however it was labelled
    DOWNLOAD: "download",     // an image saved to the device: no share target
    PINTEREST: "pinterest",
    // Defined, not yet used: no explicit platform share button exists on this
    // site today (audited 2026-09-19 -- the only platform-named links in the
    // tree are mailto: contact addresses). They are named here so the first
    // one built takes the spelling this vocabulary already has, instead of
    // inventing "Twitter", "tg" or "mail" at the call site.
    WHATSAPP: "whatsapp",
    FACEBOOK: "facebook",
    TELEGRAM: "telegram",
    X: "x",
    REDDIT: "reddit",
    EMAIL: "email"
  };
  UTG.SHARE_DESTINATIONS = SHARE_DESTINATIONS;

  /* Every method in use today has one honest destination, so an omitted one
     is derived rather than left undefined. This is a floor for the exported
     UTG.pushShare (which shipped as `(method, creation)` on 2026-09-13 and
     is on a public namespace), never a substitute for stating it: a platform
     button's destination is exactly the thing this map cannot know. */
  const DESTINATION_FOR_METHOD = {
    native: SHARE_DESTINATIONS.NATIVE,
    link_copy: SHARE_DESTINATIONS.CLIPBOARD,
    image: SHARE_DESTINATIONS.NATIVE,
    image_download: SHARE_DESTINATIONS.DOWNLOAD,
    pinterest: SHARE_DESTINATIONS.PINTEREST
  };

  // Read lazily rather than cached at load: costs nothing on a click, and
  // cannot be wrong if this module is ever evaluated before <html lang> is
  // settled on some future surface.
  function pageLocale() {
    const el = document.documentElement;
    return String((el && el.lang) || "en").slice(0, 2).toLowerCase();
  }

  //   pushShare(method, destination, creation)
  //   pushShare(method, creation)            <- the 2026-09-13 shape, still valid
  function pushShare(method, destination, c) {
    if (destination && typeof destination === "object") { c = destination; destination = null; }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "share_text",
      locale: pageLocale(),
      share_method: method,
      share_destination: destination || DESTINATION_FOR_METHOD[method] || null,
      share_surface: (c && c.surface) || "generator",
      share_item_type: (c && c.itemType) || "style"
    });
  }
  UTG.pushShare = pushShare;

  /* Can this browser hand a FILE to the OS share sheet? On Android and iOS
     yes, and that sheet is where Instagram, Facebook, WhatsApp and Messages
     actually live -- it is the reason those targets need no buttons of their
     own. On desktop Chrome the API exists but files are usually refused, and
     in Firefox and most desktop Safari navigator.share is absent entirely, so
     "Share as image" silently degrades to a download. A caller that already
     offers a download (every printables sheet has its own Download PNG) can
     use this to leave the button out rather than ship two spellings of the
     same action. Probed with a real one-byte File, because navigator.canShare
     without arguments answers a different question. */
  let canShareFilesCache = null;
  UTG.canShareFiles = function () {
    if (canShareFilesCache !== null) return canShareFilesCache;
    canShareFilesCache = false;
    try {
      if (navigator.canShare && typeof File === "function") {
        canShareFilesCache = navigator.canShare({ files: [new File(["0"], "probe.png", { type: "image/png" })] });
      }
    } catch (err) { canShareFilesCache = false; }
    return canShareFilesCache;
  };

  // creation: { input, output, styleId, title, url? } — url wins when given.
  // Resolves to "native" | "aborted" | "copied" | "failed" so the caller owns
  // its own button feedback.
  UTG.shareCreation = async function (creation) {
    const c = creation || {};
    const url = c.url || UTG.buildShareUrl(c);

    if (navigator.share) {
      try {
        const payload = { title: c.title || document.title, url };
        // The styled output itself rides along where the share target shows
        // text — the recipient sees the creation, not just a bare link.
        if (c.output) payload.text = c.output;
        await navigator.share(payload);
        pushShare("native", SHARE_DESTINATIONS.NATIVE, c);
        return "native";
      } catch (err) {
        if (err && err.name === "AbortError") return "aborted"; // user closed the sheet: not a share
        // Any other native failure falls through to the link-copy fallback.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      pushShare("link_copy", SHARE_DESTINATIONS.CLIPBOARD, c);
      return "copied";
    } catch (err) {
      console.error("Share failed:", err);
      return "failed";
    }
  };

  // One share icon, used by both the main generator's card template and the
  // buildShareButton factory below, so the two can never drift apart.
  const SHARE_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342a3 3 0 100-2.684m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684m0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684"/></svg>';

  // Copy gets an icon too, so the three card actions read as one family
  // (Save already carries its star). Same outline style as the share icon.
  const COPY_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>';

  // Give any .copy-btn the icon + label-span structure. Idempotent, and safe
  // for buttons built elsewhere with plain textContent (the specialized
  // controllers call this on theirs). The label lives in its own span so the
  // copied/failed state swaps can update the text without destroying the
  // icon — the old whole-button textContent swap silently deleted the ↵
  // keyboard hint after the first copy.
  UTG.decorateCopyButton = function (btn) {
    if (!btn || $(".copy-label", btn)) return btn;
    const text = btn.textContent;
    btn.innerHTML = COPY_ICON_SVG + '<span class="copy-label"></span>';
    $(".copy-label", btn).textContent = text;
    return btn;
  };

  // Build a result Share button for any page that follows the
  // .style-card / .copy-btn contract. The specialized generators (vertical,
  // scroll, repeat, tattoo) build cards in their own controllers, so they call
  // this instead of hand-rolling the markup — one class, one icon, one label.
  //   opts: { styleId, name, input, text, params, disabled }
  // `input` and `text` may be omitted when the page uses #mainInput and a
  // sibling .copy-btn — the delegated handler reads both from the DOM.
  UTG.buildShareButton = function (opts) {
    const o = opts || {};
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "share-result-btn";
    if (o.styleId) btn.dataset.shareId = String(o.styleId);
    if (o.input != null) btn.dataset.shareQ = String(o.input);
    if (o.text != null) btn.dataset.shareText = String(o.text);
    if (o.url) btn.dataset.shareUrl = String(o.url);
    if (o.surface) btn.dataset.shareSurface = String(o.surface);
    if (o.itemType) btn.dataset.shareItemType = String(o.itemType);
    // A caller that owns its own translations passes them in. Pages that do
    // not load i18n.js (every library and symbol page — a 30KB locale fetch
    // to read five strings is not a trade worth making there) would otherwise
    // get an English "Share" sitting under localized prose, which is the exact
    // defect i18n.js's own comment records for the shadow locales.
    if (o.label) btn.dataset.shareLabel = String(o.label);
    if (o.params && typeof o.params === "object") {
      try {
        btn.dataset.shareParams = JSON.stringify(o.params);
      } catch (err) {
        /* non-serializable state — share still works, minus the extra params */
      }
    }
    if (o.disabled) btn.disabled = true;
    btn.title = uiText("shareResult.title", "Share this result — the link opens with your text in this style");
    btn.setAttribute("aria-label",
      uiText("shareResult.ariaLabel", "Share {style} result").replace("{style}", o.name || ""));
    btn.innerHTML = SHARE_ICON_SVG + '<span class="share-result-label"></span>';
    const label = $(".share-result-label", btn);
    if (label) label.textContent = o.label || uiText("shareResult.label", "Share");
    if (o.title) btn.title = o.title;
    return btn;
  };

  // Picture-frame icon for the image-share button — same 13px outline family
  // as the share and copy icons above.
  const IMAGE_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
  const CHECK_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';

  // Draw a creation onto a branded square card. Everything here is native
  // Canvas in the recipient... the *sharer's* browser — the client-side-only
  // hard line for visual output, applied to sharing. The card is the one
  // asset that survives surfaces where pasted Unicode gets normalized or
  // filtered (story text overlays, some chat pipelines) — especially zalgo,
  // whose combining marks are exactly what those pipelines strip.
  UTG.renderCreationImage = function (creation) {
    const c = creation || {};
    const text = String(c.output || "").trim();
    if (!text) return null;

    const SIZE = 1080;
    const PAD = 120;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Panel: off-white ground, faint dot grid, brand gradient bar up top.
    ctx.fillStyle = "#faf9f7";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "rgba(99, 102, 241, 0.10)";
    for (let y = 60; y < SIZE; y += 48) {
      for (let x = 60; x < SIZE; x += 48) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const grad = ctx.createLinearGradient(0, 0, SIZE, 0);
    grad.addColorStop(0, "#7c3aed");
    grad.addColorStop(1, "#2563eb");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, 14);

    // Combining-mark-heavy text (zalgo) needs tall lines and head/footroom so
    // the stacks don't collide with the frame; everything else sits tighter.
    // A Thai cascade (the zalgo page's Thai Cascade mode: one tone mark
    // U+0E48..U+0E4B repeated on one carrier) is the tallest thing the site
    // makes and is not in the classic blocks. It is matched as a REPEAT, so
    // ordinary Thai text (one tone mark per consonant) keeps the tight lines.
    const marky = /[\u0300-\u036f\u0483-\u0489\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/.test(text) ||
      /([\u0e48-\u0e4b])\1/.test(text);
    const lineFactor = marky ? 2.6 : 1.35;
    const family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif';
    const maxW = SIZE - PAD * 2;
    const maxH = SIZE - PAD * 2 - 90; // reserve the cred line's band

    // Fit: shrink until the wrapped block fits both axes. Wrapping is
    // word-first with a raw-slice fallback for unbroken runs (usernames).
    let fontSize = 120;
    let lines = [];
    while (fontSize >= 26) {
      ctx.font = fontSize + "px " + family;
      lines = [];
      const paragraphs = text.split("\n");
      for (const para of paragraphs) {
        let line = "";
        for (const word of para.split(" ")) {
          const probe = line ? line + " " + word : word;
          if (ctx.measureText(probe).width <= maxW) {
            line = probe;
          } else {
            if (line) lines.push(line);
            if (ctx.measureText(word).width <= maxW) {
              line = word;
            } else {
              let chunk = "";
              for (const ch of word) {
                if (ctx.measureText(chunk + ch).width > maxW && chunk) {
                  lines.push(chunk);
                  chunk = ch;
                } else {
                  chunk += ch;
                }
              }
              line = chunk;
            }
          }
        }
        lines.push(line);
      }
      if (lines.length * fontSize * lineFactor <= maxH || fontSize === 26) break;
      fontSize -= 6;
    }

    ctx.fillStyle = "#1a1d27";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const blockH = lines.length * fontSize * lineFactor;
    let y = (SIZE - 90) / 2 - blockH / 2 + (fontSize * lineFactor) / 2;
    for (const line of lines) {
      ctx.fillText(line, SIZE / 2, y);
      y += fontSize * lineFactor;
    }

    // Style caption + cred line. The cred sits on the card, never in the
    // copied Unicode — the no-watermark promise governs copied text only.
    if (c.name) {
      ctx.font = '28px ' + family;
      ctx.fillStyle = "#6b7280";
      ctx.fillText(String(c.name), SIZE / 2, SIZE - 118);
    }
    ctx.font = '30px ' + family;
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("ultratextgen.com", SIZE / 2, SIZE - 64);
    return canvas;
  };

  // Share the creation as a PNG file via the native sheet, falling back to a
  // plain download. Resolves "image" | "image_download" | "aborted" | "failed"
  // so the caller owns its button feedback, mirroring shareCreation above.
  UTG.shareCreationAsImage = async function (creation) {
    const c = creation || {};
    const canvas = UTG.renderCreationImage(c);
    if (!canvas) return "failed";

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return "failed";
    const fileName = "ultratextgen-" + (String(c.styleId || "text").replace(/[^a-z0-9-]/gi, "") || "text") + ".png";
    const file = new File([blob], fileName, { type: "image/png" });

    const canShareFiles = !!(navigator.canShare && navigator.canShare({ files: [file] }));

    if (canShareFiles) {
      try {
        // The link rides along as text so the recipient can still open the
        // generator; targets that take files-only simply drop it.
        await navigator.share({
          files: [file],
          title: c.title || document.title,
          text: c.url || UTG.buildShareUrl(c)
        });
        pushShare("image", SHARE_DESTINATIONS.NATIVE, c);
        return "image";
      } catch (err) {
        if (err && err.name === "AbortError") return "aborted";
        // fall through to download
      }
    }
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      pushShare("image_download", SHARE_DESTINATIONS.DOWNLOAD, c);
      return "image_download";
    } catch (err) {
      console.error("Image share failed:", err);
      return "failed";
    }
  };

  // Square icon-only companion to the Share button — same datasets, so the
  // delegated handler reads identical creation state from either.
  UTG.buildShareImageButton = function (opts) {
    const o = opts || {};
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "share-image-btn";
    if (o.styleId) btn.dataset.shareId = String(o.styleId);
    if (o.input != null) btn.dataset.shareQ = String(o.input);
    if (o.text != null) btn.dataset.shareText = String(o.text);
    if (o.url) btn.dataset.shareUrl = String(o.url);
    if (o.surface) btn.dataset.shareSurface = String(o.surface);
    if (o.itemType) btn.dataset.shareItemType = String(o.itemType);
    // A caller that owns its own translations passes them in. Pages that do
    // not load i18n.js (every library and symbol page — a 30KB locale fetch
    // to read five strings is not a trade worth making there) would otherwise
    // get an English "Share" sitting under localized prose, which is the exact
    // defect i18n.js's own comment records for the shadow locales.
    if (o.label) btn.dataset.shareLabel = String(o.label);
    if (o.name) btn.dataset.shareName = String(o.name);
    if (o.params && typeof o.params === "object") {
      try { btn.dataset.shareParams = JSON.stringify(o.params); } catch (err) { /* share works without extras */ }
    }
    if (o.disabled) btn.disabled = true;
    btn.title = o.imageTitle || uiText("shareResult.imageTitle", "Share as an image");
    btn.setAttribute("aria-label",
      o.imageTitle
        ? o.imageTitle + (o.name ? ": " + o.name : "")
        : uiText("shareResult.imageAriaLabel", "Share {style} result as an image").replace("{style}", o.name || ""));
    btn.innerHTML = IMAGE_ICON_SVG;
    return btn;
  };

  // The Share-link + Share-image pair every result card carries. Specialized
  // controllers append this instead of composing the two buttons themselves.
  // The card templates in script.js build their markup as one innerHTML
  // string, so they need the icons as values rather than as built elements.
  // Published here because this module is now their only definition.
  // Pinterest is the one share target that is a real destination rather than
  // an OS sheet, so it is the one that carries a brand mark. Facebook and
  // Instagram deliberately get none: those go through navigator.share, which
  // lists whatever the visitor actually has installed, and a logo on a button
  // that may not reach that app is a promise the button cannot keep.
  const PINTEREST_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.97 1.172-4.97s-.299-.6-.299-1.486c0-1.39.806-2.428 1.81-2.428.853 0 1.265.64 1.265 1.408 0 .858-.546 2.14-.828 3.33-.236.995.5 1.807 1.48 1.807 1.778 0 3.144-1.874 3.144-4.58 0-2.394-1.72-4.068-4.177-4.068-2.845 0-4.515 2.134-4.515 4.34 0 .859.331 1.78.744 2.281a.3.3 0 01.07.288c-.076.316-.245.995-.278 1.134-.044.183-.145.222-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.472 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.966-.526-2.292-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>';

  UTG.icons = { share: SHARE_ICON_SVG, copy: COPY_ICON_SVG, image: IMAGE_ICON_SVG, check: CHECK_ICON_SVG, pinterest: PINTEREST_ICON_SVG };

  UTG.buildShareActions = function (opts) {
    const row = document.createElement("div");
    row.className = "result-share-row";
    row.appendChild(UTG.buildShareButton(opts));
    row.appendChild(UTG.buildShareImageButton(opts));
    return row;
  };

  // Share a rendered image file through the native share sheet (WhatsApp,
  // Messages, a teacher group) with a link riding along as text, falling
  // back to a plain download where files cannot be shared. Lifted out of
  // printablesEngine.js on 2026-09-10 so the monogram and cross-stitch
  // engines share one implementation and one share_text shape.
  //   opts: { filename, title, text, surface, itemType }
  // Resolves to "native" | "aborted" | "downloaded".
  UTG.shareImageBlob = async function (blob, opts) {
    const o = opts || {};
    const filename = o.filename || "share.png";
    const file = new File([blob], filename, { type: blob.type || "image/png" });
    const canShareFiles = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    if (canShareFiles) {
      try {
        const payload = { files: [file], title: o.title || document.title };
        if (o.text) payload.text = o.text;
        await navigator.share(payload);
        pushShare("image", SHARE_DESTINATIONS.NATIVE, o);
        return "native";
      } catch (err) {
        if (err && err.name === "AbortError") return "aborted";
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    pushShare("image_download", SHARE_DESTINATIONS.DOWNLOAD, o);
    return "downloaded";
  };

  // A small transient message (link copied, PDF saved). One element per
  // page, reused; the class is the printables toast so the look is shared.
  let toastTimer = null;
  UTG.showToast = function (msg) {
    let t = document.getElementById("utg-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "utg-toast";
      t.className = "pt-toast";
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-visible"), 2600);
  };

  // A Share / Share-as-image / Copy-link / Save-to-Pinterest row for a
  // surface whose creation is a URL rather than a styled string (the
  // printables: a sheet is its preset link). Labels come from the caller,
  // which owns the page's translations, same as buildShareButton.
  //   opts: { className, buttonClass, url: () => string, title,
  //           surface, itemType,
  //           labels: { share, shareImage, copyLink, linkCopied, pinterest },
  //           onShareImage?: () => void,   // omitted: no image button
  //           pinMedia?: () => string,     // omitted: no Pinterest button
  //           onShared?: (result) => void }
  UTG.buildShareRow = function (opts) {
    const o = opts || {};
    const L = o.labels || {};
    const surface = o.surface || "generator";
    const itemType = o.itemType || "style";
    const urlOf = () => (typeof o.url === "function" ? o.url() : (o.url || window.location.href));
    const titleOf = () => (typeof o.title === "function" ? o.title() : (o.title || document.title));
    /* A pin's description is read by people browsing Pinterest, not by someone
       looking at a browser tab, so the brand suffix every <title> on this site
       carries (" | UltraTextGen", in all 30 locales) is spent characters. The
       page's own meta description is purpose-written for exactly this job and
       already translated, so it is preferred and nothing is authored here; the
       de-suffixed title is the fallback for a page without one.

       Scoped to the PIN. A native share sheet shows the title next to the link
       and the full one is right there. */
    const pinDescriptionOf = () => {
      if (o.pinDescription) return typeof o.pinDescription === "function" ? o.pinDescription() : o.pinDescription;
      const meta = document.querySelector('meta[name="description"]');
      const desc = meta && (meta.getAttribute("content") || "").trim();
      if (desc) return desc;
      // Only a trailing " | <brand>" segment, never an interior pipe.
      return String(titleOf()).replace(/\s*\|\s*[^|]*$/, "").trim() || titleOf();
    };
    const cls = o.buttonClass || "bubble-btn pt-share-btn";
    // Icon + label, never a bare string: four equal-weight text buttons read
    // as a wall and outshouted the sheet's own Print button. The icons are
    // the inline SVGs above, never emoji -- this site has already shipped
    // tofu from an emoji glyph (U+1F5BC, swapped for the camera on the
    // preview modal, 2026-09-10) and a share row is not the place to repeat it.
    const mk = (icon, text, onClick, title) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = cls;
      b.innerHTML = icon + '<span class="pt-share-label"></span>';
      b.querySelector(".pt-share-label").textContent = text;
      if (title) b.title = title;
      b.addEventListener("click", onClick);
      return b;
    };
    const row = document.createElement("div");
    row.className = o.className || "result-share-row";

    /* One button, not two. navigator.share opens the OS sheet -- which is
       already the dropdown, and already contains Instagram, Facebook,
       WhatsApp and Messages -- and falls back to copying the link where the
       API is absent (Firefox, most desktop Safari). "Share" and "Copy link"
       were therefore the SAME action on desktop, shipped as two buttons with
       one silent toast between them. The button now says which one it is
       before it is pressed. (Audit 2026-09-13, question e.) */
    const canNativeShare = !!navigator.share;
    row.appendChild(mk(
      canNativeShare ? SHARE_ICON_SVG : COPY_ICON_SVG,
      canNativeShare
        ? (L.share || uiText("shareResult.label", "Share"))
        : (L.copyLink || "Copy link"),
      async () => {
        const r = await UTG.shareCreation({ url: urlOf(), title: titleOf(), surface, itemType });
        if (r === "copied" && L.linkCopied) UTG.showToast(L.linkCopied);
        if (o.onShared) o.onShared(r);
      }
    ));

    if (o.onShareImage) {
      row.appendChild(mk(
        IMAGE_ICON_SVG,
        L.shareImage || uiText("shareResult.imageTitle", "Share as an image"),
        () => { o.onShareImage(); }
      ));
    }

    if (o.pinMedia) {
      const pin = document.createElement("a");
      pin.className = cls + " pt-pin-btn";
      pin.innerHTML = PINTEREST_ICON_SVG + '<span class="pt-share-label"></span>';
      pin.querySelector(".pt-share-label").textContent = L.pinterest || "Save to Pinterest";
      pin.href = "https://www.pinterest.com/";
      pin.target = "_blank"; pin.rel = "noopener";
      pin.addEventListener("click", () => {
        pin.href = "https://www.pinterest.com/pin/create/button/?url=" + encodeURIComponent(urlOf()) +
          "&media=" + encodeURIComponent(o.pinMedia() || "") + "&description=" + encodeURIComponent(pinDescriptionOf());
        pushShare("pinterest", SHARE_DESTINATIONS.PINTEREST, { surface: surface, itemType: itemType });
        if (o.onShared) o.onShared("pinterest");
      });
      row.appendChild(pin);
    }
    return row;
  };

  // The ?style= value this page was opened with, normalized. Only ever
  // compared against ids the page itself produced — never rendered.
  let sharedStyleId = null;
  try {
    const rawSharedStyle = new URLSearchParams(window.location.search).get(SHARE_STYLE_PARAM);
    if (rawSharedStyle) sharedStyleId = String(rawSharedStyle).toLowerCase().replace(/_/g, "-");
  } catch (err) {
    /* malformed query string — behave as if no style was shared */
  }
  UTG.sharedStyleId = function () { return sharedStyleId; };

  // Emphasize a card if it is the one a ?style= link points at. Returns whether
  // it matched, so a caller can scroll to it or count matches.
  UTG.markSharedCard = function (card, styleId) {
    if (!card || !styleId || !sharedStyleId) return false;
    // Normalize the same way sharedStyleId was (a handful of registry slugs
    // use underscores, and the URL param arrives normalized to dashes).
    if (String(styleId).toLowerCase().replace(/_/g, "-") !== sharedStyleId) return false;
    card.classList.add("is-shared");
    const nameEl = $(".style-name", card);
    if (nameEl && !$(".shared-style-tag", nameEl)) {
      const tag = document.createElement("span");
      tag.className = "style-tag shared-style-tag";
      tag.textContent = uiText("shareResult.sharedTag", "Shared style");
      nameEl.appendChild(tag);
    }
    return true;
  };

  // First time the shared card lands in a grid, bring it into view and pulse
  // it once. Afterwards it keeps only the standing is-shared border while the
  // recipient browses normally.
  let sharedCardRevealed = false;
  UTG.revealSharedCard = function (grid) {
    if (!sharedStyleId || sharedCardRevealed || !grid) return;
    const card = $(".style-card.is-shared", grid);
    if (!card) return;
    sharedCardRevealed = true;
    setTimeout(() => {
      // A rerender (e.g. the async i18n pass) can replace the grid before this
      // fires — release the flag so the next render retries the reveal.
      if (!card.isConnected) {
        sharedCardRevealed = false;
        return;
      }
      const rect = card.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const fullyVisible = rect.top >= 0 && rect.bottom <= viewportH;
      if (!fullyVisible && card.scrollIntoView) {
        card.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      card.classList.add("shared-reveal");
      setTimeout(() => card.classList.remove("shared-reveal"), 2400);
    }, 150);
  };
document.addEventListener("click", async (e) => {
  const btn = e.target.closest ? e.target.closest(".share-result-btn") : null;
  if (!btn || btn.disabled) return;

  // Generic across every generator on the site: the creation state is read
  // from the card itself (its own .copy-btn already holds the exact text the
  // user would paste, so Share and Copy can never disagree), plus whatever
  // page state the builder stamped onto the button.
  const card = btn.closest ? btn.closest(".style-card") : null;
  const copyBtn = card ? $(".copy-btn", card) : null;
  const output = btn.dataset.shareText || (copyBtn ? copyBtn.dataset.text : "") || "";
  const input = btn.dataset.shareQ != null
    ? btn.dataset.shareQ
    : mainInputValue();

  let params = null;
  if (btn.dataset.shareParams) {
    try {
      params = JSON.parse(btn.dataset.shareParams);
    } catch (err) {
      params = null; // malformed state — share the input + style alone
    }
  }

  const outcome = await UTG.shareCreation({
    input,
    output,
    styleId: btn.dataset.shareId || "",
    params,
    // Pages that maintain their own live URL state (zalgo) stamp the exact
    // link to share; everyone else lets buildShareUrl compose ?q=&style=.
    url: btn.dataset.shareUrl || undefined,
    title: document.title,
    surface: surfaceOf(btn),
    itemType: btn.dataset.shareItemType || "style"
  });

  const label = $(".share-result-label", btn);
  if (outcome === "copied") {
    btn.classList.add("copied");
    if (label) label.textContent = uiText("shareResult.linkCopied", "Link copied");
    setTimeout(() => {
      btn.classList.remove("copied");
      if (label && label.isConnected) label.textContent = btn.dataset.shareLabel || uiText("shareResult.label", "Share");
    }, 1500);
  } else if (outcome === "failed") {
    btn.classList.add("share-error");
    if (label) label.textContent = uiText("copyButtons.failed", "✗ Failed");
    setTimeout(() => {
      btn.classList.remove("share-error");
      if (label && label.isConnected) label.textContent = btn.dataset.shareLabel || uiText("shareResult.label", "Share");
    }, 1500);
  }
});

// Image-share companion — same delegated pattern, same creation-state reads
// (the card's own .copy-btn text wins so the picture can never disagree with
// what Copy pastes). Feedback is icon-swap only: the button has no label.
document.addEventListener("click", async (e) => {
  const btn = e.target.closest ? e.target.closest(".share-image-btn") : null;
  if (!btn || btn.disabled || btn.classList.contains("share-image-busy")) return;

  const card = btn.closest ? btn.closest(".style-card") : null;
  const copyBtn = card ? $(".copy-btn", card) : null;
  const output = btn.dataset.shareText || (copyBtn ? copyBtn.dataset.text : "") || "";
  const input = btn.dataset.shareQ != null
    ? btn.dataset.shareQ
    : mainInputValue();

  let params = null;
  if (btn.dataset.shareParams) {
    try { params = JSON.parse(btn.dataset.shareParams); } catch (err) { params = null; }
  }

  const name = btn.dataset.shareName
    || (card && $(".style-name", card) ? $(".style-name", card).textContent : "");

  btn.classList.add("share-image-busy");
  const outcome = await UTG.shareCreationAsImage({
    input,
    output,
    styleId: btn.dataset.shareId || "",
    name,
    params,
    url: btn.dataset.shareUrl || undefined,
    title: document.title,
    surface: surfaceOf(btn),
    itemType: btn.dataset.shareItemType || "style"
  });
  btn.classList.remove("share-image-busy");

  if (outcome === "image" || outcome === "image_download") {
    btn.classList.add("copied");
    btn.innerHTML = CHECK_ICON_SVG;
    const doneTitle = uiText("shareResult.imageSaved", "Image ready");
    const oldTitle = btn.title;
    btn.title = doneTitle;
    setTimeout(() => {
      if (!btn.isConnected) return;
      btn.classList.remove("copied");
      btn.innerHTML = IMAGE_ICON_SVG;
      btn.title = oldTitle;
    }, 1500);
  } else if (outcome === "failed") {
    btn.classList.add("share-error");
    setTimeout(() => btn.classList.remove("share-error"), 1500);
  }
});

  /* ===================
     SURFACE LABELLING (analytics)
     =================== */
  // share_text used to say only "native | link_copy | image | image_download".
  // With the same buttons now on library, symbol and generator pages, the
  // method alone cannot answer "which surface did sharing actually work on",
  // which is the whole question this rollout exists to settle. Callers stamp
  // data-share-surface on the button; the handlers below forward it.
  function surfaceOf(btn) {
    return (btn && btn.dataset.shareSurface) || "generator";
  }

  // Indent-preserving re-read of every label this module injected, for when
  // i18n.js's locale fetch resolves after the buttons were already built.
  function relabel() {
    document.querySelectorAll(".share-result-btn").forEach((btn) => {
      // A button whose host supplied its own label owns it; re-reading
      // window.UTG_I18N here would overwrite a correct translation with the
      // English fallback on exactly the pages that have no UTG_I18N.
      if (btn.dataset.shareLabel) return;
      const label = $(".share-result-label", btn);
      if (label && !btn.classList.contains("copied") && !btn.classList.contains("share-error")) {
        label.textContent = uiText("shareResult.label", "Share");
      }
      btn.title = uiText("shareResult.title", "Share this result — the link opens with your text in this style");
    });
    document.querySelectorAll(".share-image-btn").forEach((btn) => {
      if (btn.dataset.shareLabel) return; // host owns this button's strings
      if (!btn.classList.contains("copied")) {
        btn.title = uiText("shareResult.imageTitle", "Share as an image");
      }
    });
  }
  UTG.relabelShareButtons = relabel;
  document.addEventListener("utg:i18nready", relabel);
})();
