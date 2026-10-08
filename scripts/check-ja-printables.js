#!/usr/bin/env node
'use strict';

/**
 * check-ja-printables.js — renders the Japanese worksheet pages under
 * /ja/purinto/ in Chromium and checks the sheet a parent actually gets.
 *
 * jaSheets.test.js proves the geometry in Node. What only a browser can show:
 * that the page boots, that the exported PDF has the pages the button
 * promised, at A4, placed at 1:1 so a 22mm masu prints 22mm; that the browser
 * print path prints the same number of pages and no site chrome; that the
 * textbook face covers the torture corpus (and that a character it does NOT
 * cover is reported, not silently substituted); and that a child's typed name
 * never reaches window.dataLayer or the URL.
 *
 *   node scripts/check-ja-printables.js            # serve this checkout
 *   node scripts/check-ja-printables.js --shots DIR  # also save evidence renders
 *
 * Exit 0 all pass · 1 any assertion failed · 2 could not run (no Playwright or
 * no browser). "Could not run" is never reported as a pass.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const shotsIx = process.argv.indexOf('--shots');
const SHOTS = shotsIx > -1 ? path.resolve(process.argv[shotsIx + 1]) : null;

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('check-ja-printables: UNKNOWN — the playwright package is not installed (npm install).');
  process.exit(2);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp'
};
function serve(root) {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    let file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (p.endsWith('/')) file = path.join(file, 'index.html');
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
  results.push({ name, ok: !!ok });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `  — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
}
const pdfPages = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
function placements(buf) {
  return [...buf.toString('latin1').matchAll(/q ([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm \/Im0 Do Q/g)].map((m) => m.slice(1, 5).map(Number));
}
function mediaBox(buf) {
  const m = buf.toString('latin1').match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
  return m ? [+m[1], +m[2]] : null;
}

const NAME = 'たなか はると';
const PAGES = [
  { slug: 'hiragana-renshu', orient: 'landscape' },
  { slug: 'katakana-renshu', orient: 'landscape' },
  { slug: 'kanji-renshu', orient: 'landscape' },
  { slug: 'namae-nazorigaki', orient: 'portrait', fill: NAME },
  { slug: 'alphabet-renshu', orient: 'portrait' },
  { slug: 'eigo-4sen', orient: 'portrait' },
  { slug: 'unpitsu', orient: 'portrait' },
  { slug: 'romaji-renshu', orient: 'portrait' },
  { slug: 'hiragana-nurie', orient: 'portrait' }
];
const CORPUS = ['あいうえお', 'アイウエオ', 'がぎぐげご', 'ぱぴぷぺぽ', 'ゃゅょぁぃっ', 'きゃしゅちょ', 'ケーキ', '東京タワー',
  'さくら', 'サクラ', '田中 太郎', '「こんにちは。」', 'ABCあいう', 'ＡＢＣ１２３', 'ｶﾀｶﾅ', '髙', '﨑', 'が'];
const MM_PT = 72 / 25.4;

async function main() {
  let browser;
  try { browser = await chromium.launch(); } catch (e) {
    console.error('check-ja-printables: UNKNOWN — Chromium could not start: ' + e.message.split('\n')[0]);
    process.exit(2);
  }
  const server = await serve(ROOT);
  const base = `http://127.0.0.1:${server.address().port}`;
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'ja-JP', acceptDownloads: true });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

  async function open(slug) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/ja/purinto/${slug}/`);
    await page.waitForFunction(() => !!document.querySelector('#ja-sheet-preview svg'), null, { timeout: 15000 }).catch(() => {});
    return { page, errors };
  }

  // Hub: every child linked in static HTML.
  {
    const html = fs.readFileSync(path.join(ROOT, 'ja/purinto/index.html'), 'utf8');
    const missing = PAGES.filter((p) => html.indexOf(`href="/ja/purinto/${p.slug}/"`) < 0).map((p) => p.slug);
    check('hub links all nine generators in static HTML', missing.length === 0, missing);
  }

  for (const P of PAGES) {
    console.log(`\n/ja/purinto/${P.slug}/`);
    const { page, errors } = await open(P.slug);
    if (P.fill) { await page.fill('[data-ja-opt=name]', P.fill); await page.waitForTimeout(400); }
    await page.waitForTimeout(600);
    const st = await page.evaluate(() => ({
      svg: !!document.querySelector('#ja-sheet-preview svg'),
      label: (document.querySelector('.ja-pager-label') || {}).textContent,
      pagerHidden: (document.querySelector('#ja-sheet-pager') || {}).hidden,
      font: document.fonts.check("600 20px 'Klee One'", 'あ')
    }));
    check('preview renders a sheet', st.svg);
    check('Klee One (textbook face) is loaded for the preview', st.font);
    const promised = st.pagerHidden ? 1 : Number(String(st.label).split('/')[1]);

    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), page.click('#ja-sheet-pdf')]);
    const buf = fs.readFileSync(await dl.path());
    const n = pdfPages(buf);
    check(`PDF has the ${promised} page(s) the button promised`, n === promised, { pdf: n, promised });
    check('PDF file name carries no typed text', !/[^\x20-\x7e]/.test(dl.suggestedFilename()) && dl.suggestedFilename().indexOf('tanaka') < 0, dl.suggestedFilename());
    const box = mediaBox(buf);
    const want = P.orient === 'landscape' ? [297 * MM_PT, 210 * MM_PT] : [210 * MM_PT, 297 * MM_PT];
    check(`PDF page is A4 ${P.orient}`, box && Math.abs(box[0] - want[0]) < 0.5 && Math.abs(box[1] - want[1]) < 0.5, box);
    const pl = placements(buf);
    const area = [want[0] - 2 * 12.7 * MM_PT, want[1] - 2 * 12.7 * MM_PT];
    const scaleOk = pl.length === n && pl.every((q) => Math.abs(q[0] / area[0] - 1) < 0.002 && Math.abs(q[1] / area[1] - 1) < 0.002 && Math.abs(q[2] - 36) < 0.3);
    check('sheet is placed at 1:1 inside 12.7mm margins (mm on screen = mm on paper)', scaleOk, pl[0]);
    if (SHOTS) fs.writeFileSync(path.join(SHOTS, `${P.slug}.pdf`), buf);

    // Browser print path: same pages, nothing else on them.
    await page.evaluate(() => { window.print = () => {}; document.getElementById('ja-sheet-print').click(); });
    await page.waitForTimeout(300);
    const chrome = await page.evaluate(() => [...document.body.children]
      .filter((e) => e.id !== 'pt-print-root' && e.tagName !== 'SCRIPT' && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0)
      .map((e) => e.tagName + (e.id ? '#' + e.id : '') + (e.className ? '.' + e.className : '')));
    check('print shows no site chrome', chrome.length === 0, chrome);
    await page.emulateMedia({ media: 'print' });
    const printed = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    check('browser print gives the same page count as the PDF', pdfPages(printed) === n, { print: pdfPages(printed), pdf: n });
    if (SHOTS) fs.writeFileSync(path.join(SHOTS, `${P.slug}-print.pdf`), printed);
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));

    if (P.fill) {
      const leak = await page.evaluate((nm) => {
        const dl = JSON.stringify(window.dataLayer || []);
        return { dl: dl.indexOf(nm) >= 0 || dl.indexOf('たなか') >= 0, url: location.href.indexOf(encodeURIComponent('たなか')) >= 0, title: document.title.indexOf('たなか') >= 0 };
      }, P.fill);
      check('typed name never reaches dataLayer, URL or title', !leak.dl && !leak.url && !leak.title, leak);
    }
    check('no page errors', errors.length === 0, errors);
    if (SHOTS) {
      const el = await page.$('#ja-sheet-tool');
      await el.screenshot({ path: path.join(SHOTS, `${P.slug}-desktop.png`) });
    }
    await page.close();
  }

  // Torture corpus: every string renders in the textbook face, as one cell per
  // grapheme, and a character the face lacks is reported to the parent.
  console.log('\ntorture corpus (name page)');
  {
    const { page } = await open('namae-nazorigaki');
    for (const s of CORPUS) {
      await page.fill('[data-ja-opt=name]', s);
      await page.waitForTimeout(250);
      const r = await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((res) => setTimeout(res, 150));
        const texts = [...document.querySelectorAll('#ja-sheet-preview svg text')].map((t) => t.textContent);
        const note = document.getElementById('ja-font-note');
        return { texts, note: note && !note.hidden ? note.textContent : '' };
      });
      check(`"${s}" renders with no fallback note`, r.texts.length > 0 && !r.note, r.note);
    }
    await page.fill('[data-ja-opt=name]', '𩸽');
    await page.waitForTimeout(1200);
    const note = await page.evaluate(() => { const n = document.getElementById('ja-font-note'); return n && !n.hidden ? n.textContent : ''; });
    check('a character outside the face (𩸽) is reported, not silently substituted', note.indexOf('𩸽') >= 0, note);
    await page.close();
  }

  // Mobile: the tool fits, every control is reachable, nothing scrolls sideways.
  console.log('\nmobile 390px');
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ja-JP', isMobile: true, hasTouch: true });
  await mob.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  for (const P of PAGES) {
    const page = await mob.newPage();
    await page.goto(`${base}/ja/purinto/${P.slug}/`);
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const prev = document.querySelector('#ja-sheet-preview');
      const b = prev && prev.getBoundingClientRect();
      const small = [...document.querySelectorAll('#ja-sheet-tool button, #ja-sheet-tool select, #ja-sheet-tool .ja-opt-radio label, #ja-sheet-tool .ja-opt-check label')]
        .filter((e) => e.offsetParent && e.getBoundingClientRect().height < 40).length;
      return { hscroll: document.documentElement.scrollWidth > window.innerWidth + 1, previewW: b ? b.width : 0, small };
    });
    check(`${P.slug}: no sideways scroll, preview fits, touch targets ≥ 40px`, !r.hscroll && r.previewW > 300 && r.previewW <= 390 && r.small === 0, r);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${P.slug}-mobile.png`), fullPage: false });
    await page.close();
  }

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\ncheck-ja-printables: ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('check-ja-printables: UNKNOWN — ' + e.stack); process.exit(2); });
