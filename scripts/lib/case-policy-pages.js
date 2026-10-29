/* case-policy-pages.js — which pages expose the case-converter cards, and what
   case policy each one declares. One definition, shared by the gate
   (check-case-policy.js), the inventory (--inventory) and the browser check. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const FAMILY_RE = /window\.UTG_FAMILY\s*=\s*["']case-converter["']/;

// Values a page may declare. "locale" turns the policy on (renderer.js
// casePolicy()); "legacy" is an explicit, reviewed decision to keep the old
// English-list behaviour for a language with no verified policy.
const POLICY_VALUES = ['locale', 'legacy'];

function readPolicyAttr(html) {
  const tag = (html.match(/<html\b[^>]*>/i) || [''])[0];
  const m = tag.match(/\sdata-case-policy="([^"]*)"/);
  return m ? m[1] : null;
}

function readLang(html) {
  const tag = (html.match(/<html\b[^>]*>/i) || [''])[0];
  const m = tag.match(/\slang="([^"]*)"/);
  return m ? m[1] : '';
}

function trackedHtml() {
  return execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
}

// Every tracked page whose generator is scoped to the case-converter family.
function listCaseConverterPages(files) {
  const out = [];
  for (const rel of files || trackedHtml()) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const html = fs.readFileSync(abs, 'utf8');
    if (!FAMILY_RE.test(html)) continue;
    out.push({ file: rel, dir: path.dirname(rel), lang: readLang(html), policy: readPolicyAttr(html) });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

// The gate's rule for one case-converter page. `isNew`: added since the merge
// base. `isVerified(lang)`: renderer.js has a policy for that language.
function evaluatePage(p, isNew, isVerified) {
  const errors = [];
  const notes = [];
  if (p.policy !== null && !POLICY_VALUES.includes(p.policy)) {
    errors.push(`${p.file}: data-case-policy="${p.policy}" is not one of ${POLICY_VALUES.join(', ')}`);
  } else if (p.policy === 'locale' && !isVerified(p.lang)) {
    errors.push(`${p.file}: data-case-policy="locale" but lang="${p.lang}" has no verified policy in renderer.js CASE_POLICIES. ` +
      'Add the language with the rule it comes from, or declare "legacy" and record why.');
  }
  if (isNew) {
    if (p.policy === null) {
      errors.push(`${p.file}: new case-converter page without data-case-policy. ` +
        (isVerified(p.lang) ? 'Add data-case-policy="locale" to its <html> tag (scripts/build_category_locale_pages.py does this for you).'
          : `lang="${p.lang}" has no verified policy: add one to renderer.js, or declare data-case-policy="legacy" and record the decision.`));
    } else if (p.policy === 'legacy' && isVerified(p.lang)) {
      errors.push(`${p.file}: new page declares "legacy" but lang="${p.lang}" has a verified policy; use "locale".`);
    }
  } else if (p.policy === null) {
    notes.push(`${p.file} (lang=${p.lang}) runs the legacy rules (no data-case-policy)`);
  }
  return { errors, notes };
}

module.exports = { ROOT, FAMILY_RE, POLICY_VALUES, readPolicyAttr, readLang, listCaseConverterPages, trackedHtml, evaluatePage };
