#!/usr/bin/env node
/* case-policy.test.js — the locale case policy in renderer.js.

   Three groups:
   1. Legacy is byte-identical. A page without data-case-policy, in any
      language, renders what origin/main rendered for the whole corpus, and so
      does every non-case style (fixture: scripts/lib/fixtures/case-legacy-digests.json).
   2. Opting in changes nothing but the case cards: every non-case style
      renders the same with and without the attribute.
   3. Linguistic expectations. Each row's expected value comes from the rule
      named beside it, not from running the code. Rows marked `old` also record
      what the pre-policy code produced, so the suite shows the defect it fixes.

   Run: node scripts/lib/case-policy.test.js   (npm run test:case-policy) */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ROOT, loadRenderer, CASE_STYLES, PAGE_LANGS, CORPUS } = require('./case-policy-harness');

const r = loadRenderer();
let failed = 0;
let passed = 0;
function check(label, got, want) {
  if (got === want) { passed++; return; }
  failed++;
  console.error(`FAIL ${label}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
}
const sha = list => crypto.createHash('sha256').update(JSON.stringify(list)).digest('hex');

// ---- 1. legacy byte-identity -------------------------------------------------
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/lib/fixtures/case-legacy-digests.json'), 'utf8'));
check('fixture corpus matches harness corpus', fx.corpus_sha256, sha(CORPUS));
for (const lang of PAGE_LANGS) {
  for (const s of CASE_STYLES) {
    const key = `${lang || '(none)'}|${s}`;
    check(`legacy ${key}`, sha(CORPUS.map(t => r.render(t, s, lang, null))), fx.by_lang_style[key]);
    // An attribute value other than "locale" is not an opt-in.
    check(`legacy ${key} (data-case-policy="")`, sha(CORPUS.map(t => r.render(t, s, lang, ''))), fx.by_lang_style[key]);
  }
}
for (const name of Object.keys(fx.by_style)) {
  check(`legacy style ${name}`, sha(CORPUS.map(t => r.render(t, name, '', null))), fx.by_style[name]);
}
// A language with no verified policy stays on the old code even when opted in.
for (const lang of ['vi', 'ms', 'ru', 'hr', 'sv', 'ar', 'th']) {
  for (const s of CASE_STYLES) {
    check(`unverified ${lang} opted in = legacy (${s})`,
      sha(CORPUS.map(t => r.render(t, s, lang, 'locale'))), fx.by_lang_style[`${lang}|${s}`]);
  }
}

// ---- 2. the opt-in touches only the case cards --------------------------------
const CASE_SET = new Set(CASE_STYLES.filter(s => !['Capitalized Case', 'Title Case', 'Sentence case'].includes(s)));
for (const name of Object.keys(r.styles)) {
  if (['Capitalized Case', 'Title Case', 'Sentence case'].includes(name)) continue;
  for (const lang of ['de', 'tr', 'fr', 'en']) {
    check(`opt-in leaves ${name} unchanged (${lang})`,
      sha(CORPUS.map(t => r.render(t, name, lang, 'locale'))),
      sha(CORPUS.map(t => r.render(t, name, lang, null))));
  }
}
void CASE_SET;

// ---- 3. linguistic expectations ------------------------------------------------
// [lang, style, input, expected, old (pre-policy output, when it differed), rule]
const T = 'Title Case', C = 'Capitalized Case', S = 'Sentence case';
const ROWS = [
  // English: the policy is the old behaviour (Chicago-style minor words, acronyms,
  // internal caps, surnames, the pronoun I).
  ['en', T, 'the lord of the rings', 'The Lord of the Rings', null, 'Chicago: articles/short preps lowercase'],
  ['en', T, 'a tale of two cities', 'A Tale of Two Cities', null, 'first word always capitalised'],
  ['en', T, 'what are you looking at', 'What Are You Looking At', null, 'last word always capitalised'],
  ['en', T, 'the NASA team met at the FBI', 'The NASA Team Met at the FBI', null, 'acronyms kept'],
  ['en', T, 'my new iPhone from McDonald', 'My New iPhone From McDonald', null, 'internal caps kept ("from" is not on the English list; unchanged)'],
  ['en', C, "mcdavid and o'brien", "McDavid And O'Brien", null, 'English surnames'],
  ['en', S, "i'm sure i'll be fine. i think so!", "I'm sure I'll be fine. I think so!", null, 'pronoun I'],
  ['en', T, 'THE LORD OF THE RINGS', 'The Lord of the Rings', null, 'all-caps input is unshouted first'],
  ['en', T, 'state-of-the-art design', 'State-Of-The-Art Design', null, 'unchanged hyphen behaviour'],

  // German. No German title-case convention; the page defines Title Case as
  // "short articles, conjunctions and prepositions stay lowercase".
  ['de', T, 'der hund und die katze', 'Der Hund und die Katze', 'Der Hund Und Die Katze', 'articles/conjunctions lowercase (D24)'],
  ['de', T, 'DER HUND UND DIE KATZE', 'Der Hund und die Katze', 'Der Hund Und Die Katze', 'unshout, then the same rule'],
  ['de', T, 'die straße in der stadt', 'Die Straße in der Stadt', 'Die Straße in Der Stadt', 'ß is lowercase-only; untouched mid-word'],
  ['de', T, 'the lord of the rings', 'The Lord of the Rings', null, 'English text on a German page keeps English rules'],
  ['de', T, 'to die for', 'To Die For', null, 'English "die" is not the German article when the text is English'],
  ['de', 'UPPERCASE', 'straße', 'STRASSE', null, 'Unicode SpecialCasing ß -> SS (unchanged; ẞ needs an owner call)'],
  ['de', C, 'groß und klein', 'Groß Und Klein', null, 'Capitalized Case has no exceptions'],
  ['de', S, 'der hund und die katze. ein tag', 'Der hund und die katze. Ein tag', null, 'sentence starts only (the de note says nouns are lowercased)'],
  ['de', C, 'ǆep', 'ǅep', 'Ǆep', 'Unicode titlecase of a digraph letter'],
  ['de', C, 'mcdonald', 'Mcdonald', 'McDonald', 'no English surname rule on non-English text'],

  // Turkish (TDK): conjunctions and the question particle stay lowercase,
  // dotted/dotless I follow Turkish casing.
  ['tr', T, 'suç ve ceza', 'Suç ve Ceza', 'Suç Ve Ceza', 'TDK: "ve" lowercase in a title'],
  ['tr', T, 'İSTANBUL VE IĞDIR', 'İstanbul ve Iğdır', 'İstanbul Ve Iğdır', 'tr casing: İ->i, I->ı; "ve" lowercase'],
  ['tr', T, 'kırmızı ile beyaz mı', 'Kırmızı ile Beyaz mı', 'Kırmızı İle Beyaz Mı', 'TDK: "ile", "mı" lowercase, even last; i->İ on "ile" was wrong'],
  ['tr', T, 'ben de geldim', 'Ben de Geldim', 'Ben De Geldim', 'TDK: conjunction "de"'],
  ['tr', C, 'istanbul ve izmir', 'İstanbul Ve İzmir', null, 'dotted capital İ'],
  ['tr', 'UPPERCASE', 'ılık iğne', 'ILIK İĞNE', null, 'tr uppercase'],
  ['tr', 'lowercase', 'ILIK İĞNE', 'ılık iğne', null, 'tr lowercase'],

  // Indonesian (PUEBI): di, ke, dari, dan, yang, untuk lowercase unless first.
  ['id', T, 'dari ave maria ke jalan lain ke roma', 'Dari Ave Maria ke Jalan Lain ke Roma', 'Dari Ave Maria Ke Jalan Lain Ke Roma', 'PUEBI\'s own example'],
  ['id', T, 'buku dan pena untuk anak', 'Buku dan Pena untuk Anak', 'Buku Dan Pena Untuk Anak', 'PUEBI kata tugas'],
  ['id', T, 'rumah yang di', 'Rumah yang di', 'Rumah Yang Di', 'PUEBI exempts only the first position'],

  // Polish: "i" is "and"; PWN names keep conjunctions and prepositions lowercase.
  ['pl', T, 'kot i pies na dachu', 'Kot i Pies na Dachu', 'Kot I Pies Na Dachu', '"i" = and; "na" preposition'],
  ['pl', T, 'pan tadeusz, czyli ostatni zajazd na litwie', 'Pan Tadeusz, Czyli Ostatni Zajazd na Litwie', 'Pan Tadeusz, Czyli Ostatni Zajazd Na Litwie', '"na" preposition ("czyli" is not on the list)'],
  ['pl', S, 'kot i pies. i co dalej', 'Kot i pies. I co dalej', null, '"i" is never the English pronoun'],
  ['pl', T, 'I and you', 'I and You', null, 'English text: English rules'],
  ['pl', 'UPPERCASE', 'żółć', 'ŻÓŁĆ', null, 'Polish diacritics'],

  // Italian: "i" is the plural article; elided articles split.
  ['it', T, 'il signore degli anelli', 'Il Signore degli Anelli', 'Il Signore Degli Anelli', 'articled preposition "degli"'],
  ['it', T, "la compagnia dell'anello", "La Compagnia dell'Anello", "La Compagnia Dell'anello", 'elided "dell\'" lowercase, the noun capitalised'],
  ['it', T, 'i promessi sposi', 'I Promessi Sposi', null, 'first word'],
  ['it', T, 'tra i monti e il mare', 'Tra i Monti e il Mare', 'Tra I Monti E Il Mare', 'article "i", conjunction "e"'],
  ['it', S, 'i gatti e i cani', 'I gatti e i cani', null, 'Italian "i" is not the pronoun'],
  ['it', S, 'yesterday i went to the shop', 'Yesterday I went to the shop', 'Yesterday i went to the shop', 'English text: the pronoun I (what the it FAQ says)'],

  // French: elision and articles.
  ['fr', T, 'le seigneur des anneaux', 'Le Seigneur des Anneaux', 'Le Seigneur Des Anneaux', '"des" article'],
  ['fr', T, "la communauté de l'anneau", "La Communauté de l'Anneau", "La Communauté De L'anneau", 'elided article lowercase mid-title'],
  ['fr', T, "l'étranger", "L'Étranger", "L'étranger", 'first word: article and noun'],
  ['fr', S, "aujourd'hui, maman est morte.", "Aujourd'hui, maman est morte.", null, '"aujourd\'hui" is one word, not an elision'],
  ['fr', T, "aujourd'hui et demain", "Aujourd'hui et Demain", "Aujourd'hui Et Demain", '"et" conjunction; aujourd\'hui not split'],
  ['fr', T, 'ÉCOLE ÉLÉMENTAIRE', 'École Élémentaire', null, 'accented capitals'],
  ['fr', T, '«le petit prince»', '«Le Petit Prince»', null, 'guillemets skipped to the first letter'],
  ['fr', C, 'œuvre complète', 'Œuvre Complète', null, 'œ ligature'],

  // Spanish (RAE periodical/collection names): articles and prepositions lowercase.
  ['es', T, 'el señor de los anillos', 'El Señor de los Anillos', 'El Señor De Los Anillos', 'articles, "de"'],
  ['es', T, 'el barco de vapor', 'El Barco de Vapor', 'El Barco De Vapor', 'RAE\'s own example'],
  ['es', T, 'cien años de soledad', 'Cien Años de Soledad', 'Cien Años De Soledad', 'ñ'],
  ['es', S, '¿qué tal? ¡bien!', '¿Qué tal? ¡Bien!', null, 'inverted marks skipped'],

  // Portuguese (Acordo 1990 Base XIX).
  ['pt', T, 'o senhor dos anéis', 'O Senhor dos Anéis', 'O Senhor Dos Anéis', 'contraction "dos"'],
  ['pt', T, 'memórias póstumas de brás cubas', 'Memórias Póstumas de Brás Cubas', 'Memórias Póstumas De Brás Cubas', 'Base XIX example'],
  ['pt', T, 'casa do povo', 'Casa do Povo', 'Casa Do Povo', 'contraction "do"'],
  ['pt', T, 'what to do in london', 'What to Do in London', null, 'English text on a pt page keeps English rules'],

  // Dutch (future pages): IJ is one letter.
  ['nl', C, 'ijs en ijsland', 'IJs En IJsland', 'Ijs En Ijsland', 'Taalunie: IJ capitalised together'],
  ['nl', T, 'het ijzeren tijdperk', 'Het IJzeren Tijdperk', 'Het Ijzeren Tijdperk', 'IJ; mid-word ij untouched'],
  ['nl', S, 'ijsland is koud', 'IJsland is koud', 'Ijsland is koud', 'IJ at a sentence start'],

  // Uncased scripts: nothing fabricated; Latin text read as English.
  ['ko', T, 'ㅎㅎ 안녕하세요 hello', 'ㅎㅎ 안녕하세요 Hello', null, 'Hangul has no case'],
  ['zh-TW', T, '大小寫轉換 hello world', '大小寫轉換 Hello World', null, 'Han has no case'],
  ['zh-TW', S, 'what i did. i think so', 'What I did. I think so', 'What i did. I think so', 'the page converts English text'],
  ['ja', 'UPPERCASE', 'こんにちは ai', 'こんにちは AI', null, 'kana untouched'],
  ['de', T, 'привет мир', 'Привет Мир', null, 'Cyrillic is cased; no list applies'],
  ['de', C, '𐐨𐐯𐑅𐐨𐑉𐐯𐐻', '𐐀𐐯𐑅𐐨𐑉𐐯𐐻', '𐐨𐐯𐑅𐐨𐑉𐐯𐐻', 'a non-BMP letter is one character (Deseret)'],
];

for (const [lang, style, input, want, old, rule] of ROWS) {
  check(`${lang} ${style} ${JSON.stringify(input)} [${rule}]`, r.render(input, style, lang, 'locale'), want);
  if (old !== null) {
    check(`${lang} ${style} ${JSON.stringify(input)} pre-policy output recorded`, r.render(input, style, lang, null), old);
  } else if (!['ko', 'ja', 'zh-TW'].includes(lang) || style === 'UPPERCASE') {
    // "old: null" means the opt-in must not change this output.
    check(`${lang} ${style} ${JSON.stringify(input)} unchanged by opt-in`, r.render(input, style, lang, null), want);
  }
}

// The list of verified languages the gate reads.
check('casePolicyLanguages exported',
  JSON.stringify(r.api.casePolicyLanguages.slice().sort()),
  JSON.stringify(['de', 'en', 'es', 'fr', 'id', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'tr', 'zh', 'zh-tw']));

console.log(`case-policy: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
