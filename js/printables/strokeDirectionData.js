/*
 * strokeDirectionData.js — per-letter stroke-order overlay data for the
 * printables engine's "Show stroke direction" toggle (js/printables/
 * printablesEngine.js). Occupational-therapy handwriting sources note that
 * tracing without a numbered start-dot + directional arrow can teach poor
 * motor plans, so each entry below marks where a pencil starts and which
 * way each stroke travels, based on conventional US manuscript
 * (print-handwriting) stroke order.
 *
 * This is intentionally a *schematic* guide, not a trace of the rendered
 * glyph's exact outline — the letters are drawn with a real system/Google
 * font via SVG <text>, so there is no vector path data to reverse-engineer.
 * Coordinates are hand-authored against the SAME 200×240 viewBox / 210px
 * font-size / x=100,y=128 / dominant-baseline:central recipe that
 * printablesEngine.js's outlineSVG() uses to draw a single letter, so the
 * dot/arrow positions line up with the rendered glyph without any
 * per-context math. (printablesEngine.js also reuses these same coordinates,
 * scaled, to overlay letters inside a whole traced word/name.)
 *
 * Calibration reference for that box (font-weight 700, sans-serif):
 *   cap top      ~ y 55        x-height top ~ y 88
 *   ascender top ~ y 52        baseline     ~ y 198-200
 *   descender bottom ~ y 236-238            center x = 100
 *
 * Each letter is a small array of `strokes` — 1-4 SVG path `d` strings in
 * stroke order. The FIRST point of each path (its "M x,y") is where the
 * numbered start-dot for that stroke is drawn; the path's end is where the
 * direction arrowhead is drawn. Pure data, no logic — read by
 * printablesEngine.js. Exposes window.UTG_STROKE_DIRECTION_DATA only.
 *
 * Coverage: full A-Z and a-z (52 letters). Digits are intentionally out of
 * scope for this pass (optional per the feature spec) — the overlay is a
 * silent no-op for any character without an entry here.
 */
(function () {
  "use strict";

  window.UTG_STROKE_DIRECTION_DATA = {

    /* ---------------------------------------------------------------
       Uppercase A-Z
       --------------------------------------------------------------- */

    A: { strokes: [
      "M100,55 L42,198",
      "M110,80 L158,198",
      "M66,140 L134,140"
    ] },
    B: { strokes: [
      "M45,55 L45,172",
      "M69,69 L45,55 C118,55 118,122 45,127 C118,132 118,193 45,198"
    ] },
    C: { strokes: [
      "M150,75 C125,52 70,52 48,100 C28,145 55,193 150,196"
    ] },
    D: { strokes: [
      "M45,55 L45,172",
      "M69,69 L45,55 C132,55 152,90 152,127 C152,164 132,198 45,198"
    ] },
    E: { strokes: [
      "M45,55 L45,198",
      "M71,55 L155,55",
      "M45,127 L135,127",
      "M45,198 L155,198"
    ] },
    F: { strokes: [
      "M45,55 L45,198",
      "M71,55 L155,55",
      "M45,127 L135,127"
    ] },
    G: { strokes: [
      "M150,75 C125,52 70,52 48,100 C28,148 58,198 110,198 C140,198 148,178 150,128",
      "M100,150 L136,150"
    ] },
    H: { strokes: [
      "M45,55 L45,198",
      "M155,55 L155,198",
      "M45,127 L155,127"
    ] },
    I: { strokes: [
      "M100,55 L100,198"
    ] },
    J: { strokes: [
      "M120,55 L120,165 C120,190 100,198 75,193"
    ] },
    K: { strokes: [
      "M45,55 L45,198",
      "M155,55 L45,130",
      "M65,118 L155,198"
    ] },
    L: { strokes: [
      "M45,55 L45,198",
      "M45,198 L150,198"
    ] },
    M: { strokes: [
      "M25,55 L25,198",
      "M42,75 L100,140 L175,55",
      "M175,55 L175,198"
    ] },
    N: { strokes: [
      "M40,55 L40,198",
      "M57,75 L160,198",
      "M160,55 L160,172"
    ] },
    O: { strokes: [
      "M100,55 C60,55 45,90 45,127 C45,164 60,198 100,198 C140,198 155,164 155,127 C155,90 140,55 100,55"
    ] },
    P: { strokes: [
      "M45,55 L45,198",
      "M69,69 L45,55 C130,55 140,75 140,95 C140,118 122,127 45,127"
    ] },
    Q: { strokes: [
      "M100,55 C60,55 45,90 45,127 C45,164 60,198 100,198 C140,198 155,164 155,127 C155,90 140,55 100,55",
      "M110,155 L162,205"
    ] },
    R: { strokes: [
      "M45,55 L45,198",
      "M69,69 L45,55 C130,55 140,75 140,95 C140,118 122,127 45,127",
      "M85,127 L155,198"
    ] },
    S: { strokes: [
      "M145,75 C145,58 120,50 95,52 C65,55 50,70 50,88 C50,110 75,118 100,127 C125,136 150,145 150,167 C150,188 130,198 100,198 C75,198 55,190 50,175"
    ] },
    T: { strokes: [
      "M45,55 L155,55",
      "M100,55 L100,198"
    ] },
    U: { strokes: [
      "M45,55 L45,150 C45,180 68,198 100,198 C132,198 155,180 155,150 L155,55"
    ] },
    V: { strokes: [
      "M40,55 L100,198 L160,55"
    ] },
    W: { strokes: [
      "M25,55 L65,198 L100,120 L135,198 L175,55"
    ] },
    X: { strokes: [
      "M42,55 L158,198",
      "M158,55 L42,198"
    ] },
    Y: { strokes: [
      "M42,55 L100,130",
      "M158,55 L100,130 L100,198"
    ] },
    Z: { strokes: [
      "M45,55 L155,55",
      "M155,55 L45,198",
      "M45,198 L155,198"
    ] },

    /* ---------------------------------------------------------------
       Lowercase a-z
       --------------------------------------------------------------- */

    a: { strokes: [
      "M140,100 C140,86 120,84 105,86 C72,90 55,112 55,143 C55,174 75,193 103,193 C125,193 138,180 140,155 L140,100",
      "M165,65 L140,88 L140,198"
    ] },
    b: { strokes: [
      "M45,52 L45,198",
      "M45,140 C100,130 145,140 145,168 C145,188 122,198 90,198 C65,198 48,190 45,175"
    ] },
    c: { strokes: [
      "M150,100 C135,90 110,86 95,88 C68,92 55,110 55,143 C55,172 72,190 98,190 C118,190 138,182 148,168"
    ] },
    d: { strokes: [
      "M155,52 L155,198",
      "M155,140 C140,128 115,124 98,127 C70,132 55,150 55,163 C55,182 78,198 108,198 C130,198 148,188 155,172"
    ] },
    e: { strokes: [
      "M58,132 L142,132",
      "M142,132 C142,105 122,88 98,88 C68,88 55,110 55,143 C55,172 75,190 100,190 C122,190 138,180 145,168"
    ] },
    f: { strokes: [
      "M120,52 C120,52 90,52 85,75 L75,198",
      "M55,110 L115,110"
    ] },
    g: { strokes: [
      "M140,88 C140,80 125,86 108,88 C80,92 62,110 62,143 C62,168 80,186 105,186 C125,186 140,175 140,155 L140,90",
      "M140,150 L140,215 C140,232 122,238 100,236"
    ] },
    h: { strokes: [
      "M45,52 L45,198",
      "M45,135 C65,115 100,110 118,125 C132,137 132,155 132,198"
    ] },
    i: { strokes: [
      "M100,60 L100,64",
      "M100,90 L100,198"
    ] },
    j: { strokes: [
      "M118,60 L118,64",
      "M118,90 L118,215 C118,232 100,238 80,236"
    ] },
    k: { strokes: [
      "M45,52 L45,198",
      "M130,90 L55,145",
      "M75,133 L135,198"
    ] },
    l: { strokes: [
      "M100,52 L100,198"
    ] },
    m: { strokes: [
      "M45,90 L45,198",
      "M45,120 C65,100 95,98 108,115 C118,128 118,145 118,198",
      "M118,120 C138,100 168,98 178,115 C188,128 188,145 188,198"
    ] },
    n: { strokes: [
      "M45,90 L45,198",
      "M45,135 C65,115 100,110 118,125 C132,137 132,155 132,198"
    ] },
    o: { strokes: [
      "M100,88 C130,88 145,110 145,143 C145,172 128,190 100,190 C72,190 55,172 55,143 C55,110 70,88 100,88"
    ] },
    p: { strokes: [
      "M45,90 L45,236",
      "M45,140 C100,130 145,140 145,168 C145,188 122,198 90,198 C65,198 48,190 45,175"
    ] },
    q: { strokes: [
      "M140,90 C140,80 125,86 108,88 C80,92 62,110 62,143 C62,168 80,186 105,186 C125,186 140,175 140,155 L140,90",
      "M140,150 L140,236"
    ] },
    r: { strokes: [
      "M55,90 L55,198",
      "M55,120 C68,100 95,92 115,98"
    ] },
    s: { strokes: [
      "M135,100 C130,90 112,86 95,88 C75,90 60,98 60,112 C60,128 78,133 100,140 C122,147 145,153 145,172 C145,188 125,198 100,198 C80,198 62,192 55,180"
    ] },
    t: { strokes: [
      "M78,58 L78,175 C78,190 88,198 105,196",
      "M50,110 L112,110"
    ] },
    u: { strokes: [
      "M55,90 L55,165 C55,183 70,190 88,190 C105,190 118,182 122,168",
      "M122,90 L122,198"
    ] },
    v: { strokes: [
      "M48,90 L100,198 L152,90"
    ] },
    w: { strokes: [
      "M40,90 L68,198 L100,135 L132,198 L160,90"
    ] },
    x: { strokes: [
      "M52,90 L148,198",
      "M148,90 L52,198"
    ] },
    y: { strokes: [
      "M52,90 L100,180",
      "M148,90 L100,180 L88,215 C82,230 65,236 50,233"
    ] },
    z: { strokes: [
      "M55,90 L145,90",
      "M145,90 L55,198",
      "M55,198 L145,198"
    ] }
  };
})();
