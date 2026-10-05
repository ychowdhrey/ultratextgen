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
  console.log('\n/usecase/zalgo-text/ and /roblox/name-generator/ (copy events)');
  for (const [url, sel] of [['/usecase/zalgo-text/', '#copyBtn'], ['/roblox/name-generator/', '.rng-mode-panel button[data-name]']]) {
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
