'use strict';

/**
 * functional-fingerprint.js
 *
 * What a page lets a visitor DO, as a language-independent set of capability
 * keys. Shared by audit-functional-parity.js (whole-site dashboard) and
 * check-functional-parity.js (diff-scoped gate) so the two can never disagree
 * about what "the sibling lacks a capability" means. Added 2026-11-15; model and
 * measurements: docs/architecture/translation-parity.md §12.
 *
 * WHY A SEPARATE AXIS
 * -------------------
 * content-fingerprint.js measures structure (links, h2, FAQ, tiles, tables). A
 * page can match its sibling on every one of those and still be missing the tool
 * the sibling runs: the English nickname page loads decorators.js, tag-studio.js
 * and decorations-showcase.js; its Korean sibling loads flair-engine.js instead.
 * Both carry one textarea and comparable sections, so the structural gate reads
 * them as in sync. "Does the translated page do the same job" is a different
 * question, and it is answered by what the page loads and mounts, not by what it
 * says.
 *
 * CAPABILITY KEYS (all language-independent by construction)
 *   script:<path>   a first-party script the page loads (root-relative, no query).
 *                   Page chrome and localisation plumbing are excluded (CHROME).
 *   flag:<NAME>     an opt-in surface switched on with `window.UTG_<NAME> = …`.
 *   attr:<name>     an opt-in data attribute (OPT_IN_ATTRS) on <html> or a section.
 *   control:<tag>#<id>  a form control a tool mounts on (input/textarea/select
 *                   with an id). Ids are code, not copy: locales keep them.
 *   copy-tiles      the page offers one-click copy tiles.
 *
 * What it is NOT: a judgement that a missing key is wrong. A locale may carry a
 * justified local addition (the Korean romanizer), and a reference page may load
 * a module its sibling replaced with an equivalent. Missing keys are reported;
 * the gate fails only on a divergence a change INTRODUCES (delta, never state),
 * because the site already carries functional parity debt.
 */

// Page chrome and localisation plumbing: present or absent for reasons that are
// not the page's job. header/footer are the frame; i18n.js only exists on
// locale pages (it is how a locale page localises the shared tool, not a tool).
const CHROME = new Set(['/header.js', '/footer.js', '/i18n.js']);

// Opt-in attributes documented in .claude/rules/frontend-javascript.md.
const OPT_IN_ATTRS = ['data-case-policy', 'data-cascade', 'data-extreme', 'data-skin-tone'];

const SCRIPT_SRC_RE = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
const FLAG_RE = /window\.UTG_([A-Z0-9_]+)\s*=(?!=)/g;
const CONTROL_RE = /<(input|textarea|select)\b([^>]*)>/gi;
const ID_RE = /\bid\s*=\s*["']([^"']+)["']/i;
const TYPE_RE = /\btype\s*=\s*["']([^"']+)["']/i;
const TILE_RE = /class\s*=\s*["'][^"']*\bsymbol-tile\b/i;

/** "/js/x.js?v=3", "../../js/x.js", "./x.js" -> "/js/x.js" (null for external). */
function normalizeScriptSrc(src) {
  const s = String(src || '').trim();
  if (!s || /^(https?:)?\/\//i.test(s) || /^data:/i.test(s)) return null;
  let p = s.split('#')[0].split('?')[0];
  p = p.replace(/^(\.\.\/)+/, '/').replace(/^\.\//, '/');
  if (!p.startsWith('/')) p = '/' + p;
  return p.replace(/\/{2,}/g, '/');
}

/**
 * @param {string} html
 * @returns {{capabilities: string[]}} sorted, de-duplicated capability keys
 */
function functionalFingerprint(html) {
  const text = String(html || '');
  const caps = new Set();
  let m;
  SCRIPT_SRC_RE.lastIndex = 0;
  while ((m = SCRIPT_SRC_RE.exec(text))) {
    const p = normalizeScriptSrc(m[1]);
    if (p && !CHROME.has(p)) caps.add(`script:${p}`);
  }
  FLAG_RE.lastIndex = 0;
  while ((m = FLAG_RE.exec(text))) caps.add(`flag:${m[1]}`);
  for (const a of OPT_IN_ATTRS) {
    const re = new RegExp(`<(?:html|section|div|main)\\b[^>]*\\s${a}(?:\\s*=|[\\s>/])`, 'i');
    if (re.test(text)) caps.add(`attr:${a}`);
  }
  CONTROL_RE.lastIndex = 0;
  while ((m = CONTROL_RE.exec(text))) {
    const id = ID_RE.exec(m[2]);
    if (!id) continue;
    const type = TYPE_RE.exec(m[2]);
    // Hidden inputs carry state, not an action a visitor takes.
    if (type && /^hidden$/i.test(type[1])) continue;
    caps.add(`control:${m[1].toLowerCase()}#${id[1]}`);
  }
  if (TILE_RE.test(text)) caps.add('copy-tiles');
  return { capabilities: [...caps].sort() };
}

/**
 * @param {{capabilities: string[]}} ref - the cluster's reference page
 * @param {{capabilities: string[]}} fp  - a sibling
 * @returns {{missing: string[], added: string[]}} missing = the sibling lacks a
 *   capability the reference has; added = a local addition the reference lacks.
 */
function diffFunctional(ref, fp) {
  const a = new Set(ref.capabilities);
  const b = new Set(fp.capabilities);
  return {
    missing: [...a].filter((k) => !b.has(k)).sort(),
    added: [...b].filter((k) => !a.has(k)).sort(),
  };
}

/**
 * Is a missing capability excused by a parity-exceptions entry for this pair?
 * A blanket entry (no `suppress`) excuses the pair, as it does for structure.
 * A scoped entry excuses functional divergence only through
 * `suppress.functional`: `true` (any capability) or a list of capability keys.
 * Nothing here writes or creates an entry.
 */
function functionalSuppressed(ex, cap) {
  if (!ex) return false;
  if (!ex.suppress) return true;
  const f = ex.suppress.functional;
  if (f === true) return true;
  return Array.isArray(f) && f.includes(cap);
}

/**
 * Every (member, missing capability) pair in one cluster, against its reference.
 * @param {string} refUrl
 * @param {Map<string,{capabilities:string[]}>} fps - url -> fingerprint
 * @param {Function} [findException] - (refUrl, memberUrl) -> entry|null
 * @returns {Set<string>} keys "<memberUrl>\t<capability>" (excused pairs omitted)
 */
function missingSet(refUrl, fps, findException) {
  const out = new Set();
  const ref = fps.get(refUrl);
  if (!ref) return out;
  for (const [url, fp] of fps) {
    if (url === refUrl) continue;
    const ex = findException ? findException(refUrl, url) : null;
    for (const cap of diffFunctional(ref, fp).missing) {
      if (functionalSuppressed(ex, cap)) continue;
      out.add(`${url}\t${cap}`);
    }
  }
  return out;
}

module.exports = {
  CHROME,
  OPT_IN_ATTRS,
  normalizeScriptSrc,
  functionalFingerprint,
  diffFunctional,
  functionalSuppressed,
  missingSet,
};
