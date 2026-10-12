/*
 * jaSheetData.js — the character sets, romanisation tables and placement data
 * behind the Japanese worksheet engine (js/printables/jaSheets.js).
 *
 * Pure data plus a few pure functions, no DOM: it loads in Node for
 * js/printables/jaSheets.test.js as well as in the page. Exposes
 * window.UTG_JA_DATA (or module.exports).
 *
 * What is here and where each fact comes from:
 *
 * - Kana sets. 清音 (gojuon), 濁音, 半濁音, 拗音 and the small kana are the
 *   sets Japanese first-grade kana teaching groups them into. ゐ and ゑ are
 *   left out on purpose: no school table teaches them for writing today.
 * - Katakana extras: ー (長音符), ヴ and the combinations the 1991 内閣告示
 *   「外来語の表記」 lists in its first table (ファ, ティ, チェ, シェ, ジェ ...).
 * - Romanisation. Two tables, never mixed on one sheet: the Hepburn-based
 *   spelling of the current 令和7年内閣告示第4号 (2025-12-22), and 訓令式 from
 *   the repealed 1954 notice, kept for comparison. See toRomaji().
 * - VERT_SHIFT: how far a small kana or a comma/full stop moves up and right
 *   when a column is written vertically. Measured from the face's own `vert`
 *   GSUB alternates (Klee One SemiBold, 2026-10-04) as the bounding-box offset
 *   between the horizontal glyph and its vertical alternate, in em. The engine
 *   applies it as a transform rather than relying on font-feature-settings,
 *   because the PDF exporter clones computed styles from a fixed list and
 *   would drop a feature setting in silence; a transform is an attribute and
 *   survives.
 * - VERT_ROTATE: characters whose vertical form is the horizontal glyph turned
 *   a quarter clockwise about the em-box centre (ー, brackets, ～, …). Checked
 *   against the same alternates: 「 rotated lands within 15 units of U+FE41.
 */
(function (root) {
  "use strict";

  // Rows of the 50-sound table, in teaching order. Empty slots keep the grid.
  const H_ROWS = [
    ["あ行", "あいうえお"], ["か行", "かきくけこ"], ["さ行", "さしすせそ"],
    ["た行", "たちつてと"], ["な行", "なにぬねの"], ["は行", "はひふへほ"],
    ["ま行", "まみむめも"], ["や行", "や　ゆ　よ"], ["ら行", "らりるれろ"],
    ["わ行", "わ　　　を"], ["ん", "ん"]
  ];
  const H_DAKU = [["が行", "がぎぐげご"], ["ざ行", "ざじずぜぞ"], ["だ行", "だぢづでど"], ["ば行", "ばびぶべぼ"]];
  const H_HANDAKU = [["ぱ行", "ぱぴぷぺぽ"]];
  const H_SMALL = "ぁぃぅぇぉっゃゅょゎ";
  const YOON_HEADS = "きしちにひみりぎじびぴ";

  function toKata(s) {
    return String(s).replace(/[ぁ-ゖ]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) + 0x60);
    });
  }
  function yoon(heads) {
    const out = [];
    heads.split("").forEach(function (h) { ["ゃ", "ゅ", "ょ"].forEach(function (s) { out.push(h + s); }); });
    return out;
  }
  function chars(rows) {
    const out = [];
    rows.forEach(function (r) { Array.from(r[1]).forEach(function (c) { if (c !== "　") out.push(c); }); });
    return out;
  }

  const HIRAGANA = {
    rows: H_ROWS.concat(H_DAKU, H_HANDAKU),
    sets: {
      seion: { label: "清音（あ〜ん）", chars: chars(H_ROWS) },
      dakuon: { label: "濁音（が・ざ・だ・ば行）", chars: chars(H_DAKU) },
      handakuon: { label: "半濁音（ぱ行）", chars: chars(H_HANDAKU) },
      komoji: { label: "小さい字（ゃ・ゅ・ょ・っ など）", chars: Array.from(H_SMALL) },
      yoon: { label: "拗音（きゃ・しゅ・ちょ など）", chars: yoon(YOON_HEADS) }
    }
  };

  const K_EXTRA = ["ー", "ヴ", "ファ", "フィ", "フェ", "フォ", "ティ", "ディ", "デュ", "チェ", "シェ", "ジェ", "ウィ", "ウェ", "ウォ", "ヴァ", "ツァ"];
  const KATAKANA = {
    rows: HIRAGANA.rows.map(function (r) { return [toKata(r[0].replace("行", "")) + "行", toKata(r[1])]; }),
    sets: {
      seion: { label: "清音（ア〜ン）", chars: chars(H_ROWS).map(toKata) },
      dakuon: { label: "濁音（ガ・ザ・ダ・バ行）", chars: chars(H_DAKU).map(toKata) },
      handakuon: { label: "半濁音（パ行）", chars: chars(H_HANDAKU).map(toKata) },
      komoji: { label: "小さい字（ャ・ュ・ョ・ッ など）", chars: Array.from(toKata(H_SMALL)).concat(["ヵ", "ヶ"]) },
      yoon: { label: "拗音（キャ・シュ・チョ など）", chars: yoon(YOON_HEADS).map(toKata) },
      gairaigo: { label: "のばす音・外来語の音（ー・ファ・ティ など）", chars: K_EXTRA },
      // The pairs children confuse most, practised side by side: シ/ツ and ソ/ン
      // differ only in where the dots sit and which way the last stroke goes.
      niteiru: { label: "似ている字（シ・ツ・ソ・ン など）", chars: ["シ", "ツ", "ソ", "ン", "ク", "ケ", "タ", "ヌ", "ス", "ワ", "ウ", "チ", "テ"] }
    }
  };
  // Row labels for katakana read better as ア行, カ行 ... (toKata turned 行 into itself).
  KATAKANA.rows = HIRAGANA.rows.map(function (r) {
    const head = r[0] === "ん" ? "ン" : toKata(r[0].charAt(0)) + "行";
    return [head, toKata(r[1])];
  });

  /* Example words for the coloring sheet: one everyday noun a young child knows
     that starts with each kana. を and ん start no word and get none. */
  const NURIE_WORDS = {
    "あ": "あめ", "い": "いぬ", "う": "うし", "え": "えんぴつ", "お": "おにぎり",
    "か": "かさ", "き": "きりん", "く": "くま", "け": "けむし", "こ": "こま",
    "さ": "さる", "し": "しか", "す": "すいか", "せ": "せみ", "そ": "そら",
    "た": "たこ", "ち": "ちず", "つ": "つき", "て": "てがみ", "と": "とけい",
    "な": "なす", "に": "にんじん", "ぬ": "ぬいぐるみ", "ね": "ねこ", "の": "のり",
    "は": "はな", "ひ": "ひこうき", "ふ": "ふね", "へ": "へび", "ほ": "ほし",
    "ま": "まど", "み": "みかん", "む": "むし", "め": "めがね", "も": "もも",
    "や": "やま", "ゆ": "ゆき", "よ": "よっと", "ら": "らっぱ", "り": "りんご",
    "る": "るすばん", "れ": "れもん", "ろ": "ろうそく", "わ": "わに",
    "が": "がっこう", "ぎ": "ぎゅうにゅう", "ぐ": "ぐんて", "げ": "げた", "ご": "ごま",
    "ざ": "ざる", "じ": "じてんしゃ", "ず": "ずかん", "ぜ": "ぜんまい", "ぞ": "ぞう",
    "だ": "だんご", "ぢ": "", "づ": "", "で": "でんしゃ", "ど": "どんぐり",
    "ば": "ばなな", "び": "びすけっと", "ぶ": "ぶどう", "べ": "べんとう", "ぼ": "ぼうし",
    "ぱ": "ぱん", "ぴ": "ぴあの", "ぷ": "ぷりん", "ぺ": "ぺんぎん", "ぽ": "ぽすと"
  };

  /* ---- Romanisation --------------------------------------------------- */
  const VOW = { a: 0, i: 1, u: 2, e: 3, o: 4 };
  function row5(kana, k, h) {
    const out = {};
    Array.from(kana).forEach(function (c, i) { if (c !== "　") out[c] = [k[i], h[i]]; });
    return out;
  }
  const BASE = {};
  function add(o) { for (const k in o) BASE[k] = o[k]; }
  add(row5("あいうえお", ["a", "i", "u", "e", "o"], ["a", "i", "u", "e", "o"]));
  add(row5("かきくけこ", ["ka", "ki", "ku", "ke", "ko"], ["ka", "ki", "ku", "ke", "ko"]));
  add(row5("さしすせそ", ["sa", "si", "su", "se", "so"], ["sa", "shi", "su", "se", "so"]));
  add(row5("たちつてと", ["ta", "ti", "tu", "te", "to"], ["ta", "chi", "tsu", "te", "to"]));
  add(row5("なにぬねの", ["na", "ni", "nu", "ne", "no"], ["na", "ni", "nu", "ne", "no"]));
  add(row5("はひふへほ", ["ha", "hi", "hu", "he", "ho"], ["ha", "hi", "fu", "he", "ho"]));
  add(row5("まみむめも", ["ma", "mi", "mu", "me", "mo"], ["ma", "mi", "mu", "me", "mo"]));
  add(row5("や　ゆ　よ", ["ya", "", "yu", "", "yo"], ["ya", "", "yu", "", "yo"]));
  add(row5("らりるれろ", ["ra", "ri", "ru", "re", "ro"], ["ra", "ri", "ru", "re", "ro"]));
  add(row5("わ　　　を", ["wa", "", "", "", "o"], ["wa", "", "", "", "o"]));
  add(row5("がぎぐげご", ["ga", "gi", "gu", "ge", "go"], ["ga", "gi", "gu", "ge", "go"]));
  add(row5("ざじずぜぞ", ["za", "zi", "zu", "ze", "zo"], ["za", "ji", "zu", "ze", "zo"]));
  add(row5("だぢづでど", ["da", "zi", "zu", "de", "do"], ["da", "ji", "zu", "de", "do"]));
  add(row5("ばびぶべぼ", ["ba", "bi", "bu", "be", "bo"], ["ba", "bi", "bu", "be", "bo"]));
  add(row5("ぱぴぷぺぽ", ["pa", "pi", "pu", "pe", "po"], ["pa", "pi", "pu", "pe", "po"]));
  BASE["ん"] = ["n", "n"];
  BASE["ぁ"] = ["a", "a"]; BASE["ぃ"] = ["i", "i"]; BASE["ぅ"] = ["u", "u"];
  BASE["ぇ"] = ["e", "e"]; BASE["ぉ"] = ["o", "o"]; BASE["ゎ"] = ["wa", "wa"];
  const YOON_R = {
    "き": ["ky", "ky"], "し": ["sy", "sh"], "ち": ["ty", "ch"], "に": ["ny", "ny"],
    "ひ": ["hy", "hy"], "み": ["my", "my"], "り": ["ry", "ry"], "ぎ": ["gy", "gy"],
    "じ": ["zy", "j"], "ぢ": ["zy", "j"], "び": ["by", "by"], "ぴ": ["py", "py"]
  };
  const SMALL_Y = { "ゃ": "a", "ゅ": "u", "ょ": "o" };
  // Katakana-only sounds (外来語). 訓令式 第1表 has no spelling for them, so both
  // columns carry the conventional Hepburn-style form, and the engine says so.
  const KATA_EXTRA_R = {
    "ファ": "fa", "フィ": "fi", "フェ": "fe", "フォ": "fo", "ティ": "ti", "ディ": "di",
    "デュ": "dyu", "チェ": "che", "シェ": "she", "ジェ": "je", "ウィ": "wi", "ウェ": "we",
    "ウォ": "wo", "ヴァ": "va", "ヴ": "vu", "ツァ": "tsa"
  };
  const LONG_MARK = { kunrei: { a: "â", i: "î", u: "û", e: "ê", o: "ô" }, hepburn: { a: "ā", i: "ī", u: "ū", e: "ē", o: "ō" } };

  function toHira(s) {
    return String(s).replace(/[ァ-ヶ]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    });
  }

  /* Kana to romaji, one system at a time.

     "hepburn" is the spelling of the CURRENT notice: 令和7年内閣告示第4号
     「ローマ字のつづり方」 (2025-12-22), which replaced the 1954 notice and is
     Hepburn-based. Its rules, as 文化庁's own Q&A (2026-02) states them:
     - っ ALWAYS doubles the first consonant: maccha, not matcha (the old
       passport "tch" is not the notice's rule; established spellings such as
       the brand "matcha" are respected as proper nouns, which a converter
       cannot know).
     - ん is always n, never m before b/m/p (Shinbashi, not Shimbashi).
     - ん before a vowel or y takes an apostrophe (kin'en, tan'i).
     - ー lengthens the previous vowel with a macron (ā); ^ is also allowed.
     "kunrei" is 訓令式 (第1表 of the repealed 1954 notice), kept because the
     materials many families and classrooms still hold use it. ー takes ^.
     - おう / えい and other kana-spelled long vowels are written as they are
       spelled. Whether おう is a long o (とうきょう) or o + u (おもう) depends on
       the word, not the kana, so a converter cannot decide it; the page says so
       rather than guessing. */
  function toRomaji(input, system) {
    const col = system === "kunrei" ? 0 : 1;
    const s = Array.from(String(input || ""));
    let out = "", geminate = false, lastVowel = "";
    for (let i = 0; i < s.length; i++) {
      const c = s[i], next = s[i + 1] || "";
      const two = c + next;
      if (KATA_EXTRA_R[two]) { emit(KATA_EXTRA_R[two]); i++; continue; }
      if (KATA_EXTRA_R[c] && c === "ヴ") { emit(KATA_EXTRA_R[c]); continue; }
      const h = toHira(c), hn = toHira(next);
      if (c === "ー") {
        if (lastVowel) { out = out.slice(0, -1) + LONG_MARK[system === "kunrei" ? "kunrei" : "hepburn"][lastVowel]; lastVowel = ""; }
        continue;
      }
      if (h === "っ") { geminate = true; continue; }
      if (YOON_R[h] && SMALL_Y[hn]) { emit(YOON_R[h][col] + SMALL_Y[hn]); i++; continue; }
      if (h === "ん") {
        const after = toHira(next);
        const nr = BASE[after] ? BASE[after][col] : (YOON_R[after] ? YOON_R[after][col] : "");
        out += (nr && (/^[aiueoy]/).test(nr)) ? "n'" : "n";
        lastVowel = "";
        continue;
      }
      if (BASE[h]) { emit(BASE[h][col]); continue; }
      // Anything else (Latin, digits, punctuation, kanji) passes through.
      flush(); out += c; lastVowel = "";
    }
    flush();
    return out;
    function emit(r) {
      if (geminate) {
        out += r.charAt(0);
        geminate = false;
      }
      out += r;
      lastVowel = (r.slice(-1) in VOW) ? r.slice(-1) : "";
    }
    // A trailing っ (an exclamation like あっ) has no consonant to double.
    function flush() { geminate = false; }
  }

  /* Word lists for the romaji sheet. Each word is spelled the same in both
     systems' rules except where the table differs, and none contains a long
     vowel, so no converter ambiguity reaches a preset. */
  const ROMAJI_WORDS = {
    animals: { label: "どうぶつ", words: ["いぬ", "ねこ", "うさぎ", "さる", "くま", "きりん", "ぱんだ", "らいおん", "しか", "たぬき"] },
    food: { label: "たべもの", words: ["りんご", "みかん", "すいか", "いちご", "おにぎり", "たまご", "ぱん", "もも", "なす", "とまと"] },
    school: { label: "がっこう", words: ["えんぴつ", "けしごむ", "のーと", "つくえ", "いす", "ほん", "かばん", "ふでばこ", "こくばん", "ちず"] },
    small: { label: "小さい「っ」「ゃゅょ」", words: ["きって", "らっぱ", "しゃしん", "ちゃわん", "きんぎょ", "じてんしゃ", "がっき", "まっち", "おちゃ", "しゅくだい"] }
  };

  const VERT_SHIFT = {"ぁ":[0.138,0.105],"ぃ":[0.133,0.13],"ぅ":[0.129,0.1],"ぇ":[0.138,0.111],"ぉ":[0.142,0.107],"っ":[0.139,0.137],"ゃ":[0.13,0.1],"ゅ":[0.121,0.107],"ょ":[0.125,0.11],"ゎ":[0.11,0.084],"ゕ":[0.131,0.111],"ゖ":[0.126,0.108],"ァ":[0.127,0.089],"ィ":[0.122,0.078],"ゥ":[0.122,0.08],"ェ":[0.118,0.141],"ォ":[0.128,0.08],"ッ":[0.128,0.102],"ャ":[0.13,0.09],"ュ":[0.123,0.136],"ョ":[0.157,0.133],"ヮ":[0.121,0.087],"ヵ":[0.146,0.077],"ヶ":[0.125,0.072],"。":[0.57,0.618],"、":[0.624,0.652],"，":[0.667,0.709],"．":[0.652,0.701]};
  const VERT_ROTATE = "ー〜～…‥「」『』（）()［］【】〔〕＜＞《》〈〉―－—";

  /* Input normalisation. NFC everywhere EXCEPT CJK compatibility ideographs
     (U+F900–FAFF, U+2F800–2FA1F): NFC would replace most of them with their
     unified twin, and in a name that difference is the point (a family that
     writes its name with a particular form wants that form). The 12 unified
     ideographs that live in that block, such as 﨑 U+FA11, have no
     decomposition and are untouched either way. Half-width katakana become
     full-width (ｶﾀｶﾅ → カタカナ, ｶﾞ → ガ), a spacing dakuten after kana joins
     it (か゛ → が), and full-width Latin/digits become ASCII only when the
     caller asks (Latin sheets), never on a kana sheet's own characters. */
  const HALF = "｡｢｣､･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";
  const FULL = "。「」、・ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン";
  function isCompat(cp) { return (cp >= 0xF900 && cp <= 0xFAFF) || (cp >= 0x2F800 && cp <= 0x2FA1F); }
  function normalize(input, opts) {
    opts = opts || {};
    let s = String(input == null ? "" : input);
    // 1. half-width katakana (and its separate voicing marks) to full-width
    s = s.replace(/[｡-ﾝ]/g, function (c) { return FULL.charAt(HALF.indexOf(c)); })
      .replace(/ﾞ/g, "゙").replace(/ﾟ/g, "゚");
    // 2. spacing voicing marks after kana become combining marks
    s = s.replace(/([ぁ-ゖァ-ヺ])[゛]/g, "$1゙")
      .replace(/([ぁ-ゖァ-ヺ])[゜]/g, "$1゚");
    // 3. NFC, run by run, leaving compatibility ideographs exactly as typed
    let out = "", run = "";
    Array.from(s).forEach(function (ch) {
      if (isCompat(ch.codePointAt(0))) { out += run.normalize("NFC") + ch; run = ""; }
      else run += ch;
    });
    out += run.normalize("NFC");
    // 4. optional: full-width ASCII to ASCII (for Latin sheets)
    if (opts.latin) {
      out = out.replace(/[！-～]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
        .replace(/　/g, " ");
    }
    // 5. collapse whitespace runs, trim, strip control characters
    out = out.replace(/[\u0000-\u001F\u007F]/g, "").replace(/[ 　]+/g, function (m) { return m.charAt(0); }).trim();
    return out;
  }

  /* One user-perceived character per cell. Intl.Segmenter where available;
     otherwise code points with any combining mark or variation selector kept
     on the character before it, so が written as か+U+3099 or 葛+VS17 never
     splits across two cells. */
  function graphemes(s) {
    s = String(s || "");
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(s), function (x) { return x.segment; });
    }
    const out = [];
    Array.from(s).forEach(function (c) {
      const cp = c.codePointAt(0);
      const joins = (cp >= 0x0300 && cp <= 0x036F) || cp === 0x3099 || cp === 0x309A ||
        (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF) || cp === 0x200D;
      if (joins && out.length) out[out.length - 1] += c; else out.push(c);
    });
    return out;
  }

  /* What script a typed name is in, which decides the sheet: a masu grid for
     kana and kanji, the four-line ruling for Latin. Mixed input is "mixed"
     and the engine lays each run out where it belongs. */
  function scriptOf(s) {
    let k = 0, l = 0, other = 0;
    Array.from(String(s || "")).forEach(function (c) {
      const cp = c.codePointAt(0);
      if (c === " " || c === "　") return;
      if ((cp >= 0x3040 && cp <= 0x30FF) || (cp >= 0x3400 && cp <= 0x9FFF) || (cp >= 0xF900 && cp <= 0xFAFF) ||
          (cp >= 0x20000 && cp <= 0x3FFFF) || cp === 0x3005 || cp === 0x3006 || cp === 0x30FC) k++;
      else if ((cp >= 0x41 && cp <= 0x5A) || (cp >= 0x61 && cp <= 0x7A) || (cp >= 0xC0 && cp <= 0x17F)) l++;
      else other++;
    });
    if (k && !l) return "ja";
    if (l && !k) return "latin";
    if (k && l) return "mixed";
    return other ? "other" : "empty";
  }

  const api = {
    HIRAGANA: HIRAGANA, KATAKANA: KATAKANA, NURIE_WORDS: NURIE_WORDS,
    ROMAJI_WORDS: ROMAJI_WORDS, KATA_EXTRA_R: KATA_EXTRA_R,
    VERT_SHIFT: VERT_SHIFT, VERT_ROTATE: VERT_ROTATE,
    toKata: toKata, toHira: toHira, toRomaji: toRomaji,
    normalize: normalize, graphemes: graphemes, scriptOf: scriptOf
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.UTG_JA_DATA = api;
})(typeof window !== "undefined" ? window : this);
