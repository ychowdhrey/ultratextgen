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

  // 14. Writing footprint checker: analyse, highlight, apply, undo, and the text goes nowhere.
  console.log('\n/ai-writing-footprint-checker/ (local analysis, edits, privacy)');
  {
    const SAMPLE = "In today's rapidly evolving landscape, teams must adapt. It's important to note that the quarterly figures were revised on 14 March. Furthermore, the board approved a budget of $4,500. Moreover, the review is not just a formality, it is a commitment. Additionally, Dr. Okafor will present at https://example.com/q1. Overall, the plan is sound. " +
      "The warehouse in Leeds shipped 312 pallets last week, and Priya counted every one. Moreover, the forklift broke twice. Furthermore, the night shift refused overtime. Additionally, the roof leaks over bay four. Overall, it was a long week.";
    const { ctx, page, errors } = await open('/ai-writing-footprint-checker/', 'desktop');
    const seen = [];
    page.on('request', (r) => seen.push(r.url() + ' ' + (r.postData() || '')));
    await page.fill('#wfInput', SAMPLE);
    await page.waitForTimeout(200);
    check('the word count updates while typing', /^\d+ words/.test(await page.textContent('#wfCounts')), await page.textContent('#wfCounts'));
    check('typing fires no analytics event', !(await dl(page)).some((e) => /^writing_/.test(e.event)));
    await page.click('#wfAnalyse');
    await page.waitForSelector('#wfReport:not([hidden])');
    const marks = await page.$$eval('#wfMarked .wf-mark', (a) => a.length);
    check('flagged patterns render as buttons', marks >= 3, `${marks} marks`);
    check('the marked view keeps the original text exactly', (await page.textContent('#wfMarked')) === SAMPLE);
    check('the report has no AI score or probability', !/\d+\s*%\s*(AI|likely|chance)|AI (score|probability)\s*[:\d]|\d+\s*\/\s*100/i.test(await page.textContent('#wfReport')));
    await page.locator('#wfMarked .wf-mark').first().click();
    check('selecting a flag shows why it was flagged', /Why it was flagged/.test(await page.textContent('#wfDetail')));
    await page.click('#wfShowSug');
    const sugCount = await page.$$eval('#wfSuggestions input[type=checkbox]', (a) => a.length);
    check('suggestions are listed only for flags with a safe replacement', sugCount >= 2, `${sugCount} suggestions`);
    check('nothing changed before Apply', (await page.isHidden('#wfImprovedWrap')));
    await page.locator('#wfSuggestions input[type=checkbox]').first().check();
    await page.locator('#wfSuggestions input[type=checkbox]').nth(1).check();
    await page.click('#wfApply');
    const improved = await page.textContent('#wfImproved');
    check('applying produces improved text that keeps numbers, names and links',
      improved !== SAMPLE && /\$4,500/.test(improved) && /14 March/.test(improved) && /Okafor/.test(improved) && /https:\/\/example\.com\/q1/.test(improved), improved.slice(0, 120));
    check('before and after table appears', (await page.$$eval('#wfCompare tr', (a) => a.length)) >= 4);
    await page.click('#wfUndo');
    await page.click('#wfResetOrig').catch(() => {});
    await page.locator('#wfSuggestions input[type=checkbox]').first().check();
    await page.click('#wfApply');
    await page.click('#wfResetOrig');
    check('Reset to Original hides the improved text', await page.isHidden('#wfImprovedWrap'));
    check('the typed original is untouched by edits', (await page.inputValue('#wfInput')) === SAMPLE);
    await page.locator('#wfSuggestions input[type=checkbox]').first().check();
    await page.click('#wfApply');
    await sentinel(page);
    await page.click('#wfCopy');
    await page.waitForTimeout(300);
    check('Copy Improved Text puts the improved text on the clipboard', (await clip(page)) === (await page.textContent('#wfImproved')));
    const events = (await dl(page)).filter((e) => /^writing_/.test(e.event));
    const names = events.map((e) => e.event);
    check('the six action events fire', ['writing_analysis_started', 'writing_analysis_completed', 'writing_suggestion_applied', 'writing_suggestion_undone', 'writing_analysis_reset', 'writing_result_copied'].every((n) => names.includes(n)), names.join(','));
    const blob = JSON.stringify(events);
    check('no event carries the pasted text, a phrase or a name', !/Okafor|Leeds|Priya|rapidly evolving|important to note|example\.com|4,500/i.test(blob), blob.slice(0, 200));
    check('no request carries the pasted text', !seen.some((u) => /Okafor|Priya|rapidly%20evolving|rapidly\+evolving/i.test(u)));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/ai-writing-footprint-checker/', 'narrow');
    await page.fill('#wfInput', "It's important to note that the vote moved. Furthermore, the room changed. Moreover, lunch is cancelled. Additionally, bring a pen. Overall, it is fine. " + 'The cat sat on the mat and looked at the dog for a while. '.repeat(14));
    await page.click('#wfAnalyse');
    await page.waitForSelector('#wfReport:not([hidden])');
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    check('/ai-writing-footprint-checker/ fits 390px with a report open', w[0] <= w[1], `scrollWidth ${w[0]} > ${w[1]}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/ai-writing-footprint-checker/', 'desktop');
    await page.fill('#wfInput', 'Ayer fuimos al mercado de la plaza mayor y compramos tomates, pan y un poco de queso. Despues nos sentamos en un banco a mirar a la gente pasar mientras el sol bajaba.');
    await page.click('#wfAnalyse');
    await page.waitForSelector('#wfReport:not([hidden])');
    check('non-English text is declined, not analysed with English rules', /English only/.test(await page.textContent('#wfSummary')) && (await page.$$eval('#wfMarked .wf-mark', (a) => a.length)) === 0);
    await ctx.close();
  }

  // 15. A national ruling is a physical standard. The French Seyes ruling is 8 mm
  // between heavy lines with three 2 mm interlines between them, and it printed
  // at 2.03x that on A4 because the band was fitted to the row's box instead of
  // to the paper. The assertion reads the bitmap the PDF embeds (the canvases
  // renderPages hands to fromCanvases), not the DOM, because the DOM was
  // correct throughout: the defect existed only in what reached the paper.
  console.log('\n/fr/imprimables/modeles-d-ecriture/ (Seyes ruling is 8 mm / 2 mm on paper)');
  for (const [paper, orient] of [['a4', 'portrait'], ['a4', 'landscape'], ['letter', 'portrait'], ['letter', 'landscape']]) {
    const init = `try{localStorage.setItem('utg_print_prefs', JSON.stringify({paper:'${paper}',orient:'${orient}'}))}catch(e){}
      (function () {
        const UTG = (window.UltraTextGen = window.UltraTextGen || {});
        let real;
        Object.defineProperty(UTG, 'pdf', { configurable: true, get() { return real; }, set(v) {
          real = v && Object.assign({}, v, { renderPages: async function (root, o) {
            const c = await v.renderPages(root, o); window.__ptSheet = { canvases: c, opts: o }; return c; } });
        } });
      })();`;
    const { ctx, page, errors } = await open('/fr/imprimables/modeles-d-ecriture/', 'desktop', init);
    await page.waitForTimeout(800);
    for (const name of ['Lea', 'Christopher']) {
      await page.fill('#pt-gen-input', name);
      await page.waitForTimeout(500);
      await page.evaluate(() => { window.__ptSheet = null; });
      await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#pt-gen-print')]).catch(() => null);
      const m = await page.evaluate(() => {
        const s = window.__ptSheet;
        if (!s || !s.canvases || !s.canvases.length) return null;
        const cv = s.canvases[0];
        const ctx2 = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        const pxPerMm = W / (s.opts.widthPx * 25.4 / 96);
        const data = ctx2.getImageData(0, 0, W, H).data;
        const ys = [];
        for (let y = 0; y < H; y++) {
          let n = 0;
          for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (Math.min(data[i], data[i + 1], data[i + 2]) < 235) n++; }
          if (n / W > 0.6) ys.push(y);
        }
        const lines = [];
        ys.forEach((y) => { const l = lines[lines.length - 1]; if (l && y - l[l.length - 1] <= 1) l.push(y); else lines.push([y]); });
        const centres = lines.map((l) => l.reduce((a, b) => a + b, 0) / l.length / pxPerMm);
        const stacks = [];
        centres.forEach((c) => { const s = stacks[stacks.length - 1]; if (s && c - s[s.length - 1] < 10) s.push(c); else stacks.push([c]); });
        const five = stacks.filter((s) => s.length === 5);
        const inter = [].concat(...five.map((s) => s.slice(1).map((c, i) => c - s[i])));
        const span = five.map((s) => s[4] - s[0]);
        return { stacks: five.length, pxPerMm, inter, span };
      });
      const tag = `${paper} ${orient} "${name}"`;
      if (!m) { check(`${tag}: the PDF's page bitmap was captured`, false, 'no canvas from renderPages'); continue; }
      const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      const dpi = Math.round(m.pxPerMm * 25.4);
      check(`${tag}: at least three 5-line Seyes stacks on page 1 (${dpi} dpi bitmap)`, m.stacks >= 3, `${m.stacks} stacks`);
      const iMin = Math.min(...m.inter), iMax = Math.max(...m.inter), sMin = Math.min(...m.span), sMax = Math.max(...m.span);
      check(`${tag}: interline is 2.0 mm +/- 0.15`, m.inter.length && iMin >= 1.85 && iMax <= 2.15, `${iMin.toFixed(2)}..${iMax.toFixed(2)} mm (mean ${m.inter.length ? avg(m.inter).toFixed(2) : 'n/a'})`);
      check(`${tag}: heavy lines are 8.0 mm +/- 0.3 apart`, m.span.length && sMin >= 7.7 && sMax <= 8.3, `${sMin.toFixed(2)}..${sMax.toFixed(2)} mm`);
    }
    check(`${paper} ${orient}: no page errors`, !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 16. Text in another script. Half the styles return it unchanged and the rest
  // only add spacing or marks, so the English generator says so, once, and only
  // when the text has a non-Latin letter. A translated page gets no English line.
  console.log('\n/ (non-Latin text notice, English pages only)');
  {
    const { ctx, page, errors } = await open('/', 'desktop');
    const hidden = () => page.locator('#scriptNotice').evaluate((n) => n.hidden);
    await page.fill('#mainInput', 'hello world');
    check('plain English shows no script notice', await hidden());
    await page.fill('#mainInput', 'cafe\u0301 \u00f1and\u00fa');
    check('accents alone do not trigger it', await hidden());
    await page.fill('#mainInput', '\u0436\u0438\u0440\u043d\u044b\u0439 \u0448\u0440\u0438\u0444\u0442');
    check('Cyrillic text shows the notice', !(await hidden()));
    check('Cyrillic \u0439 does not also trigger the accent notice', await page.locator('#accentNotice').evaluate((n) => n.hidden));
    await page.fill('#mainInput', 'caf\u00e9 \u0436');
    check('a real Latin accent still triggers the accent notice', !(await page.locator('#accentNotice').evaluate((n) => n.hidden)));
    await page.fill('#mainInput', '\u0436\u0438\u0440\u043d\u044b\u0439 \u0448\u0440\u0438\u0444\u0442');
    await page.fill('#mainInput', '\u062d\u0631\u0648\u0641 \u0645\u0632\u062e\u0631\u0641\u0647');
    check('Arabic text shows the notice', !(await hidden()));
    await page.fill('#mainInput', 'hello \u4f60\u597d');
    check('Latin mixed with Chinese shows the notice', !(await hidden()));
    await page.click('#scriptNoticeClose');
    await page.fill('#mainInput', 'hello');
    await page.fill('#mainInput', '\u0436');
    check('a dismissed notice stays dismissed', await hidden());
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
    const es = await open('/es/fuentes-de-letras/', 'desktop');
    await es.page.fill('#mainInput', '\u0436\u0438\u0440\u043d\u044b\u0439');
    check('a Spanish page gets no English script notice', (await es.page.locator('#scriptNotice').count()) === 0);
    check('Spanish page: no page errors', !es.errors.length, es.errors.join(' | '));
    await es.ctx.close();
  }

  // 17. Clear names: a class list is remembered on the device, so there has to be
  // a way to forget it. English pages only (the label has no translation), and
  // the frozen block-letters page keeps its previous control.
  console.log('\n/printables/name-tracing/ (Clear names forgets the saved class list)');
  {
    const { ctx, page, errors } = await open('/printables/name-tracing/', 'desktop');
    const stored = () => page.evaluate(() => localStorage.getItem('utg_printables_roster'));
    await page.evaluate(() => localStorage.setItem('utg_printables_roster', 'Emma\nNoah\nAva'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(700);
    const clearBtn = page.locator('.pt-roster-clear');
    check('the saved list is back in the box and Clear names shows', (await page.inputValue('#pt-name-roster')).includes('Noah') && await clearBtn.isVisible());
    await clearBtn.click();
    check('Clear names empties the box', (await page.inputValue('#pt-name-roster')) === '');
    check('Clear names removes the stored list', (await stored()) === null, String(await stored()));
    check('Clear names hides itself when there is nothing to clear', !(await clearBtn.isVisible()));
    await page.click('.pt-audience-field .pt-choice[data-value="class"]');
    await page.fill('#pt-name-roster', 'Mia');
    check('typing a name brings it back', await clearBtn.isVisible());
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
    const bl = await open('/printables/block-letters/', 'desktop');
    check('block-letters is untouched (no Clear names)', (await bl.page.locator('.pt-roster-clear').count()) === 0);
    await bl.ctx.close();
    const fr = await open('/fr/imprimables/modeles-d-ecriture/', 'desktop');
    check('a French sheet gets no English Clear names', (await fr.page.locator('.pt-roster-clear').count()) === 0);
    await fr.ctx.close();
  }

  // 18. Storage blocked. Reading window.localStorage throws a SecurityError
  // when the browser blocks site data; header.js read it unguarded, so the
  // throw ended its init and the dark-mode toggle, compact header and site
  // search were dead on every page.
  console.log('\nheader.js with storage blocked (dark mode still toggles, no page error)');
  {
    const blockStorage = () => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    };
    for (const url of ['/', '/library/heart-symbols/', '/printables/name-tracing/']) {
      const { ctx, page, errors } = await open(url, 'desktop', blockStorage);
      const toggled = await page.evaluate(() => {
        const b = document.getElementById('darkModeBtn');
        if (!b) return null;
        b.click();
        return document.body.classList.contains('dark-mode');
      });
      check(`${url}: dark-mode toggle works`, toggled === true, String(toggled));
      check(`${url}: no page errors`, !errors.length, errors.join(' | '));
      await ctx.close();
    }
  }

  // 19. A copy is reported only when one happened. The Clipboard API rejects in
  // some in-app browsers and sandboxed frames. The collection Copy button used
  // to say "Copied" and record copy_text either way; the generator's Copy had
  // no fallback at all. Each case refuses the API, then the textarea fallback.
  console.log('\nCopy honesty (API refused -> fallback; both refused -> failure, no event)');
  {
    const refuse = (fallbackWorks) => `
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('NotAllowed')) } });
      const orig = document.execCommand.bind(document);
      document.execCommand = function (c) { if (c === 'copy') return ${fallbackWorks}; return orig.apply(null, arguments); };`;
    const copies = async (page) => (await dl(page)).filter((x) => x.event === 'copy_text').length;
    for (const fallbackWorks of [true, false]) {
      const tag = fallbackWorks ? 'API refused' : 'both refused';
      const lib = await open('/library/heart-symbols/', 'desktop', refuse(fallbackWorks));
      const cbtn = lib.page.locator('.copy-collection-btn').first();
      await cbtn.click();
      await lib.page.waitForTimeout(200);
      const clabel = (await cbtn.textContent()).trim();
      check(`collection Copy, ${tag}: label ${fallbackWorks ? 'confirms' : 'does not claim'} the copy`,
        fallbackWorks ? /Copied/.test(clabel) : !/Copied/.test(clabel), clabel);
      check(`collection Copy, ${tag}: ${fallbackWorks ? 'one' : 'no'} copy_text row`, (await copies(lib.page)) === (fallbackWorks ? 1 : 0), String(await copies(lib.page)));
      await lib.ctx.close();

      const gen = await open('/', 'desktop', refuse(fallbackWorks));
      await gen.page.fill('#mainInput', 'Luna');
      await gen.page.waitForTimeout(300);
      const gbtn = gen.page.locator('#resultsGrid .copy-btn:not([disabled])').first();
      await gbtn.click();
      await gen.page.waitForTimeout(200);
      const glabel = (await gbtn.textContent()).trim();
      check(`generator Copy, ${tag}: label ${fallbackWorks ? 'confirms' : 'reports failure'}`,
        fallbackWorks ? /Copied/.test(glabel) : /Failed/.test(glabel), glabel);
      check(`generator Copy, ${tag}: ${fallbackWorks ? 'one' : 'no'} copy_text row`, (await copies(gen.page)) === (fallbackWorks ? 1 : 0), String(await copies(gen.page)));
      await gen.ctx.close();
    }

    // The real textarea fallback fires a native "copy" event. The manual-copy
    // listener must not record it as a second row, focus must come back to
    // the button, and a real manual copy must still record.
    const real = await open('/', 'desktop', `Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('NotAllowed')) } });`);
    await real.page.fill('#mainInput', 'Luna');
    await real.page.waitForTimeout(300);
    await real.page.locator('#resultsGrid .copy-btn:not([disabled])').first().click();
    await real.page.waitForTimeout(200);
    const methods = (await dl(real.page)).filter((x) => x.event === 'copy_text').map((x) => x.copy_method);
    check('real fallback copy records exactly one row (no extra "manual")', methods.length === 1 && methods[0] === 'button', methods.join(','));
    check('focus returns to the pressed Copy button', await real.page.evaluate(() => !!(document.activeElement && document.activeElement.classList.contains('copy-btn'))));
    await real.page.evaluate(() => {
      const h = document.querySelector('h1');
      const r = document.createRange(); r.selectNodeContents(h);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      document.execCommand('copy');
    });
    const after = (await dl(real.page)).filter((x) => x.event === 'copy_text').map((x) => x.copy_method);
    check('a manual selection copy still records "manual"', after.length === 2 && after[1] === 'manual', after.join(','));
    check('no page errors', !real.errors.length, real.errors.join(' | '));
    await real.ctx.close();
  }

  // 20. Title case on a tracing sheet. \b\w is ASCII-only, so every accented
  // letter counted as a word break and "jürgen größe" printed "JüRgen GrößE".
  console.log('\n/de/zum-ausdrucken/schreibuebungen/ (title case keeps accented words whole)');
  {
    const { ctx, page, errors } = await open('/de/zum-ausdrucken/schreibuebungen/', 'desktop');
    await page.selectOption('#pt-gen-case', 'title');
    await page.fill('#pt-gen-input', 'jürgen größe');
    await page.waitForTimeout(500);
    const texts = await page.evaluate(() => Array.from(document.querySelectorAll('svg text')).map((n) => n.textContent));
    check('title case prints "Jürgen Größe"', texts.includes('Jürgen Größe'), texts.filter((x) => /rgen/i.test(x || '')).join(' | '));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 20b. Title case on a letter-row page runs on the words, then splits the
  // letters. It ran after the split, so every letter was a word: "ijsje"
  // printed I J S J E, the same as upper case.
  console.log('\n/nl/om-uit-te-printen/letters-overtrekken/ (title case on a letter row keeps the IJ digraph)');
  {
    const { ctx, page, errors } = await open('/nl/om-uit-te-printen/letters-overtrekken/', 'desktop');
    await page.selectOption('#pt-gen-case', 'title');
    await page.fill('#pt-gen-input', 'ijsje');
    await page.waitForTimeout(500);
    const texts = await page.evaluate(() => Array.from(document.querySelectorAll('#pt-gen-preview svg text')).map((n) => n.textContent));
    check('title case prints "I J s j e"', texts.includes('I J s j e'), texts.filter(Boolean).slice(0, 2).join(' | '));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 21. ß and ẞ on a dotted row. Neither has a print route, so both used to be
  // drawn as a stroked contour: a dense double ring of dots between clean
  // dotted letters. They now take a centreline from their own glyph, which
  // loads centreline.js on demand on pages that do not ship it.
  console.log('\n/de/zum-ausdrucken/schreibuebungen/ (ß traces on a centreline, not a contour)');
  {
    const { ctx, page, errors } = await open('/de/zum-ausdrucken/schreibuebungen/', 'desktop');
    await page.fill('#pt-gen-input', 'Straße ẞ');
    await page.waitForFunction(() => !!(window.UltraTextGen && window.UltraTextGen.centreline), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
    const contour = await page.locator('#pt-gen-preview .pt-trace-contour').count();
    const rows = await page.locator('#pt-gen-preview .pt-trace-route').count();
    check('"Straße ẞ" dotted rows draw no contour glyph', rows > 0 && contour === 0, `${contour} contour glyphs in ${rows} routed rows`);
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 22. Name labels: the example is never printed, and a preset never
  // rewrites what the visitor chose. On 2026-10-25 a live audit found a week
  // of dated bottle labels printed as the child's name after one preset
  // click, a chosen Avery 5160 silently swapped for a 5163 grid, a name field
  // disabled by a list nothing on screen showed, and a remembered sample that
  // turned "type Ava" into "Maya LopezAva". Each is asserted here through the
  // page's own controls; the PDF is read, not the DOM.
  console.log('\n/printables/name-labels/ (example never prints; presets never undo a choice)');
  {
    const { ctx, page, errors } = await open('/printables/name-labels/', 'desktop');
    // A control that is gone fails this case; it does not end the run as UNKNOWN.
    page.setDefaultTimeout(5000);
    try {
    const first = () => page.evaluate(() => { const L = window.UltraTextGen.labels; const labs = L.labelsFor(L.geometry()); return { name: labs[0] && labs[0].name, line2: labs[0] && labs[0].line2, n: labs.length, example: !!labs.example }; });
    check('first load: the name field is empty and the sheet is the example', (await page.inputValue('#lb-name')) === '' && (await first()).example);
    check('first load: nothing is remembered', (await page.evaluate(() => localStorage.getItem('utg_label_sheet'))) === null);
    let got = false;
    page.once('download', () => { got = true; });
    await page.click('#lb-pdf');
    await page.waitForTimeout(600);
    check('Download with no name asks for one and saves nothing', !got && (await page.evaluate(() => document.activeElement.id)) === 'lb-name');
    await page.click('canvas.lb-preview-canvas');
    await page.keyboard.type('Ava Chen');
    await page.click('#lb-what [data-value=bottles]');
    await page.click('#lb-date-mode [data-value=print]');
    await page.waitForTimeout(300);
    const dated = await first();
    check('dated labels: name stays the name, the date fills line 2', dated.name === 'Ava Chen' && /\d/.test(dated.line2 || '') && dated.n === 15, JSON.stringify(dated));
    await page.click('#lb-what [data-value=supplies]');
    await page.waitForTimeout(300);
    const after = await first();
    check('a preset after dated labels keeps the name as the name', after.name === 'Ava Chen', JSON.stringify(after));
    await page.click('#lb-on [data-value=stock]');
    await page.selectOption('#lb-stock', 'avery-5160');
    const stocks = [];
    for (const p of ['bins', 'supplies', 'books']) {
      await page.click('#lb-what [data-value=' + p + ']');
      stocks.push(await page.inputValue('#lb-stock'));
    }
    check('a chosen Avery 5160 survives every preset', stocks.every((v) => v === 'avery-5160'), stocks.join(','));
    await page.click('#lb-mode [data-value=list]');
    await page.fill('#lb-list', 'Noah Kim\nAisha Rahman');
    await page.waitForTimeout(300);
    const fields = await page.evaluate(() => ['lb-name', 'lb-line2', 'lb-line3'].filter((id) => document.getElementById(id).disabled));
    check('a list replaces the name field; no field is disabled', !fields.length && (await first()).name === 'Noah Kim', fields.join(','));
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#lb-pdf')]);
    const buf = fs.readFileSync(await download.path());
    check('the list PDF is one Letter page set to print at actual size', pdfPages(buf) === 1 && /PrintScaling\s*\/None/.test(buf.toString('latin1')), `${pdfPages(buf)} pages`);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(700);
    check('a remembered list is visible on return', await page.evaluate(() => !document.getElementById('lb-list-box').hidden && /Noah Kim/.test(document.getElementById('lb-list').value)));
    } catch (e) {
      check('name labels: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 27. Locale strings that only a rendered sheet shows. Turkish has eight
  // vowels and the vowel chip printed five (A E I O U, no İ Ö Ü). Its class
  // set read "3 sayfa · 3 sayfa" because the sheet and the page were one word.
  // A one-word word search read "Finde alle 1 Wörter". The PDF is counted and
  // the line under the button is read as text.
  console.log('\n/tr/yazdirilabilir/harf-boyama/ + /de/zum-ausdrucken/suchsel/ (locale counts and sets)');
  {
    const { ctx, page, errors } = await open('/tr/yazdirilabilir/harf-boyama/', 'desktop');
    page.setDefaultTimeout(5000);
    try {
      const chip = await page.evaluate(() => { const i = document.querySelector('input[name=pt-set-letters][value=vow]'); return i ? i.parentNode.textContent.trim() : null; });
      check('tr vowel chip names all eight Turkish vowels', chip === 'AEIİOÖUÜ', chip);
      await page.click('label:has(input[name=pt-set-letters][value=vow])');
      await page.click('label:has(input[name=pt-set-size][value=full])');
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#pt-alphabet-print')]);
      const n = pdfPages(fs.readFileSync(await d.path()));
      check('tr vowels at full page size print 8 pages, one per vowel', n === 8, `${n} pages`);
    } catch (e) {
      check('tr vowel set: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open('/tr/yazdirilabilir/isim-yazma-calismasi/', 'desktop');
    page.setDefaultTimeout(5000);
    try {
      await page.evaluate(() => { const d = document.querySelector('details.pt-roster-field'); if (d) d.open = true; });
      await page.click('.pt-audience-field [data-value=class]');
      await page.fill('#pt-name-roster', 'Ali\nAyşe\nCan');
      await page.waitForTimeout(300);
      const cost = (await page.textContent('#pt-sheet-cost')).trim();
      const counts = cost.split(' · ').filter((b) => /^\d/.test(b)).map((b) => b.replace(/^\d+\s*/, ''));
      check('tr class set: the sheet count and the page count use different words', counts.length === 2 && counts[0] !== counts[1], cost);
    } catch (e) {
      check('tr class set: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open('/de/zum-ausdrucken/suchsel/', 'desktop');
    await page.fill('#pt-search-input', 'Apfel');
    await page.waitForTimeout(600);
    const note = await page.evaluate(() => { const n = document.querySelector('.pt-search-note'); return n ? n.textContent : null; });
    check('de word search with one word does not say "alle 1 Wörter"', !!note && !/\b1 Wörter/.test(note), note);
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 28. A promised tool that never rendered. Both Indonesian letter pages say
  // "type a name" and mounted an empty div the engine has no id for, so no
  // field appeared. Typing must draw the name, and Download PDF must write
  // that name's sheet.
  for (const url of ['/id/printables/huruf-bubble/', '/id/printables/huruf-kaligrafi/']) {
    console.log(`\n${url} (the name tool renders and downloads)`);
    const { ctx, page, errors } = await open(url, 'desktop');
    page.setDefaultTimeout(5000);
    try {
      await page.fill('#pt-name-input', 'Rizky');
      await page.waitForTimeout(400);
      const drawn = await page.locator('#pt-name-preview svg').count();
      check('typing a name draws it in the preview', drawn > 0, `${drawn} svg`);
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#pt-name-print')]);
      const buf = fs.readFileSync(await d.path());
      check('Download PDF writes a PDF of that name', buf.slice(0, 4).toString() === '%PDF' && pdfPages(buf) >= 1 && /rizky/i.test(d.suggestedFilename()), d.suggestedFilename());
    } catch (e) {
      check('id name tool: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 29. A monogram with accented initials downloaded as "download", with no
  // extension: the browser drops a non-ASCII filename. The initials fold to
  // ASCII, so the file keeps its name and its type.
  console.log('\n/printables/monogram-maker/ (accented initials keep the file name)');
  {
    const { ctx, page, errors } = await open('/printables/monogram-maker/', 'desktop');
    page.setDefaultTimeout(5000);
    try {
      for (const [id, v] of [['mono-left', 'Ä'], ['mono-center', 'Ö'], ['mono-right', 'Ü']]) await page.fill('#' + id, v);
      await page.waitForTimeout(300);
      const [pdf] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#mono-print')]);
      check('ÄÖÜ downloads monogram-aou.pdf', pdf.suggestedFilename() === 'monogram-aou.pdf', pdf.suggestedFilename());
      const [png] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#mono-png')]);
      check('ÄÖÜ downloads monogram-aou.png', png.suggestedFilename() === 'monogram-aou.png', png.suggestedFilename());
    } catch (e) {
      check('monogram filename: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 23. A pasted word list means one thing in all three puzzle makers. On
  // 2026-10-25 a live audit found "cat, apple, tiger" printed as ONE
  // 13-letter crossword answer, a spreadsheet's word<TAB>clue rows merged
  // into one entry ("cat a small pet") in the crossword, the word search and
  // the scramble, and a list whose words share no letter downloaded as a
  // one-row strip. The paste is read by js/printables/wordList.js, which
  // loads on demand ahead of the puzzle modules, so a real page is the test.
  console.log('\n/printables/crossword-maker/ + word-search-maker/ (pasted lists, the one-row strip)');
  {
    const { ctx, page, errors } = await open('/printables/crossword-maker/', 'desktop');
    page.setDefaultTimeout(5000);
    try {
      const cwRead = () => page.evaluate(() => ({
        clues: [...document.querySelectorAll('#pt-cw-preview .pt-cw-clue-list li')].map((l) => l.textContent),
        pdfOff: document.getElementById('pt-cw-print').disabled,
        pngOff: document.getElementById('pt-cw-png').disabled,
        meta: document.getElementById('pt-cw-meta').textContent
      }));
      await page.fill('#pt-cw-input', 'cat, apple, tiger');
      await page.waitForTimeout(500);
      const comma = await cwRead();
      check('crossword: "cat, apple, tiger" builds 3 entries, none longer than 5', comma.clues.length === 3 && comma.clues.every((c) => /\((3|5)\)$/.test(c)), JSON.stringify(comma.clues));
      await page.fill('#pt-cw-input', 'cat\ta small pet\napple\tred fruit\ntiger\tbig striped cat');
      await page.waitForTimeout(500);
      const tab = await cwRead();
      check('crossword: word<TAB>clue rows keep their clues', tab.clues.length === 3 && tab.clues.some((c) => /^a small pet \(3\)$/.test(c)), JSON.stringify(tab.clues));
      check('crossword: a real crossword can be downloaded', !tab.pdfOff && !tab.pngOff);
      await page.fill('#pt-cw-input', 'dog\nfix');
      await page.waitForTimeout(500);
      const strip = await cwRead();
      check('crossword: words that share no letter cannot download a one-row strip, and say why', strip.pdfOff && strip.pngOff && /share a letter/.test(strip.meta), JSON.stringify(strip));
    } catch (e) {
      check('crossword paste formats: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open('/printables/word-search-maker/', 'desktop');
    page.setDefaultTimeout(5000);
    try {
      await page.fill('#pt-search-input', 'cat\ta small pet\napple\tred fruit\ntiger\tbig striped cat');
      await page.waitForTimeout(500);
      const words = await page.evaluate(() => [...document.querySelectorAll('#pt-search-preview .pt-search-words li')].map((l) => l.textContent));
      check('word search: word<TAB>clue rows hide the word column only', words.join('|') === 'cat|apple|tiger', words.join('|'));
    } catch (e) {
      check('word search paste formats: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // Reversible interactions are only tested once they have come back: every
  // case runs A->B->A->B and reads the state after each press.
  await require('./lib/interaction-round-trips').runInteractionRoundTrips({ open, check, dl });

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
