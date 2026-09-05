/* ==========================================================
   zalgo-text.test.js
   Assertions for the pure half of the zalgo generator, loaded out of the
   shipped widget by scripts/lib/zalgo-engine.js: the cascade generator
   (issue #864), the unzalgo decoder, and the guarantees the two make to each
   other and to the classic engine.

   No DOM, no dependencies, no runner:
       node usecase/zalgo-text/zalgo-text.test.js
   Exits non-zero if any assertion fails, and prints every assertion.

   Why this page has tests when most do not: the decoder is a Check surface.
   It promises that "Decode Zalgo" recovers the text, and the cascade adds a
   second promise on top: ordinary Thai (a single tone mark on a consonant)
   comes back untouched while a generated stack (the same mark repeated) is
   removed. Both are numerical facts about codepoints that a visual check
   cannot see, which is the same reason js/counter/ has tests.
   ========================================================== */
'use strict';
const { loadZalgoEngine } = require('../../scripts/lib/zalgo-engine.js');
const E = loadZalgoEngine();

let fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + '  got=' + JSON.stringify(got) + (ok ? '' : ' want=' + JSON.stringify(want)));
};

const KO_KAI = 'ก';
const MAI_THO = '้';
const THAI_TONE = /[่-๋]/;

// --- engine surface ---
t('engine exports every binding the gate and the UI rely on',
  ['generateZalgo', 'generateCascade', 'decodeZalgo', 'CASCADE_MARKS', 'CASCADE_ANCHOR', 'CASCADE_DEPTH'].every(k => k in E), true);
t('cascade marks are the four Thai tone marks, Mai Tho first among defaults',
  E.CASCADE_MARKS.map(m => m.char.codePointAt(0).toString(16).toUpperCase()), ['E48', 'E49', 'E4A', 'E4B']);
t('default mark is Mai Tho (the mark in the known example)', E.CASCADE_DEFAULT_MARK, 'mai-tho');
t('carrier is KO KAI', E.CASCADE_ANCHOR, KO_KAI);
t('depth range is 10..150, default 80', [E.CASCADE_DEPTH.min, E.CASCADE_DEPTH.max, E.CASCADE_DEPTH.default], [10, 150, 80]);

// --- criterion 3: classic zalgo is untouched by the cascade ---
const classicPool = [].concat(E.MARKS_UP, E.MARKS_MID, E.MARKS_DOWN,
  ...Object.values(E.CHAR_TYPE_MAP).map(p => [].concat(p.up, p.mid, p.down)));
t('no Thai tone mark is reachable from any classic pool', classicPool.some(ch => THAI_TONE.test(ch)), false);
t('classic pools are the U+0300 block only', classicPool.every(ch => ch.codePointAt(0) >= 0x300 && ch.codePointAt(0) <= 0x36F), true);
{
  const out = E.generateZalgo('hello world', { charType: 'all', position: 'all', shape: 'uniform', frequency: 1, amplitude: 20 });
  t('classic amplitude 20 never emits a Thai mark', THAI_TONE.test(out), false);
  t('classic output still decodes to its input', E.decodeZalgo(out), 'hello world');
}

// --- default cascade shape (the viral side spike) ---
{
  const out = E.generateCascade('Just Ken', {});
  t('default: KO KAI + 80 x Mai Tho + space + text', out, KO_KAI + MAI_THO.repeat(80) + ' Just Ken');
  t('default is deterministic', E.generateCascade('Just Ken', {}), out);
  // criterion 7: the platform-fit count is output.length, so every mark must be a code unit
  t('every repeat is one counted character (1 + 80 + 1 + 8)', out.length, 90);
  t('the user text survives verbatim inside the output', out.endsWith(' Just Ken'), true);
}

// --- placements and carriers (criterion 4: valid Unicode in every mode) ---
t('suffix: text + space + spike', E.generateCascade('Just Ken', { placement: 'suffix', depth: 10 }), 'Just Ken ' + KO_KAI + MAI_THO.repeat(10));
t('each: every non-whitespace code point carries the stack, spaces untouched',
  E.generateCascade('a b', { placement: 'each', depth: 12 }), 'a' + MAI_THO.repeat(12) + ' b' + MAI_THO.repeat(12));
t('each: newlines and tabs are not carriers',
  E.generateCascade('a\n\tb', { placement: 'each', depth: 12 }), 'a' + MAI_THO.repeat(12) + '\n\tb' + MAI_THO.repeat(12));
t('text carrier, prefix: rides on the first visible character',
  E.generateCascade('Just Ken', { anchor: 'text', depth: 14 }), 'J' + MAI_THO.repeat(14) + 'ust Ken');
t('text carrier, suffix: rides on the last visible character',
  E.generateCascade('Just Ken', { anchor: 'text', placement: 'suffix', depth: 14 }), 'Just Ke' + 'n' + MAI_THO.repeat(14));
t('text carrier skips leading whitespace', E.generateCascade('  hi', { anchor: 'text', depth: 12 }), '  h' + MAI_THO.repeat(12) + 'i');
t('text carrier on an emoji (astral code point) keeps the emoji whole',
  E.generateCascade('🎉 party', { anchor: 'text', depth: 13 }), '🎉' + MAI_THO.repeat(13) + ' party');
t('empty text gives the bare spike', E.generateCascade('', { depth: 15 }), KO_KAI + MAI_THO.repeat(15));
t('every mark selects by id', E.CASCADE_MARKS.map(m => E.generateCascade('x', { mark: m.id, depth: 12 }).slice(1, 13)), E.CASCADE_MARKS.map(m => m.char.repeat(12)));
t('unknown mark falls back to Mai Tho', E.generateCascade('x', { mark: 'nope', depth: 12 }), KO_KAI + MAI_THO.repeat(12) + ' x');
t('unknown placement falls back to prefix', E.generateCascade('x', { placement: 'sideways', depth: 12 }), KO_KAI + MAI_THO.repeat(12) + ' x');

// --- depth clamp ---
t('depth clamps high to 150', E.generateCascade('', { depth: 9999 }).length, 151);
t('depth clamps low to 10', E.generateCascade('', { depth: 1 }).length, 11);
t('non-numeric depth uses the default', E.generateCascade('', { depth: 'lots' }).length, 81);
t('string depth is parsed (URL params arrive as strings)', E.generateCascade('', { depth: '25' }).length, 26);

// --- criterion 5: Decode Zalgo recovers the text in every placement/carrier ---
for (const placement of E.CASCADE_PLACEMENTS) {
  for (const anchor of E.CASCADE_ANCHORS) {
    for (const mark of E.CASCADE_MARKS) {
      const out = E.generateCascade('Just Ken', { placement, anchor, mark: mark.id, depth: 37 });
      t(`decode round-trips ${placement}/${anchor}/${mark.id}`, E.decodeZalgo(out), 'Just Ken');
    }
  }
}
t('decode round-trips at the maximum depth', E.decodeZalgo(E.generateCascade('Just Ken', { depth: 150 })), 'Just Ken');
t('decode round-trips at the minimum depth', E.decodeZalgo(E.generateCascade('Just Ken', { depth: 10 })), 'Just Ken');
t('decode handles a spike pasted mid-sentence', E.decodeZalgo('before ' + KO_KAI + MAI_THO.repeat(20) + ' after'), 'before after');
t('decode handles two spikes stacked at the start', E.decodeZalgo(KO_KAI + MAI_THO.repeat(6) + ' ' + KO_KAI + MAI_THO.repeat(6) + ' text'), 'text');
t('decode handles a spike with no separator', E.decodeZalgo(KO_KAI + MAI_THO.repeat(6) + 'text'), 'text');
t('decode handles a bare spike', E.decodeZalgo(KO_KAI + MAI_THO.repeat(30)), '');
t('decode strips a stack on a Latin carrier (the meme without our anchor)', E.decodeZalgo('K' + MAI_THO.repeat(50) + 'en'), 'Ken');
t('decode strips a run of just two (shortest generated shape)', E.decodeZalgo('a' + MAI_THO + MAI_THO), 'a');
t('decode of classic zalgo layered over a cascade recovers the text',
  E.decodeZalgo(E.generateZalgo(E.generateCascade('Ken', { depth: 12 }), { frequency: 1, amplitude: 6 })), 'Ken');
t('decode reports how much was removed, via length (the UI counter)',
  KO_KAI.length + 80 + 1, E.generateCascade('Ken', {}).length - E.decodeZalgo(E.generateCascade('Ken', {})).length);

// --- criterion 10: ordinary Thai is not destroyed ---
const thai = [
  'น้ำแข็ง',                 // mai tho on น: one mark, must stay
  'ไม่เป็นไร ขอบคุณค่ะ',      // mai ek twice, on different consonants
  'ก้าวหน้า',                 // KO KAI + a single mai tho at word start (looks like our carrier, is not a run)
  'สวัสดีครับ',
  'ตั๊กแตน',                  // mai tri
  'จ๋า ๋',                     // mai chattawa, plus one standalone
  'เก๋ ' + KO_KAI + MAI_THO + ' ' + KO_KAI + MAI_THO   // single-mark carriers between spaces
];
for (const s of thai) t('ordinary Thai survives the decoder: ' + s, E.decodeZalgo(s), s);
t('a single Thai tone mark after a Latin letter also survives (not a run)', E.decodeZalgo('a' + MAI_THO + 'b'), 'a' + MAI_THO + 'b');
t('two DIFFERENT tone marks in a row are not a generated run and survive', E.decodeZalgo('a่้'), 'a่้');
t('Thai vowels above and below are not tone marks and survive', E.decodeZalgo('กิ กี กึ กื กุ กู กั ก็ ก์'), 'กิ กี กึ กื กุ กู กั ก็ ก์');
t('Lao tone marks are outside the decoder (not generated here)', E.decodeZalgo('a້້'), 'a້້');

// --- the NFC fact the check-zalgo-decodes gate leans on ---
t('KO KAI + Mai Tho has no precomposed form, so the cascade card is NFC-stable',
  (KO_KAI + MAI_THO).normalize('NFC').length, 2);

// --- criterion 2: depth 150 must not stall the page ---
{
  const long = 'x'.repeat(500);
  const t0 = Date.now();
  for (let i = 0; i < 50; i++) {
    E.generateCascade(long, { depth: 150, placement: 'each' });
    E.decodeZalgo(E.generateCascade(long, { depth: 150, placement: 'each' }));
  }
  const ms = Date.now() - t0;
  t('50 x (each-mode at depth 150 on 500 chars + decode) finishes well under a second', ms < 1000, true);
}

console.log('\n' + (fail ? fail + ' assertion(s) FAILED' : 'all assertions passed'));
process.exit(fail ? 1 : 0);
