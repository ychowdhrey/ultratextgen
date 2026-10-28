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
  const listeners = {};
  const win = {
    localStorage: storage, dataLayer,
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); }
  };
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
  const fire = (type, ev) => (listeners[type] || []).forEach((fn) => fn(ev));
  return { api: win.UltraTextGen.saved, dataLayer, events, storage, fire };
}

/** Two tabs over one localStorage: the same module evaluated twice. */
function loadTwoTabs(seed) {
  const a = load(seed);
  const b = load();
  // Point tab B at tab A's storage, then reload B's view of it.
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const src = fs.readFileSync(path.join(__dirname, 'saved-items.js'), 'utf8');
  const listeners = {};
  const win = {
    localStorage: a.storage, dataLayer: [],
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); }
  };
  const events = [];
  const sandbox = {
    window: win, localStorage: a.storage,
    document: { addEventListener() {}, dispatchEvent(e) { events.push(e); return true; } },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    Date
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  void b;
  return {
    a,
    b: { api: win.UltraTextGen.saved, events, fire: (type, ev) => (listeners[type] || []).forEach((fn) => fn(ev)) }
  };
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

/* ---- the cap evicts by type -------------------------------------------- */

/** A full store as the module writes it: newest first, the style saved
 *  before every symbol, so it sits at the END of the list. */
function fullStore(symbols, withStyle) {
  const list = [];
  for (let i = symbols - 1; i >= 0; i--) list.push({ type: 'symbol', value: 's' + i, label: 's' + i, href: '', t: 10 + i });
  if (withStyle) list.push({ type: 'style', value: 'Bold', label: 'Bold', href: '', t: 1 });
  return list;
}

{
  // One shared list, one cap. Trimming the tail evicted the oldest record of
  // ANY type, so a symbol filling the store deleted a font style saved earlier.
  const { api, events } = load({ utg_saved_items: JSON.stringify(fullStore(199, true)) });
  eq(api.count(), 200, 'the store starts full: 1 style + 199 symbols');
  api.toggle({ type: 'symbol', value: 'one-more', label: 'one-more' });
  eq(api.count(), 200, 'one more symbol takes the store over the cap and back to 200');
  eq(api.has('style', 'Bold'), true, 'the style saved earlier survives a symbol filling the store');
  eq(api.has('symbol', 's0'), false, 'the oldest symbol goes instead');
  eq(api.lastEvicted(), [{ type: 'symbol', value: 's0', label: 's0' }], 'lastEvicted() names what was pushed out');
  eq(events[events.length - 1].detail.evicted, [{ type: 'symbol', value: 's0', label: 's0' }],
    'and utg:savedchange carries it, so a host could say so');
}

{
  // 200 symbols and one style saved earlier, then a 201st symbol.
  const { api, storage } = load({ utg_saved_items: JSON.stringify(fullStore(200, true)) });
  api.set({ type: 'symbol', value: 's200', label: 's200' }, true);
  ok(api.has('style', 'Bold'), 'a 201st symbol never evicts the saved style');
  eq(api.has('symbol', 's0'), false, 'the oldest symbol is evicted');
  ok(api.has('symbol', 's200') && api.has('symbol', 's2'), 'the new symbol and the newer ones stay');
  eq(api.count(), 200, 'and the store is back at the cap');
  const stored = JSON.parse(storage.getItem('utg_saved_items'));
  ok(stored.some((r) => r.type === 'style' && r.value === 'Bold'), 'the stored list still holds the style');
  eq(JSON.parse(storage.getItem('utg_saved_styles')), ['Bold'], 'and the legacy style key keeps it too');
}

{
  // Fallback: a type with nothing else to give evicts the oldest record overall.
  const { api } = load({ utg_saved_items: JSON.stringify(fullStore(200, false)) });
  api.toggle({ type: 'style', value: 'Bold', label: 'Bold' });
  eq(api.count(), 200, 'the first style into a full store keeps it at the cap');
  ok(api.has('style', 'Bold'), 'the new style is saved');
  eq(api.lastEvicted(), [{ type: 'symbol', value: 's0', label: 's0' }],
    'with no older style to give, the oldest record overall goes');
}

{
  const { api, events } = load();
  api.toggle({ type: 'symbol', value: '★', label: '★' });
  eq(api.lastEvicted(), [], 'a save under the cap evicts nothing');
  eq(events[events.length - 1].detail.evicted, [], 'and the event says so');
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
  api.toggle({ type: 'symbol', value: '♥', label: '♥' });
  eq(api.count(), 2, 'a second save keeps the first when storage cannot be read');
}

/* ---- storage readable but refusing writes (quota) ---------------------- */

{
  // getItem works and setItem throws QuotaExceededError. Each toggle re-reads
  // the stored list first; with writes refused that re-read returned the OLD
  // list and replaced the in-memory one, so the second save erased the first.
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const src = fs.readFileSync(path.join(__dirname, 'saved-items.js'), 'utf8');
  const map = {};
  let refuse = true;
  const quota = {
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => { if (refuse) throw new Error('QuotaExceededError'); map[k] = String(v); }
  };
  const win = { localStorage: quota, dataLayer: [], addEventListener() {} };
  const sandbox = {
    window: win, localStorage: quota,
    document: { addEventListener() {}, dispatchEvent() {} },
    CustomEvent: function () {}, Date
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const api = win.UltraTextGen.saved;
  api.toggle({ type: 'symbol', value: '★', label: 'Star' });
  api.toggle({ type: 'symbol', value: '♥', label: 'Heart' });
  eq(api.count(), 2, 'a refused write does not make the next save erase the first');
  ok(api.has('symbol', '★') && api.has('symbol', '♥'), 'both saves stay readable for the life of the page');
  api.toggle({ type: 'symbol', value: '★', label: 'Star' });
  eq(api.has('symbol', '★'), false, 'unsaving still works while storage refuses writes');
  refuse = false;
  api.toggle({ type: 'symbol', value: '☆', label: 'Outline' });
  const stored = JSON.parse(map['utg_saved_items']).map((r) => r.value).sort();
  eq(stored, ['☆', '♥'], 'once storage accepts writes again, memory (not the stale store) is what is saved');
}

/* ---- two tabs: no save is lost ---------------------------------------- */

{
  // Both tabs open first, so each loaded an empty list. Tab A saves, then
  // tab B (still holding the list it loaded) saves something else. Before
  // the re-read, B's write replaced the whole store and A's save was gone.
  const { a, b } = loadTwoTabs();
  a.api.toggle({ type: 'symbol', value: '★', label: 'Star' });
  b.api.toggle({ type: 'style', value: 'Ultra Bold', label: 'Ultra Bold' });
  const stored = JSON.parse(a.storage.getItem('utg_saved_items')).map((r) => r.type + ':' + r.value).sort();
  eq(stored, ['style:Ultra Bold', 'symbol:★'], 'a save in a stale tab keeps the other tab\'s save');

  // Removing in the stale tab removes only that record.
  b.api.toggle({ type: 'style', value: 'Ultra Bold' });
  eq(JSON.parse(a.storage.getItem('utg_saved_items')).map((r) => r.value), ['★'],
    'an unsave in one tab does not resurrect or drop the other tab\'s records');

  // Tab B learns about A's change from the storage event, without reloading.
  a.api.toggle({ type: 'symbol', value: '♥', label: 'Heart' });
  eq(b.api.has('symbol', '♥'), false, 'before the storage event, tab B still shows its old list');
  const before = b.events.length;
  b.fire('storage', { key: 'utg_saved_items' });
  eq(b.api.has('symbol', '♥'), true, 'a storage event refreshes the other tab');
  eq(b.events.length, before + 1, 'and announces the change so stars and the strip re-render');
  b.fire('storage', { key: 'some_other_key' });
  eq(b.events.length, before + 1, 'unrelated storage keys are ignored');
}

/* ---- set(): a press carries its intent, not a flip --------------------- */

{
  const { api, dataLayer, events } = load();
  eq(api.set({ type: 'style', value: 'Bold', label: 'Bold' }, true), true, 'set(rec, true) saves an absent record');
  eq(api.has('style', 'Bold'), true, 'and it is stored');
  const rows = dataLayer.length;
  const evs = events.length;
  eq(api.set({ type: 'style', value: 'Bold', label: 'Bold' }, true), true, 'set(rec, true) on a saved record keeps it saved');
  eq(api.has('style', 'Bold'), true, 'rather than removing it the way toggle() would');
  eq(dataLayer.length, rows, 'a no-op set records no save_style row');
  eq(events.length, evs, 'and announces no change');
  eq(api.set({ type: 'style', value: 'Bold' }, false), false, 'set(rec, false) removes a saved record');
  eq(api.has('style', 'Bold'), false, 'and it is gone');
  eq(api.set({ type: 'style', value: 'Bold' }, false), false, 'set(rec, false) on an absent record is a no-op');
  eq(dataLayer.map((e) => e.event), ['save_style', 'unsave_style'], 'only the two real changes fired events');
  eq(api.set({ type: 'font', value: 'x' }, true), null, 'set() rejects a malformed record like toggle()');
}

{
  // The defect set() exists for. Tab B painted its star while the store was
  // empty; tab A then saved the style. B's visitor sees "Save" and presses it.
  // toggle() re-read the store, found the style, and REMOVED it. set(…, true)
  // re-reads the same store and leaves it saved.
  const { a, b } = loadTwoTabs();
  a.api.toggle({ type: 'style', value: 'Ultra Bold', label: 'Ultra Bold' });
  eq(b.api.has('style', 'Ultra Bold'), false, 'the stale tab still believes the style is unsaved');
  eq(b.api.set({ type: 'style', value: 'Ultra Bold', label: 'Ultra Bold' }, true), true,
    'pressing a stale "Save" in the other tab keeps the item saved');
  eq(JSON.parse(a.storage.getItem('utg_saved_items')).map((r) => r.value), ['Ultra Bold'],
    'the stored list still holds it, once');
  eq(b.api.has('style', 'Ultra Bold'), true, 'and the stale tab now knows it is saved');
}

/* ---- report ------------------------------------------------------------ */

console.log(`saved-items: ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((f) => console.error(`  FAIL  ${f}`));
  process.exit(1);
}
