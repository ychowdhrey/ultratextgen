#!/usr/bin/env node
'use strict';
/**
 * check-event-capabilities.js — the occasion capability matrix and the event
 * pages must agree.
 *
 * Every /events/ page declares, in data/event_page_specs/<occasion>.json
 * (`experience.capabilities`), each capability in data/event_capabilities.json
 * as enabled or disabled-with-a-reason. The generator renders a section only
 * for an enabled capability. This gate fails when:
 *
 *   config     a capability is undeclared or unknown; a disabled one has no
 *              reason; a section is unknown or belongs to a disabled capability
 *   data       an enabled capability has nothing to render (no styles, no
 *              theme, no native phrase, no companion page, ...), or a disabled
 *              one still carries data that would render (a hand-off of a
 *              disabled kind, a second input with multi_input off)
 *   targets    a hand-off names a target the registry does not define, a page
 *              that does not exist, a parameter the target does not read, more
 *              words than the maker takes, or fixed text over its length cap
 *   styles     a curated style is missing, or renders the same letters as
 *              another on the page for a Latin name (D-5)
 *   joiner     a couple composition repeats the joiner three times in a row
 *   page       the built page lacks the section an enabled capability renders,
 *              shows one a disabled capability would, has no static payload,
 *              or keeps its FAQ inside <footer>
 *   matrix     docs/events-capability-matrix.md is not what the specs generate
 *
 * Whole-tree on purpose: the matrix and the pages drift when a spec, the
 * registry or the generator changes, and those are rarely the same file.
 *
 *   node scripts/check-event-capabilities.js            # check
 *   node scripts/check-event-capabilities.js --write    # regenerate the matrix doc
 *
 * Exit: 0 clean · 1 problems · 3 UNKNOWN (registry or specs unreadable).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REGISTRY = path.join(ROOT, 'data', 'event_capabilities.json');
const SPEC_DIR = path.join(ROOT, 'data', 'event_page_specs');
const MATRIX = path.join(ROOT, 'docs', 'events-capability-matrix.md');
const WRITE = process.argv.includes('--write');

let registry;
let specs;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  specs = fs.readdirSync(SPEC_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()
    .map((f) => ({ stem: f.replace(/\.json$/, ''), spec: JSON.parse(fs.readFileSync(path.join(SPEC_DIR, f), 'utf8')) }));
} catch (e) {
  console.error('UNKNOWN: could not read the capability registry or the event specs: ' + e.message);
  process.exit(3);
}
if (!specs.length) {
  console.error('UNKNOWN: no event specs found; nothing was compared.');
  process.exit(3);
}

const { loadContext } = require('./lib/event-prerender');

const CAP_IDS = registry.capabilities.map((c) => c.id);
const SECTION_CAP = registry.section_capability;
const TARGETS = registry.handoff_targets;
const KIND_CAP = registry.handoff_kinds;
const PRINTABLE = new Set(registry.printable_kinds);
const RECIPES = new Set(['classic', 'stacked', 'layered', 'banner', 'interleave']);

const problems = [];
function bad(stem, kind, msg) { problems.push(`${stem}: [${kind}] ${msg}`); }

function on(spec, cid) {
  const v = ((spec.experience || {}).capabilities || {})[cid];
  return v === true || (!!v && v.enabled === true);
}

function pagePath(spec) {
  const lang = spec.language || 'en';
  return lang === 'en' ? `/events/${spec.slug}/` : `/${lang}/events/${spec.slug}/`;
}

function exists(urlPath) {
  const clean = urlPath.split(/[?#]/)[0];
  const file = path.join(ROOT, clean, clean.endsWith('/') ? 'index.html' : '');
  return fs.existsSync(file);
}

const stems = new Set(specs.map((s) => s.stem));
const ctx = loadContext([]);

for (const { stem, spec } of specs) {
  const exp = spec.experience;
  if (!exp) { bad(stem, 'config', 'no experience block'); continue; }
  const caps = exp.capabilities || {};

  // config
  for (const cid of CAP_IDS) {
    const v = caps[cid];
    if (v === undefined) bad(stem, 'config', `capability ${cid} is not declared`);
    else if (v !== true && !(v && v.enabled === false && typeof v.reason === 'string' && v.reason.trim())) {
      bad(stem, 'config', `capability ${cid} must be true or {enabled:false, reason}`);
    }
  }
  for (const cid of Object.keys(caps)) if (!CAP_IDS.includes(cid)) bad(stem, 'config', `unknown capability ${cid}`);
  for (const sec of exp.sections || []) {
    if (!(sec in SECTION_CAP)) bad(stem, 'config', `unknown section ${sec}`);
    else if (SECTION_CAP[sec] && !on(spec, SECTION_CAP[sec])) bad(stem, 'config', `section ${sec} is listed but ${SECTION_CAP[sec]} is disabled`);
  }
  for (const [sec, cid] of Object.entries(SECTION_CAP)) {
    if (cid && on(spec, cid) && !(exp.sections || []).includes(sec)) bad(stem, 'config', `${cid} is enabled but section ${sec} is not in the order`);
  }
  for (const key of ['primary_job', 'category', 'analytics_label', 'sample_text', 'model']) {
    if (!exp[key]) bad(stem, 'config', `experience.${key} is missing`);
  }

  // data: enabled capabilities have something to render
  const fonts = (spec.fonts && spec.fonts.curated_keys) || [];
  if (on(spec, 'styled_fonts') && !fonts.length) bad(stem, 'data', 'styled_fonts enabled with no curated styles');
  const comp = exp.compositions;
  if (on(spec, 'compositions')) {
    if (!comp || !comp.theme || !Array.isArray(comp.cards) || !comp.cards.length) bad(stem, 'data', 'compositions enabled with no theme or cards');
    else {
      for (const k of ['key', 'pairs', 'charms', 'sprinkles', 'lines']) if (!comp.theme[k] || (Array.isArray(comp.theme[k]) && !comp.theme[k].length)) bad(stem, 'data', `composition theme lacks ${k}`);
      for (const card of comp.cards) {
        if (!RECIPES.has(card.recipe)) bad(stem, 'data', `card ${card.id} names unknown recipe ${card.recipe}`);
        if (card.style && !ctx.styles[card.style]) bad(stem, 'data', `card ${card.id} names unknown style ${card.style}`);
        if (!card.label) bad(stem, 'data', `card ${card.id} has no label`);
      }
    }
  } else if (comp) bad(stem, 'data', 'compositions disabled but experience.compositions is set');
  if (on(spec, 'multi_input') !== !!(comp && comp.couple && (exp.inputs || []).includes('partner'))) {
    bad(stem, 'data', 'multi_input must match compositions.couple plus a "partner" input');
  }
  if (comp && on(spec, 'intensity') !== !!(comp.intensity && comp.intensity.control)) {
    bad(stem, 'data', 'intensity capability must match compositions.intensity.control');
  }
  const natives = (spec.phrase_bank || []).filter((p) => p.native_script);
  if (on(spec, 'native_greetings') && (!spec.native_script_language || !natives.length)) bad(stem, 'data', 'native_greetings enabled without native_script_language and native phrases');
  if (!on(spec, 'native_greetings') && spec.native_script_language && natives.length) bad(stem, 'data', 'native phrases present but native_greetings disabled');
  if (on(spec, 'seed_phrases') && !(spec.phrase_bank || []).length) bad(stem, 'data', 'seed_phrases enabled with an empty phrase bank');
  if (on(spec, 'related_answers')) {
    const lang = spec.language || 'en';
    const href = `${lang === 'en' ? '' : '/' + lang}/answers/${spec.companion_answer_slug}/`;
    if (!spec.companion_answer_slug || !exists(href)) bad(stem, 'data', `related_answers enabled but ${href} does not exist`);
  }
  if (on(spec, 'related_library') && !(spec.related || []).some((r) => /\/library\/|\/simbolos/.test(r.href))) bad(stem, 'data', 'related_library enabled with no library link');
  for (const r of spec.related || []) if (!exists(r.href)) bad(stem, 'data', `related link ${r.href} does not exist`);
  if (on(spec, 'occasion_navigation')) {
    if (!(exp.related_occasions || []).length) bad(stem, 'data', 'occasion_navigation enabled with no related_occasions');
    for (const o of exp.related_occasions || []) if (!stems.has(o)) bad(stem, 'data', `related occasion ${o} has no spec`);
  }
  if (on(spec, 'seo_ownership') && !((exp.seo || {}).owns || []).length) bad(stem, 'data', 'seo_ownership enabled with no owned queries');

  // targets
  const kindsUsed = new Set();
  for (const h of exp.handoffs || []) {
    const t = TARGETS[h.target];
    if (!t) { bad(stem, 'targets', `hand-off ${h.id} names unknown target ${h.target}`); continue; }
    kindsUsed.add(t.kind);
    if (!exists(t.path)) bad(stem, 'targets', `hand-off ${h.id}: ${t.path} does not exist`);
    for (const k of Object.keys(h.params || {})) if (!(t.fixed_params || []).includes(k)) bad(stem, 'targets', `hand-off ${h.id}: ${t.path} does not read ?${k}=`);
    if (h.text === 'input' && !t.text_param) bad(stem, 'targets', `hand-off ${h.id}: ${t.path} takes no text, so the typed text would be dropped`);
    const words = (h.params || {}).words;
    if (words && t.max_items && words.length > t.max_items) bad(stem, 'targets', `hand-off ${h.id}: ${words.length} words, the maker takes ${t.max_items}`);
    if (h.fixed_text && t.max_len && Array.from(h.fixed_text).length > t.max_len) bad(stem, 'targets', `hand-off ${h.id}: fixed text over ${t.max_len} characters`);
    if (!h.title || !h.desc) bad(stem, 'targets', `hand-off ${h.id} lacks a title or description`);
    if (!on(spec, KIND_CAP[t.kind])) bad(stem, 'targets', `hand-off ${h.id} is a ${t.kind} hand-off but ${KIND_CAP[t.kind]} is disabled`);
  }
  for (const [kind, cid] of Object.entries(KIND_CAP)) {
    if (kind === 'printable') continue;
    if (on(spec, cid) && ![...kindsUsed].some((k) => KIND_CAP[k] === cid)) bad(stem, 'targets', `${cid} is enabled but no hand-off of that kind exists`);
  }
  if (on(spec, 'printable_handoffs') !== [...kindsUsed].some((k) => PRINTABLE.has(k))) bad(stem, 'targets', 'printable_handoffs must match whether a printable hand-off exists');

  // styles: distinct on a Latin name
  const seen = new Map();
  for (const key of fonts) {
    const style = ctx.styles[key];
    if (!style) { bad(stem, 'styles', `curated style ${key} is not in styles.js`); continue; }
    const out = ctx.render.renderAny('Maya', style);
    if (seen.has(out)) bad(stem, 'styles', `${key} renders "Maya" exactly like ${seen.get(out)}`);
    else seen.set(out, key);
  }

  // joiner: a couple line never triples its joiner
  if (comp && comp.couple && on(spec, 'compositions')) {
    const cctx = loadContext([comp.theme]);
    const deps = { renderAny: cctx.render.renderAny, styles: cctx.styles, engine: cctx.engine };
    const j = comp.couple.joiner;
    const triple = new RegExp('(' + j.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*){3}', 'u');
    const doubled = new RegExp(j.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+' + j.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u');
    for (let level = 1; level <= 3; level++) {
      for (let seed = 1; seed <= 12; seed++) {
        for (const [a, b] of [['Maya', 'Sam'], ['Maya ' + j, 'Sam'], ['Maya', j + ' Sam']]) {
          for (const card of cctx.compose.compose(comp, a, b, level, seed, deps)) {
            if (triple.test(card.text) || doubled.test(card.text)) {
              bad(stem, 'joiner', `"${card.text}" from "${a}" + "${b}" (${card.recipe}, intensity ${level}, seed ${seed})`);
            }
          }
        }
      }
    }
  }

  // page: the built page reflects the capabilities
  const file = path.join(ROOT, pagePath(spec), 'index.html');
  if (!fs.existsSync(file)) { bad(stem, 'page', `${pagePath(spec)} does not exist`); continue; }
  const html = fs.readFileSync(file, 'utf8');
  const SECTION_ID = { compositions: 'eventCompSection', native: 'eventNativeSection', fonts: 'eventFontsSection',
    phrases: 'eventPhraseSection', handoffs: 'eventHandoffSection', symbols: 'eventEmojiSection',
    kaomoji: 'eventKaomojiSection', ascii: 'eventAsciiSection' };
  for (const [sec, id] of Object.entries(SECTION_ID)) {
    const cid = SECTION_CAP[sec];
    const want = sec === 'handoffs' ? (exp.handoffs || []).length > 0 : on(spec, cid);
    const has = html.includes(`id="${id}"`);
    if (want && !has) bad(stem, 'page', `${sec} is enabled but the page has no #${id} (regenerate the page)`);
    if (!want && has) bad(stem, 'page', `${sec} is disabled but the page still renders #${id}`);
  }
  if (!html.includes('<!-- BEGIN prerendered event payload')) bad(stem, 'page', 'no static payload block (the payload exists only in JavaScript)');
  if (/<footer[^>]*>[\s\S]*class="faq-item"/.test(html)) bad(stem, 'page', 'FAQ sits inside <footer>, not <main>');
  if (!html.includes('/js/events/eventCompose.js')) bad(stem, 'page', 'page does not load js/events/eventCompose.js');
}

/* ---- the generated matrix ---- */
function cell(spec, cid) {
  return on(spec, cid) ? '●' : '·';
}
function matrix() {
  const lines = [];
  lines.push('# Events capability matrix');
  lines.push('');
  lines.push('<!-- Generated by scripts/check-event-capabilities.js --write from data/event_capabilities.json and data/event_page_specs/*.json. Do not edit by hand. -->');
  lines.push('');
  lines.push('Which occasion capabilities each event page uses. `●` enabled, `·` disabled (each disabled capability carries its reason in the spec). The specs are the source of record; this table is regenerated from them and `npm run check:event-capabilities` fails when it drifts.');
  lines.push('');
  lines.push('| # | Capability | Rendered by |');
  lines.push('|---|---|---|');
  registry.capabilities.forEach((c, i) => lines.push(`| ${i + 1} | ${c.label} | ${c.implementation} |`));
  lines.push('');
  lines.push('| Page | Model | Category | ' + CAP_IDS.map((_, i) => String(i + 1)).join(' | ') + ' |');
  lines.push('|---|---|---|' + CAP_IDS.map(() => '---').join('|') + '|');
  for (const { spec } of specs) {
    const exp = spec.experience || {};
    lines.push(`| \`${pagePath(spec)}\` | ${exp.model || ''} | ${exp.category || ''} | ` + CAP_IDS.map((c) => cell(spec, c)).join(' | ') + ' |');
  }
  lines.push('');
  lines.push('## Primary job, section order and hand-offs');
  lines.push('');
  lines.push('| Page | Primary job | Sections, in order | Hand-offs |');
  lines.push('|---|---|---|---|');
  for (const { spec } of specs) {
    const exp = spec.experience || {};
    const hos = (exp.handoffs || []).map((h) => `${h.id} → \`${(TARGETS[h.target] || {}).path || '?'}\``).join('<br>') || 'none';
    lines.push(`| \`${pagePath(spec)}\` | ${(exp.primary_job || '').replace(/\|/g, '/')} | ${(exp.sections || []).join(' → ')} | ${hos} |`);
  }
  lines.push('');
  return lines.join('\n');
}

const generated = matrix();
if (WRITE) {
  fs.writeFileSync(MATRIX, generated);
  console.log(`Wrote ${path.relative(ROOT, MATRIX)}`);
} else {
  const current = fs.existsSync(MATRIX) ? fs.readFileSync(MATRIX, 'utf8') : null;
  if (current !== generated) problems.push(`docs/events-capability-matrix.md: [matrix] ${current === null ? 'missing' : 'out of date'}; run node scripts/check-event-capabilities.js --write`);
}

if (problems.length) {
  console.log(`check-event-capabilities: ${problems.length} problem(s) across ${specs.length} event pages`);
  problems.forEach((p) => console.log('  ' + p));
  process.exit(1);
}
console.log(`check-event-capabilities: ${specs.length} event pages, ${CAP_IDS.length} capabilities each, all consistent.`);
process.exit(0);
