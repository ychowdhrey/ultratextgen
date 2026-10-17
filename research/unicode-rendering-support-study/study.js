/* Unicode Rendering Support Study: the device test and the phone-width figure tables.
   The page is complete without this file. The test draws a short list of characters the way the site's own missing-glyph check does,
   shows what that check concludes, and lets you say what you actually see. Nothing is sent anywhere: the buttons only build text for you
   to copy or to email yourself. */
(function () {
  "use strict";

  if (window.matchMedia("(max-width: 600px)").matches) {
    document.querySelectorAll(".figure-data").forEach(function (d) { d.open = true; });
  }

  const root = document.getElementById("device-test-widget");
  if (!root) return;
  const rows = Array.from(root.querySelectorAll("tr[data-test]"));
  const status = document.getElementById("dt-status");
  const REFERENCES = ["͸", "￿"]; // an unassigned code point and a noncharacter: no font maps either
  const SIZE = 24;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  function draw(text) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.font = "18px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 2, SIZE / 2);
    const d = ctx.getImageData(0, 0, SIZE, SIZE).data;
    let key = "";
    for (let i = 0; i < d.length; i += 4) key += d[i + 3] > 40 ? "1" : "0";
    return key;
  }
  function width(text) { ctx.font = "18px sans-serif"; return ctx.measureText(text).width; }

  function probe(text, isSequence) {
    if (!ctx) return "unknown";
    try {
      const bitmap = draw(text);
      if (REFERENCES.some(function (ref) { return draw(ref) === bitmap; })) return "missing";
      if (isSequence) {
        const one = width("😀"); // one plain emoji
        if (width(text) > one * 1.5) return "missing";
      }
      return "shows";
    } catch (err) { return "unknown"; }
  }

  const verdicts = {};
  rows.forEach(function (row) {
    const id = row.getAttribute("data-test");
    const text = JSON.parse(row.getAttribute("data-text"));
    const v = probe(text, row.getAttribute("data-seq") === "1");
    verdicts[id] = v;
    const cell = row.querySelector("[data-probe]");
    cell.textContent = v === "shows" ? "Shows" : v === "missing" ? "Missing" : "Could not check";
    cell.className = "dt-probe is-" + v;
  });

  function view(id) {
    const picked = root.querySelector('input[name="v-' + id + '"]:checked');
    return picked ? picked.value : "no answer";
  }

  function report() {
    const answered = rows.filter(function (r) { return view(r.getAttribute("data-test")) !== "no answer"; }).length;
    const lines = [
      "Rendering study device test",
      "Browser: " + navigator.userAgent,
      "Platform: " + (navigator.platform || "unknown") + ", language " + (navigator.language || "unknown") + ", pixel ratio " + (window.devicePixelRatio || 1),
      "Answered: " + answered + " of " + rows.length,
      "",
      "id | check said | I see"
    ];
    rows.forEach(function (r) {
      const id = r.getAttribute("data-test");
      lines.push(id + " | " + verdicts[id] + " | " + view(id));
    });
    return { text: lines.join("\n"), answered: answered };
  }

  function say(message) { if (status) status.textContent = message; }

  const mail = document.getElementById("dt-mail");
  const copy = document.getElementById("dt-copy");
  if (mail) mail.addEventListener("click", function () {
    const r = report();
    if (!r.answered) { say("Answer at least one row first."); return; }
    window.location.href = "mailto:hello@ultratextgen.com?subject=" + encodeURIComponent("Rendering study device test") + "&body=" + encodeURIComponent(r.text);
    say("Your email app should open with the results filled in. Nothing is sent until you send it.");
  });
  if (copy) copy.addEventListener("click", function () {
    const r = report();
    if (!r.answered) { say("Answer at least one row first."); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(r.text).then(function () { say("Copied. Paste it into an email to hello@ultratextgen.com."); }, function () { say("Copying was blocked. Select the results below and copy them by hand."); showText(r.text); });
    } else { say("Select the results below and copy them by hand."); showText(r.text); }
  });
  function showText(text) {
    const box = document.getElementById("dt-text");
    if (!box) return;
    box.hidden = false; box.value = text; box.focus(); box.select();
  }
})();
