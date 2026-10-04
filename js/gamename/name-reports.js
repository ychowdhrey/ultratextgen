/* ==========================================================
   name-reports.js
   The public board of names players tried in a game, and whether the
   game took them. Backed by /api/name-reports (functions/api/).

   Data:   one report = { name, outcome, reason, symbols, same, created }
   UI:     UltraTextGen.nameReports.mountBoard(config)
   Write:  UltraTextGen.nameReports.submit(report)   (the name checker's
           "Tried this name in Free Fire?" question calls this)
   Ready:  UltraTextGen.nameReports.available(game) -> Promise<boolean>

   Nothing is fetched with the page. The board asks the API when it scrolls
   into view, and the checker asks only once a player has typed a name, so
   the Function is invoked by people using the feature, not by page views.
   If the API is not switched on (503), the board renders nothing at all
   (its mount stays an empty div) and the checker never asks, so nobody
   answers into a void. The heading and intro are built here from the page's
   own strings, so the page's static markup carries one empty div and no copy
   that would sit on the page with no board under it.

   Every string from a report is set with textContent. A report holds no
   HTML, no links and no free text besides the name, which the API has
   already refused if it looked like a link.
   ========================================================== */
(function () {
  "use strict";

  const ns = (window.UltraTextGen = window.UltraTextGen || {});
  const ENDPOINT = "/api/name-reports";
  const ADMIN_KEY = "utgReportsAdmin";
  const VOTED_KEY = "utgReportsVoted";

  const cache = {};
  const boards = [];
  // Reports this visitor added during this page view. The board's first read
  // may predate them (the checker reads the board to decide whether to ask),
  // so they are merged in on render rather than lost to a cached list.
  const own = {};

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { return null; }
    return null;
  }

  // The owner opens the page once with #reports-admin=<token>; the token is
  // kept in this browser only and the fragment is removed from the address
  // bar. A fragment is never sent to the server or written to its logs.
  (function readAdminHash() {
    const m = /(?:^|[#&])reports-admin=([^&]+)/.exec(location.hash || "");
    if (!m) return;
    const token = decodeURIComponent(m[1]);
    store(ADMIN_KEY, token === "off" ? null : token);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
  })();

  function adminToken() { return store(ADMIN_KEY) || ""; }

  function headers(extra) {
    const h = Object.assign({ "content-type": "application/json" }, extra || {});
    const token = adminToken();
    if (token) h["x-admin-token"] = token;
    return h;
  }

  function load(game, force) {
    if (!force && cache[game]) return cache[game];
    const p = fetch(ENDPOINT + "?game=" + encodeURIComponent(game), {
      headers: adminToken() ? { "x-admin-token": adminToken() } : {},
      cache: force ? "no-store" : "default"
    })
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      });
    cache[game] = p.catch(function () { return null; });
    return cache[game];
  }

  function available(game) {
    return load(game).then(function (data) { return !!data; });
  }

  function post(payload) {
    return fetch(ENDPOINT, { method: "POST", headers: headers(), body: JSON.stringify(payload) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return Object.assign({ status: res.status, ok: res.ok }, data);
        });
      })
      .catch(function () { return { ok: false, error: "network" }; });
  }

  function submit(report) {
    return post(Object.assign({ action: "create" }, report)).then(function (res) {
      if (res.ok && res.report) {
        (own[report.game] = own[report.game] || []).unshift(res.report);
        boards.forEach(function (b) { if (b.game === report.game && b.loaded) b.prepend(res.report); });
      }
      return res;
    });
  }

  function voted() {
    try { return JSON.parse(store(VOTED_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function markVoted(id, kind) {
    const v = voted();
    v[id + ":" + kind] = 1;
    store(VOTED_KEY, JSON.stringify(v));
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  const INVISIBLE = new RegExp("^[\\s\\u00A0\\u115F\\u1160\\u200B-\\u200D\\u2060\\u2800\\u3164\\uFFA0]$");

  function hex(cp) {
    try { return String.fromCodePoint(parseInt(cp, 16)); } catch (e) { return ""; }
  }

  function when(iso, text) {
    const t = Date.parse(iso);
    if (!t) return "";
    const days = Math.floor((Date.now() - t) / 86400000);
    if (days <= 0) return text.today;
    if (days === 1) return text.yesterday;
    if (days < 31) return text.daysAgo.replace("{n}", String(days));
    return new Date(t).toISOString().slice(0, 10);
  }

  const DEFAULT_TEXT = {
    label: "",
    heading: "",
    intro: "",
    empty: "No reports yet. Try a name in the game, then answer the question under the name check above.",
    tallyLabel: "Characters players have tried:",
    tallyRefused: "refused",
    tallyAccepted: "went through",
    tallyBoxes: "boxes",
    accepted: "Went through",
    refused: "Refused",
    boxes: "Shows as boxes",
    reasons: { too_long: "too long", invalid: "invalid characters", sensitive: "sensitive name", taken: "name taken", other: "other" },
    same: "Same for me",
    flag: "Spam",
    flagged: "Thanks, we'll look at it",
    today: "today",
    yesterday: "yesterday",
    daysAgo: "{n} days ago",
    blank: "(blank)",
    copy: "Copy",
    copied: "Copied"
  };

  function mountBoard(config) {
    const cfg = config || {};
    const mount = document.getElementById(cfg.mount);
    if (!mount) return;
    const game = cfg.game || "ff";
    const text = Object.assign({}, DEFAULT_TEXT, cfg.text || {});
    text.reasons = Object.assign({}, DEFAULT_TEXT.reasons, (cfg.text && cfg.text.reasons) || {});
    const tallyRow = el("div", "nr-tally");
    const list = el("ol", "nr-list");
    const status = el("p", "nr-status");

    const board = { game: game, prepend: function () {}, loaded: false };
    boards.push(board);

    function renderTally(tally) {
      tallyRow.textContent = "";
      const top = (tally || []).filter(function (t) { return hex(t.cp); }).slice(0, 12);
      if (!top.length) return;
      tallyRow.appendChild(el("span", "nr-tally-label", text.tallyLabel));
      top.forEach(function (t) {
        const chip = el("span", "nr-chip" + (t.refused > t.accepted ? " nr-chip-bad" : t.accepted ? " nr-chip-good" : ""));
        // Blank characters (the Hangul filler, braille blank, no-break space)
        // are the ones players ask about most and the ones a chip cannot show,
        // so they are labelled by code point instead of an empty pill.
        const ch = hex(t.cp);
        chip.appendChild(INVISIBLE.test(ch)
          ? el("span", "nr-chip-code", "U+" + t.cp + " " + text.blank)
          : el("span", "nr-chip-char", ch));
        const parts = [];
        if (t.refused) parts.push(t.refused + " " + text.tallyRefused);
        if (t.accepted) parts.push(t.accepted + " " + text.tallyAccepted);
        if (t.boxes) parts.push(t.boxes + " " + text.tallyBoxes);
        chip.appendChild(el("span", "nr-chip-count", parts.join(" · ")));
        chip.title = "U+" + t.cp;
        tallyRow.appendChild(chip);
      });
    }

    function voteButton(report, kind, label) {
      const btn = el("button", "nr-btn", label);
      btn.type = "button";
      if (voted()[report.id + ":" + kind]) btn.disabled = true;
      btn.addEventListener("click", function () {
        btn.disabled = true;
        post({ action: kind, id: report.id }).then(function (res) {
          markVoted(report.id, kind);
          if (kind === "same" && res.ok) btn.textContent = text.same + " (" + res.same + ")";
          if (kind === "flag") {
            btn.textContent = text.flagged;
            if (res.status === "flagged") btn.closest(".nr-item").classList.add("nr-item-hidden");
          }
        });
      });
      return btn;
    }

    function adminButtons(item, report) {
      const wrap = el("span", "nr-admin");
      ["hide", "show", "delete"].forEach(function (action) {
        const btn = el("button", "nr-btn nr-btn-admin", action);
        btn.type = "button";
        btn.addEventListener("click", function () {
          post({ action: action, id: report.id }).then(function (res) {
            if (!res.ok) return;
            if (action === "delete") item.remove();
            else {
              item.classList.toggle("nr-item-muted", action === "hide");
              const st = item.querySelector(".nr-state");
              if (st) st.textContent = action === "hide" ? "hidden" : "visible";
            }
          });
        });
        wrap.appendChild(btn);
      });
      return wrap;
    }

    function item(report, admin) {
      const li = el("li", "nr-item nr-item-" + report.outcome);
      if (report.status && report.status !== "visible") li.classList.add("nr-item-muted");
      const head = el("div", "nr-head");
      const name = el("span", "nr-name", report.name);
      name.setAttribute("dir", "auto");
      head.appendChild(name);
      const copy = el("button", "nr-btn nr-copy", text.copy);
      copy.type = "button";
      copy.addEventListener("click", function () {
        if (navigator.clipboard) navigator.clipboard.writeText(report.name).then(function () { copy.textContent = text.copied; });
      });
      head.appendChild(copy);
      li.appendChild(head);

      const meta = el("div", "nr-meta");
      const label = report.outcome === "accepted" ? text.accepted : report.outcome === "boxes" ? text.boxes : text.refused;
      meta.appendChild(el("span", "nr-badge nr-badge-" + report.outcome,
        report.outcome === "refused" && report.reason ? label + ": " + (text.reasons[report.reason] || report.reason) : label));
      meta.appendChild(el("span", "nr-when", when(report.created, text)));
      li.appendChild(meta);

      const actions = el("div", "nr-actions");
      actions.appendChild(voteButton(report, "same", text.same + (report.same ? " (" + report.same + ")" : "")));
      actions.appendChild(voteButton(report, "flag", text.flag));
      if (admin) {
        actions.appendChild(el("span", "nr-state", report.status));
        actions.appendChild(adminButtons(li, report));
      }
      li.appendChild(actions);
      return li;
    }

    function render(data) {
      if (!data) return;
      board.loaded = true;
      mount.textContent = "";
      mount.classList.add("editorial-section", "nr-board");
      if (text.label) mount.appendChild(el("span", "article-section-label", text.label));
      if (text.heading) mount.appendChild(el("h2", null, text.heading));
      if (text.intro) mount.appendChild(el("p", "nr-intro", text.intro));
      mount.appendChild(status);
      mount.appendChild(tallyRow);
      mount.appendChild(list);
      renderTally(data.tally);
      list.textContent = "";
      const ids = {};
      (data.reports || []).forEach(function (r) { ids[r.id] = 1; });
      const rows = (own[game] || []).filter(function (r) { return !ids[r.id]; }).concat(data.reports || []);
      rows.forEach(function (r) { list.appendChild(item(r, data.admin)); });
      status.textContent = rows.length ? "" : text.empty;
      status.hidden = !status.textContent;
      board.prepend = function (report) {
        list.insertBefore(item(report, data.admin), list.firstChild);
        status.hidden = true;
      };
    }

    function start() { load(game, !!adminToken()).then(render); }
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
      }, { rootMargin: "300px" });
      io.observe(mount);
    } else {
      start();
    }
  }

  ns.nameReports = {
    endpoint: ENDPOINT,
    available: available,
    submit: submit,
    mountBoard: mountBoard
  };
})();
