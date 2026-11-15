#!/usr/bin/env node
'use strict';

/**
 * parity-exceptions.test.js — the exceptions policy for NEW entries
 * (validateProposedEntry, 2026-11-15). Run: npm run test:parity-exception-policy
 */

const assert = require('assert');
const { validateProposedEntry } = require('./parity-exceptions');

let passes = 0;
let failures = 0;
function test(name, fn) {
  try {
    fn();
    passes++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name}\n       ${String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join('\n       ')}`);
  }
}

const GOOD = {
  enUrl: 'https://ultratextgen.com/usecase/nickname-generator/',
  localeUrl: 'https://ultratextgen.com/ko/usecase/ireum-kkumigi/',
  reason: 'The Korean page adds native nickname ideas because the Korean job is finding a name, not styling one.',
  agreed: '2026-11-15',
  canonicalIntentId: 'legacy:usecase/nickname-generator',
  difference: 'ko adds one h2 section and two FAQ items of Hangul nickname ideas.',
  evidence: ['Semrush KR 2026-10-04: 닉네임 생성기 4,400; 한글 닉네임 추천 1,000'],
  userImpact: 'Korean readers get ready-made names; English readers lose nothing.',
  alternativesConsidered: 'Porting Hangul names to EN (no English use) or a separate ko URL (would split the job).',
  decision: { by: 'owner', date: '2026-10-04', ref: 'owner chat 2026-10-04' },
  reviewDate: '2026-12-04',
};
const codes = (e) => validateProposedEntry(e).map((p) => p.code);

test('a fully evidenced, owner-decided entry with a review date is accepted', () => {
  assert.deepStrictEqual(validateProposedEntry(GOOD), []);
});
test('an exception proposed without evidence is rejected', () => {
  assert.ok(codes(Object.assign({}, GOOD, { evidence: [] })).includes('no-evidence'));
});
test('an exception with no owner decision or review date is rejected', () => {
  const c = codes(Object.assign({}, GOOD, { decision: undefined, reviewDate: undefined }));
  assert.ok(c.includes('no-decision') && c.includes('no-review-date'), c.join(','));
});
for (const [label, reason] of [
  ['missing keyword volume', 'The Korean page skips the section: no keyword volume was measured for it.'],
  ['low demand', 'Korea has low search demand for this section so we leave it out.'],
  ['no English parent', 'The Japanese page diverges because there is no English parent for it.'],
  ['a validator failing', 'Recorded because the parity check fails on the new section.'],
  ['inconvenient translation', 'Translating the table is too much work for this locale.'],
]) {
  test(`prohibited ground refused: ${label}`, () => {
    assert.ok(codes(Object.assign({}, GOOD, { reason })).includes('prohibited-ground'));
  });
}
test('a review date on or before the agreement is refused', () => {
  assert.ok(codes(Object.assign({}, GOOD, { reviewDate: '2026-11-15' })).includes('no-review-date'));
});

console.log('');
console.log(`${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
