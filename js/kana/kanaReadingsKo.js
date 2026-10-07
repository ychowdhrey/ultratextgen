/*
 * kanaReadingsKo.js — Hangul reading line for the Korean kana charts.
 *
 * Keyed by hiragana; the chart engine looks katakana up through its hiragana
 * twin, so one table serves /ko/hiragana-pyo/ and /ko/gatakana-pyo/.
 *
 * The readings follow the convention Korean learner charts use (か=카, つ=츠),
 * not the National Institute of Korean Language loanword rules (word-initial
 * か=가, つ=쓰): a chart teaches the sound of each kana in isolation, and the
 * page explains the difference in its pronunciation notes.
 *
 * approx: true marks a kana whose sound Korean has no letter for. Hangul is
 * the nearest spelling, not an equivalent, and the page says so in plain
 * words next to the chart:
 *   つ/づ/ず  the "ts" and "z" sounds; Korean ㅊ/ㅈ are different consonants
 *   ふ        made with both lips, between ㅎ and ㅍ
 *   ざぜぞ    a buzzing "z"; ㅈ is not the same sound
 *   ん        a nasal whose sound follows the next kana (ㄴ, ㅁ or ㅇ)
 */
(function () {
  "use strict";

  const A = (h) => ({ h: h, approx: true });

  window.UltraKanaReadings = window.UltraKanaReadings || {};
  window.UltraKanaReadings.ko = {
    // Basic (청음)
    "あ": "아", "い": "이", "う": "우", "え": "에", "お": "오",
    "か": "카", "き": "키", "く": "쿠", "け": "케", "こ": "코",
    "さ": "사", "し": "시", "す": "스", "せ": "세", "そ": "소",
    "た": "타", "ち": "치", "つ": A("츠"), "て": "테", "と": "토",
    "な": "나", "に": "니", "ぬ": "누", "ね": "네", "の": "노",
    "は": "하", "ひ": "히", "ふ": A("후"), "へ": "헤", "ほ": "호",
    "ま": "마", "み": "미", "む": "무", "め": "메", "も": "모",
    "や": "야", "ゆ": "유", "よ": "요",
    "ら": "라", "り": "리", "る": "루", "れ": "레", "ろ": "로",
    "わ": "와", "を": "오",
    "ん": A("응"),

    // Voiced and semi-voiced (탁음・반탁음)
    "が": "가", "ぎ": "기", "ぐ": "구", "げ": "게", "ご": "고",
    "ざ": A("자"), "じ": "지", "ず": A("즈"), "ぜ": A("제"), "ぞ": A("조"),
    "だ": "다", "ぢ": "지", "づ": A("즈"), "で": "데", "ど": "도",
    "ば": "바", "び": "비", "ぶ": "부", "べ": "베", "ぼ": "보",
    "ぱ": "파", "ぴ": "피", "ぷ": "푸", "ぺ": "페", "ぽ": "포",

    // Combinations (요음)
    "きゃ": "캬", "きゅ": "큐", "きょ": "쿄",
    "しゃ": "샤", "しゅ": "슈", "しょ": "쇼",
    "ちゃ": "차", "ちゅ": "추", "ちょ": "초",
    "にゃ": "냐", "にゅ": "뉴", "にょ": "뇨",
    "ひゃ": "햐", "ひゅ": "휴", "ひょ": "효",
    "みゃ": "먀", "みゅ": "뮤", "みょ": "묘",
    "りゃ": "랴", "りゅ": "류", "りょ": "료",
    "ぎゃ": "갸", "ぎゅ": "규", "ぎょ": "교",
    "じゃ": "자", "じゅ": "주", "じょ": "조",
    "びゃ": "뱌", "びゅ": "뷰", "びょ": "뵤",
    "ぴゃ": "퍄", "ぴゅ": "퓨", "ぴょ": "표"
  };
})();
