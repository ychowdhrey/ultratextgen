/*
 * faceProbe.test.js — "is this webfont ACTUALLY here?", for the two browser
 * test pages in this folder (glyphMetrics.test.html, strokeRoute.test.html).
 * Test-only: nothing on the site loads it.
 *
 * Both pages abort rather than run when their face is missing, because
 * measuring the fallback passes by coincidence on the letters whose schematic
 * happens to suit a generic sans and fails on the rest. Both asked
 * `document.fonts.check()`, and that is not the question it answers.
 *
 * Measured 2026-09-19 with the Google Fonts request blocked, so NO face had
 * loaded at all: `document.fonts` was empty, and
 * `document.fonts.check('700 210px "Quicksand"')` still returned **true**.
 * check() reports whether everything needed to render is ready, and a missing
 * family is satisfied by falling back — so it is true both when the face is
 * present and when it was never fetched. The guard could not tell those apart,
 * which is the failure this repo keeps recording: a check that reports nothing
 * is indistinguishable from a check that passes. It went red here only because
 * the fallback happened to suit the schematic badly; on a machine whose
 * fallback suited it well the same guard would have waved through a green run
 * measuring the wrong letters.
 *
 * What is measured instead is the only thing that distinguishes them: whether
 * asking for the family changes what canvas draws. Both probes name the same
 * last-resort family, so if `family` is absent they resolve identically and
 * the widths match to the pixel.
 */
(function () {
  "use strict";

  // A string with wide, narrow and round letters, so two real faces are very
  // unlikely to agree on its width by accident.
  const PROBE = "MMMWWWiiill0123";
  // Deliberately unregistrable: a family this name cannot exist, so the only
  // thing it can resolve to is the fallback beside it.
  const ABSENT = "UTG No Such Face 8b41c7";

  function widthWith(family, weight, size) {
    const c = document.createElement("canvas").getContext("2d");
    c.font = weight + " " + size + 'px "' + family + '", monospace';
    return c.measureText(PROBE).width;
  }

  /* True only when naming `family` renders differently from naming a family
     that certainly does not exist. Equal widths mean both fell through to
     monospace, i.e. `family` is not available. */
  function available(family, weight, size) {
    const w = weight || 700;
    const s = size || 210;
    return Math.abs(widthWith(family, w, s) - widthWith(ABSENT, w, s)) > 0.5;
  }

  /* Ask for the face, wait for the font set to settle, then probe. Canvas
     measureText does not pull a webfont in on its own, so the load() call is
     what makes the probe meaningful rather than a race. */
  function load(family, weight, size) {
    const spec = (weight || 700) + " " + (size || 210) + 'px "' + family + '"';
    const req = document.fonts && document.fonts.load
      ? document.fonts.load(spec).catch(function () {})
      : Promise.resolve();
    return req
      .then(function () { return document.fonts ? document.fonts.ready : null; })
      .catch(function () {});
  }

  window.UTG_FACE_PROBE = { available: available, load: load };
})();
