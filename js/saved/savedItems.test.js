/**
 * savedItems.test.js — node js/saved/savedItems.test.js
 *
 * Assertions for the typed saved-items store: record validation, identity,
 * ordering, the cap, the analytics payload, and the migration off the old
 * flat "utg_saved_styles" array.
 *
 * Same idiom as js/counter/counterRules.test.js — no framework, no
 * dependencies, no DOM beyond the two stubs below. It exists for the same
 * stated reason that one does: this module asserts something a visual check
 * cannot verify. A saved symbol that silently fails to persist, or a
 * migration that drops a returning user's saved fonts, looks identical to a
 * working one until someone comes back a week later.
 */

'use strict';

let pass = 0;
const failures = [];

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n      expected ${e}\n      actual   ${a}`);
}

function ok(cond, label) { eq(!!cond, true, label); }

/* ---- stubs ------------------------------------------------------------- */

function makeStorage(seed) {
  const map = Object.assign({}, seed);
  return {
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => { map[k] = String(v); },
    _dump: () => map
  };
}

/** Load a fresh copy of the module against a given localStorage seed. The
 *  module is an IIFE that reads storage once at load, so each scenario needs
 *  its own evaluation rather than a shared require(). */
function load(seed) {
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const src = fs.readFileSync(path.join(__dirname, 'saved-items.js'), 'utf8');

  const events = [];
  const dataLayer = [];
  const storage = makeStorage(seed || {});
  const win = { localStorage: storage, dataLayer };
  const sandbox = {
    window: win,
    localStorage: storage,
    document: {
      addEventListener() {},
      dispatchEvent(e) { events.push(e); return true; }
    },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    Date
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { api: win.UltraTextGen.saved, dataLayer, events, storage };
}

/* ---- a fresh store ----------------------------------------------------- */

{
  const { api } = load();
  eq(api.all(), [], 'empty store returns no records');
  eq(api.count(), 0, 'empty store counts zero');
  eq(api.has('symbol', '★'), false, 'empty store has nothing');
}

/* ---- toggling ---------------------------------------------------------- */

{
  const { api, dataLayer } = load();
  eq(api.toggle({ type: 'symbol', value: '★', label: 'Black Star' }), true, 'first toggle saves');
  eq(api.has('symbol', '★'), true, 'saved symbol is present');
  eq(api.count('symbol'), 1, 'one symbol saved');
  eq(api.toggle({ type: 'symbol', value: '★', label: 'Black Star' }), false, 'second toggle removes');
  eq(api.has('symbol', '★'), false, 'removed symbol is gone');

  eq(dataLayer.map((e) => e.event), ['save_style', 'unsave_style'], 'both events fired');
  eq(dataLayer[0].item_type, 'symbol', 'save event carries the item type');
  eq(dataLayer[0].item_label, 'Black Star', 'save event carries the label');
  eq(dataLayer[0].style_name, undefined, 'style_name is omitted for a non-style');
}

{
  // style_name is retained for styles so the existing GA4 reports keep working.
  const { api, dataLayer } = load();
  api.toggle({ type: 'style', value: 'Bold', label: 'Bold' });
  eq(dataLayer[0].style_name, 'Bold', 'style_name still set for a saved style');
  eq(dataLayer[0].item_type, 'style', 'item_type distinguishes it');
}

/* ---- identity is (type, value), not label ------------------------------ */

{
  const { api } = load();
  api.toggle({ type: 'symbol', value: '★', label: 'Black Star' });
  eq(api.toggle({ type: 'symbol', value: '★', label: 'Estrella negra' }), false,
    'the same glyph under a different locale label is the same record');
  eq(api.count('symbol'), 0, 'so toggling it again removes rather than duplicates');
}

{
  const { api } = load();
  api.toggle({ type: 'symbol', value: 'Bold', label: 'Bold' });
  api.toggle({ type: 'style', value: 'Bold', label: 'Bold' });
  eq(api.count(), 2, 'the same value under two types are two records');
  eq(api.count('style'), 1, 'counted separately by type');
}

/* ---- validation -------------------------------------------------------- */

{
  const { api, dataLayer } = load();
  eq(api.toggle(null), null, 'null is rejected');
  eq(api.toggle({ type: 'symbol' }), null, 'a record with no value is rejected');
  eq(api.toggle({ type: 'symbol', value: '' }), null, 'an empty value is rejected');
  eq(api.toggle({ type: 'font', value: 'x' }), null, 'an unknown type is rejected');
  eq(api.toggle({ type: 'symbol', value: 5 }), null, 'a non-string value is rejected');
  eq(dataLayer.length, 0, 'a rejected record fires no analytics event');
  eq(api.count(), 0, 'and stores nothing');
}

/* ---- ordering and the cap ---------------------------------------------- */

{
  const { api } = load();
  api.toggle({ type: 'symbol', value: 'a', label: 'a' });
  api.toggle({ type: 'symbol', value: 'b', label: 'b' });
  eq(api.all('symbol').map((r) => r.value), ['b', 'a'], 'newest first');
}

{
  const { api } = load();
  for (let i = 0; i < 210; i++) api.toggle({ type: 'symbol', value: 's' + i, label: 's' + i });
  eq(api.count(), 200, 'the store caps at 200 records');
  eq(api.all()[0].value, 's209', 'and keeps the newest');
}

/* ---- the store cannot be mutated through what it hands out ------------- */

{
  const { api } = load();
  api.toggle({ type: 'symbol', value: '★', label: 'Black Star' });
  const list = api.all('symbol');
  list.length = 0;
  eq(api.count('symbol'), 1, 'emptying the returned array does not empty the store');
}

/* ---- clear ------------------------------------------------------------- */

{
  const { api } = load();
  api.toggle({ type: 'symbol', value: '★', label: '★' });
  api.toggle({ type: 'style', value: 'Bold', label: 'Bold' });
  api.clear('symbol');
  eq(api.count('symbol'), 0, 'clear(type) empties that type');
  eq(api.count('style'), 1, 'and leaves the others alone');
  api.clear();
  eq(api.count(), 0, 'clear() empties everything');
}

/* ---- migration off the old flat style array ---------------------------- */

{
  const { api } = load({ utg_saved_styles: JSON.stringify(['Bold', 'Cursive']) });
  eq(api.count('style'), 2, 'pre-typed saved styles are read in');
  ok(api.has('style', 'Bold'), 'and are addressable by the new API');
  eq(api.count('symbol'), 0, 'without inventing records of other types');
}

{
  // Migration must not duplicate a style the typed store already holds.
  const { api } = load({
    utg_saved_items: JSON.stringify([{ type: 'style', value: 'Bold', label: 'Bold', t: 5 }]),
    utg_saved_styles: JSON.stringify(['Bold', 'Cursive'])
  });
  eq(api.count('style'), 2, 'an already-migrated style is not folded in twice');
  eq(api.all('style').map((r) => r.value).sort(), ['Bold', 'Cursive'], 'and both survive');
}

{
  const { api, storage } = load({ utg_saved_styles: JSON.stringify(['Bold', 'Cursive']) });
  api.toggle({ type: 'style', value: 'Bold', label: 'Bold' }); // remove it
  eq(JSON.parse(storage.getItem('utg_saved_styles')), ['Cursive'],
    'the legacy key is kept in step, so an older cached script.js cannot resurrect it');
  ok(storage.getItem('utg_saved_items'), 'and the typed key is written');
}

{
  const { api } = load({ utg_saved_items: '{ not json' });
  eq(api.count(), 0, 'corrupt storage reads as empty rather than throwing');
}

{
  const { api } = load({ utg_saved_items: JSON.stringify([{ type: 'nope', value: 'x' }, { junk: 1 }]) });
  eq(api.count(), 0, 'malformed stored records are dropped on read');
}

/* ---- storage being unavailable is survivable --------------------------- */

{
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const src = fs.readFileSync(path.join(__dirname, 'saved-items.js'), 'utf8');
  const throwing = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); }
  };
  const win = { localStorage: throwing, dataLayer: [] };
  const sandbox = {
    window: win, localStorage: throwing,
    document: { addEventListener() {}, dispatchEvent() {} },
    CustomEvent: function () {}, Date
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const api = win.UltraTextGen.saved;
  eq(api.count(), 0, 'a throwing localStorage loads as empty');
  eq(api.toggle({ type: 'symbol', value: '★', label: '★' }), true,
    'and saving still works in memory for the life of the page');
  eq(api.has('symbol', '★'), true, 'the in-memory record is readable');
}

/* ---- report ------------------------------------------------------------ */

console.log(`saved-items: ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((f) => console.error(`  FAIL  ${f}`));
  process.exit(1);
}
