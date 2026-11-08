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

  // 1b. Typed text stays on the device. The FAQ on / (and 19 other English
  // generators, plus the locale homes) says nothing you type is sent to a
  // server; until 2026-11-07 script.js wrote the input into ?q= on every
  // pause, so the text sat in every later event's page_location and in the
  // request line of every reload. The draft now
  // lives in sessionStorage; only an explicit share puts text in a URL.
  console.log('\n/ (typed text never enters the URL)');
  {
    const { ctx, page, errors } = await open('/', 'desktop');
    await page.fill('#mainInput', 'Jane Private');
    await page.waitForTimeout(700);
    check('typing leaves the address bar without ?q=', (await page.evaluate(() => location.search)) === '', await page.evaluate(() => location.href));
    check('typed text reaches no data layer row', !JSON.stringify(await dl(page)).includes('Private'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    check('a reload in the same tab restores the draft', (await page.inputValue('#mainInput')) === 'Jane Private', await page.inputValue('#mainInput'));
    const shareUrl = await page.evaluate(() => window.UltraTextGen.buildShareUrl({ input: 'Jane Private', styleId: 'bold' }));
    check('the Share link still carries the text on purpose', /[?&]q=Jane\+Private(&|$)/.test(shareUrl), shareUrl);
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();

    const s = await open('/?q=' + encodeURIComponent('Shared Hello') + '&style=bold', 'desktop');
    check('an inbound ?q= link opens filled', (await s.page.inputValue('#mainInput')) === 'Shared Hello', await s.page.inputValue('#mainInput'));
    await s.page.waitForTimeout(500);
    check('and keeps its ?q= while the box still shows it', /[?&]q=/.test(await s.page.evaluate(() => location.search)), await s.page.evaluate(() => location.search));
    await s.page.fill('#mainInput', 'Shared Hello again');
    await s.page.waitForTimeout(700);
    const qs = await s.page.evaluate(() => location.search);
    check('the first edit drops the stale ?q= and keeps ?style=', !/[?&]q=/.test(qs) && /[?&]style=bold/.test(qs), qs);
    check('no page errors', !s.errors.length, s.errors.join(' | '));
    await s.ctx.close();
  }

  // 1c. Script-aware order. The map fonts only have Latin glyphs, so on the
  // ru/ar/ja/hi/ko/th homes 9 of the 11 Popular cards copied Cyrillic, Arabic,
  // Japanese… text back unchanged. Text with no Latin letter now gets the styles
  // that change it, ranked frames > case > marks, at the same card count.
  console.log('\n/ru/ and /ar/ (script-aware order for non-Latin text)');
  {
    const cardTexts = (page) => page.evaluate(() => [...document.querySelectorAll('#resultsGrid .style-card .copy-btn')].map((b) => ({ s: b.dataset.style, t: b.getAttribute('data-text') })));
    const { ctx, page, errors } = await open('/ru/', 'mobile');
    await page.fill('#mainInput', 'Hello world');
    await page.waitForTimeout(300);
    const latin = await cardTexts(page);
    for (const [label, text] of [['Russian', 'Привет мир'], ['Arabic', 'مرحبا بالعالم']]) {
      await page.fill('#mainInput', text);
      await page.waitForTimeout(300);
      const got = await cardTexts(page);
      check(`${label}: no Popular card copies the text back unchanged`, got.length > 0 && got.every((c) => c.t !== text), JSON.stringify(got.filter((c) => c.t === text).map((c) => c.s)));
      check(`${label}: the Popular tab keeps its card count`, got.length === latin.length, `${got.length} vs ${latin.length}`);
      check(`${label}: every card still holds the typed letters`, got.every((c) => [...text.replace(/\s/g, '')].every((ch) => c.t.normalize('NFD').includes(ch))), JSON.stringify(got.slice(0, 3)));
    }
    await sentinel(page);
    const first = page.locator('#resultsGrid .copy-btn:not([disabled])').first();
    const want = await first.getAttribute('data-text');
    await first.click();
    await page.waitForTimeout(300);
    check('the first reordered card copies its exact text', (await clip(page)) === want, want);
    await page.fill('#mainInput', 'Jane Привет');
    await page.waitForTimeout(300);
    const mixed = await cardTexts(page);
    check('mixed Latin + Cyrillic keeps the usual order', mixed.map((c) => c.s).join('|') === latin.map((c) => c.s).join('|'), mixed.slice(0, 3).map((c) => c.s).join(', '));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
    const en = await open('/', 'desktop');
    await en.page.fill('#mainInput', 'Hello world');
    await en.page.waitForTimeout(300);
    check('English input keeps the registry order', ((await cardTexts(en.page))[0] || {}).s === 'Ultra Bold', ((await cardTexts(en.page))[0] || {}).s);
    await en.ctx.close();
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
    // The toast is the copy's live region and holds its text only while it is
    // shown (case 22), so it is read after a copy.
    await page.fill('#mainInput', 'Luna');
    await page.waitForTimeout(300);
    await page.locator('#resultsGrid .copy-btn:not([disabled])').first().click();
    await page.waitForTimeout(100);
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

  // 11a. A controller's own .copy-btn is not script.js's. The before/after
  // emoji library cards keep their text in data-copy-text; script.js's
  // page-wide .copy-btn handler read data-text and wrote "" after the card's
  // own write, so the button said "Copied ✓" and the clipboard was empty
  // (2026-11-08 audit).
  console.log('\n/usecase/before-after-emoji/ (library card copies its own text)');
  {
    const { ctx, page, errors } = await open('/usecase/before-after-emoji/', 'desktop');
    const card = page.locator('#etgLibraryGrid .etg-copy-btn').first();
    const want = decodeURIComponent((await card.getAttribute('data-copy-text')) || '');
    await sentinel(page);
    const n0 = (await dl(page)).length;
    await card.click();
    await page.waitForTimeout(400);
    check('the library card puts its own text on the clipboard', !!want && (await clip(page)) === want, `${JSON.stringify(await clip(page))} vs ${JSON.stringify(want)}`);
    const ev = (await dl(page)).slice(n0).filter((e) => e.event === 'copy_text');
    check('and records one copy_text', ev.length === 1, JSON.stringify(ev));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 11b0. The zalgo sliders are named. Both range inputs had no label of any
  // kind on all 13 pages that load zalgo-text.js (2026-11-08 audit).
  console.log('\n/usecase/zalgo-text/ and /ko/usecase/geullichi-tekseuteu/ (slider names)');
  for (const url of ['/usecase/zalgo-text/', '/ko/usecase/geullichi-tekseuteu/']) {
    const { ctx, page, errors } = await open(url, 'desktop');
    for (const id of ['frequencySlider', 'amplitudeSlider']) {
      const name = await page.evaluate((sid) => {
        const s = document.getElementById(sid);
        const ref = s && s.getAttribute('aria-labelledby');
        const lab = ref && document.getElementById(ref);
        return (s && s.getAttribute('aria-label')) || (lab ? lab.textContent.trim() : '');
      }, id);
      check(`${url} #${id} has an accessible name`, !!name, JSON.stringify(name));
    }
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
  // /ja/purinto/onamae-seal/: two three-column tables (30rem floor) sat outside
  // .data-table-wrap and panned the page 130px sideways (2026-11-08 audit).
  for (const [url, typed] of [['/usecase/vertical-text/', ''], ['/it/lettere-in-corsivo/', 'Luna'], ['/de/zum-ausdrucken/buchstaben-nachspuren/', ''], ['/ja/purinto/onamae-seal/', '']]) {
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
    // A remembered list waits behind "Whole class" (case 25).
    await page.click('.pt-audience-field .pt-choice[data-value="class"]');
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

  // 23. Sharing a saved set shares the set. Without a native share sheet the
  // strip's Share copied the PAGE URL for two or more saved symbols, so the
  // recipient got a page instead of the shortlist, and it confirmed that in
  // English ("Link copied") under Korean prose.
  console.log('\n/ko/library/imotikon/ (saved strip Share without a share sheet)');
  {
    const { ctx, page, errors } = await open('/ko/library/imotikon/', 'desktop', () => {
      try { delete Navigator.prototype.share; } catch (e) { /* already absent */ }
      if (!localStorage.getItem('utg_saved_items')) {
        localStorage.setItem('utg_saved_items', JSON.stringify([
          { type: 'symbol', value: '★', label: '★', href: '', t: 2 },
          { type: 'symbol', value: '♥', label: '♥', href: '', t: 1 }
        ]));
      }
    });
    page.setDefaultTimeout(5000);
    try {
      check('the page has no native share sheet', await page.evaluate(() => typeof navigator.share !== 'function'));
      await sentinel(page);
      const before = (await dl(page)).length;
      const btn = page.locator('.symbol-saved-strip .share-result-btn').first();
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await page.waitForTimeout(300);
      const copied = await clip(page);
      check('strip Share with two saved items copies the items, not a URL', copied === '★ ♥', JSON.stringify(copied));
      const label = (await btn.locator('.share-result-label').textContent()) || '';
      check('strip Share confirms in the page language', /[가-힣]/.test(label) && !/Link copied|Copied|Failed/.test(label), label);
      // Share rows are read by their share_method key: the event name is a
      // literal only share-core.js may contain (test:share-core asserts it).
      const rows = (await dl(page)).slice(before).filter((e) => e.share_method);
      check('the strip copy records one clipboard share row, format text',
        rows.length === 1 && rows[0].share_method === 'link_copy' && rows[0].share_destination === 'clipboard'
          && rows[0].share_surface === 'library_saved' && rows[0].share_format === 'text', JSON.stringify(rows));
    } catch (e) {
      check('saved strip Share: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 24. The generator's Save follows the store, not the list it loaded with.
  // script.js repainted its stars only after its own clicks, so a style saved
  // in another tab still read "Save" here, and pressing it flipped the store:
  // it REMOVED the style the visitor had just asked to keep.
  console.log('\n/ (generator Save across tabs)');
  {
    const { ctx, page, errors } = await open('/', 'desktop');
    page.setDefaultTimeout(5000);
    try {
      await page.fill('#mainInput', 'Luna');
      await page.waitForTimeout(300);
      const names = await page.evaluate(() => [...document.querySelectorAll('#resultsGrid .save-btn')].slice(0, 2).map((b) => b.dataset.style));
      const [x, y] = names;
      const star = (name) => page.evaluate((n) => {
        const b = [...document.querySelectorAll('#resultsGrid .save-btn')].find((e) => e.dataset.style === n);
        return b ? b.getAttribute('aria-pressed') : null;
      }, name);
      const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('utg_saved_items') || '[]').filter((r) => r.type === 'style').map((r) => r.value));
      check('two unsaved styles to work with', !!x && !!y && (await star(x)) === 'false' && (await star(y)) === 'false', JSON.stringify(names));

      // Another tab in the same browser saves x; this tab hears the storage event.
      const other = await ctx.newPage();
      await other.goto(BASE + '/', { waitUntil: 'load' });
      await other.waitForTimeout(700);
      await other.fill('#mainInput', 'Luna');
      await other.waitForTimeout(300);
      await other.locator(`#resultsGrid .save-btn[data-style="${x.replace(/"/g, '\\"')}"]`).first().click();
      await other.waitForTimeout(400);
      check('a save in another tab repaints this tab\'s star', (await star(x)) === 'true', await star(x));
      check('and lists the style in this tab\'s saved section',
        await page.evaluate((n) => [...document.querySelectorAll('#savedGrid .save-btn')].some((b) => b.dataset.style === n), x));
      await other.close();

      // The race the listener cannot close: storage changes before this tab
      // hears about it (written here directly, so no event arrives). The star
      // still reads "Save"; pressing it must keep y saved, not remove it.
      await page.evaluate((n) => {
        const list = JSON.parse(localStorage.getItem('utg_saved_items') || '[]');
        list.unshift({ type: 'style', value: n, label: n, href: '', t: Date.now() });
        localStorage.setItem('utg_saved_items', JSON.stringify(list));
      }, y);
      check('the stale star still reads Save before the press', (await star(y)) === 'false', await star(y));
      await page.locator(`#resultsGrid .save-btn[data-style="${y.replace(/"/g, '\\"')}"]`).first().click();
      await page.waitForTimeout(300);
      check('pressing a stale Save keeps the style saved', (await stored()).includes(y), JSON.stringify(await stored()));
      check('and the star now reads Saved', (await star(y)) === 'true', await star(y));
      check('the other tab\'s save survives', (await stored()).includes(x), JSON.stringify(await stored()));
    } catch (e) {
      check('generator Save across tabs: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 25. The library star carries the same intent. A storage write this tab
  // has not heard about yet leaves a star reading "Save"; pressing it must
  // keep the symbol saved, where a flip of the store removed it.
  console.log('\n/library/heart-symbols/ (stale Save star keeps the symbol)');
  {
    const { ctx, page, errors } = await open('/library/heart-symbols/', 'desktop');
    page.setDefaultTimeout(5000);
    try {
      const sym = await page.locator('.flag-row .symbol-save-btn').first().getAttribute('data-symbol');
      const starState = () => page.evaluate((v) => {
        const b = [...document.querySelectorAll('.symbol-save-btn')].find((e) => e.getAttribute('data-symbol') === v);
        return b ? b.getAttribute('aria-pressed') : null;
      }, sym);
      await page.evaluate((v) => {
        const list = JSON.parse(localStorage.getItem('utg_saved_items') || '[]');
        list.unshift({ type: 'symbol', value: v, label: v, href: '', t: Date.now() });
        localStorage.setItem('utg_saved_items', JSON.stringify(list));
      }, sym);
      check('the stale star still reads Save before the press', (await starState()) === 'false', await starState());
      await page.locator('.flag-row .symbol-save-btn').first().click({ force: true });
      await page.waitForTimeout(300);
      const kept = await page.evaluate((v) => JSON.parse(localStorage.getItem('utg_saved_items') || '[]').some((r) => r.type === 'symbol' && r.value === v), sym);
      check('pressing a stale library Save star keeps the symbol saved', kept, sym);
      check('and the star now reads Saved', (await starState()) === 'true', await starState());
    } catch (e) {
      check('library stale star: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 25b. A save the browser refused says so. With site data blocked the store
  // keeps the item for this page only, and the generator's saved section still
  // promised "Saved on this device". English pages show one line instead;
  // a locale page has no translation for it and stays as it was.
  console.log('\nsaved strip with storage blocked (one line, English only)');
  {
    const blockStorage = () => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    };
    const saveFirstSymbol = (page) => page.locator('.flag-row .symbol-save-btn').first().click({ force: true });
    for (const [url, blocked, wantNote] of [
      ['/library/heart-symbols/', true, true],
      ['/library/heart-symbols/', false, false],
      ['/id/library/simbol-love/', true, false]
    ]) {
      const label = `${url} storage ${blocked ? 'blocked' : 'allowed'}`;
      const { ctx, page, errors } = await open(url, 'desktop', blocked ? blockStorage : undefined);
      await saveFirstSymbol(page);
      await page.waitForTimeout(200);
      const notes = await page.locator('#symbolSavedStrip .symbol-saved-note').count();
      check(`${label}: the strip ${wantNote ? 'says the save was not kept' : 'adds no line'}`, notes === (wantNote ? 1 : 0), String(notes));
      check(`${label}: no page errors`, !errors.length, errors.join(' | '));
      await ctx.close();
    }
    for (const [blocked, wantHint] of [[true, false], [false, true]]) {
      const { ctx, page, errors } = await open('/', 'desktop', blocked ? blockStorage : undefined);
      await page.fill('#mainInput', 'Luna');
      await page.waitForTimeout(300);
      await page.locator('#resultsGrid .save-btn').first().click();
      await page.waitForTimeout(300);
      const hint = await page.evaluate(() => { const h = document.querySelector('#savedSection .saved-hint'); return h ? h.textContent : null; });
      const claims = /Saved on this device/.test(hint || '');
      check(`/ storage ${blocked ? 'blocked' : 'allowed'}: the saved section ${wantHint ? 'keeps its hint' : 'makes no "Saved on this device" claim'}`, claims === wantHint, hint);
      check(`/ storage ${blocked ? 'blocked' : 'allowed'}: no page errors`, !errors.length, errors.join(' | '));
      await ctx.close();
    }
  }

  // 26. Decoration chips are buttons. They were spans with a click handler,
  // so Tab never reached them, Enter and Space did nothing, and a screen
  // reader did not announce them as controls: without a mouse, nobody could
  // add a decoration. Tab must land on a chip, and Enter and Space must
  // change the results exactly as a click does. EN and a locale page.
  for (const url of ['/', '/de/fette-schrift/']) {
    console.log(`\n${url} (decoration chips work from the keyboard)`);
    const { ctx, page, errors } = await open(url, 'desktop');
    try {
      await page.fill('#mainInput', 'Luna');
      const chip = page.locator('#decorationGrid .decoration-item').first();
      const deco = () => page.evaluate(() => {
        const d = document.querySelector('#resultsGrid .style-decoration');
        return d ? d.textContent : null;
      });
      const pressed = () => chip.getAttribute('aria-pressed');
      check('the chips are buttons', (await chip.evaluate((e) => e.tagName)) === 'BUTTON' &&
        (await page.locator('#decorationGrid .clear-decoration').evaluate((e) => e.tagName)) === 'BUTTON');
      await chip.click();
      await page.waitForTimeout(200);
      const byClick = await deco();
      await page.click('#decorationGrid .clear-decoration');
      await page.waitForTimeout(200);
      check('a click decorates the results and None clears them', !!byClick && (await deco()) === null, String(byClick));
      await page.locator('.decoration-tab').last().focus();
      let reached = false;
      for (let i = 0; i < 12 && !reached; i++) {
        await page.keyboard.press('Tab');
        reached = await page.evaluate(() => !!document.activeElement && document.activeElement.matches('#decorationGrid .decoration-item'));
      }
      check('Tab reaches a decoration chip', reached);
      await chip.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      check('Enter decorates the results the way a click does', !!byClick && (await deco()) === byClick && (await pressed()) === 'true', `${await deco()} / aria-pressed=${await pressed()}`);
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      check('Space on the selected chip clears it', (await deco()) === null && (await pressed()) === 'false', `${await deco()} / aria-pressed=${await pressed()}`);
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      check('Space selects it again', (await deco()) === byClick && (await pressed()) === 'true', `${await deco()} / aria-pressed=${await pressed()}`);
    } catch (e) {
      check('decoration chips: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 25. A remembered class never prints in place of the name on screen, and
  // Clear names forgets it everywhere it is stored. A remembered class reopened
  // on "Whole class", so an untouched Download printed last week's class; and
  // each "Your recent sheets" link carried roster=<every name>, which Clear
  // names left behind. Both found by a live audit on 2026-10-25.
  console.log('\n/printables/name-tracing/ (a saved class waits behind Whole class; Clear names scrubs recents)');
  {
    const { ctx, page, errors } = await open('/printables/name-tracing/', 'desktop');
    page.setDefaultTimeout(5000);
    try {
    await page.click('.pt-audience-field .pt-choice[data-value="class"]');
    await page.fill('#pt-name-roster', 'Zoe\nJose\nAva');
    await page.waitForTimeout(1100);
    await page.evaluate(() => window.UltraTextGen.printPrefs.rememberRecent({ href: location.origin + '/printables/name-tracing/?name=Zoe&roster=Zoe%7CJose%7CAva', label: 'Zoe', page: 'Name tracing', sheet: 'name' }));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(700);
    const aud = await page.evaluate(() => document.getElementById('pt-name-roster').dataset.ptAudience);
    const cost = await page.evaluate(() => { const c = document.querySelector('.pt-sheet-cost'); return c ? c.textContent : ''; });
    check('a remembered class opens on One sheet: one sheet, not three', aud === 'one' && !/^3 sheets/.test(cost), aud + ' / ' + cost);
    // The switch says it in a sentence under the choices, naming Whole class.
    check('Whole class says how many names are saved', /saved on this device \(3 names\)\. Choose Whole class/.test(await page.textContent('.pt-audience-field')));
    await page.click('.pt-audience-field .pt-choice[data-value="class"]');
    check('Whole class brings the saved list back', (await page.inputValue('#pt-name-roster')).includes('Jose'));
    await page.click('.pt-roster-clear');
    const recent = await page.evaluate(() => localStorage.getItem('utg_printables_recent') || '');
    check('Clear names removes the class from the recent-sheet links', recent.includes('name-tracing') && !/roster=|Jose/.test(recent), recent);
    await page.goto(BASE + '/printables/name-tracing/?roster=Mia%7CLeo', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    check('a ?roster= link still opens on Whole class', (await page.evaluate(() => document.getElementById('pt-name-roster').dataset.ptAudience)) === 'class');
    } catch (e) {
      check('saved class: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
    const bl = await open('/printables/block-letters/', 'desktop');
    await bl.page.evaluate(() => localStorage.setItem('utg_printables_roster', 'Emma\nNoah'));
    await bl.page.reload({ waitUntil: 'load' });
    await bl.page.waitForTimeout(700);
    check('block-letters keeps its previous behaviour (remembered class opens on Whole class)', (await bl.page.evaluate(() => { const r = document.getElementById('pt-name-roster'); return r && r.dataset.ptAudience; })) === 'class');
    await bl.ctx.close();
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

  // 23. Monogram initials. Each box is prefilled with maxlength=1, and a full
  // box dropped the keystroke: tapping S and typing Q left J S L, and "ERM"
  // typed into the first box gave E S L. All three boxes empty downloaded a
  // blank page. Driven through the boxes themselves, on a phone; the PDF's
  // file name carries the initials the export drew.
  for (const [url, device, reason] of [['/printables/monogram-maker/', 'mobile', 'Type initials'], ['/pl/do-druku/monogram/', 'desktop', 'Wpisz inicjały']]) {
    console.log(`\n${url} (monogram initials overtype, advance, paste; empty waits)`);
    const { ctx, page, errors } = await open(url, device);
    page.setDefaultTimeout(5000);
    try {
      const boxes = () => page.evaluate(() => ['mono-left', 'mono-center', 'mono-right'].map((i) => document.getElementById(i).value).join(''));
      const tap = (sel) => (device === 'mobile' ? page.tap(sel) : page.click(sel));
      const first = await boxes();
      await tap('#mono-center');
      await page.keyboard.type('Q');
      const q = await boxes();
      check('tap the middle box and type Q: only the middle letter changes', q === first[0] + 'Q' + first[2], `${first} -> ${q}`);
      await tap('#mono-left');
      await page.keyboard.type('erm');
      check('"erm" typed into the first box fills all three, uppercased', (await boxes()) === 'ERM', await boxes());
      await page.evaluate(() => {
        const dt = new DataTransfer(); dt.setData('text/plain', 'a.b c');
        document.getElementById('mono-left').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      });
      check('a paste of "a.b c" fills the boxes in order', (await boxes()) === 'ABC', await boxes());
      await page.waitForTimeout(300);
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#mono-print')]);
      const buf = fs.readFileSync(await d.path());
      check('the PDF is written for the typed initials', buf.slice(0, 4).toString() === '%PDF' && d.suggestedFilename() === 'monogram-abc.pdf', d.suggestedFilename());
      for (const id of ['mono-left', 'mono-center', 'mono-right']) await page.fill('#' + id, '');
      await page.waitForTimeout(300);
      const empty = await page.evaluate(() => {
        const n = document.getElementById('mono-empty-note');
        return { pdf: document.getElementById('mono-print').disabled, png: document.getElementById('mono-png').disabled, note: n && !n.hidden ? n.textContent : '' };
      });
      check('all boxes empty: Download PDF and PNG wait, with the page\'s own reason', empty.pdf && empty.png && empty.note === reason, JSON.stringify(empty));
      await tap('#mono-right');
      await page.keyboard.type('k');
      await page.waitForTimeout(200);
      check('a letter typed back in re-enables the downloads', await page.evaluate(() => !document.getElementById('mono-print').disabled && document.getElementById('mono-empty-note').hidden));
    } catch (e) {
      check('monogram: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // Captures what each PDF export hands the PDF writer: the text of every SVG
  // on the print surface, page unit by page unit, read from the root
  // renderPages() is given.
  const sheetTextCapture = `(function () {
    const UTG = (window.UltraTextGen = window.UltraTextGen || {});
    let real;
    Object.defineProperty(UTG, 'pdf', { configurable: true, get() { return real; }, set(v) {
      real = v && Object.assign({}, v, { renderPages: async function (root, o) {
        window.__ptPages = Array.from(root.querySelectorAll('.pt-sheet-page, .pt-banner-page')).map((p) => Array.from(p.querySelectorAll('svg text')).map((t) => t.textContent.trim()).filter(Boolean));
        window.__ptText = Array.from(root.querySelectorAll('svg text')).map((t) => t.textContent.trim()).filter(Boolean);
        return v.renderPages(root, o);
      } });
    } });
  })();`;

  // 24. Sight words. The "friend" chip set the word picker to a value it has no
  // option for, so the picker selected nothing and the sheet printed "said".
  // Every chip is checked against the picker, and the last chip's PDF is read.
  console.log('\n/printables/sight-word-tracing/ (every chip prints its own word)');
  {
    const { ctx, page, errors } = await open('/printables/sight-word-tracing/', 'desktop', sheetTextCapture);
    page.setDefaultTimeout(5000);
    try {
      const chips = await page.$$eval('.quickfill [data-fill]', (bs) => bs.map((b) => [b.dataset.fill, b.textContent.trim()]));
      const off = [];
      for (const [w, label] of chips) {
        await page.click(`.quickfill [data-fill="${w}"]`);
        const v = await page.inputValue('#pt-gen-input');
        if (v !== w || label !== w) off.push(`${label} -> ${v || '(nothing)'}`);
      }
      check(`all ${chips.length} chips select their own word in the picker`, chips.length > 0 && !off.length, off.join(', '));
      const last = chips[chips.length - 1][0];
      await page.click(`.quickfill [data-fill="${last}"]`);
      await page.waitForTimeout(400);
      await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#pt-gen-print')]);
      const text = await page.evaluate(() => window.__ptText || []);
      check(`the "${last}" chip's PDF traces "${last}", not "said"`, text.includes(last) && !text.includes('said'), JSON.stringify(text.slice(0, 4)));
    } catch (e) {
      check('sight words: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 25. Coloring page maker, Whole class, two typed lines. Each child's sheet
  // printed the roster name instead of the design, so one of the two lines
  // was dropped from every sheet. The PDF's pages are read.
  console.log('\n/printables/coloring-page-maker/ (a class set keeps both lines)');
  {
    const { ctx, page, errors } = await open('/printables/coloring-page-maker/', 'desktop', sheetTextCapture);
    page.setDefaultTimeout(5000);
    try {
      await page.fill('#pt-design-input', 'Happy Birthday\nEmma');
      await page.click('#pt-design-audience [data-value=class]');
      await page.fill('#pt-design-roster', 'Noah\nAva\nLiam');
      await page.waitForTimeout(400);
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#pt-design-print')]);
      const buf = fs.readFileSync(await d.path());
      const pages = await page.evaluate(() => window.__ptPages || []);
      const want = ['Noah', 'Ava', 'Liam'].map((n) => ['Happy Birthday', n]);
      const ok = pages.length === 3 && want.every((w, i) => w.every((s) => (pages[i] || []).includes(s)));
      check('3 children, 3 pages, each with "Happy Birthday" and that child\'s name', ok && pdfPages(buf) === 3, `${pdfPages(buf)} PDF pages; ${JSON.stringify(pages)}`);
    } catch (e) {
      check('coloring class set: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 26. Banner maker size line. It ended in a constant "US Letter" whatever
  // paper was chosen, in English on the Polish page. The line is compared
  // with the PDF's own MediaBox and page count.
  for (const [url, a4, land, letter] of [['/printables/banner-maker/', 'A4', 'Landscape', 'US Letter'], ['/pl/do-druku/banery-z-literami/', 'A4', 'Pozioma', 'US Letter']]) {
    console.log(`\n${url} (the size line names the PDF's paper)`);
    const { ctx, page, errors } = await open(url, 'desktop');
    page.setDefaultTimeout(5000);
    try {
      await page.fill('#pt-banner-input', 'HAPPY BIRTHDAY');
      const sum = await page.$('#pt-print-settings summary');
      if (sum) await sum.click();
      await page.click('#pt-print-settings button:text-is("A4")');
      await page.click(`#pt-print-settings button:text-is("${land}")`);
      await page.waitForTimeout(400);
      const line = await page.textContent('#pt-banner-meta');
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#pt-banner-print')]);
      const buf = fs.readFileSync(await d.path());
      const box = (buf.toString('latin1').match(/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/) || []).slice(1).map(Number);
      check(`A4 + ${land}: the line names them and not ${letter}`, line.includes(a4) && line.includes(land) && !line.includes(letter), line);
      check('the PDF is A4 landscape (842 x 595 pt)', Math.round(box[0]) === 842 && Math.round(box[1]) === 595, box.join(' x '));
      check('the line\'s page count is the PDF\'s', (line.match(/\d+/g) || [])[1] == pdfPages(buf), `${line} vs ${pdfPages(buf)} pages`);
    } catch (e) {
      check('banner size line: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 27. A letter chip tap on a phone. The tap only recoloured the chip; the
  // letter it opened sat below the fold. Now the panel comes up under the
  // header, at once under reduced motion. block-letters is revenue-frozen and
  // must not move.
  for (const [url, moves, reduce] of [['/printables/bubble-letters/', true, false], ['/es/imprimibles/letras-burbuja/', true, true], ['/printables/block-letters/', false, false]]) {
    console.log(`\n${url} (390x844: a chip tap ${moves ? 'scrolls the letter into view' : 'does not scroll, frozen page'})`);
    const { ctx, page, errors } = await open(url, 'mobile');
    page.setDefaultTimeout(5000);
    try {
      if (reduce) await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => { const s = document.getElementById('pt-strip'); window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 200); });
      await page.waitForTimeout(400);
      const before = await page.evaluate(() => ({ y: Math.round(window.scrollY), top: Math.round(document.getElementById('pt-panel').getBoundingClientRect().top) }));
      await page.tap('#pt-strip .pt-chip[data-char="M"]');
      await page.waitForTimeout(reduce ? 80 : 1200);
      const after = await page.evaluate(() => ({ y: Math.round(window.scrollY), top: Math.round(document.getElementById('pt-panel').getBoundingClientRect().top), on: document.querySelector('#pt-strip .pt-chip.is-active').dataset.char }));
      check('the tapped chip is selected', after.on === 'M', after.on);
      if (moves) {
        check(`the panel starts below 60% of the screen and ends in the top quarter${reduce ? ', at once under reduced motion' : ''}`, before.top > 844 * 0.6 && after.top >= 0 && after.top < 844 * 0.25, `${before.top}px -> ${after.top}px`);
      } else {
        check('the page does not scroll', after.y === before.y, `${before.y} -> ${after.y}`);
      }
    } catch (e) {
      check('chip tap: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 28. Ready word lists on the four word tools. A chip replaces the box and
  // the tool updates as if the words were typed; typing turns the chip off.
  for (const [url, box, chip, read] of [
    ['/printables/word-search-maker/', '#pt-search-input', 'dolch-primer-1', () => [...document.querySelectorAll('#pt-search-preview .pt-search-words li')].length],
    ['/printables/word-scramble-maker/', '#pt-sc-input', 'family-at', () => [...document.querySelectorAll('#pt-sc-preview .pt-sc-list li')].length],
    ['/printables/spelling-worksheet-generator/', '#pt-sp-input', 'fry-100-2', () => parseInt(document.getElementById('pt-sp-meta').textContent, 10)],
    ['/printables/crossword-maker/', '#pt-cw-input', 'days', () => [...document.querySelectorAll('#pt-cw-preview .pt-cw-bank li')].length]
  ]) {
    console.log(`\n${url} (a ready word list fills the box and the sheet)`);
    const { ctx, page, errors } = await open(url, 'desktop');
    page.setDefaultTimeout(5000);
    try {
      await page.click('.pt-wordlist-presets > summary');
      const sel = `.pt-wordlist-presets .pt-gen-wordset[data-set="${chip}"]`;
      const want = (await page.getAttribute(sel, 'data-words')).split('|');
      await page.click(sel);
      await page.waitForTimeout(500);
      check(`the ${chip} chip replaces the box with its ${want.length} words`, (await page.inputValue(box)) === want.join('\n'));
      const n = await page.evaluate(read);
      check(`the sheet shows the ${want.length} words`, n === want.length, `${n}`);
      check('the chip is lit', (await page.getAttribute(sel, 'aria-pressed')) === 'true');
      await page.type(box, 'x');
      check('typing in the box turns the chip off', (await page.getAttribute(sel, 'aria-pressed')) === 'false');
    } catch (e) {
      check('ready word lists: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  {
    const fr = await open('/fr/imprimables/mots-meles/', 'desktop');
    check('the French word search carries no English ready lists', (await fr.page.locator('.pt-wordlist-presets').count()) === 0);
    await fr.ctx.close();
  }

  // 29. Spelling class set: "Noah 3" prints Noah's Trace, write, remember page
  // on the copy rung while the class keeps the picker's dotted rung.
  console.log('\n/printables/spelling-worksheet-generator/ (a per-child rung in the class list)');
  {
    const notes = `(function () {
      const UTG = (window.UltraTextGen = window.UltraTextGen || {});
      let real;
      Object.defineProperty(UTG, 'pdf', { configurable: true, get() { return real; }, set(v) {
        real = v && Object.assign({}, v, { renderPages: async function (root, o) {
          window.__ptNotes = Array.from(root.querySelectorAll('.pt-sp-trace')).map((sh) => [(sh.querySelector('.pt-search-heading-text') || {}).textContent || '', (sh.querySelector('.pt-search-note') || {}).textContent || '']);
          return v.renderPages(root, o);
        } });
      } });
    })();`;
    const { ctx, page, errors } = await open('/printables/spelling-worksheet-generator/', 'desktop', notes);
    page.setDefaultTimeout(5000);
    try {
      check('the class list placeholder shows the level syntax', /Noah 2/.test(await page.getAttribute('#pt-sp-roster', 'placeholder')));
      await page.evaluate(() => { const d = document.querySelector('#pt-sp-roster').closest('details'); if (d) d.open = true; });
      const sw = page.locator('.pt-audience-field .pt-choice[data-value="class"]');
      if (await sw.count()) await sw.first().click();
      await page.fill('#pt-sp-roster', 'Emma\nNoah 3');
      await page.waitForTimeout(500);
      await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#pt-sp-print')]);
      const got = await page.evaluate(() => window.__ptNotes || []);
      const emma = got.find((x) => /Emma/.test(x[0]));
      const noah = got.find((x) => /Noah/.test(x[0]));
      check('Emma traces (dotted); Noah, at level 3, copies', !!emma && !!noah && /^Trace each word/.test(emma[1]) && /^Read each word/.test(noah[1]) && !/Noah 3/.test(noah[0]), JSON.stringify(got));
    } catch (e) {
      check('spelling per-child rung: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 30. The N-per-sheet control is on the page before a list is typed: shown,
  // switched off with a one-line hint, and on at two names. block-letters is
  // frozen and keeps it hidden.
  console.log('\n/printables/name-tracing/ (Sheets per page is visible before two names)');
  {
    const { ctx, page, errors } = await open('/printables/name-tracing/', 'desktop');
    page.setDefaultTimeout(5000);
    try {
      const state = () => page.evaluate(() => {
        const f = document.querySelector('.pt-nup-field');
        const h = f && f.querySelector('.pt-nup-hint');
        return f && { shown: !f.hidden && f.offsetParent !== null, off: [...f.querySelectorAll('.pt-choice')].every((b) => b.disabled), hint: !!h && !h.hidden };
      });
      const before = await state();
      check('before a list: shown, switched off, with its hint', before && before.shown && before.off && before.hint, JSON.stringify(before));
      await page.click('.pt-audience-field .pt-choice[data-value="class"]');
      await page.fill('#pt-name-roster', 'Mia\nLeo');
      await page.waitForTimeout(400);
      const after = await state();
      check('at two names: switched on, hint gone', after && after.shown && !after.off && !after.hint, JSON.stringify(after));
    } catch (e) {
      check('N-up before a list: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
    const bl = await open('/printables/block-letters/', 'desktop');
    check('block-letters keeps Sheets per page hidden until two names', await bl.page.evaluate(() => { const f = document.querySelector('.pt-nup-field'); return !f || f.hidden; }));
    await bl.ctx.close();
  }

  // 31. Your recent sheets: one chip per sheet, separate, named by what the
  // sheet holds. Entries ran together as one string ("Zoë JoséZoë José") and
  // the word tools were all labelled with their page title.
  console.log('\n/printables/word-search-maker/ (recent sheets: separate, de-duplicated, labelled by content)');
  {
    const { ctx, page, errors } = await open('/printables/word-search-maker/', 'desktop');
    page.setDefaultTimeout(5000);
    try {
      await page.evaluate(() => localStorage.setItem('utg_printables_recent', JSON.stringify([
        { href: location.origin + '/printables/name-tracing/?name=Zo%C3%AB', label: 'Zoë', page: 'Name Tracing Worksheets', sheet: 'name', t: 3 },
        { href: '/printables/name-tracing/?name=Zo%C3%AB', label: 'Zoë', page: 'Name Tracing Worksheets', sheet: 'name', t: 2 },
        { href: '/printables/name-tracing/?name=Jos%C3%A9', label: 'José', page: 'Name Tracing Worksheets', sheet: 'name', t: 1 }
      ])));
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(700);
      const chips = () => page.evaluate(() => [...document.querySelectorAll('.pt-recent:not(.pt-saved-strip) .pt-recent-list > li > a.pt-recent-link')].map((a) => [a.querySelector('.pt-recent-label').textContent, (a.querySelector('.pt-recent-page') || {}).textContent || '']));
      const c1 = await chips();
      check('one chip per sheet, each in its own list item', c1.length === 2 && c1[0][0] === 'Zoë' && c1[1][0] === 'José', JSON.stringify(c1));
      check('the page is the chip\'s second line', c1.length && c1[0][1] === 'Name Tracing Worksheets', JSON.stringify(c1));
      const gap = await page.evaluate(() => { const a = [...document.querySelectorAll('.pt-recent:not(.pt-saved-strip) .pt-recent-link')]; return a.length > 1 ? Math.round(a[1].getBoundingClientRect().left - a[0].getBoundingClientRect().right) : -1; });
      check('chips are visibly apart', gap > 0, `${gap}px`);
      await page.fill('#pt-search-input', 'because\nfriend\npeople\nschool');
      await page.waitForTimeout(400);
      await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#pt-search-print')]);
      await page.waitForTimeout(400);
      const c2 = await chips();
      check('a word search is remembered by its words, not the page title', c2.length && c2[0][0] === 'because, friend, people, …', JSON.stringify(c2[0]));
    } catch (e) {
      check('recent strip: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 32. Name labels, Classroom: the English chip opens the class list on
  // 2.625 x 1in labels; a locale label page carries no such chip.
  console.log('\n/printables/name-labels/ (the Classroom preset)');
  {
    const { ctx, page, errors } = await open('/printables/name-labels/', 'desktop');
    page.setDefaultTimeout(5000);
    try {
      await page.click('#lb-what [data-value="classroom"]');
      await page.waitForTimeout(300);
      const st = await page.evaluate(() => ({ on: document.querySelector('#lb-what [data-value="classroom"]').getAttribute('aria-checked'), list: !document.getElementById('lb-list-box').hidden, size: window.UltraTextGen.labels.state.size, hint: document.getElementById('lb-what-hint').textContent, ph: document.getElementById('lb-line2').placeholder }));
      check('Classroom is chosen, opens the list, picks 2.625 x 1in labels', st.on === 'true' && st.list && st.size === 's', JSON.stringify(st));
      check('its hint and second line speak about the class and the room', /class list/.test(st.hint) && /room/i.test(st.ph), JSON.stringify(st));
    } catch (e) {
      check('classroom preset: every step ran', false, e.message.split('\n')[0]);
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
    for (const u of ['/pt/imprimiveis/etiquetas-escolares/', '/id/printables/label-nama/']) {
      const o = await open(u, 'desktop');
      check(`${u} carries no Classroom chip`, (await o.page.locator('#lb-what [data-value="classroom"]').count()) === 0);
      await o.ctx.close();
    }
  }

  // 33. Graffiti name: the sheet has three hollow trace rows, so the
  // left-handed option is offered there.
  console.log('\n/printables/graffiti-name/ (left-handed model)');
  {
    const { ctx, page, errors } = await open('/printables/graffiti-name/', 'desktop');
    check('the left-handed option is on the page', await page.isVisible('#pt-lefty'));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 34. Share buttons say what they do on this browser (2026-11-01). Headless
  // Chromium has no navigator.share and cannot share files, so every primary
  // share button is a Copy link and every image button a Download, and each
  // says so up front; the share row is stamped with its own surface, never
  // the generator's. A Korean library page keeps its translated Share label
  // (no Korean "Copy link" exists) rather than showing the English word.
  console.log('\nshare buttons: label follows the action, surface names the lane');
  {
    const hasShare = async (page) => page.evaluate(() => typeof navigator.share === 'function');
    const { ctx, page, errors } = await open('/', 'desktop');
    await page.fill('#mainInput', 'Luna');
    await page.waitForTimeout(400);
    const btn = page.locator('#resultsGrid .share-result-btn:not([disabled])').first();
    const img = page.locator('#resultsGrid .share-image-btn:not([disabled])').first();
    const noSheet = !(await hasShare(page));
    check('generator: the share button carries its surface', (await btn.getAttribute('data-share-surface')) === 'generator');
    check('generator: without a share sheet the button says Copy link', !noSheet || (await btn.locator('.share-result-label').textContent()) === 'Copy link', await btn.locator('.share-result-label').textContent());
    check('generator: and its accessible name says so too', !noSheet || /^Copy link: /.test(await btn.getAttribute('aria-label') || ''), await btn.getAttribute('aria-label'));
    check('generator: the image button says Download where it cannot share a file', !noSheet || (await img.getAttribute('title')) === 'Download image', await img.getAttribute('title'));
    await sentinel(page);
    const n0 = (await dl(page)).length;
    await btn.click();
    await page.waitForTimeout(300);
    // A share row is the one with share_method: share-core.js is the only
    // writer of the event, and test:share-core keeps its name out of every
    // other file, this one included.
    const shareRows = (events) => events.filter((e) => e.share_method);
    const rows = shareRows((await dl(page)).slice(n0));
    check('generator: the press records one row with surface generator', rows.length === 1 && rows[0].share_surface === 'generator', JSON.stringify(rows));
    check('generator: the copied link carries the text and the style', noSheet ? /[?&]q=Luna/.test(await clip(page)) && /[?&]style=/.test(await clip(page)) : true, await clip(page));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();

    const lib = await open('/library/heart-symbols/', 'desktop');
    const sec = lib.page.locator('.symbol-section-actions .share-result-btn').first();
    await sec.scrollIntoViewIfNeeded();
    check('library: the section share says Copy link without a share sheet', (await hasShare(lib.page)) || (await sec.locator('.share-result-label').textContent()) === 'Copy link', await sec.locator('.share-result-label').textContent());
    check('library: and names the library lane', (await sec.getAttribute('data-share-surface')) === 'library_section', await sec.getAttribute('data-share-surface'));
    check('library: no page errors', !lib.errors.length, lib.errors.join(' | '));
    await lib.ctx.close();

    const sym = await open('/symbol/quotation-mark/', 'desktop');
    const symBtn = sym.page.locator('.symbol-section-actions .share-result-btn').first();
    check('symbol: a symbol page names the symbol lane, not the library', (await symBtn.count()) === 0 || (await symBtn.getAttribute('data-share-surface')) === 'symbol_section', await symBtn.getAttribute('data-share-surface'));
    check('symbol: no page errors', !sym.errors.length, sym.errors.join(' | '));
    await sym.ctx.close();

    const ko = await open('/ko/library/imotikon/', 'desktop');
    const koBtn = ko.page.locator('.symbol-section-actions .share-result-btn').first();
    await koBtn.scrollIntoViewIfNeeded();
    const koLabel = await koBtn.locator('.share-result-label').textContent();
    check('korean library: the label is never the English Copy link', koLabel !== 'Copy link' && koLabel !== 'Share', koLabel);
    check('korean library: the link icon still says what the press copies', (await hasShare(ko.page)) || /M13\.828 10\.172/.test(await koBtn.innerHTML()));
    await ko.ctx.close();

    const de = await open('/de/library/herz-symbole/', 'desktop');
    const deBtn = de.page.locator('.symbol-section-actions .share-result-btn').first();
    if (await deBtn.count()) {
      await deBtn.scrollIntoViewIfNeeded();
      check('german library: the label is the harvested German Copy link', (await hasShare(de.page)) || (await deBtn.locator('.share-result-label').textContent()) === 'Link kopieren', await deBtn.locator('.share-result-label').textContent());
    }
    await de.ctx.close();

    const z = await open('/usecase/zalgo-text/', 'desktop');
    await z.page.waitForTimeout(400);
    const zBtn = z.page.locator('#zalgoShareRow .share-result-btn');
    check('zalgo: the link share names the zalgo surface', (await zBtn.getAttribute('data-share-surface')) === 'zalgo', await zBtn.getAttribute('data-share-surface'));
    check('zalgo: no page errors', !z.errors.length, z.errors.join(' | '));
    await z.ctx.close();
  }

  // 35. Upside-down text: the generator that had Copy and no Share. The share
  // pair sits beside Copy, the link it shares is the page's live state (text,
  // mode, wrap), the recipient opens the exact same result, and Copy records a
  // copy row without the typed text.
  console.log('\n/category/upside-down-text/ (share pair, exact-state link, copy row)');
  {
    const { ctx, page, errors } = await open('/category/upside-down-text/', 'desktop');
    const row = page.locator('#udShareRow');
    check('the share pair is on the output', (await row.count()) === 1);
    check('before typing both buttons are disabled', (await row.locator('button:disabled').count()) === 2);
    await page.fill('#mainInput', 'hello world');
    await page.click('.pill[data-group="mode"][data-value="mirror"]');
    await page.click('.pill[data-group="wrap"][data-value="stars"]');
    await page.waitForTimeout(400);
    const out = await page.locator('#udOutputBody').innerText();
    const share = row.locator('.share-result-btn');
    check('typing enables the share buttons', (await row.locator('button:disabled').count()) === 0);
    check('the share button carries the exact output', (await share.getAttribute('data-share-text')) === out, await share.getAttribute('data-share-text'));
    const url = await share.getAttribute('data-share-url');
    check('the share link carries text, mode and wrap', /q=hello\+world/.test(url) && /mode=mirror/.test(url) && /wrap=stars/.test(url), url);
    check('the share button names its surface', (await share.getAttribute('data-share-surface')) === 'upside_down');
    check('its accessible name carries the mode', /Mirror/.test(await share.getAttribute('aria-label') || ''), await share.getAttribute('aria-label'));
    await sentinel(page);
    let n0 = (await dl(page)).length;
    await share.click();
    await page.waitForTimeout(300);
    const shareRows = (await dl(page)).slice(n0).filter((e) => e.share_method);
    const noSheet = !(await page.evaluate(() => typeof navigator.share === 'function'));
    check('pressing Share records one row on the upside_down surface', shareRows.length === 1 && shareRows[0].share_surface === 'upside_down' && shareRows[0].share_item_type === 'style', JSON.stringify(shareRows));
    const copiedLink = await clip(page);
    check('without a share sheet the link is on the clipboard', !noSheet || copiedLink === url, copiedLink);
    await sentinel(page);
    n0 = (await dl(page)).length;
    await page.click('#udCopyBtn');
    await page.waitForTimeout(300);
    const copyRows = (await dl(page)).slice(n0).filter((e) => e.event === 'copy_text');
    check('Copy puts the flipped text on the clipboard', (await clip(page)) === out);
    check('Copy records one copy row, named, without the typed text', copyRows.length === 1 && copyRows[0].copy_method === 'upside_down' && copyRows[0].copy_item === undefined, JSON.stringify(copyRows));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();

    // The recipient: the shared link reproduces the creation exactly.
    const r = await open(url.replace(/^https?:\/\/[^/]+/, ''), 'mobile');
    await r.page.waitForTimeout(400);
    check('the recipient sees the identical result', (await r.page.locator('#udOutputBody').innerText()) === out, await r.page.locator('#udOutputBody').innerText());
    check('with the same mode and wrap selected', (await r.page.locator('.pill.active[data-value="mirror"]').count()) === 1 && (await r.page.locator('.pill.active[data-value="stars"]').count()) === 1);
    check('and can change it: the share buttons are live', (await r.page.locator('#udShareRow button:disabled').count()) === 0);
    check('recipient: no page errors', !r.errors.length, r.errors.join(' | '));
    await r.ctx.close();
  }

  // 36. The YouTube hub's destination tabs. The results grid's MutationObserver
  // re-ran on its own writes, so after typing, Video title and @Handle froze the
  // tab in a microtask loop: no long task, no error, the page just stops
  // answering. Each press is raced against a deadline, so a frozen page fails
  // this case instead of hanging the run, and each tab's grid must show its own
  // state: one search warning per card on Video title, the handle notice on
  // @Handle, styled results everywhere else. A category tab re-renders the grid
  // through script.js alone, so only the observer can put Video title's warnings
  // back: a fix that switches the observer off fails that step.
  console.log('\n/youtube/ (destination tabs stay responsive)');
  {
    const { ctx, page, errors } = await open('/youtube/', 'desktop');
    const category = page.locator('#categoryTabs .category-tab:visible').nth(1);
    check('a category tab is there to re-render the grid', (await category.count()) === 1);
    await page.fill('#mainInput', 'Luna');
    await page.waitForTimeout(300);
    const read = () => page.evaluate(() => {
      const g = document.getElementById('resultsGrid');
      const active = document.querySelector('#youtubeContextTabs [aria-selected="true"]');
      return {
        active: active ? active.dataset.context : null,
        copies: g.querySelectorAll('.copy-btn').length,
        names: g.querySelectorAll('.style-card .style-name').length,
        warnings: g.querySelectorAll('.style-name > .youtube-result-warning').length,
        handleNotice: /handles only accept/.test(g.textContent)
      };
    });
    const press = async (control) => {
      let state = null;
      const work = control.click({ timeout: 2000 })
        .then(() => new Promise((r) => setTimeout(r, 100)))
        .then(read)
        .then((s) => { state = s; }, () => {});
      await Promise.race([work, new Promise((r) => setTimeout(r, 2000))]);
      return state;
    };
    const shows = {
      styled: (s) => s.copies > 0 && s.warnings === 0 && !s.handleNotice,
      warned: (s) => s.copies > 0 && s.names > 0 && s.warnings === s.names,
      handle: (s) => s.handleNotice && s.copies === 0
    };
    const dest = (d) => page.locator(`#youtubeContextTabs [data-context="${d}"]`);
    // [what is pressed, the destination selected after it, what the grid shows]
    const steps = [
      ['channel-name', dest('channel-name'), 'channel-name', 'styled'],
      ['description', dest('description'), 'description', 'styled'],
      ['video-title', dest('video-title'), 'video-title', 'warned'],
      ['a category tab on video-title', category, 'video-title', 'warned'],
      ['comment', dest('comment'), 'comment', 'styled'],
      ['bio', dest('bio'), 'bio', 'styled'],
      ['handle', dest('handle'), 'handle', 'handle'],
      ['channel-name', dest('channel-name'), 'channel-name', 'styled']
    ];
    const bad = [];
    for (const [label, control, active, want] of steps) {
      const s = await press(control);
      if (!s) { bad.push(`${label}: page did not answer within 2s`); break; }
      if (s.active !== active || !shows[want](s)) bad.push(`${label}: ${JSON.stringify(s)}`);
    }
    check('every destination tab answers within 2s with its own results', !bad.length, bad.join('; '));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 22. Copy is announced, not only shown. The generator's toast was visual
  // only, so a screen reader heard nothing when Copy worked; and below 640px
  // the result card's Preview button hides its label, which left the emoji as
  // its whole accessible name. The toast is a polite live region whose text
  // arrives with each copy (a change is what a live region announces) and
  // leaves once it has faded, so the next copy is a change again.
  console.log('\n/ (copy announced to assistive tech; Preview named at 375px)');
  {
    const { ctx, page, errors } = await open('/', 'narrow');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(200);
    const toastState = () => page.evaluate(() => {
      const t = document.getElementById('copyToast');
      return t && { role: t.getAttribute('role'), live: t.getAttribute('aria-live'), text: t.textContent, shown: t.classList.contains('is-visible') };
    });
    const pageToast = await page.evaluate(async () => {
      const m = (await (await fetch(location.pathname)).text()).match(/id="copyToast"[^>]*>([^<]*)</);
      return m ? m[1] : null;
    });
    const t0 = await toastState();
    check('the copy toast is a polite live region after load', !!t0 && t0.role === 'status' && t0.live === 'polite', JSON.stringify(t0));
    check('it holds no text until a copy, so the copy is a change', !!t0 && t0.text === '', JSON.stringify(t0));
    await page.fill('#mainInput', 'Luna');
    await page.waitForTimeout(300);
    const copy = page.locator('#resultsGrid .copy-btn:not([disabled])').first();
    await copy.click();
    await page.waitForTimeout(100);
    const t1 = await toastState();
    check("after Copy it carries the page's own toast text", !!t1 && t1.shown && !!pageToast && t1.text === pageToast, `${JSON.stringify(t1)} vs markup ${JSON.stringify(pageToast)}`);
    await page.waitForTimeout(2500);
    const t2 = await toastState();
    check('once faded it is empty again, so the next copy is a change too', !!t2 && !t2.shown && t2.text === '', JSON.stringify(t2));
    await copy.click();
    await page.waitForTimeout(100);
    const t3 = await toastState();
    check('a second Copy fills it again', !!t3 && t3.shown && t3.text === pageToast, JSON.stringify(t3));
    const preview = page.locator('#resultsGrid .preview-btn').first();
    const label = ((await preview.locator('.preview-label').textContent()) || '').trim();
    check('at 375px the Preview label is hidden (the case under test)', !!label && !(await preview.locator('.preview-label').isVisible()), label);
    const name = ((await preview.ariaSnapshot()).match(/^- button "(.*)"/) || [])[1] || '';
    check('the Preview button is named by its own label, not only its emoji', !!name && name.includes(label), `name ${JSON.stringify(name)}, label ${JSON.stringify(label)}`);
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
