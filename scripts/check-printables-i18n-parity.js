#!/usr/bin/env node
'use strict';

/**
 * check-printables-i18n-parity.js — a printables page must not print an
 * English label because its language's row in a module's translation table
 * forgot a key.
 *
 * The printables modules (js/printables/*.js) carry their own per-language UI
 * tables, mostly read as `Object.assign({}, TABLE.en, TABLE[lang])`. A key the
 * Spanish row forgets does not throw and looks fine in review: the Spanish page
 * just shows the English string. What a gap is, which tables exist, and which
 * pages mount which keys are defined once, in scripts/lib/printables-i18n.js.
 *
 * Each gap has an effect:
 *   english    the page shows the English string           -> gates
 *   undefined  the key reads as undefined                   -> gates
 *   optional   every caller tests for the key first, so the
 *              language just shows nothing extra            -> reported only
 *
 * DELTA, NOT STATE. A gap fails the run only if it is new since the merge base
 * (same file, table, language and key). Gaps already on the base are reported,
 * never silenced. A gap is "new" both when a key is added to `en` without the
 * other mounted languages and when a page in a new language starts mounting a
 * control whose row is incomplete.
 *
 * Exit codes: 0 no new gap · 1 new gap(s) · 2 UNKNOWN (a table that cannot be
 * read in isolation, a page language the locale registry does not know, a mount
 * rule that no longer resolves, or a base that cannot be measured). UNKNOWN is
 * never 0.
 *
 * Usage:
 *   node scripts/check-printables-i18n-parity.js                 # delta vs origin/main
 *   node scripts/check-printables-i18n-parity.js --base main
 *   node scripts/check-printables-i18n-parity.js --all           # whole-tree report, informational
 */

const { execFileSync } = require('child_process');
const path = require('path');
const lib = require('./lib/printables-i18n');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const ALL = args.includes('--all');
const baseIdx = args.indexOf('--base');
const requestedBase = baseIdx !== -1 ? args[baseIdx + 1] : 'origin/main';
const GATING = new Set(['english', 'undefined']);

function git(cmdArgs, opts) {
  return execFileSync('git', cmdArgs, Object.assign({ cwd: ROOT, encoding: 'utf8' }, opts || {}));
}

function unknown(msg) {
  console.error(`UNKNOWN: ${msg}`);
  console.error('Nothing was compared. This is not a pass.');
  process.exit(2);
}

function resolveBase(base) {
  try {
    git(['rev-parse', '--verify', base], { stdio: 'ignore' });
    return base;
  } catch {
    const branch = base.replace(/^origin\//, '');
    try {
      git(['fetch', '--depth=200', 'origin', branch], { stdio: 'ignore' });
      const candidate = `origin/${branch}`;
      git(['rev-parse', '--verify', candidate], { stdio: 'ignore' });
      return candidate;
    } catch (e) {
      return unknown(`could not resolve or fetch base ref "${base}": ${e.message}`);
    }
  }
}

function describe(g) {
  const where = g.pages.length === 1 ? g.pages[0] : `${g.pages.length} pages, e.g. ${g.pages[0]}`;
  return `${g.file} ${g.table}.${g.lang}  ${g.key}  [${g.effect}]  (${where})`;
}

function unknownRows(m, label) {
  const rows = [];
  for (const u of m.unreadable) rows.push(`${label}: ${u.file}:${u.line} ${u.name} names a language key but cannot be evaluated alone (${u.error})`);
  for (const u of m.unknownLangs) rows.push(`${label}: ${u.page} loads ${u.file} with lang "${u.lang}", which the locale registry does not know`);
  for (const p of m.problems) rows.push(`${label}: ${p}`);
  return rows;
}

let head;
try {
  head = lib.measure(null);
} catch (e) {
  unknown(`could not measure the working tree: ${e.message}`);
}

const tableCount = head.modules.reduce((n, m) => n + m.tables.length, 0);
const engine = head.modules.find((m) => m.file === `${lib.SRC_DIR}/printablesEngine.js`);
if (!engine || !engine.tables.some((t) => t.name === 'I18N')) {
  unknown(`printablesEngine.js's I18N table was not found. If it was renamed or moved, update ${path.relative(ROOT, require.resolve('./lib/printables-i18n'))}.`);
}

console.log('Printables translation key parity');
console.log(`  tables:   ${tableCount} in ${head.modules.length} modules`);
for (const m of head.modules) {
  console.log(`    ${m.file}: ${m.tables.map((t) => `${t.name}(${t.mode})`).join(', ')}`);
  console.log(`      loaded by ${m.pages} pages in: ${[...m.mounted].sort().join(', ')}`);
}

const headUnknown = unknownRows(head, 'working tree');

if (ALL) {
  const byEffect = { english: [], undefined: [], optional: [] };
  for (const g of head.gaps) byEffect[g.effect].push(g);
  for (const eff of ['english', 'undefined', 'optional']) {
    console.log(`\n  ${eff}: ${byEffect[eff].length}`);
    for (const g of byEffect[eff]) console.log(`    ${describe(g)}`);
  }
  if (headUnknown.length) {
    console.log('');
    for (const r of headUnknown) console.error(`  UNKNOWN ${r}`);
    process.exit(2);
  }
  process.exit(0);
}

const base = resolveBase(requestedBase);
let mergeBase;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch (e) {
  unknown(`could not compute merge-base of ${base} and HEAD: ${e.message}`);
}
let before;
try {
  before = lib.measure(mergeBase);
} catch (e) {
  unknown(`could not measure the merge base ${mergeBase.slice(0, 8)}: ${e.message}`);
}
console.log(`  base:     ${base} (merge-base ${mergeBase.slice(0, 8)})`);

const baseIds = new Set(before.gaps.filter((g) => GATING.has(g.effect)).map(lib.gapId));
const gating = head.gaps.filter((g) => GATING.has(g.effect));
const fresh = gating.filter((g) => !baseIds.has(lib.gapId(g)));
const standing = gating.filter((g) => baseIds.has(lib.gapId(g)));
const optional = head.gaps.filter((g) => g.effect === 'optional');
const headIds = new Set(gating.map(lib.gapId));
const closed = before.gaps.filter((g) => GATING.has(g.effect) && !headIds.has(lib.gapId(g)));

console.log(`\n  new gaps (gate):            ${fresh.length}`);
for (const g of fresh) console.log(`    NEW ${describe(g)}`);
console.log(`  pre-existing gaps (report): ${standing.length}`);
for (const g of standing) console.log(`    ${describe(g)}`);
console.log(`  optional, guarded (report): ${optional.length}`);
const optByKey = new Map();
for (const g of optional) {
  const k = `${g.file} ${g.table} ${g.key}`;
  if (!optByKey.has(k)) optByKey.set(k, []);
  optByKey.get(k).push(g.lang);
}
for (const [k, ls] of optByKey) console.log(`    ${k}: ${ls.join(', ')}`);
if (closed.length) {
  console.log(`  closed since the base:      ${closed.length}`);
  for (const g of closed) console.log(`    ${g.file} ${g.table}.${g.lang} ${g.key}`);
}

if (headUnknown.length) {
  console.log('');
  for (const r of headUnknown) console.error(`  UNKNOWN ${r}`);
  console.error('\nUNKNOWN: part of the tree could not be measured, so a clean result here would not mean clean.');
  process.exit(2);
}

if (fresh.length) {
  console.error(`\nFAIL: ${fresh.length} translation key(s) missing for a language whose pages mount the control.`);
  console.error('Add the key to that language\'s row with a string the page already uses or a reviewed translation,');
  console.error('or do not mount the control in that language. Never copy the English string into the row.');
  process.exit(1);
}
console.log('\nOK: no new missing translation keys.');
process.exit(0);
