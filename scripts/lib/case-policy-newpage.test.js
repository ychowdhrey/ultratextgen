#!/usr/bin/env node
/* case-policy-newpage.test.js — a case-converter page that does not exist yet
   gets its language's case rules without anyone remembering a flag.

   It builds a new page through the real generator
   (scripts/build_category_locale_pages.py `build()`), with the batch's family
   set to "case-converter" and a language no case page has today (nl), then:
   1. the generated <html> carries data-case-policy="locale";
   2. the gate's rule for a page added since the merge base passes it, and
      fails the same page with the attribute stripped (the hand-built case);
   3. the renderer, given that page's lang and attribute, applies Dutch rules
      ("ijs en ijsland" -> "IJs en IJsland") where the old code gave "Ijs En Ijsland";
   4. a generated page in a language with no verified policy is failed by the
      gate until someone decides (adds a policy or declares "legacy").
   Run: node scripts/lib/case-policy-newpage.test.js */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const { readPolicyAttr, readLang, evaluatePage } = require('./case-policy-pages');
const { loadRenderer } = require('./case-policy-harness');

const ROOT = path.resolve(__dirname, '..', '..');
const PY = `
import importlib.util, sys, json
spec = importlib.util.spec_from_file_location('gen', 'scripts/build_category_locale_pages.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
lang = sys.argv[1]
batch = dict(m.BATCHES['underline']); batch['family'] = 'case-converter'
specs = {k: dict(v) for k, v in m.SPECS.items()}
code = 'nl' if 'nl' in specs else list(specs)[0]
s = specs[code]; s['lang'] = lang
s['related_h2'], s['faq_h2'] = m.SECTION_HEADS[code]
sys.stdout.write(m.build(code, s, list(specs), batch, specs))
`;
function generate(lang) {
  return execFileSync('python3', ['-c', PY, lang], { cwd: ROOT, encoding: 'utf8' });
}

let fail = 0;
const check = (name, ok, detail) => { if (!ok) { fail++; console.error(`FAIL ${name}${detail ? ' — ' + detail : ''}`); } else console.log(`ok   ${name}`); };

const r = loadRenderer();
const verified = new Set(r.api.casePolicyLanguages);
const isVerified = l => verified.has(l.toLowerCase()) || verified.has(l.toLowerCase().split('-')[0]);

const html = generate('nl');
const page = { file: 'nl/hoofdletters/index.html', lang: readLang(html), policy: readPolicyAttr(html) };
check('generated page carries data-case-policy="locale"', page.policy === 'locale', String(page.policy));
check('generated page declares lang="nl"', page.lang === 'nl', page.lang);
check('gate passes the generated page as new', evaluatePage(page, true, isVerified).errors.length === 0,
  evaluatePage(page, true, isVerified).errors.join('; '));
const handBuilt = { ...page, policy: null };
check('gate fails the same page built by hand without the attribute', evaluatePage(handBuilt, true, isVerified).errors.length === 1);
check('renderer applies Dutch rules on that page',
  r.render('ijs en ijsland', 'Title Case', page.lang, page.policy) === 'IJs en IJsland',
  r.render('ijs en ijsland', 'Title Case', page.lang, page.policy));
check('the old behaviour on the same input is what was wrong',
  r.render('ijs en ijsland', 'Title Case', page.lang, null) === 'Ijs En Ijsland');

const unverified = generate('ms');
const msPage = { file: 'ms/x/index.html', lang: readLang(unverified), policy: readPolicyAttr(unverified) };
check('gate fails a new page in an unverified language until decided',
  evaluatePage(msPage, true, isVerified).errors.length === 1 &&
  evaluatePage({ ...msPage, policy: 'legacy' }, true, isVerified).errors.length === 0);
check('gate fails a new verified-language page declaring legacy',
  evaluatePage({ ...page, policy: 'legacy' }, true, isVerified).errors.length === 1);

console.log(fail ? `case-policy-newpage: ${fail} failed` : 'case-policy-newpage: all passed');
process.exit(fail ? 1 : 0);
