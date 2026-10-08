/* ==========================================================
   korean-romanize.js — Revised Romanization of Korean (국어의 로마자
   표기법, 문화체육관광부 고시 제2014-42호), in the browser.

   Two modes, because the standard itself has two:
   - name:  a personal name. Article 3-4: surname and given name are
            separated by a space, given-name syllables are written
            together (a hyphen is allowed), and sound changes between the
            syllables of a given name are NOT transcribed
            (한복남 Han Boknam, 홍빛나 Hong Bitna).
   - word:  ordinary words and place names. Article 3-1: liaison,
            nasal and liquid assimilation, palatalisation and the
            ㅎ-final rules are transcribed (신라 Silla, 종로 Jongno,
            해돋이 haedoji, 좋고 joko). Tensing is never written
            (압구정 Apgujeong).

   Known gaps, stated on the page and pinned in the tests: ㄴ-insertion
   (학여울 Hangnyeoul, 알약 allyak) and the ㄴ+ㄹ words read as ㄴㄴ
   (신문로 Sinmunno, 의견란) depend on word structure the text does not
   carry, and ㄱ/ㄷ/ㅂ/ㅈ + ㅎ aspirates in verbs (잡혀 japyeo)
   but not in nouns (묵호 Mukho); the noun reading is used.

   Surnames: Article 3-4 says their transcription "will be established
   separately", so the page shows the standard letters next to the
   spellings people actually register (Kim, Lee, Park ...).

   Pure functions first; the DOM controller at the bottom runs only in a
   browser with the page's #romanizeInput present. No dependencies.
   ========================================================== */
(function (root) {
  'use strict';

  const L = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
  const V = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
  // Final consonants by index (0 = none), as jamo names for the rules below.
  const T = ['', 'ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const LJ = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const LI = {}; LJ.forEach((j, i) => { LI[j] = i; });

  // A final's sound when it closes a syllable (7 representative codas).
  const CODA = { 'ㄱ':'ㄱ','ㄲ':'ㄱ','ㄳ':'ㄱ','ㄺ':'ㄱ','ㅋ':'ㄱ', 'ㄴ':'ㄴ','ㄵ':'ㄴ','ㄶ':'ㄴ',
    'ㄷ':'ㄷ','ㅅ':'ㄷ','ㅆ':'ㄷ','ㅈ':'ㄷ','ㅊ':'ㄷ','ㅌ':'ㄷ','ㅎ':'ㄷ', 'ㄹ':'ㄹ','ㄼ':'ㄹ','ㄽ':'ㄹ','ㄾ':'ㄹ','ㅀ':'ㄹ',
    'ㅁ':'ㅁ','ㄻ':'ㅁ', 'ㅂ':'ㅂ','ㅍ':'ㅂ','ㅄ':'ㅂ','ㄿ':'ㅂ', 'ㅇ':'ㅇ' };
  const CODA_ROMAN = { 'ㄱ':'k','ㄴ':'n','ㄷ':'t','ㄹ':'l','ㅁ':'m','ㅂ':'p','ㅇ':'ng' };
  // Liaison before a vowel: [stays, moves].
  const LIAISON = { 'ㄱ':['','ㄱ'],'ㄲ':['','ㄲ'],'ㄳ':['ㄱ','ㅆ'],'ㄴ':['','ㄴ'],'ㄵ':['ㄴ','ㅈ'],'ㄶ':['','ㄴ'],
    'ㄷ':['','ㄷ'],'ㄹ':['','ㄹ'],'ㄺ':['ㄹ','ㄱ'],'ㄻ':['ㄹ','ㅁ'],'ㄼ':['ㄹ','ㅂ'],'ㄽ':['ㄹ','ㅆ'],'ㄾ':['ㄹ','ㅌ'],
    'ㄿ':['ㄹ','ㅍ'],'ㅀ':['','ㄹ'],'ㅁ':['','ㅁ'],'ㅂ':['','ㅂ'],'ㅄ':['ㅂ','ㅆ'],'ㅅ':['','ㅅ'],'ㅆ':['','ㅆ'],
    'ㅈ':['','ㅈ'],'ㅊ':['','ㅊ'],'ㅋ':['','ㅋ'],'ㅌ':['','ㅌ'],'ㅍ':['','ㅍ'],'ㅎ':['','ㅇ'] };
  const ASPIRATE = { 'ㄱ':'ㅋ','ㄷ':'ㅌ','ㅈ':'ㅊ','ㅅ':'ㅆ' };

  function isHangul(ch) { const c = ch.charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3; }
  function decompose(ch) {
    const c = ch.charCodeAt(0) - 0xAC00;
    return { l: LJ[Math.floor(c / 588)], v: Math.floor((c % 588) / 28), t: T[c % 28] };
  }

  // Romanize one run of Hangul syllables (a "word": no spaces inside).
  function romanizeRun(chars, mode) {
    const s = chars.map(decompose);
    if (mode === 'word') {
      for (let i = 0; i < s.length - 1; i++) {
        const a = s[i], b = s[i + 1];
        if (!a.t) continue;
        // ㅎ-final rules (aspiration forward, silent before a vowel, ㄴ before ㄴ).
        if (a.t === 'ㅎ' || a.t === 'ㄶ' || a.t === 'ㅀ') {
          const keep = a.t === 'ㄶ' ? 'ㄴ' : a.t === 'ㅀ' ? 'ㄹ' : '';
          if (ASPIRATE[b.l]) { b.l = ASPIRATE[b.l]; a.t = keep; continue; }
          if (b.l === 'ㄴ' && a.t === 'ㅎ') { a.t = 'ㄴ'; }
        }
        if (b.l === 'ㅇ') {
          // Palatalisation: ㄷ/ㅌ + 이 -> 지/치.
          if ((a.t === 'ㄷ' || a.t === 'ㅌ') && b.v === 20) { b.l = a.t === 'ㄷ' ? 'ㅈ' : 'ㅊ'; a.t = ''; continue; }
          const pair = LIAISON[a.t];
          if (pair && a.t !== 'ㅇ') { a.t = pair[0]; b.l = pair[1]; }
          continue;
        }
        // ㄷ + 히 -> 치 (굳히다 guchida).
        if (a.t === 'ㄷ' && b.l === 'ㅎ' && b.v === 20) { b.l = 'ㅊ'; a.t = ''; continue; }
        let c = CODA[a.t];
        // ㄹ after a coda other than ㄹ/ㄴ is read ㄴ (종로 Jongno, 백리 baengni).
        if (b.l === 'ㄹ' && c !== 'ㄹ' && c !== 'ㄴ') b.l = 'ㄴ';
        // Obstruent before a nasal becomes nasal (백마 Baengma, 합니다 hamnida).
        if (b.l === 'ㄴ' || b.l === 'ㅁ') {
          if (c === 'ㄱ') c = 'ㅇ'; else if (c === 'ㄷ') c = 'ㄴ'; else if (c === 'ㅂ') c = 'ㅁ';
        }
        // Liquid assimilation: ㄴ+ㄹ and ㄹ+ㄴ -> ㄹㄹ (신라 Silla, 별내 Byeollae).
        if (c === 'ㄴ' && b.l === 'ㄹ') c = 'ㄹ';
        if (c === 'ㄹ' && b.l === 'ㄴ') b.l = 'ㄹ';
        a.t = c;
      }
    }
    let out = '';
    s.forEach((x, i) => {
      const prev = i > 0 ? s[i - 1] : null;
      let init = L[LI[x.l]];
      // ㄹㄹ is written ll; ㄹ before a vowel is r.
      if (x.l === 'ㄹ' && prev && prev.t && CODA[prev.t] === 'ㄹ') init = 'l';
      out += init + V[x.v];
      if (x.t) {
        const nextIsR = i + 1 < s.length && s[i + 1].l === 'ㄹ';
        out += (CODA[x.t] === 'ㄹ' && nextIsR) ? 'l' : CODA_ROMAN[CODA[x.t]];
      }
    });
    // ll from ㄹ coda + ㄹ initial must not double into lll.
    return out.replace(/lll/g, 'll');
  }

  function romanizeText(text, mode) {
    let out = '', run = [];
    const flush = () => { if (run.length) { out += romanizeRun(run, mode); run = []; } };
    for (const ch of String(text || '')) {
      if (isHangul(ch)) run.push(ch); else { flush(); out += ch; }
    }
    flush();
    return out;
  }

  function cap(w) { return w ? w.charAt(0).toUpperCase() + w.slice(1) : w; }

  const TWO_SYLLABLE_SURNAMES = ['남궁','황보','제갈','선우','독고','사공','서문','동방','강전','망절','어금'];
  // Spellings commonly registered for the most frequent surnames. The standard
  // spelling (first romanizeRun output) is always shown first and marked.
  const SURNAME_COMMON = {
    '김':['Kim'], '이':['Lee','Yi','Rhee'], '박':['Park','Pak'], '최':['Choi','Choe'], '정':['Jung','Jeong','Chung'],
    '강':['Kang'], '조':['Cho','Jo'], '윤':['Yoon','Yun'], '장':['Jang','Chang'], '임':['Lim','Im','Lyim'],
    '한':['Han'], '오':['Oh'], '서':['Seo','Suh'], '신':['Shin','Sin'], '권':['Kwon'], '황':['Hwang'],
    '안':['Ahn','An'], '송':['Song'], '류':['Ryu','Yoo','Yu'], '유':['Yoo','Yu'], '전':['Jeon','Jun','Chun'],
    '홍':['Hong'], '고':['Ko','Koh'], '문':['Moon','Mun'], '양':['Yang'], '손':['Son','Sohn'], '배':['Bae','Pae'],
    '백':['Baek','Paik'], '허':['Heo','Huh'], '남':['Nam'], '노':['Noh','Roh'], '하':['Ha'], '곽':['Kwak'],
    '성':['Sung','Seong'], '차':['Cha'], '주':['Joo','Ju','Chu'], '우':['Woo'], '구':['Koo','Ku'], '민':['Min'],
    '진':['Jin','Chin'], '나':['Na','Ra'], '지':['Ji','Chi'], '엄':['Um','Eom'], '변':['Byun','Byeon'], '채':['Chae'],
    '원':['Won'], '천':['Chun','Cheon'], '방':['Bang'], '공':['Kong'], '현':['Hyun','Hyeon'], '함':['Ham'],
    '염':['Yeom','Yum'], '여':['Yeo','Yuh'], '추':['Choo','Chu'], '도':['Do','Doh'], '석':['Seok','Suk'],
    '선':['Sun','Seon'], '설':['Seol','Sul'], '길':['Gil','Kil'], '연':['Yeon','Yun'], '표':['Pyo'], '명':['Myung','Myeong'],
    '기':['Ki','Gi'], '왕':['Wang'], '금':['Keum','Geum'], '옥':['Ok'], '육':['Yook','Yuk'], '인':['In'], '탁':['Tak'],
    '국':['Kook','Guk'], '은':['Eun'], '용':['Yong'], '경':['Kyung','Gyeong'], '봉':['Bong'], '남궁':['Namgung','Namkung'],
    '황보':['Hwangbo'], '제갈':['Jegal'], '선우':['Sunwoo','Seonu'], '독고':['Dokgo'] };

  // Given-name syllables people often register with older spellings. Shown
  // as an example line only, never as the answer.
  const GIVEN_COMMON = { '영':'young','선':'sun','정':'jung','현':'hyun','은':'eun','준':'jun','성':'sung',
    '석':'suk','혁':'hyuk','숙':'sook','순':'soon','주':'joo','수':'soo','우':'woo','경':'kyung','근':'keun',
    '철':'chul','범':'bum','연':'yun','윤':'yoon','종':'jong','희':'hee','미':'mi','서':'seo','형':'hyung','훈':'hoon',
    '용':'yong','중':'joong','진':'jin','민':'min','지':'ji','하':'ha','나':'na','소':'so','원':'won','호':'ho','태':'tae' };

  function splitName(name) {
    const s = String(name || '').replace(/\s+/g, '');
    if (!s) return { surname: '', given: '' };
    const two = TWO_SYLLABLE_SURNAMES.find(p => s.startsWith(p) && s.length > 2);
    const cut = two ? 2 : 1;
    return { surname: s.slice(0, cut), given: s.slice(cut) };
  }

  // Everything the page shows for one name.
  function romanizeName(name) {
    const raw = String(name || '').trim();
    let surname, given;
    if (/\s/.test(raw)) { const p = raw.split(/\s+/); surname = p[0]; given = p.slice(1).join(''); }
    else ({ surname, given } = splitName(raw));
    const sr = cap(romanizeRun([...surname].filter(isHangul), 'name'));
    const givenSyl = [...given].filter(isHangul);
    const gr = cap(romanizeRun(givenSyl, 'name'));
    const grHyphen = cap(givenSyl.map(c => romanizeRun([c], 'name')).join('-'));
    const common = (SURNAME_COMMON[surname] || []).filter(x => x.toLowerCase() !== sr.toLowerCase());
    const givenOld = givenSyl.length && givenSyl.every(c => GIVEN_COMMON[c])
      ? cap(givenSyl.map(c => GIVEN_COMMON[c]).join('')) : '';
    return {
      surname, given,
      standard: [sr, gr].filter(Boolean).join(' '),
      hyphen: [sr, grHyphen].filter(Boolean).join(' '),
      passport: [sr, gr].filter(Boolean).join(' ').toUpperCase(),
      surnameStandard: sr,
      surnameCommon: common,
      givenOlder: givenOld && givenOld.toLowerCase() !== gr.toLowerCase() ? givenOld : ''
    };
  }

  const API = { romanizeText, romanizeName, romanizeRun, splitName, isHangul };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.UTGKoreanRomanize = API;

  /* ---------------- DOM controller ---------------- */
  if (typeof document === 'undefined') return;
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    const input = document.getElementById('romanizeInput');
    const grid = document.getElementById('romanizeResults');
    if (!input || !grid) return;
    const modeBtns = Array.from(document.querySelectorAll('[data-romanize-mode]'));
    const T9 = window.romanizeI18n || {};
    const t = (k, d) => (T9[k] != null ? T9[k] : d);
    let mode = 'name';

    function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
    function card(label, note, value) {
      return '<div class="style-card"><div class="style-info"><p class="style-name">' + esc(label) + '</p>' +
        (note ? '<p class="style-note">' + esc(note) + '</p>' : '') +
        '<p class="style-preview">' + esc(value) + '</p></div><div class="style-actions-stack"><div class="style-actions">' +
        '<button class="copy-btn" type="button" data-text="' + esc(value) + '">' + esc(t('copy', 'Copy')) + '</button></div></div></div>';
    }
    function render() {
      const text = input.value.trim();
      if (!text) { grid.innerHTML = ''; return; }
      if (mode === 'word') {
        grid.innerHTML = card(t('wordLabel', 'Standard romanization'), t('wordNote', ''), romanizeText(text, 'word'));
        return;
      }
      const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 20);
      let html = '';
      lines.forEach(line => {
        const r = romanizeName(line);
        if (!r.standard) return;
        html += card(line + ' · ' + t('standardLabel', 'Standard'), t('standardNote', ''), r.standard);
        html += card(line + ' · ' + t('hyphenLabel', 'With hyphen'), t('hyphenNote', ''), r.hyphen);
        html += card(line + ' · ' + t('passportLabel', 'Passport style'), t('passportNote', ''), r.passport);
        if (r.surnameCommon.length) {
          html += card(line + ' · ' + t('surnameLabel', 'Common surname spellings'),
            t('surnameNote', '').replace('{std}', r.surnameStandard),
            r.surnameCommon.map(sn => sn + ' ' + r.standard.split(' ').slice(1).join(' ')).join(' / '));
        }
        if (r.givenOlder) {
          html += card(line + ' · ' + t('olderLabel', 'Older spelling seen in use'), t('olderNote', ''),
            (r.surnameCommon[0] || r.surnameStandard) + ' ' + r.givenOlder);
        }
      });
      grid.innerHTML = html;
    }
    grid.addEventListener('click', function (e) {
      const btn = e.target.closest('.copy-btn');
      if (!btn) return;
      const text = btn.getAttribute('data-text') || '';
      const done = () => { const old = btn.textContent; btn.textContent = t('copied', 'Copied'); setTimeout(() => { btn.textContent = old; }, 1200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
      else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (err) { /* ignore */ } ta.remove(); done(); }
    });
    modeBtns.forEach(b => b.addEventListener('click', function () {
      mode = b.getAttribute('data-romanize-mode');
      modeBtns.forEach(x => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
      input.placeholder = mode === 'word' ? t('placeholderWord', '') : t('placeholderName', '');
      render();
    }));
    input.addEventListener('input', render);
    render();
  });
})(typeof window !== 'undefined' ? window : globalThis);
