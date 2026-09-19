/*
 * glyph-metrics-tag.js — shared by the injector and its gate, so the two can
 * never disagree about what a correctly-tagged printables page looks like.
 *
 * glyphMetrics.js must load BEFORE printablesEngine.js. The engine reads it at
 * module scope for tile centring, word-box sizing, ruled-line registration and
 * the skeleton fit; a tag placed after the engine is present, looks right in a
 * diff, and does nothing -- the same false-negative shape the share/save tag
 * gate was rewritten to catch after 300 pages shipped with a correct tag in the
 * wrong position.
 */
"use strict";

const TAG = '<script src="/js/printables/glyphMetrics.js"></script>';
const SRC = "/js/printables/glyphMetrics.js";
const ENGINE = "/js/printables/printablesEngine.js";

/* Every page that loads the engine needs the module; nothing else does. */
function needsTag(html) {
  return html.indexOf(ENGINE) !== -1;
}

function tagIndex(html) {
  const m = html.match(/<script[^>]*src="\/js\/printables\/glyphMetrics\.js"[^>]*>\s*<\/script>/);
  return m ? html.indexOf(m[0]) : -1;
}

function engineIndex(html) {
  const m = html.match(/<script[^>]*src="\/js\/printables\/printablesEngine\.js"[^>]*>/);
  return m ? html.indexOf(m[0]) : -1;
}

/* "present" and "correctly ordered" are separate questions and each gets its
   own answer, because a page can pass the first and fail the second. */
function inspect(html) {
  if (!needsTag(html)) return { relevant: false, ok: true };
  const t = tagIndex(html), e = engineIndex(html);
  if (t === -1) return { relevant: true, ok: false, reason: "missing" };
  if (e === -1) return { relevant: true, ok: false, reason: "engine tag unparseable" };
  if (t > e) return { relevant: true, ok: false, reason: "loads after printablesEngine.js" };
  return { relevant: true, ok: true };
}

/* Strips any existing tag and reinserts it, rather than skipping a page that
   already has one -- otherwise the pass could repair absence but never order. */
function apply(html) {
  if (!needsTag(html)) return html;
  let out = html.replace(/[ \t]*<script[^>]*src="\/js\/printables\/glyphMetrics\.js"[^>]*>\s*<\/script>\n?/g, "");
  const m = out.match(/([ \t]*)<script[^>]*src="\/js\/printables\/printablesEngine\.js"[^>]*>/);
  if (!m) return html;
  const indent = m[1] || "";
  const at = out.indexOf(m[0]);
  return out.slice(0, at) + indent + TAG + "\n" + out.slice(at);
}

module.exports = { TAG, SRC, ENGINE, needsTag, inspect, apply };
