/* ==========================================================
   gameRules.test.js
   Assertions for the name checker's in-game outcome reporter: what a
   name_outcome row may carry, and that it never carries the name.

   No dependencies, no runner:
       node js/gamename/gameRules.test.js
   Exits non-zero if any assertion fails, and prints every assertion.

   Why this exists: the reporter asks players what happened when they
   pasted a name into the game, and a name is personal. A styled name is
   still the name (𝐒𝐚𝐧𝐳 decodes to "Sanz" from its code points alone), so
   the only characters a row may hold are decoration. That is a privacy
   rule no visual check can see, so it is asserted here, on the real
   module, through a minimal stand-in for the DOM.
   ========================================================== */
const fs = require("fs");

// --- a DOM just large enough for initChecker ---
function makeEl(tag) {
  const node = {
    tagName: String(tag).toUpperCase(),
    children: [],
    listeners: {},
    attrs: {},
    hidden: false,
    value: "",
    className: "",
    _text: "",
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    fire(type) { (this.listeners[type] || []).forEach((fn) => fn({ target: this })); },
    querySelectorAll() { return []; },
    closest() { return null; },
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      toggle(c, on) { if (on === undefined ? !this._set.has(c) : on) this._set.add(c); else this._set.delete(c); },
      contains(c) { return this._set.has(c); }
    }
  };
  node.classList = Object.assign({}, node.classList, { _set: new Set() });
  Object.defineProperty(node, "textContent", {
    get() { return this._text + this.children.map((c) => c.textContent).join(""); },
    set(v) { this._text = String(v); this.children = []; }
  });
  Object.defineProperty(node, "innerHTML", {
    get() { return ""; },
    set() { this._text = ""; this.children = []; }
  });
  return node;
}
function walk(node, out) {
  out = out || [];
  out.push(node);
  node.children.forEach((c) => walk(c, out));
  return out;
}

const mounts = {};
global.window = { dataLayer: [] };
global.document = {
  createElement: makeEl,
  getElementById(id) { return mounts[id] || null; },
  addEventListener() {}
};
new Function(fs.readFileSync(__dirname + "/game-rules.js", "utf8"))();
const G = window.UltraTextGen.gameRules;

let fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? "PASS " : "FAIL ") + name + "  got=" + JSON.stringify(got) + (ok ? "" : " want=" + JSON.stringify(want)));
};

// --- outcomeSymbols: decoration in, letters out ---
t("styled letters carry nothing", G.outcomeSymbols("𝐒𝐚𝐧𝐳"), []);
t("circled letters carry nothing", G.outcomeSymbols("ⓢⓐⓝⓩ"), []);
t("full-width letters carry nothing", G.outcomeSymbols("Ｓａｎｚ"), []);
t("small caps carry nothing", G.outcomeSymbols("ꜱᴀɴᴢ"), []);
t("superscripts carry nothing", G.outcomeSymbols("ᵃᵇᶜ"), []);
t("negative circled letters carry nothing", G.outcomeSymbols("🅐🅑"), []);
t("Cyrillic name carries nothing", G.outcomeSymbols("Сергей"), []);
t("Vietnamese name carries nothing", G.outcomeSymbols("Nguyễn"), []);
t("Greek letters carry nothing", G.outcomeSymbols("αβγ"), []);
t("Hangul syllables carry nothing", G.outcomeSymbols("민수"), []);
t("unlisted Han carries nothing", G.outcomeSymbols("张伟"), []);
t("frame symbols are kept", G.outcomeSymbols("꧁Sanz꧂"), ["A9C1", "A9C2"]);
t("Hangul filler U+3164 is kept (palette blank)", G.outcomeSymbols("SanㅤZ"), ["3164"]);
t("palette accent 亗 is kept", G.outcomeSymbols("亗Sanz亗"), ["4E97"]);
t("palette katakana メ is kept", G.outcomeSymbols("メSanz"), ["30E1"]);
t("emoji is kept", G.outcomeSymbols("🔥Sanz"), ["1F525"]);
t("crown is kept", G.outcomeSymbols("♛Sanz"), ["265B"]);
t("repeats count once, in order", G.outcomeSymbols("꧁༒Sanz༒꧂"), ["A9C1", "F12", "A9C2"].map((h) => h.padStart(4, "0")));
t("capped at eight", G.outcomeSymbols("★☆✦✧✩✪✯✰✴✵").length, 8);
t("empty in, empty out", G.outcomeSymbols(""), []);

// --- the reporter is opt-in ---
mounts.plain = makeEl("div");
G.initChecker({ mount: "plain", games: ["ff"], text: {} });
t("no text.outcome, no reporter", walk(mounts.plain).filter((n) => n.className === "gr-outcome").length, 0);

// --- the reporter, end to end ---
mounts.ff = makeEl("div");
G.initChecker({
  mount: "ff",
  games: ["ff"],
  text: {
    outcome: {
      ask: "Tried this name in {game}?",
      accepted: "It went through",
      refused: "It was refused",
      boxes: "It shows as boxes",
      reasonAsk: "What did {game} say?",
      reasons: { too_long: "Too long", invalid: "Invalid characters" },
      thanks: "Thanks."
    }
  }
});
const nodes = () => walk(mounts.ff);
const outcomeBox = nodes().find((n) => n.className === "gr-outcome");
const input = nodes().find((n) => n.className === "gr-input");
const button = (value) => nodes().find((n) => n.getAttribute && n.getAttribute("data-outcome") === value);

t("reporter exists when opted in", !!outcomeBox, true);
t("hidden before the player types anything", outcomeBox.hidden, true);

input.value = "꧁𝐒𝐚𝐧𝐳꧂";
input.fire("input");
t("shown once a name is typed", outcomeBox.hidden, false);
t("{game} is filled with the rule label", outcomeBox.children[0].textContent, "Tried this name in Free Fire?");
t("three answers offered", ["accepted", "refused", "boxes"].map((v) => !!button(v)), [true, true, true]);

const before = window.dataLayer.filter((r) => r.event === "name_outcome").length;
button("refused").fire("click");
t("refused asks why before sending", window.dataLayer.filter((r) => r.event === "name_outcome").length, before);
t("reason question uses the game label", outcomeBox.children[0].textContent, "What did Free Fire say?");
button("too_long").fire("click");

const rows = window.dataLayer.filter((r) => r.event === "name_outcome");
const row = rows[rows.length - 1];
t("one row sent", rows.length - before, 1);
t("row: game", row.check_game, "ff");
t("row: outcome", row.outcome, "refused");
t("row: reason", row.outcome_reason, "too_long");
t("row: checker verdict at the time", row.check_verdict, "ok");
t("row: decoration only", row.name_symbols, "A9C1 A9C2");
t("row: styled-letter count", row.name_styled, 4);
t("row: code points", row.len_codepoints, 6);
t("row: UTF-16 units", row.len_utf16, 10);
t("row: UTF-8 bytes", row.len_utf8, 22);
t("row: every non-ASCII as 2", row.len_x2, 12);
t("row carries no part of the name",
  Object.keys(row).some((k) => typeof row[k] === "string" && /[𝐒𝐚𝐧𝐳]|Sanz/u.test(row[k])), false);
t("every key present, none undefined",
  ["check_game", "check_verdict", "outcome", "outcome_reason", "name_symbols", "name_styled",
   "len_codepoints", "len_utf16", "len_utf8", "len_x2"].every((k) => k in row && row[k] !== undefined), true);
t("thanks shown after sending", outcomeBox.children[0].textContent, "Thanks.");

input.fire("input");
t("same name, no second ask", !!button("accepted"), false);

input.value = "Sanz";
input.fire("input");
button("accepted").fire("click");
const accepted = window.dataLayer.filter((r) => r.event === "name_outcome").slice(-1)[0];
t("accepted row has a null reason, not a missing one", "outcome_reason" in accepted && accepted.outcome_reason === null, true);
t("plain name has no symbols to send", accepted.name_symbols, null);
t("two rows in total", window.dataLayer.filter((r) => r.event === "name_outcome").length - before, 2);

console.log(fail ? "\n" + fail + " assertion(s) failed" : "\nall assertions passed");
process.exit(fail ? 1 : 0);
