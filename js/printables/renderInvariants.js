/*
 * renderInvariants.js — the geometry a printable sheet must satisfy, as
 * functions rather than as prose.
 *
 * WHY THIS IS A MODULE AND NOT A TEST. Three renderers draw every sheet on
 * this site: the SVG/DOM preview, the Canvas PNG builders, and the PDF
 * rasteriser, which repaints a CLONE of the print surface. A defect can live
 * in any one of them, and the rules it breaks are the same rules in all three
 * — "two regions of a page may not overlap", "nothing may sit outside the
 * paper", "a box's children may not escape it". Writing those rules once, over
 * a plain description of boxes, is what lets one assertion be run against the
 * DOM, against the clone the exporter builds, and against a recorded fixture
 * in a node test with no browser at all.
 *
 * WHY GEOMETRY AND NOT PIXELS. A pixel snapshot of a printable is noisy in
 * exactly the way that teaches people to ignore a check: rasterisation differs
 * between machines, webfont delivery varies, antialiasing shifts. "the clue
 * list ends 476px below the box it is inside" is the same number everywhere,
 * and it is the defect rather than a proxy for it. (docs/printables/
 * render-regression-plan.md makes the same call for the same reason.)
 *
 * THE SHAPE. Everything takes a NODE:
 *
 *   { id, box: {x, y, w, h}, clips, children: [] }
 *
 * `box` is in one coordinate space — the sheet's own, with the page unit's
 * top-left at (0,0). `clips` is true when the node's overflow is not visible,
 * which is the difference between a child that escapes and a child that is cut
 * off. describe() builds that from a live DOM subtree; a node test hands in a
 * literal.
 *
 * Exposes window.UltraTextGen.renderInvariants (and module.exports under node):
 *   overlaps(node, opts)      sibling regions sharing space
 *   spills(node, opts)        children escaping a parent that does not clip
 *   outOfBounds(node, width)  anything outside the printable width
 *   fitScale(contentH, pageH) what the rasteriser must shrink a page by
 *   check(node, opts)         all of the above, as one violation list
 *   describe(el, opts)        a live DOM subtree, as a node  [browser only]
 */
(function () {
  "use strict";
  const root = typeof window !== "undefined" ? window : globalThis;
  const ns = root.UltraTextGen = root.UltraTextGen || {};
  if (ns.renderInvariants) return;

  /* Tolerances, and why they are not zero.

     A browser reports sub-pixel rectangles, and two boxes that touch report an
     intersection of a few hundredths of a pixel. AREA_TOL is in square pixels
     and EDGE_TOL in pixels; both are below anything a reader could see and far
     above float noise. They are deliberately NOT settings: a check whose
     threshold is tuned per page is a check that gets tuned until it passes. */
  const AREA_TOL = 1;
  const EDGE_TOL = 1.5;

  function area(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return (w > 0 && h > 0) ? w * h : 0;
  }
  function visible(n) { return n && n.box && n.box.w > 0.5 && n.box.h > 0.5; }
  function kids(n) { return (n && n.children) || []; }

  /* INVARIANT 1 — two regions of a page may not occupy the same space.

     Applied to SIBLINGS at every depth, because siblings in normal flow have
     no business overlapping: if they do, something was positioned or sized by
     a number rather than by the flow. Non-siblings are excluded on purpose —
     a child inside its parent overlaps it by definition, and reporting that
     would bury the real finding. */
  function overlaps(node, opts) {
    const o = opts || {};
    const tol = o.areaTol == null ? AREA_TOL : o.areaTol;
    const out = [];
    (function walk(parent) {
      const list = kids(parent).filter(visible);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          const ov = area(a.box, b.box);
          if (ov > tol) out.push({ code: "COLLIDE", a: a.id, b: b.id, area: ov, parent: parent.id });
        }
      }
      list.forEach(walk);
    })(node);
    return out;
  }

  /* INVARIANT 2 — a box's children stay inside it unless it clips them.

     This is the one the DOM cannot show you. The PDF exporter pins width and
     height from the original layout onto a clone and then re-lays the contents
     out; when a property that produced that layout is not carried across, the
     children reflow inside a box that still reports the old size and paint over
     whatever follows it. In the DOM the box and its siblings are correct, so
     every overlap assertion passes and the file is still wrong. */
  function spills(node, opts) {
    const o = opts || {};
    const tol = o.edgeTol == null ? EDGE_TOL : o.edgeTol;
    const out = [];
    (function walk(parent) {
      if (!parent.clips) {
        for (const k of kids(parent)) {
          if (!visible(k)) continue;
          const below = (k.box.y + k.box.h) - (parent.box.y + parent.box.h);
          const right = (k.box.x + k.box.w) - (parent.box.x + parent.box.w);
          if (below > tol || right > tol) {
            out.push({ code: "SPILL", parent: parent.id, child: k.id, below: below, right: right });
          }
        }
      }
      kids(parent).forEach(walk);
    })(node);
    return out;
  }

  /* INVARIANT 3 — nothing sits outside the printable width.

     The exporter paints the clone into a foreignObject of exactly the page's
     content width, with overflow hidden, so anything past that edge is not
     "off to the side" in the file: it is gone. */
  function outOfBounds(node, width, opts) {
    const o = opts || {};
    const tol = o.edgeTol == null ? EDGE_TOL : o.edgeTol;
    const out = [];
    (function walk(n) {
      if (visible(n) && n !== node) {
        const over = Math.max(0, (n.box.x + n.box.w) - width) + Math.max(0, -n.box.x);
        if (over > tol) out.push({ code: "OUT-OF-BOUNDS", el: n.id, over: over });
      }
      kids(n).forEach(walk);
    })(node);
    return out;
  }

  /* INVARIANT 4 — a page is not made to fit by shrinking it.

     renderPages() scales a page unit that overruns its box by `fit`, which is
     the right last resort and the wrong primary mechanism: at fit 0.58 a
     word search prints at 58% of its designed size in the middle of an
     otherwise empty landscape sheet. The number is reported rather than
     judged; a caller decides what it will tolerate. */
  function fitScale(contentH, pageH) {
    if (!(contentH > 0) || !(pageH > 0)) return 1;
    return Math.min(1, pageH / contentH);
  }

  function check(node, opts) {
    const o = opts || {};
    const found = overlaps(node, o).concat(spills(node, o));
    if (o.width) found.push.apply(found, outOfBounds(node, o.width, o));
    if (o.pageHeight && node.box) {
      const fit = fitScale(node.box.h, o.pageHeight);
      const floor = o.fitFloor == null ? 0.95 : o.fitFloor;
      if (fit < floor) found.push({ code: "FIT-SHRINK", el: node.id, fit: fit, contentH: node.box.h, pageH: o.pageHeight });
    }
    return found;
  }

  /* A live DOM subtree as a node. Browser only, and deliberately thin: the
     rules above are what is worth testing, and they must not need a browser to
     be tested. `skip` drops the chrome the exporter itself removes. */
  function describe(el, opts) {
    const o = opts || {};
    const skip = o.skip || ".pt-print-tools, .pt-toast, script";
    const origin = el.getBoundingClientRect();
    function node(n) {
      const r = n.getBoundingClientRect();
      const cs = (typeof getComputedStyle === "function") ? getComputedStyle(n) : null;
      const hidden = cs && (cs.display === "none" || cs.visibility === "hidden");
      const id = n.id ? "#" + n.id
        : n.tagName.toLowerCase() + (n.className && typeof n.className === "string" && n.className.trim()
          ? "." + n.className.trim().split(/\s+/)[0] : "");
      return {
        id: id,
        box: hidden ? { x: 0, y: 0, w: 0, h: 0 }
          : { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height },
        clips: !!(cs && cs.overflow !== "visible"),
        /* An <svg> is a LEAF here. Its children overlap each other by design —
           a QR code is a path under a field of rects, a hollow letter is a
           stroke over a fill — so walking into one turns every credit block
           into a collision and buries the findings that are real. What an SVG
           draws inside itself is glyphMetrics.js's subject; what it occupies
           on the page is this module's. */
        children: (n.tagName.toLowerCase() === "svg") ? []
          : Array.prototype.filter.call(n.children, function (k) {
            return !(k.matches && k.matches(skip));
          }).map(node)
      };
    }
    return node(el);
  }

  ns.renderInvariants = {
    overlaps: overlaps,
    spills: spills,
    outOfBounds: outOfBounds,
    fitScale: fitScale,
    check: check,
    describe: describe,
    AREA_TOL: AREA_TOL,
    EDGE_TOL: EDGE_TOL
  };
  if (typeof module !== "undefined" && module.exports) module.exports = ns.renderInvariants;
})();
