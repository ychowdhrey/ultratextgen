/* ==========================================================
   moon-phase.js
   "Moon phase today" readout for the moon-symbols library page and its
   locale siblings.

   Pure half (window.UltraTextGen.moonPhase, asserted by moonPhase.test.js):
     - phaseAt(ms)            -> { age, index, fraction, illumination, day }
     - phaseIndexForAge(age)  -> 0..7 (0 new, 2 first quarter, 4 full, 6 last quarter)
     - mirrorIndex(i)         -> the same phase as seen from the Southern Hemisphere
     - emojiFor(i, hemisphere)
     - guessHemisphere(timeZone) -> "south" for a clearly southern IANA zone, else "north"
     - localNoon(date)        -> ms of 12:00 local time on that calendar date

   Method: the Moon's age is the time since a known new moon (2000-01-06
   18:14 UTC) modulo the mean synodic month, 29.530588853 days. The real
   Moon runs ahead of or behind that mean by up to about 18 hours, so the
   phase shown lands within a day of the astronomical one. The test file
   checks that against published new and full moon times.

   DOM half: fills [data-moon-phase] sections. Every visible string comes
   from the page (data attributes and pre-rendered markup), so one module
   serves every locale. Copy goes through UltraTextGen.copyText from
   symbol-explorer.js, the same toast and copy_text event as a tile.
   ========================================================== */
(function () {
  "use strict";

  const SYNODIC_MONTH = 29.530588853;
  const EPOCH_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);
  const DAY_MS = 86400000;
  const EMOJI_NORTH = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
  const STORAGE_KEY = "utgMoonHemisphere";

  // IANA zones whose whole territory lies south of the equator. Anything
  // not listed (including equatorial zones) defaults to the northern view;
  // the visitor's own choice always wins over this guess.
  const SOUTHERN_ZONE_PREFIXES = [
    "Australia/", "Antarctica/", "America/Argentina/",
    "Pacific/Auckland", "Pacific/Chatham", "Pacific/Fiji", "Pacific/Tongatapu",
    "Pacific/Apia", "Pacific/Noumea", "Pacific/Port_Moresby", "Pacific/Efate",
    "Pacific/Rarotonga", "Pacific/Tahiti", "Pacific/Easter", "Pacific/Norfolk",
    "America/Sao_Paulo", "America/Santiago", "America/Montevideo",
    "America/Asuncion", "America/La_Paz", "America/Lima", "America/Buenos_Aires",
    "America/Cuiaba", "America/Campo_Grande", "America/Bahia", "America/Recife",
    "America/Fortaleza", "America/Maceio", "America/Araguaina", "America/Porto_Velho",
    "America/Rio_Branco", "America/Punta_Arenas", "America/Noronha",
    "Africa/Johannesburg", "Africa/Maputo", "Africa/Harare", "Africa/Lusaka",
    "Africa/Windhoek", "Africa/Gaborone", "Africa/Maseru", "Africa/Mbabane",
    "Africa/Lubumbashi", "Africa/Luanda", "Africa/Blantyre", "Africa/Dar_es_Salaam",
    "Indian/Antananarivo", "Indian/Mauritius", "Indian/Reunion", "Indian/Comoro",
    "Indian/Mayotte", "Asia/Dili"
  ];

  function moonAge(ms) {
    const days = (ms - EPOCH_NEW_MOON_MS) / DAY_MS;
    const age = days % SYNODIC_MONTH;
    return age < 0 ? age + SYNODIC_MONTH : age;
  }

  // Eight equal slices of the cycle, each centred on its named phase, so
  // "Full Moon" covers the 3.7 days around the instant of full.
  function phaseIndexForAge(age) {
    return Math.floor((age / SYNODIC_MONTH) * 8 + 0.5) % 8;
  }

  function phaseAt(ms) {
    const age = moonAge(ms);
    const fraction = age / SYNODIC_MONTH;
    return {
      age: age,
      fraction: fraction,
      index: phaseIndexForAge(age),
      illumination: (1 - Math.cos(2 * Math.PI * fraction)) / 2,
      day: Math.floor(age) + 1
    };
  }

  // South of the equator the Moon is seen upside down relative to the
  // north, so the lit side swaps: a waxing crescent looks like 🌘 there.
  function mirrorIndex(i) {
    return (8 - i) % 8;
  }

  function emojiFor(i, hemisphere) {
    return EMOJI_NORTH[hemisphere === "south" ? mirrorIndex(i) : i];
  }

  function guessHemisphere(timeZone) {
    const tz = String(timeZone || "");
    for (let k = 0; k < SOUTHERN_ZONE_PREFIXES.length; k++) {
      const p = SOUTHERN_ZONE_PREFIXES[k];
      if (p.charAt(p.length - 1) === "/" ? tz.indexOf(p) === 0 : tz === p) return "south";
    }
    return "north";
  }

  function localNoon(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).getTime();
  }

  const ns = (window.UltraTextGen = window.UltraTextGen || {});
  ns.moonPhase = {
    SYNODIC_MONTH: SYNODIC_MONTH,
    EPOCH_NEW_MOON_MS: EPOCH_NEW_MOON_MS,
    EMOJI_NORTH: EMOJI_NORTH.slice(),
    moonAge: moonAge,
    phaseIndexForAge: phaseIndexForAge,
    phaseAt: phaseAt,
    mirrorIndex: mirrorIndex,
    emojiFor: emojiFor,
    guessHemisphere: guessHemisphere,
    localNoon: localNoon
  };

  if (typeof document === "undefined") return;

  /* ---------------- DOM half ---------------- */

  function readStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function store(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* private mode */ }
  }

  function fill(template, values) {
    return String(template || "").replace(/\{(\w+)\}/g, function (m, key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : m;
    });
  }

  function mount(root) {
    const readout = root.querySelector("[data-moon-readout]");
    const emojiEl = root.querySelector("[data-moon-emoji]");
    const dateEl = root.querySelector("[data-moon-date]");
    const detailEl = root.querySelector("[data-moon-detail]");
    const copyBtn = root.querySelector("[data-moon-copy]");
    const hemiBtns = root.querySelectorAll("[data-moon-hemi]");
    if (!readout || !emojiEl || !detailEl) return;

    let names = [];
    try { names = JSON.parse(root.getAttribute("data-moon-names") || "[]"); } catch (e) { names = []; }
    if (names.length !== 8) return;
    const lang = document.documentElement.getAttribute("lang") || "en";

    let tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { tz = ""; }
    const stored = readStored();
    let hemisphere = stored === "south" || stored === "north" ? stored : guessHemisphere(tz);

    const now = new Date();
    const phase = phaseAt(localNoon(now));

    function render() {
      const emoji = emojiFor(phase.index, hemisphere);
      emojiEl.textContent = emoji;
      if (dateEl) {
        let label = "";
        try {
          label = new Intl.DateTimeFormat(lang, { year: "numeric", month: "long", day: "numeric" }).format(now);
        } catch (e) { label = now.toDateString(); }
        dateEl.textContent = label;
      }
      detailEl.textContent = fill(root.getAttribute("data-moon-template"), {
        name: names[phase.index],
        day: String(phase.day),
        pct: String(Math.round(phase.illumination * 100))
      });
      hemiBtns.forEach(function (b) {
        const on = b.getAttribute("data-moon-hemi") === hemisphere;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (copyBtn) copyBtn.setAttribute("data-moon-value", emoji);
      if (ns.parseTwemoji) ns.parseTwemoji(emojiEl);
    }

    hemiBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        hemisphere = b.getAttribute("data-moon-hemi") === "south" ? "south" : "north";
        store(hemisphere);
        render();
      });
    });

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        const value = copyBtn.getAttribute("data-moon-value");
        if (!value) return;
        if (ns.copyText) {
          ns.copyText(value, copyBtn, value, "symbol_tile");
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).catch(function () { /* silent */ });
        }
      });
    }

    render();
    readout.hidden = false;
  }

  function init() {
    document.querySelectorAll("[data-moon-phase]").forEach(mount);
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
