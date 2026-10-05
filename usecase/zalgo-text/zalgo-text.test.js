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
t('cascade marks are the four Thai tone marks (up) and Sara U / Sara Uu (down)',
  E.CASCADE_MARKS.map(m => m.char.codePointAt(0).toString(16).toUpperCase() + ':' + m.dir), ['E48:up', 'E49:up', 'E4A:up', 'E4B:up', 'E38:down', 'E39:down']);
t('default mark is Mai Tho (the mark in the known example)', E.CASCADE_DEFAULT_MARK, 'mai-tho');
t('carrier is KO KAI', E.CASCADE_ANCHOR, KO_KAI);
t('depth range is 10..1000, default 80', [E.CASCADE_DEPTH.min, E.CASCADE_DEPTH.max, E.CASCADE_DEPTH.default], [10, 1000, 80]);

// --- criterion 3: classic zalgo is untouched by the cascade ---
const classicPool = [].concat(E.MARKS_UP, E.MARKS_MID, E.MARKS_DOWN,
  ...Object.values(E.CHAR_TYPE_MAP).map(p => [].concat(p.up, p.mid, p.down)));
t('no Thai tone mark is reachable from any classic pool', classicPool.some(ch => THAI_TONE.test(ch)), false);
t('no Thai below-vowel is reachable from any classic pool', classicPool.some(ch => /[\u0E38-\u0E3A]/.test(ch)), false);
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
t('depth clamps high to 1000', E.generateCascade('', { depth: 9999 }).length, 1001);
t('depth clamps low to 10', E.generateCascade('', { depth: 1 }).length, 11);
t('non-numeric depth uses the default', E.generateCascade('', { depth: 'lots' }).length, 81);
t('string depth is parsed (URL params arrive as strings)', E.generateCascade('', { depth: '25' }).length, 26);

// --- criterion 5: Decode Zalgo recovers the text in every placement/carrier ---
for (const placement of E.CASCADE_PLACEMENTS) {
  for (const anchor of E.CASCADE_ANCHORS.filter(a => a !== 'kaomoji')) {
    for (const mark of E.CASCADE_MARKS) {
      const out = E.generateCascade('Just Ken', { placement, anchor, mark: mark.id, depth: 37 });
      t(`decode round-trips ${placement}/${anchor}/${mark.id}`, E.decodeZalgo(out), 'Just Ken');
    }
  }
}
t('decode round-trips at the maximum depth', E.decodeZalgo(E.generateCascade('Just Ken', { depth: 1000 })), 'Just Ken');
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

// --- Extreme: the classic engine with a larger budget (a mode, not a wider default) ---
t('classic range is 1..20, extreme 1..300 (default 50)',
  [E.AMPLITUDE_CLASSIC.min, E.AMPLITUDE_CLASSIC.max, E.AMPLITUDE_EXTREME.min, E.AMPLITUDE_EXTREME.max, E.AMPLITUDE_EXTREME.default], [1, 20, 1, 300, 50]);
t('clampAmplitude keeps an old ?amp=500 link at 20 in classic mode', E.clampAmplitude('500', false), 20);
t('clampAmplitude allows 300 in extreme mode and no more', [E.clampAmplitude(300, true), E.clampAmplitude(301, true)], [300, 300]);
t('clampAmplitude floors at 1 in both modes', [E.clampAmplitude(0, false), E.clampAmplitude(-4, true)], [1, 1]);
t('non-numeric amplitude falls back to 5 classic / 50 extreme', [E.clampAmplitude('x', false), E.clampAmplitude('x', true)], [5, 50]);
{
  const out = E.generateZalgo('ab', { charType: 'all', position: 'all', shape: 'uniform', frequency: 1, amplitude: 100 });
  const marks = out.length - 2;
  // up 55% + mid (capped at 2) + down 35% of 100 = 55 + 2 + 35 per letter
  t('extreme budget 100 stacks 92 marks on each letter (55 up, 2 mid, 35 down)', marks, 2 * 92);
  t('extreme output decodes back to its input', E.decodeZalgo(out), 'ab');
  t('extreme output uses classic pools only (no Thai marks)', THAI_TONE.test(out), false);
}

{
  const out = E.generateZalgo('ab', { charType: 'all', position: 'all', shape: 'uniform', frequency: 1, amplitude: 300 });
  // up 55% (165) + mid capped at 2 + down 35% (105) = 272 per letter
  t('extreme budget 300 stacks 272 marks on each letter', out.length - 2, 2 * 272);
  t('extreme 300 output decodes back to its input', E.decodeZalgo(out), 'ab');
  const one = E.generateZalgo('a', { position: 'up', frequency: 1, amplitude: 300 });
  t('extreme 300 with one position puts 300 marks on the letter', one.length - 1, 300);
}

// --- seeded output: a shared link reproduces the exact marks ---
{
  const o = { charType: 'all', position: 'all', shape: 'wave', frequency: 0.8, amplitude: 9, seed: 123456 };
  const a = E.generateZalgo('something is watching me', o);
  t('same text, settings and seed give the same output', E.generateZalgo('something is watching me', o), a);
  t('a different seed gives a different output', E.generateZalgo('something is watching me', Object.assign({}, o, { seed: 654321 })) !== a, true);
  const p1 = E.generateZalgo('hello', { frequency: 1, amplitude: 5, seed: 7 });
  const p2 = E.generateZalgo('hello world', { frequency: 1, amplitude: 5, seed: 7 });
  t('typing more text keeps the marks already on earlier letters (same seed)', p2.startsWith(p1), true);
  t('the random shape is seeded too', E.generateZalgo('abcdef', { shape: 'random', frequency: 1, amplitude: 8, seed: 99 }),
    E.generateZalgo('abcdef', { shape: 'random', frequency: 1, amplitude: 8, seed: 99 }));
  t('makeRng is deterministic and in [0, 1)', (() => { const r = E.makeRng(5), s = E.makeRng(5); const xs = [r(), r(), r()]; return xs.every(x => x >= 0 && x < 1) && xs[2] === (s(), s(), s()); })(), true);
}

// --- emoji are never split: marks go after the whole grapheme ---
{
  const out = E.generateZalgo('hi 🇲🇾 👨‍👩‍👧 👍🏽', { frequency: 1, amplitude: 4, seed: 3 });
  t('a flag, a ZWJ family and a skin-tone emoji survive generation whole', E.decodeZalgo(out), 'hi 🇲🇾 👨‍👩‍👧 👍🏽');
  t('marks follow the full ZWJ sequence, not its first code point', out.includes('👨‍👩‍👧'), true);
  t('graphemes counts a family emoji as one character', E.graphemes('a👨‍👩‍👧b').length, 3);
  t('cascade on every character keeps a flag whole', E.decodeZalgo(E.generateCascade('🇲🇾 x', { placement: 'each', depth: 12 })), '🇲🇾 x');
}

// --- amount per zone ---
{
  const out = E.generateZalgo('abc', { zones: { up: 7, mid: 0, down: 3 }, frequency: 1, seed: 11 });
  const marks = [...out].filter(ch => /[\u0300-\u036f]/.test(ch));
  t('per-zone amounts: 7 above + 3 below on each of 3 letters', marks.length, 30);
  t('per-zone amounts: no mid mark when mid is 0', marks.some(ch => E.MARKS_MID.includes(ch)), false);
  t('per-zone amounts ignore Position', E.generateZalgo('abc', { zones: { up: 2, mid: 1, down: 0 }, position: 'down', frequency: 1, seed: 2 }).length, 3 + 3 * 3);
  t('clampZone allows 0 and caps at the mode ceiling', [E.clampZone(0, false), E.clampZone(99, false), E.clampZone(999, true), E.clampZone('x', true)], [0, 20, 300, 0]);
}

// --- Thai Cascade: downward marks and the kaomoji carrier ---
{
  const down = E.generateCascade('Ken', { mark: 'sara-u', depth: 40 });
  t('Sara U stacks as a run of one below-vowel', down, 'ก' + 'ุ'.repeat(40) + ' Ken');
  t('a Sara U stack decodes back to the text', E.decodeZalgo(down), 'Ken');
  t('a Sara Uu stack decodes back to the text', E.decodeZalgo(E.generateCascade('Ken', { mark: 'sara-uu', depth: 40, anchor: 'text' })), 'Ken');
  t('a single Sara U in real Thai survives the decoder', E.decodeZalgo('กุ้ง ดุ'), 'กุ้ง ดุ');
  const k = E.generateCascade('üstteki tweeti işgal denemesi', { anchor: 'kaomoji', placement: 'suffix', depth: 250 });
  t('kaomoji carrier: text, newline, then (つ ค + stack + c )', k, 'üstteki tweeti işgal denemesi\n(つ ค' + MAI_THO.repeat(250) + ' c )');
  t('kaomoji prefix puts the face on the first line', E.generateCascade('hi', { anchor: 'kaomoji', depth: 10 }).split('\n')[1], 'hi');
  t('decoding a kaomoji cascade keeps the text and the plain face', E.decodeZalgo(k), 'üstteki tweeti işgal denemesi\n(つ ค c )');
  t('the Post Invader default (230) plus a 32-character caption fits a 280-weight X post',
    E.xWeightedLength(E.generateCascade('üstteki tweeti işgal denemesi123', { anchor: 'kaomoji', placement: 'suffix', depth: 230 })) <= 280, true);
}

// --- X weighted length (twitter-text rules) ---
t('X: Latin, combining marks and Thai weigh 1 each (b + acute has no precomposed form)', E.xWeightedLength('ab\u0301' + MAI_THO.repeat(3)), 6);
t('X: NFC first, so e + combining acute counts once', E.xWeightedLength('e\u0301'), 1);
t('X: CJK weighs 2', E.xWeightedLength('つ'), 2);
t('X: an emoji sequence weighs 2 however long', [E.xWeightedLength('👍'), E.xWeightedLength('👍🏽'), E.xWeightedLength('👨‍👩‍👧')], [2, 2, 2]);
t('X: a flag and a keycap weigh 2', [E.xWeightedLength('🇹🇷'), E.xWeightedLength('1\uFE0F\u20E3')], [2, 2]);
t('X: marks after an emoji are weighed one by one', E.xWeightedLength('👁' + '\u0300\u0301\u0302'), 5);
{
  const big = E.generateZalgo('The quick brown fox jumps over the lazy dog. '.repeat(12).slice(0, 500),
    { amplitude: 300, frequency: 1, zones: { up: 300, mid: 300, down: 300 }, seed: 7 });
  const t0 = Date.now();
  const capped = E.xWeightedLength(big, 280);
  t('X with a cap: a 360,000-mark output is known to be over 280 at once', capped > 280 && Date.now() - t0 < 50, true);
  const small = 'Zalgo 👁' + E.generateZalgo('hi', { amplitude: 5, seed: 3 });
  t('X with a cap: under the cap it gives the exact uncapped count', E.xWeightedLength(small, 280), E.xWeightedLength(small));
}

// --- fit to a limit ---
{
  const text = 'hello world';
  const make = v => E.generateZalgo(text, { frequency: 1, amplitude: v, seed: 5 });
  const best = E.fitValue(1, 20, 60, make, s => s.length);
  t('fitValue finds the largest amplitude that fits', make(best).length <= 60 && make(best + 1).length > 60, true);
  t('fitValue returns null when even the lightest setting is too long', E.fitValue(1, 20, 3, make, s => s.length), null);
  const d = E.fitValue(10, 1000, 32, v => E.generateCascade('Ken', { depth: v }), s => s.length);
  t('fitValue sizes a cascade to a 32-character Discord name', E.generateCascade('Ken', { depth: d }).length, 32);
}

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
  const t1 = Date.now();
  for (let i = 0; i < 20; i++) E.decodeZalgo(E.generateCascade(long, { depth: 1000 }));
  t('20 x (a 1000-deep spike on 500 chars + decode) finishes well under a second', Date.now() - t1 < 1000, true);
  const t2 = Date.now();
  E.generateZalgo(long, { position: 'all', frequency: 1, amplitude: 300, seed: 1 });
  t('extreme 300 on 500 characters generates in under a second', Date.now() - t2 < 1000, true);
}

// --- GIF export encoder (zalgo-gif.js), decoded back with a reference LZW decoder ---
{
  const fs = require('fs');
  const vm = require('vm');
  const win = {};
  vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, 'zalgo-gif.js'), 'utf8'), { window: win, document: {}, Blob: function () {}, setTimeout });
  const G = win.UTGZalgoGif;
  // Minimal GIF reader: header, global palette, then each frame's LZW data.
  function readGif(b) {
    let p = 13 + 3 * (1 << ((b[10] & 7) + 1));
    const frames = [];
    let loop = false;
    while (b[p] !== 0x3B) {
      if (b[p] === 0x21) {
        if (b[p + 1] === 0xFF && String.fromCharCode(...b.slice(p + 3, p + 14)) === 'NETSCAPE2.0') loop = true;
        p += 2;
        while (b[p]) p += b[p] + 1;
        p++;
        continue;
      }
      const w = b[p + 5] | (b[p + 6] << 8), h = b[p + 7] | (b[p + 8] << 8);
      p += 10;
      const min = b[p++];
      const data = [];
      while (b[p]) { for (let i = 1; i <= b[p]; i++) data.push(b[p + i]); p += b[p] + 1; }
      p++;
      const clear = 1 << min, eoi = clear + 1;
      let size = min + 1, dict = [], prev = null, bit = 0;
      const out = [];
      const reset = () => { dict = []; for (let i = 0; i < clear; i++) dict[i] = [i]; dict[clear] = []; dict[eoi] = []; size = min + 1; prev = null; };
      reset();
      for (;;) {
        let code = 0;
        for (let i = 0; i < size; i++, bit++) code |= ((data[bit >> 3] >> (bit & 7)) & 1) << i;
        if (code === clear) { reset(); continue; }
        if (code === eoi) break;
        let entry;
        if (code < dict.length) entry = dict[code];
        else entry = prev.concat([prev[0]]);
        out.push(...entry);
        if (prev) dict.push(prev.concat([entry[0]]));
        prev = entry;
        if (dict.length === (1 << size) && size < 12) size++;
      }
      frames.push({ w, h, px: out });
    }
    return { frames, loop };
  }
  const W = 97, H = 61;
  let seed = 1;
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const frames = [0, 1, 2].map(() => Uint8Array.from({ length: W * H }, () => Math.floor(rand() * 16)));
  const pal = Array.from({ length: 16 }, (_, i) => [i * 16, i * 16, i * 16]);
  const bytes = G.encode(W, H, frames, pal, [10, 10, 30]);
  const back = readGif(bytes);
  t('GIF: header is GIF89a and it loops forever', String.fromCharCode(...bytes.slice(0, 6)) + ':' + back.loop, 'GIF89a:true');
  t('GIF: every frame decodes back to the exact pixels', back.frames.every((f, i) => f.w === W && f.h === H && f.px.length === W * H && f.px.every((v, j) => v === frames[i][j])), true);
  const big = Uint8Array.from({ length: 600 * 400 }, () => Math.floor(rand() * 16));
  const bigBack = readGif(G.encode(600, 400, [big], pal, [10]));
  t('GIF: a frame large enough to fill the 4096-code dictionary still decodes exactly', bigBack.frames[0].px.every((v, j) => v === big[j]), true);
  // X's upload API caps GIFs at 1280x1080; the Post Invader preset once
  // produced 240x1820. The rendered height of that preset is checked in a
  // browser (canvas layout needs one); this pins the ceiling it clamps to.
  t('GIF: the canvas ceiling fits X (at most 1080 tall and 1280 wide)', G.MAX_HEIGHT <= 1080 && G.MAX_WIDTH <= 1280, true);
}

console.log('\n' + (fail ? fail + ' assertion(s) FAILED' : 'all assertions passed'));
process.exit(fail ? 1 : 0);
