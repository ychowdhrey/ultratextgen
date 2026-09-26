/*
 * cursiveDemo.js — watch a cursive phrase being written, stroke by stroke.
 *
 * Mounts on [data-cursive-demo]. Draws the phrase's writing route
 * (js/printables/cursiveRouteData.js, built by scripts/build-cursive-routes.js)
 * on ruled lines over a faint copy of the word, one pen stroke at a time: the
 * stroke draws itself at a steady pen speed, a numbered start mark appears
 * where the pencil goes down, and the page's own step list follows along.
 *
 * Native SVG only: stroke-dashoffset along the route, getPointAtLength for the
 * pen tip. No GIF, no video, nothing to download, and the drawing is the same
 * path the printed sheet dots, so the two cannot disagree about where the pen
 * goes.
 *
 * The HTML carries the teaching: the stroke plan, counts and steps are static
 * text in the page, for every reader and every crawler. This module only
 * animates them. It holds no strings of its own; the button and status labels
 * come from the host's data-label-* attributes.
 *
 * prefers-reduced-motion: nothing moves. The finished drawing is shown with its
 * start marks, and the button steps through the strokes one per press.
 *
 * Form picker: buttons carrying [data-cursive-form] switch the phrase (the
 * route must exist for the exact string), show the matching [data-form-block],
 * and raise `utg:cursive-form` on document so the worksheet follows.
 */
(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const FS = 100;                  // the stage's type size, in its own units
  const PEN_SPEED = 2.4;           // em per second along the route
  const LIFT_MS = 380;             // pause where the pencil lifts
  const DOT_MS = 260;              // a dot is put down, not drawn
  const INK = "#1a1a2e";
  const GHOST = "#dfe3ec";
  const RULE = "#b9c0cf";
  const RULE_MID = "#d3d8e3";
  const START = "#2b8a3e";
  const PEN = "#d9480f";
  const TWO_LINE_BELOW = 560;      // stage px under which the words stack

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function fill(tpl, vars) {
    return String(tpl || "").replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
  }
  function el(name, attrs) {
    const n = document.createElementNS(SVGNS, name);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, String(attrs[k])));
    return n;
  }
  function routeFor(font, word) {
    const all = window.UTG_CURSIVE_ROUTE_DATA || {};
    const face = all[font];
    return face && Object.prototype.hasOwnProperty.call(face, word) ? face[word] : null;
  }
  function pathAt(d, ox, by) {
    const nums = String(d).match(/-?\d*\.?\d+(?:e-?\d+)?/g) || [];
    const out = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      out.push((i ? "L" : "M") + (+(ox + Number(nums[i]) * FS).toFixed(2)) + " " + (+(by + Number(nums[i + 1]) * FS).toFixed(2)));
    }
    return out.join(" ");
  }
  /* The face's own heights, measured, so the ruling sits on the letters. */
  function faceMetrics(font, weight) {
    const c = document.createElement("canvas").getContext("2d");
    c.font = weight + " " + FS + "px '" + font + "'";
    const up = (s) => c.measureText(s).actualBoundingBoxAscent / FS;
    const down = (s) => c.measureText(s).actualBoundingBoxDescent / FS;
    return { xh: up("x"), top: Math.max(up("H"), up("dhbklt")), bottom: down("gjpqy") };
  }

  /* The advance of the words before a space, and the space, in em, from the face. */
  function splitAdvance(font, weight, head) {
    const c = document.createElement("canvas").getContext("2d");
    c.font = weight + " " + FS + "px '" + font + "'";
    return c.measureText(head).width / FS;
  }

  function mount(host) {
    const font = host.getAttribute("data-font") || "";
    const stage = host.querySelector(".pt-demo-stage");
    const btn = host.querySelector(".pt-demo-play");
    const status = host.querySelector(".pt-demo-status");
    if (!font || !stage || !btn) return;
    const L = {
      play: host.getAttribute("data-label-play") || "",
      replay: host.getAttribute("data-label-replay") || "",
      next: host.getAttribute("data-label-next") || "",
      stroke: host.getAttribute("data-label-stroke") || "",
      done: host.getAttribute("data-label-done") || "",
      stage: host.getAttribute("data-label-stage") || ""
    };
    const still = reducedMotion();
    let word = host.getAttribute("data-word") || "";
    let parts = [];        // one entry per pen stroke
    let raf = 0;
    let timer = 0;
    let shown = 0;         // reduced motion: strokes revealed so far
    let played = false;
    let layoutStacked = false;

    function steps() {
      const block = document.querySelector('[data-form-block="' + word.replace(/"/g, '\\"') + '"] .pt-demo-steps')
        || host.parentNode.querySelector(".pt-demo-steps");
      return block ? Array.prototype.slice.call(block.querySelectorAll("li")) : [];
    }
    function mark(i) {
      steps().forEach((li, k) => {
        const on = k === i;
        li.classList.toggle("is-current", on);
        if (on) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
    }
    function say(i) {
      if (!status) return;
      status.textContent = i >= parts.length
        ? fill(L.done, { total: parts.length })
        : fill(L.stroke, { n: i + 1, total: parts.length });
    }

    function render() {
      stop();
      const route = routeFor(font, word);
      stage.innerHTML = "";
      parts = [];
      if (!route) { host.hidden = true; return; }
      host.hidden = false;
      const m = faceMetrics(font, route.weight || 400);
      const pad = 0.28 * FS;
      const ox = pad;
      /* A phone is too narrow for a nine-letter phrase on one line: the whole
         thing drew about 60px tall. Each word goes on its own line there.
         Every pen stroke belongs to one word -- the pencil always lifts
         between words -- so a stroke moves to a word's line by where it is. */
      const splits = [];
      if (stage.clientWidth > 0 && stage.clientWidth < TWO_LINE_BELOW) {
        for (let sp = word.indexOf(" "); sp > 0; sp = word.indexOf(" ", sp + 1)) {
          splits.push(splitAdvance(font, route.weight || 400, word.slice(0, sp + 1)));
        }
      }
      layoutStacked = splits.length > 0;
      const lineH = (m.top + m.bottom + 0.42) * FS;
      const by = (m.top + 0.2) * FS;
      const starts = [0].concat(splits), ends = splits.concat([route.advance]);
      const W = Math.max.apply(null, starts.map((a, k) => ends[k] - a)) * FS + 2 * pad;
      const H = by + (m.bottom + 0.16) * FS + splits.length * lineH;
      const svg = el("svg", { viewBox: "0 0 " + (+W.toFixed(1)) + " " + (+H.toFixed(1)), class: "pt-demo-svg", "aria-hidden": "true", focusable: "false" });
      const lines = (splits.length ? word.split(" ") : [word]).map((w, k) => [by + k * lineH, w]);
      // Ruling: top of the tall letters, the x-height (dashed), the baseline.
      lines.forEach((ln0) => {
        const b = ln0[0];
        [[b - m.top * FS, RULE, ""], [b - m.xh * FS, RULE_MID, "6 6"], [b, RULE, ""]].forEach((r) => {
          const ln = el("line", { x1: 0, x2: W, y1: +r[0].toFixed(2), y2: +r[0].toFixed(2), stroke: r[1], "stroke-width": 1.2 });
          if (r[2]) ln.setAttribute("stroke-dasharray", r[2]);
          svg.appendChild(ln);
        });
        const ghost = el("text", { x: ox, y: +b.toFixed(2), "font-family": "'" + font + "'", "font-weight": route.weight || 400, "font-size": FS, fill: GHOST });
        ghost.textContent = ln0[1];
        svg.appendChild(ghost);
      });
      // Where a stroke lands, by an x inside it: line 1 as measured, or a later
      // line moved back by the advance of the words before it and down.
      const place = (sx) => {
        let k = 0;
        while (k < splits.length && sx >= splits[k]) k++;
        return [ox - starts[k] * FS, by + k * lineH];
      };
      const inkG = el("g", { fill: "none", stroke: INK, "stroke-width": +(route.stem * FS).toFixed(2), "stroke-linecap": "round", "stroke-linejoin": "round" });
      const badgeG = el("g", {});
      svg.appendChild(inkG);
      svg.appendChild(badgeG);
      const pen = el("circle", { r: +(route.stem * FS * 0.62).toFixed(2), fill: PEN, opacity: 0 });
      svg.appendChild(pen);
      stage.appendChild(svg);
      route.strokes.forEach((s, i) => {
        let node, sx, sy, len = 0;
        if (s.kind === "dot") {
          const o = place(s.x);
          sx = o[0] + s.x * FS; sy = o[1] + s.y * FS;
          node = el("circle", { cx: +sx.toFixed(2), cy: +sy.toFixed(2), r: +(s.r * FS).toFixed(2), fill: INK, stroke: "none", opacity: 0 });
        } else {
          // By the stroke's median x, not its start: a word's lead-in begins
          // left of the word's own origin, in the space before it.
          const xs = (String(s.d).match(/-?\d*\.?\d+/g) || []).filter((v, k) => k % 2 === 0).map(Number).sort((a, b) => a - b);
          const o = place(xs.length ? xs[xs.length >> 1] : 0);
          const d = pathAt(s.d, o[0], o[1]);
          const mm = /^M(-?[\d.]+) (-?[\d.]+)/.exec(d);
          sx = mm ? Number(mm[1]) : 0; sy = mm ? Number(mm[2]) : 0;
          node = el("path", { d: d });
          inkG.appendChild(node);
          len = node.getTotalLength();
          node.style.strokeDasharray = len + " " + len;
          node.style.strokeDashoffset = String(len);
        }
        if (s.kind === "dot") inkG.appendChild(node);
        const badge = el("g", { opacity: 0 });
        badge.appendChild(el("circle", { cx: +sx.toFixed(2), cy: +sy.toFixed(2), r: 7.5, fill: START }));
        const t = el("text", { x: +sx.toFixed(2), y: +(sy + 0.4).toFixed(2), "text-anchor": "middle", "dominant-baseline": "central", "font-family": "'Plus Jakarta Sans', 'Segoe UI', sans-serif", "font-weight": 700, "font-size": 9.5, fill: "#ffffff" });
        t.textContent = String(i + 1);
        badge.appendChild(t);
        badgeG.appendChild(badge);
        parts.push({ kind: s.kind, node: node, len: len, badge: badge });
      });
      parts.pen = pen;
      if (L.stage) stage.setAttribute("aria-label", fill(L.stage, { word: word, total: parts.length }));
      if (still) { showAll(); btn.textContent = L.next; shown = parts.length; }
      else { btn.textContent = played ? L.replay : L.play; }
      mark(-1);
      if (status) status.textContent = "";
    }

    function setDrawn(p, on) {
      if (p.kind === "dot") p.node.setAttribute("opacity", on ? 1 : 0);
      else p.node.style.strokeDashoffset = on ? "0" : String(p.len);
      p.badge.setAttribute("opacity", on ? 1 : 0);
    }
    function showAll() { parts.forEach((p) => setDrawn(p, true)); }
    function hideAll() { parts.forEach((p) => setDrawn(p, false)); }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      raf = 0; timer = 0;
      if (parts.pen) parts.pen.setAttribute("opacity", 0);
    }

    function play() {
      stop();
      hideAll();
      played = true;
      btn.textContent = L.replay;
      const speed = PEN_SPEED * FS / 1000;    // units per ms
      const run = (i) => {
        if (i >= parts.length) {
          parts.pen.setAttribute("opacity", 0);
          mark(-1); say(parts.length);
          return;
        }
        const p = parts[i];
        p.badge.setAttribute("opacity", 1);
        mark(i); say(i);
        if (p.kind === "dot") {
          parts.pen.setAttribute("opacity", 0);
          timer = setTimeout(() => { p.node.setAttribute("opacity", 1); timer = setTimeout(() => run(i + 1), LIFT_MS); }, DOT_MS);
          return;
        }
        const t0 = performance.now();
        parts.pen.setAttribute("opacity", 1);
        const frame = (now) => {
          const s = Math.min(p.len, (now - t0) * speed);
          p.node.style.strokeDashoffset = String(p.len - s);
          const q = p.node.getPointAtLength(s);
          parts.pen.setAttribute("cx", q.x.toFixed(2));
          parts.pen.setAttribute("cy", q.y.toFixed(2));
          if (s < p.len) { raf = requestAnimationFrame(frame); return; }
          raf = 0;
          parts.pen.setAttribute("opacity", 0);
          timer = setTimeout(() => run(i + 1), LIFT_MS);
        };
        raf = requestAnimationFrame(frame);
      };
      run(0);
    }

    // Reduced motion: each press shows the next stroke, instantly.
    function step() {
      if (shown >= parts.length) { hideAll(); shown = 0; }
      setDrawn(parts[shown], true);
      mark(shown); say(shown);
      shown++;
      btn.textContent = shown >= parts.length ? L.replay : L.next;
    }

    btn.addEventListener("click", () => { if (still) step(); else play(); });

    document.querySelectorAll("[data-cursive-form]").forEach((b) => {
      b.addEventListener("click", () => {
        const w = b.getAttribute("data-cursive-form");
        if (!w || w === word || !routeFor(font, w)) return;
        word = w;
        host.setAttribute("data-word", w);
        document.querySelectorAll("[data-cursive-form]").forEach((x) => {
          const on = x.getAttribute("data-cursive-form") === w;
          x.classList.toggle("is-active", on);
          x.setAttribute("aria-pressed", on ? "true" : "false");
        });
        document.querySelectorAll("[data-form-block]").forEach((blk) => {
          blk.hidden = blk.getAttribute("data-form-block") !== w;
        });
        render();
        if (!still) play();
        document.dispatchEvent(new CustomEvent("utg:cursive-form", { detail: { word: w } }));
      });
    });

    let resizeT = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        const stack = stage.clientWidth > 0 && stage.clientWidth < TWO_LINE_BELOW && word.indexOf(" ") > 0;
        if (stack !== layoutStacked) { render(); if (played && !still) showAll(); }
      }, 150);
    });
    const start = () => {
      render();
      if (still || !("IntersectionObserver" in window)) return;
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting) && !played) { io.disconnect(); play(); }
      }, { threshold: 0.5 });
      io.observe(stage);
    };
    const spec = "400 " + FS + "px '" + font + "'";
    if (document.fonts && document.fonts.load) document.fonts.load(spec).then(start, start);
    else start();
  }

  function init() { document.querySelectorAll("[data-cursive-demo]").forEach(mount); }
  if (document.readyState === "complete") init();
  else window.addEventListener("load", init);
})();
