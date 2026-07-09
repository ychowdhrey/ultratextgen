/*
 * katakanaData.js — the katakana syllabary as plain data.
 *
 * Structure mirrors hiraganaData.js exactly (same 46 sounds, same three
 * sections) so the shared kana chart engine renders either from one config.
 * Katakana is the angular kana used mainly for loanwords and foreign names.
 *
 * A cell is { k: kana, r: romaji } or null for a grid gap. Self-registers into
 * the shared window.UltraKanaData registry — no ES modules.
 */
(function () {
  "use strict";

  const c = (k, r) => ({ k: k, r: r });
  const _ = null;

  const GOJUON = {
    key: "gojuon",
    label: "Basic katakana (gojūon)",
    note: "The 46 core kana. Read across each row: a, i, u, e, o.",
    cols: ["a", "i", "u", "e", "o"],
    rows: [
      { g: "—", cells: [c("ア", "a"), c("イ", "i"), c("ウ", "u"), c("エ", "e"), c("オ", "o")] },
      { g: "k", cells: [c("カ", "ka"), c("キ", "ki"), c("ク", "ku"), c("ケ", "ke"), c("コ", "ko")] },
      { g: "s", cells: [c("サ", "sa"), c("シ", "shi"), c("ス", "su"), c("セ", "se"), c("ソ", "so")] },
      { g: "t", cells: [c("タ", "ta"), c("チ", "chi"), c("ツ", "tsu"), c("テ", "te"), c("ト", "to")] },
      { g: "n", cells: [c("ナ", "na"), c("ニ", "ni"), c("ヌ", "nu"), c("ネ", "ne"), c("ノ", "no")] },
      { g: "h", cells: [c("ハ", "ha"), c("ヒ", "hi"), c("フ", "fu"), c("ヘ", "he"), c("ホ", "ho")] },
      { g: "m", cells: [c("マ", "ma"), c("ミ", "mi"), c("ム", "mu"), c("メ", "me"), c("モ", "mo")] },
      { g: "y", cells: [c("ヤ", "ya"), _, c("ユ", "yu"), _, c("ヨ", "yo")] },
      { g: "r", cells: [c("ラ", "ra"), c("リ", "ri"), c("ル", "ru"), c("レ", "re"), c("ロ", "ro")] },
      { g: "w", cells: [c("ワ", "wa"), _, _, _, c("ヲ", "wo")] },
      { g: "n", cells: [c("ン", "n"), _, _, _, _] }
    ]
  };

  const DAKUTEN = {
    key: "dakuten",
    label: "Voiced & semi-voiced (dakuten・handakuten)",
    note: "The same shapes with ゛ or ゜ added — g, z, d, b, p sounds.",
    cols: ["a", "i", "u", "e", "o"],
    rows: [
      { g: "g", cells: [c("ガ", "ga"), c("ギ", "gi"), c("グ", "gu"), c("ゲ", "ge"), c("ゴ", "go")] },
      { g: "z", cells: [c("ザ", "za"), c("ジ", "ji"), c("ズ", "zu"), c("ゼ", "ze"), c("ゾ", "zo")] },
      { g: "d", cells: [c("ダ", "da"), c("ヂ", "ji"), c("ヅ", "zu"), c("デ", "de"), c("ド", "do")] },
      { g: "b", cells: [c("バ", "ba"), c("ビ", "bi"), c("ブ", "bu"), c("ベ", "be"), c("ボ", "bo")] },
      { g: "p", cells: [c("パ", "pa"), c("ピ", "pi"), c("プ", "pu"), c("ペ", "pe"), c("ポ", "po")] }
    ]
  };

  const YOON = {
    key: "yoon",
    label: "Combinations (yōon)",
    note: "A consonant kana + a small ャ, ュ, or ョ.",
    cols: ["ya", "yu", "yo"],
    rows: [
      { g: "ky", cells: [c("キャ", "kya"), c("キュ", "kyu"), c("キョ", "kyo")] },
      { g: "sh", cells: [c("シャ", "sha"), c("シュ", "shu"), c("ショ", "sho")] },
      { g: "ch", cells: [c("チャ", "cha"), c("チュ", "chu"), c("チョ", "cho")] },
      { g: "ny", cells: [c("ニャ", "nya"), c("ニュ", "nyu"), c("ニョ", "nyo")] },
      { g: "hy", cells: [c("ヒャ", "hya"), c("ヒュ", "hyu"), c("ヒョ", "hyo")] },
      { g: "my", cells: [c("ミャ", "mya"), c("ミュ", "myu"), c("ミョ", "myo")] },
      { g: "ry", cells: [c("リャ", "rya"), c("リュ", "ryu"), c("リョ", "ryo")] },
      { g: "gy", cells: [c("ギャ", "gya"), c("ギュ", "gyu"), c("ギョ", "gyo")] },
      { g: "j", cells: [c("ジャ", "ja"), c("ジュ", "ju"), c("ジョ", "jo")] },
      { g: "by", cells: [c("ビャ", "bya"), c("ビュ", "byu"), c("ビョ", "byo")] },
      { g: "py", cells: [c("ピャ", "pya"), c("ピュ", "pyu"), c("ピョ", "pyo")] }
    ]
  };

  window.UltraKanaData = window.UltraKanaData || {};
  window.UltraKanaData.katakana = { sections: [GOJUON, DAKUTEN, YOON] };
})();
