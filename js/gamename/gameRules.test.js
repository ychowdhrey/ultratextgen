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

// An unknown game id must not borrow Free Fire's rule (a false all-clear on a paid rename).
const unk = G.analyze("a name that is far too long for any game to accept", "no-such-game");
t("unknown game: level is unknown, not another game's verdict", unk.level, "unknown");
t("unknown game: carries no rule", unk.rule, null);
t("unknown game: says why", unk.issues, ["unknown-game"]);
t("unknown game: no limit is invented", unk.limit, 0);
t("known game is unchanged: ff still fails an over-long name", G.analyze("a name that is far too long for any game to accept", "ff").level, "fail");

// --- Xbox: two length tiers (support.xbox.com gamertag pages, read 2026-11-17) ---
// "Gamertags can be up to 15 characters long, including spaces. They can't start
// with a number. Gamertags that are 13 characters or longer must be unique and
// contain only Latin alphanumeric characters and no special characters."
const xb = (s) => { const r = G.analyze(s, "xbox"); return [r.level, r.effective + "/" + r.limit, r.issues]; };
t("xbox: 12 Latin fits the guaranteed limit", xb("CrimsonSpect"), ["ok", "12/12", []]);
t("xbox: 13 Latin is possible only if unique (warn, not reject)", xb("CrimsonSpectr"), ["warn", "13/15", ["unique-required"]]);
t("xbox: 14 Latin, a ready-made name on the Xbox page", xb("CrimsonSpectre"), ["warn", "14/15", ["unique-required"]]);
t("xbox: 15 Latin with a space is the ceiling", xb("Crimson Spectre"), ["warn", "15/15", ["unique-required"]]);
t("xbox: 16 Latin is over 15", xb("CrimsonSpectreXY"), ["fail", "16/15", ["over-limit"]]);
t("xbox: accented Latin is Latin-based (FAQ), so 14 can be taken if unique", xb("ÉlodieMartinez"), ["warn", "14/15", ["unique-required"]]);
t("xbox: 12 Hangul fits", xb("김민준김민준김민준김민준"), ["ok", "12/12", []]);
t("xbox: 13 Hangul is over the 12 that applies to non-Latin names", xb("김민준김민준김민준김민준김"), ["fail", "13/12", ["over-limit"]]);
t("xbox: 13 mixing Latin and Cyrillic is over 12", xb("AlexАлександр"), ["fail", "13/12", ["over-limit"]]);
t("xbox: cannot start with a number, at any length", xb("1Crimson")[0], "fail");
t("xbox: a symbol is still refused", xb("Sanz★")[2].indexOf("charset") !== -1, true);
t("xbox: the counter stays at the guaranteed 12 for short names", G.analyze("Sanz", "xbox").limit, 12);
t("xbox: a unique-required name reports no over-limit to analytics", G.analyze("CrimsonSpectre", "xbox").effective > G.analyze("CrimsonSpectre", "xbox").limit, false);
t("xbox: the unique note is English and from the rule", G.defaultReason("unique-required", G.RULES.xbox).indexOf("nobody else has") !== -1, true);

// --- Discord: the display name allows non-Latin characters; the username does not ---
// Discord Help, "New Usernames & Display Names" (read 2026-10-08 and 2026-11-17).
const dd = (s) => { const r = G.analyze(s, "discord"); return [r.level, r.issues, r.perChar.filter((p) => p.verdict !== "pass").length]; };
t("discord display: Hangul is the player's name, not an unknown", dd("민준"), ["ok", [], 0]);
t("discord display: Latin-1 accents pass", dd("José"), ["ok", [], 0]);
t("discord display: Devanagari with its vowel signs passes", dd("राहुल"), ["ok", [], 0]);
t("discord display: Han passes", dd("张伟"), ["ok", [], 0]);
t("discord display: Arabic still passes", dd("مرحبا"), ["ok", [], 0]);
t("discord display: 32 characters fit", G.analyze("x".repeat(32), "discord").level, "ok");
t("discord display: 33 characters do not", G.analyze("x".repeat(33), "discord").issues, ["over-limit"]);
t("discord display: a symbol the engine does not know still warns (rendering, not acceptance)", G.analyze("Sanz᭡", "discord").issues, ["unknown-chars"]);
t("discord display: spaces are allowed", G.analyze("Budi Santoso", "discord").level, "ok");
const du = (s) => { const r = G.analyze(s, "discordUsername"); return [r.level, r.issues]; };
t("discord username is its own field", G.RULES.discordUsername.field, "username");
t("discord username: letters, digits, underscore and period", du("jose_99.bot"), ["ok", []]);
t("discord username: capitals are lowered by Discord, not refused", du("JoseBot"), ["ok", []]);
t("discord username: Hangul is refused", du("민준"), ["fail", ["charset"]]);
t("discord username: an accent is refused", du("José"), ["fail", ["charset"]]);
t("discord username: two periods in a row are refused", du("jose..bot"), ["fail", ["charset"]]);
t("discord username: one character is too short", du("a"), ["fail", ["too-short"]]);
t("discord username: 2 characters fit", du("ab"), ["ok", []]);
t("discord username: 33 characters do not", du("a".repeat(33))[1], ["over-limit"]);
t("discord username: a space is refused", du("jose bot")[1].indexOf("space") !== -1, true);

// --- what did NOT change: games without an official character rule ---
t("free fire: Hangul still warns (no published rule; held for the in-game test)", G.analyze("민준", "ff").issues, ["unknown-chars"]);
t("pubg: an accent still warns", G.analyze("José", "pubg").issues, ["unknown-chars"]);
t("mobile legends: Hangul still warns and is too short", G.analyze("민준", "ml").issues, ["too-short", "unknown-chars"]);
t("roblox display name: unchanged, strict", G.analyze("민준", "robloxDisplay").issues, ["too-short", "unknown-chars", "strict-symbols"]);
t("classifyChar is untouched (script.js reads it): Hangul is still unknown", G.classifyChar("민"), "unknown");

// --- a failure says why: English fallback, username fields only ---
t("fallback: Roblox username space has a reason", G.defaultReason("space", G.RULES.roblox).length > 0, true);
t("fallback: Roblox charset uses the validator's wording", G.defaultReason("charset", G.RULES.roblox), "Roblox usernames take only letters A to Z, numbers 0 to 9 and one underscore.");
t("fallback: no sentence for Free Fire's unsourced no-space rule", G.defaultReason("space", G.RULES.ff), "");
t("fallback: no sentence for PUBG's unsourced no-space rule", G.defaultReason("space", G.RULES.pubg), "");
const notesOf = (mount) => walk(mount).filter((n) => /^gr-note gr-note-/.test(n.className)).map((n) => n.textContent);
function typeInto(mount, name) {
  const box = walk(mount).find((n) => n.className === "gr-input");
  box.value = name; box.fire("input");
}
mounts.enRoblox = makeEl("div");
G.initChecker({ mount: "enRoblox", games: ["roblox"], text: { issue: {} } });
typeInto(mounts.enRoblox, "Budi Santoso");
t("English page: a Roblox username with a space says why", notesOf(mounts.enRoblox).length, 2);
mounts.ownText = makeEl("div");
G.initChecker({ mount: "ownText", games: ["roblox"], text: { issue: { space: "PAGE TEXT" } } });
typeInto(mounts.ownText, "Budi Santoso");
t("a page's own string wins over the fallback", notesOf(mounts.ownText)[0], "PAGE TEXT");
mounts.ffSpace = makeEl("div");
G.initChecker({ mount: "ffSpace", games: ["ff"], text: { issue: {} } });
typeInto(mounts.ffSpace, "Budi Santoso");
t("English page: Free Fire space failure gets no invented reason", notesOf(mounts.ffSpace), []);
mounts.pubgOld = makeEl("div");
G.initChecker({ mount: "pubgOld", games: ["pubg"], text: { issue: { "no-space": "PUBG TEXT" } } });
typeInto(mounts.pubgOld, "Budi Santoso");
t("the PUBG page's 'no-space' string stays unshown (unsourced rule, not revived)", notesOf(mounts.pubgOld), []);
mounts.xboxNote = makeEl("div");
G.initChecker({ mount: "xboxNote", games: ["xbox"], text: { issue: {} } });
typeInto(mounts.xboxNote, "CrimsonSpectre");
t("English Xbox page: the unique note shows", notesOf(mounts.xboxNote).length, 1);
document.documentElement = { lang: "ja" };
mounts.jaRoblox = makeEl("div");
G.initChecker({ mount: "jaRoblox", games: ["roblox"], text: { issue: {} } });
typeInto(mounts.jaRoblox, "Budi Santoso");
t("a page in another language gets no English fallback", notesOf(mounts.jaRoblox), []);
delete document.documentElement;

// --- the couple generator: an empty name gets no fit badge ---
new Function(fs.readFileSync(__dirname + "/couple-generator.js", "utf8"))();
["cA", "cB", "cThemes", "cOut"].forEach((id) => { mounts[id] = makeEl(id === "cA" || id === "cB" ? "input" : "div"); });
mounts.cA.value = "";
mounts.cB.value = "Nisa";
window.UltraTextGen.coupleGenerator.init({
  inputAId: "cA", inputBId: "cB", themesId: "cThemes", outputId: "cOut", game: "ff",
  themes: [{ id: "u", label: "u", a: { prefix: "꧁", suffix: "꧂" }, b: { prefix: "꧁", suffix: "꧂" } }],
  text: { statusOk: "OK", statusWarn: "WARN", statusFail: "FAIL" }
});
const badges = mounts.cOut.children.map((card) => walk(card).filter((n) => /^gr-badge/.test(n.className)).length);
t("couple: the empty name's card has no badge, the typed one has one", badges, [0, 1]);

// --- ready-made names on every page meet the sourced rule of the page's own game ---
// A page lists names under one game (its first checker tab). For a game whose
// limit and charset come from the platform itself, a listed name that fails
// that rule is a sample the page should not offer. Games with no published
// rule (Free Fire, PUBG, Mobile Legends, Liên Quân, Standoff 2, TikTok, YouTube
// channel name) are not judged here: their limits are the open question.
const SOURCED = ["stumbleguys", "robloxDisplay", "roblox", "xbox", "psn", "fortnite", "valorant", "vrchat",
  "coc", "clashroyale", "minecraft", "youtubeHandle", "discord", "discordUsername"];
// Pages in a running search-engine indexing measurement keep their HTML as it
// is until that measurement is read, so these names wait for that, not for a
// decision. Each must still fail (a fixed one must leave this list), and no
// other name may.
const HELD = {
  "de/usecase/stumble-guys-namensgenerator/index.html": ["ᴡᴀᴄᴋᴇʟᴘᴜᴅᴅɪɴɢ", "✦ᴄʜᴀᴏꜱɢᴏʙʟɪɴ✦", "꧁ꜱᴄʜʟᴀᴘᴘꜱᴏᴄᴋᴇɴ꧂", "ʙᴀɴᴀɴᴇɴꜱᴄʜᴀʟᴇ", "✧˖°𝕂𝕣𝕚𝕥𝕫𝕖𝕝°˖✧", "•ꜱᴇʀɪᴇɴꜱɪᴇɢᴇʀ•"],
  "fr/usecase/pseudo-stumble-guys/index.html": ["✦ᴄʜᴀᴏꜱɢᴏʙᴇʟɪɴ✦", "⚡ʀᴏɪᴍᴀʟᴀᴅʀᴏɪᴛ⚡", "✧˖°ℂ𝕙𝕠𝕦𝕔𝕙𝕠𝕦°˖✧", "•ᴄʜᴀꜱꜱᴇᴜʀᴅᴇᴄᴏᴜʀᴏɴɴᴇ•", "ᴠɪꜰ", "ʙᴀᴍ"],
  "id/usecase/nama-stumble-guys-keren/index.html": ["꧁ꜱᴇɴɢɢᴏʟꜱᴜɴɢꜱᴀɴɢ꧂", "•ᴘᴇᴍʙᴜʀᴜᴍᴀʜᴋᴏᴛᴀ•"],
  "it/usecase/nomi-stumble-guys/index.html": ["✦ꜰᴏʟʟᴇᴛᴛᴏᴄᴀᴏꜱ✦", "⚡ʀᴇɪᴍᴘᴀᴄᴄɪᴀᴛᴏ⚡", "•ᴄᴀᴄᴄɪᴀᴄᴏʀᴏɴᴀ•"],
  "usecase/stumble-guys-name-generator/index.html": ["✦ᴄʜᴀᴏꜱɢᴏʙʟɪɴ✦", "꧁ꜱʟɪᴘᴘʏꜱᴏᴄᴋꜱ꧂", "ᴋɪɴɢᴏғᴛʜᴇʜɪʟʟ", "•ᴄʀᴏᴡɴᴄʜᴀꜱᴇʀ•"],
  "tr/usecase/stumble-guys-nick/index.html": ["⋆｡˚𝓕𝓪𝓼𝓾𝓵𝔂𝓮˚｡⋆", "✧˖°𝕂𝕒𝕣𝕒𝕝𝕒𝕞𝕒°˖✧", "ᴘᴀᴛ"],
  "pl/usecase/nazwy-do-robloxa/index.html": ["ᴼᴳ"],
  "id/usecase/nama-roblox-keren/index.html": ["ᴼᴳ"]
};
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
function pagesWithChecker(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) pagesWithChecker(full, out);
    else if (e.name === "index.html") out.push(full);
  }
  return out;
}
const unescapeHtml = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const found = {};
let judged = 0, pagesJudged = 0;
for (const file of pagesWithChecker(ROOT, [])) {
  const html = fs.readFileSync(file, "utf8");
  if (html.indexOf("uname-chip") === -1 || html.indexOf("game-rules.js") === -1) continue;
  const m = html.match(/data-games?="([^"]+)"/) || html.match(/games\s*:\s*\[\s*["']([a-zA-Z0-9]+)/);
  const game = m ? m[1].split(",")[0].trim() : null;
  if (SOURCED.indexOf(game) === -1) continue;
  pagesJudged++;
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  for (const mm of html.matchAll(/class="uname-chip[^"]*"[^>]*data-symbol="([^"]+)"/g)) {
    const name = unescapeHtml(mm[1]);
    judged++;
    if (G.analyze(name, game).level === "fail") (found[rel] = found[rel] || []).push(name);
  }
}
t("ready-made names: some pages were judged (the scan is not empty)", pagesJudged > 10 && judged > 150, true);
const unexpected = [];
Object.keys(found).forEach((rel) => found[rel].forEach((n) => { if (!(HELD[rel] || []).includes(n)) unexpected.push(rel + " " + n); }));
t("ready-made names: none breaks its game's sourced rule, outside the held list", unexpected, []);
const stale = [];
Object.keys(HELD).forEach((rel) => HELD[rel].forEach((n) => { if (!(found[rel] || []).includes(n)) stale.push(rel + " " + n); }));
t("ready-made names: every held name still fails (remove fixed ones from HELD)", stale, []);

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
