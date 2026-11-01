#!/usr/bin/env node
'use strict';
/**
 * verify-event-pages.js — drive Chromium through every /events/ page and
 * check the things only a browser can see.
 *
 * Per page, at 390x844 (and 360 for overflow):
 *   - no page errors or console errors from our own scripts
 *   - the static HTML (fetched with no JavaScript) already holds the payload:
 *     a design card, a font card, a symbol, a kaomoji and an ASCII piece
 *     wherever the page's capabilities enable them
 *   - the first output sits within one screen (844px) of the input's top
 *   - typing a name restyles the designs and fonts, and the hand-off links
 *     carry it; a second name (where offered) produces the couple line
 *   - a design copy pushes copy_text with copy_method event_composition and
 *     no copy_item; a hand-off click pushes cta_click with no query string;
 *     the typed text appears in no dataLayer value
 *   - Arabic, Devanagari, Han and emoji input raise no error, and Arabic stays
 *     contiguous in every font card
 *   - copy controls are at least 44px tall; no horizontal overflow at 360/390
 *
 * Usage:
 *   node scripts/verify-event-pages.js                 # all pages, serves the checkout
 *   node scripts/verify-event-pages.js --json out.json # also write the per-page report
 *   node scripts/verify-event-pages.js --only valentines-day,navidad
 *
 * Exit: 0 all pass · 1 a check failed · 2 Playwright/Chromium unavailable (UNKNOWN).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const SPEC_DIR = path.join(ROOT, 'data', 'event_page_specs');
const NAME = 'Zoë';
const PARTNER = 'Sam';

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('UNKNOWN: playwright is not installed; nothing was checked.');
  process.exit(2);
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

function pagesFromSpecs() {
  return fs.readdirSync(SPEC_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => {
    const spec = JSON.parse(fs.readFileSync(path.join(SPEC_DIR, f), 'utf8'));
    const lang = spec.language || 'en';
    const url = lang === 'en' ? `/events/${spec.slug}/` : `/${lang}/events/${spec.slug}/`;
    return { stem: f.replace(/\.json$/, ''), url, spec };
  });
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, () => resolve(server));
  });
}

function enabled(spec, cid) {
  const v = ((spec.experience || {}).capabilities || {})[cid];
  return v === true || (v && v.enabled === true);
}

async function checkPage(browser, base, page) {
  const fails = [];
  const facts = {};
  const html = fs.readFileSync(path.join(ROOT, page.url, 'index.html'), 'utf8');
  const staticHas = (re) => re.test(html);
  // Static payload (no JavaScript).
  if (enabled(page.spec, 'compositions') && !staticHas(/class="event-comp-card"/)) fails.push('static: no design card');
  if (!staticHas(/class="style-card"/)) fails.push('static: no font card');
  if (enabled(page.spec, 'occasion_symbols') && !staticHas(/class="mood-explainer flag-grid-section"/)) fails.push('static: no symbol set');
  if (enabled(page.spec, 'emoji_kaomoji') && !/id="eventKaomojiGrid">[^<]*<!-- BEGIN[^>]*--><button/.test(html)) fails.push('static: no kaomoji');
  if (enabled(page.spec, 'ascii_art') && !staticHas(/class="art-piece-pre"/)) fails.push('static: no ASCII piece');
  if (enabled(page.spec, 'native_greetings') && !staticHas(/class="glyph-copy event-native-tile"/)) fails.push('static: no native tile');
  if (/<footer[^>]*>[\s\S]*class="faq-item"/.test(html)) fails.push('static: FAQ inside <footer>');

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  await p.route(/googletagmanager|googlesyndication|fundingchoices|doubleclick|fonts\.g/, (r) => r.abort());
  await p.goto(base + page.url, { waitUntil: 'load' });
  await p.waitForTimeout(400);

  const layout = await p.evaluate(() => {
    const top = document.querySelector('#mainInput').getBoundingClientRect().top + scrollY;
    const outs = [...document.querySelectorAll('.event-comp-card, .event-handoff, .event-native-tile, #eventFontsGrid .style-card')]
      .map((e) => e.getBoundingClientRect().top + scrollY);
    return { firstOutput: Math.round(Math.min(...outs) - top), overflow390: document.documentElement.scrollWidth };
  });
  facts.firstOutputPx = layout.firstOutput;
  if (!(layout.firstOutput <= 844)) fails.push(`layout: first output ${layout.firstOutput}px below the input`);
  if (layout.overflow390 > 390) fails.push(`layout: horizontal overflow at 390 (${layout.overflow390})`);

  const small = await p.evaluate(() => [...document.querySelectorAll(
    '.event-comp-copy, .event-shuffle, .event-chip, #eventFontsGrid .copy-btn, .art-piece-copy, .event-handoff, .glyph-copy')]
    .filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.className).slice(0, 3));
  if (small.length) fails.push('a11y: controls under 44px: ' + small.join(', '));

  await p.evaluate(() => { window.dataLayer = window.dataLayer || []; window.__dl0 = window.dataLayer.length; });
  await p.fill('#mainInput', NAME);
  await p.waitForTimeout(350);
  const after = await p.evaluate(() => ({
    designs: [...document.querySelectorAll('.event-comp-text')].map((n) => n.textContent),
    fonts: [...document.querySelectorAll('#eventFontsGrid .style-preview')].map((n) => n.textContent),
    handoffs: [...document.querySelectorAll('.event-handoff')].map((n) => n.getAttribute('href'))
  }));
  facts.designs = after.designs.length;
  facts.fonts = after.fonts.length;
  facts.handoffs = after.handoffs.length;
  if (enabled(page.spec, 'compositions') && after.designs.length < 2) fails.push('live: fewer than 2 designs after typing');
  if (after.designs.some((d) => !/Z|𝒵|𝓩|ℨ|𝖅|𝐙|𝗭|𝑍|𝒁|ℤ|Ⓩ|🅩|ᴢ|𝚉|Ｚ|🅉/u.test(d) && !/Zoë/.test(d))) fails.push('live: a design does not contain the typed name');
  const tripled = after.designs.find((d) => /(♡\s*){3}/u.test(d.replace(/⋆/g, '')) && /♡ ♡ ♡/.test(d));
  if (tripled) fails.push('live: a joiner repeats three times: ' + tripled);
  const inputHandoffs = ((page.spec.experience || {}).handoffs || []).filter((h) => h.text === 'input');
  if (inputHandoffs.length && !after.handoffs.some((h) => /Zo%C3%AB/.test(h))) fails.push('live: no hand-off carries the typed text');

  // Every hand-off opens its target with the data it sends already in a field.
  facts.prefilled = 0;
  for (const href of after.handoffs) {
    const url = new URL(href, base);
    const expected = [...url.searchParams.entries()]
      .filter(([k]) => ['q', 'text', 'name', 'words', 'heading'].includes(k))
      .map(([k, v]) => (k === 'words' ? v.split('|')[0] : v));
    if (!expected.length) continue;
    const tp = await ctx.newPage();
    await tp.route(/googletagmanager|googlesyndication|fundingchoices|doubleclick|fonts\.g/, (r) => r.abort());
    try {
      await tp.goto(url.href, { waitUntil: 'load' });
      await tp.waitForTimeout(500);
      const values = await tp.evaluate(() => [...document.querySelectorAll('input, textarea')].map((e) => e.value));
      const missing = expected.filter((v) => !values.some((val) => val.includes(v)));
      if (missing.length) fails.push(`hand-off: ${url.pathname} opened without "${missing[0]}"`);
      else facts.prefilled += 1;
    } catch (e) {
      fails.push(`hand-off: ${url.pathname} failed to load`);
    }
    await tp.close();
  }

  if (await p.$('#eventPartnerInput')) {
    await p.click('#eventPartnerWrap summary');
    await p.fill('#eventPartnerInput', PARTNER);
    await p.waitForTimeout(350);
    const couple = await p.$$eval('.event-comp-card[data-recipe="couple"] .event-comp-text', (ns) => ns.map((n) => n.textContent));
    facts.coupleLine = couple[0] || null;
    if (!couple.length) fails.push('live: no couple line with a second name');
    await p.fill('#eventPartnerInput', '');
    await p.waitForTimeout(300);
    if (await p.$('.event-comp-card[data-recipe="couple"]')) fails.push('live: couple line stays after the second name is cleared');
  }

  if (await p.$('.event-comp-copy')) {
    await p.click('.event-comp-copy');
    await p.waitForTimeout(250);
  }
  const handoff = await p.$('.event-handoff');
  if (handoff) {
    await p.evaluate(() => document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('.event-handoff')) e.preventDefault();
    }, true));
    await handoff.click();
    await p.waitForTimeout(150);
  }
  const dl = await p.evaluate(() => window.dataLayer.slice(window.__dl0));
  const compCopy = dl.find((e) => e.event === 'copy_text' && e.copy_method === 'event_composition');
  if (enabled(page.spec, 'compositions') && !compCopy) fails.push('analytics: no event_composition copy_text');
  if (compCopy && compCopy.copy_item !== undefined) fails.push('analytics: composition copy sent copy_item');
  const cta = dl.find((e) => e.event === 'cta_click');
  if (handoff && !cta) fails.push('analytics: hand-off click sent no cta_click');
  if (cta && /[?#]/.test(cta.cta_href || '')) fails.push('analytics: cta_href carries a query: ' + cta.cta_href);
  const leak = JSON.stringify(dl).includes(NAME) || JSON.stringify(dl).includes(PARTNER);
  if (leak) fails.push('privacy: typed text reached the dataLayer');

  for (const sample of ['عيد مبارك', 'शुभ दीपावली', '新年快乐', '👩‍❤️‍👨 Maya']) {
    await p.fill('#mainInput', sample);
    await p.waitForTimeout(250);
  }
  await p.fill('#mainInput', 'عيد مبارك');
  await p.waitForTimeout(300);
  const broken = await p.$$eval('#eventFontsGrid .style-preview', (ns) => ns.map((n) => n.textContent).filter((t) => /[؀-ۿ] [؀-ۿ]/.test(t.replace('عيد مبارك', ''))));
  if (broken.length) fails.push('unicode: Arabic spaced apart: ' + broken[0]);

  await p.setViewportSize({ width: 360, height: 800 });
  await p.waitForTimeout(150);
  const o360 = await p.evaluate(() => document.documentElement.scrollWidth);
  if (o360 > 360) fails.push(`layout: horizontal overflow at 360 (${o360})`);

  if (errors.length) fails.push('errors: ' + errors.slice(0, 2).join(' | '));
  await ctx.close();
  return { url: page.url, pass: fails.length === 0, fails, facts };
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) {
      console.error('UNKNOWN: Chromium could not start; nothing was checked. ' + e.message.split('\n')[0]);
      process.exit(2);
    }
  }
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const only = (arg('--only') || '').split(',').filter(Boolean);
  const pages = pagesFromSpecs().filter((p) => !only.length || only.includes(p.stem));
  const results = [];
  for (const page of pages) {
    const r = await checkPage(browser, base, page);
    results.push(r);
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.url}  first output ${r.facts.firstOutputPx}px, designs ${r.facts.designs}, fonts ${r.facts.fonts}, hand-offs ${r.facts.handoffs} (${r.facts.prefilled} prefilled)` +
      (r.facts.coupleLine ? `, couple "${r.facts.coupleLine}"` : '') + (r.fails.length ? '\n      - ' + r.fails.join('\n      - ') : ''));
  }
  await browser.close();
  server.close();
  const out = arg('--json');
  if (out) fs.writeFileSync(out, JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} event pages pass.`);
  process.exit(failed ? 1 : 0);
})();
