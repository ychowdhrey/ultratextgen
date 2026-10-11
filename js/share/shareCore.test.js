/**
 * shareCore.test.js — node js/share/shareCore.test.js
 *
 * Assertions for share-core.js's analytics contract: that every share_text
 * row carries the six parameters GA4 reads, that share_destination says where
 * the share actually went, and that a row is pushed only on the branch that
 * SUCCEEDED.
 *
 * The fire-on-success rule shipped on 2026-09-13 and is asserted here rather
 * than assumed: it is invisible by construction — a cancelled share and a
 * completed one differ in no pixel, no gate reads a dataLayer, and the number
 * that comes out is wrong in the direction that looks like success. That is
 * exactly the shape that needs a test rather than a reading.
 *
 * Same idiom as js/saved/savedItems.test.js: no framework, no dependencies,
 * and the module is evaluated in a vm sandbox against DOM stubs. setTimeout is
 * a no-op here on purpose — nothing under test depends on a timer firing, and
 * a real one would hold the process open on showToast's 2.6s toast.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0;
const failures = [];

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n      expected ${e}\n      actual   ${a}`);
}
function ok(cond, label) { eq(!!cond, true, label); }

const SRC = fs.readFileSync(path.join(__dirname, 'share-core.js'), 'utf8');

/* ---- DOM stubs --------------------------------------------------------- */

function makeEl(tag) {
  const listeners = {};
  const classes = new Set();
  // buildShareRow writes innerHTML then immediately reads the label span back
  // out of it. Selectors resolve to a persistent stub per element, so that
  // round trip works and a test can identify a button by its label.
  const found = {};
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    children: [],
    dataset: {},
    style: {},
    className: '',
    textContent: '',
    innerHTML: '',
    href: '',
    title: '',
    type: '',
    disabled: false,
    hidden: false,
    isConnected: true,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c)
    },
    setAttribute(k, v) { el[k] = v; },
    getAttribute(k) { return el[k]; },
    appendChild(c) { el.children.push(c); return c; },
    removeChild(c) { el.children = el.children.filter((x) => x !== c); return c; },
    remove() {},
    insertAdjacentElement() {},
    insertAdjacentHTML() {},
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    /** Fire this element's own handlers, returning a promise so a test can
     *  await an async click handler (every share button has one). */
    click() { return Promise.all((listeners.click || []).map((fn) => fn({ target: el }))); },
    querySelector(sel) { return (found[sel] = found[sel] || makeEl('span')); },
    querySelectorAll() { return []; },
    closest() { return null; },
    getBoundingClientRect() { return { top: 0, bottom: 0 }; },
    focus() {}
  };
  /** The visible label buildShareRow stamped on this button. */
  el._label = () => (found['.pt-share-label'] ? found['.pt-share-label'].textContent : el.textContent);
  return el;
}

/**
 * Evaluate a fresh copy of share-core.js.
 *   opts.share      — a navigator.share stub, or null for a browser without it
 *   opts.canShare   — a navigator.canShare stub, or null
 *   opts.writeText  — a navigator.clipboard.writeText stub
 *   opts.lang       — the <html lang> the page carries
 */
function load(opts) {
  const o = opts || {};
  const dataLayer = [];
  const navigator = {
    clipboard: { writeText: o.writeText || (async () => {}) }
  };
  if (o.share) navigator.share = o.share;
  if (o.canShare) navigator.canShare = o.canShare;

  const document = {
    documentElement: { lang: o.lang || 'en' },
    title: 'Test Page',
    body: makeEl('body'),
    createElement: makeEl,
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    dispatchEvent() { return true; }
  };

  const win = {
    dataLayer,
    document,
    navigator,
    location: { origin: 'https://ultratextgen.com', pathname: '/', search: '' }
  };

  const sandbox = {
    window: win,
    document,
    navigator,
    URLSearchParams,
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    File: function File(parts, name, init) { this.name = name; this.type = (init && init.type) || ''; },
    Blob: function Blob() {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    console: { error() {}, warn() {}, log() {} }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  return { UTG: win.UltraTextGen, dataLayer, document };
}

/** An AbortError of the shape a browser throws when the sheet is dismissed. */
function abortError() {
  const e = new Error('Share canceled');
  e.name = 'AbortError';
  return e;
}

const REQUIRED_FIELDS = ['event', 'locale', 'share_method', 'share_destination',
  'share_surface', 'share_item_type'];

/** Every row carries the full parameter set — asserted on every scenario
 *  rather than once, so a field cannot go missing on one branch alone. */
function assertShape(row, label) {
  REQUIRED_FIELDS.forEach((f) => {
    ok(row && Object.prototype.hasOwnProperty.call(row, f) && row[f] !== undefined && row[f] !== null,
      `${label}: carries ${f}`);
  });
  eq(row && row.event, 'share_text', `${label}: is a share_text event`);
}

/* ---- the vocabulary ---------------------------------------------------- */

{
  const { UTG } = load({});
  const D = UTG.SHARE_DESTINATIONS;
  ok(D, 'the destination vocabulary is exported');
  eq(D.NATIVE, 'native_share', 'native share is share_destination "native_share"');
  eq(D.CLIPBOARD, 'clipboard', 'a copied link is share_destination "clipboard"');
  eq(D.PINTEREST, 'pinterest', 'Pinterest is share_destination "pinterest"');
  eq(D.DOWNLOAD, 'download', 'a saved image is share_destination "download"');
  // Named now so the first platform button built cannot invent a spelling.
  ['whatsapp', 'facebook', 'telegram', 'x', 'reddit', 'email'].forEach((v) => {
    ok(Object.keys(D).some((k) => D[k] === v), `the vocabulary reserves "${v}"`);
  });
  ok(typeof UTG.pushShare === 'function', 'the one writer stays exported for reuse');
}

/* ---- the exported writer, both call shapes ----------------------------- */

{
  const { UTG, dataLayer } = load({ lang: 'fr' });
  // The shape a platform button would use: destination stated, not inferred.
  UTG.pushShare('link_copy', UTG.SHARE_DESTINATIONS.WHATSAPP, { surface: 'guide', itemType: 'symbol' });
  assertShape(dataLayer[0], 'explicit destination');
  eq(dataLayer[0].share_destination, 'whatsapp', 'an explicitly named destination is used verbatim');
  eq(dataLayer[0].share_method, 'link_copy', 'and does not disturb share_method');
  eq(dataLayer[0].share_surface, 'guide', 'nor the surface');
  eq(dataLayer[0].locale, 'fr', 'nor the locale');

  // The 2026-09-13 two-argument shape, still valid on a public namespace.
  UTG.pushShare('native', { surface: 'library', itemType: 'collection' });
  assertShape(dataLayer[1], 'two-argument shape');
  eq(dataLayer[1].share_destination, 'native_share', 'an omitted destination is derived, never left undefined');
  eq(dataLayer[1].share_surface, 'library', 'and the creation is still read as the creation');
}

/* ---- native share: success -------------------------------------------- */

(async () => {

{
  let shared = null;
  const { UTG, dataLayer } = load({ share: async (p) => { shared = p; } });
  const out = await UTG.shareCreation({
    input: 'hi', output: '𝗵𝗶', styleId: 'bold', surface: 'library', itemType: 'symbol'
  });
  eq(out, 'native', 'a completed native share resolves "native"');
  eq(dataLayer.length, 1, 'a completed native share pushes exactly one row');
  assertShape(dataLayer[0], 'native share');
  eq(dataLayer[0].share_destination, 'native_share',
    'a completed native share records share_destination native_share');
  eq(dataLayer[0].share_method, 'native', 'and keeps share_method "native"');
  eq(dataLayer[0].share_surface, 'library', 'and the caller-stamped surface');
  eq(dataLayer[0].share_item_type, 'symbol', 'and the caller-stamped item type');
  ok(shared && shared.url.indexOf('q=hi') !== -1, 'the share payload is unchanged');
}

/* ---- native share: cancelled ------------------------------------------ */

{
  const { UTG, dataLayer } = load({ share: async () => { throw abortError(); } });
  const out = await UTG.shareCreation({ input: 'hi', output: '𝗵𝗶' });
  eq(out, 'aborted', 'closing the sheet resolves "aborted"');
  eq(dataLayer.length, 0, 'a cancelled native share pushes NO share_text row');
}

/* ---- clipboard fallback: no Web Share API ----------------------------- */

{
  let copied = null;
  const { UTG, dataLayer } = load({ writeText: async (t) => { copied = t; } });
  const out = await UTG.shareCreation({ input: 'hi', surface: 'symbol', itemType: 'collection' });
  eq(out, 'copied', 'a browser without navigator.share copies the link');
  eq(dataLayer.length, 1, 'and pushes one row');
  assertShape(dataLayer[0], 'clipboard fallback');
  eq(dataLayer[0].share_destination, 'clipboard',
    'a copied link records share_destination clipboard');
  eq(dataLayer[0].share_method, 'link_copy', 'and keeps share_method "link_copy"');
  ok(copied && copied.indexOf('q=hi') !== -1, 'the copied link is unchanged');
}

/* ---- clipboard fallback: the write fails ------------------------------ */

{
  const { UTG, dataLayer } = load({ writeText: async () => { throw new Error('denied'); } });
  const out = await UTG.shareCreation({ input: 'hi' });
  eq(out, 'failed', 'a denied clipboard resolves "failed"');
  eq(dataLayer.length, 0, 'and pushes NO share_text row');
}

/* ---- native share errors into the clipboard fallback ------------------ */

{
  const { UTG, dataLayer } = load({ share: async () => { throw new Error('NotAllowedError'); } });
  const out = await UTG.shareCreation({ input: 'hi' });
  eq(out, 'copied', 'a non-abort native failure falls through to the clipboard');
  eq(dataLayer.length, 1, 'and pushes one row, not two');
  eq(dataLayer[0].share_destination, 'clipboard', 'recorded as clipboard, not native_share');
  eq(dataLayer[0].share_method, 'link_copy', 'and as link_copy, not native');
}

/* ---- locale ------------------------------------------------------------ */

{
  const { UTG, dataLayer } = load({ writeText: async () => {}, lang: 'de' });
  await UTG.shareCreation({ input: 'hi' });
  eq(dataLayer[0].locale, 'de', 'locale comes from <html lang>');
}
{
  // Normalised exactly as script.js normalises it for generate_text, so the
  // one GA4 `locale` dimension means one thing across both events.
  const { UTG, dataLayer } = load({ writeText: async () => {}, lang: 'zh-TW' });
  await UTG.shareCreation({ input: 'hi' });
  eq(dataLayer[0].locale, 'zh', 'and is normalised the same way generate_text normalises it');
}

/* ---- share as image ---------------------------------------------------- */

function stubCanvas(UTG) {
  UTG.renderCreationImage = () => ({ toBlob: (cb) => cb({ type: 'image/png' }) });
}

{
  const { UTG, dataLayer } = load({ share: async () => {}, canShare: () => true });
  stubCanvas(UTG);
  const out = await UTG.shareCreationAsImage({ output: '𝗵𝗶', styleId: 'bold', surface: 'generator' });
  eq(out, 'image', 'a completed image share resolves "image"');
  eq(dataLayer.length, 1, 'and pushes one row');
  assertShape(dataLayer[0], 'image share');
  eq(dataLayer[0].share_destination, 'native_share',
    'an image shared through the sheet is native_share');
  eq(dataLayer[0].share_method, 'image', 'and keeps share_method "image"');
}

{
  const { UTG, dataLayer } = load({ share: async () => { throw abortError(); }, canShare: () => true });
  stubCanvas(UTG);
  const out = await UTG.shareCreationAsImage({ output: '𝗵𝗶' });
  eq(out, 'aborted', 'a cancelled image share resolves "aborted"');
  eq(dataLayer.length, 0, 'and pushes NO share_text row');
}

{
  // No file sharing: the PNG is downloaded instead. It reached no share
  // target, and the row says so rather than borrowing the native spelling.
  const { UTG, dataLayer } = load({});
  stubCanvas(UTG);
  const out = await UTG.shareCreationAsImage({ output: '𝗵𝗶', surface: 'printables', itemType: 'printable' });
  eq(out, 'image_download', 'with no file sharing the image downloads');
  eq(dataLayer.length, 1, 'and pushes one row');
  assertShape(dataLayer[0], 'image download');
  eq(dataLayer[0].share_destination, 'download',
    'a downloaded image is share_destination "download"');
  eq(dataLayer[0].share_method, 'image_download', 'and keeps share_method "image_download"');
}

/* ---- selection image: layout (2026-10-01) ------------------------------ */
/* The library "Select and share image" picture. Its content is only what the
   visitor picked, so the layout is the part that can go wrong silently: an
   item dropped to make the rest fit, or a reordered phrase. */

{
  const { UTG } = load({});
  const L = UTG.layoutSelection;
  ok(typeof L === 'function', 'layoutSelection is exported');
  const flat = (lay) => lay.lines.reduce((a, r) => a.concat(r), []);

  const one = L([1.2], { maxW: 860, maxH: 800, maxFont: 360 });
  eq(one.lines, [[0]], 'one item is one row');
  ok(one.fontSize >= 300, 'one emoji is drawn large (>= 300px on the 1080 card)');

  const three = L([1.2, 1.2, 1.2], { maxW: 860, maxH: 800 });
  eq(three.lines, [[0, 1, 2]], 'three emoji stay on one row, read as one phrase');

  const ten = L(new Array(10).fill(1.3), { maxW: 860, maxH: 800 });
  eq(ten.lines.map((r) => r.length), [5, 5], 'ten flags (ASEAN) sit as 5 + 5');
  const five = L(new Array(5).fill(1.27), { maxW: 860, maxH: 800 });
  eq(five.lines.map((r) => r.length), [3, 2], 'five emoji sit as 3 + 2, not a two-column stack');

  const seven = L([1, 1, 1, 1, 1, 1, 1], { maxW: 860, maxH: 800 });
  eq(flat(seven), [0, 1, 2, 3, 4, 5, 6], 'every item is kept, in the order chosen');
  const sizes = seven.lines.map((r) => r.length);
  ok(Math.max.apply(null, sizes) - Math.min.apply(null, sizes) <= 1, 'rows are balanced (no 6 + 1)');

  const fifty = L(new Array(50).fill(1.2), { maxW: 860, maxH: 800, minFont: 44 });
  ok(fifty.lines.length >= 6, 'fifty items fill the card as a block, not a thin band of long rows');
  ok(fifty.fontSize >= 65, 'and draw at 65px or more on the 1080 card');
  eq(flat(fifty).length, 50, 'fifty items: none dropped');
  ok(fifty.fits, 'fifty single emoji still fit legibly (>= 44px)');

  const wide = L(new Array(50).fill(9), { maxW: 860, maxH: 800, minFont: 44 });
  eq(flat(wide).length, 50, 'items too wide to fit are still all present in the layout');
  eq(wide.fits, false, 'and the layout says they do not fit, instead of shrinking them silently');

  eq(L([], {}).fits, false, 'an empty selection does not fit anything');
}

/* ---- shareImageBlob: the selection's opt-ins (2026-10-01) -------------- */

{
  let payload = null;
  const { UTG, dataLayer } = load({ share: async (p) => { payload = p; }, canShare: () => true });
  await UTG.shareImageBlob({ type: 'image/png' },
    { filename: 'x.png', surface: 'library_selection', itemType: 'selection', noTitle: true });
  ok(payload && !('title' in payload) && !('text' in payload),
    'noTitle sends the file alone: no page title arrives as if the visitor wrote it');
  eq(dataLayer[0].share_surface, 'library_selection', 'the selection is its own surface');
  eq(dataLayer[0].share_item_type, 'selection', 'and its own item type');
}

{
  let shared = false;
  const { UTG, dataLayer } = load({ share: async () => { shared = true; }, canShare: () => true });
  const out = await UTG.shareImageBlob({ type: 'image/png' }, { filename: 'x.png', mode: 'download' });
  eq(out, 'downloaded', 'mode "download" downloads');
  eq(shared, false, 'and never opens the share sheet');
  eq(dataLayer[0].share_method, 'image_download', 'recorded as a download');
}

{
  const err = new Error('nope'); err.name = 'NotAllowedError';
  const { UTG, dataLayer } = load({ share: async () => { throw err; }, canShare: () => true });
  const out = await UTG.shareImageBlob({ type: 'image/png' }, { filename: 'x.png', downloadOnError: false });
  eq(out, 'failed', 'downloadOnError:false resolves "failed" when the sheet errors');
  eq(dataLayer.length, 0, 'and records nothing: no download the visitor did not ask for');
}

{
  const err = new Error('nope'); err.name = 'NotAllowedError';
  const { UTG, dataLayer } = load({ share: async () => { throw err; }, canShare: () => true });
  const out = await UTG.shareImageBlob({ type: 'image/png' }, { filename: 'x.png' });
  eq(out, 'downloaded', 'without the opt-in an erroring sheet still falls back to a download (printables unchanged)');
  eq(dataLayer.length, 1, 'recorded once');
}

{
  const { UTG } = load({});
  const b = UTG.buildShareButton({ label: 'Share', icon: 'link' });
  ok(/M13\.828 10\.172/.test(b.innerHTML), 'icon "link" draws the link icon');
  eq(b.className, 'share-result-btn', 'and keeps the Share class, so the same delegated share runs');
  const plain = UTG.buildShareButton({ label: 'Share' });
  ok(!/M13\.828 10\.172/.test(plain.innerHTML), 'the default icon is unchanged');
}

{
  // A page that translates its own buttons (library/symbol pages, no i18n.js):
  // the accessible name and tooltip come from the visible label, never the
  // English fallback sentence (WCAG 2.5.3, label in name).
  const { UTG } = load({});
  const b = UTG.buildShareButton({ label: '공유', name: '이모티콘' });
  eq(b.getAttribute('aria-label'), '공유: 이모티콘', 'caller label + name is the accessible name');
  eq(b.title, '공유', 'and the tooltip is the visible label');
  const plain = UTG.buildShareButton({ name: 'Ultra Bold' });
  eq(plain.getAttribute('aria-label'), 'Share Ultra Bold result', 'without a caller label the i18n/English text is unchanged');
}

{
  // What the button says after it copies the link, or fails to, travels with the
  // button: library pages carry no i18n.js, so the fallback was English under
  // Korean prose.
  const { UTG } = load({});
  const b = UTG.buildShareButton({ label: '공유', linkCopied: '링크 복사됨', failedLabel: '✗ 실패' });
  eq(b.dataset.shareCopied, '링크 복사됨', 'the caller\'s "link copied" text rides on the button');
  eq(b.dataset.shareFailed, '✗ 실패', 'and so does its failure text');
  const plain = UTG.buildShareButton({ label: 'Share' });
  eq(plain.dataset.shareCopied, undefined, 'a button with no caller text stays on the i18n/English path');
}

/* ---- shareImageBlob (the printables engines' path) --------------------- */

{
  const { UTG, dataLayer } = load({ share: async () => {}, canShare: () => true });
  const out = await UTG.shareImageBlob({ type: 'image/png' },
    { filename: 'sheet.png', surface: 'printables', itemType: 'printable' });
  eq(out, 'native', 'a completed blob share resolves "native"');
  eq(dataLayer.length, 1, 'and pushes one row');
  assertShape(dataLayer[0], 'blob share');
  eq(dataLayer[0].share_destination, 'native_share', 'recorded as native_share');
  eq(dataLayer[0].share_surface, 'printables', 'with the printables surface');
}

{
  const { UTG, dataLayer } = load({ share: async () => { throw abortError(); }, canShare: () => true });
  const out = await UTG.shareImageBlob({ type: 'image/png' }, { filename: 'sheet.png' });
  eq(out, 'aborted', 'a cancelled blob share resolves "aborted"');
  eq(dataLayer.length, 0, 'and pushes NO share_text row');
}

{
  const { UTG, dataLayer } = load({});
  const out = await UTG.shareImageBlob({ type: 'image/png' },
    { filename: 'sheet.png', surface: 'printables', itemType: 'printable' });
  eq(out, 'downloaded', 'with no file sharing the blob downloads');
  eq(dataLayer.length, 1, 'and pushes one row');
  eq(dataLayer[0].share_destination, 'download', 'recorded as download');
  eq(dataLayer[0].share_method, 'image_download', 'with share_method image_download');
}

/* ---- share_format (2026-09-30) ----------------------------------------- */
/* WHAT left the page. Always present as a key (GTM keeps the last value of
   a key, so an omitted one would inherit the previous row's). */

{
  const { UTG, dataLayer } = load({});
  await UTG.shareImageBlob({ type: 'image/gif' },
    { filename: 'zalgo-text.gif', surface: 'zalgo', itemType: 'gif', format: 'gif' });
  eq(dataLayer[0].share_format, 'gif', 'a GIF blob records share_format "gif"');
  eq(dataLayer[0].share_surface, 'zalgo', 'with the zalgo surface');
  eq(dataLayer[0].share_item_type, 'gif', 'and item type gif');
}

{
  const { UTG, dataLayer } = load({});
  await UTG.shareImageBlob({ type: 'image/gif' }, { filename: 'x.gif' });
  eq(dataLayer[0].share_format, 'gif', 'an unstated format is read from the blob type');
}

{
  const { UTG, dataLayer } = load({});
  UTG.pushShare('image_download', { surface: 'zalgo' });
  UTG.pushShare('link_copy', {});
  UTG.pushShare('pinterest', {});
  eq(dataLayer[0].share_format, 'png', 'the PNG card path defaults to png');
  eq(dataLayer[1].share_format, 'link', 'a link share is "link"');
  ok(Object.prototype.hasOwnProperty.call(dataLayer[2], 'share_format') && dataLayer[2].share_format === null,
    'a pin carries the key as an honest null, never omitted');
}

/* ---- buildShareRow ----------------------------------------------------- */
/* One primary button, labelled Share or Copy link by whether navigator.share
   exists (2026-09-13) — both route through shareCreation, so the destination
   is decided by the branch that runs, not by the label. */

function rowButtons(UTG, opts) {
  return UTG.buildShareRow(Object.assign({
    url: () => 'https://ultratextgen.com/printables/name-tracing/?name=Ada',
    title: () => 'Name tracing',
    surface: 'printables',
    itemType: 'printable',
    labels: { share: 'Share', copyLink: 'Copy link', linkCopied: 'Link copied', pinterest: 'Save to Pinterest' }
  }, opts || {})).children;
}

{
  const { UTG, dataLayer } = load({ share: async () => {} });
  const btns = rowButtons(UTG);
  const primary = btns[0];
  eq(primary._label(), 'Share', 'with the Web Share API the primary button says Share');
  await primary.click();
  eq(dataLayer.length, 1, 'and pushes one row');
  assertShape(dataLayer[0], 'row share');
  eq(dataLayer[0].share_destination, 'native_share', 'recorded as native_share');
  eq(dataLayer[0].share_surface, 'printables', 'carrying the row surface');
}

{
  let copied = null;
  const { UTG, dataLayer } = load({ writeText: async (t) => { copied = t; } });
  const btns = rowButtons(UTG);
  const primary = btns[0];
  eq(primary._label(), 'Copy link', 'without the Web Share API it says Copy link');
  await primary.click();
  eq(dataLayer.length, 1, 'a successful copy pushes one row');
  assertShape(dataLayer[0], 'row copy link');
  eq(dataLayer[0].share_destination, 'clipboard', 'recorded as clipboard');
  eq(dataLayer[0].share_method, 'link_copy', 'with share_method link_copy');
  ok(copied && copied.indexOf('name=Ada') !== -1, 'the copied URL is unchanged');
}

{
  const { UTG, dataLayer } = load({ writeText: async () => { throw new Error('denied'); } });
  await rowButtons(UTG)[0].click();
  eq(dataLayer.length, 0, 'a copy the clipboard refused pushes NO row');
}

/* ---- buildShareRow: the Pinterest button ------------------------------- */

{
  const { UTG, dataLayer } = load({});
  const btns = rowButtons(UTG, { pinMedia: () => 'https://media.ultratextgen.com/pin.png' });
  const pin = btns.find((b) => b._label() === 'Save to Pinterest');
  ok(pin, 'the row carries a Pinterest button when pinMedia is supplied');
  await pin.click();
  eq(dataLayer.length, 1, 'clicking it pushes one row');
  assertShape(dataLayer[0], 'pinterest');
  eq(dataLayer[0].share_destination, 'pinterest', 'recorded as pinterest');
  eq(dataLayer[0].share_method, 'pinterest', 'with share_method pinterest');
  ok(pin.href.indexOf('pinterest.com/pin/create') !== -1,
    'and the pin URL it navigates to is unchanged');
  ok(pin.href.indexOf('media=') !== -1, 'media still rides along');
}

{
  const { UTG } = load({});
  eq(rowButtons(UTG).filter((b) => b._label() === 'Save to Pinterest').length, 0,
    'no Pinterest button without pinMedia — unchanged behaviour');
}

/* ---- the single-writer invariant --------------------------------------- */
/* share-core.js is the site's one share implementation. The destination
   vocabulary is defeated the moment a page pushes its own share_text literal,
   and that is invisible in review — so it is asserted here rather than
   trusted. */

{
  const repo = path.join(__dirname, '..', '..');
  const SKIP = new Set(['node_modules', '.git', 'assets', 'docs', 'data']);
  const ALLOWED = new Set([
    path.join('js', 'share', 'share-core.js'),
    path.join('js', 'share', 'shareCore.test.js')
  ]);
  const offenders = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(js|html)$/.test(entry.name)) continue;
      const rel = path.relative(repo, full);
      if (ALLOWED.has(rel)) continue;
      if (fs.readFileSync(full, 'utf8').indexOf('share_text') !== -1) offenders.push(rel);
    }
  })(repo);
  eq(offenders, [], 'share-core.js is the only file that writes a share_text event');
}

/* ---- report ------------------------------------------------------------ */

console.log(`share-core: ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((f) => console.error(`  FAIL  ${f}`));
  process.exit(1);
}

})();
