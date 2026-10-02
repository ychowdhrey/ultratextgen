/**
 * imageSelection.test.js — node js/share/imageSelection.test.js
 *
 * The selection behind "Select and share image" on library pages, as plain
 * data: what is in it, in what order, and what a repeat, a set or the limit
 * does to it. These are the rules that decide what ends up in the picture,
 * so they are asserted rather than eyeballed. The DOM half (tiles, tray,
 * preview, keyboard) is exercised in a real browser by
 * js/share/imageSelection.test.html.
 *
 * Same idiom as shareCore.test.js: no framework, the module is evaluated in
 * a vm sandbox against the few globals it touches at load.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0;
const failures = [];
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n      expected ${e}\n      actual   ${a}`);
}
function ok(cond, label) { eq(!!cond, true, label); }

const SRC = fs.readFileSync(path.join(__dirname, 'image-selection.js'), 'utf8');

function load(lang) {
  const dataLayer = [];
  const document = {
    documentElement: { lang: lang || 'en', dir: '', classList: { add() {}, remove() {} }, style: { setProperty() {}, removeProperty() {} } },
    body: {},
    addEventListener() {},
    dispatchEvent() { return true; },
    querySelectorAll: () => []
  };
  const win = { dataLayer, document };
  const sandbox = {
    window: win,
    document,
    getComputedStyle: () => ({ direction: 'ltr' }),
    CustomEvent: function CustomEvent() {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    console
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  return { UTG: win.UltraTextGen, dataLayer };
}

const { UTG } = load('en');

/* ---- the module registers, and starts closed --------------------------- */
ok(UTG.imageSelection, 'registers UltraTextGen.imageSelection');
eq(UTG.imageSelection.isActive(), false, 'starts closed: a tile press copies until the visitor opts in');
eq(UTG.imageSelection.count(), 0, 'and starts empty');

/* ---- selection order, toggling, repeats -------------------------------- */
{
  const s = UTG.createImageSelection(50);
  eq(s.toggle('🥹', 'Holding back tears'), 'added', 'a first press adds');
  s.toggle('🫶', 'Heart hands');
  s.toggle('✨', 'Sparkles');
  eq(s.values(), ['🥹', '🫶', '✨'], 'items keep the order they were chosen in');
  eq(s.toggle('🫶'), 'removed', 'pressing a chosen item again removes it');
  eq(s.values(), ['🥹', '✨'], 'and the rest keep their order');
  s.toggle('🫶');
  eq(s.values(), ['🥹', '✨', '🫶'], 're-adding puts it at the end, where it was chosen');
  eq(s.toggle('✨'), 'removed', 'the same exact item from another section is the same item');
  eq(s.values().filter((v) => v === '✨').length, 0, 'never added twice by appearing twice');
  s.remove('🥹'); s.remove('🫶');
  eq(s.count(), 0, 'removing everything returns to an empty selection');
}

/* ---- complete sequences are one item ----------------------------------- */
{
  const s = UTG.createImageSelection(50);
  ['❤️‍🔥', '🫶🏼', '👨‍👩‍👧', '🇸🇬'].forEach((v) => s.toggle(v));
  eq(s.values(), ['❤️‍🔥', '🫶🏼', '👨‍👩‍👧', '🇸🇬'], 'joined, toned and flag sequences are stored whole');
  ok(s.has('🫶🏼') && !s.has('🫶'), 'a skin-tone variant is its own item, not its base');
}

/* ---- a named set ------------------------------------------------------- */
{
  const s = UTG.createImageSelection(50);
  s.toggle('🥹');
  s.toggle('🇲🇾');
  const asean = ['🇸🇬', '🇲🇾', '🇮🇩', '🇹🇭'].map((v) => ({ value: v }));
  eq(s.addMany(asean), { result: 'added', added: 3 }, 'adding a set adds only its missing members');
  eq(s.values(), ['🥹', '🇲🇾', '🇸🇬', '🇮🇩', '🇹🇭'], 'appended in the set\'s own order after what was there');
  s.remove('🇮🇩');
  eq(s.values(), ['🥹', '🇲🇾', '🇸🇬', '🇹🇭'], 'one member can be removed on its own');
  eq(s.removeMany(['🇸🇬', '🇲🇾', '🇮🇩', '🇹🇭']), 3, 'removing the set removes the members still in it');
  eq(s.values(), ['🥹'], 'and leaves the rest of the selection alone');
}

/* ---- the limit: refused, never truncated ------------------------------- */
{
  const s = UTG.createImageSelection(5);
  ['a', 'b', 'c', 'd', 'e'].forEach((v) => s.toggle(v));
  eq(s.toggle('f'), 'limit', 'past the limit a press is refused and says so');
  eq(s.count(), 5, 'and nothing is added');
  s.remove('e');
  eq(s.addMany([{ value: 'x' }, { value: 'y' }]), { result: 'limit', added: 0 },
    'a set that would pass the limit adds none of its members, never half');
  eq(s.count(), 4, 'the selection is unchanged');
}
eq(UTG.imageSelection.MAX_ITEMS, 50, 'the page limit is 50');

/* ---- strings: every locale complete, placeholders intact --------------- */
{
  const m = SRC.match(/\/\* @image-selection-strings:begin \*\/([\s\S]*?)\/\* @image-selection-strings:end \*\//);
  ok(m, 'the string table is marked for the sync script');
  const table = vm.runInNewContext('(function(){' + m[1] + ' return UI_STRINGS; })()');
  const keys = Object.keys(table.en);
  const locales = fs.readdirSync(path.join(__dirname, '..', '..', 'locales'))
    .filter((f) => f.endsWith('.json') && f !== 'en.json')
    .map((f) => (f === 'zh-tw.json' ? 'zh' : f.replace(/\.json$/, '')));
  locales.forEach((l) => {
    ok(table[l], `locale ${l} has an entry`);
    if (!table[l]) return;
    keys.forEach((k) => ok(table[l][k], `${l}.${k} is present`));
    [['count', '{n}'], ['addAll', '{n}'], ['removeAll', '{n}'], ['remove', '{item}'], ['limit', '{max}']]
      .forEach(([k, ph]) => ok(String(table[l][k] || '').indexOf(ph) !== -1, `${l}.${k} keeps ${ph}`));
  });
  // Korean is the reference page's locale: read it back here so a regression
  // to English is a failure, not a screenshot someone has to notice.
  eq(table.ko.shareImage, '이미지 공유', 'Korean share label');
}

/* ---- no analytics row carries the chosen content ----------------------- */
{
  ok(!/selection_items|selection_values|selected_text/.test(SRC), 'the event schema has no field for the chosen items');
  ok(SRC.indexOf('share' + '_text') === -1, 'this module never writes the share event itself');
}

console.log(`image-selection: ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((f) => console.error(`  FAIL  ${f}`));
  process.exit(1);
}
