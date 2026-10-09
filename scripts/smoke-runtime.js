#!/usr/bin/env node
'use strict';

/**
 * smoke-runtime.js — the one check in this repo that RENDERS pages.
 *
 * Every other gate reads HTML/JS as text or runs a function in Node. On
 * 2026-10-03 a production audit found what that misses: four Spanish
 * generators rendered zero results (a module missing, and the static gate for
 * exactly that was quote-sensitive), family pages offered tabs that emptied
 * the results, the copy toast on 3,500 tile pages showed a label instead of
 * the glyph because one function silently shadowed another, dark-mode tiles
 * were black on navy, and the cursive print sheet printed in the body sans on
 * two pages. All of it passed CI. Each case below is one of those, or one of
 * the site's main jobs, asserted in a real browser.
 *
 * The page set is one per runtime architecture, not one per URL: a shared
 * module breaking shows up on its representative.
 *
 *   node scripts/smoke-runtime.js              # serve this checkout
 *   node scripts/smoke-runtime.js --root DIR   # serve another tree (e.g. a base worktree)
 *
 * Exit 0 all pass · 1 any assertion failed · 2 could not run (no Playwright or
 * no browser). "Could not run" is never reported as a pass.
 *
 * Every third-party request is aborted: no ads, no analytics, no fonts from a
 * CDN. Assertions read window.dataLayer, not GA4.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const argRoot = process.argv.indexOf('--root');
const ROOT = path.resolve(argRoot > -1 ? process.argv[argRoot + 1] : path.join(__dirname, '..'));

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('smoke-runtime: UNKNOWN — the playwright package is not installed (npm install).');
  process.exit(2);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'
};

function serve(root) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    let file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (p.endsWith('/')) file = path.join(file, 'index.html');
    else if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      res.writeHead(308, { Location: p + '/' }); return res.end();
    }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `  — ${detail}`}`);
}

const pdfPages = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const parse = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const [l1, l2] = [luminance(parse(a)), luminance(parse(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

async function main() {
  const server = await serve(ROOT);
  const BASE = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    console.error(`smoke-runtime: UNKNOWN — no browser (${e.message.split('\n')[0]}). Run: npx playwright install chromium`);
    server.close();
    process.exit(2);
  }

  async function open(url, device, init) {
    // 'narrow' is a 390px layout that cannot grow: with isMobile, Chromium
    // widens the layout viewport to fit an overflowing element, which hides
    // exactly the defect an overflow check is looking for.
    const opts = device === 'mobile'
      ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
      : device === 'narrow'
        ? { viewport: { width: 390, height: 844 } }
        : { viewport: { width: 1280, height: 900 } };
    const ctx = await browser.newContext({ ...opts, acceptDownloads: true });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    if (init) await page.addInitScript(init);
    await page.goto(BASE + url, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    return { ctx, page, errors };
  }
  const dl = (page) => page.evaluate(() => (window.dataLayer || []).filter((x) => x && x.event && !/^gtm/.test(x.event)).map((x) => ({ ...x })));
  const clip = (page) => page.evaluate(() => navigator.clipboard.readText());
  const sentinel = (page) => page.evaluate(() => navigator.clipboard.writeText('__SMOKE__'));

  // 1. Generator: type -> results -> exact copy, with the style recorded.
  console.log('\n/ (generator)');
  {
    const { ctx, page, errors } = await open('/', 'mobile');
    await page.fill('#mainInput', 'Luna');
    await page.waitForTimeout(300);
    const btns = page.locator('#resultsGrid .copy-btn:not([disabled])');
    check('typing renders enabled Copy buttons', (await btns.count()) > 0, `${await btns.count()} buttons`);
    await sentinel(page);
    const want = await btns.first().getAttribute('data-text');
    await btns.first().click();
    await page.waitForTimeout(300);
    check('Copy puts the card text on the clipboard', (await clip(page)) === want);
    const ev = (await dl(page)).filter((e) => e.event === 'copy_text');
    check('copy_text carries a style_name', ev.length === 1 && !!ev[0].style_name, JSON.stringify(ev));
    check('a typed-text copy sends no copy_item', ev.length === 1 && ev[0].copy_item === undefined && !!ev[0].copy_item_group, JSON.stringify(ev));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 2. Family page: no tab empties the results; the active tab clears.
  console.log('\n/id/tulisan-kecil/ (family-scoped generator)');
  {
    const { ctx, page, errors } = await open('/id/tulisan-kecil/', 'mobile');
    await page.fill('#mainInput', 'Luna');
    await page.waitForTimeout(300);
    const count = () => page.locator('#resultsGrid .copy-btn').count();
    const initial = await count();
    const tabs = page.locator('#categoryTabs .category-tab');
    const bad = [];
    for (let i = 0; i < await tabs.count(); i++) {
      const t = tabs.nth(i);
      if (!(await t.isVisible())) continue;
      await t.click(); await page.waitForTimeout(100);
      if ((await count()) === 0) bad.push(`tab ${i} empty`);
      await t.click(); await page.waitForTimeout(100);
      if ((await count()) !== initial) bad.push(`tab ${i} did not clear`);
    }
    check('every visible category tab returns results and clears on a second tap', initial > 0 && !bad.length, `initial ${initial}; ${bad.join(', ')}`);
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 3. Hand-built page with single-quoted script tags still renders.
  console.log('\n/es/letras-raras/ (legacy hand-built generator)');
  {
    const { ctx, page, errors } = await open('/es/letras-raras/', 'mobile');
    await page.fill('#mainInput', 'Luna');
    await page.waitForTimeout(300);
    check('typing renders results', (await page.locator('#resultsGrid .copy-btn').count()) > 0);
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 4. Localized platform page: localized chip, preview on the page's platform.
  console.log('\n/id/font-tiktok/ (localized platform generator)');
  {
    const { ctx, page, errors } = await open('/id/font-tiktok/', 'mobile');
    const chip = (await page.locator('.safemode-chip').first().textContent()) || '';
    check('Safe-mode chip carries no English label', !/Safe mode/.test(chip), chip.trim());
    await page.fill('#mainInput', 'Luna');
    await page.waitForTimeout(300);
    await page.locator('#resultsGrid .preview-btn').first().click();
    await page.waitForTimeout(300);
    const active = await page.evaluate(() => {
      const a = document.querySelector('.preview-modal [aria-selected="true"], .preview-modal .active');
      return a ? a.textContent.trim() : '';
    });
    check('Preview opens on TikTok', /TikTok/i.test(active), active);
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 5. Locale homepage: the copy toast is not English.
  console.log('\n/id/ (locale homepage)');
  {
    const { ctx, page } = await open('/id/', 'mobile');
    const toast = await page.evaluate(() => { const t = document.getElementById('copyToast'); return t ? t.textContent : ''; });
    check('copy toast is localized', toast && toast !== 'Copied!', toast);
    await ctx.close();
  }

  // 6. Symbol tiles: exact copy, glyph in the toast, one event, visible in dark mode, Save collection.
  console.log('\n/id/library/simbol-love/ (symbol explorer)');
  {
    const { ctx, page, errors } = await open('/id/library/simbol-love/', 'mobile');
    const tile = page.locator('.symbol-tile[data-symbol]').first();
    const sym = await tile.getAttribute('data-symbol');
    await tile.scrollIntoViewIfNeeded();
    await sentinel(page);
    const before = (await dl(page)).length;
    await tile.click();
    await page.waitForTimeout(300);
    check('tapping a tile copies exactly its symbol', (await clip(page)) === sym, `${sym}`);
    const toast = await page.evaluate(() => document.getElementById('symbolToast').textContent);
    // The tile's aria-label is "<copy verb> <glyph>" in the page language;
    // the toast must echo the glyph, not that label ("Disalin: Salin ♡").
    const verb = ((await tile.getAttribute('aria-label')) || '').replace(sym, '').trim();
    check('copy toast shows the glyph, not the tile label', toast.trim().endsWith(sym) && !(verb && toast.includes(verb)), toast);
    const evs = (await dl(page)).slice(before).filter((e) => e.event === 'copy_text');
    check('one tap sends one copy_text', evs.length === 1, `${evs.length}`);
    check('a tile copy still names its symbol', evs.length === 1 && evs[0].copy_item === sym, JSON.stringify(evs));
    const star = page.locator('.flag-row:has(.symbol-tile) .symbol-save-btn').first();
    await star.click({ force: true });
    await page.waitForTimeout(200);
    const n0 = (await dl(page)).length;
    await page.locator('.copy-collection-btn').first().click();
    await page.waitForTimeout(300);
    const cc = (await dl(page)).slice(n0).filter((e) => e.event === 'copy_text');
    check('saved Copy Collection sends one copy_text', cc.length === 1 && cc[0].copy_method === 'saved_collection', JSON.stringify(cc));
    await page.locator('#darkModeBtn').click();
    await page.waitForTimeout(200);
    const c = await page.evaluate(() => {
      const t = [...document.querySelectorAll('.flag-emoji.symbol-tile')].find((x) => /^[☀-⟿]$/.test(x.getAttribute('data-symbol') || ''));
      let n = t, bg = 'rgba(0, 0, 0, 0)';
      while (n && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { bg = getComputedStyle(n).backgroundColor; n = n.parentElement; }
      return t ? { fg: getComputedStyle(t).color, bg } : null;
    });
    const ratio = c ? contrast(c.fg, c.bg) : 0;
    check('dark mode: monochrome tile contrast >= 3:1', ratio >= 3, c ? `${c.fg} on ${c.bg} = ${ratio.toFixed(2)}` : 'no monochrome tile found');
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 6b. A copy that nothing completed says so and records nothing. Until
  // 2026-10-09 a refused clipboard write fell through to execCommand, and the
  // tile showed "Copied" and sent copy_text whether or not that worked.
  console.log('\n/library/text-faces-kaomoji/ (copy outcome: failure is not "Copied")');
  {
    const KAO_URL = '/library/text-faces-kaomoji/';
    // Init scripts are serialised into the page, so each one stands alone.
    const bothFail = () => {
      Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => Promise.reject(new Error('denied')) });
      document.execCommand = () => false;
    };
    const onlyFallbackWorks = () => {
      Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => Promise.reject(new Error('denied')) });
      document.execCommand = () => true;
    };

    // Normal path still copies the exact string and sends one event.
    {
      const { ctx, page, errors } = await open(KAO_URL, 'desktop');
      const tile = page.locator('.symbol-tile[data-symbol]').first();
      const face = await tile.getAttribute('data-symbol');
      await tile.scrollIntoViewIfNeeded();
      await sentinel(page);
      const n0 = (await dl(page)).length;
      await tile.click();
      await page.waitForTimeout(300);
      check('kaomoji tile: the normal path copies the exact string', (await clip(page)) === face, face);
      const ev = (await dl(page)).slice(n0).filter((e) => e.event === 'copy_text');
      check('kaomoji tile: the normal path sends one copy_text', ev.length === 1 && ev[0].copy_item === face, JSON.stringify(ev));
      check('no page errors', !errors.length, errors.join(' | '));
      await ctx.close();
    }

    // Clipboard refused AND execCommand false: failure toast, no event, no copied state.
    {
      const { ctx, page, errors } = await open(KAO_URL, 'desktop', bothFail);
      const tile = page.locator('.symbol-tile[data-symbol]').first();
      await tile.scrollIntoViewIfNeeded();
      const n0 = (await dl(page)).length;
      await tile.click();
      await page.waitForTimeout(300);
      const toast = await page.evaluate(() => { const t = document.getElementById('symbolToast'); return { text: t.textContent, shown: t.classList.contains('is-visible') }; });
      check('both copy paths failing shows the failure toast', toast.shown && /Failed/.test(toast.text) && !/Copied/i.test(toast.text), JSON.stringify(toast));
      const ev = (await dl(page)).slice(n0).filter((e) => e.event === 'copy_text');
      check('both copy paths failing sends no copy_text', ev.length === 0, JSON.stringify(ev));
      const copied = await tile.evaluate((el) => el.classList.contains('is-copied'));
      check('both copy paths failing leaves the tile without its copied state', !copied);
      check('no page errors', !errors.length, errors.join(' | '));
      await ctx.close();
    }

    // Clipboard refused but the execCommand fallback works: that is a success.
    {
      const { ctx, page } = await open(KAO_URL, 'desktop', onlyFallbackWorks);
      const tile = page.locator('.symbol-tile[data-symbol]').first();
      await tile.scrollIntoViewIfNeeded();
      const n0 = (await dl(page)).length;
      await tile.click();
      await page.waitForTimeout(300);
      const ev = (await dl(page)).slice(n0).filter((e) => e.event === 'copy_text');
      const copied = await tile.evaluate((el) => el.classList.contains('is-copied'));
      check('a working fallback still counts as a copy', ev.length === 1 && copied, `${ev.length} events, copied=${copied}`);
      await ctx.close();
    }
  }

  // 6c. The kaomoji generator: its own copy methods, its funnel rows, and no
  // typed text anywhere in the data layer.
  console.log('\n/kaomoji-generator/ (copy methods + generator steps)');
  {
    const { ctx, page, errors } = await open('/kaomoji-generator/', 'desktop');
    const n0 = (await dl(page)).length;
    await page.locator('.kao-mood[data-mood="happy"]').click();
    await page.locator('.kao-preset').first().click();
    await page.locator('.kao-part-opt[data-cat="eyes"]').nth(1).click();
    await page.locator('#kaomojiSurpriseBtn').click();
    await page.locator('#kaomojiFaceInput').fill('my private text 123');
    await page.waitForTimeout(1100);
    await page.locator('#kaomojiCopyBtn').click();
    await page.waitForTimeout(200);
    await page.locator('#kaomojiCopyLinkBtn').click();
    await page.waitForTimeout(200);
    await page.locator('#kaomojiClearBtn').click();
    await page.waitForTimeout(200);
    const rows = (await dl(page)).slice(n0);
    const steps = rows.filter((e) => e.event === 'kaomoji_generator_step').map((e) => `${e.kaomoji_step}:${e.kaomoji_value === undefined ? '' : e.kaomoji_value}`);
    check('generator steps are recorded in order, ids only', steps.join(' ') === 'mood:happy preset:happy part:eyes surprise: paste_edit: reset:', steps.join(' '));
    const paste = rows.filter((e) => e.kaomoji_step === 'paste_edit');
    check('typing one phrase sends one paste_edit, not one per keystroke', paste.length === 1, `${paste.length}`);
    const copies = rows.filter((e) => e.event === 'copy_text');
    check('generator copy and link copy have their own methods, without copy_item',
      copies.length === 2 && copies[0].copy_method === 'kaomoji_generator' && copies[1].copy_method === 'kaomoji_link' &&
      copies.every((e) => e.copy_item === undefined && !!e.copy_item_group), JSON.stringify(copies));
    check('typed text reaches no data layer row', !JSON.stringify(rows).includes('private') && !JSON.stringify(rows).includes('?q='), JSON.stringify(rows).slice(0, 300));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();

    const l = await open('/kaomoji-generator/?q=' + encodeURIComponent('(^_^) my private text'), 'desktop');
    const loaded = (await dl(l.page)).filter((e) => e.event === 'kaomoji_generator_step');
    check('a ?q= load sends one url_load step and not the face', loaded.length === 1 && loaded[0].kaomoji_step === 'url_load' && loaded[0].kaomoji_value === undefined && !JSON.stringify(loaded).includes('private'), JSON.stringify(loaded));
    await l.ctx.close();

    // The line under the preview names what a face carries (FAQ promise).
    const hintFor = async (face) => {
      const h = await open('/kaomoji-generator/?q=' + encodeURIComponent(face), 'desktop');
      const text = await h.page.locator('#kaomojiHint').innerText();
      await h.ctx.close();
      return text;
    };
    const safe = await hintFor('(^o^)');
    const script = await hintFor('(\u0CA0_\u0CA0)');
    const marks = await hintFor('( \u0361\u00B0 \u035C\u0296 \u0361\u00B0)');
    check('a plain face says it carries nothing risky', /No stacked marks/.test(safe), safe);
    check('a Kannada letter is named as a rare script and underscores as formatting', /Kannada/.test(script) && /formatting/.test(script), script);
    check('stacked marks are named', /Stacked marks/.test(marks), marks);
  }

  // 6d. The kaomoji hub's "browse by mood" links: one delegated listener.
  console.log('\n/library/text-faces-kaomoji/ (mood index clicks)');
  {
    const { ctx, page, errors } = await open('/library/text-faces-kaomoji/', 'desktop');
    await page.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('.kao-mood-links a')) e.preventDefault(); }));
    const link = page.locator('.kao-mood-links').nth(1).locator('a').first();
    const href = await link.getAttribute('href');
    const n0 = (await dl(page)).length;
    await link.scrollIntoViewIfNeeded();
    await link.click();
    const ev = (await dl(page)).slice(n0).filter((e) => e.event === 'kaomoji_mood_index_click');
    check('a mood-index link click sends its path and group', ev.length === 1 && ev[0].destination_path === href && ev[0].mood_group === 2, JSON.stringify(ev));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 6e. The /library/ directory: a settled filter and a settled search each
  // send one row; a run of keystrokes does not send one per key.
  console.log('\n/library/ (library_filter, library_search)');
  {
    const { ctx, page, errors } = await open('/library/', 'desktop');
    const n0 = (await dl(page)).length;
    await page.locator('#typeRow .lib-pill[data-value="Kaomoji"]').click();
    await page.waitForTimeout(1100);
    await page.locator('#libSearch').pressSequentially('angry', { delay: 60 });
    await page.waitForTimeout(1100);
    const rows = (await dl(page)).slice(n0);
    const f = rows.filter((e) => e.event === 'library_filter');
    const q = rows.filter((e) => e.event === 'library_search');
    check('a filter chip sends one library_filter with its label and count',
      f.length === 1 && f[0].filter_type === 'type' && f[0].filter_value === 'Kaomoji' && f[0].result_count > 0, JSON.stringify(f));
    check('typing a word sends one library_search with the settled term and count',
      q.length === 1 && q[0].search_term === 'angry' && q[0].result_count > 0 && q[0].result_count < f[0].result_count, JSON.stringify(q));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 6f. The header search: a zero-result query is recorded once, settled; a
  // query with results is not.
  console.log('\n/ (header search: site_search_no_results)');
  {
    const { ctx, page, errors } = await open('/', 'desktop');
    const n0 = (await dl(page)).length;
    await page.locator('#searchInput').pressSequentially('qzxjvk', { delay: 60 });
    await page.waitForTimeout(1300);
    await page.locator('#searchInput').fill('heart');
    await page.waitForTimeout(1300);
    const ev = (await dl(page)).slice(n0).filter((e) => e.event === 'site_search_no_results');
    check('one zero-result query sends one site_search_no_results, with locale and surface',
      ev.length === 1 && ev[0].search_term === 'qzxjvk' && ev[0].locale === 'en' && ev[0].search_surface === 'header', JSON.stringify(ev));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 7. No-viewport regression: a phone gets the phone layout.
  console.log('\n/zh-tw/keai-ziti/ (viewport)');
  {
    const { ctx, page } = await open('/zh-tw/keai-ziti/', 'mobile');
    const w = await page.evaluate(() => document.documentElement.clientWidth);
    check('lays out at the device width', w === 390, `${w}px`);
    await ctx.close();
  }

  // 8. Printables earner: the alphabet PDF downloads as a real PDF.
  console.log('\n/printables/block-letters/ (printables engine)');
  {
    const { ctx, page, errors } = await open('/printables/block-letters/', 'desktop');
    await page.waitForTimeout(800);
    let buf = null;
    try {
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#pt-alphabet-print')]);
      buf = fs.readFileSync(await d.path());
    } catch (e) { /* reported below */ }
    const pages = buf ? pdfPages(buf) : 0;
    check('alphabet Download PDF produces a 1-3 page PDF', buf && buf.slice(0, 4).toString() === '%PDF' && pages >= 1 && pages <= 3, buf ? `${pages} pages` : 'no download');
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 9. Cursive print sheet: cursive face, one page, an event.
  console.log('\n/pt/letra-cursiva/ (cursive controller print sheet)');
  {
    const { ctx, page, errors } = await open('/pt/letra-cursiva/', 'desktop', () => { window.print = () => {}; });
    await page.click('#cursivePrintSheet');
    await page.waitForTimeout(3000);
    const font = await page.evaluate(() => {
      const t = document.querySelector('#cursivePrintRoot .cursive-print-trace');
      return t ? getComputedStyle(t).fontFamily : '(no sheet)';
    });
    check('practice sheet is set in a Playwrite face', /Playwrite/.test(font), font);
    const ev = (await dl(page)).filter((e) => e.event === 'printable_output');
    check('printing the sheet sends printable_output', ev.length >= 1);
    await page.emulateMedia({ media: 'print' });
    const n = pdfPages(await page.pdf({ format: 'A4' }));
    check('practice sheet prints on one A4 page', n === 1, `${n} pages`);
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 10. Tracing: an accented name traces like an unaccented one.
  console.log('\n/de/zum-ausdrucken/schreibschrift/ (trace generator)');
  {
    const { ctx, page, errors } = await open('/de/zum-ausdrucken/schreibschrift/', 'desktop');
    await page.waitForTimeout(800);
    const routed = async (w) => {
      await page.fill('#pt-gen-input', w);
      await page.waitForTimeout(500);
      return page.locator('#pt-gen-preview .pt-trace-route').count();
    };
    const plain = await routed('Jurgen');
    const accented = await routed('Jürgen');
    check('"Jürgen" is traced on centrelines like "Jurgen"', plain > 0 && accented === plain, `${accented} vs ${plain} routed rows`);
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 11. Copy paths that used to send nothing.
  console.log('\n/usecase/zalgo-text/, /roblox/, /tiktok/ and /youtube/ name generators (copy events)');
  for (const [url, sel] of [['/usecase/zalgo-text/', '#copyBtn'], ['/roblox/name-generator/', '.rng-mode-panel button[data-name]'],
    ['/tiktok/name-generator/', '.copy-btn'], ['/youtube/name-generator/', '.copy-btn']]) {
    const { ctx, page, errors } = await open(url, 'desktop');
    await page.waitForTimeout(500);
    const n0 = (await dl(page)).length;
    await page.locator(sel).first().click();
    await page.waitForTimeout(300);
    const ev = (await dl(page)).slice(n0).filter((e) => e.event === 'copy_text');
    check(`${url} Copy sends one copy_text, without copy_item`, ev.length === 1 && ev[0].copy_item === undefined, JSON.stringify(ev));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 11b. The Share button's confirmation is in the page language. Without a
  // native share sheet it copies the link and says so; that label used to be the
  // English fallback under Korean prose because library pages carry no i18n.js.
  console.log('\n/ko/library/imotikon/ (share fallback label)');
  {
    const { ctx, page, errors } = await open('/ko/library/imotikon/', 'desktop');
    await page.waitForTimeout(500);
    const hasShare = await page.evaluate(() => typeof navigator.share === 'function');
    const btn = page.locator('.share-result-btn').first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(300);
    const label = await btn.locator('.share-result-label').textContent();
    check('share confirmation is not the English fallback', hasShare || (label && !/Link copied|Failed/.test(label)), label);
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 11c. A monogram is a personal piece, so its export carries no credit QR or
  // site URL. The QR encoder is only ever loaded to draw one, so its absence
  // after an export is the browser-visible proof.
  console.log('\n/printables/monogram-maker/ (no credit QR)');
  {
    const { ctx, page, errors } = await open('/printables/monogram-maker/?l=J&c=S&r=L', 'desktop');
    await page.waitForTimeout(500);
    await page.evaluate(() => { const b = document.getElementById('mono-print'); if (b) b.click(); });
    await page.waitForTimeout(1500);
    const loaded = await page.evaluate(() => !!document.querySelector('script[data-pt-qr]') || !!(window.UltraTextGen && window.UltraTextGen.qr));
    check('the monogram export loads no QR encoder', !loaded);
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 11d. Ctrl+P without Download PDF opens with a note whose button name is a
  // link back to the page (kept clickable in a saved PDF) plus the page's
  // address in plain text for a sheet on paper, and that link lands on the
  // Download PDF button, focused and ringed. All four engines, EN and a locale.
  console.log('\nbrowser-print note: link, address, and the #download-pdf jump');
  for (const url of ['/printables/monogram-maker/', '/printables/cross-stitch-letters/', '/printables/name-labels/', '/printables/block-letters/', '/es/imprimibles/monograma/']) {
    const { ctx, page, errors } = await open(url, 'desktop');
    const canon = await page.evaluate(() => document.querySelector('link[rel="canonical"]').href);
    const note = await page.evaluate(() => {
      const a = document.querySelector('.pt-print-note a.pt-print-note-link');
      const ad = document.querySelector('.pt-print-note .pt-print-note-addr');
      return { href: a && a.getAttribute('href'), text: a && a.textContent, addr: ad && ad.textContent };
    });
    const u = new URL(canon);
    check(`${url} note links to the canonical URL + #download-pdf`, note.href === canon + '#download-pdf' && !/\?/.test(note.href || ''), String(note.href));
    check(`${url} note prints the page address in text`, note.addr === u.host + u.pathname.replace(/\/$/, ''), String(note.addr));
    if (url === '/printables/monogram-maker/') {
      await page.emulateMedia({ media: 'print' });
      const pdf = (await page.pdf({ format: 'Letter' })).toString('latin1');
      check('the saved PDF carries the link annotation to the canonical URL + #download-pdf', pdf.includes('/URI') && pdf.includes(canon + '#download-pdf'));
    }
    await ctx.close();
    const j = await open(url + '#download-pdf', 'desktop');
    await j.page.waitForTimeout(900);
    const jump = await j.page.evaluate(() => {
      const a = document.activeElement;
      const r = a && a.getBoundingClientRect();
      return {
        pdf: !!(a && a.matches && a.matches('[data-pt-pdf], .pt-pdf-btn')), ring: !!(a && a.classList.contains('pt-pdf-pulse')),
        inView: !!r && r.top >= 0 && r.bottom <= innerHeight, text: a && a.textContent.trim()
      };
    });
    check(`${url}#download-pdf focuses and rings the Download PDF button, in view`, jump.pdf && jump.ring && jump.inView, JSON.stringify(jump));
    check('no page errors', !j.errors.length && !errors.length, j.errors.concat(errors).join(' | '));
    await j.ctx.close();
  }
  {
    const { ctx, page } = await open('/printables/monogram-maker/', 'desktop');
    await page.waitForTimeout(600);
    const none = await page.evaluate(() => document.activeElement === document.body && !document.querySelector('.pt-pdf-pulse'));
    check('without the hash nothing is focused or ringed', none);
    await ctx.close();
  }

  // 12. Nothing pushes a 390px page sideways.
  console.log('\n390px layouts (overflow)');
  for (const [url, typed] of [['/usecase/vertical-text/', ''], ['/it/lettere-in-corsivo/', 'Luna'], ['/de/zum-ausdrucken/buchstaben-nachspuren/', '']]) {
    const { ctx, page } = await open(url, 'narrow');
    if (typed) { await page.locator('#mainInput, input[type=text]:visible').first().fill(typed); await page.waitForTimeout(500); }
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    check(`${url} fits 390px${typed ? ' after typing' : ''}`, w[0] <= w[1], `scrollWidth ${w[0]} > ${w[1]}`);
    await ctx.close();
  }

  // 13. A language's own letters are in its printable picker.
  console.log('\n/es/imprimibles/moldes-de-letras/ and /de/zum-ausdrucken/buchstaben-vorlagen/ (letter picker)');
  for (const [url, want] of [['/es/imprimibles/moldes-de-letras/', ['Ñ']], ['/de/zum-ausdrucken/buchstaben-vorlagen/', ['Ä', 'Ö', 'Ü', 'ß']]]) {
    const { ctx, page, errors } = await open(url, 'desktop');
    const chips = await page.$$eval('#pt-strip .pt-chip', (a) => a.map((b) => b.dataset.char));
    check(`${url} picker offers ${want.join(' ')}`, want.every((c) => chips.includes(c)), chips.join(''));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\nsmoke-runtime: ${results.length - failed.length}/${results.length} passed (${ROOT})`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(`smoke-runtime: UNKNOWN — harness error: ${e.stack || e.message}`);
  process.exit(2);
});
