#!/usr/bin/env node
/* check-case-policy-browser.js — drive Chromium through every case-converter
   page (and the homepages, which also list the case cards) and assert that what
   a visitor copies equals what the Node harness computes for that page's
   <html lang> and data-case-policy.

   Why a browser: the case cards depend on the runtime's locale data
   (toLocaleUpperCase('tr'), \p{L}), and Node and Chromium do not have to agree.
   This is the check that the tested function is the shipped behaviour.

   It also asserts, per page:
   - a page without data-case-policy renders the legacy outputs (the pre-policy
     renderer, read from scripts/lib/fixtures via the harness: same code path);
   - an opted-in page renders the policy's expected Title Case for its own
     language (one row per language).

   Exit: 0 pass · 1 fail · 2 UNKNOWN (no Playwright/Chromium, or no pages found).
   Run: npm run test:case-policy-browser */
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const { ROOT, loadRenderer } = require('./lib/case-policy-harness');
const { listCaseConverterPages, readPolicyAttr } = require('./lib/case-policy-pages');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.error('case-policy-browser: UNKNOWN — playwright is not installed');
  process.exit(2);
}

const STYLES = ['Title Case', 'Capitalized Case', 'Sentence case', 'UPPERCASE', 'lowercase'];
const INPUTS = ['the lord of the rings', 'der hund und die katze', 'suç ve ceza',
  'İSTANBUL VE IĞDIR', "la communauté de l'anneau", 'kot i pies na dachu',
  'el señor de los anillos', 'o senhor dos anéis', 'dari ave maria ke jalan lain ke roma',
  'il signore degli anelli', 'straße', 'ijs', "i'm sure i'll be fine. i think so!",
  'ㅎㅎ 안녕하세요 hello'];

// What an opted-in page must show for its own language (the unit test has
// the full table; this is the "is it live on the page" row).
const OWN = {
  de: ['der hund und die katze', 'Der Hund und die Katze'],
  tr: ['suç ve ceza', 'Suç ve Ceza'],
  fr: ["la communauté de l'anneau", "La Communauté de l'Anneau"],
  pl: ['kot i pies na dachu', 'Kot i Pies na Dachu'],
  es: ['el señor de los anillos', 'El Señor de los Anillos'],
  pt: ['o senhor dos anéis', 'O Senhor dos Anéis'],
  id: ['dari ave maria ke jalan lain ke roma', 'Dari Ave Maria ke Jalan Lain ke Roma'],
  it: ['il signore degli anelli', 'Il Signore degli Anelli'],
};

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, p);
    if (p.endsWith('/')) file = path.join(file, 'index.html');
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function main() {
  const pages = listCaseConverterPages().map(p => ({ url: '/' + p.dir + '/', lang: p.lang, policy: p.policy }));
  if (!pages.length) { console.error('case-policy-browser: UNKNOWN — no case-converter pages found'); return 2; }
  // Homepages list the case cards too and never opt in.
  for (const home of ['index.html', 'de/index.html', 'tr/index.html', 'fr/index.html']) {
    const html = fs.readFileSync(path.join(ROOT, home), 'utf8');
    pages.push({ url: '/' + home.replace('index.html', ''), lang: (html.match(/<html lang="([^"]*)"/) || [])[1] || '', policy: readPolicyAttr(html), home: true });
  }

  const server = await serve();
  const BASE = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try { browser = await chromium.launch(); } catch (e) {
    server.close();
    console.error(`case-policy-browser: UNKNOWN — no browser (${e.message.split('\n')[0]})`);
    return 2;
  }
  const r = loadRenderer();
  let fail = 0;
  let pass = 0;
  const bad = (msg) => { fail++; console.log(`  FAIL ${msg}`); };

  for (const pg of pages) {
    const ctx = await browser.newContext();
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, rt => rt.abort());
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(BASE + pg.url, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    let compared = 0;
    // A homepage shows the case cards only under a category tab that lists
    // them; open the first such tab so they render.
    if (pg.home) {
      await page.fill('#mainInput', 'x');
      const tabs = page.locator('#categoryTabs .category-tab');
      for (let i = 0; i < await tabs.count(); i++) {
        if (!(await tabs.nth(i).isVisible())) continue;
        await tabs.nth(i).click();
        await page.waitForTimeout(150);
        if (await page.locator('#resultsGrid .copy-btn[data-style="Title Case"]').count()) break;
      }
    }
    for (const input of INPUTS) {
      await page.fill('#mainInput', input);
      await page.waitForTimeout(150);
      const got = await page.evaluate((names) => {
        const out = {};
        for (const n of names) {
          const b = document.querySelector(`#resultsGrid .copy-btn[data-style="${CSS.escape(n)}"]`);
          if (b) out[n] = b.getAttribute('data-text');
        }
        return out;
      }, STYLES);
      for (const s of Object.keys(got)) {
        compared++;
        const want = r.render(input, s, pg.lang, pg.policy);
        if (got[s] === want) pass++;
        else bad(`${pg.url} ${s} ${JSON.stringify(input)}: browser ${JSON.stringify(got[s])} != node ${JSON.stringify(want)}`);
        if (pg.policy !== 'locale') {
          const legacy = r.render(input, s, pg.lang, null);
          if (got[s] !== legacy) bad(`${pg.url} is not opted in but ${s} differs from legacy`);
        }
      }
    }
    if (!pg.home && compared === 0) bad(`${pg.url}: no case card rendered`);
    if (pg.policy === 'locale' && OWN[pg.lang]) {
      const [input, want] = OWN[pg.lang];
      await page.fill('#mainInput', input);
      await page.waitForTimeout(150);
      const got = await page.evaluate(() => {
        const b = document.querySelector('#resultsGrid .copy-btn[data-style="Title Case"]');
        return b && b.getAttribute('data-text');
      });
      if (got === want) pass++; else bad(`${pg.url} Title Case ${JSON.stringify(input)}: ${JSON.stringify(got)} != ${JSON.stringify(want)}`);
    }
    if (errors.length) bad(`${pg.url} page errors: ${errors.join(' | ')}`);
    console.log(`${fail ? '' : ''}${pg.url} lang=${pg.lang} policy=${pg.policy || '(none)'} — ${compared} card outputs compared`);
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(`case-policy-browser: ${pass} passed, ${fail} failed`);
  return fail ? 1 : 0;
}

main().then(code => process.exit(code), e => { console.error(e); process.exit(2); });
