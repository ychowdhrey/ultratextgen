'use strict';

/**
 * interaction-round-trips.js — "a toggle is not tested until it has come back".
 *
 * A control that works on the first press proves almost nothing: the defects
 * this repo actually shipped were all on the way back (a second handler that
 * undid the first, a rebuilt node that lost its listener, a key that repeated).
 * So every reversible interaction here is driven through a full cycle
 *
 *     A -> B -> A -> B        a toggle
 *     0 -> 1 -> 0 -> 1        one item of a collection
 *     0 -> ALL -> 0 -> ALL    a select-all control
 *
 * and, because a double-firing handler can land on the right state by luck on an
 * even number of presses, the state is read after EVERY step and compared with
 * the one expected there, over `cycles` repetitions. One press must make
 * exactly one transition.
 *
 * Two layers, so a new surface adds a few lines rather than a new test:
 *
 *   roundTrip({ name, states, step, read, cycles, check })      generic engine
 *   runInteractionRoundTrips({ open, check, dl })               this repo's surfaces
 *
 * smoke-runtime.js calls the second; any other browser check can call the first.
 */

/**
 * Drive `step()` through `states` repeatedly and assert `read()` after each.
 *   states  the expected sequence AFTER each step, one cycle (e.g. ['on','off'])
 *   start   the state expected BEFORE the first step
 *   step    async () => performs ONE user action
 *   read    async () => the observed state, comparable with ===/JSON
 */
async function roundTrip({ name, start, states, step, read, cycles = 3, check }) {
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const first = await read();
  if (!eq(first, start)) {
    check(`${name}: starts in the expected state`, false, `expected ${JSON.stringify(start)}, got ${JSON.stringify(first)}`);
    return false;
  }
  let bad = null;
  outer:
  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < states.length; i++) {
      await step();
      const got = await read();
      if (!eq(got, states[i])) {
        bad = `cycle ${c + 1}, step ${i + 1}: expected ${JSON.stringify(states[i])}, got ${JSON.stringify(got)}`;
        break outer;
      }
    }
  }
  check(`${name}: ${states.length * cycles} presses, each one transition`, !bad, bad);
  return !bad;
}

/* The selection's own invariants, read from the page: internal state, the
   visual class, aria-pressed and the tray must all agree. */
const readSelection = (page) => page.evaluate(() => {
  const S = window.UltraTextGen.imageSelection;
  const tiles = Array.prototype.slice.call(document.querySelectorAll('.symbol-tile[data-symbol]'));
  const have = new Set(tiles.map((t) => t.getAttribute('data-symbol').trim()));
  const internal = S.values().filter((v) => have.has(v)).sort();
  const cls = new Set(), aria = new Set();
  tiles.forEach((t) => {
    const v = t.getAttribute('data-symbol').trim();
    if (t.classList.contains('is-image-selected')) cls.add(v);
    if (t.getAttribute('aria-pressed') === 'true') aria.add(v);
  });
  const tray = document.querySelector('.utg-selection-tray');
  const share = tray && tray.querySelector('.utg-sel-share');
  return {
    n: S.count(),
    internal,
    visual: Array.from(cls).sort(),
    aria: Array.from(aria).sort(),
    chips: tray ? tray.querySelectorAll('.utg-sel-chip').length : -1,
    shareOff: share ? share.disabled : null
  };
});

function selectionAgrees(s) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return same(s.internal, s.visual) && same(s.internal, s.aria) && s.chips === s.n && s.shareOff === (s.n === 0);
}

async function runInteractionRoundTrips({ open, check, dl }) {
  // 1. Image selection on a library page: tiles, keyboard, "Add all", reopen.
  console.log('\n/library/facebook-symbols/ (selection round trips)');
  {
    const { ctx, page, errors } = await open('/library/facebook-symbols/', 'desktop');
    await page.locator('.symbol-select-btn').first().click();
    await page.waitForSelector('.utg-selection-tray:not([hidden])');
    const tiles = page.locator('.symbol-tile[data-symbol]');
    const count = (s) => s.n;
    const agree = async () => selectionAgrees(await readSelection(page));

    const pressed = { ok: true };
    const tileTrip = (name, step) => roundTrip({
      name, start: 0, states: [1, 0], cycles: 10, check,
      step,
      read: async () => { const s = await readSelection(page); if (!selectionAgrees(s)) pressed.ok = false; return count(s); }
    });
    await tileTrip('tile by click, 0->1->0', () => tiles.nth(0).click());
    await tiles.nth(5).focus();
    await tileTrip('tile by Enter, 0->1->0', () => page.keyboard.press('Enter'));
    await tileTrip('tile by Space, 0->1->0', () => page.keyboard.press('Space'));
    check('selection state, class, aria-pressed, chips and Share agree after every press', pressed.ok);

    // One physical key press held down repeats keydown; it is still one press.
    await tiles.nth(5).focus();
    // An even number of repeats, so a handler firing on each one cannot land on the right state by parity.
    for (let i = 0; i < 6; i++) await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    check('a held Enter is one transition, not one per auto-repeat', (await readSelection(page)).n === 1);
    await tiles.nth(5).click();

    // "Add all" on a named set: 0 -> ALL -> 0 -> ALL, from clean and from partial.
    const sets = page.locator('.symbol-collection-add');
    check('the page offers at least one Add all set', (await sets.count()) > 0, `${await sets.count()}`);
    if ((await sets.count()) > 0) {
      const setSize = await sets.first().evaluate((b) => (b._utgValues || []).length);
      const label = () => sets.first().evaluate((b) => b.classList.contains('is-all-selected'));
      await roundTrip({
        name: 'Add all / Remove all, 0->ALL->0', start: 0, states: [setSize, 0], cycles: 4, check,
        step: () => sets.first().click(),
        read: async () => { const s = await readSelection(page); const all = await label(); return all === (s.n === setSize) ? s.n : `n=${s.n} but all-selected=${all}`; }
      });
      // Partial: one member chosen first, then Add all completes it, then Remove all clears it.
      await tiles.nth(1).click();
      const withOne = (await readSelection(page)).n;
      await sets.first().click();
      const afterAdd = (await readSelection(page)).n;
      await sets.first().click();
      const afterRemove = (await readSelection(page)).n;
      check('Add all from a partial selection completes the set, Remove all clears only it', afterAdd === withOne + setSize && afterRemove === withOne, `${withOne} -> ${afterAdd} -> ${afterRemove}`);
      await tiles.nth(1).click();
    }

    // Removing from the tray and choosing the same tile again is a round trip too.
    await tiles.nth(2).click();
    await page.locator('.utg-sel-chip').first().click();
    check('tray removal clears the tile', (await readSelection(page)).n === 0 && (await agree()));
    await tiles.nth(2).click();
    check('the same tile can be chosen again after a tray removal', (await readSelection(page)).n === 1 && (await agree()));

    // Cancel, reopen: nothing carried over, and the first press still works.
    await page.locator('.utg-sel-cancel').first().click();
    await page.locator('.symbol-select-btn').first().click();
    await page.waitForSelector('.utg-selection-tray:not([hidden])');
    check('a reopened selection starts empty', (await readSelection(page)).n === 0);
    await tileTrip('tile after reopen, 0->1->0', () => tiles.nth(0).click());
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 2. One press, one copy: a control wired twice shows up as two clipboard
  //    writes and two copy_text rows for one click.
  const countCopies = async (page, act) => {
    await page.evaluate(() => {
      window.__writes = [];
      Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: (t) => { window.__writes.push(t); return Promise.resolve(); } });
    });
    const before = (await dl(page)).filter((e) => e.event === 'copy_text').length;
    await act();
    await page.waitForTimeout(400);
    return {
      writes: await page.evaluate(() => window.__writes.length),
      rows: (await dl(page)).filter((e) => e.event === 'copy_text').slice(before).map((e) => e.copy_method)
    };
  };

  console.log('\n/es/usecase/tag-de-clan-free-fire/ (one click, one copy)');
  {
    const { ctx, page, errors } = await open('/es/usecase/tag-de-clan-free-fire/', 'desktop');
    const chip = page.locator('.ts-rare-chip[data-symbol]').first();
    check('a rare-tag chip is available', (await chip.count()) > 0);
    if ((await chip.count()) > 0) {
      await chip.scrollIntoViewIfNeeded();
      const r = await countCopies(page, () => chip.click());
      check('a rare-tag chip click copies once and records one row', r.writes === 1 && r.rows.length === 1, JSON.stringify(r));
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n/events/chinese-new-year/ (one click, one copy)');
  {
    const { ctx, page, errors } = await open('/events/chinese-new-year/', 'desktop');
    const btn = page.locator('.art-piece-copy').first();
    check('an ASCII art Copy button is rendered', (await btn.count()) > 0);
    if ((await btn.count()) > 0) {
      await btn.scrollIntoViewIfNeeded();
      const r = await countCopies(page, () => btn.click());
      check('an ASCII art Copy click copies once, recorded as ascii_art', r.writes === 1 && r.rows.length === 1 && r.rows[0] === 'ascii_art', JSON.stringify(r));
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 3. Generator: clear is a real input; Save keeps keyboard focus; Save is a toggle.
  console.log('\n/ (clear, Save round trips)');
  {
    const { ctx, page, errors } = await open('/', 'desktop');
    await page.fill('#mainInput', 'Łódź');
    await page.waitForTimeout(300);
    const notice = () => page.evaluate(() => { const n = document.querySelector('#accentNotice, .accent-notice'); return n ? !n.hidden : null; });
    check('the accent notice shows for accented text', (await notice()) === true);
    await page.locator('#inputClearBtn').first().click();
    await page.waitForTimeout(300);
    check('clearing the box also clears the accent notice', (await notice()) === false);

    await page.fill('#mainInput', 'Hello');
    await page.waitForTimeout(400);
    await page.locator('#resultsGrid .save-btn').first().focus();
    await roundTrip({
      name: 'Save by keyboard, unsaved->saved->unsaved', start: false, states: [true, false], cycles: 3, check,
      step: async () => { await page.keyboard.press('Enter'); await page.waitForTimeout(150); },
      read: () => page.evaluate(() => {
        const f = document.activeElement;
        const onSave = !!(f && f.closest && f.closest('.save-btn'));
        const saved = !!document.querySelector('#resultsGrid .save-btn.is-saved') || !!document.querySelector('#savedGrid .save-btn.is-saved');
        return onSave ? saved : 'focus lost to ' + (f ? f.tagName : 'nothing');
      })
    });
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 4. FAQ open/close/open: a toggle bound by both an inline script and
  //    script.js nets to nothing, so the answer could never be opened.
  console.log('\nFAQ round trips (inline handler + script.js)');
  for (const url of ['/de/nickname-generator/', '/it/font-discord/', '/pl/czcionka-pisana/', '/usecase/zalgo-text/']) {
    const { ctx, page, errors } = await open(url, 'desktop');
    const q = page.locator('.faq-question').first();
    await roundTrip({
      name: `${url} FAQ closed->open->closed`, start: false, states: [true, false], cycles: 3, check,
      step: () => q.click(),
      read: () => q.evaluate((e) => (e.closest('.faq-item') || e.parentElement).classList.contains('open'))
    });
    check(`${url} no page errors`, !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 5. Typed text is data: it must never become markup.
  console.log('\n/usecase/bio-font/?q=<markup> (typed text stays text)');
  {
    const { ctx, page } = await open('/usecase/bio-font/?q=' + encodeURIComponent('<img src=x id=pwn onerror="window.__xss=1">'), 'desktop');
    const r = await page.evaluate(() => ({ el: !!document.querySelector('#pwn'), ran: window.__xss === 1 }));
    check('a ?q= value with markup creates no element and runs no script', !r.el && !r.ran, JSON.stringify(r));
    await ctx.close();
  }

  // 6. A rebuilt results grid must keep an Auto Ads unit exactly where it was.
  //    Real ads cannot load under test, so a stand-in carrying the class Auto
  //    Ads uses (google-auto-placed) is placed in the grid; the page then
  //    rebuilds on typing and the unit must still be there, in the same slot.
  console.log('\nresults grids keep a placed ad unit when they rebuild');
  const GRIDS = [
    ['/pl/usecase/czcionki-tatuaze/', '#resultsGrid', '#mainInput'],
    ['/usecase/scrolling-text/', '#resultsGrid', '#scrollBioInput'],
    ['/category/text-decorator/', '#resultsGrid', '#mainInput'],
    ['/usecase/repeat-text/', '#resultsGrid', '#repeatPhraseInput'],
    ['/events/chinese-new-year/', '#eventFontsGrid', '#mainInput'],
    ['/category/cursive-fonts/', '#resultsGrid', '#mainInput'],
    ['/pl/usecase/vertical-text/', '#resultsGrid', '#mainInput'],
    ['/ko/yeongmun-ireum-byeonhwan/', '#romanizeResults', '#romanizeInput', '홍길동'],
    ['/', '#resultsGrid', '#mainInput']
  ];
  for (const [url, gridSel, inputSel, text] of GRIDS) {
    const { ctx, page, errors } = await open(url, 'desktop');
    await page.fill(inputSel, text || 'Hello');
    await page.waitForTimeout(600);
    const placed = await page.evaluate((g) => {
      const grid = document.querySelector(g);
      if (!grid) return null;
      const ad = document.createElement('div');
      ad.className = 'google-auto-placed';
      ad.id = 'sim-ad';
      ad.style.cssText = 'height:40px';
      grid.insertBefore(ad, grid.children[1] || null);
      const slot = Array.prototype.indexOf.call(grid.children, ad);
      window.__simAd = ad;
      return slot;
    }, gridSel);
    check(`${url} has a grid to test`, placed !== null);
    if (placed === null) { await ctx.close(); continue; }
    await page.fill(inputSel, (text || 'Hello') + '!');
    await page.waitForTimeout(700);
    const after = await page.evaluate((g) => {
      const grid = document.querySelector(g);
      const ad = document.getElementById('sim-ad');
      return { same: ad === window.__simAd, inGrid: !!(ad && grid.contains(ad)), slot: ad ? Array.prototype.indexOf.call(grid.children, ad) : -1 };
    }, gridSel);
    check(`${url} keeps the same ad node, in the same slot, after the grid rebuilds`, after.same && after.inGrid && after.slot === placed, JSON.stringify({ before: placed, after }));
    check(`${url} no page errors`, !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 7. A copy confirmation is a round trip: label -> Copied -> label, however fast the clicks.
  console.log('\ncopy confirmation labels restore after a quick second click');
  for (const [url, sel, text] of [['/library/norse-viking-runes/', '#runicCopy', 'Odin'], ['/ja/hankaku-zenkaku/', '.wc-copy', 'ABC abc 123']]) {
    const { ctx, page, errors } = await open(url, 'desktop');
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    const btn = page.locator(sel).first();
    await page.locator('textarea, input[type=text]').first().fill(text);
    await page.waitForTimeout(300);
    const start = await btn.textContent();
    await btn.click(); await page.waitForTimeout(250);
    await btn.click(); await page.waitForTimeout(250);
    check(`${url} shows the confirmation`, (await btn.textContent()) !== start);
    await page.waitForTimeout(2600);
    check(`${url} goes back to its own label after two quick clicks`, (await btn.textContent()) === start, `${start} -> ${await btn.textContent()}`);
    check(`${url} no page errors`, !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 8. Huruf: the confirmation appears on the row that exists after the redraw.
  console.log('\n/id/huruf-keren-a-sampai-z/ (confirmation survives the redraw)');
  {
    const { ctx, page, errors } = await open('/id/huruf-keren-a-sampai-z/', 'desktop');
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#hurufLetterStrip button').first().click();
    await page.waitForSelector('.bubble-variant-copy');
    await page.locator('.bubble-variant').nth(3).click();
    await page.waitForTimeout(150);
    const state = await page.evaluate(() => {
      const rows = Array.prototype.slice.call(document.querySelectorAll('.bubble-variant'));
      return { labels: rows.filter((r) => /Tersalin/.test(r.textContent)).length, focused: document.activeElement && document.activeElement.classList.contains('bubble-variant') };
    });
    check('exactly one row says Tersalin! after a click', state.labels === 1, JSON.stringify(state));
    check('focus stays on the row that was clicked', state.focused);
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 9. One Share row per section, built from every group in it.
  console.log('\n/library/color-emoji-combos/ (one Share row covers both groups)');
  {
    const { ctx, page, errors } = await open('/library/color-emoji-combos/', 'desktop');
    const r = await page.evaluate(() => {
      const secs = Array.prototype.filter.call(document.querySelectorAll('section'), (s) => s.querySelectorAll('.flag-rows').length > 1);
      return { sections: secs.length, rows: secs.map((s) => s.querySelectorAll('.symbol-section-actions').length) };
    });
    check('sections with two groups have exactly one action row', r.sections > 0 && r.rows.every((n) => n === 1), JSON.stringify(r));
    await page.evaluate(() => {
      window.__shared = null;
      Object.defineProperty(navigator, 'share', { configurable: true, value: (d) => { window.__shared = d; return Promise.resolve(); } });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    });
    // Exact text, not a substring: the second group's emoji also occur inside the
    // first group's combos, so "contains one of them" passes on the broken page too.
    const expected = await page.evaluate(() => {
      const s = Array.prototype.find.call(document.querySelectorAll('section'), (x) => x.querySelectorAll('.flag-rows').length > 1);
      s.setAttribute('data-sec', '1');
      return Array.prototype.map.call(s.querySelectorAll('.flag-rows .symbol-tile[data-symbol]'), (t) => t.getAttribute('data-symbol').trim()).filter(Boolean).join(' ');
    });
    await page.locator('[data-sec="1"] .symbol-section-actions button').first().click();
    await page.waitForTimeout(400);
    const shared = await page.evaluate(() => window.__shared && window.__shared.text);
    check("the section's Share text is every tile in the section, both groups", shared === expected, JSON.stringify({ expected, shared }));
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 10. The preview dialog holds focus, makes the page behind inert, and gives
  //     focus back: open -> close -> open, and Tab never leaves it.
  console.log('\n/ (preview dialog keeps focus)');
  {
    const { ctx, page, errors } = await open('/', 'desktop');
    await page.fill('#mainInput', 'Hello');
    await page.waitForTimeout(500);
    const opener = page.locator('.preview-btn').first();
    for (let round = 1; round <= 2; round++) {
      const inertBefore = await page.evaluate(() => Array.prototype.filter.call(document.body.children, (n) => n.hasAttribute('inert')).length);
      await opener.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(250);
      const out = [];
      for (let i = 0; i < 16; i++) {
        await page.keyboard.press(i % 5 === 4 ? 'Shift+Tab' : 'Tab');
        out.push(await page.evaluate(() => { const m = document.getElementById('previewModal'); return !!(m && m.contains(document.activeElement)); }));
      }
      check(`round ${round}: Tab and Shift+Tab stay inside the open dialog (16 presses)`, out.every(Boolean), JSON.stringify(out));
      const inert = await page.evaluate(() => Array.prototype.filter.call(document.body.children, (n) => n.id !== 'previewModal' && n.nodeType === 1 && !/^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(n.tagName)).every((n) => n.hasAttribute('inert')));
      check(`round ${round}: everything behind the dialog is inert`, inert);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      // Compared with before it opened: the mini header is legitimately inert.
      const back = await page.evaluate(() => ({ inert: Array.prototype.filter.call(document.body.children, (n) => n.hasAttribute('inert')).length, onOpener: document.activeElement && document.activeElement.classList.contains('preview-btn') }));
      check(`round ${round}: Escape restores exactly the inert state it found and returns focus to Preview`, back.inert === inertBefore && back.onOpener, JSON.stringify({ inertBefore, back }));
    }
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 11. Enter on a name card's own Copy button copies, and does not load the name.
  console.log('\n/category/cursive-fonts/ (a nested Copy button keeps its key)');
  {
    const { ctx, page, errors } = await open('/category/cursive-fonts/', 'desktop');
    const btn = page.locator('.cursive-name-example .copy-btn').first();
    await btn.scrollIntoViewIfNeeded();
    const r = await countCopies(page, async () => { await btn.focus(); await page.keyboard.press('Enter'); });
    const typed = await page.evaluate(() => { const i = document.querySelector('#cursiveNameInput, #nameInput, [id*="ameInput"]'); return i ? i.value : null; });
    check('Enter on the card Copy button copies once', r.writes === 1, JSON.stringify(r));
    check('and does not load the name into the studio field', typed === '' || typed === null, JSON.stringify(typed));
    check('Enter on the card itself still loads the name', await (async () => {
      const card = page.locator('.cursive-name-example').first();
      await card.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      return page.evaluate(() => { const i = document.querySelector('#cursiveNameInput, #nameInput, [id*="ameInput"]'); return !!(i && i.value); });
    })());
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 12. Active state is exposed to assistive technology, and follows the toggle.
  console.log('\n/ (aria state follows the active class, A->B->A)');
  {
    const { ctx, page, errors } = await open('/', 'desktop');
    await page.fill('#mainInput', 'Hello');
    await page.waitForTimeout(500);
    const pressedOf = (sel) => page.evaluate((q) => Array.prototype.map.call(document.querySelectorAll(q), (b) => b.getAttribute('aria-pressed')), sel);
    const one = (arr) => arr.length > 1 && arr.every((v) => v === 'true' || v === 'false') && arr.filter((v) => v === 'true').length === 1;
    const groups = ['.category-tab', '.decoration-tab'];
    for (const g of groups) {
      const tabs = page.locator(g);
      const n = await tabs.count();
      check(`${g}: every one carries aria-pressed, exactly one true`, one(await pressedOf(g)), JSON.stringify(await pressedOf(g)));
      if (n > 2) {
        const active0 = (await pressedOf(g)).indexOf('true');
        const other = active0 === 1 ? 2 : 1;
        await roundTrip({
          name: `${g} A->B->A`, start: active0, states: [other, active0], cycles: 3, check,
          step: async () => { const cur = (await pressedOf(g)).indexOf('true'); await tabs.nth(cur === other ? active0 : other).click(); await page.waitForTimeout(120); },
          read: async () => (await pressedOf(g)).indexOf('true')
        });
      }
    }
    const scope = await pressedOf('.scope-chip');
    check('scope chips carry aria-pressed, exactly one true', one(scope), JSON.stringify(scope));
    const dm = page.locator('#darkModeBtn');
    await roundTrip({
      name: 'dark mode button aria-pressed off->on->off', start: 'false', states: ['true', 'false'], cycles: 3, check,
      step: () => dm.click(), read: () => dm.getAttribute('aria-pressed')
    });
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open('/de/nickname-generator/', 'desktop');
    const q = page.locator('.faq-question').first();
    await roundTrip({
      name: 'FAQ aria-expanded false->true->false', start: 'false', states: ['true', 'false'], cycles: 3, check,
      step: async () => { await q.click(); await page.waitForTimeout(80); }, read: () => q.getAttribute('aria-expanded')
    });
    check('no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
}

module.exports = { roundTrip, runInteractionRoundTrips, readSelection, selectionAgrees };
