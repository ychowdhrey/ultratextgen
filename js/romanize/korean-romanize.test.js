#!/usr/bin/env node
'use strict';
/*
 * korean-romanize.test.js: the romanizer's promises, pinned against the
 * examples printed in the standard itself (국어의 로마자 표기법, 2014-42).
 * Run: node js/romanize/korean-romanize.test.js   (exit 1 on any failure)
 *
 * A romanizer is a Check surface: a wrong letter looks exactly like a right
 * one, and on a passport form it costs money. So every rule the page claims
 * is asserted here, and every rule it says it does NOT apply is pinned as a
 * known divergence, so a later "fix" that silently changes behaviour shows up.
 */
const R = require('./korean-romanize.js');
let fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + '  got=' + JSON.stringify(got) + (ok ? '' : ' want=' + JSON.stringify(want)));
}
const w = s => R.romanizeText(s, 'word');

// Consonant and vowel tables, positions (Article 2).
eq('서울', w('서울'), 'seoul');
eq('부산', w('부산'), 'busan');
eq('대구', w('대구'), 'daegu');
eq('의정부 (ㅢ is ui)', w('의정부'), 'uijeongbu');
eq('구미', w('구미'), 'gumi');
eq('옥천 (ㄱ final k)', w('옥천'), 'okcheon');
eq('합덕', w('합덕'), 'hapdeok');
eq('월곶 (ㅈ final t)', w('월곶'), 'wolgot');
eq('벚꽃', w('벚꽃'), 'beotkkot');
eq('한밭', w('한밭'), 'hanbat');
eq('구리 (ㄹ before vowel r)', w('구리'), 'guri');
eq('칠곡 (ㄹ final l)', w('칠곡'), 'chilgok');
eq('울릉 (ㄹㄹ ll)', w('울릉'), 'ulleung');
eq('대관령 (ㄴ+ㄹ ll)', w('대관령'), 'daegwallyeong');

// Sound changes (Article 3-1).
eq('백마 nasal', w('백마'), 'baengma');
eq('종로', w('종로'), 'jongno');
eq('왕십리', w('왕십리'), 'wangsimni');
eq('별내', w('별내'), 'byeollae');
eq('신라', w('신라'), 'silla');
eq('해돋이 palatal', w('해돋이'), 'haedoji');
eq('같이', w('같이'), 'gachi');
eq('굳히다', w('굳히다'), 'guchida');
eq('좋고 ㅎ aspirates forward', w('좋고'), 'joko');
eq('놓다', w('놓다'), 'nota');
eq('낳지', w('낳지'), 'nachi');
eq('묵호 noun, no aspiration', w('묵호'), 'mukho');
eq('집현전', w('집현전'), 'jiphyeonjeon');
eq('압구정 tensing not written', w('압구정'), 'apgujeong');
eq('낙동강', w('낙동강'), 'nakdonggang');
eq('합정', w('합정'), 'hapjeong');
eq('울산', w('울산'), 'ulsan');
eq('words keep spaces and punctuation', w('서울 부산!'), 'seoul busan!');

// Known divergences, kept visible on purpose (the page states them).
eq('KNOWN: 학여울 needs ㄴ-insertion (standard Hangnyeoul)', w('학여울'), 'hagyeoul');
eq('KNOWN: 신문로 is a lexical ㄴ+ㄹ->ㄴㄴ exception (standard Sinmunno)', w('신문로'), 'sinmullo');
eq('KNOWN: 잡혀 verb aspiration (standard japyeo)', w('잡혀'), 'japhyeo');

// Personal names (Article 3-4): no sound change inside the given name.
eq('한복남', R.romanizeName('한복남').standard, 'Han Boknam');
eq('한복남 hyphen', R.romanizeName('한복남').hyphen, 'Han Bok-nam');
eq('홍빛나', R.romanizeName('홍빛나').standard, 'Hong Bitna');
eq('민용하', R.romanizeName('민용하').standard, 'Min Yongha');
eq('송나리', R.romanizeName('송나리').standard, 'Song Nari');
eq('홍길동 passport', R.romanizeName('홍길동').passport, 'HONG GILDONG');
eq('two-syllable surname 남궁', R.romanizeName('남궁민수').standard, 'Namgung Minsu');
eq('space keeps the split', R.romanizeName('제 갈량').surname, '제');
eq('이 standard is I', R.romanizeName('이서연').surnameStandard, 'I');
eq('이 common spellings', R.romanizeName('이서연').surnameCommon, ['Lee', 'Yi', 'Rhee']);
eq('김 common spelling', R.romanizeName('김민준').surnameCommon, ['Kim']);
eq('older given spelling', R.romanizeName('박영선').givenOlder, 'Youngsun');
eq('non-Hangul passes through', R.romanizeText('ABC 123', 'word'), 'ABC 123');

console.log(fail ? `\n${fail} failure(s)` : '\nAll romanizer assertions pass.');
process.exit(fail ? 1 : 0);
