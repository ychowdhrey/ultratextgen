/* ==========================================================
   gameRules.test.js
   Assertions for the name checker's in-game outcome reporter: which
   characters it tallies (decoration only), when it asks (only once the
   public board says it is on), and what it posts to the board.

   No dependencies, no runner:
       node js/gamename/gameRules.test.js
   Exits non-zero if any assertion fails, and prints every assertion.

   Why this exists: the reporter posts to a public board, so the question
   must not appear where the board is off (a promise nobody keeps), must
   say the name goes public before anyone answers, and must send the
   per-character tally decoration only (a styled letter is just a letter:
   𝐒𝐚𝐧𝐳 decodes to "Sanz"). None of that is visible to a screenshot, so
   it is asserted here, on the real module, through a minimal DOM and a
   stand-in for js/gamename/name-reports.js. The board's server side has
   its own test: scripts/name-reports.test.mjs.
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

// --- Discord's Server Tag: a dedicated 4-character field (Discord Help, read 2026-10-08) ---
const dTag = (s) => G.analyzeTag(s, "discord");
t("discord tag field is dedicated, not folded", dTag("ABCD").kind, "dedicated");
t("discord tag limit is 4", dTag("ABCD").limit, 4);
t("a 4-character tag fits", dTag("ABCD").ok, true);
t("a 5-character tag is too long", dTag("ABCDE").issues, ["too-long"]);
t("a space is not supported", dTag("AB C").issues, ["space"]);
t("letters and digits are the documented set", dTag("AB12").undocumented, false);
t("a special character is unconfirmed, not refused", [dTag("A-B").ok, dTag("A-B").undocumented], [true, true]);
t("a styled tag is unconfirmed, not refused", [dTag("𝐍𝐑𝐆").ok, dTag("𝐍𝐑𝐆").undocumented], [true, true]);
t("a refused tag is a failure, not also unconfirmed", dTag("A B").undocumented, false);
t("an empty tag is not flagged", dTag("").undocumented, false);
t("pubg stays strict ascii (no plainPattern change)", G.analyzeTag("𝐍𝐑𝐆", "pubgPc").issues.includes("charset"), true);
t("discord nickname budget still 32", G.tagBudget("ABCD", "discord", "").limit, 32);
t("fortnite is still folded", G.analyzeTag("ABC", "fortnite").kind, "folded");

// --- the reporter needs a page opt-in AND the board module ---
mounts.plain = makeEl("div");
G.initChecker({ mount: "plain", games: ["ff"], text: {} });
t("no text.outcome, no reporter", walk(mounts.plain).filter((n) => n.className === "gr-outcome").length, 0);

const OUTCOME_TEXT = {
  ask: "Tried this name in {game}?",
  publicNote: "Your answer and this name go on the public player board.",
  accepted: "It went through",
  refused: "It was refused",
  boxes: "It shows as boxes",
  reasonAsk: "What did {game} say?",
  reasons: { too_long: "Too long", invalid: "Invalid characters" },
  sending: "Adding…",
  thanks: "Thanks.",
  errors: { link: "No links.", generic: "Try again." }
};
mounts.nomodule = makeEl("div");
G.initChecker({ mount: "nomodule", games: ["ff"], text: { outcome: OUTCOME_TEXT } });
t("text.outcome without name-reports.js, no reporter", walk(mounts.nomodule).filter((n) => n.className === "gr-outcome").length, 0);

// stand-in board module
const posted = [];
let boardOn = true;
let availableCalls = 0;
let nextReply = { ok: true };
window.UltraTextGen.nameReports = {
  available() { availableCalls++; return Promise.resolve(boardOn); },
  submit(r) { posted.push(r); return Promise.resolve(nextReply); }
};
const tick = () => new Promise((r) => setTimeout(r, 0));

(async () => {
  // board switched off: the question never shows
  boardOn = false;
  mounts.off = makeEl("div");
  G.initChecker({ mount: "off", games: ["ff"], text: { outcome: OUTCOME_TEXT } });
  const offBox = walk(mounts.off).find((n) => n.className === "gr-outcome");
  const offInput = walk(mounts.off).find((n) => n.className === "gr-input");
  offInput.value = "Sanz"; offInput.fire("input"); await tick();
  t("board off: question stays hidden", offBox.hidden, true);
  offInput.value = "Sanz2"; offInput.fire("input"); await tick();
  t("board off: asked the board once, not per keystroke", availableCalls, 1);

  boardOn = true;
  mounts.ff = makeEl("div");
  G.initChecker({ mount: "ff", games: ["ff"], text: { outcome: OUTCOME_TEXT } });
  const nodes = () => walk(mounts.ff);
  const outcomeBox = nodes().find((n) => n.className === "gr-outcome");
  const input = nodes().find((n) => n.className === "gr-input");
  const button = (value) => nodes().find((n) => n.getAttribute && n.getAttribute("data-outcome") === value);

  t("reporter exists when opted in with the module", !!outcomeBox, true);
  t("hidden before the player types anything", outcomeBox.hidden, true);
  t("no board request before the player types", availableCalls, 1);

  input.value = "꧁𝐒𝐚𝐧𝐳꧂";
  input.fire("input");
  await tick();
  t("shown once a name is typed and the board is on", outcomeBox.hidden, false);
  t("{game} is filled with the rule label", outcomeBox.children[0].textContent, "Tried this name in Free Fire?");
  t("says the name goes public before anyone answers", outcomeBox.children[1].textContent, "Your answer and this name go on the public player board.");
  t("three answers offered", ["accepted", "refused", "boxes"].map((v) => !!button(v)), [true, true, true]);

  button("refused").fire("click");
  t("refused asks why before posting", posted.length, 0);
  t("reason question uses the game label", outcomeBox.children[0].textContent, "What did Free Fire say?");
  button("too_long").fire("click");
  t("one report posted", posted.length, 1);
  const row = posted[0];
  t("post: game", row.game, "ff");
  t("post: the name as typed (the board shows it)", row.name, "꧁𝐒𝐚𝐧𝐳꧂");
  t("post: outcome", row.outcome, "refused");
  t("post: reason", row.reason, "too_long");
  t("post: checker verdict at the time", row.verdict, "ok");
  t("post: tally symbols are decoration only", row.symbols, ["A9C1", "A9C2"]);
  t("sending state while the board answers", outcomeBox.children[0].textContent, "Adding…");
  await tick();
  t("thanks once the board accepted it", outcomeBox.children[0].textContent, "Thanks.");

  input.fire("input"); await tick();
  t("same name, no second ask", !!button("accepted"), false);

  nextReply = { ok: false, error: "link" };
  input.value = "visit spam.com";
  input.fire("input"); await tick();
  button("accepted").fire("click"); await tick();
  t("a refusal from the board is shown, not swallowed", outcomeBox.children[0].textContent, "No links.");
  t("accepted post has a null reason", posted[1].reason, null);
  t("plain name has no symbols to tally", posted[1].symbols, []);

  console.log(fail ? "\n" + fail + " assertion(s) failed" : "\nall assertions passed");
  process.exit(fail ? 1 : 0);
})();
