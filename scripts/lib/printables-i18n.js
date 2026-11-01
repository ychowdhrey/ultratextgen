'use strict';

/**
 * printables-i18n.js — the one definition of a "missing translation" in the
 * printables engines' own UI tables.
 *
 * WHAT IT CATCHES
 * ---------------
 * The printables modules (js/printables/*.js) carry their own per-language
 * label tables: the engine's I18N block (read as `T.*`), OPTIONS_I18N,
 * AUDIENCE_I18N, printPrefs.js's CONTRAST_I18N, PANEL_I18N, SHARE_I18N, and so
 * on. Most are read as `Object.assign({}, TABLE.en, TABLE[lang])`, so a key a
 * language's row forgets does not throw and does not look wrong in review: the
 * Spanish page simply prints the English label. Nothing else in the gate set
 * reads these tables, so that shipped silently.
 *
 * HOW A TABLE IS FOUND
 * --------------------
 * Swept, not listed. Every `const|let|var NAME = { ... }` literal in a
 * non-test js/printables/*.js file is sliced out by brace matching and
 * evaluated in an empty VM context (the modules are browser IIFEs that touch
 * `document` at boot, so they cannot be required). A literal that evaluates to
 * an object whose own keys include `en` and at least one other engine language
 * code is a translation table. A literal that names a locale key but cannot be
 * evaluated in isolation is returned as `unreadable`, which the gate reports
 * as UNKNOWN rather than skipping.
 *
 * WHAT COUNTS AS A GAP
 * --------------------
 * Key paths are compared depth-first against the `en` row. Strings, arrays and
 * functions are leaves. An object whose keys are all CLDR plural categories
 * (one/few/many/other/...) is a leaf too: each language's plural forms are a
 * complete unit (the engine merges T shallowly for exactly that reason) and
 * Polish legitimately has no `other`.
 *
 * A language with NO row is treated two ways, read from how the module uses
 * the table:
 *   - `fallback` tables (the source reads `NAME.en` outside the literal, i.e.
 *     merges or falls back to English): no row means every label is English,
 *     so every en key is a gap;
 *   - `gated` tables (read as `NAME[lang] || null` and the control is skipped
 *     when there is no row): no row means the control is deliberately not
 *     offered, which is not a gap. A row that exists but lacks a key is.
 *
 * WHERE A LANGUAGE COUNTS
 * -----------------------
 * Only languages whose pages load the module. A page "mounts" a module when its
 * HTML loads `js/printables/<file>`; its language is what the module itself
 * reads (`<html lang>`, first two letters, plus an explicit `lang:` in the
 * page's UTG_PRINTABLE config). Languages come from the locale registry
 * (data/locale_qualification_tiers.json), never from a directory glob; a page
 * whose language the registry does not know is reported, not dropped.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC_DIR = 'js/printables';
const PLURAL_KEYS = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

/** Engine language codes: `en` plus the first two letters of every registry locale. */
function engineLangs(tiersJson) {
  const tiers = tiersJson || JSON.parse(fs.readFileSync(path.join(ROOT, 'data/locale_qualification_tiers.json'), 'utf8'));
  const set = new Set(['en']);
  for (const code of Object.keys(tiers.locales || {})) set.add(code.slice(0, 2).toLowerCase());
  if (set.size < 2) throw new Error('locale registry returned no locales');
  return set;
}

/**
 * Index of the `}` closing the `{` at `open`, skipping strings, template
 * literals and comments. Returns -1 when unbalanced.
 */
function matchBrace(src, open) {
  let depth = 0;
  const tmpl = []; // brace depth at which each open `${` of a template began
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') { i = src.indexOf('\n', i); if (i === -1) return -1; continue; }
    if (c === '/' && n === '*') { i = src.indexOf('*/', i + 2); if (i === -1) return -1; i++; continue; }
    if (c === '"' || c === "'") {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === '`' || (c === '}' && tmpl.length && tmpl[tmpl.length - 1] === depth)) {
      if (c === '}') tmpl.pop();
      for (i++; i < src.length; i++) {
        if (src[i] === '\\') { i++; continue; }
        if (src[i] === '`') break;
        if (src[i] === '$' && src[i + 1] === '{') { tmpl.push(depth); i++; break; }
      }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

const DECL = /(?:^|[\s;(])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g;

/**
 * Every locale-keyed table in one module's source.
 * Returns { tables: [{name, line, value, mode}], unreadable: [{name, line, error}] }.
 */
function tablesInSource(src, langs) {
  const tables = [];
  const unreadable = [];
  DECL.lastIndex = 0;
  let m;
  while ((m = DECL.exec(src))) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(src, open);
    const name = m[1];
    const line = src.slice(0, open).split('\n').length;
    const literal = close === -1 ? null : src.slice(open, close + 1);
    // Cheap pre-filter: a translation table has an `en` key at its top level.
    if (!literal || !/(^|[{,\s])["']?en["']?\s*:/.test(literal)) continue;
    let value;
    try {
      value = new vm.Script('(' + literal + ')', { filename: name }).runInNewContext({});
    } catch (err) {
      unreadable.push({ name, line, error: String(err && err.message || err) });
      continue;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const keys = Object.keys(value);
    if (!keys.includes('en') || !keys.some((k) => k !== 'en' && langs.has(k))) {
      // An en-only table (WORD_CARRY_LABEL, AUDIENCE_SAVED_I18N) is still a
      // table: a language that gains a row must carry every key.
      if (!(keys.length === 1 && keys[0] === 'en' && /I18N|LABEL|STRINGS/.test(name))) continue;
    }
    const rest = src.slice(0, m.index) + src.slice(close + 1);
    const subMerged = new Set();
    const subRe = new RegExp('Object\\.assign\\(\\s*\\{\\s*\\}\\s*,\\s*' + name + '\\.en\\.(\\w+)', 'g');
    let sm;
    while ((sm = subRe.exec(rest))) subMerged.add(sm[1]);
    tables.push({ name, line, value, mode: fallbackMode(name, rest), subMerged, rest });
  }
  return { tables, unreadable };
}

/**
 * How the module reads a missing language. `fallback` when it substitutes the
 * English row (`NAME[lang] || NAME.en`, or `Object.assign({}, NAME.en,
 * NAME[lang] || {})`); otherwise `gated` (the caller skips the control on a
 * language with no row, e.g. `NAME[lang] || null`).
 */
function fallbackMode(name, rest) {
  const n = name.replace(/\$/g, '\\$');
  const patterns = [
    new RegExp('\\b' + n + '\\[[^\\]]+\\]\\s*\\|\\|\\s*' + n + '\\.en\\b'),
    new RegExp('Object\\.assign\\(\\s*\\{\\s*\\}\\s*,\\s*' + n + '\\.en\\b[^;]*?\\b' + n + '\\[')
  ];
  return patterns.some((re) => re.test(rest)) ? 'fallback' : 'gated';
}

/**
 * True when the module reads `.leaf` behind a presence test somewhere
 * (`X.leaf && …`, `X.leaf ? … : …`, `X.leaf || other`, `X.leaf != null`,
 * `if (X.leaf)`): the
 * author wrote that string as optional, and a language without it shows
 * nothing extra rather than English. Matched by the leaf name, so a
 * same-named property elsewhere in the module can make a key look optional;
 * that errs toward reporting a gap as optional, never toward inventing one.
 */
function isGuarded(rest, leaf) {
  const re = new RegExp('\\.' + leaf.replace(/\$/g, '\\$') + '\\b(?!\\s*\\()(?=\\s*(?:&&|\\|\\||\\?(?![.?])|!==?\\s*(?:null|undefined)\\b))');
  const lone = new RegExp('\\bif\\s*\\(\\s*!?[\\w$.]+\\.' + leaf.replace(/\$/g, '\\$') + '\\s*\\)');
  return re.test(rest) || lone.test(rest);
}

/**
 * What a reader of the page sees when `key` is missing for a language:
 *   english   the English string (row missing from a fallback table, or a key
 *             at a level the module merges over English)
 *   undefined nothing defined: the key reads as undefined
 *   optional  undefined, but every caller tests for it first (see isGuarded)
 */
function gapEffect(table, key, row) {
  if (row === undefined) return 'english';
  const parts = key.split('.');
  // depth (1-based) of the first segment the language's row lacks
  let d = 1;
  let cur = row;
  while (d < parts.length && cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, parts[d - 1])) {
    cur = cur[parts[d - 1]];
    d++;
  }
  if (table.mode === 'fallback') {
    // Level 1 is merged over English; so is level 2 of a sub-merged group.
    // A gap first opening at a merged level is filled with the English string.
    if (d === 1) return 'english';
    if (d === 2 && table.subMerged.has(parts[0])) return 'english';
  }
  return isGuarded(table.rest, parts[d - 1]) ? 'optional' : 'undefined';
}

function isPluralForms(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const k = Object.keys(v);
  return k.length > 0 && k.every((x) => PLURAL_KEYS.has(x));
}

/** Leaf key paths of a row, dot-joined. */
function keyPaths(v, prefix, out) {
  out = out || [];
  if (v && typeof v === 'object' && !Array.isArray(v) && !isPluralForms(v)) {
    const ks = Object.keys(v);
    if (!ks.length && prefix) out.push(prefix);
    for (const k of ks) keyPaths(v[k], prefix ? prefix + '.' + k : k, out);
  } else if (prefix) {
    out.push(prefix);
  }
  return out;
}

function has(obj, dotted) {
  let cur = obj;
  for (const part of dotted.split('.')) {
    if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, part)) return false;
    cur = cur[part];
  }
  return true;
}

/**
 * WHERE A KEY IS ACTUALLY ON SCREEN
 * ---------------------------------
 * Loading a module is not the same as mounting every control it can build.
 * The engine builds the word-search UI only on a page carrying the word-search
 * mount, so a language with no such page never shows T.wordSearch, and a gap
 * there is not on any screen. Each entry below narrows a group of keys to the
 * pages that mount it. Keys no entry names count on every page that loads the
 * module, which is the conservative default.
 *
 * Every condition is checked against the module source before it is used: an
 * `el` name must resolve to an id in the engine's own `el` map, and a `src`
 * marker must still be in the module. A condition that no longer resolves is
 * reported UNKNOWN, never silently widened or dropped, so a rename fails
 * closed.
 *
 *   keys     key paths (exact, or a prefix ending in '.') the entry covers
 *   el       engine `el` properties; the page must carry one of their ids
 *   html     a literal the page markup must contain
 *   loads    other modules; the page must load one of them
 *   src      a literal that must exist in the module, proving the condition
 *            still describes how the module decides to mount
 */
const MOUNTS = [
  { file: 'js/printables/printablesEngine.js', table: 'I18N', keys: ['wordSearch.'], el: ['searchInput'] },
  { file: 'js/printables/printablesEngine.js', table: 'I18N', keys: ['crossword.'], el: ['cwInput'] },
  { file: 'js/printables/printablesEngine.js', table: 'I18N', keys: ['scramble.'], el: ['scInput'] },
  { file: 'js/printables/printablesEngine.js', table: 'I18N', keys: ['spelling.'], el: ['spInput'] },
  { file: 'js/printables/printablesEngine.js', table: 'I18N', keys: ['bannerFlagsLabel', 'flagCount'], el: ['bannerInput'] },
  { file: 'js/printables/printablesEngine.js', table: 'I18N', keys: ['usLetter'], el: ['genInput', 'bannerInput'] },
  // The desk plate is offered only where the page carries its chip (presetOffered()).
  { file: 'js/printables/labelEngine.js', table: 'I18N', keys: ['plate', 'plates', 'plateHint', 'plateSmall', 'plateCloseUp', 'platesPerName'],
    html: 'data-value="plate"', src: "[data-value='\" + key + \"']" },
  // The settings panel, share row, saved/recent strips, More section and
  // name/date row are built by the three sheet engines; a page that loads
  // printPrefs.js only for its stored paper (the Japanese sheets) shows none.
  // The print-only note is mounted by the engines that call mountPrintNote().
  { file: 'js/printables/printPrefs.js', table: 'PRINT_NOTE_I18N', keys: null, src: 'function mountPrintNote(',
    loads: ['js/printables/printablesEngine.js', 'js/printables/monogramEngine.js', 'js/printables/crossStitchEngine.js',
      'js/printables/labelEngine.js', 'js/printables/posterTiles.js'] },
  ...['PANEL_I18N', 'SHARE_I18N', 'STRIP_I18N', 'MORE_I18N', 'NAMEDATE_I18N'].map((table) => ({
    file: 'js/printables/printPrefs.js', table, keys: null,
    loads: ['js/printables/printablesEngine.js', 'js/printables/monogramEngine.js', 'js/printables/crossStitchEngine.js']
  }))
];

function keyMatches(entryKeys, key) {
  if (!entryKeys) return true;
  return entryKeys.some((k) => (k.endsWith('.') ? key.startsWith(k) : key === k || key.startsWith(k + '.')));
}

/** Resolve the MOUNTS entries for one module into page predicates. */
function mountRules(file, src) {
  const rules = [];
  const problems = [];
  for (const m of MOUNTS.filter((x) => x.file === file)) {
    const tests = [];
    let ok = true;
    if (m.el) {
      const ids = [];
      for (const prop of m.el) {
        const hit = new RegExp('\\b' + prop + '\\s*:\\s*\\$\\(\\s*["\']#([\\w-]+)["\']\\s*\\)').exec(src);
        if (!hit) { problems.push(`${file}: el.${prop} not found in the el map (mount rule for ${m.table} ${m.keys})`); ok = false; }
        else ids.push(hit[1]);
      }
      const res = ids.map((id) => new RegExp('\\bid\\s*=\\s*["\']' + id + '["\']'));
      tests.push((pg) => res.some((re) => re.test(pg.html)));
    }
    if (m.html) tests.push((pg) => pg.html.includes(m.html));
    if (m.loads) tests.push((pg) => m.loads.some((f) => pg.html.includes(f)));
    if (m.src && !src.includes(m.src)) { problems.push(`${file}: mount marker ${JSON.stringify(m.src)} not found (rule for ${m.table})`); ok = false; }
    if (ok) rules.push({ table: m.table, keys: m.keys, test: (pg) => tests.every((t) => t(pg)) });
  }
  return { rules, problems };
}

/**
 * Gaps in one table. `pages` is [{path, langs:Set, html}] for every page that
 * loads the module; `rules` the resolved mount rules for the module.
 * Each gap: { table, lang, key, kind: 'missing-key' | 'missing-row',
 *   effect: 'english' | 'undefined' | 'optional', pages }.
 */
function tableGaps(table, pages, rules) {
  const gaps = [];
  const enPaths = keyPaths(table.value.en, '');
  const own = (rules || []).filter((r) => r.table === table.name);
  const langs = new Set();
  for (const pg of pages) for (const l of pg.langs) langs.add(l);
  // pages of `lang` on which `key` is mounted
  const mountedOn = (lang, key) => {
    const rule = own.find((r) => keyMatches(r.keys, key));
    return pages.filter((pg) => pg.langs.has(lang) && (!rule || rule.test(pg))).map((pg) => pg.path);
  };
  for (const lang of [...langs].sort()) {
    if (lang === 'en') continue;
    const row = table.value[lang];
    let candidates;
    let kind;
    if (row === undefined) {
      if (table.mode !== 'fallback') continue;
      kind = 'missing-row';
      candidates = enPaths.length ? enPaths : ['(row)'];
    } else {
      if (enPaths.length === 0) continue; // en row is a leaf (string/function): a row exists, done
      kind = 'missing-key';
      candidates = enPaths.filter((key) => !has(row, key));
    }
    for (const key of candidates) {
      const on = mountedOn(lang, key);
      if (on.length) gaps.push({ table: table.name, lang, key, kind, effect: gapEffect(table, key, row), pages: on });
    }
  }
  return gaps;
}

/* ---------------- reading a revision (working tree or a commit) ---------------- */

function git(args, opts) {
  return execFileSync('git', args, Object.assign({ cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }, opts || {}));
}

/** A reader over the working tree (rev === null) or a commit. */
function reader(rev) {
  if (!rev) {
    return {
      list(pathspecs) { return git(['ls-files', '--', ...pathspecs]).split('\n').filter(Boolean); },
      grepFiles(pattern, pathspecs) {
        try { return git(['grep', '-l', '-F', '-e', pattern, '--', ...pathspecs]).split('\n').filter(Boolean); }
        catch (e) { if (e.status === 1) return []; throw e; }
      },
      read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
    };
  }
  return {
    list(pathspecs) { return git(['ls-tree', '-r', '--name-only', rev, '--', ...pathspecs]).split('\n').filter(Boolean); },
    grepFiles(pattern, pathspecs) {
      try {
        return git(['grep', '-l', '-F', '-e', pattern, rev, '--', ...pathspecs]).split('\n').filter(Boolean)
          .map((l) => l.slice(rev.length + 1));
      } catch (e) { if (e.status === 1) return []; throw e; }
    },
    read(p) { return git(['show', rev + ':' + p]); }
  };
}

/** The language(s) a page's modules read. */
function pageLangs(html) {
  const out = new Set();
  const h = /<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i.exec(html);
  out.add(h ? h[1].slice(0, 2).toLowerCase() : 'en');
  const cfg = /UTG_PRINTABLE\s*=\s*\{[\s\S]*?\blang\s*:\s*["']([A-Za-z-]+)["']/.exec(html);
  if (cfg) out.add(cfg[1].slice(0, 2).toLowerCase());
  return out;
}

/**
 * Full measurement of one revision (null = the working tree).
 * Returns { modules, gaps, unreadable, unknownLangs, problems }.
 * `unreadable`, `unknownLangs` and `problems` are rows the caller must treat as
 * UNKNOWN: something this measurement could not answer.
 */
function measure(rev, opts) {
  opts = opts || {};
  const r = reader(rev || null);
  const langs = opts.langs || engineLangs(rev ? JSON.parse(r.read('data/locale_qualification_tiers.json')) : null);
  const files = r.list([SRC_DIR]).filter((f) => /\.js$/.test(f) && !/\.test\.js$/.test(f));
  if (!files.length) throw new Error(`no modules found under ${SRC_DIR}/ at ${rev || 'the working tree'}`);
  const modules = [];
  const gaps = [];
  const unreadable = [];
  const unknownLangs = [];
  const problems = [];
  const htmlCache = new Map();
  const html = (p) => { if (!htmlCache.has(p)) htmlCache.set(p, r.read(p)); return htmlCache.get(p); };
  for (const file of files) {
    const src = r.read(file);
    const { tables, unreadable: bad } = tablesInSource(src, langs);
    for (const b of bad) unreadable.push(Object.assign({ file }, b));
    if (!tables.length) continue;
    const { rules, problems: pr } = mountRules(file, src);
    problems.push(...pr);
    const pagePaths = r.grepFiles(file, ['*.html']).filter((p) => !p.startsWith('node_modules/'));
    const pages = [];
    for (const p of pagePaths) {
      const h = html(p);
      const ls = new Set();
      for (const l of pageLangs(h)) {
        if (langs.has(l)) ls.add(l);
        else unknownLangs.push({ page: p, lang: l, file });
      }
      pages.push({ path: p, langs: ls, html: h });
    }
    for (const t of tables) {
      for (const g of tableGaps(t, pages, rules)) gaps.push(Object.assign({ file }, g));
    }
    const mounted = new Set();
    for (const pg of pages) for (const l of pg.langs) mounted.add(l);
    modules.push({ file, tables, mounted, pages: pages.length });
  }
  return { modules, gaps, unreadable, unknownLangs, problems };
}

const gapId = (g) => `${g.file}|${g.table}|${g.lang}|${g.key}`;

module.exports = {
  engineLangs, matchBrace, tablesInSource, keyPaths, isPluralForms, tableGaps, fallbackMode, isGuarded, gapEffect,
  mountRules, keyMatches, MOUNTS,
  pageLangs, measure, gapId, reader, SRC_DIR
};
