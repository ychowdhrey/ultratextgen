/* ==========================================================================
   UltraTextGen — eventDates.js
   Fills in the "when is this event next" line on /events/<slug>/ pages.

   Two sources, and which one applies is decided at build time:

   1. DETERMINISTIC events (Halloween, Christmas, Thanksgiving, Easter, ...)
      already have their dates baked into the page as a `data-event-dates`
      JSON array by scripts/lib/event_occurrence.py. There is no date maths
      here — this file only picks the first entry that hasn't passed, so the
      page self-heals for as many years as the array covers even if nobody
      regenerates it.

   2. LUNAR / OBSERVED events (Eid, Ramadan, Chinese New Year) carry a
      `data-occurrence` rule instead, and are resolved HERE, because the
      browser is the only place with authoritative data for them:
      Intl.DateTimeFormat's `islamic-umalqura` and `chinese` calendars are
      backed by ICU. The alternative — shipping a hardcoded conversion table
      — would mean publishing dates this repo cannot verify.

      These dates are still approximate for a specific reader: Eid in
      particular is declared by local moon sighting and can land a day either
      side of the calculated date depending on country. The copy the page
      renders says so; do not tighten it into a promise.

   No dependencies, native Intl only, same IIFE pattern as every other module.
   ========================================================================== */

(function () {
  "use strict";

  const MAX_SCAN_DAYS = 400; // one lunar year of look-ahead is always enough

  function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function parseISO(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  /* Read one date out of a non-Gregorian calendar. Returns {month, day} as
     numbers, or null when the environment lacks that calendar's data. */
  function calendarParts(date, calendar) {
    let parts;
    try {
      parts = new Intl.DateTimeFormat("en-u-ca-" + calendar + "-nu-latn", {
        month: "numeric",
        day: "numeric",
        timeZone: "UTC",
      }).formatToParts(date);
    } catch (e) {
      return null;
    }
    let month = null;
    let day = null;
    parts.forEach(function (p) {
      if (p.type === "month") month = parseInt(p.value, 10);
      if (p.type === "day") day = parseInt(p.value, 10);
    });
    if (!month || !day || isNaN(month) || isNaN(day)) return null;
    return { month: month, day: day };
  }

  /* First date on/after `from` whose <calendar> month/day match the rule.
     Scans forward a day at a time — cheap enough at this range, and immune to
     the leap-month irregularities that closed-form conversion would need to
     special-case. */
  function nextInCalendar(calendar, month, day, from) {
    const cursor = new Date(Date.UTC(
      from.getFullYear(), from.getMonth(), from.getDate()
    ));
    // Probe once so an environment without this calendar fails fast rather
    // than burning 400 formatter calls.
    if (!calendarParts(cursor, calendar)) return null;

    for (let i = 0; i < MAX_SCAN_DAYS; i++) {
      const parts = calendarParts(cursor, calendar);
      if (parts && parts.month === month && parts.day === day) {
        return new Date(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate());
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return null;
  }

  const LUNAR = {
    // Eid al-Fitr: 1 Shawwal. Eid al-Adha: 10 Dhu al-Hijjah. Ramadan: 1 Ramadan.
    islamic: function (rule, from) {
      return nextInCalendar("islamic-umalqura", Number(rule.month), Number(rule.day), from);
    },
    // Chinese New Year is the 1st day of the 1st month.
    chinese: function (rule, from) {
      return nextInCalendar("chinese", Number(rule.month || 1), Number(rule.day || 1), from);
    },
  };

  function resolve(el) {
    const from = startOfToday();

    const listRaw = el.getAttribute("data-event-dates");
    if (listRaw) {
      let list;
      try { list = JSON.parse(listRaw); } catch (e) { list = null; }
      if (Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) {
          const d = parseISO(list[i]);
          if (d && d >= from) return d;
        }
      }
      return null;
    }

    const ruleRaw = el.getAttribute("data-occurrence");
    if (!ruleRaw) return null;
    let rule;
    try { rule = JSON.parse(ruleRaw); } catch (e) { return null; }
    const fn = rule && LUNAR[rule.type];
    return fn ? fn(rule, from) : null;
  }

  function formatDate(date, locale) {
    try {
      return new Intl.DateTimeFormat(locale || document.documentElement.lang || "en", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      }).format(date);
    } catch (e) {
      return date.toDateString();
    }
  }

  function init() {
    const el = document.getElementById("eventNextDate");
    if (!el) return;

    const date = resolve(el);
    if (!date) return; // keep whatever rule-based prose the page shipped with

    // Template comes from the page so it is already in the page's language,
    // e.g. "Halloween {date}" / "{date}". {date} is the only placeholder.
    const template = el.getAttribute("data-template") || "{date}";
    el.textContent = template.replace("{date}", formatDate(date));
    el.hidden = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
